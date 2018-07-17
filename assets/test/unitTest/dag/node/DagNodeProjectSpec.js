describe("Project Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeProject({});
    });

    it("should be a project node", () => {
        expect(node.getType()).to.equal(DagNodeType.Project);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: [""]
        });
    });

    it("should set parameter", () => {
        const testParam = {
            columns: ["column1", "prefix:noExistColToProjectPrefix"]
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});