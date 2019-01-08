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
        var client = new xce.XceClient(xcHelper.getAppUrl() + "/service/xce/");
        var licenseService = new xce.LicenseService(client);
        var updateRequest = new proto.xcalar.compute.localtypes.License.UpdateRequest();
        var licenseValue = new proto.xcalar.compute.localtypes.License.LicenseValue();

        var newLicense = $modal.find(".newLicenseKey").val();
        licenseValue.setValue(newLicense);
        updateRequest.setLicensevalue(licenseValue);

        licenseService.update(updateRequest)
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
