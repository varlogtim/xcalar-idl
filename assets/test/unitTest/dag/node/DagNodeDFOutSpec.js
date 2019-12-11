describe("DagNodeDFOut Test", function() {
    let node;
    let optimizedNode;

    before(function() {
        node = new DagNodeDFOut({});
        optimizedNode = new DagNodeDFOut({
            subType: DagNodeSubType.DFOutOptimized
        });

        optimizedNode.setParam({
            "name": "test",
            "linkAfterExecution": true,
            "columns": [{"sourceName": "source", "destName": "dest"}]
        });
    });

    it("should be the correct instance", function() {
        expect(node).to.be.an.instanceof(DagNodeDFOut);
    });

    it("should set param", function() {
        node.setParam({
            "name": "test",
            "linkAfterExecution": true,
            "columns": [{"sourceName": "source", "destName": "dest"}]
        });
        expect(node.getParam().name).to.equal("test");
    });

    it("lineageChange should work", function() {
        let col = new ProgCol({"backName": "test"});
        let res = node.lineageChange([col]);
        expect(res.columns.length).to.equal(1);
        expect(res.columns[0]).to.equal(col);
        expect(res.changes.length).to.equal(0);
    });

    it("lineageChange should work for optimized case", function() {
        let col1 = new ProgCol({"backName": "source"});
        let col2 = new ProgCol({"backName": "test"});
        let res = optimizedNode.lineageChange([col1, col2]);
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(2);
    });

    it("shouldLinkAfterExecution should work", function() {
        expect(node.shouldLinkAfterExecution()).to.be.true;
    });

    it("should set stored query dest", function() {
        node.setStoredQueryDest("test", "dest");
        expect(node.getStoredQueryDest("test")).to.equal("dest");
    });

    it("should delete stored query dest", function() {
        node.deleteStoredQuery("test");
        expect(node.getStoredQueryDest("test")).to.equal(undefined);
    });

    it("beRunningState should clear stored query", function() {
        node.setStoredQueryDest("test", "dest");
        node.beRunningState();
        expect(node.getStoredQueryDest("test")).to.equal(undefined);
    });

    it("getDisplayNodeType should work", function() {
        expect(node.getDisplayNodeType()).to.equal("Link Out");
        expect(optimizedNode.getDisplayNodeType()).to.equal("Link Out Optimized");
    });

    it("when link out node call updateStepThroughProgress(), it should update stats with table meta", async function(done) {
        // arrange
        const oldFunc = XIApi.getTableMeta;
        const node = new DagNodeDFOut({});
        node.setTable(xcHelper.randName("test"));
        const numRows = Math.floor(Math.random() * 1000) + 1;
        const size = Math.floor(Math.random() * 1000) + 1;
        XIApi.getTableMeta = () => {
            return Promise.resolve({
                metas: [{
                    numRows,
                    size
                }]
            });
        };

        try {
            // act
            await node.updateStepThroughProgress();
            const stats = node.getIndividualStats();
            // assert
            expect(stats.length).to.equal(1);
            expect(stats[0].type).to.equal(null);
            expect(stats[0].elapsedTime).to.equal(null);
            expect(stats[0].size).to.equal(size);
            expect(stats[0].rows).to.deep.equal([numRows]);
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.getTableMeta = oldFunc;
        }
    });
});