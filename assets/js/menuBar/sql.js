window.SQL = (function($, SQL) {
    var $sqlButtons;      // $("#sqlButtonWrap");
    var $textarea;        // $("#sql-TextArea");
    var $machineTextarea; // $("#sql-MachineTextArea");

    var $undo; // $("#undo");
    var $redo; // $("#redo");

    // keep in sync with initialize
    var logCursor = -1;
    var sqlToCommit = "";
    var errToCommit = "";
    var sqlCache = {
        "logs"  : [],
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
        "Valid"  : 0,   // can undo/redo
        "Skip"   : 1,   // should skip undo/redo
        "Invalid": 2    // cannot undo/redo
    };

    SQL.setup = function() {
        $sqlButtons = $("#sqlButtonWrap");
        $textarea = $("#sql-TextArea");
        $machineTextarea = $("#sql-MachineTextArea");

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
            var $hiddenInput = $("<input>");
            $("body").append($hiddenInput);
            var value;
            if ($machineTextarea.is(":visible")) {
                xcHelper.assert(!$textarea.is(":visible"),
                                "human and android cannot coexist!");
                value = $machineTextarea.text();
            } else {
                xcHelper.assert(!$machineTextarea.is(":visible"),
                                "human and android cannot coexist!");
                xcHelper.assert($textarea.is(":visible"),
                                "At least one bar should be showing");
                value = JSON.stringify(SQL.getAllLogs());
            }

            $hiddenInput.val(value).select();
            document.execCommand("copy");
            $hiddenInput.remove();
            xcHelper.showSuccess();
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
            "title"  : title,
            "options": options,
            "cli"    : cli
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
            "title"  : title,
            "options": options,
            "cli"    : cli,
            "error"  : error
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
            return commitErrors();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

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

    SQL.getAllLogs = function() {
        return sqlCache;
    };

    SQL.getLocalStorage = function() {
        return localStorage.getItem(sqlLocalStoreKey);
    };

    SQL.getBackup = function() {
        var key = sqlLocalStoreKey + "-backup";
        return localStorage.getItem(key);
    };

    SQL.backup = function() {
        if (StartManager.isStart()) {
            // start up time error don't trigger backup
            // or it may overwrite old log backup
            return;
        }

        var key = sqlLocalStoreKey + "-backup";
        localStorage.setItem(key, JSON.stringify(sqlCache));
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
        xcHelper.assert((isUndo === false), "Doing other undo/redo operation?");

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
        xcHelper.assert((isRedo === false), "Doing other undo/redo operation?");

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
            "logs"  : [],
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

    function commitErrors() {
        if (errToCommit === "") {
            return jQuery.Deferred().resolve().promise();
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
    }

    function restoreLogs(oldLogCursor) {
        var deferred = jQuery.Deferred();
        var oldLogs = [];

        // restore log
        KVStore.get(KVStore.gLogKey, gKVScope.LOG)
        .then(function(value) {
            if (value != null) {
                try {
                    var len = value.length;
                    if (value.charAt(len - 1) === ",") {
                        value = value.substring(0, len - 1);
                    }
                    var sqlStr = "[" + value + "]";
                    oldLogs = JSON.parse(sqlStr);
                } catch (err) {
                    console.error("restore logs failed!", err);
                    deferred.reject(sqlRestoreError);
                }
            }
        })
        .then(function() {
            if (oldLogCursor == null || oldLogCursor >= oldLogs.length) {
                // error case
                console.error("Loose old cursor track");
                oldLogCursor = oldLogs.length - 1;
            }
            for (var i = 0; i <= oldLogCursor; i++) {
                var sql = new XcLog(oldLogs[i]);
                addLog(sql, true);
            }
            lastSavedCursor = logCursor;

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function restoreErrors() {
        var deferred = jQuery.Deferred();
        var oldErrors = [];

        // restore log
        KVStore.get(KVStore.gErrKey, gKVScope.ERR)
        .then(function(value) {
            if (value != null) {
                try {
                    var len = value.length;
                    if (value.charAt(len - 1) === ",") {
                        value = value.substring(0, len - 1);
                    }
                    var errStr = "[" + value + "]";
                    oldErrors = JSON.parse(errStr);
                } catch (err) {
                    console.error("restore error logs failed!", err);
                    deferred.reject(sqlRestoreError);
                }
            } else {
                // because if always has no error,
                // console log will keep showing "key not found" warning
                KVStore.put(KVStore.gErrKey, "", true, gKVScope.ERR);
            }
        })
        .then(function() {
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

        return (deferred.promise());
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

            var logStr = JSON.stringify(logs);
            // strip "[" and "]" and add comma
            logStr = logStr.substring(1, logStr.length - 1) + ",";
   
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
            console.error("Invalid sql!");
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
        xcHelper.assert((sql != null), "invalid sql");

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
        xcHelper.assert((sql != null), "invalid sql");

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
                 .attr("data-original-title", TooltipTStr.NoRedo)
                 .data("lastmessage", TooltipTStr.NoRedo)
                 .data("laststate", "disabled");

        } else if (getUndoType(logs[next]) !== UndoType.Valid) {
            console.error("Have invalid sql to redo", sql);
            $redo.addClass("disabled")
                 .attr("data-original-title", TooltipTStr.NoRedo)
                 .data("lastmessage", TooltipTStr.NoRedo)
                 .data("laststate", "disabled");

        } else {
            // when can redo
            var redoTitle = xcHelper.replaceMsg(TooltipTStr.Redo, {
                "op": logs[next].getTitle()
            });

            $redo.removeClass("disabled")
                 .attr("data-original-title", redoTitle)
                 .data("lastmessage", redoTitle)
                 .data("laststate", "enabled");
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
                 .attr("data-original-title", TooltipTStr.NoUndoNoOp)
                 .data("lastmessage", TooltipTStr.NoUndoNoOp)
                 .data("laststate", "disabled");

        } else if (getUndoType(logs[cur]) !== UndoType.Valid) {
            // when cannot undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.NoUndo, {
                "op": logs[cur].getTitle()
            });

            $undo.addClass("disabled")
                 .attr("data-original-title", undoTitle)
                 .data("lastmessage", undoTitle)
                 .data("laststate", "disabled");
        } else {
            // when can undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.Undo, {
                "op": logs[cur].getTitle()
            });
            $undo.removeClass("disabled")
                 .attr("data-original-title", undoTitle)
                 .data("lastmessage", undoTitle)
                 .data("laststate", "enabled");
        }

        // change tooltip if lockedtables exist
        if (hasLockedTables) {
            $redo.addClass("disabled")
                 .attr("data-original-title", TooltipTStr.LockedTableRedo);
            $undo.addClass("disabled")
                 .attr("data-original-title", TooltipTStr.LockedTableUndo);
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
        localStorage.removeItem(sqlLocalStoreKey);
    }

    function localCommit() {
        localStorage.setItem(sqlLocalStoreKey, JSON.stringify(sqlCache));
    }

    function showSQL(sql, cursor) {
        // some sql is overwritten because of undo and redo, should remove them
        var $sqls = $($textarea.find(".sqlContentWrap").get().reverse());
        $sqls.each(function() {
            var $sql = $(this);
            var sqlId = $sql.data("sql");
            if (sqlId > cursor) {
                $sql.remove();
            } else {
                return false; // stop loop
            }
        });

        var $clis = $($machineTextarea.find(".cliWrap").get().reverse());
        $clis.each(function() {
            var $cli = $(this);
            var cliId = $cli.data("cli");
            if (cliId > cursor) {
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

        var html = '<div class="sqlContentWrap" data-sql=' + id + '>' +
                    '<div class="title"> >>' + sql.title + ':</div>' +
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

    function isBackendOperation(sql) {
        var operation = sql.getOperation();

        switch (operation) {
            // front end opeartion
            case (SQLOps.DupCol):
            case (SQLOps.DelDupCol):
            case (SQLOps.DelAllDupCols):
            case (SQLOps.DeleteCol):
            case (SQLOps.ReorderCol):
            case (SQLOps.ReorderTable):
            case (SQLOps.AddNewCol):
            case (SQLOps.PullCol):
            case (SQLOps.PullAllCols):
            case (SQLOps.ArchiveTable):
            case (SQLOps.ActiveTables):
            case (SQLOps.RenameCol):
            case (SQLOps.TextAlign):
            case (SQLOps.HideCols):
            case (SQLOps.UnHideCols):
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
