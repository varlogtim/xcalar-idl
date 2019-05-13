describe('ExpServer Extension Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var fs = require('fs');
    var request = require('request');
    require(__dirname + '/../expServer.js');

    var extensionManager = require(__dirname +
        '/../controllers/extensionManager.js');
    var support = require(__dirname + '/../utils/expServerSupport.js');
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
        testFileName = "extensionManagers/distinct/1.0.0/distinct-1.0.0.tar.gz";
        oldGetObject = extensionManager.getObject;
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

    it("extensionManager.writeTarGz should fail when error", function(done) {
        extensionManager.writeTarGz(testTargz, testName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.equal(null);
            done();
        });
    });

    it("extensionManager.writeTarGz should work", function(done) {
        testTargz = fs.readFileSync(__dirname + "/config/testExt-1.0.0.tar.gz", "base64");
        extensionManager.writeTarGz(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGz succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });


    it("extensionManager.writeTarGzWithCleanup should fail when error", function(done) {
        testTargz = "test";
        extensionManager.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.writeTarGzWithCleanup should work", function(done) {
        var oldFunc = extensionManager.writeTarGz;
        extensionManager.fakeWriteTarGz(emptyPromise);
        extensionManager.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGzWithCleanup succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            extensionManager.fakeWriteTarGz(oldFunc);
        });
    });

    it("extensionManager.downloadExtension should fail when error", function(done) {
        var fakeFunc = function(data, callback) {
            callback("fail");
        }
        extensionManager.fakeGetObject(fakeFunc);
        extensionManager.downloadExtension(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            extensionManager.fakeGetObject(oldGetObject);
        });
    });

    it("extensionManager.downloadExtension should work", function(done) {
        testDownloadName = "distinct";
        extensionManager.downloadExtension(testDownloadName, testVersion)
        .then(function(ret) {
            expect(ret.status).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extensionManager.getExtensionFiles should fail when error", function(done) {
        extensionManager.getExtensionFiles("", testType)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.getExtensionFiles should work", function(done) {
        testType = "available";
        extensionManager.getExtensionFiles("", testType)
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extensionManager.enableExtension should fail when error", function(done) {
        extensionManager.enableExtension("testFail")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.enableExtension should work", function(done) {
        extensionManager.enableExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("enableExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extensionManager.disalbeExtension should fail when error", function(done) {
        extensionManager.disableExtension("testFail")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.disalbeExtension should work", function(done) {
        extensionManager.disableExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("disableExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extensionManager.removeExtension should work", function(done) {
        extensionManager.removeExtension(testName)
        .then(function(ret) {
            expect(ret).to.equal("removeExtension succeeds");
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        });
    });

    it("extensionManager.removeExtension should fail when error", function(done) {
        extensionManager.removeExtension(testName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.processItem should fail when error", function(done) {
        extensionManager.processItem([], "notExist.txt")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extensionManager.processItem should work", function(done) {
        extensionManager.processItem([], testFileName)
        .then(function(ret) {
            expect(ret).to.equal("processItem succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extensionManager.fetchAllExtensions should work", function(done) {
        extensionManager.fetchAllExtensions()
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extensionManager.fetchAllExtensions should fail when error", function(done) {
        var oldFunc = extensionManager.processItem;
        var fakeFunc = function() {
            return jQuery.Deferred().reject("processItem fails").promise();
        }
        extensionManager.fakeProcessItem(fakeFunc);
        extensionManager.fetchAllExtensions()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            extensionManager.fakeProcessItem(oldFunc);
        });
    });

    it('Upload router should work', function(done) {
        var oldWrite = extensionManager.writeTarGzWithCleanup;
        var oldEnable = extensionManager.enableExtensionn;
        extensionManager.fakeWriteTarGzWithCleanup(emptyPromise);
        extensionManager.fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/upload',
            json: testData
        }
        request.post(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(err));
            extensionManager.fakeWriteTarGzWithCleanup(oldWrite);
            extensionManager.fakeEnableExtension(oldEnable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Download router should work', function(done) {
        var oldWrite = extensionManager.writeTarGzWithCleanup;
        var oldDownload = extensionManager.downloadExtension;
        var fakeDownload = function() {
            return jQuery.Deferred().resolve({data: "test",
                                              name: "test",
                                              version: "test"}).promise();
        }
        extensionManager.fakeWriteTarGzWithCleanup(emptyPromise);
        extensionManager.fakeDownloadExtension(fakeDownload);
        var data = {
            url: 'http://localhost:12224/extension/download',
            json: testData
        }
        request.post(data, function (err, res, body){
            extensionManager.fakeWriteTarGzWithCleanup(oldWrite);
            extensionManager.fakeDownloadExtension(oldDownload);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Remove router should work', function(done) {
        var oldRemove = extensionManager.removeExtension;
        extensionManager.fakeRemoveExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/remove',
            json: testData
        }
        request.delete(data, function (err, res, body){
            extensionManager.fakeRemoveExtension(oldRemove);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Enable router should work', function(done) {
        var oldEnable = extensionManager.enableExtensionn;
        extensionManager.fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/enable',
            json: testData
        }
        request.post(data, function (err, res, body){
            extensionManager.fakeEnableExtension(oldEnable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Disable router should work', function(done) {
        var oldDisable = extensionManager.disableExtension;
        extensionManager.fakeDisableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/disable',
            json: testData
        }
        request.post(data, function (err, res, body){
            extensionManager.fakeDisableExtension(oldDisable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('GetAvailable router should work', function(done) {
        var oldGetExt = extensionManager.getExtensionFiles;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve([]).promise();
        };
        extensionManager.fakeGetExtensionFiles(fakeFunc);
        var data = {
            url: 'http://localhost:12224/extension/getAvailable',
            headers: {
              'Content-Type': 'application/json'
            }
        }
        request.get(data, function (err, res, body){
            extensionManager.fakeGetExtensionFiles(oldGetExt);
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it('GetEnabled router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/extension/getEnabled'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it('ListPackage router should work', function(done) {
        var oldFetch = extensionManager.fakeFetchAllExtensions;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve({"status": 1}).promise();
        };
        extensionManager.fakeFetchAllExtensions(fakeFunc);
        var data = {
            url: 'http://localhost:12224/extension/listPackage'
        }
        request.get(data, function (err, res, body){
            extensionManager.fakeFetchAllExtensions(oldFetch);
            expect(JSON.parse(res.body).status).to.equal(1);
            done();
        });
    });

    it("GetActiveUsers Router should work", function(done) {
        var data = {
            url: 'http://localhost:12224/extension/activeUsers'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(-1);
            done();
        });
    });

    after(function() {

    });
});
