// TODO: Migrate this file to match the ts files.
// TODO: Some tests fails because of removed udf manager.
// fix them when apis and returned string pattern are finalized.
describe("UDF Test", function() {
    var waitTime = 200;
    var defaultModule = 'default';
    var defaultModulePath = defaultUDFPath;
    var syntaxErrror = 'Error: File "xcalar-udf-bd6bdef94f7eab4", line 14\ntest="a"\n    ^\nSyntaxError: invalid character in identifier';
    var $udfSection;
    var $udfManager;

    before(function(done) {
        var $tab = $("#udfTab");

        $udfSection = $("#udfSection");
        $udfManager = $("#udf-manager");
        UnitTest.onMinMode();
        UDFPanel.Instance.setupTest();
        UDFFileManager.Instance.setupTest();

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

    describe("UDF Setup check", () => {
        it("should initialize", (done) => {
            UnitTest.testFinish(() => {
                return !$("#udf-fnSection").hasClass("xc-disabled");
            })
            .then(() => {
                var udfs = UDFFileManager.Instance.getUDFs();
                var udfsObj = {};
                udfs.forEach((value, key) => {udfsObj[key] = value;});
                expect(udfsObj.hasOwnProperty(defaultUDFPath));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Basic Function Test", function() {
        it("isEditableUDF should work", function() {
            var isEditableUDF = UDFFileManager.Instance.__testOnly__.isEditableUDF;
            expect(isEditableUDF(defaultModule)).to.be.false;
            expect(isEditableUDF("test")).to.be.true;
        });

        it("getEntireUDF should work", function(done) {
            UDFFileManager.Instance.getEntireUDF(defaultModulePath)
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
            UDFFileManager.Instance.getEntireUDF("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("download should work", function(done) {
            var oldFunc = xcHelper.downloadAsFile;
            var test = null;
            xcHelper.downloadAsFile = function(moduleName, entireString) {
                test = entireString;
            };

            UDFFileManager.Instance.download(defaultModulePath)
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

        it("download should handle error case", function(done) {
            UDFFileManager.Instance.download("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
                done();
            });
        });

        it("parseSyntaxError should work", function() {
            var parseSyntaxError = UDFFileManager.Instance.__testOnly__.parseSyntaxError;
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
            var inputUDFFuncList = UDFPanel.Instance.__testOnly__.inputUDFFuncList;
            var module = xcHelper.randName("testModule");
            inputUDFFuncList(module);
            UnitTest.hasStatusBoxWithError(UDFTStr.NoTemplate);
            // case 2
            // inputUDFFuncList("default");
            // expect(UDFPanel.Instance.getEditor().getValue()).contains("convertFormats");
        });

        it("readUDFFromFile should work", function() {
            var readUDFFromFile = UDFPanel.Instance.__testOnly__.readUDFFromFile;
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

        // it("UDFPanel.Instance.selectUDFPath should work", function() {
        //     $("#udf-fnName").val("");
        //     UDFPanel.Instance.selectUDFPath("default");
        //     expect($("#udf-fnName").val()).to.equal("default");
        //     // clear up
        //     $("#udf-fnName").val("");
        // });
    });

    describe("Upload Error Handling Test", function() {
        var uploadUDF;
        var oldUploadFunc;

        before(function() {
            uploadUDF = UDFFileManager.Instance.__testOnly__.upload;
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
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        after(function() {
            XcalarUploadPython = oldUploadFunc;
        });
    });

    describe("UDF Public API Test", function() {
        it('UDFFileManager.Instance.getDefaultUDFPath should work', function() {
            expect(UDFFileManager.Instance.getDefaultUDFPath()).to.equal(defaultUDFPath);
        });

        it("UDFPanel.Instance.getEditor should work", function() {
            var editor = UDFPanel.Instance.getEditor();
            expect(editor instanceof CodeMirror).to.be.true;
        });

        it("UDFFileManager.Instance.getUDFs should work", function() {
            var udfs = UDFFileManager.Instance.getUDFs();
            expect(udfs).to.be.a("Map");
        });

        it("UDFFileManager.Instance.storePython should work", function() {
            var moduleName = xcHelper.randName("unittest");
            UDFFileManager.Instance.storePython(moduleName, "test");
            var udfs = UDFFileManager.Instance.getUDFs();
            var udfsObj = {};
            udfs.forEach((value, key) => {udfsObj[key] = value;});
            expect(udfsObj).to.have.ownProperty(moduleName);
        });

        it("UDFFileManager.Instance.list should work", function(done) {
            UDFFileManager.Instance.list()
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

        it("UDFPanel.Instance.clear should work", function() {
            UDFPanel.Instance.clear();
            var udfs = UDFFileManager.Instance.getUDFs();
            var udfsObj = {};
            udfs.forEach((value, key) => {udfsObj[key] = value;});
            expect(jQuery.isEmptyObject(udfsObj)).to.be.true;
        });

        it("UDFFileManager.Instance.initialize should handle error case", function(done) {
            var oldFunc = XcalarListXdfs;
            XcalarListXdfs = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            UDFFileManager.Instance.initialize()
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

        it("UDFFileManager.Instance.initialize should work", function(done) {
            UDFFileManager.Instance.initialize()
            .then(function() {
                var udfs = UDFFileManager.Instance.getUDFs();
                var udfsObj = {};
                udfs.forEach((value, key) => {udfsObj[key] = value;});
                expect(udfsObj).to.have.ownProperty(defaultModulePath);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("UDFFileManager.Instance.refresh should work", function(done) {
            var oldFunc = XcalarListXdfs;
            var editor = UDFPanel.Instance.getEditor();
            editor.setValue("test");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDFFileManager.Instance.refresh()
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
    });

    // TODO: to be removed
    /*
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
    */

    describe("Upload and Delete UDF Test", function() {
        var $fnName;
        var uploadModule;
        var editor;
        var func = "def test():\n" +
                   "\treturn \"a\"";

        before(function() {
            $fnName = $("#udf-fnName");
            uploadModule = xcHelper.randName("unittest");
            editor = UDFPanel.Instance.getEditor();
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