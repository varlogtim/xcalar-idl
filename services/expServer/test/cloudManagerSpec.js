const { expect, assert } = require('chai');
const request = require('request-promise-native');

describe("CloudManager Test", () => {
    let socket = require(__dirname + "/../../expServer/controllers/socket.js").default;
    var cloudManager = require(__dirname + "/../../expServer/controllers/cloudManager.js").default;

    let oldRequestPost;
    let oldNumCredits;
    let oldUpdateCreditsTime;

    before(() => {
        oldRequestPost = request.post;
        cloudManager.setUserName("test@xcalar.com");
        oldNumCredits = cloudManager._numCredits;
        oldUpdateCreditsTime = cloudManager._updateCreditsTime;
    });

    after(() => {
        request.post = oldRequestPost;
        cloudManager._numCredits = oldNumCredits;
        cloudManager._updateCreditsTime = oldUpdateCreditsTime;
    });

    it("getUserInfo should work", (done) => {
        cloudManager.getUserInfo()
        .then((res) => {
            expect(res).to.deep.equal({clusterUrl: "", cfnId: "", credits: null});
            done();
        })
        .catch(() => {
            done("fail");
        });
    });

    it("stopCluster should work", (done) => {
        let called = false;
        request.post = (args) => {
            expect(args).to.deep.equal({
                url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/stop',
                body: { username: 'test@xcalar.com' },
                json: true
              });
            called = true;
            return new Promise((res,rej) => res());
        }
        cloudManager.stopCluster()
        .then(res => {
            expect(called).to.be.true;
            done();
        })
        .catch(() => {
            done("fail");
        });
    });

    it("stopCluster fail should be handled", (done) => {
        let called = false;
        request.post = (args) => {
            expect(args).to.deep.equal({
                url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/stop',
                body: { username: 'test@xcalar.com' },
                json: true
              });
            called = true;
            return new Promise((res,rej) => rej({status: 404}));
        }
        cloudManager.stopCluster()
        .then(res => {
            expect(called).to.be.true;
            expect(res).to.deep.equal({
                error: {
                    status: 404
                }
            });
            done();
        })
        .catch((res) => {
            done("fail");
        });
    });

    it("checkCluster should work", (done) => {
        let called = false;
        request.post = (args) => {
            console.log("*#&(*#W&$W(#*&$W(#&", args)
            expect(args).to.deep.equal({
                url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/get',
                body: { username: 'test@xcalar.com' },
                json: true
              });
            called = true;
            return new Promise((res,rej) => res());
        }
        cloudManager.checkCluster()
        .then(res => {
            expect(called).to.be.true;
            done();
        })
        .catch(() => {
            done("fail");
        });
    });

    it("get num credits should work", () => {
        cloudManager._numCredits = 1.23;
        let res = cloudManager.getNumCredits();
        expect(res).to.equal(1.23);
    });

    it("_updateCredits should work", (done) => {
        cloudManager._updateCreditsTime = 100;
        let count = 0;
        request.post = (args) => {
            count++;
            if (count == 1 || count === 3) {
                expect(args).to.deep.equal({
                    url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/deduct',
                    body: { username: 'test@xcalar.com' },
                    json: true
                });
                return new Promise((res,rej) => res());
            } else if (count === 2 || count === 4) {
                expect(args).to.deep.equal({
                    url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/get',
                    body: { username: 'test@xcalar.com' },
                    json: true
                });
                return new Promise((res,rej) => res({credits: 2.34}));
            }
        }

        cloudManager._updateCredits();

        setTimeout(() => {
            expect(count).to.equal(4);
            let res = cloudManager.getNumCredits();
            expect(res).to.equal(2.34);
            done();
        }, 250);
    });

    it("_updateCredits should shutdown cluster if credits == 0", (done) => {
        cloudManager._updateCreditsTime = 100;
        let count = 0;
        request.post = (args) => {
            count++;
            if (count == 1) {
                expect(args).to.deep.equal({
                    url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/deduct',
                    body: { username: 'test@xcalar.com' },
                    json: true
                });
                return new Promise((res,rej) => res());
            } else if (count === 2) {
                expect(args).to.deep.equal({
                    url: 'https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/get',
                    body: { username: 'test@xcalar.com' },
                    json: true
                });
                return new Promise((res,rej) => res({credits: 0}));
            }
        }
        expect(cloudManager._stopClusterMessageSent).to.be.false;

        let socketCalled = false;
        let oldSocket = socket.logoutMessage;
        socket.logoutMessage = (data) => {
            expect(data).to.deep.equal({type: "noCredits"});
            socketCalled = true;
        };

        let stopClusterCalled = false;
        let oldStopCluster = cloudManager.stopCluster;
        cloudManager.stopCluster = () => {
            stopClusterCalled = true;
        }

        cloudManager._updateCredits();

        setTimeout(() => {
            expect(count).to.equal(2);
            let res = cloudManager.getNumCredits();
            expect(res).to.equal(0);
            expect(socketCalled).to.be.true;
            expect(stopClusterCalled).to.be.true;
            expect(cloudManager._stopClusterMessageSent).to.be.true;
            cloudManager._stopClusterMessageSent = false;
            socket.logoutMessage = oldSocket;
            cloudManager.stopCluster = oldStopCluster;
            done();
        }, 150);
    });
});