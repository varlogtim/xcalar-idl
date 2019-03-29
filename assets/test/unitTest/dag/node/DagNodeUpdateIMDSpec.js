describe("Update IMD Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeUpdateIMD({});
    });

    it("should be an update IMD node", () => {
        expect(node.getType()).to.equal(DagNodeType.UpdateIMD);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            pubTableName: "",
            operator: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            pubTableName: "pubtable",
            operator: "1"
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("should have an error with an empty pubtable name", () => {
        const testParam = {
            pubTableName: "",
            operator: "1"
        };
        node.setParam(testParam);
        expect(node.validateParam().error).to.equal("pubTableName should NOT be shorter than 1 characters");
    });

    it('_genParamHint() should work', () => {
        node.setParam({
            pubTableName: "pubtable",
            operator: "1"
        });
        expect(node._genParamHint()).to.equal('Update: pubtable');
    });
});