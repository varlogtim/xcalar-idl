describe("ExpServer Socket Test", function() {
    var io = require(__dirname + '/../../expServer/node_modules/socket.io-client');
    var options = {
        transports: ['websocket'],
        'force new connection': true
    }
    var expect = require('chai').expect;
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var expServerSocket = require(__dirname + '/../../expServer/socket.js');
    this.timeout(10000);
    var client;
    var peerClient;
    var testUserOption;
    var testDF;
    var testAlertOpts;
    var testOverwriteUDF;

    before(function(done) {
        testUserOption = {
            user: "testUser",
            id: "testId"
        };
        testDF = "testDF";
        testOverwriteUDF = true;
        testAlertOpts = {};
        testWkbk = "testWkbk";
        testIMD = "testIMD";
        var flag1, flag2;
        client = io('http://localhost:12125', options);
        client.on("connect", function() {
            peerClient = io('http://localhost:12125', options);
            peerClient.on("connect", function() {
                done();
            });
        });
        function dummyCheckIoSocketAuth(authSocket) {
            return false;
        }
        function dummyCheckIoSocketAuthAdmin(authSocket) {
            return false;
        }
        expServerSocket.fakeCheckIoSocketAuth(dummyCheckIoSocketAuth);
        expServerSocket.fakeCheckIoSocketAuthAdmin(dummyCheckIoSocketAuthAdmin);
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
        var first = true;
        client.emit("registerUserSession", testUserOption, function() {});
        client.on("system-allUsers", function(users) {
            if (first) {
                expect(users).to.deep.equal(expectedRes);
                first = false;
                client.emit("registerUserSession", testUserOption, function() {});
            } else {
                expectedRes.testUser.count += 1;
                expectedRes.testUser.workbooks.testId += 1;
                expect(users).to.deep.equal(expectedRes);
                done();
            }
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
        peerClient.on("refreshIMD", function(res) {
            expect(res).to.equal(testIMD);
            done();
        });
    });

    it("socket should handle ds event", function(done) {
        var arg = {id: 0,
                   event: "changeStart"};
        client.emit("ds", arg, function(success1) {
            expect(success1).to.be.true;
            client.emit("ds", arg, function(success2) {
                // It's locked
                expect(success2).to.be.false;
                arg.event = "changeEnd";
                client.emit("ds", arg, function(success3) {
                    expect(success3).to.be.true;
                    done();
                });
            });
        });
    });

    it("socket should disconnect", function(done) {
        var expectedRes = {
            testUser: {
                count: 1,
                workbooks: {}
            }
        }
        client.disconnect();
        expect(client.connected).to.equal(false);
        peerClient.on("system-allUsers", function(users) {
            expect(users).to.deep.equal(expectedRes);
            done();
        });
    });

});
