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

        $configCard.on('keydown', '.paramName', function(e) {
            if (e.which === keyCode.Enter) {
                var $nameInput = $(this);
                var val = $nameInput.val();
                if (val === $nameInput.data('value')) {
                // no change do not resubmit
                    return;
                }
                var $formRow = $nameInput.closest('.formRow');
                
                $nameInput.data('value', val);
                $nameInput.attr('disabled', true);
                appendWaitingIcon($formRow);
                $formRow.find('.curVal').val('');

                getParamByName(val)
                .then(function(paramInfo) {
                    $formRow.find('.curVal').val('placeholder');
                    $formRow.find('.newVal').focus();
                  
                })
                .fail(function(error) {
                    var errorText = "Parameter not found";
                    StatusBox.show(errorText, $nameInput, false, {
                        "offsetX": -5,
                        "side"   : "top"
                    });
                })
                .always(function() {
                    $nameInput.attr('disabled', false);
                    $formRow.find('.waitingIcon').fadeOut(200, function() {
                        $(this).remove();
                    });
                });
            }
        });

        $configCard.on('blur', '.paramName', function() {
            var $nameInput = $(this);
            $nameInput.val($nameInput.data('value'));
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
    };

    MonitorConfig.refreshParams = function() {
        var deferred = jQuery.Deferred();
        XcalarGetConfigParams()
        .then(function(res) {
            var params = res.parameter;
            for (var i = 0; i < params.length; i++) {
                paramsCache[params[i].paramName] = params[i];
            }
            // console.log(paramsCache);
            deferred.resolve(res);
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();  
    };

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
        setTimeout(function() {
            deferred.resolve(paramInfo);
            // deferred.reject(paramInfo);
        }, 2000);
        
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
        var html = '<div class="formRow clearfix animating">' +
                  '<label class="argWrap">' +
                    '<span class="text">' + MonitorTStr.ConfigParamName +
                    ':</span>' +
                    '<input type="text" class="xc-input paramName" ' +
                    'data-value="">' +
                  '</label>' +
                  '<div class="flexGroup">' +
                      '<label class="argWrap">' +
                        '<span class="text">' + MonitorTStr.CurVal +
                        ':</span>' +
                        '<input type="text" class="xc-input curVal" disabled>' +
                      '</label>' +
                      '<label class="argWrap">' +
                        '<span class="text">' + MonitorTStr.NewVal +
                        ':</span>' +
                        '<input type="text" class="xc-input newVal">' +
                      '</label>' +
                  '</div>' +
                '</div>';
        $placeholder.before(html);
        setTimeout(function() {
            $placeholder.prev().removeClass('animating');
        }, 0);
        var $mainContent = $('#monitorPanel').children('.mainContent');
        $mainContent.scrollTop($mainContent.height());
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
