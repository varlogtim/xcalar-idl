describe("Set Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeSet({});
    });

    it("should be a set node", () => {
        expect(node.getType()).to.equal(DagNodeType.Set);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: [],
            dedup: false
        });
    });

    it("should set parameter", () => {
        const testParam = {
            columns: [
                {sourceColumn: "co1", destColumn: "union1", columnType: "string"},
                {sourceColumn: "co1", destColumn: "union1", columnType: "string"},
            ],
            dedup: true
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});