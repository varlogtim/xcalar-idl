describe('ExpServer Login Test', function() {
    // Test setup
    var expect = require('chai').expect;
    const path = require('path');
    const fs = require('fs');

    require('jquery');

    var login = require(__dirname + '/../../expServer/route/login.js');
    var support = require(__dirname + '/../../expServer/expServerSupport.js');

    function postRequest(action, url, str) {
        var deferred = jQuery.Deferred();
        jQuery.ajax({
            "type": action,
            "data": JSON.stringify(str),
            "contentType": "application/json",
            "url": "http://localhost:12124" + url,
            "async": true,
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                deferred.reject(error);
            }
        });
        return deferred.promise();
    }

    var testLoginId;
    var testCredArray;
    var testLdapConn;
    var testConfig;

    // Test begins
    before(function() {
        testLoginId = 0;
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };
        testConfig = {
            ldap_uri: "ldap://openldap1-1.xcalar.net:389",
            userDN: "mail=%username%,ou=People,dc=int,dc=xcalar,dc=com",
            useTLS: "false",
            searchFilter: "(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)",
            activeDir: "false",
            serverKeyFile: "/etc/ssl/certs/ca-certificates.crt"
        };
        testLdapConn = {};
    });

    it("login.setupLdapConfigs should work", function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("../../test").promise();
        };
        login.setupLdapConfigs(true)
        .then(function(ret) {
            expect(ret).to.equal("setupLdapConfigs succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("login.setupLdapConfigs should fail when error", function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("testError").promise();
        };
        login.setupLdapConfigs(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.have.string("setupLdapConfigs failed: Error: Cannot find module");
            done();
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

    it('login.loginAuthentication should work', function(done) {
        testCredArray = { "xiusername": "foo", "xipassword": "bar" };
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(__dirname + "/../../test").promise();
        };

        login.fakeSetupLdapConfigs();
        login.fakeSetLdapConnection();
        login.fakeLdapAuthentication();
        login.fakePrepareResponse();
        login.loginAuthentication(testCredArray)
        .then(function(ret) {
            expect(ret.isValid).to.be.true;
            done();
        })
        .fail(function(message) {
            done("fail: " + JSON.stringify(message));
        });
    });

    it('login.loginAuthentication should fail when error', function(done) {
        testCredArray = { "xiusername": "nobody", "xipassword": "wrong" };
        var shouldReject = true;
        login.fakeSetupLdapConfigs();
        login.fakeSetLdapConnection();
        login.fakeLdapAuthentication();
        login.fakePrepareResponse(shouldReject);
        login.loginAuthentication(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.isValid).to.be.false;
            done();
        });
    });

    it('Router should work with login action', function(done) {
        testCredArray = {
            xiusername: "sPerson1@gmail.com",
            xipassword: "Welcome1"
        };

        var expectedRetMsg = {
            "status": 200,
            "isValid": false,
        };
        postRequest("POST", "/login", testCredArray)
        .then(function(ret) {
            expect(ret).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should fail with invalid endpoint', function(done) {
        postRequest("POST", "/invalidUrl")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error["status"]).to.deep.equal(404);
            done();
        });
    });

    it('Router should fail with setWaadConfig action and bogus waadConfig', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("/../../test").promise();
        };

        var credArray = {
            bogus: "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": "Invalid WaadConfig provided"
        };

        postRequest("POST", "/login/waadConfig/set", credArray)
        .then(function(ret) {
            expect(ret).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should fail with setWaadConfig action and invalid directory', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };

        var credArray = {
            waadEnabled: true,
            tenant: "legitLookingTenant",
            clientId: "legitLookingClient"
        };

        postRequest("POST", "/login/waadConfig/set", credArray)
        .then(function(ret) {
            expect(ret.error).to.have.string("Failed to write");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should work with proper setWaadConfig action and getWaadConfig action', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(__dirname + "/../../test").promise();
        };

        var setArray = {
            waadEnabled: true,
            tenant: Math.floor(Math.random() * 1000).toString(),
            clientId: Math.floor(Math.random() * 1000).toString()
        };

        postRequest("POST", "/login/waadConfig/set", setArray)
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            expect(ret).to.deep.equal(expectedRetMsg)

            return (postRequest("POST", "/login/waadConfig/get"));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "waadEnabled": true,
                "status": 200,
                "tenant": setArray.tenant,
                "clientId": setArray.clientId
            };
            expect(ret).to.deep.equal(expectedRetMsg);

            // Now disable waad
            setArray["waadEnabled"] = false;
            return (postRequest("POST", "/login/waadConfig/set", setArray));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            expect(ret).to.deep.equal(expectedRetMsg)
            return (postRequest("POST", "/login/waadConfig/get"));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "waadEnabled": false,
                "status": 200,
                "tenant": setArray["tenant"],
                "clientId": setArray["clientId"]
            };

            expect(ret).to.deep.equal(expectedRetMsg)
            done();
        })
        .fail(function(ret) {
            var foo = {
                "bogus": "bogus"
            }
            expect(ret).to.deep.equal(foo)
            done("fail");
        });
    });

    it('Router should fail with setDefaultAdmin action and invalid input', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(path.join(__dirname, "../../test")).promise();
        };

        var testInput = {
            "bogus": "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": "Invalid adminConfig provided"
        };

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should fail with setDefaultAdmin action and invalid directory', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };

        var testInput = {
            "username": "foo",
            "password": "bar",
            "email": "foo@bar.com",
            "defaultAdminEnabled": true
        };

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret.error).to.have.string("Failed to write");
            done();
        })
        .fail(function() {
            done("fail");
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

        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(path.join(configDir)).promise();
        };

        postRequest("POST", "/login/defaultAdmin/get", testInput)
        .then(function(ret) {
            expect(ret.error).to.have.string("File permissions for");
            done();
        })
        .fail(function() {
            done("fail");
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

        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(path.join(configDir)).promise();
        };

        postRequest("POST", "/login/defaultAdmin/set", testInput)
        .then(function(ret) {
            expect(ret.success).to.be.true;

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
            };

            expect(ret).to.deep.equal(expectedRetMsg);

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
            };

            expect(ret).to.deep.equal(expectedRetMsg);

            // Now make sure we can disable defaultAdmin
            testInput.defaultAdminEnabled = false;
            return (postRequest("POST", "/login/defaultAdmin/set", testInput));
        })
        .then(function(ret) {
            expect(ret.success).to.be.true;

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
                "isValid": false
            };

            expect(ret).to.deep.equal(expectedRetMsg);

            // And finally ensure our password is not revealed
            return (postRequest("POST", "/login/defaultAdmin/get"))
        })
        .then(function(ret) {
            expect(ret).to.not.have.property("password");
            expect(ret.username).to.equal(testInput.username);
            expect(ret.password).to.not.equal(testInput.password);
            done();
        })
        .fail(function(error) {
            done("fail: " + JSON.stringify(error));
        });
    });

    it('Router should fail with setLdapConfig action and bogus ldapConfig', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("../../test").promise();
        };

        var credArray = {
            bogus: "bogus"
        };

        var expectedRetMsg = {
            "status": 200,
            "success": false,
            "error": "Invalid ldapConfig provided"
        };

        postRequest("POST", "/login/ldapConfig/set", credArray)
        .then(function(ret) {
            expect(ret).to.deep.equal(expectedRetMsg);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should fail with setLdapConfig action and invalid directory', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve("../../doesnotexist").promise();
        };

        var credArray = {
            ldap_uri: "legitLookingLdapUri",
            userDN: "legitLookingUserDN",
            useTLS: "true",
            searchFilter: "legitLookingSearchFilter",
            activeDir: "false",
            serverKeyFile: "legitLookingKeyFile",
            ldapConfigEnabled: true
        };

        postRequest("POST", "/login/ldapConfig/set", credArray)
        .then(function(ret) {
            expect(ret.error).to.have.string("Failed to write");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Router should work with proper setLdapConfig action and getLdapConfig action', function(done) {
        support.getXlrRoot = function() {
            return jQuery.Deferred().resolve(__dirname + "/../../test").promise();
        };

        var origLdapConfig;
        var testPassed = false;
        var errorMsg = "";

        var setArray = {
            ldapConfigEnabled: ((Math.floor(Math.random() * 10) % 2) == 0) ? true : false,
            ldap_uri: Math.floor(Math.random() * 1000).toString(),
            userDN: Math.floor(Math.random() * 1000).toString(),
            useTLS: ((Math.floor(Math.random() * 10) % 2) == 0) ? "true" : "false",
            searchFilter: Math.floor(Math.random() * 1000).toString(),
            activeDir: ((Math.floor(Math.random() * 10) % 2) == 0) ? "true" : "false",
            serverKeyFile: Math.floor(Math.random() * 1000).toString()
        };

        postRequest("POST", "/login/ldapConfig/get")
        .then(function(ret) {
            origLdapConfig = ret;
            delete origLdapConfig.status;
            return postRequest("POST", "/login/ldapConfig/set", setArray);
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "success": true,
                "status": 200
            };

            try {
                expect(ret).to.deep.equal(expectedRetMsg);
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
                status: 200
            };

            try {
                expect(ret).to.deep.equal(expectedRetMsg);
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
                if (!ret.success) {
                    done("Failed to restore origLdapConfig");
                } else if (testPassed) {
                    done();
                } else {
                    done(errorMsg);
                }
            })
            .fail(function(errorMsg) {
                done("Failed to restore origLdapConfig: " + errorMsg);
            });
        });
    });
});
