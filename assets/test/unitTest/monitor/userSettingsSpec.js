describe("User Setting Test", function() {
    describe("Baisc User Setting API Test", function() {
        it("UserSettings.getAllPrefs should work", function() {
            var res = UserSettings.getAllPrefs();
            expect(res).to.be.instanceof(UserPref);
        });

        it("UserSettings.getPref should work", function() {
            var res = UserSettings.getPref("activeMainTab");
            expect(res).not.to.be.null;
        });

        it("UserSettings.setPref should work", function() {
            var oldCache = UserSettings.getPref("activeMainTab");
            UserSettings.setPref("activeMainTab", "test");
            var res = UserSettings.getPref("activeMainTab");
            expect(res).to.equal("test");
            // change back
            UserSettings.setPref("activeMainTab", oldCache);

            // case 2
            oldCache = UserSettings.getPref("general");
            UserSettings.setPref("key", "test2", true);
            res = UserSettings.getPref("general");
            expect(res).to.have.property("key").and.to.equal("test2");
            UserSettings.setPref("general", oldCache);
        });

        it("UserSettings.logDSChange should work", function() {
            var oldFunc = KVStore.logChange;
            var test = false;
            KVStore.logChange = function() {
                test = true;
            };
            UserSettings.logDSChange();
            expect(test).to.be.true;

            KVStore.logChange = oldFunc;
        });
    });

    describe("UserSettings Commit Test", function() {
        var oldLogChange;
        var oldPut;
        var oldShowSuccess;
        var testKey;
        var successMsg;

        before(function() {
            oldLogChange = KVStore.logChange;
            oldPut = KVStore.put;
            oldShowSuccess = xcHelper.showSuccess;

            KVStore.logChange = function() {
                return;
            };

            KVStore.put = function(key) {
                testKey = key;
                return PromiseHelper.resolve();
            };

            xcHelper.showSuccess = function(input) {
                successMsg = input;
            };
        });

        beforeEach(function() {
            testKey = null;
            successMsg = null;
        });

        it("should commit change", function(done) {
            UserSettings.logDSChange();

            UserSettings.commit(true)
            .then(function() {
                expect(testKey).to.equal(KVStore.gUserKey);
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should not commit again if no change", function(done) {
            UserSettings.commit(true)
            .then(function() {
                expect(testKey).to.be.null;
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("should handle fail case", function(done) {
            UserSettings.logDSChange();

            var oldFunc = KVStore.put;
            var oldFail = xcHelper.showFail;
            var test = null;

            KVStore.put = function() {
                return PromiseHelper.reject("test");
            };

            xcHelper.showFail = function(input) {
                test = input;
            };

            UserSettings.commit(true)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(test).to.equal(FailTStr.SaveSettings);
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.put = oldFunc;
                xcHelper.showFail = oldFail;
            });
        });

        it("should commit in XcSupport case", function(done) {
            UserSettings.logDSChange();

            var oldCache = gXcSupport;
            gXcSupport = true;
            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.gSettingsKey);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                gXcSupport = oldCache;
            });
        });

        it("should commit admin settings", function(done) {
            UserSettings.logDSChange();

            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = function() {
                return true;
            };

            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.gSettingsKey);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        after(function() {
            KVStore.logChange = oldLogChange;
            KVStore.put = oldPut;
            xcHelper.showSuccess = oldShowSuccess;
        });
    });

    describe("UserSettings UI Test", function() {
        it("should toggle showDataColBox", function() {
            var hideDataCol = UserSettings.getPref("hideDataCol");
            var $btn = $("#showDataColBox");
            // case 1
            $btn.click();
            expect(UserSettings.getPref("hideDataCol")).to.equal(!hideDataCol);
            // case 2
            $btn.click();
            expect(UserSettings.getPref("hideDataCol")).to.equal(hideDataCol);
        });

        it("should toggle skip splash box", function() {
            var skipSplash = UserSettings.getPref("skipSplash");
            var $btn = $("#skipSplashBox");
            // case 1
            $btn.click();
            expect(UserSettings.getPref("skipSplash")).to.equal(!skipSplash);
            // case 2
            $btn.click();
            expect(UserSettings.getPref("skipSplash")).to.equal(skipSplash);
        });

        it("should change ds sample size", function() {
            var oldSize = UserSettings.getPref("DsDefaultSampleSize");
            var $input = $("#monitorDsSampleInput .size");
            var oldVal = $input.val();
            var newVal = Number(oldVal) ? 0 : 1;
            $input.focus().val(newVal).change();
            expect(UserSettings.getPref("DsDefaultSampleSize"))
            .not.to.equal(oldSize);
            // change back
            $input.focus().val(oldVal).change();

            expect(UserSettings.getPref("DsDefaultSampleSize"))
            .to.equal(oldSize);
        });
    });
});