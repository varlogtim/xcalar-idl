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
                }], ["mapped"], aggName);
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
        });

        it("should toggle off", function() {
            expect($dagWrap.hasClass("editMode")).to.be.true;

            $dagWrap.find(".editBtn:visible").click();

            expect($dagWrap.find(".editBtn").length).to.equal(2);
            expect($dagWrap.find(".editBtn:visible").length).to.equal(1);

            expect($dagWrap.hasClass("editMode")).to.be.false;
            expect($("#container").hasClass("dfEditState")).to.be.false;
            expect($table.hasClass("editingDf")).to.be.false;
        });
    });

    describe("Map pre form on split operation", function() {
        before(function() {
            $dagWrap.find(".editBtn:visible").click();
        });

        it("map pre form should show", function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".actionType").data("id");
            var node = nodeIdMap[nodeId];

            var cachedFn = TblManager.findAndFocusTable;
            var called = false;
            TblManager.findAndFocusTable = function() {
                called = true;
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
        });

        it("clicking on row should prompt edit", function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".actionType").data("id");
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

        after(function() {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".actionType").data("id");
            var node = nodeIdMap[nodeId];
            DagEdit.undoEdit(node);
        });
    });

    describe("DagEdit on split column operation", function() {
        it("operations view should show", function(done) {
            var nodeId = $dagWrap.find(".typeTitle").filter(function() {
                return $(this).text() === "Split Column";
            }).closest(".actionType").data("id");
            var node = nodeIdMap[nodeId];

            var cachedFn = OperationsView.show;
            var called = false;
            OperationsView.show = function() {
                called = true;
            };

            var tId = xcHelper.getTableId(node.value.name);
            expect($("#xcTableWrap-" + tId).length).to.equal(0);
            DagEdit.editOp(node, {evalIndex: 0});

            UnitTest.testFinish(function() {
                return called;
            })
            .then(function() {
                expect($("#xcTableWrap-" + tId).length).to.equal(0);
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
