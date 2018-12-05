class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeSQLInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            sqlQueryStr: input.sqlQueryStr || "",
            identifiers: input.identifiers || {},
            identifiersOrder: input.identifiersOrder || []
        };
    }

    public setSqlQueryStr(sqlQueryStr: string): void {
        this.input.sqlQueryStr = sqlQueryStr;
    }
    public setIdentifiers(identifiers: {}): void {
        this.input.identifiers = identifiers;
    }
    public setIdentifiersOrder(identifiersOrder: number[]): void {
        this.input.identifiersOrder = identifiersOrder;
    }
}