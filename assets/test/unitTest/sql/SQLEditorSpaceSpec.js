describe("SQLEditorSpace Test", function() {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });

    it("should refresh", function() {
        let oldFunc = SQLSnippet.Instance.listSnippetsAsync;
        let called = false;
        SQLSnippet.Instance.listSnippetsAsync = () => {
            called = true;
            return PromiseHelper.resolve();
        };
        SQLEditorSpace.Instance.refresh();
        expect(called).to.be.true;
        SQLSnippet.Instance.listSnippetsAsync = oldFunc;
    });

    it("should switchMode", function() {
        let isAdvMode = XVM.isAdvancedMode;
        XVM.isAdvancedMode = () => true;
        let oldSave = SQLSnippet.Instance.writeSnippet;
        let called = false;
        SQLSnippet.Instance.writeSnippet = () => { called = true; };

        SQLEditorSpace.Instance.switchMode();
        expect(called).to.be.true;

        SQLSnippet.Instance.writeSnippet = oldSave;
        XVM.isAdvancedMode = isAdvMode;
    });

    it("should save snippet", function(done) {
        let oldSave = SQLSnippet.Instance.writeSnippet;
        let called = false;
        SQLSnippet.Instance.writeSnippet = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        SQLEditorSpace.Instance.save()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            SQLSnippet.Instance.writeSnippet = oldSave;
        });
    });
    
    it("save should handle not set up case", function(done) {
        let oldEditor = SQLEditorSpace.Instance._sqlEditor;
        SQLEditorSpace.Instance._sqlEditor = null;

        let oldSave = SQLSnippet.Instance.writeSnippet;
        let called = false;
        SQLSnippet.Instance.writeSnippet = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        SQLEditorSpace.Instance.save()
        .then(function() {
            expect(called).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            SQLSnippet.Instance.writeSnippet = oldSave;
            SQLEditorSpace.Instance._sqlEditor = oldEditor;
        });
    });

    it("should clear SQL", function() {
        let editor = SQLEditorSpace.Instance._sqlEditor;
        editor.setValue("test");
        SQLEditorSpace.Instance.clearSQL();
        let val = editor.getValue();
        expect(val).to.be.empty;
    });

    it("should newSQL", function() {
        let editor = SQLEditorSpace.Instance._sqlEditor;
        SQLEditorSpace.Instance.clearSQL();
        let val;

        // case 1;
        SQLEditorSpace.Instance.newSQL("test");
        val = editor.getValue();
        expect(val).to.equal("test");

        // case2:
        SQLEditorSpace.Instance.newSQL("test2;");
        val = editor.getValue();
        expect(val).to.equal("test;\ntest2;");

        SQLEditorSpace.Instance.clearSQL();
    });

    describe("execute SQL Test", function() {
        let oldSendToPlanner;
        let oldAlert;

        before(function() {
            oldSendToPlanner = SQLUtil.sendToPlanner;
            oldAlert = Alert.show;
        });

        it("should not execute if no sql", function() {
            let called = 0;
            SQLUtil.sendToPlanner = () => {
                called++;
                return PromiseHelper.resolve();
            };
            Alert.show = () => { called++; };
    
            SQLEditorSpace.Instance.execute();
            expect(called).to.equal(0);
        });
    
        it("should handle invaidate data", function(done) {
            let called = false;
            let errorCalled = false;
            SQLUtil.sendToPlanner = () => {
                called = true;
                return PromiseHelper.resolve({});
            };
            Alert.show = () => { errorCalled = true };
    
            SQLEditorSpace.Instance.execute("test");
    
            UnitTest.testFinish(() => called)
            .then(function() {
                expect(errorCalled).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject no query case", function(done) {
            let called = false;
            let errorCalled = false;
            Alert.show = () => { errorCalled = true; };

            SQLUtil.sendToPlanner = () => {
                called = true;
                let ret = {
                    ret: [{
                        functions: {},
                        command: {type: "select"},
                        nonQuery: true
                    }]
                };
                return PromiseHelper.resolve(JSON.stringify(ret));
            };

            SQLEditorSpace.Instance.execute("test");

            UnitTest.testFinish(() => called)
            .then(function() {
                expect(errorCalled).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should show tables", function(done) {
            let oldShowTable = SQLResultSpace.Instance.showTables;
            let called = false;
            let showTableCalled = false;
            SQLResultSpace.Instance.showTables = () => { showTableCalled = true };

            SQLUtil.sendToPlanner = () => {
                called = true;
                let ret = {
                    ret: [{
                        functions: {},
                        command: {
                            type: "showTables"
                        }
                    }]
                };
                return PromiseHelper.resolve(JSON.stringify(ret));
            };

            SQLEditorSpace.Instance.execute("test");

            UnitTest.testFinish(() => called)
            .then(function() {
                expect(showTableCalled).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                SQLResultSpace.Instance.showTables = oldShowTable;
            });
        });

        it("should describe tables", function(done) {
            let oldShowSchema = SQLResultSpace.Instance.showSchema;
            let called = false;
            let oldGetTables = PTblManager.Instance.getTables;
            PTblManager.Instance.getTables = () => [{name: "A"}];
            let showSchemaCalled = false;
            SQLResultSpace.Instance.showSchema = () => { showSchemaCalled = true };

            SQLUtil.sendToPlanner = () => {
                called = true;
                let ret = {
                    ret: [{
                        functions: {},
                        command: {
                            type: "describeTable",
                            args: ["A"]
                        }
                    }]
                };
                return PromiseHelper.resolve(JSON.stringify(ret));
            };

            SQLEditorSpace.Instance.execute("test");

            UnitTest.testFinish(() => called)
            .then(function() {
                expect(showSchemaCalled).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                SQLResultSpace.Instance.showSchema = oldShowSchema;
                PTblManager.Instance.getTables = oldGetTables;
            });
        });

        it("should should describe tables error", function(done) {
            let oldShowSchemaError = SQLResultSpace.Instance.showSchemaError;
            let called = false;
            let oldGetTables = PTblManager.Instance.getTables;
            PTblManager.Instance.getTables = () => [];
            let showSchemaErrorCalled = false;
            SQLResultSpace.Instance.showSchemaError = () => { showSchemaErrorCalled = true };

            SQLUtil.sendToPlanner = () => {
                called = true;
                let ret = {
                    ret: [{
                        functions: {},
                        command: {
                            type: "describeTable",
                            args: ["A"]
                        }
                    }]
                };
                return PromiseHelper.resolve(JSON.stringify(ret));
            };

            SQLEditorSpace.Instance.execute("test");

            UnitTest.testFinish(() => called)
            .then(function() {
                expect(showSchemaErrorCalled).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                SQLResultSpace.Instance.showSchemaError = oldShowSchemaError;
                PTblManager.Instance.getTables = oldGetTables;
            });
        });

        after(function() {
            SQLUtil.sendToPlanner = oldSendToPlanner;
            Alert.show = oldAlert;
        });
    });

    it("should cancel execution", function() {
        let executor = new SQLDagExecutor({sql: "", command: {args: [], type: "select"}});
        SQLEditorSpace.Instance._executers.push(executor);

        SQLEditorSpace.Instance.cancelExecution();
        expect(executor.getStatus()).to.equal(SQLStatus.Cancelled);
    });

    it("_onLoadMode should work", function() {
        let timer = SQLEditorSpace.Instance._onLoadMode();
        expect(timer).not.to.be.null;
        clearTimeout(timer);
    });

    it("_offLoadMode", function() {
        let $section = SQLEditorSpace.Instance._getEditorSpaceEl();
        $section.addClass("loading");
        SQLEditorSpace.Instance._offLoadMode();
        expect($section.hasClass("loading")).to.be.false;
    });

    it("_getAutoCompleteHint should work", function() {
        let oldFunc = SQLResultSpace.Instance.getAvailableTables;
        let oldList = DagTabSQLFunc.listFuncs;
        SQLResultSpace.Instance.getAvailableTables = () => {
            return [{
                name: "A",
                columns: [{
                    name: "COL"
                }]
            }];
        };
        DagTabSQLFunc.listFuncs = () => ["a", "b", "c"];
        let res = SQLEditorSpace.Instance._getAutoCompleteHint();
        expect(res).to.be.an("object");
        expect(Object.keys(res).length).to.equal(5);
        SQLResultSpace.Instance.getAvailableTables = oldFunc;
        DagTabSQLFunc.listFuncs = oldList;
    });

    it("_getAutoCompleteHint should handle error casae", function() {
        let oldFunc = SQLResultSpace.Instance.getAvailableTables;
        SQLResultSpace.Instance.getAvailableTables = () => {
            throw "test";
        };
        let res = SQLEditorSpace.Instance._getAutoCompleteHint();
        expect(res).to.be.an("object");
        expect(Object.keys(res).length).to.equal(0);
        SQLResultSpace.Instance.getAvailableTables = oldFunc;
    });

    it("_getEditorSpaceEl should work", function() {
        let $el = SQLEditorSpace.Instance._getEditorSpaceEl();
        expect($el.length).to.equal(1);
    });

    it("_getTopBarEl should work", function() {
        let $el = SQLEditorSpace.Instance._getTopBarEl();
        expect($el.length).to.equal(1);
    });

    it("_executeAction should alert if there is executor", function() {
        let oldExecuters = SQLEditorSpace.Instance._executers;
        let oldShow = Alert.show;
        let called = false;
        Alert.show = () => { called = true; };
        SQLEditorSpace.Instance._executers = ["a"];
        SQLEditorSpace.Instance._executeAction();

        expect(called).to.be.true;
        Alert.show = oldShow;
        SQLEditorSpace.Instance._executers = oldExecuters;
    });

    it("should add and remove executor", function() {
        let oldExecuters = SQLEditorSpace.Instance._executers;
        SQLEditorSpace.Instance._executers = [];
        let executor = new SQLDagExecutor({sql: "", command: {args: [], type: "select"}});
        SQLEditorSpace.Instance._addExecutor(executor);
        expect(SQLEditorSpace.Instance._executers.length).to.equal(1);

        SQLEditorSpace.Instance._removeExecutor(executor);
        expect(SQLEditorSpace.Instance._executers.length).to.equal(0);

        SQLEditorSpace.Instance._executers = oldExecuters;
    });

    it("_showTable should work", function() {
        let oldFunc = SQLResultSpace.Instance.viewTable;
        let called = false;
        SQLResultSpace.Instance.viewTable = () => { called = true; };

        SQLEditorSpace.Instance._showTable("a#b", {columns: ["a"]});
        expect(called).to.be.true;
        SQLResultSpace.Instance.viewTable = oldFunc;
    });

    it("_showTable should handle error case", function() {
        let oldFunc = Alert.show;
        let called = false;
        Alert.show = () => { called = true; };

        SQLEditorSpace.Instance._showTable();
        expect(called).to.be.true;
        Alert.show = oldFunc;
    });

    it("should get snd set file name", function() {
        let oldFileName = SQLEditorSpace.Instance._getFileName();
        expect(oldFileName).to.be.a("string");

        let res;
        SQLEditorSpace.Instance._setFileName("test");
        res = SQLEditorSpace.Instance._getFileName();
        expect(res).to.equal("test");

        SQLEditorSpace.Instance._setFileName(oldFileName);
    });

    describe("Snippet Option Test", function() {
        it("should new snippet", function() {
            let oldSave = SQLEditorSpace.Instance._saveSnippet;
            let oldNew = SQLEditorSpace.Instance._newSnippet;
            let called = 0;

            SQLEditorSpace.Instance._saveSnippet = () => { called++; };
            SQLEditorSpace.Instance._newSnippet = () => { called++; };


            SQLEditorSpace.Instance._fileOption("new");
            expect(called).to.equal(2);

            SQLEditorSpace.Instance._saveSnippet = oldSave;
            SQLEditorSpace.Instance._newSnippet = oldNew;
        });

        it("should open snippet", function() {
            let oldOpen = SQLEditorSpace.Instance._openSnippet;
            let called = 0;

            SQLEditorSpace.Instance._openSnippet = () => { called++; };

            SQLEditorSpace.Instance._fileOption("open");
            expect(called).to.equal(1);

            SQLEditorSpace.Instance._openSnippet = oldOpen;
        });

        it("should saveAs snippet", function() {
            let oldSave = SQLEditorSpace.Instance._saveAsSnippet;
            let called = 0;

            SQLEditorSpace.Instance._saveAsSnippet = () => { called++; };


            SQLEditorSpace.Instance._fileOption("saveAs");
            expect(called).to.equal(1);

            SQLEditorSpace.Instance._saveAsSnippet = oldSave;
        });

        it("should delete snippet", function() {
            let oldDelete = SQLEditorSpace.Instance._deleteSnippet;
            let called = 0;

            SQLEditorSpace.Instance._deleteSnippet = () => { called++; };

            SQLEditorSpace.Instance._fileOption("delete");
            expect(called).to.equal(1);

            SQLEditorSpace.Instance._deleteSnippet = oldDelete;
        });

        it("should download snippet", function() {
            let oldDownload = SQLEditorSpace.Instance._downlodSnippet;
            let called = 0;

            SQLEditorSpace.Instance._downlodSnippet = () => { called++; };

            SQLEditorSpace.Instance._fileOption("download");
            expect(called).to.equal(1);

            SQLEditorSpace.Instance._downlodSnippet = oldDownload;
        });

        it("should not crash when filter will invalid option", function() {
            SQLEditorSpace.Instance._fileOption("test");
        });

        it("setSnippet should work", function() {
            let oldFile = SQLEditorSpace.Instance._getFileName();
            let oldFunc = SQLSnippet.Instance.getSnippet;
            SQLSnippet.Instance.getSnippet = () => "test";

            SQLEditorSpace.Instance.setSnippet("testFile");
            expect(SQLEditorSpace.Instance._getFileName()).to.equal("testFile");
            expect(SQLEditorSpace.Instance._sqlEditor.getValue()).to.equal("test");

            SQLEditorSpace.Instance._setFileName(oldFile);
            SQLEditorSpace.Instance._sqlEditor.setValue("");
            SQLSnippet.Instance.getSnippet = oldFunc;
        });

        describe("_renameWarning test", function() {
            let oldFile;

            before(function() {
                oldFile = SQLEditorSpace.Instance._getFileName();
            });

            it("should resolve if not untitled", function(done) {
                SQLEditorSpace.Instance._setFileName("test");
                SQLEditorSpace.Instance._renameWarning()
                .then(function() {
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should resolve if snippet is empty", function(done) {
                SQLEditorSpace.Instance._setFileName(CommonTxtTstr.Untitled);
                SQLEditorSpace.Instance._sqlEditor.setValue("");
                
                SQLEditorSpace.Instance._renameWarning()
                .then(function() {
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should warn correctly", function(done) {
                SQLEditorSpace.Instance._setFileName(CommonTxtTstr.Untitled);
                SQLEditorSpace.Instance._sqlEditor.setValue("");
                
                SQLEditorSpace.Instance._renameWarning()
                .then(function() {
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            after(function() {
                SQLEditorSpace.Instance._sqlEditor.setValue("");
                SQLEditorSpace.Instance._setFileName(CommonTxtTstr.oldFile);
            });
        });
    });
});