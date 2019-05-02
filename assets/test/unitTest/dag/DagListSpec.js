describe('DagList Test', function() {
    var oldPut;

    before(function(done) {
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });

    describe('Dag List Test', function() {
        var dagName;
        var dagTab;
        var getSelector = function(name) {
            return "#dagListSection .dagListDetail .name:contains(" + name + ")";
        };

        before(function() {
            dagName = xcHelper.randName("newAgg");
            dagTab = new DagTabUser({name: name});
        });

        it("should add a new Dag correctly", function() {
            var prevLen = DagList.Instance._dags.size;
            DagList.Instance.addDag(dagTab);
            expect(DagList.Instance._dags.size).to.equal(prevLen + 1);
        });


        it("should be able to rename a dag", function() {
            dagName = xcHelper.randName("ranamed");
            DagList.Instance.changeName(dagName, dagTab.getId());
            var selector = getSelector(dagName);
            expect($(selector).length).to.equal(1);
        });

        it("should tell us if we have a unique name", function() {
            var newName = xcHelper.randName("newDag2");
            expect(DagList.Instance.isUniqueName(newName)).to.be.true;
            dagName = newName;
            DagList.Instance.changeName(dagName, dagTab.getId());
            expect(DagList.Instance.isUniqueName(newName)).to.be.false;
        });

        it("should handle dag deletion", function(done) {
            var prevLen = DagList.Instance._dags.size;
            var selector = getSelector(dagName);
            var $dataflow = $(selector).closest(".dagListDetail");
            DagList.Instance.deleteDataflow($dataflow)
            .then(() => {
                expect(DagList.Instance._dags.size).to.equal(prevLen - 1);
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should serialize", function() {
            let dags = ["test"];
            let res = DagList.Instance.serialize(dags);
            let parsed = JSON.parse(res);
            expect(parsed.version).to.equal(Durable.Version);
            expect(parsed.dags[0]).to.equal("test");
        });
    });

    after(function() {
        XcalarKeyPut = oldPut;
        UnitTest.offMinMode();
    });
});
