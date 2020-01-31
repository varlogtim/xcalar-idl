describe("xcSocket Test", function() {
    let xcSocket;

    before(function() {
        xcSocket = XcSocket.Instance;
    });

    describe("Basic Function Test", function() {
        it("should be a Xockset Object", function() {
            expect(xcSocket).to.be.instanceOf(XcSocket);
        });

        it("isConnected should work", function() {
            var res = xcSocket.isConnected();
            // XXXnow socket is not fulled enalbe in all servers
            // will change it to equal true to make sure socket is connected
            expect(res).to.be.a("boolean");
        });

        it("xcSocket.isResigered should work", function() {
            var res = xcSocket.isResigered();
            expect(res).to.be.a("boolean");
        });

        it("should get expServer url", function() {
            let oldExpHost = window.expHost;

            // case 1
            window.expHost = null;
            let res = xcSocket._getExpServerUrl("http://test");
            expect(res).to.equal("http://test");
            // case 2
            window.expHost = "http://test2";
            res = xcSocket._getExpServerUrl("http://test");
            expect(res).to.equal("http://test2");

            window.expHost = oldExpHost;
        });

        it("should already registered", function() {
            var isRegistered = xcSocket.isResigered();
            if (isRegistered) {
                expect(xcSocket.registerUserSession()).to.be.false;
            }
        });

        it("should send message", function() {
            const oldSocket = xcSocket._socket;
            // case 1
            xcSocket._socket = null;
            let res = xcSocket.sendMessage("test");
            expect(res).to.be.false;

            // case 2
            let test = false;
            xcSocket._socket = {
                emit: () => { test = true; }
            };
            res = xcSocket.sendMessage("test");
            expect(res).to.be.true;
            expect(test).to.be.true;

            xcSocket._socket = oldSocket;
        });

        it("_checkConnection should work", function(done) {
            const deferred = PromiseHelper.deferred();
            xcSocket._checkConnection(deferred, 100);
            deferred.promise()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(AlertTStr.NoConnectToServer);
                done();
            });
        });

        it("_checkConnection should work case 2", function(done) {
            const deferred = PromiseHelper.deferred();
            xcSocket._checkConnection(deferred, 100, true);
            deferred.promise()
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });


    describe("Socket Events Test", function() {
        let oldSocket;
        const events = {};

        before(() => {
            oldSocket = xcSocket._socket;
            xcSocket._socket.on = function(event, callback) {
                events[event] = callback;
            }
            xcSocket._socket.trigger = function(event, arg) {
                const callback = events[event];
                if (typeof callback === 'function') {
                    callback(arg);
                }
            }

            xcSocket._addAuthenticationEvents();
            xcSocket._addSocketEvents();
        });

        it("should reject on connect fail", function(done) {
            const oldDeferred = xcSocket._initDeferred;
            xcSocket._initDeferred = PromiseHelper.deferred();
            xcSocket._socket.trigger('reconnect_failed');
            xcSocket._initDeferred.promise()
            .then(() => {
                done('fail');
            })
            .fail(function(error) {
                expect(error).to.equal(AlertTStr.NoConnectToServer);
                done();
            })
            .always(function() {
                xcSocket._initDeferred = oldDeferred;
            });
        });

        it("should reject on connect timeout", function(done) {
            const oldDeferred = xcSocket._initDeferred;
            xcSocket._initDeferred = PromiseHelper.deferred();
            xcSocket._socket.trigger('connect_timeout');
            xcSocket._initDeferred.promise()
            .then(() => {
                done('fail');
            })
            .fail(function(error) {
                expect(error).to.equal(AlertTStr.NoConnectToServer);
                done();
            })
            .always(function() {
                xcSocket._initDeferred = oldDeferred;
            });
        });

        it("useSessionExisted event should work", function() {
            const oldFunc = WorkbookManager.gotoWorkbook;
            let test = false;
            WorkbookManager.gotoWorkbook = () => { test = true;};
            const userOption = {
                user: XcUser.getCurrentUserName(),
                id: WorkbookManager.getActiveWKBK()
            };

            // case 1;
            xcSocket._isRegistered = false;
            xcSocket._socket.trigger('useSessionExisted', userOption);
            expect(test).to.be.false;

            // case 2
            xcSocket._isRegistered = true;
            xcSocket._socket.trigger('useSessionExisted', userOption);
            expect(test).to.be.true;

            WorkbookManager.gotoWorkbook = oldFunc;
        });

        it("logout event should work", () => {
            const oldFunc = XcUser.checkCurrentUser;
            let test = false;
            XcUser.checkCurrentUser = () => { test = true };
            xcSocket._socket.trigger('logout', {
                user: XcUser.getCurrentUserName()
            });
            expect(test).to.be.true;
            XcUser.checkCurrentUser = oldFunc;
        });

        it("system-allUsers event should work", function() {
            const oldCheckMaxUsers = XVM.checkMaxUsers;
            const oldUpdate = Admin.updateLoggedInUsers;
            let test1 = false, test2 = false;
            XVM.checkMaxUsers = () => { test1 = true; };
            Admin.updateLoggedInUsers = () => { test2 = true; };

             // case 1;
            xcSocket._isRegistered = false;
            xcSocket._socket.trigger('system-allUsers');
            expect(test1).to.be.false;
            expect(test2).to.be.false;

             // case 2
            xcSocket._isRegistered = true;
            xcSocket._socket.trigger('system-allUsers');
            expect(test1).to.be.true;
            expect(test2).to.be.true;

            XVM.checkMaxUsers = oldCheckMaxUsers;
            Admin.updateLoggedInUsers = oldUpdate;
        });

        it("adminAlert event should work", function() {
            const oldFunc = Alert.show;
            let test = false;
            let alertArg = null;

            Alert.show = (arg) => {
                test = true;
                alertArg = arg;
            };

            // case 1;
            xcSocket._isRegistered = false;
            xcSocket._socket.trigger('adminAlert', {
                title: "title",
                message: "message"
            });
            expect(test).to.be.false;
            expect(alertArg).to.be.null;

            // case 2
            xcSocket._isRegistered = true;
            xcSocket._socket.trigger('adminAlert', {
                title: "title",
                message: "message"
            });
            expect(test).to.be.true;
            expect(alertArg).not.to.be.null;
            expect(alertArg.title).to.equal("title");
            expect(alertArg.msg).to.equal("message");
            expect(alertArg.isAlert).to.equal(true);

            Alert.show = oldFunc;
        });

        it("refreshUDF event should work", function () {
            const oldFunc = UDFFileManager.Instance.refresh;
            let testIsUpdate = null;
            let testIsDelete = null;
            UDFFileManager.Instance.refresh = (isUpdate, isDelete) => {
                testIsUpdate = isUpdate;
                testIsDelete = isDelete;
            };

            // case 1;
            xcSocket._isRegistered = false;
            xcSocket._socket.trigger('refreshUDF', { isUpdate: true, isDelete: true });
            expect(testIsUpdate).to.be.null;
            expect(testIsDelete).to.be.null;

            // case 2
            xcSocket._isRegistered = true;
            xcSocket._socket.trigger('refreshUDF', { isUpdate: true, isDelete: true });
            expect(testIsUpdate).to.be.true;
            expect(testIsDelete).to.be.true;

            UDFFileManager.Instance.refresh = oldFunc;
        });

        it("ds.update event should work", function() {
            const oldFunc = DS.updateDSInfo;
            let test = null;
            DS.updateDSInfo = (arg) => {
                test = arg;
            };

            // case 1;
            xcSocket._socket.trigger('ds.update', {});
            expect(test).not.to.be.null;

            DS.updateDSInfo = oldFunc;
        });

        it("refreshDagCategory event should work", function() {
            const oldFunc = DagCategoryBar.Instance.loadCategories;
            let test = null;
            DagCategoryBar.Instance.loadCategories = () => {
                test = true;
            };

            // case 1;
            xcSocket._isRegistered = false;
            xcSocket._socket.trigger('refreshDagCategory');
            expect(test).to.be.null;

            // case 2;
            xcSocket._isRegistered = true;
            xcSocket._socket.trigger('refreshDagCategory');
            expect(test).to.be.true;

            DagCategoryBar.Instance.loadCategories = oldFunc;
        });

        after(() => {
            xcSocket._socket = oldSocket;
        });
    });
});