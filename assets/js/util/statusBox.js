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
        

        // position the message
        $statusBox.addClass("active"); // shows the box
        var bound = $target[0].getBoundingClientRect();
        var top   = bound.top - 30;
        var right = $(window).width() - bound.right - $statusBox.width() - 12;
        var left = bound.left - $statusBox.width() - 12;
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

        if (side === 'left') {
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else if (side === 'top') {
            left = (bound.left + ($target.width() / 2) - 100) + offsetX;
            var statusBoxHeight = $statusBox.height();
            top = bound.top - statusBoxHeight - 15 + offsetY;
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else if (side === "bottom") {
            left = (bound.left + ($target.width() / 2) - 100) + offsetX;
            top = bound.bottom + offsetY;
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else {
            $statusBox.css({top: top, right: right, left: 'auto'});
        }

        if (options.closeable) {
            $(window).blur(hideStatusBox);
        }

        open = true;
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
