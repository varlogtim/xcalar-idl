describe.skip('Sort Op Panel Test', function() {
    var $sortOpPanel;
    var $sortTable;
    var $table;
    var tabId;
    var nodeId;
    var dsName, tableName, tableId, oldTableName;

    before(function(done){
        console.clear();
        xcTooltip.hideAll();
        $sortOpPanel = $("#sortOpPanel");
        $sortTable = $("#sortView-table");

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_sort_test")
        .then(function(resDS, resTable, tPrefix, _nodeId, _tabId) {
            dsName = resDS;
            tableName = resTable;
            oldTableName = tableName;
            tableId = xcHelper.getTableId(tableName);
            nodeId = _nodeId;
            tabId = _tabId;
            return xcFunction.sort(tableId, [{colNum: 1, ordering: XcalarOrderingT.XcalarOrderingAscending}]);
        })
        .then(function(resTable2) {
            MainMenu.openPanel("dagPanel");
            tableName = resTable2;
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTable-" + tableId);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Basic Function Test", function() {
        it("Should show the Sort View", function() {
            SortOpPanel.Instance.show([1], tableId);

            assert.isTrue($sortOpPanel.is(":visible"));
            expect($sortTable.find(".row").length).to.equal(1);
            expect($sortTable.find(".colOrder").hasClass("initialOrder")).to.be.true;
        });

        it("Should select column", function() {
            SortOpPanel.Instance.__testOnly__.selectCol(4);
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
            SortOpPanel.Instance.__testOnly__.scrollToColumn(null);
            expect($th.attr("aria-describedby")).not.to.exist;
            SortOpPanel.Instance.__testOnly__.scrollToColumn(1);
            expect($th.attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should change column order", function() {
            try {
                // test error case
                SortOpPanel.Instance.__testOnly__.changeColOrder();
            } catch (error) {
                expect(error).not.to.be.null;
            }

            SortOpPanel.Instance.__testOnly__.changeColOrder(1, "Descending");
            var $row = $sortTable.find(".row").eq(0);
            expect($row.find(".colOrder .text").text()).to.equal("Descending");
        });

        it("Should deSelect column", function() {
            SortOpPanel.Instance.__testOnly__.deSelectCol(1);
            SortOpPanel.Instance.__testOnly__.deSelectCol(4);
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
            SortOpPanel.Instance.__testOnly__.submitForm();
            expect(test).to.be.false;
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text())
            .to.equal(ErrTStr.NoSortChange);
            StatusBox.forceHide();

            // tableId doesn't exist
            var table = gTables[tableId];
            delete gTables[tableId];
            SortOpPanel.Instance.__testOnly__.submitForm();
            expect(test).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.TableNotExists);
            gTables[tableId] = table;

            // something to sort
            SortOpPanel.Instance.__testOnly__.selectCol(1);
            SortOpPanel.Instance.__testOnly__.changeColOrder(1, "Descending");
            $sortOpPanel.find(".confirm").click();
            expect(test).to.be.true;
            assert.isFalse($sortOpPanel.is(":visible"));

            ColManager.changeType = oldFunc;
            xcFunction.sort = oldSort;
        });

        it("restore form should work", function() {
            expect($("th.modalHighlighted").length).to.equal(0);
            SortOpPanel.Instance.show(null, tableId, {restore: true});
            expect($("th.modalHighlighted").length).to.equal(1);
            expect($sortTable.find(".row").length).to.equal(1);
            $sortOpPanel.find(".cancel").click();
        });
    });

    describe("UI Behavior Test", function() {
        var $header;

        before(function() {
            SortOpPanel.Instance.show([1], tableId);
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
            $sortOpPanel.find(".clear").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should click column name to focus", function() {
            // should clear inner data first
            $sortOpPanel.find(".clear").click();
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
            SortOpPanel.Instance.__testOnly__.selectCol(4);
            $colOrder = $sortTable.find(".colOrder").last();
            $colOrder.click();
            expect($sortMenu.hasClass("noInitialOrder")).to.be.true;
            SortOpPanel.Instance.__testOnly__.deSelectCol(4);
        });

        it("Should not submit when no columns to change type", function() {
            // clear
            $sortOpPanel.find(".clear").click();
            // confirm
            $sortOpPanel.find(".confirm").click();
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoSort);
            StatusBox.forceHide();
        });

        it("Should close the view", function() {
            $sortOpPanel.find(".cancel").click();
            assert.isFalse($sortOpPanel.is(":visible"));
            // call another close should have nothing happen
            SortOpPanel.Instance.close();
            assert.isFalse($sortOpPanel.is(":visible"));
        });

        it("should not open view", function() {
            SortOpPanel.Instance.show([1], tableId, {restoreTime: 1});
            assert.isFalse($sortOpPanel.is(":visible"));
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