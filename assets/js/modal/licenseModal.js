window.LicenseModal = (function($, LicenseModal) {
    var $modal;  // $("#licenseModal");
    var modalHelper;

    LicenseModal.setup = function() {
        $modal = $("#licenseModal");
        var minWidth = 340;
        var minHeight = 220;

        modalHelper = new ModalHelper($modal, {
            "minWidth" : minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            // "handles"    : "n, e, s, w, se",
            "handles"    : "e, w",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close, .cancel", closeModal);

        setupListeners();
    };

    LicenseModal.show = function() {
        modalHelper.setup();

        // var licenseKey = XVM.getLicenseKey();
        var licenseKey = "123456789";

        $modal.find(".newLicenseKey").attr('placeholder', licenseKey);
    };

    function setupListeners() {
        $modal.find('.confirm').click(submitForm);
    }

    function submitForm() {
        closeModal();
        xcHelper.showSuccess();
    }

    function closeModal() {
        modalHelper.clear();
    }

    return (LicenseModal);
}(jQuery, {}));
