describe('ExpServer Upload Test', function() {
    // Test setup
    var expect = require('chai').expect;

    require('jquery');
    var upload = require(__dirname + '/../../expServer/upload.js');
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
    var testMin;
    var testMax;
    var testCommand;
    var testFilePath;
    var testData;
    var testReq;
    var testName;
    var testVersion;
    var testS3;
    var testExt;
    this.timeout(10000);
    // Test begins
    before(function() {
        testMin = 5;
        testMax = 8;
        testCommand = "ls";
        testFilePath = __dirname + "/../config/logs";
        testDir = __dirname + "/../config/testDir"
        testData = "ONLY FOR TEST";
        testName = "testExt";
        testVersion = "1.0.0";
        testS3 = "s3";
        testExt = __dirname + "/../config/testExt";
        testReq = {
            body: {
                name: testName,
                jsFilePath: testExt,
                pyFilePath: testExt,
                imgPath: testFilePath
            }
        }
        upload.fakeUpload();
    });

    it("getRandomInt should work", function() {
        expect(upload.getRandomInt(testMin, testMax)).to.be.within(testMin, testMax);
    });
    it("execPromise should work", function(done) {
        upload.execPromise(testCommand)
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("writeFilePromise should work", function(done) {
        upload.writeFilePromise(testFilePath, testData)
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("uploadMeta should work", function(done) {
        upload.uploadMeta(testReq)
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("create should work", function(done) {
        upload.create(testDir)
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("gzipAndUpload should work", function(done) {
        upload.gzipAndUpload(testName, testVersion, testDir, testS3)
        .then(function(ret) {
            expect(ret).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("uploadContent should work", function(done) {
        upload.fakeUploadMeta();
        upload.uploadContent(testReq)
        .then(function(ret) {
            expect(ret).to.equal("upload success");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Publish router shoud work', function(done) {
        upload.fakeUploadContent();
        testData = {
            "targz": "testTargz",
            "name": "test"
        }
        postRequest("POST", "/extension/publish", testData)
        .then(function(ret) {
            expect(ret.status).to.equal(1);
            done();
        })
        .fail(function(err) {
            console.log(err)
            done("fail");
        });
    });
});