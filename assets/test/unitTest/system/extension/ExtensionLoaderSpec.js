describe("ExtensionLoader Test", function() {
    it("should be the correctg instance", function() {
        let loader = new ExtensionLoader("test");
        expect(loader).to.be.an.instanceof(ExtensionLoader);
    });

    it("should register event", function() {
        let loader = new ExtensionLoader("test");
        let called = false;
        loader.on("test", function() {
            called = true;
        });

        loader._event.dispatchEvent("test");
        expect(called).to.be.true;
    });

    describe("ExtensionLoader Request Test", function() {
        let oldAjax;

        before(function() {
            oldAjax = HTTPService.Instance.ajax;
        });

        it("should handle request", function(done) {
            let loader = new ExtensionLoader("test");
            HTTPService.Instance.ajax = () => PromiseHelper.resolve({}, "test")
            
            loader.request()
            .then(function(...args) {
                expect(args[1]).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject error request", function(done) {
            let loader = new ExtensionLoader("test");
            HTTPService.Instance.ajax = () => PromiseHelper.resolve({
                status: Status.Error,
                error: "test"
            })
            
            loader.request()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        it("should handle invalid response case", function(done) {
            let loader = new ExtensionLoader("test");
            HTTPService.Instance.ajax = () => PromiseHelper.resolve(null, "test");
            
            loader.request()
            .then(function(...args) {
                expect(args[1]).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle reject case", function(done) {
            let loader = new ExtensionLoader("test");
            let testError = {"error": "test"};
            HTTPService.Instance.ajax = () => PromiseHelper.reject(testError);
            
            loader.request()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(JSON.stringify(testError));
                done();
            });
        });

        after(function() {
            HTTPService.Instance.ajax = oldAjax;
        });
    });

    it("getEnabledList should work", function(done) {
        let loader = new ExtensionLoader("test");
        loader.request = () => PromiseHelper.resolve({
            status: Status.Ok,
            data: "test"
        });

        loader.getEnabledList()
        .then(function(res) {
            expect(res).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("getEnabledList should use cached result", function(done) {
        let loader = new ExtensionLoader("test");
        loader.request = () => PromiseHelper.resolve({
            status: Status.Ok,
            data: "test"
        });
        loader._enabledHTMLStr = "test2"

        loader.getEnabledList()
        .then(function(res) {
            expect(res).to.equal("test2");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("getEnabledList should handle error parse case", function(done) {
        let loader = new ExtensionLoader("test");
        loader.request = () => PromiseHelper.resolve({
            status: Status.Error,
            data: "test"
        });

        loader.getEnabledList()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal(undefined);
            done();
        });
    });

    it("getEnabledList should handle fail case", function(done) {
        let loader = new ExtensionLoader();
        loader.request = () => PromiseHelper.reject("test");

        loader.getEnabledList()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("test");
            done();
        });
    });

    it("isExtensionEnabled should work", function() {
        let loader = new ExtensionLoader("test");
        expect(loader.isExtensionEnabled("test")).to.be.false;

        loader._enabledHTMLStr = "test.ext.js";
        expect(loader.isExtensionEnabled("test")).to.be.true;
    });

    it("install should work", function(done) {
        let loader = new ExtensionLoader("test");
        let called = 0;
        loader.getEnabledList = () => {
            called++;
            return PromiseHelper.resolve("test");
        };
        loader._loadExtensions = () => {
            called++;
            return PromiseHelper.resolve();
        };

        loader.install()
        .then(function() {
            expect(called).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("install should still resolve in fail case", function(done) {
        let loader = new ExtensionLoader("test");
        let called = 0;
        loader.getEnabledList = () => {
            called++;
            return PromiseHelper.reject();
        };
        loader._loadExtensions = () => {
            called++;
            return PromiseHelper.resolve();
        };

        loader.install()
        .then(function() {
            expect(called).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("refresh should work", function(done) {
        let loader = new ExtensionLoader("test");
        let called = 0;
        loader._getEnabledExtList = () => {
            called++;
            return PromiseHelper.resolve();
        };
        loader.install = () => {
            called++;
            return PromiseHelper.resolve();
        };

        loader.refresh()
        .then(function() {
            expect(called).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
});