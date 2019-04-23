window.MonitorConfig = (function(MonitorConfig, $) {
    var $configCard;
    var $placeholder;
    var paramsCache = {};
    var formHelper;

    MonitorConfig.setup = function() {
        $configCard = $('#configCard');
        $placeholder = $configCard.find('.placeholder');
        setupListeners();
        formHelper = new FormHelper($configCard, {noEsc: true,
                                                  noTabFocus: true});
    };

    // updateOnly will not wipe out new rows
    MonitorConfig.refreshParams = function(firstTouch) {
        var deferred = PromiseHelper.deferred();
        XcalarGetConfigParams()
        .then(function(res) {
            var params = res.parameter;
            for (var i = 0; i < params.length; i++) {
                var paramName = params[i].paramName.toLowerCase();
                paramsCache[paramName] = params[i];
            }

            if (firstTouch) {
                $("#monitor-setup").removeClass("firstTouch");
                setupVisibleParamsList();
            }
            deferred.resolve(paramsCache);
        })
        .fail(deferred.reject);
        return deferred.promise();
    };

    function setupListeners() {
        $placeholder.click(function() {
            addInputRow();
        });

        $configCard.find('.toggleSize').on('click', '.headerBtn', function() {
            if ($(this).hasClass('minimize')) {
                $configCard.addClass('minimized');
                $(this).parent().addClass('minimized');

                $('#monitorLogCard').addClass('maximized');
            } else {
                $configCard.removeClass('minimized');
                $(this).parent().removeClass('minimized');

                $('#monitorLogCard').removeClass('maximized');
            }
        });


        $configCard.on('keypress', '.paramName', function(e) {
            if (e.which !== keyCode.Enter) {
                return;
            }
            submitParamName($(this));
        });

        $configCard.on('blur', '.paramName', function() {
            var $nameInput = $(this);
            $nameInput.val($nameInput.attr('data-value'));
        });

        $configCard.on("change", ".paramName", function() {
            submitParamName($(this), true);
        });

        $configCard.on('keydown', '.newVal', function(e) {
            if (e.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $configCard.on('click', '.removeRow', function() {
            $(this).closest('.formRow').remove();
        });

        $configCard.on('click', '.defaultParam', function() {
            resetDefaultParam($(this).closest('.formRow'));
        });

        $('#paramSettingsSave').on("click", function() {
            $(this).blur();
            submitForm();
        });

        $configCard.on("click", ".resetAll", function() {
            $(this).blur();
            resetAllDefaultParams();
        });


        $configCard.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }

    function resetAllDefaultParams() {
        var $rows = $configCard.find(".formRow.nameIsSet:not(.uneditable)");
        $rows.each(function() {
            var $row = $(this);
            var oldVal = $row.find(".curVal").val();
            $row.find(".newVal").val(oldVal);
        });
    }

    // fills in user's val input with default value
    function resetDefaultParam($row) {
        var $nameInput = $row.find('.paramName');
        var paramObj = getParamObjFromInput($nameInput);
        if (!paramObj) {
            return;
        }
        var defaultVal = paramObj.defaultValue;
        if (defaultVal === "(null)") {
            defaultVal = "";
        }
        $row.find('.newVal').val(defaultVal);
    }

    function getParamObjFromInput($nameInput) {
        return paramsCache[$nameInput.val().toLowerCase().trim()];
    }

    function hasParam(paramName) {
        var $row = $configCard.find('input[data-value="' + paramName + '"]');
        return ($row.length > 0);
    }

    function submitParamName($nameInput, onChangeTriggered) {
        var val = $nameInput.val().trim();

        if (!val.length) {
            return;
        }

        var $formRow = $nameInput.closest('.formRow');
        var $curValInput = $formRow.find('.curVal');
        var $newValInput = $formRow.find('.newVal');
        var paramObj = getParamObjFromInput($nameInput);

        if (paramObj) {
            if (hasParam(paramObj.paramName)) {
                if (!onChangeTriggered) {
                    showAddParamError(ErrTStr.ConfigParamExists, $nameInput);
                }
                return;
            }

            $nameInput.attr('data-value', paramObj.paramName)
                      .prop('readonly', true)
                      .val(paramObj.paramName);
            $curValInput.val(paramObj.paramValue);
            xcTooltip.changeText($curValInput, paramObj.paramValue);
            $formRow.addClass('nameIsSet');

            if (paramObj.changeable) {
                if ($newValInput.val() === "") {
                    $newValInput.val(paramObj.paramValue);
                }
                $newValInput.prop('readonly', false);
            } else {
                $formRow.addClass('uneditable');
                $newValInput.addClass('readonly')
                            .prop('readonly', true)
                            .val("");
                $formRow.find('.defaultParam').addClass('xc-hidden');
                xcTooltip.enable($newValInput);
            }
            var defValTooltip = getDefaultTooltip(paramObj);
            xcTooltip.changeText($formRow.find('.defaultParam'), defValTooltip);
        } else {
            $nameInput.attr('data-value', val);
            $curValInput.val('');
            xcTooltip.changeText($curValInput, "");
            if (!onChangeTriggered) {
                showAddParamError(ErrTStr.ConfigParamNotFound, $nameInput);
            }
        }
    }

    function getDefaultTooltip(paramObj) {
        var defValTooltip;
        if (paramObj && paramObj.hasOwnProperty('defaultValue')) {
            defValTooltip = xcStringHelper.replaceMsg(MonitorTStr.DefaultWithVal, {
                value: paramObj.defaultValue
            });
        } else {
            defValTooltip = CommonTxtTstr.RevertDefaultVal;
        }
        return defValTooltip;
    }

    function showAddParamError(error, $nameInput) {
        StatusBox.show(error, $nameInput, false, {
            "offsetX": -5,
            "side": "top"
        });
    }

    function submitForm() {
        var errorFound;
        var promises = [];
        var rows = [];
        var needRestart = false;

        $configCard.find('.configTable .formRow').each(function() {
            var $row = $(this);
            if ($row.hasClass('placeholder') || $row.hasClass('uneditable')) {
                return true;
            }

            var $newValInput = $row.find('.newVal');
            var newVal = $newValInput.val().trim();
            var $nameInput = $row.find('.paramName');
            var paramObj = getParamObjFromInput($nameInput);

            if (!paramObj) {
                errorFound = {
                    input: $nameInput,
                    reason: "invalidName"
                };
                return false;
            }

            if (!newVal.length && paramObj.defaultValue !== "") {
                errorFound = {
                    input: $newValInput,
                    reason: "empty"
                };
                return false;
            }

            if (newVal !== paramObj.paramValue) {
                var pName = paramObj.paramName;
                needRestart = needRestart || paramObj.restartRequired;
                rows.push($row);
                promises.push(XcalarSetConfigParams(pName, newVal));
            }
        });

        if (errorFound) {
            showFormError(errorFound);
            return;
        }

        if (promises.length) {
            formHelper.disableSubmit();
            PromiseHelper.when.apply(window, promises)
            .then(function() {
                if (needRestart) {
                    var msg = SuccessTStr.SaveParam + " " +
                              MonitorTStr.RestartMsg;
                    Alert.show({
                        "title": MonitorTStr.Restart,
                        "msg": msg,
                        "isAlert": true
                    });
                } else {
                    xcUIHelper.showSuccess(SuccessTStr.SaveParam);
                }
            })
            .fail(function(args) {
                // XXX also need to handle partial failures better
                // (alert restarat if necessary)
                submitFailHandler(args, rows);
            })
            .always(function() {
                MonitorConfig.refreshParams()
                .then(function() {
                    updateParamInputs(rows);
                })
                .always(function() {
                    formHelper.enableSubmit();
                });
            });
        } else {
            xcUIHelper.showSuccess(SuccessTStr.SaveParam);
        }
    }

    function submitFailHandler(args, rows) {
        var errorMsg = "";
        // var partialFail = false;
        var $errorRow = $();
        for (var i = 0; i < args.length; i++) {
            if (args[i].error) {
                if (!errorMsg) {
                    errorMsg = args[i].error;
                    $errorRow = rows[i];
                }
            }
        }
        // xx not sure how to show all the errored rows if multiple
        var paramName = $errorRow.find('.paramName').val();
        var newVal = $errorRow.find('.newVal').val();
        errorMsg += '<br/>' + xcStringHelper.replaceMsg(
        MonitorTStr.ParamConfigFailMsg, {
            name: paramName,
            value: newVal
        });
        Alert.error(MonitorTStr.ParamConfigFailed, errorMsg, {
            msgTemplate: errorMsg
        });
    }

    function showFormError(errorObj) {
        var msg = "";
        switch (errorObj.reason) {
            case ("empty"):
                msg = ErrTStr.NoEmpty;
                break;
            case ("invalidName"):
                msg = ErrTStr.ConfigParamNotFound;
                break;
            default:
                break;
        }
        StatusBox.show(msg, errorObj.input, null, {side: "top"});
    }

    function setupVisibleParamsList() {
        var paramObj;
        var html = "";
        for (var name in paramsCache) {
            paramObj = paramsCache[name];
            if (paramObj.visible || gXcSupport) {
                html += getInputRowHtml(paramObj);
            }
        }
        if (html.length === 0) {
            html += getInputRowHtml();
        }
        $placeholder.siblings().remove();
        $placeholder.before(html);
    }

    function updateParamInputs(rows) {
        var $row;
        var $nameInput;
        var paramObj;
        for (var i = 0; i < rows.length; i++) {
            $row = rows[i];
            $nameInput = $row.find('.paramName');
            paramObj = getParamObjFromInput($nameInput);
            if (paramObj) {
                $nameInput.val(paramObj.paramName);
                var $curValInput = $row.find('.curVal');
                $curValInput.val(paramObj.paramValue);
                xcTooltip.changeText($curValInput, paramObj.paramValue);
            }
        }
    }

    function addInputRow() {
        var html = getInputRowHtml();
        var $row = $(html);
        $placeholder.before($row);
        $row.find("input").eq(0).focus();
        setTimeout(function() {
            $placeholder.prev().removeClass('animating');
        }, 0);

        // position scrollbar
        var rowHeight = $configCard.find(".formRow").eq(0).outerHeight();
        var winHeight = $(window).height();
        var bottomBuffer = $("#statusBar").height() + 20;
        var posDiff = ($placeholder.offset().top + rowHeight + bottomBuffer) -
                       winHeight;
        if (posDiff > 0) {
            var $mainContent = $('#monitorPanel').children('.mainContent');
            var top = $mainContent.scrollTop();
            $mainContent.animate({scrollTop: top + posDiff + 20});
        }
    }

    function getInputRowHtml(paramObj) {
        var paramName = "";
        var curVal = "";
        var newVal = "";
        var rowClassNames = "";
        var paramNameDisabledProp = "";
        var uneditable = false;
        var restartClass = "";
        if (paramObj) {
            paramName = paramObj.paramName;
            curVal = paramObj.paramValue;
            rowClassNames += " nameIsSet";
            paramNameDisabledProp = "readonly";
            if (paramObj.changeable) {
                newVal = curVal;
            } else {
                rowClassNames += " uneditable";
                uneditable = true;
            }
            if (paramObj.restartRequired) {
                restartClass = "restartRequired";
            }
        } else {
            rowClassNames += " animating";
        }
        var html = '<div class="formRow ' + rowClassNames + '">' +
                    '<div class="removeRow">' +
                        '<i class="icon xi-close fa-14"></i>' +
                    '</div>' +
                  '<label class="argWrap paramNameWrap">' +
                    '<input type="text" class="xc-input paramName" ' +
                    'data-value="' + paramName + '" ' + paramNameDisabledProp +
                    ' value="' + paramName + '" spellcheck="false">' +
                  '</label>' +
                  '<label class="argWrap curValWrap">' +
                    '<input type="text" readonly ' +
                    'class="xc-input curVal readonly tooltipOverflow" ' +
                    'value="' + curVal + '" spellcheck="false" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + curVal + '">' +
                  '</label>' +
                  '<label class="argWrap">';
        if (uneditable) {
            html += '<input type="text" class="xc-input newVal readonly" ' +
                        'readonly value="' + newVal + '" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' + TooltipTStr.ParamValNoChange +
                        '" spellcheck="false">';
        } else {
            html += '<input type="text" class="xc-input newVal" ' +
                    'data-original-title="' + TooltipTStr.ParamValNoChange +
                    '" data-container="body" ' +
                    'value="' + newVal + '" spellcheck="false">';
        }
        if (!uneditable) {
            var defValTooltip = getDefaultTooltip(paramObj);
            html +=
                '<div class="defaultParam iconWrap xc-action" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + defValTooltip + '">' +
                    '<i class="icon xi-reset center fa-15"></i>' +
                '</div>';
        }
        html += '</label>' +
                '<label class="argWrap restartWrap ' + restartClass + '">' +
                    '<i class="icon xi-tick"></i>' +
                '</label>' +
                '</div>' +
                '</div>';
        return (html);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        MonitorConfig.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (MonitorConfig);
}({}, jQuery));
