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
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
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
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
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
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
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
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
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
            expect(smallTable.$dagWrap.find(".dagTable span").last().text())
            .to.equal(smallTable.tableName);
            expect(aggTable.$dagWrap.find(".dagTable span").last().text())
            .to.equal(aggTable.tableName);
            expect(largeTable.$dagWrap.find(".dagTable span").last().text())
            .to.equal(largeTable.tableName);
            expect(groupTable.$dagWrap.find(".dagTable span").last().text())
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
    });

    describe("dag panel resizing", function() {
        it("should resize", function() {
            var $bar = $("#dagPanel").find(".ui-resizable-n").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 1, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY });

            expect($bar.offset().top < pageX);
        });
    });

    describe("dagWrap action icons", function() {
        it("save image btn should work", function(done) {
            var cachedFn = Dag.createSavableCanvas;
            var cachedFnTriggered = false;
            Dag.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find(".saveImageBtn").eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                Dag.createSavableCanvas = cachedFn;
                done();
            }, 1);
        });

        it("new tab image btn should work", function(done) {
            var cachedFn = Dag.createSavableCanvas;
            var cachedFnTriggered = false;
            Dag.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find(".newTabImageBtn").eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                Dag.createSavableCanvas = cachedFn;
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
            smallTable.$dagWrap.find(".dagTable").last().click();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find("li:visible").length).to.equal(7);
            expect($menu.find("li.unavailable:visible").length).to.equal(1);
            expect($menu.find("li.generateIcv").hasClass("unavailable")).to.be.true;
            expect($menu.find("li.addTable").is(":visible")).to.be.false;
            expect($menu.find("li.revertTable").is(":visible")).to.be.false;
            expect($menu.find("li.archiveTable").is(":visible")).to.be.true;
            expect($menu.find("li.focusTable").is(":visible")).to.be.true;
            expect($menu.find("li.removeNoDelete").is(":visible")).to.be.false;
            expect($menu.find("li.addNoDelete").is(":visible")).to.be.true;
        });

        it("menu should on noDrop table should be correct", function() {
            gTables[smallTable.tableId].addNoDelete();
            smallTable.$dagWrap.find(".dagTable").last().click();
            expect($menu.find("li.removeNoDelete").is(":visible")).to.be.true;
            expect($menu.find("li.addNoDelete").is(":visible")).to.be.false;
            expect($menu.find("li.deleteTable").hasClass("unavailable")).to.be.true;

            gTables[smallTable.tableId].removeNoDelete();
            smallTable.$dagWrap.find(".dagTable").last().click();
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

                it("archive li should work", function() {
                    var cachedFn = TblManager.archiveTables;
                    var cachedFnTriggered = false;
                    TblManager.archiveTables = function(tIds) {
                        expect(tIds[0]).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find(".archiveTable").trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;

                    cachedFnTriggered = false;
                    $menu.find(".archiveTable").trigger(rightMouseup);
                    expect(cachedFnTriggered).to.be.false;

                    TblManager.archiveTables = cachedFn;
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
                });

                it("lockTable li should work", function() {
                    $menu.find(".addNoDelete").trigger(rightMouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").last()
                        .find(".lockIcon").length)
                    .to.equal(0);

                    $menu.find(".addNoDelete").trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").last()
                        .find(".lockIcon").length)
                    .to.equal(1);
                    expect(smallTable.$dagWrap.find(".dagTable.noDelete").length)
                    .to.equal(1);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.true;
                });

                it("unlockTable li should work", function() {
                    $menu.find(".removeNoDelete").trigger(rightMouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").last()
                        .find(".lockIcon").length)
                    .to.equal(1);

                    $menu.find(".removeNoDelete").trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find(".dagTable").last()
                        .find(".lockIcon").length)
                    .to.equal(0);
                    expect(smallTable.$dagWrap.find(".dagTable.noDelete").length)
                    .to.equal(0);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.false;
                });
            });

            describe("middle table", function() {
                // test right-most table
                it("menu should open", function() {
                    smallTable.$dagWrap.find(".dagImage").last()
                    .find(".dagTable .dagTableIcon").eq(0).click();
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
                    smallTable.$dagWrap.find(".dagImage").last()
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
                var save = Dag.createSavableCanvas;
                var saveTriggered = false;
                Dag.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find(".saveImage").trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    Dag.createSavableCanvas = save;
                    done();
                }, 1);
            });

            it("new tab image li should work", function(done) {
                var save = Dag.createSavableCanvas;
                var saveTriggered = false;
                Dag.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find(".newTabImage").trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    Dag.createSavableCanvas = save;
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

            it("createBatchDataflow action should work", function() {
                var $dfPanel = $("#dfCreateView");
                expect($dfPanel.hasClass("xc-hidden")).to.be.true;
                DagPanel.__testOnly__.addDataFlowAction($smallDagWrap);
                expect($dfPanel.hasClass("xc-hidden")).to.be.false;
                // TODO: ensure that the table name is correct.
                DFCreateView.close();
                expect($dfPanel.hasClass("xc-hidden")).to.be.true;
            });
        });

        describe("Right click menu actions workshould on small dag.", function() {
            // Already tested save image, new tab image, and create dataflow
            it("Dag expandall and collapseall on small dag should fail", function() {
                // Notes: no hidden flags or anything like that
                var nodes = $smallDagWrap.data("allDagInfo").nodes;

                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                });
                Dag.collapseAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                });
                Dag.expandAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                });
            });
        });

        describe("Right click menu actions on large dag should work.", function() {
            it("expandAll and collapseAll should work", function() {
                var nodes = $largeDagWrap.data("allDagInfo").nodes;
                // NumNodes defined this way as nodes is an object with keys
                // named strings of numbers
                var numNodes = Object.keys(nodes).length;

                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    if (nodeIdx === String(0) ||
                        nodeIdx === String(numNodes - 1)) {
                        expect(nodes[nodeIdx].isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].isHidden).to.be.true;
                    }
                });
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                });
                Dag.collapseAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    if (nodeIdx === String(0) ||
                        nodeIdx === String(numNodes - 1)) {
                        expect(nodes[nodeIdx].isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].isHidden).to.be.true;
                    }
                });
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                Object.keys(nodes).forEach(function(nodeIdx) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
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
            var createActionWrap = $smallDagWrap.find(".actionType.dropdownBox").eq(0);
            var reduceActionWrap = $smallDagWrap.find(".actionType.dropdownBox").eq(1);
            var mapActionWrap = $largeDagWrap.find(".actionType.dropdownBox").last();

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
            $largeDagTable = largeTable.$dagWrap.find(".dagTable").last();
            largeTableId = $largeDagTable.data("id");
            $largeDagIcon = $largeDagTable.find(".dagTableIcon");
        });

        describe("Operations on last table should work", function() {
            it("Focus table should work.", function() {
                expect(largeTableId).to.equal(largeTable.tableId);
                var $smallDagTable = smallTable.$dagWrap.find(".dagTable").last();
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
                $("#dagSchema").find(".content li").eq(8).trigger(fakeEvent.mouseup);

                // TODO: Do more interesting tests once have groupBy and join tables
            });

            it("ICV Table should work", function(done) {
                $largeDagIcon.click();
                expect($menu.find("li.generateIcv").hasClass("unavailable"))
                .to.be.false;
                // $menu.find(".generateIcv").trigger(fakeEvent.mouseup);
                DagPanel.__testOnly__.generateIcvTable(
                    largeTable.$dagWrap.find(".tableName").text(),
                    $largeDagTable.data("tablename"),
                    $largeDagIcon)
                .then(function() {
                    $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    $icvDagTable = $icvDagWrap.find(".dagTable").last();
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
                    $icvDagTable = $icvDagWrap.find(".dagTable").last();
                    icvTableId = $icvDagTable.data("id");
                    $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    expect(gTables[icvTableId].status).is.equal("active");
                    $icvDagIcon.click();
                    $menu.find(".archiveTable").trigger(fakeEvent.mouseup);
                    expect(gTables[icvTableId].status).is.not.equal("active");

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
            var dagDepth;
            var $prevDagTable;
            var $prevDagIcon;
            var prevTableId;
            var prevTableName;

            beforeEach(function() {
                dagDepth = largeTable.$dagWrap.data("allDagInfo").depth;
                $prevDagTable = largeTable.$dagWrap.find(".dagTable").eq(dagDepth-2);
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
                    $dagWrapPrev.find(".dagTable .dagTableIcon").last().click();
                    $menu.find(".archiveTable").trigger(fakeEvent.mouseup);
                    setTimeout(function() {
                        done();
                    }, 300);
                });
            });

            it("Revert table should work", function(done) {
                var dagDepth = largeTable.$dagWrap.data("allDagInfo").depth;
                var $prevDagTable = largeTable.$dagWrap.find(".dagTable")
                                    .eq(dagDepth-2);
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
                        $largeDagTable = largeTable.$dagWrap.find(".dagTable").last();
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

                    expect(gTables[prevTableId]).to.be.undefined;
                    TblManager.setOrphanTableMeta(prevTableName);
                    expect(gTables[prevTableId]).to.not.be.undefined;

                    var numNodes = Object.keys(largeTable.$dagWrap
                        .data("allDagInfo").nodes).length;
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
                            .data("allDagInfo").nodes).length)
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

                DagPanel.__testOnly__.generateIcvTable(
                    $icon.closest(".dagWrap").find(".tableName").text(),
                    $dagTable.data("tablename"),
                    $icon)
                .then(function() {
                    var $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    var $icvDagTable = $icvDagWrap.find(".dagTable").last();
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
                var $dagTable = $(".actionType.filter").eq(0).siblings(".dagTable");
                var $icon = $dagTable.find(".dagTableIcon");
                var origId = $dagTable.data("id");
                var origTablename = $dagTable.data("tablename");
                var prevId = $dagTable.closest(".dagTableWrap").prev()
                            .find(".dagTable").data("id");
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
                var fn = DagPanel.__testOnly__.isComplementTableExists;
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
            $dagPanel.find(".parentsTitle").eq(0).closest(".actionType").attr("data-original-title", oldTableName);
            $dagPanel.find(".parentsTitle").eq(0).closest(".actionType").attr("title", oldTableName);
            $dagPanel.find(".parentsTitle").eq(0).text(oldTableName);

            Dag.renameAllOccurrences(oldTableName, newTableName);

            expect($tables.data("tablename").indexOf(newTableName)).to.be.gt(-1);
            var $sameTables = $("#dagPanel .dagTable").filter(function() {
                return $(this).data("tablename") === oldTableName;
            });
            expect($sameTables.length).to.equal(0);
            var $newTables = $("#dagPanel .dagTable").filter(function() {
                return $(this).data("tablename") === newTableName;
            });
            expect($dagPanel.find(".parentsTitle").eq(0).closest(".actionType").attr("data-original-title")).to.equal(newTableName);
            expect($newTables.length).to.equal(numTables);

            Dag.renameAllOccurrences(newTableName, oldTableName);
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
            loadInfo.loadArgs = {csv: {recordDelim: "\t"}};

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
            aggTable;
            var prefix = aggTable.prefix;
            var $dagWrap = aggTable.$dagWrap;
            var $dagTable = $dagWrap.find(".dagTable").last();

            var index = $dagTable.data("index");
            var nodes = $dagWrap.data("allDagInfo").nodes;
            var fn = Dag.__testOnly__.findColumnSource;
            var sourceColNames = [prefix + gPrefixSign + "average_stars"];

            fn(sourceColNames, $dagWrap, index, nodes, "agg_result", false, true, index);
            expect($dagWrap.find(".highlighted").length).to.equal(3);
            expect($dagWrap.find(".highlighted").eq(0).data("index")).to.equal(5);
            expect($dagWrap.find(".highlighted").last().data("index")).to.equal(1);
        });

        it("getSourceTables should work", function() {
            var fn =  Dag.__testOnly__.getSourceTables;
            var node = {
                renameMap: [
                    {oldName: "before", newName: "after", type: 0}
                ],
                parents: [0, 1],
                numLeftColumns: 0
            };
            var nodes = {
                "0": {name: "tName1"},
                "1": {name: "tName2"},
            };
            var res = fn("after", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(1);

            node.numLeftColumns = 1;
            res = fn("after", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(0);

            // should not find a match
            node.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.numLeftColumns = 0;
            res = fn("after", node, nodes);
            expect(res.length).to.equal(2);
            expect(res[0]).to.equal(0);
            expect(res[1]).to.equal(1);

            node.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.numLeftColumns = 0;
            res = fn("after::colName", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(1);

            node.renameMap = [ {oldName: "before", newName: "after", type: 13}];
            node.numLeftColumns = 1;
            res = fn("after::colName", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(0);

            // the case that this table's prefix didn't get renamed but another's
            // did
            node.renameMap = [{oldName: "before", newName: "after", type: 13}];
            node.numLeftColumns = 0;
            res = fn("before::colName", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(0);

            node.renameMap = [{oldName: "before", newName: "after", type: 13}];
            node.numLeftColumns = 1;
            res = fn("before::colName", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(1);

            node.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.numLeftColumns = 1;
            res = fn("before", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(1);

            node.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.numLeftColumns = 0;
            res = fn("before", node, nodes);
            expect(res.length).to.equal(1);
            expect(res[0]).to.equal(0);

            //self join
            node.renameMap = [{oldName: "before", newName: "after", type: 0}];
            node.numLeftColumns = 0;
            nodes = {
                "0": {name: "tName1"},
                "1": {name: "tName1"},
            };
            res = fn("before", node, nodes);
            expect(res.length).to.equal(2);
            expect(res[0]).to.equal(0);
            expect(res[1]).to.equal(1);
        });

        it("getRenamedColname should work", function() {
            var fn =  Dag.__testOnly__.getRenamedColName;
            var node = {
                renameMap: [
                    {oldName: "before", newName: "after", type: 0}
                ]
            };
            var res = fn("after", node);
            expect(res).to.equal("before");

            res = fn("before", node);
            expect(res).to.equal("before");

            res = fn("something", node);
            expect(res).to.equal("something");

            node.renameMap = [{oldName: "before", newName: "after", type: 13}];

            res = fn("test::colName", node);
            expect(res).to.equal("test::colName");

            res = fn("after::colName", node);
            expect(res).to.equal("before::colName");
        });

        it("getIconHtml", function() {
            var fn = Dag.__testOnly__.getIconHtml;
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
            var fn = Dag.__testOnly__.getJoinIconClass;
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
            var fn = Dag.__testOnly__.getDagNodeInfo;
            var dagNode = {input: {filterInput: {filterStr: "not(eq(col, 2))"}}};
            var res = fn(dagNode, "filterInput", ["parent"], 1, {});
            expect(res.type).to.equal("filternot");
            expect(res.tooltip).to.equal("Filtered table &quot;parent&quot;: not(eq(col, 2))");

            dagNode = {input: {filterInput: {filterStr: "other(col, 2)"}}};
            res = fn(dagNode, "filterInput", ["parent"], 1, {});

            expect(res.type).to.equal("filterother");
            expect(res.tooltip).to.equal("Filtered table &quot;parent&quot;: other(col, 2)");
            expect(res.column).to.equal("col");

            dagNode = {input: {otherInput: {filterStr: "other(col, 2)"}}};
            res = fn(dagNode, "otherInput", ["parent"], 1, {});
            expect(res.type).to.equal("other");
            expect(res.tooltip).to.equal("Other");
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
