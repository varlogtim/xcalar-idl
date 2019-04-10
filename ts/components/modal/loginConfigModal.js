window.LoginConfigModal = (function($, LoginConfigModal) {
    var $modal;  // $("#loginConfigModal");
    var modalHelper;
    var msalConfig;
    var defaultAdminConfig;
    var ldapConfig;
    var ldapChoice = "ldap";
    var strengthClasses = "veryWeak weak strong veryStrong invalid";

    LoginConfigModal.setup = function() {
        $modal = $("#loginConfigModal");
        modalHelper = new ModalHelper($modal, {});

        setupListeners();

        var signOnUrl = hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigMSALSignOnUrl").text(signOnUrl);
    };

    LoginConfigModal.show = function(msalConfigIn, defaultAdminConfigIn, ldapConfigIn) {
        setupConfig(msalConfigIn, defaultAdminConfigIn, ldapConfigIn);
        modalHelper.setup();

        if (msalConfig !== null) {
            if (msalConfig.msalEnabled) {
                $("#loginConfigEnableMSAL").find(".checkbox").addClass("checked");
                $("#loginConfigEnableMSAL").next().removeClass("xc-hidden");
            }

            $("#loginConfigMSALClientId").val(msalConfig.msal.clientId);
            $("#loginConfigMSALUserScope").val(msalConfig.msal.userScope);
            $("#loginConfigMSALAdminScope").val(msalConfig.msal.adminScope);

            $("#loginConfigMSALWebApi").val(msalConfig.msal.webApi);
            $("#loginConfigMSALAuthority").val(msalConfig.msal.authority);
            $("#loginConfigMSALAzureEndpoint").val(msalConfig.msal.azureEndpoint);
            $("#loginConfigMSALAzureScopes").val(msalConfig.msal.azureScopes.join(','));
            if (msalConfig.msal.b2cEnabled) {
                 $("#loginConfigMSALEnableB2C").addClass("checked");
            }
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
            $("#passwordStrengthHint").html("");
            $("#loginConfigAdminPassword").removeClass(strengthClasses);
            $("#passwordStrengthHint").removeClass(strengthClasses);
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
                if (ldapConfig.adSubGroupTree) {
                    $("#loginConfigEnableADGroupChain").addClass("checked");
                }
                if (ldapConfig.adSearchShortName) {
                    $("#loginConfigEnableADSearchShortName").addClass("checked");
                }
            } else {
                $("#ldapChoice").find(".radioButton").eq(1).click();
            }
        }
    };

    function setupConfig(msalConfigIn, defaultAdminConfigIn, ldapConfigIn) {
        msalConfig = msalConfigIn;
        defaultAdminConfig = defaultAdminConfigIn;
        ldapConfig = ldapConfigIn;
    }

    function setupListeners() {
        $modal.on("click", ".close, .cancel", closeModal);
        $modal.find(".confirm").click(submitForm);

        $modal.find(".loginSectionToggle").click(function() {
            $(this).find(".checkbox").toggleClass("checked");
            $(this).next().toggleClass("xc-hidden");
            if (($(this).attr('id') === "loginConfigEnableDefaultAdmin") &&
            (!$(this).find(".checkbox").hasClass("checked"))) {
                StatusBox.forceHide();
            }
        });

        $("#loginConfigEnableADGroupChain").click(function() {
            $(this).toggleClass("checked");
        });

        $("#loginConfigEnableADSearchShortName").click(function() {
            $(this).toggleClass("checked");
        });

        $("#loginConfigLdapEnableTLS").click(function() {
            $(this).toggleClass("checked");
        });

        $("#loginConfigMSALEnableB2C").click(function() {
            $(this).toggleClass("checked");
        });

        xcUIHelper.optionButtonEvent($("#ldapChoice"), function(option) {
            ldapChoice = option;
            if (option === "ad") {
                $modal.find(".adOnly").show();
            } else {
                $modal.find(".adOnly").hide();
            }
        });

        $("#loginConfigAdminPassword").on("focusout", function() {
            validatePassword($(this));
        });

        $("#loginConfigAdminPassword").on("keyup", function(e) {
            if (e.keyCode === keyCode.Enter) {
                validatePassword($(this));
            }
            calculatePasswordStrength($(this));
        });
    }

    function submitDefaultAdminConfig() {
        var deferred = PromiseHelper.deferred();

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
                   adminPassword !== "") {
            if (defaultAdminEnabled) {
                if (adminPassword === "") {
                    return deferred.reject(LoginConfigTStr.EmptyPasswordError, false).promise();
                } else if (adminUsername.trim() === "") {
                    return deferred.reject(LoginConfigTStr.EmptyUsernameError, false).promise();
                } else if (adminEmail.trim() === "") {
                    return deferred.reject(LoginConfigTStr.EmptyEmailError, false).promise();
                }
                var passwordStrength = getPasswordStrength(adminPassword, adminUsername.trim());
                if (passwordStrength.strength === "invalid") {
                    return deferred.reject(passwordStrength.hint, false).promise();
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

    function submitMSALConfig() {
        var deferred = PromiseHelper.deferred();
        var msalEnabled = $("#loginConfigEnableMSAL").find(".checkbox").hasClass("checked");
        var azureScopes = $("#loginConfigMSALAzureScopes").val();
        var msal = {
            clientId: $("#loginConfigMSALClientId").val(),
            userScope: $("#loginConfigMSALUserScope").val(),
            adminScope: $("#loginConfigMSALAdminScope").val(),
            b2cEnabled: $("#loginConfigMSALEnableB2C").hasClass("checked") ? true : false,
            webApi: $("#loginConfigMSALWebApi").val(),
            authority: $("#loginConfigMSALAuthority").val(),
            azureEndpoint: $("#loginConfigMSALAzureEndpoint").val(),
            azureScopes: azureScopes === "" ?
                [] : azureScopes.replace(/\s+/g, '').split(',')
        };


        if (msalConfig == null) {
            if (msalEnabled) {
                msalConfig = {
                    msal: {
                        azureScopes: []
                    }
                };
            } else {
                return deferred.resolve().promise();
            }
        }

        let hasDiffScopes = false;
        if (msalConfig.msal.azureScopes.length !== msal.azureScopes.length) {
            hasDiffScopes = true;
        } else {
            hasDiffScopes = msalConfig.msal.azureScopes.filter(function(scope, i) {
                return scope !== msal.azureScopes[i];
            }).length > 0;
        }

        if (msalConfig.msalEnabled !== msalEnabled ||
            msalConfig.msal.clientId !== msal.clientId ||
            msalConfig.msal.webApi !== msal.webApi ||
            msalConfig.msal.authority !== msal.authority ||
            msalConfig.msal.azureEndpoint !== msal.azureEndpoint ||
            hasDiffScopes ||
            msalConfig.msal.userScope !== msal.userScope ||
            msalConfig.msal.adminScope !== msal.adminScope ||
            msalConfig.msal.b2cEnabled !== msal.b2cEnabled) {
            setMSALConfig(hostname, msalEnabled, msal)
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
        var deferred = PromiseHelper.deferred();
        var ldapConfigEnabled = $("#loginConfigEnableLdapAuth").find(".checkbox").hasClass("checked");
        var ldap = {
            ldap_uri: $("#loginConfigLdapUrl").val(),
            userDN: $("#loginConfigLdapUserDn").val(),
            useTLS: $("#loginConfigLdapEnableTLS").hasClass("checked"),
            searchFilter: $("#loginConfigLdapSearchFilter").val(),
            activeDir: (ldapChoice === "ad") ? true : false,
            serverKeyFile: $("#loginConfigLdapServerKeyFile").val(),
            adUserGroup: $("#loginConfigADUserGroup").val(),
            adAdminGroup: $("#loginConfigADAdminGroup").val(),
            adDomain: $("#loginConfigADDomain").val(),
            adSubGroupTree: $("#loginConfigEnableADGroupChain").hasClass("checked"),
            adSearchShortName: $("#loginConfigEnableADSearchShortName").hasClass("checked")
        };

        if (ldapConfig == null) {
            if (ldapConfigEnabled) {
                ldapConfig = {};
            } else {
                return deferred.resolve().promise();
            }
        }

        if (ldapConfig.ldapConfigEnabled !== ldapConfigEnabled ||
            ldapConfig.ldap_uri !== ldap.ldap_uri ||
            ldapConfig.activeDir !== ldap.activeDir ||
            ldapConfig.userDN !== ldap.userDN ||
            ldapConfig.searchFilter !== ldap.searchFilter ||
            ldapConfig.enableTLS !== ldap.enableTLS || // XXX this is undefined
            ldapConfig.serverKeyFile !== ldap.serverKeyFile ||
            ldapConfig.adUserGroup !== ldap.adUserGroup ||
            ldapConfig.adAdminGroup !== ldap.adAdminGroup ||
            ldapConfig.adDomain !== ldap.adDomain ||
            ldapConfig.adSubGroupTree !== ldap.adSubGroupTree ||
            ldapConfig.adSearchShortName !== ldap.adSearchShortName)
        {
            setLdapConfig(hostname, ldapConfigEnabled, ldap)
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
        .then(submitMSALConfig)
        .then(submitLdapConfig)
        .then(function() {
            xcUIHelper.showSuccess(LoginConfigTStr.LoginConfigSavedSuccess);
            closeModal();
        })
        .fail(function(errorMsg, isFatal) {
            if (isFatal) {
                xcUIHelper.showFail(errorMsg);
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
        msalConfig = null;
        defaultAdminConfig = null;
        ldapConfig = null;
        modalHelper.clear();
        $("#passwordStrengthHint").html("");
        $("#loginConfigAdminPassword").removeClass(strengthClasses);
        $("#passwordStrengthHint").removeClass(strengthClasses);
        StatusBox.forceHide();
    }

    function validatePassword($input) {
        var userName = $("#loginConfigAdminUsername").val();
        var password = $("#loginConfigAdminPassword").val();
        var res = getPasswordStrength(password, userName);
        if ((res.strength === "invalid") && ($input.is(":visible"))) {
            StatusBox.show(res.hint, $input, false, {"persist": false});
        } else {
            StatusBox.forceHide();
        }
    }

    function calculatePasswordStrength($input) {
        var userName = $("#loginConfigAdminUsername").val();
        var password = $("#loginConfigAdminPassword").val();
        if (password === "") {
            $($input).removeClass(strengthClasses);
            $("#passwordStrengthHint").removeClass(strengthClasses);
            $("#passwordStrengthHint").html("");
            return;
        }
        var res = getPasswordStrength(password, userName);
        var classToShow = res.strength;
        var hintToShow = (res.strength === "invalid") ? LoginConfigTStr.invalid : res.hint;
        if (!$($input).hasClass(classToShow)) {
            $($input).removeClass(strengthClasses).addClass(classToShow);
            $("#passwordStrengthHint").removeClass(strengthClasses).addClass(classToShow);
        }
        if ($("#passwordStrengthHint").html() !== hintToShow) {
            $("#passwordStrengthHint").html(hintToShow);
        }
    }

    function getPasswordStrength(password, userName) {
        // MIN Solutions space: (26 * 2 + 10 + 31) ^ 7 = 93 ^ 7 = 6.017e+13
        // Single high-performance computer may attack 2 million keys per second
        // Time taken = 6.017e+13 / 2,000,000,000 = 30085 seconds
        // Do not consider minLength and maxLength currently
        // var minLength = 7;
        // var maxLength = 128;
        var upperLetterCount = 0;
        var lowerLetterCount = 0;
        var middleDigitCount = 0;
        var middleSymbolCount = 0;
        var digitCount = 0;
        var symbolCount = 0;
        var showsUp = {};
        var duplicateTimes = 0;
        var symbols = "`~!@#$%^&*_-+=|\:;\"\',.?/[](){}<>\\";
        var lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
        var upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var digits = "0123456789";
        var orderSymbols = "!@#$%^&*()_+";
        var scores = 0;
        var weakThreshold = 20;
        var strongThreshold = 60;
        var veryStrongThreshold = 80;

        // if (password.length < minLength) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.shortPassword
        //     }
        // }
        // if (password.length > maxLength) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.longPassword
        //     }
        // }
        var lowerCasePass = password.toLowerCase();
        var lowerCaseUserName = userName.toLowerCase();
        if ((lowerCaseUserName !== "") &&
            (lowerCasePass === lowerCaseUserName ||
            (lowerCasePass.indexOf(lowerCaseUserName) !== - 1 && lowerCaseUserName.length >= 3) ||
            (lowerCaseUserName.indexOf(lowerCasePass) !== - 1) && lowerCasePass.length >= 3)) {
            return {
                strength: "invalid",
                hint: LoginConfigTStr.duplicateUserName
            };
        }
        for (var i = 0; i < password.length; i++) {
            var curr = password.charAt(i);
            if (curr >= "A" && curr <= "Z") {
                upperLetterCount++;
            } else if (curr >= "a" && curr <= "z") {
                lowerLetterCount++;
            } else if (curr >= "0" && curr <= "9") {
                digitCount++;
                if (i >= 1 && i < password.length - 1) {
                    middleDigitCount++;
                }
            } else if (symbols.indexOf(curr) !== -1) {
                symbolCount++;
                if (i >= 1 && i < password.length - 1) {
                    middleSymbolCount++;
                }
            } else {
                return {
                    "strength": "invalid",
                    "hint": LoginConfigTStr.illegalCharacter
                };
            }
            if (showsUp[curr]) {
                showsUp[curr]++;
            } else {
                showsUp[curr] = 1;
            }
        }
        // if (upperLetterCount == 0 || lowerLetterCount == 0 || digitCount == 0 || symbolCount == 0) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.atLeastOne
        //     }
        // }
        if (password.length < 3) {
            return {
                "strength": "veryWeak",
                "hint": LoginConfigTStr.veryWeak
            };
        }

        // scores += password.length * 5
        //        + (digitCount > 3 ? 10 : 0)
        //        + (symbolCount > 3 ? 10 : 0)
        //        + ((Object.keys(showsUp).length / password.length) > 0.6 ? 15 : 0);

        var consecutiveLowerCount = getConsecutive(password, lowerCaseLetters, 3);
        var consecutiveUpperCount = getConsecutive(password, upperCaseLetters, 3);
        var consecutiveDigitCount = getConsecutive(password, digits, 3);
        var sequentialLetterCount = getSequential(password.toLowerCase(), lowerCaseLetters, 3);
        var sequentialDigitcount = getSequential(password, digits, 3);
        var sequentialSymbolCount = getSequential(password, orderSymbols, 3);
        for (var key in showsUp) {
            if (showsUp[key] > 0) {
                duplicateTimes += showsUp[key];
            }
        }
        scores += password.length * 4
               + (password.length - upperLetterCount) * 2
               + (password.length - lowerLetterCount) * 2
               + digitCount * 4
               + symbolCount * 6
               + (middleSymbolCount + middleDigitCount) * 2
               + ((password.length > 10) && ((Object.keys(showsUp).length / password.length) > 0.6) ? password.length * 2 : 0)
               - ((symbolCount === 0 && digitCount === 0) ? password.length : 0)
               - ((symbolCount === 0 && upperLetterCount === 0 && lowerLetterCount === 0) ? password.length : 0)
               - (duplicateTimes / password.length ) * 10
               - consecutiveLowerCount * 2
               - consecutiveUpperCount * 2
               - consecutiveDigitCount * 2
               - sequentialLetterCount * 3
               - sequentialDigitcount * 3
               - sequentialSymbolCount * 3;

        if (scores <= weakThreshold) {
            return {
                "strength": "veryWeak",
                "hint": LoginConfigTStr.veryWeak
            };
        } else if (scores <= strongThreshold) {
            return {
                "strength": "weak",
                "hint": LoginConfigTStr.weak
            };
        } else if (scores <= veryStrongThreshold) {
            return {
                "strength": "strong",
                "hint": LoginConfigTStr.strong
            };
        } else {
            return {
                "strength": "veryStrong",
                "hint": LoginConfigTStr.veryStrong
            };
        }

        // consecutive with each other, like "aaaaab" is has a consecutive string of a
        // with length 5
        function getConsecutive(password, orderString, threshold) {
            var count = 0;
            var currLength = 0;
            for (var i = 0; i < password.length; i++) {
                var curr = password.charAt(i);
                if (orderString.indexOf(curr) === -1) {
                    if (currLength >= threshold) {
                        count += currLength;
                    }
                    currLength = 0;
                } else {
                    currLength++;
                }
            }
            if (currLength >= threshold) {
                count += currLength;
            }
            return count;
        }

        // follow each other in order from smallest to largest, without gaps,
        // like "abcde" is one sequential string
        function getSequential(password, orderString, threshold) {
            var count = 0;
            for (var i = 0; i < orderString.length - (threshold - 1); i++) {
                var str = orderString.substring(i, i + threshold);
                if (password.indexOf(str) !== -1) {
                    count++;
                }
            }
            return count;
        }
    }

    if (typeof window !== "undefined" && window["unitTestMode"]) {
        LoginConfigModal["__testOnly__"] = {
            setupConfig: setupConfig,
            submitDefaultAdminConfig: submitDefaultAdminConfig,
            submitMSALConfig: submitMSALConfig,
            submitLdapConfig: submitLdapConfig,
            getPasswordStrength: getPasswordStrength
        }
    }

    return (LoginConfigModal);
}(jQuery, {}));
