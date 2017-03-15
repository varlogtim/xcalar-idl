window.SQL = (function($, SQL) {
    var $sqlButtons;      // $("#sqlButtonWrap");
    var $textarea;        // $("#sql-TextArea");
    var $machineTextarea; // $("#sql-MachineTextArea");
    var $sqlMenu; // $("#sqlMenu");

    var $undo; // $("#undo");
    var $redo; // $("#redo");

    // keep in sync with initialize
    var logCursor = -1;
    var sqlToCommit = "";
    var errToCommit = "";
    var sqlCache = {
        "logs": [],
        "errors": []
    };
    var logs = sqlCache.logs;
    var errors = sqlCache.errors;
    // mark if it's in a undo redo action
    var isUndo = false;
    var isRedo = false;
    var lastSavedCursor = logCursor;

    // constant
    var sqlLocalStoreKey = "xcalar-query";
    var sqlRestoreError = "restore sql error";
    var UndoType = {
        "Valid": 0,   // can undo/redo
        "Skip": 1,   // should skip undo/redo
        "Invalid": 2    // cannot undo/redo
    };
    var isCollapsed = false;

    SQL.setup = function() {
        $sqlButtons = $("#sqlButtonWrap");
        $textarea = $("#sql-TextArea");
        $machineTextarea = $("#sql-MachineTextArea");
        $sqlMenu = $("#sqlMenu");

        $undo = $("#undo");
        $redo = $("#redo");

        initialize();
        // show human readabl SQL as default
        $machineTextarea.hide();

        // set up the sql section
        $sqlButtons.on("click", ".machineLog", function() {
            $(this).removeClass("machineLog xi-android-dot")
                    .addClass("humanLog xi-human-dot");
            $machineTextarea.hide();
            $textarea.show();
        });

        $sqlButtons.on("click", ".humanLog", function() {
            $(this).removeClass("humanLog xi-human-dot")
                    .addClass("machineLog xi-android-dot");
            $machineTextarea.show();
            $textarea.hide();
        });

        $sqlButtons.on("click", ".copyLog", function() {
            copyLog();
        });

        $undo.click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            SQL.undo();
        });

        $redo.click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            SQL.redo();
        });

        $textarea.on("click", ".title", function() {
            $(this).parent().toggleClass("collapsed");
            $(this).parent().toggleClass("expanded");
            if ($textarea.find(".expanded").length) {
                isCollapsed = false;
            } else if ($textarea.find(".collapsed").length) {
                isCollapsed = true;
            }
        });

        addMenuBehaviors($sqlMenu);
        setupMenuActions();

        $textarea.parent().contextmenu(function(event) {

            var $target = $(event.target);
            xcHelper.dropdownOpen($target, $sqlMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "floating": true
            });

            if ($machineTextarea.is(":visible")) {
                $sqlMenu.find(".expandAll, .collapseAll").hide();
                return false;
            } else {
                $sqlMenu.find(".expandAll, .collapseAll").show();
            }

            if ($textarea.find(".collapsed").length) {
                $sqlMenu.find(".expandAll").removeClass("unavailable");
            } else {
                $sqlMenu.find(".expandAll").addClass("unavailable");
            }

            if ($textarea.find(".expanded").length) {
                $sqlMenu.find(".collapseAll").removeClass("unavailable");
            } else {
                $sqlMenu.find(".collapseAll").addClass("unavailable");
            }

            return false;
        });


    };

    SQL.hasUnCommitChange = function() {
        return (sqlToCommit !== "") || (logCursor !== logs.length - 1);
    };

    SQL.restore = function(oldLogCursor, isKVEmpty) {
        var deferred = jQuery.Deferred();

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
            // XXX FIXME change back to localCommit() if it's buggy
            resetLoclStore();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error === sqlRestoreError) {
                SQL.clear();
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        })
        .always(function() {
            updateUndoRedoState();
        });

        return (deferred.promise());
    };

    SQL.upgrade = function(oldRawLogs) {
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

    SQL.add = function(title, options, cli, willCommit) {
        options = options || {};
        if ($.isEmptyObject(options)) {
            console.warn("Options for", title, "is empty!");
            return;
        }

        if (isUndo || isRedo) {
            // console.info("In undo redo, do not add sql");
            return;
        }

        var sql = new XcLog({
            "title": title,
            "options": options,
            "cli": cli
        });

        addLog(sql, false, willCommit);

        SQL.scrollToBottom();
        updateUndoRedoState();

        if (!isBackendOperation(sql)) {
            // we use this to mark unsave state
            KVStore.logChange();
        }
    };

    SQL.errorLog = function(title, options, cli, error) {
        var sql = new XcLog({
            "title": title,
            "options": options,
            "cli": cli,
            "error": error
        });
        errors.push(sql);

        errToCommit += JSON.stringify(sql) + ",";
        localCommit();
    };

    SQL.commit = function() {
        var deferred = jQuery.Deferred();

        commitLogs()
        .then(function() {
            lastSavedCursor = logCursor;
            return SQL.commitErrors();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    SQL.commitErrors = function() {
        if (errToCommit === "") {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var tmpSql = errToCommit;
        errToCommit = "";

        KVStore.append(KVStore.gErrKey, tmpSql, true, gKVScope.ERR)
        .then(deferred.resolve)
        .fail(function(error) {
            errToCommit = tmpSql;
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    SQL.getCursor = function() {
        return logCursor;
    };

    SQL.getLogs = function() {
        return logs;
    };

    SQL.getErrorLogs = function() {
        return errors;
    };

    SQL.getConsoleErrors = function() {
        var consoleErrors = [];
        for (var err in errors) {
            if (errors[err].title === "Console error") {
                consoleErrors.push(errors[err]);
            }
        }
        return consoleErrors;
    };

    SQL.getAllLogs = function() {
        return sqlCache;
    };

    SQL.getLocalStorage = function() {
        return xcLocalStorage.getItem(sqlLocalStoreKey);
    };

    SQL.getBackup = function() {
        var key = sqlLocalStoreKey + "-backup";
        return xcLocalStorage.getItem(key);
    };

    SQL.backup = function() {
        if (StartManager.isStart()) {
            // start up time error don't trigger backup
            // or it may overwrite old log backup
            return;
        }

        var key = sqlLocalStoreKey + "-backup";
        xcLocalStorage.setItem(key, JSON.stringify(sqlCache));
    };

    SQL.clear = function() {
        $textarea.html("");
        $machineTextarea.html("");
        initialize();
    };

    SQL.scrollToBottom = function() {
        xcHelper.scrollToBottom($textarea);
        xcHelper.scrollToBottom($machineTextarea);
    };

    SQL.undo = function(step) {
        var deferred = jQuery.Deferred();
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
                console.warn("Cannot find sql to undo");
                break;
            }

            var sql = logs[c];
            if (getUndoType(sql) !== UndoType.Valid) {
                // cannot undo
                break;
            }

            promises.push(undoLog.bind(this, sql, c));
            c--;
        }

        isUndo = true;
        $undo.addClass("disabled");
        var passed = false;
        PromiseHelper.chain(promises)
        .then(function() {
            // cursor in the current position
            logCursor = c;
            updateLogPanel(logCursor);
            passed = true;
            if (logCursor === lastSavedCursor) {
                KVStore.logSave();
            } else {
                KVStore.logChange();
            }
        })
        .fail(function(error) {
            console.error("undo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            isUndo = false;

            updateUndoRedoState();
            xcTooltip.refresh($undo);
            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    };

    SQL.redo = function(step) {
        var deferred = jQuery.Deferred();
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

            var sql = logs[c];
            if (getUndoType(sql) !== UndoType.Valid) {
                console.warn("Invalid sql to redo", sql);
                break;
            }

            promises.push(redoLog.bind(this, sql, c));
            c++;

            // also get back the skipped log
            while (c < logLen && getUndoType(logs[c]) === UndoType.Skip) {
                c++;
            }
        }

        isRedo = true;
        $redo.addClass("disabled");
        var passed = false;
        PromiseHelper.chain(promises)
        .then(function() {
            logCursor = c - 1;
            updateLogPanel(logCursor);
            passed = true;
            if (logCursor === lastSavedCursor) {
                KVStore.logSave();
            } else {
                KVStore.logChange();
            }
        })
        .fail(function(error) {
            console.error("redo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            isRedo = false;

            updateUndoRedoState();
            xcTooltip.refresh($redo);
            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    };

    SQL.isUndo = function() {
        return isUndo;
    };

    SQL.isRedo = function() {
        return isRedo;
    };

    SQL.viewLastAction = function(detailed) {
        var curSql = logs[logCursor];
        if (logCursor !== -1) {
            if (detailed) {
                return curSql;
            } else {
                return curSql.getTitle();
            }
        } else {
            return "none";
        }
    };

    SQL.lockUndoRedo = function() {
        $undo.addClass('disabled')
             .attr("data-original-title", TooltipTStr.LockedTableUndo);

        $redo.addClass('disabled')
             .attr("data-original-title", TooltipTStr.LockedTableRedo);
    };

    SQL.unlockUndoRedo = function() {
        var hasLockedTables = false;
        var allWS = WSManager.getWorksheets();
        for (var ws in allWS) {
            if (allWS[ws].lockedTables && allWS[ws].lockedTables.length) {
                hasLockedTables = true;
            }
        }

        if (!hasLockedTables) {
            var lastUndoMessage = $undo.data("lastmessage");
            var lastUndoState = $undo.data("laststate");
            if (lastUndoState !== "disabled") {
                $undo.removeClass("disabled");
            }

            $undo.attr("data-original-title", lastUndoMessage);

            var lastRedoMessage = $undo.data("lastmessage");
            var lastRedoState = $undo.data("laststate");
            if (lastRedoState !== "disabled") {
                $undo.removeClass("disabled");
            }

            $redo.attr("data-original-title", lastRedoMessage);
        }
    };

    function initialize() {
        logCursor = -1;
        sqlToCommit = "";
        errToCommit = "";
        sqlCache = {
            "logs": [],
            "errors": []
        };

        // a quick reference
        logs = sqlCache.logs;
        errors = sqlCache.errors;

        isUndo = false;
        isRedo = false;
    }

    function commitLogs() {
        if (sqlToCommit === "") {
            return jQuery.Deferred().resolve().promise();
        }

        var deferred = jQuery.Deferred();
        var tmpSql = sqlToCommit;
        sqlToCommit = "";
        // should change sqlToCommit before async call

        KVStore.append(KVStore.gLogKey, tmpSql, true, gKVScope.LOG)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            sqlToCommit = tmpSql;
            deferred.reject(error);
        });

        return (deferred.promise());
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
            var sqlStr = "[" + rawLog + "]";
            parsedLogs = JSON.parse(sqlStr);
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
        var deferred = jQuery.Deferred();
        KVStore.get(KVStore.gLogKey, gKVScope.LOG)
        .then(function(rawLog) {
            var oldLogs = parseRawLog(rawLog);

            if (oldLogs != null) {
                if (oldLogCursor == null || oldLogCursor >= oldLogs.length) {
                    // error case
                    xcConsole.error("Loose old cursor track");
                    oldLogCursor = oldLogs.length - 1;
                }
                for (var i = 0; i <= oldLogCursor; i++) {
                    var sql = new XcLog(oldLogs[i]);
                    addLog(sql, true);
                }
                lastSavedCursor = logCursor;

                deferred.resolve();
            } else {
                deferred.reject(sqlRestoreError);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // restore error logs
    function restoreErrors() {
        var deferred = jQuery.Deferred();
        KVStore.get(KVStore.gErrKey, gKVScope.ERR)
        .then(function(rawLog) {
            var oldErrors = parseRawLog(rawLog);

            if (oldErrors == null) {
                return PromiseHelper.reject(sqlRestoreError);
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

    function addLog(sql, isRestore, willCommit) {
        // normal log
        if (logCursor !== logs.length - 1) {
            // when user do a undo before
            logCursor++;
            logs[logCursor] = sql;
            logs.length = logCursor + 1;

            localCommit();
            // must set to "" before async call, other wise KVStore.commit
            // may mess it up
            sqlToCommit = "";

            var logStr = stringifyLog(logs);
            KVStore.put(KVStore.gLogKey, logStr, true, gKVScope.LOG)
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
                console.info("Overwrite sql log");
                WSManager.dropUndoneTables();
            })
            .fail(function(error) {
                console.error("Overwrite Sql fails!", error);
            });
        } else {
            logCursor++;
            logs[logCursor] = sql;

            if (!isRestore) {
                sqlToCommit += JSON.stringify(sql) + ",";
                // XXX FIXME: uncomment it if commit on errorLog only has bug
                // localCommit();
            }
        }

        showSQL(sql, logCursor);
    }

    function getUndoType(sql) {
        var operation = sql.getOperation();
        if (operation == null) {
            console.error("Invalid sql!", sql);
            return UndoType.Invalid;
        }

        switch (operation) {
            case SQLOps.DSPoint:
            case SQLOps.RenameOrphanTable:
            case SQLOps.DestroyDS:
            case SQLOps.DeleteTable:
            // case SQLOps.CreateFolder:
            // case SQLOps.DSRename:
            // case SQLOps.DSDropIn:
            // case SQLOps.DSInsert:
            // case SQLOps.DSToDir:
            // case SQLOps.DSDropBack:
            // case SQLOps.DelFolder:
            // case SQLOps.AddOtherUserDS:
                return UndoType.Invalid;
            case SQLOps.PreviewDS:
            case SQLOps.DestroyPreviewDS:
            case SQLOps.ExportTable:
            case SQLOps.Profile:
            case SQLOps.ProfileSort:
            case SQLOps.ProfileBucketing:
            case SQLOps.QuickAgg:
            case SQLOps.Corr:
            case SQLOps.Aggr:
            case SQLOps.DeleteAgg:
                return UndoType.Skip;
            default:
                return UndoType.Valid;

        }
    }

    function undoLog(sql, cursor) {
        xcAssert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var logLen = logs.length;
        var isMostRecent = (cursor === (logLen - 1));
        Undo.run(sql, isMostRecent)
        .then(function() {
            if (logs.length !== logLen) {
                // XXX debug use
                console.error("log lenght should not change during undo!");
            }
            // update cursor, so intermediate undo fail doest have side effect
            logCursor = cursor - 1; // update cursor
            deferred.resolve(cursor);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function redoLog(sql, cursor) {
        xcAssert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var logLen = logs.length;
        Redo.run(sql)
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

    function updateUndoRedoState() {
        xcTooltip.hideAll();

        var hasLockedTables = false;
        var allWS = WSManager.getWorksheets();
        for (var ws in allWS) {
            if (allWS[ws].lockedTables && allWS[ws].lockedTables.length) {
                hasLockedTables = true;
            }
        }

        // check redo
        var next = logCursor + 1;
        while (next < logs.length && getUndoType(logs[next]) === UndoType.Skip) {
            next++;
        }

        if (next === logs.length) {
            // when nothing to redo
            $redo.addClass("disabled")
                 .data("lastmessage", TooltipTStr.NoRedo)
                 .data("laststate", "disabled");
            xcTooltip.changeText($redo, TooltipTStr.NoRedo);

        } else if (getUndoType(logs[next]) !== UndoType.Valid) {
            console.error("Have invalid sql to redo", sql);
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
        while (cur >= 0 && getUndoType(logs[cur]) === UndoType.Skip) {
            cur--;
        }

        var undoTitle;
        if (cur === -1) {
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

        // change tooltip if lockedtables exist
        if (hasLockedTables) {
            $redo.addClass("disabled");
            xcTooltip.changeText($redo, TooltipTStr.LockedTableRedo);

            $undo.addClass("disabled");
            xcTooltip.changeText($undo, TooltipTStr.LockedTableUndo);
        }
    }

    function updateLogPanel(cursor) {
        // the idea is: we use an id the mark the sql and cli,
        // so all sqls/clis before logCurosor's position should show
        // others should hide
        var $sqls = $($textarea.find(".sqlContentWrap").get().reverse());
        $sqls.show();
        $sqls.each(function() {
            var $sql = $(this);
            var sqlId = $sql.data("sql");
            if (sqlId > cursor) {
                $sql.hide();
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

        SQL.scrollToBottom();
    }

    function resetLoclStore() {
        xcLocalStorage.removeItem(sqlLocalStoreKey);
    }

    function localCommit() {
        xcLocalStorage.setItem(sqlLocalStoreKey, JSON.stringify(sqlCache));
    }

    function showSQL(sql, cursor) {
        // some sql is overwritten because of undo and redo, should remove them
        var $sqls = $($textarea.find(".sqlContentWrap").get().reverse());
        $sqls.each(function() {
            var $sql = $(this);
            var sqlId = $sql.data("sql");
            if (sqlId >= cursor) {
                $sql.remove();
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

        $textarea.append(getCliHTML(sql, logCursor));
        $machineTextarea.append(getCliMachine(sql, logCursor));
    }

    function getCliHTML(sql, id) {
        var options = sql.options;
        if (sql.sqlType === SQLType.Error) {
            return "";
        }

        var undoType = getUndoType(sql);
        if (undoType === UndoType.Skip) {
            // not display it
            return "";
        }

        var opsToExclude = options.htmlExclude || []; // array of keys to
        // exclude from HTML
        var collapseClass;
        if (isCollapsed) {
            collapseClass = " collapsed";
        } else {
            collapseClass = " expanded";
        }
        var html = '<div class="sqlContentWrap '+ collapseClass +
                    '" data-sql=' + id + '>' +
                    '<div class="title"> >>' + sql.title +
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
            html += '<span class="' + key + '">' +
                        '<span class="sqlKey">' + key + '</span>' +
                        '<span class="sqlColon">:</span>' +
                        '<span class="sqlVal">' + val + '</span>' +
                    '</span>';
            count++;
        }

        html += '}</div></div></div>';
        html = html.replace(/,/g, ", ");

        return (html);
    }

    function getCliMachine(sql, id) {
        // Here's the real code
        if (sql.sqlType === SQLType.Error) {
            return "";
        }

        var isBackOp = isBackendOperation(sql);

        if (isBackOp == null || isBackOp === false) {
            // unsupport operation or front end operation
            return "";
        } else {
            // thrift operation
            var string = '<span class="cliWrap" data-cli=' + id + '>' +
                            sql.cli +
                         '</span>';
            return string;
        }
    }

    function copyLog() {
        var $hiddenInput = $("<input>");
        $("body").append($hiddenInput);
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
            value = JSON.stringify(SQL.getAllLogs());
        }

        $hiddenInput.val(value).select();
        document.execCommand("copy");
        $hiddenInput.remove();
        xcHelper.showSuccess(SuccessTStr.Copy);
    }

    function setupMenuActions() {
        $sqlMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data('action');
            if (!action) {
                return;
            }

            switch (action) {
                case ("copy"):
                    copyLog();
                    break;
                case ("collapseAll"):
                    $textarea.find(".sqlContentWrap").addClass("collapsed");
                    $textarea.find(".sqlContentWrap").removeClass("expanded");
                    isCollapsed = true;
                    break;
                case ("expandAll"):
                    $textarea.find(".sqlContentWrap").removeClass("collapsed");
                    $textarea.find(".sqlContentWrap").addClass("expanded");
                    isCollapsed = false;
                    break;
                default:
                    console.error("action not found");
                    break;
            }
        });
    }

    function isBackendOperation(sql) {
        var operation = sql.getOperation();

        switch (operation) {
            // front end opeartion
            case (SQLOps.HideCol):
            case (SQLOps.ReorderCol):
            case (SQLOps.ReorderTable):
            case (SQLOps.AddNewCol):
            case (SQLOps.PullCol):
            case (SQLOps.PullMultipleCols):
            case (SQLOps.ArchiveTable):
            case (SQLOps.ActiveTables):
            case (SQLOps.RenameCol):
            case (SQLOps.TextAlign):
            case (SQLOps.MinimizeCols):
            case (SQLOps.MaximizeCols):
            case (SQLOps.SortTableCols):
            case (SQLOps.ResizeTableCols):
            case (SQLOps.DragResizeTableCol):
            case (SQLOps.DragResizeRow):
            case (SQLOps.BookmarkRow):
            case (SQLOps.RemoveBookmark):
            case (SQLOps.HideTable):
            case (SQLOps.UnhideTable):
            case (SQLOps.AddWS):
            case (SQLOps.RenameWS):
            case (SQLOps.ReorderWS):
            case (SQLOps.DelWS):
            case (SQLOps.HideWS):
            case (SQLOps.UnHideWS):
            case (SQLOps.MoveTableToWS):
            case (SQLOps.MoveInactiveTableToWS):
            case (SQLOps.RevertTable):
            // case (SQLOps.CreateFolder):
            // case (SQLOps.DSRename):
            // case (SQLOps.DSDropIn):
            // case (SQLOps.DSInsert):
            // case (SQLOps.DSToDir):
            // case (SQLOps.DSDropBack):
            // case (SQLOps.DelFolder):
            case (SQLOps.AddOtherUserDS):
            case (SQLOps.ChangeFormat):
            case (SQLOps.RoundToFixed):
            case (SQLOps.MarkPrefix):
            // case (SQLOps.AddOtherUserDS):
                return false;
            // thrift operation
            case (SQLOps.DestroyDS):
            case (SQLOps.PreviewDS):
            case (SQLOps.DestroyPreviewDS):
            case (SQLOps.DeleteTable):
            case (SQLOps.DeleteAgg):
            case (SQLOps.ExportTable):
            case (SQLOps.DSPoint):
            case (SQLOps.Filter):
            case (SQLOps.Sort):
            case (SQLOps.IndexDS):
            case (SQLOps.Join):
            case (SQLOps.Aggr):
            case (SQLOps.Map):
            case (SQLOps.GroupBy):
            case (SQLOps.RenameTable):
            case (SQLOps.RenameOrphanTable):
            case (SQLOps.QuickAgg):
            case (SQLOps.Corr):
            case (SQLOps.SplitCol):
            case (SQLOps.ChangeType):
            case (SQLOps.Profile):
            case (SQLOps.ProfileSort):
            case (SQLOps.ProfileBucketing):
            case (SQLOps.Project):
            case (SQLOps.Ext):
            case (SQLOps.Query):
                return true;
            default:
                console.warn("XXX! Operation unexpected", operation);
                return null;
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SQL.__testOnly__ = {};
        SQL.__testOnly__.isBackendOperation = isBackendOperation;
        SQL.__testOnly__.getCliMachine = getCliMachine;
        SQL.__testOnly__.getCliHTML = getCliHTML;
        SQL.__testOnly__.getUndoType = getUndoType;
        SQL.__testOnly__.UndoType = UndoType;
    }
    /* End Of Unit Test Only */

    return (SQL);
}(jQuery, {}));
