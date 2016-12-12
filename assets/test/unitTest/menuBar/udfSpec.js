describe("UDF Test", function() {
    var waitTime = 200;
    var defaultModule = "default";
    var syntaxErrror = "Error: [\"SyntaxError: ('invalid syntax', ('xcalar_udf_cdf', 12, 5, 'def :\\n'))\n\"]";
    var $udfSection;
    var $udfManager;

    before(function(done) {
        var $tab = $("#udfTab");

        $udfSection = $("#udfSection");
        $udfManager = $("#udf-manager");
        UnitTest.onMinMode();

        if (!$tab.hasClass("active")) {
            $tab.click();
            // wait for menu bar to open
            setTimeout(function() {
                done();
            }, waitTime);
        } else {
            done();
        }
    });

    describe("Basic Functoin Test", function() {
        it("isEditableUDF should work", function() {
            var isEditableUDF = UDF.__testOnly__.isEditableUDF;
            expect(isEditableUDF(defaultModule)).to.be.false;
            expect(isEditableUDF("test")).to.be.true;
        });

        it("getEntireUDF should work", function(done) {
            UDF.__testOnly__.getEntireUDF(defaultModule)
            .then(function(str) {
                expect(str).not.to.be.null;
                expect(str).to.be.a("string");
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("getEntireUDF should handle error", function(done) {
            UDF.__testOnly__.getEntireUDF("unitTestErrorModule")
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("downloadUDF should work", function(done) {
            var oldFunc = xcHelper.downloadAsFile;
            var test = null;
            xcHelper.downloadAsFile = function(moduleName, entireString) {
                test = entireString;
            };

            UDF.__testOnly__.downloadUDF(defaultModule)
            .then(function() {
                expect(test).not.to.be.null;
                expect(test).to.be.a("string");
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                xcHelper.downloadAsFile = oldFunc;
            });
        });

        it("downloadUDF should handle error case", function(done) {
            UDF.__testOnly__.downloadUDF("unitTestErrorModule")
            .then(function() {
                throw "error case";
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
                done();
            });
        });

        it("parseSytanxError should work", function() {
            var parseSytanxError = UDF.__testOnly__.parseSytanxError;
            // case 1
            var res = parseSytanxError(null);
            expect(res).to.be.null;
            // case 2
            res = parseSytanxError({"error": "abc"});
            expect(res).to.be.null;
            // case 3
            res = parseSytanxError({"error": "a,b,c,d"});
            expect(res).to.be.null;
            // case 4
            res = parseSytanxError({"error": "(a,b,c,d)"});
            expect(res).to.be.null;

            res = parseSytanxError({"error": syntaxErrror});
            expect(res).to.be.an("object");
            expect(res.reason).to.equal("\'invalid syntax\'");
            expect(res.line).to.equal(12);
        });
    });

    describe("Upload Error Handling Test", function() {
        var uploadUDF;
        var oldUploadFunc;

        before(function() {
            uploadUDF = UDF.__testOnly__.uploadUDF;
            oldUploadFunc = XcalarUploadPython;
        });

        it("Should handle uneditable error", function(done) {
            uploadUDF(defaultModule, "test")
            .then(function() {
                throw "error case";
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
            uploadUDF(moduleName, "test")
            .then(function() {
                throw "error case";
            })
            .fail(function() {
                expect($udfSection.find(".lint-error").length)
                .to.equal(0);
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        it("Should handle syntax error", function(done) {
            XcalarUploadPython = function() {
                return PromiseHelper.reject({
                    "error": syntaxErrror
                });
            };

            var moduleName = xcHelper.randName("unittest");
            uploadUDF(moduleName, "test")
            .then(function() {
                throw "error case";
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

    describe("Public Api Test", function() {
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
                throw "error case";
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
                expect(udfs).to.have.ownProperty(defaultModule);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });
    });

    describe("UDF Manager Behavior Test", function() {
        it("Should switch to manager tab", function() {
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            $tab.click();
            expect($tab.hasClass("active"));
            assert.isTrue($udfManager.is(":visible"));
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
                throw "error case";
            });
        });

        it("Should click edit button to edit udf", function() {
            var $udf = $udfManager.find(".udf:contains(" + defaultModule + ")");
            $udf.find(".edit").click();
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            expect($tab.hasClass("active")).to.be.false;
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

        it("Should choose template", function() {
            var $menu = $("#udf-fnMenu");
            $("#udf-fnList").trigger(fakeEvent.mouseup);
            assert.isTrue($menu.is(":visible"));
            $menu.find('li[name="blank"]').trigger(fakeEvent.mouseup);
            assert.isFalse($menu.is(":visible"));
        });

        it("Should not upload with empty module name", function() {
            editor.setValue(func);
            $fnName.val("");
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should not upload with long module name", function() {
            editor.setValue(func);
            // 256 a
            $fnName.val(new Array(257).join("a"));
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
            // 10485761 a
            if (window.isSystemMac) { // some machines cannot handle this test
                editor.setValue(new Array(10485762).join("a"));
                $fnName.val(uploadModule);
                $("#udf-fnUpload").click();

                UnitTest.hasStatusBoxWithError(ErrTStr.LargeFile);
            }
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
                throw "error case";
            });
        });

        it("Should alert when dup upload", function() {
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();
            UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF);
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
                throw "error case";
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