describe("Aggregate Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeAggregate({});
    });

    it("should be an aggregate node", () => {
        expect(node.getType()).to.equal(DagNodeType.Aggregate);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            evalString: "",
            dest: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {evalString: "count(column)", dest: "constantName"};
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});