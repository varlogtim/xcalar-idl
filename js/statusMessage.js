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
    var rotatePosition = 0;
    var isFailed = false;
    var inScroll;

    Message.prototype.show = function(msg) {
        if ($('#statusSuccess').length > 0) {
            return;
        }
        var msg = msg || StatusMessageTStr.Loading;
        messages.push(msg);

        if (messages.length == 1) {
            $statusText.append('<span>'+msg+'</span><span>'+msg+'</span>');
            // we append twice in order to make a full cycle for the carousel
        } else {
            $statusText.children('span:last-child')
                .before('<span>'+msg+'</span>');
        }

        inScroll = scrollToMessage().then(function() {
            $('#viewLocation').remove();

            if (isFailed) {
                $('.statusFail').remove();
                isFailed = false; 
            } 
            
            if (rotatePosition >= messages.length) {
                $statusText.scrollTop(0);
                rotatePosition = 0;
            }
        }).promise();

        $waitingIcon.fadeIn(100);
        if (messages.length === 2) {
            clearInterval(rotateInterval);
            rotateMessages();
        }
        
        isLoading = true;
        return (self);
    }

    //XX we need a good way to queue messages 
    // and keep track of which message to show.


    Message.prototype.success = function(msg) {
        inScroll.then(function() {
            if (isFailed) {
                // XX currently, if one message succeeds and the other fails,
                // we skip the success message and just show the fail.
                // This is only a workaround for now
                messages.splice(messages.indexOf(msg), 1);
                clearInterval(rotateInterval);
            } else {
                finishWaiting(msg);
                var successHTML = '<span id="statusSuccess">'+
                                  StatusMessageTStr.Success+
                                  '</span>';
                $statusText.children('span')
                           .eq(rotatePosition)
                           .after(successHTML);

                scrollToMessage().then(function() {
                    clear();
                });
            }
            
        });
        
        return (self);
    };

    Message.prototype.fail = function(failMessage, msg) {
        var failMessage = failMessage || StatusMessageTStr.Error;
        var failHTML = '<span class="statusFail">'+
                       '<span class="text">'+failMessage+'</span>'+
                       '<span class="icon close"></span>'+
                       '</span>';
        
        inScroll.then(function() {
            isFailed = true;
            $statusText.children('span').eq(rotatePosition).after(failHTML);
            finishWaiting(msg);
            scrollToMessage().then(function(){
                $statusText.children('span').not('.statusFail').remove();
                $statusText.find('.statusFail').not(':last-of-type').remove();
                rotatePosition = 0;
            });
        });
        
        return (self);
    }

    Message.prototype.isFailed = function(){
        return isFailed;
    }

    Message.prototype.updateLocation = function() {
        if (!isLoading) {
            var currentPanel = $.trim($('.mainMenuTab.active').text());
            var locationHTML = '<span id="viewLocation">' +
                               StatusMessageTStr.Viewing + " " + 
                               currentPanel+'</span>';
            $statusText.html(locationHTML);
        }
    }

    function rotateMessages() {
        rotatePosition = 0;
        rotateInterval = setInterval(function() {
            scrollToMessage().then(function() {
                if (rotatePosition >= messages.length) {
                    $statusText.scrollTop(0);
                    rotatePosition = 0;
                }
            });
        }, rotationTime);
    }

    function clear() {
        $statusText.children('span')
            .not('#statusSuccess, .statusFail')
            .remove();

        setTimeout(function() {
            self.updateLocation();
            rotatePosition = 0;
            messages = [];
        }, 2000);

        return (self);
    };

    function finishWaiting(msg) {
        isLoading = false;
        messages.splice(messages.indexOf(msg), 1);
        $waitingIcon.hide();
        if (messages.length <= 1) {
            clearInterval(rotateInterval);
        }
    }

    function scrollToMessage() {
        var scrollAnimation = $statusText.animate({
            scrollTop : 20 * (++rotatePosition)
        }, scrollSpeed).promise();
        return (scrollAnimation);
    }

    $statusText.on('click', '.close', function() {
        self.updateLocation();
    });
    
    return (self);
})();
