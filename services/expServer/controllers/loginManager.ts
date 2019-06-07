import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as ldap from "ldapjs";
import * as xcConsole from "../utils/expServerXcConsole";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import support from "../utils/expServerSupport";
import Ajv = require('ajv');
const ajv: Ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
import authManager from "./authManager"
import request = require("request")

require("require.async")(require);

const msalConfigRelPath: string = "/config/msalConfig.json";
const ldapConfigRelPath: string = "/config/ldapConfig.json";
const vaultConfigRelPath: string = "/config/vaultConfig.json";
let isLdapConfigSetup: boolean = false;
const strictSecurity: boolean = false;
export let authConfigured: boolean = false;
let trustedCerts: any;
let ldapConfig: any;
const defaultAdminSchema: any = {
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

    "required": ["username", "password", "email", "defaultAdminEnabled"]
};
const defaultAdminConfigRelPath: string = "/config/defaultAdmin.json";
let emptyDefaultAdminConfig: any = {
    username: "",
    password: "",
    email: "",
    defaultAdminEnabled: false
};

const ldapConfigSchema: any = {
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

    "required": ["ldap_uri", "userDN", "useTLS", "searchFilter", "activeDir", "ldapConfigEnabled"]
};
let emptyLdapConfig: any = {
    ldap_uri: "",
    userDN: "",
    useTLS: false,
    searchFilter: "",
    activeDir: false,
    ldapConfigEnabled: false
}
const msalConfigSchema: any = {

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

    "required": ["msalEnabled", "msal"],

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
            "required": ["clientId", "userScope", "adminScope", "b2cEnabled"]
        }
    }
};
let emptyMsalConfig: any = {
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
const vaultConfigSchema: any = {
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

    "required": ["vaultEnabled", "vault"],

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
            "required": ["vault_uri", "vaultUserGroup", "vaultAdminGroup"]
        }
    }
};

let emptyVaultConfig: any = {
    vaultEnabled: false,
    vault: {
        vault_uri: "",
        vaultUserGroup: "",
        vaultAdminGroup: ""
    }
}

let users: any = new Map();

