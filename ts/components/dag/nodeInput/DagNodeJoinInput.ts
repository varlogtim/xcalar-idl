class DagNodeJoinInput extends DagNodeInput {
    protected input: DagNodeJoinInputStruct;

    public getInput(): DagNodeJoinInputStruct {
        return {
            joinType: this.input.joinType || JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: this.input.left || this._getDefaultTableInfo(),
            right: this.input.right || this._getDefaultTableInfo(),
            evalString: this.input.evalString || ""
        };
    }

    public setEval(evalString: string) {
        this.input.evalString = evalString;
    }

    private _getDefaultTableInfo(): DagNodeJoinTableInput {
        return {
            columns: [""],
            casts: [null],
            rename: [{sourceColumn: "", destColumn: "", prefix: false}]
        }
    }
}