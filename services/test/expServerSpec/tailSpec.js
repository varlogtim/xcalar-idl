describe('ExpServer Tail Test', function() {
    // Test setup
    var expect = require('chai').expect;

    require('jquery');
    var tail = require(__dirname + '/../../expServer/tail.js');
    var testFilePath;
    var testFileName;
    var testLineNum;
    var testLastMonitor;
    this.timeout(10000);
    // Test begins
    before(function() {
        testFilePath = __dirname + '/../config/';
        testFileName = "node.0.out";
        testLineNum = 10;
        testLastMonitor = 1;
        tail.fakeGetNodeId();
    });

    it("isLogNumValid should work", function() {
        expect(tail.isLogNumValid(testLineNum)).to.be.true;
        expect(tail.isLogNumValid("notNum")).to.be.false;
    });
    it("readFileStat should work", function(done) {
        tail.readFileStat(testFilePath + testFileName)
        .then(function(currFile, stat) {
            expect(stat).to.exist;
            done();
        })
        .fail(function() {
            done("fail");
        })
    });
    it("readFileStat should fail when error, e.g. invalid file path", function(done) {
        tail.readFileStat("invalid Path")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500)
            done();
        })
    });
    it("getPath should work", function(done) {
        tail.getPath(testFilePath, testFileName)
        .then(function(currFile, stat) {
            expect(stat).to.exist;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("getCurrentTime should work", function() {
        expect(tail.getCurrentTime()).to.match(/^"\d{4}\-/);
    });
    it("tailLog should work", function(done) {
        tail.tailLog(testLineNum, testFilePath, testFileName)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("sinceLastMonitorLog should work", function(done) {
        tail.sinceLastMonitorLog(testLastMonitor, testFilePath, testFileName)
        .then(function(ret) {
            expect(ret.lastMonitor).to.not.be.empty;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("tailLog should fail when error, e.g. fail to open log file", function(done) {
        tail.fakeGetPath();
        tail.tailLog(testLastMonitor, testFilePath, testFileName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("sinceLastMonitorLog should fail when error, e.g. fail to open log file", function(done) {
        tail.sinceLastMonitorLog(testLastMonitor, testFilePath, testFileName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(403);
            done();
        });
    });
});