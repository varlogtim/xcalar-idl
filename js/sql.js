window.SQL = (function($, SQL) {
    var history = [];
    var $textarea = $('#rightBarTextArea');
    var $machineTextarea = $('#rightBarMachineTextArea');

    SQL.add = function(title, options) {
        history.push({"title": title, "options": options});
        $textarea.append(getCliHTML_helper(title, options));
        $machineTextarea.append(getCliMachine_helper(title, options));
        // scroll to bottom
        SQL.scrollToBottom($textarea);
        SQL.scrollToBottom($machineTextarea);
    }

    SQL.getHistory = function() {
        return (history);
    }

    SQL.restoreFromHistory = function(oldCliHistory) {
        history = oldCliHistory;
        history.forEach(function(record) {
            $textarea.append(getCliHTML_helper(record.title, record.options));
            $machineTextarea.append(getCliMachine_helper(record.title,
                                                      record.options));
            SQL.scrollToBottom($textarea);
            SQL.scrollToBottom($machineTextarea);
        });
    }

    SQL.clear = function() {
        $textarea.html("");
        $machineTextarea.html("");
        history = [];
    }

    SQL.scrollToBottom = function($target) {
        // scroll to bottom
        var scrollDiff = $target[0].scrollHeight - $target.height();
        if (scrollDiff > 0) {
            $target.scrollTop(scrollDiff);
        }
    }

    function getCliHTML_helper(title, options) {
        var html =  '<div class="sqlContentWrap">' + 
                        '<div class="title"> >>' + title + ' :</div>' + 
                        '<div class="content">{';
        var count = 0;

        for (var key in options) {
            if (count > 0) {
                html += ',';
            }
            var val = JSON.stringify(options[key]);
            html += '<span class="' + key + '">' + 
                        '<span class="sqlKey">' + key + '</span> : ' + 
                        '<span class="sqlVal">' + val + '</span>' + 
                    '</span>';
            count++;
        }

        html += '}</div></div></div>';
        html = html.replace(/,/g, ", ");

        return (html);
    }

    function getCliMachine_helper(title, options) {
        var string = "";

        // Here's the real code
        switch(options["operation"]) {
        case ("duplicateCol"):
            // fallthrough
        case ("delCol"):
            // fallthrough
        case ("changeColOrder"):
            // fallthrough
        case ("addCol"):
            // fallthrough
        case ("pullCol"):
            // fallthrough
        case ("archiveTable"):
            // fallthrough
        case ("aggregate"):
            // fallthrough
        case ("createTable"):
            // fallthrough
        case ("exportTable"):
            // XXX should export tables have an effect?
            break;
        // Here are all the ops that need to be replicated
        case ("renameDatasetCol"):
            string += cliRenameColHelper(options);
            break;
        case ("changeDataType"):
            string += cliRetypeColHelper(options);
            break;
        case ("loadDataSet"):
            string += cliLoadHelper(options);
            console.log("load");
            break;
        case ("destroyDataSet"):
            // fallthrough
        case ("deleteTable"):
            string += cliDeleteHelper(options);
            break;
        case ("filter"):
            string += cliFilterHelper(options);
            break;
        case ("sort"):
            // fallthrough
        case ("index"):
            string += cliIndexHelper(options);
            break;
        case ("join"):
            string += cliJoinHelper(options);
            break;
        case ("groupBy"):
            string += cliGroupByHelper(options);
            break;
        case ("mapColumn"):
            string += cliMapHelper(options);
            break;
        default:
            console.log("XXX! Operation unexpected"+options["operation"]);
        }
        if (string.length > 0) {
            string += ";";
        }
        return (string);
    }

    function cliRenameColHelper(options) {
        // rename <dataset> <existingColName> <newColName>
        var string = "rename";
        string += " " + options["dsName"];
        string += " " + options["oldColName"];
        string += " " + options["newColName"];
        return (string);
    }

    function cliRetypeColHelper(options) {
        // cast <dataset> <existingColName> <newColType>
        var string = "cast";
        string += " " + options["dsName"];
        string += " " + options["colName"];
        
        switch(options["newType"]) {
        case ("string"):
            string += " DfString";
            break;
        case ("integer"):
            string += " DfInt64";
            break;
        case ("decimal"):
            string += " DfFloat64";
            break;
        case ("boolean"):
            string += " DfBoolean";
            break;
        case ("mixed"):
            string += " DfMixed";
            break;
        case ("undefined"):
            // fallthrough
        default:
            string += " DfUnknown";
            break;
        }
        return (string);
    }        

    function cliLoadHelper(options) {
        // load --url <url> --format <format> --name <dsName>
        var string = "load";
        string += " --url";
        string += " " + options["dsPath"];
        string += " --format";
        string += " " + options["dsFormat"].toLowerCase();
        string += " --name";
        string += " " + options["dsName"];
        return (string);
    }

    function cliDeleteHelper(options) {
        // drop <dropWhat> <name>
        var string = "drop";
        if (options["operation"] === "destroyDataSet") {
            string += " dataset";
            string += " " + options["dsName"];
        } else if (options["operation"] === "deleteTable") {
            string += " table";
            string += " " + options["tableName"];
        }
        return (string);
    }

    function cliFilterHelper(options) {
        // filter <tableName> <"filterStr"> <filterTableName>
        var string = "filter";
        string += " " + options["tableName"];
        var flt = options["filterString"];
        if (!flt) {
            flt = generateFilterString(options["operator"], options["value"],
                                       options["backColName"]);
        }
        // Now we need to escape quotes. We don't need to do it for the thrift
        // call because that's a thrift field. However, now that everything is
        // lumped into one string, we have to do some fun escaping
        
        flt = flt.replace(/["']/g, "\\$&");
        string += " \""+flt+"\"";
        string += " " + options["newTableName"];
        return (string);
    }

    function cliIndexHelper(options) {
        // index --key <keyname> --dataset <dataset> | --srctable <tableName>
        // --dsttable <tableName>
        var string = "index";
        string += " --key";
        string += " " + options["key"];
        if (options["operation"] === "sort") {
            string += " --srctable";
            string += " " + options["tableName"];
        } else if (options["operation"] === "index") {
            string += " --dataset";
            string += " " + options["dsName"];
        }
        string += " --dsttable";
        string += " " + options["newTableName"];
        return (string);
    }

    function cliJoinHelper(options) {
        // join --leftTable <leftTable> --rightTable <rightTable>
        // --joinTable <joinTable> --joinType <joinType>
        var string = "join";
        string += " --leftTable";
        string += " " + options["leftTable"]["backname"];
        string += " --rightTable";
        string += " " + options["rightTable"]["backname"];
        string += " --joinTable";
        string += " " + options["newTableName"];
        string += " --joinType";
        var joinType = options["joinType"].replace(" ", "");
        joinType = joinType.charAt(0).toLowerCase() + joinType.slice(1);
        string += " " + joinType;
        return (string);
    }

    function cliGroupByHelper(options) {
        // groupBy <tableName> <operator> <fieldName> <newFieldName>
        // <groupByTableName>
        var string = "groupBy";
        string += " " + options["backname"];
        switch (options["operator"]) {
        case ("Average"):
            string += " " + "avg";
            break;
        case ("Count"):
            string += " " + "count";
            break;
        case ("Sum"):
            string += " " + "sum";
            break;
        case ("Max"):
            string += " " + "max";
            break;
        case ("Min"):
            string += " " + "min";
            break;
        default:
            break;
        } 
        string += " " + options["backFieldName"];
        string += " " + options["newColumnName"];
        string += " " + options["newTableName"];
        return (string);
    }
    
    function cliMapHelper(options) {
        var string = "map";
        string += " --eval";
        string += " \"map(" + options["mapString"] + ")\"";
        string += " --srctable";
        string += " " + options["backname"];
        string += " --fieldName";
        string += " " + options["colName"];
        string += " --dsttable";
        string += " " + options["newTableName"];
        return (string);
    }

    return (SQL);
}(jQuery, {}));
