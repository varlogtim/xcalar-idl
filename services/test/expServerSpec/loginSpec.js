describe('ExpServer Login Test', function() {
    // Test setup
    var expect = require('chai').expect;

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
            expect(error).to.equal("setupLdapConfigs fails");
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

    it('login.setLdapConnection should fail when error', function(done) {
        testCredArray = {};
        login.setLdapConnection(testCredArray, testLdapConn, testConfig, testLoginId)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("setLdapConnection fails");
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
            expect(ret.status).to.equal(200);
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
        login.fakeSetupLdapConfigs();
        login.fakeSetLdapConnection();
        login.fakeLdapAuthentication();
        login.fakePrepareResponse();
        login.loginAuthentication(testCredArray)
        .then(function(ret) {
            expect(ret.isValid).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.loginAuthentication should work', function(done) {
        login.fakeSetupLdapConfigs();
        login.fakeSetLdapConnection();
        login.fakeLdapAuthentication();
        login.fakePrepareResponse();
        login.loginAuthentication(testCredArray)
        .then(function(ret) {
            expect(ret.isValid).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('login.loginAuthentication should fail when error', function(done) {
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
            "firstName": testCredArray["xiusername"],
            "isAdmin": false,
            "isSupporter": false,
            "isValid": false,
            "mail": testCredArray["xiusername"]
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
            return jQuery.Deferred().resolve("../../test").promise();
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
            expect(ret["error"]).to.have.string("Failed to write");
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
            }

            expect(ret).to.deep.equal(expectedRetMsg)

            return (postRequest("POST", "/login/waadConfig/get"));
        })
        .then(function(ret) {
            var expectedRetMsg = {
                "waadEnabled": true,
                "status": 200,
                "tenant": setArray["tenant"],
                "clientId": setArray["clientId"]
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
});
