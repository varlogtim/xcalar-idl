describe("DSTable Test", function() {
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
            throw "Fail Case!";
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
            .fail(function(error) {
                throw error;
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
                expect(loadText).to.equal("Please Wait");
                done();
            })
            .fail(function() {
                throw "Error Case!";
            });
        });

        it("Should not show dsTable when dsId is wrong", function(done) {
            var dsId = xcHelper.randName("test");

            DSTable.show(dsId)
            .then(function() {
                throw "Error Case!";
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
                expect($("#dsInfo-author").text()).to.equal(Support.getUser());
                done();
            })
            .fail(function() {
                throw "Error Case!";
            });
        });

        it("Should not scroll will error case", function(done) {
            DSTable.__testOnly__.scrollSampleAndParse(null)
            .then(function() {
                throw "error case";
            })
            .fail(function(error) {
                expect(error).to.equal("No DS");
                done();
            });
        });

        it("Should scroll the dsTable", function(done) {
            var $dsTable = $("#dsTable");
            var numRows = $dsTable.find("tr").length;
            var rowsToFetch = 40;
            DSTable.__testOnly__.scrollSampleAndParse(testDSId, 40, rowsToFetch)
            .then(function() {
                var currentNumRows = $dsTable.find("tr").length;
                expect(currentNumRows - numRows).to.equal(rowsToFetch);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });
    });

    describe("Error Case Test", function() {
        var cache;
        var $errorSection;

        before(function() {
            cache = XcalarFetchData;
            $errorSection = $dsTableContainer.find(".errorSection");
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

        it("Should handle not last error", function(done) {
            var notLastDSError = "not last ds";

            XcalarFetchData = function() {
                return PromiseHelper.reject(notLastDSError);
            };

            DSTable.show(testDSId)
            .then(function() {
                throw "error case";
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
                throw "error case";
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
                throw "error case";
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
                throw "error case";
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("stringError");
                done();
            });
        });

        after(function() {
            XcalarFetchData = cache;
        });
    });

    describe("Basic Behavior Test", function() {
        before(function(done) {
            DSTable.show(testDSId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("Error Case!");
            });
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
            var $input = $("#dsTable .editableHead").eq(0).click();
            expect($("#dsTable th.selectedCol").length).to.equal(1);
            assert.isTrue($input.closest("th").hasClass("selectedCol"));
        });

        it("Should clear all selection", function() {
            $("#clearDsCols").click();
            expect($("#dsTable th.selectedCol").length).to.equal(0);
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
