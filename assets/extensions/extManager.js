window.ExtButton = (function(ExtButton, $) {
    function genSimpleButton(modName, fnName, buttonText) {
        // var html = '<div class="sectionLabel">' + fnName + '</div>';
        var html = '';
        html += '<li class="extensions ' + modName + '::' + fnName + '" ' +
                 'data-modName="' + modName + '" data-fnName="' + fnName + '">';
        html += buttonText;
        html += '</li>';
        return (html);
    }

    function genComplexButton(modName, fnName, buttonText, arrayOfFields) {
        var html = '<li class="extensions complex ' + modName + '::' + fnName +
                    '" data-modName="' + modName + '"' +
                    ' data-fnName="' + fnName + '">';
        html += '<span class="extTitle">' + buttonText + "</span>...";
        html += '</li>';
        ExtensionOpModal.addButton(modName, fnName, arrayOfFields);

        return (html);
    }

    function newButtonHTML(modName, fnName, buttonText, arrayOfFields) {
        // buttonText: this is the text that is on the button
        // arrayOfFields: this is an array of field that are texts for args
        // each entry in arrayOfFields contain descriptions for the types of
        // values that are allowable in the input boxes.

        // For example, for window, buttonText = "window"
        // arrayOfFields = [lagObj, leadObj]
        // lagObj = {"type": "number", <-kind of argument
        //           "name": "Lag",    <-text to be display above input
        //           "fieldClass": "lag"} <-class to be applied for fn to use
        // leadObj = {"type": "number",
        //            "name": "Lead",
        //            "fieldClass": "lead"}

        // For horizontal partitioning, buttonText = "horizontal partition"
        // arrayOfFields = [{"type": "number",
        //                   "name": "No. of Partitions",
        //                   "fieldClass": "partitionNums"}]
        if (arrayOfFields === undefined || arrayOfFields.length === 0) {
            // Simple button, no input
            return (genSimpleButton(modName, fnName, buttonText));
        } else {
            return (genComplexButton(modName, fnName, buttonText,
                                     arrayOfFields));
        }
    }

    ExtButton.getButtonHTML = function(modName) {
        var buttonList = window[modName].buttons;
        var buttonsHTML = "";
        for (var i = 0; i < buttonList.length; i++) {
            buttonsHTML += newButtonHTML(modName, buttonList[i].fnName,
                                         buttonList[i].buttonText,
                                         buttonList[i].arrayOfFields);
        }
        return (buttonsHTML);
    };

    return (ExtButton);

}({}, jQuery));

