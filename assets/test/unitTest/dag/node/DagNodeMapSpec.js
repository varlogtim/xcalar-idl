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
            eval: [{evalString: "", newField: ""}],
            icv: false
        });
    });

    it("should set parameter", () => {
        const testParam = {
            eval: [
                {evalString: "add(col1, 1)", newField: "co1_add"},
                {evalString: "abs(col2)", newField: "co1_abs"}
            ],
            icv: true
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});