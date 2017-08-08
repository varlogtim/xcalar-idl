var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});
var fs = require('fs');
var ldap = require('ldapjs');
var express = require('express');
var router = express.Router();
var ssf = require('../supportStatusFile.js');
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = ssf.Status;
var strictSecurity = false;


var config;
var isSetup;
var trustedCerts;

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

function setupLdapConfigs(isSetup) {
    var deferred = jQuery.Deferred();
    if (isSetup) {
        deferred.resolve();
    } else {
        support.getXlrRoot()
        .then(function(xlrRoot) {
            try {
                var path = xlrRoot + '/config/ldapConfig.json';
                config = require(path);
                trustedCerts = [fs.readFileSync(config.serverKeyFile)];
                setup = true;
                deferred.resolve('setupLdapConfigs succeeds');
            } catch (error) {
                xcConsole.log(error);
                deferred.reject('setupLdapConfigs fails');
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
    if (!credArray || !("xiusername" in credArray)
        || !("xipassword" in credArray)) {
        deferred.reject("setLdapConnection fails");
    } else {
        // Save the information of current user into a HashTable
        var currentUser = new UserInformation();
        currentUser.setLoginId(loginId);
        users.set(loginId, currentUser);

        // Configure parameters to connect to LDAP
        ldapConn.username = credArray["xiusername"];
        ldapConn.password = credArray["xipassword"];

        ldapConn.client_url = ldapConfig.ldap_uri.endsWith('/')
                                        ? ldapConfig.ldap_uri
                                        : ldapConfig.ldap_uri+'/';

        ldapConn.userDN = ldapConfig.userDN;
        ldapConn.searchFilter = ldapConfig.searchFilter;
        ldapConn.activeDir = (ldapConfig.activeDir === 'true');
        ldapConn.useTLS = (ldapConfig.useTLS === 'true');

        ldapConn.adUserGroup = ("adUserGroup" in ldapConfig)
                                        ? ldapConfig.adUserGroup
                                        : "Xce User";

        ldapConn.adAdminGroup = ("adAdminGroup" in ldapConfig)
                                        ? ldapConfig.adAdminGroup
                                        : "Xce Admin";

        ldapConn.client = ldap.createClient({
            url: ldapConn.client_url,
            timeout: 10000,
            connectTimeout: 20000
        });
        if ((ldapConn.activeDir) && ("adDomain" in ldapConfig) &&
            (ldapConn.username.indexOf("@") <= -1)) {
            ldapConn.username = ldapConn.username + "@" + ldapConfig.adDomain;
        }
        var searchFilter = (ldapConn.searchFilter !== "")
                         ? ldapConn.searchFilter.replace('%username%',ldapConn.username)
                         : undefined;

        var activeDir = ldapConn.activeDir ? ['cn','mail','memberOf'] : ['cn','mail','employeeType'];

        ldapConn.searchOpts = {
            filter: searchFilter,
            scope: 'sub',
            attributes: activeDir
        };
        if (!ldapConn.activeDir) {
            ldapConn.userDN = ldapConn.userDN.replace('%username%', ldapConn.username);
            ldapConn.username = ldapConn.userDN;
        }
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
            deferred.reject("ldapAuthentication fails");
        } else {
            xcConsole.log('Success: Binding process finished!');
            ldapConn.client.search(ldapConn.userDN, ldapConn.searchOpts, function(error, search) {
                search.on('searchEntry', function(entry) {
                    xcConsole.log('Searching entries.....');
                    try {
                        writeEntry(entry, loginId, ldapConn.activeDir,
                                   ldapConn.adUserGroup, ldapConn.adAdminGroup);
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
                    ldapConn.client.unbind();
                    deferred.resolve('ldapAuthentication succeeds', loginId);
                });
            });
        }
    });
    return deferred.promise();
}

function writeEntry(entry, loginId, activeDir, adUserGroup, adAdminGroup) {
    if (entry.object) {
        var entryObject = entry.object;
        var user = users.get(loginId);
        user.setEntryCount(user.getEntryCount() + 1);
        user.setMail(entryObject.mail);
        user.setFirstName(entryObject.cn);
        if (activeDir) {
            user.setEmployeeType("user");
            user.setIsADUser(false);
            // For normal user, memberOf is a String
            if (typeof(entryObject.memberOf) === "string") {
                entryObject.memberOf = [entryObject.memberOf];
            }
            var array = entryObject.memberOf;
            for (var i = 0; i < array.length; i++) {
                var element =  array[i];
                var admin_re = new RegExp("^CN=" + adAdminGroup + "*");
                if (admin_re.test(element)) {
                    user.setEmployeeType("administrator");
                }
                var user_re = new RegExp("^CN=" + adUserGroup + "*");
                if (user_re.test(element)) {
                    user.setIsADUser(true);
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
            var message = {
                "status": httpStatus.OK,
                "firstName ": user.firstName,
                "mail": user.mail,
                "isValid": true,
                "isAdmin": isAdmin,
                "isSupporter": isSupporter
            };
            deferred.resolve(message);
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
function loginAuthentication(credArray) {
    var deferred = jQuery.Deferred();
    // Ldap configuration
    var ldapConn = {};

    setupLdapConfigs(isSetup)
    .then(function() {
        return setLdapConnection(credArray, ldapConn, config, globalLoginId);
    })
    .then(function() {
        return ldapAuthentication(ldapConn, globalLoginId);
    })
    .then(function(message, currLoginId) {
        increaseLoginId();
        return prepareResponse(currLoginId, ldapConn.activeDir);
    })
    .then(function(message) {
        deferred.resolve(message);
    })
    .fail(function() {
        if (ldapConn.hasBind) {
            ldapConn.client.unbind();
        }
        var message = {
            "status": httpStatus.OK,
            "firstName ": credArray["xiusername"],
            "mail": credArray["xiusername"],
            "isValid": false,
            "isAdmin": false,
            "isSupporter": false
        };
        deferred.reject(message);
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