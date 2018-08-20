// Tests for dagList.

describe('DagList Test', function() {

    var dagList;

    before(function(done) {
        UnitTest.onMinMode();
        if (!gDionysus) {
            dagList = DagList.Instance;
            dagList.setup()
            .then(() => {
                if (DagTabManager.Instance._unique_id == null) {
                    DagTabManager.Instance.setup();
                }
                done();
            });
        }
    });

    describe('Dag List Test', function() {
        it("should add a new Dag correctly", function() {
            var prevLen = $("#dagListSection .dagListDetail").length;
            dagList.addDag("newDag", "KeyUsedForTestingDagLists-1");
            expect($("#dagListSection .dagListDetail").length).to.equal(prevLen + 1);
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("newDag");
        });

        it("should handle dag deletion", function() {
            var prevLen = $("#dagListSection .dagListDetail").length;
            dagList.addDag("newDag2", "KeyUsedForTestingDagLists-2");
            dagList.deleteDataflow($("#dagListSection .dagListDetail").last())
            .then(() => {
                expect($("#dagListSection .dagListDetail").length).to.equal(prevLen);
            });
        });

        it("should be able to rename a dag", function() {
            dagList.addDag("newDag3", "KeyUsedForTestingDagLists-3");
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("newDag3");
            dagList.changeName("renamed", "KeyUsedForTestingDagLists-3");
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("renamed");
        });

        it("should tell us if we have a unique name", function() {
            expect(dagList.isUniqueName("newDag4")).to.be.true;
            dagList.addDag("newDag4", "KeyUsedForTestingDagLists-4");
            expect(dagList.isUniqueName("newDag4")).to.be.false;
        })
    });

    after(function() {
        DagList.Instance.reset();
    });
});
