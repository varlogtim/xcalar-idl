describe('ExpServer Login Test', function() {
    // Test setup
    var expect = require('chai').expect;
    const path = require('path');
    const fs = require('fs');
    const ldap = require('ldapjs');
    const request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    this.timeout(5000);

    require('jquery');

    var login = require(__dirname + '/../../expServer/route/login.js');
    var support = require(__dirname + '/../../expServer/expServerSupport.js');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var httpStatus = require(__dirname + "/../../../assets/js/httpStatus.js").httpStatus;

    function postRequest(action, url, str, jar) {
        var deferred = jQuery.Deferred();
        // this ensures that returned JSON is parsed
        if (!str) {
            str = {};
        }
        var options = {
            "method": action,
            "uri": "http://localhost:12125" + url,
            "json": str
        };
        if (jar) {
            options['jar'] = jar;
        }

        request(options, function(error, response, body) {
            if (response.statusCode === httpStatus.OK) {
                deferred.resolve(response);
            } else {
                deferred.reject(response);
            }
        });
        return deferred.promise();
    }

    function copySync(src, dest) {
        if (!fs.existsSync(src)) {
            return false;
        }

        var data = fs.readFileSync(src, 'utf-8');
        fs.writeFileSync(dest, data);
    }

    var testLoginId;
    var testCredArray;
    var testLdapConn;
    var testConfig;
    var oldRoot;
    var fakeRoot;
    var emptyPromise;
    var setCredentialTrue = { 'valid': true, 'status': httpStatus.OK };

    // Test begins
    before(function() {
        // restore ldapConfig.json to a known good copy
        copySync(__dirname + '/../../test/config/ldapConfig.json.good',
                 __dirname + '/../../test/config/ldapConfig.json');

        testLoginId = 0;
        testLoginId2 = 0;
        testLoginId3 = 0;
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };
        testCredArray2 = {
            xiusername: "xdtestuser",
            xipassword: "welcome1"
        }
        testConfig = {
            ldap_uri: "ldap://openldap1-1.xcalar.net:389",
            userDN: "mail=%username%,ou=People,dc=int,dc=xcalar,dc=com",
            useTLS: false,
            searchFilter: "(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)",
            activeDir: false,
            serverKeyFile: "/etc/ssl/certs/ca-certificates.crt"
        };
        testConfig2 = {
            "ldap_uri":"ldap://pdc1.int.xcalar.com:389",
            "userDN":"dc=int,dc=xcalar,dc=net",
            "useTLS":true,
            "searchFilter":"(&(objectclass=user)(userPrincipalName=%username%))",
            "activeDir":true,
            "serverKeyFile":"/etc/ssl/certs/ca-certificates.crt",
            "ldapConfigEnabled":true,
            "adUserGroup":"CN=GlobalXcalarUsers,CN=Users,DC=int,DC=xcalar,DC=net",
            "adAdminGroup":"CN=GlobalXcalarAdmins,CN=Users,DC=int,DC=xcalar,DC=net",
            "adDomain":"int.xcalar.net",
            "adSubGroupTree": true,
            "adSearchShortName": false
        };
        testConfig3 = {
            "ldap_uri":"ldap://pdc1.int.xcalar.com:389",
            "userDN":"dc=int,dc=xcalar,dc=net",
            "useTLS":true,
            "searchFilter":"(&(objectclass=user)(userPrincipalName=%username%))",
            "activeDir":true,
            "serverKeyFile":"/etc/ssl/certs/ca-certificates.crt",
            "ldapConfigEnabled":true,
            "adUserGroup":"XcalarUserEngineeringSubGroup",
            "adAdminGroup":"Xce Admins",
            "adDomain":"int.xcalar.net",
            "adSubGroupTree": false,
            "adSearchShortName": false
        };
        testLdapConn = {};
        testLdapConn2 = {};
        testLdapConn3 = {};
        oldRoot = support.getXlrRoot;
        fakeRoot = function() {
            return jQuery.Deferred().resolve(__dirname + "/../../test").promise();
        };
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        };
        ldapEmptyPromise = function(credArray, ldapConn, ldapConfig, currLoginId) {
            ldapConn.client = ldap.createClient({
                url: testLdapConn.client_url,
                timeout: 10000,
                connectTimeout: 20000
            });
            return jQuery.Deferred().resolve().promise();
        };
        resolveResponse = function() {
            var msg = {
                "status": httpStatus.OK,
                "isValid": true
            };
            if (reject){
                return jQuery.Deferred().reject().promise();
            }
            else return jQuery.Deferred().resolve(msg).promise();
        };

        support.checkAuthTrue(support.userTrue);
        support.checkAuthAdminTrue(support.adminTrue);
    });

    after(function() {
        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
    });

    it("login.setupLdapConfigs should work", function(done) {
        login.fakeGetXlrRoot(fakeRoot);
        login.setupLdapConfigs(true)
        .then(function(ret) {
            expect(ret).to.equal("setupLdapConfigs succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it("login.setupLdapConfigs should fail when getXlrRoot fails", function(done) {
        var fakeFunc = function() {
            return jQuery.Deferred().reject("TestError").promise();
        };
        login.fakeGetXlrRoot(fakeFunc);
        login.setupLdapConfigs(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.have.string("setupLdapConfigs fails TestError");
            done();
        })
        .always(function() {
            support.fakeGetXlrRoot(oldRoot);
        });
    });

    it("login.setupLdapConfigs should fail when XlrRoot is bad", function(done) {
        var fakeFunc = function() {
            return jQuery.Deferred().resolve("/never/nopath").promise();
        };
        login.fakeGetXlrRoot(fakeFunc);
        login.setupLdapConfigs(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.have.string("setupLdapConfigs fails config file path does not exist:");
            done();
        })
        .always(function() {
            support.fakeGetXlrRoot(oldRoot);
        });
    });


    it('login.setLdapConnection should work', function(done) {
        login.setLdapConnection(testCredArray, testLdapConn, testConfig, testLoginId)
        .then(function(ret) {
            expect(ret).to.equal("setLdapConnection succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.loginAuthentication should fail when error', function(done) {
        testCredArray = {};
        login.loginAuthentication(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function(message) {
            expect(message.error).to.equal("Invalid login request provided");
            done();
        });
    });

    it('login.ldapAuthentication should fail when error', function(done) {
        var invalidConn = jQuery.extend(true, {}, testLdapConn);
        invalidConn.client = ldap.createClient({
            url: testLdapConn.client_url,
            timeout: 10000,
            connectTimeout: 20000
        });
        invalidConn.username = "invalid";
        invalidConn.password = null;
        login.ldapAuthentication(invalidConn, testLoginId)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("ldapAuthentication fails");
            done();
        });
    });

    it('login.ldapAuthentication should work', function(done) {
        testLdapConn.client = ldap.createClient({
            url: testLdapConn.client_url,
            timeout: 10000,
            connectTimeout: 20000
        });
        login.ldapAuthentication(testLdapConn, testLoginId)
        .then(function(ret) {
            expect(ret).to.equal("ldapAuthentication succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.prepareResponse should work', function(done) {
        login.prepareResponse(testLoginId, testLdapConn.activeDir)
        .then(function(ret) {
            expect(ret.isValid).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.prepareResponse should fail when error', function(done) {
        login.prepareResponse(-1, testLdapConn.activeDir)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("prepareResponse fails");
            done();
        });
    });

    it('login.ldapAuthentication with AD should work', function(done) {
        login.setLdapConnection(testCredArray2, testLdapConn2, testConfig2, testLoginId2)
        .then(function(ret) {
            expect(ret).to.equal("setLdapConnection succeeds");
            return login.ldapAuthentication(testLdapConn2, testLoginId2);
        })
        .then(function(ret) {
            expect(ret).to.equal("ldapAuthentication succeeds");
            return login.ldapGroupRetrieve(testLdapConn2, 'user', testLoginId2);
        })
        .then(function(ret) {
            expect(ret).to.equal('Group search process succeeds for user');
            return login.ldapGroupRetrieve(testLdapConn2, 'admin', testLoginId2);
        })
        .then(function(ret) {
            expect(ret).to.equal('Group search process succeeds for admin');
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.ldapAuthentication with AD subgroup search should work', function(done) {
        login.setLdapConnection(testCredArray2, testLdapConn3, testConfig3, testLoginId3)
        .then(function(ret) {
            expect(ret).to.equal("setLdapConnection succeeds");
            return login.ldapAuthentication(testLdapConn3, testLoginId3);
        })
        .then(function(ret) {
            expect(ret).to.equal("ldapAuthentication succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.loginAuthentication should work', function(done) {
        testCredArray = { "xiusername": "foo", "xipassword": "bar" };
        login.fakeGetXlrRoot(fakeRoot);
        var oldConfig = login.setupLdapConfigs;
        var oldConn = login.setLdapConnection;
        var oldAuth = login.ldapAuthentication;
        var oldResponse = login.prepareResponse;
        login.fakeSetupLdapConfigs(emptyPromise);
        login.fakeSetLdapConnection(ldapEmptyPromise);
        login.fakeLdapAuthentication(emptyPromise);
        var fakeResponse = function() {
            var msg = {
                "status": 200,
                "isValid": true
            };
            return jQuery.Deferred().resolve(msg).promise();
        };
        login.fakePrepareResponse(fakeResponse);
        login.loginAuthentication(testCredArray)
        .then(function(ret) {
            expect(ret.isValid).to.be.true;
            done();
        })
        .fail(function(message) {
            done("fail: " + JSON.stringify(message));
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
            login.fakeSetupLdapConfigs(oldConfig);
            login.fakeSetLdapConnection(oldConn);
            login.fakeLdapAuthentication(oldAuth);
            login.fakePrepareResponse(oldResponse);
        });
    });

    it('login.loginAuthentication should fail when error', function(done) {
        testCredArray = { "xiusername": "nobody", "xipassword": "wrong" };
        var oldConfig = login.setupLdapConfigs;
        var oldConn = login.setLdapConnection;
        var oldAuth = login.ldapAuthentication;
        var oldResponse = login.prepareResponse;
        login.fakeSetupLdapConfigs(emptyPromise);
        login.fakeSetLdapConnection(emptyPromise);
        login.fakeLdapAuthentication(emptyPromise);
        var fakeResponse = function() {
            return jQuery.Deferred().reject().promise();
        };
        login.fakePrepareResponse(fakeResponse);
        login.loginAuthentication(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.isValid).to.be.false;
            done();
        })
        .always(function() {
            login.fakeSetupLdapConfigs(oldConfig);
            login.fakeSetLdapConnection(oldConn);
            login.fakeLdapAuthentication(oldAuth);
            login.fakePrepareResponse(oldResponse);
        });
    });

    it('Router should work with login action', function(done) {
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };
        login.fakeGetXlrRoot(fakeRoot);

        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp1_first",
            "isAdmin": true,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson1@gmail.com",
            "xiusername": "sPerson1@gmail.com"
        };
        postRequest("POST", "/login", testCredArray)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should work with login and logout action', function(done) {
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };
        login.fakeGetXlrRoot(fakeRoot);

        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp1_first",
            "isAdmin": true,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson1@gmail.com",
            "xiusername": "sPerson1@gmail.com"
        };
        var expectedRetMsg2 = {
            'status': 200,
            'message': 'User ' + expectedRetMsg.mail + ' is logged out'
        }
        var cookieJar = request.jar();

        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
        postRequest("POST", "/login", testCredArray, cookieJar)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            return(postRequest("POST", "/logout", {}, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg2);
            return(postRequest("POST", "/login/ldapConfig/get", {} , cookieJar));
        })
        .then(function(ret) {
            // if this succeeds than logout did not work
            done("fail");
        }, function(ret) {
            expect(ret.statusCode).to.equal(401);
            done();
            // this swallows the failure
            return jQuery.Deferred().resolve().promise();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            support.checkAuthTrue(support.userTrue);
            support.checkAuthAdminTrue(support.adminTrue);
        });
    });

    it("User authentication should work", function(done) {
        testCredArray = {
            xiusername: "sPerson2@gmail.com",
            xipassword: "5678"
        };
        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp2_first",
            "isAdmin": false,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson2@gmail.com",
            "xiusername": "sPerson2@gmail.com"
        };
        var body = { one: "two",
                     three: "four" };
        var cookieJar = request.jar();

        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
        postRequest("POST", "/login/test/user", body)
        .then(function(err) {
            return jQuery.Deferred().reject(err).promise();
        }, function(res) {
            expect(res.statusCode).to.equal(httpStatus.Unauthorized);
            return(postRequest("POST", "/login", testCredArray, cookieJar));
        })
        .then(function(res) {
            expect(res.body).to.deep.equal(expectedRetMsg);
            return(postRequest("POST", "/login/test/user", body, cookieJar));
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(httpStatus.OK);
            return(postRequest("POST", "/login/test/admin", body, cookieJar));
        })
        .then(function(err) {
            return jQuery.Deferred().reject(err).promise();
        }, function(res) {
            expect(res.statusCode).to.equal(httpStatus.Unauthorized);
            done();
            // this swallows the failure
            return jQuery.Deferred().resolve().promise();
        })
        .fail(function(err) {
            console.log('Test Error: ' + JSON.stringify(err));
            done("fail");
        })
        .always(function() {
            support.checkAuthTrue(support.userTrue);
            support.checkAuthAdminTrue(support.adminTrue);
        });
    });

    it("Admin authentiction should work", function(done) {
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };
        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp1_first",
            "isAdmin": true,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson1@gmail.com",
            "xiusername": "sPerson1@gmail.com"
        };
        var body = { one: "two",
                     three: "four" };
        var cookieJar = request.jar();

        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
        postRequest("POST", "/login/test/admin", body)
        .then(function(err) {
            return jQuery.Deferred().reject(err).promise();
        }, function(res) {
            expect(res.statusCode).to.equal(httpStatus.Unauthorized);
            return(postRequest("POST", "/login", testCredArray, cookieJar));
        })
        .then(function(res) {
            expect(res.body).to.deep.equal(expectedRetMsg);
            return(postRequest("POST", "/login/test/admin", body, cookieJar));
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(httpStatus.OK);
            return(postRequest("POST", "/login/test/user", body, cookieJar));
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(httpStatus.OK);
            done();
        })
        .fail(function(err) {
            console.log('Test Error: ' + JSON.stringify(err));
            done("fail");
        })
        .always(function() {
            support.checkAuthTrue(support.userTrue);
            support.checkAuthAdminTrue(support.adminTrue);
        });
    });

    it("User authentication timeout should work", function(done) {
        testCredArray = {
            xiusername: "sPerson2@gmail.com",
            xipassword: "5678"
        };
        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp2_first",
            "isAdmin": false,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson2@gmail.com",
            "xiusername": "sPerson2@gmail.com"
        };
        var body = { one: "two",
                     three: "four" };
        var cookieJar = request.jar();

        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
        support.setTestMaxAge(3000);
        support.fakeLoginAuth(support.loginAuthTest);
        postRequest("POST", "/login", testCredArray, cookieJar)
        .then(function(res) {
            expect(res.body).to.deep.equal(expectedRetMsg);
            // The callback in setTimeout runs asynchronously and
            // independently after the .fail/.always blocks in this
            // chain of promises.  It must do its own init/cleanup
            // separate from the routine that sets it up.
            setTimeout(function() {
                support.checkAuthTrue(support.checkAuthImpl);
                postRequest("POST", "/login/test/user", body, cookieJar)
                .then(function() {
                    done("fail");
                }, function(res) {
                    expect(res.statusCode).to.equal(httpStatus.Unauthorized);
                    done();
                })
                .always(function() {
                    support.checkAuthTrue(support.userTrue);
                });
            }, 3500);
        })
        .fail(function(err) {
            done("fail");
        })
        .always(function() {
            support.checkAuthTrue(support.userTrue);
            support.checkAuthAdminTrue(support.adminTrue);
            support.fakeLoginAuth(support.loginAuthImpl);
            support.setTestMaxAge(support.testMaxAge);
        });
    });

    it("Credential functions should work", function(done) {
        var key1 = {
            'key': 'setCredentialKey1',
            'data': 'setCredentialKeyData1'
        };
        var key2 = {
            'key': 'setCredentialKey2',
            'data': 'setCredentialKeyData2'
        };
        var testStatus = false;

        testCredArray = {
            xiusername: "sPerson2@gmail.com",
            xipassword: "5678"
        };
        var expectedRetMsg = {
            "status": 200,
            "firstName": "sp2_first",
            "isAdmin": false,
            "isSupporter": false,
            "isValid": true,
            "mail": "sPerson2@gmail.com",
            "xiusername": "sPerson2@gmail.com"
        };
        var cookieJar = request.jar();

        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
        postRequest("POST", "/login", testCredArray, cookieJar)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            return(postRequest("POST", "/auth/setCredential", key1, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body).to.deep.equal(setCredentialTrue);
            return(postRequest("POST", "/auth/getCredential",
                               { 'key': 'setCredentialKey1' }, cookieJar));
        })
        .then(function(ret)  {
            expect(ret.body.status).to.equal(httpStatus.OK);
            expect(ret.body.data).to.equal('setCredentialKeyData1');
            return(postRequest("POST", "/auth/setCredential", key2, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body).to.deep.equal(setCredentialTrue);
            return(postRequest("GET", "/auth/listCredentialKeys", {}, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body.data).to.deep.equal(['setCredentialKey1', 'setCredentialKey2']);
            return(postRequest("POST", "/auth/delCredential", {'key':'setCredentialKey1'}, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body.status).to.equal(httpStatus.OK);
            return(postRequest("GET", "/auth/listCredentialKeys", {}, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body.data).to.deep.equal(['setCredentialKey2']);
            testStatus = true;
        })
        .fail(function(err) {
            console.log("Test ERR: " + JSON.stringify(err));
        })
        .then(function() {
            return(postRequest("GET", "/auth/clearCredentials", {}, cookieJar));
        })
        .then(function(ret) {
            expect(ret.body.status).to.equal(httpStatus.OK);
            support.checkAuthTrue(support.userTrue);
            support.checkAuthAdminTrue(support.adminTrue);
            if (testStatus) {
                done();
            } else {
                done('fail');
            }
        });
    });

    it('Router should fail with invalid endpoint', function(done) {
        postRequest("POST", "/invalidUrl")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.statusCode).to.deep.equal(404);
            done();
        });
    });

    it('Router should fail with setMsalConfig action and bogus msalConfig', function(done) {
        var credArray = {
            bogus: "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": '[{"keyword":"required","dataPath":"","schemaPath":"#/required","params":{"missingProperty":"msalEnabled"},"message":"should have required property \'msalEnabled\'"}]'
        };

        postRequest("POST", "/login/msalConfig/set", credArray)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should fail with setMsalConfig action and invalid directory', function(done) {
        var fakeFunc = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };
        login.fakeGetXlrRoot(fakeFunc);

        var credArray = {
            msalEnabled: true,
            msal: {
                clientId: "legitLookingClient",
                adminScope: "api%3A%2F%2FsomethingAdminReasonable",
                userScope: "api%3A%2F%2FsomethingUserReasonable",
                b2cEnabled: false
            }
        };

        postRequest("POST", "/login/msalConfig/set", credArray)
        .then(function(ret) {
            expect(ret.body.error).to.have.string("Failed to write");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should work with proper setMsalConfig action and getMsalConfig action', function(done) {
        login.fakeGetXlrRoot(fakeRoot);
        var setArray = {
            msalEnabled: true,
            msal: {
                clientId: Math.floor(Math.random() * 1000).toString(),
                adminScope: "api%3A%2F%2FsomethingAdminReasonable",
                userScope: "api%3A%2F%2FsomethingUserReasonable",
                b2cEnabled: false
            }
        };

        postRequest("POST", "/login/msalConfig/set", setArray)
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            expect(ret.body).to.deep.equal(expectedRetMsg)

            return (postRequest("POST", "/login/msalConfig/get"));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "msalEnabled": true,
                "msal": {
                    "clientId": setArray.msal.clientId,
                    "adminScope": setArray.msal.adminScope,
                    "userScope": setArray.msal.userScope,
                    "b2cEnabled": setArray.msal.b2cEnabled,
                    "authority": "",
                    "azureEndpoint": "",
                    "azureScopes": [],
                    "webApi": ""
                },
            };

            expect(ret.body).to.deep.equal(expectedRetMsg);

            // Now disable msal
            setArray["msalEnabled"] = false;
            return (postRequest("POST", "/login/msalConfig/set", setArray));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            expect(ret.body).to.deep.equal(expectedRetMsg)
            return (postRequest("POST", "/login/msalConfig/get"));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "msalEnabled": false,
                "msal": {
                    "clientId": setArray.msal.clientId,
                    "adminScope": setArray.msal.adminScope,
                    "userScope": setArray.msal.userScope,
                    "b2cEnabled": setArray.msal.b2cEnabled,
                    "authority": "",
                    "azureEndpoint": "",
                    "azureScopes": [],
                    "webApi": ""
                },
            };

            expect(ret.body).to.deep.equal(expectedRetMsg)
            done();
        })
        .fail(function(ret) {
            var foo = {
                "bogus": "bogus"
            }
            expect(ret.body).to.deep.equal(foo)
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should fail with setDefaultAdmin action and invalid input', function(done) {
        login.fakeGetXlrRoot(fakeRoot);

        var testInput = {
            "bogus": "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": '[{"keyword":"required","dataPath":"","schemaPath":"#/required","params":{"missingProperty":"username"},"message":"should have required property \'username\'"}]'
        };

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should fail with setDefaultAdmin action and invalid directory', function(done) {
        var fakeFunc = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };
        login.fakeGetXlrRoot(fakeFunc);

        var testInput = {
            "username": "foo",
            "password": "bar",
            "email": "foo@bar.com",
            "defaultAdminEnabled": true
        };

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret.body.error).to.have.string("Failed to write");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should fail with getDefaultAdmin action with wrong permissions', function(done) {
        configDir = path.join(__dirname, "../../test");
        configPath = path.join(configDir, "./config/defaultAdmin.json");
        try {
            fs.unlinkSync(configPath);
        } catch (error) {
            // Ignore errors
        }

        var testInput = {
            "username": "foo",
            "password": "bar",
            "email": "foo@bar.com",
            "defaultAdminEnabled": true
        };

        fs.writeFileSync(configPath, JSON.stringify(testInput));

        var fakeFunc = function() {
            return jQuery.Deferred().resolve(path.join(configDir)).promise();
        };
        login.fakeGetXlrRoot(fakeFunc);

        postRequest("POST", "/login/defaultAdmin/get", testInput)
        .then(function(ret) {
            expect(ret.body.error).to.have.string("File permissions for");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should work with setDefaultAdmin action', function(done) {
        configDir = path.join(__dirname, "../../test");
        configPath = path.join(configDir, "./config/defaultAdmin.json");

        try {
            fs.unlinkSync(configPath);
        } catch (error) {
            // Ignore errors
        }

        var testInput = {
            "username": "foo",
            "password": "bar",
            "email": "foo@bar.com",
            "defaultAdminEnabled": true
        };

        fs.writeFileSync(configPath, JSON.stringify(testInput), {"mode": 0600});

        var fakeFunc = function() {
            return jQuery.Deferred().resolve(path.join(configDir)).promise();
        };
        login.fakeGetXlrRoot(fakeFunc);

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret.body.success).to.be.true;

            // Make sure we can login
            var testCredArray = {
                xiusername: testInput.username,
                xipassword: testInput.password
            };

            return (postRequest("POST", "/login", testCredArray));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "status": 200,
                "firstName": "Administrator",
                "isAdmin": true,
                "isSupporter": false,
                "isValid": true,
                "mail": testInput.email,
                "xiusername": testInput.username
            };

            expect(ret.body).to.deep.equal(expectedRetMsg);

            // Make sure we can't log in with a fake password
            var testCredArray = {
                xiusername: testInput.username,
                xipassword: "wrong"
            };

            return (postRequest("POST", "/login", testCredArray))
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "status": 200,
                "isValid": false,
                "error": "ldapAuthentication fails"
            };

            expect(ret.body).to.deep.equal(expectedRetMsg);

            // Now make sure we can disable defaultAdmin
            testInput.defaultAdminEnabled = false;
            return (postRequest("POST", "/login/defaultAdmin/set", testInput));
        })
        .then(function(ret) {
            expect(ret.body.success).to.be.true;

            // And we should not be able to login
            var testCredArray = {
                xiusername: testInput.username,
                xipassword: testInput.password
            };

            return (postRequest("POST", "/login", testCredArray));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "status": 200,
                "isValid": false,
                "error": "ldapAuthentication fails"
            };

            expect(ret.body).to.deep.equal(expectedRetMsg);

            // And finally ensure our password is not revealed
            return (postRequest("POST", "/login/defaultAdmin/get"))
        })
        .then(function(ret) {
            expect(ret.body).to.not.have.property("password");
            expect(ret.body.username).to.equal(testInput.username);
            expect(ret.body.password).to.not.equal(testInput.password);
            done();
        })
        .fail(function(error) {
            done("fail: " + JSON.stringify(error));
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should fail with setLdapConfig action and bogus ldapConfig', function(done) {
        login.fakeGetXlrRoot(fakeRoot);
        var credArray = {
            bogus: "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": '[{"keyword":"required","dataPath":"","schemaPath":"#/required","params":{"missingProperty":"ldap_uri"},"message":"should have required property \'ldap_uri\'"}]'
        };

        postRequest("POST", "/login/ldapConfig/set", credArray)
        .then(function(ret) {
            expect(ret.body).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should fail with setLdapConfig action and invalid directory', function(done) {
        var fakeFunc = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };
        login.fakeGetXlrRoot(fakeFunc);

        var credArray = {
            ldap_uri: "legitLookingLdapUri",
            userDN: "legitLookingUserDN",
            useTLS: true,
            searchFilter: "legitLookingSearchFilter",
            activeDir: false,
            serverKeyFile: "legitLookingKeyFile",
            ldapConfigEnabled: true
        };

        postRequest("POST", "/login/ldapConfig/set", credArray)
        .then(function(ret) {
            expect(ret.body.error).to.have.string("Failed to write to");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            login.fakeGetXlrRoot(oldRoot);
        });
    });

    it('Router should work with proper setLdapConfig action and getLdapConfig action', function(done) {
        login.fakeGetXlrRoot(fakeRoot);

        var origLdapConfig;
        var testPassed = false;
        var errorMsg = "";

        var setArray = {
            ldapConfigEnabled: ((Math.floor(Math.random() * 10) % 2) == 0) ? true : false,
            ldap_uri: Math.floor(Math.random() * 1000).toString(),
            userDN: Math.floor(Math.random() * 1000).toString(),
            useTLS: ((Math.floor(Math.random() * 10) % 2) == 0),
            searchFilter: Math.floor(Math.random() * 1000).toString(),
            activeDir: ((Math.floor(Math.random() * 10) % 2) == 0),
            serverKeyFile: Math.floor(Math.random() * 1000).toString()
        };

        postRequest("POST", "/login/ldapConfig/get")
        .then(function(ret) {
            origLdapConfig = ret.body;
            delete origLdapConfig.status;
            return postRequest("POST", "/login/ldapConfig/set", setArray);
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            try {
                expect(ret.body).to.deep.equal(expectedRetMsg);
                return postRequest("POST", "/login/ldapConfig/get"); 
            } catch (error) {
                return jQuery.Deferred().reject(error).promise();
            }
        })
        .then(function(ret) {
            var expectedRetMsg = {
                ldapConfigEnabled: setArray.ldapConfigEnabled,
                ldap_uri: setArray.ldap_uri,
                userDN: setArray.userDN,
                useTLS: setArray.useTLS,
                searchFilter: setArray.searchFilter,
                activeDir: setArray.activeDir,
                serverKeyFile: setArray.serverKeyFile,
            };

            try {
                expect(ret.body).to.deep.equal(expectedRetMsg);
                testPassed = true;
            } catch (error) {
                return jQuery.Deferred().reject(error).promise();
            }
        })
        .fail(function(ret) {
            errorMsg = "fail: " + JSON.stringify(ret);
        })
        .always(function() {
            // We need to restore the ldapConfig at the end of the test
            // in order to allow grunt test to repeatably keep working
            // This is because ldapConfig.json is in use by other test (setupLdapConfigs test)
            postRequest("POST", "/login/ldapConfig/set", origLdapConfig)
            .then(function(ret) {
                if (!ret.body.success) {
                    done("Failed to restore origLdapConfig");
                } else if (testPassed) {
                    done();
                } else {
                    done(errorMsg);
                }
            })
            .fail(function(errorMsg) {
                done("Failed to restore origLdapConfig: " + errorMsg);
            })
            .always(function() {
                login.fakeGetXlrRoot(oldRoot);
            });
        });
    });
});
