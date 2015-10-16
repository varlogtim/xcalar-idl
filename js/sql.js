window.SQL = (function($, SQL) {
    var history = [];
    var $textarea = $('#rightBarTextArea');
    var $machineTextarea = $('#rightBarMachineTextArea');

    SQL.add = function(title, options, cli) {
        options = options || {};
        if ($.isEmptyObject(options)) {
            console.warn("Options for", title, "is empty!");
            return;
        }

        history.push({
            "title"  : title,
            "options": options,
            "cli"    : cli
        });

        $textarea.append(getCliHTML(title, options));
        $machineTextarea.append(getCliMachine(title, options, cli));
        // scroll to bottom
        SQL.scrollToBottom($textarea);
        SQL.scrollToBottom($machineTextarea);
    };

    SQL.getHistory = function() {
        return (history);
    };

    SQL.restoreFromHistory = function(oldCliHistory) {
        history = oldCliHistory;
        history.forEach(function(record) {
            record.options = record.options || {};
            $textarea.append(getCliHTML(record.title, record.options));
            $machineTextarea.append(getCliMachine(record.title,
                                                  record.options,
                                                  record.cli));
            SQL.scrollToBottom($textarea);
            SQL.scrollToBottom($machineTextarea);
        });
    };

    SQL.clear = function() {
        $textarea.html("");
        $machineTextarea.html("");
        history = [];
    };

    SQL.scrollToBottom = function($target) {
        // scroll to bottom
        var scrollDiff = $target[0].scrollHeight - $target.height();
        if (scrollDiff > 0) {
            $target.scrollTop(scrollDiff);
        }
    };

    function getCliHTML(title, options) {
        var html =  '<div class="sqlContentWrap">' +
                        '<div class="title"> >>' + title + ':</div>' +
                        '<div class="content">{';
        var count = 0;

        for (var key in options) {
            // not show up null value
            if (options[key] == null) {
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

    function getCliMachine(title, options, cli) {
        var string = "";
        // Here's the real code
        if (!options) {
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
            case (SQLOps.ArchiveTable):
                // fallthrough
            case (SQLOps.TableBulkActions):
                // fallthrough
            case (SQLOps.RenameCol):
                // fallthrough
            case (SQLOps.TextAlign):
                // fallthrough
            case (SQLOps.HideCols):
                // fallthrough
            case (SQLOps.UnHideCols):
                // fallthrough
            case (SQLOps.PreviewDS):
                // fallthrough
            case (SQLOps.DestroyPreviewDS):
                // fallthrough
            case (SQLOps.SortTableCols):
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
            case (SQLOps.DelWS):
                // fallthrough
            case (SQLOps.MoveTableToWS):
                // fallthrough
            case (SQLOps.MoveInactiveTableToWS):
                // fallthrough
            case (SQLOps.AddNoSheetTables):
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
            case (SQLOps.Profile):
                // fallthrough
            case (SQLOps.ProfileSort):
                // fallthrough
            case (SQLOps.ProfileClose):
                // fallthrough
            case (SQLOps.QuickAgg):
                // fallthrough
            case (SQLOps.AddDS):
                // fallthrough
            case (SQLOps.SplitCol):
                // fallthrough
            case (SQLOps.ChangeType):
                // fallthrough
                // XXX should export tables have an effect?
                break;

            // Use reverse parser
            case (SQLOps.DestroyDS):
            case (SQLOps.DeleteTable):
            // XXX hang on as export table's api will change
            case (SQLOps.ExportTable):
            case (SQLOps.DSLoad):
            case (SQLOps.Filter):
            case (SQLOps.Sort):
            case (SQLOps.IndexDS):
            case (SQLOps.Join):
            case (SQLOps.Aggr):
            case (SQLOps.CheckIndex):
            case (SQLOps.GroupBy):
            case (SQLOps.GroupByIndex):
            case (SQLOps.Map):
            case (SQLOps.JoinMap):
            case (SQLOps.GroupbyMap):
            case (SQLOps.RenameTable):
            case (SQLOps.RenameOrphanTable):
            case (SQLOps.ProfileAction):
            case (SQLOps.QuickAggAction):
            case (SQLOps.SplitColMap):
            case (SQLOps.ChangeTypeMap):
                string += cli;
                break;
            default:
                console.warn("XXX! Operation unexpected", options.operation);
        }

        if (string.length > 0) {
            string += ";";
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
    //         case ("decimal"):
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
