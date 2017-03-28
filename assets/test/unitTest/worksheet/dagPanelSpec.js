describe('Dag Panel Test', function() {
    var $dagPanel;
    var testDs;

    var topLevelTables;

    var aggTable;
    var largeTable;
    var groupTable;
    var smallTable;
    var joinTable;

    var aggName;

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
        joinTable = {
            "prefix": undefined,
            "tableName": undefined,
            "tableId": undefined,
            "ancestorIds": [],
            "ancestorNames": [],
            "$dagWrap": undefined,
        };

        topLevelTables = [smallTable, aggTable, largeTable, groupTable];
                          // joinTable];



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

        function makeLargeDag(idx, total, base) {
            var deferred = PromiseHelper.deferred();
            var curIter = total-idx;
            if (idx <= 0) {
                return deferred.resolve();
            }
            var mapStr = "add("+gTables[largeTableIds[curIter + base]]
                .getCol(1).backName+",1)";
            xcFunction.map(1, largeTableIds[curIter + base],
                "mapped_col_" + String(curIter), mapStr)
            .then(function(newTName) {
                largeTableNames.push(newTName);
                largeTableIds.push(xcHelper.getTableId(newTName));
                return makeLargeDag(idx - 1, total, base);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        }
        $dagPanel = $('#dagPanel');
        var testDSObj = testDatasets.fakeYelp;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            var filterStr = 'eq(' + prefix + gPrefixSign +
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

            return makeLargeDag(14, 14, largeTableIds.length - 1);
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

            return xcFunction.groupBy(operator, tId, groupByCols, aggCol,
                                      newColName, {});
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

        //     // Now perform join
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

    describe('dag panel opening, closing', function() {
        var $switch;

        before(function() {
            $switch = $('#dfgPanelSwitch');
        });

        it('panel should open', function(done) {
            var scrollBarCheck = false;

            var scrollBarFunc = DagPanel.adjustScrollBarPositionAndSize;

            DagPanel.adjustScrollBarPositionAndSize = function() {
                scrollBarCheck = true;
            };

            expect($dagPanel.hasClass('hidden')).to.be.true;
            expect($dagPanel.hasClass('xc-hidden')).to.be.true;
            expect($switch.hasClass('active')).to.be.false;
            expect($dagPanel.offset().top)
            .to.not.equal($("#mainFrame").offset().top);


            // open panel
            $switch.click();

            expect(scrollBarCheck).to.be.false;

            setTimeout(function() {
                expect($dagPanel.hasClass('hidden')).to.be.false;
                expect($dagPanel.hasClass('xc-hidden')).to.be.false;
                expect($switch.hasClass('active')).to.be.true;
                expect($dagPanel.offset().top)
                .to.equal($("#mainFrame").offset().top);
                expect($("#mainFrame").height()).to.equal(0);
                expect(scrollBarCheck).to.be.true;

                DagPanel.adjustScrollBarPositionAndSize = scrollBarFunc;

                done();
            }, 2000);
        });

        it('panel should close', function(done) {
            var rowScrollCheck = false;

            // close panel
            $switch.click();
            expect(rowScrollCheck).to.be.false;
            expect($dagPanel.attr('style').indexOf('top')).to.be.gt(-1);

            setTimeout(function() {
                expect($("#mainFrame").height()).to.be.gt(0);
                expect($dagPanel.hasClass('hidden')).to.be.true;
                expect($dagPanel.hasClass('xc-hidden')).to.be.true;
                expect($switch.hasClass('active')).to.be.false;
                expect($dagPanel.offset().top)
                .to.not.equal($("#mainFrame").offset().top);
                expect($dagPanel.attr('style').indexOf('top')).to.equal(-1);

                done();
            }, 600);
        });

        it('maximizing dag should work', function(done) {
            var rowScrollCheck = false;

            // open panel
            $switch.click();

            setTimeout(function() {
                expect($dagPanel.hasClass('hidden')).to.be.false;
                expect($dagPanel.hasClass('xc-hidden')).to.be.false;
                expect($dagPanel.offset().top)
                .to.equal($("#mainFrame").offset().top);

                $dagPanel.css('top', '20%');
                $dagPanel.find('.dagArea').css('height', 'calc(80% - 5px)');
                $('#maximizeDag').removeClass('unavailable');
                var panelHeight = $dagPanel.height();

                expect(parseInt($dagPanel.css('top')))
                .to.equal(Math.floor(panelHeight * .2));

                $('#maximizeDag').click();

                setTimeout(function() {
                    expect(parseInt($dagPanel.css('top'))).to.equal(0);
                    done();
                }, 600);

            }, 1000);
        });
    });

    describe('dagWrap action icons', function() {
        it('save image btn should work', function(done) {
            var cachedFn = Dag.createSavableCanvas;
            var cachedFnTriggered = false;
            Dag.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find('.saveImageBtn').eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                Dag.createSavableCanvas = cachedFn;
                done();
            }, 1);
        });

        it('new tab image btn should work', function(done) {
            var cachedFn = Dag.createSavableCanvas;
            var cachedFnTriggered = false;
            Dag.createSavableCanvas = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
                return PromiseHelper.reject();
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find('.newTabImageBtn').eq(0).click();
            setTimeout(function() {
                expect(cachedFnTriggered).to.be.true;
                Dag.createSavableCanvas = cachedFn;
                done();
            }, 1);

        });

        it('addDataFlow btn should work', function() {
            var cachedFn = DFCreateView.show;
            var cachedFnTriggered = false;
            DFCreateView.show = function($el) {
                expect($el.length).to.equal(1);
                cachedFnTriggered = true;
            };
            expect(cachedFnTriggered).to.be.false;
            $dagPanel.find('.addDataFlow').eq(0).click();
            expect(cachedFnTriggered).to.be.true;
            DFCreateView.show = cachedFn;
        });
    });

    describe('dag table menu', function() {
        var $menu;
        before(function() {
            $menu = $dagPanel.find('.dagTableDropDown');
        });

        // test right-most table
        it('menu should open', function() {
            expect($menu.is(":visible")).to.be.false;
            smallTable.$dagWrap.find('.dagTable').last().click();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find('li:visible').length).to.equal(7);
            expect($menu.find('li.unavailable:visible').length).to.equal(2);
            expect($menu.find('li.deleteTableDescendants')
                .hasClass('unavailable')).to.be.true;
            expect($menu.find('li.generateIcv').hasClass('unavailable')).to.be.true;
            expect($menu.find('li.addTable').is(":visible")).to.be.false;
            expect($menu.find('li.revertTable').is(":visible")).to.be.false;
            expect($menu.find('li.archiveTable').is(":visible")).to.be.true;
            expect($menu.find('li.focusTable').is(":visible")).to.be.true;
        });

        describe('table menu actions', function() {
            describe('rightmost table', function() {
                it('focus li should work', function() {
                    var cachedFn = DagFunction.focusTable;
                    var cachedFnTriggered = false;
                    DagFunction.focusTable = function(tId) {
                        expect(tId).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find('.focusTable').trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;
                    DagFunction.focusTable = cachedFn;
                });

                it('archive li should work', function() {
                    var cachedFn = TblManager.archiveTables;
                    var cachedFnTriggered = false;
                    TblManager.archiveTables = function(tIds) {
                        expect(tIds[0]).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find('.archiveTable').trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;
                    TblManager.archiveTables = cachedFn;
                });

                it('delete li should work', function() {
                    var cachedFn = TblManager.deleteTables;
                    var cachedFnTriggered = false;
                    TblManager.deleteTables = function(tId) {
                        expect(tId).to.equal(smallTable.tableId);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find('.deleteTable').trigger(fakeEvent.mouseup);
                    UnitTest.hasAlertWithTitle("Drop Tables", {confirm: true});
                    expect(cachedFnTriggered).to.be.true;
                    TblManager.deleteTables = cachedFn;
                });

                it('showSchema li should work', function() {
                    expect($("#dagSchema:visible").length).to.equal(0);
                    $menu.find('.showSchema').trigger(fakeEvent.mouseup);
                    expect($("#dagSchema:visible").length).to.equal(1);
                    var numCols = gTables[smallTable.tableId].tableCols.length - 1;
                    expect($("#dagSchema").find('li').length).to.equal(numCols);
                    expect($("#dagSchema").find('.rowCount .value').text())
                    .to.equal("8");

                    var $li = $("#dagSchema").find('li').filter(function() {
                        return $(this).text() === "string" + smallTable.prefix +
                            gPrefixSign + "yelping_since";
                    });
                    expect($li.length).to.equal(1);
                });

                it('lockTable li should work', function() {
                    $menu.find('.addNoDelete').trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find('.dagTable').last()
                        .find('.lockIcon').length)
                    .to.equal(1);
                    expect(smallTable.$dagWrap.find('.dagTable.noDelete').length)
                    .to.equal(1);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.true;
                });

                it('unlockTable li should work', function() {
                    $menu.find('.removeNoDelete').trigger(fakeEvent.mouseup);
                    expect(smallTable.$dagWrap.find('.dagTable').last()
                        .find('.lockIcon').length)
                    .to.equal(0);
                    expect(smallTable.$dagWrap.find('.dagTable.noDelete').length)
                    .to.equal(0);
                    expect(gTables[smallTable.tableId].isNoDelete()).to.be.false;
                });
            });

            describe('middle table', function() {
                // test right-most table
                it('menu should open', function() {
                    smallTable.$dagWrap.find('.dagImage').last()
                    .find('.dagTable .dagTableIcon').eq(0).click();
                    expect($menu.is(":visible")).to.be.true;
                    expect($menu.find('li:visible').length).to.equal(7);
                    expect($menu.find('li.unavailable:visible').length).to.equal(2);
                    expect($menu.find('li.deleteTableDescendants').hasClass('unavailable')).to.be.true;
                    expect($menu.find('li.generateIcv').hasClass('unavailable')).to.be.true;
                    expect($menu.find('li.addTable').is(":visible")).to.be.true;
                    expect($menu.find('li.revertTable').is(":visible")).to.be.true;
                    expect($menu.find('li.archiveTable').is(":visible")).to.be.false;
                    expect($menu.find('li.focusTable').is(":visible")).to.be.false;
                });

                it('addTable li should work', function() {
                    var cachedFn = DagFunction.addTable;
                    var cachedFnTriggered = false;
                    DagFunction.addTable = function(tId) {
                        expect(tId).to.equal(smallTable.ancestorIds[0]);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find('.addTable').trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;
                    DagFunction.addTable = cachedFn;
                });

                it('revertTable li should work', function() {
                    var cachedFn = DagFunction.revertTable;
                    var cachedFnTriggered = false;
                    DagFunction.revertTable = function(tId, tName, oldTName) {
                        expect(tId).to.equal(smallTable.ancestorIds[0]);
                        expect(tName).to.equal(smallTable.ancestorNames[0]);
                        expect(oldTName).to.equal(smallTable.tableName);
                        cachedFnTriggered = true;
                    };
                    expect(cachedFnTriggered).to.be.false;
                    $menu.find('.revertTable').trigger(fakeEvent.mouseup);
                    expect(cachedFnTriggered).to.be.true;
                    DagFunction.revertTable = cachedFn;
                });
            });

            after(function() {
                // close menu
                $(document).mousedown().click();
            });
        });
    });

    describe('dag panel right click menu', function() {
        var $menu;
        var $dagWrap; // This section, $dagWrap is smallTable.$dagWrap;
        before(function() {
            $dagWrap = smallTable.$dagWrap;
            $menu = $dagPanel.find('.rightClickDropDown');
        });
////////////////////////////////////////////////////////////////////////////////
        it('menu should open', function() {
            expect($menu.is(":visible")).to.be.false;
            smallTable.$dagWrap.contextmenu();
            // $dagWrap.find('.dagImageWrap').last().contextmenu();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find('li:visible').length).to.equal(3);
        });

        describe('right click actions', function() {
            it('save image li should work', function(done) {
                var save = Dag.createSavableCanvas;
                var saveTriggered = false;
                Dag.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find('.saveImage').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    Dag.createSavableCanvas = save;
                    done();
                }, 1);
            });

            it('new tab image li should work', function(done) {
                var save = Dag.createSavableCanvas;
                var saveTriggered = false;
                Dag.createSavableCanvas = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    saveTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(saveTriggered).to.be.false;
                $menu.find('.newTabImage').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(saveTriggered).to.be.true;
                    Dag.createSavableCanvas = save;
                    done();
                }, 1);
            });

            it('dataflow li should work', function(done) {
                var dfShow = DFCreateView.show;
                var dsShowTriggered = false;
                DFCreateView.show = function($dagWrap) {
                    expect($dagWrap.length).to.equal(1);
                    dsShowTriggered = true;
                    return PromiseHelper.reject();
                };
                expect(dsShowTriggered).to.be.false;
                $menu.find('.dataflow').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(dsShowTriggered).to.be.true;
                    DFCreateView.show = dfShow;
                    done();
                }, 1);
            });

            it('expandAll li should work', function() {
                var cachedFn = Dag.expandAll;
                var cachedFnTriggered = false;
                Dag.expandAll = function($tWrap) {
                    expect($tWrap.length).to.equal(1);
                    cachedFnTriggered = true;
                };
                expect(cachedFnTriggered).to.be.false;
                $menu.find('.expandAll').trigger(fakeEvent.mouseup);
                expect(cachedFnTriggered).to.be.true;
                Dag.expandAll = cachedFn;
            });

            it('collapseAll li should work', function() {
                var cachedFn = Dag.collapseAll;
                var cachedFnTriggered = false;
                Dag.collapseAll = function($tWrap) {
                    expect($tWrap.length).to.equal(1);
                    cachedFnTriggered = true;
                };
                expect(cachedFnTriggered).to.be.false;
                $menu.find('.collapseAll').trigger(fakeEvent.mouseup);
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
                DagPanel.__testOnly__.saveImageAction($smallDagWrap,
                                                        smallTable.tableName)
                .then(done)
                .fail(function() {
                    done("failed");
                });
            });

            it.skip("newTabImageAction should work", function(done) {
                DagPanel.__testOnly__.newTabImageAction($smallDagWrap)
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
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
                Dag.collapseAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
                Dag.expandAll($smallDagWrap);
                expect($smallDagWrap.find(".expandWrap").length).to.equal(0);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
            });
        });
        describe("Right click menu actions on large dag should work.", function() {

            it("expandAll and collapseAll should work", function() {
                var nodes = $largeDagWrap.data("allDagInfo").nodes;
                // NumNodes defined this way as nodes is an object with keys
                // named strings of numbers
                var numNodes = Object.keys(nodes).length;

                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                for (var nodeIdx in nodes) {
                    if (nodeIdx === String(0) ||
                        nodeIdx === String(numNodes - 1)) {
                        expect(nodes[nodeIdx].isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].isHidden).to.be.true;
                    }
                }
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
                Dag.collapseAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                for (var nodeIdx in nodes) {
                    if (nodeIdx === String(0) ||
                        nodeIdx === String(numNodes - 1)) {
                        expect(nodes[nodeIdx].isHidden).to.be.false;
                    } else {
                        expect(nodes[nodeIdx].isHidden).to.be.true;
                    }
                }
                Dag.expandAll($largeDagWrap);
                expect($largeDagWrap.find(".expandWrap").length).to.equal(1);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
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
            $menu = $dagPanel.find('.dagTableDropDown');
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
                expect($menu.find('li.focusTable').is(":visible")).to.be.true;
                $menu.find('.focusTable').trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(largeTableId);
                $smallDagIcon.click();
                expect($menu.find('li.focusTable').is(":visible")).to.be.true;
                $menu.find('.focusTable').trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(smallTableId);
            });
            it("Revert table should not work", function() {
                $largeDagIcon.click();
                expect($menu.find('li.revertTable').is(":visible")).to.be.false;
            });
            it("Schema support functions should work", function() {
                // TODO*: Actually test something
                $largeDagIcon.click();
                $menu.find('.showSchema').trigger(fakeEvent.mouseup);
                $dagSchema = $("#dagSchema");
                var numCols = gTables[largeTableId].tableCols.length - 1;
                expect($("#dagSchema").find('li').length).to.equal(numCols);
                $("#dagSchema").find("li").eq(8).trigger(fakeEvent.mouseup);

                // TODO: Do more interesting tests once have groupBy and join tables
            });

            it("ICV Table should work", function(done) {
                $largeDagIcon.click();
                expect($menu.find('li.generateIcv').hasClass('unavailable'))
                .to.be.false;
                // $menu.find('.generateIcv').trigger(fakeEvent.mouseup);
                DagPanel.__testOnly__.generateIcvTable(
                    largeTable.$dagWrap.find(".tableName").text(),
                    $largeDagTable.data("tablename"),
                    $largeDagIcon);
                setTimeout(function() {
                    $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    $icvDagTable = $icvDagWrap.find(".dagTable").last();
                    icvTableId = $icvDagTable.data("id");
                    $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    $icvDagIcon.click();
                    expect($menu.find('li.generateIcv').hasClass('unavailable'))
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
                    $menu.find('.generateIcv').trigger(fakeEvent.mouseup);
                    expect(Object.keys(gTables).length).to.equal(numTables);
                    expect(xcHelper.getFocusedTable()).to.equal(icvTableId);

                    done();
                }, 700);
            });
            it("Drop table should work", function(done) {
                $icvDagIcon.click();
                expect($menu.find('li.deleteTable').hasClass('unavailable'))
                .to.be.false;
                expect($("#alertModal").css("display")).to.equal("none");
                $menu.find('.deleteTable').trigger(fakeEvent.mouseup);
                expect($("#alertModal").css("display")).to.not.equal("none");
                expect(gTables[icvTableId]).to.not.be.undefined;
                $("#alertModal .btn.confirm").click();
                setTimeout(function() {
                    // Ensure was actually deleted.
                    expect(gTables[icvTableId]).to.be.undefined;
                    // Ensure was deleted from DAG
                    // TODO: copy deletion check from revert table below.
                    expect($dagPanel.find("#dagWrap-" + String(icvTableId)).length)
                    .to.equal(0);
                    done();
                }, 400);
            });
            it("Hide table should work", function(done) {
                // Use icv table to also test repeated ICV table behavior
                $largeDagIcon.click();
                expect($menu.find('li.generateIcv').hasClass('unavailable'))
                .to.be.false;
                $menu.find('.generateIcv').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    $icvDagWrap = $(".dagWrap.selected");
                    expect($icvDagWrap.length).to.equal(1);
                    $icvDagTable = $icvDagWrap.find(".dagTable").last();
                    icvTableId = $icvDagTable.data("id");
                    $icvDagIcon = $icvDagTable.find(".dagTableIcon");

                    expect(gTables[icvTableId].status).is.equal("active");
                    $icvDagIcon.click();
                    $menu.find('.archiveTable').trigger(fakeEvent.mouseup);
                    expect(gTables[icvTableId].status).is.not.equal("active");

                    XcalarDeleteTable(gTables[icvTableId].tableName)
                    .then(function() {
                        done();
                    })
                    .fail(function() {
                        done("failed to delete table");
                    });
                }, 800);
            });
        });
        describe("Operations on second to last table should work", function() {
            var dagDepth;
            var $prevDagTable;
            var $prevDagIcon;
            var prevTableId;

            beforeEach(function() {
                dagDepth = largeTable.$dagWrap.data("allDagInfo").depth;
                $prevDagTable = largeTable.$dagWrap.find(".dagTable").eq(dagDepth-2);
                $prevDagIcon = $prevDagTable.find(".dagTableIcon");
                prevTableId = $prevDagTable.data("id");
            });

            it("Add table should work", function(done) {
                expect(prevTableId).to.equal(largeTable.ancestorIds[0]);
                $prevDagIcon.click();
                expect($menu.find('li.addTable').is(":visible")).to.be.true;
                // $menu.find('.addTable').trigger(fakeEvent.mouseup);
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
                expect($menu.find('li.revertTable').is(":visible")).to.be.true;
                $menu.find('.revertTable').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(gTables[prevTableId].status).is.equal("active");
                    expect(gTables[largeTable.tableId].status)
                    .is.not.equal("active");
                    XcalarDeleteTable(largeTable.tableName)
                    .then(function() {
                        expect(largeTable.$dagWrap.hasClass("locked")).to.be.true;
                        expect(largeTable.$dagWrap.hasClass("dagWrapToRemove"))
                        .to.be.true;
                        expect($dagPanel.find("#dagWrap-" + prevTableId).length).to.equal(1);
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
                }, 1000);
            });
            it("Delete second last table should work", function(done) {
                $prevDagIcon.click();
                expect($menu.find('li.deleteTable').hasClass('unavailable'))
                .to.be.false;
                expect($("#alertModal").css("display")).to.equal("none");
                $menu.find('.deleteTable').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect($("#alertModal").css("display")).to.not.equal("none");
                    expect(gTables[prevTableId]).to.not.be.undefined;
                    var numNodes = Object.keys(largeTable.$dagWrap
                        .data("allDagInfo").nodes).length;
                    $("#alertModal .btn.confirm").click();
                    setTimeout(function() {
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
                    }, 400);
                }, 2000);
            });
        });
    });

    after(function(done) {
        if ($('#dfgPanelSwitch').hasClass('active')) {
            $('#dfgPanelSwitch').click();
        }
        var isSuccess = 0;
        timeOutPromise(500)
        .then(function() {
            function promiseGenerator(tableName) {
                var tableId = xcHelper.getTableId(tableName);
                if (gTables[tableId] === undefined) {
                    isSuccess += 1;
                    return PromiseHelper.resolve();
                }
                var tStatus = gTables[tableId].status;
                if (tStatus === TableType.Active) {
                    var lastTable = gTables[tableId];
                    var tType = lastTable.status;
                    return UnitTest.deleteTable(tableName, tType);
                } else if (tStatus === TableType.Orphaned ||
                                       TableType.Archived)
                {
                    var deferred = PromiseHelper.deferred();
                    TblManager.deleteTables([tableName], tStatus)
                    // XcalarDeleteTable(tableName)
                    .then(function() {
                        isSuccess += 1;
                        deferred.resolve();
                    })
                    .fail(function() {
                        deferred.reject();
                    });
                    return deferred.promise();
                } else {
                    console.warn("Unhandled tstatus: " + String(tStatus));
                    return deferred.resolve();
                }
            }
            var promValues = [];
            for (var i = 0; i < topLevelTables.length; i++) {
                promValues.push(topLevelTables[i].tableName);
                promValues = promValues.concat(topLevelTables[i].ancestorNames);
            }
            return PromiseHelper.chainHelper(promiseGenerator, promValues);
        })
        .then(function() {
            return Aggregates.deleteAggs([aggName]);
        })
        .then(function() {
            return UnitTest.deleteDS(testDs);
        })
        .always(function() {
            done();
        });
    });
});
