describe("Dataset Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeDataset({});
    });

    it("should be a dataset node", () => {
        expect(node.getType()).to.equal(DagNodeType.Dataset);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            prefix: "",
            synthesize: false,
            loadArgs: ""
        });
    });

    it("should set parameter", () => {

        const testParam = {
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: ""
        };
        node.setParam(testParam)
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});