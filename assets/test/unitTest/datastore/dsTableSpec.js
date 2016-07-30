function dsTableTest() {
    var testDS;
    var testDSObj;
    var testDSId;

    var $dsTableContainer;
    var $tableWrap;

    before(function(done){
        $dsTableContainer = $("#dsTableContainer");
        $tableWrap = $("#dsTableWrap");

        testDS = xcHelper.uniqueRandName("unitTest-fakeYelp", DS.has, 10);
        var dataset = testDatasets.fakeYelp;

        DS.load(testDS, dataset.format, dataset.url,
                dataset.fieldDelim, dataset.lineDelim,
                dataset.hasHeader, dataset.moduleName, dataset.funcName, false)
        .then(function(dsObj) {
            testDSObj = dsObj;
            testDSId = testDSObj.getId();
            done();
        })
        .fail(function(error) {
            throw "Fail Case!";
        });
    });

    describe("Preparation Verification", function() {
        it("Should load the ds", function() {
            expect(testDSObj).not.to.be.null;
        });
    });

    describe("Module API Test", function() {
        it("Should show datasample table in load status", function(done) {
            var isLoading = true;
            DSTable.show(testDSId, isLoading)
            .then(function() {
                // XX loading icon during sample load breaks this test

                assert.isTrue($dsTableContainer.is(":visible"));
                assert.isTrue($dsTableContainer.hasClass("loading"));

                var loadText = $dsTableContainer.find(".loadSection .text").text();
                expect(loadText).to.equal("Loading");
                done();
            })
            .fail(function() {
                throw "Error Case!";
            });
        });

        it("Should not show datasample table when dsId is wrong", function(done) {
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

        it("Should clear the datasample table", function() {
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
    });

    describe("Basic Behavior Test", function() {
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

    describe("Prepare table for other tests", function() {
        it("Should create a table", function(done) {
            // this is for the preparation of table and worksheet test

            // clear first in case we have otehr data cart
            $("#clearDataCart").click();
            $("#selectDSCols").click();

            DSCart.__testOnly__.createWorksheet()
            .then(function(wholeTableName) {
                // because we generate a unique ds name, so
                // this table's name should equal to testDS
                var tableName = xcHelper.getTableName(wholeTableName);
                expect(tableName).to.equal(testDS);

                var $table = $(".xcTableWrap").filter(function() {
                    return $(this).find(".tableName").val() === testDS;
                });

                expect($table.length).to.equal(1);
                done();
            })
            .fail(function() {
                throw "Error Case!";
            });
        });
    });
}
