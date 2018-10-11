class SetOpPanelModel {
    private dagNode: DagNodeSet;
    private dedup: boolean;
    private fixedType: boolean;
    private unionType: UnionType;
    private event: Function;
    private colModel: ColAssignmentModel;
    private _cachedBasicModeParam: string;

    public constructor(dagNode: DagNodeSet, event: Function) {
        this.dagNode = dagNode;
        this.event = event;
        const params: DagNodeSetInput = this.dagNode.getParam();
        this._initialize(params);
        // It's a sub-category of Set, if the subType is provided
        // So we overwrite the unionType according to subType,
        // and set fixedType=true to indicate that unionType should not be changed.
        this.fixedType = false;
        const unionType = this._convertSubTypeToUnionType(dagNode.getSubType());
        if (unionType != null) {
            this.unionType = unionType;
            this.fixedType = true;
        }
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        dedup: boolean,
        unionType: UnionType,
        fixedType: boolean,
        result: ProgCol[],
        selected: ProgCol[][],
        candidate: ProgCol[][],
        all: ProgCol[][];
    } {
        return $.extend({
            dedup: this.dedup,
            unionType: this.unionType,
            fixedType: this.fixedType,
        }, this.colModel.getModel());
    }

    public setColModel(colModel): void {
        this.colModel = colModel;
    }

    public getColData() {
        const allCols = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        });
        return {
            allColSets: allCols,
            selectedColSets: this.dagNode.getParam().columns
        }
    }

    /**
     * @returns {number} get the number of lists in the model
     */
    public getNumList(): number {
        return this.colModel.getModel().all.length;
    }

    /**
     *
     * @param dedup {boolean} Specify shuld dedup rows or not
     */
    public setDedup(dedup: boolean) {
        this.dedup = dedup || false;
    }

    /**
     *
     * @param type {UnionType} Set the set operation's type
     */
    public setType(type: UnionType) {
        this.unionType = type || UnionType.Union;
    }

    /**
     * Validate if the num of parent is valid,
     * @return {error: string} Return error string if invalid
     */
    public validateNodes(): {error: string} {
        if (this.colModel.getModel().all.length <= 1 &&
            this.unionType === UnionType.Union &&
            this.dedup === true
        ) {
            return {error: UnionTStr.OneTableToUnion2};
        } else {
            return null;
        }
    }

    /**
     * @return {object} Return error when no result col or col name is invalid
     */
    public validateResult(advancedMode: boolean = false): {index: number, error: string} {
        return this.colModel.validateResult(advancedMode);
    }

    /**
     * @return {object} Return error type is not match
     */
    public validateCast(): {index: number, error: string} {
        return this.colModel.validateCast();
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        try {
            return null;
        } catch (e) {
            console.error(e);
            return {error: "invalid configuration"};
        }
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeSetInput = this._getParam();
        this.dagNode.setParam(param);
    }

    public switchMode(
        toAdvancedMode: boolean,
        editor: CodeMirror.EditorFromTextArea
    ): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeSetInput = this._getAdvFormParam();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            editor.setValue(paramStr);
        } else {
            try {
                const param: DagNodeSetInput = <DagNodeSetInput>JSON.parse(editor.getValue());
                this._initialize(param, true);
                this._update();
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    public restoreBasicModeParams(editor: CodeMirror.EditorFromTextArea) {
        editor.setValue(this._cachedBasicModeParam);
    }

    public refreshColumns(refreshInfo): void {
        const allCols = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        });
        const removedSets = [];
        if (allCols.length < this.colModel.getModel().all.length) {
            for (var i in refreshInfo.removeInfo.childIndices) {
                if (i === this.dagNode.getId()) {
                    removedSets.push(refreshInfo.removeInfo.childIndices[i]);
                }
            }
        }

        this.colModel.refreshColumns(allCols, removedSets);
    }

    private _initialize(params: DagNodeSetInput, isFromAdvForm: boolean = false) {
        this.dedup = params.dedup;
        if (!isFromAdvForm) {
            this.unionType = params.unionType;
        }

        if (this.colModel) {
            // colModel not set during the first time
            const allCols = this.dagNode.getParents().map((parentNode) => {
                return parentNode.getLineage().getColumns();
            });

            this.colModel.initialize(allCols, params.columns);
        }
    }

    private _getParam(): DagNodeSetInput {
        return {
            unionType: this.unionType,
            dedup: this.dedup,
            columns: this.colModel.getParam().columns
        }
    }

    private _getAdvFormParam() {
        const param = this._getParam();
        delete param.unionType;
        return param;
    }

    private _convertSubTypeToUnionType(subType: DagNodeSubType): UnionType {
        if (subType == null) {
            return null;
        }

        const typeMap = {};
        typeMap[DagNodeSubType.Union] = UnionType.Union;
        typeMap[DagNodeSubType.Except] = UnionType.Except;
        typeMap[DagNodeSubType.Intersect] = UnionType.Intersect;

        return typeMap[subType];
    }

    private _update(): void {
        this.colModel.update();
        if (this.event != null) {
            this.event();
        }
    }
}