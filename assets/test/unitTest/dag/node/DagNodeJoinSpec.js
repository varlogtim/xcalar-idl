describe("Join Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeJoin({});
    });

    it("should be a join node", () => {
        expect(node.getType()).to.equal(DagNodeType.Join);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            joinType: "innerJoin",
            columns: [[{sourceColumn: "", destColumn: "", columnType: ""}]],
            evalString: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            joinType: "innerJoin",
            columns: [[{sourceColumn: "col", destColumn: "col_rename", columnType: "string"}]],
            evalString: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});