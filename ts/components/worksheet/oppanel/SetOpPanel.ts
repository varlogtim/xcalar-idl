class SetOpPanel extends BaseOpPanel {
    private setOpData: SetOpPanelModel;
    public static d;
    private colAssignmentSection: ColAssignmentView;

    public constructor() {
        super();
        this._setup();
    }
    /**
     *
     * @param dagNode {DagNodeSet} show the view based on the set type node
     */
    public show(dagNode: DagNodeSet, options?): void {
        if (!super.showPanel(null, options)) {
            return;
        }
        this._initialize(dagNode);
        this._formHelper.setup({});
        this.updateColumns();

        if (gMinModeOn) {
            this._autoResizeView(false);
        } else {
            setTimeout(() => {
                this._autoResizeView(false);
            }, 1);
        }
    }

    /**
     * Close the view
     */
    public close(isSubmit?): void {
        if (!super.hidePanel(isSubmit)) {
            return;
        }

        StatusBox.forceHide(); // hides any error boxes;
        xcTooltip.hideAll();
        this._autoResizeView(true);
    }

    public refreshColumns(info): void {
        this.setOpData.refreshColumns(info);
        this.updateColumns();
    }

    private updateColumns(): void {
        this.allColumns = [];
        const seen = {};
        this.setOpData.getModel().all.forEach(colSet => {
            colSet.forEach(progCol => {
                if (!seen[progCol.getBackColName()]) {
                    seen[progCol.getBackColName()] = true;
                    this.allColumns.push(progCol);
                }
            });
        });
    }

    private _setup(): void {
        super.setup($("#setOpPanel"));
        this._addEventListeners();
        this.colAssignmentSection = new ColAssignmentView("#setOpPanel .columnAssignmentSection");
    }

    protected _reset(): void {
        super._reset();
        const $panel = this._getPanel();
        $panel.find(".listSection").empty();
        $panel.find(".searchArea input").val("");
        $panel.find(".highlight").removeClass("highlight");
    }

    private _initialize(dagNode: DagNodeSet): void {
        const event: Function = () => {};
        this.setOpData = new SetOpPanelModel(dagNode, event);
        const colInfo = this.setOpData.getColData();
        const colModel = this.colAssignmentSection.show(colInfo.allColSets,
                                                    colInfo.selectedColSets);
        this.setOpData.setColModel(colModel);
        const model = this.setOpData.getModel();
        this._selectDedup(model.dedup);
        this._selectType(model.unionType);
    }

    private _getDedupSection(): JQuery {
        return this._getPanel().find(".dedupSection");
    }

    private _addEventListeners(): void {
        const $panel = this._getPanel();
        $panel.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        // change dedup option
        xcHelper.optionButtonEvent(this._getDedupSection(), (option) => {
            const dedup: boolean = (option === "no") ? true : false;
            this.setOpData.setDedup(dedup);
        });
    }

    private _selectDedup(dedup): void {
        // it's asking include dedup rows or not
        const option: string = dedup? "no" : "yes";
        this._getDedupSection().find(".radioButton." + option).click();
    }

    private _selectType(unionType: UnionType): void {
        const typeMap = {
            union: OpPanelTStr.Union,
            except: OpPanelTStr.Except,
            intersect: OpPanelTStr.Intersect
        };
        const type: string = unionType.toLocaleLowerCase();
        const typeText = typeMap[type];
        this._getPanel().find(".modeList").text(typeText);
    }

    private _autoResizeView(reset: boolean) {
        const $mainMenu: JQuery = $("#mainMenu");
        const $panel: JQuery = this._getPanel();
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = parseFloat($mainMenu.css("min-width"));
        if (reset) {
            $mainMenu.width(minWidth);
        } else {
            const numList: number = this.setOpData.getNumList();
            let width: number = minWidth + Math.max(0, numList - 1) * sectionW;
            width = Math.min(width, $("#workspacePanel").width() * 0.5);
            $mainMenu.width(width);
        }
    }

    private _showCast(colIndex: number) {
        const $panel: JQuery = this._getPanel();
        $panel.find('.resultCol[data-index="' + colIndex + '"]').addClass("cast");
        $panel.find('.columnList[data-index="' + colIndex + '"]').addClass("cast");
    }

    // function suggestSelectedCols(tableInfo, tableIndex) {
    //     var suggestCols = [];
    //     if (tableIndex === 0) {
    //         // not suggest first table
    //         return suggestCols;
    //     }
    //     var firstCols = tableInfoLists[0].selectedCols;
    //     var candidateCols = getCandidateCols(tableInfo, true);
    //     var candidateColInfos = candidateCols.map(function(col) {
    //         var parsedName = xcHelper.parsePrefixColName(col.name).name;
    //         return {
    //             col: col,
    //             parsedName: parsedName
    //         };
    //     });
    //     suggestCols = firstCols.map(function(col) {
    //         if (col == null) {
    //             return null;
    //         }
    //         var colName = xcHelper.parsePrefixColName(col.name).name;
    //         for (var i = 0; i < candidateColInfos.length; i++) {
    //             if (colName === candidateColInfos[i].parsedName) {
    //                 return candidateColInfos[i].col;
    //             }
    //         }
    //         return null;
    //     });
    //     return suggestCols;
    // }

    private _submitForm(): void {
        if (!this._validate()) {
            return;
        }

        this.setOpData.submit();
        this.close(true);
    }

    private _validate(): boolean {
        const $panel: JQuery = this._getPanel();
        if (this._isAdvancedMode()) {
            const advancedErr: {error: string} = this.setOpData.validateAdvancedMode(this._editor.getValue());
            if (advancedErr != null) {
                StatusBox.show(advancedErr.error, $panel.find(".advancedEditor"));
                return false;
            } else {
                return true;
            }
        }
        // validate more than one parent nodes
        const numNodeErr: {error: string} = this.setOpData.validateNodes();
        if (numNodeErr != null) {
            StatusBox.show(numNodeErr.error, $panel.find(".tableSection"));
            return false;
        }

        // validate result column
        const $resultInputs = $panel.find(".resultInput");
        const resultErr: {index: number, error: string} = this.setOpData.validateResult();
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, $panel.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }

        // validate type selection
        const typeValids: any[] = [];
        $panel.find(".resultCol.cast .typeList .text").each(function() {
            typeValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(typeValids)) {
            return false;
        }

        // validate type cast
        const castValid: {index: number, error: string} = this.setOpData.validateCast();
        if (castValid != null) {
            const index: number = castValid.index;
            const $resultCol: JQuery = $panel.find('.resultCol[data-index="' + index + '"]');
            this._showCast(index);
            StatusBox.show(UnionTStr.Cast, $resultCol.find(".typeList"));
            return false;
        }

        return true;
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.setOpData.switchMode(toAdvancedMode, this._editor);
    }

    protected _restoreBasicModeParams() {
        return this.setOpData.restoreBasicModeParams(this._editor);
    }
}