describe("Dag Execute Test", () => {
    const txId = 1;
    let createNode = (type, tableName) => {
        return DagNodeFactory.create({
            type: type || DagNodeType.Dataset,
            table: tableName || "testTable"
        });
    };

    it("should be a class", () => {
        const node = new DagNode();
        const executor = new DagExecute(node, txId);
        expect(executor).to.be.an.instanceof(DagExecute)
    });

    it("should aggregate", (done) => {
        const node = createNode(DagNodeType.Aggregate);
        const parentNode = createNode();
        node.setParam({evalString: "count(col)", dest: "testConstant"});
        node.connectToParent(parentNode);

        const executor = new DagExecute(node, txId);
        const oldAggregate = XIApi.aggregateWithEvalStr;

        XIApi.aggregateWithEvalStr = (txId, evalStr, tableName, dstAggName) => {
            expect(txId).to.equal(1);
            expect(evalStr).to.equal("count(col)");
            expect(tableName).to.equal("testTable");
            expect(dstAggName).to.equal("testConstant");
            return PromiseHelper.resolve(100);
        };

        executor.run()
        .then(() => {
            expect(node.getAggVal()).to.equal(100);
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.aggregateWithEvalStr = oldAggregate;
        });
    });

    it("should load", (done) => {
        const node = createNode(DagNodeType.Dataset);
        node.setParam({source: "test", prefix: "prefix"});
        const executor = new DagExecute(node, txId);
        const oldIndex = XIApi.indexFromDataset;

        XIApi.indexFromDataset = (txId, dsName, newTableName, prefix) => {
            expect(txId).to.equal(1);
            expect(dsName).to.equal("test");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(prefix).to.equal("prefix");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.indexFromDataset = oldIndex;
        });
    });

    it("should filter", (done) => {
        const node = createNode(DagNodeType.Filter);
        const parentNode = createNode();
        node.setParam({evalString: "eq(col, 1)"});
        node.connectToParent(parentNode);

        const executor = new DagExecute(node, txId);
        const oldFilter = XIApi.filter;

        XIApi.filter = (txId, fltStr, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(fltStr).to.equal("eq(col, 1)");
            expect(tableName).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.filter = oldFilter;
        });
    });

    it("should map", (done) => {
        const node = createNode(DagNodeType.Map);
        const parentNode = createNode();
        node.setParam({eval: [{evalString: "add(col, 1)", newField: "newCol"}]});
        node.connectToParent(parentNode);

        const executor = new DagExecute(node, txId);
        const oldMap = XIApi.map;

        XIApi.map = (txId, mapStrs, tableName, newColNames, newTableName, icvMode) => {
            expect(txId).to.equal(1);
            expect(mapStrs.length).to.equal(1);
            expect(mapStrs[0]).to.equal("add(col, 1)");
            expect(tableName).to.equal("testTable");
            expect(newColNames.length).to.equal(1);
            expect(newColNames[0]).to.equal("newCol");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.map = oldMap;
        });
    });
});