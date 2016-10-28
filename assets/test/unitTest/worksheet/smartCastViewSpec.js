describe('Smart Cast View Test', function() {
    var $castView;
    var $table;
    var tableId;
    var dsName, tableName, tableId;

    before(function(done){
        $castView = $("#smartCastView");
        $resultSection = $("#multiCast-result");
        $table = $("#smartCast-table");

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_smartCast_test")
        .then(function(resDS, resTable) {
            dsName = resDS;
            console.log(resTable)
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    it("Should show the Cast View", function() {
        console.log(tableId)
        SmartCastView.show(tableId);

        assert.isTrue($castView.is(":visible"));
        expect($table.find(".row").length).to.equal(0);
    });

    it("Should select column", function() {
        SmartCastView.__testOnly__.selectCol(1);
        expect($table.find(".row").length).to.equal(1);
        expect($table.find(".initialType").length).to.equal(1);
        expect($(".modalHighlighted").length > 0).to.be.true;
    });

    it("Should change column type", function() {
        try {
            // test error case
            SmartCastView.__testOnly__.changeColType();
        } catch (error) {
            expect(error).not.to.be.null;
        }

        SmartCastView.__testOnly__.changeColType(1, "integer");
        var $row = $table.find(".row");
        expect($row.find(".colType .text").text()).to.equal("integer");
        expect($table.find(".initialType").length).to.equal(0);
    });

    it("Should deSelect column", function() {
        SmartCastView.__testOnly__.deSelectCol(1);
        expect($table.find(".row").length).to.equal(0);
        expect($(".modalHighlighted").length > 0).to.be.false;
    });

    it("Should close the View", function() {
        SmartCastView.close();
        assert.isFalse($castView.is(":visible"));
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, dsName)
        .always(function() {
            done();
        });
    });
});