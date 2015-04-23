// StatuxBox Modal
window.StatusBox = (function($, StatusBox){
    var $statusBox = $("#statusBox");

    StatusBox.show = function(text, $target, isFormMode, offset) {
        // position error message
        var top = $target[0].getBoundingClientRect().top - 30;
        var right = $(window).width() - 
                    $target[0].getBoundingClientRect().right- 200;

        if (offset) {
            right = right + offset;
        }

        $statusBox.css({top: top, right: right});

        $statusBox.addClass('error');
        $statusBox.find('.titleText').text('Error');
        $statusBox.find('.message').text(text);

        if (isFormMode) {
            $(document).mousedown({target: $target}, hideStatusBox);
            $target.keydown({target: $target}, hideStatusBox);
            $target.focus().addClass('error');
        } else {
            $(document).mousedown(hideStatusBox);
            $(document).keydown(hideStatusBox);
        }
    }

    function hideStatusBox(event) {
        if (event.data && event.data.target) {
            var id = $(event.target).attr('id');

            if (id === "statusBoxClose" ||
                id != event.data.target.attr('id') || 
                event.type == "keydown") 
            {
                $(document).off('mousedown', hideStatusBox);
                event.data.target.off('keydown', hideStatusBox)
                                 .removeClass('error');
                clear();
            }

        } else {
            $(document).off('mousedown', hideStatusBox);
            $(document).off('keydown', hideStatusBox);
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
