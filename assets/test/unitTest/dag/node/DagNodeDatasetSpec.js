describe("Dataset Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeDataset({});
        node.getSourceColumns = function() {
            return PromiseHelper.resolve([]);
        };
    });

    it("should be a dataset node", () => {
        expect(node.getType()).to.equal(DagNodeType.Dataset);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            prefix: ""
        });
    });

    it("should set parameter", (done) => {

        const testParam = {source: "dataset1", prefix: "test"};
        node.setParam(testParam)
        .always(function() {
            const param = node.getParam();
            expect(param).not.to.equal(testParam);
            expect(param).to.deep.equal(testParam);
            done();
        });
    });
});