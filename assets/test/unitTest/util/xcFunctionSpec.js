describe("xcFunction Test", function () {
    const tableId = 'a';
    const tableName = 't#' + tableId;
    let oldRefreshTable;
    let oldSetMeta;
    let oldTranStart;
    let oldTranDone;
    let oldTranFail;
    let oldTranCancel;
    let oldGetHashId;

    before(() => {
        const progCol1 = ColManager.newPullCol('col1', 'col1', ColumnType.integer);
        const progCol2 = ColManager.newPullCol('prefix::col2', 'prefix::col2', ColumnType.integer);
        const table = new TableMeta({
            tableId: tableId,
            tableName: tableName,
            tableCols: [progCol1, progCol2, ColManager.newDATACol()]
        });
        gTables[tableId] = table;

        oldRefreshTable = TblManager.refreshTable;
        oldSetMeta = TblManager.setOrphanTableMeta;
        oldTranStart = Transaction.start;
        oldTranDone = Transaction.done;
        oldTranFail = Transaction.fail;
        oldTranCancel = Transaction.cancel;
        oldGetHashId = Authentication.getHashId;

        TblManager.refreshTable = () => PromiseHelper.resolve();
        TblManager.setOrphanTableMeta = () => { };
        Transaction.start = () => 1.5; // simulate id will skip the getUnsortedTableName
        Transaction.done = () => { };
        Transaction.fail = () => { };
        Transaction.cancel = () => { };
        Authentication.getHashId = () => '#1';
    });

    it('xcFunction.filter should work', (done) => {
        const oldFunc = XIApi.filter;
        XIApi.filter = () => PromiseHelper.resolve('filterTable');

        const fltOptions = { formOpenTime: 1 };
        xcFunction.filter(1, tableId, fltOptions)
            .then((finalTableName) => {
                expect(finalTableName).to.equal('filterTable');
                expect(fltOptions.hasOwnProperty('formOpenTime')).to.be.false;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.filter = oldFunc;
            });
    });

    it('xcFunction.filter should handle fail case', (done) => {
        const oldFunc = XIApi.filter;
        XIApi.filter = () => PromiseHelper.reject('test');

        xcFunction.filter(1, tableId)
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.filter = oldFunc;
            });
    });

    describe('xcFunction.aggregate Test', () => {
        let oldAlert;
        let oldAddAgg;
        let oldAgg;

        before(() => {
            oldAlert = Alert.show;
            oldAddAgg = Aggregates.addAgg;
            oldAgg = XIApi.aggregate;

            Alert.show = () => { };
            Aggregates.addAgg = () => { };
        });

        it('xcFunction.aggregate should work on cache case', (done) => {
            const oldGetAgg = Aggregates.getAgg;
            Aggregates.getAgg = () => {
                return { value: 1, dagName: 'test' };
            };

            xcFunction.aggregate(null, tableId, 'min', 'col')
                .then((value, dagName) => {
                    expect(value).to.equal(1);
                    expect(dagName).to.equal('test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    Aggregates.getAgg = oldGetAgg;
                });
        });

        it('xcFunction.aggregate should work with normal case', (done) => {
            const oldRefreshList = TableList.refreshConstantList;
            let test = false;
            TableList.refreshConstantList = () => { test = true };

            XIApi.aggregate = () => PromiseHelper.resolve(1, 'test', false);

            xcFunction.aggregate(1, tableId, 'min', null, '^testAgg')
                .then((value, dagName) => {
                    expect(test).to.be.true;
                    expect(value).to.equal(1);
                    expect(dagName).to.equal('test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    TableList.refreshConstantList = oldRefreshList;
                });
        });

        it('xcFunction.aggregate should work and delete agg', (done) => {
            const oldRefreshList = TableList.refreshConstantList;
            let test = false;
            TableList.refreshConstantList = () => { test = true };

            XIApi.aggregate = () => PromiseHelper.resolve(1, 'test', true);

            xcFunction.aggregate(1, tableId, 'min', null, '^testAgg')
                .then((value, dagName) => {
                    expect(test).to.be.false;
                    expect(value).to.equal(1);
                    expect(dagName).to.equal('test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    TableList.refreshConstantList = oldRefreshList;
                });
        });

        it('xcFunction.aggregate should handle fail case', (done) => {
            XIApi.aggregate = () => PromiseHelper.reject('test');

            xcFunction.aggregate(1, tableId, 'min', null, '^testAgg')
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                });
        });

        after(() => {
            Alert.show = oldAlert;
            Aggregates.addAgg = oldAddAgg;
            XIApi.aggregate = oldAgg;
        });
    });

    describe('xcFunction.sort Test', () => {
        let oldSort;
        const ordering = XcalarOrderingT.XcalarOrderingAscending;

        before(() => {
            oldSort = XIApi.sort;
        });

        it('xcFunction.sort should work', (done) => {
            const oldMap = XIApi.map;
            let test = false;
            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            XIApi.sort = () => PromiseHelper.resolve('testSort');

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then((finalTableName) => {
                    expect(test).to.be.false;
                    expect(finalTableName).to.equal('testSort');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('xcFunction.sort should cast prefix column', (done) => {
            const oldMap = XIApi.map;
            let test = false;

            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            XIApi.sort = () => PromiseHelper.resolve('testSort');

            const colInfos = [{
                colNum: 1,
                ordering: ordering
            }, {
                name: 'prefix::col',
                ordering: ordering,
                typeToCast: ColumnType.string
            }];
            xcFunction.sort(tableId, colInfos)
                .then((finalTableName) => {
                    expect(test).to.be.true;
                    expect(finalTableName).to.equal('testSort');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('xcFunction.sort should handle fail case', (done) => {
            XIApi.sort = () => PromiseHelper.reject('test');

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                });
        });

        it('xcFunction.sort should handle sorted case', (done) => {
            XIApi.sort = () => PromiseHelper.reject('test', true);
            const oldFunc = Alert.error;
            let test = false;
            Alert.error = () => { test = true };

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(test).to.be.true;
                    expect(error).to.equal('test');
                    done();
                })
                .always(() => {
                    Alert.error = oldFunc;
                });
        });

        it('xcFunction.sort should handle cancel case', (done) => {
            XIApi.sort = () => PromiseHelper.reject({ 'error': SQLType.Cancel });

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then(() => {
                    done();
                })
                .fail(() => {
                    done('fail');
                });
        });

        after(() => {
            XIApi.sort = oldSort;
        });
    });

    it('xcFunction.join should work', (done) => {
        const oldFunc = XIApi.join;
        XIApi.join = () => PromiseHelper.resolve('joinTable');

        const lJoinInfo = {
            tableId: tableId,
            colNums: [1]
        };
        const rJoinInfo = {
            tableId: tableId,
            colNums: [1]
        };
        xcFunction.join('Inner Join', lJoinInfo, rJoinInfo)
            .then((finalTableName) => {
                expect(finalTableName).to.equal('joinTable');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.join = oldFunc;
            });
    });

    it('xcFunction.join should handle fail case', (done) => {
        const oldFunc = XIApi.join;
        XIApi.join = () => PromiseHelper.reject('test');

        const lJoinInfo = {
            tableId: tableId,
            colNums: [1]
        };
        const rJoinInfo = {
            tableId: tableId,
            colNums: [1]
        };
        xcFunction.join('Inner Join', lJoinInfo, rJoinInfo)
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.join = oldFunc;
            });
    });

    it('xcFunction.union should work', (done) => {
        const oldFunc = XIApi.union;
        XIApi.union = () => PromiseHelper.resolve('unionTable');

        const tableInfos = [{
            tableName: tableName,
            colNums: [{ name: 'col' }]
        }, {
            tableName: tableName,
            colNums: [{ name: 'col2' }]
        }];

        xcFunction.union(tableInfos, false, 'test')
            .then((finalTableName) => {
                expect(finalTableName).to.equal('unionTable');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.union = oldFunc;
            });
    });

    it('xcFunction.union should handle fail case', (done) => {
        const oldFunc = XIApi.union;
        XIApi.union = () => PromiseHelper.reject('test');

        const tableInfos = [{
            tableName: tableName,
            colNums: [{ name: 'col' }]
        }, {
            tableName: tableName,
            colNums: [{ name: 'col2' }]
        }];
        xcFunction.union(tableInfos, false, 'test')
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.union = oldFunc;
            });
    });

    describe('xcFunction.groupBy Test', () => {
        let oldGroupBy;

        before(() => {
            oldGroupBy = XIApi.groupBy;
            XIApi.groupBy = () => PromiseHelper.resolve('groupByTable',
                ['aggCol', 'groupByCol'], ['col1']);
        });

        it('should reject in invalid case', (done) => {
            xcFunction.groupBy()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Invalid Parameters!');
                    done();
                });
        });

        it('should work in single groupBy case', (done) => {
            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol',
                cast: ColumnType.integer
            }];
            const groupByCols = [{ colName: 'groupByCol' }];
            const options = { dstTableName: 'test' };

            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols, options)
                .then((finalTableName) => {
                    expect(finalTableName).to.equal('groupByTable');
                    done();
                })
                .fail(() => {
                    done('fail');
                });
        });

        it('should handle multiple agg case', (done) => {
            const oldMap = XIApi.map;
            let test = false;
            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol'
            }];
            const groupByCols = [{ colName: 'co1' }, { colName: 'col2' }];
            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols)
                .then((finalTableName) => {
                    expect(test).to.be.false;
                    expect(finalTableName).to.equal('groupByTable');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('should handle multiple agg case with cast', (done) => {
            const oldMap = XIApi.map;
            let test = false;
            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol',
                cast: ColumnType.integer
            }, {
                operator: 'count',
                aggColName: 'aggCol2',
                newColName: 'newCol2',
                cast: ColumnType.integer
            }];
            const groupByCols = [{
                colName: 'co1', cast: ColumnType.integer
            }, {
                colName: 'col2'
            }];
            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols)
                .then((finalTableName) => {
                    expect(test).to.be.true;
                    expect(finalTableName).to.equal('groupByTable');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('should handle agg cast fail case', (done) => {
            const oldMap = XIApi.map;
            XIApi.map = () => PromiseHelper.reject('error');

            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol',
                cast: ColumnType.integer
            }, {
                operator: 'count',
                aggColName: 'aggCol2',
                newColName: 'newCol2',
                cast: ColumnType.integer
            }];
            const groupByCols = [{ colName: 'co1' }];
            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('error');
                    done();
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('should work in is join case', (done) => {
            const oldJoin = XIApi.join;
            XIApi.join = () => PromiseHelper.resolve('joinTable', ['a', 'b']);
            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol',
                cast: ColumnType.integer
            }];
            const groupByCols = [{ colName: 'groupByCol' }];
            const options = { isJoin: true };

            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols, options)
                .then((finalTableName) => {
                    expect(finalTableName).to.equal('joinTable');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.join = oldJoin;
                });
        });

        it('should handle fail case', (done) => {
            const oldFunc = XIApi.groupBy;
            XIApi.groupBy = () => PromiseHelper.reject('test');

            const aggRegateArgs = [{
                operator: 'min',
                aggColName: 'aggCol',
                newColName: 'newCol',
                cast: true
            }];
            const groupByCols = [{ colName: 'co1' }, { colName: 'col2' }];
            const options = { isJoin: true };
            xcFunction.groupBy(tableId, aggRegateArgs, groupByCols, options)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                });
        });

        after(() => {
            XIApi.groupBy = oldGroupBy;
        });
    });

    it('xcFunction.map should work', (done) => {
        const oldFunc = XIApi.map;
        const oldCopy = Profile.copy;
        let test = false;
        XIApi.map = () => PromiseHelper.resolve('mapTable');
        Profile.copy = () => { test = true; };

        xcFunction.map(1, tableId, 'col', 'string(col)')
            .then((finalTableName) => {
                expect(test).to.be.true;
                expect(finalTableName).to.equal('mapTable');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.map = oldFunc;
                Profile.copy = oldCopy;
            });
    });

    it('xcFunction.map should handle fail case', (done) => {
        const oldFunc = XIApi.map;
        XIApi.map = () => PromiseHelper.reject('test');

        xcFunction.map(1, tableId, 'col', 'string(col)')
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.map = oldFunc;
            });
    });

    it('xcFunction.exportTable should work', (done) => {
        const oldFunc = XIApi.exportTable;
        const oldAlert = Alert.show;
        let test = false;
        XIApi.exportTable = () => PromiseHelper.resolve();
        Alert.show = () => { test = true; };

        xcFunction.exportTable(tableName, 'export', 'target', 1, [], [], false, false)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.exportTable = oldFunc;
                Alert.show = oldAlert;
            });
    });

    it('xcFunction.exportTable should handle fail case', (done) => {
        const oldFunc = XIApi.exportTable;
        XIApi.exportTable = () => PromiseHelper.reject('test');

        xcFunction.exportTable(tableName)
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.exportTable = oldFunc;
            });
    });

    it('xcFunction.rename reject invalid case', (done) => {
        xcFunction.rename()
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('Invalid renaming parameters');
                done();
            });
    });

    it('xcFunction.rename should work', (done) => {
        const oldFunc = XIApi.renameTable;
        const oldDagRename = Dag.renameAllOccurrences;
        const oldUpdate = TblManager.updateHeaderAndListInfo;

        XIApi.renameTable = () => PromiseHelper.resolve();
        Dag.renameAllOccurrences = () => { };
        TblManager.updateHeaderAndListInfo = () => { };

        const table = gTables[tableId];
        const oldName = table.getName();
        xcFunction.rename(tableId, 'newName')
            .then((newName) => {
                expect(newName).to.equal('newName#' + tableId)
                expect(table.getName()).to.equal(newName);
                table.tableName = oldName; // reset
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.renameTable = oldFunc;
                Dag.renameAllOccurrences = oldDagRename;
                TblManager.updateHeaderAndListInfo = oldUpdate;
            });
    });

    it('xcFunction.rename should handle fail case', (done) => {
        const oldFunc = XIApi.renameTable;
        XIApi.renameTable = () => PromiseHelper.reject('test');

        xcFunction.rename(tableId, 'newName')
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.renameTable = oldFunc;
            });
    });

    it('xcFunction.project should work', (done) => {
        const oldFunc = XIApi.project;

        XIApi.project = () => PromiseHelper.resolve('projectTable');
        const table = gTables[tableId];
        const progCol = table.tableCols[0];

        xcFunction.project([progCol.backName], tableId)
            .then((finalTableName) => {
                expect(finalTableName).to.equal('projectTable');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.project = oldFunc;
            });
    });

    it('xcFunction.project should handle fail case', (done) => {
        const oldFunc = XIApi.project;
        XIApi.project = () => PromiseHelper.reject('test');

        xcFunction.project([], tableId)
            .then(() => {
                done('fail');
            })
            .fail((error) => {
                expect(error).to.equal('test');
                done();
            })
            .always(() => {
                XIApi.project = oldFunc;
            });
    });

    it("xcFunction.checkOrder should work", (done) => {
        const oldFunc = XIApi.checkOrder;

        XIApi.checkOrder = () => PromiseHelper.resolve('checkOrder');
        xcFunction.checkOrder("abcd")
            .then((res) => {
                expect(res).to.equal('checkOrder');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XIApi.checkOrder = oldFunc;
            });
    });

    it('xcFunction.checkOrder should use table caches', (done) => {
        const table = gTables[tableId];
        const oldKeys = table.keys;
        const oldOrdering = table.ordering;
        table.keys = ["a"];
        table.ordering = 3; // ascending
        xcFunction.checkOrder(table.getName())
            .then((order, keys) => {
                expect(order).to.equal(3);
                expect(keys.length).to.equal(1);
                expect(keys[0]).to.equal("a");
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                table.keys = oldKeys;
                table.ordering = oldOrdering;
            });
    });

    it("xcFunction.getNumRows should work in cache case", (done) => {
        gTables[tableId].resultSetCount = 3;
        xcFunction.getNumRows(tableName)
        .then((res) => {
            expect(res).to.be.equal(3);
            done();
        })
        .fail(() => {
            done('fail');
        });
    });

    it('xcFunction.getNumRows should work in normal case', (done) => {
        const oldFunc = XIApi.getNumRows;
        XIApi.getNumRows = () => PromiseHelper.resolve(2);

        xcFunction.getNumRows('table#abc')
        .then((res) => {
            expect(res).to.be.equal(2);
            done();
        })
        .fail(() => {
            done('fail');
        })
        .always(() => {
            XIApi.getNumRows = oldFunc;
        });
    });

    after(() => {
        TblManager.refreshTable = oldRefreshTable;
        TblManager.setOrphanTableMeta = oldSetMeta;
        Transaction.start = oldTranStart;
        Transaction.done = oldTranDone;
        Transaction.fail = oldTranFail;
        Transaction.cancel = oldTranCancel;
        Authentication.getHashId = oldGetHashId;
        delete gTables[tableId];
    });
});