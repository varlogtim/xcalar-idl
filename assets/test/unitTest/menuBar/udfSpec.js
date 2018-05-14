describe("UDF Test", function() {
    var waitTime = 200;
    var defaultModule = 'default';
    var defaultModulePath = '/workbook/udf/default';
    var syntaxErrror = "error: 'invalid syntax' at line 12 column 5";
    var $udfSection;
    var $udfManager;

    before(function(done) {
        var $tab = $("#udfTab");

        $udfSection = $("#udfSection");
        $udfManager = $("#udf-manager");
        UnitTest.onMinMode();

        if (!$tab.hasClass("active")) {
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                $tab.click();
                return (UnitTest.testFinish(function() {
                    return !$("#menuBar").hasClass("animating");
                }));
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done(); // still let the test go
            });
        } else {
            done();
        }
    });

    describe("Basic Function Test", function() {
        it("isEditableUDF should work", function() {
            var isEditableUDF = UDF.__testOnly__.isEditableUDF;
            expect(isEditableUDF(defaultModule)).to.be.false;
            expect(isEditableUDF("test")).to.be.true;
        });

        it("getEntireUDF should work", function(done) {
            UDF.__testOnly__.getEntireUDF(defaultModulePath)
            .then(function(str) {
                expect(str).not.to.be.null;
                expect(str).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getEntireUDF should handle error", function(done) {
            UDF.__testOnly__.getEntireUDF("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("UDF.download should work", function(done) {
            var oldFunc = xcHelper.downloadAsFile;
            var test = null;
            xcHelper.downloadAsFile = function(moduleName, entireString) {
                test = entireString;
            };

            UDF.download(defaultModulePath)
            .then(function() {
                expect(test).not.to.be.null;
                expect(test).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcHelper.downloadAsFile = oldFunc;
            });
        });

        it("UDF.download should handle error case", function(done) {
            UDF.download("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
                done();
            });
        });

        it("parseSyntaxError should work", function() {
            var parseSyntaxError = UDF.__testOnly__.parseSyntaxError;
            // case 1
            var res = parseSyntaxError(null);
            expect(res).to.be.null;
            // case 2
            res = parseSyntaxError({"error": "abc"});
            expect(res).to.be.null;
            // case 3
            res = parseSyntaxError({"error": "a,b,c,d"});
            expect(res).to.be.null;
            // case 4
            res = parseSyntaxError({"error": "(a,b,c,d)"});
            expect(res).to.be.null;

            res = parseSyntaxError({"error": "error: 'invalid syntax' at line 12 column 1"});
            expect(res).to.be.an("object");
            expect(res.reason).to.equal("invalid syntax");
            expect(res.line).to.equal(12);
        });

        it("inputUDFFuncList should work", function() {
            var inputUDFFuncList = UDF.__testOnly__.inputUDFFuncList;
            var module = xcHelper.randName("testModule");
            inputUDFFuncList(module);
            UnitTest.hasStatusBoxWithError(UDFTStr.NoTemplate);
            // case 2
            // inputUDFFuncList("default");
            // expect(UDF.getEditor().getValue()).contains("convertFormats");
        });

        it("readUDFFromFile should work", function() {
            var readUDFFromFile = UDF.__testOnly__.readUDFFromFile;
            var oldReader = FileReader;

            FileReader = function() {
                this.onLoad = function() {};
                this.readAsText = function() {};
            };

            readUDFFromFile("testFile", "testModule");
            expect($("#udf-fnName").val()).to.equal("testModule");
            // clear up
            $("#udf-fnName").val("");
            FileReader = oldReader;
        });

        // it("UDF.selectUDFFuncList should work", function() {
        //     $("#udf-fnName").val("");
        //     UDF.selectUDFFuncList("default");
        //     expect($("#udf-fnName").val()).to.equal("default");
        //     // clear up
        //     $("#udf-fnName").val("");
        // });
    });

    describe("Upload Error Handling Test", function() {
        var uploadUDF;
        var oldUploadFunc;

        before(function() {
            uploadUDF = UDF.__testOnly__.uploadUDF;
            oldUploadFunc = XcalarUploadPython;
        });

        it("Should handle uneditable error", function(done) {
            uploadUDF(defaultModule, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(SideBarTStr.OverwriteErr);
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        it("Should handle normal error", function(done) {
            XcalarUploadPython = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            var moduleName = xcHelper.randName("unittest");
            uploadUDF(moduleName, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($udfSection.find(".lint-error").length)
                .to.equal(0);
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        it("Should handle syntax error", function(done) {
            if (isBrowserMicrosoft) {
                done();
                return;
            }
            XcalarUploadPython = function() {
                return PromiseHelper.reject({
                    "error": syntaxErrror
                });
            };

            var moduleName = xcHelper.randName("unittest");
            uploadUDF(moduleName, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($udfSection.find(".lint-error").length)
                .to.above(0);
                UnitTest.hasAlertWithTitle(SideBarTStr.SyntaxError);
                done();
            });
        });

        after(function() {
            XcalarUploadPython = oldUploadFunc;
        });
    });

    describe("UDF Public API Test", function() {
        it("UDF.getEditor should work", function() {
            var editor = UDF.getEditor();
            expect(editor instanceof CodeMirror).to.be.true;
        });

        it("UDF.getUDFs should work", function() {
            var udfs = UDF.getUDFs();
            expect(udfs).to.be.an("object");
        });

        it("UDF.storePython should work", function() {
            var moduleName = xcHelper.randName("unittest");
            UDF.storePython(moduleName, "test");
            var udfs = UDF.getUDFs();
            expect(udfs).to.have.ownProperty(moduleName);
        });

        it("UDF.list should work", function(done) {
            UDF.list()
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res).to.have.property("fnDescs");
                expect(res).to.have.property("numXdfs");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("UDF.clear should work", function() {
            UDF.clear();
            var udfs = UDF.getUDFs();
            expect(jQuery.isEmptyObject(udfs)).to.be.true;
        });

        it("UDF.initialize should handle error case", function(done) {
            var oldFunc = XcalarListXdfs;
            XcalarListXdfs = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            UDF.initialize()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("UDF.initialize should work", function(done) {
            UDF.initialize()
            .then(function() {
                var udfs = UDF.getUDFs();
                expect(udfs).to.have.ownProperty(defaultModulePath);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("UDF.refreshWithoutClearing should work", function(done) {
            var oldFunc = XcalarListXdfs;
            var editor = UDF.getEditor();
            editor.setValue("test");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDF.refreshWithoutClearing()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(editor.getValue()).to.equal("test");
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("UDF.refresh should work", function(done) {
            var oldFunc = XcalarListXdfs;
            var editor = UDF.getEditor();
            editor.setValue("test2");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDF.refresh()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(editor.getValue()).not.to.equal("test2");
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });
    });

    describe("UDF Manager Behavior Test", function() {
        it("Should switch to manager tab", function() {
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            $tab.click();
            expect($tab.hasClass("active"));
            // assert.isTrue($udfManager.is(":visible"));
        });

        it("Should refersh udf", function(done) {
            $udfManager.find(".refresh").click();
            expect($udfManager.hasClass("loading")).to.be.true;
            var checkFunc = function() {
                return !$udfManager.hasClass("loading");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click edit button to edit udf", function() {
            var $udf = $udfManager.find(".udf:contains(" + defaultModule + ")");
            $udf.find(".edit").click();
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            expect($tab.hasClass("active")).to.be.false;
        });

        it("should click to trigger download UDF", function() {
            var udfName = xcHelper.randName("testUDF");
            var $udf = $('<div class="udf">' +
                            '<div class="text">' + udfName + '</div>' +
                            '<div class="download"></div>' +
                        '</div>');
            $udfManager.append($udf);
            $udf.find(".download").click();
            UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
            // clear up
            $udf.remove();
        });
    });

    describe("Upload and Delete UDF Test", function() {
        var $fnName;
        var uploadModule;
        var editor;
        var func = "def test():\n" +
                   "\treturn \"a\"";

        before(function() {
            $fnName = $("#udf-fnName");
            uploadModule = xcHelper.randName("unittest");
            editor = UDF.getEditor();
        });

        it("should in a workbook", function() {
            var wkbk = WorkbookManager.getWorkbook(WorkbookManager.getActiveWKBK());
            expect(wkbk).not.to.be.null;
            var wkbkName = wkbk.getName();
            if (sessionName !== wkbkName) {
                console.warn("wrong session name");
                setSessionName(wkbkName);
            }
        });

        it("Should choose template", function() {
            var $menu = $("#udf-fnMenu");
            $("#udf-fnList").trigger(fakeEvent.click);
            expect($menu.hasClass("openList")).to.be.true;
            $menu.find('li[name="blank"]').trigger(fakeEvent.mouseup);
            expect($menu.hasClass("openList")).to.be.false;
        });

        it("Should not upload with empty module name", function() {
            editor.setValue(func);
            $fnName.val("");
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should not upload with invalid module name", function() {
            editor.setValue(func);
            $fnName.val("123ab");
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(UDFTStr.InValidName);
        });

        it("Should not upload with long module name", function() {
            editor.setValue(func);
            $fnName.val(new Array(XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen + 2).join("a"));
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.LongFileName);
        });

        it("Should not upload empty module", function() {
            editor.setValue("");
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyFn);
        });

        it("Should not upload with long module", function() {
            var oldLen = XcalarApisConstantsT.XcalarApiMaxUdfSourceLen;
            XcalarApisConstantsT.XcalarApiMaxUdfSourceLen = 10;

            editor.setValue("a".repeat(11));
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.LargeFile);
            XcalarApisConstantsT.XcalarApiMaxUdfSourceLen = oldLen;
        });

        it("Should upload udf", function(done) {
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnName").trigger(fakeEvent.enter);

            var checkFunc = function() {
                var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
                return $udf.length > 0;
            };

            var numUDF = Number($udfManager.find(".numUDF").text());

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var curNum = Number($udfManager.find(".numUDF").text());
                expect(curNum).to.equal(numUDF + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should alert when dup upload", function() {
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();
            UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF);
        });

        it("Should update with new func", function(done) {
            var oldFunc = XcalarUpdatePython;
            var updated = false;
            XcalarUpdatePython = function() {
                updated = true;
                return PromiseHelper.resolve();
            };
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();

            var checkFunc = function() {
                return updated === true;
            };

            UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF, {"confirm": true});
            UnitTest.testFinish(checkFunc)
            .then(function() {
                XcalarUpdatePython = oldFunc;
                done();
            });
        });

        it("should handle delet udf fails case", function(done) {
            var oldDelete = XcalarDeletePython;
            var test = false;
            XcalarDeletePython = function() {
                test = true;
                return PromiseHelper.reject({"error": "test"});
            };

            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            var checkFunc = function() {
                return test === true;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDeletePython = oldDelete;
            });
        });

        it("should handle delet udf fails case 2", function(done) {
            var oldDelete = XcalarDeletePython;
            var oldList = XcalarListXdfs;
            var test = false;
            XcalarDeletePython = function() {
                test = true;
                return PromiseHelper.reject({
                    "status": StatusT.StatusUdfModuleNotFound
                });
            };

            XcalarListXdfs = function() {
                return PromiseHelper.resolve({
                    "numXdfs": 1
                });
            };

            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            var checkFunc = function() {
                return test === true;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDeletePython = oldDelete;
                XcalarListXdfs = oldList;
            });
        });

        it("should handle delet udf fails case 3", function(done) {
            var oldDelete = XcalarDeletePython;
            var oldList = XcalarListXdfs;
            var test = false;
            XcalarDeletePython = function() {
                test = true;
                return PromiseHelper.reject({
                    "status": StatusT.StatusUdfModuleNotFound
                });
            };

            XcalarListXdfs = function() {
                return PromiseHelper.reject("test");
            };

            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            var checkFunc = function() {
                return test === true;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDeletePython = oldDelete;
                XcalarListXdfs = oldList;
            });
        });

        it("Should delete udf", function(done) {
            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true
            });

            var checkFunc = function() {
                var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
                return $udf.length === 0;
            };

            var numUDF = Number($udfManager.find(".numUDF").text());

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var curNum = Number($udfManager.find(".numUDF").text());
                expect(curNum).to.equal(numUDF - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function(done) {
        $("#udfTab").click();
        UnitTest.offMinMode();
        // wait for menu bar to open
        setTimeout(function() {
            done();
        }, waitTime);
    });
});