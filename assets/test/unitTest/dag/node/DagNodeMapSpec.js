describe("Map Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeMap({});
    });

    it("should be a map node", () => {
        expect(node.getType()).to.equal(DagNodeType.Map);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            eval: [{evalString: "", newFieldName: ""}]
        });
    });

    it("should set parameter", () => {
        const testParam = {
            eval: [
                {evalString: "add(col1, 1)", newFieldName: "co1_add"},
                {evalString: "abs(col2)", newFieldName: "co1_abs"}
            ]
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});