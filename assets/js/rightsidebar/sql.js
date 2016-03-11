window.SQL = (function($, SQL) {
    var $sqlButtons = $("#sqlButtonWrap");
    var $textarea = $("#sql-TextArea");
    var $machineTextarea = $("#sql-MachineTextArea");

    var $undo = $("#undo");
    var $redo = $("#redo");

    var sqlCache;
    var logCursor = -1;
    var sqlToCommit = "";
    var errToCommit = "";
    var logs;
    var errors;
    // mark if it's in a undo redo action
    var isUndo;
    var isRedo;

    // constant
    var sqlLocalStoreKey = "xcalar-query";
    var sqlRestoreError = "restore sql error";

    SQL.setup = function() {
        // SQL.restore will not be triggered is kvstore is empty
        // so add an extra one here
        updateUndoRedoState();
        // show human readabl SQL as default
        $machineTextarea.hide();

        // set up the sql section
        $sqlButtons.on("click", ".machineSQL", function() {
            $(this).removeClass("machineSQL")
                    .addClass("humanSQL");
            $machineTextarea.hide();
            $textarea.show();
        });

        $sqlButtons.on("click", ".humanSQL", function() {
            $(this).removeClass("humanSQL")
                    .addClass("machineSQL");
            $machineTextarea.show();
            $textarea.hide();
        });

        $sqlButtons.on("click", ".copySQL", function() {
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

    SQL.add = function(title, options, cli) {
        options = options || {};
        if ($.isEmptyObject(options)) {
            console.warn("Options for", title, "is empty!");
            return;
        }

        if (isUndo || isRedo) {
            console.info("In undo redo, do not add sql");
            return;
        }

        var sql = new SQLConstructor({
            "title"  : title,
            "options": options,
            "cli"    : cli
        });

        addLog(sql);

        sqlToCommit += JSON.stringify(sql) + ",";

        // XXX FIXME: uncomment it if commit on errorLog only has bug
        // localCommit();
        SQL.scrollToBottom();
        updateUndoRedoState();
    };

    SQL.errorLog = function(title, options, cli, error) {
        var sql = new SQLConstructor({
            "title"     : title,
            "options"   : options,
            "cli"       : cli,
            "error"     : error,
            "revertable": false
        });
        errors.push(sql);

        errToCommit += JSON.stringify(sql) + ",";
        localCommit();
    };

    SQL.commit = function() {
        var deferred = jQuery.Deferred();

        commitLogs()
        .then(function() {
            return commitErrors();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
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

    SQL.restore = function() {
        var deferred = jQuery.Deferred();

        initialize();

        restoreLogs()
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

            var sql = logs[c];
            if (!isValidToUndo(sql)) {
                // the operation cannot undo
                break;
            }

            promises.push(undoLog.bind(this, sql, c));
            c--;
        }

        isUndo = true;
        $undo.addClass("disabled");

        chain(promises)
        .then(function() {
            // cursor in the current position
            logCursor = c;
            updateLogPanel(logCursor);
        })
        .fail(function(error) {
            console.error("undo failed", error);
        })
        .always(function() {
            isUndo = false;

            updateUndoRedoState();
            xcHelper.refreshTooltip($undo);
        });
    };

    SQL.redo = function(step) {
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
            if (!isValidToUndo(sql)) {
                console.error("Should not have unrevertable opeartion in redo!");
                break;
            }

            promises.push(redoLog.bind(this, sql, c));
            c++;
        }

        isRedo = true;
        $redo.addClass("disabled");

        chain(promises)
        .then(function() {
            logCursor = c - 1;
            updateLogPanel(logCursor);
        })
        .fail(function(error) {
            console.error("undo failed", error);
        })
        .always(function() {
            isRedo = false;

            updateUndoRedoState();
            xcHelper.refreshTooltip($redo);
        });
    };

    SQL.isUndo = function() {
        return isUndo;
    };

    SQL.isRedo = function() {
        return isRedo;
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

        KVStore.append(KVStore.gLogKey, sqlToCommit, true, gKVScope.LOG)
        .then(function() {
            sqlToCommit = "";
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function commitErrors() {
        if (errToCommit === "") {
            return jQuery.Deferred().resolve().promise();
        }

        var deferred = jQuery.Deferred();

        KVStore.append(KVStore.gErrKey, errToCommit, true, gKVScope.ERR)
        .then(function() {
            errToCommit = "";
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function restoreLogs() {
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
                } catch(err) {
                    console.error("restore logs failed!", err);
                    deferred.reject(sqlRestoreError);
                }
            }
        })
        .then(function() {
            oldLogs.forEach(function(oldSQL) {
                var sql = new SQLConstructor(oldSQL);
                addLog(sql);
            });

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
                } catch(err) {
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
            oldErrors.forEach(function(oldErr) {
                var errorLog = new SQLConstructor(oldErr);
                errors.push(errorLog);
            });

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function addLog(sql) {
        // normal log
        var logLen = logs.length;
        if (logCursor !== logLen - 1) {
            // when user do a undo before
            console.info("Previous redo ops will be removed");

            logCursor++;
            logs[logCursor] = sql;
            logs.length = logCursor + 1;

            localCommit();

            var logStr = JSON.stringify(logs);
            // strip "[" and "]" and add comma
            logStr = logStr.substring(1, logStr.length - 1) + ",";
            KVStore.put(KVStore.gLogKey, logStr, true, gKVScope.LOG)
            .then(function() {
                sqlToCommit = "";
                localCommit();

                // should also keep all meta in sync
                return KVStore.commit();
            })
            .then(function() {
                // XXX test
                console.info("Overwrite sql log");
            })
            .fail(function(error) {
                console.error("Overwrite Sql fails!", error);
            });
        } else {
            logCursor++;
            logs[logCursor] = sql;
        }

        showSQL(sql, logCursor);
    }

    function isValidToUndo(sql) {
        var operation = sql.getOperation();
        if (operation == null) {
            console.error("Invalid sql!");
            return false;
        }

        switch (operation) {
            case SQLOps.DSLoad:
            case SQLOps.IndexDS:
            case SQLOps.PreviewDS:
            case SQLOps.DestroyPreviewDS:
            case SQLOps.RenameOrphanTable:
            case SQLOps.AddDS:
            case SQLOps.DestroyDS:
            case SQLOps.ExportTable:
            case SQLOps.DeleteTable:
            case SQLOps.CreateFolder:
            case SQLOps.DSRename:
            case SQLOps.SDropIn:
            case SQLOps.DSInsert:
            case SQLOps.DSToDir:
            case SQLOps.DSDropBack:
            case SQLOps.DelFolder:
            case SQLOps.Profile:
            case SQLOps.ProfileSort:
            case SQLOps.ProfileBucketing:
            case SQLOps.QuickAgg:
            case SQLOps.Corr:

            // temporary not support it, because of the agg info table
            case SQLOps.DelWS:
                return false;
            default:
                return true;

        }
    }

    function undoLog(sql, cursor) {
        console.log("undo", sql);
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var logLen = logs.length;
        Undo.run(sql)
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
        console.log("redo", sql);
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
        // check redo
        if (logCursor === logs.length - 1) {
            // when nothing to redo
            $redo.addClass("disabled")
                 .attr("data-title", TooltipTStr.NoRedo)
                 .attr("data-original-title", TooltipTStr.NoRedo);

        } else {
            // when can redo
            var redoTitle = xcHelper.replaceMsg(TooltipTStr.Redo, {
                "op": logs[logCursor + 1].getTitle()
            });

            $redo.removeClass("disabled")
                 .attr("data-title", redoTitle)
                 .attr("data-original-title", redoTitle);
        }

        // check undo
        var curSql = logs[logCursor];
        var undoTitle;
        if (logCursor === -1) {
            // when no operation to undo
            $undo.addClass("disabled")
                 .attr("data-title", TooltipTStr.NoUndoNoOp)
                 .attr("data-original-title", TooltipTStr.NoUndoNoOp);

        } else if (isValidToUndo(curSql)) {
            // when can undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.Undo, {
                "op": curSql.getTitle()
            });
            $undo.removeClass("disabled")
                 .attr("data-title", undoTitle)
                 .attr("data-original-title", undoTitle);

        } else {
            // when cannot undo
            undoTitle = xcHelper.replaceMsg(TooltipTStr.NoUndo, {
                "op": curSql.getTitle()
            });

            $undo.addClass("disabled")
                 .attr("data-title", undoTitle)
                 .attr("data-original-title", undoTitle);
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
            return ("");
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
        var options = sql.options;
        var string = "";
        // Here's the real code
        if (sql.sqlType === SQLType.Error) {
            return ("");
        }
        switch (options.operation) {
            case (SQLOps.DupCol):
                // fallthrough
            case (SQLOps.DelDupCol):
                // fallthrough
            case (SQLOps.DelAllDupCols):
                // fallthrough
            case (SQLOps.DeleteCol):
                // fallthrough
            case (SQLOps.ReorderCol):
                // fallthrough
            case (SQLOps.ReorderTable):
                // fallthrough
            case (SQLOps.AddNewCol):
                // fallthrough
            case (SQLOps.PullCol):
                // fallthrough
            case (SQLOps.PullAllCols):
                // fallthrough
            case (SQLOps.ArchiveTable):
                // fallthrough
            case (SQLOps.ActiveTables):
                // fallthrough
            case (SQLOps.RenameCol):
                // fallthrough
            case (SQLOps.TextAlign):
                // fallthrough
            case (SQLOps.HideCols):
                // fallthrough
            case (SQLOps.UnHideCols):
                // fallthrough
            case (SQLOps.SortTableCols):
                // fallthrough
            case (SQLOps.ResizeTableCols):
                // fallthrough
            case (SQLOps.DragResizeTableCol):
                // fallthrough
            case (SQLOps.HideTable):
                // fallthrough
            case (SQLOps.UnhideTable):
                // fallthrough
            case (SQLOps.AddWS):
                // fallthrough
            case (SQLOps.RenameWS):
                // fallthrough
            case (SQLOps.SwitchWS):
                // fallthrough
            case (SQLOps.ReorderWS):
                // fallthrough
            case (SQLOps.DelWS):
                // fallthrough
            case (SQLOps.HideWS):
                // fallthrough
            case (SQLOps.UnHideWS):
                // fallthrough
            case (SQLOps.MoveTableToWS):
                // fallthrough
            case (SQLOps.MoveInactiveTableToWS):
                // fallthrough
            case (SQLOps.CreateFolder):
                // fallthrough
            case (SQLOps.DSRename):
                // fallthrough
            case (SQLOps.DSDropIn):
                // fallthrough
            case (SQLOps.DSInsert):
                // fallthrough
            case (SQLOps.DSToDir):
                // fallthrough
            case (SQLOps.DSDropBack):
                // fallthrough
            case (SQLOps.DelFolder):
                // fallthrough
            case (SQLOps.AddOhterUserDS):
                // fallthrough
            case (SQLOps.ChangeFormat):
                // fallthrough
            case (SQLOps.RoundToFixed):
                // fallthrough
                // XXX should export tables have an effect?
                break;

            // Use reverse parser
            case (SQLOps.DestroyDS):
            case (SQLOps.PreviewDS):
            case (SQLOps.DestroyPreviewDS):
            case (SQLOps.DeleteTable):
            // XXX hang on as export table's api will change
            case (SQLOps.ExportTable):
            case (SQLOps.DSLoad):
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
            case (SQLOps.hPartition):
            case (SQLOps.Window):
            case (SQLOps.Profile):
            case (SQLOps.ProfileSort):
            case (SQLOps.ProfileBucketing):
                string += '<span class="cliWrap" data-cli=' + id + '>' +
                            sql.cli +
                          '</span>';
                break;
            default:
                console.warn("XXX! Operation unexpected", options.operation);
        }

        return (string);
    }

    // function cliRenameColHelper(options) {
    //     // rename <dataset> <existingColName> <newColName>
    //     var string = "rename";
    //     string += " " + options.dsName;
    //     string += " " + options.oldColName;
    //     string += " " + options.newColName;
    //     return (string);
    // }

    // function cliRetypeColHelper(options) {
    //     // cast <dataset> <existingColName> <newColType>
    //     var string = "cast";
    //     string += " " + options.dsName;
    //     string += " " + options.colName;

    //     switch (options.newType) {
    //         case ("string"):
    //             string += " DfString";
    //             break;
    //         case ("integer"):
    //             string += " DfInt64";
    //             break;
    //         case ("float"):
    //             string += " DfFloat64";
    //             break;
    //         case ("boolean"):
    //             string += " DfBoolean";
    //             break;
    //         case ("mixed"):
    //             string += " DfMixed";
    //             break;
    //         case ("undefined"):
    //             // fallthrough
    //         default:
    //             string += " DfUnknown";
    //             break;
    //     }
    //     return (string);
    // }

    // function cliLoadHelper(options) {
    //     // load --url <url> --format <format> --name <dsName>
    //     var string = "load";
    //     string += " --url";
    //     string += " " + options.dsPath;
    //     string += " --format";
    //     string += " " + options.dsFormat.toLowerCase();
    //     string += " --name";
    //     string += " " + options.dsName;
    //     if (options.fieldDelim && options.fieldDelim !== "Null") {
    //         var fd = JSON.stringify(options.fieldDelim);
    //         if (fd.indexOf("\\") !== 1) {
    //             string += " --fielddelim";
    //             string += " " + fd;
    //         }
    //     }
    //     if (options.lineDelim && options.lineDelim !== "Null") {
    //         var rd = JSON.stringify(options.lineDelim);
    //         if (rd.indexOf("\\") !== 1) {
    //             string += " --recorddelim";
    //             string += " " + rd;
    //         }
    //     }
    //     return (string);
    // }

    // function cliDeleteHelper(options) {
    //     // drop <dropWhat> <name>
    //     var string    = "drop";
    //     var operation = options.operation;

    //     if (operation === "destroyDataSet") {
    //         string += " dataset";
    //         string += " " + options.dsName;
    //     } else if (operation === "deleteTable") {
    //         string += " table";
    //         string += " " + options.tableName;
    //     }
    //     return (string);
    // }

    // function cliFilterHelper(options) {
    //     // filter <tableName> <"filterStr"> <filterTableName>
    //     var string = "filter";
    //     var flt    = options.filterString;

    //     string += " " + options.tableName;
    //     if (!flt) {
    //         flt = generateFilterString(options.operator,
    //                                    options.backColName,
    //                                    options.value);
    //     }
    //     // Now we need to escape quotes. We don't need to do it for the thrift
    //     // call because that's a thrift field. However, now that everything is
    //     // lumped into one string, we have to do some fun escaping

    //     flt = flt.replace(/["']/g, "\\$&");
    //     string += " \"" + flt + "\"";
    //     string += " " + options.newTableName;
    //     return (string);
    // }

    // function cliIndexHelper(options) {
    //     // index --key <keyname> --dataset <dataset> | --srctable <tableName>
    //     // --dsttable <tableName>
    //     var string = "index";
    //     string += " --key";
    //     string += " " + options.key;
    //     if (options.operation === "sort") {
    //         string += " --srctable";
    //         string += " " + options.tableName;
    //     } else if (options.operation === "index") {
    //         string += " --dataset";
    //         string += " " + options.dsName;
    //     }
    //     string += " --dsttable";
    //     string += " " + options.newTableName;
    //     return (string);
    // }

    // function cliJoinHelper(options) {
    //     // join --leftTable <leftTable> --rightTable <rightTable>
    //     // --joinTable <joinTable> --joinType <joinType>
    //     var string = "join";
    //     string += " --leftTable";
    //     string += " " + options.leftTable.name;
    //     string += " --rightTable";
    //     string += " " + options.rightTable.name;
    //     string += " --joinTable";
    //     string += " " + options.newTableName;
    //     string += " --joinType";
    //     var joinType = options.joinType.replace(" ", "");
    //     joinType = joinType.charAt(0).toLowerCase() + joinType.slice(1);
    //     string += " " + joinType;
    //     return (string);
    // }

    // function cliGroupByHelper(options) {
    //     // groupBy <tableName> <operator> <fieldName> <newFieldName>
    //     // <groupByTableName>
    //     var string = "groupBy";
    //     string += " " + options.backname;
    //     switch (options.operator) {
    //         case ("Average"):
    //             string += " " + "avg";
    //             break;
    //         case ("Count"):
    //             string += " " + "count";
    //             break;
    //         case ("Sum"):
    //             string += " " + "sum";
    //             break;
    //         case ("Max"):
    //             string += " " + "max";
    //             break;
    //         case ("Min"):
    //             string += " " + "min";
    //             break;
    //         default:
    //             break;
    //     }
    //     string += " " + options.backFieldName;
    //     string += " " + options.newColumnName;
    //     string += " " + options.newTableName;
    //     return (string);
    // }

    // function cliMapHelper(options) {
    //     var string = "map";
    //     string += " --eval";
    //     string += " \"map(" + options.mapString + ")\"";
    //     string += " --srctable";
    //     string += " " + options.backname;
    //     string += " --fieldName";
    //     string += " " + options.colName;
    //     string += " --dsttable";
    //     string += " " + options.newTableName;
    //     return (string);
    // }

    return (SQL);
}(jQuery, {}));
