window.ExtensionManager = (function(ExtensionManager, $) {
    
    var extMap = {};
    var extFileNames = [];
    var numChecksLeft = 0;
    var triggerCol;

    // for the opsView
    var $extOpsView;              // $("#extension-ops");
    var $extTriggerTableDropdown; //$("#extension-ops-mainTable");
    var isViewOpen = false;
    var $lastInputFocused;

    function setupPart4() {
        var extList = [];
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
        
        extList.sort();
        generateExtList(extList);
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
        $extOpsView = $("#extension-ops");
        $extTriggerTableDropdown = $("#extension-ops-mainTable");

        setupView();
        // extensions.html should be autopopulated by the backend
        $("#extension-ops-script").empty(); // Clean up for idempotency
        // XXX change to async call later
        $("#extension-ops-script").load("assets/extensions/extensions.html",
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

    ExtensionManager.openView = function(colNum, tableId) {
        if (colNum != null && tableId != null) {
            var table = gTables[tableId];
            var progCol = gTables[tableId].getCol(colNum);
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
            $("#container").addClass("columnPicker extState");
            columnPickers();
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
        $("#container").removeClass("columnPicker extState");
        $(".xcTable").off("click.columnPicker")
                    .closest(".xcTableWrap").removeClass("columnPicker");

        $('.xcTheadWrap').off("click.columnPicker");
    };

    ExtensionManager.trigger = function(tableId, modName, funcName, argList) {
        var deferred = jQuery.Deferred();

        if (modName == null || funcName == null || modName.indexOf("UExt") !== 0) {
            throw "error extension!";
            return;
        }

        if (modName !== "UExtATags" && modName !== "UExtGLM" &&
            modName !== "UExtIntel" && modName !== "UExtKMeans") {
            var worksheet = WSManager.getWSFromTable(tableId);
            var table = gTables[tableId];
            var tableName = table.getName();

            var hasStart = false;
            var txId;
            // in case argList is changed by ext writer
            var copyArgList = xcHelper.deepCopy(argList);
            var sql = {
                "operation"  : SQLOps.Ext,
                "tableName"  : tableName,
                "tableId"    : tableId,
                "modName"    : modName,
                "funcName"   : funcName,
                "argList"    : copyArgList,
                "htmlExclude": ["argList"]
            };

            // Note Use try catch in case user has come error in extension code
            try {
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
                var runBeforeStartRet;

                ext.initialize(tableName, worksheet, argList);
                ext.runBeforeStart(extButton)
                .then(function() {
                    xcHelper.lockTable(tableId);

                    var msg = xcHelper.replaceMsg(StatusMessageTStr.Ext, {
                        "extension": funcName
                    });
                    txId = Transaction.start({
                        "msg"         : msg,
                        "operation"   : SQLOps.Ext,
                        "steps"       : -1,
                        "functionName": funcName
                    });

                    hasStart = true;
                    return ext.run(txId);
                })
                .then(function(ret) {
                    runBeforeStartRet = ret;
                    return ext.runAfterFinish();
                })
                .then(function(finalTables, finalReplaces) {

                    xcHelper.unlockTable(tableId);

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
                        "sql"     : sql
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
                            "error"  : error,
                            "sql"    : sql
                        });
                    } else {
                        Alert.error(StatusMessageTStr.ExtFailed, error);
                    }
                    deferred.reject(error);
                });
            } catch (error) {
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
        var copyArgList = xcHelper.deepCopy(argList);
        var sql = {
            "operation"  : SQLOps.Ext,
            "tableName"  : table.getName(),
            "tableId"    : tableId,
            "modName"    : modName,
            "funcName"   : funcName,
            "argList"    : copyArgList,
            "htmlExclude": ["argList"]
        };

        xcHelper.lockTable(tableId);

        var msg = xcHelper.replaceMsg(StatusMessageTStr.Ext, {
            "extension": funcName
        });
        var txId = Transaction.start({
            "msg"         : msg,
            "operation"   : SQLOps.Ext,
            "steps"       : -1,
            "functionName": funcName
        });

        try {
            window[modName].actionFn(txId, tableId, funcName, argList)
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

    function setupView() {
        var $extLists = $extOpsView.find(".extLists");
        var $extArgs = $extOpsView.find(".extArgs");

        $extLists.on("click", ".moduleInfo", function() {
            $(this).closest(".module").toggleClass("active");
        });

        $extLists.on("click", ".func .action", function() {
            var $func = $(this).closest(".func");
            if ($func.hasClass("selected")) {
                return;
            }

            if (!$("#workspacePanel").hasClass("active")) {
                // need to switch to worspace tab if not
                $("#workspaceTab").click();
            }

            var fnName = $func.data("name");
            var modName = $func.closest(".module").data("name");

            $extLists.find(".func.selected").removeClass("selected");
            $func.addClass("selected");
            updateArgs(modName, fnName);
        });

        $("#extension-ops-close").click(function() {
            clearArgs();
        });

        new MenuHelper($extTriggerTableDropdown, {
            "onSelect": function($li) {
                var tableName = $li.text();
                var $input = $extTriggerTableDropdown.find(".text");

                if ($input.val() !== tableName) {
                    // if switch table, then no trigger col
                    triggerCol = null;
                    $input.val(tableName);
                    $li.addClass("selected")
                        .siblings().removeClass("selected");
                    var tableId = xcHelper.getTableId(tableName);
                    focusTable(tableId);
                }
            }
        }).setupListeners();

        $("#extension-ops-submit").click(function() {
            submitArgs();
        });

        $extArgs.on("focus", ".argument.type-column", function() {
            $lastInputFocused = $(this);
        });
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
        var modText = modName;
        if (modText.startsWith("UExt")) {
            modText = modText.substring(4);
        }
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
            var funcClass = "func";
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
                    '<div class="action xc-action">' +
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
        
        if (tableName === "") {
            StatusBox.show(ErrTStr.NoEmptyList, $input);
            return;
        }

        var tableId = xcHelper.getTableId(tableName);

        var argList = getArgList(modName, fnName, tableId);
        if (argList == null) {
            // error message is being handled in getArgList
            return;
        }

        ExtensionManager.trigger(tableId, modName, fnName, argList);
        // close tab, do this because if new table created, they don't have the
        // event listener
        // XXXX should change event listerer to pop up
        $("#extensionTab").click();
    }

    function updateArgs(modName, fnName) {
        $extOpsView.addClass("hasArgs");
        var $extArgs = $extOpsView.find(".extArgs");

        $extArgs.data("mod", modName)
                .data("fn", fnName);
        $extArgs.find(".titleSection .title").text(modName + ": " + fnName);

        var tableList = xcHelper.getWSTableList();
        $extTriggerTableDropdown.find(".list ul").html(tableList);

        var $input = $extTriggerTableDropdown.find(".text");
        if ($input.val() === "") {
            var focusedTable = xcHelper.getFocusedTable();
            if (focusedTable != null) {
                $extTriggerTableDropdown.find("li").filter(function() {
                    return $(this).data("id") === focusedTable;
                }).click();
            }
        }

        var args = extMap[modName][fnName] || [];
   
        var html = "";
        for (var i = 0, len = args.length; i < len; i++) {
            var inputType = "text";
            var inputVal = "";
            var inputHint = "";
            var argType = args[i].type;

            if (argType === "boolean") {
                html +=
                    '<div class="field">' +
                        '<div class="desc">' +
                            args[i].name +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<div class="dropDownList argDropdown">' +
                                '<input class="argument type-boolean text" disabled>' +
                                '<div class="iconWrapper">' +
                                    '<i class="icon"></i>' +
                                '</div>' +
                                '<div class="list">' +
                                    '<ul>' +
                                        '<li>true</li>' +
                                        '<li>false</li>' +
                                    '</ul>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                continue;
            }

            if (argType === "number") {
                inputType = "number";
            } else {
                if (argType === "column") {
                    if (args[i].autofill && triggerCol != null) {
                        inputVal = gColPrefix + triggerCol.getFronColName();
                    }
                } else {
                    if (args[i].autofill != null) {
                        inputVal = args[i].autofill;
                    }
                }
            }

            html +=
                '<div class="field">' +
                    '<div class="desc">' +
                        args[i].name +
                    '</div>' +
                    '<div class="inputWrap">' +
                        '<input class="argument type-' + argType + '"' +
                        ' type="' + inputType + '"' +
                        ' value="' + inputVal + '"' +
                        ' placeholder="' + inputHint + '"' +
                        ' spellcheck="false">' +
                        '<div class="picker">' +
                            '<i class="icon fa-13 xi-select-column"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        var $argSection = $extArgs.find(".argSection");
        $argSection.html(html);

        new MenuHelper($argSection.find(".dropDownList"), {
            "onSelect": function($li) {
                $li.closest(".dropDownList").find("input").val($li.text());
            }
        }).setupListeners();

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

    function getArgList(modName, fnName, tableId) {
        var argList = {};
        var $arguments = $extOpsView.find(".extArgs .argument");
        var args = extMap[modName][fnName];
        var invalidArg = false;

        $arguments.each(function(i) {
            var argInfo = args[i];
            var res = checkArg(argInfo, $(this), tableId);
            if (!res.valid) {
                invalidArg = true;
                return false;
            }
            argList[argInfo.fieldClass] = res.arg;
        });

        if (invalidArg) {
            return null;
        } else {
            return argList;
        }
    }

    function checkArg(argInfo, $input, tableId) {
        var arg;
        var argType = argInfo.type;
        var typeCheck = argInfo.typeCheck || {};
        var error;

        if (argType !== "string") {
            arg = $input.val().trim();
        } else {
            arg = $input.val(); // We cannot trim in this case
        }

        if (typeCheck.allowEmpty) {
            if (argType === "string") {
                return ({
                    "valid": true,
                    "arg"  : arg
                });
            } else {
                if (arg.length === 0) {
                    return ({
                        "valid": true,
                        "arg"  : undefined
                    });
                }
            }
        }

        if (arg === "") {
            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { "vaild": false };
        }

        if (argType === "column") {
            if (!xcHelper.hasValidColPrefix(arg)) {
                StatusBox.show(ErrTStr.ColInModal, $input);
                return { "vaild": false };
            }

            arg = getColInfo(arg, typeCheck.columnType, $input, tableId);
            if (arg == null) {
                return { "vaild": false };
            } else if (!typeCheck.multiColumn &&
                        arg instanceof Array &&
                        arg.length > 0) {
                StatusBox.show(ErrTStr.NoMultiCol, $input);
                return { "vaild": false };
            }

            if (typeCheck.multiColumn && !(arg instanceof Array)) {
                // if set multiColumn to be true, then always return array
                arg = [arg];
            }
        } else if (argType === "number") {
            arg = Number(arg);

            if (isNaN(arg)) {
                StatusBox.show(ErrTStr.OnlyNumber, $input);
                return { "vaild": false };
            } else if (typeCheck.integer && !Number.isInteger(arg)) {
                StatusBox.show(ErrTStr.OnlyInt, $input);
                return { "vaild": false };
            } else if (typeCheck.min != null && arg < typeCheck.min) {
                error = xcHelper.replaceMsg(ErrWRepTStr.NoLessNum, {
                    "num": typeCheck.min
                });

                StatusBox.show(error, $input);
                return { "vaild": false };
            } else if (typeCheck.max != null && arg > typeCheck.max) {
                error = xcHelper.replaceMsg(ErrWRepTStr.NoBiggerNum, {
                    "num": typeCheck.max
                });

                StatusBox.show(error, $input);
                return { "vaild": false };
            }
        } else if (argType === "boolean") {
            if (arg.toLowerCase() === "true") {
                arg = true;
            } else if (arg.toLowerCase() === "false") {
                arg = false;
            } else {
                StatusBox.show(ErrTStr.NoEmptyList, $input);
                return { "vaild": false };
            }
        }

        return {
            "valid": true,
            "arg"  : arg
        };
    }

    function getColInfo(arg, validType, $input, exTableId) {
        arg = arg.replace(/\$/g, '');
        var tempColNames = arg.split(",");
        // var backColNames = "";
        var table = gTables[exTableId];
        var cols = [];
        var error;

        if (validType != null && !(validType instanceof Array)) {
            validType = [validType];
        }

        for (var i = 0, len = tempColNames.length; i < len; i++) {
            var progCol = table.getColByFrontName(tempColNames[i].trim());
            if (progCol != null) {
                var colType = progCol.getType();
                var type = colType;
                if (colType === "integer" || colType === "float") {
                    type = "number";
                }

                if (validType != null && validType.indexOf(type) < 0) {
                    error = xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                        "type1": validType.join(","),
                        "type2": type
                    });
                    StatusBox.show(error, $input);
                    return null;
                }

                var backColName = progCol.getBackColName();
                cols.push(new XcSDK.Column(backColName, colType));
            } else {
                error = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": tempColNames[i]
                });
                StatusBox.show(error, $input);
                return null;
            }
        }

        if (cols.length === 1) {
            return cols[0];
        } else {
            return cols;
        }
    }

    function columnPickers() {
        $(".xcTableWrap").addClass('columnPicker');
        var $tables = $(".xcTable");

        $tables.on('click.columnPicker', '.header, td.clickable', function(event) {
            if (!$lastInputFocused) {
                return;
            }
            var $target = $(event.target);
            if ($target.closest('.dataCol').length ||
                $target.closest('.jsonElement').length ||
                $target.closest('.dropdownBox').length) {
                return;
            }
            xcHelper.fillInputFromCell($target, $lastInputFocused, gColPrefix);
        });

        $(".xcTheadWrap").on("click.columnPicker", function(event) {
            if (!$lastInputFocused) {
                return;
            }
            var $target = $(event.target).closest('.xcTheadWrap');
            xcHelper.fillInputFromCell($target, $lastInputFocused, "", "table")
        });
    }


    return (ExtensionManager);
}({}, jQuery));
