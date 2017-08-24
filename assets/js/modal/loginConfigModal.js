window.LoginConfigModal = (function($, LoginConfigModal) {
    var $modal;  // $("#loginConfigModal");
    var modalHelper;

    LoginConfigModal.setup = function() {
        $modal = $("#loginConfigModal");
        modalHelper = new ModalHelper($modal, {
            "noResize": true
        });

        $modal.on("click", ".close, .cancel", closeModal);
        setupListeners();

        var signOnUrl=hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigWAADSignOnUrl").text(signOnUrl);
    };

    LoginConfigModal.show = function() {
        modalHelper.setup();
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

    function submitForm() {
        closeModal();
    };

    function closeModal() {
        modalHelper.clear();
    };

    return (LoginConfigModal);
}(jQuery, {}));
