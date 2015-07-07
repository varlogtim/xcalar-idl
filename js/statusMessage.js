// displays load message and animated waiting icon near CLI button
window.StatusMessage = (function() {
    var $statusText = $('#pageStatusText');
    var $waitingIcon = $('#loadingIconWrap').children();
    var isLoading = false;

    var Message = function() {};
    var self = new Message();
    var rotateInterval;
    var messages = [];
    var scrollSpeed = 500;
    var rotationTime = 2000;
    var numRotations = 0;
    var rotatePosition = 0;
    var isFailed = false;
    var inScroll;
    var messagesToBeRemoved = [];
    var msgIdCount = 0;
    var inRotation = false;

    Message.prototype.addMsg = function(msg) {
        msg = msg || StatusMessageTStr.Loading;
        msgIdCount++;
        messages.push(msgIdCount);

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

    Message.prototype.getPos = function() {
        return rotatePosition;
    };

    Message.prototype.stop = function() {
        stopRotation();
    };

    Message.prototype.success = function(msgId) {
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
                $span : $successSpan,
                msgId : msgId,
                msg : $successSpan.text(),
                desiredRotations : numRotations + 1
            };
            messagesToBeRemoved.push(messageToRemove);
            if (!inRotation) {
                checkForMessageRemoval();
            }
            if (messages.length <= messagesToBeRemoved.length) {
                $waitingIcon.hide();
            }
        });
        
        return (self);
    };

    function checkForMessageRemoval() {
        for (var i = 0; i < messagesToBeRemoved.length; i++) {
            var msg = messagesToBeRemoved[i];
            var msgIndex = messages.indexOf(msg.msgId);

            if (numRotations > msg.desiredRotations) {
                var numTotalMessages = messages.length;
                
                if (numTotalMessages === 1) {
                    var currIndex = i;
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
                var currIndex = i;
                setTimeout(function() {
                    removeSuccessMessage(msg.$span, msgIndex, currIndex,
                                         msg.msgId);
                }, rotationTime);
            }
        }
    }

    Message.prototype.fail = function(failMessage, msgId) {
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
        
        return (self);
    };

    Message.prototype.reset = function() {
        msgIdCount = 0;
        stopRotation();
        self.updateLocation(true);
        isFailed = false;
        messages = [];
        numRotations = 0;
        messagesToBeRemoved = [];
    };

    Message.prototype.isFailed = function(){
        return isFailed;
    };

    Message.prototype.updateLocation = function(force) {
        if (!isLoading || force) {
            var currentPanel = $.trim($('.mainMenuTab.active').text());
            var locationHTML = '<span id="viewLocation">' +
                               StatusMessageTStr.Viewing + " " +
                               currentPanel + '</span>';
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

    $statusText.on('click', '.close', function() {
        var $statusSpan = $(this).parent();
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
    });

    function messageRemoveHelper() {
        if (messages.length === 0) {
            isLoading = false;
            $waitingIcon.hide();
            self.updateLocation();
            stopRotation();
        } else if (messages.length < 2) {
            stopRotation();
        }
    }
    
    return (self);
})();
