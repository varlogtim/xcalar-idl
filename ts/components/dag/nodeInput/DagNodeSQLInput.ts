class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeSQLInputStruct {
        const input = super.getInput(replaceParameters);
        let dropAsYouGo: boolean = input.dropAsYouGo;
        if (dropAsYouGo == null) {
            dropAsYouGo = true; // default is true
        }
        return {
            sqlQueryStr: input.sqlQueryStr || "",
            identifiers: input.identifiers || {},
            identifiersOrder: input.identifiersOrder || [],
            dropAsYouGo: dropAsYouGo
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