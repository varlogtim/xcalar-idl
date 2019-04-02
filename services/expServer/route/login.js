var jQuery;
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});
const path = require('path');
const fs = require('fs');
const ldap = require('ldapjs');
const express = require('express');
const crypto = require('crypto');
const btoa = require('btoa');
const atob = require('atob');
const request = require('request');
var router = express.Router();
var ssf = require('../supportStatusFile.js');
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var enableB2C = require('./auth.js').enableB2C;
var Ajv = require('ajv');
var ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
var Status = ssf.Status;
var strictSecurity = false;
var authConfigured = false;

require("require.async")(require);

var msalConfigRelPath = "/config/msalConfig.json";
var ldapConfigRelPath = "/config/ldapConfig.json";
var vaultConfigRelPath = "/config/vaultConfig.json";
var isLdapConfigSetup = false;
var ldapConfig;
var trustedCerts;
var defaultAdminConfigRelPath = "/config/defaultAdmin.json";

var defaultAdminSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "defaultAdminConfig",
    "description": "configuration for a default administrator",
    "type": "object",
    "properties": {
        "username": {
            "description": "name of the admin user",
            "type": "string"
        },
        "password": {
            "description": "encrypted admin user password",
            "type": "string"
        },
        "email": {
            "description": "email address of the admin user",
            "type": "string"
        },
        "defaultAdminEnabled": {
            "description": "is the default admin config enabled",
            "type": "boolean"
        }
    },

    "required": [ "username", "password", "email", "defaultAdminEnabled" ]
};

var emptyDefaultAdminConfig = {
    username: "",
    password: "",
    email: "",
    defaultAdminEnabled: false
};

var ldapConfigSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ldapConfig",
    "description": "configuration for LDAP",
    "type": "object",
    "properties": {
        "ldap_uri": {
            "description": "uri of the LDAP server",
            "type": "string"
        },
        "userDN": {
            "description": "ldap base DN for user account entry search",
            "type": "string"
        },
        "useTLS": {
            "description": "connect to server with TLS",
            "type": "boolean"
        },
        "searchFilter": {
            "description": "LDAP filter used to identify user entries",
            "type": "string"
        },
        "activeDir": {
            "description": "URI connects to Active Directory server",
            "type": "boolean"
        },
        "serverKeyFile": {
            "description": "path to key file required by ldapjs to use SSL/TLS",
            "type": "string"
        },
        "ldapConfigEnabled": {
            "description": "is LDAP authentication enabled",
            "type": "boolean"
        },
        "adUserGroup": {
            "description": "the name of the AD group of Xcalar Users",
            "type": "string"
        },
        "adAdminGroup": {
            "description": "the name of the AD group of Xcalar Admins",
            "type": "string"
        },
        "adDomain": {
            "description": "the name of the default AD domain",
            "type": "string"
        },
        "adSubGroupTree": {
            "description": "use 1.2.840.113556.1.4.1941 searches to find users in AD nested groups",
            "type": "boolean"
        },
        "adSearchShortName": {
            "description": "replace the %username% with the name without the username without the AD domain",
            "type": "boolean"
        }
    },

    "required": [ "ldap_uri", "userDN", "useTLS", "searchFilter", "activeDir", "serverKeyFile", "ldapConfigEnabled" ]
};

var emptyLdapConfig = {
    ldap_uri: "",
    userDN: "",
    useTLS: false,
    searchFilter: "",
    activeDir: false,
    serverKeyFile: null,
    ldapConfigEnabled: false
}

var msalConfigSchema = {

    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "defaultAdminConfig",
    "description": "configuration for a default administrator",
    "type": "object",
    "properties": {
        "msalEnabled": {
            "description": "is the MSAL connector active",
            "type": "boolean"
        },
        "msal": {
            "description": "MSAL configuration data",
            "type": "object",
            "oneOf": [
                { "$ref": "#/definitions/msalConfigData" }
            ]
        }
    },

    "required": [ "msalEnabled", "msal" ],

    "definitions": {
        "msalConfigData": {
            "properties": {
                "clientId": {
                    "description": "id of the client application",
                    "type": "string"
                },
                "userScope": {
                    "description": "access uri for the scope for Xcalar users",
                    "type": "string"
                },
                "adminScope": {
                    "description": "access uri for the scope for Xcalar admins",
                    "type": "string"
                },
                "b2cEnabled": {
                    "description": "endpoint is Microsoft Azure B2C",
                    "type": "boolean"
                },
                "webApi": {
                    "description": "B2C web api URL",
                    "type": "string"
                },
                "authority": {
                    "description": "B2C authentication service",
                    "type": "string"
                },
                "azureEndpoint": {
                    "description": "Azure Graph API endpoint (reserved for future use)",
                    "type": "string"
                },
                "azureScopes": {
                    "description": "Azure Graph API scopes (reserved for future use)",
                    "type": "array",
                    "minItems": 0,
                    "items": { "type": "string" },
                    "uniqueItems": true
                }
            },
            "required": [ "clientId", "userScope", "adminScope", "b2cEnabled" ]
        }
    }
};

var emptyMsalConfig = {
    msalEnabled: false,
    msal: {
        clientId: "",
        userScope: "",
        adminScope: "",
        b2cEnabled: false,
        webApi: "",
        authority: "",
        azureEndpoint: "",
        azureScopes: []
    }
};

var vaultConfigSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "vaultConfig",
    "description": "configuration for Vault",
    "type": "object",
    "properties": {
        "vaultEnabled": {
            "description": "is vault connector active",
            "type": "boolean"
        },
        "vault": {
            "description": "vault configuration data",
            "type": "object",
            "oneOf": [
                { "$ref": "#/definitions/vaultConfigData" }
            ]
        }
    },

    "required": [ "vaultEnabled", "vault" ],

    "definitions": {
        "vaultConfigData": {
            "properties": {
                "vault_uri": {
                    "description": "uri of vault server",
                    "type": "string"
                },
                "vaultUserGroup": {
                    "description": "name of the vault Xcalar user group",
                    "type": "string"
                },
                "vaultAdminGroup": {
                    "description": "name of the vault Xcalar admin group",
                    "type": "string"
                }
            },
            "required": [ "vault_uri", "vaultUserGroup", "vaultAdminGroup" ]
        }
    }
};

var emptyVaultConfig = {
    vaultEnabled: false,
    vault: {
        vault_uri: "",
        vaultUserGroup: "",
        vaultAdminGroup: ""
    }
}

var users = new Map();
var globalLoginId = 0;
function UserInformation() {
    this.loginId = 0;
    this.entry_count = 0;
    this.mail = "";
    this.firstName = "";
    this.employeeType = "";
    return this;
}
UserInformation.prototype = {
    getLoginId: function() {
        return this.loginId;
    },
    getEntryCount: function() {
        return this.entry_count;
    },
    getMail: function() {
        return this.mail;
    },
    getFirstName: function() {
        return this.firstName;
    },
    getEmployeeType: function() {
        return this.employeeType;
    },
    getIsADUser: function() {
        return this.isADUser;
    },

    setLoginId: function(loginId) {
        this.loginId = loginId;
    },
    setEntryCount: function(entry_count) {
        this.entry_count = entry_count;
    },
    setMail: function(mail) {
        this.mail = mail;
    },
    setFirstName: function(firstName) {
        this.firstName = firstName;
    },
    setEmployeeType: function(employeeType) {
        this.employeeType = employeeType;
    },
    setIsADUser: function(isADUser) {
        this.isADUser = isADUser;
    },

    isSupporter: function() {
        return this.employeeType === "supporter";
    },
    isAdmin: function() {
        return this.employeeType === "administrator";
    }
};

function checkFilePerms(xlrRoot, defaultRelPath) {
    var deferred = jQuery.Deferred();
    var message = { "success": false, "data": null, "message": "" };

    if (typeof xlrRoot !== "string" ||
        typeof defaultRelPath !== "string") {
        message.message = "One or more path components is not a string";
        deferred.reject(message);
    } else {
        var defaultConfigPath = path.join(xlrRoot, defaultRelPath);

        fs.stat(defaultConfigPath, function(error, stat) {
            if (error) {
                message.message = "Could not stat " + defaultConfigPath;
                return deferred.reject(message);
            }

            if ((stat.mode & 0777) !== 0600) {
                message.message = "File permissions for " + defaultConfigPath + " are wrong (" + (stat.mode & 0777).toString(8) + " instead of " + 0600.toString(8) + ")";
                return deferred.reject(message);
            }

            message.success = true;
            message.message = "permission change successful";
            deferred.resolve();
        });
    }

    return deferred.promise();
}

function loadConfigModule(xlrRoot, defaultRelPath) {
    var deferred = jQuery.Deferred();
    var message = { "success": false, "data": null, "message": "" };

    if (typeof xlrRoot !== "string" ||
        typeof defaultRelPath !== "string") {
        message.message = "One or more path components is not a string";
        deferred.reject(message);
    } else {
        // the type check above should prevent path.join from throwing
        // error
        var defaultConfigPath = path.join(xlrRoot, defaultRelPath);

        if (!fs.existsSync(defaultConfigPath)) {
            var errMsg = "config file path does not exist: " + defaultConfigPath;
            xcConsole.log(errMsg);
            message.message = errMsg;
            deferred.reject(message);
        } else {
            if (require.resolve(defaultConfigPath)) {
                delete require.cache[require.resolve(defaultConfigPath)];
            }

            xcConsole.log("Preparing to load: " + defaultConfigPath);

            require.async(defaultConfigPath, function(exports) {
                message.success = true;
                message.data = exports;
                message.message = "module load successful";
                xcConsole.log("load succeeded!");
                deferred.resolve(message);
            }, function(err) {
                message.message = "module load failed: " + err.message;
                xcConsole.log("load failed!");
                deferred.reject(message);
            });
        }
    }

    return deferred.promise();
}

