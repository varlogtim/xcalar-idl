window.JupyterPanel = (function($, JupyterPanel) {
    var $jupyterPanel;
    var currNotebook;

    JupyterPanel.setup = function() {
        $jupyterPanel = $("#jupyterPanel");
        setupTopBarDropdown();
    };

    JupyterPanel.initialize = function() {
        if (window.jupyterNode == null || window.jupyterNode === "") {
            var colIndex = hostname.lastIndexOf(":");
            if (colIndex < 6) {
                colIndex = hostname.length;
            }
            var tempName = hostname.slice(0, colIndex);
            window.jupyterNode = tempName + ":8889";
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
                        JupyterPanel.sendInit(true, s.publishTable, s.tableName, s.numRows);
                        break;
                    case ("updateLocation"):
                        storeLocation(s);
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
                    case ("sendToUDFEditor"):
                        BottomMenu.openSection(2);
                        var editor = UDF.getEditor();
                        UDF.clear();
                        editor.setValue(s.code);
                        break;
                    default:
                        console.error("Unsupported action:" + s.action);
                }
            } catch (e) {
                console.error("Illegal message sent:" + event.data, e);
            }
        });
    };

    JupyterPanel.sendInit = function(newUntitled, publishTable, tableName, numRows) {
        var colNames = [];
        if (publishTable && tableName) {
            colNames = getCols(tableName);
        }
        var workbookStruct = {action: "init",
                newUntitled: newUntitled,
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

    JupyterPanel.publishTable = function(tableName, numRows, renamed) {
        var colNames = getCols(tableName);
        var needsRename = false;
        if (!renamed) {
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
            $("#jupyterNotebook")[0].contentWindow.postMessage(
                                      JSON.stringify(tableStruct), "*");
        }
    };

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
            if (columns[i].getBackColName().indexOf(gPrefixSign) > -1 && (
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
            url = jupyterNode + "/notebooks/" + lastLocation + ".ipynb?kernel_name=python2#";
        } else {
            url = jupyterNode + "/tree#";
        }

        $.ajax({
            url: url,
            dataType: "jsonp",
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
            } else if (stubName === "testImportUDF") {
                JupyterUDFModal.show("testImport");
            } else {
                JupyterPanel.appendStub(stubName);
            }
        });
    }

    return (JupyterPanel);
}(jQuery, {}));