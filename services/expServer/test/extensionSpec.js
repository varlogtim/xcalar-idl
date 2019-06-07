describe('ExpServer Extension Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var fs = require('fs');
    var request = require('request');
    require(__dirname + '/../expServer.js');

    var extensionManager = require(__dirname +
        '/../controllers/extensionManager.js').default;
    var support = require(__dirname + '/../utils/expServerSupport.js').default;
    var testTargz;
    var testName;
    var testVersion;
    var testData;
    var testType;
    var oldGetObject;
    var oldListObjects;
    var oldCheckAuth;
    var oldCheckAuthAdmin;
    var emptyPromise;
    this.timeout(10000);

    function fakeWriteTarGz(func) {
        extensionManager.writeTarGz = func;
    }
    function fakeWriteTarGzWithCleanup(func) {
        extensionManager.writeTarGzWithCleanup = func;
    }
    function fakeGetObject(func) {
        extensionManager._s3.getObject = func;
    }
    function fakeListObjects(func) {
        extensionManager._s3.listObjects = func;
    }
    function fakeProcessItem(func) {
        extensionManager.processItem = func;
    }
    function fakeDownloadExtension(func) {
        extensionManager.downloadExtension = func;
    }
    function fakeRemoveExtension(func) {
        extensionManager.removeExtension = func;
    }
    function fakeEnableExtension(func) {
        extensionManager.enableExtension = func;
    }
    function fakeDisableExtension(func) {
        extensionManager.disableExtension = func;
    }
    function fakeGetExtensionFiles(func) {
        extensionManager.getExtensionFiles = func;
    }
    function fakeFetchAllExtensions(func) {
        extensionManager.fetchAllExtensions = func;
    }

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
        oldGetObject = extensionManager._s3.getObject;
        oldListObjects = extensionManager._s3.listObjects;
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        }
        function fakeCheck(req, res, next) {
            next();
        }
        oldCheckAuth = support.checkAuthImpl;
        oldCheckAuthAdmin = support.checkAuthAdminImpl;
        support.checkAuthImpl = fakeCheck;
        support.checkAuthAdminImpl = fakeCheck;
    });

    after(function() {
        support.checkAuthImpl = oldCheckAuth;
        support.checkAuthAdminImpl = oldCheckAuthAdmin;
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
        fakeWriteTarGz(emptyPromise);
        extensionManager.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGzWithCleanup succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeWriteTarGz(oldFunc);
        });
    });

    it("extensionManager.downloadExtension should fail when error", function(done) {
        var fakeFunc = function(data, callback) {
            callback("fail");
        }
        fakeGetObject(fakeFunc);
        extensionManager.downloadExtension(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            fakeGetObject(oldGetObject);
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
        const fakeFunc = (data, callback) => {
            callback("key does not exists");
        }
        fakeGetObject(fakeFunc);
        extensionManager.processItem([], "notExist.txt")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("key does not exists");
            done();
        })
        .always(function() {
            fakeGetObject(oldGetObject);
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
        const oldProcessFunc = extensionManager.processItem;
        const fakeProcessFunc = (ret, fileName) => {
            ret.push(fileName);
            return jQuery.Deferred().resolve();
        }
        const fakeListFunc = (params, callback) => {
            const data = {
                Contents: [{
                    Key: "test1.txt",
                },{
                    Key: "test2.txt",
                }],
            }
            callback(null, data);
        }
        fakeProcessItem(fakeProcessFunc);
        fakeListObjects(fakeListFunc);
        extensionManager.fetchAllExtensions()
        .then(function(ret) {
            expect(ret).to.deep.equal(["test1.txt", "test2.txt"])
            done();
        })
        .fail(function(err) {
            console.log(err);
            done("fail");
        })
        .always(function() {
            fakeProcessItem(fakeProcessFunc);
            fakeListObjects(oldListObjects);
        });
    });

    it("extensionManager.fetchAllExtensions should fail when failed to list s3 objects", function(done) {
        const fakeFunc = (params, callback) => {
            callback("s3 listObjests error");
        }
        fakeListObjects(fakeFunc);
        extensionManager.fetchAllExtensions()
        .then(function() {
            done("fail");
        })
        .fail(function(err) {
            expect(err).to.equal("s3 listObjests error");
            done();
        })
        .always(function() {
            fakeListObjects(oldListObjects);
        });
    });

    it("extensionManager.fetchAllExtensions should fail when failed to process item", function(done) {
        const oldProcessFunc = extensionManager.processItem;
        const fakeProcessFunc = function() {
            return jQuery.Deferred().reject("processItem fails").promise();
        }
        const data = {
            Contents: [{
                Key: "test1.txt",
            },{
                Key: "test2.txt",
            }],
        }
        const fakeListFunc = (params, callback) => {
            callback(params, data);
        }
        fakeProcessItem(fakeProcessFunc);
        fakeListObjects(fakeListFunc);
        extensionManager.fetchAllExtensions()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            fakeProcessItem(oldProcessFunc);
            fakeListObjects(oldListObjects);
        });
    });

    it('Upload router should work', function(done) {
        var oldWrite = extensionManager.writeTarGzWithCleanup;
        var oldEnable = extensionManager.enableExtension;
        fakeWriteTarGzWithCleanup(emptyPromise);
        fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/upload',
            json: testData
        }
        request.post(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(err));
            fakeWriteTarGzWithCleanup(oldWrite);
            fakeEnableExtension(oldEnable);
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
        fakeWriteTarGzWithCleanup(emptyPromise);
        fakeDownloadExtension(fakeDownload);
        var data = {
            url: 'http://localhost:12224/extension/download',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeWriteTarGzWithCleanup(oldWrite);
            fakeDownloadExtension(oldDownload);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Remove router should work', function(done) {
        var oldRemove = extensionManager.removeExtension;
        fakeRemoveExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/remove',
            json: testData
        }
        request.delete(data, function (err, res, body){
            fakeRemoveExtension(oldRemove);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Enable router should work', function(done) {
        var oldEnable = extensionManager.enableExtension;
        fakeEnableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/enable',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeEnableExtension(oldEnable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('Disable router should work', function(done) {
        var oldDisable = extensionManager.disableExtension;
        fakeDisableExtension(emptyPromise);
        var data = {
            url: 'http://localhost:12224/extension/disable',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeDisableExtension(oldDisable);
            expect(res.body.status).to.equal(1);
            done();
        });
    });

    it('GetAvailable router should work', function(done) {
        var oldGetExt = extensionManager.getExtensionFiles;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve([]).promise();
        };
        fakeGetExtensionFiles(fakeFunc);
        var data = {
            url: 'http://localhost:12224/extension/getAvailable',
            headers: {
              'Content-Type': 'application/json'
            }
        }
        request.get(data, function (err, res, body){
            fakeGetExtensionFiles(oldGetExt);
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
        var oldFetch = extensionManager.fetchAllExtensions;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve({"status": 1}).promise();
        };
        fakeFetchAllExtensions(fakeFunc);
        var data = {
            url: 'http://localhost:12224/extension/listPackage'
        }
        request.get(data, function (err, res, body){
            fakeFetchAllExtensions(oldFetch);
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
});
