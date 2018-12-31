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
            left: {
                columns: [""],
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            right: {
                columns: [""],
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            evalString: "",
            keepAllColumns: true,

        });
    });

    it("should set parameter", () => {
        const testParam = {
            joinType: "innerJoin",
            left: {
                columns: [""],
                keepColumns: [],
                rename: [{sourceColumn: "col", destColumn: "col_rename", prefix: false}]
            },
            right: {
                columns: [""],
                keepColumns: [],
                rename: [{sourceColumn: "col2", destColumn: "col_rename2", prefix: false}]
            },
            evalString: "",
            keepAllColumns: true
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});