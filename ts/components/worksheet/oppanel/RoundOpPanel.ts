class RoundOpPanel extends BaseOpPanel implements IOpPanel {
    private _componentFactory: OpPanelComponentFactory;
    protected _dagNode: DagNodeRound = null;
    private _dataModel: RoundOpPanelModel;

    /**
     * @override
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._componentFactory = new OpPanelComponentFactory('#roundOpPanel');
        super.setup($('#roundOpPanel'));
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeRound, options?): void {
        this._dagNode = dagNode;
        this._dataModel = RoundOpPanelModel.fromDag(dagNode);
        let error: string;
        try {
            this._updateUI();
        } catch (e) {
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }
        if (super.showPanel(null, options)) {
            this._setupColumnPicker(dagNode.getType());
        }
        if (error) {
            this._startInAdvancedMode(error);
        }
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    private _updateUI(): void {
        this._clearValidationList();
        this._clearColumnPickerTarget();

        const $header = this._getPanel().find('header');
        $header.empty();
        $header.append(this._componentFactory.createHeader({
            text: this._dataModel.getTitle(),
            onClose: () => this.close()
        }));

        const $opSection = this._getPanel().find('.opSection');
        const opSectionDom = this._componentFactory.createOpSection({
            instrStr: this._dataModel.getInstrStr(),
            args: this._getArgs()
        });
        this._componentFactory.getTemplateMgr().updateDOM(
            $opSection[0], <NodeDefDOMElement[]>opSectionDom);
        this._registerEventListeners();
    }

    private _registerEventListeners(): void {
        const $submitBtn = this._getPanel().find('.btn.submit');
        $submitBtn.off();
        $submitBtn.on('click', () => this._submitForm());
    }

    private _getArgs(): AutogenSectionProps[] {
        const args: AutogenSectionProps[] = [];

        const colNameSet: Set<string> = new Set();
        // Column to round
        const menuList: { colType: ColumnType, colName: string }[] = [];
        for (const colInfo of this._dataModel.getColumnMap().values()) {
            const colType = colInfo.getType();
            if (colType === ColumnType.float) {
                menuList.push({
                    colType: colType,
                    colName: colInfo.getBackColName()
                });
                colNameSet.add(colInfo.getBackColName());
            }
        }
        const sourceList: HintDropdownProps = {
            type: 'column',
            name: OpPanelTStr.RoundPanelFieldNameSourceColumn,
            inputVal: this._dataModel.getSourceColumn(),
            placeholder: OpPanelTStr.RoundPanelFieldNameSourceColumn,
            menuList: menuList,
            onDataChange: (colName) => {
                this._dataModel.setSourceColumn(colName);
                this._dataModel.autofillEmptyDestColumn();
                this._updateUI();
            },
            onFocus: (elem) => {
                this._setColumnPickerTarget(elem, (colName) => {
                    if (!colNameSet.has(colName)) {
                        return;
                    }
                    this._dataModel.setSourceColumn(colName);
                    this._dataModel.autofillEmptyDestColumn();
                    this._updateUI();
                });
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.stringNoEmpty(
                        this._dataModel.getSourceColumn()
                    ).errMsg;
                });
            }
        };
        args.push(sourceList);

        // Number of decimals to keep
        const range = { min: 0 };
        const numDecimalsProp: SimpleInputProps<number> = {
            type: 'number',
            name: OpPanelTStr.RoundPanelFieldNameNumDecimals,
            inputVal: this._dataModel.getNumDecimals(),
            placeholder: `range: >=${range.min}`,
            valueCheck: { checkType: 'integerRange', args: [range] },
            onChange: (newVal: number) => {
                this._dataModel.setNumDecimals(newVal);
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.integerRange(
                        range, $(elem).find('.selInput').val()
                    ).errMsg;
                });
            }
        };
        args.push(numDecimalsProp);

        // Dest column
        const destColProp: SimpleInputProps<string> = {
            type: 'string',
            name: OpPanelTStr.RoundPanelFieldNameDestColumn,
            inputVal: this._dataModel.getDestColumn(), placeholder: '',
            valueCheck: {
                checkType: 'stringColumnNameNoEmptyPrefixValue',
                args: () => [this._dataModel.getColNameSet()]
            },
            onChange: (colNameStr: string) => {
                this._dataModel.setDestColumn(colNameStr);
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.stringColumnNameNoEmptyPrefixValue(
                        this._dataModel.getColNameSet(),
                        this._dataModel.getDestColumn()
                    ).errMsg;
                });
            }
        };
        args.push(destColProp);

        return args;
    }

    private _submitForm() {
        if (this._isAdvancedMode()) {
            const $elemEditor = this._getPanel().find(".advancedEditor");
            try {
                const advConfig = <DagNodeRoundInputStruct>JSON.parse(this._editor.getValue());
                this._dataModel = this._convertAdvConfigToModel(advConfig);
            } catch(e) {
                StatusBox.show(e, $elemEditor);
                return;
            }
        } else {
            if (!this._runValidation()) {
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
            const param: DagNodeRoundInputStruct = this._dataModel.toDagInput();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const advConfig = <DagNodeRoundInputStruct>JSON.parse(this._editor.getValue());
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

    private _convertAdvConfigToModel(advConfig: DagNodeRoundInputStruct) {
        const error = this._dagNode.validateParam(advConfig);
        if (error) {
            throw new Error(error.error);
        }

        const colMap = this._dataModel.getColumnMap();
        const model = RoundOpPanelModel.fromDagInput(colMap, advConfig);
        model.validateInputData();
        return model;
    }
}