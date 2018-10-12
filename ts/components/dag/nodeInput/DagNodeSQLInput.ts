class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeSQLInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            queryStr: input.queryStr || "",
            newTableName: input.newTableName,
            jdbcCheckTime: input.jdbcCheckTime
        };
    }
}