window.ExtensionManager = (function(ExtensionManager, $) {
    var extList = [];
    var extFileNames = [];
    var numChecksLeft = 0;
    function setupPart4() {
        // get list of extensions currently loaded into system
        for (var objs in window) {
            if (objs.indexOf("UExt") === 0 ) {
                for (var i = 0; i < extFileNames.length; i++) {
                    if (objs.toLowerCase().substring(4, objs.length) + ".ext" ===
                        extFileNames[i].toLowerCase())
                    {
                        // Found it!
                        extList.push(objs);
                        break;
                    }
                }
            }
        }
        // console.log("Extensions list: " + extList);

        for (var i = 0; i < extList.length; i++) {
            // var buttonList = window[extList[i]].buttons;
            $("ul.extensions").eq(0).append(ExtButton.getButtonHTML(extList[i]));
            // if (i < extList.length - 1) {
            //     $("ul.extensions").eq(0).append(
            //     '<div class="divider identityDivider thDropdown"></div>');
            // }
        }
    }

    function removeExt(extName) {
        for (var i = 0; i < extFileNames.length; i++) {
            if (extFileNames[i] === extName) {
                extFileNames.splice(i, 1);
                break;
            }
        }
    }

    function setupPart3Success(extName, data) {
        // numChecksLeft can only be decremented inside the completion
        // for upload
        var pyString = data;
        // Remove .ext
        var pyModName = extName.substring(0, extName.length - 4);
        XcalarUploadPython(pyModName, pyString)
        .then(function() {
            UDF.storePython(pyModName, pyString);
            numChecksLeft--;
            if (numChecksLeft === 0) {
                setupPart4();
            }
        })
        .fail(function() {
            console.error("Extension failed to upload. Removing: " + extName);
            // Remove extension from list
            removeExt(extName);
            numChecksLeft--;
            if (numChecksLeft === 0) {
                setupPart4();
            }
        });
    }

    function setupPart3Fail(extName, error) {
        removeExt(extName);
        numChecksLeft--;
        console.log("Python file not found!");
        if (numChecksLeft === 0) {
            // I am the last guy that completed. Since JS is single threaded
            // hallelujah
            setupPart4();
        }
    }

    function checkPythonFunctions(extFileNames) {
        // XcalarListXdfs with fnName = extPrefix+":"
        // Also check that the module has a python file
        var needReupload = [];
        for (var j = 0; j < extFileNames.length; j++) {
            needReupload.push(extFileNames[j]);
            continue;
            // XXX This part is not run because we are currently blindly
            // reuploading everything
            var extPrefix = extFileNames[j].substring(0,
                                                   extFileNames[j].length - 4);
            var found = false;
            for (var i = 0; i < udfFunctions.length; i++) {
                if (udfFunctions[i].indexOf(extPrefix + ":") !== -1) {
                    found = true;
                    console.log("Found ext python: " + extPrefix);
                    break;
                }
            }
            if (!found) {
                console.log("Did not find ext python: " + extPrefix);
                needReupload.push(extFileNames[j]);
            }
        }
        return (needReupload);
    }

    function setupPart2() {
        // check that python modules have been uploaded
        var extLoaded = $("ul.extensions script");
        for (var i = 0; i < extLoaded.length; i++) {
            var jsFile = extLoaded[i].src;

            // extract module name
            var strLoc = jsFile.indexOf("assets/extensions/installed/");
            if (strLoc !== -1) {
                jsFile = jsFile.substring(strLoc +
                                         "assets/extensions/installed/".length,
                                         jsFile.length - 3);
                extFileNames[i] = jsFile;
            } else {
                extFileNames[i] = "";
                console.error("extensions are not located in extensions");
                continue;
            }
        }
        // Check that the python modules are uploaded
        // For now, we reupload everything everytime.
        var pythonReuploadList = checkPythonFunctions(extFileNames);
        if (pythonReuploadList.length === 0) {
            // No python requires reuploading
            setupPart4();
        } else {
        // if python module is gone, reupload by reading file from local system
            numChecksLeft = pythonReuploadList.length;
            for (var i = 0; i < pythonReuploadList.length; i++) {
                jQuery.ajax({
                    type: "GET",
                    url : "assets/extensions/installed/" +
                         pythonReuploadList[i] + ".py",
                    success: (function(valOfI) {
                        return function(data) {
                            setupPart3Success(pythonReuploadList[valOfI], data);
                        };
                    })(i),
                    error: (function(valOfI) {
                        return function(error) {
                            setupPart3Fail(pythonReuploadList[valOfI], error);
                        };
                    })(i)
                });
            }
        }
    }

    ExtensionManager.setup = function() {
        // extensions.html should be autopopulated by the backend
        $("ul.extensions").empty(); // Clean up for idempotency
        // XXX change to async call later
        $("ul.extensions").load("assets/extensions/extensions.html",
                                undefined, setupPart2);
    };
    // This registers an extension.
    // The extension must have already been added via addExtension
    ExtensionManager.registerExtension = function(extName) {

    };
    // This unregisters an extension. This does not remove it from the system.
    ExtensionManager.unregisterExtension = function(extName) {
    };
    // This adds an extension to the current list of extensions. fileString
    // represents a version of the .py and .js files. It might be tar gz, or
    // might just be the two files concatted together. We are still deciding
    // This basically uploads the string to the backend and asks the backend to
    // Write it to a file in our designated location
    // This also requires that the backend writes some html into our .html
    // file that does the <script src> so that the new .js files get loaded
    ExtensionManager.addExtension = function(fileString, extName) {
        // Waiting for thrift call
    };
    // This removes the extension permanently from the system. This basically
    // undoes everything in addExtension
    ExtensionManager.removeExtension = function(extName) {
         // Might not support in 1.0
    };

    ExtensionManager.trigger = function(colNum, tableId, functionName, argList) {
        var deferred = jQuery.Deferred();
        // function names must be of the form modName::funcName
        var args = functionName.split("::");
        if (args.length < 2) {
            // XXX alert error
            return;
        }
        var modName = args[0];
        var funcName = args[1];
        if (modName.indexOf("UExt") !== 0) {
            // XXX alert error
            return;
        }

        var $tableMenu = $('#colMenu');
        var $subMenu = $('#colSubMenu');
        // var $allMenus = $tableMenu.add($subMenu);
        var colArray = $("#colMenu").data("columns");
        var colNames = [];

        if (colArray.length > 1) {
            colNum = colArray;
        }
        // argList.allMenus = $allMenus;

        if (modName !== "UExtATags" && modName !== "UExtGLM" &&
            modName !== "UExtIntel" && modName !== "UExtKMeans" &&
            modName !== "UExtTableau") {
            var worksheet = WSManager.getWSFromTable(tableId);
            var table = gTables[tableId];
            var tableName = table.tableName;
            var progCol = table.tableCols[colNum - 1];
            var colType = progCol.type;
            var colName = progCol.name;
            var backColName = progCol.getBackColName();

            var hasStart = false;
            var txId;
            var sql = {
                "operation"   : SQLOps.Ext,
                "tableName"   : table.tableName,
                "tableId"     : tableId,
                "colNum"      : colNum,
                "colName"     : colName,
                "functionName": functionName,
                "argList"     : argList,
                "htmlExclude" : ["argList"]
            };

            // Note Use try catch in case user has come error in extension code
            try {
                var col = new XcSDK.Column(backColName, colType);
                var ext = window[modName].actionFn(funcName);

                if (ext == null || !(ext instanceof XcSDK.Extension)) {
                    Alert.error(StatusMessageTStr.ExtFailed, ErrTStr.InvalidExt);
                    return;
                }

                var buttons = window[modName].buttons;
                var extButton = null;
                if (buttons instanceof Array) {
                    for (var i = 0, len = buttons.length; i < len; i++) {
                        if (buttons[i].fnName === funcName) {
                            extButton = buttons[i].arrayOfFields;
                            break;
                        }
                    }
                }

                ext.initialize(col, tableName, worksheet, argList);
                ext.runBeforeStart(extButton)
                .then(function() {
                    hasStart = true;
                    xcHelper.lockTable(tableId);

                    var msg = xcHelper.replaceMsg(StatusMessageTStr.Ext, {
                        "extension": functionName
                    });
                    txId = Transaction.start({
                        "msg"      : msg,
                        "operation": SQLOps.Ext
                    });

                    return ext.run(txId);
                })
                .then(function() {
                    return ext.runAfterFinish();
                })
                .then(function(finalTables) {

                    xcHelper.unlockTable(tableId);

                    sql.newTableNames = finalTables;
                    // use the last finalTable as msgTable
                    var finalTableName = finalTables[finalTables.length - 1];
                    Transaction.done(txId, {
                        "msgTable": xcHelper.getTableId(finalTableName),
                        "sql"     : sql
                    });
                    deferred.resolve();
                })
                .fail(function(error) {
                    if (error == null) {
                        error = ErrTStr.Unknown;
                    }

                    if (hasStart) {
                        xcHelper.unlockTable(tableId);

                        Transaction.fail(txId, {
                            "failMsg": StatusMessageTStr.ExtFailed,
                            "error"  : error,
                            "sql"    : sql
                        });
                    } else {
                        Alert.error(StatusMessageTStr.ExtFailed, error);
                    }
                    deferred.reject(error);
                });
            } catch(error) {
                if (hasStart) {
                    xcHelper.unlockTable(tableId);

                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.ExtFailed,
                        "error"  : error.toLocaleString(),
                        "sql"    : sql
                    });
                } else {
                    Alert.error(StatusMessageTStr.ExtFailed, error.toLocaleString());
                }
                deferred.reject(error);
            }
            return deferred.promise();
        }

        var table = gTables[tableId];
        var sql = {
            "operation"   : SQLOps.Ext,
            "tableName"   : table.tableName,
            "tableId"     : tableId,
            "colNum"      : colNum,
            "functionName": functionName,
            "argList"     : argList,
            "htmlExclude" : ["argList"]
        };

        xcHelper.lockTable(tableId);

        var msg = xcHelper.replaceMsg(StatusMessageTStr.Ext, {
            "extension": functionName
        });
        var txId = Transaction.start({
            "msg"      : msg,
            "operation": SQLOps.Ext
        });

        try {
            window[modName].actionFn(txId, colNum, tableId, funcName, argList)
            .then(function(newTables) {
                xcHelper.unlockTable(tableId);
                var finalTableId;
                if (newTables != null) {
                    if (!(newTables instanceof Array)) {
                        newTables = [newTables];
                    }
                    sql.newTables = newTables;
                    finalTableId = xcHelper.getTableId(newTables[newTables.length - 1]);
                }

                Transaction.done(txId, {
                    "msgTable": finalTableId,
                    "sql"     : sql
                });

                deferred.resolve();
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ExtFailed,
                    "error"  : error,
                    "sql"    : sql
                });

                deferred.reject(error);
            });
        } catch (error) {
            // in case there is some run time error
            xcHelper.unlockTable(tableId);
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ExtFailed,
                "error"  : error,
                "sql"    : sql
            });

            deferred.reject(error);
        }

        return deferred.promise();
    };
    return (ExtensionManager);
}({}, jQuery));
