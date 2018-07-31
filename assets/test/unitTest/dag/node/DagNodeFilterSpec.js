describe("Filter Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeFilter({});
    });

    it("should be an filter node", () => {
        expect(node.getType()).to.equal(DagNodeType.Filter);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            evalString: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {evalString: "eq(column, 1)"};
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});