describe("Dataset-DSTable Test", function() {
    var testDS;
    var testDSObj;
    var testDSId;

    var $dsTableContainer;
    var $tableWrap;

    var $mainTabCache;

    before(function(done){
        $dsTableContainer = $("#dsTableContainer");
        $tableWrap = $("#dsTableWrap");

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();

        UnitTest.addDS(testDatasets.fakeYelp, "unitTestDsTable")
        .then(function(dsName) {
            testDS = dsName;
            var $grid = DS.getGridByName(testDS);
            testDSId = $grid.data("dsid");
            testDSObj = DS.getDSObj(testDSId);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Module API Test", function() {
        it("Should focus on and show the ds table", function(done) {
            expect(testDSObj).not.to.be.null;

            var checkFunc = function() {
                return DSTable.getId() === testDSId;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                assert.isTrue($("#dsTableView").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should hide the ds table view", function() {
            DSTable.hide();
            assert.isFalse($("#dsTableView").is(":visible"));
            expect(DSTable.getId()).to.be.null;
        });

        it("Should show dsTable in load status", function(done) {
            var isLoading = true;
            DSTable.show(testDSId, isLoading)
            .then(function() {
                // XX loading icon during sample load breaks this test
                assert.isTrue($dsTableContainer.is(":visible"));
                assert.isTrue($dsTableContainer.hasClass("loading"));

                var loadText = $dsTableContainer.find(".loadSection .text").text();
                expect(loadText).to.equal("Please wait");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not show dsTable when dsId is wrong", function(done) {
            var dsId = xcHelper.randName("test");

            DSTable.show(dsId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("No DS");
                done();
            });
        });

        it("Should clear the dsTable", function() {
            DSTable.clear();
            expect($tableWrap.html()).to.equal("");
        });

        it("Should show data sample table", function(done) {
            DSTable.show(testDSId)
            .then(function() {
                assert.isTrue($dsTableContainer.is(":visible"));
                assert.isFalse($dsTableContainer.hasClass("loading"));
                expect($("#dsTable").data("dsid")).to.equal(testDSId);

                // ds name matches
                expect($("#dsInfo-title").text()).to.equal(testDS);
                // it should be created by current user
                expect($("#dsInfo-author").text()).to.equal(XcUser.getCurrentUserName());
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not scroll will error case", function(done) {
            DSTable.__testOnly__.scrollSampleAndParse(null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("No DS");
                done();
            });
        });

        it("Should scroll the dsTable", function(done) {
            $("#dsTableContainer").scrollTop(100);
            var $dsTable = $("#dsTable");
            var numRows = $dsTable.find("tr").length;
            var rowsToFetch = 40;
            DSTable.__testOnly__.scrollSampleAndParse(testDSId, 40, rowsToFetch)
            .then(function() {
                var currentNumRows = $dsTable.find("tr").length;
                expect(currentNumRows - numRows).to.equal(rowsToFetch);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Scroll DSTable Test", function() {
        var scrollSampleAndParse;
        var dataStoreTableScroll;
        var $tableWrapper;

        before(function() {
            scrollSampleAndParse = DSTable.__testOnly__.scrollSampleAndParse;
            dataStoreTableScroll = DSTable.__testOnly__.dataStoreTableScroll;
            $tableWrapper = $("#dsTableWrap .datasetTbodyWrap");
        });

        it("scrollSampleAndParse should not work in error case", function(done) {
            scrollSampleAndParse(null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("No DS");
                done();
            });
        });

        it("scrollSampleAndParse should work", function(done) {
            var $dsTable = $("#dsTable");
            var numRows = $dsTable.find("tr").length;
            var rowsToFetch = 40;

            scrollSampleAndParse(testDSId, 40, rowsToFetch)
            .then(function() {
                var currentNumRows = $dsTable.find("tr").length;
                expect(currentNumRows - numRows).to.equal(rowsToFetch);
                done();
            })
            .fail(function(error) {
                console.error(error);
                done("fail");
            });
        });

        it("Should reject scroll if still fetching", function(done) {
            $("#dsTable").addClass("fetching");

            dataStoreTableScroll($tableWrapper)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                $("#dsTable").removeClass("fetching");
            });
        });

        it("Should not trigger scroll when has not at bottom", function(done) {
            dataStoreTableScroll($tableWrapper)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("no need to scroll");
                done();
            });
        });

        it("Should trigger scroll when at bottom", function(done) {
            var oldFunc = DSObj.prototype.fetch;
            DSObj.prototype.fetch = function() {
                return PromiseHelper.reject("test");
            };

            var scrollHeight = $tableWrapper[0].scrollHeight;
            var oldHeight = $("#dsTableWrap").height();
            $("#dsTableWrap").height(scrollHeight);

            dataStoreTableScroll($tableWrapper)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect($("#dsTable").hasClass("fetching")).to.be.false;
                done();
            })
            .always(function() {
                DSObj.prototype.fetch = oldFunc;
                $("#dsTableWrap").height(oldHeight);
            });
        });
    });

    describe("Error Case Test", function() {
        var cache;
        var $errorSection;

        before(function() {
            cache = XcalarFetchData;
            $errorSection = $dsTableContainer.find(".errorSection");
            testDSObj.numErrors = 1;
        });

        beforeEach(function() {
            $errorSection.find(".error").text("");
        });

        it("Should not show error directly if id is null", function() {
            DSTable.showError(null, "test");
            expect($errorSection.find(".error").text()).to.equal("");
        });

        it("Should show error directly", function() {
            DSTable.showError(testDSId, "test");
            expect($errorSection.find(".error").text()).to.contain("test");
        });

        it("Should show error of object directly", function() {
            var errorObj = {"error": "test"};
            DSTable.showError(testDSId, errorObj);
            expect($errorSection.find(".error").text())
            .to.contain(JSON.stringify(errorObj));
        });

        it("Should handle not last error", function(done) {
            var notLastDSError = "not last ds";

            XcalarFetchData = function() {
                return PromiseHelper.reject(notLastDSError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(notLastDSError);
                expect($errorSection.find(".error").text()).to.equal("");
                done();
            });
        });

        it("Should handle error of object", function(done) {
            var dsError = {"error": "objectError"};

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("objectError");
                done();
            });
        });

        it("Should handle error of type Error", function(done) {
            var dsError = new Error("errorTypeError");

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("errorTypeError");
                done();
            });
        });

        it("Should handle error of object", function(done) {
            var dsError = "stringError";

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("stringError");
                done();
            });
        });

        it("Should test file error icon appearing", function(done) {
            var dsError = "fileError";

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                assert.isTrue($("#dsInfo-error").hasClass("type-file"));
                done();
            });
        });

        after(function() {
            XcalarFetchData = cache;
            testDSObj.numErrors = 0;
        });
    });

    describe("Basic Behavior Test", function() {
        before(function(done) {
            DSTable.show(testDSId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should animate the ds path container", function() {
            $("#dsInfo-path").trigger(fakeEvent.click);
            assert.isTrue($('#dsInfo-pathContainer').hasClass("copiableText"));
        });

        it("Should show file path modal", function() {
            var oldFunc = DS.getDSObj;
            DS.getDSObj = function(id) {
                return testDSObj;
            }

            $("#showFileListBtn").click();
            assert.isTrue($("#fileListModal").is(":visible"));
            $("#fileListModal").find(".xi-close").click();

            DS.getDSObj = oldFunc;
        });

        it("Should show the error detail modal", function() {
            $("#dsInfo-error").removeClass("xc-hidden");
            $("#dsInfo-error").click();
            assert.isTrue($("#dsImportErrorModal").is(":visible"));

             $("#dsImportErrorModal").find(".xi-close").click();
        });

        it("Should select all columns", function() {
            $("#selectDSCols").click();
            // all columns(11 cols) all selected
            expect($("#dsTable th.selectedCol").length).to.equal(12);
        });

        it("Should select no columns", function() {
            $("#noDScols").click();
            expect($("#dsTable th.selectedCol").length).to.equal(0);
        });

        it("Should select one column", function() {
            var $input = $("#dsTable .editableHead").eq(2).click();
            expect($("#dsTable th.selectedCol").length).to.equal(1);
            assert.isTrue($input.closest("th").hasClass("selectedCol"));
        });

        it("Should select with shift key", function() {
            var e = jQuery.Event("click", {"shiftKey": true});
            $("#dsTable .editableHead").eq(0).trigger(e);
            // select 3 columns
            expect($("#dsTable th.selectedCol").length).to.equal(3);
        });

        it("Should click .rowNumHead to select all", function() {
            $("#dsTable .rowNumHead").click();
            expect($("#dsTable th.selectedCol").length).to.equal(12);
        });

        it("Should clear all selection", function() {
            $("#clearDsCols").click();
            expect($("#dsTable th.selectedCol").length).to.equal(0);
        });

        it("should click retry button to retry", function() {
            var oldGetError = DS.getErrorDSObj;
            var oldRemove = DS.removeErrorDSObj;
            var oldPreview = DSPreview.show;
            var test = false;
            var oldId = $dsTableContainer.data("id");
            var $dsTableView = $("#dsTableView");

            DS.getErrorDSObj = function() {
                return new DSObj({
                    sources: [{}]
                });
            };

            DS.removeErrorDSObj = function() {
                test = true;
            };

            DSPreview.show = function() {};

            // case 1
            $dsTableContainer.data("id", null);
            $dsTableView.find(".errorSection .retry").click();
            expect(test).to.be.false;

            // case 2
            $dsTableContainer.data("id", "testId");
            $dsTableView.find(".errorSection .retry").click();
            expect(test).to.be.true;

            DS.getErrorDSObj = oldGetError;
            DS.removeErrorDSObj = oldRemove;
            $dsTableContainer.data(oldId);
            DSPreview.show = oldPreview;
        });
    });

    after(function(done) {
        UnitTest.deleteDS(testDS)
        .always(function() {
            $mainTabCache.click();
            UnitTest.offMinMode();
            done();
        });
    });
});
