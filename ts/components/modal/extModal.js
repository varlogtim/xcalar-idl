window.ExtModal = (function($, ExtModal){
    var modalHelper;
    /**
        Options currently has one option only. onClose which should
        be a function decl.
    */
    ExtModal.setup = function() {
        var $extModal = $("#extModal");

        modalHelper = new ModalHelper($extModal, {
            "center": {"verticalQuartile": true},
            "noBackground": true
        });

        $extModal.on("click", ".close, .cancel", function() {
            closeExtModal();
        });
    };

    ExtModal.show = function() {
        modalHelper.setup();
    };

    function closeExtModal() {
        $("#extActions").find(".funcBtn").remove();
        modalHelper.clear();
    }

    return (ExtModal);
}(jQuery, {}));
