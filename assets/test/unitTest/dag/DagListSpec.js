// Tests for dagList.

describe('DagList Test', function() {


    before(function(done) {
        UnitTest.onMinMode();
        if (!gDionysus) {
            DagList.Instance.setup()
            .then(() => {
                if (DagTabManager.Instance._unique_id == null) {
                    DagTabManager.Instance.setup();
                }
            });
        }
        UnitTest.testFinish(function() {
            return $("#dagTabSectionTabs .dagTab").length !== 0;
        })
        .then(function() {
            done();
        })
        .fail( function(){
            done("fail");
        });
    });

    describe('Dag List Test', function() {
        it("should add a new Dag correctly", function() {
            var prevLen = $("#dagListSection .dagListDetail").length;
            DagList.Instance.addDag("newDag", "KeyUsedForTestingDagLists-1");
            expect($("#dagListSection .dagListDetail").length).to.equal(prevLen + 1);
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("newDag");
        });

        it("should handle dag deletion", function() {
            var prevLen = $("#dagListSection .dagListDetail").length;
            DagList.Instance.addDag("newDag2", "KeyUsedForTestingDagLists-2");
            DagList.Instance.deleteDataflow($("#dagListSection .dagListDetail").last())
            .then(() => {
                expect($("#dagListSection .dagListDetail").length).to.equal(prevLen);
            });
        });

        it("should be able to rename a dag", function() {
            DagList.Instance.addDag("newDag3", "KeyUsedForTestingDagLists-3");
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("newDag3");
            DagList.Instance.changeName("renamed", "KeyUsedForTestingDagLists-3");
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("renamed");
        });

        it("should tell us if we have a unique name", function() {
            var dagList = DagList.Instance;
            expect(dagList.isUniqueName("newDag4")).to.be.true;
            dagList.addDag("newDag4", "KeyUsedForTestingDagLists-4");
            expect(dagList.isUniqueName("newDag4")).to.be.false;
        })

        it("should download a dataflow", function() {
            var downloadCache = xcHelper.downloadAsFile;
            var graphCache = DagTabManager.Instance.getGraphByIndex;
            var called = false;
            xcHelper.downloadAsFile = (graph, file, bool) => {
                called = true
            }
            DagTabManager.Instance.getGraphByIndex = (index) => {
                return new DagGraph();
            }
            $("#dagListSection .dagListDetail .downloadDataflow").click();
            xcHelper.downloadAsFile = downloadCache;
            DagTabManager.Instance.getGraphByIndex = graphCache;
            expect(called).to.be.true;
        });

        it("should be able to upload a valid dataflow", function() {
            var prevLen = $("#dagListSection .dagListDetail").length;
            var graph = new DagGraph();
            DagList.Instance.uploadDag("newDagUpload", graph);
            expect($("#dagListSection .dagListDetail").length).to.equal(prevLen + 1);
            expect($("#dagListSection .dagListDetail").last().text()).to.equal("newDagUpload");
        });
    });

    after(function() {
        DagList.Instance.reset();
    });
});
