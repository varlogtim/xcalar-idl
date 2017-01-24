describe("File Previewer Test", function() {
    var $mainTabCache;
    var $fileBrowserPreview;

    before(function() {
        $fileBrowserPreview = $("#fileBrowserPreview");

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    describe("Previewer Id Test", function() {
        it("Should set previewer id", function() {
            FilePreviewer.__testOnly__.setPreviewerId();
            expect($fileBrowserPreview.data("id")).not.to.be.null;
        });

        it("Should get previewer id", function() {
            var id = FilePreviewer.__testOnly__.getPreviewerId();
            expect(id).to.equal($fileBrowserPreview.data("id"));
        });

        it("Should test valid id", function() {
            var id = FilePreviewer.__testOnly__.getPreviewerId();
            // case 1
            var valid = FilePreviewer.__testOnly__.isValidId(id);
            expect(valid).to.be.true;
            // case 2
            valid = FilePreviewer.__testOnly__.isValidId(123);
            expect(valid).to.be.false;
        });
    });

    describe("Previewer View Mode Test", function() {
        it("Should enter hex mode", function() {
            FilePreviewer.__testOnly__.inHexMode();
            expect(FilePreviewer.__testOnly__.isInHexMode()).to.be.true;
            expect($fileBrowserPreview.hasClass("loading")).to.be.false;
            expect($fileBrowserPreview.hasClass("error")).to.be.false;
        });

        it("Should enter preview mode", function() {
            FilePreviewer.__testOnly__.inPreviewMode();
            expect(FilePreviewer.__testOnly__.isInHexMode()).to.be.false;
            expect($fileBrowserPreview.hasClass("loading")).to.be.false;
            expect($fileBrowserPreview.hasClass("error")).to.be.false;
        });

        it("Should enter error mode", function() {
            FilePreviewer.__testOnly__.inErrorMode();
            expect($fileBrowserPreview.hasClass("loading")).to.be.false;
            expect($fileBrowserPreview.hasClass("error")).to.be.true;
        });

        it("Should enter load mode", function(done) {
            FilePreviewer.__testOnly__.inLoadMode();
            // the enter load mode need 1s
            setTimeout(function() {
                expect($fileBrowserPreview.hasClass("loading")).to.be.true;
                expect($fileBrowserPreview.hasClass("error")).to.be.false;
                done();
            }, 1500);
        });

        after(function() {
            FilePreviewer.__testOnly__.inPreviewMode();
        });
    });

    describe("Clean and Error Handle Test", function() {
        it("Should handle error", function() {
            FilePreviewer.__testOnly__.handleError({"error": "test"});
            expect($fileBrowserPreview.hasClass("error")).to.be.true;
            expect($fileBrowserPreview.find(".errorSection").text())
            .to.equal("test");
        });

        it("Should clean up the view", function() {
            FilePreviewer.__testOnly__.cleanPreviewer();
            var id = FilePreviewer.__testOnly__.getPreviewerId();
            expect(id).to.be.undefined;
            expect($fileBrowserPreview.hasClass("error")).to.be.false;
            expect($fileBrowserPreview.find(".errorSection").text())
            .to.equal("");
            expect(getOffsetNum()).to.equal("0");
        });
    });

    describe("Preview Html Code Test", function() {
        it("Should get cell style", function() {
            var style = FilePreviewer.__testOnly__.getCellStyle();
            expect(style).to.equal("height:30px; line-height:30px;");
        });

        it("Should get cell html", function() {
            if (isBrowserMicrosoft) {
                return;
            }
            var getCell = FilePreviewer.__testOnly__.getCell;
            var cell = getCell("a", 0);
            var $cell = $(cell);
            expect($cell.data("offset")).to.equal(0);
            expect($cell.text()).to.equal("a");

            // case 2
            cell = getCell("<", 1);
            $cell = $(cell);
            expect($cell.data("offset")).to.equal(1);
            expect($cell.text()).to.equal("<");
        });

        it("Should get char html", function() {
            var html = FilePreviewer.__testOnly__.getCharHtml("12345678", 8, 0);
            var $line = $(html);
            expect($line.find(".cell").length).to.equal(8);
            expect($line.text().length).to.equal(8);
        });

        it("Should get char html", function() {
            var html = FilePreviewer.__testOnly__.getCodeHtml("12345678", 8, 0);
            var $line = $(html);
            expect($line.find(".cell").length).to.equal(8);
            expect($line.text().length).to.equal(24);
        });
    });

    describe("Show Preview Test", function() {
        before(function() {
            // need open filebrowser for the UI simulate
            FileBrowser.show(FileProtocol.nfs);
        });

        it("Should not show preview with invalid url", function(done) {
            FilePreviewer.show("invalid url")
            .then(function() {
                throw "invalid case";
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("Should preview with valid url", function(done) {
            var url = testDatasets.sp500.path;
            FilePreviewer.show(url)
            .then(function() {
                expect($fileBrowserPreview.find(".preview").text())
                .not.equal("");
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should update offset", function() {
            if (isBrowserMicrosoft) {
                return;
            }
            // error case
            FilePreviewer.__testOnly__.updateOffset("abs");
            expect(getOffsetNum()).to.equal("0");

            // valid case
            FilePreviewer.__testOnly__.updateOffset(5, true);
            expect(getOffsetNum()).to.equal("5");
            var $cell = $fileBrowserPreview.find(".preview.normal .cell").eq(5);
            expect($cell.hasClass("active")).to.be.true;
        });

        it("Should not fetch invalid offset", function(done) {
            FilePreviewer.__testOnly__.updateOffset(0, true);

            FilePreviewer.__testOnly__.fetchNewPreview(100000000)
            .then(function() {
                expect(getOffsetNum()).to.equal("0");
                assert.isTrue($("#statusBox").is(":visible"));
                StatusBox.forceHide();
                done();
            })
            .fail(function() {
                throw "invalid case";
            });
        });

        it("Should fetch valid offset", function(done) {
            FilePreviewer.__testOnly__.updateOffset(0, true);

            FilePreviewer.__testOnly__.fetchNewPreview(2048)
            .then(function() {
                expect(getOffsetNum()).to.equal("2048");
                done();
            })
            .fail(function() {
                throw "invalid case";
            });
        });

        it("Should close previewer", function() {
            FilePreviewer.close();
            expect($fileBrowserPreview.hasClass("xc-hidden"))
            .to.be.true;
        });

        after(function() {
            $("#fileBrowser .cancel").click();

            $mainTabCache.click();
            UnitTest.offMinMode();
        });
    });

    function getOffsetNum() {
        return $fileBrowserPreview.find(".offsetNum").text();
    }
});