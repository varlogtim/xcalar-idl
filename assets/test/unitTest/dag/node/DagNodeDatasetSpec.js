describe("Dataset Dag Node Test", () => {
    it("should be a dataset node", () => {
        let node = new DagNodeDataset({});
        expect(node.getType()).to.equal(DagNodeType.Dataset);
    });

    it("should get parameter", () => {
        let node = new DagNodeDataset({});
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            prefix: "",
            synthesize: false,
            loadArgs: ""
        });
    });

    it("should set parameter", () => {
        let node = new DagNodeDataset({});
        const testParam = {
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});