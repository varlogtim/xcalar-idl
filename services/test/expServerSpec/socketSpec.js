describe("ExpServer Socket Test", function() {
    var io = require(__dirname + '/../../expServer/node_modules/socket.io-client');
    var options = {
        transports: ['websocket'],
        'force new connection': true
    }
    var expect = require('chai').expect;
    this.timeout(10000);
    var client1;
    var client2;
    var testUser;
    var testDF;
    var testAlertOpts;
    var testOverwriteUDF;
    before(function() {
        testUser = "testUser";
        testDF = "testDF";
        testOverwriteUDF = true;
        testAlertOpts = {};
    });
    it("socket should connect", function(done) {
        var flag1, flag2;
        client1 = io('http://localhost:12124', options);
        client2 = io('http://localhost:12124', options);
        client1.on("connect", function() {
            client2.on("connect", function() {
                done();
            });
        });
    });
    it("socket should handle registerUser", function(done) {
        client1.emit("registerUser", testUser, function() {});
        client2.on("system-allUsers", function(users) {
            expect(users).to.have.property(testUser);
            done();
        });
    });
    it("socket should handle refreshDataflow", function(done) {
        client1.emit("refreshDataflow", testDF);
        client2.on("refreshDataflow", function(dfName) {
            expect(dfName).to.equal(testDF);
            done();
        });
    });
    it("socket should handle refreshUDFWithoutClear", function(done) {
        client1.emit("refreshUDFWithoutClear", testOverwriteUDF);
        client2.on("refreshUDFWithoutClear", function(overwriteUDF) {
            expect(overwriteUDF).to.equal(testOverwriteUDF);
            done();
        });
    });
    it("socket should handle refreshDSExport", function(done) {
        client1.emit("refreshDSExport");
        client2.on("refreshDSExport", function() {
            done();
        });
    });
    it("socket should handle adminAlert", function(done) {
        client1.emit("adminAlert", testAlertOpts);
        client2.on("adminAlert", function(alertOptions) {
            expect(alertOptions).to.be.empty;
            done();
        });
    });
    it("socket should disconnect", function() {
        client1.disconnect();
        client2.disconnect();
        expect(client1.connected).to.equal(false);
        expect(client2.connected).to.equal(false);
    });
});