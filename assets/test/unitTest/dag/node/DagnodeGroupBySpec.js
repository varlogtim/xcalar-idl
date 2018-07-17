describe("GroupBy Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeGroupBy({});
    });

    it("should be an group by node", () => {
        expect(node.getType()).to.equal(DagNodeType.GroupBy);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            keys: [""],
            eval: [{evalString: "", newField: ""}],
            includeSample: false
        });
    });

    it("should set parameter", () => {
        const testParam = {
            keys: ["groupOnCol"],
            eval: [{evalString: "count(aggCol)", newField: "count_agg"}],
            includeSample: true
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});