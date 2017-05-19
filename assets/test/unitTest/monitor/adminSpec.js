describe("Admin Test", function() {
    var $mainTabCache;
    var $monitorPanel;
    var cachedStorage;
    var cachedGetItem;

    before(function() {
        gMinModeOn = true;
        cachedGetItem = xcLocalStorage.getItem;
        // cachedStorage = xcLocalStorage;
        var wasAdmin = xcLocalStorage.getItem("admin") === "true";

        xcLocalStorage.getItem = function(item) {
            if (item === "admin") {
                return "true";
            } else {
                return "false";
            }
        };

        Admin.__testOnly__.setPosingAs();
        if (!wasAdmin) {
            Admin.initialize();
        }
    });

    describe("check initial state", function() {
        it("container should have admin class", function() {
            expect($("#container").hasClass("admin")).to.be.true;
        });
        it("gAdmin", function() {
            expect(gAdmin).to.be.true;
        });
        it("xcSupport", function() {
            expect(Admin.isXcSupport()).to.be.false;
        });
        it("adminbar should toggle", function() {
            expect($("#adminStatusBar").hasClass("active")).to.be.true;
            $("#adminStatusBar .pulloutTab").click();
            expect($("#adminStatusBar").hasClass("active")).to.be.false;
            $("#adminStatusBar .pulloutTab").click();
            expect($("#adminStatusBar").hasClass("active")).to.be.true;
        });
    });

    describe("user list", function() {
        it("getUserList should work", function(done) {
            Admin.__testOnly__.refreshUserList()
            .always(function() {
                var list = Admin.getUserList();
                var ownName = Support.getUser();
                expect(list.length).to.be.gt(0);
                expect(list.indexOf(ownName)).to.be.gt(-1);
                done();
            });
        });

        it("adding user should work", function(done) {
            var cachedGet = KVStore.get;
            var cachedAppend = XcalarKeyAppend;
            var cachedGetUser = Support.getUser;
            var userName = "randTest" + Date.now();
            var cachedList = xcHelper.deepCopy(Admin.getUserList());

            KVStore.get = function() {
                return PromiseHelper.resolve('"fakeUser,"') ;
            };
            Support.getUser = function() {
                return userName;
            };
            XcalarKeyAppend = function() {
                appendCalled = true;
                return PromiseHelper.resolve();
            };

            var appendCalled = false;
            Admin.addNewUser()
            .then(function() {
                expect(appendCalled).to.be.true;
                var list = Admin.getUserList();
                expect(list.indexOf(userName)).to.be.gt(-1);

                list.length = 0;
                for (var i = 0; i < cachedList.length; i++) {
                    list.push(cachedList[i]);
                }

                KVStore.get = cachedGet;
                Support.getUser = cachedGetUser;
                XcalarKeyAppend = cachedAppend;
                done();
            });
        });

        it("filtering userlist should work", function() {
            var $userList = $('#monitorMenu-setup .userList');
            var listLen = $userList.find(".userLi").length;
            expect(listLen).to.be.gt(0);
            var ownName = Support.getUser();
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });
            expect($ownLi.length).to.equal(1);
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            $("#adminUserSearch input").val("@@@@@@").trigger(fakeEvent.input);
            expect($ownLi.hasClass("xc-hidden")).to.be.true;
            $("#adminUserSearch input").val(ownName).trigger(fakeEvent.input);
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            $("#adminUserSearch .closeBox").click();
            expect($("#adminUserSearch input").val()).to.equal("");
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            expect($userList.find(".userLi.xc-hidden").length).to.equal(0);
        });

        it("switch user should work", function() {
            var cachedunload = xcManager.unload;
            xcManager.unload = function() {return null};
            var $userList = $('#monitorMenu-setup .userList');
            var ownName = Support.getUser();
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });
            $ownLi.click();
            expect(xcSessionStorage.getItem("usingAs")).to.not.equal("true");

            UnitTest.hasAlertWithTitle(MonitorTStr.UseXcalarAs, {confirm: true});
            expect(xcSessionStorage.getItem("usingAs")).to.equal("true");
            expect(xcSessionStorage.getItem("adminName")).to.equal(ownName);

            $("#adminStatusBar").find(".xi-close").click();
            expect(xcSessionStorage.getItem("usingAs")).to.not.equal("true");
            xcManager.unload = cachedunload;
        });

        it("refreshUserList button should work", function() {
            var cachedFn = KVStore.get;
            KVStore.get = function() {
                return PromiseHelper.resolve(null);
            };
            $("#adminUserSearch").find("input").val("test");

            $("#monitorMenu-setup").find(".refreshUserList").click();
            expect($("#adminUserSearch").find("input").val()).to.equal("");
            expect(Admin.getUserList.length).to.equal(0);

            KVStore.get = cachedFn;
        });
    });

    describe("admin functions", function() {
        it("admin.showSuport should work", function() {
            expect($("#monitor-setup").is(":visible")).to.be.false;
            Admin.showSupport();
            expect($("#monitor-setup").is(":visible")).to.be.true;
            expect($("#container").hasClass("supportOnly")).to.be.true;
            expect($("#configCard").hasClass("xc-hidden")).to.be.true;
            $("#container").removeClass("supportOnly");
            $("#configCard").removeClass("xc-hidden");
        });

        it("startNode should work", function(done) {
            var cached = XFTSupportTools.clusterStart;
            XFTSupportTools.clusterStart  = function() {
                return PromiseHelper.resolve({status: Status.Ok, logs: "already running"});
            };

            $("#configStartNode").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.StartNodes, {confirm: true});
            UnitTest.testFinish(function() {
                return $("#alertHeader .text").text() === "Warning";
            })
            .then(function() {
                UnitTest.hasAlertWithTitle("Warning");
                XFTSupportTools.clusterStart = cached;
                setTimeout(function() {
                    done();
                }, 100);
            });
        });

        it("startNode fail should work", function(done) {
            var cached = XFTSupportTools.clusterStart;
            XFTSupportTools.clusterStart  = function() {
                return PromiseHelper.reject({});
            };

            $("#configStartNode").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.StartNodes, {confirm: true});
            UnitTest.testFinish(function() {
                return $("#alertHeader .text").text() === MonitorTStr.StartNodeFailed;
            })
            .then(function() {
                UnitTest.hasAlertWithTitle(MonitorTStr.StartNodeFailed, {confirm: true});
                XFTSupportTools.clusterStart = cached;
                setTimeout(function() {
                    done();
                }, 100);
            });
        });

        it("stopNode should work", function(done) {
            var cached = XFTSupportTools.clusterStop;
            XFTSupportTools.clusterStop = function() {
                return PromiseHelper.reject({});
            };

            $("#configStopNode").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.StopNodes, {confirm: true});
            UnitTest.testFinish(function() {
                return $("#alertHeader .text").text() === MonitorTStr.StopNodeFailed;
            })
            .then(function() {
                UnitTest.hasAlertWithTitle(MonitorTStr.StopNodeFailed, {confirm: true});
                XFTSupportTools.clusterStop = cached;
                setTimeout(function() {
                    done();
                }, 100);
            });
        });

        it("restartNode should work", function(done) {
            var cached1 = XFTSupportTools.clusterStart;
            XFTSupportTools.clusterStart  = function() {
                return PromiseHelper.reject({});
            };
            var cached2 = XFTSupportTools.clusterStop;
            XFTSupportTools.clusterStop = function() {
                return PromiseHelper.resolve({});
            };

            $("#configRestartNode").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.RestartNodes, {confirm: true});
            UnitTest.testFinish(function() {
                return $("#alertHeader .text").text() === MonitorTStr.RestartFailed;
            })
            .then(function() {
                UnitTest.hasAlertWithTitle(MonitorTStr.RestartFailed, {confirm: true});
                XFTSupportTools.clusterStart = cached1;
                XFTSupportTools.clusterStop = cached2;
                setTimeout(function() {
                    done();
                }, 100);
            });
        });

        it("get status should work", function() {
            var cached = XFTSupportTools.clusterStatus;
            XFTSupportTools.clusterStatus = function() {
                return PromiseHelper.resolve({});
            };
            $("#configSupportStatus").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.ClusterStatus);
            XFTSupportTools.clusterStatus = cached;
        });

         it("get status fail should work", function() {
            var cached = XFTSupportTools.clusterStatus;
            XFTSupportTools.clusterStatus = function() {
                return PromiseHelper.reject({logs: "logs"});
            };

            $("#configSupportStatus").click();
            UnitTest.hasAlertWithTitle(MonitorTStr.ClusterStatus);
            XFTSupportTools.clusterStatus = cached;
        });
    });

    describe("disallowed functions", function() {
        var cached;
        before(function() {
            cached = Admin.isAdmin;
            Admin.isAdmin = function() {
                return false;
            };
        });

        it("get user list should be blank", function() {
            expect(Admin.getUserList().length).to.equal(0);
        });

        it("switch user should not be allowed", function() {
           Admin.switchUser();
           expect(xcSessionStorage.getItem("usingAs")).to.not.equal("true");
        });

        it("usertoadmin should not be allowed", function() {
            Admin.userToAdmin();
            expect(xcSessionStorage.getItem("usingAs")).to.not.equal("true");
        });

        it("admin.updateloggedinUsers should not be allowed", function() {
            var $loggedIn = $("#monitorMenu-setup .userLi.loggedIn");
            // expect($loggedIn.length).to.be.gt(0);
            $("#monitorMenu-setup .userLi.loggedIn").removeClass("loggedIn");
            Admin.updateLoggedInUsers();
            expect($("#monitorMenu-setup .userLi.loggedIn").length).to.equal(0);
            $loggedIn.addClass("loggedIn");
        });

        after(function() {
            Admin.isAdmin = cached;
        });
    });

    after(function() {
        xcLocalStorage.getItem = cachedGetItem;
        // xcLocalStorage = cachedStorage;
        gAdmin = false;
        $("#container").removeClass("admin posingAsUser");
    });
});