describe('ExpServer Extension Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var fs = require('fs');
    require('jquery');

    var extension = require(__dirname + '/../../expServer/route/extension.js');
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
    var testTargz;
    var testName;
    var testVersion;
    var testData;
    var testType;
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
        extension.fakeWriteTarGz();
        extension.writeTarGzWithCleanup(testTargz, testName, testVersion)
        .then(function(ret) {
            expect(ret).to.equal("writeTarGzWithCleanup succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("extension.downloadExtension should fail when error", function(done) {
        extension.downloadExtension(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("extension.downloadExtension should work", function(done) {
        testDownloadName = "distinct";
        extension.downloadExtension(testDownloadName, testVersion)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
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
        extension.fakeProcessItem();
        extension.fetchAllExtensions()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        });
    });

    it('Upload router shoud work', function(done) {
        extension.fakeWriteTarGzWithCleanup();
        extension.fakeEnableExtension();
        postRequest("POST", "/extension/upload", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Download router shoud work', function(done) {
        extension.fakeDownloadExtension();
        extension.fakeWriteTarGzWithCleanup();
        postRequest("POST", "/extension/download", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Remove router shoud work', function(done) {
        extension.fakeRemoveExtension();
        postRequest("DELETE", "/extension/remove", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Enable router shoud work', function(done) {
        extension.fakeEnableExtension();
        postRequest("POST", "/extension/enable", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Disable router shoud work', function(done) {
        extension.fakeWriteTarGzWithCleanup();
        extension.fakeEnableExtension();
        postRequest("POST", "/extension/upload", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('GetAvailable router shoud work', function(done) {
        extension.fakeGetExtensionFiles();
        postRequest("GET", "/extension/getAvailable", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('GetEnabled router shoud work', function(done) {
        postRequest("GET", "/extension/getEnabled", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('ListPackage router shoud work', function(done) {
        extension.fakeFetchAllExtensions();
        postRequest("GET", "/extension/listPackage", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Publish router shoud work', function(done) {
        extension.fakeUploadContent();
        postRequest("POST", "/extension/publish", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

});