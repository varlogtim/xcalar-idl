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

var ssf = require('./supportStatusFile');
var support = require('./support.js');
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

    isSupporter: function() {
        return this.employeeType == "supporter";
    },
    isAdmin: function() {
        return this.employeeType == "administrator";
    }
};

function loginAuthentication(credArray, res) {
    var ldapPromise = setUpLdapConfigs();
    ldapPromise
    .then(function() {
        if (credArray) {
            // here is the LDAP related material
            // it's activated if xiusername is in the request body
            if (("xiusername" in credArray) && ("xipassword" in credArray)) {

                // Save the information of current user into a HashTable
                var currentUser = new UserInformation();
                currentUser.setLoginId(loginId);
                users.set(loginId, currentUser);

                // Configuration Parameter to Connect to LDAP
                var username = credArray["xiusername"];
                var password = credArray["xipassword"];
                var client_url = config.ldap_uri.endsWith('/') ?
                                 config.ldap_uri : config.ldap_uri+'/';
                var userDN = config.userDN;
                var searchFilter = config.searchFilter;
                var activeDir = (config.activeDir === 'true');
                var useTLS = (config.useTLS === 'true');
                var client = ldap.createClient({
                    url: client_url,
                    timeout: 10000,
                    connectTimeout: 20000
                });
                var searchOpts = {
                    filter: searchFilter != "" ?
                        searchFilter.replace('%username%',username):undefined,
                    scope: 'sub',
                    attributes: ['cn','mail','employeeType']
                };
                if (!activeDir) {
                    userDN = userDN.replace('%username%', username);
                    username = userDN;
                }

                var deferredTLS = jQuery.Deferred();
                // Use TLS Protocol
                if (useTLS) {
                    var tlsOpts = {
                        cert: trustedCerts,
                        rejectUnauthorized: strictSecurity
                    };
                    console.log("Starting TLS...");
                    client.starttls(tlsOpts, [], function(err) {
                        if (err) {
                            console.log("TLS startup error: " + err.message);
                            deferredTLS.reject();
                        }
                        deferredTLS.resolve();
                    });
                } else {
                    deferredTLS.resolve();
                }

                deferredTLS.promise()
                .then(function() {
                    // LDAP Authentication
                    var deferred = jQuery.Deferred();
                    client.bind(username, password, function(error) {
                        if (error) {
                            console.log("Bind Error! " + error.message)
                            loginId++;
                            deferred.reject();
                        } else {
                            console.log('Bind Successful!');
                            client.search(userDN, searchOpts,
                                          function(error, search) {
                                deferred.resolve(error, search, loginId);
                                loginId++;
                            });
                       }
                    });
                    return deferred.promise();
                })
                .then(function(error, search, currLogin) {
                    var deferred2 = jQuery.Deferred();
                    search.on('searchEntry', function(entry) {
                        console.log('Searching entries.....');
                        writeEntry(entry, currLogin);
                    });

                    search.on('error', function(error) {
                        console.log('Search error: ' + error.message);
                        deferred2.reject();
                    });

                    search.on('end', function(result) {
                        console.log('Finished Search!');
                        client.unbind();
                        deferred2.resolve(currLogin);
                    });
                    return deferred2.promise();
                })
                .then(function(currLogin) {
                    responseResult(currLogin, res);
                })
                .fail(function() {
                    client.unbind();
                    responseError(res);
                });
            } else {
                responseError(res);
            }
        } else {
            responseError(res);
        }
    });
}

function writeEntry(entry, loginId) {
    if(entry.object){
        var entryObject = JSON.parse(JSON.stringify(entry.object));
        var user = users.get(loginId);
        user.setEntryCount(user.getEntryCount() + 1);
        user.setMail(entryObject.mail);
        user.setFirstName(entryObject.cn);
        user.setEmployeeType(entryObject.employeeType);
    }
}

function responseResult(loginId, res) {
    var user = users.get(loginId);
    if (user.getEntryCount() >= 1) {
        if (user.getEntryCount() > 1) {
            console.log("More than one matched user was found");
        }
        // The employeeType is defined when adding new user
        // "administrator" for administrators, "normal user"
        // for normal users.
        var isAdmin = user.isAdmin();
        var isSupporter = user.isSupporter();
        res.send({"status": Status.Ok,
                  "firstName ": user.firstName,
                  "mail": user.mail,
                  "isAdmin": isAdmin,
                  "isSupporter": isSupporter});
    } else {
        console.log("No matched user");
        responseError(res);
    }
}

function setUpLdapConfigs() {
    var deferred = jQuery.Deferred();
    if(setup) {
        deferred.resolve();
    } else {
        var promise = support.getXlrRoot();
        promise
        .always(function(xlrRoot) {
            var path = xlrRoot + '/config/ldapConfig.json';
            config = require(path);
            trustedCerts = [fs.readFileSync(config.serverKeyFile)];
            setup = true;
            deferred.resolve();
        });
    }
    return deferred.promise();
}

function responseError(res) {
    res.send({"status":Status.Error});
}

exports.loginAuthentication = loginAuthentication;