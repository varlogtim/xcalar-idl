window.SQLEditor = (function(SQLEditor, $) {
    var editor;
    var $sqlButton = $("#sqlExecute");
    var $sqlSection = $("#sqlSection");
    var $searchTable = $("#sqlTableSearch");
    var $searchColumn = $("#sqlColumnSearch");
    var $sqlTableList = $("#sqlTableList");
    var $sqlColumnList = $("#sqlColumnList");
    var $sqlEditorDropdown = $("#sqlEditorsList");
    var sqlTables = {};
    var sqlTableKvStore;
    var editorQueryKvStore;
    var sqlComs = [];
    var keywordsToRemove = ["alter", "begin", "create", "delete", "drop",
                            "insert", "into", "set", "table", "update", "values"];
    var keywordsToAdd = ["over", "partition", "intersect", "except", "with",
                         "left", "right", "outer", "natural", "semi", "anti",
                         "rollup", "cube", "grouping", "sets", "limit", "sum",
                         "avg", "max", "min"];
    var defaultEditor = "Default Snippet";
    var allEditors = {};
    var curEditor = defaultEditor;
    var dropdownHint;

    SQLEditor.setup = function() {
        setupEditor();
        setupEditorsList();
        addEventListeners();
        addDropdownEventListeners();
    };

    SQLEditor.getEditor = function() {
        return editor;
    };

    SQLEditor.refresh = function() {
        refreshEllipsis();
    }

    SQLEditor.initialize = function() {
        var tablesKey = KVStore.getKey("gSQLTables");
        var editorQueryKey = KVStore.getKey("gSQLEditorQuery");
        var editorKey = KVStore.getKey("gSQLEditor");
        sqlTableKvStore = new KVStore(tablesKey, gKVScope.WKBK);
        editorQueryKvStore = new KVStore(editorQueryKey, gKVScope.WKBK);
        sqlEditorKvStore = new KVStore(editorKey, gKVScope.WKBK);
        setupSchemas();
        restoreSQLQuery();
    }

    function setupSchemas() {
        sqlTableKvStore.get()
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

    function restoreSQLQuery() {
        editorQueryKvStore.get()
        .then(function(ret) {
            try {
                if (ret) {
                    allEditors = JSON.parse(ret);
                }
            } catch (e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidSQLQuery,
                    isAlert: true
                });
            }
            return sqlEditorKvStore.get();
        })
        .then(function(ret) {
            var lastEditor = defaultEditor;
            var editorsOrder = [];
            try {
                if (ret) {
                    var editorMeta = JSON.parse(ret);
                    lastEditor = editorMeta.lastEditor;
                    editorsOrder = editorMeta.editorsOrder;
                }
            } catch(e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidEditorMeta,
                    isAlert: true
                });
            }

            if (allEditors.hasOwnProperty(lastEditor)) {
                curEditor = lastEditor;
            } else {
                addDefaultEditorIfNotExist();
            }
            loadEditors(editorsOrder, curEditor);
            selectEditorByName(curEditor);
        })
        .fail(function() {
            addDefaultEditorIfNotExist();
            selectEditorByName(defaultEditor);
        });
    }

    SQLEditor.storeQuery = function() {
        if (!editorQueryKvStore || !sqlEditorKvStore) {
            return PromiseHelper.resolve();
        }
        allEditors[curEditor] = editor.getValue();
        return editorQueryKvStore.put(JSON.stringify(allEditors), true);
    }
    function updateEditorKVStore() {
        var deferred = PromiseHelper.deferred();
        editorQueryKvStore.put(JSON.stringify(allEditors), true)
        .then(function() {
            var editorsOrder = [];
            $sqlEditorDropdown.find("li[data-name]").each(function() {
                editorsOrder.push($(this).attr("data-name"));
            });
            var editorMeta = {lastEditor: curEditor, editorsOrder: editorsOrder};
            return sqlEditorKvStore.put(JSON.stringify(editorMeta), true);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    // SQLEditor.setCurId = function(txId) {
    //     curQueryId = txId;
    // }

    SQLEditor.fakeCompile = function(numSteps) {
        var deferred = PromiseHelper.deferred();
        SQLEditor.lockProgress();
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
        SQLEditor.lockProgress();
        if (numSteps === 0) {
            $sqlButton.find(".text").html("Compiling...");
        } else {
            var buttonText = $sqlButton.find(".text").html();
            if (buttonText === "Compiling...") {
                return;
            }
            $sqlButton.find(".text").html("Compiling... 0/" + numSteps);
        }
    };

    SQLEditor.startExecution = function() {
        $sqlButton.find(".text").html("Executing... ");
    };

    SQLEditor.updateProgress = function() {
        var buttonText = $sqlButton.find(".text").html();
        if (buttonText.indexOf("/") === -1) {
            return;
        }
        var numCurSteps = parseInt(buttonText.substring(13,
                                                      buttonText.indexOf("/")));
        var backPart = buttonText.substring(buttonText.indexOf("/"));
        numCurSteps++;
        $sqlButton.find(".text").html("Compiling... " + numCurSteps + backPart);
    };

    SQLEditor.resetProgress = function() {
        $sqlButton.removeClass("btn-disabled");
        $sqlButton.find(".text").html("EXECUTE SQL"); // XXX Change to variable
        $sqlEditorDropdown.removeClass("xc-disabled");
    };

    SQLEditor.lockProgress = function() {
        $sqlButton.addClass("btn-disabled");
        $sqlEditorDropdown.addClass("xc-disabled");
    }

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

    SQLEditor.dropAllSchemas = function(sessionName) {
        return updatePlanServer(undefined, "drop", sessionName);
    }

    SQLEditor.deleteSchemas = function(tableName, tableIds) {
        // Remove from KVStore & UI table list
        if ((!tableIds || tableIds.legnth === 0) && !sqlTables[tableName]) {
            $sqlTableList.find('li .unit[data-name="' + tableName + '"]').remove();
            return updatePlanServer(undefined, "delete", undefined, [tableName]);
        }
        var allTables = [];
        // Create a copy for aysnc call
        var sqlTablesCopy = $.extend(true, {}, sqlTables);
        if (tableIds) {
            // If tableId is provided, it's dropping XD tables. Then we delete
            // all associated sqlTables
            if (tableIds.length > 0) {
                var found = false;
                for (var key in sqlTablesCopy) {
                    if (tableIds.indexOf(sqlTablesCopy[key]) > -1) {
                        found = true;
                        allTables.push(key);
                        delete sqlTablesCopy[key];
                    }
                }
                if (!found) {
                    for (var i = 0; i < tableIds.length; i++) {
                        $sqlTableList.find('li .unit[data-hashid="'+
                                            tableIds[i] + '"]').remove();
                    }
                    return PromiseHelper.resolve("No schemas to delete");
                }
            } else {
                return PromiseHelper.resolve("No schemas to delete");
            }
        } else {
            allTables.push(tableName);
            delete sqlTablesCopy[tableName];
        }
        var deferred = PromiseHelper.deferred();

        updatePlanServer(undefined, "delete", undefined, allTables)
        .then(undefined, function(error) {
            if (error && error.responseText &&
                        (error.responseText.indexOf(SQLErrTStr.NoKey) > -1 ||
                         error.responseText.indexOf(SQLErrTStr.NoTable) > -1)) {
                return PromiseHelper.resolve();
            } else {
                return PromiseHelper.reject(error);
            }
        })
        .then(function() {
            return updateKVStore(JSON.stringify(sqlTablesCopy), true);
        })
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
            var errMsg = "Deletion failed: " + JSON.stringify(error);
            console.error(errMsg);
            deferred.reject(errMsg);
        })
        return deferred.promise();
    }

    function executeTrigger(cm) {
        $("#sqlExecute").click();
    }

    function cancelExec(cm) {
        console.error("SQL cancel triggered!");
        sqlComs.forEach(function(sqlCom) {
            sqlCom.setStatus(SQLStatus.Cancelled);
        })
    }

    function convertTextCase(flag, cm) {
        var text = editor.getSelection();
        if (text != "") {
            if (flag) {
                editor.replaceSelection(text.toLocaleUpperCase(), "around");
            } else {
                editor.replaceSelection(text.toLocaleLowerCase(), "around");
            }
        }
    }

    function toggleComment(cm) {
        var startPos = editor.getCursor("from");
        var endPos = editor.getCursor("to");
        var startLineNum = startPos.line;
        var endLineNum = endPos.line;
        var commentCount = 0;
        editor.eachLine(startLineNum, endLineNum + 1, function(lh) {
            if (lh.text.trimStart().startsWith("--")) {
                commentCount++;
            }
        })
        if (commentCount === endLineNum - startLineNum + 1) {
            for (var i = startLineNum; i <= endLineNum; i++) {
                var text = editor.getLine(i);
                editor.setSelection({line: i, ch: 0}, {line: i, ch: text.length});
                editor.replaceSelection(text.replace(/--/, ""));
            }
        } else {
            for (var i = startLineNum; i <= endLineNum; i++) {
                var text = editor.getLine(i);
                editor.setSelection({line: i, ch: 0}, {line: i, ch: text.length});
                editor.replaceSelection("--" + text);
            }
        }
        editor.setSelection(startPos,endPos);
    }

    function deleteAll(cm) {
        editor.setValue("");
    }

    function scrollLine(flag, cm) {
        if (flag) {
            editor.scrollTo(null, editor.getScrollInfo().top
                                        - editor.defaultTextHeight());
        } else {
            editor.scrollTo(null, editor.getScrollInfo().top
                                        + editor.defaultTextHeight());
        }
    }

    function insertLine(flag, cm) {
        if (flag) {
            var curPos = editor.getCursor("from");
            var insertPos = {line: curPos.line, ch: 0};
            editor.replaceRange("\n", insertPos);
            editor.setCursor(insertPos);
        } else {
            var curPos = editor.getCursor("to");
            var insertPos = {line: curPos.line,
                             ch: editor.getLine(curPos.line).length};
            editor.replaceRange("\n", insertPos);
            editor.setCursor({line: curPos.line + 1, ch: 0});
        }
    }

    function setupEditor() {
        var textArea = document.getElementById("sqlEditor");
        if (!textArea) {
            // For Release Candidates
            return;
        }

        var extraKeys = {"F5": executeTrigger,
                         "Alt-X": executeTrigger,
                         "Ctrl-Space": "autocomplete", // Need to write autocomplete code
                         "Ctrl--": toggleComment};

        var cButton = "Ctrl";
        if (isSystemMac) {
            cButton = "Cmd";
            extraKeys[cButton + "-Alt-F"] = "replace";
            extraKeys["Shift-" + cButton + "-Backspace"] = "delWordAfter";
            extraKeys["F6"] = cancelExec;
            extraKeys["F3"] = "findNext";
            extraKeys["Shift-F3"] = "findPrev";
        } else {
            extraKeys[cButton + "-H"] = "replace";
            extraKeys[cButton + "-Delete"] = "delWordAfter";
            extraKeys["Ctrl-Alt-C"] = cancelExec;
            extraKeys["Ctrl-Alt-G"] = "findNext";
            extraKeys["Shift-Ctrl-Alt-G"] = "findPrev";
        }
        extraKeys[cButton + "-E"] = executeTrigger;
        extraKeys[cButton + "-Left"] = "goWordLeft";
        extraKeys[cButton + "-Right"] = "goWordRight";
        extraKeys[cButton + "-Backspace"] = "delWordBefore";
        extraKeys["Shift-" + cButton + "-U"] = convertTextCase.bind(window, true);
        extraKeys["Shift-" + cButton + "-L"] = convertTextCase.bind(window, false);
        extraKeys["Shift-" + cButton + "-K"] = "deleteLine";
        extraKeys[cButton + "-Up"] = scrollLine.bind(window, true);
        extraKeys[cButton + "-Down"] = scrollLine.bind(window, false);
        extraKeys[cButton + "-Enter"] = insertLine.bind(window, true);
        extraKeys["Shift-" + cButton + "-Enter"] = insertLine.bind(window, false);

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
            "autoCloseBrackets": true,
            "search": true,
            "hint": CodeMirror.hint.sql,
            "extraKeys": extraKeys,
        });

        editor.on("keyup", function(cm, e) {
            if (e.keyCode >= 65 && e.keyCode <= 90 ||
                e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey ||
                e.keyCode === 190 && !e.shiftKey) {
                editor.execCommand("autocomplete");
            }
        });

        keywordsToRemove.forEach(function(key) {
            delete CodeMirror.resolveMode("text/x-sql").keywords[key];
        })

        keywordsToAdd.forEach(function(key) {
            CodeMirror.resolveMode("text/x-sql").keywords[key] = true;
        })

        CodeMirror.commands.autocomplete = function (cmeditor) {
            var acTables = {};
            for(var tableName in sqlTables) {
                acTables[tableName] = [];
                if (gTables[sqlTables[tableName]]) {
                    gTables[sqlTables[tableName]].tableCols.forEach(function(col) {
                        if (col.name != "DATA") {
                            acTables[tableName].push(col.name);
                            acTables[col.name] = [];
                        }
                    });
                } else {
                    SQLEditor.deleteSchemas(null, [sqlTables[tableName]]);
                }
            }

            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }

        editor.refresh();
    }

    function addEventListeners() {
        var timer;
        $("#sqlExecute").click(function() {
            var promiseArray = [];
            var sql = editor.getSelection();
            if (sql === "") {
                sql = editor.getValue();
            }
            var allQueries;
            if (sql.indexOf(";") === -1) {
                allQueries = [sql];
            } else {
                allQueries = XDParser.SqlParser.getMultipleQueriesViaParser(sql);
            }
            if (allQueries.length > 1) {
                SQLEditor.startCompile(0);
            }
            for (var query of allQueries) {
                var promise = SQLEditor.executeSQL(query);
                promiseArray.push(promise);
            }
            PromiseHelper.when.apply(window, promiseArray);
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
        $sqlSection.find(".schemaSection .scrollArea").on({
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

    function toggleEditAndDeleteIcons($self) {
        $sqlEditorDropdown.find("li[data-name]").each(function() {
            var $li = $(this);
            if (!$li.is($self)) {
                if ($li.find(".icon").hasClass("xc-disabled")) {
                    $li.find(".icon").removeClass("xc-disabled");
                } else {
                    $li.find(".icon").addClass("xc-disabled");
                }
            }
        });
    };

    function addDropdownEventListeners() {
        $sqlEditorDropdown.on("mouseup", ".xi-edit", function(event) {
            event.stopPropagation();
            var $li = $(this).closest("li");
            var editorName = $li.text();
            var html = '<input class="text" spellcheck="false" ' +
                       'placeholder="' + SQLTStr.EnterEditorName + '" data-toggle="tooltip" ' +
                       'data-container="body" data-placement="top">' +
                       '<i class="icon xi-trash"></i>';
            $li.html(html);
            var $input = $li.find("input");
            $input.trigger("focus");
            $input.val(editorName);
            toggleEditAndDeleteIcons($li);
        });
        $sqlEditorDropdown.on("mouseup", ".xi-trash", function(event) {
            event.stopPropagation();
            var $li = $(this).closest("li");
            deleteEditor($li);
        });
        $sqlEditorDropdown.on("mouseenter", ".xi-edit, .xi-trash", function(event) {
            $(this).addClass("hover");
        });
        $sqlEditorDropdown.on("mouseleave", ".xi-edit, .xi-trash", function(event) {
            $(this).removeClass("hover");
        });
        $sqlEditorDropdown.on({
            "blur": function() {
                var $li = $(this).closest("li");
                var editorName = $li.attr("data-name");
                if (!editorName) {
                    // new editor must be given a name, otherwise remove it
                    $li.remove();
                }
                var html = '<span>' + editorName + '</span>' +
                           '<i class="icon xi-edit"></i><i class="icon xi-trash"></i>';
                $li.html(html);
                toggleEditAndDeleteIcons($li);
            },
            "keyup": function(e) {
                var $li = $(this).closest("li");
                var keyCode = e.which;
                if (keyCode === 13) {
                    updateEditor($li);
                }
            },
            "mouseup": function(event) {
                event.stopPropagation();
            }
        }, "li input");
    }

    function loadEditors(editorsOrder, curEditor) {
        // allEditors
        // only populate dropdown
        var $ul = $sqlEditorDropdown.find("ul");
        for (var editorName of editorsOrder) {
            var html = '<li data-name="' + editorName + '"><span>' +
                       editorName + '</span><i class="icon xi-edit"></i>' +
                       '<i class="icon xi-trash"></i></li>';
            $(html).appendTo($ul);
        }
        editor.setValue(allEditors[curEditor]);
    }

    function updateEditor($li) {
        var newName = $li.find("input").val();
        if (!newName || !xcHelper.checkNamePattern(PatternCategory.SQLEditor,
                                                   PatternAction.Check,
                                                   newName)) {
            StatusBox.show(SQLErrTStr.InvalidEditorName, $li.find("input"));
            return;
        }
        var oldName = $li.attr("data-name");
        if (oldName !== newName && allEditors.hasOwnProperty(newName)) {
            // handle collision
            StatusBox.show(SQLErrTStr.EditorNameExists, $li.find("input"));
            return;
        }

        var html = '<span>' + newName + '</span>' +
                   '<i class="icon xi-edit"></i><i class="icon xi-trash"></i>';
        $li.attr("data-name", newName);
        $li.html(html);

        if (!oldName) {
            // adding new editor
            $li.removeClass("addNew");
            allEditors[newName] = "";
            selectEditor($li);
        } else if (oldName === newName) {
            return;
        } else {
            // updating old editor
            allEditors[newName] = allEditors[oldName];

            delete allEditors[oldName];
            if (oldName === curEditor) {
                var $editorListInput = $sqlEditorDropdown.find("input").eq(0);
                dropdownHint.setInput(newName);
                xcTooltip.changeText($editorListInput, newName);
            }
            curEditor = newName;
            updateEditorKVStore();
        }
    }

    function addEditor() {
        var $ul = $sqlEditorDropdown.find("ul");
        var html = '<li class="addNew"><input class="text" spellcheck="false" '+
                       'placeholder="' + SQLTStr.EnterEditorName + '" data-toggle="tooltip" ' +
                       'data-container="body" data-placement="top">' +
                       '<i class="icon xi-trash"></i></li>';
        var $li = $(html);
        $li.insertAfter($ul.find("li[name='addNew']"));
        toggleEditAndDeleteIcons($li);
        return $li;
    }

    function addDefaultEditorIfNotExist() {
        var $ul = $sqlEditorDropdown.find("ul");

        if ($ul.find("li[data-name='" + defaultEditor + "']").length !== 0) {
            return;
        }
        var html = '<li data-name="' + defaultEditor + '"><span>' +
                    defaultEditor + '</span><i class="icon xi-edit"></i>' +
                    '<i class="icon xi-trash"></i></li>';
        $(html).insertAfter($ul.find("li[name='addNew']"));
        allEditors[defaultEditor] = "";
    }

    function deleteEditor($li) {
        var editorName = $li.text();
        delete allEditors[editorName];
        var selectName = $li.next().attr("data-name") ||
                       $li.prev().attr("data-name") || defaultEditor;
        $li.remove();
        if ($sqlEditorDropdown.find("li").not("[name='addNew']").length === 0) {
            // add default editor
            addDefaultEditorIfNotExist();
            selectEditorByName(defaultEditor);
        } else if (curEditor === editorName) {
            selectEditorByName(selectName);
        } else {
            updateEditorKVStore();
        }
    }

    function selectEditor($li) {
        if ($li.attr("name") === "addNew") {
            var $li = addEditor();
            $li.find("input").trigger("focus");
        }
        if(!$li.attr("data-name") || $li.find("input").length > 0) {
            return true;
        }
        $li.parent().find("li").removeClass("selected");
        $li.addClass("selected");

        var $editorListInput = $sqlEditorDropdown.find("input").eq(0);
        var editorName = $li.text();

        StatusBox.forceHide();
        dropdownHint.setInput(editorName);

        xcTooltip.changeText($editorListInput, editorName);

        if (allEditors.hasOwnProperty(curEditor)) {
            allEditors[curEditor] = editor.getValue();
        }
        curEditor = editorName;

        if (!allEditors.hasOwnProperty(editorName)) {
            selectEditorByName(defaultEditor);
        } else {
            editor.setValue(allEditors[editorName]);
            updateEditorKVStore();
            // XXX Should set focus to code mirror
        }
    }

    function setupEditorsList() {
        var menuHelper = new MenuHelper($sqlEditorDropdown, {
            "onSelect": selectEditor,
            "container": "#sqlSection",
            "bounds": "#sqlSection",
            "bottomPadding": 2
        });

        dropdownHint = new InputDropdownHint($sqlEditorDropdown, {
            "menuHelper": menuHelper,
            "onEnter": selectEditorByName,
            "noBold": true
        });
    }

    function selectEditorByName(editorName) {
        var $li = $("#sqlEditorMenu").find("li").filter(function() {
            return $(this).text() === editorName;
        });
        if ($li.length === 0) {
            StatusBox.show(SQLErrTStr.NoEditor, $sqlEditorDropdown);
            return true;
        } else {
            selectEditor($li);
            return false;
        }
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
            newHeight = contentHeight - 140;
            $sqlSection.find(".CodeMirror-gutters")
                       .height(newHeight);
            $editorSection.animate({height: newHeight},
                                   200,
                                   function() {
                                        editor.refresh();
                                   });
        } else {
            // Maximize
            newHeight = contentHeight * 0.55 - 120;
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
        var deferred = PromiseHelper.deferred();
        var allSchemas = [];
        Object.keys(sqlTables).forEach(function(tableName) {
            var tableId = sqlTables[tableName];
            var srcTableName = tableName
            var schema = getSchema(tableId);
            var structToSend = {};
            structToSend.tableName = tableName.toUpperCase();
            structToSend.tableColumns = schema;
            allSchemas.push(structToSend);
        });
        updatePlanServer(allSchemas, "update")
        .then(function() {
            return SQLEditor.executeSQL(query, true);
        })
        .then(deferred.resolve)
        .fail(function(err) {
            SQLEditor.throwError(SQLErrTStr.FailedToRepublish);
            deferred.reject(err);
        });
        return deferred.promise();
    }

    SQLEditor.redoSendSchema = function(xcTableName, sqlTableName) {
        var tableId = xcHelper.getTableId(xcTableName);
        var schema = getSchema(tableId);
        var structToSend = {};
        structToSend.tableName = sqlTableName.toUpperCase();
        structToSend.tableColumns = schema;
        return SQLEditor.updateSchema(structToSend, tableId);
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

    function updatePlanServer(struct, type, sessionName, tableName) {
        var url;
        var action;
        var session = WorkbookManager.getActiveWKBK();
        switch (type) {
            case ("update"):
                url = planServer + "/schemasupdate/" +
                      encodeURIComponent(encodeURIComponent(session));
                action = "PUT";
                break;
            case ("delete"):
                struct = tableName;
                url = planServer + "/schemasdrop/" +
                    encodeURIComponent(encodeURIComponent(session));
                action = "DELETE";
                break;
            case ("drop"):
                url = planServer + "/schemadrop/" +
                      encodeURIComponent(encodeURIComponent(sessionName));
                action = "DELETE";
                break;
            default:
                return PromiseHelper.reject("Invalid type for updatePlanServer");
        }
        var deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: action,
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: url,
            dataType: "text", // XXX remove this when the planner bug is fixed
            success: function(data) {
                deferred.resolve(data);
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
        return sqlTableKvStore.put(value, persist);
    }

    SQLEditor.getPrevQueries = function() {
        return sqlComs;
    }

    SQLEditor.executeSQL = function(query, retry) {
        var deferred = PromiseHelper.deferred();
        var sql = query || editor.getSelection().replace(/;+$/, "") ||
                           editor.getValue().replace(/;+$/, "");
        var queryName = xcHelper.randName("sql");
        var sqlCom = new SQLCompiler();
        sqlComs.push(sqlCom);
        var republish = false;
        try {
            SQLEditor.lockProgress();
            sqlCom.compile(queryName, sql)
            .then(function(queryString, newTableName, cols, cacheStruct) {
                return sqlCom.execute(queryString, newTableName, cols, sql,
                                      cacheStruct);
            })
            .then(function() {
                deferred.resolve();
            })
            .fail(function(errorMsg) {
                if (typeof errorMsg === "string") {
                    if (errorMsg.indexOf(SQLErrTStr.NoKey) > -1 &&
                        Object.keys(sqlTables).length > 0) {
                        republish = true;
                    } else {
                        var errorIdx = errorMsg.indexOf(
                                                    SQLErrTStr.NoTable);
                        if (errorIdx > -1) {
                            var table = errorMsg.substring(
                                      errorMsg.lastIndexOf(":") + 1,
                                      errorMsg.lastIndexOf(";"))
                                      .trim().toUpperCase();
                            if (sqlTables.hasOwnProperty(table)) {
                                republish = true;
                            }
                        }
                    }
                    if (!retry && republish) {
                        // Try to republish
                        republishSchemas(sql);
                    } else if (errorMsg.indexOf(SQLErrTStr.Cancel) === -1) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg: errorMsg,
                            isAlert: true,
                            align: "left",
                            preSpace: true,
                            sizeToText: true
                        });
                    }
                }
                deferred.reject();
            })
            .always(function() {
                // XXX need to change this line once we decide the new sql status panel design
                sqlComs.splice(sqlComs.indexOf(sqlCom, 1));
                if (!republish) {
                    SQLEditor.resetProgress();
                }
            });
        } catch (e) {
            console.error(e);
            // XXX need to change this line once we decide the new sql status panel design
            sqlComs.splice(sqlComs.indexOf(sqlCom, 1));
            sqlCom.setStatus(SQLStatus.Failed);
            sqlCom.setError(e.message || JSON.stringify(e));
            sqlCom.updateQueryHistory();
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
    };
    SQLEditor.isOnHistPanel = function() {
        return $("#monitor-query-history").hasClass("active");
    };

    /* Unit Test Only */
    if (window.unitTestMode) {
        SQLEditor.__testOnly__ = {};
        SQLEditor.__testOnly__.updateKVStore = updateKVStore;
        SQLEditor.__testOnly__.setUpdateKVStore = function(func) {
            updateKVStore = func;
        };
        SQLEditor.__testOnly__.getSchema = getSchema;
        SQLEditor.__testOnly__.setGetSchema = function(func) {
            getSchema = func;
        }
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
        SQLEditor.__testOnly__.executeTrigger = executeTrigger;
        SQLEditor.__testOnly__.cancelExec = cancelExec;
        SQLEditor.__testOnly__.convertTextCase = convertTextCase;
        SQLEditor.__testOnly__.toggleComment = toggleComment;
        SQLEditor.__testOnly__.deleteAll = deleteAll;
        SQLEditor.__testOnly__.scrollLine = scrollLine;
        SQLEditor.__testOnly__.insertLine = insertLine;
        SQLEditor.__testOnly__.setSqlComs = function(comList) {
            sqlComs = comList;
        }
        SQLEditor.__testOnly__.updatePlanServer = updatePlanServer;
        SQLEditor.__testOnly__.getEditorQueryKvStore = function() {
            return editorQueryKvStore;
        }
    }
    /* End Of Unit Test Only */
    return SQLEditor;
}({}, jQuery));
