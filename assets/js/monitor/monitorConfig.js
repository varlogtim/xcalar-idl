window.MonitorConfig = (function(MonitorConfig, $) {
    var $configCard;
    var $placeholder;
    var paramsCache = {};

    MonitorConfig.setup = function() {
        $configCard = $('#configCard');
        $placeholder = $configCard.find('.placeholder');
        setupListeners();
    };

    // updateOnly will not wipe out new rows
    MonitorConfig.refreshParams = function(firstTouch) {
        var deferred = jQuery.Deferred();
        XcalarGetConfigParams()
        .then(function(res) {
            var params = res.parameter;
            for (var i = 0; i < params.length; i++) {
                // making default sample size a user setting
                if (params[i].paramName !== "DsDefaultSampleSize") {
                    paramsCache[params[i].paramName.toLowerCase()] = params[i];
                }
            }

            if (firstTouch) {
                setupVisibleParamsList();
            }

            deferred.resolve(res);
        })
        .fail(function(error) {
            deferred.reject(error);
        });
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
            } else {
                $configCard.removeClass('minimized');
                $(this).parent().removeClass('minimized');
            }
        });

        $configCard.on('keypress', '.paramName', function(e) {
            if (e.which !== keyCode.Enter) {
                return;
            }
            var $nameInput = $(this);
            var val = $nameInput.val().trim();

            if (!val.length) {
                return;
            }

            // var valLower = val.toLowerCase();
            var $formRow = $nameInput.closest('.formRow');
            var $curValInput = $formRow.find('.curVal');
            var $newValInput = $formRow.find('.newVal');
            var paramObj = getParamObjFromInput($nameInput);

            if (paramObj) {
                $nameInput.data('value', paramObj.paramName)
                          .prop('readonly', true)
                          .val(paramObj.paramName);
                $curValInput.val(paramObj.paramValue);
                $formRow.addClass('nameIsSet');
                
                if (paramObj.changeable) {
                    if ($newValInput.val() === "") {
                        $newValInput.val(paramObj.paramValue);
                    }
                    $newValInput.prop('readonly', false).focus();
                } else {
                    $formRow.addClass('uneditable');
                    $newValInput.addClass('readonly')
                                .prop('readonly', true)
                                .val("");
                    $formRow.find('.defaultParam').addClass('xc-hidden');
                    xcTooltip.enable($newValInput);
                }
                var defValTooltip;
                if (paramObj && paramObj.hasOwnProperty('defaultValue')) {
                    defValTooltip = xcHelper.replaceMsg(
                                                MonitorTStr.DefaultWithVal,
                                                {value: paramObj.defaultValue});
                } else {
                    defValTooltip = CommonTxtTstr.RevertDefaultVal;
                }
                xcTooltip.changeText($formRow.find('.defaultParam'),
                                     defValTooltip);
            } else {
                $nameInput.data('value', val);
                $curValInput.val('');

                StatusBox.show(ErrTStr.ConfigParamNotFound, $nameInput, false, {
                    "offsetX": -5,
                    "side": "top"
                });
            }
        });

        $configCard.on('blur', '.paramName', function() {
            var $nameInput = $(this);
            $nameInput.val($nameInput.data('value'));
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

        $('#paramSettingsSave').on("click", submitForm);
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

    //xx need to handle submitting duplicate rows
    function submitForm() {
        var errorFound;
        var promises = [];
        var rows = [];
        $configCard.find('.formRow').each(function() {
            var $row = $(this);
            if ($row.hasClass('placeholder') || $row.hasClass('uneditable')) {
                return true;
            }

            var $newValInput = $row.find('.newVal');
            var newVal = $newValInput.val().trim();
            var $nameInput = $row.find('.paramName');
            var paramObj = getParamObjFromInput($nameInput);
            var pName;

            if (!paramObj) {
                errorFound = {
                    input: $nameInput,
                    reason: "invalidName"
                };
                return false;
            }

            pName = paramObj.paramName;

            if (!newVal.length) {
                errorFound = {
                    input: $newValInput,
                    reason: "empty"
                };
                return false;
            }
            rows.push($row);
            promises.push(XcalarSetConfigParams(pName, newVal));
        });

        if (errorFound) {
            showFormError(errorFound);
            return;
        }

        if (promises.length) {
            PromiseHelper.when.apply(window, promises)
            .then(function() {
                xcHelper.showSuccess("Parameters saved!");

            })
            .fail(function() {
                submitFailHandler(arguments, rows);
                console.log('error', arguments);
            })
            .always(function() {
                MonitorConfig.refreshParams()
                .then(function() {
                    updateParamInputs(rows);
                });
            });
        }
    }

    function submitFailHandler(args, rows) {
        var errorMsg = "";
        // var partialFail = false;
        var $errorRow;
        for (var i = 0 ; i < args.length; i++) {
            if (args[i].error) {
                if (!errorMsg) {
                    errorMsg = args[i].error;
                    $errorRow = rows[i];
                }
            }
            // else {
            //     partialFail = true;
            // }
        }
        // xx not sure how to show all the errored rows if multiple
        var paramName = $errorRow.find('.paramName').val();
        var currVal = $errorRow.find('.curVal').val();
        errorMsg += '<br/>' + xcHelper.replaceMsg(
        MonitorTStr.ParamConfigFailMsg, {
            name: paramName,
            value: currVal
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
                $row.find('.curVal').val(paramObj.paramValue);
            }
        }
    }

    function addInputRow() {
        var html = getInputRowHtml();
        $placeholder.before(html);
        setTimeout(function() {
            $placeholder.prev().removeClass('animating');
        }, 0);
        var $mainContent = $('#monitorPanel').children('.mainContent');
        $mainContent.scrollTop($mainContent.height());
    }

    function getInputRowHtml(paramObj) {
        var paramName = "";
        var curVal = "";
        var newVal = "";
        var rowClassNames = "";
        var paramNameDisabledProp = "";
        var uneditable = false;
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
        } else {
            rowClassNames += " animating";
        }
        var html = '<div class="formRow clearfix ' + rowClassNames + '">' +
                    '<div class="removeRow">' +
                        '<i class="icon xi-close fa-12"></i>' +
                    '</div>' +
                  '<label class="argWrap">' +
                    '<span class="text">' + MonitorTStr.ConfigParamName +
                    ':</span>' +
                    '<input type="text" class="xc-input paramName" ' +
                    'data-value="' + paramName + '" ' + paramNameDisabledProp +
                    ' value="' + paramName + '">' +
                  '</label>' +
                  '<div class="flexGroup">' +
                      '<label class="argWrap">' +
                        '<span class="text">' + MonitorTStr.CurVal +
                        ':</span>' +
                        '<input type="text" class="xc-input curVal readonly" ' +
                        'readonly value="' + curVal + '">' +
                      '</label>' +
                      '<label class="argWrap">' +
                        '<span class="text">' + MonitorTStr.NewVal +
                        ':</span>';
        if (uneditable) {
            html += '<input type="text" class="xc-input newVal readonly" ' +
                        'readonly value="' + newVal + '" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' + TooltipTStr.ParamValNoChange +
                        '">';
        } else {
            html += '<input type="text" class="xc-input newVal" ' +
                    'data-original-title="' + TooltipTStr.ParamValNoChange +
                    '" data-container="body" ' +
                    'value="' + newVal + '">';
        }

        html += '</label>';
        if (!uneditable) {
            var defValTooltip;
            if (paramObj && paramObj.hasOwnProperty('defaultValue')) {
                defValTooltip = xcHelper.replaceMsg(
                                            MonitorTStr.DefaultWithVal,
                                            {value: paramObj.defaultValue});
            } else {
                defValTooltip = CommonTxtTstr.RevertDefaultVal;
            }
            html +=
                '<div class="defaultParam iconWrap xc-action" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + defValTooltip + '">' +
                    '<i class="icon xi-restore center fa-15"></i>' +
                '</div>';
        }
        html += '</div>' +
                '</div>';
        return (html);
    }

    return (MonitorConfig);
}({}, jQuery));
