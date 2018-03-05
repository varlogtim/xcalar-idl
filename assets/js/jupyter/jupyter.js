window.JupyterPanel = (function($, JupyterPanel) {
    var $jupyterPanel;
    var currNotebook;

    JupyterPanel.setup = function() {
        $jupyterPanel = $("#jupyterPanel");
        setupTopBarDropdown();
    };

    JupyterPanel.initialize = function() {
        if (window.jupyterNode == null || window.jupyterNode === "") {
            window.jupyterNode = hostname + '/jupyter';
        }

        KVStore.get(KVStore.gNotebookKey, gKVScope.WKBK)
        .then(function(lastLocation) {
            var last;
            try {
                last = $.parseJSON(lastLocation);
            } catch (err) {
                console.error(err);
            }
            currNotebook = last || "";
            toggleJupyterMenu();
            loadJupyterNotebook(last);
        })
        .fail(function() {
            loadJupyterNotebook();
        });


        window.addEventListener("message", function(event) {
            var struct = event.data;
            try {
                var s = JSON.parse(struct);
                switch (s.action) {
                    case ("resend"):
                        JupyterPanel.sendInit();
                        break;
                    case ("newUntitled"):
                        JupyterPanel.sendInit(true, s.publishTable, s.tableName,
                                              s.numRows,
                                              {noRenamePrompt: s.noRename});
                        break;
                    case ("updateLocation"):
                        storeLocation(s);
                        break;
                    case ("autofillImportUdf"):
                        // comes from xcalar.js if initial autofillimportudf
                        // call occurs in the notebook list view
                        if (s.includeStub === "true") {
                            s.includeStub = true;
                        } else if (s.includeStub === "false") {
                            s.includeStub = false;
                        } else {
                            console.error(s);
                        }
                        s.url = s.filePath;
                        if (s.includeStub) {
                            showImportUdfModal(s.target, s.filePath);
                        } else {
                            JupyterPanel.appendStub("importUDF", s);
                            BottomMenu.openSection(2);
                            UDF.selectUDFFuncList(s.moduleName);
                        }
                        break;
                    case ("mixpanel"):
                        try {
                            if (xcMixpanel.forDev()) {
                                mixpanel.track(s.event, s.property);
                            }
                        } catch (error) {
                            console.log("mixpanel is not loaded");
                        }
                        break;
                    case ("alert"):
                        if ($jupyterPanel.is(":visible")) {
                            $("#alertModal").height(300);
                            Alert.show(s.options);
                        }
                        break;
                    case ("udfToMapForm"):
                        UDF.refresh()
                        .then(function() {
                            showMapForm(s.tableName, s.columns, s.moduleName,
                                        s.fnName);
                        })
                        .fail(udfRefreshFail);
                        break;
                    case ("udfToDSPreview"):
                        UDF.refresh()
                        .then(function() {
                            showDSForm(s.moduleName, s.fnName);
                        })
                        .fail(udfRefreshFail);
                        break;
                    default:
                        console.error("Unsupported action:" + s.action);
                }
            } catch (e) {
                console.error("Illegal message sent:" + event.data, e);
            }
        });
    };

    JupyterPanel.sendInit = function(newUntitled, publishTable, tableName, numRows,
        options) {
        var colNames = [];
        if (publishTable && tableName) {
            colNames = getCols(tableName);
        }
        options = options || {};
        noRenamePrompt = options.noRenamePrompt || false;
        var workbookStruct = {action: "init",
                newUntitled: newUntitled,
                noRenamePrompt: noRenamePrompt,
                publishTable: publishTable,
                tableName: tableName,
                colNames: colNames,
                numRows: numRows,
                username: userIdName,
                userid: userIdUnique,
                sessionname: WorkbookManager.getWorkbook(
                            WorkbookManager.getActiveWKBK()).name,
                sessionid: WorkbookManager.getActiveWKBK()
        };
        $("#jupyterNotebook")[0].contentWindow
                      .postMessage(JSON.stringify(workbookStruct), "*");
    };

    JupyterPanel.publishTable = function(tableName, numRows, hasVerifiedNames) {
        var colNames = getCols(tableName);
        var needsRename = false;
        if (!hasVerifiedNames) {
            needsRename = checkColsNeedRename(tableName);
        }

        if (needsRename) {
            var tableId = xcHelper.getTableId(tableName);
            JupyterFinalizeModal.show(tableId, numRows);
        } else {
            $("#jupyterTab").click();
            var tableStruct = {action: "publishTable",
                          tableName: tableName,
                          colNames: colNames,
                          numRows: numRows};
            // this message gets sent to either the notebook or list view
            // (which every is currently active)
            // if list view receives it, it will create a new notebook and
            // redirect to it and xcalar.js will send a message back to this
            // file with a "newUntitled" action, which prompts
            // JupyterPanel.sendInit to send a message back to the notebook
            // with session information
            $("#jupyterNotebook")[0].contentWindow.postMessage(
                                      JSON.stringify(tableStruct), "*");
        }
    };

    JupyterPanel.autofillImportUdfModal = function(target, filePath,
                                                   includeStub, moduleName,
                                                   functionName) {

        MainMenu.openPanel("jupyterPanel");

        if (!currNotebook) {
            var msgStruct = {
                action: "autofillImportUdf",
                target: target,
                filePath: filePath,
                includeStub: includeStub,
                moduleName: moduleName,
                fnName: functionName
            };
            $("#jupyterNotebook")[0].contentWindow.postMessage(
                                      JSON.stringify(msgStruct), "*");
            // custom.js will create a new notebook and xcalar.js will
            // send a message back to here with an autofillImportUdf action
        } else {
            if (includeStub) {
                showImportUdfModal(target, filePath);
            } else {
                JupyterPanel.appendStub("importUDF", {
                    fnName: functionName,
                    target: target,
                    url: filePath,
                    moduleName: moduleName,
                    includeStub: false,
                });

                BottomMenu.openSection(2);
                UDF.selectUDFFuncList(moduleName);
            }
        }
    };

    function showImportUdfModal(target, filePath) {
        var params = {
            target: target,
            filePath: filePath
        }
        JupyterUDFModal.show("newImport", params);
    }

    function getCols(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var columns = gTables[tableId].getAllCols(true);
        var colNames = [];
        for (var i = 0; i < columns.length; i++) {
            colNames.push(columns[i].backName.replace("\\",""));
        }
        return colNames;
    }

    function checkColsNeedRename(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var columns = gTables[tableId].getAllCols(true);
        for (var i = 0; i < columns.length; i++) {
            if ((columns[i].getBackColName().indexOf(gPrefixSign) > -1 ||
                columns[i].getBackColName().indexOf(" ") > -1) && (
                columns[i].getType() !== ColumnType.object &&
                columns[i].getType() !== ColumnType.array)) {
                return true;
            }
        }
        return false;
    }

    function loadJupyterNotebook(lastLocation) {
        var url;
        if (lastLocation) {
            url = jupyterNode + "/notebooks/" + lastLocation + ".ipynb?kernel_name=python3#";
        } else {
            url = jupyterNode + "/tree#";
        }

        $.ajax({
            url: url,
            dataType: "json",
            timeout: 5000,
            success: function() {
                $("#jupyterNotebook").attr("src", url);
            },
            error: function(parsedjson) {
                if (parsedjson.status === 200) {
                    $("#jupyterNotebook").attr("src", url);
                } else {
                    $("#jupyterNotebook").attr("src", jupyterNode + "/tree#");
                }
            }
        });
    }

    function storeLocation(info) {
        if (info.location === "tree") {
            currNotebook = "";
        } else if (info.location === "notebook") {
            currNotebook = info.lastNotebook;
        }
        toggleJupyterMenu();
        return KVStore.put(KVStore.gNotebookKey, JSON.stringify(currNotebook),
                            true, gKVScope.WKBK);
    }

    function toggleJupyterMenu() {
        if (currNotebook) {
            $jupyterPanel.find(".topBar .rightArea").removeClass("xc-hidden");
        } else {
            $jupyterPanel.find(".topBar .rightArea").addClass("xc-hidden");
        }
    }

    JupyterPanel.appendStub = function(stubName, args) {
        var stubStruct = {action: "stub", stubName: stubName, args: args};
        $("#jupyterNotebook")[0].contentWindow.postMessage(JSON.stringify(stubStruct), "*");
    };

    function setupTopBarDropdown() {
        var $jupMenu = $jupyterPanel.find(".jupyterMenu");
        xcMenu.add($jupMenu);

        $jupyterPanel.on("click", ".topBar .dropdownBox", function() {
            var $menuIcon = $(this);

            xcHelper.dropdownOpen($menuIcon, $jupMenu, {
                "offsetX": -7,
                "toClose": function() {
                    return $jupMenu.is(":visible");
                },
                "callback": function() {

                }
            });
        });

        $jupyterPanel.on("click", ".jupyterMenu li", function() {
            var stubName = $(this).attr("data-action");
            if (stubName === "basicUDF") {
                JupyterUDFModal.show("map");
            } else if (stubName === "importUDF") {
                JupyterUDFModal.show("newImport");
            } else {
                JupyterPanel.appendStub(stubName);
            }
        });
    }

    function showMapForm(tableName, columns, moduleName, fnName) {
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];
        if (table && table.isActive()) {
            var colNums = [];
            for (var i = 0; i < columns.length; i++) {
                var colNum = table.getColNumByBackName(columns[i]);
                if (colNum > -1) {
                    colNums.push(colNum);
                }
            }

            MainMenu.openPanel("workspacePanel");
            OperationsView.show(tableId, colNums, "map", {
                prefill: {
                    ops: [moduleName + ":" + fnName],
                    args: [columns]
                }
            });
        } else {
            Alert.show({
                title: "Error",
                msg: "Table " + tableName + " is not present in any active worksheets.",
                isAlert: true
            });
        }
    }

    function showDSForm(moduleName, fnName) {
        var formatVal = $("#fileFormat .text").val();
        if (!$("#dsForm-preview").hasClass("xc-hidden") &&
            formatVal === $("#fileFormatMenu").find('li[name="UDF"]').text()) {

            MainMenu.openPanel("datastorePanel", "inButton");
            $("#udfArgs-moduleList").find("li").filter(function() {
                return $(this).text() === moduleName;
            }).trigger(fakeEvent.mouseup);

            $("#udfArgs-funcList").find("li").filter(function() {
                return $(this).text() === fnName;
            }).trigger(fakeEvent.mouseup);

            $("#dsForm-applyUDF").click();
        } else {
            Alert.show({
                title: "Error",
                msg: "Please select" +
                " a dataset to import in the Dataset Panel and select 'Custom Format' as the" +
                " current format.",
                isAlert: true
            });
        }
    }

    function udfRefreshFail() {
        Alert.show({
            title: "Error",
            msg: "Could not update UDF list.",
            isAlert: true
        });
    }

    return (JupyterPanel);
}(jQuery, {}));
