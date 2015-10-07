// displays load message and animated waiting icon near CLI button
window.StatusMessage = (function($, StatusMessage) {
    var $statusText = $('#pageStatusText');
    var $waitingIcon = $('#loadingIconWrap');
    var isLoading = false;

    var rotateInterval;
    var messages = [];
    var msgObjs = {};
    var scrollSpeed = 500;
    var rotationTime = 2000;
    var numRotations = 0;
    var rotatePosition = 0;
    var isFailed = false;
    var inScroll;
    var messagesToBeRemoved = [];
    var msgIdCount = 0;
    var inRotation = false;

    StatusMessage.setup = function() {
        $statusText.on('click', '.close', function() {
            removeFailedMsg($(this).parent());
        });
    };

    // msgObj should have these properties: msg, operation
    StatusMessage.addMsg = function(msgObj) {
        msgObj = msgObj || {};
        msgObj.worksheetNum = WSManager.getActiveWS();

        var msg = msgObj.msg || StatusMessageTStr.Loading;
        msgIdCount++;
        messages.push(msgIdCount);
        msgObjs[msgIdCount] = msgObj;

        if (messages.length === 1) {
            $statusText.append('<span id="stsMsg-' + msgIdCount + '">' + msg +
                               '</span><span id="stsMsg-' + msgIdCount + '">' +
                                msg + '</span>');
            // we append twice in order to make a full cycle for the carousel
        } else {
            $statusText.children('span:last-child')
                       .before('<span id="stsMsg-' + msgIdCount + '">' + msg +
                               '</span>');
        }

        if (messages.length === 1) {
            inScroll = scrollToMessage().then(function() {
                $('#viewLocation').remove();
                $statusText.scrollTop(0);
            }).promise();
        }

        $waitingIcon.fadeIn(100);
        if (messages.length === 2) {
            stopRotation();
            rotateMessages();
        }

        isLoading = true;
        return (msgIdCount);
    };

    StatusMessage.getPos = function() {
        return (rotatePosition);
    };

    StatusMessage.stop = function() {
        stopRotation();
    };

    StatusMessage.success = function(msgId, noNotification, newTableId,
                                     options) {
        if (!noNotification) {
            showDoneNotification(msgId, false, newTableId, options);
        } else {
            delete msgObjs[msgId];
        }

        inScroll.then(function() {
            var $successSpan = $statusText.find('#stsMsg-' + msgId);
            $successSpan.addClass('success');
            var completed = '<b>' + StatusMessageTStr.Completed + ': </b>';
            $successSpan.prepend(completed);

            if (messages.indexOf(msgId) === 0) {
                var $secondSpan = $statusText.find('span:last');
                $secondSpan.prepend(completed);
                $secondSpan.addClass('success');
            }
            var messageToRemove = {
                $span           : $successSpan,
                msgId           : msgId,
                msg             : $successSpan.text(),
                desiredRotations: numRotations + 1
            };
            messagesToBeRemoved.push(messageToRemove);
            if (!inRotation) {
                checkForMessageRemoval();
            }
            if (messages.length <= messagesToBeRemoved.length) {
                $waitingIcon.hide();
            }
        });
    };

    StatusMessage.fail = function(failMessage, msgId) {
        var fail = true;
        showDoneNotification(msgId, fail);
        failMessage = failMessage || StatusMessageTStr.Error;
        var failHTML = '<span class="text fail">' + failMessage + '</span>' +
                       '<span class="icon close"></span>';

        var $statusSpan = $('#stsMsg-' + msgId);
        $statusSpan.html(failHTML);
        if (messages.indexOf(msgId) === 0) {
            $statusText.find('span:last').html(failHTML);
        }
        if (messages.length <= $statusText.find('.fail').length) {
            $waitingIcon.hide();
        }
        setTimeout(function(){
            removeFailedMsg($statusSpan);
        }, 30000);
    };

    StatusMessage.reset = function() {
        msgIdCount = 0;
        stopRotation();
        StatusMessage.updateLocation(true);
        isFailed = false;
        messages = [];
        numRotations = 0;
        messagesToBeRemoved = [];
    };

    StatusMessage.isFailed = function(){
        return isFailed;
    };

    StatusMessage.updateLocation = function(force) {
        if (!isLoading || force) {
            var currentPanel = $('.mainMenuTab.active').text().trim();
            var locationHTML =
                '<span id="viewLocation">' +
                    StatusMessageTStr.Viewing + " " + currentPanel +
                '</span>';
            $statusText.html(locationHTML);
        }
    };

    function rotateMessages() {
        inRotation = true;
        rotatePosition = 0;
        rotateInterval = setInterval(function() {
            scrollToMessage().then(function() {
                if (rotatePosition >= messages.length) {
                    $statusText.scrollTop(0);
                    rotatePosition = 0;
                    numRotations++;
                }
                checkForMessageRemoval();
            });
        }, rotationTime);
    }

    function checkForMessageRemoval() {
        var currIndex;

        for (var i = 0; i < messagesToBeRemoved.length; i++) {
            var msg = messagesToBeRemoved[i];
            var msgIndex = messages.indexOf(msg.msgId);

            if (numRotations > msg.desiredRotations) {
                var numTotalMessages = messages.length;
                
                if (numTotalMessages === 1) {
                    currIndex = i;
                    setTimeout(function() {
                        removeSuccessMessage(msg.$span, msgIndex, currIndex,
                                             msg.msgId);
                    }, 2000);

                } else if (msgIndex > rotatePosition) {
                    removeSuccessMessage(msg.$span, msgIndex, i, msg.msgId);
                    i--;
                } else if (msgIndex === 0 && rotatePosition !== 0) {
                    removeSuccessMessage(msg.$span, msgIndex, i, msg.msgId);
                    $statusText.scrollTop(0);
                    rotatePosition = 0;
                    i--;
                }
            } else if (!inRotation) {
                currIndex = i;
                setTimeout(function() {
                    removeSuccessMessage(msg.$span, msgIndex, currIndex,
                                         msg.msgId);
                }, rotationTime);
            }
        }
    }

    function removeSuccessMessage($span, msgIndex, removalIndex, msgId) {
        $span.remove();
        messages.splice(msgIndex, 1);
        messagesToBeRemoved.splice(removalIndex, 1);
        var $duplicateMsg = $('#stsMsg-' + msgId);
        if ($duplicateMsg.length !== 0) {
            $duplicateMsg.remove();
            var $firstSpan = $statusText.find('span').eq(0).clone();
            $statusText.append($firstSpan);
        }
        
        messageRemoveHelper();
        if (messages.length <= $statusText.find('.fail').length) {
            $waitingIcon.hide();
        }
    }

    function removeFailedMsg($statusSpan) {
        var msgId = parseInt($statusSpan.attr('id').substr(7));
        var msgIndex = messages.indexOf(msgId);
        messages.splice(msgIndex, 1);
        $statusSpan.remove();
        $('#stsMsg-' + msgId).remove(); // remove duplicate if exists
        if (msgIndex === 0) {
            var $firstSpan = $statusText.find('span').eq(0).clone();
            $statusText.append($firstSpan);
            $statusText.scrollTop(0);
            rotatePosition = 0;
        }
        messageRemoveHelper();
    }

    function scrollToMessage() {
        var scrollAnimation = $statusText.animate({
            scrollTop: 20 * (++rotatePosition)
        }, scrollSpeed).delay(300).promise();
        return (scrollAnimation);
    }

    function stopRotation() {
        clearInterval(rotateInterval);
        inRotation = false;
        rotatePosition = 0;
        setTimeout(function() {
            checkForMessageRemoval();
        }, rotationTime);
    }

    function messageRemoveHelper() {
        if (messages.length === 0) {
            isLoading = false;
            $waitingIcon.hide();
            StatusMessage.updateLocation();
            stopRotation();
        } else if (messages.length < 2) {
            stopRotation();
        }
    }

    function showDoneNotification(msgId, failed, newTableId, options) {
        var operation = msgObjs[msgId].operation;
        if (operation === 'table creation') {
            return; // no notification when table made directly from datastore
        }
        var popupNeeded     = false;
        var popupWrapExists = false;
        var popupNearTab    = false;
        var popupBottom     = false;
        options = options || {};

        var pos = {
            left  : 'auto',
            right : 'auto',
            top   : 'auto',
            bottom: 'auto'
        };
        var arrow = '';
        var classes = '';
        var status = failed ? ' failed' : ' completed';
        var $popups;
        var $popupWrap;

        var $tableDonePopup =
                $('<div class="tableDonePopup' + status + '"' +
                    'id="tableDonePopup' + msgId + '" >' +
                            operation + status +
                    '</div>');

        if (operation === 'data set load') {
            // only display notification if not on data store tab
            if (!$('#dataStoresTab').hasClass('active')) {
                $popups = $('.tableDonePopup.datastoreNotify');
                if ($popups.length !== 0) {
                    $popupWrap = $popups.parent();
                    $popupWrap.append($tableDonePopup);
                    popupWrapExists = true;
                } else {
                    popupNearTab = $('#dataStoresTab');
                }
                classes += ' datastoreNotify';
                popupNeeded = true;
            }
        } else if (!$('#workspaceTab').hasClass('active')) {
            $popups = $('.tableDonePopup.workspaceNotify');
            if ($popups.length !== 0) {
                $popupWrap = $popups.parent();
                $popupWrap.append($tableDonePopup);
                popupWrapExists = true;
            } else {
                popupNearTab = $('#workspaceTab');
            }
            classes += ' workspaceNotify';
            popupNeeded = true;
        } else {
            var wsNum = msgObjs[msgId].worksheetNum;
            var activeWS = WSManager.getActiveWS() || 0;
            if (wsNum !== activeWS || failed) {
                // we're on a different worksheet than the table is on
                // so position the popup next to the worksheet tab
                popupNeeded = true;
                $popups = $('.tableDonePopup.worksheetNotify' + wsNum);
                if ($popups.length !== 0) {
                    $popupWrap = $popups.parent();
                    $popupWrap.prepend($tableDonePopup);
                    popupWrapExists = true;
                } else {
                    popupNearTab = $('#worksheetTab-' + wsNum);
                    popupBottom = true;
                }
                classes += ' worksheetNotify';
                classes += ' worksheetNotify' + wsNum;
            } else {
                // we're on the correct worksheet, now find if table is visible
                var tableId = newTableId;
                var visibility = tableVisibility(tableId);

                if (visibility !== 'visible') {
                    popupNeeded = true;
                    if (visibility === 'left') {
                        $popups = $('.tableDonePopup.leftSide');
                        if ($popups.length !== 0) {
                            $popupWrap = $popups.parent();
                            $popupWrap.append($tableDonePopup);
                            popupWrapExists = true;
                        } else {
                            pos.left = 6;
                            pos.top = Math.max(200, ($(window).height() / 2)
                                                     - 150);
                        }
                        classes += ' leftSide';
                    } else if (visibility === 'right') {
                        $popups = $('.tableDonePopup.rightSide');
                        if ($popups.length !== 0) {
                            $popupWrap = $popups.parent();
                            $popupWrap.append($tableDonePopup);
                            popupWrapExists = true;
                        } else {
                            pos.right = 15;
                            pos.top = Math.max(200, ($(window).height() / 2)
                                                      - 150);
                            arrow = 'rightArrow';
                        }
                        classes += ' rightSide';
                    }
                }
            }            
        }

        if (popupNeeded) {
            $tableDonePopup.addClass(arrow + ' ' + classes)
                           .data('tableid', newTableId);
            
            $tableDonePopup.mousedown(function(event) {
                xcHelper.removeSelectionRange();
                if (event.which !== 1) {
                    return;
                }
                var $popup = $(this);
                if ($popup.hasClass('failed')) {
                    return;
                }

                if ($popup.data('tableid')) {
                    var tableId = $popup.data('tableid');
                    var wsIndex = WSManager.getWSFromTable(tableId);

                    $('#workspaceTab').click();
                    $('#worksheetTab-' + wsIndex).click();

                    if ($dagPanel.hasClass('full')) {
                        $('#dagPulloutTab').click();
                    }
                    $tableWrap = $('#xcTableWrap-' + tableId);
                    var animate = true;
                    xcHelper.centerFocusedTable($tableWrap, animate);
                    $tableWrap.mousedown();
                } else if (options.newDataSet) {
                    $('#dataStoresTab').click();
                    $('#inButton').click();
                    $('#' + options.dataSetId).click();
                }

                if ($popup.siblings().length === 0) {
                    $popup.parent().remove();
                } else {
                    $popup.remove();
                }
                $(document).mouseup(removeSelectionRange);
            });

            if (!popupWrapExists) {
                // we need to create a new container div for the popup
                // and position it, otherwise we would have just appeneded
                // the popup to an already existing container  
                if (popupNearTab) {
                    pos.left = popupNearTab.offset().left +
                               popupNearTab.outerWidth() + 6;
                    pos.top = 4;
                }

                if (popupBottom) {
                    pos.bottom = 3;
                    pos.top = 'auto';
                }

                $popupWrap = $('<div class="tableDonePopupWrap"></div>');
                $popupWrap.css({
                    "top"   : pos.top,
                    "bottom": pos.bottom,
                    "left"  : pos.left,
                    "right" : pos.right
                });
                $('body').append($popupWrap);
                $popupWrap.append($tableDonePopup);
            }

            setTimeout(function() {
                $tableDonePopup.fadeIn(200, function() {
                    var displayTime = 2500;
                    if (failed) {
                        displayTime = 5000;
                    }
                    setTimeout(function() {
                        $tableDonePopup.fadeOut(200, function(){
                            if ($tableDonePopup.siblings().length === 0) {
                                $tableDonePopup.parent().remove();
                            } else {
                                $tableDonePopup.remove();
                            }                           
                        });
                    }, displayTime);
                });
            }, 400);
        }

        delete msgObjs[msgId];
    }

    function tableVisibility(tableId) {
        var wsNum = WSManager.getWSFromTable(tableId);
        var activeWS = WSManager.getActiveWS();

        if (wsNum !== activeWS) {
            return (wsNum);
        }
        var $table = $("#xcTable-" + tableId);
        var rect = $table[0].getBoundingClientRect();
        var windowWidth = $('#rightSideBar').offset().left - 10;
        var position;
        if (rect.left < 40) {
            if (rect.right > 40) {
                position = 'visible';
            } else {
                position = 'left';
            }
        } else if (rect.left > windowWidth) {
            position = 'right';
        } else {
            position = 'visible';
        }

        return (position);
    }

    function removeSelectionRange() {
        xcHelper.removeSelectionRange();
        $(document).off('mouseup', removeSelectionRange);
    }

    return (StatusMessage);
}(jQuery, {}));
