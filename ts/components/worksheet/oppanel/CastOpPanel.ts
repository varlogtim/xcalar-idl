class CastOpPanel extends BaseOpPanel {
    // protected _$panel;
    private _dagNode;
    private colRenameSection: ColAssignmentView;
    private prevRenameMap;
    private dataModel: ColAssignmentModel;

    public constructor() {
        super();
        // this._$panel = $("#castOpPanel")
        super.setup($("#castOpPanel"));
        this.colRenameSection = new ColAssignmentView("#castOpPanel .columnAssignmentSection",
                {
                    labels: ["Current Name", "New Name", "Cast"],
                    resultColPosition: -1,
                    showCast: true,
                    candidateText: "Columns in this section will not be casted."
                });
        this._registerHandlers();
    }

    public show(dagNode: DagNodeMap, options: {exitCallback?: Function}): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }
        this._reset();
        this._formHelper.setup({});

        this._dagNode = dagNode;
        super.showPanel("cast", options);
        const curColumns = this.updateColumns();

        const param = dagNode.getParam();
        this.prevRenameMap = {};
        let selectedCols = param.eval.map((evalObj) => {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);
            let selectedCol;
            if (!parsedEval.error) {
                selectedCol = {
                    sourceColumn: (<ParsedEvalArg>parsedEval.args[0]).value,
                    destColumn: evalObj.newField,
                    columnType: xcHelper.getCastTypeToColType(parsedEval.fnName),
                    cast: true
                };
                this.prevRenameMap[selectedCol.sourceColumn] = selectedCol.destColumn;
            }
            return selectedCol;
        });
        selectedCols = selectedCols.filter((col) => {
            return col != null;
        });

        this.dataModel = this.colRenameSection.show([curColumns], [selectedCols]);
        this._modifyColRenameSection();
        this._autoResizeView(false);
    }

    public close(isSubmit?: boolean): boolean {
        if (!this._formHelper.isOpen()) {
            return false;
        }

        super.hidePanel(isSubmit);
        this._autoResizeView(true);
        return true;
    }

    public refreshColumns(): void {
        const cols = this.updateColumns();
        this.dataModel.refreshColumns([cols]);
    }

    public updateColumns(): ProgCol[] {
        return this._dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
    }

    private _submit() {
        if (!this.validate()) {
            return false;
        }
        const param = this.colRenameSection.getParam();
        const evalOps = [];
        param.columns[0].forEach((colInfo) => {
            if (!colInfo.sourceColumn) return;
            const mapStr = xcHelper.castStrHelper(colInfo.sourceColumn,
                                                  colInfo.columnType);
            evalOps.push({
                "evalString": mapStr,
                "newField": colInfo.destColumn
            });
        });
        const paramInput: DagNodeMapInputStruct = {
            eval: evalOps,
            icv: false
        };

        this._dagNode.getParam().eval.forEach((evalObj) => {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);
            let selectedCol;
            if (!parsedEval.error) {
                selectedCol = {
                    sourceColumn: (<ParsedEvalArg>parsedEval.args[0]).value,
                    destColumn: evalObj.newField,
                    columnType: xcHelper.getCastTypeToColType(parsedEval.fnName),
                    cast: true
                };
            }
            return selectedCol;
        });
        this._dagNode.setParam(paramInput);

        const renameMap = {
            columns: {},
            prefixes: {}
        };
        param.columns[0].forEach((colInfo) => {
            if (!colInfo.sourceColumn) return;
            renameMap.columns[colInfo.sourceColumn] = colInfo.destColumn;
        });

        // if a previous instance of this map operation did a rename, remap
        // the names that were original switched
        for (let colName in this.prevRenameMap) {
            if (renameMap.columns[colName]) {
                renameMap.columns[this.prevRenameMap[colName]] = renameMap.columns[colName];
            } else {
                renameMap.columns[this.prevRenameMap[colName]] = colName;
            }
        }
        const dagGraph = DagView.getActiveDag();
        dagGraph.applyColumnMapping(this._dagNode.getId(), renameMap);

        this.close(true);
        return true;
    }

    private validate(): boolean {
        // validate result column
        const $resultInputs = this.$panel.find(".resultInput");
        const resultErr: {index: number, error: string} = this.dataModel.validateResult();
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, this.$panel.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }
        return true;
    }

    private _registerHandlers() {
        this.$panel.find('.cancel, .close').on('click', () => {
            this.close();
        });
        this.$panel.find(".submit").on("click", () => {
            this._submit();
        });

    }

    private _modifyColRenameSection() {
        // this.$panel.off("click.candidateSection");
        this.$panel.find(".tableSection .header .text")
                  .text(OpFormTStr.SelectColRename);
        this.$panel.find(".candidateSection .subHeading .text")
                  .text(OpFormTStr.NotCasted + ":");
    }

    private _autoResizeView(reset: boolean) {
        const $mainMenu: JQuery = $("#mainMenu");
        const $panel: JQuery = this._getPanel();
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = parseFloat($mainMenu.css("min-width"));
        if (reset) {
            $mainMenu.width(minWidth);
        } else {
            let width: number = minWidth + sectionW;
            width = Math.min(width, $("#workspacePanel").width() * 0.5);
            $mainMenu.width(width);
        }
    }
}