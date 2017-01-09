describe("xcFunctions Test", function() {
    var testDs;
    var tableName;
    var tableName2;
    var tableName3;
    var tableName4;
    var prefix;
    var tableId;
    var tableId3;

    describe("Project", function() {
        before(function(done) {
            UnitTest.onMinMode();
            var testDSObj = testDatasets.schedule;

            UnitTest.addAll(testDSObj, "schedule")
            .then(function(ds, tName, tPrefix) {
                testDs = ds;
                tableName = tName;
                prefix = tPrefix;
                tableId = xcHelper.getTableId(tableName);

                // remove "time" column
                ColManager.delCol([6], tableId)
                .then(function(){
                    // create 2 immediates and then delete the first one

                    xcFunction.map(1, tableId, "immediate1", "add(" + xcHelper.getPrefixColName(prefix, "class_id") + ", 2)")
                    .then(function(tName2) {
                        tableName2 = tName2;
                        var tId = xcHelper.getTableId(tableName2);
                        xcFunction.map(1, tId, "immediate2", "add(immediate1, 3)")
                        .then(function(tName3) {
                            tableName3 = tName3;
                            tableId3 = xcHelper.getTableId(tableName3);
                            ColManager.delCol([1], tableId3)
                            .then(done);
                        });
                    });
                });
            });
        });


        it("new table should have correct columns", function(done) {
            // check initial state
            var table = gTables[tableId3];
            var progCols = table.getAllCols();
            
            expect(table.hasCol("time")).to.be.false;
            expect(table.hasCol("immediate2", null, true)).to.be.false;
            expect(table.hasCol("immediate1", null, true)).to.be.true;
            expect(table.hasCol("class_id")).to.be.true;

            xcFunction.project(['immediate1', 'immediate2',
                xcHelper.getPrefixColName(prefix, 'class_id'),
                xcHelper.getPrefixColName(prefix, 'days'),
                xcHelper.getPrefixColName(prefix, 'duration'),
                xcHelper.getPrefixColName(prefix, 'student_ids'),
                xcHelper.getPrefixColName(prefix, 'teacher_id'),
                xcHelper.getPrefixColName(prefix, 'time'),
                ], tableId3)
            .then(function(newTableName){
                tableName4 = newTableName;
                table = gTables[xcHelper.getTableId(tableName4)];

                expect(table.hasCol("time")).to.be.false;
                expect(table.hasCol("immediate2", null, true)).to.be.false;
                expect(table.hasCol("immediate1", null, true)).to.be.true;
                expect(table.hasCol("class_id")).to.be.true;

                done();
            });
        });

        after(function(done) {
            XcalarDeleteTable(tableName)
            .then(function() {
                return XcalarDeleteTable(tableName2)
            })
            .then(function() {
                return XcalarDeleteTable(tableName3);
            })
            .always(function() {
                UnitTest.deleteAll(tableName4, testDs)
                .always(function() {
                    done();
                });
            });
        });
    });
});