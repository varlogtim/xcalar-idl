window.LicenseModal = (function($, LicenseModal) {
    var $modal;  // $("#licenseModal");
    var modalHelper;

    LicenseModal.setup = function() {
        $modal = $("#licenseModal");
        modalHelper = new ModalHelper($modal, {
            "noResize": true
        });

        $modal.on("click", ".close, .cancel", closeModal);

        setupListeners();
    };

    LicenseModal.show = function() {
        modalHelper.setup();

        var licenseKey = "123456789";
        $modal.find(".newLicenseKey").attr("placeholder", licenseKey);
    };

    function setupListeners() {
        $modal.find(".confirm").click(submitForm);
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
