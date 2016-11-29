describe('Dag', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var tableName2;
    var tableId2;
    var $dagPanel;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            var filterStr = 'eq(' + prefix + gPrefixSign +
                            'yelping_since, "2008-03")';
            xcFunction.filter(1, tableId, {filterString: filterStr})
            .then(function(ret) {
                tableId2 = tableId;
                tableName2 = tableName;
                tableName = ret;
                tableId = xcHelper.getTableId(tableName);
                $table = $('#xcTable-' + tableId);
                $dagPanel = $('#dagPanel');
                done();
            });   
        });
    });

    describe('dag panel opening and closing', function() {
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
            expect($dagPanel.offset().top).to.not.equal($("#mainFrame").offset().top);


            // open panel
            $switch.click();

            expect(rowScrollCheck).to.be.false;
            expect(scrollBarCheck).to.be.false;

            setTimeout(function() {
                expect($dagPanel.hasClass('hidden')).to.be.false;
                expect($dagPanel.hasClass('xc-hidden')).to.be.false;
                expect($switch.hasClass('active')).to.be.true;
                expect($dagPanel.offset().top).to.equal($("#mainFrame").offset().top);
                expect($("#mainFrame").height()).to.equal(0);
                expect(rowScrollCheck).to.be.true;
                expect(scrollBarCheck).to.be.true;

                RowScroller.updateViewRange = rowScrollFunc;
                DagPanel.adjustScrollBarPositionAndSize = scrollBarFunc;

                done();
            }, 1000);
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
                expect($dagPanel.offset().top).to.not.equal($("#mainFrame").offset().top);
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
                expect($dagPanel.offset().top).to.equal($("#mainFrame").offset().top);

                $dagPanel.css('top', '20%');
                $dagPanel.find('.dagArea').css('height', 'calc(80% - 5px)');
                $('#maximizeDag').removeClass('unavailable');
                var panelHeight = $dagPanel.height();

                expect(parseInt($dagPanel.css('top'))).to.equal(Math.floor(panelHeight * .2));

                $('#maximizeDag').click();

                setTimeout(function() {
                    expect(parseInt($dagPanel.css('top'))).to.equal(0);
                    expect(rowScrollCheck).to.be.true;
                    RowScroller.updateViewRange = rowScrollFunc;
                    done();
                }, 600);

            }, 500);
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
            $dagPanel.find('.dagTable .dagTableIcon').last().click();
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find('li:visible').length).to.equal(7);
            expect($menu.find('li.unavailable:visible').length).to.equal(2);
            expect($menu.find('li.deleteTableDescendants').hasClass('unavailable')).to.be.true;
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
                    expect($("#dagSchema").find('.rowCount .value').text()).to.equal("8");

                    var $li = $("#dagSchema").find('li').filter(function() {
                        return $(this).text() === "string" + prefix + gPrefixSign + "yelping_since"; 
                    });

                    expect($li.length).to.equal(1);
                });

                it('lockTable li should work', function() {
                    $menu.find('.lockTable').trigger(fakeEvent.mouseup);
                    expect($dagPanel.find('.dagTable').last().find('.lockIcon').length).to.equal(1);
                    expect($dagPanel.find('.dagTable.locked').length).to.equal(1);
                });

                it('unlockTable li should work', function() {
                    $menu.find('.unlockTable').trigger(fakeEvent.mouseup);
                    expect($dagPanel.find('.dagTable').last().find('.lockIcon').length).to.equal(0);
                    expect($dagPanel.find('.dagTable.locked').length).to.equal(0);
                });
            });
            
            describe('middle table', function() {
                // test right-most table
                it('menu should open', function() {
                    $dagPanel.find('.dagImage').last().find('.dagTable .dagTableIcon').eq(0).click();
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

    describe('dag right click menu', function() {
        var $menu;
        before(function() {
            $menu = $dagPanel.find('.rightClickDropDown');
        });

        it('menu should open', function() {
            expect($menu.is(":visible")).to.be.false;
            $dagPanel.find('.dagImageWrap').last().contextmenu();
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

    after(function(done) {
        if ($('#dfgPanelSwitch').hasClass('active')) {
            $('#dfgPanelSwitch').click();
        }
        setTimeout(function() {
            XcalarDeleteTable(tableName2)
            .always(function() {
                UnitTest.deleteAll(tableName, testDs)
                .always(function() {
                    done();
                });
            });
        }, 500);
       
    });
});