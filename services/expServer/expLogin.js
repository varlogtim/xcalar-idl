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

var ssf = require('./supportStatusFile.js');
var httpStatus = require('../../assets/js/httpStatus.js').httpStatus;
var support = require('./expServerSupport.js');
var xcConsole = require('./expServerXcConsole.js').xcConsole;
var Status = ssf.Status;
var strictSecurity = false;

var setup;
var config;
var trustedCerts;

var users = new Map();
var loginId = 0;
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

function loginAuthentication(credArray) {
    var deferredOut = jQuery.Deferred();
    var hasBind = false;
    var username;
    var password;
    var client_url;
    var userDN;
    var searchFilter;
    var activeDir;
    var useTLS;
    var adUserGroup;
    var adAdminGroup;
    var client;
    var searchOpts;

    setUpLdapConfigs()
    .then(function() {
        var deferred = jQuery.Deferred();
        if (credArray && ("xiusername" in credArray)
            && ("xipassword" in credArray)) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
        return deferred.promise();
    })
    .then(function() {
        var deferred = jQuery.Deferred();
        // Save the information of current user into a HashTable
        var currentUser = new UserInformation();
        currentUser.setLoginId(loginId);
        users.set(loginId, currentUser);

        // Configuration Parameter to Connect to LDAP
        username = credArray["xiusername"];
        password = credArray["xipassword"];
        client_url = config.ldap_uri.endsWith('/') ?
                         config.ldap_uri : config.ldap_uri+'/';
        userDN = config.userDN;
        searchFilter = config.searchFilter;
        activeDir = (config.activeDir === 'true');
        useTLS = (config.useTLS === 'true');
        adUserGroup = ("adUserGroup" in config) ?
            config.adUserGroup:"Xce User";
        adAdminGroup = ("adAdminGroup" in config) ?
            config.adAdminGroup:"Xce Admin";
        client = ldap.createClient({
            url: client_url,
            timeout: 10000,
            connectTimeout: 20000
        });
        if ((activeDir) && ("adDomain" in config) &&
            (username.indexOf("@") <= -1)) {
            username = username + "@" + config.adDomain;
        }
        searchOpts = {
            filter: searchFilter !== "" ?
                searchFilter.replace('%username%',username):undefined,
            scope: 'sub',
            attributes: activeDir ?
                ['cn','mail','memberOf']:['cn','mail','employeeType']
        };
        if (!activeDir) {
            userDN = userDN.replace('%username%', username);
            username = userDN;
        }

        // Use TLS Protocol
        if (useTLS) {
            var tlsOpts = {
                cert: trustedCerts,
                rejectUnauthorized: strictSecurity
            };
            xcConsole.log("Starting TLS...");
            client.starttls(tlsOpts, [], function(err) {
                if (err) {
                    xcConsole.log("Failure: TLS start " + err.message);
                    deferred.reject();
                } else {
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    })
    .then(function() {
        // LDAP Authentication
        var deferred = jQuery.Deferred();
        hasBind = true;
        client.bind(username, password, function(error) {
            if (error) {
                xcConsole.log("Failure: Binding process " + error.message);
                loginId++;
                deferred.reject();
            } else {
                xcConsole.log('Success: Binding process finished!');
                client.search(userDN, searchOpts, function(error, search) {
                    deferred.resolve(error, search, loginId);
                    loginId++;
                });
            }
        });
        return deferred.promise();
    })
    .then(function(error, search, currLogin) {
        var deferred = jQuery.Deferred();
        search.on('searchEntry', function(entry) {
            xcConsole.log('Searching entries.....');
            writeEntry(entry, currLogin, activeDir,
                       adUserGroup, adAdminGroup);
        });

        search.on('error', function(error) {
            xcConsole.log('Failure: Searching process' + error.message);
            deferred.reject();
        });

        search.on('end', function() {
            xcConsole.log('Success: Search process finished!');
            client.unbind();
            deferred.resolve(currLogin);
        });
        return deferred.promise();
    })
    .then(function(currLogin) {
        return responseResult(currLogin, activeDir);
    })
    .then(function(message) {
        deferredOut.resolve(message);
    })
    .fail(function() {
        if (hasBind) {
            client.unbind();
        }
        var message = {
            "status": httpStatus.OK,
            "firstName ": credArray["xiusername"],
            "mail": credArray["xiusername"],
            "isValid": false,
            "isAdmin": false,
            "isSupporter": false
        };
        deferredOut.reject(message);
    });
    return deferredOut.promise();
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

function responseResult(loginId, activeDir) {
    var deferred = jQuery.Deferred();
    var user = users.get(loginId);
    if (user.getEntryCount() >= 1) {
        if (user.getEntryCount() > 1) {
            xcConsole.log("Alert: More than one matched user was found");
        }
        // The employeeType is defined when adding new user
        // "administrator" for administrators, "normal user"
        // for normal users.
        if ((activeDir) && (!user.getIsADUser())) {
            xcConsole.log('Failure: User is not in the Xcalar user group.');
            deferred.reject();
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
        deferred.reject();
    }
    return deferred.promise();
}

function setUpLdapConfigs() {
    var deferred = jQuery.Deferred();
    if (setup) {
        deferred.resolve();
    } else {
        var promise = support.getXlrRoot();
        promise
        .always(function(xlrRoot) {
            try {
                var path = xlrRoot + '/config/ldapConfig.json';
                config = require(path);
                trustedCerts = [fs.readFileSync(config.serverKeyFile)];
                setup = true;
                deferred.resolve();
            } catch (error) {
                xcConsole.log(error);
                deferred.reject();
            }
        });
    }
    return deferred.promise();
}

exports.loginAuthentication = loginAuthentication;
