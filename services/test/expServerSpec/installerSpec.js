describe('ExpServer Installer Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var path = require("path");
    require('jquery');
    var installer = require(__dirname + '/../../expServer/route/installer.js');
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
    var licenseLocation;
    var hostnameLocation;
    var privHostnameLocation;
    var ldapLocation;
    var credentialLocation;
    var discoveryResultLocation;
    var hasPrivHosts;
    var credentialsOption1, credentialsOption2, credentialsOption3;
    var username;
    var port;
    var nfsOption1, nfsOption2, nfsOption3;
    var installationDirectory;
    var ldapOption1, ldapOption2;
    var serDes;
    var preConfig;
    var testPwd;
    var testCredArray;
    var testScript1, testScript2, testScript3;
    var testData;
    this.timeout(10000);
    // Test begins
    before(function() {
        hostnameLocation = path.join(__dirname, "../config/hosts.txt");
        licenseLocation = path.join(__dirname, "../config/license.txt");
        failLicenseLocation = path.join(__dirname, "../config/failLicense.txt");
        hostnameLocation = path.join(__dirname, "../config/hosts.txt");
        privHostnameLocation = path.join(__dirname, "../config/privHosts.txt");
        ldapLocation = path.join(__dirname, "../config/ldapConfig.json");
        credentialLocation = path.join(__dirname, "../config/key.txt");
        discoveryResultLocation=path.join(__dirname, "../config/result.json");

        hasPrivHosts = true;
        credentialsOption1 = {
            "password": "test"
        };
        credentialsOption2 = {
            "sshKey": "test"
        };
        credentialsOption3 = {
            "sshUserSettings": "test"
        };
        username = "testUser";
        port = "testPort";
        nfsOption1 = {
            option: "customerNfs",
            nfsUsername: "test",
            nfsGroup: "test",
            copy: "test"
        };
        nfsOption2 = {
            option: "readyNfs"
        };
        nfsOption3 = {
            option: "xcalarNfs"
        };
        installationDirectory = "testDir";
        testPwd = "test";
        ldapOption1 = {
            xcalarInstall: "test",
            password: testPwd
        };
        ldapOption2 = {};
        serDes = true;
        preConfig = false;
        testCredArray = {
            hostnames: ["testhost1", "testhost2"],
            privHostNames: ["testhost3", "testhost4"],
            licenseKey: "ONLY FOR TEST",
            credentials: {
                "password": "test"
            },
            ldap: {
                "ldap_uri": "ldap://openldap1-1.xcalar.net:389",
                "userDN": "mail=%username%,ou=People,dc=int,dc=xcalar,dc=com",
                "useTLS": "false",
                "searchFilter": "(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)",
                "activeDir": "false",
                "serverKeyFile": "/etc/ssl/certs/ca-certificates.crt",
                "ldapConfigEnabled": true
            }
        };
        testScript1 = "cat " + licenseLocation;
        testScript2 = "echo SUCCESS";
        testScript3 = "cat " + failLicenseLocation;
        testData = {};

        var opts = {
            hostnameLocation: hostnameLocation,
            privHostnameLocation: privHostnameLocation,
            ldapLocation: ldapLocation,
            discoveryResultLocation: discoveryResultLocation,
            licenseLocation: licenseLocation
        };
        installer.setTestVariables(opts);
    });

    it("encryptPassword should work", function() {
        expect(installer.encryptPassword(testPwd)).to.include("{SSHA}");
    });
    it("genExecString should work", function() {
        expect(installer.genExecString(hostnameLocation,
                                       hasPrivHosts,
                                       privHostnameLocation,
                                       credentialLocation,
                                       credentialsOption1,
                                       username,
                                       port,
                                       nfsOption1,
                                       installationDirectory,
                                       ldapOption1,
                                       serDes,
                                       preConfig)).to.be.a("String");

        expect(installer.genExecString(hostnameLocation,
                                       hasPrivHosts,
                                       privHostnameLocation,
                                       credentialLocation,
                                       credentialsOption2,
                                       username,
                                       port,
                                       nfsOption2,
                                       installationDirectory,
                                       ldapOption1,
                                       serDes,
                                       preConfig)).to.be.a("String");

        expect(installer.genExecString(hostnameLocation,
                                       hasPrivHosts,
                                       privHostnameLocation,
                                       credentialLocation,
                                       credentialsOption3,
                                       username,
                                       port,
                                       nfsOption3,
                                       installationDirectory,
                                       ldapOption2,
                                       serDes,
                                       preConfig)).to.be.a("String");
    });
    it("genDiscoverExecString should work", function() {
        expect(installer.genDiscoverExecString(hostnameLocation,
                                               credentialLocation,
                                               true,username, port,
                                               installationDirectory)).to.be.a("String");
    });
    it("checkLicense should fail when error, e.g. data has no SUCCESS or FAILURE", function(done) {
        installer.checkLicense(testCredArray, testScript1)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("checkLicense should fail when error, e.g. data has FAILURE", function(done) {
        installer.checkLicense(testCredArray, testScript3)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.verified).to.equal(false);
            done();
        });
    });
    it("checkLicense should work", function(done) {
        installer.checkLicense(testCredArray, testScript2)
        .then(function(ret) {
            expect(ret.verified).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("copyFiles should fail when error, e.g. file not exist", function(done) {
        installer.copyFiles()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("copyFiles should fail when error, e.g. invalid script path", function(done) {
        installer.copyFiles("invalid")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("copyFiles should work", function(done) {
        installer.copyFiles(testScript2)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("installUpgradeUtil should fail when error, e.g. invalid command", function(done) {
        installer.installUpgradeUtil(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(installer.getCurStepStatus()).to.equal(-1);
            done();
        });
    });
    it("discoverUtil should fail when error, e.g. invalid command", function(done) {
        installer.discoverUtil(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("installUpgradeUtil should work", function(done) {
        testCredArray.credentials = {"sshKey": "test"};
        testCredArray.privHostNames = [];
        installer.installUpgradeUtil(testCredArray,"","echo Success")
        .then(function() {
            expect(installer.getCurStepStatus()).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("discoverUtil should work", function(done) {
        testCredArray.credentials = {"sshKey": "test"};
        testCredArray.privHostNames = [];
        installer.discoverUtil(testCredArray,"","echo Success")
        .then(function(ret) {
            expect(ret.test).to.equal("success");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("createStatusArray should work", function(done) {
        var oldFunc = support.masterExecuteAction;
        support.masterExecuteAction = function() {};
        installer.createStatusArray(testCredArray)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            support.masterExecuteAction = oldFunc;
        });
    });
    it("Checking license router shoud work", function(done) {
        installer.fakeCheckLicense();
        postRequest("POST", "/xdp/license/verification", testData)
        .always(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        });
    });
    it("Checking install status router shoud work", function(done) {
        installer.fakeCreateStatusArray();
        postRequest("POST", "/xdp/installation/status", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Checking upgrade status router shoud work", function(done) {
        postRequest("POST", "/xdp/upgrade/status", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            installer.createStatusArray = oldFunc;
        });
    });
    it("Checking uninstall status router shoud work", function(done) {
        postRequest("POST", "/xdp/uninstallation/status", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Discovering router shoud work", function(done) {
        installer.fakeDiscoverUtil();
        postRequest("POST", "/xdp/discover", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Installing router shoud work", function(done) {
        installer.fakeInstallUpgradeUtil();
        postRequest("POST", "/xdp/installation/start", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Upgrading router shoud work", function(done) {
        postRequest("POST", "/xdp/upgrade/start", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Uninstalling router shoud work", function(done) {
        postRequest("POST", "/xdp/uninstallation/start", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Canceling router shoud work", function(done) {
        postRequest("POST", "/xdp/installation/cancel", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("Fetching log router shoud work", function(done) {
        var oldFunc = support.slaveExecuteAction;
        support.slaveExecuteAction = function() {
            return jQuery.Deferred().resolve({status: 200}).promise();
        };
        postRequest("GET", "/installationLogs/slave", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            support.slaveExecuteAction = oldFunc;
        });
    });
});