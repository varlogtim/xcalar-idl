// StatusBox Modal
window.StatusBox = (function($, StatusBox){
    var $statusBox; // $("#statusBox");
    var $doc;       // $(document);
    var $targetInput;
    var open = false;

    // options:
    //      type: string, "error", "info"
    //      offsetX: int,
    //      offsetY: int,
    //      side: 'top', 'bottom', 'left', 'right' (if not provided, box will
    //      default to the right side of the $target)
    //      highZindex: boolean, if true will add class to bring statusbox
    //                  z-index above locked background z-index,
    //      preventImmediateHide: boolean, if true, will set timeout that will
    //                          prevent closing for a split second (useful if
    //                          scroll event tries to close status box)
    StatusBox.show = function(text, $target, isFormMode, options) {
        $statusBox = $("#statusBox");
        $doc = $(document);
        options = options || {};
        var msgType = options.type || "error";
        
        // focus moves scrollbar position so focus first before we get
        // the position of the input
        $target.focus();
        if (isFormMode) {
            $doc.mousedown({"target": $target, "type": msgType}, hideStatusBox);
            $target.keydown({"target": $target, "type": msgType}, hideStatusBox);
            $target.addClass(msgType);
        } else {
            $doc.mousedown(hideStatusBox);
            $doc.keydown(hideStatusBox);
        }
        if (options.highZindex) {
            $statusBox.addClass('highZindex');
        } else {
            $statusBox.removeClass('highZindex');
        }

        // position the message
        $statusBox.addClass("active"); // shows the box
        var bound = $target[0].getBoundingClientRect();
        var winWidth = $(window).width();
        var statusBoxWidth = $statusBox.width();
        var top   = bound.top - 30;
        var right = winWidth - bound.right - statusBoxWidth - 12;
        var left = bound.left - statusBoxWidth - 12;
        var side;
        var title;
        var offsetX = 0;
        var offsetY = 0;

        // add more title if msgType is extended
        if (msgType === "info") {
            title = "Information";
        } else {
            title = "Error";
        }

        $targetInput = $target;

        if (options.side) {
            side = options.side;
        } else {
            side = 'right';
        }

        if (options.offsetX) {
            if (side === 'right') {
                right += options.offsetX;
            } else {
                left += options.offsetX;
            }
            offsetX = options.offsetX;
        }
        if (options.offsetY) {
            offsetY = options.offsetY;
            top += offsetY;
        }

        $statusBox.addClass(msgType + " " + side);
        $statusBox.find('.titleText').text(title);
        if (options.html) {
            $statusBox.find('.message').html(text);
        } else {
            $statusBox.find('.message').text(text);
        }
       
        if (side === 'top') {
            left = (bound.left + ($target.width() / 2) - 100) + offsetX;
            left = Math.min(left, winWidth - statusBoxWidth);
            var statusBoxHeight = $statusBox.height();
            top = bound.top - statusBoxHeight - 15 + offsetY; 
        } else if (side === "bottom") {
            left = (bound.left + ($target.width() / 2) - 100) + offsetX;
            top = bound.bottom + offsetY;
        }

        // prevent too far left
        left = Math.min(left, winWidth - statusBoxWidth);
        // prevent too far right
        right = Math.max(right, 0);
        // prevent too far top
        top = Math.max(top, 0);

        if (side === "right") {
            $statusBox.css({top: top, right: right, left: 'auto'});
        } else {
            $statusBox.css({top: top, left: left, right: 'auto'});
        }

        if (options.closeable) {
            $(window).blur(hideStatusBox);
        }

        if (options.preventImmediateHide) {
            setTimeout(function() {
                open = true;
            });
        } else {
            open = true;
        }        
    };

    StatusBox.forceHide = function() {
        if (open) {
            $doc.off('mousedown', hideStatusBox);
            $doc.off('keydown', hideStatusBox);
            $targetInput.off('keydown', hideStatusBox).removeClass('error');
            clear();
            open = false;
        }
    };

    function hideStatusBox(event) {
        if (event.data && event.data.target) {
            var id = $(event.target).attr('id');
            if (id === "statusBoxClose" ||
                id !== event.data.target.attr('id') ||
                event.type === "keydown")
            {
                $doc.off('mousedown', hideStatusBox);
                event.data.target.off('keydown', hideStatusBox)
                                 .removeClass(event.data.type);
                clear();
            }

        } else {
            $doc.off('mousedown', hideStatusBox);
            $doc.off('keydown', hideStatusBox);
            clear();
        }
    }

    function clear() {
        open = false;
        $statusBox.removeClass();
        $statusBox.find('.titleText').text('');
        $statusBox.find('.message').text('');
    }

    return (StatusBox);
}(jQuery, {}));
