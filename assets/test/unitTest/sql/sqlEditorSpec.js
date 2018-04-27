describe("SQLEditor Test", function() {
    var $sqlButton = $("#sqlExecute");
    var $sqlSection = $("#sqlSection");
    var $searchTable = $("#sqlTableSearch");
    var $searchColumn = $("#sqlColumnSearch");
    var $sqlTableList = $("#sqlTableList");
    var $sqlColumnList = $("#sqlColumnList");
    var testStruct1;
    var testStruct2;
    var oldGTables;
    var oldUpdateKVStore;
    var oldKVStoreCommit;
    before(function(){
        UnitTest.onMinMode();
        oldGTables = gTables;
        oldSQLTables = SQLEditor.__testOnly__.getSQLTables();
        oldUpdateKVStore = SQLEditor.__testOnly__.updateKVStore;
        oldUpdatePlanServer = SQLEditor.__testOnly__.updatePlanServer;
        SQLEditor.__testOnly__.setUpdateKVStore(function() {
            return PromiseHelper.resolve();
        });
        SQLEditor.__testOnly__.setUpdatePlanServer(function() {
            return PromiseHelper.resolve();
        });
        oldKVStoreCommit = KVStore.commit;
        KVStore.commit = function() {
            return PromiseHelper.resolve();
        };
        gTables = {
            "test1": {
                "tableName": "testTable1",
                "tableCols": [{
                    "backName": "testColumn",
                    "sqlType": "float"
                }]
            },
            "test2": {
                "tableName": "testTable2",
                "tableCols": [{
                    "backName": "testColumn",
                    "sqlType": "string"
                }]
            },
            "test3": {
                "tableName": "testTable3",
                "tableCols": [
                {
                    "backName": "testColumn1",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn2",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn3",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn4",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn5",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn6",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn7",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn8",
                    "sqlType": "string"
                },
                {
                    "backName": "testColumn9",
                    "sqlType": "string"
                }]
            }
        };
        testStruct1 = {
            "tableName": "testSqlTable1",
            "tableColumns": null
        };
        testStruct2 = {
            "tableName": "testSqlTable2",
            "tableColumns": null
        };
        testStruct3 = {
            "tableName": "testSqlTable3",
            "tableColumns": null
        };
    });

    describe("SQL Behavior Test", function() {
        it("should get editor", function() {
            var editor = SQLEditor.getEditor();
            expect(editor instanceof CodeMirror).to.be.true;
        });

        it("should click to execute sql", function() {
            var oldCompiler = SQLCompiler;
            var test = false;
            SQLCompiler = function() {
                this.compile = function() {
                    test = true;
                    return PromiseHelper.resolve();
                }
            };
            $("#sqlExecute").click();
            expect(test).to.be.true;
            SQLCompiler = oldCompiler;
        });
    });

    describe("Basic API Test", function() {
        it("Should getSchema", function() {
            var schema1 = SQLEditor.__testOnly__.getSchema("test1");
            var schema2 = SQLEditor.__testOnly__.getSchema("test2");
            var schema3 = SQLEditor.__testOnly__.getSchema("test3");
            expect(schema1.length).to.equal(2);
            expect(schema2.length).to.equal(2);
            expect(schema1[1].testColumn).to.equal("float");
            expect(schema2[1].testColumn).to.equal("string");
            testStruct1.tableColumns = schema1;
            testStruct2.tableColumns = schema2;
            testStruct3.tableColumns = schema3;
        });

        it("Should updateSchema", function(done) {
            SQLEditor.updateSchema(testStruct1, "test1")
            .then(function() {
                return SQLEditor.updateSchema(testStruct2, "test2");
            })
            .then(function() {
                return SQLEditor.updateSchema(testStruct3, "test3");
            })
            .then(function() {
                var unit = $sqlTableList.find(".unit");
                expect(unit.length).to.be.at.least(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should republishSchema", function(done) {
            var error = "Table or view not found: testSqlTable1;";
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.resolve();
                };
            };
            SQLEditor.__testOnly__.setSQLTables({"testSqlTable1": "test1",
                                                 "testSqlTable2": "test2",
                                                 "testSqlTable3": "test3"});
            SQLEditor.__testOnly__.republishSchemas()
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                SQLCompiler = oldCompiler;
            });
        });

        it("Should deleteSchema by tableName", function(done) {
            SQLEditor.deleteSchema("testSqlTable1")
            .then(function() {
                expect($sqlTableList.find('.unit[data-name="testSqlTable1"]').length)
                    .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
        });

        it("Should deleteSchema by tableId", function(done) {
            SQLEditor.deleteSchema(null, "test2")
            .then(function() {
                expect($sqlTableList.find('.unit[data-name="testSqlTable2"]').length)
                    .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
        });
    });

    describe("SQL UX Test", function() {
        before(function() {
            // Open SQL tab
            $("#sqlTab").click();
        });

        it("Should minmize schemaSection", function(done) {
            var $editorSection = $sqlSection.find(".editSection");
            var editorHeight = $editorSection.height();
            $sqlSection.find(".pulloutTab").click();
            // 200 ms animation
            setTimeout(function() {
                expect($editorSection.height()).to.be.above(editorHeight);
                done();
            }, 200);
        });

        it("Should restore schemaSection", function(done) {
            var $editorSection = $sqlSection.find(".editSection");
            var editorHeight = $editorSection.height();
            $sqlSection.find(".pulloutTab").click();
            // 200 ms animation
            setTimeout(function() {
                expect($editorSection.height()).to.be.below(editorHeight);
                done();
            }, 200);
        });

        it("Should search", function() {
            $searchTable.find("input").val("testSqlTable1").trigger("input");
            expect($sqlTableList.find(".unit:not(.xc-hidden)").length).to.equal(0);
            $searchTable.find("input").val("testSqlTable3").trigger("input");
            expect($sqlTableList.find(".unit:not(.xc-hidden)").length).to.equal(1);
        });

        it("Should select table", function() {
            expect($sqlColumnList.find(".unit").length).to.equal(0);
            expect($sqlTableList.find(".unit.selected").length).to.equal(0);
            $sqlTableList.find('.unit[data-name="testSqlTable3"]').click();
            expect($sqlTableList.find(".unit.selected").length).to.equal(1);
            expect($sqlColumnList.find(".unit").length).to.be.above(0);
        });

        it("Should scroll", function(done) {
            $sqlSection.find(".columns .scrollDown").trigger("mouseenter");
            setTimeout(function() {
                expect($sqlColumnList.scrollTop()).to.be.above(0);
                var scrollTop = $sqlColumnList.scrollTop();
                $sqlSection.find(".columns .scrollUp").trigger("mouseenter");
                setTimeout(function() {
                    expect($sqlColumnList.scrollTop()).to.be.below(scrollTop);
                    $sqlSection.find(".columns .scrollArea").trigger("mouseleave");
                    done();
                }, 20);
            }, 20);
        });

        it("Should unselect table", function() {
            $sqlSection.find(".schemaSection").trigger("click");
            expect($sqlColumnList.find(".unit").length).to.equal(0);
            expect($sqlTableList.find(".unit.selected").length).to.equal(0);
        });
    });

    after(function() {
        UnitTest.offMinMode();
        gTables = oldGTables;
        SQLEditor.__testOnly__.setUpdateKVStore(oldUpdateKVStore);
        SQLEditor.__testOnly__.setUpdatePlanServer(oldUpdatePlanServer);
        KVStore.commit = oldKVStoreCommit;
        SQLEditor.__testOnly__.setSQLTables(oldSQLTables);
    });
});