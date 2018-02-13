describe("Dataset-DSForm Test", function() {
    var $mainTabCache;
    var $statusBox;
    var $filePath;
    var $pathCard;

    before(function(){
        $statusBox = $("#statusBox");
        $filePath = $("#filePath");
        $pathCard = $("#dsForm-path");

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });

    describe("Baisc APi Test", function() {
        it("Should not see form", function() {
            DSForm.hide();
            assert.isFalse($("#dsFormView").is(":visible"));
        });

        it("should see Uploader in demo license", function() {
            var oldFunc = XVM.getLicenseMode;
            XVM.getLicenseMode = function() {
                return XcalarMode.Demo;
            };
            DSForm.show();
            assert.isTrue($("#dsFormView").is(":visible"));
            expect($("#dsForm-path").hasClass("xc-hidden")).to.be.true;
            expect($("#dsUploader").hasClass("xc-hidden")).to.be.false;
            XVM.getLicenseMode = oldFunc;
        });

        it("Should see form", function() {
            DSForm.show();
            assert.isTrue($("#dsFormView").is(":visible"));
            expect($("#dsForm-path").hasClass("xc-hidden")).to.be.false;
            expect($("#dsUploader").hasClass("xc-hidden")).to.be.true;
        });

        it("Should trigger show from importDataButton button", function() {
            DSForm.hide();
            $("#importDataButton").click();
            assert.isTrue($("#dsFormView").is(":visible"));
        });

        it("should reset form when call resetForm()", function() {
            $filePath.val("test");
            DSForm.__testOnly__.resetForm();
            expect($filePath.val()).to.be.empty;
        });

        it("should switch view", function() {
            // error case
            DSForm.switchView(null);
            assert.isTrue($pathCard.is(":visible"));

            var tests = [{
                "view": DSForm.View.Uploader,
                "$ele": $("#dsUploader")
            }, {
                "view": DSForm.View.Browser,
                "$ele": $("#fileBrowser")
            }, {
                "view": DSForm.View.Preview,
                "$ele": $("#dsForm-preview")
            }, {
                "view": DSForm.View.Parser,
                "$ele": $("#dsParser")
            }, {
                "view": DSForm.View.Path,
                "$ele": $pathCard
            }];

            tests.forEach(function(test) {
                DSForm.switchView(test.view);
                assert.isTrue(test.$ele.is(":visible"));
            });
        });
    });

    describe("Inner getter and setter test", function() {
        it("Should get file path", function() {
            $filePath.val("testPath");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath");

            // case to
            var oldFunc = DSTargetManager.isGeneratedTarget;
            DSTargetManager.isGeneratedTarget = function() {
                return true;
            };
            val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("testPath");
            DSTargetManager.isGeneratedTarget = oldFunc;
        });

        it("Should get and set protocol", function() {
            var cache = DSForm.__testOnly__.getDataTarget();
            var test = "testTarget";
            DSForm.__testOnly__.setDataTarget(test);
            var val = DSForm.__testOnly__.getDataTarget();
            expect(val).to.equal(test);

            // change back
            DSForm.__testOnly__.setDataTarget(cache);
            val = DSForm.__testOnly__.getDataTarget();
            expect(val).to.equal(cache);
        });
    });

    describe("Allow Browse and Preview Test", function() {
        it("should not allow empty target", function() {
            $("#dsForm-target .text").val("");
            var isValid = DSForm.__testOnly__.isValidPathToBrowse();
            expect(isValid).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should not allow preivew of empty path", function() {
            $("#dsForm-target .text").val("test");
            $filePath.val("");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should be valid with non-empty path", function() {
            $filePath.val("test");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("UI Behavior Test", function() {
        it("should select default shared root", function() {
            $('#dsForm-targetMenu li:contains(Default Shared Root)').trigger(fakeEvent.mouseup);
            expect($("#dsForm-target").find(".text").val()).to.equal("Default Shared Root");
        });

        it("Should click browse button to trigger browse", function() {
            var oldFunc = FileBrowser.show;
            var test = false;
            FileBrowser.show = function() {
                test = true;
            };

            $filePath.val("test");
            $pathCard.find(".browse").click();
            expect(test).to.be.true;
            FileBrowser.show = oldFunc;
        });

        it("Should click preview button to trigger preview", function() {
            var oldFunc = DSPreview.show;
            var test = false;
            DSPreview.show = function() {
                test = true;
            };

            $filePath.val("test");
            $pathCard.find(".confirm").click();
            expect(test).to.be.true;
            DSPreview.show = oldFunc;
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});
