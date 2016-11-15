describe("Agg Modal Test", function() {
    var $aggModal;
    var $quickAgg;
    var $corr;

    var dsName, tableName, tableId;

    before(function(done){
        $aggModal = $("#aggModal");
        $quickAgg = $("#aggModal-quickAgg");
        $corr = $("#aggModal-corr");

        UnitTest.onMinMode();

        UnitTest.addAll(testDatasets.schedule, "aggModalTest")
        .then(function(resDS, resTable) {
            dsName = resDS;
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    describe("Html Generating Function Test", function() {
        it("getRowLabelHTML should work", function() {
            var ops = ["op1", "op2"];
            var html = AggModal.__testOnly__.getRowLabelHTML(ops);
            var $rowLabels = $(html).find(".rowLabel");
            expect($rowLabels.length).to.equal(2);
            expect($rowLabels.eq(0).text()).to.equal("op1");
            expect($rowLabels.eq(1).text()).to.equal("op2");
        });

        it("getColLabelHTML should work", function() {
            var labels = ["label1", "label2"];
            var html = AggModal.__testOnly__.getColLabelHTML(labels);
            var $container = $('<div>' + html + '</div>');
            expect($container.find(".padding").length).to.equal(1);
            var $colLabels = $container.find(".colLabel");
            expect($colLabels.length).to.equal(3);
            expect($colLabels.eq(0).hasClass("blankSpace")).to.be.true;
            expect($colLabels.eq(1).text()).to.equal("label1");
            expect($colLabels.eq(2).text()).to.equal("label2");
        });
    });

    describe("Basic Function Test", function() {
        var aggColLen = 2;

        it("aggColsInitialize should work", function() {
            AggModal.__testOnly__.aggColsInitialize(tableId);
            var aggCols = AggModal.__testOnly__.getAggCols();
            expect(aggCols).to.be.an('array');
            // schedule has 2 number col
            expect(aggCols.length).to.equal(aggColLen);
        });

        it("aggTableInitialize should work", function() {
            AggModal.__testOnly__.aggTableInitialize();
            // 2 rows + 1 blank label
            expect($quickAgg.find(".headerContainer .colLabel").length)
            .to.equal(aggColLen + 1);
            // 5 opeations
            expect($quickAgg.find(".labelContainer .rowLabel").length)
            .to.equal(5);
            // 2 rows
            expect($quickAgg.find(".aggContainer .aggCol").length)
            .to.equal(aggColLen);
        });

        it("corrTableInitialize should work", function() {
            AggModal.__testOnly__.corrTableInitialize();
            // 2 rows + 1 blank label
            expect($corr.find(".headerContainer .colLabel").length)
            .to.equal(aggColLen + 1);
            // 2 rows
            expect($corr.find(".labelContainer .rowLabel").length)
            .to.equal(aggColLen);
            // 2 rows
            expect($corr.find(".aggContainer .aggCol").length)
            .to.equal(aggColLen);
        });

        it("getCorrCell should work", function() {
            var res = AggModal.__testOnly__.getCorrCell(0, 1);
            expect(res).to.be.an("array");
            expect(res.length).to.equal(2);

            var $cell = res[0];
            var $cell2 = res[1];
            expect($cell.data("col")).to.equal(0);
            expect($cell.data("row")).to.equal(0);

            expect($cell2.data("col")).to.equal(1);
            expect($cell2.data("row")).to.equal(1);
        });

        it("highlightLabel should work", function() {
            AggModal.__testOnly__.highlightLabel(0, 0);
            expect($corr.find(".rowLabel.active").length).to.equal(1);
            expect($corr.find(".colLabel.active").length).to.equal(1);
        });

        it("deHighlightLabel should work", function() {
            AggModal.__testOnly__.deHighlightLabel(0, 0);
            expect($corr.find(".rowLabel.active").length).to.equal(0);
            expect($corr.find(".colLabel.active").length).to.equal(0);
        });

        it("checkDupCols should work", function() {
            // bacis case
            var res = AggModal.__testOnly__.checkDupCols(0);
            expect(res).to.be.an("array");
            expect(res.length).to.equal(0);
            // dup case
            var aggCols = AggModal.__testOnly__.getAggCols();
            // make a dup
            aggCols[2] = aggCols[0];
            res = AggModal.__testOnly__.checkDupCols(0);
            expect(res.length).to.equal(1);

            aggCols.slice(2, 1);
        });

        it("applyCorrResult should work", function() {
            AggModal.__testOnly__.applyCorrResult(0, 1, 1, []);
            var cells = AggModal.__testOnly__.getCorrCell(0, 1);
            var $cell = cells[0];
            expect($cell.text()).to.equal("1.000");
        });
    });

    // error case should test before real case,
    // otherwise valid value will be cached
    describe("Error Case Test", function() {
        var oldFunc = XIApi.aggregateWithEvalStr;

        before(function() {
            XIApi.aggregateWithEvalStr = function() {
                return PromiseHelper.reject({"error": "test"});
            };
        });

        it("AggModal.quickAgg should fail when has error", function(done) {
            AggModal.quickAgg(tableId)
            .then(function() {
                // will still resolve the case
                expect($quickAgg.find(".dash").length).to.be.at.least(1);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("AggModal.corrAgg should fail when has error", function(done) {
            AggModal.corrAgg(tableId, 0)
            .then(function() {
                // will still resolve the case
                expect($corr.find(".dash").length).to.be.at.least(1);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        after(function() {
            $aggModal.find(".close").click();
            XIApi.aggregateWithEvalStr = oldFunc;
        });
    });

    describe("Behavior Test", function() {
        var aggColLen = 3;

        before(function() {
            // make a dup of a number col
            ColManager.dupCol(1, tableId);
        });

        it("AggModal.quickAgg should work", function(done) {
            AggModal.quickAgg(tableId)
            .then(function() {
                // 3 rows
                expect($quickAgg.find(".aggContainer .aggCol").length)
                .to.equal(aggColLen);
                assert.isTrue($quickAgg.is(":visible"));
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("AggModal.corrAgg should work", function(done) {
            AggModal.corrAgg(tableId)
            .then(function() {
                // 3 rows
                expect($corr.find(".aggContainer .aggCol").length)
                .to.equal(aggColLen);
                assert.isTrue($corr.is(":visible"));
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should click tab to toggle view", function() {
            $("#aggTab").click();
            // switch to quick agg
            assert.isTrue($quickAgg.is(":visible"));
            assert.isFalse($corr.is(":visible"));
            // switch to corr
            $("#corrTab").click();
            assert.isFalse($quickAgg.is(":visible"));
            assert.isTrue($corr.is(":visible"));
        });

        it("Should mouseenter to highlight label", function() {
            $corr.find(".aggTableFlex").eq(0).mouseenter();
            expect($corr.find(".rowLabel.active").length).to.equal(1);
            expect($corr.find(".colLabel.active").length).to.equal(1);
        });

        it("Should mouseleave to deHighlight label", function() {
            $corr.find(".aggTableFlex").eq(0).mouseleave();
            expect($corr.find(".rowLabel.active").length).to.equal(0);
            expect($corr.find(".colLabel.active").length).to.equal(0);
        });

        it("Should close modal", function() {
            $aggModal.find(".close").click();
            assert.isFalse($quickAgg.is(":visible"));
            assert.isFalse($corr.is(":visible"));
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, dsName)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});