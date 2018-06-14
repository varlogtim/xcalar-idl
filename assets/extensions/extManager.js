window.ExtensionManager = (function(ExtensionManager, $) {
    var enabledExts = {};
    var extMap = {};
    var triggerCol;

    // for the opsView
    var $extOpsView;              // $("#extension-ops");
    var $extTriggerTableDropdown; //$("#extension-ops-mainTable");
    var isViewOpen = false;
    var $lastInputFocused;
    var formHelper;
    var hintMenu = [];
    var inputSuggest;
    var shouldRestore = false;
    var formOpenTime;

    ExtensionManager.setup = function() {
        $extOpsView = $("#extension-ops");
        $extTriggerTableDropdown = $("#extension-ops-mainTable");
        addEventListeners();
        setupSuggest();
        return ExtensionManager.install();
    };

    ExtensionManager.install = function() {
        initInstall();

        var deferred = PromiseHelper.deferred();
        var url = xcHelper.getAppUrl();

        $extOpsView.addClass("loading");
        xcHelper.showRefreshIcon($extOpsView.find(".extLists"), true, deferred);

        $.ajax({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/getEnabled",
        })
        .then(function(data) {
            if (data.status === Status.Ok) {
                return loadExtensions(data.data);
            } else {
                console.error("Failed to get extensions", data);
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("install extension fails", error);
            deferred.resolve(); // still resolve it
        })
        .always(function() {
            $extOpsView.removeClass("loading");
        });

        return deferred.promise();
    };

    function initInstall() {
        extMap = {};
        enabledExts = {};
        // extensions.html should be autopopulated by the backend
        $("#extension-ops-script").empty(); // Clean up for idempotency
        // change to async call later
        // jquery 3 should not need it
        $.ajaxPrefilter("script", function(options, originalOptions, jqXHR) {
            // only apply when it's loading extension
            if (options.url.indexOf("assets/extensions/") >= 0) {
                options.async = true;
            }
        });
    }

    function loadExtensions(htmlString) {
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
        generateExtList(extList);
        storeExtConfigParams();
        // cannot find these extensions
        extNames.forEach(function(extName) {
            setExtensionState(extName, "installScript", false);
            setExtensionState(extName, "error", ExtTStr.FindExtFail);
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
        .then(function(response, status, xhr) {
            // Success case
            var data = response;
            return uploadPython(pyModName, data);
        },
        function(error, status, xhr) {
            // Fail case
            console.error("Python file not found!");
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

        XcalarUploadPython(pyModName, data)
        .then(function() {
            UDF.storePython(pyModName, data);
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

    ExtensionManager.isExtensionEnabled = function(extName) {
        return enabledExts.hasOwnProperty(extName);
    };

    ExtensionManager.isInstalled = function(extName) {
        for (var extKey in extMap) {
            if (extMap.hasOwnProperty(extKey)) {
                if (extKey.toLowerCase() === "uext" + extName.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    };

    ExtensionManager.getInstallError = function(extName) {
        return (enabledExts[extName].error || ErrTStr.Unknown);
    };

    ExtensionManager.openView = function(colNum, tableId, options) {
        options = options || {};
        if (options.restoreTime && options.restoreTime !== formOpenTime) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return;
        }

        if (colNum != null && tableId != null) {
            var table = gTables[tableId];
            triggerCol = table.getCol(colNum);
            $extTriggerTableDropdown.find(".text").val(table.getName());
        }

        if (options.restoreTime) {
            // mark the restore
            shouldRestore = true;
        }

        var $tab = $("#extensionTab");
        if (!$tab.hasClass("active")) {
            // the click will trigger the openView
            $tab.click();
            return;
        }

        formOpenTime = Date.now();
        if (!shouldRestore) {
            cleanup();
        }
        shouldRestore = false;

        if (!isViewOpen) {
            isViewOpen = true;
            formHelper.setup();
        }
    };

    ExtensionManager.closeView = function() {
        if (!isViewOpen) {
            return;
        }

        isViewOpen = false;
        $lastInputFocused = null;
        triggerCol = null;
        formHelper.clear();
    };

    function cleanup() {
        clearArgs();
        $extTriggerTableDropdown.find(".text").val("");
        hintMenu = [];
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
    ExtensionManager.trigger = function(tableId, module, func, args, options) {
        if (module == null || func == null || module.indexOf("UExt") !== 0) {
            throw "error extension!";
            return;
        }
        options = options || {};

        if (!extMap[module] || !extMap[module].hasOwnProperty(func)) {
            var msg = xcHelper.replaceMsg(ErrTStr.ExtNotFound, {
                module: module,
                fn: func
            });

            Alert.error(StatusMessageTStr.ExtFailed, msg);
            return PromiseHelper.reject(msg);
        }

        var deferred = PromiseHelper.deferred();
        var worksheet;
        var table;
        var tableName;
        var notTableDependent = extMap[module]._configParams.notTableDependent;
        var finalTableId;

        if (!notTableDependent) {
            worksheet = WSManager.getWSFromTable(tableId);
            table = gTables[tableId];
            tableName = table.getName();
        } else {
            worksheet = WSManager.getActiveWS();
            table = {};
            tableName = "";
        }

        var hasStart = false;
        var txId;
        // in case args is changed by ext writer
        var copyArgs = xcHelper.deepCopy(args);
        var srcTableNames = getTablesFromArgs(args, true);
        if (!notTableDependent) {
            srcTableNames.push(tableName);
        }

        var sql = {
            "operation": SQLOps.Ext,
            "tableName": tableName,
            "tableId": tableId,
            "srcTables": srcTableNames,
            "module": module,
            "func": func,
            "args": copyArgs,
            "options": options,
            "worksheet": worksheet,
            "htmlExclude": ["args", "srcTables", "options"]
        };

        // Note Use try catch in case user has come error in extension code
        try {
            var ext = window[module].actionFn(func);

            if (ext == null || !(ext instanceof XcSDK.Extension)) {
                Alert.error(StatusMessageTStr.ExtFailed, ErrTStr.InvalidExt);
                return;
            }

            var buttons = window[module].buttons;
            var extButton = null;
            if (buttons instanceof Array) {
                for (var i = 0, len = buttons.length; i < len; i++) {
                    if (buttons[i].fnName === func) {
                        extButton = buttons[i].arrayOfFields;
                        break;
                    }
                }
            }
            var ids = getTablesFromArgs(args);
            if (!notTableDependent) {
                ids.push(tableId);
            }

            var runBeforeStartRet;

            ext.initialize(tableName, worksheet, args);
            ext.runBeforeStart(extButton)
            .then(function() {
                if (options.closeTab) {
                    // close tab, do this because if new table created,
                    // they don't have the event listener
                    // XXXX should change event listener to pop up
                    $("#extensionTab").click();
                }

                var msg = xcHelper.replaceMsg(StatusMessageTStr.Ext, {
                    "extension": func
                });
                txId = Transaction.start({
                    "msg": msg,
                    "operation": SQLOps.Ext,
                    "track": true,
                    "functionName": func,
                    "sql": sql
                });

                lockTables(ids, txId);

                hasStart = true;
                return ext.run(txId);
            })
            .then(function(ret) {
                runBeforeStartRet = ret;
                return ext.runAfterFinish();
            })
            .then(function(finalTables, finalReplaces) {
                unlockTables(ids);

                sql.newTables = finalTables;
                sql.replace = finalReplaces;

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

                finalTableId = xcHelper.getTableId(finalTableName);
                Transaction.done(txId, {
                    "msgTable": finalTableId,
                    "sql": sql,
                    "noNotification": options.noNotification,
                    "noSql": options.noSql
                });
                return DagFunction.tagNodes(txId, finalTableId);
            })
            .then(function(ret) {
                if (finalTableId != null && ret && ret.tagName) {
                    DagDraw.refreshDagImage(finalTableId, ret.tagName,
                                            ret.tables);
                }

                deferred.resolve(runBeforeStartRet);
            })
            .fail(function(error) {
                if (error == null) {
                    error = ErrTStr.Unknown;
                }

                if (hasStart) {
                    unlockTables(ids);

                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.ExtFailed,
                        "error": error,
                        "sql": sql,
                        "noAlert": true
                    });
                }
                if (!options.noFailAlert) {
                    handleExtensionFail(error, options.formOpenTime);
                }
                deferred.reject(error);
            });
        } catch (error) {
            console.error(error.stack);
            if (hasStart) {
                unlockTables(ids);

                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ExtFailed,
                    "error": error.toLocaleString(),
                    "sql": sql,
                    "noAlert": true
                });
            }
            if (!options.noFailAlert) {
                handleExtensionFail(error.toLocaleString(), options.formOpenTime);
            }
            deferred.reject(error);
        }

        return deferred.promise();
    };

    function handleExtensionFail(error, lastFormOpenTime) {
        Alert.error(StatusMessageTStr.ExtFailed, error, {
            "buttons": [{
                "name": ExtTStr.MODIFY,
                "className": "larger2",
                "func": function() {
                    ExtensionManager.openView(null, null, {
                        "restoreTime": lastFormOpenTime
                    });
                }
            }]
        });
    }

    // fullNames: boolean, if true - returns names, otherwise returns ids
    function getTablesFromArgs(args, fullNames) {
        var tables = [];
        for (var arg in args) {
            var sdkTable = args[arg];
            if (sdkTable instanceof XcSDK.Table) {
                var tableName = sdkTable.getName();
                if (fullNames) {
                    tables.push(tableName);
                } else {
                    var tableId = xcHelper.getTableId(tableName);
                    var table = gTables[tableId];
                    if (table != null && table.isActive()) {
                        tables.push(tableId);
                    }
                }
            }
        }

        return tables;
    }

    function lockTables(ids, txId) {
        ids.forEach(function(tableId) {
            xcHelper.lockTable(tableId, txId);
        });
    }

    function unlockTables(ids) {
        ids.forEach(function(tableId) {
            xcHelper.unlockTable(tableId);
        });
    }

    function addEventListeners() {
        $("#extension-ops-submit").click(function() {
            submitArgs();
        });

        $("#extension-ops-close").click(function() {
            clearArgs();
        });

        new MenuHelper($extTriggerTableDropdown, {
            "onOpen": function() {
                updateTableList(null, true);
            },
            "onSelect": selectTriggerTableDropdown
        }).setupListeners();

        addExtListEventListeners();
        addExtArgsEventListeners();
    }

    function addExtListEventListeners() {
        var $extLists = $extOpsView.find(".extLists");
        var $extArgs = $extOpsView.find(".extArgs");
        $extLists.on("click", ".moduleInfo", function() {
            $(this).closest(".module").toggleClass("active");
        });

        $extLists.on("click", ".func", function() {
            var $func = $(this);
            if ($func.hasClass("selected")) {
                return;
            }

            var fnName = $func.data("name");
            var modName = $func.closest(".module").data("name");
            var fnText = $func.find(".name").text();

            $extLists.find(".func.selected").removeClass("selected");
            $func.addClass("selected");
            if (!$("#workspaceTab").hasClass("active") ||
                !$("#worksheetButton").hasClass("active")) {
                MainMenu.openPanel("workspacePanel", "worksheetButton");
            }

            centerFuncList($func);
            updateArgs(modName, fnName, fnText);
        });

        function centerFuncList($func) {
            if ($extOpsView.hasClass("hasArgs")) {
                return;
            }
            // use setTimeout beacuse $extLists has animiation
            // only when the anim finishes can do the scroll
            setTimeout(function() {
                var top = $func.offset().top;
                // only scroll those that are hidden bte $extArgs
                if (top > $extArgs.offset().top) {
                    top = top - $extLists.offset().top;
                    top = Math.max(0, top);
                    $extLists.scrollTop(top);
                }
            }, 300);
        }
    }

    function addExtArgsEventListeners() {
        var $extArgs = $extOpsView.find(".extArgs");

        var colCallback = function($target) {
            var options = {};
            if (!$lastInputFocused) {
                return;
            }
            if (!$lastInputFocused.hasClass("type-column")) {
                return;
            }
            if ($lastInputFocused.hasClass('multiColumn')) {
                options.append = true;
            }
            xcHelper.fillInputFromCell($target, $lastInputFocused, gColPrefix,
                                        options);
        };
        var headCallback = function($target) {
            if (!$lastInputFocused) {
                return;
            }
            if (!$lastInputFocused.hasClass("type-table") &&
                !$lastInputFocused.hasClass("type-string")) {
                return;
            }
            xcHelper.fillInputFromCell($target, $lastInputFocused, "", {
                "type": "table"
            });
        };
        var columnPicker = {
            "state": "extState",
            "colCallback": colCallback,
            "headCallback": headCallback
        };

        formHelper = new FormHelper($extArgs, {
            "columnPicker": columnPicker
        });
         // focus on table
        $extArgs.on("click", ".focusTable", function() {
            var $icon = $(this);
            var tableName;

            if ($icon.closest(".tableSection").length > 0) {
                // when it's on trigger table dropdown
                tableName = $extTriggerTableDropdown.find("input").val();
            } else {
                tableName = $icon.closest(".field").find(".dropdownInput").val();
            }

            if (tableName !== "") {
                var tableId = xcHelper.getTableId(tableName);
                xcHelper.centerFocusedTable(tableId, true);
            }
        });

        $extArgs.on("keypress", ".argument", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var $hintli = $input.siblings('.hint').find('li.highlighted');
                if ($hintli.length && $hintli.is(":visible")) {
                    $hintli.click();
                    return;
                }

                submitArgs();
            }
        });

        var selector = ".argument.type-column, .argument.type-table, " +
                       ".argument.type-string";
        $extArgs.on("focus", selector, function() {
            $lastInputFocused = $(this);
        });

        // select entire text on double click, if we don't do this, double click
        // won't select the $ sign that preceeds a column name
        $extArgs.on('dblclick', 'input', function() {
            if ($(this).attr("type") !== "number") {
                // number cannot do it
                this.setSelectionRange(0, this.value.length);
            }
        });

        $extArgs.on("click", ".desc.checkboxWrap", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // add more clause
        $extArgs.on("click", ".addClause", function() {
            hideHintDropdown();
            var $field = $(this).closest(".field");
            addClause($field);
        });

        // remove clause
        $extArgs.on("click", ".removeClause", function() {
            hideHintDropdown();
            removeClause($(this).closest(".inputWrap"));
        });
    }

    function setupSuggest() {
        var argumentTimer;
        var $extArgs = $extOpsView.find(".extArgs");

        inputSuggest = new InputSuggest({
            "$container": $extOpsView.find(".extArgs"),
            "onClick": applyColSuggest
        });

        $extArgs.on('keydown', '.hintDropdown input', function(event) {
            inputSuggest.listHighlight(event);
        });

        $extArgs.on("input", ".argument.type-column", function() {
            var $input = $(this);
            clearTimeout(argumentTimer);
            argumentTimer = setTimeout(function() {
                addColSuggest($input);
            }, 200);
        });

        $extArgs.on("focus", ".argument", function() {
            hideHintDropdown();
        });
    }

    function getModuleText(modName) {
        var modText = modName;
        if (modText.startsWith("UExt")) {
            modText = modText.substring(4);
        }
        return modText;
    }

    function generateExtList(exts) {
        var html = "";
        for (var i = 0, len = exts.length; i < len; i++) {
            html += getExtListHTML(exts[i]);
        }

        $extOpsView.find(".extLists").html(html);
        $extOpsView.find(".numExt").text($extOpsView.find(".func").length);
    }

    function getExtListHTML(modName) {
        var funcList = window[modName].buttons || [];
        var modText = getModuleText(modName);
        var html =
            '<li class="module xc-expand-list active" ' +
            'data-name="' + modName + '">' +
                '<div class="moduleInfo no-selection">' +
                    '<span class="expand">' +
                        '<i class="icon xi-arrow-down fa-7"></i>' +
                    '</span>' +
                    '<i class="icon xi-menu-extension fa-15"></i>' +
                    '<span class="name">' +
                        modText +
                    '</span>' +
                '</div>' +
                '<div class="funcLists">';
        extMap[modName] = {};
        for (var i = 0, len = funcList.length; i < len; i++) {
            var func = funcList[i];
            var fnName = func.fnName;
            var funcClass = "xc-action func";
            var arrayOfFields = func.arrayOfFields;
            extMap[modName][fnName] = func;

            if (arrayOfFields == null || arrayOfFields.length === 0) {
                funcClass += " simple";
            }

            html +=
                '<div class="' + funcClass + '" data-name="' + fnName + '">' +
                    '<div class="name">' +
                        func.buttonText +
                    '</div>' +
                    '<div class="action">' +
                        '<i class="icon xi-arrow-right fa-8"></i>' +
                    '</div>' +
                '</div>';
        }

        html += '</div></li>';

        return html;
    }

    function submitArgs() {
        var $extArgs = $extOpsView.find(".extArgs");
        var modName = $extArgs.data("mod");
        var fnName = $extArgs.data("fn");
        var $input = $extTriggerTableDropdown.find(".text");
        var tableName = $input.val();
        var notTableDependent = extMap[modName]._configParams.notTableDependent;

        if (tableName === "" && !notTableDependent) {
            StatusBox.show(ErrTStr.NoEmptyList, $input);
            return;
        }

        var tableId = getTriggerTableId();
        if (!gTables.hasOwnProperty(tableId) && !notTableDependent) {
            StatusBox.show(ErrTStr.TableNotExists, $input);
            return;
        }

        var args = getArgs(modName, fnName, tableId);
        if (args == null) {
            // error message is being handled in getArgs
            return;
        }

        ExtensionManager.trigger(tableId, modName, fnName, args, {
            "formOpenTime": formOpenTime,
            "closeTab": true
        });
    }

    function updateArgs(modName, fnName, fnText) {
        hintMenu = [];
        var animating = false;
        if (!$extOpsView.hasClass("hasArgs")) {
            $extOpsView.addClass("hasArgs");
            animating = true;
        }

        var $extArgs = $extOpsView.find(".extArgs");
        $extArgs.data("mod", modName)
                .data("fn", fnName);

        var modText = getModuleText(modName);
        $extArgs.find(".titleSection .title").text(modText + ": " + fnText);
        var instruction = extMap[modName][fnName].instruction;
        var $instr = $extArgs.find(".instructionSection");
        if (instruction) {
            $instr.text(ExtTStr.Instruction + ": " + instruction).show();
        } else {
            $instr.text("").hide();
        }

        var tableList = updateTableList(modName);
        var args = extMap[modName][fnName].arrayOfFields || [];
        var html = "";
        for (var i = 0, len = args.length; i < len; i++) {
            html += getArgHtml(args[i], tableList);
        }

        var $argSection = $extArgs.find(".argSection");
        $argSection.html(html);
        $argSection.find(".field").each(function(index) {
            // should add one by one or the scroll will not work
            var $list = $(this).find(".dropDownList");
            if ($list.length !== 0) {
                if ($list.hasClass("hintDropdown")) {
                    addHintDropdown($list, index);
                } else if ($list.hasClass("argDropdown")) {
                    if ($list.find(".argument").hasClass("type-table")) {
                        addTableDropdown($list);
                    } else {
                        addArgDropdown($list);
                    }
                }
            }
        });

        $argSection.find(".field").each(function(index) {
            var argInfo = args[index] || {};
            var $field = $(this);
            if (argInfo.fieldClass != null) {
                $field.data("field", argInfo.fieldClass);
            }
            if (argInfo.type === "column" &&
                argInfo.typeCheck &&
                argInfo.typeCheck.tableField)
            {
                $field.data("table", argInfo.typeCheck.tableField);
            }
        });

        $argSection.find("input.aggName").each(function() {
            xcHelper.addAggInputEvents($(this));
        });

        formHelper.refreshTabbing();
        if (animating) {
            setTimeout(function() {
                focusOnAvailableInput($argSection.find('input'));
            }, 300);
        } else {
            focusOnAvailableInput($argSection.find('input'));
        }
    }

    function addHintDropdown($list, index) {
        hintMenu[index] = hintMenu[index] || [];
        var menuHelper = new MenuHelper($list, {
            "container": "#extension-ops .argSection",
            "bounds": "#extension-ops .extArgs"
        });

        hintMenu[index].push(menuHelper);
    }

    function removeHintDropdown(index, subIndex) {
        hintMenu[index].splice(subIndex, 1);
    }

    function hideHintDropdown() {
        hintMenu.forEach(function(menus) {
            if (menus == null) {
                return;
            }
            menus.forEach(function(menuHelper) {
                menuHelper.hideDropdowns();
            });
        });
    }

    function addTableDropdown($list) {
        new MenuHelper($list, {
            "onOpen": function($curList) {
                var tableName = $curList.find("input").val();
                $curList.find('.list ul').html(WSManager.getTableList());
                $curList.find("li").filter(function() {
                    return ($(this).text() === tableName);
                }).addClass("selected");
            },
            "onSelect": function($li) {
                $li.closest(".dropDownList").find("input").val($li.text());
            },
            "container": "#extension-ops .argSection",
            "bounds": "#extension-ops .extArgs"
        }).setupListeners();
    }

    function addArgDropdown($list) {
        new MenuHelper($list, {
            "onSelect": function($li) {
                $li.closest(".dropDownList").find("input").val($li.text());
            },
            "container": "#extension-ops .argSection",
            "bounds": "#extension-ops .extArgs"
        }).setupListeners();
    }

    function updateTableList(modName, refresh) {
        var $extArgs = $extOpsView.find(".extArgs");
        var tableList = WSManager.getTableList();
        $extTriggerTableDropdown.find(".list ul").html(tableList);

        if (!refresh) {
            if (extMap[modName]._configParams.notTableDependent) {
                $extArgs.find(".tableSection").addClass("xc-hidden");
                return "";
            } else {
                $extArgs.find(".tableSection").removeClass("xc-hidden");
            }
            var $input = $extTriggerTableDropdown.find(".text");
            if ($input.val() === "") {
                var focusedTable = xcHelper.getFocusedTable();
                if (focusedTable != null) {
                    var $li = $extTriggerTableDropdown.find("li")
                    .filter(function() {
                        return $(this).data("id") === focusedTable;
                    });

                    selectTriggerTableDropdown($li, true);
                }
            }
        }
        var tableName = $extTriggerTableDropdown.find("input").val();
        $extTriggerTableDropdown.find("li").filter(function() {
            return ($(this).text() === tableName);
        }).addClass("selected");
        return tableList;
    }

    function selectTriggerTableDropdown($li, isSetUp) {
        var tableName = $li.text();
        var $input = $extTriggerTableDropdown.find(".text");

        if ($input.val() !== tableName) {
            // if switch table, then no trigger col
            if (!isSetUp) {
                triggerCol = null;
            }

            $input.val(tableName);
            $li.addClass("selected")
                .siblings().removeClass("selected");

            var tableId = xcHelper.getTableId(tableName);
            var anim = !isSetUp;
            // this animation will mess up focus if true
            // in setup time
            xcHelper.centerFocusedTable(tableId, anim);
        }
    }

    function addClause($field) {
        var $inputWraps = $field.find(".inputWrap");
        var $newWrap = $inputWraps.eq(0).clone();
        var $input = $newWrap.find("input");
        $input.addClass("subArg").val("");
        var icon = '<i class="icon xi-cancel removeClause xc-action"></i>';
        $newWrap.addClass("subInput").append(icon);
        $inputWraps.eq($inputWraps.length - 1).after($newWrap);

        var $list = $newWrap.find(".hintDropdown");
        if ($list.length) {
            addHintDropdown($list, $field.index());
        }
        $input.focus();
        formHelper.refreshTabbing();
    }

    function removeClause($inputWrap) {
        var index = $inputWrap.closest(".field").index();
        var subIndex = getInputSubIndex($inputWrap);
        removeHintDropdown(index, subIndex);
        $inputWrap.remove();
        formHelper.refreshTabbing();
    }

    function getArgHtml(arg, tableList) {
        var inputType = "text";
        var inputVal = "";
        var argType = arg.type;
        var typeCheck = arg.typeCheck || {};
        var inputClass = "argument type-" + argType;
        // for dropdowns
        var isDropdown = false;
        var isCheckbox = false;
        var disabledProp = "disabled";

        var list = "";
        var descIcon = "";
        var placeholder = "";

        if (argType === "table") {
            isDropdown = true;
            descIcon = '<div class="focusTable xc-action">' +
                            '<i class="icon xi-show fa-16"></i>' +
                        '</div>';
            list = tableList;
            disabledProp = "";
        } else if (argType === "boolean") {
            isCheckbox = true;
            inputClass += " checkbox";
            if (arg.autofill === true) {
                inputClass += " checked";
            }
        } else if (argType === "column") {
            if (arg.autofill && triggerCol != null) {
                inputVal = gColPrefix + triggerCol.getFrontColName(true);
            }

            if (typeCheck.multiColumn) {
                inputClass += " multiColumn";
            }
        } else {
            if (argType === "number") {
                inputType = "number";
                if (arg.autofill != null) {
                    inputVal = getAutofillVal(arg.autofill);
                }
            } else if (arg.autofill != null) {
                // when it's string
                inputVal = getAutofillVal(arg.autofill);
            }

            if (typeCheck.newAggName) {
                inputClass += " aggName";
            }

            if (arg.enums != null && arg.enums instanceof Array) {
                isDropdown = true;

                arg.enums.forEach(function(val) {
                    list += '<li>' + val + '</li>';
                });

                if (inputVal !== "" && !arg.enums.includes(inputVal)) {
                    // when has invalid auto value
                    inputVal = "";
                }
            } else {
                var max = typeCheck.max;
                var min = typeCheck.min;
                if (min != null && !isNaN(min)) {
                    placeholder = "range: >=" + min;
                }

                if (max != null && !isNaN(max)) {
                    if (placeholder !== "") {
                        placeholder += ", <=" + max;
                    } else {
                        placeholder = "range: <=" + max;
                    }
                }
            }
        }

        if (typeCheck.allowEmpty) {
            placeholder = placeholder
                         ? placeholder + " (" + CommonTxtTstr.Optional + ")"
                         : CommonTxtTstr.Optional;
        }

        var addClause = "";
        if (arg.variableArg === true) {
            addClause = '<div class="addClause">' +
                            '<button class="btn iconBtn">' +
                                '<i class="icon xi-plus fa-14"></i>' +
                                ExtTStr.AddClause +
                            '</button>' +
                        '</div>';
        }
        inputVal = xcHelper.escapeHTMLSpecialChar(inputVal);
        var html;
        if (isCheckbox) {
            html =
                '<div class="field">' +
                    '<div class="desc checkboxWrap">' +
                        '<div class="' + inputClass + '">' +
                            '<i class="icon xi-ckbox-empty fa-15"></i>' +
                            '<i class="icon xi-ckbox-selected fa-15"></i>' +
                        '</div>' +
                        '<div class="text">' +
                            arg.name +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else if (isDropdown) {
            // generate dropdown
            inputClass += " text dropdownInput";
            html =
                '<div class="field">' +
                    '<div class="desc">' +
                        arg.name +
                        descIcon +
                    '</div>' +
                    '<div class="inputWrap">' +
                        '<div class="dropDownList argDropdown">' +
                            '<input class="' + inputClass +'"' +
                            ' value="' + inputVal + '"' +
                            ' spellcheck="false"' +
                            ' ' + disabledProp + ' type="text">' +
                            '<div class="iconWrapper">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list">' +
                                '<ul>' +
                                    list +
                                '</ul>' +
                                '<div class="scrollArea top">' +
                                  '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                  '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            // generate input
            html =
                '<div class="field">' +
                    '<div class="desc">' +
                        arg.name +
                    '</div>' +
                    '<div class="inputWrap">' +
                        '<div class="dropDownList hintDropdown">' +
                            '<input class="' + inputClass +'"' +
                            ' type="' + inputType + '"' +
                            ' value="' + inputVal + '"' +
                            ' placeholder="' + placeholder + '"' +
                            ' spellcheck="false">' +
                            '<div class="list hint">' +
                                '<ul></ul>' +
                                '<div class="scrollArea top">' +
                                  '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                  '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    addClause +
                '</div>';
        }

        return html;
    }

    function addColSuggest($input) {
        var input = $input.val().trim();
        var $field = $input.closest(".field");
        var index = $field.index();
        var list = getColSuggestList($field, input);
        var subIndex = getInputSubIndex($input);
        var menu = hintMenu[index][subIndex];
        if (menu == null) {
            console.error("cannot find menu");
            return;
        }
        $input.closest(".hintDropdown").find("ul").html(list);
        if (list.length) {
            menu.openList();
        } else {
            menu.hideDropdowns();
        }
    }

    function applyColSuggest($li) {
        var val = gColPrefix + $li.text();
        var $inputWrap = $li.closest(".inputWrap");
        var $field = $inputWrap.closest(".field");
        var index = $field.index();
        var subIndex = getInputSubIndex($inputWrap);
        var menu = hintMenu[index][subIndex];
        if (menu != null) {
            menu.hideDropdowns();
        }
        $inputWrap.find(".argument").val(val);
    }

    function getInputSubIndex($input) {
        // first element in .inputWrap is always .desc
        return $input.closest(".inputWrap").index() - 1;
    }

    function getColSuggestList($field, input) {
        var tableField = $field.data("table");
        var tableId = null;
        if (tableField == null) {
            tableId = getTriggerTableId();
        } else {
            var $fields = $extOpsView.find(".argSection .field");
            var $tableField = $fields.filter(function() {
                return $(this).data("field") === tableField;
            });

            if ($tableField.length) {
                var tableName = $tableField.find(".argument").val();
                tableId = xcHelper.getTableId(tableName);
            }
        }
        if (!gTables.hasOwnProperty(tableId)) {
            return "";
        }

        var colNames = xcHelper.getColNameMap(tableId);
        var lists = getMatchingColNames(input, colNames);
        var html = "";
        lists.forEach(function(li) {
            html += "<li>" + xcHelper.escapeHTMLSpecialChar(li) + "</li>";
        });
        return html;
    }

    function getMatchingColNames(val, colNames) {
        var list = [];
        var seen = {};
        var originalVal = val;

        if (val[0] === gColPrefix) {
            val = val.slice(1);
        }
        val = val.toLowerCase();

        if (val.length) {
            for (var name in colNames) {
                if (name.indexOf(val) !== -1 &&
                    !seen.hasOwnProperty(name)) {
                    seen[name] = true;
                    list.push(colNames[name]);
                }
            }
        }

        if (list.length === 1 && (gColPrefix + list[0] === originalVal)) {
            // do not populate if exact match
            return [];
        }

        // shorter results on top
        list.sort(function(a, b) {
            return a.length - b.length;
        });

        return (list);
    }

    function getAutofillVal(autofill) {
        var val;
        if (typeof autofill === "function") {
            val = autofill();
        } else {
            val = autofill;
        }
        return val;
    }

    function storeExtConfigParams() {
        for (var ext in extMap) {
            if (window[ext].configParams) {
                extMap[ext]._configParams = window[ext].configParams;
            } else {
                extMap[ext]._configParams = {};
            }
        }
    }

    function focusOnAvailableInput($inputs) {
        var $input;
        $inputs.each(function() {
            var $tempInput = $(this);
            if ($tempInput.is(":visible") &&
                $tempInput.val().trim().length === 0) {
                $input = $tempInput;
                return false;
            }
        });
        if (!$input) {
            $input = $inputs.last();
        }

        $input.focus();
        if ($input.attr('type') === "text") {
            $input.caret($input.val().length);// put cursor at the end;
        }
    }

    function clearArgs() {
        $extOpsView.find(".selected").removeClass("selected");
        $extOpsView.removeClass("hasArgs");
        var $extArgs = $extOpsView.find(".extArgs");
        $extArgs.removeData("mod")
                .removeData("fn");
        $extArgs.find(".titleSection .title").text("");
        $extArgs.find(".argSection").html("");
        $extTriggerTableDropdown.find(".text").val("");
    }

    function getTriggerTableId() {
        var tableName = $extTriggerTableDropdown.find(".text").val();
        return xcHelper.getTableId(tableName);
    }

    function getArgs(modName, fnName, extTableId) {
        var args = {};
        var $arguments = $extOpsView.find(".extArgs .argument:not(.subArg)");
        var extFields = extMap[modName][fnName].arrayOfFields;
        var invalidArg = false;

        $arguments.each(function(i) {
            var argInfo = extFields[i];
            // check table type first
            if (argInfo.type === "table") {
                var res = checkTableArg($(this), argInfo);
                if (!res.valid) {
                    invalidArg = true;
                    return false;
                }
                args[argInfo.fieldClass] = res.arg;
            }
        });

        if (invalidArg) {
            return null;
        }
        // check col names
        $arguments.each(function(i) {
            var argInfo = extFields[i];
            if (argInfo.type !== "table") {
                var $input = $(this);
                var res = checkArg(argInfo, $input, extTableId, args);
                if (!res.valid) {
                    invalidArg = true;
                    return false;
                }
                var arg = res.arg;
                var subArgs = checkSubArgs(argInfo, $input, extTableId, args);
                if (subArgs == null) {
                    // error case;
                    invalidArg = true;
                    return false;
                } else if (subArgs.length > 0) {
                    arg = [arg].concat(subArgs);
                }

                args[argInfo.fieldClass] = arg;
            }
        });

        if (invalidArg) {
            return null;
        } else {
            return args;
        }
    }

    function checkTableArg($input, argInfo) {
        var arg = $input.val();
        var typeCheck = argInfo.typeCheck || {};
        if (arg === "") {
            if (typeCheck.allowEmpty) {
                return {
                    "valid": true,
                    "arg": null
                }
            }

            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { "vaild": false };
        }

        var tableId = xcHelper.getTableId(arg);
        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            StatusBox.show(ErrTStr.NoTable, $input);
            return { "vaild": false };
        }

        var worksheet = WSManager.getWSFromTable(tableId);
        var tableArg = new XcSDK.Table(arg, worksheet);

        return ({
            "valid": true,
            "arg": tableArg
        });
    }

    function checkSubArgs(argInfo, $input, extTableId, args) {
        var subArgs = [];
        if (argInfo.variableArg !== true) {
            return subArgs;
        }

        var invalidArg = false;
        $input.closest(".field").find(".subArg").each(function() {
            var res = checkArg(argInfo, $(this), extTableId, args);
            if (!res.valid) {
                invalidArg = true;
                return false;
            }
            subArgs.push(res.arg);
        });

        if (invalidArg) {
            return null;
        }
        return subArgs;
    }

    function checkArg(argInfo, $input, extTableId, args) {
        var arg;
        var argType = argInfo.type;
        var typeCheck = argInfo.typeCheck || {};
        var error;

        if (argType === "boolean") {
            arg = $input.hasClass("checked");
            return {
                "valid": true,
                "arg": arg
            };
        }

        if (argType !== "string") {
            arg = $input.val().trim();
        } else {
            arg = $input.val(); // We cannot trim in this case
        }

        if (typeCheck.allowEmpty && arg.length === 0) {
            if (argType === "string") {
                return ({
                    "valid": true,
                    "arg": arg
                });
            } else {
                return ({
                    "valid": true,
                    "arg": undefined
                });
            }
        }

        if (arg === "") {
            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { "vaild": false };
        } else if (argType === "column") {
            // check in first round
            if (!xcHelper.hasValidColPrefix(arg)) {
                StatusBox.show(ErrTStr.ColInModal, $input);
                return { "vaild": false };
            }

            arg = getColInfo(arg, typeCheck, $input, extTableId, args);
            if (arg == null) {
                return { "vaild": false };
            }
        } else if (argType === "number") {
            arg = Number(arg);

            if (isNaN(arg)) {
                StatusBox.show(ErrTStr.OnlyNumber, $input);
                return { "vaild": false };
            } else if (typeCheck.integer && !Number.isInteger(arg)) {
                StatusBox.show(ErrTStr.OnlyInt, $input);
                return { "vaild": false };
            } else if (typeCheck.min != null &&
                        !isNaN(typeCheck.min) &&
                        arg < typeCheck.min)
            {
                error = xcHelper.replaceMsg(ErrWRepTStr.NoLessNum, {
                    "num": typeCheck.min
                });

                StatusBox.show(error, $input);
                return { "vaild": false };
            } else if (typeCheck.max != null &&
                        !isNaN(typeCheck.max) &&
                        arg > typeCheck.max)
            {
                error = xcHelper.replaceMsg(ErrWRepTStr.NoBiggerNum, {
                    "num": typeCheck.max
                });

                StatusBox.show(error, $input);
                return { "vaild": false };
            }
        } else if (argType === "string") {
            if (typeCheck.newColumnName === true) {
                var tableId = getAssociateTable(args, typeCheck, extTableId);
                if (tableId != null && gTables.hasOwnProperty(tableId)) {
                    var table = gTables[tableId];
                    if (table.hasCol(arg, "")) {
                        error = xcHelper.replaceMsg(ErrWRepTStr.ColConflict, {
                            "name": arg,
                            "table": table.getName()
                        });

                        StatusBox.show(error, $input);
                        return { "vaild": false };
                    }
                }
            } else if (typeCheck.newTableName === true) {
                if (!xcHelper.isValidTableName(arg)) {
                    StatusBox.show(ErrTStr.InvalidTableName, $input);
                    return { "vaild": false };
                }
            } else if (typeCheck.newAggName === true) {
                arg = arg.startsWith(gAggVarPrefix)
                      ? arg.substring(1)
                      : arg;
                if (!xcHelper.isValidTableName(arg)) {
                    StatusBox.show(ErrTStr.InvalidAggName, $input);
                    return { "vaild": false };
                }
                if (Aggregates.getNamedAggs().hasOwnProperty(arg)) {
                    errMsg = xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        "name": arg,
                        "aggPrefix": gAggVarPrefix
                    });
                    StatusBox.show(errMsg, $input);
                    return {"valid": false};
                }
            }
        }

        return {
            "valid": true,
            "arg": arg
        };
    }

    function getColInfo(arg, typeCheck, $input, extTableId, args) {
        arg = arg.replace(/\$/g, '');

        var validType = typeCheck.columnType;
        var tempColNames = arg.split(",");
        var colLen = tempColNames.length;
        var cols = [];
        var error;

        if (!typeCheck.multiColumn && colLen > 1) {
            StatusBox.show(ErrTStr.NoMultiCol, $input);
            return null;
        }

        if (validType != null && !(validType instanceof Array)) {
            validType = [validType];
        }

        for (var i = 0, len = colLen; i < len; i++) {
            var shouldCheck = true;
            var tableId = getAssociateTable(args, typeCheck, extTableId);
            if (tableId == null) {
                // invalid table filed, not checking
                shouldCheck = false;
            }

            if (!gTables.hasOwnProperty(tableId)) {
                // invalid table, not checking
                // Note: this can allow the skip of col checking if
                // specify tableFiled to be empty string
                shouldCheck = false;
            }

            var colName = tempColNames[i].trim();
            if (shouldCheck) {
                var table = gTables[tableId];
                var progCol = table.getColByFrontName(colName);
                if (progCol != null) {
                    var colType = progCol.getType();
                    var type = colType;
                    if (progCol.isNumberCol()) {
                        type = "number";
                    }

                    if (validType != null && validType.indexOf(type) < 0) {
                        error = ErrWRepTStr.InvalidOpsType;
                        error = xcHelper.replaceMsg(error, {
                            "type1": validType.join(","),
                            "type2": type
                        });
                        StatusBox.show(error, $input);
                        return null;
                    }

                    var backColName = progCol.getBackColName();
                    cols.push(new XcSDK.Column(backColName, colType));
                } else {
                    error = xcHelper.replaceMsg(ErrWRepTStr.InvalidColOnTable, {
                        "col": colName,
                        "table": table.getName()
                    });
                    StatusBox.show(error, $input);
                    return null;
                }
            } else {
                // when not do any checking
                cols.push(new XcSDK.Column(colName));
            }
        }

        if (typeCheck.multiColumn) {
            return cols;
        } else {
            return cols[0];
        }
    }

    function getAssociateTable(args, typeCheck, extTableId) {
        var tableId = null;
        if (typeCheck.tableField != null) {
            var tableArg = args[typeCheck.tableField];
            if (tableArg != null) {
                tableId = xcHelper.getTableId(tableArg.getName());
            } else {
                // invalid table filed
                tableId = null;
            }
        } else {
            // if not specify table id, then use extTableId
            tableId = extTableId;
        }

        return tableId;
    }

    return (ExtensionManager);
}({}, jQuery));
