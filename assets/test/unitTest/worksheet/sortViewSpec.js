describe('Sort View Test', function() {
    var $sortView;
    var $sortTable;
    var $table;

    var dsName, tableName, tableId, oldTableName;

    before(function(done){
        xcTooltip.hideAll();
        $sortView = $("#sortView");
        $sortTable = $("#sortView-table");

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_sort_test")
        .then(function(resDS, resTable) {

            dsName = resDS;
            tableName = resTable;
            oldTableName = tableName;
            tableId = xcHelper.getTableId(tableName);
            xcFunction.sort(tableId, [{colNum: 1, order: XcalarOrderingT.XcalarOrderingAscending}])
            .then(function(resTable2) {
                tableName = resTable2;
                tableId = xcHelper.getTableId(tableName);
                $table = $("#xcTable-" + tableId);
                done();
            })
            .fail(function() {
                done("fail");
            });
        })
        .fail(function(error) {
            throw error;
        });
    });

    describe("Basic Function Test", function() {
        it("Should show the Sort View", function() {
            SortView.show([1], tableId);

            assert.isTrue($sortView.is(":visible"));
            expect($sortTable.find(".row").length).to.equal(1);
            expect($sortTable.find(".colOrder").hasClass("initialOrder")).to.be.true;
        });

        it("Should select column", function() {
            SortView.__testOnly__.selectCol(4);
            expect($sortTable.find(".row").length).to.equal(2);
            expect($sortTable.find(".colOrder").eq(1).hasClass("initialOrder")).to.be.false;

            var $rows = $sortTable.find(".row").filter(function(){
                return $(this).find(".text").text() === "Ascending";
            });
            expect($rows.length).to.equal(2);
            expect($("th.modalHighlighted").length).to.equal(2);
        });

        it("Should scroll to column", function() {
            var $th = $table.find("th.col1");
            xcTooltip.hideAll();
            SortView.__testOnly__.scrollToColumn(null);
            expect($th.attr("aria-describedby")).not.to.exist;
            SortView.__testOnly__.scrollToColumn(1);
            expect($th.attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should change column order", function() {
            try {
                // test error case
                SortView.__testOnly__.changeColOrder();
            } catch (error) {
                expect(error).not.to.be.null;
            }

            SortView.__testOnly__.changeColOrder(1, "Descending");
            var $row = $sortTable.find(".row").eq(0);
            expect($row.find(".colOrder .text").text()).to.equal("Descending");
        });

        it("Should deSelect column", function() {
            SortView.__testOnly__.deSelectCol(1);
            SortView.__testOnly__.deSelectCol(4);
            expect($sortTable.find(".row").length).to.equal(0);
            expect($("th.modalHighlighted").length).to.equal(0);
        });

        it("Should submit the form and close the view", function() {
            var oldFunc = ColManager.changeType;
            var oldSort = xcFunction.sort;
            var test = false;
            xcFunction.sort = function() {
                test = true;
            };

            // nothing to sort
            SortView.__testOnly__.submitForm();
            expect(test).to.be.false;
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text())
            .to.equal(ErrTStr.NoSortChange);
            StatusBox.forceHide();

            // tableId doesn't exist
            var table = gTables[tableId];
            delete gTables[tableId];
            SortView.__testOnly__.submitForm();
            expect(test).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.TableNotExists);
            gTables[tableId] = table;

            // one column, already sorted by this column
            SortView.__testOnly__.selectCol(1);
            SortView.__testOnly__.submitForm();
            expect(test).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoSortChange);

            // something to sort
            SortView.__testOnly__.changeColOrder(1, "Descending");
            $sortView.find(".confirm").click();
            expect(test).to.be.true;
            assert.isFalse($sortView.is(":visible"));

            ColManager.changeType = oldFunc;
            xcFunction.sort = oldSort;
        });

        it("restore form should work", function() {
            expect($("th.modalHighlighted").length).to.equal(0);
            SortView.show(null, tableId, {restore: true});
            expect($("th.modalHighlighted").length).to.equal(1);
            expect($sortTable.find(".row").length).to.equal(1);
            $sortView.find(".cancel").click();
        });
    });

    describe("UI Behavior Test", function() {
        var $header;

        before(function() {
            SortView.show([1], tableId);
            $header = $table.find("th.col1 .header");
        });

        it("Should select and deSelect column", function() {
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // deselect
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);

            //select
            $table.find("td.col1").eq(0).click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);

            // deselect
            $header.click();
        });

        it("Should clear all selected column", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // clear
            $sortView.find(".clear").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should click column name to focus", function() {
            // should clear inner data first
            $sortView.find(".clear").click();
            // select
            $header.click();
            expect($sortTable.find(".colName").length).to.equal(1);
            // focus on column name
            $sortTable.find(".colName").click();
            expect($header.closest("th").attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should use sort type menu to change type", function() {
            var $colOrder = $sortTable.find(".colOrder");
            var $sortMenu = $("#sortViewMenu");
            expect($colOrder.hasClass("initialOrder")).to.be.true;
            expect($colOrder.find(".text").text()).to.equal("Ascending");
            // open cast menu
            $colOrder.click();
            assert.isTrue($sortMenu.is(":visible"));
            // change type
            $sortMenu.find('li[data-order="descending"]').trigger(fakeEvent.mouseup);
            expect($colOrder.hasClass("initialOrder")).to.be.false;
            expect($colOrder.find(".text").text()).to.equal("Descending");
            // close cast menu

            assert.isFalse($sortMenu.is(":visible"));

            //select
            SortView.__testOnly__.selectCol(4);
            $colOrder = $sortTable.find(".colOrder").last();
            $colOrder.click();
            expect($sortMenu.hasClass("noInitialOrder")).to.be.true;
            SortView.__testOnly__.deSelectCol(4);
        });

        it("Should not submit when no columns to change type", function() {
            // clear
            $sortView.find(".clear").click();
            // confirm
            $sortView.find(".confirm").click();
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoSort);
            StatusBox.forceHide();
        });

        it("Should close the view", function() {
            $sortView.find(".cancel").click();
            assert.isFalse($sortView.is(":visible"));
            // call another close should have nothing happen
            SortView.close();
            assert.isFalse($sortView.is(":visible"));
        });

        it("should not open view", function() {
            SortView.show([1], tableId, {restoreTime: 1});
            assert.isFalse($sortView.is(":visible"));
        });
    });

    after(function(done) {
        UnitTest.deleteTable(oldTableName, TableType.Orphan)
        .then(function() {
            return UnitTest.deleteAll(tableName, dsName);
        })
        .always(function() {
            done();
        });
    });
});