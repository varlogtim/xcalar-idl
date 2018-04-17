describe("DagEdit Test", function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var mapColName = "mapped";
    var aggName;
    var $dagWrap;
    var nodeIdMap;
    var firstMapName;

    before(function(done) {
        console.clear();
        UnitTest.onMinMode();
        aggName = "^test" + Math.floor(Math.random() * 10000);

        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            prefix = tPrefix;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);

            // XXX TODO: create table meta without backend calls

            xcFunction.filter(1, tableId, {filterString: 'eq(' + tPrefix + gPrefixSign + 'average_stars, 3)'})
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return xcFunction.map(1, tableId, mapColName, 'add(' + tPrefix + gPrefixSign + 'average_stars, 2)');
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                firstMapName = tableName;
                return xcFunction.aggregate(1, tableId, "count", "mapped", aggName);
            })
            .then(function() {
                UnitTest.hasAlertWithTitle("Aggregate: Count");
                return xcFunction.map(1, tableId, "mapped2", 'add(' + aggName + ', 2)');
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return xcFunction.groupBy(tableId, [{
                    operator: "count",
                    aggColName: "mapped",
                    newColName: "mapped_count"
                }], [{colName: "mapped"}], aggName);
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return xcFunction.union([{tableName: tableName, pulledColumns: [], columns:[{name:"mapped", rename:"mapped", type:"float", "cast": false}]},
                    {tableName: tableName, pulledColumns: [], columns:[{name:"mapped", rename:"mapped", type:"float", "cast": false}]}], false);
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return xcFunction.join("Inner Join", {colNums: [1], pulledColumns:["mapped"], tableId: tableId, rename: [{
                        orig: "mapped",
                        new: "mapped",
                        type: DfFieldTypeT.DfUnknown
                     }]},
                     {colNums: [1], pulledColumns:[], tableId: tableId, rename: [{
                        orig: "mapped",
                        new: "mappedRename",
                        type: DfFieldTypeT.DfUnknown
                     }]}, "test");
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return xcFunction.map(1, tableId, "concat", 'concat("one-", "two")');
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                return ColManager.splitCol(1, tableId, "-");
            })
            .then(function(tId) {
                tableId = tId;
                tableName = gTables[tableId].getName();
                return xcFunction.project(["concat", "mapped"], tableId);
            })
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                $dagWrap = $("#dagWrap-" + tableId);
                $table = $("#xcTableWrap-" + tableId);
                nodeIdMap = $dagWrap.data("allDagInfo").nodeIdMap;

                DagPanel.heightForTableReveal();
                UnitTest.testFinish(function() {
                    return $("#dagPanel").hasClass("noTransform");
                })
                .then(function() {
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            })
            .fail(function() {
                done("fail");
            });
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Dag edit mode toggling", function() {
        it("should toggle on", function() {
            expect($dagWrap.hasClass("editMode")).to.be.false;

            expect($dagWrap.find(".editBtn").length).to.equal(2);
            expect($dagWrap.find(".editBtn:visible").length).to.equal(1);
            $dagWrap.find(".editBtn:visible").click();

            expect($dagWrap.hasClass("editMode")).to.be.true;
            expect($("#container").hasClass("dfEditState")).to.be.true;
            expect($table.hasClass("editingDf")).to.be.true;
            expect(DagEdit.isEditMode()).to.be.true;
        });

        it("should toggle off", function() {
            expect($dagWrap.hasClass("editMode")).to.be.true;

            $dagWrap.find(".editBtn:visible").click();

            expect($dagWrap.find(".editBtn").length).to.equal(2);
            expect($dagWrap.find(".editBtn:visible").length).to.equal(1);

            expect($dagWrap.hasClass("editMode")).to.be.false;
            expect($("#container").hasClass("dfEditState")).to.be.false;
            expect($table.hasClass("editingDf")).to.be.false;
            expect(DagEdit.isEditMode()).to.be.false;
        });

        it("should show warning if edit in progress", function() {
            var cachedFn = DagEdit.getInfo;
            DagEdit.getInfo = function() {
                return {structs: {a: "a"}};
            };

            DagEdit.off();
            UnitTest.hasAlertWithTitle("Edit in progress", {confirm: true});

            DagEdit.getInfo = cachedFn;
        });
    });

    describe("Map pre form on split operation", function() {
        before(function() {
            $dagWrap.find(".editBtn:visible").click();
        });

        it("map pre form should show", function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".operationTypeWrap").data("id");
            var node = nodeIdMap[nodeId];

            var cachedFn = TblManager.findAndFocusTable;
            var called = false;
            TblManager.findAndFocusTable = function() {
                called = true;
                return PromiseHelper.resolve({tableFromInactive: true});
            };

            expect($("#mapPreForm").is(":visible")).to.be.false;

            DagEdit.editOp(node);

            expect(called).to.be.false;
            expect($("#mapPreForm").is(":visible")).to.be.true;
            expect($("#mapPreForm").hasClass("single")).to.be.false;
            expect($("#mapPreForm").find(".row").length).to.equal(2);
            expect($("#mapPreForm").find(".row").text()).to.equal('cut(concat, 1, "-")cut(concat, 2, "-")');

            TblManager.findAndFocusTable = cachedFn;
        });

        it("map pre form should close", function() {
            expect($("#mapPreForm").is(":visible")).to.be.true;
            $(document).trigger(fakeEvent.mousedown);
            expect($("#mapPreForm").is(":visible")).to.be.false;


            var cachedFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };

            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".operationTypeWrap").data("id");
            var node = nodeIdMap[nodeId];

            DagEdit.editOp(node);
            expect($("#mapPreForm").is(":visible")).to.be.true;

            $("#mapPreForm").find(".close").click();
            expect($("#mapPreForm").is(":visible")).to.be.false;

            TblManager.findAndFocusTable = cachedFn;
        });

        it("clicking on row should prompt edit", function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".operationTypeWrap").data("id");
            var node = nodeIdMap[nodeId];

            var called = false;
            DagEdit.editOp(node);

            var cachedFn = DagEdit.editOp;
            DagEdit.editOp = function() {
                called = true;
            };
            expect($("#mapPreForm").is(":visible")).to.be.true;

            $("#mapPreForm").find(".row").eq(0).click();
            expect(called).to.be.true;

            DagEdit.editOp = cachedFn;
        });

        it("click on delete should remove row", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;

            var cachedFn = DagEdit.editOp;
            var called = false;
            DagEdit.editOp = function() {
                called = true;
            };

            $("#mapPreForm").find(".row .delete").eq(0).click();

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval[0].evalString).to.equal('cut(concat, 2, "-")');

            var $dagTableWrap = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".dagTableWrap");

            expect($dagTableWrap.hasClass("hasEdit")).to.be.true;
            expect(called).to.be.false;
            DagEdit.editOp = cachedFn;
        });

        it("click on  addOp should trigger editing", function() {
            var cachedFn = DagEdit.editOp;
            var called = false;
            DagEdit.editOp = function(node, options) {
                expect(options.evalIndex).to.equal(1);
                called = true;
            };

            expect($("#mapPreForm").find(".addOp").length).to.equal(1);
            $("#mapPreForm").find(".addOp").click();

            DagEdit.editOp = cachedFn;
        });

        after(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".operationTypeWrap").data("id");
            var node = nodeIdMap[nodeId];
            DagEdit.undoEdit(node);
        });
    });

    describe("DagEdit on split column operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("operations view should show", function(done) {
            var cachedFn = OperationsView.show;
            var called = false;
            OperationsView.show = function() {
                called = true;
            };

            DagEdit.editOp(node, {evalIndex: 0});

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                OperationsView.show = cachedFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("map operation should be stored", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    "eval": [{"evalString": "add(1,2)", "newField": "renamed"}],
                    "icv": true
                }
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval.length).to.equal(2);
            expect(editInfo.structs[keys[0]].eval[0].evalString).to.equal('add(1,2)');

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();

            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on group by operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Group by";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("operation view should show", function(done) {
            var cachedFn = OperationsView.show;
            var called = false;
            OperationsView.show = function(tId, colNums, op, options) {
                // skip a parent because of index operation
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].parents[0].value.name));
                expect(colNums.length).to.equal(0);
                expect(op).to.equal("group by");
                expect(options.prefill.args.length).to.equal(1);
                expect(options.prefill.args[0].length).to.equal(1);
                expect(options.prefill.args[0][0]).to.equal("mapped");
                expect(options.prefill.dest).to.equal(node.value.name.split("#")[0]);
                expect(options.prefill.indexedFields.length).to.equal(1);
                expect(options.prefill.indexedFields[0]).to.equal(mapColName);
                expect(options.prefill.newFields.length).to.equal(1);
                expect(options.prefill.newFields[0]).to.equal("mapped_count");
                expect(options.prefill.ops.length).to.equal(1);
                expect(options.prefill.ops[0]).to.equal("count");
                expect(options.prefill.isDroppedTable).to.be.false;
                called = true;
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                OperationsView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("store should work", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    "eval": [{"evalString": "count(" + mapColName + ")", "newField": "mapped_count"}],
                    "icv": true
                },
                indexFields: [mapColName]
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval[0].evalString).to.equal("count(" + mapColName + ")");

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on filter operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "filter";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({notFound: true});
            };
        });

        it("operation view should show", function(done) {
            var cachedFn = OperationsView.show;
            var called = false;
            OperationsView.show = function(tId, colNums, op, options) {
                // skip a parent because of index operation
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].value.name));
                expect(colNums.length).to.equal(0);
                expect(op).to.equal("filter");

                expect(options.prefill.args.length).to.equal(1);
                expect(options.prefill.args[0].length).to.equal(2);
                expect(options.prefill.args[0][0]).to.equal(prefix + gPrefixSign + "average_stars");
                expect(options.prefill.args[0][1]).to.equal("3");

                expect(options.prefill.ops.length).to.equal(1);
                expect(options.prefill.ops[0]).to.equal("eq");
                expect(options.prefill.isDroppedTable).to.be.true;
                called = true;

                // gets added to gdroppedtables
                expect(gDroppedTables[tId]).to.not.be.empty;
                delete gDroppedTables[tId];
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                OperationsView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("store should work", function() {
            var called = false;
            var cachedFn = DagFunction.getAggsFromEvalStrs;
            DagFunction.getAggsFromEvalStrs = function() {
                called = true;
                return ["fakeAgg"];
            };

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    "eval": [{"evalString": "eq(" + prefix + gPrefixSign + "average_stars, 3)"}]
                },
            });

            expect(called).to.be.true;
            expect($("#dagPanel").find(".aggError").length).to.equal(1);
            expect($("#dagPanel").find(".dagTableTip.error").length).to.equal(1);
            $("#dagPanel").find(".aggError").removeClass("aggError hasError");
            $("#dagPanel").find(".dagTableTip.error").remove();


            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval[0].evalString).to.equal("eq(" + prefix + gPrefixSign + "average_stars, 3)");

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
            DagFunction.getAggsFromEvalStrs = cachedFn;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on aggregate operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "aggregate";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("operation view should show", function(done) {
            var cachedFn = OperationsView.show;
            var called = false;
            OperationsView.show = function(tId, colNums, op, options) {
                // skip a parent because of index operation
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].value.name));
                expect(colNums.length).to.equal(0);
                expect(op).to.equal("aggregate");

                expect(options.prefill.args.length).to.equal(1);
                expect(options.prefill.args[0].length).to.equal(1);
                expect(options.prefill.args[0][0]).to.equal(mapColName);

                expect(options.prefill.ops.length).to.equal(1);
                expect(options.prefill.ops[0]).to.equal("count");
                expect(options.prefill.isDroppedTable).to.be.false;
                called = true;
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                OperationsView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("store should work", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    "eval": [{"evalString": "count(" + mapColName+ ")"}]
                },
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval.length).to.equal(1);
            expect(editInfo.structs[keys[0]].eval[0].evalString).to.equal("count(" + mapColName + ")");

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on join operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Join";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("join view should show", function(done) {
            var cachedFn = JoinView.show;
            var called = false;
            JoinView.show = function(tId, colNums, options) {
                // skip a parent because of index operation
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].parents[0].value.name));
                expect(colNums.length).to.equal(0);

                expect(options.prefill.dest).to.equal("test");
                expect(options.prefill.evalString).to.equal("");
                expect(options.prefill.joinType).to.equal("innerJoin");

                expect(options.prefill.isLeftDroppedTable).to.be.false;
                expect(options.prefill.isRightDroppedTable).to.be.false;
                expect(options.prefill.srcCols.left.length).to.equal(1);
                expect(options.prefill.srcCols.right.length).to.equal(1);
                expect(options.prefill.srcCols.left[0]).to.equal(mapColName);
                expect(options.prefill.srcCols.right[0]).to.equal(mapColName);

                expect(options.prefill.rightTable).to.equal(node.parents[1].parents[0].value.name);

                called = true;
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                JoinView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DagEdit.storeJoin should work", function() {
            var called = false;
            var joinCache = XIApi.join;
            XIApi.join = function() {
                return PromiseHelper.resolve();
            }
            var storeCache = DagEdit.store;
            DagEdit.store = function(struct) {
                expect(struct).to.equal("test2");
            };

            var transactionCache = Transaction.done;
            Transaction.done = function(id, options) {
                expect(Math.round(id)).to.not.equal(id);
                expect(options.noSql).to.be.true;
                called = true;
                return '"test1","test2",';
            };

            var table1 = new TableMeta({
                "tableId": "test1",
                "tableName": "test1",
                "status": TableType.Active,
                "tableCols": []
            });

            var table2 = new TableMeta({
                "tableId": "test2",
                "tableName": "test2",
                "status": TableType.Active,
                "tableCols": []
            });

            gTables["test1"] = table1;
            gTables["test2"] = table2;

            DagEdit.storeJoin("innerJoin", {tableId: "test1", colNums: []},
                        {tableId: "test2", colNums: []}, "newTable", {});
            var info = DagEdit.getInfo();

            expect(Object.keys(info.insertedNodes).length).to.equal(1);
            for (var i in info.insertedNodes) {
                expect(info.insertedNodes[i].length).to.equal(1);
                expect(info.insertedNodes[i][0]).to.equal("test1");
            }

            XIApi.join = joinCache;
            DagEdit.store = storeCache;
            Transaction.done = transactionCache;
            delete gTables["test1"];
            delete gTables["test2"];
        });

        it("store should work", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    joinType: "Inner Join",
                    evalString: ""
                },
                indexFields: [[mapColName], [mapColName]]
            });

            DagEdit.store({
                "operation": "XcalarApiJoin",
                "args": {
                    "source": [
                        "students5.index#K2855",
                        "students5.index#K2855"
                    ],
                    "dest": "gea#0",
                    "joinType": "innerJoin",
                    "columns": [],
                    "evalString": ""
                }
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            expect(keys.length).to.equal(1);

            expect(editInfo.structs[keys[0]].joinType).to.equal("innerJoin");
            expect(editInfo.structs[keys[0]].evalString).to.equal("");

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on union operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "union";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("union view should show", function(done) {
            var cachedFn = UnionView.show;
            var called = false;
            UnionView.show = function(tId, colNums, options) {
                // skip a parent because of index operation
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].value.name));
                expect(colNums.length).to.equal(1);

                expect(options.prefill.dest).to.equal(node.value.name.split("#")[0]);
                expect(options.prefill.dedup).to.be.false;

                expect(options.prefill.isDroppedTable[0]).to.be.false;
                expect(options.prefill.isDroppedTable[1]).to.be.false;
                expect(options.prefill.sourceTables[0]).to.equal(node.parents[0].value.name);
                expect(options.prefill.sourceTables[1]).to.equal(node.parents[0].value.name);
                expect(options.prefill.tableCols.length).to.equal(2);
                expect(options.prefill.tableCols[0].length).to.equal(1);
                expect(options.prefill.tableCols[1].length).to.equal(1);
                expect(options.prefill.tableCols[0][0].name).to.equal(mapColName);
                expect(options.prefill.tableCols[0][0].rename).to.equal(mapColName);
                expect(options.prefill.tableCols[0][0].type).to.equal("float");
                expect(options.prefill.tableCols[1][0].name).to.equal(mapColName);
                expect(options.prefill.tableCols[1][0].rename).to.equal(mapColName);
                expect(options.prefill.tableCols[1][0].type).to.equal("float");

                called = true;
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                UnionView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DagEdit.storeUnion should work", function() {
            var called = false;
            var unionCache = XIApi.union;
            XIApi.union = function() {
                return PromiseHelper.resolve();
            }
            var storeCache = DagEdit.store;
            DagEdit.store = function(struct) {
                expect(struct).to.equal("test2");
            };

            var transactionCache = Transaction.done;
            Transaction.done = function(id, options) {
                expect(Math.round(id)).to.not.equal(id);
                expect(options.noSql).to.be.true;
                called = true;
                return '"test1","test2",';
            };

            DagEdit.storeUnion();
            var info = DagEdit.getInfo();
            expect(Object.keys(info.insertedNodes).length).to.equal(1);
            for (var i in info.insertedNodes) {
                expect(info.insertedNodes[i].length).to.equal(1);
                expect(info.insertedNodes[i][0]).to.equal("test1");
            }

            XIApi.union = unionCache;
            DagEdit.store = storeCache;
            Transaction.done = transactionCache;
        });

        it("store should work", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    columns: [[mapColName], [mapColName]]
                }
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            // 2 structs, 1 index, 1 join
            expect(keys.length).to.equal(1);

            expect(editInfo.structs[keys[0]].columns.length).to.equal(2);
            expect(editInfo.structs[keys[0]].columns[0][0]).to.equal(mapColName);
            expect(editInfo.structs[keys[0]].columns[1][0]).to.equal(mapColName);

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    describe("DagEdit on project operation", function() {
        var node;
        var cachedFocusFn;
        before(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "project";
            }).closest(".operationTypeWrap").data("id");
            node = nodeIdMap[nodeId];

            var cachedFocusFn = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function() {
                return PromiseHelper.resolve({tableFromInactive: true});
            };
        });

        it("project view should show", function(done) {
            var cachedFn = ProjectView.show;
            var called = false;
            ProjectView.show = function(tId, colNums, options) {
                expect(tId).to.equal(xcHelper.getTableId(node.parents[0].value.name));
                expect(colNums.length).to.equal(2);
                expect(colNums[0]).to.equal(1);
                expect(colNums[1]).to.equal(4);
                expect(options.prefill.isDroppedTable).to.be.false;

                called = true;
            };

            DagEdit.editOp(node);

            UnitTest.testFinish(function() {
                return called;
            }, 10)
            .then(function() {
                ProjectView.show = cachedFn;
                var editInfo = DagEdit.getInfo();
                var keys = Object.keys(editInfo.editingTables);
                expect(keys.length).to.equal(1);
                expect(editInfo.editingTables[keys[0]]).to.equal("inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("store should work", function() {
            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            DagEdit.store({
                args: {
                    columns: [mapColName]
                }
            });

            editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.not.be.empty;
            var keys = Object.keys(editInfo.structs);
            // 2 structs, 1 index, 1 join
            expect(keys.length).to.equal(1);

            expect(editInfo.structs[keys[0]].columns.length).to.equal(1);
            expect(editInfo.structs[keys[0]].columns[0]).to.equal(mapColName);

            DagEdit.undoEdit(node);
            DagEdit.exitForm();

            var editInfo = DagEdit.getInfo();
            expect(editInfo.structs).to.be.empty;
            expect(editInfo.editingTables).to.be.empty;
        });

        after(function() {
            TblManager.findAndFocusTable = cachedFocusFn;
        });
    });

    // testing fail
    describe("run procedure function test", function() {
        it("run procedure should work", function() {
            var cachedFn = XcalarQueryWithCheck;
            XcalarQueryWithCheck = function(queryName, queryString) {
                var query = JSON.parse(queryString);
                expect(query.length).to.equal(11);
                expect(query[0].args.eval[0].evalString).to.equal("add(4,5)");
                var id = xcHelper.getTableId(query[0].args.dest);
                expect(parseInt(id)).to.equal(count);
                id = xcHelper.getTableId(query[10].args.dest);
                expect(parseInt(id)).to.equal(count + 10);

                return PromiseHelper.reject();
            };


            var edits = DagEdit.getInfo();

            expect(edits.structs).to.be.empty;
            // make edit to first map operation
            var $dagTable = Dag.getTableIconByName($dagWrap, firstMapName);
            var nodeId = $dagTable.data("index");

            // use find node by name to get the node or just create struct without it
            edits.structs[firstMapName] = {
                eval: [{evalString:"add(4,5)", "newField": "mapped"}]
            };

            var count = Authentication.getInfo().idCount;
            DagFunction.runProcedureWithParams(tableName, edits.structs, {});
            UnitTest.hasAlertWithTitle("Failed to rerun dataflow");

            XcalarQueryWithCheck = cachedFn;
        });
    });

    describe("checkIndexNodes function", function() {
        it("should add new node", function() {
            $dagWrap.find(".editBtn:visible").click();
            expect($dagWrap.hasClass("editMode")).to.be.true;

            var nodeId = $dagWrap.find(".operationTypeWrap").eq(0).data("id");
            var node = nodeIdMap[nodeId];

            var editInfo = DagEdit.getInfo();
            expect(editInfo.editingNode).to.be.null;
            expect(editInfo.newNodes).to.be.empty;

            editInfo.editingNode = node;

            var fn = DagEdit.__testOnly__.checkIndexNodes;
            var indexFields = ["test"];
            var indexNodes = [];

            fn(indexFields, indexNodes, 0);

            editInfo = DagEdit.getInfo();
            expect(editInfo.newNodes[tableName]).to.not.be.empty;
            expect(editInfo.newNodes[tableName].length).to.equal(1);
            expect(editInfo.newNodes[tableName][0].keys.length).to.equal(1);
            expect(editInfo.newNodes[tableName][0].keys[0].name).to.equal("test");
            expect(editInfo.newNodes[tableName][0].keys[0].keyFieldName).to.equal("test");
            expect(editInfo.newNodes[tableName][0].keys[0].ordering).to.equal("Unordered");
            expect(editInfo.newNodes[tableName][0].keys[0].type).to.equal("DfUnknown");
            expect(editInfo.newNodes[tableName][0].src).to.equal(node.parents[0].value.name);

            editInfo.descendantMap[tableName] = [];
            DagEdit.undoEdit(node);
            expect(editInfo.newNodes[tableName]).to.be.empty;
            expect(indexNodes.length).to.equal(0);
        });
    });

    describe("restoring after failure", function() {
        before(function() {
            DagEdit.off(null, true, true);
        });

        it("restore should work", function() {
            var called = false;
            var cachedFn = DagEdit.on;
            DagEdit.on = function() {
               called = true;
            };

            DagEdit.restore(xcHelper.getTableId(firstMapName));
            expect(called).to.be.false;

            DagEdit.restore(tableId);
            expect(called).to.be.true;

            DagEdit.on = cachedFn;
        });

        it("checkCanRestore should work", function() {
            expect(DagEdit.checkCanRestore(xcHelper.getTableId(firstMapName))).to.be.false;
            expect(DagEdit.checkCanRestore(tableId)).to.be.true;
            DagEdit.clearEdit();
            expect(DagEdit.checkCanRestore(tableId)).to.be.false;
        });
    });

    after(function() {
        DagEdit.off(null, true);
    });

    after(function(done) {
        UnitTest.removeOrphanTable()
        .always(function() {
            UnitTest.deleteAll(tableName, testDs)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        });
    });
});
