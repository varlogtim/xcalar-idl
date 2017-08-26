window.LoginConfigModal = (function($, LoginConfigModal) {
    var $modal;  // $("#loginConfigModal");
    var modalHelper;
    var waadConfig;

    LoginConfigModal.setup = function() {
        $modal = $("#loginConfigModal");
        modalHelper = new ModalHelper($modal, {});

        $modal.on("click", ".close, .cancel", closeModal);
        setupListeners();

        var signOnUrl=hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigWAADSignOnUrl").text(signOnUrl);
    };

    LoginConfigModal.show = function(waadConfigIn) {
        waadConfig = waadConfigIn;
        modalHelper.setup();

        if (waadConfigIn !== null) {
            if (waadConfig.waadEnabled) {
                $("#loginConfigEnableWAAD").find(".checkbox").addClass("checked");
                $("#loginConfigEnableWAAD").next().removeClass("xc-hidden");
            }

            $("#loginConfigWAADTenant").val(waadConfig.tenant);
            $("#loginConfigWAADClientId").val(waadConfig.clientId);
        }
    };

    function setupListeners() {
        $modal.find(".confirm").click(submitForm);

        $modal.find(".loginSectionToggle").click(function() {
            $(this).find(".checkbox").toggleClass("checked");
            $(this).next().toggleClass("xc-hidden");
        });

        $("#loginConfigLdapEnableTLS").click(function() {
            $(this).toggleClass("checked");
        });

        $modal.find(".radioButton").click(function() {
            if ($(this).hasClass("active")) {
                return;
            }
            $(this).closest(".radioButtonGroup").find(".radioButton")
                   .removeClass("active");
            $(this).addClass("active");
        });
    };

    function submitWaadConfig() {
        var waadEnabled = $("#loginConfigEnableWAAD").find(".checkbox").hasClass("checked");
        var tenant = $("#loginConfigWAADTenant").val();
        var clientId = $("#loginConfigWAADClientId").val();
        return setWaadConfig(hostname, waadEnabled, tenant, clientId); 
    }

    function submitForm() {
        submitWaadConfig()
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.LoginConfigSaved);
        })
        .fail(function() {
            xcHelper.showFail(FailTStr.LoginConfigSaveFailed);
        })
        .always(function() {
            closeModal();
        });
    };

    function closeModal() {
        modalHelper.clear();
    };

    return (LoginConfigModal);
}(jQuery, {}));
