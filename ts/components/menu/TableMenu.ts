class TableMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "tableMenu";
        const subMenuId: string = "tableSubMenu";
        super(menuId, subMenuId);
    }

    public setUnavailableClasses(): void {
        const $menu: JQuery = this._getMenu();
        let $lis: JQuery = $menu.find(".exportTable, .multiCast, .corrAgg, .jupyterTable, .advancedOptions");
        if (DagView.getActiveTab() instanceof DagTabPublished) {
            $lis.addClass("xc-hidden");
        } else {
            $lis.removeClass("xc-hidden");
        }
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

            const tableId: TableId = $tableMenu.data('tableId');
            const allColNames: string[] = getAllColNames(tableId);
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
            TblManager.makeTableNoDelete(tableName);
        });

        $subMenu.find(".removeNoDelete").mouseup((event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $tableMenu.data("tableId");
            TblManager.removeTableNoDelete(tableId);
        });

        $subMenu.find(".generateIcv").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const currentNode: DagNode = this._getCurrentNode();
            if (currentNode != null) {
                const input = xcHelper.deepCopy(currentNode.getParam());
                input.icv = true;
                const parents = currentNode.getParents();
                if (parents.length > 0) {
                    this._createNodeAndShowForm(currentNode.getType(), null, {
                        input: input,
                        parentNodeId: parents[0].getId()
                    });
                }
            }
        });

        $subMenu.find(".complementTable").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const currentNode: DagNode = this._getCurrentNode();
            if (currentNode != null && currentNode instanceof DagNodeFilter) {
                const param: DagNodeFilterInputStruct = currentNode.getParam();
                const input = xcHelper.deepCopy(param);
                let evalString = param.evalString;
                // remove or add not() for complement
                if (evalString.indexOf("not(") === 0 &&
                    evalString[evalString.length - 1] === ")"
                ) {
                    evalString = evalString.slice(4, -1);
                } else {
                    evalString = "not(" + evalString + ")";
                }
                input.evalString = evalString;

                const parents = currentNode.getParents();
                if (parents.length > 0) {
                    this._createNodeAndShowForm(DagNodeType.Filter, null, {
                        input: input,
                        parentNodeId: parents[0].getId()
                    });
                }
            }
        });

        $subMenu.find(".skewDetails").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            SkewInfoModal.Instance.show(gTables[tableId]);
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
            input?: object,
            parentNodeId?: DagNodeId
        }
    ): void {
        try {
            options = options || {};
            const input: object = options.input || this._getNodeParam(type, tableId, options);
            const node: DagNode = this._addNode(type, input, options.subType, options.parentNodeId);
            this._openOpPanel(node, []);
        } catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }

    private _getNodeParam(
        type: DagNodeType,
        tableId: TableId,
        options: {
            subType?: DagNodeSubType 
        }
    ): object {
        switch (type) {
            case DagNodeType.Export:
            case DagNodeType.Jupyter:
                return null;
            case DagNodeType.Map:
                if (options.subType === DagNodeSubType.Cast) {
                    return {
                        eval: this._smartSuggestTypes(tableId),
                        icv: false
                    };
                } else {
                    return null;
                }
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