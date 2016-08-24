describe('Smarat Cast View', function() {
    var $castView;
    var $resultSection;
    var $table;

    before(function(){
        $castView = $("#smartCastView");
        $resultSection = $("#multiCast-result");
        $table = $("#smartCast-table");
    });

    describe("selectCols() and deSelectCols() Test", function() {
        before(function() {
            MultiCastModal.__testOnly__.setColNames([null, "test1"]);
            MultiCastModal.__testOnly__.setColTypes([null, "string"]);
        });

        it("Should select cols", function() {
            var $th = $('<th class="col1 type-string" data-col="1">' +
                        '<div class="header">' +
                            '<div class="dropDownList">' +
                                '<input class="initialType" value="integer">' +
                            '</div>' +
                        '</div>' +
                    '</th>');
            MultiCastModal.__testOnly__.selectCols($th);

            var $rows = $resultSection.find(".row");
            expect($rows.length).to.equal(1);

            var $row0 = $rows.eq(0);
            expect($row0.find(".colName").text()).to.equal("test1");
            expect($row0.find(".oldType").text()).to.equal("string");
            expect($row0.find(".newType").text()).to.equal("integer");
            expect($row0.find(".highlight").length).to.equal(0);
            expect($th.find("input").hasClass("initialType")).to.be.false;

            $th = $('<th class="col1 type-string" data-col="1">' +
                        '<div class="header">' +
                            '<div class="dropDownList">' +
                                '<input value="string">' +
                            '</div>' +
                        '</div>' +
                    '</th>');
            MultiCastModal.__testOnly__.selectCols($th);
            expect($th.find("input").hasClass("initialType")).to.be.true;
        });

        it("Should deSelect cols", function() {
            // deselect to make th back to old value
            var $th = $('<th class="col1 type-string" data-col="1">' +
                        '<div class="header">' +
                            '<div class="dropDownList">' +
                                '<input cvalue="integer">' +
                            '</div>' +
                        '</div>' +
                    '</th>');
            MultiCastModal.__testOnly__.deSelectCols($th);
            expect($th.find("input").hasClass("initialType")).to.be.true;
            expect($th.find("input").val()).to.equal("string");
        });

        after(function() {
            MultiCastModal.__testOnly__.setColNames([]);
            MultiCastModal.__testOnly__.setColTypes([]);
        });
    });

    describe("suggestType() Test", function() {
        it("Should suggest right type", function() {
            var $tbody = $('<tbody>' +
                            '<td class="col1">' +
                                '<div class="originalData">1</div>' +
                            '</td>' +
                            '<td class="col2">' +
                                '<div class="originalData">1.0</div>' +
                            '</td>' +
                            '</tody>');
            var type = MultiCastModal.__testOnly__.suggestType($tbody, 1, "string");
            expect(type).to.equal("integer");
            type = MultiCastModal.__testOnly__.suggestType($tbody, 2, "float");
            expect(type).to.equal("float");
        });
    });

    describe("MultiCast UI test", function() {
        it("Should show the Cast View", function() {
            var tableId = findTestTableId();
            SmartCastView.show(tableId);

            assert.isTrue($castView.is(":visible"));
            // this table has now columns to suggest
            expect($resultSection.find(".row").length).to.equal(0);
        });

        it("Should close the View", function() {
            $castView.find(".close").click();
            assert.isFalse($castView.is(":visible"));
        });
    });
});