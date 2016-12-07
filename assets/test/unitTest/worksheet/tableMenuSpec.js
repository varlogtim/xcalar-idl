describe('TableMenu', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var $tableWrap;
    var $tableMenu;
    var $tableSubMenu;
    var $colMenu = $('#colMenu');
    var $colSubMenu = $('#colSubMenu');
    var rightMouseup;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            $tableWrap = $('#xcTableWrap-' + tableId);
            $tableMenu = $('#tableMenu');
            $tableSubMenu = $('#tableSubMenu');
            $colMenu = $('#colMenu');
            $colSubMenu = $('#colSubMenu');
            rightMouseup = {"type": "mouseup", "which": 3};
            done();
        });
    });

    describe('table menu actions', function() {
    	before(function() {
    		$tableWrap.find('.tableTitle .dropdownBox').click();
    	});

        describe('main menu', function() {
            it('archiveTable', function() {
                var cachedFunc = TblManager.archiveTables;
                var called = false;
                TblManager.archiveTables = function(tIds) {
                    expect(tIds[0]).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.archiveTable').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.archiveTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TblManager.archiveTables = cachedFunc;
            });

            it('hideTable', function() {
                var cachedFunc = TblManager.hideTable;
                var called = false;
                TblManager.hideTable = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.hideTable').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.hideTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TblManager.hideTable = cachedFunc;
            });

            it('unhideTable', function() {
                var cachedFunc = TblManager.unHideTable;
                var called = false;
                TblManager.unHideTable = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.unhideTable').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.unhideTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TblManager.unHideTable = cachedFunc;
            });

            it('deleteTable', function() {
                var cachedFunc = TblManager.deleteTables;
                var called = false;
                TblManager.deleteTables = function(tId, state) {
                    expect(tId).to.equal(tableId);
                    expect(state).to.equal(TableType.Active);
                    called = true;
                };

                $tableMenu.find('.deleteTable').trigger(rightMouseup);
                expect(called).to.be.false;
                expect($("#alertModal").is(":visible")).to.be.false;

                $tableMenu.find('.deleteTable').trigger(fakeEvent.mouseup);
                var msg = xcHelper.replaceMsg(TblTStr.DelMsg, {"table": tableName});
                UnitTest.hasAlertWithText(msg, {confirm: true});
                expect(called).to.be.true;

                TblManager.deleteTables = cachedFunc;
            });

            it('exportTable', function() {
                var cachedFunc = ExportView.show;
                var called = false;
                ExportView.show = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.exportTable').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.exportTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ExportView.show = cachedFunc;
            });

            it('delAllDuplicateCols', function() {
                var cachedFunc = ColManager.delAllDupCols;
                var called = false;
                ColManager.delAllDupCols = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.delAllDuplicateCols').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.delAllDuplicateCols').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.delAllDupCols = cachedFunc;
            });

            it('multiCast', function() {
                var cachedFunc = SmartCastView.show;
                var called = false;
                SmartCastView.show = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.multiCast').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.multiCast').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                SmartCastView.show = cachedFunc;
            });

            it('corrAgg', function() {
                var cachedFunc = AggModal.corrAgg;
                var called = false;
                AggModal.corrAgg = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.corrAgg').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.corrAgg').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                AggModal.corrAgg = cachedFunc;
            });

            it('moveTable', function() {
                var cachedFunc = WSManager.getWSLists;
                var called = false;
                WSManager.getWSLists = function() {
                    called = true;
                };

                $tableMenu.find('.moveTable').trigger('mouseenter');
                expect(called).to.be.true;

                WSManager.getWSLists = cachedFunc;
            });

            it('createDf', function() {
                var cachedFunc = DFCreateView.show;
                var called = false;
                DFCreateView.show = function($dagWrap) {
                    expect($dagWrap.is($("#dagWrap-" + tableId))).to.be.true;
                    called = true;
                };

                $tableMenu.find('.createDf').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.createDf').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                DFCreateView.show = cachedFunc;
            });

            describe('exit op', function() {
                it('aggregate', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitAggregate').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitAggregate').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('filter', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitFilter').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitFilter').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Groupby', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitGroupby').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitGroupby').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Map', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitMap').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitMap').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Export', function() {
                    var cachedFunc = ExportView.close;
                    var called = false;
                    ExportView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitExport').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitExport').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    ExportView.close = cachedFunc;
                });
                it('SmartCast', function() {
                    var cachedFunc = SmartCastView.close;
                    var called = false;
                    SmartCastView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitSmartCast').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitSmartCast').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    SmartCastView.close = cachedFunc;
                });
                it('Join', function() {
                    var cachedFunc = JoinView.close;
                    var called = false;
                    JoinView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitJoin').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitJoin').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    JoinView.close = cachedFunc;
                });
                it('ext', function() {
                    var cachedFunc = BottomMenu.close;
                    var called = false;
                    BottomMenu.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitExt').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitExt').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    BottomMenu.close = cachedFunc;
                });
                it('dataflow', function() {
                    var cachedFunc = DFCreateView.close;
                    var called = false;
                    DFCreateView.close = function($dagWrap) {
                        called = true;
                    };

                    $tableMenu.find('.exitOp.exitDataflow').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableMenu.find('.exitOp.exitDataflow').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    DFCreateView.close = cachedFunc;
                });
            });

            
        });

        describe('submenu', function() {
            it('moveTable input', function() {
                var cachedFunc = WSManager.moveTable;
                var called = false;
                WSManager.moveTable = function(tId, wId) {
                    expect(tId).to.equal(tableId);
                    expect(wId).to.equal(curWsId);
                    called = true;
                };

                var $list = $tableSubMenu.find(".list");
                $list.empty().append(WSManager.getWSLists(true));

                var curWsId = WSManager.getActiveWS();
                var wsName = WSManager.getWSById(curWsId).getName();

                $tableSubMenu.find('.moveTable input').val("");
                $tableSubMenu.find('.moveTable input').trigger(fakeEvent.enter);
                expect(called).to.be.false;

                $tableSubMenu.find('.moveTable input').val("");
                $tableSubMenu.find('.moveTable input').trigger(fakeEvent.enter);
                expect(called).to.be.false;

                $tableSubMenu.find('.moveTable input').val(wsName);
                $tableSubMenu.find('.moveTable input').trigger(fakeEvent.enter);
                expect(called).to.be.true;

                WSManager.moveTable = cachedFunc;
            });
            
            it('moveLeft', function() {
                var cachedFunc = reorderAfterTableDrop;
                var called = false;
                reorderAfterTableDrop = function(tId, srcIdx, desIdx) {
                    expect(tId).to.equal(tableId);
                    expect(desIdx).to.equal(srcIdx - 1);
                    called = true;
                };

                $tableSubMenu.find('.moveLeft').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.moveLeft').removeClass('unavailable');
                $tableSubMenu.find('.moveLeft').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                reorderAfterTableDrop = cachedFunc;
            });

            it('moveRight', function() {
                var cachedFunc = reorderAfterTableDrop;
                var called = false;
                reorderAfterTableDrop = function(tId, srcIdx, desIdx) {
                    expect(tId).to.equal(tableId);
                    expect(desIdx).to.equal(srcIdx + 1);
                    called = true;
                };

                $tableSubMenu.find('.moveRight').trigger(rightMouseup);
                expect(called).to.be.false;

                 $tableSubMenu.find('.moveRight').removeClass('unavailable');
                $tableSubMenu.find('.moveRight').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                reorderAfterTableDrop = cachedFunc;
            });

            it('sortForward', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, dir) {
                    expect(tId).to.equal(tableId);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortForward').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortForward').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortReverse', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, dir) {
                    expect(tId).to.equal(tableId);
                    expect(dir).to.equal('reverse');
                    called = true;
                };

                $tableSubMenu.find('.sortReverse').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortReverse').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('resizeCols', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('sizeToHeader');
                    called = true;
                };

                $tableSubMenu.find('.resizeCols li.sizeToHeader').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.resizeCols li.sizeToHeader').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });
        });

    });

    describe('column menu actions', function() {
        before(function() {
            $table.find('th.col1 .dropdownBox').click();
        });
        describe('main menu', function() {
            it('deleteColumn', function() {
                var cachedFunc = ColManager.delCol;
                var called = false;
                ColManager.delCol = function(colNums, tId) {
                    expect(colNums[0]).to.equal(1);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.deleteColumn').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.deleteColumn').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.delCol = cachedFunc;
            });

            it('deleteDuplicates', function() {
                var cachedFunc = ColManager.delDupCols;
                var called = false;
                ColManager.delDupCols = function(colNum, tId) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.deleteDuplicates').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.deleteDuplicates').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.delDupCols = cachedFunc;
            });

            describe('exit op', function() {
                it('aggregate', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitAggregate').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitAggregate').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('filter', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitFilter').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitFilter').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Groupby', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitGroupby').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitGroupby').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Map', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitMap').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitMap').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    OperationsView.close = cachedFunc;
                });
                it('Export', function() {
                    var cachedFunc = ExportView.close;
                    var called = false;
                    ExportView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitExport').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitExport').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    ExportView.close = cachedFunc;
                });
                it('SmartCast', function() {
                    var cachedFunc = SmartCastView.close;
                    var called = false;
                    SmartCastView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitSmartCast').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitSmartCast').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    SmartCastView.close = cachedFunc;
                });
                it('Join', function() {
                    var cachedFunc = JoinView.close;
                    var called = false;
                    JoinView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitJoin').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitJoin').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    JoinView.close = cachedFunc;
                });
                it('ext', function() {
                    var cachedFunc = BottomMenu.close;
                    var called = false;
                    BottomMenu.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitExt').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitExt').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    BottomMenu.close = cachedFunc;
                });
                it('dataflow', function() {
                    var cachedFunc = DFCreateView.close;
                    var called = false;
                    DFCreateView.close = function($dagWrap) {
                        called = true;
                    };

                    $colMenu.find('.exitOp.exitDataflow').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $colMenu.find('.exitOp.exitDataflow').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    DFCreateView.close = cachedFunc;
                });
            });


        });

        describe('sub menu', function() {
            it('addColumn left', function() {

                var cachedFunc = ColManager.addNewCol;
                var called = false;
                ColManager.addNewCol = function(colNum, tId, dir) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(dir).to.equal(ColDir.Left);
                    called = true;
                };

                $colSubMenu.find('.addColumn.addColLeft').trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.addColumn.addColLeft').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.addNewCol = cachedFunc;
            });

            it('addColumn right', function() {

                var cachedFunc = ColManager.addNewCol;
                var called = false;
                ColManager.addNewCol = function(colNum, tId, dir) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(dir).to.equal(ColDir.Right);
                    called = true;
                };

                $colSubMenu.find('.addColumn:not(.addColLeft)').trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.addColumn:not(.addColLeft)').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.addNewCol = cachedFunc;
            });

            it('click inputAction and renameCol', function() {

                var cachedFunc = ColManager.renameCol;
                var called = false;
                ColManager.renameCol = function(colNum, tId, colName) {
                    expect(colNum).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(colName).to.equal("test");
                    called = true;
                };

                $colSubMenu.find('.inputAction').eq(0).siblings('input').val(prefix + gPrefixSign + 'yelping_since');
                $colSubMenu.find('.inputAction').eq(0).click();
                expect(called).to.be.false;

                $colSubMenu.find('.inputAction').eq(0).siblings('input').val('');
                $colSubMenu.find('.inputAction').eq(0).click();
                expect(called).to.be.false;

                $colSubMenu.find('.inputAction').eq(0).siblings('input').val('test');
                $colSubMenu.find('.inputAction').eq(0).click();
                expect(called).to.be.true;

                ColManager.renameCol = cachedFunc;
            });

            it('changeFormat', function() {

                var cachedFunc = ColManager.format;
                var called = false;
                ColManager.format = function(colNums, tId, formats) {
                    expect(colNums[0]).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(formats[0]).to.equal("percent");
                    called = true;
                };

                $colSubMenu.find('.changeFormat').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.changeFormat').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.format = cachedFunc;
            });

            it('digitsToRound', function() {

                var cachedFunc = ColManager.roundToFixed;
                var called = false;
                ColManager.roundToFixed = function(colNums, tId, decimals) {
                    expect(colNums[0]).to.equal(1);
                    expect(tId).to.equal(tableId);
                    expect(decimals[0]).to.equal(3);
                    called = true;
                };

                $colSubMenu.find('.digitsToRound').eq(0).val("3");
                $colSubMenu.find('.digitsToRound').eq(0).trigger(fakeEvent.enter);
                expect(called).to.be.true;

                ColManager.roundToFixed = cachedFunc;
            });
        });
    });

    after(function(done) {
		UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    
    });
});