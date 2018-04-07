window.JupyterPanel = (function($, JupyterPanel) {
    var $jupyterPanel;
    var jupyterMeta;
    var msgId = 0;
    var msgPromises = {};
    var promiseTimeLimit = 10000; // 10 seconds

    function JupyterMeta(currentNotebook, folderName) {
        this.currentNotebook = currentNotebook || null;
        this.folderName = folderName || null;
    };

    JupyterMeta.prototype = {
        setCurrentNotebook: function(currentNotebook) {
            this.currentNotebook = currentNotebook;
        },

        getCurrentNotebook: function() {
            return this.currentNotebook;
        },

        setFolderName: function(folderName) {
            this.folderName = folderName;
        },

        getFolderName: function() {
            return this.folderName;
        },

        getMeta: function() {
            return {
                currentNotebook: this.currentNotebook,
                folderName: this.folderName
            };
        },

        hasFolder: function() {
            return (this.folderName != null);
        }
    };

    JupyterPanel.setup = function() {
        $jupyterPanel = $("#jupyterPanel");
        JupyterStubMenu.setup();
    };

    JupyterPanel.initialize = function(noRestore) {
        var deferred = PromiseHelper.deferred();
        if (window.jupyterNode == null || window.jupyterNode === "") {
            window.jupyterNode = hostname + '/jupyter';
        }

        window.addEventListener("message", function(event) {
            var struct = event.data;
            try {
                var s = JSON.parse(struct);
                switch (s.action) {
                    case ("alert"):
                        if ($jupyterPanel.is(":visible")) {
                            $("#alertModal").height(300);
                            Alert.show(s.options);
                        }
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
                    case ("enterExistingNotebook"):
                    case ("enterNotebookList"):
                        JupyterPanel.sendInit();
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
                    case ("newUntitled"):
                        JupyterPanel.sendInit(true, s.publishTable, s.tableName,
                                              s.numRows,
                                              {noRenamePrompt: s.noRename});
                        break;
                    case ("toggleMenu"):
                        JupyterStubMenu.toggleAllow(s.allow);
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
                    case ("updateLocation"):
                        storeCurrentNotebook(s);
                        break;
                    case ("resolve"):
                        if (msgPromises[s.msgId]) {
                            msgPromises[s.msgId].resolve(s);
                            delete msgPromises[s.msgId];
                        }
                        break;
                    case ("reject"):
                        if (msgPromises[s.msgId]) {
                            msgPromises[s.msgId].reject(s);
                            delete msgPromises[s.msgId];
                        }
                        break;
                    default:
                        // XXX temp fix until 11588 is fixed
                        if (s.action === "returnFolderName") {
                            for (var i in msgPromises) {
                                msgPromises[i].resolve(s);
                                delete msgPromises[i];
                            }
                        }
                        console.error("Unsupported action:" + s.action);
                        break;
                }
            } catch (e) {
                console.error("Illegal message sent:" + event.data, e);
            }
        });

        if (noRestore) {
            jupyterMeta = new JupyterMeta();
            loadJupyterNotebook()
            .always(deferred.resolve);
        } else {
            restoreMeta()
            .always(function() {
                loadJupyterNotebook()
                .always(deferred.resolve);
            });
        }

        return deferred.promise();
    };

    JupyterPanel.sendInit = function(newUntitled, publishTable, tableName, numRows,
        options) {
        var colNames = [];
        if (publishTable && tableName) {
            colNames = getCols(tableName);
        }
        options = options || {};
        noRenamePrompt = options.noRenamePrompt || false;
        var activeWBId = WorkbookManager.getActiveWKBK();
        var wbName = null;
        if (activeWBId && WorkbookManager.getWorkbook(activeWBId)) {
            wbName = WorkbookManager.getWorkbook(activeWBId).name;
        }
        var workbookStruct = {action: "init",
                newUntitled: newUntitled,
                noRenamePrompt: noRenamePrompt,
                publishTable: publishTable,
                tableName: tableName,
                colNames: colNames,
                numRows: numRows,
                username: userIdName,
                userid: userIdUnique,
                sessionname: wbName,
                sessionid: activeWBId,
                folderName: jupyterMeta.getFolderName()
        };
        sendMessageToJupyter(workbookStruct);
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
            MainMenu.openPanel("jupyterPanel");
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
            sendMessageToJupyter(tableStruct);
        }
    };

    JupyterPanel.autofillImportUdfModal = function(target, filePath,
                                                   includeStub, moduleName,
                                                   functionName) {

        MainMenu.openPanel("jupyterPanel");

        if (!jupyterMeta.getCurrentNotebook()) {
            var msgStruct = {
                action: "autofillImportUdf",
                target: target,
                filePath: filePath,
                includeStub: includeStub,
                moduleName: moduleName,
                fnName: functionName
            };
            sendMessageToJupyter(msgStruct);
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

    // called when we create a new xcalar workbook
    // will create a new jupyter folder dedicated to this workbook
    JupyterPanel.newWorkbook = function(wkbkName, wkbkId) {
        var deferred = PromiseHelper.deferred();
        var newName;

        var folderName = XcSupport.getUser() + "-" + wkbkName;
        var msgStruct = {
            action: "newWorkbook",
            folderName: folderName,
            wkbkId: wkbkId
        };

        sendMessageToJupyter(msgStruct, true)
        .then(function(result) {
            deferred.resolve(result.newName);
        })
        .fail(function(err) {
            console.error(err.error);
            deferred.resolve(err); // resolve anyways without folder
        });

        return deferred.promise();
    };

    JupyterPanel.deleteWorkbook = function(wkbkId) {
        var folderName = WorkbookManager.getWorkbook(wkbkId).jupyterFolder;

        if (folderName) {
            var msgStruct = {
                action: "deleteWorkbook",
                folderName: folderName
            };
            sendMessageToJupyter(msgStruct);
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

    function loadJupyterNotebook() {
        var deferred = PromiseHelper.deferred();

        var url;
        var treeUrl = jupyterNode + "/tree";
        var currNotebook = jupyterMeta.getCurrentNotebook();
        var folderName = jupyterMeta.getFolderName();
        // try folder/currnotebook, else just go to the folder else root
        // we do not send the user to a notebook that's not in their folder
        if (currNotebook && folderName) {
            url = jupyterNode + "/notebooks/" + folderName + "/" +
                  currNotebook + ".ipynb?kernel_name=python3#";
        } else if (folderName) {
            url = treeUrl + "/" + folderName;
        } else {
            url = treeUrl;
        }

        goToLocation(url)
        .then(deferred.resolve)
        .fail(function(error) {
            if (currNotebook && folderName) {
                // notebook path failed, try to go to folder path
                var folderPath = treeUrl + "/" + folderName
                goToLocation(folderPath)
                .then(deferred.resolve)
                .fail(function() {
                    $("#jupyterNotebook").attr("src", treeUrl);
                    deferred.resolve();
                });
            } else {
                $("#jupyterNotebook").attr("src", treeUrl);
                deferred.resolve();
            }
        });

        function goToLocation(location) {
            var innerDeferred = PromiseHelper.deferred();
            $.ajax({
                url: location,
                dataType: "json",
                timeout: 8000,
                success: function() {
                    $("#jupyterNotebook").attr("src", location);
                    innerDeferred.resolve();
                },
                error: function(err) {
                    if (err.status === 200) {
                        $("#jupyterNotebook").attr("src", location);
                        innerDeferred.resolve();
                    } else {
                        console.error("Jupyter load failed", err);
                        innerDeferred.reject(err);
                    }
                }
            });

            return innerDeferred.promise();
        }

        return deferred.promise();
    }

    function restoreMeta() {
        var deferred = PromiseHelper.deferred();

        var wkbk = WorkbookManager.getWorkbook(WorkbookManager.getActiveWKBK());
        var folderName = wkbk.jupyterFolder;

        var key = KVStore.getKey("gNotebookKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(jupMeta) {
            var lastNotebook = null;

            if (jupMeta) {
                try {
                    lastNotebook = $.parseJSON(jupMeta);
                } catch (err) {
                    console.error(err);
                }
            }

            jupyterMeta = new JupyterMeta(lastNotebook, folderName);
            deferred.resolve();
        })
        .fail(function() {
            jupyterMeta = new JupyterMeta(null, folderName);
            deferred.reject.apply(null, arguments);
        });

        return deferred.promise();
    }

    function storeCurrentNotebook(info) {
        var currNotebook;
        if (info.location === "notebook") {
            currNotebook = info.lastNotebook;
        } else { // location is tree and we leave null
            currNotebook = null;
        }

        jupyterMeta.setCurrentNotebook(currNotebook);
        JupyterStubMenu.toggleVisibility(jupyterMeta.getCurrentNotebook());

        var kvsKey = KVStore.getKey("gNotebookKey");
        var kvStore = new KVStore(kvsKey, gKVScope.WKBK);
        return kvStore.put(JSON.stringify(currNotebook), true);
    }

    JupyterPanel.appendStub = function(stubName, args) {
        var stubStruct = {action: "stub", stubName: stubName, args: args};
        sendMessageToJupyter(stubStruct);
    };

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
                title: ErrorMessageTStr.title,
                msg: JupyterTStr.DSFormInactive,
                isAlert: true
            });
        }
    }

    function udfRefreshFail() {
        Alert.show({
            title: ErrorMessageTStr.title,
            msg: "Could not update UDF list.",
            isAlert: true
        });
    }

    function sendMessageToJupyter(msgStruct, isAsync) {
        var deferred = PromiseHelper.deferred();
        var messageInfo = {
            fromXcalar: true,
        };
        if (isAsync) {
            prepareAsyncMsg(messageInfo, deferred);
        } else {
            deferred.resolve();
        }
        msgStruct = $.extend(messageInfo, msgStruct);
        var msg = JSON.stringify(msgStruct);

        $("#jupyterNotebook")[0].contentWindow.postMessage(msg, "*");
        return deferred.promise();
    }

    function prepareAsyncMsg(messageInfo, deferred) {
        messageInfo.msgId = msgId;
        msgPromises[msgId] = deferred;
        var cachedId = msgId;
        setTimeout(function() {
            if (msgPromises[cachedId]) {
                msgPromises[cachedId].reject({error: "timeout"});
                delete msgPromises[cachedId];
            }
        }, promiseTimeLimit);
        msgId++;
    }

        /* Unit Test Only */
    if (window.unitTestMode) {
        JupyterPanel.__testOnly__ = {};
        JupyterPanel.__testOnly__showMapForm = showMapForm;
        JupyterPanel.__testOnly__showDSForm = showDSForm;
        JupyterPanel.__testOnly__.getCurNB = function() {
            return jupyterMeta.getCurrentNotebook();
        }
        JupyterPanel.__testOnly__.setCurNB = function(nb) {
            jupyterMeta.setCurrentNotebook(nb);
        };
    }
    /* End Of Unit Test Only */


    return (JupyterPanel);
}(jQuery, {}));
