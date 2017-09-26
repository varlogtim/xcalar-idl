describe("JoinView Test", function() {
    var testDs;
    var tableName;
    var prefix;
    var $joinForm;
    var tableId;
    var $table;
    var tableName2;
    var tableId2;
    var cachedCenterFn;
    var cachedGetTableList;

    before(function(done) {
        console.clear();
        UnitTest.onMinMode();
        cachedCenterFn = xcHelper.centerFocusedTable;
        cachedGetTableList = WSManager.getTableList;
        xcHelper.centerFocusedTable = function() {return PromiseHelper.resolve();};


        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTableWrap-" + tableId);
            $joinForm = $("#joinView");


              // add a second table for table list testing
            tableName2 = "fakeTable#zz999";
            tableId2 = "zz999";
            var table = new TableMeta({
                "tableId": tableId2,
                "tableName": tableName2,
                "status": TableType.Active,
                "tableCols": []
            });

            gTables[tableId2] = table;

            WSManager.getTableList = function() {
                var tableList =
                        '<li data-id="' + tableId + '">' + tableName + '</li>' +
                        '<li data-id="' + tableId2 + '">' + tableName2 + '</li>';
                return tableList;
            };

            JoinView.show(tableId, [1]);
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("check join initial state", function() {
        it("join type should be selected", function() {
            expect($("#joinType .text:visible")).to.have.lengthOf(1);
            expect($("#joinType .text").text()).to.equal("Inner Join");
            expect($("#joinType li").length).to.equal(4); // in left right full
            // expect($("#joinType li").length).to.equal(9); // in left right full
            // l-semi r-semi l-anti r-anti cross
        });

        it("left table name should be selected", function() {
            expect($("#joinLeftTableList .text").val()).to.equal(tableName);
            expect($joinForm.find(".tableListSection.left .iconWrap")
                .css("pointer-events")).to.not.equal("none");
        });

        it("right table name should not be selected", function() {
            expect($("#joinRightTableList .text").val()).to.equal("");
            expect($joinForm.find(".tableListSection.right .iconWrap")
                .css("pointer-events")).to.equal("none");
        });

        it("should only have one clause row", function() {
            expect($joinForm.find(".joinClause")).to.have.lengthOf(1);
            var colName = prefix + gPrefixSign + "average_stars";
            expect($joinForm.find(".leftClause").val()).to.equal(colName);
            expect($joinForm.find(".leftClause").prop("disabled")).to.be.false;
            expect($joinForm.find(".rightClause").val()).to.equal("");
            expect($joinForm.find(".rightClause").prop("disabled")).to.be.true;
        });

        it("next button should not be clickable", function() {
            expect($joinForm.find(".next:visible").length).to.equal(1);
            expect($joinForm.find(".next").css("pointer-events")).to.equal("none");
        });

        it("exit option on column menu should be available", function() {
            expect($(".xcTableWrap.columnPicker").length).to.be.gte(1);
            expect($table.find(".header").eq(1).find(".dropdownBox").is(":visible")).to.be.true;
            $table.find(".header").eq(1).find(".dropdownBox").click();
            expect($("#colMenu").find(".exitJoin").is(":visible")).to.be.true;
            $(".menu").hide();
        });

        it(".close should work", function() {
            expect($joinForm.find(".close").length).to.equal(1);
            var cachedFn = JoinView.close;
            var called = false;
            JoinView.close = function() {
                called = true;
            };

            $joinForm.find(".close").click();
            expect(called).to.be.true;

            JoinView.close = cachedFn;
        });
    });

    describe("functions test", function() {
        it("deactivateClauseSection should work", function() {
            var $input = $joinForm.find(".joinClause").find(".arg").eq(1);
            $input.removeClass("inActive");
            JoinView.__testOnly__.deactivateClauseSection(1);
            expect($input.hasClass("inActive"));
        });

        it("autoResolveCollisions should work", function() {
            var lOut = [];
            var rOut = [{"orig": "test", "new": "test1", "type": 13}];
            JoinView.__testOnly__.autoResolveCollisions(["test"], 100,
                DfFieldTypeT.DfFatptr, ["testa"], ["test"], lOut, rOut);
            expect(lOut.length).to.equal(1);
            expect(lOut[0].new).to.equal("test_100");

            // case 2
            lOut = [{"orig": "test", "new": "test1", "type": 13}];
            rOut = [];
            JoinView.__testOnly__.autoResolveCollisions(["test"], 100,
                DfFieldTypeT.DfFatptr, ["test"], ["testa"], lOut, rOut);
            expect(rOut.length).to.equal(1);
            expect(rOut[0].new).to.equal("test_100");
        });

        it("smartrename should work", function() {

            var html = '<div id="lFatPtrRenames" class="tableRenames">' +
                            '<div class="colToRename">' +
                                '<input class="origName" value="test">' +
                                '<input class="newName" value="">' +
                            '</div>' +
                            '<div class="rename">' +
                                '<input class="origName" value="test">' +
                                '<input class="newName" value="test">' +
                            '</div>' +
                        '</div>';
            var $div = $(html);
            var $colToRename = $div.find(".colToRename");
            JoinView.__testOnly__.smartRename($colToRename);
            expect($colToRename.find(".newName").val()).to.equal("test1");
        });
    });

    describe("check user actions", function() {
        it("focusTable btn should work", function() {
            var fnCalled = false;

            xcHelper.centerFocusedTable = function(tId) {
                expect(tId).to.equal(tableId);
                fnCalled = true;
            };

            $joinForm.find(".tableListSections .focusTable").eq(0).click();
            expect(fnCalled).to.be.true;
            xcHelper.centerFocusedTable = function() {return PromiseHelper.resolve();};
        });

        it("estimate join size should work", function(done) {
            var cachedFn = ExtensionManager.trigger;
            ExtensionManager.trigger = function() {
                called = true;
                return PromiseHelper.reject();
            };
            expect($joinForm.find(".estimateCheckbox").hasClass("checked")).to.be.false;
            $joinForm.find(".estimateCheckbox").click();
            expect($joinForm.find(".estimateCheckbox").hasClass("checked")).to.be.true;
            UnitTest.testFinish(function() {
                return called = true;
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                ExtensionManager.trigger = cachedFn;
            });
        });
    });

    // to be continued
    describe("check menu and input actions", function() {
        it("tableList menu should select table", function() {
            var $tableList = $joinForm.find(".joinTableList").eq(0);
            var $ul = $tableList.find("ul");
            var $text = $tableList.find(".text");
            expect($ul.length).to.equal(1);
            expect($ul.is(":visible")).to.be.false;
            expect($text.val()).to.equal(tableName);

            $tableList.trigger(fakeEvent.click);
            expect($ul.is(":visible")).to.be.true;
            expect($ul.find("li").length).to.be.gt(1);
            var $selectedLi = $ul.find("li").filter(function() {
                return $(this).text() === tableName;
            });
            expect($selectedLi.length).to.equal(1);
            expect($ul.find("li.selected").is($selectedLi)).to.be.true;

            var $nextLi = $selectedLi.next();
            expect($nextLi.length).to.equal(1);
            var nextLiName = $nextLi.text();
            expect(nextLiName).to.equal(tableName2);
            $nextLi.trigger(fakeEvent.mouseup);
            expect($text.val()).to.equal(tableName2);

            $selectedLi.trigger(fakeEvent.mouseup);
            expect($text.val()).to.equal(tableName);

            var colName = prefix + gPrefixSign + "average_stars";
            $joinForm.find(".leftClause").val(colName);
        });

        it("add another clause should work", function() {
            var addClause = JoinView.__testOnly__.addClause;
            addClause();

            expect($joinForm.find(".joinClause")).to.have.lengthOf(2);
            expect($joinForm.find(".leftClause:eq(1)").val()).to.equal("");
            expect($joinForm.find(".leftClause:eq(1)").prop("disabled")).to.be.false;
            expect($joinForm.find(".rightClause:eq(1)").val()).to.equal("");
            expect($joinForm.find(".rightClause:eq(1)").prop("disabled")).to.be.true;
        });

        it("remove clause should work", function() {
            // should have 2 rows now
            expect($joinForm.find(".middleIcon").length).to.equal(2);
            expect($joinForm.find(".middleIcon:eq(0)").css("pointer-events")).to.equal("none");
            expect($joinForm.find(".middleIcon:eq(1)").css("pointer-events")).to.not.equal("none");

            // remove last row
            $joinForm.find(".middleIcon:eq(1)").click();

            expect($joinForm.find(".middleIcon").length).to.equal(1);
            var colName = prefix + gPrefixSign + "average_stars";
            expect($joinForm.find(".leftClause").val()).to.equal(colName);
            expect($joinForm.find(".leftClause").prop("disabled")).to.be.false;
        });

        it("selecting right table should work", function() {
            expect($joinForm.find(".joinClause")).to.have.lengthOf(1);
            expect($joinForm.find(".rightClause").val()).to.equal("");
            expect($joinForm.find(".rightClause").prop("disabled")).to.be.true;

            $("#joinRightTableList").find(".text").val(tableName).change();

            expect($joinForm.find(".rightClause").val()).to.equal("");
            expect($joinForm.find(".rightClause").prop("disabled")).to.be.false;
            // // rightclause should be focused
            expect($(document.activeElement).is($joinForm.find(".rightClause"))).to.be.true;
        });

        it("next and back button should work", function() {
            expect($joinForm.find(".next:visible").length).to.equal(1);
            expect($joinForm.find(".next").css("pointer-events")).to.equal("none");

            var colName = prefix + gPrefixSign + "average_stars";
            $joinForm.find(".rightClause").val(colName).change();
            expect($joinForm.find(".next").css("pointer-events")).to.not.equal("none");

            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            expect($joinForm.find(".secondStep:visible").length).to.equal(0);
            $joinForm.find(".next").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(0);
            expect($joinForm.find(".secondStep:visible").length).to.equal(1);

            $joinForm.find(".back").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            expect($joinForm.find(".secondStep:visible").length).to.equal(0);
        });

        it("enter key on step1 should activate step2", function() {
            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            expect($joinForm.find(".secondStep:visible").length).to.equal(0);
            $("body").trigger(fakeEvent.enter);
            expect($joinForm.find(".firstStep:visible").length).to.equal(0);
            expect($joinForm.find(".secondStep:visible").length).to.equal(1);


            $joinForm.find(".back").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            expect($joinForm.find(".secondStep:visible").length).to.equal(0);
        });

        it("checkMatchingColTypes should work", function() {
            var check = JoinView.__testOnly__.checkMatchingColTypes;
            var tableCols = gTables[tableId].tableCols;
            var cols = tableCols;
            var checkRes;
            // cols
            // col 11 - yelping_since (string)
            // col 10 - votes (object)
            // col 4 - friends (array)
            // col 7 - review_count (integer)
            // col 0 - average_stars (float)


            checkRes = check([cols[11].backName], [cols[11].backName], [tableId, tableId]);
            expect(cols[11].getType()).to.equal("string");
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[10].backName], [cols[10].backName], [tableId, tableId]);
            expect(cols[10].getType()).to.equal("object");
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[4].backName], [cols[4].backName], [tableId, tableId]);
            expect(cols[4].getType()).to.equal("array");
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.true;


            checkRes = check([cols[7].backName], [cols[7].backName], [tableId, tableId]);
            expect(cols[7].getType()).to.equal("integer");
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.true;

            checkRes = check([cols[7].backName], [cols[11].backName], [tableId, tableId]);
            expect(cols[7].getType()).to.equal("integer");
            expect(cols[7].isImmediate()).to.be.false;
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.false;
            expect(checkRes.errors[0].types[0]).to.equal("integer");
            expect(checkRes.errors[0].types[1]).to.equal("string");
            expect(checkRes.errors[0].row).to.equal(0);

            checkRes = check([cols[7].backName], [cols[0].backName], [tableId, tableId]);
            expect(cols[0].getType()).to.equal("float");
            expect(cols[0].isImmediate()).to.be.false;
            expect(checkRes).to.be.an("object");
            expect(checkRes.success).to.be.true;

        });
    });

    describe("join type menu", function() {
        it("basic selection should work", function() {
            expect($("#joinType").find(".list").length).to.equal(1);
            expect($("#joinType").find(".list:visible").length).to.equal(0);

            $("#joinType").find(".text").trigger(fakeEvent.click);

            expect($("#joinType").find(".list:visible").length).to.equal(1);
            expect($("#joinType").find("li:visible").length).to.equal(4);
            // expect($("#joinType").find("li:visible").length).to.equal(9);
            expect($("#joinType").find(".text").text()).to.equal("Inner Join");

            $("#joinType").find("li").eq(1).trigger(fakeEvent.mouseup);

            expect($("#joinType").find(".text").text()).to.equal("Left Outer Join");
            expect($("#joinType").find(".list:visible").length).to.equal(0);

            $("#joinType").find("li").first().trigger(fakeEvent.mouseup);
            expect($("#joinType").find(".text").text()).to.equal("Inner Join");
        });

        it.skip("selecting semi join should change table selected columns", function() {
            $("#joinType").find(".text").trigger(fakeEvent.click);
            var $leftSemiLi = $("#joinType").find("li").filter(function() {
                return $(this).text() === "Left Semi Join";
            });
            var $rightSemiLi = $("#joinType").find("li").filter(function() {
                return $(this).text() === "Right Semi Join";
            });
            // var $leftAntiLi = $("#joinType").find("li").filter(function() {
            //     return $(this).text() === "Left Anti Semi Join";
            // });
            // var $rightAntiLi = $("#joinType").find("li").filter(function() {
            //     return $(this).text() === "Right Anti Semi Join";
            // });

            $joinForm.find(".joinTableList .arg").eq(1).val(tableName2);
            var col = ColManager.newCol();
            gTables[tableId2].tableCols.unshift(col);
            col.isEmptyCol = function() {return false;};
            col.isDATACol = function() {return false;};

            $("#container").append('<div id="xcTable-' + tableId2 + '"></div>');
            var $fakeTable = $("#xcTable-" + tableId2);
            $fakeTable.append('<div class="testdiv col1 modalHighlighted"></div>');

            expect($fakeTable.find(".modalHighlighted").length).to.equal(1);

            $leftSemiLi.trigger(fakeEvent.mouseup);
            expect($table.find(".modalHighlighted").length).to.be.gt(0);
            expect($fakeTable.find(".modalHighlighted").length).to.equal(0);

            $rightSemiLi.trigger(fakeEvent.mouseup);
            expect($table.find(".modalHighlighted").length).to.equal(0);
            expect($fakeTable.find(".modalHighlighted").length).to.equal(1);

            $leftSemiLi.trigger(fakeEvent.mouseup);
            expect($table.find(".modalHighlighted").length).to.be.gt(0);
            expect($fakeTable.find(".modalHighlighted").length).to.equal(0);

            $("#joinType").find("li").first().trigger(fakeEvent.mouseup);

            $rightSemiLi.trigger(fakeEvent.mouseup);
            expect($table.find(".modalHighlighted").length).to.equal(0);
            expect($fakeTable.find(".modalHighlighted").length).to.equal(1);

            $("#joinType").find("li").first().trigger(fakeEvent.mouseup);
            $joinForm.find(".joinTableList .arg").eq(1).val(tableName);
        });

        it.skip("cross join should work", function() {
            expect($joinForm.hasClass("crossJoin")).to.be.false;
            var $li = $("#joinType").find("li").filter(function() {
                return $(this).text() === "Cross Join";
            });
            $li.trigger(fakeEvent.mouseup);
            expect($joinForm.hasClass("crossJoin")).to.be.true;

            $("#joinType").find("li").first().trigger(fakeEvent.mouseup);
            expect($joinForm.hasClass("crossJoin")).to.be.false;
        });
    });

    describe("clause column pickers", function() {
        it("clause column pickers should work", function() {
            var colName1 = prefix + gPrefixSign + "average_stars";
            var colName2 = prefix + gPrefixSign + "four";
            $joinForm.find(".leftClause").val("").change();
            $joinForm.find(".rightClause").val("").change();
            expect($joinForm.find(".leftClause").val()).to.equal("");
            expect($joinForm.find(".rightClause").val()).to.equal("");

            // type number should work
            $joinForm.find(".leftClause").focus().trigger("focus");
            $table.find(".header").eq(1).click();
            expect($joinForm.find(".leftClause").val()).to.equal(colName1);

            // type object should not work
            $joinForm.find(".rightClause").focus().trigger("focus");
            $table.find(".header").eq(2).click();
            expect($joinForm.find(".rightClause").val()).to.equal("");

            // type boolean should work
            $joinForm.find(".rightClause").focus().trigger("focus");
            $table.find(".header").eq(4).click();
            expect($joinForm.find(".rightClause").val()).to.equal(colName2);

            // add another row of clauses
            JoinView.__testOnly__.addClause();
            expect($joinForm.find(".leftClause").eq(1).val()).to.equal("");
            expect($joinForm.find(".rightClause").eq(1).val()).to.equal("");

            $joinForm.find(".leftClause").eq(1).focus().trigger("focus");
            $table.find(".header").eq(1).click();
            expect($joinForm.find(".leftClause").eq(1).val()).to.equal(colName1);

            $joinForm.find(".rightClause").eq(1).focus().trigger("focus");
            $table.find(".header").eq(4).click();
            expect($joinForm.find(".rightClause").eq(1).val()).to.equal(colName2);

            // remove last clause row
            $joinForm.find(".middleIcon:eq(1)").click();
        });

        it("table title picker should work", function() {
            $("#joinLeftTableList input").val("").focus().trigger("focus");
            expect($("#joinLeftTableList input").val()).to.equal("");
            $table.find(".xcTheadWrap").click();
            expect($("#joinLeftTableList input").val()).to.equal(tableName);
        });
    });

    describe("column selector", function() {
        it("column selector should work", function() {
            // set up step 2 view
            var colName = prefix + gPrefixSign + "yelping_since";
            $joinForm.find(".leftClause").val(colName).change();
            $joinForm.find(".rightClause").val(colName).change();

            $joinForm.find(".next").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(0);
            expect($joinForm.find(".secondStep:visible").length).to.equal(1);

            // start test for left table

            var numCols = $joinForm.find(".leftCols li").length;
            expect(numCols).to.be.gt(4);
            expect($joinForm.find(".leftCols li.checked").length).to.equal(numCols);

            $joinForm.find(".leftCols li").eq(0).click();
            expect($joinForm.find(".leftCols li.checked").length).to.equal(numCols - 1);

            $joinForm.find(".leftCols li").eq(0).click();
            expect($joinForm.find(".leftCols li.checked").length).to.equal(numCols);

            // deselect and select all
            $joinForm.find(".leftColHeading .checkbox").click();
            expect($joinForm.find(".leftCols li.checked").length).to.equal(0);
            expect($joinForm.find(".leftColHeading .checkbox").hasClass("checked")).to.be.false;
            $joinForm.find(".leftColHeading .checkbox").click();
            expect($joinForm.find(".leftCols li.checked").length).to.equal(numCols);
            expect($joinForm.find(".leftColHeading .checkbox").hasClass("checked")).to.be.true;

            // start test for right table

            numCols = $joinForm.find(".rightCols li").length;
            expect(numCols).to.be.gt(4);
            expect($joinForm.find(".rightCols li.checked").length).to.equal(numCols);

            $joinForm.find(".rightCols li").eq(0).click();
            expect($joinForm.find(".rightCols li.checked").length).to.equal(numCols - 1);

            $joinForm.find(".rightCols li").eq(0).click();
            expect($joinForm.find(".rightCols li.checked").length).to.equal(numCols);

            // deselect and select all
            $joinForm.find(".rightColHeading .checkbox").click();
            expect($joinForm.find(".rightCols li.checked").length).to.equal(0);
            expect($joinForm.find(".rightColHeading .checkbox").hasClass("checked")).to.be.false;
            $joinForm.find(".rightColHeading .checkbox").click();
            expect($joinForm.find(".rightCols li.checked").length).to.equal(numCols);
            expect($joinForm.find(".rightColHeading .checkbox").hasClass("checked")).to.be.true;
        });

        it("shift clicking on column list should work", function() {
            expect($joinForm.find(".leftCols li").eq(0).find(".checked").length).to.equal(1);
            $joinForm.find(".leftCols li").eq(0).click();
            expect($joinForm.find(".leftCols li").eq(0).find(".checked").length).to.equal(0);

            var event = {"type": "click", "which": 1, "shiftKey": true};
            expect($joinForm.find(".leftCols li").eq(1).find(".checked").length).to.equal(1);
            expect($joinForm.find(".leftCols li").eq(2).find(".checked").length).to.equal(1);
            $joinForm.find(".leftCols li").eq(2).trigger(event);
            expect($joinForm.find(".leftCols li").eq(1).find(".checked").length).to.equal(0);
            expect($joinForm.find(".leftCols li").eq(2).find(".checked").length).to.equal(0);

            $joinForm.find(".leftCols li").eq(0).click();
            $joinForm.find(".leftCols li").eq(2).trigger(event);
            expect($joinForm.find(".leftCols li").eq(0).find(".checked").length).to.equal(1);
            expect($joinForm.find(".leftCols li").eq(1).find(".checked").length).to.equal(1);
            expect($joinForm.find(".leftCols li").eq(2).find(".checked").length).to.equal(1);
        });


        it("colheaderclick should work", function() {
            // deselect 1st column
            var $target = $table.find(".header").eq(1);
            var event = {};
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            JoinView.__testOnly__.colHeaderClick($target, event);
            expect($target.closest(".modalHighlighted").length).to.equal(0);

            // shift deselect 3rd column
            $target = $table.find(".header").eq(3);
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            expect($table.find(".header").eq(2).closest(".modalHighlighted").length).to.equal(1);
            event.shiftKey = true;
            JoinView.__testOnly__.colHeaderClick($target, event);
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            expect($table.find(".header").eq(2).closest(".modalHighlighted").length).to.equal(0);

            // select 1st column
            $target = $table.find(".header").eq(1);
            event = {};
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            JoinView.__testOnly__.colHeaderClick($target, event);
            expect($target.closest(".modalHighlighted").length).to.equal(1);

            // shift select 3rd column
            $target = $table.find(".header").eq(3);
            expect($target.closest(".modalHighlighted").length).to.equal(0);
            expect($table.find(".header").eq(2).closest(".modalHighlighted").length).to.equal(0);
            event.shiftKey = true;
            JoinView.__testOnly__.colHeaderClick($target, event);
            expect($target.closest(".modalHighlighted").length).to.equal(1);
            expect($table.find(".header").eq(2).closest(".modalHighlighted").length).to.equal(1);
        });

        it("should go back to step 1", function() {
            $joinForm.find(".back").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            expect($joinForm.find(".secondStep:visible").length).to.equal(0);
        });
    });

    describe("smart suggest", function() {
        var colName;
        var nextBestColName;

        before(function() {
            colName = prefix + gPrefixSign + "yelping_since";
            nextBestColName = prefix + gPrefixSign + "user_id";
        });

        it ("smart suggest on self join col should work", function() {
            $("#joinRightTableList").find(".arg").val(tableName);
            $joinForm.find(".leftClause").val(colName).change();
            $joinForm.find(".rightClause").val("").change();
            expect($joinForm.find(".rightClause").val()).to.equal("");

            $joinForm.find(".smartSuggest").click();

            expect($joinForm.find(".rightClause").val())
            .to.equal(nextBestColName);


            $joinForm.find(".leftClause").val("").change();
            $joinForm.find(".rightClause").val(colName).change();
            $joinForm.find(".smartSuggest").click();
            expect($joinForm.find(".leftClause").val())
            .to.equal(nextBestColName);
        });

        it("smart suggest error should show if both inputs filled", function() {
            var cachededTooltipFunc = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect($el.is($joinForm.find(".smartSuggest").siblings(".suggError"))).to.be.true;
                expect(options.title).to.equal(JoinTStr.NoColToCheck);
                called = true;
            };

            expect($joinForm.find(".leftClause").val())
            .to.equal(nextBestColName);
            expect($joinForm.find(".rightClause").val()).to.equal(colName);

            $joinForm.find(".smartSuggest").click();
            expect(called).to.be.true;
            xcTooltip.transient = cachededTooltipFunc;
        });

        it("smart suggest with no right table should show error", function() {
            var cachededTooltipFunc = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect($el.is($joinForm.find(".smartSuggest").siblings(".suggError"))).to.be.true;
                expect(options.title).to.equal("Select right table first");
                called = true;
            };

            var cachedText = $("#joinRightTableList").find(".arg").val();
            $("#joinRightTableList").find(".arg").val("");
            $joinForm.find(".smartSuggest").click();
            expect(called).to.be.true;
            $("#joinRightTableList").find(".arg").val(cachedText);
            xcTooltip.transient = cachededTooltipFunc;
        });
    });

    describe("function checkFirstView", function() {
        it("checkFirstView should work", function() {
            var check = JoinView.__testOnly__.checkFirstView;

            var firstColName = prefix + gPrefixSign + "yelping_since"; // string
            var secondColName = prefix + gPrefixSign + "votes"; // obj
            var thirdColName = prefix + gPrefixSign + "average_stars"; // num
            var fourthColName = prefix + gPrefixSign + "user_id"; // string

            $joinForm.find(".leftClause").val("").change();
            $joinForm.find(".rightClause").val("").change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val(firstColName).change();
            $joinForm.find(".rightClause").val(secondColName).change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val(secondColName).change();
            $joinForm.find(".rightClause").val(thirdColName).change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val(secondColName).change();
            $joinForm.find(".rightClause").val(secondColName).change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val(firstColName).change();
            $joinForm.find(".rightClause").val("").change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val("test").change();
            $joinForm.find(".rightClause").val("test").change();
            expect(check()).to.be.false;

            $joinForm.find(".leftClause").val(firstColName).change();
            $joinForm.find(".rightClause").val(fourthColName).change();
            expect(check()).to.be.true;

            $joinForm.find(".leftClause").val(thirdColName).change();
            $joinForm.find(".rightClause").val(thirdColName).change();
            expect(check()).to.be.true;

            $joinForm.find(".leftClause").val(firstColName).change();
            $joinForm.find(".rightClause").val(firstColName).change();
            expect(check()).to.be.true;
        });
    });

    describe("function validTableNameChecker", function() {
        it("validTableNameChecker should work", function() {
            var check = JoinView.__testOnly__.validTableNameChecker;
            $("#joinLeftTableList input").val("test");
            $("#joinRightTableList input").val("test");
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val("test");
            $("#joinRightTableList input").val(tableName);
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val(tableName);
            $("#joinRightTableList input").val("test");
            expect(check()).to.equal(false);

            $("#joinLeftTableList input").val(tableName);
            $("#joinRightTableList input").val(tableName);
            expect(check()).to.equal(true);
        });
    });

    describe("Join Estimator Test", function() {
        it("join estimator should work", function(done) {
            var oldTrigger = ExtensionManager.trigger;

            ExtensionManager.trigger = function() {
                return PromiseHelper.resolve({
                    "minSum": 1,
                    "expSum": 2,
                    "maxSum": 3
                });
            };

            $joinForm.find(".next").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(0);
            expect($joinForm.find(".secondStep:visible").length).to.equal(1);

            var $stats = $joinForm.find(".stats");
            assert.isFalse($stats.is(":visible"));

            JoinView.__testOnly__.estimateJoinSize()
            .then(function() {
                assert.isTrue($stats.is(":visible"));
                var expectedText = "Min:1Med:2Max:3";
                expect($stats.text().replace(/ /g, "").replace(/\n/g, ""))
                .to.equal(expectedText);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                ExtensionManager.trigger = oldTrigger;
            });
        });

        it("should handle error case", function(done) {
            var oldTrigger = ExtensionManager.trigger;

            ExtensionManager.trigger = function() {
                return PromiseHelper.reject("testError");
            };

            var $stats = $joinForm.find(".stats");

            JoinView.__testOnly__.estimateJoinSize()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("testError");
                var expectedText = "Min:N/AMed:N/AMax:N/A";
                expect($stats.text().replace(/ /g, "").replace(/\n/g, ""))
                .to.equal(expectedText);
                done();
            })
            .always(function() {
                ExtensionManager.trigger = oldTrigger;
            });
        });
    });

    describe("check constants", function() {
        // submission fail handler relies on this
        it("status_types should have out of (memory) property", function() {
            var oomMsgs = [];
            for (var i in StatusTStr) {
                if (StatusTStr[i].toLowerCase().indexOf("out of resource") > -1) {
                    oomMsgs.push(StatusTStr[i]);
                }
            }
            expect(oomMsgs.length).to.be.gt(1);
        });
    });

    describe("submission fail handler", function() {
        var fn;
        before(function() {
            fn = JoinView.__testOnly__.submissionFailHandler;

        });

        it("submissionFailHandler should work", function() {
            fn(tableId, tableId, Date.now(), {status: StatusT.StatusCanceled});
            expect($("#alertModal").is(":visible")).to.be.false;
        });

        it("submissionFailHandler should be able to show jsonModal", function() {
            var jsonModalCache = JSONModal.show;
            var jsonModalOpened = false;
            JSONModal.show = function($td) {
                expect($td.hasClass("col13")).to.be.true;
                jsonModalOpened = true;
            };

            Alert.show({title: "Join Fail", msg: "something went wrong"});
            fn(tableId, tableId, Date.now(), {status: StatusT.StatusMaxJoinFieldsExceeded});
            UnitTest.hasAlertWithText("something went wrong\nPlease project " +
                                "to reduce the number of columns and retry.",
                                {confirm: true});
            expect(jsonModalOpened).to.be.true;

            JSONModal.show = jsonModalCache;
        });

        it("submissionFailHandler should be able to show delete table modal", function() {
            var deleteModalCache = DeleteTableModal.show;
            var deleteModalOpened = false;
            DeleteTableModal.show = function() {
                deleteModalOpened = true;
            };

            Alert.show({title: "Join Fail", msg: "some error"});
            fn(tableId, tableId, Date.now(), {status: 1});
            UnitTest.hasAlertWithText("some error");
            expect(deleteModalOpened).to.be.false;

            Alert.show({title: "Join Fail", msg: "out of resources"});
            fn(tableId, tableId, Date.now(), {status: 1});
            UnitTest.hasAlertWithText("out of resources.", {confirm: true});
            expect(deleteModalOpened).to.be.true;

            DeleteTableModal.show = deleteModalCache;
        });

        it("submissionFailHandler should show modify button", function() {
            var formHelper = JoinView.__testOnly__.getFormHelper();
            Alert.show({title: "Join Fail", msg: "some error"});
            fn(tableId, tableId, formHelper.getOpenTime(), {});
            expect($("#alertModal .confirm:visible").text()).to.equal("MODIFY JOIN");
            UnitTest.hasAlertWithTitle("Join Failed");
        });
    });

    describe("submit test", function() {
        it("invalid type should show cast", function() {
            $joinForm.find(".back").click();
            expect($joinForm.find(".firstStep:visible").length).to.equal(1);
            var colName = prefix + gPrefixSign + "average_stars";
            $joinForm.find(".leftClause").val(colName);

            $joinForm.find(".next").click();

            // cast error appears
            expect($joinForm.find(".leftCast").is(":visible")).to.be.true;
            $joinForm.find(".leftCast li").last().trigger(fakeEvent.mouseup);
            expect($joinForm.find(".leftCast input").val()).to.equal("string");
            $joinForm.find(".next").click();
        });

        it("invalid submit should not work", function(done) {
            var submit = JoinView.__testOnly__.submitJoin;

            var newTableName = "joinUnitTest" + Date.now();
            $("#joinTableNameInput").val(newTableName);
            expect($joinForm.find(".renameSection").is(":visible")).to.be.false;

            // should fail because needs rename;
            submit()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                xcTooltip.hideAll();
                expect($joinForm.find(".renameSection").is(":visible")).to.be.true;
                done();
            });
        });

        it("renaming should work", function() {
            var $renameSection = $joinForm.find(".renameSection");
            expect($renameSection.is(":visible")).to.be.true;
            $renameSection.find(".option").eq(0).click();
            $renameSection.find(".copyAll").eq(0).trigger({"type": "click", "which": 3});
            expect($joinForm.find(".newName").eq(0).val()).to.equal("");
            $renameSection.find(".copyAll").eq(0).trigger(fakeEvent.click);
            expect($joinForm.find(".newName").eq(0).val()).to.equal(prefix);

            $renameSection.find(".copyAppend").eq(0).trigger({"type": "click", "which": 3});
            expect($joinForm.find(".newName").eq(0).val()).to.equal(prefix);
            $renameSection.find(".copyAppend").eq(0).trigger(fakeEvent.click);
            expect($joinForm.find(".newName").eq(0).val()).to.equal(prefix);

            $renameSection.find(".copyAppend input").val("a");
            $renameSection.find(".copyAppend input").eq(0).trigger(fakeEvent.input);
            expect($joinForm.find(".newName").eq(0).val()).to.equal(prefix + "a");

            $joinForm.find(".newName").eq(0).val("testYelp1");
            $joinForm.find(".newName").eq(1).val("testYelp2");
            var colName = prefix + gPrefixSign + "yelping_since";
            $joinForm.find(".leftClause").val(colName);
        });

        it("valid submit should work", function(done) {
            var submit = JoinView.__testOnly__.submitJoin;

            submit()
            .then(function(newTableName) {
                var tableId = xcHelper.getTableId(newTableName);
                expect(tableId).to.not.be.null;
                expect(gTables[tableId].resultSetCount).to.equal(14878);
                Log.undo()
                .always(function() {
                    done();
                });
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function(done) {
        JoinView.close();
        $("#menuBar").removeClass("animating");
        xcHelper.centerFocusedTable = cachedCenterFn;
        WSManager.getTableList = cachedGetTableList;
        delete gTables[tableId2];

        UnitTest.removeOrphanTable()
        .always(function() {
            UnitTest.deleteAll(tableName, testDs)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        });
    });
});
