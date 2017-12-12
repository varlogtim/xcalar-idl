window.LoginConfigModal = (function($, LoginConfigModal) {
    var $modal;  // $("#loginConfigModal");
    var modalHelper;
    var waadConfig;
    var defaultAdminConfig;
    var ldapConfig;
    var ldapChoice = "ldap";

    LoginConfigModal.setup = function() {
        $modal = $("#loginConfigModal");
        modalHelper = new ModalHelper($modal, {});

        $modal.on("click", ".close, .cancel", closeModal);
        setupListeners();

        var signOnUrl=hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigWAADSignOnUrl").text(signOnUrl);
    };

    LoginConfigModal.show = function(waadConfigIn, defaultAdminConfigIn, ldapConfigIn) {
        waadConfig = waadConfigIn;
        defaultAdminConfig = defaultAdminConfigIn;
        ldapConfig = ldapConfigIn;

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

        if (ldapConfig !== null) {
            if (ldapConfig.ldapConfigEnabled) {
                $("#loginConfigEnableLdapAuth").find(".checkbox").addClass("checked");
                $("#loginConfigEnableLdapAuth").next().removeClass("xc-hidden");
            }

            $("#loginConfigLdapUrl").val(ldapConfig.ldap_uri);
            $("#loginConfigLdapUserDn").val(ldapConfig.userDN);
            $("#loginConfigLdapSearchFilter").val(ldapConfig.searchFilter);
            $("#loginConfigLdapServerKeyFile").val(ldapConfig.serverKeyFile);

            if (ldapConfig.useTLS) {
                $("#loginConfigLdapEnableTLS").addClass("checked");
            }

            if (ldapConfig.activeDir) {
                $("#ldapChoice").find(".radioButton").eq(0).click();
                $("#loginConfigADUserGroup").val(ldapConfig.adUserGroup);
                $("#loginConfigADAdminGroup").val(ldapConfig.adAdminGroup);
                $("#loginConfigADDomain").val(ldapConfig.adDomain);
                if (loginConfig.adSubGroupTree) {
                    $("#loginConfigEnableADGroupChain").addClass("checked");
                }
            } else {
                $("#ldapChoice").find(".radioButton").eq(1).click();
            }
        }
    };

    function setupListeners() {
        $modal.find(".confirm").click(submitForm);

        $modal.find(".loginSectionToggle").click(function() {
            $(this).find(".checkbox").toggleClass("checked");
            $(this).next().toggleClass("xc-hidden");
        });

        $("#loginConfigEnableADGroupChain").click(function() {
            $(this).toggleClass("checked");
        });

        $("#loginConfigLdapEnableTLS").click(function() {
            $(this).toggleClass("checked");
        });

        xcHelper.optionButtonEvent($("#ldapChoice"), function(option) {
            ldapChoice = option;
        });
    }

    function submitDefaultAdminConfig() {
        var deferred = jQuery.Deferred();

        var defaultAdminEnabled = $("#loginConfigEnableDefaultAdmin").find(".checkbox").hasClass("checked");
        var adminUsername = $("#loginConfigAdminUsername").val();
        var adminEmail = $("#loginConfigAdminEmail").val();
        var adminPassword = $("#loginConfigAdminPassword").val();
        var adminConfirmPassword = $("#loginConfigAdminConfirmPassword").val();

        if (defaultAdminConfig == null) {
            if (defaultAdminEnabled) {
                defaultAdminConfig = {};
            } else {
                return deferred.resolve().promise();
            }
        }

        if (adminPassword !== adminConfirmPassword) {
            deferred.reject(LoginConfigTStr.PasswordMismatch, false);
        } else if (defaultAdminConfig.defaultAdminEnabled !== defaultAdminEnabled ||
                   defaultAdminConfig.username !== adminUsername ||
                   defaultAdminConfig.email !== adminEmail ||
                   adminPassword.trim() !== "") {
            if (defaultAdminEnabled) {
                if (adminPassword.trim() === "") {
                    return (deferred.reject(LoginConfigTStr.EmptyPasswordError, false).promise());
                } else if (adminUsername.trim() === "") {
                    return (deferred.reject(LoginConfigTStr.EmptyUsernameError, false).promise());
                } else if (adminEmail.trim() === "") {
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

        if (waadConfig == null) {
            if (waadEnabled) {
                waadConfig = {};
            } else {
                return deferred.resolve().promise();
            }
        }

        if (waadConfig.waadEnabled !== waadEnabled ||
            waadConfig.tenant !== tenant ||
            waadConfig.clientId !== clientId) {
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

    function submitLdapConfig() {
        var deferred = jQuery.Deferred();
        var ldapConfigEnabled = $("#loginConfigEnableLdapAuth").find(".checkbox").hasClass("checked");
        var activeDir = (ldapChoice === "ad") ? true : false;
        var ldap_uri = $("#loginConfigLdapUrl").val();
        var userDN = $("#loginConfigLdapUserDn").val();
        var searchFilter = $("#loginConfigLdapSearchFilter").val();
        var enableTLS = $("#loginConfigLdapEnableTLS").hasClass("checked") ? true : false;
        var serverKeyFile = $("#loginConfigLdapServerKeyFile").val();
        var adUserGroup = $("#loginConfigADUserGroup").val();
        var adAdminGroup = $("#loginConfigADAdminGroup").val();
        var adDomain = $("#loginConfigADDomain").val();
        var adSubGroupTree =
            $("#loginConfigEnableADGroupChain").hasClass("checked") ? true : false;

        if (ldapConfig == null) {
            if (ldapConfigEnabled) {
                ldapConfig = {};
            } else {
                return deferred.resolve().promise();
            }
        }

        if (ldapConfig.ldapConfigEnabled !== ldapConfigEnabled ||
            ldapConfig.ldap_uri !== ldap_uri ||
            ldapConfig.activeDir !== activeDir ||
            ldapConfig.userDN !== userDN ||
            ldapConfig.searchFilter !== searchFilter ||
            ldapConfig.enableTLS !== enableTLS ||
            ldapConfig.serverKeyFile !== serverKeyFile ||
            ldapConfig.adUserGroup !== adUserGroup ||
            ldapConfig.adAdminGroup !== adAdminGroup ||
            ldapConfig.adDomain !== adDomain ||
            ldapConfig.adSubGroupTree !== adSubGroupTree)
        {
            setLdapConfig(hostname, ldapConfigEnabled, ldap_uri, userDN, enableTLS, searchFilter,
                          activeDir, serverKeyFile, adUserGroup, adAdminGroup, adDomain, adSubGroupTree)
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
        .then(submitLdapConfig)
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
        });
    }

    function closeModal() {
        waadConfig = null;
        defaultAdminConfig = null;
        ldapConfig = null;
        modalHelper.clear();
    }

    return (LoginConfigModal);
}(jQuery, {}));
