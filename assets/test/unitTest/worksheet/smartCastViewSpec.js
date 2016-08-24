describe('Smarat Cast View', function() {
    var $castView;
    var $table;
    var tableId;

    before(function(){
        $castView = $("#smartCastView");
        $resultSection = $("#multiCast-result");
        $table = $("#smartCast-table");
    });

    it("Should show the Cast View", function() {
        tableId = findTestTableId();
        SmartCastView.show(tableId);

        assert.isTrue($castView.is(":visible"));
        // this table has now columns to suggest
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
});