let globalLoginId: number = 0;

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
    let deferred: any = jQuery.Deferred();
    let message: any = { "success": false, "data": null, "message": "" };

    if (typeof xlrRoot !== "string" ||
        typeof defaultRelPath !== "string") {
        message.message = "One or more path components is not a string";
        deferred.reject(message);
    } else {
        let defaultConfigPath = path.join(xlrRoot, defaultRelPath);

        fs.stat(defaultConfigPath, function(error, stat) {
            if (error) {
                message.message = "Could not stat " + defaultConfigPath;
                return deferred.reject(message);
            }

            if ((stat.mode & 0o777) !== 0o600) {
                message.message = "File permissions for " + defaultConfigPath + " are wrong (" + (stat.mode & 0o777).toString(8) + " instead of " + 0o600.toString(8) + ")";
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
    let deferred: any = jQuery.Deferred();
    let message: any = { "success": false, "data": null, "message": "" };

    if (typeof xlrRoot !== "string" ||
        typeof defaultRelPath !== "string") {
        message.message = "One or more path components is not a string";
        deferred.reject(message);
    } else {
        // the type check above should prevent path.join from throwing
        // error
        let defaultConfigPath: string = path.join(xlrRoot, defaultRelPath);

        if (!fs.existsSync(defaultConfigPath)) {
            let errMsg: string =
                "config file path does not exist: " + defaultConfigPath;
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

export function getDefaultAdmin() {
    let deferred: any = jQuery.Deferred();
    let message: any =
        { "status": httpStatus.OK, "defaultAdminEnabled": false, "config": null };
    let defaultAdminConfig: any = {};
    let validate: any = ajv.compile(defaultAdminSchema);
    let xlrRoot: string = "";

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
            let valid: boolean = validate(defaultAdminConfig);
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

export function setDefaultAdmin(defaultAdminConfigIn) {
    let deferred: any = jQuery.Deferred();
    let defaultAdminConfigPath: any;
    let defaultAdminConfig: any = {};
    let message: any = { "status": httpStatus.OK, "success": false };
    let validate: any = ajv.compile(defaultAdminSchema);

    let inputValid: boolean = validate(defaultAdminConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
        return deferred.promise();
    }

    defaultAdminConfig = jQuery.extend(true, {},
        emptyDefaultAdminConfig,
        defaultAdminConfigIn);
    defaultAdminConfig.password = crypto.createHmac("sha256", "xcalar-salt").update(defaultAdminConfig.password).digest("hex");

    let valid: boolean = validate(defaultAdminConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
            .then(function(xlrRoot) {
                defaultAdminConfigPath = path.join(xlrRoot, defaultAdminConfigRelPath);

                return (support.writeToFile(defaultAdminConfigPath, defaultAdminConfig, { "mode": 0o600 }));
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

export function getMsalConfig() {
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "msalEnabled": false };
    let msalConfig: any = {};
    let validate: any = ajv.compile(msalConfigSchema);
    let xlrRoot: string = "";

    support.getXlrRoot()
        .then(function(path) {
            xlrRoot = path;
            return loadConfigModule(xlrRoot, msalConfigRelPath);
        })
        .then(function(moduleMsg) {
            msalConfig = jQuery.extend(true, {},
                emptyMsalConfig,
                moduleMsg.data);

            let valid: boolean = validate(msalConfig);
            if (!valid) {
                message.error = JSON.stringify(validate.errors);
                return deferred.reject(message);
            }

            message.data = msalConfig;

            authManager.enableB2C(msalConfig.msal.b2cEnabled);

            deferred.resolve(message);
        })
        .fail(function(errorMsg) {
            message.error = (xlrRoot !== "") ?
                errorMsg.message : errorMsg;
            deferred.reject(message);
        });

    return deferred.promise();
}

export function setMsalConfig(msalConfigIn) {
    let deferred: any = jQuery.Deferred();
    let msalConfigPath: any;
    let msalConfig: any = {};
    let message: any = { "status": httpStatus.OK, "success": false };
    let validate: any = ajv.compile(msalConfigSchema);

    let inputValid: boolean = validate(msalConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        xcConsole.log("invalid msalConfig: " + message.error);
        deferred.reject(message);
        return deferred.promise();
    }

    msalConfig = jQuery.extend(true, {},
        emptyMsalConfig,
        msalConfigIn);

    let valid: boolean = validate(msalConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
            .then(function(xlrRoot) {
                msalConfigPath = path.join(xlrRoot, msalConfigRelPath);

                authManager.enableB2C(msalConfig.msal.b2cEnabled);

                return (support.writeToFile(msalConfigPath, msalConfig, { "mode": 0o600 }));
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

export function getLdapConfig() {
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "ldapConfigEnabled": false };
    let defaultLdapConfig: any = jQuery.extend({}, emptyLdapConfig);
    let validate: any = ajv.compile(ldapConfigSchema);
    let xlrRoot: string = "";

    support.getXlrRoot()
        .then(function(path) {
            xlrRoot = path;
            return loadConfigModule(xlrRoot, ldapConfigRelPath);
        })
        .then(function(moduleMsg) {
            jQuery.extend(defaultLdapConfig, moduleMsg.data);

            let valid: boolean = validate(defaultLdapConfig);
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

export function setLdapConfig(ldapConfigIn) {
    let deferred: any = jQuery.Deferred();
    let ldapConfigPath: any;
    let writeLdapConfig: any = jQuery.extend();
    let message: any = { "status": httpStatus.OK, "success": false };
    let validate: any = ajv.compile(ldapConfigSchema);

    let inputValid: boolean = validate(ldapConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
        return deferred.promise();
    }

    writeLdapConfig = jQuery.extend(true, {},
        emptyLdapConfig,
        ldapConfigIn);

    let valid: boolean = validate(writeLdapConfig);
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
                return (support.writeToFile(ldapConfigPath, ldapConfig, { "mode": 0o600 }));
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
    let deferred: any = jQuery.Deferred();
    let gotLdapConfig = false;

    if (isLdapConfigSetup && !forceSetup) {
        deferred.resolve();
    } else {
        getLdapConfig()
            .then(function(ldapConfigMsg) {
                // ldapConfig is a global
                ldapConfig = ldapConfigMsg.data;
                gotLdapConfig = true;

                if (!ldapConfig.ldapConfigEnabled) {
                    let errMsg = "LDAP authentication is disabled";
                    xcConsole.log(errMsg);
                    return deferred.reject(errMsg);
                }

                if (ldapConfig.serverKeyFile &&
                    ldapConfig.serverKeyFile != "") {
                    if (!fs.existsSync(ldapConfig.serverKeyFile)) {
                        let errMsg = "server key file does not exist";
                        xcConsole.log(errMsg);
                        return deferred.reject(errMsg);
                    }

                    trustedCerts = [fs.readFileSync(ldapConfig.serverKeyFile)];
                }
                isLdapConfigSetup = true;
                deferred.resolve('setupLdapConfigs succeeds');
            })
            .fail(function(message) {
                let errMsg = (gotLdapConfig) ? message : message.error;
                isLdapConfigSetup = false;
                deferred.reject('setupLdapConfigs fails ' + errMsg);
            });
    }

    return deferred.promise();
}

function getVaultConfig() {
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "vaultEnabled": false };
    let vaultConfig: any = {};
    let validate: any = ajv.compile(vaultConfigSchema);
    let xlrRoot: string = "";

    support.getXlrRoot()
        .then(function(path) {
            xlrRoot = path;
            return loadConfigModule(xlrRoot, vaultConfigRelPath);
        })
        .then(function(moduleMsg) {
            vaultConfig = jQuery.extend(true, {},
                emptyVaultConfig,
                moduleMsg.data);
            let valid: boolean = validate(vaultConfig);

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
    let deferred: any = jQuery.Deferred();
    let vaultConfigPath: any;
    let vaultConfig: any = {};
    let message: any = { "status": httpStatus.OK, "success": false };
    let validate: any = ajv.compile(vaultConfigSchema);

    let inputValid: boolean = validate(vaultConfigIn);
    if (!inputValid) {
        message.error = JSON.stringify(validate.errors);
        xcConsole.log("invalid vaultConfig: " + message.error);
        deferred.reject(message);
        return deferred.promise();
    }

    vaultConfig = jQuery.extend(true, {},
        emptyVaultConfig,
        vaultConfigIn);

    let valid: boolean = validate(vaultConfig);
    if (!valid) {
        message.error = JSON.stringify(validate.errors);
        deferred.reject(message);
    } else {
        support.getXlrRoot()
            .then(function(xlrRoot) {
                vaultConfigPath = path.join(xlrRoot, vaultConfigRelPath);

                return (support.writeToFile(vaultConfigPath, vaultConfig, { "mode": 0o600 }));
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
    let deferred: any = jQuery.Deferred();

    // Save the information of current user into a HashTable
    let currentUser: any = new UserInformation();
    currentUser.setLoginId(loginId);
    users.set(loginId, currentUser);

    // Configure parameters to connect to LDAP
    ldapConn.username = credArray.xiusername;
    ldapConn.password = credArray.xipassword;

    ldapConn.client_url = ldapConfig.ldap_uri.endsWith('/')
        ? ldapConfig.ldap_uri
        : ldapConfig.ldap_uri + '/';

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

    let searchFilter = (ldapConn.searchFilter !== "")
        ? ldapConn.searchFilter.replace('%username%', ldapConn.searchName)
        : undefined;

    let activeDir = ldapConn.activeDir ? ['cn', 'mail', 'memberOf'] : ['cn', 'mail', 'employeeType'];

    ldapConn.searchOpts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: activeDir
    };

    // Use TLS Protocol
    if (ldapConn.useTLS) {
        let tlsOpts = {
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
    let deferred: any = jQuery.Deferred();
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
    let deferred: any = jQuery.Deferred();

    if (!(ldapConn.hasBind) || !(ldapConn.activeDir) ||
        !(ldapConn.useSubGroupTree)) {
        deferred.resolve('No group retrieval needed for ' + groupType);
    } else {
        let searchFilter: string = '';
        let sAMAFilter: string = '(sAMAccountName=' + ldapConn.shortName + ')';

        if (groupType === 'user') {
            searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                "(memberOf:1.2.840.113556.1.4.1941:=" + ldapConn.adUserGroup + "))";
        } else if (groupType === 'admin') {
            searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                "(memberOf:1.2.840.113556.1.4.1941:=" + ldapConn.adAdminGroup + "))";
        } else {
            deferred.reject("Unknown group retrieve type: " + groupType);
        }

        let groupSearchOpts: any = {
            filter: searchFilter,
            scope: 'sub',
            attributes: 'sAMAccountName'
        };

        ldapConn.client.search(ldapConn.userDN, groupSearchOpts, function(error, search) {

            search.on('searchEntry', function(entry) {
                xcConsole.log('Searching entries.....');
                let user = users.get(loginId);

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
        let entryObject: any = entry.object;
        let user: any = users.get(loginId);
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
                if (typeof (entryObject.memberOf) === "string") {
                    entryObject.memberOf = [entryObject.memberOf];
                }
                let array = entryObject.memberOf;
                for (let i = 0; i < array.length; i++) {
                    let element = array[i];
                    let admin_re = new RegExp("^CN=" + adAdminGroup + ",*");
                    if (admin_re.test(element)) {
                        user.setIsADUser(true);
                        user.setEmployeeType("administrator");
                    }
                    let user_re = new RegExp("^CN=" + adUserGroup + ",*");
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

function prepareResponse(loginId, activeDir, credArray) {
    let deferred: any = jQuery.Deferred();
    let user: any = users.get(loginId);
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
            let isAdmin = user.isAdmin();
            let isSupporter = user.isSupporter();
            let userInfo = {
                "xiusername": credArray.xiusername.toLowerCase(),
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
    let deferred: any = jQuery.Deferred();
    // Ldap configuration
    let ldapConn: any = {};
    let currLoginId: number;

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
            return prepareResponse(currLoginId, ldapConn.activeDir, credArray);
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
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "isValid": false };
    let vaultConfig: any = null

    getVaultConfig()
        .then(function(vaultConfigMsg) {
            vaultConfig = vaultConfigMsg.data;

            if (!vaultConfig.vaultEnabled) {
                message.error = "vault is not configured";
                deferred.reject(message);
                return;
            }

            let options = {
                "method": "POST",
                "uri": vaultConfig.vault.vault_uri + "/v1/auth/ldap/login/" + credArray.xiusername,
                "json": { "password": credArray.xipassword }
            }

            request(options, function(error, response, body) {
                if (response.statusCode === httpStatus.OK) {

                    let userInfo: any = {
                        "xiusername": credArray.xiusername.toLowerCase(),
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
                        let revokeOptions = {
                            "method": "POST",
                            "uri": vaultConfig.vault.vault_uri + "/v1/auth/token/revoke",
                            "json": { "token": response.body.auth.client_token },
                            "headers": { "X-Vault-Token": response.body.auth.client_token }
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
            message.error = (vaultConfig) ? errorMsg : errorMsg.error;
            deferred.reject(message);
        });

    return deferred.promise();
}

export function vaultLogout(session) {
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "isValid": false };

    if (session.credentials &&
        session.credentials["vault"]) {
        let token = session.credentials["vault"];

        getVaultConfig()
            .then(function(vaultConfigMsg) {
                let vaultConfig = vaultConfigMsg.data;
                if (!vaultConfig.vaultEnabled) {
                    message.error = "vault is not configured";
                    return deferred.reject(message);
                }

                let options = {
                    "method": "POST",
                    "uri": vaultConfig.vault.vault_uri + "/v1/auth/token/revoke",
                    "json": { "token": token.auth.client_token },
                    "headers": { "X-Vault-Token": token.auth.client_token }
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

export function loginAuthentication(credArray) {
    let deferred: any = jQuery.Deferred();
    let message: any = { "status": httpStatus.OK, "isValid": false };

    if (!credArray || !(credArray.hasOwnProperty("xiusername"))
        || !(credArray.hasOwnProperty("xipassword"))) {
        message.error = "Invalid login request provided";
        return deferred.reject(message).promise();
    }

    // Check if defaultAdmin is turned on
    getDefaultAdmin()
        .then(function(defaultAdminMsg) {
            let defaultAdminConfig = defaultAdminMsg.data;
            if (!defaultAdminConfig.defaultAdminEnabled) {
                // Default admin not enabled. Try LDAP
                return jQuery.Deferred().reject().promise();
            }

            let hmac = crypto.createHmac("sha256", "xcalar-salt")
                .update(credArray.xipassword).digest("hex");

            if (credArray.xiusername === defaultAdminConfig.username &&
                hmac === defaultAdminConfig.password) {

                // Successfully authenticated as defaultAdmin
                let userInfo = {
                    "xiusername": defaultAdminConfig.username,
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
            xcConsole.log(userInfo.xiusername, "successfully logged in.");
            deferred.resolve(userInfo)
        })
        .fail(function(errorMsg) {
            message.error = (errorMsg.error) ? errorMsg.error : errorMsg;
            deferred.reject(message)
        });

    return deferred.promise();
}

export function authenticationInit() {
    let deferred: any = jQuery.Deferred();

    function getDefaultAdminOrNot() {
        let subDeferred = jQuery.Deferred();

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
        let subDeferred = jQuery.Deferred();

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
        let subDeferred = jQuery.Deferred();

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
        let subDeferred = jQuery.Deferred();

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

export function securitySetupAuth(req, res, next) {
    let message: any = { "status": httpStatus.Unauthorized, "success": false };

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

export function setupDefaultAdmin(req, res) {
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

// Below part is only for Unit Test
function fakeGetXlrRoot(func) {
    support.getXlrRoot = func;
}
function fakeSetupLdapConfigs(func) {
    setupLdapConfigs = func;
}
function fakeSetLdapConnection(func) {
    setLdapConnection = func;
}
function fakeLdapAuthentication(func) {
    ldapAuthentication = func;
}
function fakePrepareResponse(func) {
    prepareResponse = func;
}
if (process.env.NODE_ENV === "test") {
    exports.setupLdapConfigs = setupLdapConfigs;
    exports.setLdapConnection = setLdapConnection;
    exports.ldapAuthentication = ldapAuthentication;
    exports.prepareResponse = prepareResponse;
    exports.ldapGroupRetrieve = ldapGroupRetrieve;
    // Replace functions
    exports.fakeSetupLdapConfigs = fakeSetupLdapConfigs;
    exports.fakeSetLdapConnection = fakeSetLdapConnection;
    exports.fakeLdapAuthentication = fakeLdapAuthentication;
    exports.fakePrepareResponse = fakePrepareResponse;
    exports.fakeGetXlrRoot = fakeGetXlrRoot;
}
