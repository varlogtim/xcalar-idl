describe('Dag', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var tableName2;
    var tableId2;
    var $dagPanel;
    var $dagWrap;
    var largeTableNames = [];
    var largeTableIds = [];
    var tableNamesToDelete = [];
    var tableIdsToDelete = [];
    var largePrefix;
    var $largeDagWrap;

    before(function(done) {
        this.timeout(200000);
        UnitTest.onMinMode();

        // Test table layout:
        // dag: ds --load from ds--> table --reduce--> $table
        // largeDag: ds--loadfromds--> table --map X 14--> $largeTable

        //TODO: (tests)
        // -Perform a groupby on $largeTable, saving the old table: $groupTable
        // -Perform a join on $table, $largeTable, $groupTable
        //     -Need a join on 3+ table to get to the drawExtraCurves code in
        //      dag.js
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
            $table = $('#xcTable-' + tableId);
            $dagPanel = $('#dagPanel');
            $dagWrap = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                      dWrap) {
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
                                        .data("tablename");
                return (dTableName === tableName);
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
            largeTableNames.push(ret);
            largeTableIds.push(xcHelper.getTableId(ret));
            return makeLargeDag(15, 15, largeTableIds.length - 1);
        })
        .then(function() {
            $largeDagWrap = $dagPanel.find(".dagWrap").filter(function(idx,
                                                                        dWrap) {
                var dTableName = $(dWrap).find(".dagTable[data-index='0']")
                                         .data("tablename");
                return(dTableName === largeTableNames[largeTableNames.length - 1]);
            });
            done();
        })
        .fail(function() {
            done("failed");
        });
    });

    describe('dag panel opening, closing', function() {
        var $switch;

        before(function() {
            $switch = $('#dfgPanelSwitch');
        });

        it('panel should open', function(done) {
            var rowScrollCheck = false;
            var scrollBarCheck = false;

            var rowScrollFunc = RowScroller.updateViewRange;
            var scrollBarFunc = DagPanel.adjustScrollBarPositionAndSize;

            RowScroller.updateViewRange = function() {
                rowScrollCheck = true;
            };

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

            expect(rowScrollCheck).to.be.false;
            expect(scrollBarCheck).to.be.false;

            setTimeout(function() {
                expect($dagPanel.hasClass('hidden')).to.be.false;
                expect($dagPanel.hasClass('xc-hidden')).to.be.false;
                expect($switch.hasClass('active')).to.be.true;
                expect($dagPanel.offset().top)
                .to.equal($("#mainFrame").offset().top);
                expect($("#mainFrame").height()).to.equal(0);
                expect(rowScrollCheck).to.be.true;
                expect(scrollBarCheck).to.be.true;

                RowScroller.updateViewRange = rowScrollFunc;
                DagPanel.adjustScrollBarPositionAndSize = scrollBarFunc;

                done();
            }, 2000);
        });

        it('panel should close', function(done) {
            var rowScrollCheck = false;
            var rowScrollFunc = RowScroller.updateViewRange;
            RowScroller.updateViewRange = function() {
                rowScrollCheck = true;
            };

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
                expect(rowScrollCheck).to.be.true;

                RowScroller.updateViewRange = rowScrollFunc;
                done();
            }, 600);
        });

        it('maximizing dag should work', function(done) {
            var rowScrollCheck = false;
            var rowScrollFunc = RowScroller.updateViewRange;
            RowScroller.updateViewRange = function() {
                rowScrollCheck = true;
            };

            // open panel
            $switch.click();
            expect(rowScrollCheck).to.be.false;

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
                    expect(rowScrollCheck).to.be.true;
                    RowScroller.updateViewRange = rowScrollFunc;
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
            $dagWrap.find('.dagTable .dagTableIcon').last().click();
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
                        expect(tId).to.equal(tableId);
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
                        expect(tIds[0]).to.equal(tableId);
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
                        expect(tId).to.equal(tableId);
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
                    var numCols = gTables[tableId].tableCols.length - 1;
                    expect($("#dagSchema").find('li').length).to.equal(numCols);
                    expect($("#dagSchema").find('.rowCount .value').text())
                    .to.equal("8");

                    var $li = $("#dagSchema").find('li').filter(function() {
                        return $(this).text() === "string" + prefix + gPrefixSign + "yelping_since";
                    });

                    expect($li.length).to.equal(1);
                });

                it('lockTable li should work', function() {
                    $menu.find('.lockTable').trigger(fakeEvent.mouseup);
                    expect($dagWrap.find('.dagTable').last().find('.lockIcon').length).to.equal(1);
                    expect($dagWrap.find('.dagTable.locked').length).to.equal(1);
                });

                it('unlockTable li should work', function() {
                    $menu.find('.unlockTable').trigger(fakeEvent.mouseup);
                    expect($dagWrap.find('.dagTable').last().find('.lockIcon').length).to.equal(0);
                    expect($dagWrap.find('.dagTable.locked').length).to.equal(0);
                });
            });

            describe('middle table', function() {
                // test right-most table
                it('menu should open', function() {
                    $dagWrap.find('.dagImage').last().find('.dagTable .dagTableIcon').eq(0).click();
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
                        expect(tId).to.equal(tableId2);
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
                        expect(tId).to.equal(tableId2);
                        expect(tName).to.equal(tableName2);
                        expect(oldTName).to.equal(tableName);
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
        before(function() {
            $menu = $dagPanel.find('.rightClickDropDown');
        });

        it('menu should open', function() {
            expect($menu.is(":visible")).to.be.false;
            $dagWrap.find('.dagImageWrap').last().contextmenu();
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

            after(function() {
                // close menu
               $(document).mousedown().click();
            });
        });
    });

    describe("Dag panel support functions", function() {
        describe("Panel button actions should work", function() {
            it("SaveImageAction should work", function(done) {
                DagPanel.__testOnly__.saveImageAction($dagWrap, tableName)
                .then(done)
                .fail(function() {
                    done("failed");
                });
            });

            it.skip("newTabImageAction should work", function(done) {
                DagPanel.__testOnly__.newTabImageAction($dagWrap)
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
                DagPanel.__testOnly__.addDataFlowAction($dagWrap);
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
                var nodes = $dagWrap.data("allDagInfo").nodes;

                expect($dagWrap.find(".expandWrap").length).to.equal(0);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
                Dag.collapseAll($dagWrap);
                expect($dagWrap.find(".expandWrap").length).to.equal(0);
                for (var nodeIdx in nodes) {
                    expect(nodes[nodeIdx].isHidden).to.be.false;
                }
                Dag.expandAll($dagWrap);
                expect($dagWrap.find(".expandWrap").length).to.equal(0);
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
        it("Action mouseovers should work", function(done) {

            var deferred = PromiseHelper.deferred();

            var createActionWrap = $dagWrap.find(".actionType.dropdownBox").eq(0);
            var reduceActionWrap = $dagWrap.find(".actionType.dropdownBox").eq(1);
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
        var $dagTable;
        var tableId;
        var $dagIcon;

        var $icvDagWrap;
        var $icvDagTable;
        var icvTableId;
        var $icvDagIcon;

        before(function() {
            Dag.expandAll($largeDagWrap);
            $menu = $dagPanel.find('.dagTableDropDown');
            $dagTable = $largeDagWrap.find(".dagTable").last();
            tableId = $dagTable.data("id");
            $dagIcon = $dagTable.find(".dagTableIcon");
        });

        describe("Operations on last table should work", function() {
            it("Focus table should work.", function() {
                var $dagTable2 = $dagWrap.find(".dagTable").last();
                var table2Id = $dagTable2.data("id");
                var $dagIcon2 = $dagTable2.find(".dagTableIcon");

                // TODO: make sure table was scrolled to as well as selected.
                $dagIcon.click();
                expect($menu.find('li.focusTable').is(":visible")).to.be.true;
                $menu.find('.focusTable').trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(tableId);
                $dagIcon2.click();
                expect($menu.find('li.focusTable').is(":visible")).to.be.true;
                $menu.find('.focusTable').trigger(fakeEvent.mouseup);
                expect(xcHelper.getFocusedTable()).to.equal(table2Id);
            });
            it("Revert table should not work", function() {
                $dagIcon.click();
                expect($menu.find('li.revertTable').is(":visible")).to.be.false;
            });
            it("Schema support functions should work", function() {
                // TODO*: Actually test something
                $dagIcon.click();
                $menu.find('.showSchema').trigger(fakeEvent.mouseup);
                $dagSchema = $("#dagSchema");
                var numCols = gTables[tableId].tableCols.length - 1;
                expect($("#dagSchema").find('li').length).to.equal(numCols);
                $("#dagSchema").find("li").eq(8).trigger(fakeEvent.mouseup);

                // TODO: Do more interesting tests once have groupBy and join tables
            });

            it("ICV Table should work", function(done) {
                $dagIcon.click();
                expect($menu.find('li.generateIcv').hasClass('unavailable'))
                .to.be.false;
                // $menu.find('.generateIcv').trigger(fakeEvent.mouseup);
                DagPanel.__testOnly__.generateIcvTable($largeDagWrap.find(".tableName").text(),
                                                       $dagTable.data("tablename"),
                                                       $dagIcon);
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

                    $dagIcon.click();
                    $menu.find(".focusTable").trigger(fakeEvent.mouseup);
                    expect(xcHelper.getFocusedTable()).to.equal(tableId);
                    var numTables = Object.keys(gTables).length;

                    $dagIcon.click();
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
                $dagIcon.click();
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
                dagDepth = $largeDagWrap.data("allDagInfo").depth;
                $prevDagTable = $largeDagWrap.find(".dagTable").eq(dagDepth-2);
                $prevDagIcon = $prevDagTable.find(".dagTableIcon");
                prevTableId = $prevDagTable.data("id");
            });

            it("Add table should work", function(done) {
                $prevDagIcon.click();
                expect($menu.find('li.addTable').is(":visible")).to.be.true;
                $menu.find('.addTable').trigger(fakeEvent.mouseup);
                setTimeout(function() {
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
                }, 2000);
            });

            it("Revert table should work", function(done) {
                var dagDepth = $largeDagWrap.data("allDagInfo").depth;
                var $prevDagTable = $largeDagWrap.find(".dagTable").eq(dagDepth-2);
                var $prevDagIcon = $prevDagTable.find(".dagTableIcon");
                var prevTableId = $prevDagTable.data("id");
                expect(gTables[prevTableId].status).is.not.equal("active");
                expect(gTables[tableId].status).is.equal("active");
                $prevDagIcon.click();
                expect($menu.find('li.revertTable').is(":visible")).to.be.true;
                $menu.find('.revertTable').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(gTables[prevTableId].status).is.equal("active");
                    expect(gTables[tableId].status).is.not.equal("active");

                    // TODO: return table to active
                    var numLargeT = largeTableNames.length;

                    XcalarDeleteTable(largeTableNames[numLargeT-1])
                    .then(function() {
                        expect($largeDagWrap.hasClass("locked")).to.be.true;
                        expect($largeDagWrap.hasClass("dagWrapToRemove"))
                        .to.be.true;
                        expect($dagPanel.find("#dagWrap-" + prevTableId).length).to.equal(1);
                        $largeDagWrap = $dagPanel.find("#dagWrap-" + prevTableId);
                        expect($largeDagWrap.hasClass("selected")).to.be.true;
                        expect($largeDagWrap.hasClass("locked")).to.be.false;
                        expect($largeDagWrap.hasClass("dagWrapToRemove"))
                        .to.be.false;
                        $dagTable = $largeDagWrap.find(".dagTable").last();
                        tableId = $dagTable.data("id");
                        $dagIcon = $dagTable.find(".dagTableIcon");
                        expect(tableId).to.equal(largeTableIds[numLargeT-2]);
                        largeTableNames.splice(numLargeT - 1, 1);
                        largeTableIds.splice(numLargeT - 1, 1);
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
                    var numNodes = Object.keys($dagWrap.data("allDagInfo").nodes).length;
                    $("#alertModal .btn.confirm").click();
                    setTimeout(function() {
                        // Ensure was actually deleted.
                        expect(gTables[prevTableId]).to.be.undefined;
                        // Ensure was deleted from DAG
                        // TODO: copy deletion check from revert table above.
                        expect($dagPanel.find("#dagWrap-" + String(prevTableId)).length).to.equal(0);

                        // Ensure following table is not changed
                        expect(gTables[tableId]).to.not.be.undefined;
                        expect(Object.keys($dagWrap.data("allDagInfo").nodes).length)
                            .to.equal(numNodes);
                        done();
                    }, 400);
                }, 1500);
            });
        });
    });

    after(function(done) {
        if ($('#dfgPanelSwitch').hasClass('active')) {
            $('#dfgPanelSwitch').click();
        }
        setTimeout(function() {
            XcalarDeleteTable(tableName2)
            .then(function() {
                function promiseGenerator(j) {
                    if (gTables[largeTableIds[j]] === undefined) {
                        return PromiseHelper.resolve();
                    }
                    var tStatus = gTables[largeTableIds[j]].status;
                    if (tStatus == TableType.Active) {
                        var lastTable = gTables[largeTableIds[j]];
                        var tType = lastTable.status;
                        return UnitTest.deleteTable(largeTableNames[j], tType);
                    } else if (tStatus == TableType.Orphaned ||
                                          TableType.Archived)
                    {
                        var deferred = PromiseHelper.deferred();
                        XcalarDeleteTable(largeTableNames[j])
                        .then(function() {
                            deferred.resolve();
                        })
                        .fail(function() {
                            deferred.reject();
                        });
                        return deferred.promise();
                    } else {
                        console.log("Unhandled tstatus: " + String(tStatus));
                        return deferred.resolve();
                    }
                }
                var promValues = [];
                for (var i = 0; i < largeTableNames.length; i++) {
                    promValues.push(i);
                }
                return PromiseHelper.chainHelper(promiseGenerator, promValues);
            })
            .then(function() {
                return UnitTest.deleteAll(tableName, testDs);
            })
            .always(function() {
                done();
            });
        }, 500);
    });
});
