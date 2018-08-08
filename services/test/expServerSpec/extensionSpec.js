describe('ExpServer Extension Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var fs = require('fs');
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');

    var extension = require(__dirname + '/../../expServer/route/extension.js');
    var support = require(__dirname + '/../../expServer/expServerSupport.js');
    var testTargz;
    var testName;
    var testVersion;
    var testData;
    var testType;
    var oldGetObject;
    var emptyPromise;
    this.timeout(10000);

    // Test begins
    before(function() {
        testTargz = "test";
        testName = "test";
        testVersion = "1.0.0";
        testData = {
            "targz": "testTargz",
            "name": "test"
        };
        testType = "test";
        testDownloadName = "test";
        testFileName = "extensions/distinct/1.0.0/distinct-1.0.0.tar.gz";
        oldGetObject = extension.getObject;
        var fakeFunc = function(data, callback) {
            callback(null, {Body: {msg: "success"}});
        }
        extension.fakeGetObject(fakeFunc);
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        }

        support.checkAuthTrue(support.userTrue);
        support.checkAuthAdminTrue(support.adminTrue);
    });

    after(function() {
        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
    });

    it("extension.writeTarGz should fail when error", function(done) {
        extension.writeTarGz(testTargz, testName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.equal(null);
            done();
        });
    });

    it("extension.writeTarGz should work", function(done) {
        testTargz = fs.readFileSync(__dirname + "/../config/testExt-1.0.0.tar.gz", "base64");
        extension.writeTarGz(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGz succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });


    it("extension.writeTarGzWithCleanup should fail when error", function(done) {
        testTargz = "test";
        extension.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.writeTarGzWithCleanup should work", function(done) {
        var oldFunc = extension.writeTarGz;
        extension.fakeWriteTarGz(emptyPromise);
        extension.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGzWithCleanup succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            extension.fakeWriteTarGz(oldFunc);
        });
    });

    it("extension.downloadExtension should fail when error", function(done) {
        var oldFunc = extension.getObject;
        var fakeFunc = function(data, callback) {
            callback("fail");
        }
        extension.fakeGetObject(fakeFunc);
        extension.downloadExtension(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            extension.fakeGetObject(oldFunc);
        });
    });

    it("extension.downloadExtension should work", function(done) {
        testDownloadName = "distinct";
        extension.downloadExtension(testDownloadName, testVersion)
        .then(function(ret) {
            expect(ret.status).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extension.getExtensionFiles should fail when error", function(done) {
        extension.getExtensionFiles("", testType)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.getExtensionFiles should work", function(done) {
        testType = "available";
        extension.getExtensionFiles("", testType)
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extension.enableExtension should fail when error", function(done) {
        extension.enableExtension("testFail")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.enableExtension should work", function(done) {
        extension.enableExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("enableExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extension.disalbeExtension should fail when error", function(done) {
        extension.disableExtension("testFail")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.disalbeExtension should work", function(done) {
        extension.disableExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("disableExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extension.removeExtension should work", function(done) {
        extension.removeExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("removeExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extension.removeExtension should fail when error", function(done) {
        extension.removeExtension(testName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.processItem should fail when error", function(done) {
        extension.processItem([], "notExist.txt")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.processItem should work", function(done) {
        extension.processItem([], testFileName)
        .then(function(ret) {
            expect(ret).to.equal("processItem succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extension.fetchAllExtensions should work", function(done) {
        extension.fetchAllExtensions()
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extension.fetchAllExtensions should fail when error", function(done) {
        var oldFunc = extension.processItem;
        var fakeFunc = function() {
            return jQuery.Deferred().reject("processItem fails").promise();
        }
        extension.fakeProcessItem(fakeFunc);
        extension.fetchAllExtensions()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            extension.fakeProcessItem(oldFunc);
        });
    });

    it('Upload router should work', function(done) {
        var oldWrite = extension.writeTarGzWithCleanup;
        var oldEnable = extension.enableExtensionn;
        extension.fakeWriteTarGzWithCleanup(emptyPromise);
        extension.fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12125/extension/upload',
            json: testData
        }
        request.post(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(err));
            extension.fakeWriteTarGzWithCleanup(oldWrite);
            extension.fakeEnableExtension(oldEnable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Download router should work', function(done) {
        var oldWrite = extension.writeTarGzWithCleanup;
        var oldDownload = extension.downloadExtension;
        var fakeDownload = function() {
            return jQuery.Deferred().resolve({data: "test",
                                              name: "test",
                                              version: "test"}).promise();
        }
        extension.fakeWriteTarGzWithCleanup(emptyPromise);
        extension.fakeDownloadExtension(fakeDownload);
        var data = {
            url: 'http://localhost:12125/extension/download',
            json: testData
        }
        request.post(data, function (err, res, body){
            extension.fakeWriteTarGzWithCleanup(oldWrite);
            extension.fakeDownloadExtension(oldDownload);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Remove router should work', function(done) {
        var oldRemove = extension.removeExtension;
        extension.fakeRemoveExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12125/extension/remove',
            json: testData
        }
        request.delete(data, function (err, res, body){
            extension.fakeRemoveExtension(oldRemove);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Enable router should work', function(done) {
        var oldEnable = extension.enableExtensionn;
        extension.fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12125/extension/enable',
            json: testData
        }
        request.post(data, function (err, res, body){
            extension.fakeEnableExtension(oldEnable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Disable router should work', function(done) {
        var oldDisable = extension.disableExtension;
        extension.fakeDisableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12125/extension/disable',
            json: testData
        }
        request.post(data, function (err, res, body){
            extension.fakeDisableExtension(oldDisable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('GetAvailable router should work', function(done) {
        var oldGetExt = extension.getExtensionFiles;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve([]).promise();
        };
        extension.fakeGetExtensionFiles(fakeFunc);
        var data = {
            url: 'http://localhost:12125/extension/getAvailable',
            headers: {
              'Content-Type': 'application/json'
            }
        }
        request.get(data, function (err, res, body){
            extension.fakeGetExtensionFiles(oldGetExt);
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it('GetEnabled router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/extension/getEnabled'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it('ListPackage router should work', function(done) {
        var oldFetch = extension.fakeFetchAllExtensions;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve({"status": 1}).promise();
        };
        extension.fakeFetchAllExtensions(fakeFunc);
        var data = {
            url: 'http://localhost:12125/extension/listPackage'
        }
        request.get(data, function (err, res, body){
            extension.fakeFetchAllExtensions(oldFetch);
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it("GetActiveUsers Router should work", function(done) {
        var data = {
            url: 'http://localhost:12125/extension/activeUsers'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(-1);
            done();
        });
    });

    after(function() {
        extension.fakeGetObject(oldGetObject);
    });
});
