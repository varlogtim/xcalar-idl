describe("Project Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeProject({});
    });

    it("should be a project node", () => {
        expect(node.getType()).to.equal(DagNodeType.Project);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: []
        });
    });

    it("should set parameter", () => {
        const testParam = {
            columns: ["column1", "prefix:noExistColToProjectPrefix"]
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should work", () => {
        const columns = genProgCols('prefix::col', 3).concat(genProgCols('col', 3));
        node.setParam({
            columns: ['prefix::col#1', 'col#1']
        });
        
        const result = node.lineageChange(columns);
        expect(result.columns.length).to.equal(4);
        expect(result.changes.length).to.equal(2);
    });

    function genProgCols(colPrefix, count) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});