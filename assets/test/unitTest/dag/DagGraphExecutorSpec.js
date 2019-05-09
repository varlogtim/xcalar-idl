describe("Dag Graph Executor Test", () => {
    before((done) => {
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(() => {
            done();
        });
    });

    it("restore execution should work", (done) => {
        let tab = new DagTabUser();
        let graph = new DagGraph();
        graph.setTabId(tab.getId());
        let cache1 = XcalarQueryState;
        // let cache2 = XcalarQueryCheck;
        let cache3 = DagViewManager.Instance.updateDFProgress;
        called1 = false;
        // called2 = false;
        called3 = false;
        let txId;

        XcalarQueryState = () => {
            called1 = true;
            return PromiseHelper.resolve({
                numCompletedWorkItem: 0,
                elapsed: {milliseconds: 5},
                queryState: QueryStateT.qrFinished,
                queryGraph: {node: [{
                tag: "nodeId1,nodeId2"
            }]}})
        };

        DagViewManager.Instance.updateDFProgress = (tabId, queryStateOutput) => {
            expect(tabId).to.equal(tab.getId());
            expect(queryStateOutput).to.deep.equal({
                "numCompletedWorkItem": 0,
                "elapsed": {
                  "milliseconds": 5
                },
                "queryState": 2,
                "queryGraph": {
                  "node": [
                    {
                      "tag": "nodeId1,nodeId2"
                    }
                  ]
                }
              });
            let txInfo = Transaction.__testOnly__.getAll();
            expect(txInfo.txIdCount).to.be.gt(0);
            let txLog = Transaction.get(txInfo.txIdCount - 1);
            expect(txLog.nodeIds).to.deep.equal(["nodeId1", "nodeId2"]);
            expect(txLog.tabId).to.equal(tab.getId());
            called3 = true;
        };

        const executor = new DagGraphExecutor([], graph, {isRestoredExecution: true});
        executor.restoreExecution("myQuery");
        expect(called1).to.be.true;
        // expect(called2).to.be.true;
        UnitTest.testFinish(() => called3)
        .always(() => {
            expect(called3).to.be.true;
            XcalarQueryState = cache1;
            // XcalarQueryCheck = cache2;
            DagViewManager.Instance.updateDFProgress = cache3;
            done();
        });
    });
});