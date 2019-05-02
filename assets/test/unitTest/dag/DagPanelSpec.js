describe("DagPanel Test", function() {
    before(function(done) {
        // wait the initialize setup finish first
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });

    it("hasSetup should work", function() {
        DagPanel.__testOnly__.setSetup(false);
        expect(DagPanel.hasSetup()).to.be.false
    });

    it("should alert error setup", function(done) {
        let oldFunc = DagAggManager.Instance.setup;
        let oldAlert = Alert.show;
        let called = false;
        DagAggManager.Instance.setup = () => PromiseHelper.reject("test");
        Alert.show = () => { called = true; };
        
        DagPanel.__testOnly__.setSetup(false);
        DagPanel.setup()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(called).to.be.true;
            expect(error).to.equal("test");
            expect(DagPanel.hasSetup()).to.be.true;
            done();
        })
        .always(function() {
            Alert.show = oldAlert;
            DagAggManager.Instance.setup = oldFunc;
        });
    });

    it("should setup", function(done) {
        DagPanel.__testOnly__.setSetup(false);
        DagPanel.setup()
        .then(function() {
            expect(DagPanel.hasSetup()).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        DagPanel.__testOnly__.setSetup(true);
    });
});