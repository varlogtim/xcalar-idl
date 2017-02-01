window.AboutModal = (function($, AboutModal) {
    var $modal;  // $("#aboutModal");
    var modalHelper;

    AboutModal.setup = function() {
        $modal = $("#aboutModal");
        modalHelper = new ModalHelper($modal, {
            "noResize": true,
            "noBackground": true,
            "center": {"verticalQuartile": true}
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close", closeModal);
    };

    AboutModal.show = function() {
        modalHelper.setup();

        // There are 4 variables here, 2 of which must match in order to talk
        // gGitVersion is populated in prodBuilds
        var frontVersion = XVM.getVersion() + "-" + gGitVersion;
        var backVersionParts = XVM.getBackendVersion().split("-");
        var backVersion = backVersionParts[0] + "-" +
                          backVersionParts[backVersionParts.length - 1];
        var thriftVersion = XVM.getSHA().substring(0, 8);
        // Both backend and front end must
        // have the same thrift version or they won't talk

        var licenseKey = XVM.getLicenseKey();
        var capitalize = xcHelper.capitalize(XVM.getLicenseMode());
        $modal.find(".mode .text").text(" - " + capitalize + " mode");
        $modal.find(".frontVersion .text").text(frontVersion);
        $modal.find(".backVersion .text").text(backVersion);
        $modal.find(".thriftVersion .text").text(thriftVersion);
        $modal.find(".license .text").text(licenseKey);
    };

    function closeModal() {
        modalHelper.clear();
    }

    return (AboutModal);
}(jQuery, {}));
