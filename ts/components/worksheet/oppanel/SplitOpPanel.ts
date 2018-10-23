/**
 * The operation editing panel for Split operator
 */
class SplitOpPanel extends BaseOpPanel implements IOpPanel {
    private _componentFactory: OpPanelComponentFactory;
    private _dagNode: DagNodeSplit = null;
    private _dataModel: SplitOpPanelModel;

    /**
     * @override
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._componentFactory = new OpPanelComponentFactory('#splitOpPanel');
        super.setup($('#splitOpPanel'));
    }
    
    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSplit, options?): void {
        this._dagNode = dagNode;
        this._dataModel = SplitOpPanelModel.fromDag(dagNode);
        this._updateUI();
        super.showPanel(null, options);
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    private _updateUI(): void {
        this._clearValidationList();

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

        // Source column
        const menuList: { colType: ColumnType, colName: string }[] = [];
        for (const colInfo of this._dataModel.getColumnMap().values()) {
            if (colInfo.getType() != ColumnType.string) {
                continue;
            }
            menuList.push({
                colType: colInfo.getType(),
                colName: colInfo.getBackColName()
            });
        }
        const sourceList: HintDropdownProps = {
            type: 'column',
            name: OpPanelTStr.SplitPanelFieldNameSourceColumn,
            inputVal: this._dataModel.getSourceColName(),
            placeholder: OpPanelTStr.SplitPanelFieldNameSourceColumn,
            menuList: menuList,
            onDataChange: (colName) => {
                this._dataModel.setSourceColName(colName);
                this._dataModel.autofillEmptyColNames();
                this._updateUI();
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.stringNoEmpty(
                        this._dataModel.getSourceColName()
                    ).errMsg;
                });
            }
        };
        args.push(sourceList);

        // Delimiter
        const delimiterInfo: SimpleInputProps<string> = {
            type: 'string',
            name: OpPanelTStr.SplitPanelFieldNameDelimiter,
            inputVal: this._dataModel.getDelimiter(),
            placeholder: OpPanelTStr.SplitPanelFieldNameDelimiter,
            valueCheck: { checkType: 'stringNoEmptyValue', args: [] },
            onChange: (newVal: string) => {
                this._dataModel.setDelimiter(newVal);
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.stringNoEmpty(
                        this._dataModel.getDelimiter()
                    ).errMsg;
                });
            }
        };
        args.push(delimiterInfo);

        // Dest column count
        const colCount = this._dataModel.getNumDestCols();
        const range = { min: 1 };
        const destColCountInfo: SimpleInputProps<number> = {
            type: 'number',
            name: OpPanelTStr.SplitPanelFieldNameColumnCount,
            inputVal: colCount, placeholder: `range: >=${range.min}`,
            valueCheck: { checkType: 'integerRange', args: [range] },
            onInput: (count: number) => {
                this._dataModel.setNumDestCols(count);
                this._updateUI();
            },
            inputTimeout: 400,
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    // XXX TODO: better not access the internal elements of a component
                    return this._componentFactory.checkFunctions.integerRange(
                        range, $(elem).find('.selInput').val()
                    ).errMsg;
                });
            }
        }
        args.push(destColCountInfo);

        // Dest columns
        const colNames = this._dataModel.getDestColNames();
        for (let i = 0; i < colCount; i ++) {
            const colName = colNames[i] || '';
            const destColInfo: SimpleInputProps<string> = {
                type: 'string',
                name: `${OpPanelTStr.SplitPanelFieldNameDestColumn} #${i + 1}`,
                inputVal: colName, placeholder: '',
                valueCheck: {
                    checkType: 'stringColumnNameNoEmptyValue',
                    args: () => [this._dataModel.getColNameSetWithNew(i)]
                },
                onChange: (colNameStr: string) => {
                    this._dataModel.setDestColName(i, colNameStr);
                },
                onElementMountDone: (elem) => {
                    this._addValidation(elem, () => {
                        return this._componentFactory.checkFunctions.stringColumnNameNoEmptyValue(
                            this._dataModel.getColNameSetWithNew(i),
                            this._dataModel.getDestColNameByIndex(i)
                        ).errMsg;
                    });
                }
            };
            args.push(destColInfo);
        }

        return args;
    }

    private _submitForm() {
        if (this._isAdvancedMode()) {
            // XXX TODO: validate JSON and save configuration
        } else {
            // XXX TODO: validation
            if (this._runValidation()) {
                this._dagNode.setParam(this._dataModel.toDagInput());
                this.close(true);
            }
        }
    }
}