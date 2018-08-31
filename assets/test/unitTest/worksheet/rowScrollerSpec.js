describe("RowScroller Test", function() {
    var testDs;
    var tableName;
    var tableId;
    var $table;
    var $input;

    before(function(done) {
        console.clear();
        $input = $("#rowInput");
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("row input", function() {
        var cachedAddRows;
        before(function() {
            cachedAddRows = RowManager.prototype.addRows;
        });

        it("enter should not work if table is locked", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };
            gTables[tableId].lock();
            $input.val(100).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            gTables[tableId].unlock();
        });

        it("enter should not work if table is in scroll", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };
            $table.addClass("scrolling");
            $input.val(100).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            $table.removeClass("scrolling");
        });

        it("enter should not work if table is not scrollable", function() {
            var cache = TblFunc.isTableScrollable;
            var isScrollableCalled = false;
            TblFunc.isTableScrollable = function() {
                isScrollableCalled = true;
                return false;
            };
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };

            $input.val(100).trigger(fakeEvent.enter);
            expect(isScrollableCalled).to.be.true;
            expect(addRowsCalled).to.be.false;
            expect($input.val()).to.equal("1");
            expect($input.data("val")).to.equal(1);

            TblFunc.isTableScrollable = cache;
        });

        it("invalid input should not work", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };

            $input.val("five");
            expect($input.val()).to.equal("");

            $input.val(100.5).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            expect($input.val()).to.equal("1");
        });

        // to row 100
        it("valid input should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.be.lt(100);
                expect(numRowsToAdd).to.equal(60);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.true;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val(100).trigger(fakeEvent.enter);
            UnitTest.timeoutPromise(1)
            .then(function() {
                expect(addRowsCalled).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // to row 0
        it("valid input should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(0);
                expect(numRowsToAdd).to.equal(60);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.true;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val(0).trigger(fakeEvent.enter);
            UnitTest.timeoutPromise(1)
            .then(function() {
                expect(addRowsCalled).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it('clicking on rowinput area should focus on table', function() {
            var cached = xcHelper.centerFocusedTable;
            var centerCalled = false;
            xcHelper.centerFocusedTable = function() {
                centerCalled = true;
            };
            $("#rowInputArea").mousedown();
            expect(centerCalled).to.be.true;
            xcHelper.centerFocusedTable = cached;
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
        });
    });

    describe("RowScroller.getRowsAboveHeight", function() {
        it("get rows above height should  work", function() {
            var fn = RowScroller.getRowsAboveHeight;
            // rowheight change at row 2,4, and 43
            var fakeTable = {rowHeights: {0: {2: 100, 4: 200}, 2: {43: 400}}};

            gTables["fakeTable"] = fakeTable;
            expect(fn("fakeTable", 200)).to.equal((200 * 25) + (75 + 175 + 375));
            expect(fn("fakeTable", 40)).to.equal((40 * 25) + (75 + 175));
            expect(fn("fakeTable", 42)).to.equal((42 * 25) + (75 + 175));
            expect(fn("fakeTable", 43)).to.equal((43 * 25) + (75 + 175 + 375));
            expect(fn("fakeTable", 44)).to.equal((44 * 25) + (75 + 175 + 375));

            delete gTables["fakeTable"];
        });
    });

    describe.skip("scrollbar scroll", function() {
        var $scrollBar;
        var $tbodyWrap;
        var table;
        var cachedAddRows;
        var scrollTriggered = false;

        before(function(){
            $scrollBar = $("#xcTableWrap-" + tableId).find(".tableScrollBar");
            $tbodyWrap = $("#xcTbodyWrap-" + tableId);
            table = gTables[tableId];
            cachedAddRows = RowManager.prototype.addRows;
            $scrollBar.on("scroll.unitTest", function() {
                scrollTriggered = true;
            });
        });

        it("scrolling on scrollbar should work", function(done) {
            table.scrollMeta.isTableScrolling = false;
            expect(table.scrollMeta.isBarScrolling).to.be.false;
            expect($scrollBar.scrollTop()).to.not.equal(50);
            scrollTriggered = false;
            $scrollBar.scrollTop(50);

            if (!ifvisible.now()) {
                $scrollBar.scroll();
            }

            UnitTest.testFinish(function () {
                console.log("top", $tbodyWrap.scrollTop());
                return $tbodyWrap.scrollTop() === 50;
            })
            .then(function() {
                expect($tbodyWrap.scrollTop()).to.equal(50);
                return UnitTest.timeoutPromise(1);
            })
            .then(function() {
                table.scrollMeta.isBarScrolling = false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("dragging scrollbar should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };
            scrollTriggered = false;
            $scrollBar.trigger(fakeEvent.mousedown);
            $scrollBar.scrollTop(100);

            if (!ifvisible.now()) {
                $scrollBar.scroll();
            }
            gTables[tableId].rowHeights[0] = {1: 300};

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() === 100;
            })
            .then(function() {
                return UnitTest.testFinish(function() {
                    return addRowsCalled === false;
                });
            })
            .then(function() {
                expect(table.scrollMeta.isBarScrolling).to.be.false;
                expect($tbodyWrap.scrollTop()).to.equal(50);
                $(document).mouseup();

                return UnitTest.testFinish(function() {
                    return $tbodyWrap.scrollTop() === 100;
                });
            })
            .then(function() {
                expect($tbodyWrap.scrollTop()).to.equal(100);
                expect(addRowsCalled).to.be.true;
                delete gTables[tableId].rowHeights[0];
                return UnitTest.timeoutPromise(1);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
            $scrollBar.off("scroll.unitTest");
        });
    });

    describe("table scrolling", function() {
        var $scrollBar;
        var $tbodyWrap;
        var cachedAddRows;

        before(function(){
            $scrollBar = $("#xcTableWrap-" + tableId).find(".tableScrollBar");
            $tbodyWrap = $("#xcTbodyWrap-" + tableId);
            $table.removeClass('autoScroll');
            cachedAddRows = RowManager.prototype.addRows;
        });

        it("scrolling down should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(60);
                expect(numRowsToAdd).to.equal(20);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.false;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            var scrollBarTop = $scrollBar.scrollTop();
            $tbodyWrap.scrollTop(10000);

            if (!ifvisible.now()) {
                $tbodyWrap.scroll();
            }

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() > scrollBarTop;
            })
            .then(function() {
                expect(addRowsCalled).to.be.true;
                expect($scrollBar.scrollTop()).to.be.gt(scrollBarTop);
                return UnitTest.timeoutPromise(300);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("scrolling up should work", function(done) {
            $table.find(".row0").removeClass("row0").addClass("tempRow0");

            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(0);
                expect(numRowsToAdd).to.equal(0);
                expect(dir).to.equal(RowDirection.Top);
                expect(info.bulk).to.be.false;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            var scrollBarTop = $scrollBar.scrollTop();
            $tbodyWrap.scrollTop(0);
            if (!ifvisible.now()) {
                $tbodyWrap.scroll();
            }

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() < scrollBarTop;
            })
            .then(function() {
                expect(addRowsCalled).to.be.true;
                expect($scrollBar.scrollTop()).to.be.lt(scrollBarTop);
                $table.find(".tempRow0").removeClass("tempRow0").addClass("row0");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
        });
    });

    after(function(done) {
        delete gTables["fakeTable"];
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            done();
        });
    });

});