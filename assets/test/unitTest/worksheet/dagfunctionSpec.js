describe("DagFunction Test", function() {
    describe("Edit submit related tests", function() {
        it("includeDroppedNodesInStartNodes should work", function() {
            var greatGrandParentNode = {parents: [], value: {name: "one", state: DgDagStateT.DgDagStateReady}}
            var grandParentNode = {parents: [greatGrandParentNode], value: {name: "two", state: DgDagStateT.DgDagStateDropped}};
            var parentNode = {parents: [grandParentNode], value: {name: "three", state: DgDagStateT.DgDagStateDropped}};
            var childNode = {children:[], parents: [parentNode], value: {name: "four", state: DgDagStateT.DgDagStateReady}};
            var startNodes = [childNode];
            greatGrandParentNode.children = [grandParentNode];
            grandParentNode.children = [parentNode];
            parentNode.children = [childNode];
            DagFunction.__testOnly__includeDroppedNodesInStartNodes(startNodes);
            expect(startNodes.length).to.equal(2);
            expect(startNodes[1].value.name).to.equal("two");

        });

        it("inserting index nodes into valArray should work", function() {

            var newIndexNodes = {
                "two": [{keys: ["a"], src: ["one"]}],
                "three": [{keys: ["b"], src: "two"}]
            };
            var valueArray = [{name: "two", struct: {source: "one"}},
                            {name: "three", struct: {source: ["two"]}}];
            var newNodesArray = [];
            DagFunction.__testOnly__insertIndexNodesIntoValArray(newIndexNodes, valueArray, newNodesArray);

            expect(newNodesArray.length).to.equal(2);
            expect(newNodesArray[0].indexOf("one.index")).to.equal(0);
            expect(newNodesArray[1].indexOf("two.index")).to.equal(0);

            expect(valueArray.length).to.equal(4);
            expect(valueArray[2].name).to.equal("two");
            expect(valueArray[2].parentNames[0].indexOf("one.index")).to.equal(0);

            expect(valueArray[3].name).to.equal("three");
            expect(valueArray[3].parentNames[0].indexOf("two.index")).to.equal(0);

            expect(valueArray[0].name.indexOf("two.index")).to.equal(0);
            expect(valueArray[0].parentNames[0]).to.equal("two");

            expect(valueArray[1].name.indexOf("one.index")).to.equal(0);
            expect(valueArray[1].parentNames[0]).to.equal("one");
        });

        it("inserting new nodes into valArray should work", function() {
            var newNodes = {
                "two": [{args: {source: "one", dest: "new"}, operation: "XcalarApiMap"}]
            };
            var valueArray = [{name: "two", struct: {source: "new"}},
                            {name: "three", struct: {source: "two"}}];
            var newNodesArray = [];
            DagFunction.__testOnly__insertNewNodesIntoValArray(newNodes, valueArray, newNodesArray);

            expect(newNodesArray.length).to.equal(1);
            expect(newNodesArray[0]).to.equal("new");

            expect(valueArray.length).to.equal(3);
            expect(valueArray[1].name).to.equal("two");
            expect(valueArray[1].parentNames[0]).to.equal("new");
            expect(valueArray[0].name).to.equal("new");
            expect(valueArray[0].parentNames[0]).to.equal("one");
        });

        it("tag dag nodes after edit should work", function() {
            var tagNodeCache = XcalarTagDagNodes;
            var count = 0;
            var called = false;
            XcalarTagDagNodes = function(tag, nodes) {
                count++;
                if (count === 1) {
                    expect(tag).to.equal("old1");
                    expect(nodes.length).to.equal(1);
                    expect(nodes[0]).to.equal("table1");
                } else {
                    expect(tag).to.equal("old2,old3");
                    expect(nodes.length).to.equal(1);
                    expect(nodes[0]).to.equal("table2");
                }
                if (count === 2) {
                    called = true;
                }
                return PromiseHelper.resolve();
            }
            var tagMap = {
                "old1": ["table1"],
                "old2,old3": ["table2"]
            };
            DagFunction.__testOnly__tagNodesAfterEdit(tagMap);
            expect(called).to.be.true;
            XcalarTagDagNodes = tagNodeCache;
        });

        it("set columns after edit should work", function(done) {
            var table = setupFakeTable();
            table.backTableMeta = {
                valueAttrs: [{type: DfFieldTypeT.DfString, name: "testCol"}]
            };
            var cacheFn = XcalarGetTableMeta;
            var called = false;
            XcalarGetTableMeta = function(tName) {
                expect(tName).to.equal("finalName");
                called = true;
                return PromiseHelper.resolve({
                    valueAttrs: [
                    {type: DfFieldTypeT.DfFatptr, name: "prefix"},
                    {type: DfFieldTypeT.DfString, name: "testCol"},
                    {type: DfFieldTypeT.DfString, name: "col2"},
                    ]
                });
            };
            DagFunction.__testOnly__setColumnsAfterEdit("finalName", table)
            .then(function(newCols) {
                expect(called).to.be.true;
                expect(newCols.length).to.equal(4);
                expect(newCols[0].backName).to.equal("testCol");
                expect(newCols[1].backName).to.equal("prefix::testCol2");
                expect(newCols[2].backName).to.equal("col2");
                expect(newCols[3].backName).to.equal("DATA");
                // oldCol should not exist
                XcalarGetTableMeta = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("functions test", function() {
        it("print dag cli should work", function(done) {
            var cache = XcalarGetDag;
            XcalarGetDag = function() {
                return PromiseHelper.resolve({"numNodes":2,"node":[{"name":{"name":"unitTestFakeYelp60391#449"},"tag":"indexFromDataset#449","comment":"","dagNodeId":"690844","api":3,"state":5,"xdbBytesRequired":0,"xdbBytesConsumed":0,"numTransPageSent":0,"numTransPageRecv":0,"numWorkCompleted":1000,"numWorkTotal":1000,"elapsed":{"milliseconds":1},"inputSize":533024,"input":{"indexInput":{"source":".XcalarDS.rudyunit.71102.unitTestFakeYelp6039","dest":"unitTestFakeYelp60391#449","key":[{"name":"xcalarRecordNum","type":"DfInt64","keyFieldName":"unitTestFakeYelp60391-xcalarRecordNum","ordering":"Unordered"}],"prefix":"unitTestFakeYelp60391","dhtName":"","delaySort":false,"broadcast":false}},"numRowsTotal":1000,"numNodes":1,"numRowsPerNode":[1000],"sizeTotal":0,"sizePerNode":[],"numTransPagesReceivedPerNode":[0],"numParents":1,"parents":["666056"],"numChildren":0,"children":[]},{"name":{"name":".XcalarDS.rudyunit.71102.unitTestFakeYelp6039"},"tag":"","comment":"","dagNodeId":"666056","api":2,"state":5,"xdbBytesRequired":0,"xdbBytesConsumed":0,"numTransPageSent":0,"numTransPageRecv":0,"numWorkCompleted":0,"numWorkTotal":0,"elapsed":{"milliseconds":0},"inputSize":1317752,"input":{"loadInput":{"dest":".XcalarDS.rudyunit.71102.unitTestFakeYelp6039","loadArgs":{"sourceArgsList":[{"targetName":"Default Shared Root","path":"/netstore/datasets/unittest/test_yelp.json","fileNamePattern":"","recursive":false}],"parseArgs":{"parserFnName":"default:parseJson","parserArgJson":"{}","fileNameFieldName":"","recordNumFieldName":"","allowRecordErrors":false,"allowFileErrors":false,"schema":[]},"size":10737418240},"dagNodeId":"666056"}},"numRowsTotal":0,"numNodes":1,"numRowsPerNode":[0],"sizeTotal":0,"sizePerNode":[],"numTransPagesReceivedPerNode":[0],"numParents":0,"parents":[],"numChildren":3,"children":["690844","670820","666050"]}]});
            }
            DagFunction.printDagCli("test1#0")
            .then(function(ret) {
                ret = JSON.parse(ret);
                expect(ret.length).to.equal(2);
                expect(ret[0].operation).to.equal("XcalarApiBulkLoad");
                expect(ret[1].operation).to.equal("XcalarApiIndex");
                var called = false;
                XcalarGetDag = function() {
                    called = true;
                    return PromiseHelper.resolve();
                };
                DagFunction.printDagCli("test1#0")
                .then(function() {
                    expect(called).to.be.false;
                    expect(ret.length).to.equal(2);
                    expect(ret[0].operation).to.equal("XcalarApiBulkLoad");
                    expect(ret[1].operation).to.equal("XcalarApiIndex");
                    XcalarGetDag = cache;
                    done();
                })
                .fail(function() {
                    done("failed");
                });
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DagFunction.addTable should work", function() {
            var cache = WSManager.moveTemporaryTable;
            var called = false;
            WSManager.moveTemporaryTable = function(tId, wsId, tableType) {
                called = true;
                expect(tableType).to.equal(TableType.Orphan);
                return PromiseHelper.resolve();
            };
            DagFunction.addTable("tid");

            expect(called).to.be.true;

            WSManager.moveTemporaryTable = cache;
        });
    });

    function setupFakeTable() {
        var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "testCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "testCol2",
            "backName": "prefix::testCol2",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });


        var progCol3 = new ProgCol({
            "name": "oldCol",
            "backName": "oldCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol4 = new ProgCol({
            "name": "DATA",
            "backName": "DATA",
            "isNewCol": false,
            "func": {
                "name": "raw"
            }
        });

        tableName = "fakeTable#zz999";
        tableId = "zz999";
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "status": TableType.Active,
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });
        gTables[tableId] = table;
        return table;
    }

    after(function() {
        delete gTables["zz999"];
    });

});