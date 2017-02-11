describe("Dataset Form Test", function() {
    var $mainTabCache;
    var $statusBox;
    var $filePath;

    before(function(){
        $statusBox = $("#statusBox");
        $filePath = $("#filePath");

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });

    describe("Show Form Test", function() {
        it("Should not see form", function() {
            DSForm.hide();
            assert.isFalse($("#dsFormView").is(":visible"));
        });

        it("Should see form", function() {
            DSForm.show();
            assert.isTrue($("#dsFormView").is(":visible"));
        });

        it("Should trigger show from importDataButton button", function() {
            DSForm.hide();
            $("#importDataButton").click();
            assert.isTrue($("#dsFormView").is(":visible"));
        });
    });

    describe("Reset Form Test", function() {
        it("Should Reset Form When call resetForm()", function() {
            $filePath.val("test");
            DSForm.__testOnly__.resetForm();
            expect($filePath.val()).to.be.empty;
        });
    });

    describe("Reset Form Test2", function() {
        it("Should Use DSForm.clear() to reset", function(done) {
            $filePath.val("test");
            DSForm.clear()
            .then(function() {
                expect($filePath.val()).to.be.empty;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });
    });

    describe("Inner getter and setter test", function() {
        it("Should get file path", function() {
            var test = "testPath";
            $filePath.val(test);
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal(test);
        });

        it("Should get and set protocol", function() {
            var cache = DSForm.__testOnly__.getProtocol();
            var test = "testProtocol";
            DSForm.__testOnly__.setProtocol(test);
            var val = DSForm.__testOnly__.getProtocol();
            expect(val).to.equal(test);

            // change back
            DSForm.__testOnly__.setProtocol(cache);
            val = DSForm.__testOnly__.getProtocol();
            expect(val).to.equal(cache);
        });
    });

    describe("Allow Browse Test", function() {
        var isValidPathToBrowse;

        before(function() {
            isValidPathToBrowse = DSForm.__testOnly__.isValidPathToBrowse;
        });

        it("Should allow browse valid path", function() {
            var paths = [{
                "protocol": "nfs:///",
                "path": ""
            },{
                "protocol": "hdfs://",
                "path": "host/"
            },{
                "protocol": "file:///",
                "path": ""
            }];
            paths.forEach(function(pathObj) {
                var isValid = isValidPathToBrowse(pathObj.protocol, pathObj.path);
                expect(isValid).to.be.true;
                assert.isFalse($statusBox.is(":visible"), "no statux box");
            });
        });

        it("Should not allow browse of invalid path", function() {
            var paths = [{
                "protocol": "hdfs://",
                "path": "hostNoSlash"
            },{
                "protocol": "hdfs://",
                "path": ""
            }];
            paths.forEach(function(pathObj) {
                var isValid = isValidPathToBrowse(pathObj.protocol, pathObj.path);
                expect(isValid).to.be.false;
                assert.isTrue($statusBox.is(":visible"), "see statux box");

                $("#statusBoxClose").mousedown();
                assert.isFalse($statusBox.is(":visible"), "no statux box");
            });
        });
    });

    describe("Allow Preview Test", function() {
        beforeEach(function() {
            $("#statusBoxClose").mousedown();
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should not allow preivew of empty path", function() {
            $filePath.val("");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;

            // check status box
            assert.isTrue($statusBox.is(":visible"), "see statux box");
            assert.equal($statusBox.find(".message").text(), ErrTStr.NoEmpty);
        });

        it("Should be valid  with non-empty path", function() {
            $filePath.val("test");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;
            assert.isFalse($statusBox.is(":visible"), "no statux box");
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
