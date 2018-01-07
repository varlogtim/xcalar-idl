describe("Union View Test", function() {
    var table1;
    var table2;
    var $unionView;

    before(function() {
        console.clear();
        UnitTest.onMinMode();
        $unionView = $("#unionView");

        var progCol1 = ColManager.newPullCol("col1", null, ColumnType.integer);
        var progCol2 = ColManager.newPullCol("col2", null, ColumnType.string);
        table1 = new TableMeta({
            tableName: "a#test1", tableId: "test1",
            tableCols: [progCol1, progCol2]
        });

        var progCol3 = ColManager.newPullCol("col3", null, ColumnType.string);
        var progCol4 = ColManager.newPullCol("col4", null, ColumnType.string);
        table2 = new TableMeta({
            tableName: "b#test2", tableId: "test2",
            tableCols: [progCol3, progCol4]
        });

        gTables["test1"] = table1;
        gTables["test2"] = table2;
    });

    it("should show the union view form", function() {
        UnionView.show("test1", [1]);
        assert.isTrue($unionView.is(":visible"));
        expect($unionView.find(".unionTableList").eq(0).find("input").val())
        .to.equal("a#test1");
    });

    it("should switch union mode", function() {
        var $modeList = $unionView.find(".modeList");
        var $text = $modeList.find(".text");
        var $confirm = $unionView.find(".confirm");
        // default to be union all
        expect($text.text()).to.equal("Union All (Combine all rows)");
        expect($confirm.text()).to.equal("UNION ALL");
        $modeList.find('li[name="union"]').trigger(fakeEvent.mouseup);
        expect($text.text()).to.equal("Union (Combine and deduplicate)");
        expect($confirm.text()).to.equal("Union");
        $modeList.find('li[name="unionAll"]').trigger(fakeEvent.mouseup);
        expect($text.text()).to.equal("Union All (Combine all rows)");
        expect($confirm.text()).to.equal("Union All");
    });

    it("should remove table", function() {
        var $buttons = $unionView.find(".removeTable");
        expect($buttons.length).to.equal(2);
        $buttons.eq(1).click();
        expect($unionView.find(".unionTableList").length).to.equal(1);
    });

    it("should add tabale", function() {
        $unionView.find(".addTable").click();
        expect($unionView.find(".unionTableList").length).to.equal(2);
    });

    it("should select table", function() {
        var oldFunc = WSManager.getTableList;
        WSManager.getTableList = function() {
            return '<li data-id="test2">b#test2</li>';
        };
        var $dropdown = $unionView.find(".unionTableList").eq(1);
        $dropdown.click();
        expect($dropdown.find(".list").hasClass("openList")).to.be.true;

        var $li = $dropdown.find("li");
        expect($li.length).to.equal(1);
        $li.trigger(fakeEvent.mouseup);
        expect($dropdown.find("input").val()).to.equal("b#test2");

        WSManager.getTableList = oldFunc;
    });

    it("should focus on table", function() {
        var oldFunc = xcHelper.centerFocusedTable;
        var testId;
        xcHelper.centerFocusedTable = function(tableId) {
            testId = tableId;
        };

        $unionView.find(".focusTable").eq(0).click();
        expect(testId).to.equal("test1");

        oldFunc = xcHelper.centerFocusedTable;
    });

    it("should search column", function() {
        var $searchInput = $unionView.find(".searchArea input").eq(0);
        // 2 columns should be highlighted
        $searchInput.val("col").trigger("input");
        expect($unionView.find(".highlight").length).to.equal(2);
        // rest
        $searchInput.val("").trigger("input");
        expect($unionView.find(".highlight").length).to.equal(0);
    });

    it("should add column", function() {
        var $candidateList = $unionView.find('.candidateSection .lists[data-index="0"]');

        expect($unionView.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
        expect($candidateList.find(".inputCol").length).to.equal(1);
        $candidateList.find(".addCol").click();
        expect($unionView.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(2);
        expect($unionView.find('.candidateSection .lists[data-index="0"] .inputCol').length)
        .to.equal(0);
    });

    it("should remove column", function() {
        $unionView.find('.resultCol[data-index="1"] .removeCol').click();
        expect($unionView.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
        expect($unionView.find('.candidateSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
    });

    it("should select column", function() {
        var $dropdown = $unionView.find(".columnList").eq(1);
        $dropdown.find(".iconWrapper").click();
        expect($dropdown.find(".list").hasClass("openList")).to.be.true;

        var $li = $dropdown.find("li").filter(function() {
            return $(this).text() === "col3";
        });
        expect($li.length).to.equal(1);
        $li.trigger(fakeEvent.mouseup);
        expect($unionView.find(".columnList").eq(1).find(".text").text())
        .to.equal("col3");
    });

    it("should focus on column", function() {
        var oldFunc = FormHelper.prototype.focusOnColumn;
        var testTableId, testColNum;
        FormHelper.prototype.focusOnColumn = function(tableId, colNum) {
            testTableId = tableId;
            testColNum = colNum
        };
        var $dropdown = $unionView.find(".columnList").eq(0);
        $dropdown.find(".text").click();
        expect(testTableId).to.equal("test1");
        expect(testColNum).to.equal(1);
        FormHelper.prototype.focusOnColumn = oldFunc;
    });

    it("should validate and show empty new table error", function() {
        $unionView.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
    });

    it("should validate and show empty table name error", function() {
        var $input = $unionView.find(".unionTableList").eq(1).find("input");
        var text = $input.val();
        $input.val("");
        $unionView.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        $input.val("text");
    });

    it("should validate and show empty new table error", function() {
        $unionView.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        $unionView.find(".newTableName").val("newTable");
    });

    it("should validate column type error", function() {
        $unionView.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(UnionTStr.Cast);
        expect($unionView.find(".resultCol").hasClass("cast")).to.be.true;
    });

    it("should select type", function() {
        var $dropdown = $unionView.find(".typeList").eq(0);
        $dropdown.click();
        expect($dropdown.find(".list").hasClass("openList")).to.be.true;

        var $li = $dropdown.find("li").filter(function() {
            return $(this).text() === ColumnType.string;
        });
        expect($li.length).to.equal(1);
        $li.trigger(fakeEvent.mouseup);
        expect($dropdown.find("input").val()).to.equal(ColumnType.string);
    });

    it("should submit form", function() {
        var oldFunc = xcFunction.union;
        var test = false;
        xcFunction.union = function() {
            test = true;
        };
        $unionView.find(".confirm").click();
        expect(test).to.be.true;
        xcFunction.union = oldFunc;
        assert.isFalse($unionView.is(":visible"));
    });

    it("call UnionView.close should have no side effect", function() {
        UnionView.close();
        assert.isFalse($unionView.is(":visible"));
    });

    it("should show view with prefill", function(done) {
        UnionView.show("test1", null, {
            prefill: {
                tableCols: [[{
                    name: "col2",
                    type: ColumnType.string
                }]],
                sourceTables: ["a#test1", "b#test2"],
                dest: "newTable2"
            }
        });

        UnitTest.testFinish(function() {
            return $unionView.find(".newTableName").val() === "newTable2";
        })
        .then(function() {
            expect($unionView.find(".unionTableList").length).to.equal(2);
            expect($unionView.find(".resultSection .inputCol").length)
            .to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        delete gTables["test1"];
        delete gTables["test2"];
        UnionView.close();
        UnitTest.offMinMode();
    });
});