window.ExtModal = (function($, ExtModal){
    var $extModal;   // $("#extModal")
    var $btnSection; // $("#extActions")

    /**
        Options currently has one option only. onClose which should
        be a function decl.
    */
    ExtModal.setup = function(options) {
        $extModal = $("#extModal");
        $btnSection = $("#extActions");

        $extModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $extModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : 700,
            "minWidth"   : 700,
            "containment": "document"
        });

        $extModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();

            closeExtModal();
        });
    };

    ExtModal.show = function(options) {

        // Note that alert Modal's center position
        // is different from other modal, need this handle
        var $window = $(window);
        var winHeight   = $window.height();
        var winWidth    = $window.width();
        var modalWidth  = $extModal.width();
        var modalHeight = $extModal.height();

        var left = ((winWidth - modalWidth) / 2);
        var top  = ((winHeight - modalHeight) / 4);

        $extModal.css({
            "left": left,
            "top" : top
        });

        $extModal.show();
    };

    function closeExtModal() {
        $btnSection.find(".funcBtn").remove();
        $extModal.hide();
    }

    return (ExtModal);
}(jQuery, {}));
