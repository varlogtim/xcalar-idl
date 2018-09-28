describe("Export Dag Node Test", () => {
    let node;
    
    before(() => {
        node = new DagNodeExport({});
    });

    it("should be an export node", () => {
        expect(node.getType()).to.equal(DagNodeType.Export);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: [],
            driver: "",
            driverArgs: null
        });
    });

    it("should set parameter", () => {
        const testParam = {
            columns: ["category", "column2"],
            driver: "",
            driverArgs: [{name: "arg",
                type: "string",
                optional: false,
                value: "cool"}]
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});