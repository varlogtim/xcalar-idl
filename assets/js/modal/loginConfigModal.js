window.LoginConfigModal = (function($, LoginConfigModal) {
    var $modal;  // $("#loginConfigModal");
    var modalHelper;
    var waadConfig;
    var defaultAdminConfig;

    LoginConfigModal.setup = function() {
        $modal = $("#loginConfigModal");
        modalHelper = new ModalHelper($modal, {});

        $modal.on("click", ".close, .cancel", closeModal);
        setupListeners();

        var signOnUrl=hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigWAADSignOnUrl").text(signOnUrl);
    };

    LoginConfigModal.show = function(waadConfigIn, defaultAdminConfigIn) {
        waadConfig = waadConfigIn;
        defaultAdminConfig = defaultAdminConfigIn;
        modalHelper.setup();

        if (waadConfig !== null) {
            if (waadConfig.waadEnabled) {
                $("#loginConfigEnableWAAD").find(".checkbox").addClass("checked");
                $("#loginConfigEnableWAAD").next().removeClass("xc-hidden");
            }

            $("#loginConfigWAADTenant").val(waadConfig.tenant);
            $("#loginConfigWAADClientId").val(waadConfig.clientId);
        }

        if (defaultAdminConfig !== null) {
            if (defaultAdminConfig.defaultAdminEnabled) {
                $("#loginConfigEnableDefaultAdmin").find(".checkbox").addClass("checked");
                $("#loginConfigEnableDefaultAdmin").next().removeClass("xc-hidden");
            }

            $("#loginConfigAdminUsername").val(defaultAdminConfig.username);
            $("#loginConfigAdminEmail").val(defaultAdminConfig.email);
            $("#loginConfigAdminPassword").val("");
            $("#loginConfigAdminConfirmPassword").val("");
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

    function submitDefaultAdminConfig() {
        var deferred = jQuery.Deferred();

        var defaultAdminEnabled = $("#loginConfigEnableDefaultAdmin").find(".checkbox").hasClass("checked");
        var adminUsername = $("#loginConfigAdminUsername").val();
        var adminEmail = $("#loginConfigAdminEmail").val();
        var adminPassword = $("#loginConfigAdminPassword").val();
        var adminConfirmPassword = $("#loginConfigAdminConfirmPassword").val();

        if (adminPassword != adminConfirmPassword) {
            deferred.reject(LoginConfigTStr.PasswordMismatch, false);
        } else if (defaultAdminConfig.defaultAdminEnabled != defaultAdminEnabled ||
                   defaultAdminConfig.username != adminUsername ||
                   defaultAdminConfig.email != adminEmail ||
                   adminPassword.trim() != "") {
            console.log("defaultAdminChanged");
            if (defaultAdminEnabled) {
                if (adminPassword.trim() == "") {
                    return (deferred.reject(LoginConfigTStr.EmptyPasswordError, false).promise());
                } else if (adminUsername.trim() == "") {
                    return (deferred.reject(LoginConfigTStr.EmptyUsernameError, false).promise());
                } else if (adminEmail.trim() == "") {
                    return (deferred.reject(LoginConfigTStr.EmptyEmailError, false).promise());
                }
            }
            setDefaultAdminConfig(hostname, defaultAdminEnabled, adminUsername, adminPassword, adminEmail)
            .then(deferred.resolve)
            .fail(function(errorMsg) {
                deferred.reject(errorMsg, true);
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function submitWaadConfig() {
        var deferred = jQuery.Deferred();
        var waadEnabled = $("#loginConfigEnableWAAD").find(".checkbox").hasClass("checked");
        var tenant = $("#loginConfigWAADTenant").val();
        var clientId = $("#loginConfigWAADClientId").val();
        if (waadConfig.waadEnabled != waadEnabled ||
            waadConfig.tenant != tenant ||
            waadConfig.clientId != clientId) {
            console.log("waadConfig changed: " + tenant)
            setWaadConfig(hostname, waadEnabled, tenant, clientId)
            .then(deferred.resolve)
            .fail(function(errorMsg) {
                deferred.reject(errorMsg, true);
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    function submitForm() {
        submitDefaultAdminConfig()
        .then(submitWaadConfig)
        .then(function() {
            xcHelper.showSuccess(LoginConfigTStr.LoginConfigSavedSuccess);
            closeModal();
        })
        .fail(function(errorMsg, isFatal) {
            if (isFatal) {
                xcHelper.showFail(errorMsg);
                closeModal();
            } else {
                Alert.show( {
                    "title": ErrorMessageTStr.title,
                    "msg": errorMsg,
                    "isAlert": true
                });
            }
        })
    };

    function closeModal() {
        waadConfig = null;
        defaultAdminConfig = null;
        modalHelper.clear();
    };

    return (LoginConfigModal);
}(jQuery, {}));
