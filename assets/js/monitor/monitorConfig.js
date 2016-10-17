window.MonitorConfig = (function(MonitorConfig, $) {
    var $configCard;
    var $placeholder;
    var paramsCache = {};
    var searchHelper;
    var $menuPanel;
    var $userList;

    MonitorConfig.setup = function() {
        $configCard = $('#configCard');
        $placeholder = $configCard.find('.placeholder');
        $menuPanel = $('#monitorMenu-setup');
        $userList = $menuPanel.find('.userList');
        setupListeners();
    };

    // updateOnly will not wipe out new rows
    MonitorConfig.refreshParams = function(firstTouch) {
        var deferred = jQuery.Deferred();
        XcalarGetConfigParams()
        .then(function(res) {
            var params = res.parameter;
            for (var i = 0; i < params.length; i++) {
                paramsCache[params[i].paramName.toLowerCase()] = params[i];
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
        $("#configStartNode").click(function() {
            $(this).blur();
            startNode();
        });

        $("#configStopNode").click(function() {
            $(this).blur();
            stopNode();
        });

        $placeholder.click(function() {
            addInputRow();
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

            var valLower = val.toLowerCase();
            var $formRow = $nameInput.closest('.formRow');
            var $newValInput = $formRow.find('.newVal');
            
            $nameInput.data('value', val);
            $nameInput.attr('disabled', true);
            // appendWaitingIcon($formRow);
            $formRow.find('.curVal').val('');

            getParamByName(valLower)
            .then(function(paramObj) {
                $nameInput.val(paramObj.paramName);
                $nameInput.data('value', paramObj.paramName);
                $nameInput.prop('disabled', true);
                $formRow.addClass('nameIsSet');
                $formRow.find('.curVal').val(paramObj.paramValue);

                if (paramObj.changeable) {
                    if ($newValInput.val() === "") {
                        $newValInput.val(paramObj.paramValue);
                    }
                    $newValInput.prop('disabled', false).focus();
                } else {
                    $formRow.addClass('uneditable');
                    $newValInput.addClass('disabled')
                                            .prop('disabled', true);
                    $newValInput.val("");
                    xcTooltip.enable($newValInput);
                }
            })
            .fail(function(error) {
                $nameInput.attr('disabled', false);
                var errorText = "Parameter not found";
                StatusBox.show(errorText, $nameInput, false, {
                    "offsetX": -5,
                    "side"   : "top"
                });
                // $formRow.find('.newVal').val(paramObj.paramValue)
                //                         .prop('disabled', true);
            })
            .always(function() {
                // $nameInput.attr('disabled', false);
                $formRow.find('.waitingIcon').fadeOut(200, function() {
                    $(this).remove();
                });
            });
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

        searchHelper = new SearchBar($("#adminUserSearch"), {
            "removeSelected": function() {
                $userList.find(".selected").removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "scrollMatchIntoView": function($match) {
                // scrollMatchIntoView($userList, $match);
            }
        });
        searchHelper.setup();

        $("#adminUserSearch").on('input', 'input', function() {
            var keyWord = $(this).val();
            filterUserList(keyWord); 
        });

        $("#adminUserSearch").on("click", ".closeBox", function() {
            searchHelper.clearSearch(function() {
                clearUserListFilter();
                searchHelper.$arrows.hide();
                $("#adminUserSearch").find("input").focus();
            });
        });

        $configCard.on('click', '.removeRow', function() {
            $(this).closest('.formRow').remove();
        });

        $('#paramSettingsSave').on("click", submitForm);
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
            var pName = $row.find('.paramName').val().trim();
            var curVal = $row.find('.curVal').val().trim();
            
            if (!paramsCache[pName.toLowerCase()]) {
                errorFound = {
                    input: $row.find('.paramName'),
                    reason: "invalidName"
                }
                return false;
            }

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
                xcHelper.showSuccess();

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
        var partialFail = false;
        var $errorRow;
        for (var i = 0 ; i < args.length; i++) {
            if (args[i].error) {
                if (!errorMsg) {
                    errorMsg = args[i].error;
                    $errorRow = rows[i];
                }
            } else {
                partialFail = true;
            }
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
        switch(errorObj.reason) {
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
        // setTimeout(function() {
        //     $placeholder.prev().removeClass('animating');
        // }, 0);
    }

    function updateParamInputs(rows) {
        var $row;
        var $nameInput;
        var name;
        var paramObj;
        for (var i = 0; i < rows.length; i++) {
            $row = rows[i];
            $nameInput = $row.find('.paramName');
            name = $nameInput.val();
            paramObj = paramsCache[name.toLowerCase()];
            if (paramObj) {
                $nameInput.val(paramObj.paramName);
                $row.find('.curVal').val(paramObj.paramValue);
            }
        }
    }

    function appendWaitingIcon($formRow) {
        var $curValInput = $formRow.find('.curVal');
        var $curValArg = $curValInput.parent();
        $curValArg.append('<div class="waitingIcon"></div>');
        var $waitingIcon = $curValArg.find('.waitingIcon');
        var offsetLeft = $curValInput.position().left;
        var width = $curValInput.outerWidth();
        $waitingIcon.fadeIn(200);
        var left = offsetLeft + (width / 2) - ($waitingIcon.width() / 2) + 10;
        $waitingIcon.css('left', left);
    }

    function getParamByName(name) {
        var deferred = jQuery.Deferred();
        var paramInfo;
        // debugger;
        // setTimeout(function() {
            var paramObj = paramsCache[name];
            if (paramObj) {
                // if (paramObj.visible) {
                    deferred.resolve(paramObj);
                // }
            } else {
                deferred.reject();
            }

            // deferred.resolve(paramInfo);
            // deferred.reject(paramInfo);
        // }, 2000);
        
        return (deferred.promise());
    }
  

    function startNode() {
        console.log('start node!');
        // not works now!!
        // KVStore.commit()
        // .then(function() {
        //     return XcalarStartNodes(2);
        // }, function(error) {
        //     console.error("Failed to write! Commencing shutdown",
        //                    error);
        //     return XcalarStartNodes(2);
        // })
        // .then(function() {
        //     console.info("Restart Successfully!");
        //     // refresh page
        //     location.reload();
        // });
    }

    function stopNode() {
        console.log("Shut down!");

        // not works now!!!
        // KVStore.commit()
        // .then(function() {
        //     return XcalarShutDown();
        // });
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
        var newValDisabledProp = "disabled";
        var uneditable = false;
        if (paramObj) {
            paramName = paramObj.paramName;
            curVal = paramObj.paramValue;
            rowClassNames += " nameIsSet";
            paramNameDisabledProp = "disabled";
            if (paramObj.changeable) {
                newValDisabledProp = "";
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
                        '<input type="text" class="xc-input curVal disabled" ' +
                        'disabled value="' + curVal + '">' +
                      '</label>' +
                      '<label class="argWrap">' +
                        '<span class="text">' + MonitorTStr.NewVal +
                        ':</span>';
        if (uneditable) {
            html += '<input type="text" class="xc-input newVal disabled" ' +
                        'disabled value="' + newVal + '" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' + TooltipTStr.ParamValNoChange +
                        '">';
        } else {
            html += '<input type="text" class="xc-input newVal" ' +
                    'data-original-title="' + TooltipTStr.ParamValNoChange +
                    '" data-container="body" ' +
                    'value="' + newVal + '">';
        }
                        
        html += '</label>' +
                  '</div>' +
                '</div>';
        return (html);
    }

    function filterUserList(keyWord) {
        var $lis = $menuPanel.find(".userLi");
        // $lis.find('.highlightedText').contents().unwrap();
        $lis.each(function() {
            var $li = $(this);
            if ($li.hasClass("highlighted")) {
                var $span = $li.find(".text");
                $span.html($span.text());
                $li.removeClass("highlighted");
            } else if ($li.hasClass('nonMatch')) {
                // hidden lis that are filtered out
                $li.removeClass('nonMatch xc-hidden');
            }
        });

        if (keyWord == null || keyWord === "") {
            searchHelper.clearSearch(function() {
                searchHelper.$arrows.hide();
            });
            // $section.find('input').css("padding-right", 30);
            return;
        } else {
            var regex = new RegExp(keyWord, "gi");
            $lis.each(function() {
                var $li = $(this);
                var tableName = $li.text();
                if (regex.test(tableName)) {
                    $li.addClass("highlighted");
                    // var $span = $li.find(".tableName");
                    var $span = $li.find('.text');
                    var text = $span.text();
                    text = text.replace(regex, function (match) {
                        return ('<span class="highlightedText">' + match +
                                '</span>');
                    });

                    $span.html(text);
                } else {
                    // we will hide any lis that do not match
                    $li.addClass('nonMatch xc-hidden');
                }
            });
            searchHelper.updateResults($userList.find('.highlightedText'));
            // var counterWidth = $userList.find('.counter').width();
            // $userList.find('input').css("padding-right", counterWidth + 30);

            if (searchHelper.numMatches !== 0) {
                // scrollMatchIntoView($userList, searchHelper.$matches.eq(0));
                searchHelper.$arrows.show();
            } else {
                searchHelper.$arrows.hide();
            }
        }
    }

    function clearUserListFilter() {
        $("#adminUserSearch").find("input").val("");
        filterUserList(null);
    }

    return (MonitorConfig);
}({}, jQuery));
