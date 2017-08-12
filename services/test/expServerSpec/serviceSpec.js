describe('ExpServer Service Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var fs = require('fs');
    require('jquery');

    var service = require(__dirname + '/../../expServer/route/service.js');
    function sendRequest(action, url, str) {
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
        testStr = "test";
        service.fakeMasterExecuteAction();
        service.fakeSlaveExecuteAction();
        service.fakeRemoveSessionFiles();
        service.fakeRemoveSHM();
        service.fakeGetLicense();
        service.fakeSubmitTicket();
    });

    it("service.convertToBase64 should work", function() {
        expect(service.convertToBase64(testStr)).to.equal(new Buffer(testStr).toString("base64"));
    });

    it('Start router shoud work', function(done) {
        sendRequest("POST", "/service/start")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Stop router shoud work', function(done) {
        sendRequest("POST", "/service/stop")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Restart router shoud work', function(done) {
        sendRequest("POST", "/service/restart")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Status router shoud work', function(done) {
        sendRequest("GET", "/service/status")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Start Slave router shoud work', function(done) {
        sendRequest("POST", "/service/start/slave")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Stop Slave router shoud work', function(done) {
        sendRequest("POST", "/service/stop/slave")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Get Slave Status router shoud work', function(done) {
        sendRequest("GET", "/service/status/slave")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Remove Session Files router shoud work', function(done) {
        sendRequest("DELETE", "/service/sessionFiles")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Remove SHM Files router shoud work', function(done) {
        sendRequest("DELETE", "/service/SHMFiles")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Get License router shoud work', function(done) {
        sendRequest("GET", "/service/license")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('File ticket router shoud work', function(done) {
        sendRequest("POST", "/service/ticket")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Remove SHM Files router shoud work', function(done) {
        sendRequest("DELETE", "/service/SHMFiles")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Get Logs router shoud work', function(done) {
        sendRequest("GET", "/service/logs")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('Get Slave Logs router shoud work', function(done) {
        sendRequest("GET", "/service/logs/slave")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

});