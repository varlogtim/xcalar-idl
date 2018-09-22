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
        const executor = new DagNodeExecutor(node, txId);
        expect(executor).to.be.an.instanceof(DagNodeExecutor)
    });

    it("should load dataset", (done) => {
        const node = createNode(DagNodeType.Dataset);
        node.setParam({source: "test", prefix: "prefix"});
        const executor = new DagNodeExecutor(node, txId);
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

    it("should aggregate", (done) => {
        const node = createNode(DagNodeType.Aggregate);
        const parentNode = createNode();
        node.setParam({evalString: "count(col)", dest: "testConstant"});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
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

    it("should filter", (done) => {
        const node = createNode(DagNodeType.Filter);
        const parentNode = createNode();
        node.setParam({evalString: "eq(col, 1)"});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
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

    it("should group by", (done) => {
        const node = createNode(DagNodeType.GroupBy);
        const parentNode = createNode();
        node.setParam({
            groupBy: ["groupCol"],
            aggregate: [{
                operator: "count",
                sourceColumn: "aggCol",
                destColumn: "count_aggCol",
                distinct: true
            }],
            icv: false,
            groupAll: false,
            includeSample: false
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGroupBy = XIApi.groupBy;

        XIApi.groupBy = (txId, aggArgs, groupByCols, tableName, options) => {
            expect(txId).to.equal(1);
            expect(aggArgs.length).to.equal(1);
            expect(aggArgs[0]).to.deep.equal({
                operator: "count",
                aggColName: "aggCol",
                newColName: "count_aggCol",
                isDistinct: true
            });
            expect(groupByCols.length).to.equal(1);
            expect(groupByCols[0]).to.equal("groupCol");
            expect(tableName).to.equal("testTable");
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.isIncSample).to.be.false;
            expect(options.icvMode).to.be.false;
            expect(options.groupAll).to.be.false;
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
            XIApi.groupBy = oldGroupBy;
        });
    });

    it("should join", (done) => {
        const node = createNode(DagNodeType.Join);
        const lparentNode = createNode(null, "left");
        const rParentNode = createNode(null, "right");
        node.setParam({
            joinType: "innerJoin",
            left: {
                columns: ["lCol"],
                casts: ["string"],
                rename: [{sourceColumn: "lCol2", destColumn: "joinCol", prefix: false}]
            },
            right: {
                columns: ["rCol"],
                casts: [null],
                rename: [{sourceColumn: "rCol2", destColumn: "joinCol2", prefix: true}]
            },
            evalString: ""
        });
        node.connectToParent(lparentNode, 0);
        node.connectToParent(rParentNode, 1);

        const executor = new DagNodeExecutor(node, txId);
        const oldJoin = XIApi.join;

        XIApi.join = (txId, joinType, lTableInfo, rTableInfo, options) => {
            expect(txId).to.equal(1);
            expect(joinType).to.equal(JoinOperatorT.InnerJoin);
            expect(lTableInfo).to.deep.equal({
                tableName: "left",
                columns: ["lCol"],
                casts: ["string"],
                rename: [{
                    "orig": "lCol2",
                    "new": "joinCol",
                    "type": DfFieldTypeT.DfUnknown
                }],
                allImmediates: []
            });
            expect(rTableInfo).to.deep.equal({
                tableName: "right",
                columns: ["rCol"],
                casts: [null],
                rename: [{
                    "orig": "rCol2",
                    "new": "joinCol2",
                    "type": DfFieldTypeT.DfFatptr
                }],
                allImmediates: []
            });
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.evalString).to.equal("");
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
            XIApi.join = oldJoin;
        });
    });

    it("should map", (done) => {
        const node = createNode(DagNodeType.Map);
        const parentNode = createNode();
        node.setParam({eval: [{evalString: "add(col, 1)", newField: "newCol"}]});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
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

    it("should project", (done) => {
        const node = createNode(DagNodeType.Project);
        const parentNode = createNode();
        node.setParam({columns: ["col", "prefix"]});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldProject = XIApi.project;

        XIApi.project = (txId, columns, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(columns).to.deep.equal(["col", "prefix"]);
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
            XIApi.project = oldProject;
        });
    });

    it("should do set operation", (done) => {
        const node = createNode(DagNodeType.Set);
        const parentNode1 = createNode(null, "parent1");
        const ParentNode2 = createNode(null, "parent2");
        node.setParam({
            unionType: UnionType.Union,
            columns: [
                [{
                    sourceColumn: "col1",
                    destColumn: "destCol",
                    columnType: ColumnType.string,
                    cast: false
                }],
                [{
                    sourceColumn: "col2",
                    destColumn: "destCol",
                    columnType: ColumnType.string,
                    cast: true
                }]
            ],
            dedup: true
        });
        node.connectToParent(parentNode1, 0);
        node.connectToParent(ParentNode2, 1);

        const executor = new DagNodeExecutor(node, txId);
        const oldSet = XIApi.union;

        XIApi.union = (txId, tableInfos, dedup, newTableName, unionType) => {
            expect(txId).to.equal(1);
            expect(unionType).to.equal(UnionOperatorT["UnionStandard"]);
            expect(dedup).to.be.true;
            expect(tableInfos.length).to.equal(2);
            expect(tableInfos[0]).to.deep.equal({
                tableName: "parent1",
                columns: [{
                    name: "col1",
                    rename: "destCol",
                    type: ColumnType.string,
                    cast: false
                }]
            });
            expect(tableInfos[1]).to.deep.equal({
                tableName: "parent2",
                columns: [{
                    name: "col2",
                    rename: "destCol",
                    type: ColumnType.string,
                    cast: true
                }]
            });
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
            XIApi.union = oldSet;
        });
    });

    it("should export", (done) => {
        const node = createNode(DagNodeType.Export);
        const parentNode = createNode();
        node.setParam({
            exportName: "testExport",
            targetName: "testTarget",
            columns: [{sourceColumn: "prefix::col", destColumn: "col"}],
            keepOrder: false,
            options: null
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldExport = XIApi.exportTable;

        XIApi.exportTable = (txId, tableName, exportName, targetName, numCols, backColumns, frontColumns, keepOrder, options) => {
            expect(txId).to.equal(1);
            expect(tableName).to.equal("testTable");
            expect(exportName).to.equal("testExport");
            expect(targetName).to.equal("testTarget");
            expect(numCols).to.equal(1);
            expect(backColumns).to.deep.equal(["prefix::col"]);
            expect(frontColumns).to.deep.equal(["col"]);
            expect(keepOrder).to.be.false;
            expect(options).to.deep.equal({
                createRule: 1,
                csvArgs: {fieldDelim: "\t", recordDelim: "\n"},
                format: 2,
                handleName: "",
                headerType: 1,
                splitType: 2
            });
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
            XIApi.exportTable = oldExport;
        });
    });
});