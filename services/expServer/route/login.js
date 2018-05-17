var jQuery;
require("jsdom").env("", function(err, window) {
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
var router = express.Router();
var ssf = require('../supportStatusFile.js');
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = ssf.Status;
var strictSecurity = false;

var msalConfigRelPath = "/config/msalConfig.json";
var msalEnabledField = "msalEnabled";
var msalFieldsRequired = [ "clientId", "userScope", "adminScope", "b2cEnabled" ];
var msalFieldsOptional = [ "webApi", "authority", "azureEndpoint", "azureScopes" ];
var msalFieldsOptionalTypes = [ "string", "string", "string", "array" ];

var ldapConfigRelPath = "/config/ldapConfig.json";
var isLdapConfigSetup = false;
var ldapConfigFieldsRequired = [ "ldap_uri", "userDN", "useTLS", "searchFilter", "activeDir", "serverKeyFile", "ldapConfigEnabled" ];
var ldapConfigFieldsAdOptional = [ "adUserGroup", "adAdminGroup", "adDomain", "adSubGroupTree", "adSearchShortName" ];
var ldapConfig;
var trustedCerts;

var defaultAdminConfigRelPath = "/config/defaultAdmin.json";
var defaultAdminFieldsRequired = [ "username", "password", "email", "defaultAdminEnabled" ];

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

function checkFilePerms(defaultAdminConfigPath) {
    var deferred = jQuery.Deferred();

    fs.stat(defaultAdminConfigPath, function(error, stat) {
        if (error) {
            return deferred.reject("Could not stat " + defaultAdminConfigPath).promise();
        }

        if ((stat.mode & 0777) !== 0600) {
            return deferred.reject("File permissions for " + defaultAdminConfigPath + " are wrong (" + (stat.mode & 0777).toString(8) + " instead of " + 0600.toString(8) + ")").promise();
        }

        deferred.resolve();
    });

    return deferred.promise();
}

function setDefaultAdmin(defaultAdminConfigIn) {
    var deferred = jQuery.Deferred();
    var defaultAdminConfigPath;
    var defaultAdminConfig = {};
    var message = { "status": httpStatus.OK, "success": false };

    try {
        for (var ii = 0; ii < defaultAdminFieldsRequired.length; ii++) {
            if (!(defaultAdminConfigIn.hasOwnProperty(defaultAdminFieldsRequired[ii]))) {
                throw "Invalid adminConfig provided";
            }
            defaultAdminConfig[defaultAdminFieldsRequired[ii]] = defaultAdminConfigIn[defaultAdminFieldsRequired[ii]];
        }
    } catch (error) {
        message.error = error
        return deferred.reject(message).promise();
    }

    support.getXlrRoot()
    .then(function(xlrRoot) {
        defaultAdminConfigPath = path.join(xlrRoot, defaultAdminConfigRelPath);
        defaultAdminConfig.password = crypto.createHmac("sha256", "xcalar-salt").update(defaultAdminConfig.password).digest("hex");

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

    return deferred.promise();
}

function getDefaultAdmin() {
    var deferred = jQuery.Deferred();
    var defaultAdminConfigPath;
    var message = { "status": httpStatus.OK, "defaultAdminEnabled": false };
    var defaultAdminConfig;

    support.getXlrRoot()
    .then(function(xlrRoot) {
        defaultAdminConfigPath = path.join(xlrRoot, defaultAdminConfigRelPath);
        // First, make sure we're the only user that can read/write the file
        return checkFilePerms(defaultAdminConfigPath);
    })
    .then(function() {
        try {
            delete require.cache[require.resolve(defaultAdminConfigPath)];
            defaultAdminConfig = require(defaultAdminConfigPath);
        } catch (error) {
            return jQuery.Deferred().reject("Error reading " + defaultAdminConfigPath + ": " + error).promise();
        }

        for (var ii = 0; ii < defaultAdminFieldsRequired.length; ii++) {
            if (!(defaultAdminConfig.hasOwnProperty(defaultAdminFieldsRequired[ii]))) {
                return jQuery.Deferred().reject(defaultAdminConfigPath + " is corrupted").promise();
            }
        }

        defaultAdminConfig.status = message.status;
        deferred.resolve(defaultAdminConfig);
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function getMsalConfig() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "msalEnabled": false };
    var msalConfig;

    support.getXlrRoot()
    .then(function(xlrRoot) {
        try {
            var msalConfigPath = path.join(xlrRoot, msalConfigRelPath);
            delete require.cache[require.resolve(msalConfigPath)];
            msalConfig = require(msalConfigPath);
        } catch (error) {
            return jQuery.Deferred().reject("Error reading " + msalConfigPath + ": " + error).promise();
        }

        if (!(msalConfig.hasOwnProperty(msalEnabledField))) {
            return jQuery.Deferred().reject(msalConfigPath + " is corrupted").promise();
        }

        for (var idx in msalFieldsRequired) {
            if (!(msalConfig.msal.hasOwnProperty(msalFieldsRequired[idx]))) {
                return jQuery.Deferred().reject(msalConfigPath + " is corrupted").promise();
            }
        }

        for (var idx in msalFieldsOptional) {
            type = msalFieldsOptionalTypes[idx];

            if (!(msalConfig.msal.hasOwnProperty(msalFieldsOptional[idx]))) {
                if (type === "string") {
                    msalConfig.msal[msalFieldsOptional[idx]] = "";
                } else if (type === "array") {
                    msalConfig.msal[msalFieldsOptional[idx]] = [];
                }
            }
        }

        msalConfig.status = message.status;
        deferred.resolve(msalConfig);
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setMsalConfig(msalConfigIn) {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "success": false }
    var msalConfigPath;
    var msalConfig = {
        msalEnabled: null,
        msal: {
        }
    };

    support.getXlrRoot()
    .then(function(xlrRoot) {
        // Make a copy of existing msalConfig.json if it exists
        msalConfigPath = path.join(xlrRoot, msalConfigRelPath);
        return (support.makeFileCopy(msalConfigPath));
    })
    .then(function() {
        if (!(msalConfigIn.hasOwnProperty(msalEnabledField))) {
            deferred.reject("Invalid msalConfig provided");
        }

        for (var idx in msalFieldsRequired) {
            if (!(msalConfigIn.msal.hasOwnProperty(msalFieldsRequired[idx]))) {
                deferred.reject("Invalid msalConfig provided");
            }
        }

        for (var key in msalConfigIn.msal) {
            oIdx = msalFieldsOptional.indexOf(key);

            if (oIdx !== -1) {
                oType = msalFieldsOptionalTypes[oIdx];

                if ((oType === "string" &&
                     msalConfigIn.msal[msalFieldsOptional[oIdx]] === "") ||
                    (oType === "array" &&
                     msalConfigIn.msal[msalFieldsOptional[oIdx]].length === 0)) {
                    delete msalConfigIn.msal[msalFieldsOptional[oIdx]];
                }
            }
        }

        jQuery.extend(msalConfig, msalConfigIn);

        return (support.writeToFile(msalConfigPath, msalConfig, {"mode": 0600}));
    })
    .then(function () {
        message.success = true;
        deferred.resolve(message);
    })
    .fail(function (errorMsg) {
        message.error = errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setLdapConfig(ldapConfigIn) {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "success": false }
    var ldapConfigPath;
    var ldapConfigOut = {};

    support.getXlrRoot()
    .then(function(xlrRoot) {
        // Make a copy of existing ldapConfig.json if it exists
        ldapConfigPath = path.join(xlrRoot, ldapConfigRelPath);
        return (support.makeFileCopy(ldapConfigPath));
    })
    .then(function() {
        try {
            for (var ii = 0; ii < ldapConfigFieldsRequired.length; ii++) {
                if (!(ldapConfigIn.hasOwnProperty(ldapConfigFieldsRequired[ii]))) {
                    throw "Invalid ldapConfig provided"
                }
                ldapConfigOut[ldapConfigFieldsRequired[ii]] = ldapConfigIn[ldapConfigFieldsRequired[ii]];
            }

            for (var ii = 0; ii < ldapConfigFieldsAdOptional.length; ii++) {
                if (ldapConfigIn.hasOwnProperty(ldapConfigFieldsAdOptional[ii])) {
                    ldapConfigOut[ldapConfigFieldsAdOptional[ii]] = ldapConfigIn[ldapConfigFieldsAdOptional[ii]];
                }
            }
        } catch (error) {
            return jQuery.Deferred().reject(error).promise();
        }

        return (support.writeToFile(ldapConfigPath, ldapConfigOut, {"mode": 0600}));
    })
    .then(function() {
        message.success = true;
        // Force a refresh of setupLdapConfigs the next time we get an ldap authentication request
        isLdapConfigSetup = false;
        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        message.error = errorMsg.toString();
        deferred.reject(message);
    });

    return deferred.promise();
}

function getLdapConfig() {
    var deferred = jQuery.Deferred();
    var message = { "status": httpStatus.OK, "ldapConfigEnabled": false };
    var ldapConfigOut;

    support.getXlrRoot()
    .then(function(xlrRoot) {
        try {
            var ldapConfigPath = path.join(xlrRoot, ldapConfigRelPath);
            delete require.cache[require.resolve(ldapConfigPath)];
            ldapConfigOut = require(ldapConfigPath);
        } catch (error) {
            return jQuery.Deferred().reject("Error reading " + ldapConfigPath + ": " + error).promise();
        }

        for (var ii = 0; ii < ldapConfigFieldsRequired.length; ii++) {
            if (!(ldapConfigOut.hasOwnProperty(ldapConfigFieldsRequired[ii]))) {
                return jQuery.Deferred().reject(ldapConfigPath + " is corrupted").promise();
            }
        }

        ldapConfigOut.status = message.status;
        deferred.resolve(ldapConfigOut);
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message);
    });

    return deferred.promise();
}

function setupLdapConfigs(forceSetup) {
    var deferred = jQuery.Deferred();
    if (isLdapConfigSetup && !forceSetup) {
        deferred.resolve();
    } else {
        support.getXlrRoot()
        .then(function(xlrRoot) {
            try {
                var ldapConfigPath = path.join(xlrRoot, ldapConfigRelPath);
                delete require.cache[require.resolve(ldapConfigPath)];
                ldapConfig = require(ldapConfigPath);
                if (!ldapConfig.ldapConfigEnabled) {
                    throw "LDAP authentication is disabled";
                }

                trustedCerts = [fs.readFileSync(ldapConfig.serverKeyFile)];
                isLdapConfigSetup = true;
                deferred.resolve('setupLdapConfigs succeeds');
            } catch (error) {
                xcConsole.log(error);
                deferred.reject('setupLdapConfigs failed: ' + error);
            }
        })
        .fail(function() {
            deferred.reject('setupLdapConfigs fails');
        });
    }
    return deferred.promise();
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
            ldapConn.client.unbind();
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
        user.setMail(entryObject.mail);
        user.setFirstName(entryObject.cn);
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
                "firstName ": user.firstName,
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
        deferred.resolve(message);
    })
    .fail(function(errorMsg) {
        if (ldapConn.hasBind) {
            ldapConn.client.unbind();
        }
        deferred.reject(errorMsg);
    });

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
    .then(function(defaultAdminConfig) {
        if (!defaultAdminConfig.defaultAdminEnabled) {
            // Default admin not enabled. Try LDAP
            return jQuery.Deferred().reject().promise();
        }

        var hmac = crypto.createHmac("sha256", "xcalar-salt").update(credArray.xipassword).digest("hex");

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
            return userInfo;
        },

        // Did not authenticate as default admin, either because
        // getDefaultAdmin() failed, or credArray.defaultAdminEnabled is false
        // or credArray.xiusername/xipassword is wrong
        function() {
            return ldapLogin(credArray);
        }
    )
    .then(function(userInfo) {
        // We've authenticated successfully with either ldap or default admin
        userInfo.status = message.status;
        deferred.resolve(userInfo)
    })
    .fail(function(errorMsg) {
        message.error = errorMsg;
        deferred.reject(message)
    });

    return deferred.promise();
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
router.post('/login', function(req, res) {
    xcConsole.log("Login process");
    var credArray = req.body;
    loginAuthentication(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post('/login/msalConfig/get', function(req, res) {
    getMsalConfig()
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post('/login/msalConfig/set', function(req, res) {
    var credArray = req.body;
    setMsalConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post('/login/defaultAdmin/get', function(req, res) {
    getDefaultAdmin()
    .always(function(message) {
        // Don't return password
        delete message.password
        res.status(message.status).send(message);
    }
    );
});

router.post('/login/defaultAdmin/set', function(req, res) {
    var credArray = req.body;
    setDefaultAdmin(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post('/login/ldapConfig/set', function(req, res) {
    var credArray = req.body;
    setLdapConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post('/login/ldapConfig/get', function(req, res) {
    getLdapConfig()
    .always(function(message) {
        res.status(message.status).send(message);
    })
});

// Below part is only for Unit Test
function fakeSetupLdapConfigs() {
    setupLdapConfigs = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeSetLdapConnection() {
    setLdapConnection = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakeLdapAuthentication() {
    ldapAuthentication = function() {
        return jQuery.Deferred().resolve().promise();
    };
}
function fakePrepareResponse(reject){
    prepareResponse = function() {
        var msg = {
            "status": httpStatus.OK,
            "isValid": true
        };
        if (reject){
            return jQuery.Deferred().reject().promise();
        }
        else return jQuery.Deferred().resolve(msg).promise();
    };
}

function fakeLoginAuthentication(){
    loginAuthentication = function() {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": 200,
            "logs": "Fake response login!"
        };
        return deferred.resolve(retMsg).promise();
    };
}

if (process.env.NODE_ENV === "test") {
    exports.setupLdapConfigs = setupLdapConfigs;
    exports.setLdapConnection = setLdapConnection;
    exports.ldapAuthentication = ldapAuthentication;
    exports.prepareResponse = prepareResponse;
    exports.loginAuthentication = loginAuthentication;
    // Replace functions
    exports.fakeSetupLdapConfigs = fakeSetupLdapConfigs;
    exports.fakeSetLdapConnection = fakeSetLdapConnection;
    exports.fakeLdapAuthentication = fakeLdapAuthentication;
    exports.fakePrepareResponse = fakePrepareResponse;
    exports.fakeLoginAuthentication = fakeLoginAuthentication;
}

exports.router = router;
