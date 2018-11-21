// XXX TODO: fix it
describe("Set Op Panel Test", function() {
    var table1;
    var table2;
    var $setOpPanel;

    before(function() {
        console.clear();
        UnitTest.onMinMode();
        $setOpPanel = $("#setOpPanel");

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

    it("should show the Set Op Pnale", function() {
        setOpPanel.Instance.show("test1", [1]);
        assert.isTrue($setOpPanel.is(":visible"));
        expect($setOpPanel.find(".unionTableList").eq(0).find("input").val())
        .to.equal("a#test1");
    });

    it("should switch union mode", function() {
        var $modeList = $setOpPanel.find(".modeList");
        var $text = $modeList.find(".text");
        var $confirm = $setOpPanel.find(".confirm");
        // default to be union all
        expect($text.text()).to.contains("Union (Combine)");
        expect($confirm.text()).to.equal("Union");
        $modeList.find('li[name="union"]').trigger(fakeEvent.mouseup);
        expect($text.text()).to.contains("Union (Combine)");
        expect($confirm.text()).to.equal("Union");
        $modeList.find('li[name="except"]').trigger(fakeEvent.mouseup);
        expect($text.text()).to.contains("Except (Minus)");
        expect($confirm.text()).to.equal("Except");
        $modeList.find('li[name="intersect"]').trigger(fakeEvent.mouseup);
        expect($text.text()).to.contains("Intersect");
        expect($confirm.text()).to.equal("Intersect");
    });

    it("should remove table", function() {
        var $buttons = $setOpPanel.find(".removeTable");
        expect($buttons.length).to.equal(2);
        $buttons.eq(1).click();
        expect($setOpPanel.find(".unionTableList").length).to.equal(1);
    });

    it("should add tabale", function() {
        $setOpPanel.find(".addTable").click();
        expect($setOpPanel.find(".unionTableList").length).to.equal(2);
    });

    it("should select table", function() {
        var oldFunc = WSManager.getTableList;
        WSManager.getTableList = function() {
            return '<li data-id="test2">b#test2</li>';
        };
        var $dropdown = $setOpPanel.find(".unionTableList").eq(1);
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

        $setOpPanel.find(".focusTable").eq(0).click();
        expect(testId).to.equal("test1");

        xcHelper.centerFocusedTable = oldFunc;
    });

    it("should search column", function() {
        var $searchInput = $setOpPanel.find(".searchArea input").eq(0);
        // 2 columns should be highlighted
        $searchInput.val("col").trigger("input");
        expect($setOpPanel.find(".highlight").length).to.equal(2);
        // rest
        $searchInput.val("").trigger("input");
        expect($setOpPanel.find(".highlight").length).to.equal(0);
    });

    it("should add column", function() {
        var $candidateList = $setOpPanel.find('.candidateSection .lists[data-index="0"]');

        expect($setOpPanel.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
        expect($candidateList.find(".inputCol").length).to.equal(1);
        $candidateList.find(".addCol").click();
        expect($setOpPanel.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(2);
        expect($setOpPanel.find('.candidateSection .lists[data-index="0"] .inputCol').length)
        .to.equal(0);
    });

    it("should remove column", function() {
        $setOpPanel.find('.resultCol[data-index="1"] .removeColInRow').click();
        expect($setOpPanel.find('.resultSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
        expect($setOpPanel.find('.candidateSection .lists[data-index="0"] .inputCol').length)
        .to.equal(1);
    });

    it("should select column", function() {
        var $dropdown = $setOpPanel.find(".columnList").eq(1);
        $dropdown.find(".iconWrapper").click();
        expect($dropdown.find(".list").hasClass("openList")).to.be.true;

        var $li = $dropdown.find("li").filter(function() {
            return $(this).text() === "col3";
        });
        expect($li.length).to.equal(1);
        $li.trigger(fakeEvent.mouseup);
        expect($setOpPanel.find(".columnList").eq(1).find(".text").text())
        .to.equal("col3");
    });

    it("should focus on column", function() {
        var oldFunc = FormHelper.prototype.focusOnColumn;
        var testTableId, testColNum;
        FormHelper.prototype.focusOnColumn = function(tableId, colNum) {
            testTableId = tableId;
            testColNum = colNum
        };
        var $inputCol = $setOpPanel.find(".candidateSection .inputCol").eq(0).eq(0);
        $inputCol.find(".focusCol").click();
        expect(testTableId).to.equal("test1");
        expect(testColNum).to.equal(2);
        FormHelper.prototype.focusOnColumn = oldFunc;
    });

    it("should validate and show empty new table error", function() {
        $setOpPanel.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
    });

    it("should validate and show empty table name error", function() {
        var $input = $setOpPanel.find(".unionTableList").eq(1).find("input");
        var text = $input.val();
        $input.val("");
        $setOpPanel.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        $input.val(text);
    });

    it("should validate and show empty new table error", function() {
        $setOpPanel.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        $setOpPanel.find(".newTableName").val("newTable");
    });

    it("should validate column type error", function() {
        $setOpPanel.find(".confirm").click();
        UnitTest.hasStatusBoxWithError(UnionTStr.Cast);
        expect($setOpPanel.find(".resultCol").hasClass("cast")).to.be.true;
    });

    it("should select type", function() {
        var $dropdown = $setOpPanel.find(".typeList").eq(0);
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
        var oldFunc = XIApi.union;
        var test = false;
        XIApi.union = function() {
            test = true;
        };
        $setOpPanel.find(".confirm").click();
        expect(test).to.be.true;
        XIApi.union = oldFunc;
        assert.isFalse($setOpPanel.is(":visible"));
    });

    it("call close should have no side effect", function() {
        SetOpPanel.Instance.close();
        assert.isFalse($setOpPanel.is(":visible"));
    });

    it("should show view with prefill", function(done) {
        SetOpPanel.Instance.show("test1", null, {
            prefill: {
                tableCols: [[{
                    origName: "col2",
                    type: ColumnType.string
                }]],
                sourceTables: ["a#test1", "b#test2"],
                dest: "newTable2"
            }
        });

        UnitTest.testFinish(function() {
            return $setOpPanel.find(".newTableName").val() === "newTable2";
        })
        .then(function() {
            expect($setOpPanel.find(".unionTableList").length).to.equal(2);
            expect($setOpPanel.find(".resultSection .inputCol").length)
            .to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("pulling column", function() {
        it("should update columns", function() {
            var progCol3 = ColManager.newPullCol("col3", null, ColumnType.string);
            table1.tableCols.push(progCol3);
            expect($setOpPanel.find(".candidateSection .lists").eq(1).find(".inputCol").length).to.equal(1);
            expect($setOpPanel.find(".candidateSection .lists").eq(2).find(".inputCol").length).to.equal(2);
            SetOpPanel.Instance.refreshColumns(table1.getId());
            expect($setOpPanel.find(".candidateSection .lists").eq(1).find(".inputCol").length).to.equal(2);
            expect($setOpPanel.find(".candidateSection .lists").eq(2).find(".inputCol").length).to.equal(2);
        });
    });

    after(function() {
        delete gTables["test1"];
        delete gTables["test2"];
        SetOpPanel.Instance.close();
        UnitTest.offMinMode();
    });
});