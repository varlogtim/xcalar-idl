namespace ExtensionManager {
    let enabledExts = {};
    let extMap = {};
    let cachedExts = [];
    let hasInitialLoad: boolean = false;
    let hasRenderPanels: boolean = false;
    let extensionLoader: ExtensionLoader;

    /**
     * ExtensionManager.setup
     */
    export function setup(): void {
        extensionLoader = new ExtensionLoader("extension-ops-script");
        setupExtensionLoaderEvents();
    }

    /**
     * ExtensionManager.loadEnabledExtension
     */
    export function loadEnabledExtension(): XDPromise<void> {
        if (hasInitialLoad) {
            return PromiseHelper.reject();
        }
        hasInitialLoad = true;
        return ExtensionManager.install();
    }


    /**
     * ExtensionManager.install
     */
    export function install(): XDPromise<void> {
        // if set up has not been called, will not do the install
        if (!hasInitialLoad || WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        }
        return extensionLoader.install();
    }

    /**
     * ExtensionManager.getEnabledExtensions
     */
    export function getEnabledExtensions() {
        return cachedExts;
    }


    function setupExtensionLoaderEvents(): void {
        extensionLoader
        .on("beforeLoadScript", function(extensionName) {
            cacheEnabledExtension(extensionName);
        })
        .on("afterLoadScript", function(extensionName) {
            setExtensionState(extensionName, "installScript", true);
        })
        .on("failLoadScript", function(exensionName, error) {
            setExtensionState(exensionName, "error", error);
        })
        .on("afterLoadUDF", function(extensionName) {
            setExtensionState(extensionName, "installUDF", true);
        })
        .on("failLoadUDF", function(extensionName) {
            setExtensionState(extensionName, "error", ExtTStr.LoadUDFFail);
        })
        .on("loadFinish", function() {
            setupExtensions();
        })
        .on("getLoadedExtension", function() {
            let extNames = Object.keys(enabledExts).filter(function(extName) {
                return getExtensionState(extName, "installScript");
            });
            return extNames;
        });
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
                        setExtMap(objs);
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

    function setExtMap(modName: string): void {
        let funcList = window[modName].buttons || [];
        extMap[modName] = {};
        for (let i = 0, len = funcList.length; i < len; i++) {
            let func = funcList[i];
            let fnName = func.fnName;
            extMap[modName][fnName] = func;
        }
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

    /**
     * ExtensionManager.isInstalled
     * @param extName
     */
    export function isInstalled(extName: string): boolean {
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
        noLog: boolean, if set true, not add to sql log,
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
    ): XDPromise<{finalTableName: string, query: string, cols: ProgCol[], runBeforeStartRet: any}> {
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

        let deferred: XDDeferred<{finalTableName: string, query: string, cols: ProgCol[], runBeforeStartRet: any}> = PromiseHelper.deferred();
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
            .then(function({finalTables, finalReplaces}) {
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
                    noLog: true,
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
                deferred.resolve({finalTableName: finalTableName, query: query, cols: finalCols, runBeforeStartRet: runBeforeStartRet});
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
