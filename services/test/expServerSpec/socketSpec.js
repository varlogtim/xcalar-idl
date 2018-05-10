describe("ExpServer Socket Test", function() {
    var io = require(__dirname + '/../../expServer/node_modules/socket.io-client');
    var options = {
        transports: ['websocket'],
        'force new connection': true
    }
    var expect = require('chai').expect;
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    this.timeout(10000);
    var client;
    var peerClient;
    var testUserOption;
    var testDF;
    var testAlertOpts;
    var testOverwriteUDF;

    before(function() {
        testUserOption = {
            user: "testUser",
            id: "testId"
        };
        testDF = "testDF";
        testOverwriteUDF = true;
        testAlertOpts = {};
        testWkbk = "testWkbk";
        testIMD = "testIMD";
    });

    it("socket should connect", function(done) {
        var flag1, flag2;
        client = io('http://localhost:12125', options);
        peerClient = io('http://localhost:12125', options);
        client.on("connect", function() {
            peerClient.on("connect", function() {
                done();
            })
        });
    });

    it("socket should handle registerUser", function(done) {
        var expectedRes = {
            testUser: {
                count: 1,
                workbooks: {
                    testId: 1
                }
            }
        }
        client.emit("registerUserSession", testUserOption, function() {});
        client.on("system-allUsers", function(users) {
            expect(users).to.deep.equal(expectedRes);
            done();
        });
    });

    it("socket should checkUserSession", function(done) {
        client.emit("checkUserSession", testUserOption, function() {
            done();
        });
    });

    it("socket should unregisterUserSession", function(done) {
        client.emit("unregisterUserSession", testUserOption, function() {
            done();
        })
    });

    it("socket should handle refreshDataflow", function(done) {
        client.emit("refreshDataflow", testDF);
        peerClient.on("refreshDataflow", function(dfName) {
            expect(dfName).to.equal(testDF);
            done();
        });
    });

    it("socket should handle refreshUDFWithoutClear", function(done) {
        client.emit("refreshUDFWithoutClear", testOverwriteUDF);
        peerClient.on("refreshUDFWithoutClear", function(overwriteUDF) {
            expect(overwriteUDF).to.equal(testOverwriteUDF);
            done();
        });
    });

    it("socket should handle refreshDSExport", function(done) {
        client.emit("refreshDSExport");
        peerClient.on("refreshDSExport", function() {
            done();
        });
    });

    it("socket should handle adminAlert", function(done) {
        client.emit("adminAlert", testAlertOpts);
        peerClient.on("adminAlert", function(alertOptions) {
            expect(alertOptions).to.be.empty;
            done();
        });
    });

    it("socket should handle refreshWorkbook", function(done) {
        client.emit("refreshWorkbook", testWkbk);
        peerClient.on("refreshWorkbook", function(res) {
            expect(res).to.equal(testWkbk);
            done();
        });
    });

    it("socket should handle refreshUserSettings", function(done) {
        client.emit("refreshUserSettings");
        peerClient.on("refreshUserSettings", function() {
            done();
        });
    });

    it("socket should handle refreshIMD", function(done) {
        client.emit("refreshIMD", testIMD);
        peerClient.on(testIMD, function() {
            done();
        });
    });

    it("socket should disconnect", function() {
        client.disconnect();
        expect(client.connected).to.equal(false);
    });

});