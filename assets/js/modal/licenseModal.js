window.LicenseModal = (function($, LicenseModal) {
    var $modal;  // $("#licenseModal");
    var modalHelper;

    LicenseModal.setup = function() {
        $modal = $("#licenseModal");
        var minWidth = 350;
        var minHeight = 220;

        modalHelper = new ModalHelper($modal, {
            "minWidth": minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles": "e, w",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
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
        XcalarUpdateLicense($modal.find(".newLicenseKey").val())
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.UpdateLicense);
        })
        .fail(function(error) {
            xcHelper.showFail("Update License " + error.error);
        });
        closeModal();
    }

    function closeModal() {
        modalHelper.clear();
        $modal.find(".newLicenseKey").val("");
    }

    return (LicenseModal);
}(jQuery, {}));
