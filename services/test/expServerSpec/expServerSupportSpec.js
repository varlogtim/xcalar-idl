describe('ExpServer Support Test', function() {
    // Test setup
    var expect = require('chai').expect;

    require('jquery');
    var support = require(__dirname + '/../../expServer/expServerSupport.js');
    var testHostsFile;
    var testHosts;
    var testAction;
    var testSlaveUrl;
    var testContent;
    var testEmail;
    var testResults;
    var testLogOpts;
    this.timeout(10000);
    // Test begins
    before(function() {
        testHostsFile = __dirname + "/../config/hosts.cfg";
        testHosts = ["testHost"];
        testAction = "GET";
        testSlaveUrl = "/service/logs/slave";
        testContent = {
            hosts: testHosts,
            isMonitoring: "true",
            requireLineNum: 10,
            lastMonitorMap: "{}"
        };
        testEmail = "test@xcalar.com";
        testResults = {
            "testHost": {
                "status": 200,
                "logs": "Success",
                "lastMonitor": true
            }
        }
        testLogOpts = {
            requireLineNum: 1,
            filePath: __dirname + "/../config",
            fileName: "logs"
        }
        testPath = __dirname + "/../config/logs";
        testCfg = __dirname + "/../config/hosts.cfg";
        testLicense = __dirname + "/../config/license.txt";
        testStartCommand = "/opt/xcalar/bin/xcalarctl start";
        testStopCommand = "/opt/xcalar/bin/xcalarctl stop";
        testStartData = "xcmgmtd started";
        testStopData = "Stopped Xcalar";
    });

    it('executeCommand should work', function(done) {
        support.executeCommand(" ")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("readHostsFromFile should work", function(done) {
        support.fakeExecuteCommand();
        support.readHostsFromFile(testHostsFile)
        .then(function(ret) {
            expect(ret).to.be.an("Array");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("readHostsFromFile should fail when error, e.g. no such file", function(done) {
        testHostsFile = "noSuchFile.cfg";
        support.readHostsFromFile(testHostsFile)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.be.an("Error");
            done();
        });
    });
    it('sendCommandToSlaves should fail when error', function(done) {
        support.sendCommandToSlaves(testAction, testSlaveUrl, testContent, testHosts)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error[testHosts[0]].status).to.equal(500);
            done();
        });
    });
    // This is actually testing RESTful API calls. So the promise can be either
    // resolved or rejected based on the status of the server running on the slave.
    // Instead of expecting 200 all the time, we expect it to gracefully handle
    // success and failure.
    it('sendCommandToSlaves should work', function(done) {
        testSlaveUrl = "/service/status/slave";
        testHosts = ["skywalker.int.xcalar.com"];
        support.sendCommandToSlaves(testAction, testSlaveUrl, testContent, testHosts)
        .then(function(ret) {
            expect(ret[testHosts[0]].status).to.equal(200);
            done();
        })
        .fail(function(err) {
            expect(error[testHosts[0]].status).to.equal(500);
            done();
        });
    });

    it('slaveExecuteAction should work', function(done) {
        support.slaveExecuteAction("", "/service/start/slave", testContent)
        .then(function() {
            return support.slaveExecuteAction("", "/service/stop/slave", testContent);
        })
        .then(function() {
            return support.slaveExecuteAction("", "/service/status/slave", testContent);
        })
        .then(function() {
            return support.slaveExecuteAction("", "/service/logs/slave", testLogOpts);
        })
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
    });

    it('generateLogs should work', function(done) {
        expect(support.generateLogs(testAction, testSlaveUrl, testResults)).to.include("Success");
        done();
    });

    it('masterExecuteAction should work with given host', function(done) {
        support.fakeReadHostsFromFile();
        support.fakeSendCommandToSlaves();
        support.masterExecuteAction(testAction, testSlaveUrl, testContent, true)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
    });

    it('masterExecuteAction should work without given host', function(done) {
        support.fakeReadHostsFromFile();
        support.fakeSendCommandToSlaves();
        support.masterExecuteAction(testAction, testSlaveUrl, testContent)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
    });

    it('getXlrRoot should work', function(done) {
        support.getXlrRoot(testCfg)
        .then(function(ret) {
            expect(ret).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getXlrRoot should work and return a default result when input is invalid', function(done) {
        support.getXlrRoot("invalidPath")
        .then(function(ret) {
            expect(ret).to.equal("/mnt/xcalar");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('removeSessionFiles should work', function(done) {
        support.fakeGetXlrRoot();
        // It should catch 'undefined' and handle it correctly
        support.removeSessionFiles(undefined)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getLicense should work', function(done) {
        support.getLicense(testLicense)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getLicense should fail when error, e.g. invalid path', function(done) {
        support.getLicense("invalidPath")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(400);
            done();
        });
    });

    it('isValidEmail should work', function() {
        expect(support.isValidEmail(testEmail)).to.equal(true);
        expect(support.isValidEmail("invalidEmail")).to.equal(false);
    });

    it('generateLastMonitorMap should work', function() {
        expect(support.generateLastMonitorMap(testResults)).to.not.be.empty;
    });

    it('getMatchedHosts should work', function(done) {
        support.getMatchedHosts({hostnamePattern: ".*"})
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getMatchedHosts should work given not pattern', function(done) {
        support.getMatchedHosts({hostnamePattern: ""})
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getMatchedHosts should fail when error, e.g. invalid pattern', function(done) {
        support.getMatchedHosts({hostnamePattern: "*"})
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(404);
            done();
        });
    });
    it('readInstallerLog should work', function(done) {
        support.readInstallerLog(testPath)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('readInstallerLog should fail when error, e.g. invalid path', function(done) {
        support.readInstallerLog("invalidPath")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });

    it('hasLogFile should work', function(done) {
        support.hasLogFile(testPath)
        .then(function(ret) {
            expect(ret).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('hasLogFile should fail when error, e.g. invalid path', function(done) {
        support.hasLogFile("invalidPath")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            done();
        });
    });

    it('isComplete should work', function() {
        expect(support.isComplete(testStartCommand, "")).to.equal(false);
        expect(support.isComplete(testStartCommand, testStartData)).to.equal(true);
        expect(support.isComplete(testStopCommand, "")).to.equal(false);
        expect(support.isComplete(testStopCommand, testStopData)).to.equal(true);
    });

    it('removeSHM should work', function(done) {
        support.removeSHM()
        .then(function(ret) {
            expect(ret).to.include("succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getOperatingSystem should work', function(done) {
        support.getOperatingSystem()
        .then(function(ret) {
            expect(ret).to.include("succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
});