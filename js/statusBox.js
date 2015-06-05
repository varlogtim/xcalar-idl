// StatusBox Modal
window.StatusBox = (function($, StatusBox){
    var $statusBox = $("#statusBox");
    var $doc       = $(document);

    StatusBox.show = function(text, $target, isFormMode, offset, options) {
        // position error message
        var bound = $target[0].getBoundingClientRect();
        var top   = bound.top - 30;
        var right = $(window).width() - bound.right - 200;
        var left = bound.left - 200;

        if (offset) {
            right = right + offset;
        }
        if (options && options.side == 'left') {
            var side = options.side;
            $statusBox.css({top: top, left: left, right: 'auto'});
        } else {
            var side = 'right';
            $statusBox.css({top: top, right: right, left: 'auto'});
        }
       

        $statusBox.addClass('error '+side);
        $statusBox.find('.titleText').text('Error');
        $statusBox.find('.message').text(text);

        if (isFormMode) {
            $doc.mousedown({target: $target}, hideStatusBox);
            $target.keydown({target: $target}, hideStatusBox);
            $target.focus().addClass('error');
        } else {
            $doc.mousedown(hideStatusBox);
            $doc.keydown(hideStatusBox);
        }
    }

    function hideStatusBox(event) {
        if (event.data && event.data.target) {
            var id = $(event.target).attr('id');

            if (id === "statusBoxClose" ||
                id != event.data.target.attr('id') ||
                event.type == "keydown")
            {
                $doc.off('mousedown', hideStatusBox);
                event.data.target.off('keydown', hideStatusBox)
                                 .removeClass('error');
                clear();
            }

        } else {
            $doc.off('mousedown', hideStatusBox);
            $doc.off('keydown', hideStatusBox);
            clear();
        }
    }

    function clear() {
        $statusBox.removeClass();
        $statusBox.find('.titleText').text('');
        $statusBox.find('.message').text('');
    }

    return (StatusBox);
}(jQuery, {}));
