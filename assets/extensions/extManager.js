window.ExtensionManager = (function(ExtensionManager, $) {
    var extMap = {};
    var extFileNames = [];
    var triggerCol;

    // for the opsView
    var $extOpsView;              // $("#extension-ops");
    var $extTriggerTableDropdown; //$("#extension-ops-mainTable");
    var isViewOpen = false;
    var $lastInputFocused;
    var formHelper;

    function removeExt(extName) {
        for (var i = 0; i < extFileNames.length; i++) {
            if (extFileNames[i] === extName) {
                extFileNames.splice(i, 1);
                return true;
            }
        }
        // Already been removed.
        return false;
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

    function loadAndStorePython(extName) {
        var pyModName = extName.substring(0, extName.length - 4);
        var innerDef = jQuery.Deferred();
        var data;
        jQuery.ajax({
            type: "GET",
            url: "assets/extensions/installed/" + extName + ".py"
        })
        .then(function(response, status, xhr) {
            // Success case
            data = response;
            // Returns a promise
            return XcalarUploadPython(pyModName, data);
        },
        function(error, status, xhr) {
            // Fail case
            console.error("Python file not found!");
        })
        .then(function() {
            UDF.storePython(pyModName, data);
            innerDef.resolve();
        })
        .fail(function() {
            console.error("Extension failed to upload. Removing: "
                          + extName);
            // Remove extension from list
            removeExt(extName);
            innerDef.reject();
        });
        return (innerDef.promise());
    }

    function setupPart2() {
        var deferred = jQuery.Deferred();
        // check that python modules have been uploaded
        var extLoaded = $("#extension-ops-script script");
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
        // if python module is gone, reupload by reading file from local system
        extPromises = [];
        for (var i = 0; i < pythonReuploadList.length; i++) {
            var extName = pythonReuploadList[i];
            extPromises.push(loadAndStorePython(extName));
        }
        PromiseHelper.when.apply(this, extPromises)
        // This case happens even if extPromises is empty.
        .always(function(resultPromises) {
            var extList = [];
            // get list of extensions currently loaded into system
            for (var objs in window) {
                if (objs.indexOf("UExt") === 0 ) {
                    for (var i = 0; i < extFileNames.length; i++) {
                        if (objs.toLowerCase().substring(4, objs.length) +
                            ".ext" === extFileNames[i].toLowerCase()) {
                            // Found it!
                            extList.push(objs);
                            break;
                        }
                    }
                }
            }

            extList.sort();
            generateExtList(extList);
            storeExtConfigParams();
            // Always resolve so don't crash setup if extensions fail.
            deferred.resolve();
        });

        return (deferred.promise());
    }

    ExtensionManager.setup = function() {
        var deferred = jQuery.Deferred();
        $extOpsView = $("#extension-ops");
        $extTriggerTableDropdown = $("#extension-ops-mainTable");

        setupView();
        // extensions.html should be autopopulated by the backend
        $("#extension-ops-script").empty(); // Clean up for idempotency
        // change to async call later
        // jquery 3 should not need it
        $.ajaxPrefilter("script", function( options, originalOptions, jqXHR ) {
            // only apply when it's loading extension
            if (options.url.indexOf("assets/extensions/") >= 0) {
                options.async = true;
            }
        });

        $("#extension-ops-script").load("assets/extensions/extensions.html",
        undefined, function(response, status, xhr) {
            setupPart2(response, status, xhr)
            .then(deferred.resolve)
            .fail(deferred.reject);
        });

        return (deferred.promise());
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

    ExtensionManager.openView = function(colNum, tableId) {
        if (colNum != null && tableId != null) {
            var table = gTables[tableId];
            triggerCol = table.getCol(colNum);
            $extTriggerTableDropdown.find(".text").val(table.getName());
        }

        var $tab = $("#extensionTab");
        if (!$tab.hasClass("active")) {
            // the click will trigger the openView
            $tab.click();
            return;
        }

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
        clearArgs();
        $lastInputFocused = null;
        triggerCol = null;
        $extTriggerTableDropdown.find(".text").val("");
        formHelper.clear();
    };

    /*
    options: {
        noNotification: boolean, to hide success message pop up
        noSql: boolean, if set true, not add to sql log,
        closeTab: boolean, if true, close view when pass before run check
    }
     */
    ExtensionManager.trigger = function(tableId, module, func, args, options) {
        if (module == null || func == null || module.indexOf("UExt") !== 0) {
            throw "error extension!";
            return;
        }

        options = options || {};

        var deferred = jQuery.Deferred();
        var worksheet;
        var table;
        var tableName;

        if (!extMap[module]._configParams.notTableDependent) {
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
        var sql = {
            "operation": SQLOps.Ext,
            "tableName": tableName,
            "tableId": tableId,
            "module": module,
            "func": func,
            "args": copyArgs,
            "options": options,
            "worksheet": worksheet,
            "htmlExclude": ["args", "options"]
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
                    "steps": -1,
                    "functionName": func
                });

                if (!extMap[module]._configParams.notTableDependent) {
                    xcHelper.lockTable(tableId, txId);
                }

                hasStart = true;
                return ext.run(txId);
            })
            .then(function(ret) {
                runBeforeStartRet = ret;
                return ext.runAfterFinish();
            })
            .then(function(finalTables, finalReplaces) {
                if (!extMap[module]._configParams.notTableDependent) {
                    xcHelper.unlockTable(tableId);
                }

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

                Transaction.done(txId, {
                    "msgTable": xcHelper.getTableId(finalTableName),
                    "sql": sql,
                    "noNotification": options.noNotification,
                    "noSql": options.noSql
                });
                deferred.resolve(runBeforeStartRet);
            })
            .fail(function(error) {
                if (error == null) {
                    error = ErrTStr.Unknown;
                }

                if (hasStart) {
                    xcHelper.unlockTable(tableId);

                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.ExtFailed,
                        "error": error,
                        "sql": sql
                    });
                } else {
                    Alert.error(StatusMessageTStr.ExtFailed, error);
                }
                deferred.reject(error);
            });
        } catch (error) {
            console.error(error.stack);
            if (hasStart) {
                xcHelper.unlockTable(tableId);

                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ExtFailed,
                    "error": error.toLocaleString(),
                    "sql": sql
                });
            } else {
                Alert.error(StatusMessageTStr.ExtFailed, error.toLocaleString());
            }
            deferred.reject(error);
        }

        return deferred.promise();
    };

    function setupView() {
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
            if (!$('#workspaceTab').hasClass('active')) {
                MainMenu.openPanel('workspacePanel');
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

        $("#extension-ops-close").click(function() {
            clearArgs();
        });

        new MenuHelper($extTriggerTableDropdown, {
            "onOpen": function() {
                updateTableList(null, true);
            },
            "onSelect": selectTriggerTableDropdown
        }).setupListeners();

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

        $("#extension-ops-submit").click(function() {
            submitArgs();
        });

        $extArgs.on("keypress", ".argument", function(event) {
            if (event.which === keyCode.Enter) {
                submitArgs();
            }
        });

        $extArgs.on("focus", ".argument.type-column", function() {
            $lastInputFocused = $(this);
        });

        $extArgs.on("click", ".picker", function() {
            $(this).siblings("input").focus();
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

        var colCallback = function($target) {
            var options = {};
            if (!$lastInputFocused) {
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

            if (arrayOfFields == null || arrayOfFields.length === 0) {
                funcClass += " simple";
            } else {
                // cache arryOfField
                extMap[modName][fnName] = func.arrayOfFields;
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

        var tableId = xcHelper.getTableId(tableName);
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
            "closeTab": true
        });
    }

    function updateArgs(modName, fnName, fnText) {
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

        var tableList = updateTableList(modName);

        var args = extMap[modName][fnName] || [];
        var html = "";
        for (var i = 0, len = args.length; i < len; i++) {
            html += getArgHtml(args[i], tableList);
        }

        var $argSection = $extArgs.find(".argSection");
        $argSection.html(html);
        $argSection.find(".dropDownList").each(function() {
            var $list = $(this);
            // should add one by one or the scroll will not work
            new MenuHelper($list, {
                "onOpen": function($curList) {
                    if ($curList.find('.argument.type-table').length) {
                        $curList.find('.list ul')
                        .html(WSManager.getTableList());
                    }
                },
                "onSelect": function($li) {
                    $li.closest(".dropDownList").find("input").val($li.text());
                },
                "container": "#extension-ops .argSection",
                "bounds": "#extension-ops .argSection"
            }).setupListeners();
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

        return tableList;
    }

    function selectTriggerTableDropdown($li, noAnim) {
        var tableName = $li.text();
        var $input = $extTriggerTableDropdown.find(".text");

        if ($input.val() !== tableName) {
            // if switch table, then no trigger col
            triggerCol = null;
            $input.val(tableName);
            $li.addClass("selected")
                .siblings().removeClass("selected");

            var tableId = xcHelper.getTableId(tableName);
            var anim = !noAnim;
            // this animation will mess up focus if true
            // in setup time
            xcHelper.centerFocusedTable(tableId, anim);
        }
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

        var list = "";
        var descIcon = "";
        var placeholder = "";

        if (argType === "table") {
            isDropdown = true;
            descIcon = '<div class="focusTable xc-action">' +
                            '<i class="icon xi-show fa-16"></i>' +
                        '</div>';
            list = tableList;
        } else if (argType === "boolean") {
            isCheckbox = true;
            inputClass += " checkbox";
            if (arg.autofill === true ) {
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
                            ' disabled>' +
                            '<div class="iconWrapper">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list">' +
                                '<ul>' +
                                    list +
                                '</ul>' +
                                '<div class="scrollArea top">' +
                                    '<div class="arrow"></div>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                    '<div class="arrow"></div>' +
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
                        '<input class="' + inputClass +'"' +
                        ' type="' + inputType + '"' +
                        ' value="' + inputVal + '"' +
                        ' placeholder="' + placeholder + '"' +
                        ' spellcheck="false">' +
                        '<div class="picker xc-action">' +
                            '<i class="icon fa-13 xi_select-column"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        return html;
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
            $input.caret(-1);// put cursor at the end;
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

    function getArgs(modName, fnName, extTableId) {
        var args = {};
        var $arguments = $extOpsView.find(".extArgs .argument");
        var extFields = extMap[modName][fnName];
        var invalidArg = false;

        $arguments.each(function(i) {
            var argInfo = extFields[i];
            // check table type first
            if (argInfo.type === "table") {
                var res = checkTableArg($(this));
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
                var res = checkArg(argInfo, $(this), extTableId, args);
                if (!res.valid) {
                    invalidArg = true;
                    return false;
                }
                args[argInfo.fieldClass] = res.arg;
            }
        });

        if (invalidArg) {
            return null;
        } else {
            return args;
        }
    }

    function checkTableArg($input) {
        var arg = $input.val();
        if (arg === "") {
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

        if (typeCheck.allowEmpty) {
            if (argType === "string") {
                return ({
                    "valid": true,
                    "arg": arg
                });
            } else {
                if (arg.length === 0) {
                    return ({
                        "valid": true,
                        "arg": undefined
                    });
                }
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
            if (typeCheck.newColumnName) {
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
