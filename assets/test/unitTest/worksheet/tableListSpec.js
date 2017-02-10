describe('TableList Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var gTableCache = {};
    var gOrphanCache = [];
    var getConstCache;
    

    before(function(done) {
        UnitTest.onMinMode();
        
        if (!$("#workspaceTab").hasClass("active")) {
            $("#workspaceTab .mainTab").click();
        }
        // open up panel
        if (!$("#mainMenu").hasClass("open")) {
            $("#workspaceTab .mainTab").click();
        }
        if (!$("#workspaceMenu menuSection.tables").is(":visible")) {
            $("#tableListTab").click();
        }

        // create some fake tables and fake columns
        var progCol1 = new ProgCol({
            "name"    : "testCol",
            "backName": "testCol",
            "isNewCol": false,
            "func"    : {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name"    : "testCol2",
            "backName": "testCol2",
            "isNewCol": false,
            "func"    : {
                "name": "pull"
            }
        });

        var progCol3 = new ProgCol({
            "name"    : "DATA",
            "backName": "DATA",
            "isNewCol": false,
            "func"    : {
                "name": "raw"
            }
        });

        // save gOrphanTables and gTables in cache for after the test is done
        for (var i = 0; i < gOrphanTables.length; i++) {
            gOrphanCache.push(gOrphanTables[i]);
        }
        gOrphanTables.length = 0;

        for (var t in gTables) {
            gTableCache[t] = gTables[t];
            delete gTables[t];
        }

        var table = new TableMeta({
            "tableName": "unitTest#ZZ1",
            "tableId"  : "ZZ1",
            "tableCols": [progCol1, progCol2, progCol3],
            "isLocked" : false
        });

        var table2 = new TableMeta({
            "tableName": "unitTest#ZZ2",
            "tableId"  : "ZZ2",
            "tableCols": [progCol1, progCol2, progCol3],
            "isLocked" : false
        });

        var table3 = new TableMeta({
            "tableName": "unitTest#ZZ3",
            "tableId"  : "ZZ3",
            "tableCols": [progCol1, progCol2, progCol3],
            "isLocked" : false
        });

        // archived table
        var table4 = new TableMeta({
            "tableName": "unitTest#ZZ4",
            "tableId"  : "ZZ4",
            "tableCols": [progCol1, progCol2, progCol3],
            "isLocked" : false,
            "status": TableType.Archived
        });

        // orphaned table
        var table5 = new TableMeta({
            "tableName": "unitTestOrphan#ZZ5",
            "tableId"  : "ZZ5",
            "tableCols": [progCol1, progCol2, progCol3],
            "isLocked" : false,
            "status"   : TableType.Orphan
        });

        gTables["ZZ1"] = table;
        gTables["ZZ2"] = table2;
        gTables["ZZ3"] = table3;
        gTables["ZZ4"] = table4;
        gTables["ZZ5"] = table5;
        gOrphanTables.push(table5.tableName);
        TableList.clear();

        // constant table
        getConstCache = XcalarGetConstants;
        XcalarGetConstants = function() {
            return PromiseHelper.resolve([{name: "unitTestConst"}]);
        };
        
        // set these fake tables into the tablelist
        TableList.initialize()
        .then(function() {
            done();
        });
       
    });

    describe('initial state', function() {
        it('lists should be visible', function(){
            expect($("#tableListSection").is(":visible")).to.be.true;
        });

        it('orphan table list should be populated', function() {
            expect($("#orphanedTablesList").find('.tableName').filter(function() {
                return $(this).text() === "unitTestOrphan#ZZ5";
            }).length).to.equal(1);
        });
    });

    describe("tabbing between sections", function() {
        it("tabbing should work", function() {
            var $tabs = $(".tableListSectionTab");
            var $sections = $("#tableListSections .tableListSection");

            expect($tabs.length).to.equal(4);
            expect($sections.length).to.equal(4);

            $tabs.eq(0).click();
            expect($tabs.eq(0).hasClass("active")).to.be.true;
            expect($sections.eq(0).is(":visible")).to.be.true;
            expect($tabs.filter(function() {
                return $(this).hasClass("active");
            }).length).to.equal(1);
            expect($sections.filter(function() {
                return $(this).is(":visible");
            }).length).to.equal(1);

            $tabs.eq(1).click();
            expect($tabs.eq(1).hasClass("active")).to.be.true;
            expect($sections.eq(1).is(":visible")).to.be.true;
            expect($tabs.filter(function() {
                return $(this).hasClass("active");
            }).length).to.equal(1);
            expect($sections.filter(function() {
                return $(this).is(":visible");
            }).length).to.equal(1);

            $tabs.eq(2).click();
            expect($tabs.eq(2).hasClass("active")).to.be.true;
            expect($sections.eq(2).is(":visible")).to.be.true;
            expect($tabs.filter(function() {
                return $(this).hasClass("active");
            }).length).to.equal(1);
            expect($sections.filter(function() {
                return $(this).is(":visible");
            }).length).to.equal(1);

            $tabs.eq(3).click();
            expect($tabs.eq(3).hasClass("active")).to.be.true;
            expect($sections.eq(3).is(":visible")).to.be.true;
            expect($tabs.filter(function() {
                return $(this).hasClass("active");
            }).length).to.equal(1);
            expect($sections.filter(function() {
                return $(this).is(":visible");
            }).length).to.equal(1);

            $tabs.eq(0).click();
            expect($tabs.eq(0).hasClass("active")).to.be.true;
            expect($sections.eq(0).is(":visible")).to.be.true;
            expect($tabs.filter(function() {
                return $(this).hasClass("active");
            }).length).to.equal(1);
            expect($sections.filter(function() {
                return $(this).is(":visible");
            }).length).to.equal(1);
        });
    });

    describe("tableListBox sliding", function() {
       
        it('one active table should exist', function() {
            expect($("#activeTablesList .tableListBox").length).to.equal(3);
        });

        it('column sliding down should work', function(done) {
            var $tableListBox = $("#activeTablesList .tableListBox").eq(0);
            expect($tableListBox.closest(".tableInfo").hasClass("active")).to.be.false;
            expect($tableListBox.siblings(".columnList").is(":visible")).to.be.false;

            $tableListBox.click();
            expect($tableListBox.closest(".tableInfo").hasClass("active")).to.be.true;
            expect($tableListBox.siblings(".columnList").is(":visible")).to.be.true;

            $tableListBox.click();
            expect($tableListBox.closest(".tableInfo").hasClass("active")).to.be.false;

            // this may fail because even though the animation is 200ms,
            // 1200ms might still not be enough if it's slow. We can't detect
            // for slideup finishing
            // 
            // allow time for animation
            setTimeout(function() {
                expect($tableListBox.siblings(".columnList").is(":visible")).to.be.false;
                done();
            }, 1200);
           
        });
    });

    describe("addTableBtn", function() {
        it("addTableBtn should work", function() {
            expect($("#activeTablesList").find(".addTableBtn").length).to.equal(3);
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.false;

            $("#activeTablesList").find(".addTableBtn").eq(0).click();
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(1);
            expect($("#activeTablesList").find(".addTableBtn").eq(0).hasClass("selected")).to.be.true;
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.true;

            $("#activeTablesList").find(".addTableBtn").eq(0).click();
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.false;
        });

        it("shift clicking addTableBtn should work", function() {
            // shift select all
            $("#activeTablesList").find(".addTableBtn").eq(0).click();
            var click = fakeEvent.click;
            click.shiftKey = true;
            $("#activeTablesList").find(".addTableBtn").eq(2).trigger(click);
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(3);
            expect($("#activeTablesList").find(".addTableBtn").eq(0).hasClass("selected")).to.be.true;
            expect($("#activeTablesList").find(".addTableBtn").eq(1).hasClass("selected")).to.be.true;
            expect($("#activeTablesList").find(".addTableBtn").eq(2).hasClass("selected")).to.be.true;
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.true;

            // shift deselect all
            $("#activeTablesList").find(".addTableBtn").eq(0).click();
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(2);
            expect($("#activeTablesList").find(".addTableBtn").eq(0).hasClass("selected")).to.be.false;
            expect($("#activeTablesList").find(".addTableBtn").eq(1).hasClass("selected")).to.be.true;
            expect($("#activeTablesList").find(".addTableBtn").eq(2).hasClass("selected")).to.be.true;
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.true;

            var click = fakeEvent.click;
            click.shiftKey = true;
            $("#activeTablesList").find(".addTableBtn").eq(2).trigger(click);
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.false;
        });
    });

    describe("select all and clear all btn", function() {
        it("select all should work", function() {
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.false;

            $("#activeTableListSection").find(".selectAll").click();

            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(3);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.true;
        });
       
        it("clear all should work", function() {
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(3);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.true;

            $("#activeTableListSection").find(".clearAll").click();

            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit").is(":visible")).to.be.false;
        });
    });

    describe("refresh btns", function() {

        it("orphan list refresh btn should work", function() {
            var cachedFn = TableList.refreshOrphanList;
            var refreshCalled = false;
            TableList.refreshOrphanList = function(prettyprint) {
                refreshCalled = true;
                expect(prettyprint).to.be.true;
            }

            $("#orphanedTableListSection .refresh").click();
            expect(refreshCalled).to.be.true;

            TableList.refreshOrphanList = cachedFn;
        });

        it("constant list refresh btn should work", function() {
            var cachedFn = TableList.refreshConstantList;
            var refreshCalled = false;
            TableList.refreshConstantList = function(prettyprint) {
                refreshCalled = true;
                expect(prettyprint).to.be.true;
            }

            $("#constantsListSection .refresh").click();
            expect(refreshCalled).to.be.true;

            TableList.refreshConstantList = cachedFn;
        });
    });

    describe("tablename tooltips", function() {
        it("mouseenter on .tablename should work", function() {
            var cachedFn = xcTooltip.auto;
            var tooltipCalled = false;
            xcTooltip.auto = function() {
                tooltipCalled = true;
            };

            var $tabs = $(".tableListSectionTab");
            var $sections = $("#tableListSections .tableListSection");
            $tabs.eq(2).click();
            expect($sections.eq(2).is(":visible")).to.be.true; 

            $("#orphanedTableListSection").find(".tableName").eq(0).mouseenter();
            expect(tooltipCalled).to.be.true;
        });

        it("mouseenter on .constName should work", function() {
            var cachedFn = xcTooltip.auto;
            var tooltipCalled = false;
            xcTooltip.auto = function() {
                tooltipCalled = true;
            };

            var $tabs = $(".tableListSectionTab");
            var $sections = $("#tableListSections .tableListSection");
            $tabs.eq(3).click();
            expect($sections.eq(3).is(":visible")).to.be.true; 

            $("#constantsListSection").find(".constName").eq(0).mouseenter();
            expect(tooltipCalled).to.be.true;
        });
    });

    describe("submit buttons", function() {
        it("check correct number of btns", function() {
            expect($("#tableListSections").find(".submit.archive").length).to.equal(1);
            expect($("#tableListSections").find(".submit.active").length).to.equal(2);
            expect($("#tableListSections").find(".submit.delete").length).to.equal(3);
        });

        it("submit in active list should work", function() {
            var cachedFn = TblManager.archiveTables;
            var archiveCalled = false;
            TblManager.archiveTables  = function(tableIds) {
                expect(tableIds[0]).to.equal("ZZ3");
                expect(tableIds[1]).to.equal("ZZ2");
                archiveCalled = true;
            };
            $("#activeTableListSection").find(".addTableBtn").eq(0).addClass("selected");
            $("#activeTableListSection").find(".addTableBtn").eq(1).addClass("selected");

            $("#activeTableListSection").find(".submit").click();
            expect(archiveCalled).to.be.true;

            $("#activeTableListSection").find(".addTableBtn").removeClass("selected");
            TblManager.archiveTables = cachedFn;
        });

        it("submit in archived list should work", function() {
            var cachedWSFn = WSManager.getWSIdByName;
            var cachedTableFn = TableList.activeTables;
            var activeCalled = false;
            var getWSIDCalled = false;
            TableList.activeTables = function(tableType, nsTables, wsToSend) {
                expect(tableType).to.equal(TableType.Archived);
                expect(nsTables.length).to.equal(1);
                expect(nsTables[0]).to.equal("ZZ4");
                expect(wsToSend).to.equal("fakeId");
                activeCalled = true;
            };
            WSManager.getWSIdByName = function(wsName) {
                expect(wsName).to.equal("unitTestWS");
                getWSIDCalled = true;
                return "fakeId";
            };

            $("#archivedTableListSection").find(".addTableBtn").eq(0).addClass("selected");
            $("#archivedTableListSection").find(".submit.active").click();

            UnitTest.hasAlertWithTitle(SideBarTStr.SendToWS, {inputVal: 'unitTestWS',
                                        confirm: true});
            expect(activeCalled).to.be.true;
            expect(getWSIDCalled).to.be.true;

            $("#archivedTableListSection").find(".addTableBtn").removeClass("selected");
            WSManager.getWSIdByName = cachedWSFn;
            TableList.activeTables = cachedTableFn;
        });

        it("submit in archived list should produce alert if invalid WS name", function() {
            var cachedTableFn = TableList.activeTables;
            var activeCalled = false;

            TableList.activeTables = function(tableType, nsTables, wsToSend) {
                activeCalled = true;
            };

            $("#archivedTableListSection").find(".addTableBtn").eq(0).addClass("selected");
            $("#archivedTableListSection").find(".submit.active").click();

            UnitTest.hasAlertWithTitle(SideBarTStr.SendToWS, {inputVal: 'unitTestWS',
                                        confirm: true, nextAlert: true});
            UnitTest.hasAlertWithTitle(WSTStr.InvalidWSName);
            expect(activeCalled).to.be.false;

            $("#archivedTableListSection").find(".addTableBtn").removeClass("selected");
            TableList.activeTables = cachedTableFn;
        });

        it("submit in orphaned list should work", function() {
            var cachedTableFn = TableList.activeTables;
            var activeCalled = false;

            TableList.activeTables = function(tableType, nsTables) {
                expect(tableType).to.equal(TableType.Orphan);
                expect(nsTables).to.be.undefined;
                activeCalled = true;
            };

            $("#orphanedTableListSection").find(".addTableBtn").eq(0).addClass("selected");
            $("#orphanedTableListSection").find(".submit.active").click();

            expect(activeCalled).to.be.true;

            $("#orphanedTableListSection").find(".addTableBtn").removeClass("selected");
            TableList.activeTables = cachedTableFn;
        });

        it("submit delete archived should work", function() {
            var tableBulkCache = TableList.tableBulkAction;
            var bulkCalled = false;
            TableList.tableBulkAction = function(action, tableType, wsId) {
                expect(action).to.equal("delete");
                expect(tableType).to.equal(TableType.Archived);
                expect(wsId).to.be.undefined;
                bulkCalled = true;
                return PromiseHelper.resolve();
            };

            $("#archivedTableListSection").find(".submit.delete").click();

            UnitTest.hasAlertWithTitle(TblTStr.Del, {confirm: true});
            expect(bulkCalled).to.be.true;

            TableList.tableBulkAction = tableBulkCache;
        });

        it("submit delete orphaned should work", function() {
            var tableBulkCache = TableList.tableBulkAction;
            var bulkCalled = false;
            TableList.tableBulkAction = function(action, tableType, wsId) {
                expect(action).to.equal("delete");
                expect(tableType).to.equal(TableType.Orphan);
                expect(wsId).to.be.undefined;
                bulkCalled = true;
                return PromiseHelper.resolve();
            };

            $("#orphanedTableListSection").find(".submit.delete").click();

            UnitTest.hasAlertWithTitle(TblTStr.Del, {confirm: true});
            expect(bulkCalled).to.be.true;

            TableList.tableBulkAction = tableBulkCache;
        });

         it("submit delete constants should work", function() {
            var deleteAggsCache = Aggregates.deleteAggs;
            var tableBulkCache = TableList.tableBulkAction;
            var bulkCalled = false;
            var deleteAggsCalled = false;
            TableList.tableBulkAction = function(action, tableType, wsId) {
                bulkCalled = true;
                return PromiseHelper.resolve();
            };
            Aggregates.deleteAggs = function(constNames) {
                expect(constNames.length).to.equal(0);
                deleteAggsCalled = true;
                return PromiseHelper.resolve();
            }

            $("#constantsListSection").find(".submit.delete").click();

            UnitTest.hasAlertWithTitle(SideBarTStr.DropConsts, {confirm: true});
            expect(bulkCalled).to.be.false;
            expect(deleteAggsCalled).to.be.true;

            TableList.tableBulkAction = tableBulkCache;
            Aggregates.deleteAggs = deleteAggsCache;
        });
    });

    describe("clicking on column name", function() {
        it("clicking on column name should call focus on column", function() {
            var cachedCenterFn = xcHelper.centerFocusedColumn;
            var centerCalled = false;
            xcHelper.centerFocusedColumn = function(tableId, colNum) {
                expect(tableId).to.equal("ZZ3");
                expect(colNum).to.equal(2);
                centerCalled = true;
            };

            var $colLis = $("#activeTablesList").find(".column");
            expect($colLis.length).to.equal(6);
            $colLis.eq(1).click();

            expect(centerCalled).to.be.true;

            xcHelper.centerFocusedColumn = cachedCenterFn;
        });
    });

    describe("TableList.clear", function() {
        it("tablelist.clear should work", function() {
            var cachedHtml = [];
            $("#tableListSections").find(".tableLists").each(function() {
                cachedHtml.push($(this).html());
            });
            TableList.clear();
            expect($("#tableListSections").find(".tableLists").html()).to.equal("");
            $("#tableListSections").find(".tableLists").each(function(i){
                $(this).html(cachedHtml[i]); 
            });
        }); 
    });

    describe('TableList.updatePendingState', function() {
        it('updatePendingState() should work', function() {
            // initial state
            var $listWrap = $("#activeTableListSection");
            expect($listWrap.hasClass('pending')).to.be.false;

            // increment
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            //increment again
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            // decrement
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.true;

            //decrement again
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.false;
        });
    });

    describe('table search', function() {
        it('selected tables should clear when searching', function() {
            var $listWrap = $("#orphanedTableListSection");
            var $li = $("#orphanedTablesList").find('.tableName').filter(function() {
                return $(this).text() === "unitTestOrphan#ZZ5";
            });
            var $input = $listWrap.find('.searchbarArea input');
            expect($input.length).to.equal(1);

            expect($listWrap.find('.addTableBtn.selected').length).to.equal(0);
            $li.siblings('.addTableBtn').click();
            expect($listWrap.find('.addTableBtn.selected').length).to.equal(1);
            
            $input.val('e').trigger(fakeEvent.input);
            expect($listWrap.find('.addTableBtn.selected').length).to.equal(0);
            $input.val("").trigger(fakeEvent.input);
        });
    });

    describe("TableList.moveTable", function() {
        it("moveTable should work", function() {
            var cachedActiveListHtml = $("#activeTablesList").html();
            var cachedArchivedListHtml = $("#inactiveTablesList").find(".tableList").html();

            $("#activeTablesList").find(".addTableBtn").addClass("selected");
            $("#activeTableListSection").find(".submit").removeClass("xc-hidden");

            expect($("#activeTablesList .tableListBox").length).to.equal(3);
            expect($("#activeTablesList .tableInfo[data-id='ZZ3']").length).to.equal(1);
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(3);
            expect($("#activeTableListSection").find(".submit.xc-hidden").length).to.equal(0);
            expect($("#inactiveTablesList .tableInfo[data-id='ZZ3']").length).to.equal(0);

            TableList.moveTable("ZZ3");

            expect($("#activeTablesList .tableListBox").length).to.equal(2);
            expect($("#activeTablesList .tableInfo[data-id='ZZ3']").length).to.equal(0);
            expect($("#activeTableListSection").find(".submit.xc-hidden").length).to.equal(1);
            expect($("#activeTablesList").find(".addTableBtn.selected").length).to.equal(0);
            expect($("#inactiveTablesList .tableInfo[data-id='ZZ3']").length).to.equal(1);

            TableList.moveTable("ZZ2");

            // last table
            expect($("#activeTableListSection").find(".timeLine").length).to.equal(1);
            expect($('#activeTableListSection').hasClass("empty")).to.be.false;
            TableList.moveTable("ZZ1");
            expect($("#activeTableListSection").find(".timeLine").length).to.equal(0);
            expect($('#activeTableListSection').hasClass("empty")).to.be.true;

            $('#activeTableListSection').removeClass("empty");
            $("#activeTablesList").html(cachedActiveListHtml);
            $("#inactiveTablesList").find(".tableList").html(cachedArchivedListHtml);
        });
    });

    describe("TableList.updateColName", function() {
        it("updatecolname should work", function() {
            expect($("#activeTablesList").find(".column .text").eq(0).text()).to.equal("1. testCol");
            TableList.updateColName("ZZ3", 1, "renamed");
            expect($("#activeTablesList").find(".column .text").eq(0).text()).to.equal("1. renamed");

            TableList.updateColName("ZZ3", 1, "testCol");
            expect($("#activeTablesList").find(".column .text").eq(0).text()).to.equal("1. testCol");
        });
    });

    describe("TableList.updateTableInfo", function() {
        it("update table info should work", function() {
            var $tabs = $(".tableListSectionTab");
            var $sections = $("#tableListSections .tableListSection");

            $tabs.eq(0).click();
            expect($sections.eq(0).is(":visible")).to.be.true;

            var $tableLi = $("#activeTablesList .tableInfo[data-id='ZZ3']");
            expect($tableLi.length).to.equal(1);
            expect($tableLi.find(".tableListBox").text()).to.equal("unitTest#ZZ3(2)");
            expect($tableLi.find(".column").length).to.equal(2);

            var cols = gTables["ZZ3"].getAllCols();
            var splicedCol = cols.splice(1, 1)[0];
            TableList.updateTableInfo("ZZ3");


            $tableLi = $("#activeTablesList .tableInfo[data-id='ZZ3']");
            expect($tableLi.find(".tableListBox").text()).to.equal("unitTest#ZZ3(1)");
            expect($tableLi.find(".column").length).to.equal(1);
            $tableLi.addClass("active").find(".columnList").show();

            cols.splice(1, 0, splicedCol);
            TableList.updateTableInfo("ZZ3");

            $tableLi = $("#activeTablesList .tableInfo[data-id='ZZ3']");
            expect($tableLi.find(".tableListBox").text()).to.equal("unitTest#ZZ3(2)");
            expect($tableLi.find(".column").length).to.equal(2);
            expect($tableLi.hasClass("active")).to.be.true;
            expect($tableLi.find(".columnList").is(":visible")).to.be.true;
        });
    });

    describe("TableList.checkTableInList", function() {
        it("check table in list should work", function() {
            expect(TableList.checkTableInList("ZZ3")).to.equal(true);
            expect(TableList.checkTableInList("unitTestOrphan#ZZ5", TableType.Orphan)).to.equal(true);
            expect(TableList.checkTableInList("ZZ4", TableType.Archived)).to.equal(true);

            expect(TableList.checkTableInList("ZZ3", TableType.Archived)).to.equal(false);
            expect(TableList.checkTableInList("unitTestOrphan#ZZ5ZZ5", TableType.Archived)).to.equal(false);
            expect(TableList.checkTableInList("ZZ4", TableType.Orphan)).to.equal(false);
        });
    });

    describe("sorting", function() {
        var cachedGetWSList = WSManager.getWSList;
        var cachedGetWSById = WSManager.getWSById;
        var cachedgetHiddenWSList = WSManager.getHiddenWSList;

        before(function() {

        });
        it("sort should work", function() {

            WSManager.getWSList = function() {
                return ["a"];
            };
            WSManager.getWSById = function() {
                return {tables: ["ZZ1", "ZZ2", "ZZ3"]};
            };
            WSManager.getHiddenWSList = function() {
                return [];
            };
            
            var $activeListSection = $(".tableListSection").eq(0);

            $activeListSection.find(".sortName").click();

            expect($activeListSection.hasClass("sortedByName")).to.be.true;
            expect($activeListSection.hasClass("sortedByDate")).to.be.false;
            expect($activeListSection.find(".tableInfo").length).to.equal(3);
            expect($activeListSection.find(".tableName").eq(0).text()).to.equal("unitTest#ZZ1");
            expect($activeListSection.find(".tableName").eq(2).text()).to.equal("unitTest#ZZ3");

            $activeListSection.find(".sortDate").click();

            expect($activeListSection.hasClass("sortedByDate")).to.be.true;
            expect($activeListSection.hasClass("sortedByName")).to.be.false;
            expect($activeListSection.find(".tableInfo").length).to.equal(3);
            expect($activeListSection.find(".tableName").eq(0).text()).to.equal("unitTest#ZZ3");
            expect($activeListSection.find(".tableName").eq(2).text()).to.equal("unitTest#ZZ1");
        });

        after(function() {
            WSManager.getWSList = cachedGetWSList;
            WSManager.getWSById = cachedGetWSById;
            WSManager.getHiddenWSList = cachedgetHiddenWSList;
        });
    });

    after(function() {
        gTables = gTableCache;
        gOrphanTables = gOrphanCache;
        XcalarGetConstants = getConstCache;

        UnitTest.offMinMode();
    });
});