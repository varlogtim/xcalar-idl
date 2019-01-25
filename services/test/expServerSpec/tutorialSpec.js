describe('ExpServer Tutorial Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var tutorial = require(__dirname + '/../../expServer/route/tutorial.js');
    var testVersion;
    var testData;
    var oldGetObject;
    this.timeout(10000);

    // Test begins
    before(function() {
        testTargz = "test";
        testName = "test";
        testVersion = "1.0.0";
        testData = {
            "name": "test",
            "version": "1.0.0"
        };
        testType = "test";
        testDownloadName = "test";
        testFileName = "extensions/distinct/1.0.0/distinct-1.0.0.tar.gz";
        oldGetObject = tutorial.getObject;
        var fakeFunc = function(data, callback) {
            callback(null, {Body: {msg: "success"}});
        }
        tutorial.fakeGetObject(fakeFunc);
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        }

    });

    after(function() {

    });


    it("tutorial.downloadTutorial should fail when error", function(done) {
        var oldFunc = tutorial.getObject;
        var fakeFunc = function(data, callback) {
            callback("fail");
        }
        tutorial.fakeGetObject(fakeFunc);
        tutorial.downloadTutorial(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            tutorial.fakeGetObject(oldFunc);
        });
    });

    it("tutorial.downloadTutorial should work", function(done) {
        testDownloadName = "simpleTutorial";
        tutorial.downloadTutorial(testDownloadName, testVersion)
        .then(function(ret) {
            expect(ret.status).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("tutorial.processItem should fail when error", function(done) {
        tutorial.processItem([], "notExist.txt")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("tutorial.processItem should work", function(done) {
        tutorial.processItem([], testFileName)
        .then(function(ret) {
            expect(ret).to.equal("processItem succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("tutorial.fetchAllTutorials should work", function(done) {
        tutorial.fetchAllTutorials()
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("tutorial.fetchAllTutorials should fail when error", function(done) {
        var oldFunc = tutorial.processItem;
        var fakeFunc = function() {
            return jQuery.Deferred().reject("processItem fails").promise();
        }
        tutorial.fakeProcessItem(fakeFunc);
        tutorial.fetchAllTutorials()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            tutorial.fakeProcessItem(oldFunc);
        });
    });

    after(function() {
        tutorial.fakeGetObject(oldGetObject);
    });
});
