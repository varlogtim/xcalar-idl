var waadEnabled = false;
var waadConfig;
var defaultAdminEnabled = false;
var defaultAdminConfig;
var ldapConfig;
var ldapConfigEnabled = false;

function setWaadConfig(hostname, waadEnabledIn, tenant, clientId) {
    var deferred = jQuery.Deferred();
    var waadConfigOut = {
        waadEnabled: waadEnabledIn,
        tenant: tenant,
        clientId: clientId
    };

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/waadConfig/set",
        "data": JSON.stringify(waadConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (waadEnabled) {
                    waadEnabled = waadEnabledIn;
                    waadConfig.tenant = waadConfigOut.tenant;
                    waadConfig.waadEnabled = waadEnabled;
                    waadConfig.clientId = waadConfigOut.clientId;
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set waadConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getWaadConfig(hostname) {
    var deferred = jQuery.Deferred();

    if (waadEnabled) {
        return deferred.resolve(waadConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/waadConfig/get",
        "success": function (data) {
            if (data.hasOwnProperty("error")) {
                console.log("Failed to retrieve waadConfig: " + data.error);
                deferred.reject(data.error);
                return;
            }

            waadConfig = {
                instance: 'https://login.microsoftonline.com/',
                tenant: data.tenant,
                clientId: data.clientId,
                postLogoutRedirectUri: window.location.origin,
                waadEnabled: data.waadEnabled,
                cacheLocation: 'sessionStorage'
            };
            waadEnabled = data.waadEnabled;
            if (waadEnabled) {
                xcLocalStorage.setItem("waadConfig", JSON.stringify(waadConfig));
            }
            deferred.resolve(waadConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve waadConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getWaadConfigFromLocalStorage() {
    var localWaadConfig = xcLocalStorage.getItem("waadConfig");
    if (localWaadConfig === null) {
        return null;
    }

    try {
        return JSON.parse(localWaadConfig);
    } catch (error) {
        console.log("Error parsing waadConfig: " + error);
        return null;
    }
}

function setDefaultAdminConfig(hostname, defaultAdminEnabledIn, adminUsername, adminPassword, adminEmail) {
    var deferred = jQuery.Deferred();
    var defaultAdminConfigOut = {
        defaultAdminEnabled: defaultAdminEnabledIn,
        username: adminUsername,
        email: adminEmail,
        password: adminPassword
    };

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/defaultAdmin/set",
        "data": JSON.stringify(defaultAdminConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (defaultAdminEnabled) {
                    defaultAdminEnabled = defaultAdminEnabledIn;
                    defaultAdminConfig.username = defaultAdminConfigOut.username;
                    defaultAdminConfig.defaultAdminEnabled = defaultAdminEnabled;
                    defaultAdminConfig.email = defaultAdminConfigOut.email;
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set defaultAdminConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getDefaultAdminConfig(hostname) {
    var deferred = jQuery.Deferred();

    if (defaultAdminEnabled) {
        return deferred.resolve(defaultAdminConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/defaultAdmin/get",
        "success": function (defaultAdminConfigIn) {
            if (defaultAdminConfigIn.hasOwnProperty("error")) {
                console.log("Failed to retrieve defaultAdminConfig: " + defaultAdminConfigIn.error);
                deferred.reject(defaultAdminConfigIn.error);
                return;
            }

            defaultAdminConfig = defaultAdminConfigIn;
            defaultAdminEnabled = defaultAdminConfigIn.defaultAdminEnabled;
            deferred.resolve(defaultAdminConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve defaultAdminConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function setLdapConfig(hostname, ldapConfigEnabledIn, ldap_uri, userDN, useTLS, searchFilter,
                       activeDir, serverKeyFile, adUserGroup, adAdminGroup, adDomain, adSubGroupTree) {
    var deferred = jQuery.Deferred();
    var ldapConfigOut = {
        ldapConfigEnabled: ldapConfigEnabledIn,
        ldap_uri: ldap_uri,
        userDN: userDN,
        useTLS: useTLS,
        searchFilter: searchFilter,
        activeDir: activeDir,
        serverKeyFile: serverKeyFile,
    };

    if (ldapConfigOut.activeDir) {
        var propArray = [ 'adUserGroup', 'adAdminGroup',
                          'adDomain'];
        var valArray = [ adUserGroup, adAdminGroup,
                         adDomain ];

        for (var ii = 0; ii < propArray.length; ii++) {
            if (valArray[ii] !== "" ) {
                ldapConfigOut[propArray[ii]] = valArray[ii];
            }
        }
        ldapConfigOut.adSubGroupTree = adSubGroupTree;
    } else {
        var propArray = [ 'adUserGroup', 'adAdminGroup',
                          'adDomain', 'adSubGroupTree' ];
        for (var ii = 0; ii < propArray.length; ii++) {
            if (ldapConfigOut.hasOwnProperty(propArray[ii])) {
                delete ldapConfigOut[propArray[ii]];
            }
        }
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/ldapConfig/set",
        "data": JSON.stringify(ldapConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (ldapConfigEnabled) {
                    ldapConfigEnabled = ldapConfigEnabledIn;
                    ldapConfig = ldapConfigOut;
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set ldapConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getLdapConfig(hostname) {
    var deferred = jQuery.Deferred();

    if (ldapConfigEnabled) {
        return deferred.resolve(ldapConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/ldapConfig/get",
        "success": function (ldapConfigIn) {
            if (ldapConfigIn.hasOwnProperty("error")) {
                console.log("Failed to retrieve ldapConfig: " + ldapConfigIn.error);
                deferred.reject(ldapConfigIn.error);
                return;
            }

            ldapConfig = ldapConfigIn;
            ldapConfigEnabled = ldapConfigIn.ldapConfigEnabled;
            deferred.resolve(ldapConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve ldapConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}
