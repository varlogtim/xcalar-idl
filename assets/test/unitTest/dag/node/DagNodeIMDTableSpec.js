describe("Dataset Dag Node Imd Table Test", () => {
    let node;

    before(() => {
        node = new DagNodeIMDTable({});
    });

    it("should be an imd table node", () => {
        expect(node.getType()).to.equal(DagNodeType.IMDTable);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            version: -1,
            schema: [],
            filterString: "",
            limitedRows: null,
        });
    });

    it("should set parameter", () => {

        const testParam = {
            source: "imdsource",
            version: 5,
            schema: [{
                "name": "ANIMAL",
                "type": "string"
            }],
            filterString: "map()",
            limitedRows: 100,
        };
        node.setParam(testParam)
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("getSource should work", () => {
        const testParam = {
            source: "imdsource",
            version: 5,
            schema: [{
                "name": "ANIMAL",
                "type": "string"
            }],
            filterString: "map()",
            limitedRows: 100,
        };
        node.setParam(testParam)
        expect(node.getSource()).to.equal(testParam.source);
    });
});