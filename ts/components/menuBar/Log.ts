namespace Log {
    let $textarea: JQuery;        // $("#log-TextArea");
    let $machineTextarea: JQuery; // $("#log-MachineTextArea");

    let $undo: JQuery; // $("#undo");
    let $redo: JQuery; // $("#redo");

    // keep in sync with initialize
    let logCursor: number = -1;
    let logToCommit: string = "";
    let errToCommit: string = "";
    let overwrittenToCommit: string = "";
    let logCache: {
        logs: XcLog[],
        errors: XcLog[],
        overwrittenLogs: XcLog[],
        version?: string
    } = {
        "logs": [],
        "errors": [],
        "overwrittenLogs": [] // stores logs overwritten after an undo
    };
    let logs: XcLog[] = logCache.logs;
    let errors: XcLog[] = logCache.errors;
    let overwrittenLogs: XcLog[] = logCache.overwrittenLogs;
    // mark if it's in a undo redo action
    let _isUndo: boolean = false;
    let _isRedo: boolean = false;
    let shouldOverWrite: boolean = false;
    let lastRestoreCursor: number = logCursor;

    // constant
    let logLocalStoreKey: string = "xcalar-query";
    let logRestoreError: string = "restore log error";
    let UndoType = {
        "Valid": 0,   // can undo/redo
        "Skip": 1,   // should skip undo/redo
        "Invalid": 2    // cannot undo/redo
    };
    let isCollapsed: boolean = false;
    let hasTriggerScrollToBottom: boolean = false;
    let infList;
    let infListMachine;
    let isOverflow: boolean = false;

    export function setup(): void {
        $textarea = $("#log-TextArea");
        $machineTextarea = $("#log-MachineTextArea");
        $undo = $("#undo");
        $redo = $("#redo");

        initialize();
        addEvents();
        // show human readabl Log as default
        $machineTextarea.hide();

        infList = new InfList($textarea);
        infListMachine = new InfList($machineTextarea);
    };

    export function hasUncommitChange(): boolean {
        return (logToCommit !== "") || (logCursor !== logs.length - 1);
    };

    export function restore(oldLogCursor: number, isKVEmpty?: boolean): XDPromise<void> {
        // log is not restored since data mart
        updateUndoRedoState();
        return PromiseHelper.resolve();
        
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (isKVEmpty) {
            // data mart don't restore
            updateUndoRedoState();
            return deferred.resolve().promise();
        }

        isCollapsed = UserSettings.getPref("logCollapsed");

        restoreLogs(oldLogCursor)
        .then(function() {
            return restoreErrors();
        })
        .then(function() {
            return restoreOverwrittenLogs();
        })
        .then(function() {
            // XXX FIXME change back to localCommit() if it's buggy
            resetLoclStore();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error === logRestoreError) {
                clear();
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        })
        .always(function() {
            updateUndoRedoState();
            scrollToBottom();
        });

        return deferred.promise();
    };

    export function upgrade(oldRawLogs: string): string {
        let oldLogs: any[] = parseRawLog(oldRawLogs);
        if (oldLogs == null) {
            return null;
        }

        let newLogs = [];
        oldLogs.forEach(function(oldLog) {
            let newLog = KVStore.upgrade(oldLog, "XcLog");
            newLogs.push(newLog);
        });

        if (newLogs.length === 0) {
            return "";
        } else {
            return stringifyLog(newLogs);
        }
    };

    export function add(title: string, options: any, cli?: string, willCommit?: boolean): void {
        options = options || {};

        if ($.isEmptyObject(options)) {
            console.warn("Options for" + title + "is empty!");
            return;
        }

        if (_isUndo || _isRedo) {
            return;
        }

        let xcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli
        });

        addLog(xcLog, willCommit);
        scrollToBottom();
        updateUndoRedoState();

        if (typeof mixpanel !== "undefined") {
            xcMixpanel.transactionLog(xcLog);
        }
    };

    export function errorLog(title, options, cli, error) {
        let xcLog: XcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli,
            "error": error
        });
        errors.push(xcLog);

        errToCommit += JSON.stringify(xcLog) + ",";
        localCommit();
    };

    export function commit(): XDPromise<void> {
        // data mart don't commit log
        return PromiseHelper.resolve();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        commitLogs()
        .then(function() {
            return commitErrors();
        })
        .then(function() {
            return commitOverwrittenLogs();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    export function commitErrors(): XDPromise<void> {
        // data mart don't commit log
        return PromiseHelper.resolve();

        if (errToCommit === "") {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        let key: string = KVStore.getKey("gErrKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        let tmpLog: string = errToCommit;
        errToCommit = "";

        kvStore.append(tmpLog, true)
        .then(deferred.resolve)
        .fail(function(error) {
            errToCommit = tmpLog;
            deferred.reject(error);
        });

        return deferred.promise();
    };

    export function getCursor(): number {
        return logCursor;
    };

    export function getLogs(): XcLog[] {
        return logs;
    };

    export function getErrorLogs(condensed?: boolean): XcLog[] {
        if (condensed) {
            return getCondensedErrors();
        } else {
            return errors;
        }
    };

    export function getConsoleErrors(): XcLog[] {
        return errors.filter(function(err) {
            return err.getTitle() === "Console error";
        });
    };

    export function getAllLogs(condensed?: boolean): {
        logs: XcLog[],
        errors: XcLog[],
        overwrittenLogs: XcLog[],
        version?: string
    } {
        if (condensed) {
            return {"logs": logs,
                    "errors": getCondensedErrors(),
                    "overwrittenLogs": overwrittenLogs,
                    "version": XVM.getVersion(true)
                };
        } else {
            return logCache;
        }
    };

    export function getLocalStorage(): string {
        return xcLocalStorage.getItem(logLocalStoreKey);
    };

    export function getBackup(): string {
        let key = logLocalStoreKey + "-backup";
        return xcLocalStorage.getItem(key);
    };

    export function backup(): void {
        if (xcManager.isInSetup() || isOverflow) {
            // start up time error don't trigger backup
            // or it may overwrite old log backup
            return;
        }

        let key: string = logLocalStoreKey + "-backup";
        if (!xcLocalStorage.setItem(key, JSON.stringify(logCache))) {
            isOverflow = true;
            // Remove logCache from local storage because
            // it's no longer up to date and may be misleading
            // but takes up memory which may affect other storage
            xcLocalStorage.removeItem(key);
        }
    };

    export function clear(): void {
        $textarea.html("");
        $machineTextarea.html("");
        initialize();
    };

    export function scrollToBottom(): void {
        xcUIHelper.scrollToBottom($textarea);
        xcUIHelper.scrollToBottom($machineTextarea);
        // when one panel scroll to bottom,
        // another panel didn't scroll as it's hidden
        // use this flag to mark
        hasTriggerScrollToBottom = true;
    };

    // inBackground: boolean, to do it behind the scenes without user knowing
    export function undo(step?: number, inBackground?: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcAssert((_isUndo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        let c: number = logCursor;
        let promises: XDPromise<void>[] = [];

        for (let i = 0; i < step; i++) {
            if (c < 0) {
                // cannot undo anymore
                break;
            }

            // find the first log that can undo/redo
            while (c >= 0 && getUndoType(logs[c]) === UndoType.Skip) {
                // console.log("skip", logs[c]);
                c--;
            }

            if (c < 0) {
                // this is an error case
                console.warn("Cannot find log to undo");
                break;
            }

            let xcLog = logs[c];
            if (getUndoType(xcLog) !== UndoType.Valid) {
                // cannot undo
                break;
            }

            promises.push(undoLog.bind(this, xcLog, c));
            c--;
        }

        _isUndo = true;
        lockUndoRedo();
        let passed: boolean = false;
        PromiseHelper.chain(promises)
        .then(function() {
            // cursor in the current position
            logCursor = c;
            updateLogPanel(logCursor);
            passed = true;
        })
        .fail(function(error) {
            console.error("undo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            _isUndo = false;
            unlockUndoRedo();
            updateUndoRedoState();
            if (!inBackground) {
                refreshTooltip($undo);
            }

            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    };

    export function repeat(): XDPromise<void> {
        if ($("#redo").hasClass("locked")) {
            return PromiseHelper.reject();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let logLen: number = logs.length;
        if (!logLen || logCursor !== logLen - 1) {
            return PromiseHelper.resolve();
        } else {
            let xcLog: XcLog = logs[logCursor];
            Repeat.run(xcLog)
            .then(deferred.resolve)
            .fail(deferred.reject);
            // if fails do nothing
            return deferred.promise();
        }
    };

    export function redo(step?: number): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcAssert((_isRedo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        let logLen: number = logs.length;
        let c: number = logCursor + 1;
        let promises: XDPromise<void>[] = [];

        for (let i = 0; i < step; i++) {
            if (c >= logLen) {
                // cannot redo anymore
                break;
            }

            let xcLog: XcLog = logs[c];
            if (getUndoType(xcLog) !== UndoType.Valid) {
                console.warn("Invalid log to redo", xcLog);
                break;
            }

            promises.push(redoLog.bind(this, xcLog, c));
            c++;

            // also get back the skipped log
            while (c < logLen && getUndoType(logs[c]) === UndoType.Skip) {
                c++;
            }
        }

        _isRedo = true;
        lockUndoRedo();
        let passed: boolean = false;
        PromiseHelper.chain(promises)
        .then(function() {
            logCursor = c - 1;
            updateLogPanel(logCursor);
            passed = true;
        })
        .fail(function(error) {
            console.error("redo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            _isRedo = false;
            unlockUndoRedo();
            updateUndoRedoState();
            refreshTooltip($redo);
            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    };

    export function isUndo(): boolean {
        return _isUndo;
    };

    export function isRedo(): boolean {
        return _isRedo;
    };

    export function viewLastAction(detailed: boolean): string | XcLog {
        let curLog = logs[logCursor];
        if (logCursor !== -1) {
            if (detailed) {
                return curLog;
            } else {
                return curLog.getTitle();
            }
        } else {
            return "none";
        }
    };

    export function lockUndoRedo(): void {
        $undo.addClass("disabled locked");
        xcTooltip.changeText($undo, TooltipTStr.LockedTableUndo);

        $redo.addClass("disabled locked");
        xcTooltip.changeText($redo, TooltipTStr.LockedTableRedo);
    };

    export function unlockUndoRedo(): void {
        let lastUndoMessage: string = $undo.data("lastmessage");
        let lastUndoState: string = $undo.data("laststate");
        $undo.removeClass("locked");
        $redo.removeClass("locked");
        if (lastUndoState !== "disabled") {
            $undo.removeClass("disabled");
        }

        xcTooltip.changeText($undo, lastUndoMessage);

        let lastRedoMessage: string = $redo.data("lastmessage");
        let lastRedoState: string = $redo.data("laststate");
        if (lastRedoState !== "disabled") {
            $redo.removeClass("disabled");
        }

        xcTooltip.changeText($redo, lastRedoMessage);
    };

    function initialize(): void {
        logCursor = -1;
        logToCommit = "";
        errToCommit = "";
        overwrittenToCommit = "";
        logCache = {
            "logs": [],
            "errors": [],
            "overwrittenLogs": [],
            "version": XVM.getVersion(true)
        };

        // a quick reference
        logs = logCache.logs;
        errors = logCache.errors;
        overwrittenLogs = logCache.overwrittenLogs;

        _isUndo = false;
        _isRedo = false;
    }

    function addEvents(): void {
        let $logButtons: JQuery = $("#logButtonWrap");
        // set up the log section
        $logButtons.on("click", ".machineLog", function() {
            $(this).removeClass("machineLog")
                    .addClass("humanLog");
            $machineTextarea.hide();
            $textarea.show();
            $logButtons.find(".collapseAll, .expandAll").removeClass("xc-disabled");
            if (hasTriggerScrollToBottom) {
                scrollToBottom();
                hasTriggerScrollToBottom = false;
            }
        });

        $logButtons.on("click", ".humanLog", function() {
            $(this).removeClass("humanLog")
                    .addClass("machineLog");
            $machineTextarea.show();
            $textarea.hide();
            $logButtons.find(".collapseAll, .expandAll").addClass("xc-disabled");
            if (hasTriggerScrollToBottom) {
                scrollToBottom();
                hasTriggerScrollToBottom = false;
            }
        });

        $logButtons.on("click", ".downloadLog", function() {
            downloadLog();
        });

        $logButtons.on("click", ".collapseAll", function() {
            $textarea.find(".logContentWrap").addClass("collapsed")
            .removeClass("expanded");
            isCollapsed = true;
        });

        $logButtons.on("click", ".expandAll", function() {
            $textarea.find(".logContentWrap").removeClass("collapsed")
            .addClass("expanded");
            isCollapsed = false;
        });

        $textarea.on("click", ".collapsed", function(event) {
            if ($(event.target).closest(".title").length) {
                return;
            }
            toggleLogSize($(this));
        });

        $textarea.on("click", ".title", function() {
            toggleLogSize($(this).parent());
        });
    }

    function commitLogs(): XDPromise<void> {
        if (logToCommit === "") {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gLogKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        let tmpLog: string = logToCommit;
        logToCommit = "";
        // should change logToCommit before async call

        kvStore.append(tmpLog, true)
        .then(deferred.resolve)
        .fail(function(error) {
            logToCommit = tmpLog;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function parseRawLog(rawLog: string): XcLogDurable[] {
        let parsedLogs: XcLogDurable[] = [];

        if (rawLog == null) {
            return parsedLogs;
        }

        try {
            let len: number= rawLog.length;
            if (rawLog.charAt(len - 1) === ",") {
                rawLog = rawLog.substring(0, len - 1);
            }
            let logStr: string = "[" + rawLog + "]";
            parsedLogs = JSON.parse(logStr);
            return parsedLogs;
        } catch (error) {
            xcConsole.error("parse log failed", error);
            return null;
        }
    }

    function stringifyLog(logs: XcLog[]): string {
        let logStr = JSON.stringify(logs);
        // strip "[" and "]" and add comma
        logStr = logStr.substring(1, logStr.length - 1) + ",";
        return logStr;
    }

    // restore logs
    function restoreLogs(oldLogCursor: number): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gLogKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog) {
            let oldLogs: XcLogDurable[] = parseRawLog(rawLog);
            if (oldLogs != null) {
                if (oldLogCursor == null || oldLogCursor >= oldLogs.length) {
                    // error case
                    xcConsole.error("Lost old cursor track");
                    oldLogCursor = oldLogs.length - 1;
                }
                let restoredLogs: XcLog[] = [];
                for (let i = 0; i <= oldLogCursor; i++) {
                    restoredLogs.push(new XcLog(oldLogs[i]));
                }
                for (let i = 0; i < restoredLogs.length; i++) {
                    logCursor++;
                    logs[logCursor] = restoredLogs[i];
                }
                showLog(null, logCursor, restoredLogs);
                infList.restore(".logContentWrap");
                infListMachine.restore(".cliWrap");

                lastRestoreCursor = logCursor;

                if (logCursor < oldLogs.length - 1) {
                    // need to do it to detect overwrite of old logs
                    // but we don't restore the logs from
                    // oldCusror to olgLogs.length becaue the redo table
                    // is removed
                    shouldOverWrite = true;
                }
                deferred.resolve();
            } else {
                deferred.reject(logRestoreError);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // restore error logs
    function restoreErrors(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gErrKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog) {
            let oldErrors: XcLogDurable[] = parseRawLog(rawLog);

            if (oldErrors == null) {
                return PromiseHelper.reject(logRestoreError);
            }

            if (errors.length > 0) {
                console.warn(errors);
            }

            oldErrors.forEach(function(oldErr) {
                let errorLog: XcLog = new XcLog(oldErr);
                errors.push(errorLog);
            });

            deferred.resolve();

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function restoreOverwrittenLogs(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gOverwrittenLogKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog: string) {
            let oldOverwrites: XcLogDurable[] = parseRawLog(rawLog);

            if (oldOverwrites == null) {
                return PromiseHelper.reject(logRestoreError);
            }

            if (overwrittenLogs.length > 0) {
                console.warn(overwrittenLogs);
            }

            oldOverwrites.forEach(function(oldOverwrite) {
                let overwriteLog = new XcLog(oldOverwrite);
                overwrittenLogs.push(overwriteLog);
            });

            deferred.resolve();

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // if restore, log is an array
    function addLog(log: XcLog, willCommit?: boolean): void {
        // normal log
        if (shouldOverWrite || logCursor !== logs.length - 1) {
            // when user do a undo before
            for (let i = logCursor + 1; i < logs.length; i++) {
                overwrittenLogs.push(logs[i]);
                overwrittenToCommit += JSON.stringify(logs[i]) + ",";
            }

            logCursor++;
            logs[logCursor] = log;
            logs.length = logCursor + 1;

            localCommit();
            // must set to "" before async call, other wise KVStore.commit
            // may mess it up
            logToCommit = "";
            let key: string = KVStore.getKey("gLogKey");
            let logStr: string = stringifyLog(logs);
            let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
            kvStore.put(logStr, true)
            .then(function() {
                localCommit();

                // should also keep all meta in sync
                if (!willCommit) {
                    // if willCommit is true,
                    // this operation is commit in Transaction.done
                    return KVStore.commit();
                }
            })
            .then(function() {
                // XXX test
                console.info("Overwrite log");
                dropUndoneTables();
                DagTabManager.Instance.deleteHiddenTabs();
                shouldOverWrite = false;
            })
            .fail(function(error) {
                console.error("Overwrite log fails!", error);
            });
        } else {
            logCursor++;
            logs[logCursor] = log;
            logToCommit += JSON.stringify(log) + ",";
            // XXX FIXME: uncomment it if commit on errorLog only has bug
            // localCommit();
        }

        showLog(log, logCursor);
    }

    // XXX TODO: update it if necessary
    function dropUndoneTables(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tables: TableId[] = [];
        let table: TableMeta;
        for (let tableId in gTables) {
            table = gTables[tableId];
            if (table.getType() === TableType.Undone) {
                tables.push(table.getId());
            }
        }

        if (tables.length) {
            TblManager.deleteTables(tables, TableType.Undone, true, true)
            .always(function() {
                // just resolve even if it fails
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    function getUndoType(xcLog: XcLog): number {
        let operation: string = xcLog.getOperation();
        if (operation == null) {
            console.error("Invalid log", xcLog);
            return UndoType.Invalid;
        }
        // XXX temp hack to prevent undoing in dataflow2.0 on refresh
        if (xcLog.options.noUndo) {
            return UndoType.Invalid;
        }

        switch (operation) {
            case SQLOps.RemoveDagTab:
            case SQLOps.DeleteDataflow:
            case SQLOps.DebugPlan:
                return UndoType.Invalid;
            case SQLOps.DSImport:
            case SQLOps.TableFromDS:
            case SQLOps.RestoreTable:
            case SQLOps.DestroyDS:
            case SQLOps.DeleteTable:
            case SQLOps.DeleteAgg:
            case SQLOps.PreviewDS:
            case SQLOps.DestroyPreviewDS:
            case SQLOps.Profile:
            case SQLOps.ProfileSort:
            case SQLOps.ProfileBucketing:
            case SQLOps.ProfileAgg:
            case SQLOps.ProfileStats:
            case SQLOps.QuickAgg:
            case SQLOps.Corr:
            case SQLOps.Aggr:
            case "roundToFixed": // this is a deprecated op in Chronos Patch Set 1
                return UndoType.Skip;
            default:
                let options = xcLog.getOptions();
                if (options && options.tableName) {
                    if (DagTable.Instance.getTable() !== options.tableName) {
                        if (options.newTableName && // sort case
                            DagTable.Instance.getTable() === options.newTableName) {
                            return UndoType.Valid;
                        } else {
                            return UndoType.Skip;
                        }
                    }
                }

                return UndoType.Valid;
        }
    }

    function undoLog(xcLog: XcLog, cursor: number): XDPromise<number> {
        xcAssert((xcLog != null), "invalid log");

        let deferred: XDDeferred<number> = PromiseHelper.deferred();

        let logLen: number = logs.length;
        let isMostRecent: boolean = (cursor === (logLen - 1));
        Undo.run(xcLog, isMostRecent)
        .then(function() {
            if (logs.length !== logLen) {
                // XXX debug use
                console.error("log length should not change during undo!");
            }
            // update cursor, so intermediate undo fail doest have side effect
            logCursor = cursor - 1; // update cursor
            deferred.resolve(cursor);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function redoLog(xcLog, cursor): XDPromise<number>  {
        xcAssert((xcLog != null), "invalid log");

        let deferred: XDDeferred<number> = PromiseHelper.deferred();

        let logLen: number = logs.length;
        Redo.run(xcLog)
        .then(function() {
            if (logs.length !== logLen) {
                // XXX debug use
                console.error("log lenght should not change during undo!");
            }
            // update cursor, so intermediate redo fail doest have side effect
            logCursor = cursor;
            deferred.resolve(cursor);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    export function updateUndoRedoState(): void {
        xcTooltip.hideAll();

        // check redo
        let next: number = logCursor + 1;
        while (next < logs.length && getUndoType(logs[next]) === UndoType.Skip) {
            next++;
        }

        if (next === logs.length) {
            // when nothing to redo
            let tooltip: string = TooltipTStr.NoRedo;
            $redo.addClass("disabled")
                 .data("lastmessage", tooltip)
                 .data("laststate", "disabled");
            xcTooltip.changeText($redo, tooltip);

        } else if (getUndoType(logs[next]) !== UndoType.Valid) {
            console.error("Have invalid log to redo", logs[next]);
            $redo.addClass("disabled")
                 .data("lastmessage", TooltipTStr.NoRedo)
                 .data("laststate", "disabled");
            xcTooltip.changeText($redo, TooltipTStr.NoRedo);
        } else {
            // when can redo
            let redoTitle: string = xcStringHelper.replaceMsg(TooltipTStr.Redo, {
                "op": logs[next].getTitle()
            });

            $redo.removeClass("disabled")
                 .data("lastmessage", redoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($redo, redoTitle);
        }

        // check undo
        let cur: number = logCursor;
        while (cur >= 0 &&
            cur > lastRestoreCursor &&
            getUndoType(logs[cur]) === UndoType.Skip
        ) {
            cur--;
        }

        let undoTitle;
        if (cur === -1 || cur === lastRestoreCursor) {
            // when no operation to undo
            $undo.addClass("disabled")
                 .data("lastmessage", TooltipTStr.NoUndoNoOp)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, TooltipTStr.NoUndoNoOp);
        } else if (getUndoType(logs[cur]) !== UndoType.Valid) {
            // when cannot undo
            undoTitle = xcStringHelper.replaceMsg(TooltipTStr.NoUndo, {
                "op": logs[cur].getTitle()
            });

            $undo.addClass("disabled")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, undoTitle);
        } else {
            // when can undo
            undoTitle = xcStringHelper.replaceMsg(TooltipTStr.Undo, {
                "op": logs[cur].getTitle()
            });
            $undo.removeClass("disabled")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($undo, undoTitle);
        }
    }

    function updateLogPanel(cursor: number): void {
        // the idea is: we use an id the mark the log and cli,
        // so all logs/clis before logCurosor's position should show
        // others should hide
        let $logs: JQuery = $($textarea.find(".logContentWrap").get().reverse());
        $logs.show();
        $logs.each(function() {
            let $log: JQuery = $(this);
            let id: number = $log.data("log");
            if (id > cursor) {
                $log.hide();
            } else {
                return false; // stop loop
            }
        });

        let $clis: JQuery = $($machineTextarea.find(".cliWrap").get().reverse());
        $clis.show();
        $clis.each(function() {
            let $cli: JQuery = $(this);
            let cliId: number = $cli.data("cli");
            if (cliId > cursor) {
                $cli.hide();
            } else {
                return false; // stop loop
            }
        });

        scrollToBottom();
    }

    function resetLoclStore(): void {
        xcLocalStorage.removeItem(logLocalStoreKey);
    }

    function localCommit(): void {
        setTimeout(() => { // writing to storage may be slow
            if (!isOverflow) {
                if (!xcLocalStorage.setItem(logLocalStoreKey, JSON.stringify(logCache))) {
                    isOverflow = true;
                    resetLoclStore();
                }
            }
        });

    }

    // if isRestore, log is an array of logs
    function showLog(log: XcLog, cursor: number, restoredLogs?: XcLog[]): void {
        // some log is overwritten because of undo and redo, should remove them
        let cliHtml: string = "";
        let cliMachine: string = "";
        if (!restoredLogs) {
            let $logs: JQuery = $($textarea.find(".logContentWrap").get().reverse());
            $logs.each(function() {
                let $log: JQuery = $(this);
                let id: number = $log.data("log");
                if (id >= cursor) {
                    $log.remove();
                } else {
                    return false; // stop loop
                }
            });

            let $clis: JQuery = $($machineTextarea.find(".cliWrap").get().reverse());
            $clis.each(function() {
                let $cli: JQuery = $(this);
                let cliId: number = $cli.data("cli");
                if (cliId >= cursor) {
                    $cli.remove();
                } else {
                    return false; // stop loop
                }
            });
            cliHtml = getCliHTML(log, logCursor);
            cliMachine = getCliMachine(log, logCursor);
        } else {
            for (let i = 0; i < restoredLogs.length; i++) {
                cliHtml += getCliHTML(restoredLogs[i], i);
                cliMachine += getCliMachine(restoredLogs[i], i);
            }
        }

        $textarea.append(cliHtml);
        $machineTextarea.append(cliMachine);
    }

    function getCliHTML(xcLog: XcLog, id: number): HTML {
        let options = xcLog.options;
        if (xcLog.getSQLType() === SQLType.Error) {
            return "";
        }

        let undoType: number = getUndoType(xcLog);
        if (undoType === UndoType.Skip) {
            // not display it
            return "";
        }

        let opsToExclude: any[] = options.htmlExclude || []; // array of keys to
        // exclude from HTML
        opsToExclude.push("noUndo"); // XXX temp
        let collapseClass: string;
        if (isCollapsed) {
            collapseClass = " collapsed";
        } else {
            collapseClass = " expanded";
        }
        let html: HTML = '<div class="logContentWrap '+ collapseClass +
                    '" data-log=' + id + '>' +
                    '<div class="title"> >>' + xcLog.getTitle() +
                        '<span class="colon">:</span>' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</span>' +
                    '</div>' +
                    '<div class="content">{';
        let count: number = 0;

        for (let key in options) {
            // not show up null value
            if (options[key] == null) {
                continue;
            }
            if (opsToExclude.indexOf(key) !== -1 || key === "htmlExclude") {
                continue;
            }

            if (count > 0) {
                html += ',';
            }
            let val: string = JSON.stringify(options[key]);
            val = xcStringHelper.escapeHTMLSpecialChar(val);
            html += '<span class="' + key + '">' +
                        '<span class="logKey">' + key + '</span>' +
                        '<span class="logColon">:</span>' +
                        '<span class="logVal">' + val + '</span>' +
                    '</span>';
            count++;
        }

        html += '}</div></div></div>';
        html = html.replace(/,/g, ", ");

        return (html);
    }

    function getCliMachine(xcLog: XcLog, id: number): HTML {
        // Here's the real code
        if (xcLog.getSQLType() === SQLType.Error) {
            return "";
        }

        let isBackOp: boolean = isBackendOperation(xcLog);

        if (isBackOp == null || isBackOp === false) {
            // unsupport operation or front end operation
            return "";
        } else {
            // thrift operation
            let string: HTML = '<span class="cliWrap" data-cli=' + id + '>' +
                            xcStringHelper.escapeHTMLSpecialChar(xcLog.getCli()) +
                         '</span>';
            return string;
        }
    }

    function downloadLog(): void {
        let value: string;
        if ($machineTextarea.is(":visible")) {
            xcAssert(!$textarea.is(":visible"),
                    "human and android cannot coexist!");
            value = $machineTextarea.text();
        } else {
            xcAssert(!$machineTextarea.is(":visible"),
                    "human and android cannot coexist!");
            xcAssert($textarea.is(":visible"),
                    "At least one bar should be showing");
            value = JSON.stringify(getAllLogs());
        }
        xcHelper.downloadAsFile("xcalar.log", value);
    }

    function toggleLogSize($section: JQuery): void {
        $section.toggleClass("collapsed");
        $section.toggleClass("expanded");
        if ($textarea.find(".expanded").length) {
            isCollapsed = false;
        } else if ($textarea.find(".collapsed").length) {
            isCollapsed = true;
        }
    }

    function getCondensedErrors(): XcLog[] {
        let condErrors: XcLog[]  = [];
        let lastError: XcLog;
        let diffFound: boolean;
        let numRepeats: number = 0;
        let currError: XcLog;

        for (let i = 0; i < errors.length; i++) {
            currError = errors[i];
            diffFound = false;
            if (lastError && currError.getTitle() === lastError.getTitle()) {
                for (let prop in currError) {
                    if (prop !== "timestamp") {
                        if (typeof currError[prop] === "object") {
                            if (typeof lastError[prop] === "object") {
                                if (!xcHelper.deepCompare(currError[prop],
                                                          lastError[prop])) {
                                    diffFound = true;
                                    break;
                                }
                            } else {
                                diffFound = true;
                                break;
                            }
                        } else if (currError[prop] !== lastError[prop]) {
                            diffFound = true;
                            break;
                        }
                    }
                }
                if (diffFound) {
                    addError();
                } else {
                    numRepeats++;
                }
            } else {
                addError();
            }
            lastError = currError;
        }

        addError();

        function addError(): void {
            if (!$.isEmptyObject(lastError)) {
                if (numRepeats) {
                    lastError["errorRepeated"] = numRepeats;
                }
                condErrors.push(lastError);
            }

            numRepeats = 0;
        }
        return condErrors;
    }

    function isBackendOperation(xcLog: XcLog): boolean {
        let operation: string = xcLog.getOperation();

        switch (operation) {
            // front end opeartion
            case (SQLOps.HideCol):
            case (SQLOps.ReorderCol):
            case (SQLOps.AddNewCol):
            case (SQLOps.PullCol):
            case (SQLOps.PullMultipleCols):
            case (SQLOps.RenameCol):
            case (SQLOps.TextAlign):
            case (SQLOps.MinimizeCols):
            case (SQLOps.MaximizeCols):
            case (SQLOps.SortTableCols):
            case (SQLOps.ResizeTableCols):
            case (SQLOps.DragResizeTableCol):
            case (SQLOps.DragResizeRow):
            case (SQLOps.ChangeFormat):
            case (SQLOps.ConnectOperations):
            case (SQLOps.DisconnectOperations):
            case (SQLOps.RemoveOperations):
            case (SQLOps.AddOperation):
            case (SQLOps.CopyOperations):
            case (SQLOps.PasteOperations):
            case (SQLOps.MoveOperations):
            case (SQLOps.NewDagTab):
            case (SQLOps.RemoveDagTab):
            case (SQLOps.DeleteDataflow):
            case (SQLOps.DupDagTab):
            case (SQLOps.EditDescription):
            case (SQLOps.NewComment):
            case (SQLOps.EditComment):
            case (SQLOps.EditNodeTitle):
            case (SQLOps.DagBulkOperation):
                return false;
            // thrift operation
            case (SQLOps.DestroyDS):
            case (SQLOps.PreviewDS):
            case (SQLOps.DestroyPreviewDS):
            case (SQLOps.DeleteTable):
            case (SQLOps.DeleteAgg):
            case (SQLOps.DSImport):
            case (SQLOps.Filter):
            case (SQLOps.Sort):
            case (SQLOps.Join):
            case (SQLOps.Aggr):
            case (SQLOps.Map):
            case (SQLOps.GroupBy):
            case (SQLOps.QuickAgg):
            case (SQLOps.Corr):
            case (SQLOps.SplitCol):
            case (SQLOps.ChangeType):
            case (SQLOps.Round):
            case (SQLOps.Profile):
            case (SQLOps.ProfileSort):
            case (SQLOps.ProfileBucketing):
            case (SQLOps.ProfileAgg):
            case (SQLOps.ProfileStats):
            case (SQLOps.Project):
                return true;
            default:
                console.warn("XXX! Operation unexpected", operation);
                return null;
        }
    }

    function commitOverwrittenLogs(): XDPromise<void> {
        if (overwrittenToCommit === "") {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tmpLog: string = overwrittenToCommit;
        overwrittenToCommit = "";

        let key: string = KVStore.getKey("gOverwrittenLogKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK)
        kvStore.append(tmpLog, true)
        .then(deferred.resolve)
        .fail(function(error) {
            overwrittenToCommit = tmpLog;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function refreshTooltip($button: JQuery) {
        $button = $button.filter((_index, el) => {
            return $(el).is(":visible");
        });
        xcTooltip.refresh($button, 2000);
    }


    // /* Unit Test Only */
    if (window["unitTestMode"]) {
        Log["__testOnly__"] = {
            isBackendOperation: isBackendOperation,
            getCliMachine: getCliMachine,
            getCliHTML: getCliHTML,
            getUndoType: getUndoType,
            UndoType: UndoType
        };
    }
    // /* End Of Unit Test Only */
}
