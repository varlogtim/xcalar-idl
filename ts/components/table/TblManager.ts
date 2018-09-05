class TblManager {
    /**
     * TblManager.refreshTable
     * This function takes in an array of newTable names to be added,
     * an array of tableCols, worksheet that newTables will add to and an array
     * of oldTable names that will be modified due to a function.
     * Inside oldTables, if there is an anchor table, we move it to the start
     * of the array. If there is a need for more than 1 piece of information,
     * then oldTables need to be an array of structs
     * txId is provided during a normal operation and is null during an undo,
     * redo, or repeat etc.
     * @param newTableNames
     * @param tableCols
     * @param oldTableNames
     * @param worksheet
     * @param txId
     * @param options
     * -focusWorkspace: determine whether we should focus back on workspace, we
     *  focus on workspace when adding a table from the datastores panel.
     * -selectCol: olumn to be highlighted when table is ready.
     * -isUndo: default is false. Set to true if this table is being created
     *  from an undo operation.
     * -position: int, used to place a table in a certain spot if not replacing
     *  an older table. Currently has to be paired with undo
     * -replacingDest: where to send old tables that are being replaced
     * -noTag: if true will not tag nodes
     * -from: where it's from
     */
    public static refreshTable(
        newTableNames: string[],
        tableCols: ProgCol[],
        oldTableNames: string[] | string,
        worksheet: string,
        txId: number,
        options: {
            focusWorkspace?: boolean,
            selectCol?: number | number[],
            isUndo?: boolean,
            position?: number,
            replacingDest?: string,
            noTag?: boolean,
            from?: string
        } = {
            focusWorkspace: false,
            selectCol: [],
            isUndo: false,
            position: null,
            replacingDest: null,
            noTag: false
        }
    ): XDPromise<string> {
        if (txId != null) {
            if (Transaction.checkCanceled(txId)) {
                return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
            } else {
                // we cannot allow transactions to be canceled if
                // we're about to add a table to the worksheet
                Transaction.disableCancel(txId);
            }
        }

        if (typeof oldTableNames === "string") {
            oldTableNames = [oldTableNames];
        } else {
            oldTableNames = oldTableNames || [];
        }

        // set table list into a transition state
        TableList.updatePendingState(true);

        // must get worksheet to add before async call,
        // otherwise newTable may add to wrong worksheet
        const newTableName: string = newTableNames[0];
        const newTableId: TableId = xcHelper.getTableId(newTableName);
        let tableAddedToWS: boolean = false;
        if (worksheet != null) {
            WSManager.addTable(newTableId, worksheet);
            tableAddedToWS = true;
        } else {
            worksheet = WSManager.getWSFromTable(newTableId);
            if (!worksheet) {
                worksheet = WSManager.getActiveWS();
                WSManager.addTable(newTableId, worksheet);
                tableAddedToWS = true;
            }
        }

        const tablesToRemove: TableId[] = [];
        const tablesToReplace: string[] = [];
        if (oldTableNames.length > 0) {
            // figure out which old table we will replace
            TblManager._setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                               tablesToRemove);
        }

        // lock tables in case not locked during an undo/redo
        const tableLockStatuses: boolean[] = [];
        tablesToRemove.forEach((tableId) => {
            const isLocked: boolean = gTables[tableId].hasLock();
            tableLockStatuses.push(isLocked);
            if (!isLocked) {
                xcHelper.lockTable(tableId);
            }
        });

        if (!tableCols || tableCols.length === 0) {
            const table = gTables[newTableId];
            if (table == null || table.status === TableType.Orphan) {
                TableList.removeTable(newTableName);
            }
            // if no tableCols provided but gTable exists,
            // columns are already set
        }

        TblManager._setTableMeta(newTableName, tableCols);

        if (options.focusWorkspace) {
            MainMenu.openPanel("workspacePanel", "worksheetButton", {
                hideDF: true
            });
        }

        // append newly created table to the back, do not remove any tables
        const addTableOptions = {
            afterStartup: true,
            selectCol: options.selectCol,
            isUndo: options.isUndo,
            position: options.position,
            from: options.from,
            replacingDest: options.replacingDest,
            ws: worksheet,
            txId: txId,
            noTag: options.noTag
        };
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        TblManager._addTable(newTableName, tablesToReplace, tablesToRemove, addTableOptions)
        .then(() => {
            if (options.focusWorkspace) {
                TblManager._scrollAndFocusTable(newTableName);
            } else {
                const wsNum: string = WSManager.getActiveWS();
                if ($('.xcTableWrap.worksheet-' + wsNum)
                                   .find('.tblTitleSelected').length === 0) {
                    const tableId: TableId = xcHelper.getTableId(newTableName);
                    TblFunc.focusTable(tableId);
                }
            }
            TblManager._unlockTables(tablesToRemove, tableLockStatuses);
            deferred.resolve(newTableName);
        })
        .fail((error) => {
            console.error("refresh tables fails!", error, newTableName);
            if (tableAddedToWS) {
                WSManager.removeTable(newTableId, false);
            }
            TblManager._removeTableDisplay(newTableId);
            TblManager._unlockTables(tablesToRemove, tableLockStatuses);
            deferred.reject(error);
        })
        .always(() => {
            WSManager.removePending(newTableId, worksheet);
            TableList.updatePendingState(false);
        });

        return deferred.promise();
    }

    private static _setTableMeta(tableName: string, tableCols: ProgCol[]): void {
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (!gTables.hasOwnProperty(tableId)) {
            if (tableCols == null || tableCols.length === 0) {
                 // at last have data col
                tableCols = [ColManager.newDATACol()];
            }

            // tableCols get deep copied in TableMeta constructor
            gTables[tableId] = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "tableCols": tableCols,
                "status": TableType.Orphan
            });
        }
    }

    private static _setTablesToReplace(
        oldTableNames: string[],
        worksheet: string,
        tablesToReplace: string[],
        tablesToRemove: TableId[]
    ): void {
        const oldTableIds = oldTableNames.map(xcHelper.getTableId);
        if (oldTableNames.length === 1) {
            // only have one table to remove
            tablesToReplace.push(oldTableNames[0]);
        } else {
            // find the first table in the worksheet,
            // that is the target worksheet
            // var targetTable;
            const wsTables = WSManager.getWSById(worksheet).tables;
            for (let i = 0, len = wsTables.length; i < len; i++) {
                const index: number = oldTableIds.indexOf(wsTables[i]);
                if (index > -1) {
                    tablesToReplace.push(oldTableNames[index]);
                    break;
                }
            }

            if (tablesToReplace.length === 0) {
                // If we're here, we could not find a table to be replaced in the
                // active worksheet, so the new table
                // will eventually just be appended to the active worksheet
                // The old tables will still be removed;
                console.warn("Current WS has no tables to replace");
                // tablesToReplace will remain an empty array
            }
        }

        oldTableIds.forEach((oldTableId) => {
            if (!tablesToRemove.includes(oldTableId)) {
                // if oldTableId alredy exists (like self join)
                // not add again
                tablesToRemove.push(oldTableId);
                const progressCircle = $("#xcTableWrap-" + oldTableId)
                                        .find(".lockedTableIcon")
                                        .data("progresscircle");
                if (progressCircle) {
                    progressCircle.done();
                }
            }
        });
    }

    /**
    * Sets up new tables to be added to the display and removes old tables.
    *
    * newTableName is an string of tablename to be added
    * tablesToReplace is an array of old tablenames to be replaced
    * tablesToRemove is an array of tableIds to be removed later
    * @param newTableName
    * @param tablesToReplace
    * @param tablesToRemove
    * @param options
    * -afterStartup: indicate if these tables are added after page load
    * -selectCol: column to be selected once new table is ready
    * -isUndo: default is false. If true, we are adding this table through an undo
    * -replacingDest: where to send old tables that are being replaced
    * -ws: worksheet id of where new table will go
    * -txId: used for tagging dag operations,
    * -noTag: if true will not tag nodes
    * -position: int, used to place a table in a certain spot.
    */
    private static _addTable(
        newTableName: string,
        tablesToReplace: string[],
        tablesToRemove: TableId[],
        options: {
            afterStartup: boolean,
            selectCol: number | number[],
            isUndo: boolean,
            replacingDest: string,
            ws: string,
            txId: number,
            noTag: boolean,
            position: number,
            from: string
        }
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const newTableId: TableId = xcHelper.getTableId(newTableName);
        const oldId: TableId = xcHelper.getTableId(tablesToReplace[0]);

        TblManager._tagOldTables(tablesToRemove);

        TblManager.parallelConstruct(newTableId, tablesToReplace[0], {
            afterStartup: options.afterStartup,
            selectCol: options.selectCol,
            txId: options.txId,
            noTag: options.noTag,
            wsId: options.ws,
            position: options.position
        })
        .then(() => {
            gTables[newTableId].beActive();
            TblManager._removeOldTables(tablesToRemove);

            let wasTableReplaced: boolean = false;
            if (options.isUndo && options.position != null) {
                WSManager.replaceTable(newTableId, null, null, {
                    position: options.position
                });
            } else if (tablesToReplace[0] == null) {
                WSManager.replaceTable(newTableId);
            } else {
                var tablePosition = WSManager.getTablePosition(oldId);

                if (tablePosition > -1) {
                    WSManager.replaceTable(newTableId, oldId, tablesToRemove, {
                        removeToDest: options.replacingDest
                    });
                    wasTableReplaced = true;
                } else {
                    WSManager.replaceTable(newTableId);
                }
            }

            const $existingTableList: JQuery = $('#activeTablesList').find('[data-id="' +
                                            newTableId + '"]');
            if ($existingTableList.length) {
                $existingTableList.closest('.tableInfo')
                                .removeClass('hiddenWS');
                xcTooltip.remove($existingTableList.closest('.tableInfo'));
            } else {
                TableList.addTables([gTables[newTableId]], true);
            }
            // in case table showed up in temp list during its formation
            TableList.removeTable(newTableName, TableType.Orphan);

            if (tablesToRemove) {
                const noFocusWS: boolean = tablesToRemove.length > 1;
                for (let i = 0; i < tablesToRemove.length; i++) {
                    if (wasTableReplaced && tablesToRemove[i] !== oldId) {
                        WSManager.removeTable(tablesToRemove[i], true);
                    }
                    if (gTables[tablesToRemove[i]].status === TableType.Active) {
                        if (options.from === "noSheet") {
                            TblManager.sendTableToOrphaned(tablesToRemove[i], {
                                force: true,
                                noFocusWS: false
                            });
                        } else {
                            if (options.replacingDest === TableType.Undone) {
                                TblManager.sendTableToUndone(tablesToRemove[i], {
                                    "noFocusWS": noFocusWS,
                                    "force": true,
                                    "remove": false
                                });
                            } else {
                                TblManager.sendTableToOrphaned(tablesToRemove[i], {
                                    "noFocusWS": noFocusWS,
                                    "force": true
                                });
                            }
                        }
                    }
                }
            }
            if (tablesToReplace.length === 1) {
                const oldTableId: TableId = xcHelper.getTableId(tablesToReplace[0]);
                TblManager._animateTableId(newTableId, oldTableId);
            }
            FnBar.updateColNameCache();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _removeOldTables(tablesToRemove: TableId[]): void {
        if (!tablesToRemove) {
            return;
        }
        for (let i = 0; i < tablesToRemove.length; i++) {
            const tableId: TableId = tablesToRemove[i];
            $("#xcTableWrap-" + tableId).remove();
            $("#dagWrap-" + tableId).remove();
        }
    }

    private static _tagOldTables(tablesToRemove: TableId[]): void {
        if (!tablesToRemove) {
            return;
        }

        tablesToRemove.forEach((tableId) => {
            $("#xcTableWrap-" + tableId).addClass("tableToRemove");
            $("#dagrap-" + tableId).addClass("dagWrapToRemove");
        });
    }

    private static _unlockTables(
        tablesToRemove: TableId[],
        tableLockStatuses: boolean[]
    ): void {
        for (let i = 0; i < tablesToRemove.length; i++) {
            if (!tableLockStatuses[i]) {
                xcHelper.unlockTable(tablesToRemove[i]);
            }
        }
    }

    private static _removeTableDisplay(tableId: TableId): void {
        $("#xcTableWrap-" + tableId).remove();
        Dag.destruct(tableId);
        if (gActiveTableId === tableId) {
            gActiveTableId = null;
            RowScroller.empty();
        }
    }

    private static _animateTableId(tableId: TableId, oldId: TableId): XDPromise<void> {
        if (gMinModeOn || (typeof tableId !== typeof oldId) ||
            (isNaN(<number>tableId) !== isNaN(<number>oldId))) {
            // do not animate if going from "ab12" to 13
            return PromiseHelper.resolve();
        }

        const splitCntChars = (sChars: string[], eChars: string[]): string[][] => {
            const eLen: number = eChars.length;
            const len: number = Math.max(sChars.length, eChars.length);
            // padding empty string to chars to the end
            sChars = sChars.concat(new Array(len - sChars.length).fill(""));
            eChars = eChars.concat(new Array(len - eChars.length).fill(""));

            const chars: string[][] = sChars.map((sCh, i) => {
                const eCh: string = eChars[i];
                let sNum: number = Number(sCh);
                const eNum: number = Number(eCh);
                const inc: number = (eNum > sNum) ? 1 : -1;
                const res: string[] = [sCh];

                while (sNum !== eNum) {
                    sNum += inc;
                    if (sNum === eNum) {
                        res.push(eCh);
                    } else {
                        res.push(sNum + ""); // change to string
                    }
                }
                return res;
            });
            // chars need to be the same len as eChars
            chars.splice(eLen);
            return chars;
        };


        const getHashAnimHtml = (hashPart: string, charCnts: string[][]): string => {
            return '<div class="hashPart">' + hashPart + '</div>' +
                    '<div class="animWrap">' +
                        '<div class="topPadding"></div>' +
                        charCnts.map((chartCnt) => {
                            return '<div class="animPart">' +
                                        chartCnt.map((ch) => {
                                            return '<div class="num">' +
                                                        ch +
                                                    '</div>';
                                        }).join("") +
                                    '</div>';
                        }).join("") +
                        '<div class="bottomPadding"></div>' +
                    '</div>';
        };

        const animateCharCnt = ($section: JQuery): XDPromise<void> => {
            const h: number = $section.height(); // 20px
            const defs: XDPromise<void>[] = [];

            $section.find(".animPart").each((i, el) => {
                const $part: JQuery = $(el);
                const $nums: JQuery = $part.find(".num");
                const animTime: number = 500;
                const delayFactor: number = 100;

                if ($nums.length > 1) {
                    const top: number = parseInt($part.css("top")) -
                    h * ($nums.length - 1);
                    const def: XDPromise<void> = $part.animate({
                        "top": top + "px"
                    }, animTime)
                    .delay(delayFactor * i)
                    .promise();

                    defs.push(def);
                }
            });

            return PromiseHelper.when.apply(null, defs);
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $hashName: JQuery = $("#xcTheadWrap-" + tableId).find(".hashName");
        const oldText: string = $hashName.text();
        tableId = String(tableId);
        oldId = String(oldId);
        let hashPart: string;
        let sCntStr: string;
        let eCntStr: string;
        if (isNaN(<any>tableId)) { // is a number
            hashPart = "#" + tableId.substring(0, 2); // first 2 chars
            sCntStr = oldId.substring(2);
            eCntStr = tableId.substring(2);
        } else {
            hashPart = "#";
            sCntStr = oldId;
            eCntStr = tableId;
        }

        const charCnts: string[][] = splitCntChars(Array.from(sCntStr), Array.from(eCntStr));
        $hashName.html(getHashAnimHtml(hashPart, charCnts));
        animateCharCnt($hashName)
        .then(() => {
            $hashName.text(oldText);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _scrollAndFocusTable(tableName: string): void {
        const tableId: TableId = xcHelper.getTableId(tableName);
        xcHelper.centerFocusedTable(tableId, true)
        .then(() => {
            RowScroller.genFirstVisibleRowNum();
        });
    }

    /**
     * TblManager.parallelConstruct
     * Adds new tables to the display and the dag at the same time.
     * @param tableId
     * @param tableToReplace
     * @param options
     * -afterStartup: indicate if the table is added after page load.
     * -selectCol: column to be highlighted when table is ready.
     * -txId: used for tagging operations before creating dag.
     * -noTag: if true will not tag nodes.
     * -wsId: in which worksheet
     * -position: position in the worksheet
     */
    public static parallelConstruct(
        tableId: TableId,
        tableToReplace: string,
        options: {
            afterStartup: boolean,
            selectCol: number | number[],
            txId: number,
            noTag: boolean,
            wsId: string,
            position: number
        }
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promise1: XDPromise<void> = new XcTableInWSViewer(gTables[tableId], tableToReplace, options).render();
        const promise2: XDPromise<void> = TblManager._createDag(tableId, tableToReplace, options);

        PromiseHelper.when(promise1, promise2)
        .then(() => {
            const table: TableMeta = gTables[tableId];
            const $xcTableWrap: JQuery = $('#xcTableWrap-' + tableId);
            RowScroller.resize();
            $xcTableWrap.removeClass("building");
            $("#dagWrap-" + tableId).removeClass("building");
            if ($('#mainFrame').hasClass('empty')) {
                // first time to create table
                $('#mainFrame').removeClass('empty');
            }
            if (options.afterStartup) {
                const $existingTableList: JQuery = $('#activeTablesList')
                                        .find('[data-id="' + tableId + '"]');
                if ($existingTableList.length) {
                    $existingTableList.closest('.tableInfo')
                                      .removeClass('hiddenWS')
                                      .removeAttr('data-toggle data-container' +
                                                  'title data-original-title');
                } else {
                    TableList.addTables([table], true);
                }
                // in case table showed up in temp list during its formation
                TableList.removeTable(table.getName(), TableType.Orphan);
            }
            const $visibleTables: JQuery = $('.xcTable:visible');
            if ($visibleTables.length === 1 &&
                $visibleTables.is("#xcTable-" + tableId)) {
                TblFunc.focusTable(tableId);
            }

            // disallow dragging if only 1 table in worksheet
            TblFunc.checkTableDraggable();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _createDag(
        tableId: TableId,
        tableToReplace: string,
        options: {
            txId: number,
            noTag: boolean
        }
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        var promise;
        if (options.txId != null && !options.noTag) {
            promise = DagFunction.tagNodes(options.txId);
        } else {
            promise = PromiseHelper.resolve();
        }

        PromiseHelper.alwaysResolve(promise)
        .then(() => {
            return Dag.construct(tableId, tableToReplace, options);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * TblManager.setOrphanedList
     * @param tableMap
     */
    public static setOrphanedList(tableMap: object): void {
        const tables: string[] = [];
        for (let table in tableMap) {
            tables.push(table);
        }
        gOrphanTables = tables;
    }

   /**
    * TblManager.setOrphanTableMeta
    * Sets gTable meta data, specially for orphan table
    * @param tableName
    * @param tableCols
    */
    public static setOrphanTableMeta(
        tableName: string,
        tableCols: ProgCol[]
    ): TableMeta {
        if (tableCols == null) {
            // at least have data col
            tableCols = [ColManager.newDATACol()];
        }

        // tableCols get deep copied in TableMeta constructor
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "tableCols": tableCols,
            "status": TableType.Orphan
        });

        gTables[tableId] = table;
        TableList.addToOrphanList(tableName);
        return table;
    }

    /**
     * TblManager.sendTableToOrphaned
     * @param tableId
     * @param options
     * -remove: boolean, if true will remove table from html immediately - should
     *          happen when not replacing a table
     * -keepInWS: boolean, if true will not remove table from WSManager
     * -noFocusWS: boolean, if true will not focus on tableId's Worksheet
     * -force: boolean, if true will change table meta before async returns
     * -removeAfter: boolean, if true will remove table html after freeing result
     */
    public static sendTableToOrphaned(
        tableId: TableId,
        options: {
            remove?: boolean,
            keepInWS?: boolean,
            noFocusWS: boolean,
            force?: boolean,
            removeAfter?: boolean
        } = {
            noFocusWS: false
        }
    ): XDPromise<{relativePosition: number}> {
        const deferred: XDDeferred<{relativePosition: number}> = PromiseHelper.deferred();
        if (options.remove) {
            TblManager._removeTableDisplay(tableId);
        }
        var table = gTables[tableId];
        var cleanupResult;

        if (options.force) {
            // returns object with table's ws relativePosition
            cleanupResult = TblManager._tableCleanup(tableId, false, options);
        }

        table.freeResultset()
        .then(() => {
            if (options.removeAfter) {
                TblManager._removeTableDisplay(tableId);
            }
            if (!options.force) {
                cleanupResult = TblManager._tableCleanup(tableId, false, options);
            }
            deferred.resolve(cleanupResult);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // used for orphaned or undone tables
    private static _tableCleanup(
        tableId: TableId,
        isUndone: boolean,
        options: {noFocusWS: boolean}
    ): {relativePosition: number} {
        const table: TableMeta = gTables[tableId];
        if (!table) {
            return;
        }
        let wsId: string;
        if (!options.noFocusWS) {
            wsId = WSManager.getWSFromTable(tableId);
        }

        TableList.removeTable(tableId);

        const relativePosition: number = WSManager.getTableRelativePosition(tableId);
        WSManager.removeTable(tableId, false);

        if (isUndone) {
            table.beUndone();
        } else {
            table.beOrphaned();
        }

        table.updateTimeStamp();

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
            RowScroller.empty();
        }

        if ($('.xcTableWrap:not(.inActive)').length === 0) {
            RowScroller.empty();
        }

        if (!options.noFocusWS) {
            const activeWS: string = WSManager.getActiveWS();
            if (activeWS !== wsId) {
                WSManager.focusOnWorksheet(wsId, null, tableId);
            }
        }

        TblManager.alignTableEls();

        // disallow dragging if only 1 table in worksheet
        TblFunc.checkTableDraggable();
        TableList.addToOrphanList(table.getName());

        return {relativePosition: relativePosition};
    }

    /**
     * TblManager.sendTableToTempList
     * @param tableIds
     * @param workSheets
     * @param tableNames
     */
    public static sendTableToTempList(
        tableIds: TableId[],
        workSheets: string[],
        tableNames: string[]
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (tableIds.length <= 1){
            workSheets = [WSManager.getWSFromTable(tableIds[0])];
            tableNames = [gTables[tableIds[0]].getName()];
        }
        const sqlOptions: any = {
            "operation": SQLOps.MakeTemp,
            "workSheets": workSheets,
            "tableIds": tableIds,
            "tableNames": tableNames,
            "htmlExclude": ["tableIds", "tablePos", "workSheets"]
        };

        TblManager.moveTableToTempList(tableIds)
        .then((positions) => {
            sqlOptions.tablePos = positions;
            Log.add(SQLTStr.MakeTemp, sqlOptions);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     *  TblManager.moveTableToTempList
     * @param tableIds
     */
    public static moveTableToTempList(tableIds: TableId[]): XDPromise<number[]> {
        const deferred: XDDeferred<number[]> = PromiseHelper.deferred();

        if (!tableIds.length) {
            deferred.resolve();
            return deferred.promise();
        }

        const promises: XDPromise<void>[] = [];
        const failures: string[] = [];
        const positions: number[] = [];

        tableIds.forEach((tableId) => {
            xcHelper.lockTable(tableId);
        });

        tableIds.forEach((tableId) => {
            promises.push((() => {
                const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
                TblManager.sendTableToOrphaned(tableId, {
                    removeAfter: true,
                    noFocusWS: true
                })
                .then((ret) => {
                    positions.push(ret.relativePosition);
                    innerDeferred.resolve();
                })
                .fail((error) => {
                    failures.push(tableId + ": {" + xcHelper.parseError(error) + "}");
                    innerDeferred.resolve(error);
                });
                return innerDeferred.promise();
            }).bind(this));
        });

        tableIds.forEach((tableId) => {
            xcHelper.unlockTable(tableId);
        });

        PromiseHelper.chain(promises)
        .then(() => {
            // anything faile to alert
            if (failures.length > 0) {
                deferred.reject(failures.join("\n"));
            } else {
                deferred.resolve(positions);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * TblManager.sendTableToUndone
     * @param tableId
     * @param options
     * -remove: boolean, if true will remove table display from ws immediately
     * -force: boolean, if true will change table meta before async returns
     */
    public static sendTableToUndone(
        tableId: TableId,
        options: {
            remove: boolean,
            force: boolean
            noFocusWS: boolean
        } = {
            remove: false,
            force: false,
            noFocusWS: false
        }
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (options.remove) {
            TblManager._removeTableDisplay(tableId);
        } else {
            $("#xcTableWrap-" + tableId).addClass('tableToRemove');
            $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
        }

        const table: TableMeta = gTables[tableId];
        if (!table) {
            deferred.reject('table not found');
            console.warn('gTable not found to send to undone');
            return deferred.promise();
        }
        if (options.force) {
            TblManager._tableCleanup(tableId, true, options);
        }

        table.freeResultset()
        .then(() => {
            if (!options.force) {
                TblManager._tableCleanup(tableId, true, options);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * TblManager.findAndFocusTable
     * searches for this table in active and temp list and brings it to the
     * active WS if needed and focuses on it
     * @param tableName
     * @param noAnimate
     */
    public static findAndFocusTable(
        tableName: string,
        noAnimate: boolean
    ): XDPromise<{tableFromInactive: boolean}> {
        const deferred: XDDeferred<{tableFromInactive: boolean}> = PromiseHelper.deferred();

        let wsId: string;
        let tableType: string;
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];
        if (table != null) {
            if (table.isActive()) {
                MainMenu.openPanel("workspacePanel", "worksheetButton");
                wsId = WSManager.getWSFromTable(tableId);
                const $wsListItem: JQuery = $('#worksheetTab-' + wsId);
                if ($wsListItem.hasClass("hiddenTab")) {
                    $wsListItem.find(".unhide").click();
                } else {
                    $wsListItem.trigger(fakeEvent.mousedown);
                }

                if ($("#dagPanel").hasClass('full')) {
                    $('#dagPulloutTab').click();
                }
                const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
                xcHelper.centerFocusedTable($tableWrap, false)
                .then(() => {
                    deferred.resolve({tableFromInactive: false});
                })
                .fail(deferred.reject);
                $tableWrap.mousedown();
                return deferred.promise();
            } else if (WSManager.getWSFromTable(tableId) == null) {
                tableType = TableType.Orphan;
            } else if (table.status === TableType.Orphan) {
                tableType = TableType.Orphan;
            } else if (table.status === TableType.Undone) {
                tableType = TableType.Undone;
            } else {
                tableType = TableType.Orphan;
            }

            //xx currently we won't allow focusing on undone tables
            if (tableType === TableType.Undone) {
                deferred.reject({tableType: tableType, notFound: true});
            } else {
                MainMenu.openPanel("workspacePanel", "worksheetButton");
                wsId = WSManager.getActiveWS();
                WSManager.moveTemporaryTable(tableId, wsId, tableType, true, noAnimate)
                .then(() => {
                    deferred.resolve({tableFromInactive: true});
                })
                .fail(() => {
                    deferred.reject({notFound: true});
                });
            }
        } else {
            XcalarGetTables(tableName)
            .then((ret) => {
                if (ret.numNodes > 0) {
                    MainMenu.openPanel("workspacePanel", "worksheetButton");
                    wsId = WSManager.getActiveWS();
                    WSManager.moveTemporaryTable(tableId, wsId, TableType.Orphan,
                                                true, noAnimate)
                    .then(() => {
                        deferred.resolve({tableFromInactive: true});
                    })
                    .fail(deferred.reject);
                } else {
                    deferred.reject({notFound: true});
                }
            })
            .fail(deferred.reject);
        }
        return deferred.promise();
    }

    // XXX consider passing in table names instead of tableIds to simplify
    // orphan name vs active table id determination
     // XXX not tested yet!!!
    /**
     * TblManager.deleteTables
     * will resolve if at least 1 table passes, even if others fail
     * if no failures, will not return info, but if partial or full fail
     * then it will return array of failures
     * @param tables 
     * @param tableType 
     * @param noAlert 
     * @param noLog if we are deleting undone tables, we do not log this transaction
     * @param options
     * -lockedToTemp: boolean, if true will send locked tables to temp list
     */
    public static deleteTables(
        tables: (TableId | string)[],
        tableType: string,
        noAlert: boolean,
        noLog: boolean,
        options: {
            lockedToTemp: boolean
        } = {
            lockedToTemp: false
        }
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        // tables is an array, it might be modifed
        // example: pass in gOrphanTables
        if (!(tables instanceof Array)) {
            tables = [tables];
        }

        tables = tables.filter((tableIdOrName) => {
            return TblManager._verifyTableType(tableIdOrName, tableType);
        });

        const splitTables = TblManager._splitDroppableTables(tables, tableType);
        tables = splitTables.deleteable;
        const noDeleteTables: (TableId | string)[] = splitTables.noDelete;

        let txId: number;
        const sql = {
            operation: SQLOps.DeleteTable,
            tables: xcHelper.deepCopy(tables),
            tableType: tableType
        };
        if (!noLog) {
            txId = Transaction.start({
                operation: SQLOps.DeleteTable,
                sql: sql,
                steps: tables.length,
                track: true
            });
        }

        let tableNames: string[] = [];
        let promise: XDPromise<void>;
        //Calls deletes in these heper functions
        if (tableType === TableType.Orphan) {
            // delete orphaned
            tableNames = <string[]>tables;
            promise = TblManager._delOrphanedHelper(tableNames, txId);
        } else if (tableType === TableType.Undone) {
            tableNames = tables.map((tableId) => gTables[tableId].getName());
            promise = TblManager._delUndoneTableHelper(tables, txId);
        } else {
            tableNames = tables.map((tableId) =>  gTables[tableId].getName());
            promise = TblManager._delActiveTableHelper(tables, txId);
            if (options.lockedToTemp) {
                noDeleteTables.forEach((tableId) => {
                    TblManager.sendTableToOrphaned(tableId, {
                        remove: true,
                        noFocusWS: true,
                        force: true
                    });
                });
            }
        }

        const rejectHandler = (args): void => {
            const res = TblManager._tableDeleteFailHandler(args, tableNames, noDeleteTables);
            res.errors = args;
            if (res.hasSuccess) {
                if (!noLog) {
                    sql.tables = res.successTables;
                    Transaction.done(txId, {
                        sql: sql,
                        title: TblTStr.Del
                    });

                    if (res.fails && !noAlert) {
                        Alert.error(StatusMessageTStr.PartialDeleteTableFail,
                                    res.errorMsg);
                    }
                }

                if (tableType === TableType.Undone) {
                    KVStore.commit();
                }
                deferred.resolve(res);
            } else {
                if (!noLog) {
                    Transaction.fail(txId, {
                        error: res.errorMsg,
                        failMsg: StatusMessageTStr.DeleteTableFailed,
                        noAlert: noAlert
                    });
                }
                deferred.reject(res);
            }
        };

        promise
        .then(() => {
            // resolves if all tables passed
            if (noDeleteTables.length && !options.lockedToTemp) {
                rejectHandler(tableNames);
            } else {
                if (!noLog) {
                    Transaction.done(txId, {
                        title: TblTStr.Del
                    });
                }

                if (tableType === TableType.Undone) {
                    KVStore.commit();
                }
                deferred.resolve(tableNames);
            }
            // Delete schemas in SQL
            if (typeof SQLEditor !== "undefined") {
                let tableIds: TableId[] = [];
                if (tableType === TableType.Orphan) {
                    tableNames.forEach((tableName) => {
                        const tableId: TableId = xcHelper.getTableId(tableName);
                        if (tableId != null) {
                            tableIds.push(String(tableId));
                        }
                    });
                } else {
                    tableIds = tables.map((tableId) => String(tableId));
                }
                SQLEditor.deleteSchemas(null, tableIds);
            }
        })
        .fail((...arg) => {
            // fails if at least 1 table failed
            rejectHandler(arg);
        });

        return deferred.promise();
    }

    private static _tableDeleteFailHandler(
        results: any[],
        tables: (TableId | string)[],
        noDeleteTables: (TableId | string)[]
    ): {
        hasSuccess: boolean,
        fails: {tables: (TableId | string), error: string}[],
        errorMsg: string,
        successTables: (TableId | string)[]
        errors: any[]
    } {
        let hasSuccess: boolean = false;
        const fails: {tables: (TableId | string), error: string}[] = [];
        let numActualFails: number = 0; // as opposed to noDeleteTables
        let errorMsg: string = "";
        let tablesMsg: string = "";
        let noDeleteMsg: string = "";
        let failedTablesStr: string = "";
        let successTables: (TableId | string)[] = [];

        for (let i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: tables[i], error: results[i].error});
                failedTablesStr += tables[i] + ", ";
                numActualFails++;
            } else {
                hasSuccess = true;
                successTables.push(tables[i]);
            }
        }

        if (noDeleteTables.length) {
            noDeleteTables.forEach((tIdOrName) => {
                let tableName: string;
                if (gTables[tIdOrName]) {
                    tableName = gTables[tIdOrName].getName();
                } else {
                    tableName = <string>tIdOrName;
                }
                noDeleteMsg += tableName + ", ";
                fails.push({
                    "tables": tableName,
                    "error": ErrTStr.CannotDropLocked
                });
            });
            // remove last comma
            noDeleteMsg = noDeleteMsg.substr(0, noDeleteMsg.length - 2);
            if (noDeleteTables.length === 1) {
                noDeleteMsg = "Table " + noDeleteMsg + " was locked.\n";
            } else {
                noDeleteMsg = "Tables " + noDeleteMsg + " were locked.\n";
            }
        }

        const numFails: number = fails.length + noDeleteTables.length;
        if (numFails) {
            // remove last comma
            failedTablesStr = failedTablesStr.substr(0,
                              failedTablesStr.length - 2);
            if (numActualFails === 1) {
                tablesMsg += xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTablesStr
                });
            } else if (numActualFails > 1) {
                tablesMsg += ErrTStr.TablesNotDeleted + " " + failedTablesStr;
            }

            if (hasSuccess || noDeleteTables.length) {
                if (!numActualFails) {
                    errorMsg = noDeleteMsg;
                } else {
                    errorMsg = noDeleteMsg + fails[0].error + ". " + tablesMsg;
                }
            } else {
                errorMsg = fails[0].error + ". " + ErrTStr.NoTablesDeleted;
            }
        }

        return {
            hasSuccess: hasSuccess,
            fails: fails,
            errorMsg: errorMsg,
            successTables: successTables,
            errors: null
        };
    }

    private static _getFakeQuery(tableName: string): object {
        return {
            operation: "XcalarApiDeleteObjects",
            args: {
                namePattern: tableName,
                srcType: "Table"
            }
        };
    }

    // for deleting active tables
    private static _delActiveTableHelper(
        tableIds: TableId[],
        txId: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const defArray: XDPromise<void>[] = [];
        const tableJSON: object[] = [];
        const names: string[] = [];
        const resolveTable = (tableId: TableId): void => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            Dag.makeInactive(tableId, false);
            TblManager._removeTableDisplay(tableId);
            TableList.removeTable(tableId, TableType.Active);

            if (gActiveTableId === tableId) {
                gActiveTableId = null;
            }
            if ($('.xcTableWrap:not(.inActive)').length === 0) {
                RowScroller.empty();
            }
            TblManager._removeTableMeta(tableName);
            xcHelper.unlockTable(tableId);
        }

        tableIds.forEach((tableId) => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            names.push(tableName);
            xcHelper.lockTable(tableId);

            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);

            defArray.push(table.freeResultset());
        });
        // Free the result set pointer that is still pointing to it

        PromiseHelper.when.apply(window, defArray)
        .then(() => {
            if (names.length === 1) {
                // XIAPi.deleteTable has the fail handler for dag in use case
                // which XIAPI.deleteTables doesn't have
                return XIApi.deleteTable(txId, names[0]);
            } else {
                return XIApi.deleteTables(txId, tableJSON, null);
            }
        })
        .then((...arg) => {
            tableIds.forEach(resolveTable);
            TblManager.alignTableEls();
            // disallow dragging if only 1 table in worksheet
            TblFunc.checkTableDraggable();

            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            for (let i = 0; i < arg.length; i++) {
                const tableId: TableId = tableIds[i];
                if (arg[i] == null) {
                    resolveTable(tableId);
                } else {
                    xcHelper.unlockTable(tableId);
                }
            }
            TblManager.alignTableEls();
            // disallow dragging if only 1 table in worksheet
            TblFunc.checkTableDraggable();
            deferred.reject.apply(this, arg);
        });

        return deferred.promise();
    }

    private static _delOrphanedHelper(tables: string[], txId: number): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const names: string[] = [];
        const tableJSON: object[] = [];
        let resolve = (arg) => {
            for (let i = 0; i < arg.length; i++) {
                const tableName: string = names[i];
                if (arg[i] == null) {
                    const tableIndex: number = gOrphanTables.indexOf(tableName);
                    gOrphanTables.splice(tableIndex, 1);
                    Dag.makeInactive(tableName, true);
                    TableList.removeTable(tableName, TableType.Orphan);
                    TblManager._removeTableMeta(tableName);
                }
            }
        }

        tables.forEach((tableName) => {
            // Note Placeholder replace strings with constants
            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);
            names.push(tableName);
        });
        XIApi.deleteTables(txId, tableJSON, null)
        .then((...arg) => {
            resolve(arg);
            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            resolve(arg);
            deferred.reject.apply(this, arg);
        });

        return deferred.promise();
    }

    private static _delUndoneTableHelper(
        tables: TableId[],
        txId: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const names: string[] = [];
        const tableJSON: object[] = [];
        tables.forEach((tableId) => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);
            names.push(tableName);
        });

        XIApi.deleteTables(txId, tableJSON, null)
        .then((...arg) => {
            names.forEach((tableName) => {
                TableList.removeTable(tableName, TableType.Orphan);
                TblManager._removeTableMeta(tableName);
            });
            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            for (let i = 0; i < arg.length; i++) {
                const tableName: string = names[i];
                if (arg[i] == null) {
                    TableList.removeTable(tableName, TableType.Orphan);
                }
                TblManager._removeTableMeta(tableName);
            }
            deferred.reject.apply(this, arg);
        });

        return deferred.promise();
    }

    private static _removeTableMeta(tableName: string): void {
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] != null) {
            WSManager.removeTable(tableId, false);
            TblManager._sendTableToDropped(gTables[tableId]);
            delete gTables[tableId];
            Profile.deleteCache(tableId);
        }
    }

    private static _sendTableToDropped(table: TableMeta): void {
        if (table.getType() === TableType.Undone) {
            // has no descendants so we don't need to keep meta
            return;
        }
        table.beDropped();
        gDroppedTables[table.tableId] = table;
    }

    // returns arrays of deletable and non-deletable tables
    private static _splitDroppableTables(
        tables: (TableId | string)[],
        tableType: string
    ): {
        deleteable: (TableId | string)[],
        noDelete: (TableId | string)[]
    } {
        const deleteables: (TableId | string)[] = [];
        const nonDeletables: (TableId | string)[] = [];

        tables.forEach((tIdOrName) => {
            let tId: TableId;
            if (tableType === TableType.Orphan) {
                tId = xcHelper.getTableId(<string>tIdOrName);
            } else {
                tId = tIdOrName;
            }
            if (gTables[tId] &&
                (gTables[tId].isNoDelete() || gTables[tId].hasLock())
            ) {
                nonDeletables.push(tIdOrName);
            } else {
                deleteables.push(tIdOrName);
            }
        });
        return {deleteable: deleteables, noDelete: nonDeletables};
    }

    private static _verifyTableType(
        tableIdOrName: TableId | string,
        expectTableType: string
    ): boolean {
        let tableId: TableId;
        if (expectTableType === TableType.Orphan) {
            tableId = xcHelper.getTableId(<string>tableIdOrName);
        } else {
            tableId = tableIdOrName;
        }

        let currentTableType: string;
        if (tableId != null && gTables.hasOwnProperty(tableId)) {
            currentTableType = gTables[tableId].getType();
        } else {
            currentTableType = TableType.Orphan;
        }

        if (currentTableType === expectTableType ||
            (currentTableType === TableType.Undone &&
            expectTableType === TableType.Orphan)
        ) {
            return true;
        } else {
            console.warn("Table", tableIdOrName, "'s' type mismatch",
                        "type is", currentTableType,
                        "expected type is", expectTableType);
            return false;
        }
    }

    /**
     * TblManager.addUntrackedTable
     * @param tableName
     */
    public static addUntrackedTable(tableName: string): TableMeta {
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId != null && !gTables.hasOwnProperty(tableId)) {
            const table: TableMeta = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [ColManager.newDATACol()],
                status: TableType.Orphan
            });
            gTables[tableId] = table;
            return table;
        } else {
            // XXX no id, handle this by renaming?
            return null;
        }
    }

    /**
     * TblManager.makeTableNoDelete
     * @param tableName
     */
    public static makeTableNoDelete(tableName: string): TableMeta {
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId] || TblManager.addUntrackedTable(tableName);

        if (!table) {
            return null;
        }
        table.addNoDelete();
        const $tableHeader: JQuery = $("#xcTheadWrap-" + tableId);
        if (!$tableHeader.find(".lockIcon").length) {
            $tableHeader.find(".tableTitle")
                        .append('<i class="lockIcon icon xi-lockwithkeyhole" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'data-original-title="' +
                                TooltipTStr.UnlockTable + '"' +
                                '></i>');
            TblFunc.moveTableDropdownBoxes();
        }
        TableList.makeTableNoDelete(tableId);
        return table;
    }

    /**
     * TblManager.removeTableNoDelete
     * @param tableId
     */
    public static removeTableNoDelete(tableId: TableId): TableMeta {
        const table: TableMeta = gTables[tableId];
        table.removeNoDelete();
        const $tableHeader: JQuery = $("#xcTheadWrap-" + tableId);
        $tableHeader.find(".lockIcon").remove();
        TableList.removeTableNoDelete(tableId);
        return table;
    }

    /**
     * TblManager.restoreTableMeta
     * @param tables
     */
    public static restoreTableMeta(tables: TableMeta[]): void {
        // will delete older dropped tables if storing more than 1MB of
        // dropped table data
        let cleanUpDroppedTables = () => {
            const limit: number = 1 * MB;
            const droppedTablesStr: string = JSON.stringify(gDroppedTables);
            if (droppedTablesStr.length < limit) {
                return;
            }

            const pctToReduce: number = limit / droppedTablesStr.length;
            const dTableArray: TableMeta[] = [];
            let numTotalCols: number = 0;
            const hashTagLen: number = 2;

            for (let id in gDroppedTables) {
                dTableArray.push(gDroppedTables[id]);
                numTotalCols += gDroppedTables[id].tableCols.length;
            }

            // estimate table size by column length
            const colLimit: number = Math.floor(numTotalCols * pctToReduce);
            dTableArray.sort((a, b) => {
                let idNumA;
                let idNumB;
                if (isNaN(<number>a.tableId)) {
                    idNumA = (<string>a.tableId).slice(hashTagLen);
                } else {
                    idNumA = a.tableId;
                }
                if (isNaN(<number>b.tableId)) {
                    idNumB = (<string>b.tableId).slice(hashTagLen);
                } else {
                    idNumB = b.tableId;
                }
                return parseInt(idNumB) - parseInt(idNumA);
            });

            let colCount: number = 0;
            gDroppedTables = {};
            for (let i = 0; i < dTableArray.length; i++) {
                colCount += dTableArray[i].tableCols.length;
                if (colCount > colLimit) {
                    break;
                } else {
                    gDroppedTables[dTableArray[i].tableId] = dTableArray[i];
                }
            }
        };

        for (let tableId in tables) {
            const table: TableMeta = tables[tableId];
            if (table.hasLock()) {
                table.unlock();
                table.beOrphaned();
            }

            if (table.isDropped()) {
                table.beDropped(); // strips unnecessary data
                gDroppedTables[tableId] = table;
            } else {
                gTables[tableId] = table;
            }
        }

        cleanUpDroppedTables();
    }

    /**
     * TblManager.pullRowsBulk
     * @param tableId
     * @param jsonData
     * @param startIndex
     * @param direction
     * @param rowToPrependTo
     */
    public static pullRowsBulk(
        tableId: TableId,
        jsonData: string[],
        startIndex: number = 0,
        direction?: RowDirection,
        rowToPrependTo?: number
    ): void {
        const $table: JQuery = $('#xcTable-' + tableId);
        const $trs: JQuery = ColManager.pullAllCols(startIndex, jsonData, tableId,
                                            direction, rowToPrependTo);
        TblManager._addRowListeners($trs);
        TblManager.adjustRowHeights($trs, startIndex, tableId);

        const idColWidth: number = xcHelper.getTextWidth($table.find('tr:last td:first'));
        const newWidth: number = Math.max(idColWidth, 22);
        const padding: number = 12;
        $table.find('th:first-child').width(newWidth + padding);
        TblFunc.matchHeaderSizes($table);
    }

    private static _addRowListeners($trs: JQuery): void {
        const $jsonEle: JQuery = $trs.find(".jsonElement");
        $jsonEle.on("click", ".pop", (event) => {
            const $el: JQuery = $(event.currentTarget);
            if ($('#mainFrame').hasClass('modalOpen') &&
                !$el.closest('.xcTableWrap').hasClass('jsonModalOpen'))
            {
                return;
            }
            JSONModal.show($el.closest(".jsonElement"), null);
        });

        $trs.find(".rowGrab").mousedown((event) => {
            if (event.which === 1) {
                TblAnim.startRowResize($(event.currentTarget), event);
            }
        });
    }

    /**
     * TblManager.adjustRowHeights
     * @param $trs
     * @param rowIndex
     * @param tableId
     */
    public static adjustRowHeights(
        $trs: JQuery,
        rowIndex: number,
        tableId: TableId
    ): void {
        const rowObj: object[] = gTables[tableId].rowHeights;
        const numRows: number = $trs.length;
        const pageNum: number = Math.floor(rowIndex / gNumEntriesPerPage);
        const lastPageNum: number = pageNum + Math.ceil(numRows / gNumEntriesPerPage);
        const padding: number = 4;

        for (let i = pageNum; i < lastPageNum; i++) {
            if (rowObj[i]) {
                for (let row in rowObj[i]) {
                    const $row: JQuery = $trs.filter((_index, el) => {
                        return $(el).hasClass('row' + (Number(row) - 1));
                    });
                    const $firstTd: JQuery = $row.find('td.col0');
                    $firstTd.outerHeight(rowObj[i][row]);
                    $row.find('td > div')
                        .css('max-height', rowObj[i][row] - padding);
                    $firstTd.children('div').css('max-height', rowObj[i][row]);
                    $row.addClass('changedHeight');
                }
            }
        }
    }

    /**
     * TblManager.getColHeadHTML
     * @param colNum
     * @param tableId
     * @param options
     */
    public static getColHeadHTML(
        colNum: number,
        tableId: TableId,
        options: {
            columnClass: string
        } = {
            columnClass: ""
        }
    ): string {
        const table: TableMeta = gTables[tableId];
        xcAssert(table != null);

        const progCol: ProgCol = table.getCol(colNum);
        xcAssert(progCol != null);

        const keys: {name: string, ordering: string}[] = table.getKeys();
        const backName: string = progCol.getBackColName();
        const indexed: {name: string, ordering: string} = keys.find((k) => k.name === backName);

        let width: number = progCol.getWidth();
        let columnClass: string = options.columnClass || "";
        if (progCol.hasMinimized()) {
            width = 15;
            columnClass += " userHidden";
        }
        const type: ColumnType = progCol.getType();
        const validTypes: ColumnType[] = [ColumnType.integer, ColumnType.float,
            ColumnType.string, ColumnType.boolean, ColumnType.number];
        if (validTypes.includes(type) && !progCol.isEmptyCol()) {
            columnClass += " sortable ";
        }

        let sortIcon: string =
            '<div class="sortIcon">' +
                '<div class="sortAsc sortHalf" data-toggle="tooltip" ' +
                'data-container="body" ' +
                'data-placement="top" data-original-title="' +
                TooltipTStr.ClickToSortAsc + '"></div>' +
                '<div class="sortDesc sortHalf" data-toggle="tooltip"' +
                'data-container="body" ' +
                'data-placement="top" data-original-title="' +
                TooltipTStr.ClickToSortDesc + '"></div>' +
                '<i class="icon xi-sort fa-12"></i>' +
            '</div>'; // placeholder

        if (indexed) {
            columnClass += " indexedColumn";
            if (!table.showIndexStyle()) {
                columnClass += " noIndexStyle";
            }
            const order: string = indexed.ordering;
            let sorted: boolean = false;
            if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]) {
                sortIcon = '<div class="sortIcon"  data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-placement="top" data-original-title="' +
                        TooltipTStr.ClickToSortDesc + '"' +
                            '><i class="icon xi-arrow-up fa-12"></i>';
                sorted = true;
            } else if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                sortIcon = '<div class="sortIcon" data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="top" data-original-title="' +
                            TooltipTStr.ClickToSortAsc + '"><i class="icon ' +
                            'xi-arrow-down fa-12"></i>';
                sorted = true;
            }

            if (sorted) {
                const keyNames: string[] = table.getKeyName();
                if (keyNames.length > 1) {
                    const sortNum: number = keyNames.indexOf(backName);
                    sortIcon += '<span class="sortNum">' + (sortNum + 1) + '</span>';
                }
                sortIcon += '</div>';
            }

        } else if (progCol.isEmptyCol()) {
            columnClass += " newColumn";
        }

        // remove the beginning and end space
        columnClass = columnClass.trim();

        let disabledProp: string;
        let editableClass: string;
        let colName: string = progCol.getFrontColName();
        if (colName === "") {
            disabledProp = "";
            editableClass = " editable";
        } else {
            disabledProp = "disabled";
            editableClass = "";
        }
        colName = colName.replace(/"/g, "&quot;");

        let prefix: string = progCol.getPrefix();
        let prefixColor: string = "";
        let prefixClass: string = "prefix";

        if (prefix === "") {
            prefix = CommonTxtTstr.Immediates;
            prefixClass += " immediate";
        } else {
            prefixColor = TableComponent.getPrefixManager().getColor(prefix);
        }

        const th: string =
            '<th class="th ' + columnClass + ' col' + colNum + '"' +
            ' style="width:' + width + 'px;">' +
                '<div class="header' + editableClass + ' ">' +
                    '<div class="dragArea">' +
                        '<div class="iconHelper" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body">' +
                        '</div>' +
                    '</div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="topHeader" data-color="' + prefixColor + '">' +
                        sortIcon +
                        '<div class="' + prefixClass + '">' +
                            prefix +
                        '</div>' +
                        '<div class="dotWrap">' +
                            '<div class="dot"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left">' +
                            '<div class="iconHidden"></div>' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<div class="flexWrap flex-mid' + editableClass +
                            '">' +
                            '<input class="editableHead tooltipOverflow ' +
                                'col' + colNum + '"' +
                                ' type="text"  value="' + colName + '"' +
                                ' size="15" spellcheck="false" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'data-original-title="' + xcTooltip.escapeHTML(colName) + '" ' +
                                disabledProp + '/>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return th;
    }

    /**
     * TblManager.hideWorksheetTable
     * @param tableId
     */
    public static hideWorksheetTable(tableId: TableId): void {
        TblManager._removeTableDisplay(tableId);
    }

    /**
     * TblManager.hideTable
     * @param tableId
     */
    public static hideTable(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const tableName: string = table.tableName;
        const $table: JQuery = $('#xcTable-' + tableId);
        const tableHeight: number = $table.height();
        const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
        if ($tableWrap.hasClass("tableHidden")) {
            return;
        }
        $tableWrap.addClass('tableHidden');
        const $dropdown: JQuery = $tableWrap.find('.tableTitle .dropdownBox');
        xcTooltip.changeText($dropdown, tableName);

        const bottomBorderHeight: number = 5;
        $table.height(tableHeight + bottomBorderHeight);
        TblFunc.matchHeaderSizes($table);
        TblFunc.moveFirstColumn(null);

        Log.add(SQLTStr.MinimizeTable, {
            "operation": SQLOps.HideTable,
            "tableName": tableName,
            "tableId": tableId
        });
    }

    /**
     * TblManager.unHideTable
     * @param tableId
     */
    public static unHideTable(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
        if (!$tableWrap.hasClass("tableHidden")) {
            return;
        }
        $tableWrap.removeClass('tableHidden');
        const $dropdown: JQuery = $tableWrap.find('.tableTitle .dropdownBox');
        xcTooltip.changeText($dropdown, TooltipTStr.ViewTableOptions);
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);

        const $table: JQuery = $('#xcTable-' + tableId);
        $table.height('auto');
        TblFunc.matchHeaderSizes($table);
        TblFunc.moveFirstColumn(null);

        Log.add(SQLTStr.MaximizeTable, {
            "operation": SQLOps.UnhideTable,
            "tableName": table.getName(),
            "tableId": tableId
        });
    }

    /**
     * TblManager.sortColumns
     * @param tableId
     * @param sortKey
     * @param direction
     */
    public static sortColumns(
        tableId: TableId,
        sortKey: string,
        direction: string
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const order: ColumnSortOrder = (direction === "reverse") ?
        ColumnSortOrder.descending : ColumnSortOrder.ascending;

        let numCols: number = table.getNumCols();
        let dataCol: ProgCol = null;
        if (table.getCol(numCols).isDATACol()) {
            dataCol = table.removeCol(numCols);
            numCols--;
        }

        const colNumMap: object = {};
        const thLists: object = {};
        const noNameCols: number[] = [];
        const $table: JQuery = $("#xcTable-" + tableId);
        // record original position of each column
        for (let colNum = 1; colNum <= numCols; colNum++) {
            const progCol: ProgCol = table.getCol(colNum);
            const colName: string = progCol.getFrontColName(true);

            // can't use map for columns with no name because of duplicates
            if (colName === "") {
                noNameCols.push(colNum);
            } else {
                colNumMap[colName] = colNum;
            }

            const $th: JQuery = $table.find("th.col" + colNum);
            thLists[colNum] = $th;
        }

        table.sortCols(sortKey, order);

        const $rows: JQuery = $table.find('tbody tr');
        const numRows: number = $rows.length;
        let noNameIndex: number = 0;
        const oldOrder: number[] = []; // to save the old column order
        // loop through each column
        for (let i = 0; i < numCols; i++) {
            const newColNum: number = i + 1;
            const newProgCol: ProgCol = table.getCol(newColNum);
            const newColName: string = newProgCol.getFrontColName(true);
            let oldColNum: number;
            if (newColName === "") {
                oldColNum = noNameCols[noNameIndex];
                noNameIndex++;
            } else {
                oldColNum = colNumMap[newColName];
            }
            const $thToMove: JQuery = thLists[oldColNum];
            $thToMove.removeClass("col" + oldColNum)
                    .addClass("col" + newColNum)
                .find(".col" + oldColNum)
                .removeClass("col" + oldColNum)
                .addClass("col" + newColNum);

            // after move th, the position is different from the oldColNum
            const oldPos: number = $thToMove.index();
            $table.find("th").eq(i).after($thToMove);
            // loop through each row and order each td
            for (let j = 0; j < numRows; j++) {
                const $row: JQuery = $rows.eq(j);
                const $tdToMove: JQuery = $row.find("td").eq(oldPos);
                $tdToMove.removeClass("col" + oldColNum)
                         .addClass("col" + newColNum);
                $row.find("td").eq(i).after($tdToMove);
            }

            oldOrder.push(oldColNum - 1);
        }

        if (dataCol != null) {
            // if data col was removed from sort, put it back
            table.addCol(numCols + 1, dataCol);
            oldOrder.push(numCols);
        }

        TableList.updateTableInfo(tableId);

        Log.add(SQLTStr.SortTableCols, {
            "operation": SQLOps.SortTableCols,
            "tableName": table.getName(),
            "tableId": tableId,
            "sortKey": sortKey,
            "direction": direction,
            "originalOrder": oldOrder,
            "htmlExclude": ['originalOrder']
        });
    }

    /**
     * TblManager.orderAllColumns
     * @param tableId
     * @param order ex. [2, 0, 3, 1]
     */
    public static orderAllColumns(tableId: TableId, order: number[]): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const newCols: ProgCol[] = [];
        const $table: JQuery = $('#xcTable-' + tableId);
        const $ths: JQuery = $table.find('th');
        let thHtml: string = $ths.eq(0)[0].outerHTML;
        const progCols: ProgCol[] = table.tableCols;
        const indices: number[] = [];
        const numCols: number = order.length;
        // column headers
        for (let i = 0; i < numCols; i++) {
            const index: number = order.indexOf(i);
            indices.push(index);
            newCols.push(progCols[index]);
            const $th: JQuery = $ths.eq(index + 1);
            $th.removeClass('col' + (index + 1));
            $th.addClass('col' + (i + 1));
            $th.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                .addClass('col' + (i + 1));
            thHtml += $th[0].outerHTML;

        }

        // column rows and tds
        let tdHtml: string = "";
        $table.find('tbody tr').each((rowNum, el) => {
            tdHtml += '<tr class="row' + rowNum + '">';
            const $tds: JQuery = $(el).find('td');
            tdHtml += $tds.eq(0)[0].outerHTML;
            for (let i = 0; i < numCols; i++) {
                const index: number = indices[i];
                const $td: JQuery = $tds.eq(index + 1);
                $td.removeClass('col' + (index + 1));
                $td.addClass('col' + (i + 1));
                $td.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                   .addClass('col' + (i + 1));
                tdHtml += $td[0].outerHTML;
            }
            tdHtml += '</tr>';
        });

        // update everything
        table.tableCols = newCols;
        $table.find('thead tr').html(thHtml);
        $table.find('tbody').html(tdHtml);

        TableList.updateTableInfo(tableId);
        TblManager._addRowListeners($table.find('tbody'));
    }

    /**
     * TblManager.resizeColumns
     * @param tableId
     * @param resizeTo
     * @param columnNums
     */
    public static resizeColumns(
        tableId: TableId,
        resizeTo: string,
        columnNums?: number[]
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        let columns: ProgCol[] = [];
        let colNums: number[] = [];
        let allCols: boolean = false;
        if (columnNums !== undefined) {
            if (typeof columnNums !== "object") {
                colNums.push(columnNums);
            } else {
                colNums = columnNums;
            }
            columns = colNums.map((colNum) => table.getCol(colNum));
        } else {
            allCols = true;
            columns = table.tableCols;
            colNums = columns.map((_col, index) => (index + 1));
        }

        const $table: JQuery = $('#xcTable-' + tableId);
        const oldColumnWidths: number[] = [];
        const newWidths: number[] = [];
        const oldSizedTo: string[] = [];
        const wasHidden: boolean[] = [];

        for (let i = 0, numCols = columns.length; i < numCols; i++) {
            const $th: JQuery = $table.find('th.col' + colNums[i]);
            columns[i].maximize();
            oldColumnWidths.push(<number>columns[i].width);
            oldSizedTo.push(columns[i].sizedTo);
            columns[i].sizedTo = resizeTo;
            wasHidden.push($th.hasClass("userHidden"));
            const $tds: JQuery = $table.find("td.col" + colNums[i]);
            $th.removeClass("userHidden");
            $tds.removeClass("userHidden");

            newWidths.push(TblFunc.autosizeCol($th, {
                "dblClick": true,
                "minWidth": 17,
                "maxWidth": null,
                "unlimitedWidth": false,
                "includeHeader": (resizeTo === "header" || resizeTo === "all"),
                "fitAll": resizeTo === "all",
                "multipleCols": true,
                "datastore": false
            }));
        }

        TblFunc.matchHeaderSizes($table);

        Log.add(SQLTStr.ResizeCols, {
            "operation": SQLOps.ResizeTableCols,
            "tableName": table.tableName,
            "tableId": tableId,
            "sizeTo": resizeTo,
            "columnNums": colNums,
            "oldColumnWidths": oldColumnWidths,
            "newColumnWidths": newWidths,
            "oldSizedTo": oldSizedTo,
            "wasHidden": wasHidden,
            "allCols": allCols,
            "htmlExclude": ["columnNums", "oldColumnWidths", "newColumnWidths",
                            "oldSizedTo", "wasHidden", "allCols"]
        });
    }

    /**
     * only used for undo / redos sizeToHeader/content/all
     * TblManager.resizeColsToWidth
     * @param tableId
     * @param colNums
     * @param widths
     * @param sizeTo
     * @param wasHidden
     */
    public static resizeColsToWidth(
        tableId: TableId,
        colNums: number[],
        widths: (number| string)[],
        sizeTo: string[],
        wasHidden: boolean[]
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.find('.userHidden').removeClass('userHidden');
        const numCols: number = colNums.length;
        for (let i = 0; i < numCols; i++) {
            const colNum: number = colNums[i];
            if (!widths[i]) {
                console.warn('not found');
            }
            const $th: JQuery = $table.find('th.col' + colNum);
            let width: number | string = widths[i];
            const progCol: ProgCol = table.getCol(colNum);
            if (wasHidden && wasHidden[i]) {
                $th.addClass("userHidden");
                $table.find("td.col" + colNum).addClass("userHidden");
                progCol.minimize();
                width = gHiddenColumnWidth;
            } else {
                progCol.maximize();
            }
            $th.outerWidth(width);
            progCol.width = widths[i];
            progCol.sizedTo = sizeTo[i];
        }
        TblFunc.matchHeaderSizes($table);
    }

    /**
     * TblManager.adjustRowFetchQuantity
     */
    public static adjustRowFetchQuantity(): number {
        // cannot calculate mainFrame height directly because sometimes
        // it may not be visible
        try {
            const $topBar: JQuery = $('.mainPanel.active').find('.topBar');
            const mainFrameTop: number = $topBar[0].getBoundingClientRect().bottom;
            const mainFrameBottom: number = $('#statusBar')[0].getBoundingClientRect().top;
            const mainFrameHeight: number = mainFrameBottom - mainFrameTop;
            const tableAreaHeight: number = mainFrameHeight - gFirstRowPositionTop;
            const maxVisibleRows: number = Math.ceil(tableAreaHeight / gRescol.minCellHeight);
            const buffer: number = 5;
            const rowsNeeded: number = maxVisibleRows + gNumEntriesPerPage + buffer;
            gMaxEntriesPerPage = Math.max(rowsNeeded, gMinRowsPerScreen);
            gMaxEntriesPerPage = Math.ceil(gMaxEntriesPerPage / 10) * 10;
        } catch (e) {
            console.error("adjustRowFetchQuantity error", e);
        }
        return gMaxEntriesPerPage;;
    }

    /**
     * TblManager.highlightCell
     * @param $td
     * @param tableId
     * @param rowNum
     * @param colNum
     * @param options
     * -jsonModal: if it's jsonModal
     * -isShift: if press shiftKey or not
     */
    public static highlightCell(
        $td: JQuery,
        tableId: TableId,
        rowNum: number,
        colNum: number,
        options: {
            jsonModal: boolean
            isShift: boolean
        } = {
            jsonModal: false,
            isShift: false
        }
    ) {
        // draws a new div positioned where the cell is, intead of highlighting
        // the actual cell
        if (options.jsonModal &&
            $td.find('.jsonModalHighlightBox').length !== 0)
        {
            $td.find('.jsonModalHighlightBox').data().count++;
            return;
        }

        let divClass: string;
        if (options.jsonModal) {
            divClass = "jsonModalHighlightBox";
        } else {
            divClass = "highlightBox " + tableId;
        }

        if (options.isShift) {
            divClass += " shiftKey";
        } else {
            // this can be used as a base cell when user press shift
            // to select multi rows
            divClass += " noShiftKey";
        }

        const border: number = 5;
        const width: number = $td.outerWidth() - border;
        const height: number = $td.outerHeight();
        const styling: string = 'width:' + width + 'px;' +
                      'height:' + height + 'px;';
        // can't rely on width/height 100% because of IE

        const $highlightBox: JQuery = $('<div class="' + divClass + '" ' +
                                        'style="' + styling + '" data-count="1">' +
                                        '</div>');

        $highlightBox.data("rowNum", rowNum)
                     .data("colNum", colNum)
                     .data("tableId", tableId);

        $td.append($highlightBox);
        $td.addClass("highlightedCell");
        if (!options.jsonModal && gTables[tableId] != null) {
            const cells = gTables[tableId].highlightedCells;
            if (cells[rowNum] == null) {
                cells[rowNum] = {};
            }
            const cellInfo = {
                colNum: colNum,
                rowNum: rowNum,
                isUndefined: $td.find(".undefined").length > 0,
                val: $td.find(".originalData").text(),
                isNull: $td.find(".null").length > 0,
                isBlank: $td.find(".blank").length > 0,
                isMixed: false,
                type: null
            };
            var $header = $("#xcTable-" + tableId)
                                        .find("th.col" + colNum + " .header");
            if ($header.hasClass("type-mixed")) {
                cellInfo.isMixed = true;
                cellInfo.type = ColManager.getCellType($td, tableId);
            }

            cells[rowNum][colNum] = cellInfo;
        }
    }

    /**
     * TblManager.rehighlightCells
     */
    public static rehighlightCells(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error table");
            return;
        }
        const $table: JQuery = $("#xcTable-" + tableId);
        const lastRow: number = table.currentRowNumber - 1;
        const firstRow: number = lastRow - ($table.find("tbody tr").length - 1);
        for (let rowStr in table.highlightedCells) {
            const row: number = parseInt(rowStr);
            if (row <= lastRow && row >= firstRow) {
                for (let colNumStr in table.highlightedCells[row]) {
                    const colNum: number = Number(colNumStr);
                    const $td: JQuery = $table.find(".row" + row + " .col" + colNum);
                    if (!$td.hasClass("highlightedCell")) {
                        TblManager.highlightCell($td, tableId, row, colNum);
                    }
                }
            }
        }
    }

    /**
     * TblManager.unHighlightCells
     * if no tableId is passed in, will unhighlight all cells in any table
     */
    public static unHighlightCells(tableId?: TableId): void {
        if (tableId != null) {
            $("#xcTable-" + tableId).find(".highlightedCell")
                                    .removeClass(".highlightedCell")
                                    .find(".highlightBox").remove();
            const table: TableMeta = gTables[tableId];
            if (table != null) {
                table.highlightedCells = {};
            }
            return;
        }

        const $highlightBoxs: JQuery = $(".highlightBox");
        if (!$highlightBoxs.length) {
            if (gTables[gActiveTableId] &&
                !$.isEmptyObject(gTables[gActiveTableId].highlightedCells)) {
                // some highlight boxes may not be visible if scrolled
                gTables[gActiveTableId].highlightedCells = {};
            } else {
                return;
            }
        }

        const tIds: object = {};
        $highlightBoxs.each((_index, el) => {
            tIds[$(el).data("tableId")] = true;
        });

        $(".highlightedCell").removeClass("highlightedCell");
        $highlightBoxs.remove();

        for (let tId in tIds) {
            const table: TableMeta = gTables[tId];
            if (table != null) {
                table.highlightedCells = {};
            }
        }
    }

    /**
     * TblManager.highlightColumn
     * @param $el
     * @param keepOthersSelected
     * @param modalHighlight
     */
    public static highlightColumn(
        $el: JQuery,
        keepOthersSelected: boolean,
        modalHighlight: boolean = false
    ): void {
        const index: number = xcHelper.parseColNum($el);
        const tableId: TableId = xcHelper.parseTableId($el.closest('.dataTable'));
        const $table: JQuery = $('#xcTable-' + tableId);
        if (!keepOthersSelected) {
            $('.selectedCell').removeClass('selectedCell');
        }
        $table.find('th.col' + index).addClass('selectedCell');
        $table.find('td.col' + index).addClass('selectedCell');
        if (modalHighlight) {
            $table.find('th.col' + index).addClass("modalHighlighted");
            $table.find('td.col' + index).addClass("modalHighlighted");
        }
    }

    /**
     * TblManager.updateHeaderAndListInfo
     */
    public static updateHeaderAndListInfo(tableId: TableId): void {
        // XXX TODO, fix this hack
        if ($("#xcTheadWrap-" + tableId).length <= 0) {
            return;
        }
        TblManager.updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        const $table: JQuery = $('#xcTable-' + tableId);
        TblFunc.matchHeaderSizes($table);
    }

    /**
     * TblManager.updateTableHeader
     */
    public static updateTableHeader(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error table");
            return;
        }
        const fullTableName: string = table.getName();
        const numCols: number = table.getNumCols() - 1; // skip DATA col
        const $tHead: JQuery = $("#xcTheadWrap-" + tableId).find(".tableTitle .text");

        $tHead.data("cols", numCols)
              .data("title", fullTableName);

        const tableName: string = xcHelper.getTableName(fullTableName);
        const nameHtml: string =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off" spellcheck="false">' +
            '<span class="hashName">#' +
                tableId +
            '</span>';

        const numColHtml: string = '<span class="colNumBracket" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + CommonTxtTstr.NumCol + '">' +
                        ' [' + numCols + ']</span>';

        $tHead.html(nameHtml + numColHtml);
        const $tableName: JQuery = $tHead.find('.tableName');
        TblManager.updateTableNameWidth($tableName);
    }

    /**
     * TblManager.updateTableNameWidth
     * @param $tableName
     */
    public static updateTableNameWidth($tableName: JQuery): void {
        const width: number = xcHelper.getTextWidth($tableName, $tableName.val());
        $tableName.width(width + 1);
    }

    /**
     * TblManager.alignTableEls
     * @param $tableWrap
     */
    public static alignTableEls($tableWrap?: JQuery): void {
        TblFunc.moveTableTitles($tableWrap);
        TblFunc.moveTableDropdownBoxes();
        TblFunc.moveFirstColumn(null);
    }

    /**
     * TblManager.addWaitingCursor
     * @param tableId
     */
    public static addWaitingCursor(tableId: TableId): void {
        $('#xcTableWrap-' + tableId).append('<div class="tableCoverWaiting"></div>');
    }

    /**
     * TblManager.removeWaitingCursor
     * @param tableId
     */
    public static removeWaitingCursor(tableId: TableId): void {
        $('#xcTableWrap-' + tableId).find('.tableCoverWaiting').remove();
    }

    public static freeAllResultSets(): void {
        // Note: use promise is not reliable to send all reqeust to backend
        for (let tableId in gTables) {
            gTables[tableId].freeResultset();
        }
    }

    /**
     * TblManager.freeAllResultSetsSync
     */
    public static freeAllResultSetsSync(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const promises: XDPromise<void>[] = [];
        // check backend table name to see if it exists
        xcHelper.getBackTableSet()
        .then((backTableSet) => {
            for (let tableId in gTables) {
                const table: TableMeta = gTables[tableId];
                const tableName: string = table.getName();

                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.error("Table not in backend!");
                    continue;
                }

                promises.push(table.freeResultset.bind(table));
            }
            return PromiseHelper.chain(promises);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * TblManager.addColListeners
     * @param $table
     * @param tableId
     * @param extraOptions
     */
    public static addColListeners(
        $table: JQuery,
        tableId: TableId,
        extraOptions: {
            modelingMode: boolean
        } = {
            modelingMode: false
        }
    ): void {
        const $thead: JQuery = $table.find('thead tr');
        const $tbody: JQuery = $table.find("tbody");
        let lastSelectedCell: JQuery;
        const dotWrapClick = ($dotWrap: JQuery): void => {
            try {
                const $dot: JQuery = $dotWrap.find(".dot");
                const $topHeader: JQuery = $dotWrap.closest(".topHeader");
                const x: number = $dot[0].getBoundingClientRect().left;
                const y: number = $topHeader[0].getBoundingClientRect().bottom;
                const $menu: JQuery = $("#prefixColorMenu");
                const prefix: string = $topHeader.find(".prefix").text();
                const color: string = $topHeader.data("color");

                xcHelper.dropdownOpen($dotWrap, $menu, {
                    "mouseCoors": {"x": x + 1, "y": y},
                    "floating": true,
                    "prefix": prefix,
                    "color": color
                });
            } catch (e) {
                console.error(e);
            }
        };

        gTables[tableId].highlightedCells = {};

        // listeners on thead
        $thead.on("mousedown", ".flexContainer, .dragArea", (event: any) => {
            const $el: JQuery = $(event.currentTarget);
            if ($("#container").hasClass("columnPicker") ||
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
                return;
            } else if ($el.closest('.dataCol').length !== 0) {
                return;
            }

            let $editableHead: JQuery;
            if ($el.is('.dragArea')) {
                $editableHead = $el.closest('.header').find('.editableHead');
            } else {
                $editableHead = $el.find('.editableHead');
            }

            const colNum: number = xcHelper.parseColNum($editableHead);
            FnBar.focusOnCol($editableHead, tableId, colNum);

            const $target: JQuery = $(event.target);
            const notDropDown: boolean = $target.closest('.dropdownBox').length === 0 &&
                                $target.closest(".dotWrap").length === 0;
            if ($table.find('.selectedCell').length === 0) {
                $('.selectedCell').removeClass('selectedCell');
                lastSelectedCell = $editableHead;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey) {
                 // do not unhighlight column if right-clicking
                if ($el.closest('.selectedCell').length > 0 &&
                    event.which !== 3) {
                    if (notDropDown) {
                        TblManager._unhighlightColumn($editableHead);
                        FnBar.clear();
                        return;
                    }
                } else {
                    TblManager.highlightColumn($editableHead, true, false);
                }
            } else if (event.shiftKey) {
                if (lastSelectedCell && lastSelectedCell.length > 0) {
                    const preColNum: number = xcHelper.parseColNum(lastSelectedCell);
                    const lowNum: number = Math.min(preColNum, colNum);
                    const highNum: number = Math.max(preColNum, colNum);
                    const select: boolean = !$el.closest('th').hasClass('selectedCell');

                    // do not unhighlight column if right-clicking
                    if (!(event.which === 3 && !select)) {
                        for (let i = lowNum; i <= highNum; i++) {
                            const $th: JQuery = $table.find('th.col' + i);
                            const $col: JQuery = $th.find('.editableHead');
                            if ($col.length === 0) {
                                continue;
                            }

                            if (select) {
                                TblManager.highlightColumn($col, true, false);
                            } else if (notDropDown) {
                                TblManager._unhighlightColumn($col);
                            }
                        }
                        if ($table.find('.selectedCell').length === 0) {
                            FnBar.clear();
                        }
                    }
                }
            } else {
                if ($el.closest('.selectedCell').length > 0) {
                    // when not on dropdown and is left click
                    if (notDropDown && event.which === 1) {
                        TblManager.highlightColumn($editableHead, false, false);
                        lastSelectedCell = null;
                    } else {
                        TblManager.highlightColumn($editableHead, true, false);
                    }
                } else {
                    TblManager.highlightColumn($editableHead, false, false);
                    lastSelectedCell = null;
                }
            }

            xcHelper.removeSelectionRange();
            lastSelectedCell = $editableHead;
        });

        $thead.contextmenu((event) => {
            const $evTarget: JQuery = $(event.target);
            const $header: JQuery = $evTarget.closest('.header');
            if ($header.length) {
                const $dotWrap: JQuery = $evTarget.closest('.dotWrap');
                if ($dotWrap.length) {
                    dotWrapClick($dotWrap);
                } else {
                    const $target: JQuery = $header.find('.dropdownBox');
                    const click: any = $.Event("click");
                    click.rightClick = true;
                    click.pageX = event.pageX;
                    $target.trigger(click);
                }
                event.preventDefault();
            }
        });

        $thead.on("mousedown", ".sortIcon", (event) => {
            const $th: JQuery = $(event.currentTarget).closest('th');
            const colNum: number = xcHelper.parseColNum($th);
            FnBar.focusOnCol($th, tableId, colNum);
            TblManager.highlightColumn($th, false, false);
            lastSelectedCell = $th;
        });

        $thead.on("click", ".sortIcon", (event) => {
            const $th: JQuery = $(event.currentTarget).closest("th");
            if (!$th.hasClass("sortable")) {
                return;
            }
            const colNum: number = xcHelper.parseColNum($th);
            const table: TableMeta = gTables[tableId];
            if (table == null) {
                return;
            }
            const progCol: ProgCol = table.getCol(colNum);
            const colName: string = progCol.getBackColName();
            const keyNames: string[] = table.getKeyName();
            const keyIndex: number = keyNames.indexOf(colName);
            let order: XcalarOrderingT = XcalarOrderingT.XcalarOrderingAscending;
            if (keyIndex > -1) {
                var keys = table.backTableMeta.keyAttr;
                if (XcalarOrderingTFromStr[keys[keyIndex].ordering] ===
                    XcalarOrderingT.XcalarOrderingAscending) {
                    order = XcalarOrderingT.XcalarOrderingDescending;
                }
            } else if ($(event.target).closest(".sortDesc").length) {
                order = XcalarOrderingT.XcalarOrderingDescending;
            }
            ColManager.sortColumn([colNum], tableId, order);
        });

        $thead.find(".rowNumHead").mousedown(() => {
            if ($thead.closest('.modalOpen').length ||
                $("#container").hasClass('columnPicker')
            ) {
                return;
            }
            $thead.find('.editableHead').each((_index, el) => {
                TblManager.highlightColumn($(el), true, false);
            });
        });

        $thead.on("mousedown", ".topHeader .dotWrap", (event) => {
            const $th: JQuery = $(event.currentTarget).closest('th');
            const colNum: number = xcHelper.parseColNum($th);
            FnBar.focusOnCol($th, tableId, colNum);
            TblManager.highlightColumn($th, false, false);
            lastSelectedCell = $th;
        });

        $thead.on("click", ".topHeader .dotWrap", (event) => {
            dotWrapClick($(event.currentTarget));
        });

        $thead.on("click", ".dropdownBox", (event: any) => {
            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
            const $el: JQuery = $(event.currentTarget);
            const $th: JQuery = $el.closest("th");
            const isRightClick: boolean = event.rightClick;

            const colNum: number = xcHelper.parseColNum($th);
            const table: TableMeta = gTables[tableId];
            if (table == null) {
                console.error("no table meta");
                return;
            }
            const progCol: ProgCol = table.getCol(colNum);
            const colType: ColumnType = progCol.getType();
            let isNewCol: boolean = false;

            xcTooltip.hideAll();
            TblManager._resetColMenuInputs($el);
            const options = {
                colNum: colNum,
                classes: $el.closest('.header').attr('class'),
                modelingMode: false,
                multipleColNums: null,
                mouseCoors: null,
                offsetX: null
            };

            if (extraOptions.modelingMode) {
                options.modelingMode = true;
            }

            if ($th.hasClass('indexedColumn')) {
                options.classes += " type-indexed";
                const keys: {name: string, ordering: string}[] = table.getKeys();
                const backName: string = progCol.getBackColName();
                const index: {name: string, ordering: string} = keys.find((k) => k.name === backName);
                const order: string = index.ordering;
                if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]) {
                    options.classes += " sortedAsc";
                } else if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                    options.classes += " sortedDesc";
                }
            }

            if ($th.hasClass('dataCol')) {
                $('.selectedCell').removeClass('selectedCell');
                FnBar.clear();
            }

            if ($th.hasClass('newColumn') ||
                options.classes.indexOf('type') === -1) {
                options.classes += " type-newColumn";
                isNewCol = true;
                if ($el.closest('.flexWrap').siblings('.editable').length) {
                    options.classes += " type-untitled";
                }
            }
            if ($th.hasClass("userHidden")) {
                // column is hidden
                options.classes += " type-hidden";
            }

            if ($el.closest('.xcTable').hasClass('emptyTable')) {
                options.classes += " type-emptyTable";
            }

            options.classes += " textAlign" + progCol.textAlign;
            if (progCol.format) {
                options.classes += " format-" + progCol.format;
            }

            options.classes += " sizedTo" + progCol.sizedTo;

            if ($('th.selectedCell').length > 1) {
                options.classes += " type-multiColumn";
                options.multipleColNums = [];
                const types: object = {};
                let tempType: string = "type-" + colType;
                types[tempType] = true;

                let hiddenDetected: boolean = false;
                $('th.selectedCell').each((_index, el) => {
                    const $el: JQuery = $(el);
                    const tempColNum: number = xcHelper.parseColNum($el);
                    options.multipleColNums.push(tempColNum);
                    if (!hiddenDetected && $el.hasClass("userHidden")) {
                        hiddenDetected = true;
                        options.classes += " type-hidden";
                    }

                    tempType = "type-" + table.getCol(tempColNum).getType();
                    if (!types.hasOwnProperty(tempType)) {
                        types[tempType] = true;
                        options.classes += " " + tempType;
                    }
                });
            } else {
                options.classes += " type-singleColumn";
            }

            if (isRightClick) {
                options.mouseCoors = {
                    "x": event.pageX,
                    "y": $el.offset().top + 34
                };
            } else {
                options.offsetX = 5;
            }
            const colMenu: ColMenu = TableComponent.getMenu().getColMenu();
            colMenu.setUnavailableClassesAndTips(colType, isNewCol);
            const $menu: JQuery = $("#colMenu");
            xcHelper.dropdownOpen($el, $menu, options);
        });

        $thead.on('mousedown', '.colGrab', (event) => {
            if (event.which !== 1) {
                return;
            }

            TblAnim.startColResize($(event.currentTarget), event, null);
        });

        $thead.on('mousedown', '.dragArea', (event) => {
            if (event.which !== 1) {
                return;
            }
            if (event.ctrlKey || event.shiftKey || event.metaKey) {
                if ($(event.target).is('.iconHelper')) {
                    return;
                }
            }
            const $headCol: JQuery = $(event.currentTarget).parent().parent();
            TblAnim.startColDrag($headCol, event);
        });

        $thead.on('mousedown', '.editableHead', (event: any) => {
            if (event.which !== 1) {
                return;
            }
            const $el: JQuery = $(event.currentTarget);
            if ($el.closest('.editable').length) {
                return;
            }
            if ($("#container").hasClass('columnPicker') ||
                DagEdit.isEditMode() ||
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
                return;
            }
            if (isSystemMac && event.ctrlKey) {
                return;
            }
            const headCol: JQuery = $el.closest('th');
            TblAnim.startColDrag(headCol, event);
        });

        $thead.on("keydown", ".editableHead", (event) => {
            const $input: JQuery = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("disabled")) {
                const colName: string = $input.val().trim();
                const colNum: number = xcHelper.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColName($input, tableId, colNum)
                ) {
                    return false;
                } else {
                    StatusBox.forceHide(); // hide previous error mesage if any
                }

                ColManager.renameCol(colNum, tableId, colName);
            }
        });

        $thead.on("blur", ".editableHead", (event) => {
            const $input: JQuery = $(event.target);
            if (!$input.prop("disabled") &&
                $input.closest('.selectedCell').length === 0
            ) {
                $input.val("");
                const $activeTarget: JQuery = gMouseEvents.getLastMouseDownTarget();

                if (!$activeTarget.closest('.header')
                                  .find('.flex-mid')
                                  .hasClass('editable')
                ) {
                    $('#fnBar').removeClass("disabled");
                }
            }
        });

        // listeners on tbody
        $tbody.on("mousedown", "td", (event) => {
            const $td: JQuery = $(event.currentTarget);
            const $el: JQuery = $td.children('.clickable');

            if ($("#container").hasClass('columnPicker') ||
                $("#container").hasClass('dfEditState') ||
                $("#mainFrame").hasClass("modalOpen")
            ) {
                // not focus when in modal
                return;
            }

            if (event.which !== 1 || $el.length === 0) {
                return;
            }
            if ($td.hasClass('jsonElement')) {
                TblManager.unHighlightCells();
                if ($('#mainFrame').hasClass('modalOpen') &&
                    !$td.closest('.xcTableWrap').hasClass('jsonModalOpen')
                ) {
                    return;
                }
                if ($(event.target).closest(".pop").length) {
                    return;
                }
            }

            const colNum: number = xcHelper.parseColNum($td);
            const rowNum: number = xcHelper.parseRowNum($td.closest("tr"));
            let isUnSelect: boolean = false;

            xcTooltip.hideAll();
            TblManager._resetColMenuInputs($el);

            let $highlightBoxs: JQuery = $(".highlightBox");
            const otherTIds: object = {};
            $highlightBoxs.each((_index, el) => {
                const $el: JQuery = $(el);
                const cellTId: TableId = $el.data("tableId");
                if (cellTId !== tableId) {
                    otherTIds[cellTId] = true;
                    $el.closest("td").removeClass("highlightedCell");
                    $el.remove();
                }
            });

            for (let tId in otherTIds) {
                gTables[tId].highlightedCells = {};
            }

            $highlightBoxs = $(".highlightBox");

            const singleSelection = () => {
                if ($highlightBoxs.length === 1 &&
                    $td.find('.highlightBox').length > 0)
                {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        TblManager._unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    TblManager.unHighlightCells();
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            };

            const multiSelection = () => {
                // remove old shiftKey and noShiftKey class
                $highlightBoxs.removeClass("shiftKey")
                            .removeClass("noShiftKey");

                if ($td.find('.highlightBox').length > 0) {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        TblManager._unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    const $jsonElement: JQuery = $highlightBoxs.filter((_index, el) => {
                        return $(el).closest(".jsonElement").length !== 0;
                    });
                    if ($jsonElement.length) {
                        TblManager.unHighlightCells();
                    }
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            };

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey)
            {
                // ctrl key: multi selection
                multiSelection();
            } else if (event.shiftKey) {
                // shift key: multi selection from minIndex to maxIndex
                const $lastNoShiftCell: JQuery = $highlightBoxs.filter((_index, el) => {
                    return $(el).hasClass("noShiftKey");
                });

                if ($lastNoShiftCell.length === 0) {
                    singleSelection();
                } else {
                    const lastColNum: number = $lastNoShiftCell.data("colNum");
                    if (lastColNum !== colNum) {
                        // when colNum changes
                        multiSelection();
                    } else {
                        // re-hightlight shift key cell
                        $highlightBoxs.each((_index, el) => {
                            const $el: JQuery = $(el);
                            if ($el.hasClass("shiftKey")) {
                                TblManager._unHighlightCell($el);
                            }
                        });

                        const $curTable: JQuery = $td.closest(".xcTable");
                        const baseRowNum: number = $lastNoShiftCell.data("rowNum");

                        const minIndex: number = Math.min(baseRowNum, rowNum);
                        const maxIndex: number = Math.max(baseRowNum, rowNum);
                        for (let r = minIndex; r <= maxIndex; r++) {
                            const $cell: JQuery = $curTable.find(".row" + r + " .col" + colNum);
                            // in case double added hightlight to same cell
                            TblManager._unHighlightCell($cell);

                            if (r === baseRowNum) {
                                TblManager.highlightCell($cell, tableId, r, colNum);
                            } else {
                                TblManager.highlightCell($cell, tableId, r, colNum, {
                                    "isShift": true,
                                    "jsonModal": false
                                });
                            }
                        }
                    }
                }
            } else {
                // select single cell
                singleSelection();
            }

            xcHelper.dropdownOpen($el, $('#cellMenu'), {
                "colNum": colNum,
                "rowNum": rowNum,
                "classes": "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": event.pageY},
                "shiftKey": event.shiftKey,
                "isMultiCol": TblManager._isMultiColumn(),
                "isUnSelect": isUnSelect,
                "floating": true
            });
        });

        let clicks: number = 0;
        let dblClickTimer: number;
        let $lastTd: JQuery;

        // used for double clicks
        $tbody.on("mousedown", "td", (event) => {
            if (event.which !== 1) {
                return;
            }

            const $td: JQuery = $(event.currentTarget);
            if ($("#container").hasClass("formOpen") &&
                !$td.hasClass("jsonElement")) {
                // no json modal for regular tds if form is open
                return;
            }

            clicks++;
            if (clicks === 2 && $td.is($lastTd)) {
                clicks = 0;
                clearTimeout(dblClickTimer);
                const colNum: number = xcHelper.parseColNum($td);
                if (colNum === 0) {
                    return;
                }
                const progCol: ProgCol = gTables[tableId].getCol(colNum);
                const type: ColumnType = progCol.getType();
                let showModal: boolean = false;
                if (type === ColumnType.object || type === ColumnType.array ||
                    $td.hasClass("truncated")) {
                    showModal = true;
                } else if (type === ColumnType.mixed) {
                    const cellType: ColumnType = ColManager.getCellType($td, tableId);
                    if (cellType === ColumnType.object ||
                        cellType === ColumnType.array) {
                        showModal = true;
                    }
                }
                if (showModal) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                    JSONModal.show($td, {type: type});
                }
            } else {
                clicks = 1;
                $lastTd = $td;
                dblClickTimer = window.setTimeout(() => {
                    clicks = 0;
                }, 500);
            }
        });

        $tbody[0].oncontextmenu = (event) => {
            const $el: JQuery = $(event.target);
            const $td: JQuery = $el.closest("td");
            const $div: JQuery = $td.children('.clickable');
            const isDataTd: boolean = $td.hasClass('jsonElement');
            if ($div.length === 0) {
                // when click sth like row marker cell, rowGrab
                return false;
            }
            if ($("#container").hasClass('columnPicker') ||
                $("#container").hasClass('dfEditState') ||
                $("#mainFrame").hasClass("modalOpen")
            ) {
                $el.trigger('click');
                // not focus when in modal
                return false;
            }

            const colNum: number = xcHelper.parseColNum($td);
            const rowNum: number = xcHelper.parseRowNum($td.closest("tr"));

            xcTooltip.hideAll();
            TblManager._resetColMenuInputs($el);

            if ($td.find(".highlightBox").length === 0) {
                // same as singleSelection()
                TblManager.unHighlightCells();
                TblManager.highlightCell($td, tableId, rowNum, colNum);
            }

            xcHelper.dropdownOpen($div, $("#cellMenu"), {
                "colNum": colNum,
                "rowNum": rowNum,
                "classes": "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": event.pageY},
                "isMultiCol": TblManager._isMultiColumn(),
                "isDataTd": isDataTd,
                "floating": true
            });

            return false;
        };

        $thead.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<HTMLElement>event.currentTarget);
        });
    }

    private static _unHighlightCell($td: JQuery): void {
        if (!$td.hasClass("highlightedCell")) {
            return;
        }
        $td.removeClass("highlightedCell");
        $td.find(".highlightBox").remove();
        const tableId: TableId = xcHelper.parseTableId($td.closest(".xcTable"));
        const colNum: number = xcHelper.parseColNum($td);
        const rowNum: number = xcHelper.parseRowNum($td.closest("tr"));
        const cells: object = gTables[tableId].highlightedCells;

        if (cells[rowNum]) {
            delete cells[rowNum][colNum];
            if ($.isEmptyObject(cells[rowNum])) {
                delete cells[rowNum];
            }
        }
    }

    private static _resetColMenuInputs($el: JQuery): void {
        const tableId: TableId = xcHelper.parseTableId($el.closest('.xcTableWrap'));
        const $menu: JQuery = $('#colMenu-' + tableId);
        $menu.find('.gb input').val("groupBy");
        $menu.find('.numFilter input').val(0);
        $menu.find('.strFilter input').val("");
        $menu.find('.mixedFilter input').val("");
        $menu.find('.regex').next().find('input').val("*");
    }

    private static _unhighlightColumn($el: JQuery): void {
        const colNum: number = xcHelper.parseColNum($el);
        const tableId: TableId = xcHelper.parseTableId($el.closest('.dataTable'));
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.find('th.col' + colNum).removeClass('selectedCell');
        $table.find('td.col' + colNum).removeClass('selectedCell');
    }

    /**
     * TblManager.generateTheadTbody
     * @param tableId
     */
    public static generateTheadTbody(tableId: TableId): string {
        const table: TableMeta = gTables[tableId];
        let newTableHtml: string =
            '<thead>' +
              '<tr>' +
                '<th style="width: 50px;" class="col0 th rowNumHead">' +
                  '<div class="header">' +
                    '<input value="" spellcheck="false" disabled title="' +
                    TooltipTStr.SelectAllColumns + '" ' +
                    'data-toggle="tooltip"' +
                    ' data-placement="top" data-container="body">' +
                  '</div>' +
                '</th>';

        const numCols: number = table.getNumCols();
        for (let colNum = 1; colNum <= numCols; colNum++) {
            const progCol: ProgCol = table.getCol(colNum);
            if (progCol.isDATACol()) {
                let width: number | string;
                let thClass: string = "";
                if (progCol.hasMinimized()) {
                    width = gHiddenColumnWidth;
                    thClass = " userHidden";
                } else {
                    width = progCol.getWidth();
                }
                if (!progCol.hasMinimized() && <string>width === 'auto') {
                    width = 400;
                }
                newTableHtml += TblManager._generateDataHeadHTML(colNum, thClass, width);
            } else {
                newTableHtml += TblManager.getColHeadHTML(colNum, tableId);
            }
        }

        newTableHtml += '</tr></thead><tbody></tbody>';

        return newTableHtml;
    }

    private static _generateDataHeadHTML(
        colNum: number,
        thClass: string,
        width: number | string
    ): string {
        const newTable: string =
            '<th class="col' + colNum + ' th dataCol' + thClass + '" ' +
                'style="width:' + width + 'px;">' +
                '<div class="header type-data">' +
                    '<div class="dragArea"></div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left"></div>' +
                        '<div class="flexWrap flex-mid">' +
                            '<input value="DATA" spellcheck="false" ' +
                                ' class="dataCol col' + colNum + '"' +
                                ' data-container="body"' +
                                ' data-toggle="tooltip" data-placement="top" ' +
                                '" title="raw data" disabled>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return newTable;
    }

    private static _isMultiColumn(): boolean {
        const table: TableMeta = gTables[gActiveTableId];
        if (!table) {
            return false;
        }

        let lastColNum: number;
        let multiCol: boolean = false;
        for (let row in table.highlightedCells) {
            for (let colNum in table.highlightedCells[row]) {
                if (lastColNum == null) {
                    lastColNum = Number(colNum);
                } else if (lastColNum !== Number(colNum)) {
                    multiCol = true;
                    break;
                }
            }
        }
        return multiCol;
    }

    /* Unit Test Only */
    public static __testOnly__ = (function() {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            return {
                vefiryTableType: TblManager._verifyTableType,
                setTablesToReplace: TblManager._setTablesToReplace,
                animateTableId: TblManager._animateTableId,
                tagOldTables: TblManager._tagOldTables,
                removeOldTables: TblManager._removeOldTables
            }
        }
    }());
    /* End Of Unit Test Only */
}