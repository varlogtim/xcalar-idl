class DagNodeMap extends DagNode {
    protected input: DagNodeMapInput;
    private _aggregates: Map<number, string>;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Map;
        this.allowAggNode = true;
        this.minParents = 1;
        this._aggregates = new Map<number,string>();
    }

    /**
     * @returns {Map<number, string>} used aggregates
     */
    public getAggregates(): Map<number, string> {
        return this._aggregates;
    }

    /**
     * Sets the aggregates for this node
     * @param aggregates 
     */
    public setAggregates(aggregates: Map<number, string>): void {
        this._aggregates = aggregates;
        // TODO: Update how used aggregates are shown
    }

    /**
     * @returns {DagNodeMapInput} Map node parameters
     */
    public getParam(): DagNodeMapInput {
        return {
            eval: this.input.eval || [{evalString: "", newField: ""}],
            icv: this.input.icv || false,
        };
    }

    /**
     * Set map node's parameters
     * @param input {DagNodeMapInput}
     * @param input.eval {Array} array of {evalString, newFieldName}
     */
    public setParam(input: DagNodeMapInput = <DagNodeMapInput>{}) {
        this.input = {
            eval: input.eval,
            icv: input.icv,
        }
        super.setParam();
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        this.input.eval.forEach((evalInput) => {
            const colName: string = evalInput.newField;
            if (xcHelper.parsePrefixColName(colName).prefix) {
                throw new Error("columns generated by map cannot have prefix");
            }

            const colType: ColumnType = this._getOpType(evalInput.evalString);
            const progCol = ColManager.newPullCol(colName, colName, colType);
            columns.push(progCol);
            changes.push({
                from: null,
                to: progCol
            });
        });
        return {
            columns: columns,
            changes: changes
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            this.input.eval.forEach(evalObj => {
                evalObj.evalString = this._replaceColumnInEvalStr(evalObj.evalString, renameMap.columns);
            });
        } catch(err) {
            console.error(err);
        }
        super.setParam();
    }

    private _getOpType(evalStr: string): ColumnType {
        const func = XDParser.XEvalParser.parseEvalStr(evalStr);
        const operator: string = func.fnName;
        let colType: ColumnType = null;
        const opsMap = XDFManager.Instance.getOperatorsMap();
        for (let category in opsMap) {
            const ops = opsMap[category];
            const opInfo = ops[operator];
            if (opInfo) {
                colType = xcHelper.getDFFieldTypeToString(opInfo.outputType);
                break;
            }
        }
        return colType;
    }
}