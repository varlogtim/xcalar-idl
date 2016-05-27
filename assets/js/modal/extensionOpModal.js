window.ExtensionOpModal = (function(ExtensionOpModal, $) {
    var $extModal; // $("#extensionOpModal");
    var modalHelper;
    var exModName;
    var exFnName;
    var exColNum;
    var exTableId;
    var extensionMap = {};

    // constant
    var minHeight = 200;
    var minWidth = 305;
    var maxWidth = 1000;
    var $lastInputFocused;

    ExtensionOpModal.setup = function() {
        $extModal = $("#extensionOpModal");

        modalHelper = new ModalHelper($extModal, {
            "minHeight": minHeight,
            "minWidth" : minWidth,
            "noResize" : true,
            "noCenter" : true
        });

        $extModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $extModal.resizable({
            "handles"    : "e, w",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $extModal.on("click", ".close, .cancel", function() {
            closeExtModal();
        });

        $extModal.on("click", ".confirm", function() {
            submitForm();
        });

        addListeners();

    };

    function addListeners() {
        $extModal.on('focus', 'input', function() {
            $lastInputFocused = $(this);
        });

        $extModal.on("keypress", ".argument", function() {
            if (event.which === keyCode.Enter &&
                    !modalHelper.checkBtnFocus())
            {
                $(this).blur();
                submitForm();
            }
        });
    }

    ExtensionOpModal.show = function(colNum, tableId, modName, fnName, title) {
        exColNum = colNum;
        exTableId = tableId;
        exModName = modName;
        exFnName = fnName;

        $extModal.find('.modalHeader').find('.text').text(title);
        updateInputFields();
        modalHelper.setup({
            "open": function() {
                if (gMinModeOn) {
                    $extModal.show();
                    modalHelper.toggleBG(tableId, false, {"time": 0});
                } else {
                    $extModal.fadeIn(300);
                    modalHelper.toggleBG(tableId, false, {"time": 300});
                }
            }
        });

        setModalWidth();
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');

        // focus on first unfilled input
        var $firstInput = $extModal.find('input').filter(function() {
            return ($(this).val() === "");
        }).eq(0);

        if (!$firstInput.length) {
            $firstInput = $extModal.find('input').eq(0);
        }
        $firstInput.focus();

        $lastInputFocused = $firstInput;

        $('#xcTable-' + tableId).on('click.columnPicker', '.header, td.clickable', function(event) {
            var $target = $(event.target);
            xcHelper.fillInputFromCell($target, $lastInputFocused, "$");
        });
        $('#xcTable-' + tableId).on('mousedown', '.header, td.clickable', keepInputFocused);
    };

    ExtensionOpModal.addButton = function(modName, fnName, arrayOfFields) {
        if (!extensionMap.hasOwnProperty(modName)) {
            extensionMap[modName] = {};
        }
        extensionMap[modName][fnName] = arrayOfFields;
    };

    ExtensionOpModal.getAllButtons = function() {
        return (extensionMap);
    };

    function keepInputFocused(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function submitForm() {
        var argList = getArgList();
        if (!argList) {
            // error message is being handled in getArgList
            return;
        }

        // do type check here!!!
        // if fail, keep modal open to show fail error message next to input

        closeExtModal();
        ExtensionManager.trigger(exColNum, exTableId,
                                 exModName + "::" + exFnName, argList);
    }

    function getArgList() {
        var argList = {};
        var $arguments = $extModal.find(".argument");
        var args = extensionMap[exModName][exFnName];
        var invalidArg = false;

        $arguments.each(function(i) {
            var argInfo = args[i];
            var res = checkArg(argInfo, $(this));
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

    function checkArg(argInfo, $input) {
        var arg = $input.val().trim();
        var argType = argInfo.type;
        var typeCheck = argInfo.typeCheck || {};
        var error;

        if (arg === "" && !typeCheck.allowEmpty) {
            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { "vaild": false };
        }

        if (argType === "column") {
            if (!xcHelper.hasValidColPrefix(arg, "$")) {
                StatusBox.show(ErrTStr.ColInModal, $input);
                return { "vaild": false };
            }

            arg = getBackColName(arg, typeCheck.columnType, $input);
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
        }

        return {
            "valid": true,
            "arg"  : arg
        };
    }

    function getBackColName(arg, validType, $input) {
        arg = arg.replace(/\$/g, '');
        var tempColNames = arg.split(",");
        var backColNames = "";
        var table = gTables[exTableId];
        var error;

        if (validType != null && !(validType instanceof Array)) {
            validType = [validType];
        }

        for (var i = 0; i < tempColNames.length; i++) {
            var progCol = table.getProgColFromFrontColName(tempColNames[i].trim());
            if (progCol != null) {
                var colType = progCol.getType();
                if (colType === "integer" || colType === "float") {
                    colType = "number";
                }

                if (validType != null && validType.indexOf(colType) < 0) {
                    error = xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                        "type1": validType.join(","),
                        "type2": colType
                    });
                    StatusBox.show(error, $input);
                    return null;
                }

                var backColName = progCol.getBackColName();
                if (i > 0) {
                    backColNames += ",";
                }
                backColNames += backColName;
            } else {
                error = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": tempColNames[i]
                });
                StatusBox.show(error, $input);
                return null;
            }
        }

        return backColNames;
    }

    function closeExtModal() {
        modalHelper.clear({"close": function() {
            // ops modal has its owne closer
            var time = 1;
            $extModal.fadeOut(time);
            modalHelper.toggleBG(exTableId, true, {"time": time});
        }});

        $('#xcTable-' + exTableId).off('click.columnPicker');
        $('#xcTable-' + exTableId).off('mousedown', '.header, td.clickable',
                                        keepInputFocused);
        $('#xcTable-' + exTableId).find('.col' + exColNum)
                                  .removeClass('modalHighlighted');
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    }

    function updateInputFields() {
        var $argSection = $extModal.find('.argSection');
        var args = extensionMap[exModName][exFnName];
        // var inputFieldHtml = "";
        var descsHtml = "";
        var argsHtml = "";
        var allNumbers = true;
        var hasColumnArg = false;
        var triggerCol = gTables[exTableId].tableCols[exColNum - 1].getFronColName();

        for (var i = 0; i < args.length; i++) {
            var inputType = "text";
            var inputVal = "";
            var inputHint = "";
            var argType = args[i].type;

            if (argType === "number") {
                inputType = "number";
            } else {
                allNumbers = false;

                if (argType === "column") {
                    hasColumnArg = true;
                    if (args[i].autofill) {
                        inputVal = "$" + triggerCol;
                    }
                } else {
                    if (args[i].autofill != null) {
                        inputVal = args[i].autofill;
                    }
                }
            }

            descsHtml += '<div class="cell type-' + argType + '">' +
                            args[i].name + ':' +
                        '</div>';
            argsHtml += '<div class="cell type-' + argType + '">' +
                            '<div class="inputWrap">' +
                                '<input class="argument" ' +
                                'type="' + inputType + '" ' +
                                'value="' + inputVal + '" ' +
                                'placeholder="' + inputHint + '" ' +
                                'spellcheck="false">';
            if (inputType === "text") {
                argsHtml += '<div class="argIconWrap">' +
                                '<span class="icon"></span>' +
                            '</div>';
            }
            argsHtml += '</div></div>';
        }

        var $descCol = $argSection.find('.descs');
        var $argCol = $argSection.find('.args');
        $descCol.html(descsHtml);
        $argCol.html(argsHtml);

        if (allNumbers) {
            $descCol.addClass('allNumbers');
            $argCol.addClass('allNumbers');
            $extModal.addClass('allNumbers');
            $extModal.removeClass('hasStringArg');
        } else {
            $descCol.removeClass('allNumbers');
            $argCol.removeClass('allNumbers');
            $extModal.removeClass('allNumbers');
            $extModal.addClass('hasStringArg');
        }
        if (hasColumnArg) {
            $extModal.addClass('hasColumnArg');
        } else {
            $extModal.removeClass('hasColumnArg');
        }
        if (hasColumnArg) {
            $extModal.addClass('hasColumnArg');
        } else {
            $extModal.removeClass('hasColumnArg');
        }
    }


    function setModalWidth() {
        var formPct = 0.85;
        var maxInputWidth = 210;
        var $descCol = $extModal.find('.descs');
        var $argCol = $extModal.find('.args');

        $extModal.width(maxWidth);
        var argColWidth = Math.min($argCol.width(), maxInputWidth);
        var formWidth = $descCol.width() + argColWidth;
        var modalMinWidth = formWidth / formPct;

        modalMinWidth = Math.max(modalMinWidth, minWidth);
        modalMinWidth = Math.min(modalMinWidth, maxWidth,
                                ($(window).width() - 10));
        $extModal.width(modalMinWidth);
        centerPositionElement($extModal, {
            "limitTop": true
        });
    }

    return (ExtensionOpModal);
}({}, jQuery));