function getDefaultAdmin() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "defaultAdminEnabled": false, "config": null };
    var defaultAdminConfig = {};
    var validate = ajv.compile(defaultAdminSchema);
    var xlrRoot = "";

    support.getXlrRoot()
    .then(function(path) {
        xlrRoot = path;
        return loadConfigModule(xlrRoot, defaultAdminConfigRelPath);
    })
    .then(function(moduleMsg) {
        defaultAdminConfig = jQuery.extend(true, {},
                                           emptyDefaultAdminConfig,
                                           moduleMsg.data);

        return checkFilePerms(xlrRoot, defaultAdminConfigRelPath);
    })
    .then(function(permMsg) {
        var valid = validate(defaultAdminConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            message.data = defaultAdminConfig;
            deferred.resolve(message);
        }
    })
    .fail(function(errorMsg) {
        message.error = (xlrRoot !== "") ?
            errorMsg.message : errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setDefaultAdmin(defaultAdminConfigIn) {
    var deferred = jQuery.Deferred();
    var defaultAdminConfigPath;
    var defaultAdminConfig = {};
    var message = { "status": httpStatus.OK, "success": false };
    var validate = ajv.compile(defaultAdminSchema);

    var inputValid = validate(defaultAdminConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
        return deferred.promise();
    }

    defaultAdminConfig = jQuery.extend(true, {},
                                       emptyDefaultAdminConfig,
                                       defaultAdminConfigIn);
    defaultAdminConfig.password = crypto.createHmac("sha256", "xcalar-salt").update(defaultAdminConfig.password).digest("hex");

    var valid = validate(defaultAdminConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
        .then(function(xlrRoot) {
            defaultAdminConfigPath = path.join(xlrRoot, defaultAdminConfigRelPath);

            return (support.writeToFile(defaultAdminConfigPath, defaultAdminConfig, {"mode": 0600}));
        })
        .then(function() {
            message.success = true;
            deferred.resolve(message);
        })
        .fail(function(errorMsg) {
            message.error = errorMsg;
            deferred.reject(message);
        });
    }

    return deferred.promise()
}

function getMsalConfig() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "msalEnabled": false };
    var msalConfig = {};
    var validate = ajv.compile(msalConfigSchema);
    var xlrRoot = "";

    support.getXlrRoot()
    .then(function(path) {
        xlrRoot = path;
        return loadConfigModule(xlrRoot, msalConfigRelPath);
    })
    .then(function(moduleMsg) {
        msalConfig = jQuery.extend(true, {},
                                   emptyMsalConfig,
                                   moduleMsg.data);

        var valid = validate(msalConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            return deferred.reject(message);
        }

        message.data = msalConfig;

        enableB2C(msalConfig.msal.b2cEnabled);

        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        message.error = (xlrRoot !== "") ?
            errorMsg.message : errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setMsalConfig(msalConfigIn) {
    var deferred = jQuery.Deferred();
    var msalConfigPath;
    var msalConfig = {};
    var message = { "status": httpStatus.OK, "success": false };
    var validate = ajv.compile(msalConfigSchema);

    var inputValid = validate(msalConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        xcConsole.log("invalid msalConfig: " + message.error);
        deferred.reject(message);
        return deferred.promise();
    }

    msalConfig = jQuery.extend(true, {},
                               emptyMsalConfig,
                               msalConfigIn);

    var valid = validate(msalConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
        .then(function(xlrRoot) {
            msalConfigPath = path.join(xlrRoot, msalConfigRelPath);

            enableB2C(msalConfig.msal.b2cEnabled);

            return (support.writeToFile(msalConfigPath, msalConfig, {"mode": 0600}));
        })
        .then(function() {
            message.success = true;
            deferred.resolve(message);
        })
        .fail(function(errorMsg) {
            message.error = errorMsg;
            deferred.reject(message);
        });
    }

    return deferred.promise();
}

function getLdapConfig() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "ldapConfigEnabled": false };
    var defaultLdapConfig = jQuery.extend({}, emptyLdapConfig);
    var validate = ajv.compile(ldapConfigSchema);
    var ldapConfigOut;
    var xlrRoot = "";

    support.getXlrRoot()
    .then(function(path) {
        xlrRoot = path;
        return loadConfigModule(xlrRoot, ldapConfigRelPath);
    })
    .then(function(moduleMsg) {
        jQuery.extend(defaultLdapConfig, moduleMsg.data);

        var valid = validate(defaultLdapConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            message.data = defaultLdapConfig;
            deferred.resolve(message);
        }
    })
    .fail(function(errorMsg) {
        message.error = (xlrRoot !== "") ?
            errorMsg.message : errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setLdapConfig(ldapConfigIn) {
    var deferred = jQuery.Deferred();
    var ldapConfigPath;
    var writeLdapConfig = jQuery.extend();
    var message = { "status": httpStatus.OK, "success": false };
    var validate = ajv.compile(ldapConfigSchema);

    var inputValid = validate(ldapConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
        return deferred.promise();
    }

    writeLdapConfig = jQuery.extend(true, {},
                                    emptyLdapConfig,
                                    ldapConfigIn);

    var valid = validate(writeLdapConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        ldapConfig = writeLdapConfig;

        support.getXlrRoot()
        .then(function(xlrRoot) {
            ldapConfigPath = path.join(xlrRoot, ldapConfigRelPath);
            return (support.makeFileCopy(ldapConfigPath));
        })
        .then(function() {
            return (support.writeToFile(ldapConfigPath, ldapConfig, {"mode": 0600}));
        })
        .then(function() {
            message.success = true;
            deferred.resolve(message);
        })
        .fail(function(errorMsg) {
            message.error = errorMsg;
            deferred.reject(message);
        });
    }

    return deferred.promise();
}

function setupLdapConfigs(forceSetup) {
    var deferred = jQuery.Deferred();
    var gotLdapConfig = false;

    if (isLdapConfigSetup && !forceSetup) {
        deferred.resolve();
    } else {
        getLdapConfig()
        .then(function(ldapConfigMsg) {
            // ldapConfig is a global
            ldapConfig = ldapConfigMsg.data;
            gotLdapConfig = true;

            if (!ldapConfig.ldapConfigEnabled) {
                var errMsg = "LDAP authentication is disabled";
                xcConsole.log(errMsg);
                return deferred.reject(errMsg);
            }

            if (!ldapConfig.serverKeyFile ||
                ldapConfig.serverKeyFile === "") {
                var errMsg = "server key file not set";
                xcConsole.log(errMsg);
                return deferred.reject(errMsg);
            }

            if (!fs.existsSync(ldapConfig.serverKeyFile)) {
                var errMsg = "server key file does not exist";
                xcConsole.log(errMsg);
                return deferred.reject(errMsg);
            }

            trustedCerts = [fs.readFileSync(ldapConfig.serverKeyFile)];
            isLdapConfigSetup = true;
            deferred.resolve('setupLdapConfigs succeeds');
        })
        .fail(function(message) {
            var errMsg = (gotLdapConfig) ? message : message.error;
            isLdapConfigSetup = false;
            deferred.reject('setupLdapConfigs fails ' + errMsg);
        });
    }

    return deferred.promise();
}

function getVaultConfig() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "vaultEnabled": false };
    var vaultConfig = {};
    var validate = ajv.compile(vaultConfigSchema);
    var vaultConfigOut;
    var xlrRoot = "";

    support.getXlrRoot()
    .then(function(path) {
        xlrRoot = path;
        return loadConfigModule(xlrRoot, vaultConfigRelPath);
    })
    .then(function(moduleMsg) {
        vaultConfig = jQuery.extend(true, {},
                                    emptyVaultConfig,
                                    moduleMsg.data);
        var valid = validate(vaultConfig);

        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            return deferred.reject(message);
        }

        message.data = vaultConfig;

        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        message.error = (xlrRoot !== "") ?
            errorMsg.message : errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setVaultConfig(vaultConfigIn) {
    var deferred = jQuery.Deferred();
    var vaultConfigPath;
    var vaultConfig = {};
    var message = { "status": httpStatus.OK, "success": false };
    var validate = ajv.compile(vaultConfigSchema);

    var inputValid = validate(vaultConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        xcConsole.log("invalid vaultConfig: " + message.error);
        deferred.reject(message);
        return deferred.promise();
    }

    vaultConfig = jQuery.extend(true, {},
                                emptyVaultConfig,
                                vaultConfigIn);

    var valid = validate(vaultConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
        .then(function(xlrRoot) {
            vaultConfigPath = path.join(xlrRoot, vaultConfigRelPath);

            return (support.writeToFile(vaultConfigPath, vaultConfig, {"mode": 0600}));
        })
        .then(function() {
            message.success = true;
            deferred.resolve(message);
        })
        .fail(function(errorMsg) {
            message.error = errorMsg;
            deferred.reject(message);
        });
    }
}

function setLdapConnection(credArray, ldapConn, ldapConfig, loginId) {
    var deferred = jQuery.Deferred();

    // Save the information of current user into a HashTable
    var currentUser = new UserInformation();
    currentUser.setLoginId(loginId);
    users.set(loginId, currentUser);

    // Configure parameters to connect to LDAP
    ldapConn.username = credArray.xiusername;
    ldapConn.password = credArray.xipassword;

    ldapConn.client_url = ldapConfig.ldap_uri.endsWith('/')
                                    ? ldapConfig.ldap_uri
                                    : ldapConfig.ldap_uri+'/';

    ldapConn.userDN = ldapConfig.userDN;
    ldapConn.searchFilter = ldapConfig.searchFilter;
    ldapConn.activeDir = ldapConfig.activeDir;
    ldapConn.useTLS = ldapConfig.useTLS;
    ldapConn.useSubGroupTree = false;

    ldapConn.client = ldap.createClient({
        url: ldapConn.client_url,
        timeout: 10000,
        connectTimeout: 20000
    });

    if (ldapConn.activeDir) {
        ldapConn.adUserGroup = (ldapConfig.hasOwnProperty("adUserGroup") &&
                                 ldapConfig.adUserGroup !== "")
                                    ? ldapConfig.adUserGroup
                                    : "Xce User";

        ldapConn.adAdminGroup = (ldapConfig.hasOwnProperty("adAdminGroup") &&
                                  ldapConfig.adUserGroup !== "")
                                    ? ldapConfig.adAdminGroup
                                    : "Xce Admin";

        if ((ldapConfig.hasOwnProperty("adDomain")) &&
            (ldapConn.username.indexOf("@") <= -1)) {
            ldapConn.username = ldapConn.username + "@" + ldapConfig.adDomain;
        }

        if (ldapConn.username.indexOf("@") > -1) {
            ldapConn.shortName = ldapConn.username.substring(0, ldapConn.username.indexOf("@"));
        } else {
            ldapConn.shortName = ldapConn.username;
        }

        if (ldapConfig.hasOwnProperty("adSubGroupTree")) {
            ldapConn.useSubGroupTree = ldapConfig.adSubGroupTree;
        }

        ldapConn.searchName = (ldapConfig.hasOwnProperty("adSearchShortName") &&
                               ldapConfig.adSearchShortName === true)
                                 ? ldapConn.shortName
                                 : ldapConn.username;
    } else {
        ldapConn.userDN = ldapConn.userDN.replace('%username%', ldapConn.username);
        ldapConn.username = ldapConn.userDN;
        ldapConn.searchName = ldapConn.userDN;
    }

    var searchFilter = (ldapConn.searchFilter !== "")
                     ? ldapConn.searchFilter.replace('%username%',ldapConn.searchName)
                     : undefined;

    var activeDir = ldapConn.activeDir ? ['cn','mail','memberOf'] : ['cn','mail','employeeType'];

    ldapConn.searchOpts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: activeDir
    };

    // Use TLS Protocol
    if (ldapConn.useTLS) {
        var tlsOpts = {
            cert: trustedCerts,
            rejectUnauthorized: strictSecurity
        };
        xcConsole.log("Starting TLS...");
        ldapConn.client.starttls(tlsOpts, [], function(err) {
            if (err) {
                xcConsole.log("Failure: TLS start " + err.message);
                deferred.reject("setLdapConnection fails");
            } else {
                deferred.resolve('setLdapConnection succeeds');
            }
        });
    } else {
        deferred.resolve('setLdapConnection succeeds');
    }

    return deferred.promise();
}



function ldapAuthentication(ldapConn, loginId) {
    // LDAP Authentication
    var deferred = jQuery.Deferred();
    ldapConn.hasBind = true;
    ldapConn.client.bind(ldapConn.username, ldapConn.password, function(error) {
        if (error) {
            xcConsole.log("Failure: Binding process " + error.message);
            increaseLoginId();
            ldapConn.hasBind = false;
            ldapConn.client.destroy();
            deferred.reject("ldapAuthentication fails");
        } else {
            xcConsole.log('Success: Binding process finished!');
            ldapConn.client.search(ldapConn.userDN, ldapConn.searchOpts, function(error, search) {
                search.on('searchEntry', function(entry) {
                    xcConsole.log('Searching entries.....');
                    try {
                        writeEntry(entry, loginId, ldapConn.activeDir,
                                   ldapConn.adUserGroup, ldapConn.adAdminGroup,
                                   ldapConn.useSubGroupTree);
                    } catch (error) {
                        xcConsole.log('Failure: Writing entry ' + error);
                        deferred.reject("ldapAuthentication fails");
                    }
                });

                search.on('error', function(error) {
                    xcConsole.log('Failure: Searching process ' + error.message);
                    deferred.reject("ldapAuthentication fails");
                });

                search.on('end', function() {
                    xcConsole.log('Success: Search process finished!');
                    deferred.resolve('ldapAuthentication succeeds', loginId);
                });
            });
        }
    });
    return deferred.promise();
}

function ldapGroupRetrieve(ldapConn, groupType, loginId) {
    var deferred = jQuery.Deferred();

    if (!(ldapConn.hasBind) || !(ldapConn.activeDir) ||
        !(ldapConn.useSubGroupTree)) {
        deferred.resolve('No group retrieval needed for ' + groupType);
    } else {
        searchFilter = '';
        sAMAFilter = '(sAMAccountName=' + ldapConn.shortName + ')';

        if (groupType === 'user') {
            searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                "(memberOf:1.2.840.113556.1.4.1941:=" + ldapConn.adUserGroup + "))";
        } else if (groupType === 'admin') {
            searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                "(memberOf:1.2.840.113556.1.4.1941:=" + ldapConn.adAdminGroup + "))";
        } else {
            deferred.reject("Unknown group retrieve type: " + groupType);
        }

        groupSearchOpts = {
            filter: searchFilter,
            scope: 'sub',
            attributes: 'sAMAccountName'
        };

        ldapConn.client.search(ldapConn.userDN, groupSearchOpts, function(error, search) {

            search.on('searchEntry', function(entry) {
                xcConsole.log('Searching entries.....');
                var user = users.get(loginId);

                if (groupType === 'user') {
                    xcConsole.log('User ' + ldapConn.shortName + ' found in user group');
                    user.setIsADUser(true);
                } else if (groupType === 'admin') {
                    xcConsole.log('User ' + ldapConn.shortName + ' found in admin group');
                    user.setIsADUser(true);
                    user.setEmployeeType("administrator");
                }
            });

            search.on('error', function(error) {
                xcConsole.log('Failure: Group searching process ' + error.message);
                deferred.reject("Group search process fails " + groupType);
            });

            search.on('end', function() {
                xcConsole.log('Success: Search process finished!');
                deferred.resolve('Group search process succeeds for ' + groupType);
            });
        });
    }

    return deferred.promise();
}

function writeEntry(entry, loginId, activeDir, adUserGroup, adAdminGroup, useGroupSubtree) {
    if (entry.object) {
        var entryObject = entry.object;
        var user = users.get(loginId);
        user.setEntryCount(user.getEntryCount() + 1);
        // e-mail address and first name are optional
        // by convention, they should be empty strings if not populated
        user.setMail(entryObject.mail ? entryObject.mail : "");
        user.setFirstName(entryObject.cn ? entryObject.cn : "");
        if (activeDir) {
            user.setEmployeeType("user");
            user.setIsADUser(false);
            // if useGroupSubtree is set, we need to query the ldap,
            // so we set membership in ldapGroupRetrieve
            if (!useGroupSubtree && entryObject.memberOf) {
                // For normal user, memberOf is a String
                if (typeof(entryObject.memberOf) === "string") {
                    entryObject.memberOf = [entryObject.memberOf];
                }
                var array = entryObject.memberOf;
                for (var i = 0; i < array.length; i++) {
                    var element =  array[i];
                    var admin_re = new RegExp("^CN=" + adAdminGroup + ",*");
                    if (admin_re.test(element)) {
                        user.setIsADUser(true);
                        user.setEmployeeType("administrator");
                    }
                    var user_re = new RegExp("^CN=" + adUserGroup + ",*");
                    if (user_re.test(element)) {
                        user.setIsADUser(true);
                    }
                }
            }
        } else {
            user.setEmployeeType(entryObject.employeeType);
        }
    }
}

function prepareResponse(loginId, activeDir) {
    var deferred = jQuery.Deferred();
    var user = users.get(loginId);
    if (user && user.getEntryCount() >= 1) {
        if (user.getEntryCount() > 1) {
            xcConsole.log("Alert: More than one matched user was found");
        }
        // The employeeType is defined when adding new user
        // "administrator" for administrators, "normal user"
        // for normal users.
        if ((activeDir) && (!user.getIsADUser())) {
            xcConsole.log('Failure: User is not in the Xcalar user group.');
            deferred.reject("prepareResponse fails");
        } else {
            var isAdmin = user.isAdmin();
            var isSupporter = user.isSupporter();
            var userInfo = {
                "firstName": user.firstName,
                "mail": user.mail,
                "isValid": true,
                "isAdmin": isAdmin,
                "isSupporter": isSupporter
            };
            deferred.resolve(userInfo);
        }
    } else {
        xcConsole.log("Failure: No matching user data found in LDAP directory");
        deferred.reject("prepareResponse fails");
    }
    return deferred.promise();
}

function increaseLoginId() {
    globalLoginId++;
}

function ldapLogin(credArray) {
    var deferred = jQuery.Deferred();
    // Ldap configuration
    var ldapConn = {};
    var currLoginId;

    setupLdapConfigs(false)
    .then(function() {
        currLoginId = globalLoginId;
        increaseLoginId();
        return setLdapConnection(credArray, ldapConn, ldapConfig, currLoginId);
    })
    .then(function() {
        return ldapAuthentication(ldapConn, currLoginId);
    })
    .then(function() {
        return ldapGroupRetrieve(ldapConn, 'user', currLoginId);
    })
    .then(function() {
        return ldapGroupRetrieve(ldapConn, 'admin', currLoginId);
    })
    .then(function(message) {
        return prepareResponse(currLoginId, ldapConn.activeDir);
    })
    .then(function(message) {
        ldapConn.client.destroy();
        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        if (ldapConn.hasBind) {
            ldapConn.client.destroy();
        }
        deferred.reject(errorMsg);
    });

    return deferred.promise();
}

function vaultLogin(credArray) {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "isValid": false };
    var vaultUserGroup = null;
    var vaultAdminGroup = null;

    getVaultConfig()
    .then(function(vaultConfigMsg) {
        var vaultConfig = vaultConfigMsg.data;

        if (!vaultConfig.vaultEnabled) {
            message.error = "vault is not configured";
            return deferred.reject(message);
        }

        var options = {
            "method": "POST",
            "uri": vaultConfig.vault.vault_uri + "/v1/auth/ldap/login/" + credArray.xiusername,
            "json": { "password" : credArray.xipassword }
        }

        request(options, function(error, response, body) {
            if (response.statusCode === httpStatus.OK) {

                var userInfo = {
                    "firstName": response.body.auth.metadata.username,
                    "mail": "",
                    "isAdmin": false,
                    "isValid": false,
                    "isSupporter": false
                };

                if (response.body.auth.policies.includes(vaultConfig.vault.vaultAdminGroup)) {
                    userInfo.isAdmin = true;
                    userInfo.isValid = true;
                } else if (response.body.auth.policies.includes(vaultConfig.vault.vaultUserGroup)) {
                    userInfo.isAdmin = false;
                    userInfo.isValid = true;
                } else {
                    var revokeOptions = {
                        "method": "POST",
                        "uri": vaultConfig.vault.vault_uri + "/v1/auth/token/revoke",
                        "json": { "token" :  response.body.auth.client_token },
                        "headers": { "X-Vault-Token" : response.body.auth.client_token }
                    }

                    request(revokeOptions, function(error, response, body) {
                        message.error = "user " + credArray.xiusername + " does not belong to policy groups " + vaultConfig.vault.vaultAdminGroup + " and " + vaultConfig.vault.vaultUserGroup;
                        return deferred.reject(message);
                    });
                }
                userInfo.tokenType = "vault";
                userInfo.token = response.body;

                return deferred.resolve(userInfo);
            } else {
                message.error = error;
                return deferred.reject(message);
            }
        });
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function vaultLogout(session) {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "isValid": false };

    if (session.credentials &&
        session.credentials["vault"]) {
        var token = session.credentials["vault"];

        getVaultConfig()
        .then(function(vaultConfigMsg) {
            var vaultConfig = vaultConfigMsg.data;
            if (!vaultConfig.vaultEnabled) {
                message.error = "vault is not configured";
                return deferred.reject(message);
            }

            var options = {
                "method": "POST",
                "uri": vaultConfig.vault.vault_uri + "/v1/auth/token/revoke",
                "json": { "token" :  token.auth.client_token },
                "headers": { "X-Vault-Token" : token.auth.client_token }
            }

            request(options, function(error, response, body) {
                if (response.statusCode === httpStatus.OK) {
                    xcConsole.log("Response: " + JSON.stringify(response));
                    message.isValid = true;
                    return deferred.resolve(message);
                } else {
                    message.error = error;
                    return deferred.reject(message);
                }
            });
        })
        .fail(function(errorMsg) {
            message.error = errorMsg;
            return deferred.reject(message);
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise();
}

function loginAuthentication(credArray) {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "isValid": false };

    if (!credArray || !(credArray.hasOwnProperty("xiusername"))
        || !(credArray.hasOwnProperty("xipassword"))) {
        message.error = "Invalid login request provided";
        return deferred.reject(message).promise();
    }

    // Check if defaultAdmin is turned on
    getDefaultAdmin()
    .then(function(defaultAdminMsg) {
        var defaultAdminConfig = defaultAdminMsg.data;
        if (!defaultAdminConfig.defaultAdminEnabled) {
            // Default admin not enabled. Try LDAP
            return jQuery.Deferred().reject().promise();
        }

        var hmac = crypto.createHmac("sha256", "xcalar-salt")
            .update(credArray.xipassword).digest("hex");

        if (credArray.xiusername === defaultAdminConfig.username &&
            hmac === defaultAdminConfig.password) {

            // Successfully authenticated as defaultAdmin
            var userInfo = {
                "firstName": "Administrator",
                "mail": defaultAdminConfig.email,
                "isValid": true,
                "isAdmin": true,
                "isSupporter": false,
            };

            return jQuery.Deferred().resolve(userInfo).promise();
        } else {
            // Fall through to LDAP
            return jQuery.Deferred().reject().promise();
        }

    })
    .then(
        // Successfully authenticated as default admin. Fall through
        function(userInfo) {
            return jQuery.Deferred().resolve(userInfo).promise();
        },

        // Did not authenticate as default admin, either because
        // getDefaultAdmin() failed, or credArray.defaultAdminEnabled is false
        // or credArray.xiusername/xipassword is wrong
        function() {
            return ldapLogin(credArray);
        }
    )
    .then(
        // Successfully authenticated as default admin or ldap.  Fall through
        function(userInfo) {
            return jQuery.Deferred().resolve(userInfo).promise();
        },

        // Did not authenticate as either default admin or ldap, try vault
        // auth
        function() {
            return vaultLogin(credArray);
        }
    )
    .then(function(userInfo) {
        // We've authenticated successfully with either ldap or default admin
        userInfo.status = message.status;
        userInfo.xiusername = credArray.xiusername;
        xcConsole.log(userInfo.xiusername, "successfully logged in.");
        deferred.resolve(userInfo)
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message)
    });

    return deferred.promise();
}

function authenticationInit() {
    var deferred = jQuery.Deferred();

    function getDefaultAdminOrNot() {
        var subDeferred = jQuery.Deferred();

        getDefaultAdmin()
        .then(function(msg) {
            subDeferred.resolve(msg);
        })
        .fail(function(msg) {
            subDeferred.resolve(msg);
        });

        return subDeferred.promise();
    }

    function getMsalConfigOrNot() {
        var subDeferred = jQuery.Deferred();

        getMsalConfig()
        .then(function(msg) {
            subDeferred.resolve(msg);
        })
        .fail(function(msg) {
            subDeferred.resolve(msg);
        });

        return subDeferred.promise();
    }

    function getLdapConfigOrNot() {
        var subDeferred = jQuery.Deferred();

        getLdapConfig()
        .then(function(msg) {
            subDeferred.resolve(msg);
        })
        .fail(function(msg) {
            subDeferred.resolve(msg);
        });

        return subDeferred.promise();
    }

    function getVaultConfigOrNot() {
        var subDeferred = jQuery.Deferred();

        getVaultConfig()
        .then(function(msg) {
            subDeferred.resolve(msg);
        })
        .fail(function(msg) {
            subDeferred.resolve(msg);
        });

        return subDeferred.promise();
    }

    xcConsole.log("Starting default admin load");
    getDefaultAdminOrNot()
    .then(function(msg) {
        if (msg.data &&
            msg.data.defaultAdminEnabled) {
            xcConsole.log("default admin configured");
            authConfigured = true;
        } else {
            xcConsole.log("default admin not configured");
        }

        xcConsole.log("Starting MSAL load");
        return getMsalConfigOrNot();
    })
    .then(function(msg) {
        if (msg.data &&
            msg.data.msalEnabled) {
            xcConsole.log("msal configured");
            authConfigured = true;
        } else {
            xcConsole.log("msal not configured");
        }

        xcConsole.log("Starting LDAP config load");
        return getLdapConfigOrNot();
    })
    .then(function(msg) {
        if (msg.data &&
            msg.data.ldapConfigEnabled) {
            xcConsole.log("ldap configured");
            authConfigured = true;
        } else {
            xcConsole.log("ldap not configured");
        }

        xcConsole.log("Starting Vault config load");
        return getVaultConfigOrNot();
    })
    .then(function(msg) {
        if (msg.data &&
            msg.data.vaultEnabled) {
            xcConsole.log("vault configured");
            authConfigured = true;
        } else {
            xcConsole.log("vault not configured");
        }
    })
    .always(function() {
        xcConsole.log((authConfigured) ?
                      "Authentication is configured" :
                      "Authentication is not configured");
        deferred.resolve();
    });

    return deferred.promise();
}

function securitySetupAuth(req, res, next) {
    var message = { "status": httpStatus.Unauthorized, "success": false };

    if (authConfigured) {
        return support.checkAuthAdmin(req, res, next);
    }

    authenticationInit()
    .then(function() {
        if (authConfigured) {
            return support.checkAuthAdmin(req, res, next);
        }

        next();
    });
}


// Start of LDAP calls
/*
Example AD settings (now gotten from ldapConfig.json)
var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';

Example OpenLDAP Settings (now gotten from ldapConfig.json)

var ldap_uri = 'ldap://turing.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';
*/
router.post('/login', function(req, res, next) {
    xcConsole.log("Login process");
    var credArray = req.body;
    res.locals.sessionType = JSON.stringify(support.defaultSessionAge);
    if (credArray.hasOwnProperty('sessionType')) {
        if (!support.sessionAges.hasOwnProperty(credArray.sessionType)) {
            var message = {
                'status': httpStatus.BadRequest,
                'message': 'Unknown session type'
            }
            return res.status(message.status).send(message);
        }
        res.locals.sessionType = JSON.stringify(credArray.sessionType);
    }
    loginAuthentication(credArray)
    .always(function(message) {
        res.locals.message = JSON.stringify(message);
        next();
    });
}, [support.loginAuth]);

router.post('/logout', [support.checkAuth], function(req, res) {
    var username = req.session.username;
    var message = {
        'status': httpStatus.OK,
        'message': 'User ' + username + ' is logged out'
    }

    vaultLogout(req.session)
    .always(function () {
        req.session.destroy(function(err) {
            if (err) {
                message = {
                    'status': httpStatus.BadRequest,
                    'message': 'Error logging out user ' + username + ' :' + JSON.stringify(err)
                }
            }

            xcConsole.log("logging out user " + username);

            res.status(message.status).send(message);
        });
    });
});

router.post('/login/with/HttpAuth', function(req, res) {
    xcConsole.log("Login with http auth");
    const credBuffer = new Buffer(req.body.credentials, 'base64');
    var credString = credBuffer.toString();
    var delimitPos = credString.indexOf(":");
    var errMsg = "";

    if (delimitPos !== -1) {
        var credArray = {
            "xiusername": credString.substring(0, delimitPos),
            "xipassword": credString.substring(delimitPos + 1)
        }

        if (credArray['xiusername'].length > 0) {
            loginAuthentication(credArray)
            .then(function(message) {
                // Add in token information for SSO access
                message.timestamp = Date.now();
                message.signature = crypto.createHmac("sha256", "xcalar-salt2").update(JSON.stringify(userInfo, Object.keys(userInfo).sort())).digest("hex");
                delete message.status;

                if (message.isValid) {
                    req.session.loggedIn = (message.isSupporter ||
                                            message.isAdmin);

                    req.session.loggedInAdmin = message.isAdmin;
                    req.session.loggedInUser = message.isSupporter;

                    req.session.firstName = message.firstName;
                    req.session.emailAddress = message.mail;

                    support.create_login_jwt(req, res);
                }

                const tokenBuffer = new Buffer(JSON.stringify(message));
                res.status(httpStatus.OK).send(tokenBuffer.toString('base64'));
                return;
            })
            .fail(function(message) {
                res.status(httpStatus.Forbidden).send("Invalid credentials");
                return
            });
        } else {
            errMsg = 'no username provided';
        }
    } else {
        errMsg = 'no username or password provided';
    }

    res.status(httpStatus.BadRequest).send("Malformed credentials: " + errMsg)
});

router.post('/login/verifyToken', function(req, res) {
    xcConsole.log("Verify token");
    try {
        var userInfo = JSON.parse(atob(req.body.token));
        var userInfoSignature = userInfo.signature;
        delete userInfo.signature;

        var computedSignature = crypto.createHmac("sha256", "xcalar-salt2").update(JSON.stringify(userInfo, Object.keys(userInfo).sort())).digest("hex");

        if (userInfoSignature != computedSignature) {
            throw new Error("Token has been tampered with!");
        }

        var currTime = Date.now();
        if (currTime > (userInfo.timestamp + (1000 * 60 * 5))) {
            res.status(403).send({"errorMsg": "Token has expired"});
            return;
        }

        delete userInfo.timestamp;

        support.create_login_jwt(req, res);
        res.status(200).send(userInfo);
    } catch (err) {
        res.status(400).send({"errorMsg": "Malformed token: " + err});
    }
});

router.post('/login/msalConfig/get',
            function(req, res) {
    xcConsole.log("Getting msal config");
    getMsalConfig()
    .then(function(message) {
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/msalConfig/set',
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Setting msal config");
    var credArray = req.body;
    setMsalConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/defaultAdmin/get',
            [support.checkAuth], function(req, res) {
    xcConsole.log("Getting default admin");
    getDefaultAdmin()
    .then(function(message) {
        delete message.data.password;
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});

function setupDefaultAdmin(req, res) {
    xcConsole.log("Setting default admin");
    var credArray = req.body;
    setDefaultAdmin(credArray)
    .always(function(message) {
        if (message.success) {
            authConfigured = true;
        }
        res.status(message.status).send(message);
    });
}

router.post('/login/defaultAdmin/set',
            [securitySetupAuth], setupDefaultAdmin);

router.post('/login/defaultAdmin/setup',
            [securitySetupAuth], setupDefaultAdmin);

router.post('/login/ldapConfig/get',
            [support.checkAuth], function(req, res) {
    xcConsole.log("Getting ldap config");
    getLdapConfig()
    .then(function(message) {
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/ldapConfig/set',
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Setting ldap config");
    var credArray = req.body;
    setLdapConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

if (process.env.NODE_ENV === "test") {
    router.post('/login/test/user',
            [support.checkAuth], function(req, res) {
        xcConsole.log("testing user auth");
        res.status(httpStatus.OK).send("user auth successful");
    });

    router.post('/login/test/admin',
                [support.checkAuthAdmin], function(req, res) {
        xcConsole.log("testing admin auth");
        res.status(httpStatus.OK).send("admin auth successful");
    });
}

// Below part is only for Unit Test
function fakeSetupLdapConfigs(func) {
    setupLdapConfigs = func;
}
function fakeSetLdapConnection(func) {
    setLdapConnection = func;
}
function fakeLdapAuthentication(func) {
    ldapAuthentication = func;
}
function fakePrepareResponse(func){
    prepareResponse = func;
}
function fakeGetXlrRoot(func) {
    support.getXlrRoot = func;
}
if (process.env.NODE_ENV === "test") {
    exports.setupLdapConfigs = setupLdapConfigs;
    exports.setLdapConnection = setLdapConnection;
    exports.ldapAuthentication = ldapAuthentication;
    exports.prepareResponse = prepareResponse;
    exports.loginAuthentication = loginAuthentication;
    exports.ldapGroupRetrieve = ldapGroupRetrieve;
    // Replace functions
    exports.fakeSetupLdapConfigs = fakeSetupLdapConfigs;
    exports.fakeSetLdapConnection = fakeSetLdapConnection;
    exports.fakeLdapAuthentication = fakeLdapAuthentication;
    exports.fakePrepareResponse = fakePrepareResponse;
    exports.fakeGetXlrRoot = fakeGetXlrRoot;
}

exports.router = router;
exports.authenticationInit = authenticationInit;
