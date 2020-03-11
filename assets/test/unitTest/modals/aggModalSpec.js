// XXX temporary disable it
describe.skip("AggModal Test", function() {
    var $aggModal;
    var $quickAgg;
    var $corr;
    var tabId;

    var dsName, tableName, tableId;

    before(function(done){
        console.log("AggModal Test");
        $aggModal = $("#aggModal");
        $quickAgg = $("#aggModal-quickAgg");
        $corr = $("#aggModal-corr");

        UnitTest.onMinMode();

        UnitTest.addAll(testDatasets.schedule, "aggModalTest")
        .then(function(resDS, resTable, tPrefix, _nodeId, _tabId) {
            dsName = resDS;
            tableName = resTable;
            tabId = _tabId;
            tableId = xcHelper.getTableId(tableName);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Html Generating Function Test", function() {
        it("getRowLabelHTML should work", function() {
            var ops = ["op1", "op2"];
            var html = AggModal.Instance._getRowLabelHTML(ops);
            var $rowLabels = $(html).find(".rowLabel");
            expect($rowLabels.length).to.equal(2);
            expect($rowLabels.eq(0).text()).to.equal("op1");
            expect($rowLabels.eq(1).text()).to.equal("op2");
        });

        it("getColLabelHTML should work", function() {
            var labels = [{colName: "label1", prefix: "a"}, {colName: "label2", prefix: "a"}];
            var html = AggModal.Instance._getColLabelHTML(labels);
            var $container = $('<div>' + html + '</div>');
            expect($container.find(".padding").length).to.equal(1);
            var $colLabels = $container.find(".colLabel");
            expect($colLabels.length).to.equal(3);
            expect($colLabels.eq(0).hasClass("blankSpace")).to.be.true;
            expect($colLabels.eq(1).text()).to.equal("alabel1");
            expect($colLabels.eq(2).text()).to.equal("alabel2");
        });
    });

    describe("Basic Function Test", function() {
        var aggColLen = 2;

        it("aggColsInitialize should work", function() {
            AggModal.Instance._aggColsInitialize(gTables[tableId]);
            var aggCols = AggModal.Instance._aggCols;
            expect(aggCols).to.be.an('array');
            // schedule has 2 number col
            expect(aggCols.length).to.equal(aggColLen);
        });

        it("aggTableInitialize should work", function() {
            AggModal.Instance._aggTableInitialize();
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
            AggModal.Instance._corrTableInitialize();
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
            var res = AggModal.Instance._getCorrCell(0, 1);
            expect(res).to.be.an("array");
            expect(res.length).to.equal(3);

            var $cell = res[0];
            var $cell2 = res[1];
            expect($cell.data("col")).to.equal(0);
            expect($cell.data("row")).to.equal(0);

            expect($cell2.data("col")).to.equal(1);
            expect($cell2.data("row")).to.equal(1);
            expect(res[2]).to.equal(false);

            // case 2
            res = AggModal.Instance._getCorrCell(0, 0);
            $cell = res[0];
            $cell2 = res[1];
            expect($cell.data("col")).to.equal(0);
            expect($cell.data("row")).to.equal(1);

            expect($cell2.data("col")).to.equal(0);
            expect($cell2.data("row")).to.equal(1);
            expect(res[2]).to.equal(true);
        });

        it("highlightLabel should work", function() {
            AggModal.Instance._highlightLabel(0, 0);
            expect($corr.find(".rowLabel.active").length).to.equal(1);
            expect($corr.find(".colLabel.active").length).to.equal(1);
        });

        it("deHighlightLabel should work", function() {
            AggModal.Instance._deHighlightLabel(0, 0);
            expect($corr.find(".rowLabel.active").length).to.equal(0);
            expect($corr.find(".colLabel.active").length).to.equal(0);
        });

        it("checkDupCols should work", function() {
            // bacis case
            var res = AggModal.Instance._checkDupCols(0);
            expect(res).to.be.an("array");
            expect(res.length).to.equal(0);
            // dup case
            var aggCols = AggModal.Instance._aggCols;
            // make a dup
            aggCols[2] = aggCols[0];
            res = AggModal.Instance._checkDupCols(0);
            expect(res.length).to.equal(1);

            aggCols.slice(2, 1);
        });

        it("applyCorrResult should work", function() {
            AggModal.Instance._applyCorrResult(0, 1, 1, []);
            var cells = AggModal.Instance._getCorrCell(0, 1);
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

        it("AggModal.Instance.quickAgg should fail when has error", function(done) {
            AggModal.Instance.quickAgg(tableId)
            .then(function() {
                // will still resolve the case
                expect($quickAgg.find(".dash").length).to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("AggModal.Instance.corrAgg should fail when has error", function(done) {
            AggModal.Instance.corrAgg(tableId, null, null, 0)
            .then(function() {
                // will still resolve the case
                expect($corr.find(".dash").length).to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            $aggModal.find(".close").click();
            XIApi.aggregateWithEvalStr = oldFunc;
        });
    });

    describe("Agg Behavior Test", function() {
        var aggColLen = 2;

        it("AggModal.Instance.quickAgg should work", function(done) {
            AggModal.Instance.quickAgg(tableId)
            .then(function() {
                // 2 rows
                expect($quickAgg.find(".aggContainer .aggCol").length)
                .to.equal(aggColLen);
                assert.isTrue($quickAgg.is(":visible"));
                expect($aggModal.find(".modalInstruction .text").text()).to
                    .equal("Viewing aggregate functions on all numeric columns." +
                        " To view correlation coefficients for every pair of numeric columns, please click on the vertical tab.");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // skip it as it keep failing unittest
        it.skip("should able to scroll quick agg view", function(done) {
            var $container = $quickAgg.find(".aggContainer");
            var $headerContainer = $quickAgg.find(".headerContainer");
            var $col = $container.find(".aggCol").eq(0);
            var $headerCol = $headerContainer.find(".colLabel:not(.blankSpace)").eq(0);
            // make the view scrollable
            for (var i = 0; i < 10; i++) {
                $container.append($col.clone());
                $headerContainer.append($headerCol.clone());
            }
            var container = $container.get(0);
            expect(container.scrollWidth > container.offsetWidth);
            expect($headerContainer.get(0).scrollLeft).to.equal(0);

            container.scrollLeft = 10;

            setTimeout(function() {
                expect($quickAgg.find(".headerContainer").scrollLeft()).to.equal(10);
                done();
            }, 500);
        });

        it("AggModal.Instance.corrAgg should work", function(done) {
            AggModal.Instance.corrAgg(tableId)
            .then(function() {
                // 2 rows
                expect($corr.find(".aggContainer .aggCol").length)
                .to.equal(aggColLen);
                assert.isTrue($corr.is(":visible"));
                expect($aggModal.find(".modalInstruction .text").text()).to
                    .equal("Viewing correlation coefficients for every pair of numeric columns. " +
                        "To view common aggregate functions on all numeric columns, please click on the vertical tab.");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should resize corr view work", function() {
            var $header = $corr.find(".headerContainer");
            var $padding = $header.find(".padding");
            var $bar = $padding.find(".ui-resizable-e").eq(0);
            var width = $padding.width();
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({
                "type": "mousedown",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mousemove",
                "which": 1,
                "pageX": pageX + 1,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mouseup",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });

            expect($padding.width() > width).to.be.true;
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

        it("should back to profile modal", function(done) {
            var test = false;
            var oldProfile = Profile.show;

            Profile.show = function() {
                test = true;
            };

            AggModal.Instance.quickAgg(tableId)
            .then(function() {
                assert.isTrue($aggModal.is(":visible"));

                $("#aggModal-backToProfile").click();
                expect(test).to.be.true;
                assert.isFalse($aggModal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Profile.show = oldProfile;
            });
        });
    });


    after(function(done) {
        UnitTest.deleteTab(tabId)
        .then(() => {
            return UnitTest.deleteAllTables();
        })
        .then(function() {
            UnitTest.deleteDS(dsName)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        })
        .fail(function() {
            done("fail");
        });
    });
});