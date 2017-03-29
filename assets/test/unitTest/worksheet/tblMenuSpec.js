describe('TableMenu Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var $tableWrap;
    var $tableMenu;
    var $tableSubMenu;
    var $colMenu;
    var $colSubMenu;
    var $cellMenu;
    var rightMouseup;
    var oldTableId;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;

        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            oldTableId = tableId;

            xcFunction.sort(10, tableId, SortDirection.Forward)
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                $table = $('#xcTable-' + tableId);
                $tableWrap = $('#xcTableWrap-' + tableId);
                done();
            });

            $tableMenu = $('#tableMenu');
            $tableSubMenu = $('#tableSubMenu');
            $colMenu = $('#colMenu');
            $colSubMenu = $('#colSubMenu');
            $cellMenu = $('#cellMenu');
            rightMouseup = {"type": "mouseup", "which": 3};
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

                var isUnavailable = false;
                if ($tableMenu.find(".exportTable").hasClass("unavailable")) {
                    isUnavailable = true;
                    // temporarily remove unavailable class for testing
                    $tableMenu.find(".exportTable").removeClass("unavailable");
                }

                $tableMenu.find('.exportTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                if (isUnavailable) {
                    $tableMenu.find(".exportTable").addClass("unavailable");
                }
                ExportView.show = cachedFunc;
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
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    ExportView.close = function() {
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
                    SmartCastView.close = function() {
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
                    JoinView.close = function() {
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
                    BottomMenu.close = function() {
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
                    DFCreateView.close = function() {
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
                var $list = $tableSubMenu.find(".list");
                $list.empty().append(WSManager.getWSLists(true));

                var curWsId = WSManager.getActiveWS();
                var wsName = WSManager.getWSById(curWsId).getName();

                var cachedFunc = WSManager.moveTable;
                var called = false;
                WSManager.moveTable = function(tId, wId) {
                    expect(tId).to.equal(tableId);
                    expect(wId).to.equal(curWsId);
                    called = true;
                };

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
                var cachedFunc = TblFunc.reorderAfterTableDrop;
                var called = false;
                TblFunc.reorderAfterTableDrop = function(tId, srcIdx, desIdx) {
                    expect(tId).to.equal(tableId);
                    expect(desIdx).to.equal(srcIdx - 1);
                    called = true;
                };

                $tableSubMenu.find('.moveLeft').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.moveLeft').removeClass('unavailable');
                $tableSubMenu.find('.moveLeft').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TblFunc.reorderAfterTableDrop = cachedFunc;
            });

            it('moveRight', function() {
                var cachedFunc = TblFunc.reorderAfterTableDrop;
                var called = false;
                TblFunc.reorderAfterTableDrop = function(tId, srcIdx, desIdx) {
                    expect(tId).to.equal(tableId);
                    expect(desIdx).to.equal(srcIdx + 1);
                    called = true;
                };

                $tableSubMenu.find('.moveRight').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.moveRight').removeClass('unavailable');
                $tableSubMenu.find('.moveRight').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TblFunc.reorderAfterTableDrop = cachedFunc;
            });

            it('sortForward by name', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.name);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortByName .sortForward')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByName .sortForward')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortReverse by name', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.name);
                    expect(dir).to.equal('reverse');
                    called = true;
                };

                $tableSubMenu.find('.sortByName .sortReverse')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByName .sortReverse')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortForward by type', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.type);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortByType .sortForward')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByType .sortForward')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortForward by prefix', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.prefix);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortByPrefix .sortForward')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByPrefix .sortForward')
                .trigger(fakeEvent.mouseup);
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
            $table.find('th.col12 .dropdownBox').click();
        });
        describe('main menu', function() {
            it('hideColumn', function() {
                var cachedFunc = ColManager.delCol;
                var called = false;
                ColManager.delCol = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.hideColumn').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.hideColumn').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.delCol = cachedFunc;
            });

            it('minimize', function() {
                var cachedFunc = ColManager.minimizeCols;
                var called = false;
                ColManager.minimizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.minimize').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.minimize').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.minimizeCols = cachedFunc;
            });

            it('maximize', function() {
                var cachedFunc = ColManager.maximizeCols;
                var called = false;
                ColManager.maximizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.maximize').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.maximize').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.maximizeCols = cachedFunc;
            });

            it('joinList', function() {
                var cachedFunc = JoinView.show;
                var called = false;
                JoinView.show = function(tId, colNum) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.joinList').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.joinList').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                JoinView.show = cachedFunc;
            });

            it('aggregate', function() {
                var cachedFunc = OperationsView.show;
                var called = false;
                OperationsView.show = function(tId, colNums, func) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(func).to.equal("aggregate");
                    called = true;
                };

                $colMenu.find('.functions.aggregate').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.aggregate').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                OperationsView.show = cachedFunc;
            });

            it('filter', function() {
                var cachedFunc = OperationsView.show;
                var called = false;
                OperationsView.show = function(tId, colNums, func) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(func).to.equal("filter");
                    called = true;
                };

                $colMenu.find('.functions.filter').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.filter').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                OperationsView.show = cachedFunc;
            });

            it('groupby', function() {
                var cachedFunc = OperationsView.show;
                var called = false;
                OperationsView.show = function(tId, colNums, func) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(func).to.equal("group by");
                    called = true;
                };

                $colMenu.find('.functions.groupby').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.groupby').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                OperationsView.show = cachedFunc;
            });

            it('map', function() {
                var cachedFunc = OperationsView.show;
                var called = false;
                OperationsView.show = function(tId, colNums, func) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(func).to.equal("map");
                    called = true;
                };

                $colMenu.find('.functions.map').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.map').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                OperationsView.show = cachedFunc;
            });

            it('profile', function() {
                var cachedFunc = Profile.show;
                var called = false;
                Profile.show = function(tId, colNum) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.profile').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.profile').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                Profile.show = cachedFunc;
            });

            it('extensions', function() {
                var cachedFunc = ExtensionManager.openView;
                var called = false;
                ExtensionManager.openView = function(colNum, tId) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.extensions').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.extensions').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ExtensionManager.openView = cachedFunc;
            });

            describe('exit op', function() {
                it('aggregate', function() {
                    var cachedFunc = OperationsView.close;
                    var called = false;
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    OperationsView.close = function() {
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
                    ExportView.close = function() {
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
                    SmartCastView.close = function() {
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
                    JoinView.close = function() {
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
                    BottomMenu.close = function() {
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
                    DFCreateView.close = function() {
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
                    expect(colNum).to.equal(12);
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
                    expect(colNum).to.equal(12);
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
                    expect(colNum).to.equal(12);
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
                    expect(colNums[0]).to.equal(12);
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
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(decimals[0]).to.equal(3);
                    called = true;
                };


                $colSubMenu.find('.digitsToRound').eq(0).val("3");
                $colSubMenu.find('.digitsToRound').eq(0).trigger(fakeEvent.enter);
                expect(called).to.be.true;

                ColManager.roundToFixed = cachedFunc;
            });

            it('changeRound.default', function() {
                var cachedFunc = ColManager.roundToFixed;
                var called = false;
                ColManager.roundToFixed = function(colNums, tId, decimals) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(decimals[0]).to.equal(-1);
                    called = true;
                };

                $colSubMenu.find('.changeRound.default').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.changeRound.default').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.roundToFixed = cachedFunc;
            });

            it('splitCol input', function() {
                var cachedFunc = ColManager.splitCol;
                var called = false;
                ColManager.splitCol = function(colNum, tId, delim, numColToGet) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(delim).to.equal("\\");
                    expect(numColToGet).to.equal(3);
                    called = true;
                };

                $colSubMenu.find('.splitCol .delimiter').val("\\");
                $colSubMenu.find('.splitCol .num').val(3);
                $colSubMenu.find('.splitCol input').eq(0).trigger(fakeEvent.enter);
                expect(called).to.be.true;

                ColManager.splitCol = cachedFunc;
            });

            it('textAlign', function() {
                var cachedFunc = ColManager.textAlign;
                var called = false;
                ColManager.textAlign = function(colNums, tId, elClass) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(elClass).to.equal('textAlign leftAlign');
                    called = true;
                };

                $colSubMenu.find('li.textAlign').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.textAlign').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.textAlign = cachedFunc;
            });

            it('resize', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo, colNum) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('sizeToHeader');
                    expect(colNum).to.equal(12);
                    called = true;
                };

                $colSubMenu.find('.resize.sizeToHeader').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.resize.sizeToHeader').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('typeList', function() {
                var cachedFunc = ColManager.changeType;
                var called = false;
                ColManager.changeType = function(colTypeInfos, tId) {
                    expect(colTypeInfos.length).to.equal(1);
                    expect(colTypeInfos[0].colNum).to.equal(12);
                    expect(colTypeInfos[0].type).to.equal("boolean");
                    expect(tId).to.equal(tableId);
                    called = true;
                    return PromiseHelper.resolve();
                };

                $colSubMenu.find('.typeList').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.typeList').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.changeType = cachedFunc;
            });

            it('sort', function() {
                var cachedFunc = xcFunction.sort;
                var called = false;
                xcFunction.sort = function(colNum, tId, order) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(order).to.equal(SortDirection.Forward);
                    called = true;
                };

                $colSubMenu.find('li.sort').trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.sort').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                xcFunction.sort = cachedFunc;
            });

            it('revSort', function() {
                var cachedFunc = xcFunction.sort;
                var called = false;
                xcFunction.sort = function(colNum, tId, order) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(order).to.equal(SortDirection.Backward);
                    called = true;
                };

                $colSubMenu.find('li.revSort').trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.revSort').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                xcFunction.sort = cachedFunc;
            });
        });

        describe('multiple columns', function() {
            before(function() {
                $table.find('th.col11 .dragArea').trigger(fakeEvent.mousedown);
                $table.find('th.col12 .dragArea').trigger({"type": "mousedown", "shiftKey": true});
                $table.find('th.col12 .dropdownBox').click();
            });

            it('multiple columns should be selected', function() {
                expect($table.find('th.selectedCell').length).to.equal(2);
                expect($colMenu.data().columns.length).to.equal(2);
            });

            it('deleteColumns', function() {
                var cachedFunc = ColManager.delCol;
                var called = false;
                ColManager.delCol = function(colNums, tId) {
                    expect(colNums[0]).to.equal(11);
                    expect(colNums[1]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.hideColumns').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.hideColumns').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.delCol = cachedFunc;
            });

            it('minimizeColumns', function() {
                var cachedFunc = ColManager.minimizeCols;
                var called = false;
                ColManager.minimizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(11);
                    expect(colNums[1]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.minimizeColumns').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.minimizeColumns').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.minimizeCols = cachedFunc;
            });

            it('maximizeColumns', function() {
                var cachedFunc = ColManager.maximizeCols;
                var called = false;
                ColManager.maximizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(11);
                    expect(colNums[1]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.maximizeColumns').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.maximizeColumns').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.maximizeCols = cachedFunc;
            });

            it('changeRound.default', function() {
                var cachedFunc = ColManager.roundToFixed;
                var called = false;
                ColManager.roundToFixed = function(colNums, tId, decimals) {
                    expect(colNums[0]).to.equal(11);
                    expect(colNums[1]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(decimals.length).to.equal(0);
                    called = true;
                };

                $colSubMenu.find('.multiRoundToFixed .changeRound.default').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.multiRoundToFixed .changeRound.default').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.roundToFixed = cachedFunc;
            });
        });
    });

    describe('cell menu actions', function() {
        it('tdFilter', function() {
            $table.find('td.col12').eq(0).trigger(fakeEvent.mousedown);
            var cellText = $table.find('td.col12').eq(0).text();
            var cachedFunc = xcFunction.filter;
            var called = false;
            xcFunction.filter = function(colNum, tId, options) {
                expect(colNum).to.equal(12);
                expect(tId).to.equal(tableId);
                expect(options.filterString).to.equal('eq(' + prefix + gPrefixSign + 'yelping_since, "' + cellText + '")' );
                expect(options.operator).to.equal("Filter");
                called = true;
            };

            $cellMenu.find('.tdFilter').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdFilter').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            xcFunction.filter = cachedFunc;
        });

        it('tdFilter on mixed column', function() {
            $table.find('td.col6').eq(0).trigger(fakeEvent.mousedown);
            var cellText = $table.find('td.col6').eq(0).find(".displayedData").text();
            var cachedFunc = xcFunction.filter;
            var called = false;
            xcFunction.filter = function(colNum, tId, options) {
                expect(colNum).to.equal(6);
                expect(tId).to.equal(tableId);
                expect(options.filterString).to.equal('eq(' + prefix + gPrefixSign + 'mixVal, ' + cellText + ')' );
                expect(options.operator).to.equal("Filter");
                called = true;
            };

            $cellMenu.find('.tdFilter').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdFilter').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            xcFunction.filter = cachedFunc;
        });

        it('tdExclude', function() {
            $table.find('td.col12').eq(0).trigger(fakeEvent.mousedown);
            var cellText = $table.find('td.col12').eq(0).text();
            var cachedFunc = xcFunction.filter;
            var called = false;
            xcFunction.filter = function(colNum, tId, options) {
                expect(colNum).to.equal(12);
                expect(tId).to.equal(tableId);
                expect(options.filterString).to.equal('neq(' + prefix + gPrefixSign + 'yelping_since, "' + cellText + '")');
                expect(options.operator).to.equal("Exclude");
                called = true;
            };

            $cellMenu.find('.tdExclude').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdExclude').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            xcFunction.filter = cachedFunc;
        });

        it('tdJsonModal', function() {
            $table.find('td.col12').eq(0).trigger(fakeEvent.mousedown);
            var cachedFunc = JSONModal.show;
            var called = false;
            JSONModal.show = function($td, options) {
                expect($td.is($table.find('td.col12').eq(0))).to.be.true;
                expect(options.type).to.equal('string');
                called = true;
            };

            $cellMenu.find('.tdJsonModal').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdJsonModal').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            $(".xcTable").find(".highlightBox").remove();

            JSONModal.show = cachedFunc;
        });

        it('tdUnnest', function(done) {
            $table.find('td.col12').eq(0).trigger(fakeEvent.mousedown);
            var cachedFunc = ColManager.unnest;
            var called = false;
            ColManager.unnest = function(tId, colNum, rowNum) {
                expect(tId).to.equal(tableId);
                expect(colNum).to.equal(12);
                expect(rowNum).to.equal(0);

                called = true;
            };

            $cellMenu.find('.tdUnnest').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdUnnest').trigger(fakeEvent.mouseup);
            setTimeout(function() {
                expect(called).to.be.true;
                ColManager.unnest = cachedFunc;
                done();
            }, 10);
        });
    });

    describe('prefix menu actions', function() {
        before(function() {
            $table.find('th.col12 .dotWrap').click();
        });

        it('prefix menu should work', function() {
            var $prefixColorMenu = $("#prefixColorMenu");
            var cachedFunc = TPrefix.markColor;
            var called = false;
            TPrefix.markColor = function(pfix, color) {
                expect(pfix).to.equal(prefix);
                expect(color).to.equal("indigo");
                called = true;
            };

            $prefixColorMenu.find('.wrap').eq(0).trigger(rightMouseup);
            expect(called).to.be.false;

            $prefixColorMenu.find('.wrap').eq(0).trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            TPrefix.markColor = cachedFunc;
        });
    });

    after(function(done) {
        UnitTest.deleteAllTables()
        .then(function() {
            UnitTest.deleteDS(testDs)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        });
    });
});