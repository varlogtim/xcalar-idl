window.Log = (function($, Log) {
    var $textarea;        // $("#log-TextArea");
    var $machineTextarea; // $("#log-MachineTextArea");

    var $undo; // $("#undo");
    var $redo; // $("#redo");

    // keep in sync with initialize
    var logCursor = -1;
    var logToCommit = "";
    var errToCommit = "";
    var overwrittenToCommit = "";
    var logCache = {
        "logs": [],
        "errors": [],
        "overwrittenLogs": [] // stores logs overwritten after an undo
    };
    var logs = logCache.logs;
    var errors = logCache.errors;
    var overwrittenLogs = logCache.overwrittenLogs;
    // mark if it's in a undo redo action
    var isUndo = false;
    var isRedo = false;
    var shouldOverWrite = false;
    var lastSavedCursor = logCursor;
    var lastRestoreCursor = logCursor;

    // constant
    var logLocalStoreKey = "xcalar-query";
    var logRestoreError = "restore log error";
    var UndoType = {
        "Valid": 0,   // can undo/redo
        "Skip": 1,   // should skip undo/redo
        "Invalid": 2    // cannot undo/redo
    };
    var isCollapsed = false;
    var hasTriggerScrollToBottom = false;
    var infList;
    var infListMachine;
    var isOverflow = false;

    Log.setup = function() {
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

    Log.hasUncommitChange = function() {
        return (logToCommit !== "") || (logCursor !== logs.length - 1);
    };

    Log.restore = function(oldLogCursor, isKVEmpty) {
        var deferred = PromiseHelper.deferred();

        if (isKVEmpty) {
            updateUndoRedoState();
            return deferred.resolve().promise();
        }

        isCollapsed = UserSettings.getPref("sqlCollapsed");

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
                Log.clear();
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        })
        .always(function() {
            updateUndoRedoState();
            Log.scrollToBottom();
        });

        return deferred.promise();
    };

    Log.upgrade = function(oldRawLogs) {
        var oldLogs = parseRawLog(oldRawLogs);
        if (oldLogs == null) {
            return null;
        }

        var newLogs = [];
        oldLogs.forEach(function(oldLog) {
            var newLog = KVStore.upgrade(oldLog, "XcLog");
            newLogs.push(newLog);
        });

        if (newLogs.length === 0) {
            return "";
        } else {
            return stringifyLog(newLogs);
        }
    };

    Log.add = function(title, options, cli, willCommit) {
        options = options || {};

        if ($.isEmptyObject(options)) {
            console.warn("Options for", title, "is empty!");
            return;
        }

        if (isUndo || isRedo) {
            return;
        }

        var xcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli
        });

        addLog(xcLog, false, willCommit);

        Log.scrollToBottom();
        updateUndoRedoState();
    };

    Log.errorLog = function(title, options, cli, error) {
        var xcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli,
            "error": error
        });
        errors.push(xcLog);

        errToCommit += JSON.stringify(xcLog) + ",";
        localCommit();
    };

    Log.commit = function() {
        var deferred = PromiseHelper.deferred();

        commitLogs()
        .then(function() {
            lastSavedCursor = logCursor;
            return Log.commitErrors();
        })
        .then(function() {
            return commitOverwrittenLogs();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    Log.commitErrors = function() {
        if (errToCommit === "") {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();

        var key = KVStore.getKey("gErrKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        var tmpLog = errToCommit;
        errToCommit = "";

        kvStore.append(tmpLog, true)
        .then(deferred.resolve)
        .fail(function(error) {
            errToCommit = tmpLog;
            deferred.reject(error);
        });

        return deferred.promise();
    };

    Log.getCursor = function() {
        return logCursor;
    };

    Log.getLogs = function() {
        return logs;
    };

    Log.getErrorLogs = function(condensed) {
        if (condensed) {
            return getCondensedErrors();
        } else {
            return errors;
        }
    };

    Log.getConsoleErrors = function() {
        return errors.filter(function(err) {
            return err.title === "Console error";
        });
    };

    Log.getAllLogs = function(condensed) {
        if (condensed) {
            return {"logs": logs,
                    "errors": getCondensedErrors(),
                    "overwrittenLogs": overwrittenLogs,
                    "version": XVM.getVersion(true)};
        } else {
            return logCache;
        }
    };

    Log.getLocalStorage = function() {
        return xcLocalStorage.getItem(logLocalStoreKey);
    };

    Log.getBackup = function() {
        var key = logLocalStoreKey + "-backup";
        return xcLocalStorage.getItem(key);
    };

    Log.backup = function() {
        if (xcManager.isInSetup() || isOverflow) {
            // start up time error don't trigger backup
            // or it may overwrite old log backup
            return;
        }

        var key = logLocalStoreKey + "-backup";
        if (!xcLocalStorage.setItem(key, JSON.stringify(logCache))) {
            isOverflow = true;
            // Remove logCache from local storage because
            // it's no longer up to date and may be misleading
            // but takes up memory which may affect other storage
            xcLocalStorage.removeItem(key);
        }
    };

    Log.clear = function() {
        $textarea.html("");
        $machineTextarea.html("");
        initialize();
    };

    Log.scrollToBottom = function() {
        xcHelper.scrollToBottom($textarea);
        xcHelper.scrollToBottom($machineTextarea);
        // when one panel scroll to bottom,
        // another panel didn't scroll as it's hidden
        // use this flag to mark
        hasTriggerScrollToBottom = true;
    };

    // inBackground: boolean, to do it behind the scenes without user knowing
    Log.undo = function(step, inBackground) {
        var deferred = PromiseHelper.deferred();
        xcAssert((isUndo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        var c = logCursor;
        var promises = [];

        for (var i = 0; i < step; i++) {
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

            var xcLog = logs[c];
            if (getUndoType(xcLog) !== UndoType.Valid) {
                // cannot undo
                break;
            }

            promises.push(undoLog.bind(this, xcLog, c));
            c--;
        }

        isUndo = true;
        Log.lockUndoRedo();
        var passed = false;
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
            isUndo = false;
            Log.unlockUndoRedo();
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

    Log.repeat = function() {
        if ($("#redo").hasClass("locked")) {
            return PromiseHelper.reject();
        }
        var deferred = PromiseHelper.deferred();
        var logLen = logs.length;
        if (!logLen || logCursor !== logLen - 1) {
            return PromiseHelper.resolve();
        } else {
            var xcLog = logs[logCursor];
            Repeat.run(xcLog)
            .then(deferred.resolve)
            .fail(deferred.reject);
            // if fails do nothing
            return deferred.promise();
        }
    };

    Log.redo = function(step) {
        var deferred = PromiseHelper.deferred();
        xcAssert((isRedo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        var logLen = logs.length;
        var c = logCursor + 1;
        var promises = [];

        for (var i = 0; i < step; i++) {
            if (c >= logLen) {
                // cannot redo anymore
                break;
            }

            var xcLog = logs[c];
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

        isRedo = true;
        Log.lockUndoRedo();
        var passed = false;
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
            isRedo = false;
            Log.unlockUndoRedo();
            updateUndoRedoState();
            refreshTooltip($redo);
            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    };

    Log.isUndo = function() {
        return isUndo;
    };

    Log.isRedo = function() {
        return isRedo;
    };

    Log.viewLastAction = function(detailed) {
        var curLog = logs[logCursor];
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

    Log.lockUndoRedo = function() {
        $undo.addClass("disabled locked");
        xcTooltip.changeText($undo, TooltipTStr.LockedTableUndo);

        $redo.addClass("disabled locked");
        xcTooltip.changeText($redo, TooltipTStr.LockedTableRedo);
    };

    Log.unlockUndoRedo = function() {
        var lastUndoMessage = $undo.data("lastmessage");
        var lastUndoState = $undo.data("laststate");
        $undo.removeClass("locked");
        $redo.removeClass("locked");
        if (lastUndoState !== "disabled") {
            $undo.removeClass("disabled");
        }

        xcTooltip.changeText($undo, lastUndoMessage);

        var lastRedoMessage = $redo.data("lastmessage");
        var lastRedoState = $redo.data("laststate");
        if (lastRedoState !== "disabled") {
            $redo.removeClass("disabled");
        }

        xcTooltip.changeText($redo, lastRedoMessage);
    };

    function initialize() {
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

        isUndo = false;
        isRedo = false;
    }

    function addEvents() {
        var $logButtons = $("#logButtonWrap");
        // set up the log section
        $logButtons.on("click", ".machineLog", function() {
            $(this).removeClass("machineLog")
                    .addClass("humanLog");
            $machineTextarea.hide();
            $textarea.show();
            $logButtons.find(".collapseAll, .expandAll").removeClass("xc-disabled");
            if (hasTriggerScrollToBottom) {
                Log.scrollToBottom();
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
                Log.scrollToBottom();
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

    function commitLogs() {
        if (logToCommit === "") {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gLogKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        var tmpLog = logToCommit;
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

    function parseRawLog(rawLog) {
        var parsedLogs = [];

        if (rawLog == null) {
            return parsedLogs;
        }

        try {
            var len = rawLog.length;
            if (rawLog.charAt(len - 1) === ",") {
                rawLog = rawLog.substring(0, len - 1);
            }
            var logStr = "[" + rawLog + "]";
            parsedLogs = JSON.parse(logStr);
            return parsedLogs;
        } catch (error) {
            xcConsole.error("parse log failed", error);
            return null;
        }
    }

    function stringifyLog(logs) {
        var logStr = JSON.stringify(logs);
        // strip "[" and "]" and add comma
        logStr = logStr.substring(1, logStr.length - 1) + ",";
        return logStr;
    }

    // restore logs
    function restoreLogs(oldLogCursor) {
        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gLogKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog) {
            var oldLogs = parseRawLog(rawLog);
            if (oldLogs != null) {
                if (oldLogCursor == null || oldLogCursor >= oldLogs.length) {
                    // error case
                    xcConsole.error("Lost old cursor track");
                    oldLogCursor = oldLogs.length - 1;
                }
                var logs = [];
                for (var i = 0; i <= oldLogCursor; i++) {
                    logs.push(new XcLog(oldLogs[i]));
                }

                addLog(logs, true);
                infList.restore(".logContentWrap");
                infListMachine.restore(".cliWrap");

                lastSavedCursor = logCursor;
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
    function restoreErrors() {
        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gErrKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog) {
            var oldErrors = parseRawLog(rawLog);

            if (oldErrors == null) {
                return PromiseHelper.reject(logRestoreError);
            }

            if (errors.length > 0) {
                console.warn(errors);
            }

            oldErrors.forEach(function(oldErr) {
                var errorLog = new XcLog(oldErr);
                errors.push(errorLog);
            });

            deferred.resolve();

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function restoreOverwrittenLogs() {
        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gOverwrittenLogKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(rawLog) {
            var oldOverwrites = parseRawLog(rawLog);

            if (oldOverwrites == null) {
                return PromiseHelper.reject(logRestoreError);
            }

            if (overwrittenLogs.length > 0) {
                console.warn(overwrittenLogs);
            }

            oldOverwrites.forEach(function(oldOverwrite) {
                var overwriteLog = new XcLog(oldOverwrite);
                overwrittenLogs.push(overwriteLog);
            });

            deferred.resolve();

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // if restore, log is an array
    function addLog(log, isRestore, willCommit) {
        // normal log
        if (shouldOverWrite || logCursor !== logs.length - 1) {
            // when user do a undo before
            for (var i = logCursor + 1; i < logs.length; i++) {
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
            var key = KVStore.getKey("gLogKey");
            var logStr = stringifyLog(logs);
            var kvStore = new KVStore(key, gKVScope.WKBK);
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
                shouldOverWrite = false;
            })
            .fail(function(error) {
                console.error("Overwrite log fails!", error);
            });
        } else {
            if (isRestore) { // if restore, log is an array
                for (var i = 0; i < log.length; i++) {
                    logCursor++;
                    logs[logCursor] = log[i];
                }
            } else {
                logCursor++;
                logs[logCursor] = log;
                logToCommit += JSON.stringify(log) + ",";
                // XXX FIXME: uncomment it if commit on errorLog only has bug
                // localCommit();
            }
        }

        showLog(log, logCursor, isRestore);
    }

    // XXX TODO: update it if necessary
    function dropUndoneTables() {
        var deferred = PromiseHelper.deferred();
        var tables = [];
        var table;
        for (var tableId in gTables) {
            table = gTables[tableId];
            if (table.getType() === TableType.Undone) {
                if (table.isNoDelete()) {
                    table.beOrphaned();
                } else {
                    tables.push(table.getId());
                }
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

    function getUndoType(xcLog) {
        var operation = xcLog.getOperation();
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
                return UndoType.Invalid;
            case SQLOps.DSImport:
            case SQLOps.TableFromDS:
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
                var options = xcLog.getOptions();
                if (options && options.tableName) {
                    if (DagTable.Instance.getTable() !== options.tableName) {
                        return UndoType.Skip;
                    }
                }
                return UndoType.Valid;

        }
    }

    function undoLog(xcLog, cursor) {
        xcAssert((xcLog != null), "invalid log");

        var deferred = PromiseHelper.deferred();

        var logLen = logs.length;
        var isMostRecent = (cursor === (logLen - 1));
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

    function redoLog(xcLog, cursor) {
        xcAssert((xcLog != null), "invalid log");

        var deferred = PromiseHelper.deferred();

        var logLen = logs.length;
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

    Log.updateUndoRedoState = updateUndoRedoState;

    function updateUndoRedoState() {
        xcTooltip.hideAll();

        // check redo
        var next = logCursor + 1;
        while (next < logs.length && getUndoType(logs[next]) === UndoType.Skip) {
            next++;
        }

        if (next === logs.length) {
            // when nothing to redo
            var tooltip = TooltipTStr.NoRedo;
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
            var redoTitle = xcHelper.replaceMsg(TooltipTStr.Redo, {
                "op": logs[next].getTitle()
            });

            $redo.removeClass("disabled")
                 .data("lastmessage", redoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($redo, redoTitle);
        }

        // check undo
        var cur = logCursor;
        while (cur >= 0 &&
            cur > lastRestoreCursor &&
            getUndoType(logs[cur]) === UndoType.Skip
        ) {
            cur--;
        }

        var undoTitle;
        if (cur === -1 || cur === lastRestoreCursor) {
            // when no operation to undo
            $undo.addClass("disabled")
                 .data("lastmessage", TooltipTStr.NoUndoNoOp)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, TooltipTStr.NoUndoNoOp);
        } else if (getUndoType(logs[cur]) !== UndoType.Valid) {
            // when cannot undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.NoUndo, {
                "op": logs[cur].getTitle()
            });

            $undo.addClass("disabled")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, undoTitle);
        } else {
            // when can undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.Undo, {
                "op": logs[cur].getTitle()
            });
            $undo.removeClass("disabled")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($undo, undoTitle);
        }
    }

    function updateLogPanel(cursor) {
        // the idea is: we use an id the mark the log and cli,
        // so all logs/clis before logCurosor's position should show
        // others should hide
        var $logs = $($textarea.find(".logContentWrap").get().reverse());
        $logs.show();
        $logs.each(function() {
            var $log = $(this);
            var id = $log.data("log");
            if (id > cursor) {
                $log.hide();
            } else {
                return false; // stop loop
            }
        });

        var $clis = $($machineTextarea.find(".cliWrap").get().reverse());
        $clis.show();
        $clis.each(function() {
            var $cli = $(this);
            var cliId = $cli.data("cli");
            if (cliId > cursor) {
                $cli.hide();
            } else {
                return false; // stop loop
            }
        });

        Log.scrollToBottom();
    }

    function resetLoclStore() {
        xcLocalStorage.removeItem(logLocalStoreKey);
    }

    function localCommit() {
        if (!isOverflow) {
            if (!xcLocalStorage.setItem(logLocalStoreKey, JSON.stringify(logCache))) {
                isOverflow = true;
                resetLoclStore();
            }
        }
    }

    // if isRestore, log is an array of logs
    function showLog(log, cursor, isRestore) {
        // some log is overwritten because of undo and redo, should remove them
        var cliHtml = "";
        var cliMachine = "";
        if (!isRestore) {
            var $logs = $($textarea.find(".logContentWrap").get().reverse());
            $logs.each(function() {
                var $log = $(this);
                var id = $log.data("log");
                if (id >= cursor) {
                    $log.remove();
                } else {
                    return false; // stop loop
                }
            });

            var $clis = $($machineTextarea.find(".cliWrap").get().reverse());
            $clis.each(function() {
                var $cli = $(this);
                var cliId = $cli.data("cli");
                if (cliId >= cursor) {
                    $cli.remove();
                } else {
                    return false; // stop loop
                }
            });
            cliHtml = getCliHTML(log, logCursor);
            cliMachine = getCliMachine(log, logCursor);
        } else {
            for (var i = 0; i < log.length; i++) {
                cliHtml += getCliHTML(log[i], i);
                cliMachine += getCliMachine(log[i], i);
            }
        }

        $textarea.append(cliHtml);
        $machineTextarea.append(cliMachine);
    }

    function getCliHTML(xcLog, id) {
        var options = xcLog.options;
        if (xcLog.sqlType === SQLType.Error) {
            return "";
        }

        var undoType = getUndoType(xcLog);
        if (undoType === UndoType.Skip) {
            // not display it
            return "";
        }

        var opsToExclude = options.htmlExclude || []; // array of keys to
        // exclude from HTML
        opsToExclude.push("noUndo"); // XXX temp
        var collapseClass;
        if (isCollapsed) {
            collapseClass = " collapsed";
        } else {
            collapseClass = " expanded";
        }
        var html = '<div class="logContentWrap '+ collapseClass +
                    '" data-log=' + id + '>' +
                    '<div class="title"> >>' + xcLog.title +
                        '<span class="colon">:</span>' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</span>' +
                    '</div>' +
                    '<div class="content">{';
        var count = 0;

        for (var key in options) {
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
            var val = JSON.stringify(options[key]);
            val = xcHelper.escapeHTMLSpecialChar(val);
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

    function getCliMachine(xcLog, id) {
        // Here's the real code
        if (xcLog.sqlType === SQLType.Error) {
            return "";
        }

        var isBackOp = isBackendOperation(xcLog);

        if (isBackOp == null || isBackOp === false) {
            // unsupport operation or front end operation
            return "";
        } else {
            // thrift operation
            var string = '<span class="cliWrap" data-cli=' + id + '>' +
                            xcHelper.escapeHTMLSpecialChar(xcLog.cli) +
                         '</span>';
            return string;
        }
    }

    function downloadLog() {
        var value;
        if ($machineTextarea.is(":visible")) {
            xcAssert(!$textarea.is(":visible"),
                    "human and android cannot coexist!");
            value = $machineTextarea.text();
        } else {
            xcAssert(!$machineTextarea.is(":visible"),
                    "human and android cannot coexist!");
            xcAssert($textarea.is(":visible"),
                    "At least one bar should be showing");
            value = JSON.stringify(Log.getAllLogs());
        }
        xcHelper.downloadAsFile("xcalar.log", value, false);
    }

    function toggleLogSize($section) {
        $section.toggleClass("collapsed");
        $section.toggleClass("expanded");
        if ($textarea.find(".expanded").length) {
            isCollapsed = false;
        } else if ($textarea.find(".collapsed").length) {
            isCollapsed = true;
        }
    }

    function getCondensedErrors() {
        var condErrors = [];
        var lastError = {};
        var diffFound;
        var numRepeats = 0;
        var currError;

        for (var i = 0; i < errors.length; i++) {
            currError = errors[i];
            diffFound = false;
            if (currError.title === lastError.title) {
                for (var prop in currError) {
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

        function addError() {
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

    function isBackendOperation(xcLog) {
        var operation = xcLog.getOperation();

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
            case (SQLOps.HideTable):
            case (SQLOps.UnhideTable):
            case (SQLOps.ChangeFormat):
            case (SQLOps.MarkPrefix):
            case (SQLOps.ConnectOperations):
            case (SQLOps.DisconnectOperations):
            case (SQLOps.RemoveOperations):
            case (SQLOps.AddOperation):
            case (SQLOps.CopyOperations):
            case (SQLOps.MoveOperations):
            case (SQLOps.NewDagTab):
            case (SQLOps.RemoveDagTab):
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
            case (SQLOps.Finalize):
            case (SQLOps.Ext):
            case (SQLOps.DFRerun):
            case (SQLOps.ExecSQL):
            case (SQLOps.RefreshTables):
                return true;
            default:
                console.warn("XXX! Operation unexpected", operation);
                return null;
        }
    }

    function commitOverwrittenLogs() {
        if (overwrittenToCommit === "") {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var tmpLog = overwrittenToCommit;
        overwrittenToCommit = "";

        var key = KVStore.getKey("gOverwrittenLogKey");
        var kvStore = new KVStore(key, gKVScope.WKBK)
        kvStore.append(tmpLog, true)
        .then(deferred.resolve)
        .fail(function(error) {
            overwrittenToCommit = tmpLog;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function refreshTooltip($button) {
        $button = $button.filter((index, el) => {
            return $(el).is(":visible");
        });
        xcTooltip.refresh($button, 2000);
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        Log.__testOnly__ = {};
        Log.__testOnly__.isBackendOperation = isBackendOperation;
        Log.__testOnly__.getCliMachine = getCliMachine;
        Log.__testOnly__.getCliHTML = getCliHTML;
        Log.__testOnly__.getUndoType = getUndoType;
        Log.__testOnly__.UndoType = UndoType;
    }
    /* End Of Unit Test Only */

    return (Log);
}(jQuery, {}));
