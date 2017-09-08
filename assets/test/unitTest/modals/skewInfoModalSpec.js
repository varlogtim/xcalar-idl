describe("SkewInfoModal Test", function() {
    var table;
    var tableId;
    var tableName;
    var $modal;
    var totalRows = 3;

    before(function() {
        tableId = xcHelper.randName("testTable");
        tableName = tableId;
        table = new TableMeta({
            tableName: tableName,
            tableId: tableId
        });

        table.resultSetCount = totalRows;
        table.backTableMeta = {
            metas: [{numRows: 1, size: 10}, {numRows: 2, size: 10}]
        };

        gTables[tableId] = table;
        $modal = $("#skewInfoModal");

        UnitTest.onMinMode();
    });

    it("should handle error case", function() {
        SkewInfoModal.show(null);
        UnitTest.hasAlertWithTitle(AlertTStr.Error);
    });

    it("should show row distributon in the modal", function() {
        SkewInfoModal.show(tableId);
        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".bar").length).to.equal(2);
        expect($modal.find(".tableName .text").text()).to.equal(tableName);
        expect($modal.find(".size .text").text()).to.equal("20B");
        expect($modal.find(".totalRows .text").text()).to.equal(String(totalRows));
    });

    it("should click to toggle label", function() {
        expect($modal.find(".y :contains(rows)").length).to.equal(1);
        expect($modal.find(".y :contains(percentage)").length).to.equal(0);
        // toggle
        $modal.find(".chart").click();
        expect($modal.find(".y :contains(rows)").length).to.equal(0);
        expect($modal.find(".y :contains(percentage)").length).to.equal(1);
        // toggle back
        $modal.find(".chart").click();
        expect($modal.find(".y :contains(rows)").length).to.equal(1);
        expect($modal.find(".y :contains(percentage)").length).to.equal(0);
    });

    it("should close modal", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    after(function() {
        delete gTables[tableId];
        UnitTest.offMinMode();
    });
});