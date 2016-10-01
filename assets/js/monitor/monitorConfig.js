window.MonitorConfig = (function(MonitorConfig, $) {
    var $configCard;
    var $placeholder;
    MonitorConfig.setup = function() {
        $configCard = $('#configCard');
        $placeholder = $configCard.find('.placeholder');
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

    return (MonitorConfig);
}({}, jQuery));
