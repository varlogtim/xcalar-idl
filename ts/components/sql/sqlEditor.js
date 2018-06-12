window.SQLEditor = (function(SQLEditor, $) {
    var editor;
    var $sqlButton = $("#sqlExecute");
    var $sqlSection = $("#sqlSection");
    var $searchTable = $("#sqlTableSearch");
    var $searchColumn = $("#sqlColumnSearch");
    var $sqlTableList = $("#sqlTableList");
    var $sqlColumnList = $("#sqlColumnList");
    var sqlTables = {};
    var sqlKvStore;

    SQLEditor.setup = function() {
        setupEditor();
        addEventListeners();
    };

    SQLEditor.getEditor = function() {
        return editor;
    };

    SQLEditor.refresh = function() {
        refreshEllipsis();
    }

    SQLEditor.initialize = function() {
        sqlKvStore = new KVStore("SQLTables", gKVScope.WKBK);
        setupSchemas();
    }

    function setupSchemas() {
        sqlKvStore.get()
        .then(function(ret) {
            try {
                sqlTables = ret ? JSON.parse(ret) : {};
            } catch (e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidSQLTable,
                    isAlert: true
                });
            }
            genTablesHTML();
        });
    }

    SQLEditor.fakeCompile = function(numSteps) {
        var deferred = PromiseHelper.deferred();
        $sqlButton.addClass("btn-disabled");
        $sqlButton.find(".text").html("Compiling... 0/" + numSteps);

        var numMilSeconds = 1500;
        // update once every 100ms
        var frequency = 100;
        var numIter;

        var amtPerTick = numSteps/(numMilSeconds/frequency);
        for (var i = 0; i < numMilSeconds/frequency; i++) {
            setTimeout(function() {
                var buttonText = $sqlButton.find(".text").html();
                var numCurSteps = parseInt(buttonText.substring(13,
                                                      buttonText.indexOf("/")));
                var backPart = buttonText.substring(buttonText.indexOf("/"));
                numCurSteps += Math.ceil(Math.random() * amtPerTick * 2);
                if (numCurSteps > parseInt(backPart.substring(1))) {
                    numCurSteps = parseInt(backPart.substring(1));
                }
                $sqlButton.find(".text").html("Compiling... " + numCurSteps +
                                                                backPart);
            }, i*frequency);
        }

        setTimeout(function() {
            deferred.resolve();
        }, numMilSeconds);
        return deferred.promise();
    };

    SQLEditor.startCompile = function(numSteps) {
        $sqlButton.addClass("btn-disabled");
        $sqlButton.find(".text").html("Compiling... 0/" + numSteps);
    };

    SQLEditor.startExecution = function() {
        $sqlButton.find(".text").html("Executing... ");
    };

    SQLEditor.updateProgress = function() {
        var buttonText = $sqlButton.find(".text").html();
        var numCurSteps = parseInt(buttonText.substring(13,
                                                      buttonText.indexOf("/")));
        var backPart = buttonText.substring(buttonText.indexOf("/"));
        numCurSteps++;
        $sqlButton.find(".text").html("Compiling... " + numCurSteps + backPart);
    };

    SQLEditor.resetProgress = function() {
        $sqlButton.removeClass("btn-disabled");
        $sqlButton.find(".text").html("EXECUTE SQL"); // XXX Change to variable
    };

    SQLEditor.updateSchema = function(struct, tableId) {
        // Update KVStore & UI table list
        var deferred = PromiseHelper.deferred();
        var tableName = struct.tableName;
        sqlTables[tableName] = tableId;
        updateGTables(tableId, struct.tableColumns)
        .then(function() {
            return updateKVStore(JSON.stringify(sqlTables), true);
        })
        .then(function(ret) {
            // Update table
            var $unit = $sqlTableList.find('li .unit[data-name="' + tableName +
                                           '"]').eq(0);
            if ($unit.length > 0) {
                $unit.attr("data-hashid", tableId);
                if ($unit.hasClass("selected")) {
                    // Reload columns if already selected
                    genColumnsFromTable(tableId);
                }
            } else {
                var html = '<li><div class="unit" data-name="' + tableName +
                                '" data-hashid = "' + tableId + '">' +
                                '<span class="label">' + tableName + '</span>' +
                                '<i class="icon xi-trash fa-14"></i>' +
                            '</div></li>';
                $sqlTableList.append(html);
            }
            refreshEllipsis();
            console.log("Table published!");
            deferred.resolve(ret);
        })
        .fail(function(error) {
            var errMsg = "Publish failed: " + error;
            console.error(errMsg);
            deferred.reject(errMsg);
        });
        return deferred.promise();
    }

    function updateGTables(tableId, columns) {
        // Update "sqlType" in gTables' columns
        var gColumns = gTables[tableId].tableCols;
        var colStructs = {};
        for (var i = 0; i < columns.length; i++) {
            var name = Object.keys(columns[i])[0];
            colStructs[name] = columns[i][name]; 
        }
        for (var i = 0; i < gColumns.length; i++) {
            var key = gColumns[i].backName;
            if (key === "DATA") {
                continue;
            }
            gColumns[i].sqlType = colStructs[key];
        }
        return KVStore.commit();
    }

    SQLEditor.deleteSchemas = function(tableName, tableIds) {
        // XXX Think about updating plan server
        // Remove from KVStore & UI table list
        if ((!tableIds || tableIds.legnth === 0) && !sqlTables[tableName]) {
            return PromiseHelper.resolve("Table doesn't exist");
        }
        // Create a copy for aysnc call
        var sqlTablesCopy = $.extend(true, {}, sqlTables);
        if (tableIds && tableIds.length > 0) {
            // If tableId is provided, it's dropping XD tables. Then we delete
            // all associated sqlTables
            var found = false;
            for (var key in sqlTablesCopy) {
                if (tableIds.indexOf(sqlTablesCopy[key]) > -1) {
                    found = true;
                    delete sqlTablesCopy[key];
                }
            }
            if (!found) {
                for (var i = 0; i < tableIds.length; i++) {
                    $sqlTableList.find('li .unit[data-hashid="'+
                                        tableIds[i] + '"]').remove();
                }
                return PromiseHelper.resolve("No tables to delete");
            }
        } else {
            delete sqlTablesCopy[tableName];
        }
        var deferred = PromiseHelper.deferred();
        updateKVStore(JSON.stringify(sqlTablesCopy), true)
        .then(function(ret) {
            if (tableIds) {
                for (var i = 0; i < tableIds.length; i++) {
                    $sqlTableList.find('li .unit[data-hashid="'+
                                        tableIds[i] + '"]').remove();
                }
            } else {
                $sqlTableList.find('li .unit[data-name="' +
                                    tableName + '"]').remove();
            }
            var $selectedTable = $sqlTableList.find(".unit.selected").eq(0);
            if ($selectedTable.length === 0) {
                genColumnsFromTable(null);
            } else {
                genColumnsFromTable($selectedTable.attr("data-hashid"));
            }
            sqlTables = sqlTablesCopy;
            console.log("SQL table(s) deleted");
            deferred.resolve(ret);
        })
        .fail(function(error) {
            var errMsg = "Delete failed: " + error;
            console.error(errMsg);
            deferred.reject(errMsg);
        })
        return deferred.promise();
    }

    function setupEditor() {
        var textArea = document.getElementById("sqlEditor");
        if (!textArea) {
            // For Release Candidates
            return;
        }

        editor = CodeMirror.fromTextArea(textArea, {
            "mode": "text/x-sql",
            "theme": "rubyblue",
            "lineNumbers": true,
            "lineWrapping": true,
            "smartIndent": true,
            "indentWithTabs": false,
            // "indentUnit": 4,
            "matchBrackets": true,
            "autofocus": true,
            // "autoCloseBrackets": true,
            // "search": true
            "extraKeys": {"Ctrl-Space": "autocomplete"},
        });

        editor.refresh();
    }

    function addEventListeners() {
        var timer;
        $("#sqlExecute").click(function() {
            SQLEditor.executeSQL();
        });
        $searchTable.on("input", "input", function(event) {
            event.stopPropagation();
            selectTable(null);
            search($(this).val());
        });
        $searchColumn.on("input", "input", function(event) {
            event.stopPropagation();
            search($(this).val(), true);
        });
        $sqlTableList.on("click", ".unit", function(event) {
            event.stopPropagation();
            $searchColumn.find("input").val("");
            selectTable($(this));
            var tableId = $(this).attr("data-hashid");
            if (tableId != null) {
                TblManager.findAndFocusTable("#" + tableId);
            }
        });
        $sqlTableList.on("click", ".xi-trash", function(event) {
            event.stopPropagation();
            var tableName = $(this).closest(".unit").attr("data-name");
            SQLEditor.deleteSchemas(tableName);
        });
        $sqlColumnList.on("click", ".unit", function(event) {
            event.stopPropagation();
            var $unit = $sqlTableList.find(".unit.selected");
            var tableId = $unit.attr("data-hashid");
            if (tableId != null) {
                focusOnTableColumn($(this).closest("li"), tableId);
            }
            $sqlColumnList.find(".unit").removeClass("selected");
            $(this).addClass("selected");
        });
        $sqlSection.on("click", ".schemaSection", function() {
            selectTable(null);
        });
        $sqlSection.on("click", ".icon", function(event) {
            var $icon = $(this);
            if (!$icon.parent().hasClass("pulloutTab")) {
                event.stopPropagation();
            }
        });
        $sqlSection.on("click", ".pulloutTab", function(event) {
            event.stopPropagation();
            minMaxSection($(this).find(".icon:not(.xc-hidden)").eq(0));
        });
        $sqlSection.on("click", "input, .xdTable", function(event) {
            event.stopPropagation();
        });

        // All scroll events
        $sqlSection.find(".scrollWrapper").on({
            "mouseenter": function() {
                var $scrollUp = $(this).find(".scrollUp");
                var $scrollDown = $(this).find(".scrollDown");
                var $target = $(this).find("ul");
                if ($target[0].scrollHeight > $target[0].clientHeight) {
                    // Scrollable
                    $target.trigger("scroll");
                }
            },
            "mouseleave": function() {
                var $scrollUp = $(this).find(".scrollUp");
                var $scrollDown = $(this).find(".scrollDown");
                $scrollUp.addClass("xc-hidden");
                $scrollDown.addClass("xc-hidden");
            }
        });
        $("#sqlTableList, #sqlColumnList").on("scroll", function() {
            var $scrollUp = $(this).siblings(".scrollUp");
            var $scrollDown = $(this).siblings(".scrollDown");
            if ($(this).scrollTop() === 0) {
                $scrollUp.addClass("xc-hidden");
                $scrollDown.css("top", "-9px");
            } else {
                $scrollUp.removeClass("xc-hidden");
                $scrollDown.css("top", "-20px");
            }
            if ($(this).scrollTop() + $(this).innerHeight() >=
                       $(this)[0].scrollHeight) {
                $scrollDown.addClass("xc-hidden");
            } else {
                $scrollDown.removeClass("xc-hidden");
            }
        });
        $sqlSection.find(".scrollArea").on({
            "mouseenter": function() {
                clearInterval(timer);
                var $scroll = $(this);
                var $target = $scroll.siblings("ul");
                if ($scroll.hasClass("scrollUp")) {
                    timer = setInterval(function() {
                        var scrollTop = $target.scrollTop();
                        $target.scrollTop(scrollTop - 2);
                    }, 10);
                } else {
                    timer = setInterval(function() {
                        var scrollTop = $target.scrollTop();
                        $target.scrollTop(scrollTop + 2);
                    }, 10);
                }
            },
            "mouseleave": function() {
                clearInterval(timer);
            }
        });
    }

    function focusOnTableColumn($listCol, tableId) {
        var colNum = $listCol.index();
        var tableCols = gTables[tableId].getAllCols();

        // if dataCol is found before colNum, increment colNum by 1 and exit
        for (var i = 0; i <= colNum; i++) {
            if (tableCols[i].isDATACol()) {
                colNum++;
                break;
            }
        }
        colNum = colNum + 1;

        var wsId = WSManager.getWSFromTable(tableId);
        $('#worksheetTab-' + wsId).trigger(fakeEvent.mousedown);
        xcHelper.centerFocusedColumn(tableId, colNum);
    }

    function minMaxSection($icon) {
        var $editorSection = $sqlSection.find(".editSection");
        var contentHeight  = $sqlSection.find(".menuContent").height();
        var editorHeight = $editorSection.height();
        var newHeight;
        if ($icon.hasClass("xi-arrow-down")) {
            // Minimize
            newHeight = contentHeight - 80;
            $sqlSection.find(".CodeMirror-gutters")
                       .height(newHeight);
            $editorSection.animate({height: newHeight},
                                   200,
                                   function() {
                                        editor.refresh();
                                   });
        } else {
            // Maximize
            newHeight = contentHeight * 0.55 - 60;
            $editorSection.animate({height: newHeight},
                                   200,
                                   function() {
                                        editor.refresh();
                                   });
        }
        $icon.siblings().removeClass("xc-hidden");
        $icon.addClass("xc-hidden");
    }

    function republishSchemas(query) {
        // XXX Wait for plan server change, then we can just pass one array
        var deferred = PromiseHelper.deferred();
        var promiseArray = [];
        // var allSchemas = [];
        Object.keys(sqlTables).forEach(function(tableName) {
            var tableId = sqlTables[tableName];
            var srcTableName = tableName
            var schema = getSchema(tableId);
            var structToSend = {};
            structToSend.tableName = tableName.toUpperCase();
            structToSend.tableColumns = schema;
            // allSchemas = structToSend;
            promiseArray.push(updatePlanServer.bind(window, structToSend));
        });
        PromiseHelper.chain(promiseArray)
        // updatePlanServer(allSchemas)
        .then(function() {
            return SQLEditor.executeSQL(query);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    function getSchema(tableId) {
        var srcTableName = gTables[tableId].tableName;
        var tableMetaCol = {};
        tableMetaCol["XC_TABLENAME_" + srcTableName] = "string";
        var cols = gTables[tableId].tableCols;
        var schema = [tableMetaCol];
        for (var i = 0; i < cols.length; i++) {
            var key = cols[i].backName;
            if (key === "DATA") {
                continue;
            }
            var type = cols[i].sqlType;
            var obj = {};
            obj[key] = type;
            schema.push(obj);
        }
        return schema;
    }

    function updatePlanServer(struct) {
        var deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: 'PUT',
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: planServer + "/schemaupdate/" +
                 encodeURIComponent(encodeURIComponent(WorkbookManager.getActiveWKBK())),
            success: function(data) {
                try {
                    deferred.resolve(data);
                } catch (e) {
                    deferred.reject(e);
                    console.error(e);
                }
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }

    function selectTable($unit) {
        if ($unit == null) {
            $sqlTableList.find(".unit.selected").removeClass("selected");
            $searchColumn.addClass("xc-disabled");
            genColumnsFromTable(null);
            return;
        }
        var tableId = $unit.attr("data-hashid");
        if (gTables[tableId] == null) {
            // Table doesn't exist
            Alert.show({
                title: SQLErrTStr.Err,
                msg: SQLErrTStr.NoSchema,
                isAlert: true
            });
            SQLEditor.deleteSchemas(null, [tableId]);
            return;
        }
        genColumnsFromTable(tableId);
        $searchColumn.removeClass("xc-disabled");
        $sqlColumnList.parent().siblings(".content").addClass("xc-hidden");
        $sqlTableList.find(".unit").removeClass("selected");
        $unit.addClass("selected");
        var html = '<span>' + SQLInfoTStr.TableTitle + '</span>' +
                   '<span class="xdTable">' + gTables[tableId].tableName + '</span>';
        $sqlSection.find(".tableTitle").html(html);
    }

    function search(key, isColSearch) {
        var searchKey = key.trim().toUpperCase();
        var $targetList;
        if (!isColSearch) {
            // Table search
            $targetList = $sqlTableList;
        } else {
            $targetList = $sqlColumnList;
        }
        $targetList.find(".unit").each(function() {
            var name = $(this).attr("data-name").toUpperCase();
            if (name.indexOf(searchKey) > -1) {
                $(this).removeClass("xc-hidden");
            } else {
                $(this).addClass("xc-hidden");
            }
        });
    }

    function genTablesHTML() {
        var html = "";
        for (var table in sqlTables) {
            var id = sqlTables[table];
            html += '<li>' +
                        '<div class="unit" data-name="' + table + '" ' +
                            'data-hashid = "' + id + '">' +
                            '<span class="label">' + table + '</span>' +
                            '<i class="icon xi-trash fa-14"></i>' +
                        '</div>' +
                    '</li>';
        }
        document.getElementById('sqlTableList').innerHTML = html;
        refreshEllipsis();
    }

    function genColumnsFromTable(tableId) {
        var html = "";
        if (tableId != null) {
            var allCols = gTables[tableId].tableCols;
            for (var i = 0; i < allCols.length - 1; i++) {
                // last column is DATA
                var name = allCols[i].name;
                var type = allCols[i].sqlType || allCols[i].type;
                var title = type.charAt(0).toUpperCase() + type.substring(1);
                html += '<li><div class="unit type-' + type + '" data-name="' +
                                name + '">' +
                            '<span class="type icon iconHelper" ' +
                                'data-toggle="tooltip" data-placement="top" ' +
                                'data-container="body" title="' + title +'" ' +
                                'data-original-title="' + title + '">' +
                            '</span>' +
                            '<span class="label column">' + name + '</span>' +
                        '</div></li>';
            }
        } else {
            // No table is selected
            $sqlColumnList.parent().siblings(".content").removeClass("xc-hidden");
            $searchColumn.addClass("xc-disabled");
            $sqlSection.find(".tableTitle").html("");
        }
        $searchColumn.find("input").val("");
        document.getElementById('sqlColumnList').innerHTML = html;
        refreshEllipsis();
    }

    function refreshEllipsis() {
        var labels = document.getElementById("sqlSection")
                             .getElementsByClassName("label");
        for (var i = 0; i < labels.length; i++) {
            var el = labels[i];
            var $label = $(el);
            var name = $label.closest(".unit").attr("data-name");
            var isEllipsis = el.scrollWidth > el.clientWidth;
            toggleTooltip($label, name, isEllipsis);
        }
    }

    function toggleTooltip($text, name, isEllipsis) {
        if (isEllipsis) {
            xcTooltip.add($text, {title: name});
        } else {
            xcTooltip.remove($text);
        }
    }

    function updateKVStore(value, persist) {
        return sqlKvStore.put(value, persist);
    }

    SQLEditor.executeSQL = function(query) {
        var deferred = PromiseHelper.deferred();
        var sql = query || editor.getValue().replace(/\n/g, " ").trim()
                                            .replace(/;+$/, "");
        var sqlCom = new SQLCompiler();
        var republish = false;
        try {
            $("#sqlExecute").addClass("btn-disabled");
            sqlCom.compile(sql)
            .done(function() {
                deferred.resolve();
            })
            .fail(function() {
                var errorMsg = "";
                var table;
                if (arguments.length === 1) {
                    if (typeof(arguments[0]) === "string") {
                        errorMsg = arguments[0];
                        if (errorMsg.indexOf("exceptionMsg") > -1 &&
                            errorMsg.indexOf("exceptionName") > -1) {
                            var errorObj = JSON.parse(errorMsg);
                            errorMsg = errorObj.exceptionName.substring(
                                       errorObj.exceptionName
                                                 .lastIndexOf(".") + 1) + "\n" +
                                       errorObj.exceptionMsg;
                        }
                    } else {
                        var errorObj = arguments[0];
                        errorMsg = JSON.stringify(arguments[0]);
                        // XXX Error parsing is bad. Needs to be fixed
                        if (errorObj && errorObj.responseJSON) {
                            var exceptionMsg = errorObj.responseJSON
                                                       .exceptionMsg;
                            if (exceptionMsg.indexOf(SQLErrTStr.NoKey) > -1 &&
                                Object.keys(sqlTables).length > 0) {
                                republish = true;
                            } else {
                                var errorIdx = exceptionMsg.indexOf(
                                                            SQLErrTStr.NoTable);
                                if (errorIdx > -1) {
                                    table = exceptionMsg.substring(
                                              exceptionMsg.lastIndexOf(":") + 1,
                                              exceptionMsg.lastIndexOf(";"))
                                              .trim().toUpperCase();
                                    if (sqlTables.hasOwnProperty(table)) {
                                        republish = true;
                                    }
                                }
                            }
                        } else if (errorObj && errorObj.status === 0) {
                            errorMsg = SQLErrTStr.FailToConnectPlanner;
                        }
                    }
                } else {
                    errorMsg = JSON.stringify(arguments);
                }
                if (!query && republish) {
                    // Try to republish
                    republishSchemas(sql);
                } else if (errorMsg.indexOf(SQLErrTStr.Cancel) === -1) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg: errorMsg,
                            isAlert: true
                        });
                }
                deferred.reject();
            })
            .always(function() {
                if (!republish) {
                    SQLEditor.resetProgress();
                }
            });
        } catch (e) {
            SQLEditor.resetProgress();
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            deferred.reject();
        }
        return deferred.promise();
    };
    SQLEditor.throwError = function(errStr) {
        SQLEditor.resetProgress();
        Alert.show({
            title: "Compilation Error",
            msg: "Error details: " + errStr,
            isAlert: true
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SQLEditor.__testOnly__ = {};
        SQLEditor.__testOnly__.updateKVStore = updateKVStore;
        SQLEditor.__testOnly__.setUpdateKVStore = function(func) {
            updateKVStore = func;
        };
        SQLEditor.__testOnly__.getSchema = getSchema;
        SQLEditor.__testOnly__.updatePlanServer = updatePlanServer;
        SQLEditor.__testOnly__.setUpdatePlanServer = function(func) {
            updatePlanServer = func;
        }
        SQLEditor.__testOnly__.republishSchemas = republishSchemas;
        SQLEditor.__testOnly__.setRepublishSchemas = function(func) {
            republishSchemas = func;
        }
        SQLEditor.__testOnly__.getSQLTables = function() {
            return sqlTables;
        }
        SQLEditor.__testOnly__.setSQLTables = function(tables) {
            sqlTables = tables;
        }
        SQLEditor.__testOnly__.updateGTables = updateGTables;
        SQLEditor.__testOnly__.setUpdateGTables = function(func) {
            updateGTables = func;
        }
        SQLEditor.__testOnly__.genTablesHTML = genTablesHTML;
        SQLEditor.__testOnly__.focusOnTableColumn = focusOnTableColumn;
        SQLEditor.__testOnly__.setFocusOnTableColumn = function(func) {
            focusOnTableColumn = func;
        }
    }
    /* End Of Unit Test Only */
    return SQLEditor;
}({}, jQuery));
