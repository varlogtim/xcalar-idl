namespace ExtensionManager {
    let enabledExts = {};
    let extMap = {};
    let cachedExts = [];
    let hasSetup: boolean = false;

    /**
     * ExtensionManager.setup
     */
    export function setup(): XDPromise<void> {
        if (hasSetup) {
            return PromiseHelper.reject();
        }
        hasSetup = true;
        return ExtensionManager.install();
    }

    /**
     * ExtensionManager.install
     */
    export function install(): XDPromise<void> {
        // if set up has not been called, will not do the install
        if (!hasSetup || WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        }
        initInstall();

        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        ExtensionPanel.Instance.getEnabledList()
        .then(function(enabledExtHTMl) {
            return loadExtensions(enabledExtHTMl);
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("install extension fails", error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    /**
     * ExtensionManager.getEnabledExtensions
     */
    export function getEnabledExtensions() {
        return cachedExts;
    }

    function initInstall() {
        extMap = {};
        enabledExts = {};
        // extensions.html should be autopopulated by the backend
        $("#extension-ops-script").empty(); // Clean up for idempotency
        // change to async call later
        // jquery 3 should not need it
        $.ajaxPrefilter("script", function(options) {
            // only apply when it's loading extension
            if (options.url.indexOf("assets/extensions/") >= 0) {
                options.async = true;
            }
        });
    }

    function loadExtensions(htmlString) {
        if (!htmlString) {
            console.error("Failed to get extensions");
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var promises = [];
        var $tag = $('<div>' + htmlString + '</div>');
        $tag.find("script").each(function() {
            var $script = $(this);
            promises.push(loadScript($script));
        });

        PromiseHelper.when.apply(this, promises)
        .then(function() {
            return loadUDFs();
        })
        .then(function() {
            setupExtensions();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function loadScript($script) {
        var deferred = PromiseHelper.deferred();
        var src = $script.attr("src");
        var extName = parseExtNameFromSrc(src);
        cacheEnabledExtension(extName);

        $.getScript(src)
        .then(function() {
            $("#extension-ops-script").append($script);
            setExtensionState(extName, "installScript", true);
            deferred.resolve();
        })
        .fail(function(err) {
            var error;
            try {
                if (err.status === 404) {
                    error = ExtTStr.NoScript;
                } else if (err.status === 200) {
                    error = ExtTStr.ParseFail;
                } else {
                    error = ExtTStr.LoadScriptFail;
                }
            } catch (e) {
                console.error(e);
                error = ExtTStr.LoadScriptFail;
            }

            console.error(error, src + " could not be loaded.");
            setExtensionState(extName, "error", error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function loadUDFs() {
        // check that python modules have been uploaded
        var extNames = Object.keys(enabledExts).filter(function(extName) {
            return getExtensionState(extName, "installScript");
        });
        // Check that the python modules are uploaded
        // For now, we reupload everything everytime.
        var pythonReuploadList = checkPythonFunctions(extNames);
        // if python module is gone, reupload by reading file from local system
        var extPromises = pythonReuploadList.map(function(extName) {
            return loadAndStorePython(extName);
        });

        var promise = PromiseHelper.when.apply(this, extPromises);
        // always resolve the promise, even if extPromises is empty.
        return PromiseHelper.alwaysResolve(promise);
    }

    function setupExtensions() {
        // check that python modules have been uploaded
        var extNames = Object.keys(enabledExts).filter(function(extName) {
            var loadScript = getExtensionState(extName, "installScript");
            var loadUDF = getExtensionState(extName, "installUDF");
            return loadScript && loadUDF;
        });
        var extList = [];
        // get list of extensions currently loaded into system
        for (var objs in window) {
            if (objs.indexOf("UExt") === 0) {
                for (var i = 0; i < extNames.length; i++) {
                    if (objs.toLowerCase().substring(4, objs.length) ===
                        extNames[i].toLowerCase())
                    {
                        // Found it!
                        extList.push(objs);
                        extNames.splice(i, 1);
                        break;
                    }
                }
            }
        }

        extList.sort();
        storeExtConfigParams();
        // cannot find these extensions
        extNames.forEach(function(extName) {
            setExtensionState(extName, "installScript", false);
            setExtensionState(extName, "error", ExtTStr.FindExtFail);
        });
        cachedExts = extList.map((modName) => {
            window[modName].name = modName;
            return window[modName];
        });
    }

    function checkPythonFunctions(extNames) {
        // XcalarListXdfs with fnName = extPrefix+":"
        // Also check that the module has a python file
        var needReupload = [];
        for (var j = 0; j < extNames.length; j++) {
            needReupload.push(extNames[j]);
            continue;
            // XXX This part is not run because we are currently blindly
            // reuploading everything
            // var extPrefix = extNames[j].substring(0, extNames[j].length - 4);
            // var found = false;
            // for (var i = 0; i < udfFunctions.length; i++) {
            //     if (udfFunctions[i].indexOf(extPrefix + ":") !== -1) {
            //         found = true;
            //         console.log("Found ext python: " + extPrefix);
            //         break;
            //     }
            // }
            // if (!found) {
            //     console.log("Did not find ext python: " + extPrefix);
            //     needReupload.push(extNames[j]);
            // }
        }
        return (needReupload);
    }

    function loadAndStorePython(extName) {
        // python name need to be lowercase
        var pyModName = extName.toLowerCase();
        var deferred = PromiseHelper.deferred();

        jQuery.ajax({
            type: "GET",
            url: "assets/extensions/ext-enabled/" + extName + ".ext.py"
        })
        .then(function(response) {
            // Success case
            var data = response;
            return uploadPython(pyModName, data);
        },
        function(error) {
            // Fail case
            console.error("Python file not found!", error);
        })
        .then(function() {
            setExtensionState(extName, "installUDF", true);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Extension", extName, "failed to upload", error);
            setExtensionState(extName, "error", ExtTStr.LoadUDFFail);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    function uploadPython(pyModName, data) {
        // only upload non-empty python
        if (isEmptyPython(data)) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        // upload to shared space
        var udfPath = UDFFileManager.Instance.getSharedUDFPath() + pyModName;
        var upload = false;
        XcalarListXdfs(udfPath + "*", "User*")
        .then(function(res) {
            try {
                if (res.numXdfs === 0) {
                    // udf not already exist
                    upload = true;
                    return XcalarUploadPython(udfPath, data, true, true);
                }
            } catch (e) {
                return PromiseHelper.reject(e.message);
            }
        })
        .then(function() {
            if (upload) {
                UDFFileManager.Instance.storePython(pyModName, data);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (typeof error === "object" &&
                error.status === StatusT.StatusUdfModuleInUse)
            {
                // udf in use case, don't faill the promise
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function isEmptyPython(data) {
        return (data == null || data === "");
    }

    function cacheEnabledExtension(extName) {
        if (extName != null) {
            enabledExts[extName] = {};
        }
    }

    function setExtensionState(extName, status, val) {
        if (enabledExts.hasOwnProperty(extName)) {
            enabledExts[extName][status] = val;
        }
    }

    function getExtensionState(extName, status) {
        if (enabledExts.hasOwnProperty(extName)) {
            return enabledExts[extName][status];
        } else {
            return null;
        }
    }

    function parseExtNameFromSrc(src) {
        // src format: assets/extensions/ext-enabled/dev.ext.js
        var res = null;
        try {
            var start = src.lastIndexOf("/") + 1;
            var end = src.lastIndexOf(".ext.js");
            res = src.substring(start, end);
        } catch (error) {
            console.error(error);
        }
        return res;
    }

    /**
     * ExtensionManager.isInstalled
     * @param extName
     */
    export function isInstalled (extName: string): boolean {
        for (var extKey in extMap) {
            if (extMap.hasOwnProperty(extKey)) {
                if (extKey.toLowerCase() === "uext" + extName.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * ExtensionManager.getInstallError
     * @param extName
     */
    export function getInstallError(extName: string): string {
        return (enabledExts[extName].error || ErrTStr.Unknown);
    }

    /*
    options: {
        noNotification: boolean, to hide success message pop up
        noSql: boolean, if set true, not add to sql log,
        closeTab: boolean, if true, close view when pass before run check
        formOpenTime: the open time of the form,
        noFailAlert: boolean, to hide error alert
    }
     */
    /**
     * ExtensionManager.triggerFromDF
     * @param moduleName
     * @param funcName
     * @param args
     */
    export function triggerFromDF(
        moduleName: string,
        funcName: string,
        args: any
    ): XDPromise<string> {
        if (moduleName == null || funcName == null || moduleName.indexOf("UExt") !== 0) {
            return PromiseHelper.reject("Invalid argument in extension");
        }

        if (!extMap[moduleName] || !extMap[moduleName].hasOwnProperty(funcName)) {
            var msg = xcStringHelper.replaceMsg(ErrTStr.ExtNotFound, {
                module: moduleName,
                fn: funcName
            });
            return PromiseHelper.reject(msg);
        }

        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        var notTableDependent = extMap[moduleName].configParams.notTableDependent;

        var table;
        if (!notTableDependent) {
            table = args["triggerNode"];
        } else {
            table = null;
        }

        // Note Use try catch in case user has come error in extension code
        try {
            let ext: XcSDK.Extension = window[moduleName].actionFn(funcName);
            if (ext == null || !(ext instanceof XcSDK.Extension)) {
                return PromiseHelper.reject(ErrTStr.InvalidExt);
            }

            var buttons = window[moduleName].buttons;
            var extButton = null;
            if (buttons instanceof Array) {
                for (var i = 0, len = buttons.length; i < len; i++) {
                    if (buttons[i].fnName === funcName) {
                        extButton = buttons[i].arrayOfFields;
                        break;
                    }
                }
            }

            var runBeforeStartRet;
            var txId = Transaction.start({
                operation: "Simulate",
                simulate: true
            });
            ext.initialize(table, null, args, true);
            ext.runBeforeStart(extButton)
            .then(function() {

                return ext.run(txId);
            })
            .then(function(ret) {
                runBeforeStartRet = ret;
                return ext.runAfterFinish();
            })
            .then(function(finalTables, finalReplaces) {
                // XXX TODO modify it
                var finalTableName;
                if (finalTables != null && finalTables.length > 0) {
                    // use the last finalTable as msgTable
                    finalTableName = finalTables[finalTables.length - 1];
                } else if (finalReplaces != null) {
                    for (var key in finalReplaces) {
                        // use a random table in finalReplaces as msgTable
                        finalTableName = key;
                        break;
                    }
                }
                const query = Transaction.done(txId, {
                    noNotification: true,
                    noSql: true,
                    noCommit: true
                });
                const finalTable = ext.getTable(finalTableName);
                let finalCols = [];
                if (finalTable) {
                    finalTable.getColsAsArray().forEach((col) => {
                        const colName = col.getName();
                        if (colName !== "DATA") {
                            const frontName = xcHelper.parsePrefixColName(colName).name;
                            const progCol = ColManager.newPullCol(frontName, colName, col.getType());
                            finalCols.push(progCol);
                        }
                    });
                }
                deferred.resolve(finalTableName, query, finalCols, runBeforeStartRet);
            })
            .fail(function(error) {
                if (error == null) {
                    error = ErrTStr.Unknown;
                }
                Transaction.fail(txId, {});
                deferred.reject(error);
            });
        } catch (error) {
            console.error(error.stack);
            Transaction.fail(txId, {});
            deferred.reject(error);
        }

        return deferred.promise();
    }

    function storeExtConfigParams() {
        for (var ext in extMap) {
            if (window[ext].configParams) {
                extMap[ext].configParams = window[ext].configParams;
            } else {
                extMap[ext].configParams = {};
            }
        }
    }
}
