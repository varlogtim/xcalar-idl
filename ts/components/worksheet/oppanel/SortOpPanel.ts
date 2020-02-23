class SortOpPanel extends BaseOpPanel implements IOpPanel {
    private _componentFactory: OpPanelComponentFactory;
    protected _dagNode: DagNodeSort = null;
    protected _dataModel: SortOpPanelModel;
    protected codeMirrorOnlyColumns = true;

    /**
     * @override
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        const panelSelector = '#sortOpPanel';
        this._componentFactory = new OpPanelComponentFactory(panelSelector);
        this._mainModel = SortOpPanelModel;
        super.setup($(panelSelector));
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSort, options?: ShowPanelInfo): void {
        this._dagNode = dagNode;
        this._dataModel = this._mainModel.fromDag(dagNode);
        let error: string;
        try {
            this._updateUI();
        } catch (e) {
            error = e;
        }

        super.showPanel(null, options)
        .then(() => {
            this._setupColumnPicker(dagNode.getType());
            if (error|| BaseOpPanel.isLastModeAdvanced) {
                this._startInAdvancedMode(error);
            }
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    protected _updateUI(): void {
        this._clearValidationList();
        this._clearColumnPickerTarget();

        const $header = this._getPanel().find('header');
        $header.empty();
        $header.append(this._componentFactory.createHeader({
            text: this._dataModel.getTitle(),
            nodeTitle: this._dagNode.getTitle(),
            onClose: () => this.close()
        }));

        const $opSection = this._getPanel().find('.opSection');
        const opSectionDom = this._componentFactory.createOpSection({
            instrStr: this._dataModel.getInstrStr(),
            args: this._getArgs()
        });
        this._componentFactory.getTemplateMgr().updateDOM(
            <any>$opSection[0], <NodeDefDOMElement[]>opSectionDom);
        this._registerEventListeners();
    }

    private _registerEventListeners(): void {
        const $submitBtn = this._getPanel().find('.btn.submit');
        $submitBtn.off();
        $submitBtn.on('click', () => this._submitForm());
    }

    private _getArgs(): AutogenSectionProps[] {
        const args: AutogenSectionProps[] = [];

        const columnsLists: ColumnComboRowProps[] = [];
        const columns = this._dataModel.getSortedColumns();

        columns.forEach((column, idx) => {
            const colNameSet: Set<string> = new Set();
            // Column to sort
            const colMenuList: { colType: ColumnType, colName: string }[] = [];
            for (const colInfo of this._dataModel.getColumnMap().values()) {
                const colType = colInfo.getType();
                    colMenuList.push({
                    colType: colType,
                    colName: colInfo.getBackColName()
                });
                colNameSet.add(colInfo.getBackColName());
            }
            let onRemove; // no remove button if only 1 row exists
            if (columns.length > 1) {
                onRemove = () => {
                    this._dataModel.removeColumn(idx);
                    this._updateUI();
                }
            }

            const columnProps: HintDropdownProps = {
                name: "",
                type: "column",
                inputVal: column.columnName,
                placeholder: OpPanelTStr.SortPanelFieldName,
                menuList: colMenuList,
                onDataChange: (colName) => {
                    this._dataModel.setColumName(idx, colName);
                    this._updateUI();
                },
                onFocus: (elem) => {
                    this._setColumnPickerTarget(elem, (colName) => {
                        if (!colNameSet.has(colName)) {
                            return;
                        }
                        this._dataModel.setColumName(idx, colName);
                        this._updateUI();
                    });
                },
                onRemove: onRemove,
                onElementMountDone: (elem) => {
                    this._addValidation(elem, () => {
                        return this._componentFactory.checkFunctions.stringNoEmpty(
                            this._dataModel.getSortedColumn(idx).columnName
                        ).errMsg;
                    });
                }
            };
            const sortProps: HintDropdownProps  = {
                name: "",
                type: "column",
                inputVal: column.ordering,
                placeholder: "",
                menuList: [XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending],
                XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]],
                onDataChange: (ordering) => {
                    this._dataModel.setColumnOrdering(idx, ordering);
                    this._updateUI();
                }
            };
            columnsLists.push({
                columnList: columnProps,
                dropdownList: sortProps
            });
        });

        const sortProps: ColumnComboProps = {
            type: 'columnCombo',
            name: OpPanelTStr.SortColumnHeading + ":",
            columnCombos: columnsLists,
            addMoreButton: {
                btnText: "Add Column",
                cssClass: "addRow",
                onClick: () => {
                    this._dataModel.addColumn();
                    this._updateUI();
                }
            }
        };
        args.push(sortProps);

        return args;
    }

    private _submitForm() {
        if (this._isAdvancedMode()) {
            const $elemEditor = this._getPanel().find(".advancedEditor");
            try {
                const advConfig = <DagNodeSortInputStruct>JSON.parse(this._editor.getValue());
                this._dataModel = this._convertAdvConfigToModel(advConfig);
            } catch(e) {
                StatusBox.show(e, $elemEditor);
                return;
            }
        } else {
            if (!this._runValidation()) {
                return;
            }
            try {
                this._dataModel.validateInputData();
            } catch(e) {
                StatusBox.show(e, this._getPanel().find(".row-columnCombo"));
                return;
            }
        }

        this._dagNode.setParam(this._dataModel.toDagInput());
        this.close(true);
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeSortInputStruct = this._dataModel.toDagInput();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const advConfig = <DagNodeSortInputStruct>JSON.parse(this._editor.getValue());
                if (JSON.stringify(advConfig, null, 4) !== this._cachedBasicModeParam) {
                    this._dataModel = this._convertAdvConfigToModel(advConfig);
                    this._updateUI();
                }
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _convertAdvConfigToModel(advConfig: DagNodeSortInputStruct) {
        const dagInput: DagNodeSortInputStruct = <DagNodeSortInputStruct>JSON.parse(this._editor.getValue());
        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            const error = this._dagNode.validateParam(advConfig);
            if (error) {
                throw new Error(error.error);
            }
        }

        const colMap = this._dataModel.getColumnMap();
        const model = this._mainModel.fromDagInput(colMap, advConfig);
        model.validateInputData();
        return model;
    }
}