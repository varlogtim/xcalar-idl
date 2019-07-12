describe("DagNodeExecutor Test", () => {
    const txId = 1;
    let cachedTransactionGet;
    before(function(done){
        cachedTransactionGet = Transaction.get;
        Transaction.get = () => {
            return {
                setCurrentNodeId: ()=>{},
                setParentNodeId: ()=>{},
            }
        }
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });
    let createNode = (type, tableName, subType) => {
        return DagNodeFactory.create({
            type: type || DagNodeType.Dataset,
            subType: subType || null,
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
            return PromiseHelper.resolve({newTableName, prefix});
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

    it("_getOptimizedDSName should work", function() {
        let executor = new DagNodeExecutor();
        let res = executor._getOptimizedDSName("test");
        expect(res).not.to.equal("test");
        expect(res.startsWith("Optimized")).to.be.true;
    });

    it("_getOptimizedLoadArg should work", function() {
        let node = createNode(DagNodeType.Dataset);
        let loadArgs = {
            args: {
                dest: "test"
            }
        };
        node.setParam({
            loadArgs: JSON.stringify(loadArgs)
        });
        let executor = new DagNodeExecutor();
        let res = executor._getOptimizedLoadArg(node, "test2");
        let parsed = JSON.parse(res);
        expect(parsed.args.dest).to.equal("test2");
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
            return PromiseHelper.resolve({value:100});
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
                isDistinct: true,
                delim: undefined
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
            return PromiseHelper.resolve({finalTable: tableName});
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
                keepColumns: ["lCol", "lCol2"],
                casts: ["string"],
                rename: [{sourceColumn: "lCol2", destColumn: "joinCol", prefix: false}]
            },
            right: {
                columns: ["x::rCol"],
                keepColumns: ["x::rCol", "x::rCol2"],
                casts: [null],
                rename: [{sourceColumn: "x", destColumn: "x2", prefix: true}]
            },
            evalString: "",
            keepAllColumns: false
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
                casts: null,
                rename: [{
                    "orig": "lCol",
                    "new": "lCol",
                    "type": DfFieldTypeT.DfUnknown
                },{
                    "orig": "lCol2",
                    "new": "joinCol",
                    "type": DfFieldTypeT.DfUnknown
                }],
                allImmediates: []
            });

            expect(rTableInfo).to.deep.equal({
                tableName: "right",
                columns: ["x::rCol"],
                casts: null,
                rename: [{
                    "orig": "x",
                    "new": "x2",
                    "type": DfFieldTypeT.DfFatptr
                }],
                allImmediates: []
            });
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.evalString).to.equal("");
            return PromiseHelper.resolve({});
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
        const node = createNode(DagNodeType.Set, null, DagNodeSubType.Union);
        const parentNode1 = createNode(null, "parent1");
        const ParentNode2 = createNode(null, "parent2");
        node.setParam({
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
            return PromiseHelper.resolve({});
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
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol])
        node.setParam({
            columns: [{
                sourceColumn: "test",
                destColumn: "test"
            }],
            driver: "testDriver",
            driverArgs: {"arg1": "val1"}
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldExport = XIApi.exportTable;

        XIApi.exportTable = (txId, tableName, driverName, driverParams, driverColumns, exportName) => {
            expect(txId).to.equal(1);
            expect(tableName).to.equal("testTable");
            expect(driverName).to.equal("testDriver");
            expect(driverParams).to.be.an("object");
            expect(driverParams["arg1"]).to.equal("val1");
            expect(driverColumns.length).to.equal(1);
            expect(driverColumns[0].headerName).to.equal("test");
            expect(driverColumns[0].columnName).to.equal("test");
            expect(exportName).not.to.be.empty;
            expect(exportName).to.be.a("string");
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

    it("should work for link out", (done) => {
        const node = createNode(DagNodeType.DFOut);
        const parentNode = createNode();
        node.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);

        executor.run()
        .then(() => {
            expect(node.getTable()).to.equal("testTable");
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should publish IMD", (done) => {
        const node = createNode(DagNodeType.PublishIMD);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("parentTable");
        node.setParam({
            pubTableName: "testTable2",
            primaryKeys: ["pk"],
            operator: "testCol",
            columns: ["test"]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldPublish = XIApi.publishTable;

        XIApi.publishTable = (txId, primaryKeys, srcTableName, pubTableName, colInfo, imdCol) => {
            expect(txId).to.equal(1);
            expect(primaryKeys.length).to.equal(1);
            expect(primaryKeys[0]).to.equal("pk");
            expect(srcTableName).to.equal("parentTable");
            expect(pubTableName).to.equal("testTable2");
            expect(colInfo.length).to.equal(1);
            expect(colInfo[0]).to.deep.include({
                orig: "test",
                new: "test",
                type: 4
            });
            expect(imdCol).to.equal("testCol")
            return PromiseHelper.resolve({});
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
            XIApi.publishTable = oldPublish;
        });
    });

    it("should update IMD", (done) => {
        const node = createNode(DagNodeType.UpdateIMD);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("parentTable");
        node.setParam({
            pubTableName: "testTable2",
            operator: "testCol"
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldUpdate = XIApi.updatePubTable;

        XIApi.updatePubTable = (txId, srcTableName, pubTableName, colInfo, imdCol) => {
            expect(txId).to.equal(1);
            expect(srcTableName).to.equal("parentTable");
            expect(pubTableName).to.equal("testTable2");
            expect(colInfo.length).to.equal(1);
            expect(colInfo[0]).to.deep.include({
                orig: "test",
                new: "test",
                type: 4
            });
            expect(imdCol).to.equal("testCol")
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
            XIApi.updatePubTable = oldUpdate;
        });
    });

    it("should work for extension", (done) => {
        const node = createNode(DagNodeType.Extension);
        node.setParam({
            moduleName: "testModule",
            functName: "testFunc",
            args: {
                col: new XcSDK.Column("testCol", ColumnType.integer)
            }
        });

        const executor = new DagNodeExecutor(node, txId);
        const oldTriggerFromDF = ExtensionManager.triggerFromDF;
        const oldQuery = XIApi.query;

        ExtensionManager.triggerFromDF = (moduleName, funcName, args) => {
            expect(moduleName).to.equal("testModule");
            expect(funcName).to.equal("testFunc");
            expect(args.col).not.to.be.empty
            return PromiseHelper.resolve("testTable", "testQuery", []);
        };

        XIApi.query = (txId, queryName, queryStr) => {
            expect(txId).to.equal(1);
            expect(queryName).to.equal("testTable");
            expect(queryStr).to.equal("testQuery");
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
            ExtensionManager.triggerFromDF = oldTriggerFromDF;
            XIApi.query = oldQuery;
        });
    });

    it("should work for get IMDTable", (done) => {
        const node = createNode(DagNodeType.IMDTable);
        node.setParam({
            source: "testTable",
            version: 1,
            schema: [{name: "testCol", type: ColumnType.integer}],
            filterString: "eq(testCol, 1)"
        });

        const executor = new DagNodeExecutor(node, txId);
        const oldRestore = XcalarRestoreTable;
        const oldRefresh = XcalarRefreshTable;
        const oldGetMeta = XcalarGetTableMeta;

        XcalarGetTableMeta = () => {
            return PromiseHelper.resolve({metas: []});
        }

        XcalarRestoreTable = (source) => {
            expect(source).to.equal("testTable");
            return PromiseHelper.resolve();
        };


        XcalarRefreshTable = (source, newTableName, minBatch, maxBatch, txId, filterString, columnInfo) => {
            expect(source).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(minBatch).to.equal(-1);
            expect(maxBatch).to.equal(1);
            expect(txId).to.equal(1);
            expect(filterString).to.equal("eq(testCol, 1)");
            expect(columnInfo.length).to.equal(1);
            expect(columnInfo[0]).to.deep.equal({
                sourceColumn: "testCol",
                destColumn: "testCol",
                columnType: "DfInt64"
            });
            return PromiseHelper.resolve({});
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
            XcalarRestoreTable = oldRestore;
            XcalarRefreshTable = oldRefresh;
            XcalarGetTableMeta = oldGetMeta;
        });
    });

    it("should work for jupyter", (done) => {
        const node = createNode(DagNodeType.Jupyter);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("testTable");
        node.setParam({
            numExportRows: 1,
            renames: [{
                sourceColumn: "test",
                destColumn: "rename"
            }]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize = XIApi.synthesize;

        XIApi.synthesize = (txId, colInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(colInfos.length).to.equal(1);
            expect(colInfos[0]).to.deep.equal({
                orig: "test",
                new: "rename",
                type: 4
            });
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
            XIApi.synthesize = oldSynthesize;
        });
    });

    it("should work for rowNum", (done) => {
        const node = createNode(DagNodeType.RowNum);
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.setParam({
            newField: "testCol",
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGenRowNum = XIApi.genRowNum;

        XIApi.genRowNum = (txId, tableName, newColName, newTableName) => {
            expect(txId).to.equal(1);
            expect(tableName).to.equal("testTable");
            expect(newColName).to.equal("testCol");
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
            XIApi.genRowNum = oldGenRowNum;
        });
    });

    it("should work for index", (done) => {
        const node = DagNodeFactory.create({
            type: DagNodeType.Index,
            input: {
                columns: [{
                    name: "testCol",
                    keyFieldName: "newKey"
                }],
                dhtName: "dht"
            }
        });
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldIndex = XIApi.index;

        XIApi.index = (txId, colNames, tableName, newTableName, newKeys, dhtName) => {
            expect(txId).to.equal(1);
            expect(colNames.length).to.equal(1);
            expect(colNames[0]).to.equal("testCol");
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.be.undefined;
            expect(newKeys.length).to.equal(1);
            expect(newKeys[0]).to.equal("newKey");
            expect(dhtName).to.equal("dht");
            return PromiseHelper.resolve({});
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
            XIApi.index = oldIndex;
        });
    });

    it("should work for sort", (done) => {
        const node = createNode(DagNodeType.Sort);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("testCol", "testCol", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("testTable");
        node.setParam({
            columns: [{
                columnName: "testCol",
                ordering: "Ascending"
            }],
            newKeys: ["newKey"]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSort = XIApi.sort;

        XIApi.sort = (txId, keyInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(keyInfos.length).to.equal(1);
            expect(keyInfos[0]).to.deep.equal({
                keyFieldName: "newKey",
                name: "testCol",
                ordering: 3,
                type: 4
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve({});
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
            XIApi.sort = oldSort;
        });
    });

    it("should work for deskew", (done) => {
        const node = createNode(DagNodeType.Deskew);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("testCol", "testCol", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.setTable("testTable");
        node.setParam({
            column: "testCol"
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldIndex = XIApi.index;

        XIApi.index = (txId, colNames, tableName, newTableName, newKeys) => {
            expect(txId).to.equal(1);
            expect(colNames.length).to.equal(1);
            expect(colNames[0]).to.equal("testCol");
            expect(tableName).to.equal("testTable");
            expect(newKeys.length).to.equal(1);
            expect(newKeys[0]).to.equal("testCol");
            return PromiseHelper.resolve({});
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
            XIApi.index = oldIndex;
        });
    });

    it("should work for placeholder", (done) => {
        const node = createNode(DagNodeType.Placeholder);
        const executor = new DagNodeExecutor(node, txId);
        executor.run()
        .then(() => {
            expect(node.getTable()).to.be.undefined;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should work for synthesize", (done) => {
        const node = DagNodeFactory.create({
            type: DagNodeType.Synthesize,
            input: {
                colsInfo: [{
                    sourceColumn: "testCol",
                    destColumn: "newCol",
                    columnType: "DfString"
                }],
            }
        });
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize = XIApi.synthesize;

        XIApi.synthesize = (txId, colInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(colInfos.length).to.equal(1);
            expect(colInfos[0]).to.deep.equal({
                orig: "testCol",
                new: "newCol",
                type: 1
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
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
            XIApi.synthesize = oldSynthesize;
        });
    });

    it("should work for SQLFuncIn", (done) => {
        const node = createNode(DagNodeType.SQLFuncIn);
        node.setParam({
            source: "testTable"
        });
        node.setSchema([{name: "testCol", type: ColumnType.integer}]);
        const executor = new DagNodeExecutor(node, txId);
        const oldRefresh = XcalarRefreshTable;

        XcalarRefreshTable = (pubTableName, dstTableName, minBatch, maxBatch, txId, filterString, columnInfo) => {
            expect(pubTableName).to.equal("testTable");
            expect(dstTableName).to.not.to.be.empty;
            expect(dstTableName).to.be.a("string");
            expect(minBatch).to.equal(-1);
            expect(maxBatch).to.equal(-1);
            expect(txId).to.equal(1);
            expect(filterString).to.equal("");
            expect(columnInfo.length).to.equal(1);
            expect(columnInfo[0]).to.deep.equal({
                sourceColumn: "testCol",
                destColumn: "testCol",
                columnType: "DfInt64"
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
            XcalarRefreshTable = oldRefresh;
        });
    });

    it("should work for SQLFuncOut", (done) => {
        const node = createNode(DagNodeType.SQLFuncOut);
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.setParam({
            schema: [{name: "testCol", type: ColumnType.integer}]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize = XIApi.synthesize;

        XIApi.synthesize = (txId, colInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(colInfos.length).to.equal(1);
            expect(colInfos[0]).to.deep.equal({
                orig: "testCol",
                new: "TESTCOL",
                type: 4
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
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
            XIApi.synthesize = oldSynthesize;
        });
    });
    after(function() {
        Transaction.get = cachedTransactionGet;
    });
});