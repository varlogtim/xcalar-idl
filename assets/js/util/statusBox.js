// StatusBox Modal
window.StatusBox = (function($, StatusBox){
    var $statusBox; // $("#statusBox");
    var $doc;       // $(document);
    var $targetInput;
    var open = false;

    setupListeners();

    /*
     * options:
     *      type: string, "error", "info"
     *      offsetX: int,
     *      offsetY: int,
     *      side: 'top', 'bottom', 'left', 'right' (if not provided, box will
     *      default to the right side of the $target)
     *      highZindex: boolean, if true will add class to bring statusbox
     *                  z-index above locked background z-index,
     *      preventImmediateHide: boolean, if true, will set timeout that will
     *                          prevent closing for a split second (useful if
     *                          scroll event tries to close status box)
     *      persist: if set true, the box will not hide unless click
     *               on close button,
     *      detail: string, extra information text to display
     *      delayHide: number of milliseconds to delay ability to hide box
     */
    StatusBox.show = function(text, $target, isFormMode, options) {
        $statusBox = $("#statusBox");
        $doc = $(document);
        options = options || {};
        var msgType = options.type || "error";
        if (!$target.length) {
            // XXX this shouldn't happen but it has before
            return;
        }

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
        $statusBox.removeClass();
        if (options.highZindex) {
            $statusBox.addClass('highZindex');
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
            left = (bound.left + ($target.outerWidth() / 2) -
                    (statusBoxWidth / 2)) + offsetX;
            left = Math.min(left, winWidth - statusBoxWidth);
            var statusBoxHeight = $statusBox.height();
            top = bound.top - statusBoxHeight - 15 + offsetY;
        } else if (side === "bottom") {
            left = (bound.left + ($target.outerWidth() / 2) -
                    (statusBoxWidth / 2)) + offsetX;
            top = bound.bottom + offsetY;
        }

        // prevent too far left
        left = Math.min(left, winWidth - statusBoxWidth - 10);
        // prevent too far right
        right = Math.max(right, 5);
        // prevent too far top
        top = Math.max(top, 0);

        if (side === "right") {
            $statusBox.css({top: top, right: right, left: 'auto'});
        } else {
            $statusBox.css({top: top, left: left, right: 'auto'});
        }

        if (options.preventImmediateHide) {
            var delay;
            if (options.delayHide) {
                delay = options.delayHide;
            } else {
                delay = 0;
            }
            setTimeout(function() {
                open = true;
            }, delay);
        } else {
            open = true;
        }

        if (options.detail) {
            $statusBox.addClass("hasDetail");
            $statusBox.find(".detailContent").text(options.detail);
        }

        if (options.persist) {
            $statusBox.addClass("persist");
        } else {
            $statusBox.removeClass("persist");
            $(window).on("blur.statusBoxBlur", hideStatusBox);
        }
    };

    StatusBox.forceHide = function() {
        if (open) {
            $targetInput.off('keydown', hideStatusBox).removeClass('error');
            clear();
        }
    };

    function setupListeners() {
        $("#statusBox").mousedown(function(event) {
            if (notPersist()) {
                event.stopPropagation();
                event.preventDefault();
                StatusBox.forceHide();
            }
        });

        $("#statusBox .detailAction").mousedown(function(event) {
            event.preventDefault();
            event.stopPropagation();
            $("#statusBox .detail").toggleClass("expand");
        });
    }

    function hideStatusBox(event) {
        var id = $(event.target).attr('id');
        if (event.data && event.data.target) {
            if (id === "statusBoxClose" ||
                !$(event.target).is(event.data.target) ||
                notPersist() && event.type === "keydown")
            {
                event.data.target.off('keydown', hideStatusBox)
                                 .removeClass(event.data.type);
                clear();
            }

        } else if (id === "statusBoxClose" || notPersist()) {
            clear();
        }
    }

    function notPersist() {
        return !$statusBox.hasClass("persist");
    }

    function clear() {
        open = false;
        $doc.off('mousedown', hideStatusBox);
        $doc.off('keydown', hideStatusBox);
        $(window).off("blur.statusBoxBlur");
        $statusBox.removeClass();
        $statusBox.find('.titleText').text('');
        $statusBox.find('.message').text('');
        $statusBox.find(".detail").removeClass("expand")
                  .find(".detailContent").text("");
    }

    return (StatusBox);
}(jQuery, {}));