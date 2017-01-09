describe('Smart Cast View Test', function() {
    var $castView;
    var $castTable;
    var $table;

    var dsName, tableName, tableId;

    before(function(done){
        xcTooltip.hideAll();
        $castView = $("#smartCastView");
        $resultSection = $("#multiCast-result");
        $castTable = $("#smartCast-table");

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_smartCast_test")
        .then(function(resDS, resTable) {
            dsName = resDS;
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTable-" + tableId);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    describe("Basic Function Test", function() {
         it("Should show the Cast View", function() {
            SmartCastView.show(tableId);

            assert.isTrue($castView.is(":visible"));
            expect($castTable.find(".row").length).to.equal(0);
        });

        it("Should select column", function() {
            SmartCastView.__testOnly__.selectCol(1);
            expect($castTable.find(".row").length).to.equal(1);
            expect($castTable.find(".initialType").length).to.equal(1);
            expect($(".modalHighlighted").length > 0).to.be.true;
        });

        it("Should scroll to column", function() {
            var $th = $table.find("th.col1");
            xcTooltip.hideAll();
            SmartCastView.__testOnly__.scrollToColumn(null);
            expect($th.attr("aria-describedby")).not.to.exist;
            SmartCastView.__testOnly__.scrollToColumn(1);
            expect($th.attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should change column type", function() {
            try {
                // test error case
                SmartCastView.__testOnly__.changeColType();
            } catch (error) {
                expect(error).not.to.be.null;
            }

            SmartCastView.__testOnly__.changeColType(1, "integer");
            var $row = $castTable.find(".row");
            expect($row.find(".colType .text").text()).to.equal("integer");
            expect($castTable.find(".initialType").length).to.equal(0);
        });

        it("Should deSelect column", function() {
            SmartCastView.__testOnly__.deSelectCol(1);
            expect($castTable.find(".row").length).to.equal(0);
            expect($(".modalHighlighted").length > 0).to.be.false;
        });

        it("Should submit the form and close the view", function() {
            var oldFunc = ColManager.changeType;
            var test = false;
            ColManager.changeType = function() {
                test = true;
            }

            // nothing to cacst
            SmartCastView.__testOnly__.submitForm();
            expect(test).to.be.false;
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text())
            .to.equal(ErrTStr.NoTypeChange);
            StatusBox.forceHide();

            // something to cast
            SmartCastView.__testOnly__.selectCol(1);
            SmartCastView.__testOnly__.changeColType(1, "integer");

            SmartCastView.__testOnly__.submitForm();
            expect(test).to.be.true;
            assert.isFalse($castView.is(":visible"));

            ColManager.changeType = oldFunc;
        });
    });

    describe("UI Behavior Test", function() {
        var $header;

        before(function() {
            SmartCastView.show(tableId);
            $header = $table.find("th.col1 .header");
        });

        it("Should select and deSelect column", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // deselect
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should clear all selected column", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // clear
            $castView.find(".clear").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should click detect to do the detection", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // detect
            $castView.find(".detect").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should click column name to focus", function() {
            // should clear inner data first
            $castView.find(".clear").click();
            // select
            $header.click();
            expect($castTable.find(".colName").length).to.equal(1);
            // focus on column name
            $castTable.find(".colName").click();
            expect($header.closest("th").attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should use change type menu to change type", function() {
            var $colType = $castTable.find(".colType");
            var $castMenu = $("#castMenu");
            expect($colType.hasClass("initialType")).to.be.true;
            expect($colType.find(".text").text()).to.equal("float");
            // open cast menu
            $colType.click();
            assert.isTrue($castMenu.is(":visible"));
            // change type
            $castMenu.find('li[data-type="string"]').mouseup();
            expect($colType.hasClass("initialType")).to.be.false;
            expect($colType.find(".text").text()).to.equal("string");
            // close cast menu
            $colType.click();
            assert.isFalse($castMenu.is(":visible"));
        });

        it("Should not submit when no columns to change type", function() {
            // clear
            $castView.find(".clear").click();
            // confirm
            $castView.find(".confirm").click();
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoCast);
            StatusBox.forceHide();
        });

        it("Should close the view", function() {
            $castView.find(".cancel").click();
            assert.isFalse($castView.is(":visible"));
            // call another close should have nothing happen
            SmartCastView.close();
            assert.isFalse($castView.is(":visible"));
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, dsName)
        .always(function() {
            done();
        });
    });
});