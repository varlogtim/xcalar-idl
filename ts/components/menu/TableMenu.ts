class TableMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "tableMenu";
        const subMenuId: string = "tableSubMenu";
        super(menuId, subMenuId);
    }

    protected _getHotKeyEntries(): ReadonlyArray<[string, string]> {
        return [
            ["a", "advancedOptions"],
            ["b", "createDf"],
            ["c", "corrAgg"],
            ["d", "deleteTable"],
            ["e", "exportTable"],
            ["j", "jupyterTable"],
            ["m", "hideTable"],
            ["s", "multiCast"],
            ["t", "makeTempTable"],
            ["u", "unhideTable"],
            ["x", "exitOp"],
        ];
    }

    protected _addMenuActions(): void {
        this._addMainMenuActions();
        this._addSubMenuActions();
    }

    private _addMainMenuActions(): void {
        const $tableMenu: JQuery = this._getMenu();

        $tableMenu.on('mouseup', '.hideTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const tableId: TableId = $tableMenu.data('tableId');
            TblManager.hideTable(tableId);
        });

        $tableMenu.on('mouseup', '.unhideTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            TblManager.unHideTable(tableId);
        });

        $tableMenu.on('mouseup', '.makeTempTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const tableId: TableId = $tableMenu.data('tableId');
            TblManager.sendTableToTempList([tableId], null, null);
        });

        $tableMenu.on('mouseup', '.deleteTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            // TblManager.sendTablesToTrash(tableId, TableType.Active);

            const msg: string = xcHelper.replaceMsg(TblTStr.DelMsg, {"table": tableName});
            Alert.show({
                "title": TblTStr.Del,
                "msg": msg,
                "onConfirm": () => {
                    TblManager.deleteTables([tableId], TableType.Active, false, false)
                    .then(() => {
                        MemoryAlert.Instance.check(true);
                    });
                }
            });
        });

        $tableMenu.on('mouseup', '.exportTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            this._createNodeAndShowForm(DagNodeType.Export);
        });

        $tableMenu.on('mouseup', '.exitOp', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            if ($li.hasClass("exitExt")) {
                BottomMenu.close();
            } else if ($li.hasClass("exitDFEdit")) {
                DagEdit.off();
            }  else if ($li.hasClass("exitFunctionBar")) {
                FnBar.unlock();
            } else {
                MainMenu.closeForms();
            }
        });

        $tableMenu.on('mouseup', '.copyTableName', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const valArray: string[] = [];
            const tblName: string = $(".tblTitleSelected .tableName").val();
            const tblId: string = $(".tblTitleSelected .hashName").text();
            valArray.push(tblName + tblId);
            this._copyToClipboard(valArray);
        });

        // xx currently not visible
        $tableMenu.on('mouseup', '.copyColNames', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            let getAllColNames = (tableId): string[] => {
                const colNames: string[] = [];
                gTables[tableId].tableCols.forEach((progCol: ProgCol) => {
                    if (!progCol.isDATACol()) {
                        colNames.push(progCol.getFrontColName(false));
                    }
                });
                return colNames;
            };

            // const wsId: string = WSManager.getActiveWS();
            const tableId: TableId = $tableMenu.data('tableId');
            const allColNames: string[] = getAllColNames(tableId);
            // WSManager.getWorksheets()[wsId].tables.forEach((tableId) => {
            //     const tableColNames: string[] = getAllColNames(tableId);
            //     for (let i = 0; i < tableColNames.length; i++) {
            //         const value: string = tableColNames[i];
            //         if (allColNames.indexOf(value) === -1) {
            //             allColNames.push(value);
            //         }
            //     }
            // });
            this._copyToClipboard(allColNames, true);
        });

        $tableMenu.on('mouseup', '.multiCast', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            this._createNodeAndShowForm(DagNodeType.Map, tableId, {
                subType: DagNodeSubType.Cast
            });
        });

        $tableMenu.on('mouseup', '.corrAgg', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            AggModal.corrAgg(tableId);
        });

        // operation for move to worksheet and copy to worksheet
        $tableMenu.on('mouseenter', '.moveTable', () => {
            const $subMenu = this._getSubMenu();
            const $list: JQuery = $subMenu.find(".list");
            $list.empty().append(WSManager.getWSLists(false));
        });

        $tableMenu.on('mouseup', '.createDf', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const $dagWrap: JQuery = $('#dagWrap-' + tableId);
            DFCreateView.show($dagWrap);
        });

        $tableMenu.on('mouseup', '.jupyterTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            this._createNodeAndShowForm(DagNodeType.Jupyter);
        });
    }

    private _addSubMenuActions(): void {
        const $tableMenu: JQuery = this._getMenu();
        const $subMenu: JQuery = this._getSubMenu();
        const $allMenus: JQuery = $tableMenu.add($subMenu);

       new MenuHelper($subMenu.find(".dropDownList"), {
            onSelect: ($li) => {
                const $input: JQuery = $li.closest(".dropDownList").find(".wsName");
                $input.val($li.text()).focus();
            }
        }).setupListeners();

        $subMenu.on('mouseup', '.jupyterFullTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            JupyterPanel.publishTable(tableName);
        });

        $subMenu.on('keypress', '.jupyterSampleTable input', (event) => {
            if (event.which !== keyCode.Enter) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            const $input: JQuery = $(event.currentTarget);
            const numRows: number = $input.val().trim();
            const max: number = Math.min(10000, gTables[tableId].resultSetCount);
            const isValid: boolean = xcHelper.validate([
                {
                    "$ele": $input,
                    "side": "left"
                },
                {
                    "$ele": $input,
                    "error": xcHelper.replaceMsg(JupyterTStr.SampleNumError,
                                                {number: max}),
                    "side": "left",
                    "check": () => {
                        return (numRows < 1 || numRows > max);
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }

            JupyterPanel.publishTable(tableName, numRows);
            $input.val("");
            $input.blur();
            xcMenu.close($allMenus);
        });

        $subMenu.on('keypress', '.moveTable input', (event) => {
            if (event.which === keyCode.Enter) {
                const tableId: TableId = $tableMenu.data('tableId');
                const $input: JQuery = $(event.currentTarget);
                const wsName: string = $input.val().trim();
                const $option: JQuery = $input.siblings(".list").find("li").filter((_index, element) => {
                    return ($(element).text() === wsName);
                });
                const isValid: boolean = xcHelper.validate([
                    {
                        "$ele": $input,
                        "side": "left"
                    },
                    {
                        "$ele": $input,
                        "error": ErrTStr.InvalidWSInList,
                        "side": "left",
                        "check": () => {
                            return ($option.length === 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return false;
                }

                const wsId: string = $option.data("ws");
                WSManager.moveTable(tableId, wsId);
                $input.val("");
                $input.blur();
                xcMenu.close($allMenus);
            }
        });

        $subMenu.on('mouseup', '.moveLeft', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const curIndex: number = WSManager.getTableRelativePosition(tableId);
            TblFunc.reorderAfterTableDrop(tableId, curIndex, curIndex - 1, {
                moveHtml: true
            });
        });

        $subMenu.on('mouseup', '.moveRight', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const curIndex: number = WSManager.getTableRelativePosition(tableId);
            TblFunc.reorderAfterTableDrop(tableId, curIndex, curIndex + 1, {
                moveHtml: true
            });
        });

        $subMenu.on("mouseup", ".sortByName li", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._sortHelper(ColumnSortType.name, $(event.currentTarget));
        });

        $subMenu.on("mouseup", ".sortByType li", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._sortHelper(ColumnSortType.type, $(event.currentTarget));
        });

        $subMenu.on("mouseup", ".sortByPrefix li", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._sortHelper(ColumnSortType.prefix, $(event.currentTarget));
        });

        $subMenu.on('mouseup', '.resizeCols li', (event) => {
            if (event.which !== 1) {
                return;
            }

            const $li: JQuery = $(event.currentTarget);
            const tableId: TableId = $tableMenu.data('tableId');
            let resizeTo: string;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'header';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'all';
            } else {
                resizeTo = 'contents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(() => {
                TblManager.resizeColumns(tableId, resizeTo);
            }, 0);
        });

        $subMenu.find(".addNoDelete").mouseup((event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $tableMenu.data("tableId");
            const tableName: string = gTables[tableId].getName();
            Dag.makeTableNoDelete(tableName);
            TblManager.makeTableNoDelete(tableName);
        });

        $subMenu.find(".removeNoDelete").mouseup((event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $tableMenu.data("tableId");
            Dag.removeNoDelete(tableId);
            TblManager.removeTableNoDelete(tableId);
        });

        $subMenu.find(".generateIcv").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            Dag.generateIcvTable(tableId, tableName);
        });

        $subMenu.find(".complementTable").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            Dag.generateComplementTable(tableName);
        });

        $subMenu.find(".skewDetails").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            SkewInfoModal.show(tableId);
        });
    }

    private _sortHelper(sortKey: string, $li: JQuery): void {
        let direction: string;
        if ($li.hasClass("sortForward")) {
            direction = "forward";
        } else {
            direction = "reverse";
        }
        const tableId: TableId = this._getMenu().data("tableId");
        // could be long process so we allow the menu to close first
        setTimeout(() => {
            TblManager.sortColumns(tableId, sortKey, direction);
        }, 0);
    }

    private _createNodeAndShowForm(
        type: DagNodeType,
        tableId?: TableId,
        options?: {
            subType?: DagNodeSubType
        }
    ): void {
        try {
            options = options || {};
            const input: object = this._getNodeParam(type, tableId);
            const node: DagNode = this._addNode(type, input, options.subType);
            this._openOpPanel(node, []);
        } catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }

    private _getNodeParam(type: DagNodeType, tableId?: TableId): object {
        switch (type) {
            case DagNodeType.Export:
            case DagNodeType.Jupyter:
                return null;
            case DagNodeType.Map:
                // multi cast case
                const evals = this._smartSuggestTypes(tableId);
                return {
                    eval: evals,
                    icv: false
                };
            default:
                throw new Error("Unsupported type!");
        }
    }

    private _smartSuggestTypes(tableId: TableId): {
        evalString: string, newField: string
    }[] {
        try {
            const evals: {evalString: string, newField: string}[] = [];
            const $table: JQuery = $("#xcTable-" + tableId);
            const $tbody: JQuery = $table.find("tbody").clone(true);
            $tbody.find("tr:gt(17)").remove();
            $tbody.find(".col0").remove();
            $tbody.find(".jsonElement").remove();

            const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
            gTables[tableId].tableCols.forEach((progCol: ProgCol, index) => {
                const colType: ColumnType = progCol.getType();
                if (validTypes.includes(colType)) {
                    const colNum: number = index + 1;
                    const newType: ColumnType = this._suggestColType($tbody, colNum, colType);
                    if (colType !== newType) {
                        const colName: string = progCol.getBackColName();
                        const mapStr: string = xcHelper.castStrHelper(colName, newType);
                        const newColName = xcHelper.parsePrefixColName(colName).name;
                        evals.push({
                            evalString: mapStr,
                            newField: newColName
                        });
                    }
                }
            });

            return evals;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    private _suggestColType(
        $tbody: JQuery,
        colNum: number,
        origginalType: ColumnType
    ): ColumnType {
        if (origginalType === ColumnType.float ||
            origginalType === ColumnType.boolean ||
            origginalType === ColumnType.mixed
        ) {
            return origginalType;
        }

        const $tds: JQuery = $tbody.find("td.col" + colNum);
        const datas: string[] = [];

        $tds.each(function() {
            const val: string = $(this).find('.originalData').text();
            datas.push(val);
        });
        return xcSuggest.suggestType(datas, origginalType);
    }
}