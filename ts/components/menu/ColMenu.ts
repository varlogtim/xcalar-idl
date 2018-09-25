class ColMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "colMenu";
        const subMenuId: string = "colSubMenu";
        super(menuId, subMenuId);
    }

    /**
     *
     * @param colType
     * @param isNewCol
     */
    public setUnavailableClassesAndTips(
        colType: ColumnType,
        isNewCol: boolean
    ): void {
        const $menu: JQuery = this._getMenu();
        let $lis: JQuery = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .map, .operations, .profile, .corrAgg, " +
                ".extensions, .changeDataType, .format, .roundToFixed, " +
                ".project, .union");
        $lis.removeClass("unavailable");
        xcTooltip.remove($lis);
        if (colType === ColumnType.object || colType === ColumnType.array) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, .join, " +
                ".map, .operations, .profile, .corrAgg, .extensions, " +
                ".changeDataType, .format, .roundToFixed, .union");
            $lis.addClass("unavailable");
            if (colType === ColumnType.object) {
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateObject
                });
            } else if (colType === ColumnType.array) {
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateArray
                });
            }
        } else if (isNewCol) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .operations, .profile, .corrAgg, .extensions, " +
                ".changeDataType, .format, .roundToFixed, .project, .union");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ErrTStr.InvalidOpNewColumn
            });
        } else if (colType === ColumnType.mixed) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .operations, .profile, .corrAgg, " +
                ".roundToFixed");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        }  else if (colType === ColumnType.undefined) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                    ".join, .operations, .profile, .corrAgg, " +
                    ".extensions, .format, .roundToFixed, " +
                    ".project, .union");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        } else if (colType === ColumnType.timestamp) {
            $lis = $menu.find(".groupby, .aggregate, .filter, " +
            ".join, .operations, .profile, .corrAgg, " +
            ".extensions, .format, .roundToFixed, " +
            ".union");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        } else if ([ColumnType.integer, ColumnType.float, ColumnType.string,
                    ColumnType.boolean, ColumnType.number]
                    .indexOf(colType) === -1) {
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        }
    }

    protected _getHotKeyEntries(): ReadonlyArray<[string, string]> {
        return [
            ["a", "aggregate"],
            ["c", "corrAgg"],
            ["d", "hideColumn.newColumn"],
            ["e", "extensions"],
            ["f", "filter"],
            ["g", "groupby"],
            ["h", "hideColumn"],
            ["j", "join"],
            ["m", "map"],
            ["p", "profile"],
            ["s", "sort"],
            ["t", "changeDataType"],
            ["x", "exitOp"],
            ["u", "union"],
        ];
    }

    protected _addMenuActions(): void {
        this._addMainMenuActions();
        this._addSubMenuActions();
    }

    private _addMainMenuActions(): void {
        const $colMenu: JQuery = this._getMenu();

        // add new column
        $colMenu.on('mouseup', '.addColumn', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNum: number = $colMenu.data('colNum');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.addNewCol(colNum, tableId, ColDir.Right);
        });

        $colMenu.on('mouseup', '.hideColumn', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.hideCol(colNums, tableId);
        });

        $colMenu.on('mouseup', '.minimize', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.minimizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.maximize', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.maximizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.corrAgg', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            AggModal.corrAgg(tableId, colNums, colNums);
        });

        $colMenu.on('mouseup', '.join', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            if (gTables[tableId].modelingMode) {
                this._creatNode(DagNodeType.Join, tableId, colNums);
            } else {
                JoinView.show(tableId, colNums);
            }
        });

        $colMenu.on('mouseup', '.union', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            if (gTables[tableId].modelingMode) {
                this._creatNode(DagNodeType.Set, tableId, colNums);
            } else {
                UnionView.show(tableId, colNums);
            }
        });

        $colMenu.on('mouseup', '.functions', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const tableId: TableId = $colMenu.data('tableId');
            const func: string = $li.data('func');
            const colNums: number[] = $colMenu.data("colNums");
            const triggerColNum: number = $colMenu.data("colNum");
            if (gTables[tableId].modelingMode) {
                let type: DagNodeType = <DagNodeType>func;
                if (func === "group by") {
                    type = DagNodeType.GroupBy;
                }
                this._creatNode(type, tableId, colNums);
            } else {
                OperationsView.show(tableId, colNums, func, {
                    triggerColNum: triggerColNum
                });
            }
        });

        $colMenu.on('mouseup', '.profile', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNum: number = $colMenu.data('colNum');
            const tableId: TableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum);
        });

        $colMenu.on('mouseup', '.project', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data("colNums");
            if (gTables[tableId].modelingMode) {
                this._creatNode(DagNodeType.Project, tableId, colNums);
            } else {
                ProjectView.show(tableId, colNums);
            }
        });

        $colMenu.on('mouseup', '.extensions', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNum: number = $colMenu.data('colNum');
            const tableId: TableId = $colMenu.data('tableId');
            ExtensionManager.openView(colNum, tableId);
        });

        $colMenu.on('mouseup', '.exitOp', (event) => {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            if ($li.hasClass("exitExt")) {
                BottomMenu.close();
            } else if ($li.hasClass("exitDFEdit")) {
                DagEdit.off();
            } else if ($li.hasClass("exitFunctionBar")) {
                FnBar.unlock();
            } else {
                MainMenu.closeForms();
            }
        });
    }

    private _addSubMenuActions(): void {
        const $colMenu: JQuery = this._getMenu();
        const $subMenu: JQuery = this._getSubMenu();
        const $colMenus: JQuery = $colMenu.add($subMenu);
        const $allMenus: JQuery = $colMenus.add($('#cellMenu'));

        $subMenu.on('click', '.inputAction', (event) => {
            $(event.currentTarget).siblings('input').trigger(fakeEvent.enter);
        });

        $subMenu.on('keypress', 'input', (event) => {
            if (event.which === keyCode.Enter) {
                var $input = $(event.currentTarget);
                if ($input.closest('.extensions').length) {
                    $input.siblings('.inputAction').find('.extensions')
                                                   .trigger(fakeEvent.mouseup);
                }
            }
        });

        $subMenu.on('keypress', '.rename input', (event) => {
            if (event.which === keyCode.Enter) {
                const $input: JQuery = $(event.currentTarget);
                const tableId: TableId = $colMenu.data('tableId');
                const colName: string = $input.val().trim();
                const colNum: number = $colMenu.data('colNum');

                if (colName === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $input, null);
                    return false;
                }

                if (ColManager.checkColName($input, tableId, colNum)) {
                    return false;
                }

                ColManager.renameCol(colNum, tableId, colName);
                $input.val("").blur();
                xcMenu.close($allMenus);
            }
        });

        $subMenu.on('mouseup', '.changeFormat', (event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $colMenu.data('tableId');
            const format: string = $(event.currentTarget).data("format");
            const formats: string[] = [];
            const colNums: number[] = [];
            const allColNums: number[] = $colMenu.data('colNums');
            const table: TableMeta = gTables[tableId];

            allColNums.forEach((colNum) => {
                const progCol: ProgCol = table.getCol(colNum);
                if (progCol.isNumberCol()) {
                    formats.push(format);
                    colNums.push(colNum);
                }
            });

            ColManager.format(colNums, tableId, formats);
        });

        $subMenu.on('keypress', '.digitsToRound', (event) => {
            if (event.which !== keyCode.Enter) {
                return;
            }

            const $input: JQuery = $(event.currentTarget);
            const decimal: number = parseInt($input.val().trim());
            if (isNaN(decimal) || decimal < 0 || decimal > 14) {
                // when this field is empty
                const error: string = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                    "num1": 0,
                    "num2": 14
                });
                StatusBox.show(error, $input, null, {
                    "side": "left"
                });
                return;
            }

            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data('colNums');

            ColManager.round(colNums, tableId, decimal);
            xcMenu.close($allMenus);
        });

        $subMenu.on('keypress', '.splitCol input', (event) => {
            if (event.which === keyCode.Enter) {
                const colNum: number = $colMenu.data("colNum");
                const tableId: TableId = $colMenu.data('tableId');
                const $li: JQuery = $(event.currentTarget).closest("li");
                const $delimInput: JQuery = $li.find(".delimiter");
                const delim: string = $delimInput.val();

                if (delim === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $delimInput, null, {
                        "side": "left",
                    });
                    return;
                }

                const $numInput: JQuery = $li.find(".num");
                const num: string = $numInput.val().trim();
                let numColToGet: number;

                if (num === "") {
                    numColToGet = null;
                } else {
                    numColToGet = Number(num);
                    var isValid = xcHelper.validate([
                        {
                            "$ele": $numInput,
                            "error": ErrTStr.OnlyNumber,
                            "check": () => {
                                return (isNaN(numColToGet) ||
                                        !Number.isInteger(numColToGet));
                            }
                        },
                        {
                            "$ele": $numInput,
                            "error": ErrTStr.OnlyPositiveNumber,
                            "check": () => {
                                return (numColToGet < 1);
                            }
                        }
                    ]);

                    if (!isValid) {
                        return;
                    }
                }
                const $colNamesInput: JQuery = $li.find(".colNames");
                const colNames: string[] = this._validateNewSplitColNames($colNamesInput, tableId);
                if (colNames == null) {
                    return;
                }

                ColManager.splitCol(colNum, tableId, delim, numColToGet,
                    colNames, true);
                $delimInput.val("").blur();
                $numInput.val("").blur();
                $colNamesInput.val("").blur();
                xcMenu.close($allMenus);
            }
        });

        $subMenu.on('mouseup', 'li.textAlign', (event) => {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.textAlign(colNums, tableId, $li.attr("class"));
        });

        $subMenu.on('mouseup', '.resize', (event) => {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
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
                TblManager.resizeColumns(tableId, resizeTo, colNums);
            }, 0);
        });

        $subMenu.on('mouseup', '.typeList', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const $li: JQuery = $(event.currentTarget);
            const colTypeInfos: {colNum: number, type: ColumnType}[] = [];
            // xx need to use data or class instead of text in case of language
            const newType: ColumnType = <ColumnType>$li.find(".label").text().toLowerCase();
            const colNums: number[] = $colMenu.data("colNums");
            for (let i = 0, len = colNums.length; i < len; i++) {
                colTypeInfos.push({
                    "colNum": colNums[i],
                    "type": newType
                });
            }

            const tableId: TableId = $colMenu.data('tableId');
            ColManager.changeType(colTypeInfos, tableId);
        });

        $subMenu.on('mouseup', 'li.sort', (event) => {
            if (event.which !== 1) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingAscending);
        });

        $subMenu.on('mouseup', 'li.revSort', (event) => {
            if (event.which !== 1) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingDescending);
        });

        $subMenu.on('mouseup', '.sortView', (event) => {
            if (event.which !== 1) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            SortView.show(colNums, tableId);
        });

    }

    private _validateNewSplitColNames(
        $input: JQuery,
        tableId: TableId
    ): string[] {
        const nameSet: Set<string> = new Set();
        const usedName: Set<string> = new Set();
        const table: TableMeta = gTables[tableId];
        const curColNames: string[] = table ? table.getImmediateNames() : [];
        curColNames.forEach((name) => {
            nameSet.add(name);
        });

        const colNames: string[] = $input.val().split(",").map((v) => v.trim());
        for (let i = 0; i < colNames.length; i++) {
            const name: string = colNames[i];
            const err: string = xcHelper.validateColName(name) ||
                    (usedName.has(name) ? ErrTStr.ColumnConflict : null) ||
                    (nameSet.has(name) ? ColTStr.ImmediateClash : null);
            // it's optional so we allow empty
            if (err && err !== ErrTStr.NoEmpty) {
                StatusBox.show(err, $input);
                return null;
            }
            usedName.add(name);
        }
        return colNames;
    }

    private _creatNode(
        type: DagNodeType,
        tableId: TableId,
        colNums: number[]
    ): void {
        try {
            const parentNodeId: DagNodeId = DagTable.Instance.getBindNodeId();
            const parentNode: DagNode = DagView.getActiveDag().getNode(parentNodeId);
            const position: {x: number, y: number} = parentNode.getPosition();
            const node: DagNode = DagView.addNode({
                type: type,
                display: {
                    x: position.x + 120,
                    y: position.y + 90 * parentNode.getChildren().length
                }
            });
            const table: TableMeta = gTables[tableId];
            const progCols: ProgCol[] = colNums.map((colNum) => table.getCol(colNum));
            this._setNodeParam(node, progCols);
            DagView.connectNodes(parentNodeId, node.getId(), 0);
            if (node.getMaxParents() === 1) {
                this._openOpPanel(node.getId());
            }
        } catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }

    private _setNodeParam(node: DagNode, progCols: ProgCol[]): void {
        const columns: string [] = progCols.map(progCol => {
            return progCol.getBackColName()
        });
        switch (node.getType()) {
            case DagNodeType.Aggregate:
            case DagNodeType.Filter:
            case DagNodeType.Map:
                // XXX TODO, populate it in panel
                break;
            case DagNodeType.Project:
                (<DagNodeProject>node).setParam({
                    columns: columns
                });
                break;
            case DagNodeType.GroupBy:
                (<DagNodeGroupBy>node).setParam({
                    groupBy: columns,
                    aggregate: [],
                    includeSample: false,
                    icv: false,
                    groupAll: false,
                    newKeys: null
                });
                break;
            case DagNodeType.Join:
                (<DagNodeJoin>node).setParam({
                    joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                    left: {
                        columns: columns,
                        casts: [],
                        rename: []
                    },
                    right: {
                        columns: [],
                        casts: [],
                        rename: []
                    }
                });
                break;
            case DagNodeType.Set:
                (<DagNodeSet>node).setParam({
                    unionType: UnionType.Union,
                    columns: [],
                    dedup: false
                });
                break;
            default:
                throw new Error("Unsupported type!");
        }
    }

    private _openOpPanel(nodeId: DagNodeId): void {
        const $node: JQuery = DagView.getNode(nodeId);
        $node.find(".main").trigger("contextmenu");
        $("#dagNodeMenu").find(".configureNode").trigger(fakeEvent.mouseup);
    }
}