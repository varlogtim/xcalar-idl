describe("Profile Test", function() {
    var dsName, tableName, tableId, prefix, colNum;
    var sortTableName, sortTableId;
    var $modal;

    before(function(done) {
        $modal = $("#profileModal");
        UnitTest.onMinMode();

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_profile_test")
        .then(function(resDS, resTable, resPrefix) {
            dsName = resDS;
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            prefix = resPrefix;
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    describe("Show Profile Test", function() {
        // prepare
        it("Should sort the table", function(done) {
            var table = gTables[tableId];
            var backCol = xcHelper.getPrefixColName(prefix, "average_stars");
            colNum = table.getColNumByBackName(backCol);

            xcFunction.sort(colNum, tableId, SortDirection.Forward)
            .then(function(finalTableName) {
                sortTableName = finalTableName;
                sortTableId = xcHelper.getTableId(sortTableName);
                expect(gTables.hasOwnProperty(sortTableId));
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should show profile", function(done) {
            Profile.show(sortTableId, colNum)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should toggle the pop bar", function(done) {
            $modal.find(".popBar").click();
            // wait for animataion
            setTimeout(function() {
                expect($modal.hasClass("collapse")).to.be.true;
                $modal.find(".popBar").click();
                setTimeout(function() {
                    expect($modal.hasClass("collapse")).to.be.false;
                    done();
                }, 300);
            }, 300);
        });
    });

    describe("Profile SVG Test", function() {
        it("Should hover on bar area", function() {
            var $barArea = $modal.find(".barArea").eq(0);
            $barArea.trigger("mouseenter");
            // .hasClass not work on svg
            var classList = $barArea.get(0).classList;
            expect(classList.contains("hover")).to.be.true;
            var tooltipLen = $(".bartip:visible").length;
            expect(tooltipLen).to.be.at.least(1);
            // not hover
            $modal.trigger("mouseenter");
            classList = $barArea.get(0).classList;
            expect(classList.contains("hover")).to.be.false;
            newTooltipLen = $(".bartip:visible").length;
            expect(newTooltipLen).to.equal(tooltipLen - 1);
        });

        it("Should toggle between percentage display", function() {
            var $label = $modal.find(".xlabel").eq(0);
            expect($label.text().includes("%")).to.be.false;
            // click without event.which = 1 not do anyting
            $label.click();
            expect($label.text().includes("%")).to.be.false;
            // to percentage display
            $label.trigger(fakeEvent.click);
            expect($label.text().includes("%")).to.be.true;
            // turn back
            $label.trigger(fakeEvent.click);
            expect($label.text().includes("%")).to.be.false;
        });
    });

    describe("Skip Rows Test", function() {
        var $skipInput;
        var $scrollSection;

        before(function() {
            $skipInput = $("#profile-rowInput");
            $scrollSection = $modal.find(".scrollSection");
        });

        it("Should skip to rows", function(done) {
            $skipInput.val(50).trigger(fakeEvent.enter);

            waitForFetch()
            .then(function() {
                assert.isTrue($modal.find(".left-arrow").is(":visible"));
                assert.isTrue($modal.find(".right-arrow").is(":visible"));
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should click right arrow to change row num", function(done) {
            var rowNum = $skipInput.val();
            $modal.find(".right-arrow").trigger(fakeEvent.mousedown);

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.above(rowNum);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should click left arrow to change row num", function(done) {
            var rowNum = $skipInput.val();
            $modal.find(".left-arrow").trigger(fakeEvent.mousedown);

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.below(rowNum);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should use scroll bar to move", function(done) {
            var $scrollerBar = $scrollSection.find(".scrollBar");
            var $scroller = $scrollSection.find(".scroller");
            var offset = $scrollerBar.offset().left;
            var rowNum = $skipInput.val();

            $scrollerBar.trigger(fakeEvent.mousedown);
            var event1 = jQuery.Event("mousedown", {"pageX": offset + 5});
            $scroller.trigger(event1);
            expect($scroller.hasClass("scrolling")).to.be.true;
            // move scroll bar
            var oldLeft = $scroller.css("left");
            var event2 = jQuery.Event("mousemove", {"pageX": offset + 50});
            $(document).trigger(event2);
            expect($scroller.css("left")).to.above(oldLeft);
            var event3 = jQuery.Event("mouseup", {"pageX": offset + 50});
            $(document).trigger(event3);

            expect($scroller.hasClass("scrolling")).to.be.false;

            waitForFetch()
            .then(function() {
                expect($skipInput.val()).to.above(rowNum);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should display more rows", function(done) {
            var $disaplyInput = $modal.find(".disaplyInput");
            var numRows = Number($disaplyInput.find(".numRows").val());
            expect(numRows).to.equal(20);

            $modal.find(".disaplyInput .more").click();
            waitForFetch()
            .then(function() {
                var numRows = Number($disaplyInput.find(".numRows").val());
                expect(numRows).to.equal(30);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should display less rows", function(done) {
            var $disaplyInput = $modal.find(".disaplyInput");
            $modal.find(".disaplyInput .less").click();

            waitForFetch()
            .then(function() {
                var numRows = Number($disaplyInput.find(".numRows").val());
                expect(numRows).to.equal(20);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        function waitForFetch() {
            // XXX it's a hack here to manually add the class
            // and wait till fetchGroupbyData finish to remove the class
            $scrollSection.addClass("disabled");

            var checkFunc = function() {
                return !$scrollSection.hasClass("disabled");
            };

            return UnitTest.testFinish(checkFunc);
        }
    });

    describe("Sort Behavior Test", function() {
        var $sortSection;

        before(function() {
            $sortSection = $modal.find(".sortSection");
        });

        it("Default should in origin sort", function() {
            expect($sortSection.find(".origin").hasClass("active"))
            .to.be.true;
        });

        it("Should do asc sort", function(done) {
            var $asc = $sortSection.find(".asc");
            $asc.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($asc.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should do desc sort", function(done) {
            var $desc = $sortSection.find(".desc");
            $desc.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($desc.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should back to origin sort", function(done) {
            var $origin = $sortSection.find(".origin");
            $origin.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($origin.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });
    });

    describe("Range bucket test", function() {
        var $rangeSection;

        before(function() {
            $rangeSection = $modal.find(".rangeSection");
        });

        it("Should in single bucket by default", function() {
            expect($rangeSection.find(".single").hasClass("active"))
            .to.be.true;
        });

        it("Should range bucket", function(done) {
            var $range = $rangeSection.find(".range");
            $range.click();
            expect($range.hasClass("active")).to.be.true;


            $("#profile-range").val(10).trigger(fakeEvent.enter);
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($modal.find(".bar").length).to.equal(1);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should fit all", function(done) {
            var $fitAll = $rangeSection.find(".fitAll");
            $fitAll.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($fitAll.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should back to single bucket", function(done) {
            var $single = $rangeSection.find(".single");
            $single.click();
            expect($modal.attr("data-state")).to.equal("pending");

            var checkFunc = function() {
                return $modal.attr("data-state") === "finished";
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($single.hasClass("active")).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });
    });

    describe("Filter selection test", function() {
        var $filterOption;

        before(function() {
            $filterOption = $("#profile-filterOption");
        });

        it("Should create selection", function() {
            var $chart = $("#profile-chart");
            var offsest = $chart.offset();
            var e = jQuery.Event("mousedown", {
                "which": 1,
                "pageX": offsest.left + 50,
                "pageY": offsest.top + 50
            });

            $chart.trigger(e);
            expect($("#profile-filterSelection").length).to.equal(1);
            var e2 = jQuery.Event("mousemove", {
                "pageX": offsest.left + 100,
                "pageY": offsest.top + 100
            });
            // need to trigger twice mousemove
            $(document).trigger(e2);
            $(document).trigger(e2);
            $(document).trigger("mouseup");
            assert.isTrue($filterOption.is(":visible"));
        });

        it("Should cancel the optoin", function(done) {
            $filterOption.find(".cancel").trigger(fakeEvent.mousedown);
            // has animation
            setTimeout(function() {
                assert.isFalse($filterOption.is(":visible"));
                done();
            }, 300);
        });
    });

    describe("Close Profile and Clean up Test", function() {
        it("Should close profile", function(done) {
            $modal.find(".close").click();
            var checkFunc = function() {
                // wait unitl the resultset is freed
                return Profile.__testOnly__.getResultSetId() == null;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                assert.isFalse($modal.is(":visible"));
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        // clean up
        it("Should delete orphan tables", function(done) {
            TableList.refreshOrphanList()
            .then(function() {
                return TblManager.deleteTables(gOrphanTables, TableType.Orphan);
            })
            .always(function() {
                done();
            });
        });
    });

    after(function(done) {
        cleanUp()
        .then(function() {
            return UnitTest.deleteAll(sortTableName, dsName);
        })
        .always(function() {
            UnitTest.offMinMode();
            done();
        });

        function cleanUp() {
            var deferred = jQuery.Deferred();

            TableList.refreshOrphanList()
            .then(function() {
                return TblManager.deleteTables(gOrphanTables, TableType.Orphan);
            })
            .always(function() {
                // in case some orphan table deletion faild
                if ($("#alertModal").is(":visible")) {
                    $("#alertModal").find(".cancel").click();
                }
                deferred.resolve();
            });

            return deferred.promise();
        }
    });
});