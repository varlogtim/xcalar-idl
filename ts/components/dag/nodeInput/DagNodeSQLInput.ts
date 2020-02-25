class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeSQLInputStruct {
        const input = super.getInput(replaceParameters);
        let dropAsYouGo: boolean = input.dropAsYouGo;
        if (dropAsYouGo == null) {
            dropAsYouGo = true; // default is true
        }
        return {
            snippetId: input.snippetId || "",
            sqlQueryStr: input.sqlQueryStr || "",
            identifiers: input.identifiers || {},
            identifiersOrder: input.identifiersOrder || [],
            dropAsYouGo: dropAsYouGo
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQLInput = DagNodeSQLInput;
}