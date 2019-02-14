describe("DagLineage Test", () => {
    it("should create an instanceof DagLineage", () => {
        let lineage = new DagLineage(null);
        expect(lineage).to.be.instanceof(DagLineage);
    });

    it("should set columns", () => {
        let lineage = new DagLineage(null);
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        lineage.setColumns([progCol]);
        let columns = lineage.getColumns(false);
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal(progCol);
    });

    it("should reset columns", () => {
        let node = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        node.setSchema([]);
        let lineage = new DagLineage(node);
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        lineage.setColumns([progCol]);
        // reset
        lineage.reset();
        let columns = lineage.getColumns(false);
        expect(columns.length).to.equal(0);
    });

    it("should get prefix columns", () => {
        let lineage = new DagLineage(null);
        let progCol1 = ColManager.newPullCol("test", "a::test", ColumnType.integer);
        let progCol2 = ColManager.newPullCol("test2", "test2", ColumnType.integer);
        lineage.setColumns([progCol1, progCol2]);
        let columns = lineage.getPrefixColumns();
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal("a::test");
    });

    it("should get derived columns", () => {
        let lineage = new DagLineage(null);
        let progCol1 = ColManager.newPullCol("test", "a::test", ColumnType.integer);
        let progCol2 = ColManager.newPullCol("test2", "test2", ColumnType.integer);
        lineage.setColumns([progCol1, progCol2]);
        let columns = lineage.getDerivedColumns();
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal("test2");
    });


    it("should get column from lineage", () => {
        let node = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        node.setSchema([{name: "test", type: ColumnType.integer}]);
        let lineage = new DagLineage(node);
        let columns = lineage.getColumns();
        expect(columns.length).to.equal(1);
        let progCol = columns[0];
        expect(progCol.getBackColName()).to.equal("test");
        expect(progCol.getType()).to.equal(ColumnType.integer);
    });

    it("should get changes", () => {
        let parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([]);
        let node = DagNodeFactory.create({
            type: DagNodeType.Map
        });
        node.connectToParent(parentNode);
        node.setParam({
            eval: [{
                evalString: "add(1, 1)",
                newField: "test"
            }],
            icv: false
        })
        let lineage = new DagLineage(node);
        let changes = lineage.getChanges();
        expect(changes.length).to.equal(1);
    });

    it("should get column history", () => {
        let parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([]);
        let node = DagNodeFactory.create({
            type: DagNodeType.Map
        });
        node.connectToParent(parentNode);
        node.setParam({
            eval: [{
                evalString: "add(1, 1)",
                newField: "test"
            }],
            icv: false
        })
        let lineage = new DagLineage(node);
        let history = lineage.getColumnHistory("test");
        expect(history.length).to.equal(1);
        expect(history[0].type).to.equal("add");
        expect(history[0].colName).to.equal("test");
        expect(history[0].childId).to.equal(null);
        expect(history[0].change).to.equal(null);
        expect(history[0].id).to.equal(node.getId());

    });
});