describe('ExpServer Installer Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var path = require("path");
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var installer = require(__dirname + '/../../expServer/route/installer.js');
    var support = require(__dirname + '/../../expServer/expServerSupport.js');
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
    var testInput;
    var emptyPromise;
    var succPromise;
    var oldSlaveExec;
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

        credentialsOption1 = {
            "password": "test"
        };
        credentialsOption2 = {
            "sshKey": "test"
        };
        credentialsOption3 = {
            "sshUserSettings": "test"
        };
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
        ldapOption1 = {
            // xcalarInstall: "test",
            // password: testPwd
            deployOption: "xcalarLdap",
            domainName: "testDomain",
            companyName: "testCompany",
            password: "test"
        };
        ldapOption2 = {
            deployOption: "customerLdap"
        };
        ldapOption2 = {};
        testCredArray = {
            credentials: undefined,
            username: "testUser",
            port: "testPort",
            nfsOption: undefined,
            installationDirectory: "testDir",
            ldap: undefined,
                // "ldap_uri": "ldap://openldap1-1.xcalar.net:389",
                // "userDN": "mail=%username%,ou=People,dc=int,dc=xcalar,dc=com",
                // "useTLS": "false",
                // "searchFilter": "(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)",
                // "activeDir": "false",
                // "serverKeyFile": "/etc/ssl/certs/ca-certificates.crt",
                // "ldapConfigEnabled": true
            // },
            defaultAdminConfig: {
                defaultAdminEnabled: true,
                username: "testUser",
                email: "testEmail",
                password: "test"
            },
            serializationDirectory: "testSerDes",
            preConfig: false,
            supportBundles: true,
            enableHotPatches: true,
            hostnames: ["testhost1", "testhost2"],
            privHostNames: ["testhost3", "testhost4"],
            licenseKey: "H4sIANdv+1oAA6tWUEpJLElUslJQCvHwDFYAIkeFENfgECWFWi4Aa4s/Vh0AAAA="
        };

        testInput = {
            hasPrivHosts: true,
            credArray: testCredArray
        };
        testScript1 = "cat " + licenseLocation;
        testScript2 = "echo SUCCESS";
        testScript3 = "cat " + failLicenseLocation;
        testData = {};
        testPwd = "test";

        var opts = {
            hostnameLocation: hostnameLocation,
            privHostnameLocation: privHostnameLocation,
            ldapLocation: ldapLocation,
            discoveryResultLocation: discoveryResultLocation,
            licenseLocation: licenseLocation,
            credentialLocation: credentialLocation
        };
        installer.setTestVariables(opts);
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        };
        succPromise = function() {
            return jQuery.Deferred().resolve({status: 200}).promise();
        };
        oldSlaveExec = installer.slaveExecuteAction;
        installer.fakeSlaveExecuteAction(succPromise);
    });

    it("encryptPassword should work", function() {
        expect(installer.encryptPassword(testPwd)).to.include("{SSHA}");
    });

    it("genExecString should work", function() {
        testInput.credArray.credentials = credentialsOption1;
        testInput.credArray.nfsOption = nfsOption1;
        testInput.credArray.ldap = ldapOption1;
        expect(installer.genExecString(testInput)).to.be.a("String");

        testInput.credArray.credentials = credentialsOption2;
        testInput.credArray.nfsOption = nfsOption2;
        testInput.credArray.ldap = ldapOption2;
        expect(installer.genExecString(testInput)).to.be.a("String");

        testInput.credArray.credentials = credentialsOption3;
        testInput.credArray.nfsOption = nfsOption3;
        expect(installer.genExecString(testInput)).to.be.a("String");
    });

    it("genDiscoverExecString should work", function() {
        expect(installer.genDiscoverExecString(hostnameLocation,
                                               credentialLocation,
                                               true, username, port,
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
        installer.createStatusArray(testCredArray)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("Checking license router shoud work", function(done) {
        var oldFunc = installer.checkLicense;
        installer.fakeCheckLicense(succPromise);
        var data = {
            url: 'http://localhost:12125/xdp/license/verification',
            json: testData
        }
        request.post(data, function (err, res, body){
            console.log("res is: " + JSON.stringify(res));
            installer.fakeCheckLicense(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking install status router shoud work", function(done) {
        var oldFunc = installer.createStatusArray;
        installer.fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12125/xdp/installation/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking upgrade status router shoud work", function(done) {
        var oldFunc = installer.createStatusArray;
        installer.fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12125/xdp/upgrade/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking uninstall status router shoud work", function(done) {
        var oldFunc = installer.createStatusArray;
        installer.fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12125/xdp/uninstallation/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Discovering router shoud work", function(done) {
        var oldFunc = installer.discoverUtil;
        installer.fakeDiscoverUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12125/xdp/discover',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeDiscoverUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Installing router shoud work", function(done) {
        var oldFunc = installer.installUpgradeUtil;
        installer.fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12125/xdp/installation/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Upgrading router shoud work", function(done) {
        var oldFunc = installer.installUpgradeUtil;
        installer.fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12125/xdp/upgrade/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Uninstalling router shoud work", function(done) {
        var oldFunc = installer.installUpgradeUtil;
        installer.fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12125/xdp/uninstallation/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            installer.fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Canceling router shoud work", function(done) {
        var data = {
            url: 'http://localhost:12125/xdp/installation/cancel',
            json: testData
        }
        request.post(data, function (err, res, body){
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Fetching log router shoud work", function(done) {
        var data = {
            url: 'http://localhost:12125/installationLogs/slave',
        }
        request.get(data, function (err, res, body){
            console.log("res is: " + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    after(function() {
        installer.fakeSlaveExecuteAction(oldSlaveExec);
    });

});