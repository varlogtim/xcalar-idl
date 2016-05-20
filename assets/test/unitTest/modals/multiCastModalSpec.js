describe('MultiCast Modal', function() {
    var minModeCache;
    var $modal;
    var $resultSection;
    var $table;

    before(function(){
        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        $modal = $("#multiCastModal");
        $resultSection = $("#multiCast-result");
        $table = $("#multiCast-table");
    });

    describe('updateTypeInfo() Test', function() {
        it('updateTypeInfo() should show correct instruction', function() {
            // when nothing to suggest
            var $label = $modal.find(".resultContainer .title .label");
            MultiCastModal.__testOnly__.updateTypeInfo();

            expect($resultSection.text()).to.equal(MultiCastTStr.SelectCol);
            expect($label.text()).to.equal(MultiCastTStr.CastRes);

            // test text in smart sugg case
            MultiCastModal.__testOnly__.updateTypeInfo(true);
            expect($resultSection.text().indexOf(MultiCastTStr.NoRec))
            .to.not.equal(-1);
            expect($label.text()).to.equal(MultiCastTStr.SmartRes);
        });

        it('updateTypeInfo() should generate correct suggestion', function() {
            // when has columns to suggest
            MultiCastModal.__testOnly__.setColNames([null, "test1", "test2"]);
            MultiCastModal.__testOnly__.setColTypes([null, "string", "string"]);
            MultiCastModal.__testOnly__.setNewColType([null, "integer", "string"]);
            MultiCastModal.__testOnly__.setSuggColFlags([null, false, true]);

            MultiCastModal.__testOnly__.updateTypeInfo();
            // has two results
            var $rows = $resultSection.find(".row");
            expect($rows.length).to.equal(2);

            var $row0 = $rows.eq(0);
            expect($row0.find(".colName").text()).to.equal("test1");
            expect($row0.find(".oldType").text()).to.equal("string");
            expect($row0.find(".newType").text()).to.equal("integer");
            expect($row0.find(".highlight").length).to.equal(0);

            var $row1 = $rows.eq(1);
            expect($row1.find(".colName").text()).to.equal("test2");
            expect($row1.find(".oldType").text()).to.equal("string");
            expect($row1.find(".newType").text()).to.equal("string");
            expect($row1.find(".highlight").length).to.equal(1);
        });

        after(function() {
            MultiCastModal.__testOnly__.setColNames([]);
            MultiCastModal.__testOnly__.setColTypes([]);
            MultiCastModal.__testOnly__.setNewColType([]);
            MultiCastModal.__testOnly__.setSuggColFlags([]);
        });
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
        it("Should show the modal", function() {
            var tableId = findTestTableId();
            MultiCastModal.show(tableId);

            assert.isTrue($modal.is(":visible"));
            // this table has now columns to suggest
            expect($resultSection.find(".row").length).to.equal(0);
        });

        it("Should close the modal", function() {
            $modal.find(".close").click();
            assert.isFalse($modal.is(":visible"));
        });
    });

    after(function() {
        gMinModeOn = minModeCache;
    });
});