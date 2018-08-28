describe('TablePrefixManager Test', function() {
    var prefixManager;

    before(function() {
        prefixManager = TableComponent.getPrefixManager();
    });

    describe("Basic API Test", function() {
        var oldRes;

        before(function() {
            oldRes = prefixManager.getCache();
        });

        it("Should get cache", function() {
            var res = prefixManager.getCache();
            expect(res).to.be.an('object');
        });

        it("Should restore", function() {
            prefixManager.restore({"test": "val"});
            var res = prefixManager.getCache();
            expect(res.test).to.equal("val");
        });

        it("Should get color", function() {
            prefixManager.restore({"t": "white"});
            var res = prefixManager.getColor("t");
            expect(res).to.equal("white");
        });

        it("Should mark color", function() {
            var html = '<div class="th">' +
                        '<div class="topHeader" data-color="white">' +
                            '<div class="prefix">test-mark</div>' +
                        '</div>' +
                    '</div>';
            var $h = $(html).appendTo($('body'));
            prefixManager.markColor("test-mark", "yellow");
            expect(prefixManager.getColor("test-mark")).to.equal("yellow");
            expect($h.find(".topHeader").data("color")).to.equal("yellow");
            $h.remove();
        });

        it("Should update color", function() {
            prefixManager.restore({"test-mark2": "blue"});

            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "test-mark2::backTestCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "testCol",
                "backName": "backTestCol2",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#unit-test-tPrefix",
                "tableId": "unit-test-tPrefix",
                "tableCols": [progCol1, progCol2],
                "isLocked": false
            });

            gTables["unit-test-tPrefix"] = table;

            var html = '<div id="xcTable-unit-test-tPrefix">' +
                            '<div class="th col1">' +
                                '<div class="topHeader">' +
                                    '<div class="prefix"></div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="th col2">' +
                                '<div class="topHeader">' +
                                    '<div class="prefix"></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
            var $h = $(html).appendTo($("body"));

            prefixManager.updateColor("unit-test-tPrefix", 1);
            expect($h.find(".prefix").eq(0).text()).to.equal("test-mark2");
            expect($h.find(".topHeader").eq(0).data("color")).to.equal("blue");
            // test 2
            prefixManager.updateColor("unit-test-tPrefix", 2);
            expect($h.find(".prefix").eq(1).text())
            .to.equal(CommonTxtTstr.Immediates);
            expect($h.find(".topHeader").eq(1).data("color"))
            .to.equal("");
            $h.remove();
            delete gTables["unit-test-tPrefix"];
        });

        after(function() {
            prefixManager.restore(oldRes);
        });
    });
});