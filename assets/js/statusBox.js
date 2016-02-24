// StatusBox Modal
window.StatusBox = (function($, StatusBox){
    var $statusBox = $("#statusBox");
    var $doc = $(document);
    var $targetInput;
    var open = false;

    StatusBox.show = function(text, $target, isFormMode, options) {
        options =  options || {};
        // position the message
        var msgType = options.type || "error";
        var bound = $target[0].getBoundingClientRect();
        var top   = bound.top - 30;
        var right = $(window).width() - bound.right - 200;
        var left = bound.left - 200;
        var side;
        $targetInput = $target;

        if (options.side) {
            side = options.side;
        } else {
            side = 'right';
        }

        if (options.offset) {
            if (side === 'right') {
                right += options.offset;
            } else {
                left += options.offset;
            }
        }

        $statusBox.addClass(msgType + " active " + side);
        $statusBox.find('.titleText').text('Error');
        $statusBox.find('.message').text(text);

        if (side === 'left') {
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else if (side === 'top') {
            left = bound.left + ($target.width() / 2) - 100;
            var statusBoxHeight = $statusBox.height();
            top = bound.top - statusBoxHeight - 15;
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else {
            $statusBox.css({top: top, right: right, left: 'auto'});
        }

        if (options.closeable) {
            $(window).blur(hideStatusBox);
        }

        if (isFormMode) {
            $doc.mousedown({target: $target}, hideStatusBox);
            $target.keydown({target: $target}, hideStatusBox);
            $target.focus().addClass(msgType);
        } else {
            $doc.mousedown(hideStatusBox);
            $doc.keydown(hideStatusBox);
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
                                 .removeClass('active');
                clear();
            }

        } else {
            $doc.off('mousedown', hideStatusBox);
            $doc.off('keydown', hideStatusBox);
            clear();
        }
        open = false;
    }

    function clear() {
        $statusBox.removeClass();
        $statusBox.find('.titleText').text('');
        $statusBox.find('.message').text('');
    }

    return (StatusBox);
}(jQuery, {}));
