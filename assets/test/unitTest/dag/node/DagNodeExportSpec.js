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
            exportName: "",
            targetName: "",
            columns: [{sourceColumn: "", destColumn: ""}],
            keepOrder: false,
            options: {
                splitType: null,
                headerType: null,
                format: null,
                createRule: null,
                handleName: "",
                csvArgs: {fieldDelim: "", recordDelim: ""}
            }
        });
    });

    it("should set parameter", () => {
        const testParam = {
            exportName: "export",
            targetName: "target",
            columns: [{sourceColumn: "a", destColumn: "a_rename"}],
            keepOrder: true,
            options: {
                splitType: 1,
                headerType: 1,
                handleName: "test",
                csvArgs: {fieldDelim: ",", recordDelim: "\n"}
            }
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});