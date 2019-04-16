describe('ExpServer Service Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var support = require(__dirname + '/../../expServer/utils/expServerSupport.js');
    var service = require(__dirname + '/../../expServer/route/service.js');
    var serviceManager = require(__dirname + '/../../expServer/controllers/serviceManager.js');
    var oldMasterExec;
    var oldSlaveExec;
    var oldRemoveSession;
    var oldRemoveSHM;
    var oldGetLic;
    var oldSubTicket;
    var oldGetMatch;
    this.timeout(10000);

    // Test begins
    before(function() {
        testStr = "test";
        fakeFunc = function() {
            return jQuery.Deferred().resolve({status: 200}).promise();
        }
        oldMasterExec = serviceManager.masterExecuteAction;
        oldSlaveExec = serviceManager.slaveExecuteAction;
        oldRemoveSession = serviceManager.removeSessionFiles;
        oldRemoveSHM = serviceManager.removeSHM;
        oldGetLic = serviceManager.getLicense;
        oldSubTicket = serviceManager.submitTicket;
        oldGetMatch = serviceManager.getMatchedHosts;
        oldGetTickets = serviceManager.getTickets;
        oldGetPatch = serviceManager.getHotPatch;
        oldSetPatch = serviceManager.setHotPatch;
        service.fakeMasterExecuteAction(fakeFunc);
        service.fakeSlaveExecuteAction(fakeFunc);
        service.fakeRemoveSessionFiles(fakeFunc);
        service.fakeRemoveSHM(fakeFunc);
        service.fakeGetLicense(fakeFunc);
        service.fakeSubmitTicket(fakeFunc);
        service.fakeGetMatchedHosts(fakeFunc);
        service.fakeGetTickets(fakeFunc);
        service.fakeGetHotPatch(fakeFunc);
        service.fakeSetHotPatch(fakeFunc);

        support.checkAuthTrue(support.userTrue);
        support.checkAuthAdminTrue(support.adminTrue);
    });

    after(function() {
        support.checkAuthTrue(support.checkAuthImpl);
        support.checkAuthAdminTrue(support.checkAuthAdminImpl);
    });

    it("service.convertToBase64 should work", function() {
        expect(serviceManager.convertToBase64(testStr)).to.equal(Buffer.from(testStr).toString("base64"));
    });

    it('Start router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/start'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Stop router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/stop'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(JSON.parse(res.body).status)).to.equal(200);
            done();
        });
    });

    it('Restart router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/restart'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(JSON.parse(res.body).status)).to.equal(200);
            done();
        });
    });

    it('Status router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/status'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Start Slave router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/start/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Stop Slave router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/stop/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Slave Status router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/status/slave'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Remove Session Files router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/sessionFiles'
        }
        request.delete(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Remove SHM Files router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/SHMFiles'
        }
        request.delete(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get License router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/license'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('File ticket router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/ticket'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Logs router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/logs'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Slave Logs router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/logs/slave'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Matched Host router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/matchedHosts'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Generate Support Bundle router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/bundle'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Generate Slave Support Bundle router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/bundle/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Ticket router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/gettickets'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Find Hot Patch router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/hotPatch'
        }
        request.get(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Set Hot Patch router should work', function(done) {
        var data = {
            url: 'http://localhost:12125/service/hotPatch'
        }
        request.post(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });


    after(function() {
        service.fakeMasterExecuteAction(oldMasterExec);
        service.fakeSlaveExecuteAction(oldSlaveExec);
        service.fakeRemoveSessionFiles(oldRemoveSession);
        service.fakeRemoveSHM(oldRemoveSHM);
        service.fakeGetLicense(oldGetLic);
        service.fakeSubmitTicket(oldSubTicket);
        service.fakeGetMatchedHosts(oldGetMatch);
        service.fakeGetTickets(oldGetTickets);
        service.fakeGetHotPatch(oldGetPatch);
        service.fakeSetHotPatch(oldSetPatch);
    });
});
