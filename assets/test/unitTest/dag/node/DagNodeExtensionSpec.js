describe("DagNodeExtension Test", function() {
    let node;

    before(function() {
        node = new DagNodeExtension({});
        node.newColumns = [{name: "col1", type: ColumnType.string}];
        node.droppedColumns = ["col1"];

        let parentNode = new DagNodeDataset({});
        parentNode.setTable("testDSTable");
        node.connectToParent(parentNode);
    });

    describe("Basic Function Test", function() {
        it("should set param", function() {
            let param = {
                "moduleName": "testModule",
                "functName": "testFunc",
                "args": {}
            };
            node.setParam(param);
    
            let res = node.getParam();
            expect(res).not.to.equal(param);
            expect(res).to.deep.equal(param);
        });

        it("lineageChange should work", function() {
            let progCols = [new ProgCol({name: "col1"})];
            let res = node.lineageChange(progCols);
            expect(res.changes.length).to.equal(2);
            expect(res.columns.length).to.equal(1);
        });

        it("_getSerializeInfo should work", function() {
            let res = node._getSerializeInfo();
            expect(res.newColumns.length).to.equal(1);
            expect(res.droppedColumns.length).to.equal(1);
        });

        it("_genParamHint should work", function() {
            let oldFunc = ExtensionManager.getEnabledExtensions;
            ExtensionManager.getEnabledExtensions = () => {
                let ext = {
                    name: "testModule",
                    buttons: [{
                        fnName: "testFunc",
                        buttonText: "testFunc"  
                    }]
                };
                return [ext];
            };

            let res = node._genParamHint();
            expect(res).to.equal("Func: testFunc");
            // error case
            ExtensionManager.getEnabledExtensions = () => null;
            res = node._genParamHint();
            expect(res).to.equal("");

            ExtensionManager.getEnabledExtensions = oldFunc;
        });

        it("_getColumnsUsedInInput should work", function() {
            expect(node._getColumnsUsedInInput()).to.be.null;
        });

        it('_getConvertedParam should work', function()  {
            let res = node._getConvertedParam();
            expect(res).to.deep.equal({
                "moduleName": "testModule",
                "functName": "testFunc",
                "args": {}
            });
        });

        it("getQuery should work", function(done) {
            let oldFunc = ExtensionManager.triggerFromDF;
            ExtensionManager.triggerFromDF = () => PromiseHelper.resolve({
                finalTableName: "testTable",
                query: "testQuery",
                cols: []
            });

            node.getQuery()
            .then(function(res) {
                expect(res).to.deep.equal({
                    resTable: "testTable",
                    query: "testQuery"
                });
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                ExtensionManager.triggerFromDF = oldFunc;
            });
        });

        it("getQuery should handle error case", function(done) {
            let oldFunc = ExtensionManager.triggerFromDF;
            ExtensionManager.triggerFromDF = () => null;

            node.getQuery()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.undefined;
                done();
            })
            .always(function() {
                ExtensionManager.triggerFromDF = oldFunc;
            });
        });
    });

    describe("_convertExtensionArgs Test", function() {
        it("_getExtensionTable should work", function() {
            let res = node._getExtensionTable();
            expect(res).to.equal(null);
            // case 2
            res = node._getExtensionTable(1);
            expect(res).to.equal(null);
            // case 3
            res = node._getExtensionTable(0);
            expect(res).to.be.an.instanceof(XcSDK.Table);
        });

        it("_getExtensionColumn should work", function() {
            let res = node._getExtensionColumn({name: "test", type: ColumnType.string});
            expect(res).to.be.an.instanceof(XcSDK.Column);

            // case 2
            res = node._getExtensionColumn([{name: "test", type: ColumnType.string}]);
            expect(res.length).to.equal(1);
            expect(res[0]).to.be.an.instanceof(XcSDK.Column);
        });

        it("_convertExtensionArgs should work", function() {
            let res = node._convertExtensionArgs({
                "triggerNode": "test",
                "a": [{
                    "triggerColumn": [{name: "test", type: ColumnType.string}],
                    "arg2": "arg2"
                }]
            });
            expect(res.triggerNode).to.equal(null);
            expect(res.a[0][0]).to.be.an.instanceof(XcSDK.Column);
        });
    });
});