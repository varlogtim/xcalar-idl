window.AboutModal = (function($, AboutModal) {
    var $modal;  // $("#aboutModal");
    var modalHelper;

    AboutModal.setup = function() {
        $modal = $("#aboutModal");
        modalHelper = new ModalHelper($modal, {
            "noResize"    : true,
            "noBackground": true,
            "center"      : {"verticalQuartile": true}
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close", closeModal);
    };

    AboutModal.show = function() {
        modalHelper.setup();

        // XXX todos: Merge fontVersion and backVersion into one version
        var frontVersion = XVM.getVersion();
        var backVersion = XVM.getSHA().substring(0, 8);

        $modal.find(".frontVersion .text").text(frontVersion);
        $modal.find(".backVersion .text").text(backVersion);
    };

    function closeModal() {
        modalHelper.clear();
    }

    return (AboutModal);
}(jQuery, {}));
