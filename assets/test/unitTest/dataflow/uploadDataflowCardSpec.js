// skipping as dataflow 2.0 will move this feature to modeling panel
describe.skip("Upload Dataflow Test", function() {
    var $mainTabCache;
    var $card;
    var $retPath;
    var $dfName;

    before(function(done) {
        $card = $("#uploadDataflowCard");
        $retPath = $card.find("#retinaPath");
        $dfName = $card.find("#dfName");

        $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#modelingDataflowTab").click();
        }
        UnitTest.testFinish(function() {
            return $("#dagTabSectionTabs .dagTab").length !== 0;
        })
        .then(function() {
            done();
        })
        .fail( function(){
            done("fail");
        });
    });

    describe("Upload Dataflow Api Test", function() {
        it("should show the card", function() {
            UploadDataflowCard.show();
            assert.isTrue($card.is(":visible"));
        });

        it("should change the file path and check invalid case", function() {
            var retName = "test";
            retName = xcHelper.checkNamePattern("dataflow", "fix", retName);
            retName = xcHelper.uniqueName(retName, function(name) {
                return !DF.hasDataflow(name);
            });

            UploadDataflowCard.__testOnly__.changeFilePath("test.pdf");
            expect($retPath.val()).to.equal("test.pdf");
            expect($dfName.val()).to.equal(retName);
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.true;
            UnitTest.hasStatusBoxWithError(ErrTStr.RetinaFormat);
        });

        it("should change file path to valid case", function() {
            UploadDataflowCard.__testOnly__.changeFilePath("file.json");
            expect($retPath.val()).to.equal("file.json");
            expect($dfName.val()).to.equal("file");
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.false;
        });

        it("fakeBrowse btn should trigger real btn", function() {
            var clicked = false;
            $("#dataflow-browse").attr("type", "");
            $("#dataflow-browse").on("click.unitTest", function() {
                clicked = true;
            });
            $("#dataflow-fakeBrowse").click();
            expect(clicked).to.be.true;
            clicked = false;
            $("#retinaPath").mousedown();
            expect(clicked).to.be.true;
            $("#dataflow-browse").attr("type", "file");
        });

        it("should close the card", function() {
            $card.find(".close").click();
            assert.isFalse($card.is(":visible"));
        });
    });

    describe("Upload Dataflow Submit Test", function() {
        var oldReader;
        var oldImport;
        var oldList;
        var oldAddDF;
        var isAddDF = false;
        var oldShowSuccess = xcHelper.showSuccess;
        var successMsg = null;

        before(function() {
            var FakeFileReader = function() {
                return this;
            };
            //Fake version of the method we depend upon
            FakeFileReader.prototype.readAsBinaryString = function(file){
                var e = {"target": {"result": 'test'}};
                this.onload(e);
                return file;
            };
            FakeFileReader.prototype.onload = null;

            oldReader = FileReader;
            FileReader = FakeFileReader;

            oldImport = XcalarImportRetina;
            oldList = XcalarListRetinas;
            oldAddDF = DagList.Instance.uploadDag;
            oldShowSuccess = xcHelper.showSuccess;

            XcalarListRetinas = function() {
                return PromiseHelper.resolve({"retinaDescs": []});
            };

            DagList.Instance.uploadDag = function(name, dag) {
                isAddDF = true;
            };

            xcHelper.showSuccess = function(input) {
                successMsg = input;
            };

            UploadDataflowCard.show();
            UploadDataflowCard.__testOnly__.changeFilePath("file.json");
        });

        it("should handle empty name error", function(done) {
            $("#dfName").val("");

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
                done();
            });
        });

        it("should handle name error", function(done) {
            $("#dfName").val("invalid#name");

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.DFNameIllegal);
                done();
            });
        });

        it("should handle name duplicate error", function(done) {
            var name = "DupNameTest"
            var key = DagList.Instance.getKeyFromIndex(0);
            DagList.Instance.changeName(name, key);
            $("#dfName").val(name);
            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(DFTStr.DupDataflowName);
                done();
            });
        });

        it("should handle error case", function(done) {
            $("#dfName").val("file");

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(isAddDF).to.be.false;
                expect(successMsg).to.be.null;
                UnitTest.hasStatusBoxWithError(DFTStr.DFDrawError);
                done();
            });
        });

        it("should handle large file size error", function(done) {
            UploadDataflowCard.__testOnly__.changeFilePath("file.json");
            UploadDataflowCard.__testOnly__.setFile({size: 2 * MB});
            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(DSTStr.UploadLimit);

                UploadDataflowCard.__testOnly__.changeFilePath("file.json");
                UploadDataflowCard.__testOnly__.setFile({size: 1 * KB});
                done();
            });
        });

        it("should upload the df", function(done) {
            FileReader.prototype.readAsBinaryString = function(file){
                var e = {"target": {"result": '{"nodes":[],"display":{"width":-1,"height":-1}}'}};
                this.onload(e);
                return file;
            };
            $("#dfName").val("uploadTest");
            UploadDataflowCard.__testOnly__.submitForm()
            .then(() => {
                expect(isAddDF).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            FileReader = oldReader;
            XcalarImportRetina = oldImport;
            XcalarListRetinas = oldList;
            DagList.Instance.uploadDag = oldAddDF;
            xcHelper.showSuccess = oldShowSuccess;
        });
    });

    after(function() {
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $mainTabCache.click();
        }
    });
});