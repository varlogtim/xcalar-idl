describe("PreviewFileModal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#previewFileModal");
        UnitTest.onMinMode();
    });

    describe("Error Case", function() {
        var oldFunc;

        before(function() {
            oldFunc = XcalarListFiles;
            XcalarListFiles = function() {
                return PromiseHelper.reject({"error": "test"});
            };
        });

        it("Should handle error case", function(done) {
            PreviewFileModal.show("test")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isTrue($modal.is(":visible"));
                expect($modal.hasClass("error")).to.be.true;
                expect($modal.find(".errorSection").text())
                .to.equal('{"error":"test"}');
                done();
            });
        });

        it("Should close modal", function() {
            $modal.find(".close").click();
            assert.isFalse($modal.is(":visible"));
        });

        after(function() {
            XcalarListFiles = oldFunc;
        });
    });

    describe("Normal Case", function() {
        var oldFunc;

        before(function() {
            oldFunc = XcalarListFiles;
        });

        it("Should list single file", function(done) {
            XcalarListFiles = function() {
                return PromiseHelper.resolve({
                    "files": [{
                        "name": "test1"
                    }]
                });
            };

            var options = {
                targetName: gDefaultSharedRoot,
                path: "/test1",
                fileNamePattern: "test"
            };
            PreviewFileModal.show(options)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($modal.hasClass("parseMode")).to.be.false;
                expect($modal.find(".radioButton").length).to.equal(1);
                var $pattern = $modal.find(".pattern");
                expect($pattern.hasClass("xc-hidden")).to.be.false;
                expect($pattern.find("b").text()).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should sumbit form in change file mode", function() {
            var oldShow = DSPreview.changePreviewFile;
            var test = false;
            DSPreview.changePreviewFile = function() {
                test = true;
            };

            $modal.find(".confirm").click();
            expect(test).to.be.true;
            assert.isFalse($modal.is(":visible"));

            DSPreview.changePreviewFile = oldShow;
        });

        it("Should list multiple files", function(done) {
            XcalarListFiles = function() {
                return PromiseHelper.resolve({
                    "files": [{
                        "name": "test1",
                        "attr": {"isDirectory": false}
                    }, {
                        "name": "test2",
                        "attr": {"isDirectory": false}
                    }]
                });
            };

            var options = {
                targetName: gDefaultSharedRoot,
                path: "/folder/",
                previewFile: "/folder/test2",
                isParseMode: true
            };
            PreviewFileModal.show(options)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($modal.hasClass("parseMode")).to.be.true;
                expect($modal.find(".radioButton").length).to.equal(2);
                expect($modal.find(".radioButton.active").length).to.equal(1);
                expect($modal.find(".pattern").hasClass("xc-hidden"))
                .to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should submit form in parse mode", function() {
            var oldShow = DSParser.show;
            var test = false;
            DSParser.show = function() {
                test = true;
            };

            $modal.find(".confirm").click();
            expect(test).to.be.true;
            assert.isFalse($modal.is(":visible"));

            DSParser.show = oldShow;
        });

        after(function() {
            XcalarListFiles = oldFunc;
        });
    });

    describe("Search Bar Test", function() {
        var oldFunc;
        var $searchBar;

        before(function() {
            $searchBar = $modal.find(".searchbarArea");
            oldFunc = XcalarListFiles;
            XcalarListFiles = function() {
                return PromiseHelper.resolve({
                    "files": [{
                        "name": "test1"
                    }]
                });
            };
        });

        it("Should show modal with seach bar closed", function(done) {
            var options = {
                targetName: gDefaultSharedRoot,
                path: "/test1"
            };
            PreviewFileModal.show(options)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($searchBar.hasClass("closed")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should toggle search bar", function() {
            var $icon = $modal.find(".searchIcon");
            $icon.click();
            expect($searchBar.hasClass("closed")).to.be.false;
            $icon.click();
            expect($searchBar.hasClass("closed")).to.be.true;
        });

        it("Should search text", function() {
            $modal.find(".searchIcon").click();
            $searchBar.find("input").val("test").trigger("input");
            expect($modal.find(".highlightedText").length).to.equal(1);
        });

        it("Should clear search", function() {
            $searchBar.find(".closeBox").click();
            expect($modal.find(".highlightedText").length).to.equal(0);
            expect($searchBar.hasClass("closed")).to.be.false;
        });

        it("Should close search bar", function() {
            $searchBar.find(".closeBox").click();
            expect($searchBar.hasClass("closed")).to.be.true;
        });

        it("Should close modal", function() {
            $modal.find(".close").click();
            assert.isFalse($modal.is(":visible"));
        });

        after(function() {
            XcalarListFiles = oldFunc;
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});