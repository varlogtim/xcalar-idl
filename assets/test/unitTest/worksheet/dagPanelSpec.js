describe("Dag Panel Test", function() {
    var $dagPanel;
    var testDs;

    var aggTable;
    var largeTable;
    var groupTable;
    var smallTable;

    var aggName;
    var rightMouseup;

    function timeOutPromise(amtTime) {
        var waitTime = amtTime || 1000;
        var deferred = PromiseHelper.deferred();
        setTimeout(function() {
            deferred.resolve();
        }, waitTime);
        return deferred;
    }

    before(function(done) {
        console.clear();
        this.timeout(200000);
        UnitTest.onMinMode();

        // Todo: clean this up.
        var aggTableName;
        var aggTableId;
        var tableName;
        var prefix;
        var tableId;
        var tableName2;
        var tableId2;
        var $dagWrap;

        var prefixA;
        var tableIdA;
        var tableName2A;
        var tableId2A;
        var $dagWrapA;

        var largeTableNames = [];
        var largeTableIds = [];
        var largePrefix;
        var $largeDagWrap;

        var groupTableName;
        var groupTableId;
        var $groupDagWrap;

        rightMouseup = {
            type: "mouseup",
            which: 3
        };

        smallTable = {
            "prefix": undefined,
            "tableName": undefined,
            "tableId": undefined,
            "ancestorIds": [],
            "ancestorNames": [],
            "$dagWrap": undefined,
        };
        aggTable = {
            "prefix": undefined,
            "tableName": undefined,
            "tableId": undefined,
            "ancestorIds": [],
            "ancestorNames": [],
            "$dagWrap": undefined,
        };
        largeTable = {
            "prefix": undefined,
            "tableName": undefined,
            "tableId": undefined,
            "ancestorIds": [],
            "ancestorNames": [],
            "$dagWrap": undefined,
        };
        groupTable = {
            "prefix": undefined,
            "tableName": undefined,
            "tableId": undefined,
            "ancestorIds": [],
            "ancestorNames": [],
            "$dagWrap": undefined,
        };

        // Test table layout:
        // dag: ds --load from ds--> table --reduce--> $table
        // largeDag: ds--loadfromds--> table --map X 14--> $largeTable

        //TODO: (tests)
        // -Perform a join on $table, $largeTable, $groupTable
        //     -Need a join on 3+ table to get to the drawExtraCurves code in
        //      dag.js
        // -Check dag ancestry (nodeinfo) for joinTable, groupTable, largeTable,
        //    aggTable and smallTable.
        // -Expanding & contracting on joined tables
        // -Removing aggregates (?)
        // -Check more graphical things (are canvases being drawn correctly,
        //     scrolling, etc.)
        // TODO: (general)
        // -replace a lot of the timeouts with direct function calls
        // -replace largeDag with a faux-dag for the expand/contract calls.
        //

        function makeLargeDag(total, base) {
            var deferred = PromiseHelper.deferred();
            var curIter = 0;
            var curId = largeTableIds[curIter + base];
            var firstTableName = largePrefix + "#" + curId;
            var cols = xcHelper.deepCopy(gTables[curId].tableCols);

            var queryStr = "";
            var newTName;
            var fieldName;
            var mapStr;
            for (var i = 0; i < total; i++) {
                curId = largeTableIds[curIter + base];
                var nextId = Authentication.getHashId().slice(1);
                mapStr = "add(" + largePrefix + "::average_stars, 1)";

                fieldName = "mapped_col_" + String(curIter);
                newTName = largePrefix + '#' + nextId;
                queryStr += 'map --eval "' + mapStr +
                        '" --srctable "' + largePrefix + '#' + curId +
                        '" --fieldName "' + fieldName +
                        '" --dsttable "' + newTName + '";';
                largeTableNames.push(newTName);
                largeTableIds.push(nextId);

                curIter++;
            }

            var qName = "dfUnitTest" + Math.floor(Math.random() * 10000);
            XcalarQueryWithCheck(qName, queryStr)
            .then(function() {
                var tablCols = xcHelper.mapColGenerate(1, fieldName, mapStr,
                                                    cols, {});
                return TblManager.refreshTable([newTName], tablCols,
                                           [firstTableName],
                                           WSManager.getActiveWS(), null,
                                           {});
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        }

        $dagPanel = $("#dagPanel");
        var testDSObj = testDatasets.fakeYelp;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            var filterStr = "eq(" + prefix + gPrefixSign +
                            'yelping_since, "2008-03")';
            return xcFunction.filter(1, tableId, {filterString: filterStr});
        })
        .then(function(ret) {
            tableId2 = tableId;
            tableName2 = tableName;
            tableName = ret;
            tableId = xcHelper.getTableId(tableName);

            var backName = prefix + gPrefixSign + "average_stars";
            var colNum = gTables[tableId].getColNumByBackName(backName);
            var aggrOp = "avg";
            var aggStr = backName;
            aggName = xcHelper.randName("testAgg", 6);
            return xcFunction.aggregate(colNum, tableId, aggrOp, aggStr, aggName);

        })
        .then(function() {
            Alert.forceClose();
            var mapStr = "add(" + gTables[tableId].getCol(1).backName +
                         ",^" + aggName + ")";
            return xcFunction.map(1, tableId, "agg_result", mapStr);
        })
        .then(function(ret) {
            aggTableName = ret;
            aggTableId = xcHelper.getTableId(aggTableName);
            $dagWrap = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                      dWrap) {
                var dTableName = $(dWrap).find(".dagTable").first()
                                        .data("tablename");
                return (dTableName === aggTableName);
            });

            return UnitTest.addTable(testDs);
        })
        .then(function(tName, tPrefix) {
            tableNameA = tName;
            prefixA = tPrefix;
            tableIdA = xcHelper.getTableId(tableNameA);
            var filterStr = 'eq(' + prefixA + gPrefixSign +
                            'yelping_since, "2008-03")';
            return xcFunction.filter(1, tableIdA, {filterString: filterStr});
        })
        .then(function(ret) {
            tableId2A = tableIdA;
            tableName2A = tableNameA;
            tableNameA = ret;
            tableIdA = xcHelper.getTableId(tableNameA);

            $dagWrapA = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                      dWrap) {
                var dTableName = $(dWrap).find(".dagTable").first()
                                        .data("tablename");
                return (dTableName === tableNameA);
            });

            return UnitTest.addTable(testDs);
        })
        .then(function(tName, tPrefix) {
            // Perform a filter to decrease time incurred by mapping
            largePrefix = tPrefix;
            largeTableNames.push(tName);
            largeTableIds.push(xcHelper.getTableId(tName));
            var filterStr = 'eq(' + tPrefix + gPrefixSign +
                            'yelping_since, "2008-04")';
            return xcFunction.filter(1, xcHelper.getTableId(tName),
                {filterString: filterStr});
        })
        .then(function(ret) {
            var retId = xcHelper.getTableId(ret);
            largeTableNames.push(ret);
            largeTableIds.push(retId);

            return makeLargeDag(14, largeTableIds.length - 1);
        })
        .then(function() {
            $largeDagWrap = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                        dWrap) {
                var dTableName = $(dWrap).find(".dagTable").first()
                                         .data("tablename");
                return (dTableName === largeTableNames[largeTableNames.length - 1]);
            });
        })
        .then(function() {
            // Now perform groupby
            var operator = "count";
            var tId = largeTableIds[largeTableIds.length - 1];
            var groupByCols = [largePrefix + gPrefixSign + "four",
                               largePrefix + gPrefixSign + "yelping_since"];
            var aggCol = largePrefix + gPrefixSign + "four";
            var newColName = "four_count";
            var gbArgs = [{
                operator: operator,
                aggColName: aggCol,
                newColName: newColName
            }];

            return xcFunction.groupBy(tId, gbArgs, groupByCols, {});
        })
        .then(function(ret) {
            groupTableName = ret;
            groupTableId = xcHelper.getTableId(ret);
            $groupDagWrap = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                    dWrap) {
                var dTableName = $(dWrap).find(".dagTable").first()
                                         .data("tablename");
                return (dTableName === groupTableName);
            });
            $("#alertModal").find(".close").click();


            aggTable.prefix = prefix;
            aggTable.tableName = aggTableName;
            aggTable.tableId = aggTableId;
            aggTable.ancestorIds = [tableId2, tableId].reverse();
            aggTable.ancestorNames = [tableName2, tableName].reverse();
            aggTable.$dagWrap = $dagWrap;

            smallTable.prefix = prefixA;
            smallTable.tableName = tableNameA;
            smallTable.tableId = tableIdA;
            smallTable.ancestorIds = [tableId2A].reverse();
            smallTable.ancestorNames = [tableName2A].reverse();
            smallTable.$dagWrap = $dagWrapA;

            largeTable.prefix = largePrefix;
            largeTable.tableName = largeTableNames[largeTableNames.length - 1];
            largeTable.tableId = largeTableIds[largeTableIds.length - 1];
            largeTable.ancestorIds = largeTableIds.slice(0,
                                                largeTableIds.length - 1).reverse();
            largeTable.ancestorNames = largeTableNames.slice(0,
                                                largeTableNames.length - 1).reverse();
            largeTable.$dagWrap = $largeDagWrap;

            groupTable.prefix = largePrefix;
            groupTable.tableName = groupTableName;
            groupTable.tableId = groupTableId;
            groupTable.ancestorIds = largeTableIds.reverse();
            groupTable.ancestorNames = largeTableNames.reverse();
            groupTable.$dagWrap = $groupDagWrap;

            done();
        })
        .fail(function() {
            done("failed");
        });
    });

    describe("Dag icon names correct", function() {
        it("Above", function() {
            expect(smallTable.$dagWrap.find(".dagTable span").first().text())
            .to.equal(smallTable.tableName);
            expect(aggTable.$dagWrap.find(".dagTable span").first().text())
            .to.equal(aggTable.tableName);
            expect(largeTable.$dagWrap.find(".dagTable span").first().text())
            .to.equal(largeTable.tableName);
            expect(groupTable.$dagWrap.find(".dagTable span").first().text())
            .to.equal(groupTable.tableName);
        });
    });

    describe("dag panel opening, closing", function() {
        var $switch;

        before(function() {
            $switch = $("#dfPanelSwitch");
        });

        it("panel should open", function(done) {
            var scrollBarCheck = false;

            var scrollBarFunc = DagPanel.adjustScrollBarPositionAndSize;

            DagPanel.adjustScrollBarPositionAndSize = function() {
                scrollBarCheck = true;
            };

            expect($dagPanel.hasClass("hidden")).to.be.true;
            expect($dagPanel.hasClass("xc-hidden")).to.be.true;
            expect($switch.hasClass("active")).to.be.false;
            expect($dagPanel.offset().top)
            .to.not.equal($("#mainFrame").offset().top);


            // open panel
            $switch.click();

            expect(scrollBarCheck).to.be.false;

            setTimeout(function() {
                expect($dagPanel.hasClass("hidden")).to.be.false;
                expect($dagPanel.hasClass("xc-hidden")).to.be.false;
                expect($switch.hasClass("active")).to.be.true;
                expect($dagPanel.offset().top)
                .to.equal($("#mainFrame").offset().top);
                expect($("#mainFrame").height()).to.equal(0);
                expect(scrollBarCheck).to.be.true;

                DagPanel.adjustScrollBarPositionAndSize = scrollBarFunc;

                done();
            }, 2000);
        });

        it("panel should close", function(done) {
            var rowScrollCheck = false;

            // close panel
            $switch.click();
            expect(rowScrollCheck).to.be.false;
            expect($dagPanel.attr("style").indexOf("top")).to.be.gt(-1);

            setTimeout(function() {
                expect($("#mainFrame").height()).to.be.gt(0);
                expect($dagPanel.hasClass("hidden")).to.be.true;
                expect($dagPanel.hasClass("xc-hidden")).to.be.true;
                expect($switch.hasClass("active")).to.be.false;
                expect($dagPanel.offset().top)
                .to.not.equal($("#mainFrame").offset().top);
                expect($dagPanel.attr("style").indexOf("top")).to.equal(-1);

                done();
            }, 600);
        });

        it("heightForTableReveal should work", function(done) {
            expect($dagPanel.hasClass("hidden")).to.be.true;
            DagPanel.heightForTableReveal();
            UnitTest.testFinish(function() {
                return $dagPanel.hasClass("noTransform");
            })
            .then(function() {
                var top = parseInt($dagPanel.css("top"));
                var total = $dagPanel.parent().height();
                expect(top / total).to.be.gt(.40).and.lt(.60);

                // close panel
                $switch.click();
                return UnitTest.testFinish(function() {
                    return $dagPanel.hasClass("xc-hidden");
                });
            })
            .then(function() {
                done();
            });
        });

        it("maximizing dag should work", function(done) {
            // open panel
            $switch.click();

            setTimeout(function() {
                expect($dagPanel.hasClass("hidden")).to.be.false;
                expect($dagPanel.hasClass("xc-hidden")).to.be.false;

                $dagPanel.css("top", "20%");
                $dagPanel.find(".dagArea").css("height", "calc(80% - 5px)");
                $("#maximizeDag").removeClass("unavailable");
                var panelHeight = $dagPanel.height();

                expect(parseInt($dagPanel.css("top")))
                .to.equal(Math.floor(panelHeight * .2));

                $("#maximizeDag").click();

                setTimeout(function() {
                    expect(parseInt($dagPanel.css("top"))).to.equal(0);
                    done();
                }, 600);

            }, 1000);
        });

        it("horizontal scrollbar should work", function() {
            var $scrollBarWrap = $('#dagScrollBarWrap');
            expect($scrollBarWrap.data("id")).to.equal("none");
            $scrollBarWrap.show();
            expect($scrollBarWrap.is(":visible")).to.be.true;
            DagPanel.adjustScrollBarPositionAndSize();
            expect($scrollBarWrap.is(":visible")).to.be.false;

            $scrollBarWrap.data("id", "fakeId");
            $scrollBarWrap.show();
            expect($scrollBarWrap.is(":visible")).to.be.true;
            DagPanel.adjustScrollBarPositionAndSize();
            expect($scrollBarWrap.is(":visible")).to.be.false;

            $scrollBarWrap.data("id", largeTable.tableId);
            var parentWidth = largeTable.$dagWrap.find(".dagImageWrap").width();
            var cacheWidth = largeTable.$dagWrap.find(".dagImage").width();

            largeTable.$dagWrap.find(".dagImage").width(parentWidth - 10000);
            expect($scrollBarWrap.is(":visible")).to.be.false;
            DagPanel.adjustScrollBarPositionAndSize();
            expect($scrollBarWrap.is(":visible")).to.be.false;
            largeTable.$dagWrap.find(".dagImage").width(cacheWidth);

            largeTable.$dagWrap.find(".dagImage").width(parentWidth + 10);
            expect($scrollBarWrap.is(":visible")).to.be.false;
            DagPanel.adjustScrollBarPositionAndSize();
            expect($scrollBarWrap.is(":visible")).to.be.true;
            largeTable.$dagWrap.find(".dagImage").width(cacheWidth);
        });

        it("horizontal scroll bar should get correct ID", function() {
            var cachedFn = document.elementFromPoint;
            document.elementFromPoint = function() {
                return largeTable.$dagWrap.find(".dagTable")[0];
            };
            DagPanel.setScrollBarId(0);
            expect($('#dagScrollBarWrap').data("id")).to.equal(largeTable.tableId);

            DagPanel.setScrollBarId(999999999);
            expect($('#dagScrollBarWrap').data("id")).to.equal("none");
            document.elementFromPoint = cachedFn;
        });
    });

    describe("dag panel resizing", function() {
        it("should resize", function() {
            var $bar = $("#dagPanel").find(".ui-resizable-n").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY + 30 });

            expect($bar.offset().top > pageY);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
            expect($bar.offset().top === pageY);
        });
    });

    describe("dagWrap action icons", function() {
        it("save image btn should work", function(done) {
            var cachedFn = DagDraw.createSavableCanvas;
            var cachedFnTriggered = false;
            DagDraw.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find(".saveImageBtn").eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                DagDraw.createSavableCanvas = cachedFn;
                done();
            }, 1);
        });

        it("new tab image btn should work", function(done) {
            var cachedFn = DagDraw.createSavableCanvas;
            var cachedFnTriggered = false;
            DagDraw.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find(".newTabImageBtn").eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                DagDraw.createSavableCanvas = cachedFn;
                done();
            }, 1);

        });

        it("addDataFlow btn should work", function() {
            var cachedFn = DFCreateView.show;
            var cachedFnTriggered = false;
            DFCreateView.show = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find(".addDataFlow").eq(0).click();
            expect(cachedFnTriggered).to.be.true;
            DFCreateView.show = cachedFn;
        });
    });

    describe("dag table menu", function() {
        var $menu;
        before(function() {
            $menu = $dagPanel.find(".dagTableDropDown");
        });

        // test right-most table
        it("menu should open", function() {
            expect($menu.is(":visible")).to.be.false;
            smallTable.$dagWrap.find(".dagTable").first().click();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find("li:visible").length).to.equal(6);
            expect($menu.find("li.unavailable:visible").length).to.equal(1);
            expect($menu.find("li.generateIcv").hasClass("unavailable")).to.be.true;
            expect($menu.find("li.addTable").is(":visible")).to.be.false;
            expect($menu.find("li.revertTable").is(":visible")).to.be.false;
            expect($menu.find("li.focusTable").is(":visible")).to.be.true;
            expect($menu.find("li.removeNoDelete").is(":visible")).to.be.false;
            expect($menu.find("li.addNoDelete").is(":visible")).to.be.true;
        });

        it("menu should on noDrop table should be correct", function() {
            gTables[smallTable.tableId].addNoDelete();
            smallTable.$dagWrap.find(".dagTable").first().click();
            expect($menu.find("li.removeNoDelete").is(":visible")).to.be.true;
            expect($menu.find("li.addNoDelete").is(":visible")).to.be.false;
            expect($menu.find("li.deleteTable").hasClass("unavailable")).to.be.true;

            gTables[smallTable.tableId].removeNoDelete();
            smallTable.$dagWrap.find(".dagTable").first().click();
            expect($menu.find("li.removeNoDelete").is(":visible")).to.be.false;
            expect($menu.find("li.addNoDelete").is(":visible")).to.be.true;
            expect($menu.find("li.deleteTable").hasClass("unavailable")).to.be.false;
        });

        describe("table menu actions", function() {
            describe("rightmost table", function() {
                it("focus li should work", function() {
                    var cachedFn = DagFunction.focusTable;
                    var cachedFnTriggered = false;
                    DagFunction.focusTable = function(tId) {
                        expect(tId).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find(".focusTable").trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;

                    cachedFnTriggered = false;
                    $menu.find(".focusTable").trigger(rightMouseup);
                    expect(cachedFnTriggered).to.be.false;

                    DagFunction.focusTable = cachedFn;
                });

                it("delete li should work", function() {
                    var cachedFn = TblManager.deleteTables;
                    var cachedFnTriggered = false;
                    TblManager.deleteTables = function(tId) {
                        expect(tId).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                        return PromiseHelper.resolve();
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find(".deleteTable").trigger(fakeEvent.mouseup);
                    UnitTest.hasAlertWithTitle("Drop Tables", {confirm: true});
                    expect(cachedFnTriggered).to.be.true;

                    cachedFnTriggered = false;
                    $menu.find(".deleteTable").trigger(rightMouseup);
                    expect(cachedFnTriggered).to.be.false;

                    TblManager.deleteTables = cachedFn;
                });

                it("showSchema li should work", function() {
                    expect($("#dagSchema:visible").length).to.equal(0);
                    $menu.find(".showSchema").trigger(rightMouseup);
                    expect($("#dagSchema:visible").length).to.equal(0);

                    $menu.find(".showSchema").trigger(fakeEvent.mouseup);
                    expect($("#dagSchema:visible").length).to.equal(1);
                    var numCols = gTables[smallTable.tableId].tableCols.length - 1;
                    expect($("#dagSchema").find(".content li").length).to.equal(numCols);
                    expect($("#dagSchema").find(".rowCount .value").text())
                    .to.equal("8");

                    var $li = $("#dagSchema").find(".content li").filter(function() {
                        return $(this).text() === "string" + smallTable.prefix +
                            gPrefixSign + "yelping_since";
                    });
                    expect($li.length).to.equal(1);

                    expect($("#dagSchema .nodeInfoContent").is(":visible")).to.be.false;
                    $("#dagSchema .rowCount .expand").click();
                    expect($("#dagSchema .nodeInfoContent").is(":visible")).to.be.true;

                    var $nodeLis = $("#dagSchema").find(".nodeInfoContent li");
                    expect($nodeLis.length).to.be.gt(0);
                    expect($nodeLis.eq(0).children().eq(0).text()).to.equal("0");

                    // sort by node number
                    $("#dagSchema").find(".nodeInfoHeader .sort").eq(0).click();
                    $nodeLis = $("#dagSchema").find(".nodeInfoContent li");
                    if ($nodeLis.length > 1) {
                        expect($nodeLis.eq(0).children().eq(0).text()).to.not.equal("0");
                    }

                    // sort by percent
                    $("#dagSchema").find(".nodeInfoHeader .sort").eq(1).click();
                    $("#dagSchema").find(".nodeInfoHeader .sort").eq(1).click();
                    // XXX no good way to test out % if 1 node or equal %s
                    // unless we replace data
                });

                it("showSchema li on dropped table should work", function() {
                    $(document).mousedown();
                    var tId = $menu.data("tableId");
                    var cachedTable = gTables[tId];
                    delete gTables[tId];
                    expect($("#dagSchema:visible").length).to.equal(0);
                    $menu.find(".showSchema").trigger(fakeEvent.mouseup);
                    expect($("#dagSchema:visible").length).to.equal(1);

                    expect($("#dagSchema").find(".content li").length).to.equal(0);

                    expect($("#dagSchema").find(".noFields").length).to.equal(1);

                    $(document).mousedown();
                    gTables[tId] = cachedTable;
                });

                it("lockTable li should work", function() {
                    $menu.find(".addNoDelete").trigger(rightMouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").first()
                        .find(".lockIcon").length)
                    .to.equal(0);

                    $menu.find(".addNoDelete").trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").first()
                        .find(".lockIcon").length)
                    .to.equal(1);
                    expect(smallTable.$dagWrap.find(".dagTable.noDelete").length)
                    .to.equal(1);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.true;
                });

                it("unlockTable li should work", function() {
                    $menu.find(".removeNoDelete").trigger(rightMouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").first()
                        .find(".lockIcon").length)
                    .to.equal(1);

                    $menu.find(".removeNoDelete").trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").first()
                        .find(".lockIcon").length)
                    .to.equal(0);
                    expect(smallTable.$dagWrap.find(".dagTable.noDelete").length)
                    .to.equal(0);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.false;
                });
            });

            describe("middle table", function() {
                it("menu should open", function() {
                    smallTable.$dagWrap.find(".dagImage").first()
                    .find(".dagTable .dagTableIcon").eq(1).click();
                    expect($menu.is(":visible")).to.be.true;
                    expect($menu.find("li:visible").length).to.equal(7);
                    expect($menu.find("li.unavailable:visible").length).to.equal(2);
                    expect($menu.find("li.generateIcv").hasClass("unavailable")).to.be.true;
                    expect($menu.find("li.addTable").is(":visible")).to.be.true;
                    expect($menu.find("li.revertTable").is(":visible")).to.be.true;
                    expect($menu.find("li.archiveTable").is(":visible")).to.be.false;
                    expect($menu.find("li.focusTable").is(":visible")).to.be.false;
                });

                it("addTable li should work", function() {
                    var cachedFn = DagFunction.addTable;
                    var cachedFnTriggered = false;
                    DagFunction.addTable = function(tId) {
                        expect(tId).to.equal(smallTable.ancestorIds[0]);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find(".addTable").trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;

                    cachedFnTriggered = false;
                    $menu.find(".addTable").trigger(rightMouseup);
                    expect(cachedFnTriggered).to.be.false;

                    DagFunction.addTable = cachedFn;
                });

                it("revertTable li should work", function() {
                    var cachedFn = DagFunction.revertTable;
                    var cachedFnTriggered = false;
                    DagFunction.revertTable = function(tId, tName, oldTName) {
                        expect(tId).to.equal(smallTable.ancestorIds[0]);
                        expect(tName).to.equal(smallTable.ancestorNames[0]);
                        expect(oldTName).to.equal(smallTable.tableName);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find(".revertTable").trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;

                    cachedFnTriggered = false;
                    $menu.find(".revertTable").trigger(rightMouseup);
                    expect(cachedFnTriggered).to.be.false;

                    DagFunction.revertTable = cachedFn;
                });
            });

            describe("datastore icon", function() {
                it("menu should open", function() {
                    smallTable.$dagWrap.find(".dagImage").first()
                    .find(".dagTable .dataStoreIcon").eq(0).click();

                    expect($menu.is(":visible")).to.be.true;
                    expect($menu.find("li:visible").length).to.equal(1);
                    expect($menu.find("li.dataStoreInfo").is(":visible")).to.be.true;
                });

                it("showSchema li should work", function() {
                    expect($("#dagSchema:visible").length).to.equal(0);
                    $menu.find(".dataStoreInfo").trigger(rightMouseup);
                    expect($("#dagSchema:visible").length).to.equal(0);

                    $menu.find(".dataStoreInfo").trigger(fakeEvent.mouseup);
                    expect($("#dagSchema:visible").length).to.equal(1);
                    expect($("#dagSchema").hasClass("loadInfo")).to.be.true;
                    expect($("#dagSchema .nodeInfo").is(":visible")).to.be.false;

                    var text = $("#dagSchema .content").text();
                    expect(text.indexOf('"numEntries": 1000')).to.be.gt(-1);
                    expect(text.indexOf('"size": "384KB"')).to.be.gt(-1);
                    expect(text.indexOf('"udf": ""')).to.be.gt(-1);
                    expect(text.indexOf('"csv":')).to.equal(-1);
                    expect(text.indexOf('"format": "json"')).to.be.gt(-1);
                });
            });

            after(function() {
                // close menu
                $(document).mousedown().click();
                console.log("after");
            });
        });
    });

    describe("dag panel right click menu", function() {
        var $menu;
        before(function() {
            $menu = $dagPanel.find(".rightClickDropDown");
        });

        it("menu should open", function() {
            expect($menu.is(":visible")).to.be.false;
            smallTable.$dagWrap.contextmenu();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find("li:visible").length).to.equal(3);
        });

        describe("right click actions", function() {
            it("save image li should work", function(done) {
                var save = DagDraw.createSavableCanvas;
                var saveTriggered = false;
                DagDraw.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find(".saveImage").trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    DagDraw.createSavableCanvas = save;
                    done();
                }, 1);
            });

            it("new tab image li should work", function(done) {
                var save = DagDraw.createSavableCanvas;
                var saveTriggered = false;
                DagDraw.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find(".newTabImage").trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    DagDraw.createSavableCanvas = save;
                    done();
                }, 1);
            });

            it("dataflow li should work", function(done) {
                var dfShow = DFCreateView.show;
                var dsShowTriggered = false;
                DFCreateView.show = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    dsShowTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(dsShowTriggered).to.be.false;
                $menu.find(".dataflow").trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(dsShowTriggered).to.be.true;
                    DFCreateView.show = dfShow;
                    done();
                }, 1);
            });

            it("expandAll li should work", function() {
                var cachedFn = Dag.expandAll;
                var cachedFnTriggered = false;
                Dag.expandAll = function($tWrap) {
                    expect($tWrap.length).to.equal(1);
                    cachedFnTriggered = true;
                };
                expect(cachedFnTriggered).to.be.false;
                $menu.find(".expandAll").trigger(fakeEvent.mouseup);
                expect(cachedFnTriggered).to.be.true;
                Dag.expandAll = cachedFn;
            });

            it("collapseAll li should work", function() {
                var cachedFn = Dag.collapseAll;
                var cachedFnTriggered = false;
                Dag.collapseAll = function($tWrap) {
                    expect($tWrap.length).to.equal(1);
                    cachedFnTriggered = true;
                };
                expect(cachedFnTriggered).to.be.false;
                $menu.find(".collapseAll").trigger(fakeEvent.mouseup);
                expect(cachedFnTriggered).to.be.true;
                Dag.collapseAll = cachedFn;
            });

            it("Right click menu in collapse should display", function() {
                largeTable.$dagWrap.contextmenu();
                expect($menu.find(".expandAll").is(":visible")).to.be.true;
            });

            after(function() {
                // close menu
                $(document).mousedown().click();
            });
        });
    });

    describe("Dag panel support functions", function() {
        var $smallDagWrap;
        var $largeDagWrap;

        before(function() {
            $smallDagWrap = smallTable.$dagWrap;
            $largeDagWrap = largeTable.$dagWrap;
        });

        describe("Panel button actions should work", function() {
            it("SaveImageAction should work", function(done) {
                DagPanel.saveImageAction($largeDagWrap, largeTable.tableName)
                .then(done)
                .fail(function() {
                    done("failed");
                });
            });

            it("newTabImageAction should work", function(done) {
                DagPanel.newTabImageAction($smallDagWrap)
                .then(function(newTab) {
                    // TODO: figure out why newTab instanceof Window is false
                    // For now, take advantage of fact that windows have prop
                    // newTab.window === newTab, see http://stackoverflow.com/questions/6229301/a-clean-way-of-checking-whether-an-object-is-an-instance-of-window-constructor
                    // TOOD*: Figure out why newTab is null on home setup
                    // OSX, chrome, adblock disabled.
                    expect(newTab.window === newTab).to.be.true;
                    expect(newTab.closed).to.be.false;
                    newTab.close();
                    expect(newTab.closed).to.be.true;
                    done();
                });
            });

            it("createBatchDataflow action should work", function(done) {
                var $dfPanel = $("#dfCreateView");
                expect($dfPanel.hasClass("xc-hidden")).to.be.true;
                DagPanel.__testOnly__.addDataFlowAction($smallDagWrap);
                expect($dfPanel.hasClass("xc-hidden")).to.be.false;

                UnitTest.testFinish(function() {
                    if (!ifvisible.now()) {
                        $("#menuBar").removeClass("animating");
                    }
                    return !$("#menuBar").hasClass("animating");
                })
                .always(function() {
                    DFCreateView.close();
                    expect($dfPanel.hasClass("xc-hidden")).to.be.true;
                    done();
                });

                // TODO: ensure that the table name is correct.
            });
        });

        describe("Right click menu actions workshould on small dag.", function() {
            // Already tested save image, new tab image, and create dataflow
            it("Dag expandall and collapseall on small dag should fail", function() {
                // Notes: no hidden flags or anything like that
                var nodes = $smallDagWrap.data("allDagInfo").nodeIdMap;

                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                });
                Dag.collapseAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                });
                Dag.expandAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                });
            });
        });

        describe("Right click menu actions on large dag should work.", function() {
            it("expandAll and collapseAll should work", function() {
                var nodes = $largeDagWrap.data("allDagInfo").nodeIdMap;
                // NumNodes defined this way as nodes is an object with keys
                // named strings of numbers
                // var numNodes = Object.keys(nodes).length;
                var tree = $largeDagWrap.data("allDagInfo").tree;
                var dsId = $largeDagWrap.find(".dagTable").last().data("index");

                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    if (nodeIdx === String(tree.value.dagNodeId) ||
                        nodeIdx === String(dsId)) {
                        expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].value.display.isHidden).to.be.true;
                    }
                });
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                });
                Dag.collapseAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    if (nodeIdx === String(tree.value.dagNodeId) ||
                        nodeIdx === String(dsId)) {
                        expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].value.display.isHidden).to.be.true;
                    }
                });
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].value.display.isHidden).to.be.false;
                });
            });
        });
    });

    describe("Dag table hovers and expands should work", function() {
        function timeOutPromise(amtTime) {
            var waitTime = amtTime || 1000;
            var deferred = PromiseHelper.deferred();
            setTimeout(function() {
                deferred.resolve();
            }, waitTime);
            return deferred;
        }

        var $smallDagWrap;
        var $largeDagWrap;

        before(function() {
            $smallDagWrap = smallTable.$dagWrap;
            $largeDagWrap = largeTable.$dagWrap;
        });

        it("Action mouseovers should work", function(done) {
            var createActionWrap = $smallDagWrap.find(".actionTypeWrap").eq(0);
            var reduceActionWrap = $smallDagWrap.find(".actionTypeWrap").eq(1);
            var mapActionWrap = $largeDagWrap.find(".actionTypeWrap").first();

            expect(createActionWrap.attr("aria-describedby")).to.be.undefined;
            createActionWrap.trigger(fakeEvent.mouseenter);
            timeOutPromise()
            .then(function() {
                expect(createActionWrap.attr("aria-describedby")).to.not.be.undefined;
                expect(reduceActionWrap.attr("aria-describedby")).to.be.undefined;
                createActionWrap.trigger(fakeEvent.mouseleave);
                reduceActionWrap.trigger(fakeEvent.mouseenter);
                return timeOutPromise();
            })
            .then(function() {
                expect(createActionWrap.attr("aria-describedby")).to.be.undefined;
                expect(reduceActionWrap.attr("aria-describedby")).to.not.be.undefined;
                expect(mapActionWrap.attr("aria-describedby")).to.be.undefined;
                reduceActionWrap.trigger(fakeEvent.mouseleave);
                mapActionWrap.trigger(fakeEvent.mouseenter);
                return timeOutPromise();
            })
            .then(function() {
                expect(reduceActionWrap.attr("aria-describedby")).to.be.undefined;
                expect(mapActionWrap.attr("aria-describedby")).to.not.be.undefined;
                mapActionWrap.trigger(fakeEvent.mouseleave);
                return timeOutPromise();
            })
            .then(function() {
                expect(mapActionWrap.attr("aria-describedby")).to.be.undefined;
                done();
            });
        });

        it("Expand/collapse and mouseovers should work", function(done) {
            Dag.expandAll($largeDagWrap);
            var $expander = $largeDagWrap.find(".expandWrap");
            var $groupOutline = $expander.next();
            expect($expander.hasClass("expanded")).to.be.true;
            expect($groupOutline.hasClass("visible")).to.be.false;

            $expander.trigger(fakeEvent.mouseenter);
            // TODO: check tooltip appears
            timeOutPromise()
            .then(function() {
                expect($groupOutline.hasClass("visible")).to.be.true;
                $expander.trigger(fakeEvent.mouseleave);
                return timeOutPromise();
            })
            .then(function() {
                expect($groupOutline.hasClass("visible")).to.be.false;
                $expander.click();
                expect($expander.hasClass("expanded")).to.be.false;
                $expander.trigger(fakeEvent.mouseenter);
                return timeOutPromise();
            })
            .then(function() {
                expect($groupOutline.hasClass("visible")).to.be.false;
                // Leave it the way we found it
                $expander.click();
                done();
            });
        });
    });

    describe("Dag table click menu functions should work", function() {
        // Lock, unlock and schema table already fully tested above.
        var $menu;
        var $largeDagTable;
        var largeTableId;
        var $largeDagIcon;

        var $icvDagWrap;
        var $icvDagTable;
        var icvTableId;
        var $icvDagIcon;

        before(function() {
            Dag.expandAll(largeTable.$dagWrap);
            $menu = $dagPanel.find(".dagTableDropDown");
            $largeDagTable = largeTable.$dagWrap.find(".dagTable").first();
            largeTableId = $largeDagTable.data("id");
            $largeDagIcon = $largeDagTable.find(".dagTableIcon");
        });

        describe("Operations on last table should work", function() {
            it("Focus table should work.", function() {
                expect(largeTableId).to.equal(largeTable.tableId);
                var $smallDagTable = smallTable.$dagWrap.find(".dagTable").first();
                var smallTableId = $smallDagTable.data("id");
                expect(smallTableId).to.equal(smallTable.tableId);
                var $smallDagIcon = $smallDagTable.find(".dagTableIcon");

                // TODO: make sure table was scrolled to as well as selected.
                $largeDagIcon.click();
                expect($menu.find("li.focusTable").is(":visible")).to.be.true;
                $menu.find(".focusTable").trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(largeTableId);
                $smallDagIcon.click();
                expect($menu.find("li.focusTable").is(":visible")).to.be.true;
                $menu.find(".focusTable").trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(smallTableId);
            });

            it("Revert table should not work", function() {
                $largeDagIcon.click();
                expect($menu.find("li.revertTable").is(":visible")).to.be.false;
            });

            it("Schema support functions should work", function() {
                // TODO*: Actually test something
                $largeDagIcon.click();
                $menu.find(".showSchema").trigger(fakeEvent.mouseup);
                $dagSchema = $("#dagSchema");
                var numCols = gTables[largeTableId].tableCols.length - 1;
                expect($("#dagSchema").find(".content li").length).to.equal(numCols);
                $("#dagSchema").find(".content li").eq(8).trigger({"type": "mouseup", "which": 3});
                expect($("#dagSchema").find(".content li").eq(8).hasClass("selected")).to.be.false;
                $("#dagSchema").find(".content li").eq(8).trigger(fakeEvent.mouseup);
                expect($("#dagSchema").find(".content li").eq(8).hasClass("selected")).to.be.true;

                // TODO: Do more interesting tests once have groupBy and join tables
            });

            it("ICV Table fail should work on map", function(done) {
                var cachedMap = XcalarMapWithInput;
                var mapCalled = false;
                XcalarMapWithInput = function() {
                    mapCalled = true;
                    return PromiseHelper.reject();
                };

                $largeDagIcon.click();
                expect($menu.find("li.generateIcv").hasClass("unavailable"))
                .to.be.false;
                // $menu.find(".generateIcv").trigger(fakeEvent.mouseup);
                Dag.generateIcvTable(
                    largeTable.$dagWrap.data("id"),
                    $largeDagTable.data("tablename"),
                    $largeDagIcon)
                .then(function() {
                    done("fail");
                })
                .fail(function() {
                    // wait for icon's generating class to be removed in .always
                    return UnitTest.timeoutPromise(1);
                })
                .always(function() {
                    expect(mapCalled).to.be.true;
                    XcalarMapWithInput = cachedMap;
                    Alert.forceClose();
                    done();
                });
            });


            it("ICV Table should work on map", function(done) {
                $largeDagIcon.click();
                expect($menu.find("li.generateIcv").hasClass("unavailable"))
                .to.be.false;
                // $menu.find(".generateIcv").trigger(fakeEvent.mouseup);
                Dag.generateIcvTable(
                    largeTable.$dagWrap.data("id"),
                    $largeDagTable.data("tablename"),
                    $largeDagIcon)
                .then(function() {
                    // wait for icon's generating class to be removed in .always
                    return UnitTest.timeoutPromise(1);
                })
                .then(function() {
                    $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    $icvDagTable = $icvDagWrap.find(".dagTable").first();
                    icvTableId = $icvDagTable.data("id");
                    $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    $icvDagIcon.click();
                    expect($menu.find("li.generateIcv").hasClass("unavailable"))
                    .to.be.true;
                    expect(xcHelper.getFocusedTable()).to.equal(icvTableId);
                    // Check that generate erroneous table does nothing if repeated
                    // except focus on the ICV table
                    // TODO: make test for behavior for gen ICV, then archive,
                    // then gen ICV again on the originator table

                    $largeDagIcon.click();
                    $menu.find(".focusTable").trigger(fakeEvent.mouseup);
                    expect(xcHelper.getFocusedTable()).to.equal(largeTableId);
                    var numTables = Object.keys(gTables).length;

                    $largeDagIcon.click();
                    $menu.find(".generateIcv").trigger(fakeEvent.mouseup);
                    expect(Object.keys(gTables).length).to.equal(numTables);
                    expect(xcHelper.getFocusedTable()).to.equal(icvTableId);

                    done();
                })
                .fail(function() {
                    expect(false).to.be.true;
                    done("failed");
                });
            });

            it("ICV Table fail should work on groupby", function(done) {
                var cachedGB = XcalarGroupByWithInput;
                var gbCalled = false;
                XcalarGroupByWithInput = function(txId, input) {
                    gbCalled = true;
                    expect(input.eval[0].evalString.indexOf("count")).to.equal(0);
                    return PromiseHelper.reject();
                };

                var $actionType = groupTable.$dagWrap.find(".actionType.groupBy").eq(1);
                // var tId = $actionType.next().data("id");
                var tName = $actionType.next().data("tablename");

                Dag.generateIcvTable(
                    groupTable.$dagWrap.data("id"),
                    tName,
                    $actionType.next())
                .then(function() {
                    done("fail");
                })
                .fail(function() {
                    // wait for icon's generating class to be removed in .always
                    return UnitTest.timeoutPromise(1);
                })
                .always(function() {
                    expect(gbCalled).to.be.true;
                    XcalarGroupByWithInput = cachedGB;
                    Alert.forceClose();
                    done();
                });
            });

            it("ICV Table should work on groupby", function(done) {
                var cachedGB = XcalarGroupByWithInput;
                var gbCalled = false;
                XcalarGroupByWithInput = function(txId, input) {
                    gbCalled = true;
                    expect(input.eval[0].evalString.indexOf("count")).to.equal(0);
                    return PromiseHelper.resolve();
                };
                var cachedRefresh = TblManager.refreshTable;
                TblManager.refreshTable = function() {
                    return PromiseHelper.resolve();
                };

                var $actionType = groupTable.$dagWrap.find(".actionType.groupBy").eq(1);
                var tId = $actionType.next().data("id");
                var tName = $actionType.next().data("tablename");

                Dag.generateIcvTable(
                    groupTable.$dagWrap.data("id"),
                    tName,
                    $actionType.next())
                .then(function() {
                    return UnitTest.timeoutPromise(1);
                })
                .fail(function() {
                    // wait for icon's generating class to be removed in .always
                    done("fail");
                })
                .always(function() {
                    var table = gTables[tId];
                    expect(table.icv.length).to.be.gt(3);
                    table.icv = "";
                    expect(gbCalled).to.be.true;
                    XcalarGroupByWithInput = cachedGB;
                    TblManager.refreshTable = cachedRefresh;
                    done();
                });
            });


            it("Drop table fail should work", function() {
                var cachedDelete = XIApi.deleteTable;
                var deleteCalled = false;
                XIApi.deleteTable = function() {
                    deleteCalled = true;
                    return PromiseHelper.reject();
                };

                $("#xcTableWrap-" + icvTableId).addClass("noDelete");
                $icvDagIcon.click();
                expect($menu.find("li.deleteTable").hasClass("unavailable"))
                .to.be.false;
                var table = gTables[icvTableId];
                delete gTables[icvTableId];

                expect($("#alertModal").css("display")).to.equal("none");
                $menu.find(".deleteTable").trigger(fakeEvent.mouseup);
                UnitTest.hasAlertWithTitle("Drop Table(s) Failed");

                expect(deleteCalled).to.be.true;

                $("#xcTableWrap-" + icvTableId).removeClass("noDelete");
                gTables[icvTableId] = table;
                XIApi.deleteTable = cachedDelete;
            });

            it("Drop table should work", function(done) {
                $icvDagIcon.click();
                expect($menu.find("li.deleteTable").hasClass("unavailable"))
                .to.be.false;
                expect($("#alertModal").css("display")).to.equal("none");
                $menu.find(".deleteTable").trigger(fakeEvent.mouseup);
                expect($("#alertModal").css("display")).to.not.equal("none");
                expect(gTables[icvTableId]).to.not.be.undefined;
                $("#alertModal .btn.confirm").click();
                UnitTest.testFinish(function() {
                    return gTables[icvTableId] == null;
                })
                .then(function() {
                    // Ensure was actually deleted.
                    expect(gTables[icvTableId]).to.be.undefined;
                    // Ensure was deleted from DAG
                    // TODO: copy deletion check from revert table below.
                    expect($dagPanel.find("#dagWrap-" + String(icvTableId)).length)
                    .to.equal(0);
                    done();
                });
            });

            it("Hide table should work", function(done) {
                // Use icv table to also test repeated ICV table behavior
                $largeDagIcon.click();
                expect($menu.find("li.generateIcv").hasClass("unavailable"))
                .to.be.false;
                expect($(".dagTableIcon.icv").length).to.equal(0);
                $menu.find(".generateIcv").trigger(fakeEvent.mouseup);

                UnitTest.timeoutPromise(1000)
                .then(function() {
                    return UnitTest.testFinish(function() {
                        return $(".dagTableIcon.icv").length > 0 &&
                                $(".dagWrap.selected").length > 0;
                    });
                })
                .then(function() {
                    $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    $icvDagTable = $icvDagWrap.find(".dagTable").first();
                    icvTableId = $icvDagTable.data("id");
                    $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    expect(gTables[icvTableId].status).is.equal("active");

                    XcalarDeleteTable(gTables[icvTableId].tableName)
                    .always(function() {
                        done();
                    });
                })
                .fail(function() {
                    done("failed");
                });
            });
        });

        describe("Operations on second to last table should work", function() {
            // var dagDepth;
            var $prevDagTable;
            var $prevDagIcon;
            var prevTableId;
            var prevTableName;

            beforeEach(function() {
                dagDepth = largeTable.$dagWrap.data("allDagInfo").depth;
                $prevDagTable = largeTable.$dagWrap.find(".dagTable").eq(1);
                $prevDagIcon = $prevDagTable.find(".dagTableIcon");
                prevTableId = $prevDagTable.data("id");
                prevTableName = $prevDagTable.data("tablename");
            });

            it("Add table should work", function(done) {
                expect(prevTableId).to.equal(largeTable.ancestorIds[0]);
                $prevDagIcon.click();
                expect($menu.find("li.addTable").is(":visible")).to.be.true;
                WSManager.moveInactiveTable(prevTableId,
                                            WSManager.getActiveWS(),
                                            TableType.Orphan)
                .then(function() {
                    // Serious race condition here.
                    expect(gTables[prevTableId].status).to.equal(TableType.Active);
                    var $dagWrapPrev = $("#dagWrap-" + prevTableId);
                    expect($dagWrapPrev.length).to.equal(1);
                    expect($dagWrapPrev.hasClass("selected")).to.be.true;
                    $dagWrapPrev.find(".dagTable .dagTableIcon").first().click();
                    TblManager.sendTableToOrphaned(prevTableId, {remove: true,
                                                            noFocusWS: true,
                                                            force: true});
                    setTimeout(function() {
                        done();
                    }, 300);
                });
            });

            it("Revert table should work", function(done) {
                // var dagDepth = largeTable.$dagWrap.data("allDagInfo").depth;
                var $prevDagTable = largeTable.$dagWrap.find(".dagTable")
                                    .eq(1);
                var $prevDagIcon = $prevDagTable.find(".dagTableIcon");
                var prevTableId = $prevDagTable.data("id");
                expect(gTables[prevTableId].status).is.not.equal("active");
                expect(gTables[largeTableId].status).is.equal("active");
                expect(prevTableId).to.equal(largeTable.ancestorIds[0]);
                $prevDagIcon.click();
                expect($menu.find("li.revertTable").is(":visible")).to.be.true;
                $menu.find(".revertTable").trigger(fakeEvent.mouseup);
                expect(gTables[prevTableId].status).to.not.equal("active");
                UnitTest.testFinish(function() {
                    return gTables[prevTableId].status === "active";
                })
                .then(function() {
                    return UnitTest.testFinish(function() {
                        return gTables[largeTable.tableId].status !== "active";
                    });
                })
                .then(function() {
                    expect(gTables[prevTableId].status).is.equal("active");
                    expect(gTables[largeTable.tableId].status)
                    .is.not.equal("active");
                    XcalarDeleteTable(largeTable.tableName)
                    .then(function() {
                        expect(largeTable.$dagWrap.hasClass("locked")).to.be.true;
                        // expect($dagPanel.find("#dagWrap-" + prevTableId).length).to.equal(1);
                        largeTable.$dagWrap = $dagPanel.find("#dagWrap-" + prevTableId);
                        expect(largeTable.$dagWrap.hasClass("selected")).to.be.true;
                        expect(largeTable.$dagWrap.hasClass("locked")).to.be.false;
                        expect(largeTable.$dagWrap.hasClass("dagWrapToRemove"))
                        .to.be.false;
                        $largeDagTable = largeTable.$dagWrap.find(".dagTable").first();
                        largeTableId = $largeDagTable.data("id");
                        $largeDagIcon = $largeDagTable.find(".dagTableIcon");
                        expect(largeTableId).to.equal(largeTable.ancestorIds[0]);
                        // largeTableNames.splice(numLargeT - 1, 1);
                        // largeTableIds.splice(numLargeT - 1, 1);

                        largeTable.tableId = largeTable.ancestorIds.pop();
                        largeTable.tableName = largeTable.ancestorNames.pop();
                        largeTable.$dagWrap = $dagPanel.find("#dagWrap-" +
                                                                prevTableId);
                        done();
                    })
                    .fail(function() {
                        done("failed to delete table");
                    });
                })
                .fail(function() {
                    done("failed");
                });
            });

            it("Delete second last table should work", function(done) {
                expect(gTables[prevTableId]).to.be.undefined;
                TblManager.setOrphanTableMeta(prevTableName);
                expect(gTables[prevTableId]).to.not.be.undefined;
                $prevDagIcon.click();
                expect($menu.find("li.deleteTable").hasClass("unavailable"))
                .to.be.false;
                expect($("#alertModal").css("display")).to.equal("none");

                $menu.find(".deleteTable").trigger(fakeEvent.mouseup);

                UnitTest.testFinish(function() {
                    return ($("#alertModal").css("display") !== "none");
                })
                .then(function() {
                    expect($("#alertModal").css("display")).to.not.equal("none");

                    var numNodes = Object.keys(largeTable.$dagWrap
                        .data("allDagInfo").nodeIdMap).length;
                    $("#alertModal .btn.confirm").click();
                    UnitTest.testFinish(function() {
                        return gTables[prevTableId] == null;
                    })
                    .then(function() {
                        // Ensure was actually deleted.
                        expect(gTables[prevTableId]).to.be.undefined;
                        // Ensure was deleted from DAG
                        // TODO: copy deletion check from revert table above.
                        expect($dagPanel.find("#dagWrap-" + String(prevTableId)).length).to.equal(0);

                        // Ensure following table is not changed
                        expect(gTables[largeTableId]).to.not.be.undefined;
                        expect(Object.keys(largeTable.$dagWrap
                            .data("allDagInfo").nodeIdMap).length)
                        .to.equal(numNodes);
                        done();
                    });
                });
            });
        });

        describe("ICV on groupby table should work", function() {
            var $menu;

            before(function() {
                $menu = $dagPanel.find(".dagTableDropDown");
            });

            it("groupby icv", function(done) {
                var $dagTable = $(".actionType.groupBy").eq(0).siblings(".dagTable");
                var $icon = $dagTable.find(".dagTableIcon");
                $icon.click();
                expect($menu.find("li.generateIcv").hasClass("unavailable"))
                .to.be.false;

                Dag.generateIcvTable(
                    $icon.closest(".dagWrap").data("id"),
                    $dagTable.data("tablename"),
                    $icon)
                .then(function() {
                    // wait for icon's generating class to be removed in .always
                    return UnitTest.timeoutPromise(1);
                })
                .then(function() {
                    var $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    var $icvDagTable = $icvDagWrap.find(".dagTable").first();
                    var icvTableId = $icvDagTable.data("id");
                    var $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    $icvDagIcon.click();
                    expect($menu.find("li.generateIcv").hasClass("unavailable"))
                    .to.be.true;
                    expect(xcHelper.getFocusedTable()).to.equal(icvTableId);
                    expect($icvDagIcon.hasClass("icv"));

                    done();
                })
                .fail(function() {
                    expect(false).to.be.true;
                    done("failed");
                });
            });
        });

        describe("Complement table on filter table should work", function() {
            var $menu;

            before(function() {
                $menu = $dagPanel.find(".dagTableDropDown");
            });

            it("complement table", function(done) {
                var $dagTable = $dagPanel.find(".actionType.filter").last().siblings(".dagTable");
                var $icon = $dagTable.find(".dagTableIcon");
                var origId = $dagTable.data("id");
                var origTablename = $dagTable.data("tablename");
                var prevId = $dagTable.closest(".dagTableWrap").next()
                            .find(".dagTable").data("id");
                expect(prevId).to.not.be.null;
                $icon.click();
                expect($menu.find("li.complementTable").hasClass("unavailable"))
                .to.be.false;
                var called = false;
                var cached = xcFunction.filter;
                xcFunction.filter = function(colNum, tId, options) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(prevId);
                    expect(options.filterString.indexOf("not(eq(")).to.equal(0);
                    expect(options.complement).to.be.true;
                    called = true;
                    xcFunction.filter = cached;
                    return PromiseHelper.resolve("fakeTableName#fakeId");
                };

                expect(gTables[origId].complement).to.equal("");
                gTables["fakeId"] = {complement: ""};

                $menu.find("li.complementTable").trigger(rightMouseup);
                expect(called).to.be.false;

                $menu.find("li.complementTable").trigger(fakeEvent.mouseup);

                expect(called).to.be.true;
                expect(gTables[origId].complement).to.equal("fakeTableName#fakeId");
                expect(gTables["fakeId"].complement).to.equal(origTablename);
                gTables[origId].complement = "";
                delete gTables["fakeId"];

                setTimeout(function() {
                    done();
                }, 1);
            });

            it("complement table exists should work", function() {
                var fn = Dag.__testOnly__.isComplementTableExists;
                var cachedFn = DagFunction.addTable;
                var called = false;
                DagFunction.addTable = function() {
                    called = true;
                };
                gTables["fakeId"] = {"complement": "otherTable#otherId", getName: function(){}};
                gTables["otherId"] = {getType: function() {}, getName: function(){}};
                fn("fakeId");
                expect(called).to.be.true;

                delete gTables["otherId"];

                expect(gTables["fakeId"].complement).to.equal("otherTable#otherId");
                fn("fakeId");
                expect(gTables["fakeId"].complement).to.equal("");

                delete gTables["fakeId"];
                DagFunction.addTable = cachedFn;
            });
        });
    });

    describe("Dag rename all occurrences should work", function() {
        it("dag rename", function() {
            var oldTableName = largeTable.tableName;
            var newTableName = "newTableName#newName";
            var $dagPanel = $("#dagPanel");

            var $tables = $("#dagPanel .dagTable[data-tablename='" + oldTableName + "']");
            var numTables = $tables.length;

            expect(numTables).to.be.gt(1);
            $dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("data-original-title", oldTableName);
            $dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("title", oldTableName);
            $dagPanel.find(".opInfoText").eq(0).text(oldTableName);

            Dag.renameAllOccurrences(oldTableName, newTableName);

            expect($tables.data("tablename").indexOf(newTableName)).to.be.gt(-1);
            var $sameTables = $("#dagPanel .dagTable").filter(function() {
                return $(this).data("tablename") === oldTableName;
            });
            expect($sameTables.length).to.equal(0);
            var $newTables = $("#dagPanel .dagTable").filter(function() {
                return $(this).data("tablename") === newTableName;
            });
            expect($dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("data-original-title")).to.equal(newTableName);
            expect($newTables.length).to.equal(numTables);

            $dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("data-original-title", "");
            $dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("title", newTableName);

            Dag.renameAllOccurrences(newTableName, oldTableName);
            expect($dagPanel.find(".opInfoText").eq(0).closest(".actionTypeWrap").attr("title")).to.equal(oldTableName);
        });
    });

    describe("other functions", function() {
        it("Dag.getSchemaNumRows", function(done) {
            var fn = Dag.__testOnly__.getSchemaNumRows;
            var cachedFn = XcalarGetTableMeta;
            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve({
                    metas: [{numRows: 3}, {numRows: 4}]
                });
            };

            $("#dagSchema").data("id", "dataId");
            var table = {};
            fn($("#dagSchema"), "dataId", "tableName", table)
            .then(function() {
                expect($("#dagSchema").find(".rowCount .value").text())
                .to.equal("7");
                expect(table.resultSetCount).to.equal(7);
                XcalarGetTableMeta = cachedFn;
                done();
            });
        });

        it("Dag.showDataStoreInfo", function() {
            var $dagWrap = largeTable.$dagWrap;
            var $table = $dagWrap.find(".dataStore").eq(0);
            var tableName = $table.data("tablename");
            var datasets = $dagWrap.data().allDagInfo.datasets;
            var loadInfo = datasets[tableName].loadInfo;
            var cachedLoadInfo = xcHelper.deepCopy(loadInfo);
            // loadInfo.loadArgs = {csv: {recordDelim: "\t"}};

            var cachedDS = DS.getDSObj;
            DS.getDSObj = function() {
                return {getNumEntries: function() {return null;},
                        getSize: function() {return null;}};
            };
            var cachedGetMeta = XcalarGetDatasetMeta;
            var getMetaCalled = false;
            XcalarGetDatasetMeta = function() {
                getMetaCalled = true;
                return PromiseHelper.resolve({metas: [{size: 1, numRows: 2}]});
            };

            Dag.showDataStoreInfo($table);

            expect(getMetaCalled).to.be.true;
            expect($("#dagSchema").text().indexOf('"numEntries": 2'))
            .to.be.gt(-1);

            $(document).mousedown(); // hide schema

            DS.getDSObj = cachedDS;
            XcalarGetDatasetMeta = cachedGetMeta;
            datasets[tableName].loadInfo = cachedLoadInfo;
        });

        it("Dag.showDataStoreInfo with csv", function() {
            var $dagWrap = largeTable.$dagWrap;
            var $table = $dagWrap.find(".dataStore").eq(0);
            var tableName = $table.data("tablename");
            var datasets = $dagWrap.data().allDagInfo.datasets;
            var loadInfo = datasets[tableName].loadInfo;
            var cachedLoadInfo = xcHelper.deepCopy(loadInfo);
            loadInfo.loadArgs = {csv: {recordDelim: "\t"}};
            loadInfo.format === "csv";

            var cachedDS = DS.getDSObj;
            DS.getDSObj = function() {
                return {getNumEntries: function() {return null;},
                        getSize: function() {return null;}};
            };
            var cachedGetMeta = XcalarGetDatasetMeta;
            var getMetaCalled = false;
            XcalarGetDatasetMeta = function() {
                getMetaCalled = true;
                return PromiseHelper.resolve({metas: [{size: 1, numRows: 2}]});
            };

            Dag.showDataStoreInfo($table);

            expect(getMetaCalled).to.be.true;
            expect($("#dagSchema").text().indexOf('"numEntries": 2'))
            .to.be.gt(-1);

            $(document).mousedown(); // hide schema

            DS.getDSObj = cachedDS;
            XcalarGetDatasetMeta = cachedGetMeta;
            datasets[tableName].loadInfo = cachedLoadInfo;
        });

        it("findColumnSource should work", function() {
            var prefix = aggTable.prefix;
            var $dagWrap = aggTable.$dagWrap;
            var tree = $dagWrap.data("allDagInfo").tree;

            var fn = Dag.__testOnly__.findColumnSource;
            var sourceColNames = [prefix + gPrefixSign + "average_stars"];
            var storedInfo = {
                foundTables: {},
                droppedTables: {}
            };

            fn(sourceColNames, $dagWrap, tree, "agg_result", false, true, tree, storedInfo);

            expect($dagWrap.find(".highlighted").length).to.equal(3);
            expect($dagWrap.find(".highlighted").last().data("index")).to.equal($dagWrap.find(".dagTable").eq(3).data("index"));
            expect(parseInt($dagWrap.find(".highlighted").first().data("index"))).to.equal(parseInt(tree.parents[0].value.dagNodeId));
        });

        it("getSourceTables should work", function() {
            var fn =  Dag.__testOnly__.getSourceTables;
            var parent1 = {
                value: {name: "tName1"},
            };
            var parent2 = {
                value: {name: "tName2"},
            };
            var node = {
                value: {
                    struct: {
                        renameMap: [{oldName: "before", newName: "after", type: 0}],
                        numLeftColumns: 0
                    }
                },
                parents: [parent1, parent2],
            };

            var res = fn("after", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent2);

            node.value.struct.numLeftColumns = 1;
            res = fn("after", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent1);

            // should not find a match
            node.value.struct.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.value.struct.numLeftColumns = 0;
            res = fn("after", node);
            expect(res.length).to.equal(2);
            expect(res[0]).to.equal(parent1);
            expect(res[1]).to.equal(parent2);

            node.value.struct.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.value.struct.numLeftColumns = 0;
            res = fn("after::colName", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent2);

            node.value.struct.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.value.struct.numLeftColumns = 1;
            res = fn("after::colName", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent1);

            // the case that this table's prefix didn't get renamed but another's
            // did
            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 13}];
            node.value.struct.numLeftColumns = 0;
            res = fn("before::colName", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent1);

            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 13}];
            node.value.struct.numLeftColumns = 1;
            res = fn("before::colName", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent2);

            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.value.struct.numLeftColumns = 1;
            res = fn("before", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent2);

            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.value.struct.numLeftColumns = 0;
            res = fn("before", node);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(parent1);

            //self join
            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.value.struct.numLeftColumns = 0;
            node.parents = [parent1, parent1];

            res = fn("before", node);
            expect(res.length).to.equal(2);
            expect(res[0]).to.equal(parent1);
            expect(res[1]).to.equal(parent1);
        });

        it("getRenamedColname should work", function() {
            var fn =  Dag.__testOnly__.getRenamedColName;
            var node = {
                value: {struct: {renameMap: [
                    {oldName: "before", newName: "after", type: 0}
                ]}}
            };
            var res = fn("after", node);
            expect(res).to.equal("before");

            res = fn("before", node);
            expect(res).to.equal("before");

            res = fn("something", node);
            expect(res).to.equal("something");

            node.value.struct.renameMap = [{oldName: "before", newName: "after", type: 13}];

            res = fn("test::colName", node);
            expect(res).to.equal("test::colName");

            res = fn("after::colName", node);
            expect(res).to.equal("before::colName");
        });

        it("getIconHtml", function() {
            var fn = DagDraw.__testOnly__.getIconHtml;
            var res = fn("filter", {type: "filtergt"});
            expect(res.indexOf("filter-greaterthan")).to.be.gt(-1);

            res = fn("filter", {type: "filterge"});
            expect(res.indexOf("filter-greaterthan")).to.be.gt(-1);

            res = fn("filter", {type: "filterlt"});
            expect(res.indexOf("filter-lessthan")).to.be.gt(-1);

            res = fn("filter", {type: "filterle"});
            expect(res.indexOf("filter-lessthan-equalto")).to.be.gt(-1);

            res = fn("filter", {type: "filternot"});
            expect(res.indexOf("filter-not-equal")).to.be.gt(-1);

            res = fn("filter", {type: "filterlike"});
            expect(res.indexOf("filter")).to.be.gt(-1);

            res = fn("filter", {type: "filterothers"});
            expect(res.indexOf("filter")).to.be.gt(-1);

            res = fn("filter", {type: "other"});
            expect(res.indexOf("filter")).to.be.gt(-1);
        });

        it("getJoinIconClass", function() {
            var fn = DagDraw.__testOnly__.getJoinIconClass;
            var res = fn("fullOuter");
            expect(res).to.equal("join-outer");

            res = fn("left");
            expect(res).to.equal("oin-leftouter");

            res = fn("right");
            expect(res).to.equal("join-rightouter");

            res = fn("other");
            expect(res).to.equal("join-inner");
        });

        it("getDagNodeInfo", function() {
            var fn = DagDraw.__testOnly__.getDagNodeInfo;
            var node = {
                value: {
                    struct: {eval: [{evalString: "not(eq(col, 2))"}]},
                    display: {},
                    api: XcalarApisT.XcalarApiFilter
                },
                getSourceNames: function() {
                    return ["parent"];
                }
            };

            var res = fn(node, "filterInput");
            expect(res.type).to.equal("filternot");
            expect(res.tooltip).to.equal("Filtered table &quot;parent&quot;: not(eq(col, 2))");

            node.value.struct = {eval: [{evalString: "other(col, 2)"}]};
            res = fn(node, "filterInput");

            expect(res.type).to.equal("filterother");
            expect(res.tooltip).to.equal("Filtered table &quot;parent&quot;: other(col, 2)");
            expect(res.column).to.equal("col");

            node.value.struct = {eval: [{evalString: "other(col, 2)"}]};
            res = fn(node, "otherInput");
            expect(res.type).to.equal("other");
            expect(res.tooltip).to.equal("Other");
        });

        it("getFilterInfo", function() {
            var fn = DagDraw.__testOnly__.getFilterInfo;
            var info = {};
            fn(info, "not(x)", ["abc"]);
            expect(info.column).to.equal("x");
            expect(info.text).to.equal("not(x)");
            expect(info.tooltip).to.equal("Filtered table &quot;abc&quot;: not(x)");
            expect(info.type).to.equal("filternot");
        });
    });

    // order of tables is:
    // aggTable - join this (13th column)
    // smalltable
    // largeTable - tablewrap doesn't match tableid
    // group table - join this (2nd column);
    //

    // enable once tags are working in the backend
    describe("check table positioning and collapse/expand groups", function() {
        var $joinDagWrap;
        var dagInfo;
        var nodes;
        var tableHeight;
        var tableWidth;
        var topOffset;
        var tree;

        before(function(done) {
            var lJoinInfo = {
                casts: [null],
                colNums: [13],
                pulledColumns: [],
                rename: [],
                tableId: aggTable.tableId
            };
            var rJoinInfo = {
                casts: [null],
                colNums: [3],
                pulledColumns: [],
                rename: [],
                tableId: groupTable.tableId
            };
            xcFunction.join("Inner Join", lJoinInfo, rJoinInfo, "joinedTable", {
                keepTables: true
            })
            .always(function() {
                $joinDagWrap = $("#dagPanel").find(".dagWrap").last();
                dagInfo = $joinDagWrap.data("allDagInfo");
                nodes = dagInfo.nodeIdMap;
                tree = dagInfo.tree;
                tableHeight = 70;
                tableWidth = 214;
                topOffset = tableHeight * 0.2;

                done();
            });
        });

        it("initial dagInfo should be correct", function() {
            var dagInfo = $joinDagWrap.data("allDagInfo");
            expect(dagInfo.depth).to.equal(19);
            expect(dagInfo.condensedWidth).to.equal(1134);
            expect(Object.keys(dagInfo.nodeIdMap).length).to.equal(28);
            var nodeId = $joinDagWrap.find(".dagTable").eq(12).data("index");

            expect(Object.keys(dagInfo.groups).length).to.equal(1);
            expect(dagInfo.groups[nodeId]).to.be.an.object;
            var group = dagInfo.groups[nodeId].group;
            expect(group.length).to.equal(14);

            expect(group[0].value.inputName).to.equal("filterInput");
            expect(group[13].value.inputName).to.equal("mapInput");
        });

        it("initial layout should be correct", function() {
            expect($joinDagWrap.find(".dagImage").outerWidth()).to.equal(dagInfo.condensedWidth);
            expect($joinDagWrap.find(".dagTableWrap").length).to.equal(28);
            expect($joinDagWrap.find(".dagTableWrap:not(.hidden):not(.tagHidden)").length).to.equal(9);
            expect($joinDagWrap.find(".dagTableWrap.hidden").length).to.equal(14);
            expect($joinDagWrap.find(".dagTableWrap.tagHidden").length).to.equal(5);

            var $tableWraps = $joinDagWrap.find(".dagTableWrap");
            expect($tableWraps.eq(0).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(0).css("right")).to.equal("0px");
            expect(tree.value.display.depth).to.equal(0);

            expect($tableWraps.eq(1).hasClass("tagHidden")).to.be.true;
            expect($tableWraps.eq(7).hasClass("tagHidden")).to.be.true;

            expect($tableWraps.eq(2).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(2).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(2).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(2).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            expect($tableWraps.eq(8).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(8).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect($tableWraps.eq(8).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(8).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            // the aggregate table
            expect($tableWraps.eq(6).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(6).css("top")).to.equal(tableHeight * 1 + topOffset + "px");
            expect($tableWraps.eq(6).css("right")).to.equal(tableWidth * 2 + "px");
            expect(nodes[$tableWraps.eq(6).find(".dagTable").data("index")].value.display.depth).to.equal(2);

            // the expand icon
            expect($joinDagWrap.find(".expandWrap").length).to.equal(1);
            expect($joinDagWrap.find(".expandWrap").data("depth")).to.equal(3);
            expect($joinDagWrap.find(".expandWrap").css("top")).to.equal(tableHeight * 2 + topOffset + 5 + "px");


            // table left of the expand icon
            expect($tableWraps.eq(27).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(27).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect($tableWraps.eq(27).css("right")).to.equal(Math.round(tableWidth * 3.3) + "px");
            expect(nodes[$tableWraps.eq(27).find(".dagTable").data("index")].value.display.depth).to.equal(3.3);

            // top and left-most table aside from dataset
            expect($tableWraps.eq(4).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(4).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(4).css("right")).to.equal(tableWidth * 4 + "px");
            expect(nodes[$tableWraps.eq(4).find(".dagTable").data("index")].value.display.depth).to.equal(4);

            // dataset
            expect($tableWraps.eq(5).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(5).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(5).css("right")).to.equal(tableWidth * 5 + "px");
            expect(nodes[$tableWraps.eq(5).find(".dagTable").data("index")].value.display.depth).to.equal(5);
        });

        it("expanded layout should be correct", function() {
            $joinDagWrap.find(".expandWrap").click();

            expect($joinDagWrap.find(".dagImage").outerWidth()).to.equal(3916);
            expect($joinDagWrap.find(".dagTableWrap").length).to.equal(28);
            expect($joinDagWrap.find(".dagTableWrap:not(.hidden):not(.tagHidden)").length).to.equal(23);
            expect($joinDagWrap.find(".dagTableWrap.hidden").length).to.equal(0);
            expect($joinDagWrap.find(".dagTableWrap.tagHidden").length).to.equal(5);

            var $tableWraps = $joinDagWrap.find(".dagTableWrap");
            expect($tableWraps.eq(0).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(0).css("right")).to.equal("0px");
            expect(tree.value.display.depth).to.equal(0);

            expect($tableWraps.eq(1).hasClass("tagHidden")).to.be.true;
            expect($tableWraps.eq(7).hasClass("tagHidden")).to.be.true;

            expect($tableWraps.eq(2).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(2).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(2).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(2).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            expect($tableWraps.eq(8).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(8).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect($tableWraps.eq(8).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(8).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            // the aggregate table
            expect($tableWraps.eq(6).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(6).css("top")).to.equal(tableHeight * 1 + topOffset + "px");
            expect($tableWraps.eq(6).css("right")).to.equal(tableWidth * 2 + "px");
            expect(nodes[$tableWraps.eq(6).find(".dagTable").data("index")].value.display.depth).to.equal(2);

            // the expand icon
            expect($joinDagWrap.find(".expandWrap").length).to.equal(1);
            expect($joinDagWrap.find(".expandWrap").data("depth")).to.equal(3);
            expect($joinDagWrap.find(".expandWrap").css("top")).to.equal(tableHeight * 2 + topOffset + 5 + "px");
            expect($joinDagWrap.find(".expandWrap").css("right")).to.equal("3614px");


            // table left of the expand icon
            expect($tableWraps.eq(27).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(27).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect(Math.round(parseFloat($tableWraps.eq(27).css("right")))).to.equal(tableWidth * 17);
            expect(nodes[$tableWraps.eq(27).find(".dagTable").data("index")].value.display.depth).to.equal(17);

            // top and left-most table aside from dataset
            expect($tableWraps.eq(4).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(4).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(4).css("right")).to.equal(tableWidth * 4 + "px");
            expect(nodes[$tableWraps.eq(4).find(".dagTable").data("index")].value.display.depth).to.equal(4);

            // dataset
            expect($tableWraps.eq(5).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(5).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(5).css("right")).to.equal(tableWidth * 18 + "px");
            expect(nodes[$tableWraps.eq(5).find(".dagTable").data("index")].value.display.depth).to.equal(18);
        });

        it("condensed layout should be correct", function() {
            $joinDagWrap.find(".expandWrap").click();
            expect($joinDagWrap.find(".dagImage").outerWidth()).to.equal(dagInfo.condensedWidth);
            expect($joinDagWrap.find(".dagTableWrap").length).to.equal(28);
            expect($joinDagWrap.find(".dagTableWrap:not(.hidden):not(.tagHidden)").length).to.equal(9);
            expect($joinDagWrap.find(".dagTableWrap.hidden").length).to.equal(14);
            expect($joinDagWrap.find(".dagTableWrap.tagHidden").length).to.equal(5);

            var $tableWraps = $joinDagWrap.find(".dagTableWrap");
            expect($tableWraps.eq(0).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(0).css("right")).to.equal("0px");
            expect(tree.value.display.depth).to.equal(0);

            expect($tableWraps.eq(1).hasClass("tagHidden")).to.be.true;
            expect($tableWraps.eq(7).hasClass("tagHidden")).to.be.true;

            expect($tableWraps.eq(2).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(2).css("top")).to.equal(topOffset + "px");
            expect($tableWraps.eq(2).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(2).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            expect($tableWraps.eq(8).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(8).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect($tableWraps.eq(8).css("right")).to.equal(tableWidth * 1 + "px");
            expect(nodes[$tableWraps.eq(8).find(".dagTable").data("index")].value.display.depth).to.equal(1);

            // the aggregate table
            expect($tableWraps.eq(6).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(6).css("top")).to.equal(tableHeight * 1 + topOffset + "px");
            expect($tableWraps.eq(6).css("right")).to.equal(tableWidth * 2 + "px");
            expect(nodes[$tableWraps.eq(6).find(".dagTable").data("index")].value.display.depth).to.equal(2);

            // the expand icon
            expect($joinDagWrap.find(".expandWrap").length).to.equal(1);
            expect($joinDagWrap.find(".expandWrap").data("depth")).to.equal(3);
            expect($joinDagWrap.find(".expandWrap").css("top")).to.equal(tableHeight * 2 + topOffset + 5 + "px");


            // table left of the expand icon
            expect($tableWraps.eq(27).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(27).css("top")).to.equal(tableHeight * 2 + topOffset + "px");
            expect($tableWraps.eq(27).css("right")).to.equal(Math.round(tableWidth * 3.3) + "px");
            expect(Math.round(nodes[$tableWraps.eq(27).find(".dagTable").data("index")].value.display.depth * 10) / 10).to.equal(3.3);

            // top and left-most table aside from dataset
            expect($tableWraps.eq(4).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(4).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(4).css("right")).to.equal(tableWidth * 4 + "px");
            expect(nodes[$tableWraps.eq(4).find(".dagTable").data("index")].value.display.depth).to.equal(4);

            // dataset
            expect($tableWraps.eq(5).hasClass("tagHidden")).to.be.false;
            expect($tableWraps.eq(5).css("top")).to.equal(tableHeight * 0 + topOffset + "px");
            expect($tableWraps.eq(5).css("right")).to.equal(tableWidth * 5 + "px");
            expect(nodes[$tableWraps.eq(5).find(".dagTable").data("index")].value.display.depth).to.equal(5);
        });
    });

    describe("tag tests", function() {
        var $joinDagWrap;
        var dagInfo;
        var node;
        var origNode;

        before(function() {
            $joinDagWrap = $("#dagPanel").find(".dagWrap").last();
            dagInfo = $joinDagWrap.data("allDagInfo");
            node = dagInfo.tree;
            origNode = node;
        });

        it("tables should be correctly tagged", function() {
            var joinId = $joinDagWrap.data("id");
            // join group
            expect(node.value.display.tagHeader).to.be.true;
            expect(node.value.display.isHiddenTag).to.be.undefined;
            expect(node.value.tags.length).to.equal(1);
            expect(node.value.tags[0]).to.equal("join#" + joinId);

            var oldNode = node;
            node = oldNode.parents[0];
            expect(node.value.display.tagHeader).to.not.be.true;
            expect(node.value.display.isHiddenTag).to.be.true;
            expect(node.value.tags.length).to.equal(1);
            expect(node.value.tags[0]).to.equal("join#" + joinId);

            node = oldNode.parents[1];
            expect(node.value.display.tagHeader).to.not.be.true;
            expect(node.value.display.isHiddenTag).to.be.true;
            expect(node.value.tags.length).to.equal(1);
            expect(node.value.tags[0]).to.equal("join#" + joinId);

            node = oldNode.parents[0].parents[0];
            //  not part of group
            expect(node.value.display.tagHeader).to.be.undefined;
            expect(node.value.display.isHiddenTag).to.be.undefined;
            expect(node.value.tags.length).to.equal(1);
            expect(node.value.tags[0].indexOf("join#")).to.equal(-1);
        });

        it("hovering over tag icon should work", function() {
            var $tagIcon = $joinDagWrap.find(".tagHeader").eq(0).find(".groupTagIcon");
            expect($joinDagWrap.find(".tagHighlighted").length).to.equal(0);
            $tagIcon.trigger(fakeEvent.mouseenter);
            expect($joinDagWrap.find(".tagHighlighted").length).to.equal(0);
            $tagIcon.closest(".actionType").removeClass("collapsed");
            $tagIcon.trigger(fakeEvent.mouseenter);
            expect($joinDagWrap.find(".tagHighlighted").length).to.be.gt(1);
            $tagIcon.trigger(fakeEvent.mouseleave);
            expect($joinDagWrap.find(".tagHighlighted").length).to.equal(0);
            $tagIcon.closest(".actionType").addClass("collapsed");
            $tagIcon.trigger(fakeEvent.mouseleave);
            expect($joinDagWrap.find(".tagHighlighted").length).to.equal(0);
        });

        it("expanding and collapsing should work", function() {
            expect($joinDagWrap.find(".dagTableWrap").eq(1).hasClass("tagHidden")).to.be.true;
            expect($joinDagWrap.find(".dagTableWrap").eq(2).css("right")).to.be.equal("214px");
            //expand
            $joinDagWrap.find(".tagHeader").eq(0).click();
            expect($joinDagWrap.find(".dagTableWrap").eq(1).hasClass("tagHidden")).to.be.false;
            expect($joinDagWrap.find(".dagTableWrap").eq(2).css("right")).to.be.equal("428px");
            // collapse
            $joinDagWrap.find(".tagHeader").eq(0).click();
            expect($joinDagWrap.find(".dagTableWrap").eq(1).hasClass("tagHidden")).to.be.true;
            expect($joinDagWrap.find(".dagTableWrap").eq(2).css("right")).to.be.equal("214px");
        });

        it("getAllAncestors should work", function() {
            var fn = DagDraw.__testOnly__.getTaggedAncestors;
            node = origNode;
            // join operation group
            var group = fn(node, true);
            expect(group.length).to.equal(3);
            expect(group[0].value.inputName).to.equal("joinInput");
            expect(group[1].value.inputName).to.equal("indexInput");
            expect(group[2].value.inputName).to.equal("indexInput");
        });

        it("checkIsNodeHiddenTag() should work", function() {
            var fn = DagDraw.__testOnly__.checkIsNodeHiddenTag;
            var child1 = {
                value: {tag: "a"}
            };
            var child2 = {
                value: {tag: "a"}
            };
            var node = {
                children: [child1, child2]
            };

            expect(fn(["a"], node)).to.be.true;
            expect(fn(["b"], node)).to.be.false;

            child1.value.tag = "a,b";
            expect(fn(["a"], node)).to.be.true;
            expect(fn(["a", "b"], node)).to.be.true;
            expect(fn(["a", "b", "c"], node)).to.be.true;
            expect(fn(["b"], node)).to.be.false;

            child2.value.tag = "a,b";
            expect(fn(["a"], node)).to.be.true;
            expect(fn(["a", "b"], node)).to.be.true;
        });
    });

    describe("create and refresh dag tests", function() {
        var dsNode, indexNode, sortNode, exportNode;
        before(function() {
            dsNode = {
                "name": {
                    "name": ".XcalarDS.rudy2brea.03347.yelp_academic_dataset_user_fixed"
                },
                "tag": "",
                "comment": "",
                "numParent": 0,
                "dagNodeId": "18014398509488925",
                "api": 2,
                "state": 5,
                "input": {
                    "loadInput" : {
                        "url": "file:///netstore/datasets/yelp/user/yelp_academic_dataset_user_fixed.json",
                        "fileNamePattern": "",
                        "udf": "",
                        "dest": "XcalarDS.rudy2brea.03347.yelp_academic_dataset_user_fixed",
                        "size": 0,
                        "format": "json",
                        "recordDelim": "\n",
                        "fieldDelim": "",
                        "quoteDelim": "\"",
                        "linesToSkip": 0,
                        "crlf": true,
                        "header": false,
                        "recursive": false
                    }
                }
            };

            indexNode = {
                "name": {
                    "name": "yelp_academic_dataset_user_fixed#DP0"
                },
                "tag": "indexFromDataset#DP0",
                "comment": "",
                "numParent": 1,
                "dagNodeId": "18014398509489069",
                "api": 3,
                "state": 5,
                "input": {
                    "indexInput": {
                        "dhtName": "",
                        "source": ".XcalarDS.rudy2brea.03347.yelp_academic_dataset_user_fixed",
                        "key": {name: "xcalarRecordNum"},
                        "dest": "yelp_academic_dataset_user_fixed#DP0",
                        "ordering": 0,
                        "fatptrPrefixName": "",
                        "keyType": 0
                    }
                }
            };

            sortNode = {
                "name": {
                    "name": "yelp_academic_dataset_user_fixed#DP3"
                },
                "tag": "sort#DP3",
                "comment": "",
                "numParent": 1,
                "dagNodeId": "18014398509611722",
                "api": 3,
                "state": 5,
                "input": {
                    "indexInput": {
                        "dhtName": "",
                        "source": "yelp_academic_dataset_user_fixed#DP0",
                        "key": {"name": "yelp_academic_dataset_user_fixe::type"},
                        "destTable": "yelp_academic_dataset_user_fixed#DP3",
                        "ordering": 3,
                        "fatptrPrefixName": "",
                        "keyType": 0
                    }
                }
            };

            exportNode = {
                "name": {
                    "name": ".XcalarLRQExport.students#wE1"
                },
                "tag": "",
                "comment": "",
                "numParent": 1,
                "dagNodeId": "1273",
                "api": 33,
                "state": 1,
                "input": {
                    "exportInput": {
                        "source": "yelp_academic_dataset_user_fixed#DP3",
                        "fileName": "",
                        "targetName": "Default",
                        "targetType": "file",
                        "dest": ".XcalarLRQExport.schedule#p71",
                        "columns": [
                            {
                                "columnName": "schedule::class_id",
                                "headerName": "class_id"
                            },
                            {
                                "columnName": "schedule::duration",
                                "headerName": "duration"
                            },
                            {
                                "columnName": "schedule::time",
                                "headerName": "time"
                            },
                            {
                                "columnName": "schedule::teacher_id",
                                "headerName": "teacher_id"
                            }
                        ],
                        "splitRule": "none",
                        "splitSize": 0,
                        "splitNumFiles": 0,
                        "headerType": "every",
                        "createRule": "createOnly",
                        "sorted": true,
                        "format": "csv",
                        "fieldDelim": "\t",
                        "recordDelim": "\n",
                        "quoteDelim": "\""
                    }
                }
            };
        });

        it("exceeding canvas limit should make dag have error state", function() {
            var $dagWrap = $('<div id="testDagWrap" class="dagWrap"></div>');
            var nodes = [sortNode, indexNode, dsNode];
            var oldCanvasLimit = Dag.canvasLimit;
            Dag.canvasLimit = -1;

            DagDraw.createDagImage(nodes, $dagWrap);
            expect($dagWrap.hasClass("tooLarge")).to.be.true;
            Dag.canvasLimit = oldCanvasLimit;
            $dagWrap.remove();
        });

        it("dag function error should make dag have error state", function() {
            var $dagWrap = $('<div id="testDagWrap" class="dagWrap"></div>');
            var nodes = [sortNode, indexNode, {error: "invalid node"}];

            DagDraw.createDagImage(nodes, $dagWrap);
            expect($dagWrap.hasClass("invalid")).to.be.true;
            $dagWrap.remove();
        });

        it("unexpected node should make dag have error state", function() {
            var $dagWrap = $('<div id="testDagWrap" class="dagWrap"></div>');
            var invalidNode = xcHelper.deepCopy(dsNode);
            invalidNode.api = 3;
            invalidNode.input = indexNode.input;

            var nodes = [sortNode, indexNode, invalidNode];
            DagDraw.createDagImage(nodes, $dagWrap);
            expect($dagWrap.hasClass("hasUnexpectedNode")).to.be.true;
            $dagWrap.remove();
        });

        it.skip("should handle multiple export nodes", function() {
            var $dagWrap = $('<div id="dagWrap-testDagWrap" class="dagWrap"></div>');
            var exportNode2 = xcHelper.deepCopy(exportNode);
            exportNode2.dagNodeId = "-1";
            var nodes = [exportNode, sortNode, indexNode, dsNode, exportNode2];

            DagDraw.createDagImage(nodes, $dagWrap);
            expect($dagWrap.hasClass("invalid")).to.be.true;
            $dagWrap.remove();
        });

        it("refresh dag image should work", function() {
            var $dagWrap = $('<div id="dagWrap-testDagWrap" class="dagWrap"></div>');
            var nodes = [sortNode, indexNode, dsNode];

            DagDraw.createDagImage(nodes, $dagWrap);
            $("body").append($dagWrap);
            DagDraw.refreshDagImage("testDagWrap", "unitTestTag", [indexNode.name.name]);
            var indexInfo = $dagWrap.data("allDagInfo").nodeIdMap[indexNode.dagNodeId];

            expect(indexInfo.value.tags.indexOf("unitTestTag")).to.equal(1);
            $dagWrap.remove();
        });
    });

    after(function(done) {
        if ($("#dfPanelSwitch").hasClass("active")) {
            $("#dfPanelSwitch").click();
        }

        timeOutPromise(500)
        .then(function() {
            return PromiseHelper.alwaysResolve(Aggregates.deleteAggs([aggName]));
        })
        .then(function() {
            return UnitTest.deleteAllTables();
        })
        .then(function() {
            UnitTest.deleteDS(testDs);
        })
        .always(function() {
            done();
        });
    });
});