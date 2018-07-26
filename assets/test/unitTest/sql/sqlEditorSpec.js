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
    var editor;
    var queryText;
    before(function(){
        UnitTest.onMinMode();
        BottomMenu.close(true);
        queryText = SQLEditor.getEditor().getValue();
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
                    "name": "columnName1",
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
                    "backName": "DATA",
                    "sqlType": "string"
                }]
            },
            "test4": {
                "tableName": "testTable4LongName",
                "tableCols": [{
                    "backName": "DATA",
                    "sqlType": "string"
                },
                {
                    "name": "testColumn4LongName",
                    "backName": "testColumn",
                    "sqlType": "string"
                }]
            }
        };
        testStruct1 = {
            "tableName": "TESTSQLTABLE1",
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
        testStruct4 = {
            "tableName": "testSqlTable4LongName",
            "tableColumns": null
        };
    });

    describe("SQL Behavior Test", function() {
        it("should get editor", function() {
            editor = SQLEditor.getEditor();
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
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            $("#sqlExecute").click();
            expect(test).to.be.true;
            SQLCompiler = oldCompiler;
        });

        it("should show error message", function() {
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.reject(JSON.parse('{"readyState":4,' +
                    '"responseText":"","responseJSON":{"exceptionName":"org' +
                    '.apache.spark.sql.AnalysisException","exceptionMsg":"Ta' +
                    'ble or view not found: k; line 1 pos 14"},"status":500,' +
                    '"statusText":"Internal Server Error"}'));
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            $("#sqlExecute").click();
            expect($("#alertHeader").find(".text").text()).to.equal(SQLErrTStr.Err);
            SQLCompiler = oldCompiler;
            $("#alertModal").find(".cancel").click();
        });

        it("should show exception message", function() {
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    throw "Error";
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            $("#sqlExecute").click();
            expect($("#alertHeader").find(".text").text()).to.equal("Compilation Error");
            SQLCompiler = oldCompiler;
            $("#alertModal").find(".cancel").click();
        });

        it("should show stringify message", function() {
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.reject("test1", "test2");
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            $("#sqlExecute").click();
            expect($("#alertContent").find(".text").text()).to.equal('{"0":"test1","1":"test2"}');
            SQLCompiler = oldCompiler;
            $("#alertModal").find(".cancel").click();
        });
    });

    describe("Basic API Test", function() {
        it("Should getSchema", function() {
            var schema1 = SQLEditor.__testOnly__.getSchema("test1");
            var schema2 = SQLEditor.__testOnly__.getSchema("test2");
            var schema3 = SQLEditor.__testOnly__.getSchema("test3");
            var schema4 = SQLEditor.__testOnly__.getSchema("test4");
            expect(schema1.length).to.equal(2);
            expect(schema2.length).to.equal(2);
            expect(schema1[1].testColumn).to.equal("float");
            expect(schema2[1].testColumn).to.equal("string");
            testStruct1.tableColumns = schema1;
            testStruct2.tableColumns = schema2;
            testStruct3.tableColumns = schema3;
            testStruct4.tableColumns = schema4;
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
                return SQLEditor.updateSchema(testStruct4, "test4");
            })
            .then(function() {
                var unit = $sqlTableList.find(".unit");
                expect(unit.length).to.be.at.least(4);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should gen tables HTML", function() {
            SQLEditor.__testOnly__.genTablesHTML();
            expect($sqlTableList.find(".unit").length).to.be.at.least(4);
        })

        it("Should show hint", function() {
            var test = false;
            var oldShowHint = CodeMirror.showHint;
            CodeMirror.showHint = function() {
                test = true;
            }
            editor.execCommand("autocomplete");
            expect(test).to.be.true;
            CodeMirror.showHint = oldShowHint;
        })

        it("Should fail updateSchema if updateGTables fail", function(done) {
            var oldUpdateGTables = SQLEditor.__testOnly__.updateGTables;
            SQLEditor.__testOnly__.setUpdateGTables(function() {
                return PromiseHelper.reject();
            });
            SQLEditor.updateSchema(testStruct1, "test1")
            .then(function(ret) {
                done("fail");
            })
            .fail(function(ret) {
                done();
            })
            .always(function() {
                SQLEditor.__testOnly__.setUpdateGTables(oldUpdateGTables);
            });
        })

        it("Should show compile step", function(done) {
            var $sqlButton = $("#sqlExecute");
            expect($sqlButton.find(".text").text()).to.equal("EXECUTE SQL");
            expect($sqlButton.hasClass("btn-disabled")).to.be.false;
            SQLEditor.startCompile(1);
            expect($sqlButton.hasClass("btn-disabled")).to.be.true;
            expect($sqlButton.find(".text").text()).to.equal("Compiling... 0/1");
            SQLEditor.updateProgress();
            expect($sqlButton.find(".text").text()).to.equal("Compiling... 1/1");
            SQLEditor.fakeCompile(1000)
            .then(function() {
                //expect($sqlButton.find(".text").text()).to.equal("Compiling... 1000/1000");
                SQLEditor.startExecution();
                expect($sqlButton.find(".text").text()).to.equal("Executing... ");
                SQLEditor.resetProgress();
                expect($sqlButton.find(".text").text()).to.equal("EXECUTE SQL");
                done();
            })
            .fail(function() {
                done("fail");
            })
        })

        it("Should republishSchema", function(done) {
            var error = "Table or view not found: TESTSQLTABLE1;";
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.resolve();
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            SQLEditor.__testOnly__.setSQLTables({"TESTSQLTABLE1": "test1",
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

        it("Should republishSchema if session not found", function(done) {
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.reject({"readyState":4,"responseText":"{\"exceptionName\":\"java.util.NoSuchElementException\",\"exceptionMsg\":\"key not found: jiyuan1-wkbk-New%20Workbook\"}","responseJSON":{"exceptionName":"java.util.NoSuchElementException","exceptionMsg":"key not found: jiyuan1-wkbk-New%20Workbook"},"status":500,"statusText":"error"});
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            var oldRepublishSchemas = SQLEditor.__testOnly__.republishSchemas;
            SQLEditor.__testOnly__.setRepublishSchemas(function(query) {
                return PromiseHelper.resolve();
            });
            SQLEditor.executeSQL()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($("#alertModal").attr("style").indexOf("display: none;"))
                        .to.not.equal(-1);
                done();
            })
            .always(function() {
                SQLCompiler = oldCompiler;
                SQLEditor.__testOnly__.setRepublishSchemas(oldRepublishSchemas);
                SQLEditor.resetProgress();
            });
        });

        it("Should republishSchema if table not found", function(done) {
            var oldCompiler = SQLCompiler;
            SQLCompiler = function() {
                this.compile = function() {
                    return PromiseHelper.reject({"readyState":4,"responseText":"{\"exceptionName\":\"org.apache.spark.sql.AnalysisException\",\"exceptionMsg\":\"Table or view not found: testsqltable1; line 1 pos 14\"}","responseJSON":{"exceptionName":"org.apache.spark.sql.AnalysisException","exceptionMsg":"Table or view not found: testsqltable1; line 1 pos 14"},"status":500,"statusText":"Internal Server Error"});
                }
                this.setStatus = function() {
                    return;
                }
                this.getStatus = function() {
                    return 2;
                }
            };
            var oldRepublishSchemas = SQLEditor.__testOnly__.republishSchemas;
            SQLEditor.__testOnly__.setRepublishSchemas(function(query) {
                return PromiseHelper.resolve();
            });
            SQLEditor.executeSQL()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($("#alertModal").attr("style").indexOf("display: none;"))
                        .to.not.equal(-1);
                done();
            })
            .always(function() {
                SQLCompiler = oldCompiler;
                SQLEditor.__testOnly__.setRepublishSchemas(oldRepublishSchemas);
                SQLEditor.resetProgress();
            });
        });

        it("Should deleteSchema by tableName", function(done) {
            SQLEditor.deleteSchemas("TESTSQLTABLE1")
            .then(function() {
                expect($sqlTableList.find('.unit[data-name="TESTSQLTABLE1"]').length)
                    .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
        });

        it("Should deleteSchemas by tableId", function(done) {
            SQLEditor.deleteSchemas(null, ["test2"])
            .then(function() {
                expect($sqlTableList.find('.unit[data-name="testSqlTable2"]').length)
                    .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
        });

        it("Should not deleteSchemas if not find", function(done) {
            SQLEditor.deleteSchemas("notExist")
            .then(function(ret) {
                expect(ret).to.equal("Table doesn't exist");
                return SQLEditor.deleteSchemas(undefined, [-1]);
            })
            .then(function(ret) {
                expect(ret).to.equal("No schemas to delete");
                done();
            })
            .fail(function() {
                done("fail");
            })
        });

        it("Should focus on table column", function() {
            var oldGWFT = WSManager.getWSFromTable;
            var oldCFC = xcHelper.centerFocusedColumn;
            var oldTAFT = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function(input) {
                return PromiseHelper.resolve();
            }
            gTables["test4"].getAllCols = function() {
                return gTables["test4"].tableCols;
            }
            gTables["test4"].tableCols[0].isDATACol = function() {
                return true;
            }
            var tId, cNum;
            WSManager.getWSFromTable = function() {
                return 0;
            }
            xcHelper.centerFocusedColumn = function(tableId, colNum) {
                tId = tableId;
                cNum = colNum;
            }
            $sqlTableList.find('.unit[data-name="testSqlTable4LongName"]').click();
            SQLEditor.__testOnly__.focusOnTableColumn($sqlColumnList
                                        .find(".unit").closest("li"), "test4");
            expect(tId).to.equal("test4");
            expect(cNum).to.equal(2);
            WSManager.getWSFromTable = oldGWFT;
            xcHelper.centerFocusedColumn = oldCFC;
            TblManager.findAndFocusTable = oldTAFT;
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
            $searchTable.find("input").val("TESTSQLTABLE1").trigger("input");
            expect($sqlTableList.find(".unit:not(.xc-hidden)").length).to.equal(0);
            $searchTable.find("input").val("testSqlTable3").trigger("input");
            expect($sqlTableList.find(".unit:not(.xc-hidden)").length).to.equal(1);
        });

        it("Should select table", function() {
            var oldTAFT = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function(input) {
                return PromiseHelper.resolve();
            }
            expect($sqlColumnList.find(".unit").length).to.equal(0);
            expect($sqlTableList.find(".unit.selected").length).to.equal(0);
            $sqlTableList.find('.unit[data-name="testSqlTable3"]').click();
            expect($sqlTableList.find(".unit.selected").length).to.equal(1);
            expect($sqlColumnList.find(".unit").length).to.be.above(0);
            TblManager.findAndFocusTable = oldTAFT;
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

        it("Should search column", function() {
            $searchColumn.find("input").val("columnName10").trigger("input");
            expect($sqlColumnList.find(".unit:not(.xc-hidden)").length).to.equal(0);
            $searchColumn.find("input").val("columnName1").trigger("input");
            expect($sqlColumnList.find(".unit:not(.xc-hidden)").length).to.equal(1);
        });

        it("Should select column", function() {
            var oldFOTC = SQLEditor.__testOnly__.focusOnTableColumn;
            SQLEditor.__testOnly__.setFocusOnTableColumn(function(input) {
                return PromiseHelper.resolve();
            });
            $sqlColumnList.find('.unit[data-name="columnName1"]').click();
            SQLEditor.__testOnly__.setFocusOnTableColumn(oldFOTC);
        });

        it("Should unselect table", function() {
            $sqlSection.find(".schemaSection").trigger("click");
            expect($sqlColumnList.find(".unit").length).to.equal(0);
            expect($sqlTableList.find(".unit.selected").length).to.equal(0);
        });

        it("Should updateSchema of selected table", function(done) {
            var oldTAFT = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function(input) {
                return PromiseHelper.resolve();
            }
            $searchTable.find("input").val("").trigger("input");
            $sqlTableList.find('.unit[data-name="testSqlTable4LongName"]').click();
            expect($sqlColumnList.find(".type.icon").attr("data-original-title"))
                        .to.equal("String");
            gTables.test4.tableCols[0].sqlType = "Float";
            var schema4 = SQLEditor.__testOnly__.getSchema("test4");
            testStruct4.tableColumns = schema4;
            SQLEditor.updateSchema(testStruct4, "test4")
            .then(function() {
                expect($sqlColumnList.find(".type.icon")
                        .attr("data-original-title")).to.equal("Float");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                TblManager.findAndFocusTable = oldTAFT;
            });
        });

        it("Should deleteSchemas when selected table", function(done) {
            var oldTAFT = TblManager.findAndFocusTable;
            TblManager.findAndFocusTable = function(input) {
                return PromiseHelper.resolve();
            }
            $sqlTableList.find('.unit[data-name="testSqlTable3"]').click();
            SQLEditor.deleteSchemas(null, ["test4"])
            .then(function() {
                expect($sqlTableList.find('.unit[data-name="testSqlTable4LongName"]')
                        .length).to.equal(0);
                expect($sqlColumnList.find('.unit').length).to.equal(8);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                TblManager.findAndFocusTable = oldTAFT;
            });
        });

        it("Should deleteSchemas by click", function() {
            $sqlTableList.find('.unit[data-name="testSqlTable3"] .icon').click();
            expect($sqlTableList.find('.unit[data-name="testSqlTable3"]').length)
                    .to.equal(0);
        });

        it("Should deleteSchemas by click table not exist", function() {
            var html = '<li><div class="unit" data-name="' + 'errorTable' +
                                '" data-hashid = "' + '-1' + '">' +
                                '<span class="label">' + 'errorTable' + '</span>' +
                                '<i class="icon xi-trash fa-14"></i>' +
                            '</div></li>';
            $sqlTableList.append(html);
            $sqlTableList.find('.unit[data-name="errorTable"]').click();
            expect($sqlTableList.find('.unit[data-name="errorTable"]').length)
                    .to.equal(0);
            $("#alertModal").find(".confirm").click();
        });
    });

    describe("SQL Hotkey Function Test", function() {
        it("Should execute when executeTrigger", function() {
            var test = false;
            var oldexec = SQLEditor.executeSQL;
            SQLEditor.executeSQL = function() {
                test = true;
            }
            SQLEditor.__testOnly__.executeTrigger();
            expect(test).to.be.true;
            SQLEditor.executeSQL = oldexec;
        });

        it("CancelExec should stop execute", function() {
            var status = 1;
            var testCom = {};
            testCom.getStatus = function() {
                return status;
            }
            testCom.setStatus = function(num) {
                status = num;
            }
            SQLEditor.__testOnly__.setSqlComs([testCom]);
            SQLEditor.__testOnly__.cancelExec();
            expect(status).to.equal(-2);
        });

        it("Should convertTextCase", function() {
            editor.setValue("aBc,)1i");
            editor.setSelection({line: 0, ch: 0}, {line: 0, ch: 6});
            SQLEditor.__testOnly__.convertTextCase(true);
            expect(editor.getValue()).to.equal("ABC,)1i");
            editor.setSelection({line: 0, ch: 1}, {line: 0, ch: 7});
            SQLEditor.__testOnly__.convertTextCase(false);
            expect(editor.getValue()).to.equal("Abc,)1i");
        });

        it("Should toggleComment", function() {
            editor.setValue("firstline\n--secondline");
            editor.setSelection({line: 0, ch: 0}, {line: 1, ch: 6});
            SQLEditor.__testOnly__.toggleComment();
            expect(editor.getValue()).to.equal("--firstline\n----secondline");
            editor.setSelection({line: 1, ch: 0}, {line: 1, ch: 0});
            SQLEditor.__testOnly__.toggleComment();
            expect(editor.getValue()).to.equal("--firstline\n--secondline");
            editor.setSelection({line: 0, ch: 0}, {line: 1, ch: 0});
            SQLEditor.__testOnly__.toggleComment();
            expect(editor.getValue()).to.equal("firstline\nsecondline");
            editor.setSelection({line: 1, ch: 0}, {line: 1, ch: 0});
            SQLEditor.__testOnly__.toggleComment();
            expect(editor.getValue()).to.equal("firstline\n--secondline");
        });

        it("Should deleteAll", function() {
            editor.setValue("test");
            SQLEditor.__testOnly__.deleteAll();
            expect(editor.getValue()).to.equal("");
        });

        it("Should scrollLine", function() {
            editor.setValue("test\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
            + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
            + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
            var iniPos = editor.getScrollInfo().top;
            var lineHight = editor.defaultTextHeight()
            SQLEditor.__testOnly__.scrollLine(false);
            expect(editor.getScrollInfo().top).to.equal(iniPos + lineHight);
            SQLEditor.__testOnly__.scrollLine(true);
            expect(editor.getScrollInfo().top).to.equal(iniPos);
        });

        it("Should insertLine", function() {
            editor.setValue("line1\nline2\nline3\nline4");
            editor.setSelection({line: 1, ch: 0}, {line: 2, ch: 0});
            SQLEditor.__testOnly__.insertLine(true);
            expect(editor.getValue()).to.equal("line1\n\nline2\nline3\nline4");
            expect(editor.getCursor().line).to.equal(1);
            editor.setSelection({line: 3, ch: 0});
            SQLEditor.__testOnly__.insertLine(false);
            expect(editor.getValue()).to.equal("line1\n\nline2\nline3\n\nline4");
            expect(editor.getCursor().line).to.equal(4);
        });
    });

    after(function() {
        UnitTest.offMinMode();
        gTables = oldGTables;
        SQLEditor.__testOnly__.setUpdateKVStore(oldUpdateKVStore);
        SQLEditor.__testOnly__.setUpdatePlanServer(oldUpdatePlanServer);
        KVStore.commit = oldKVStoreCommit;
        SQLEditor.__testOnly__.setSQLTables(oldSQLTables);
        SQLEditor.getEditor().setValue(queryText);
    });
});