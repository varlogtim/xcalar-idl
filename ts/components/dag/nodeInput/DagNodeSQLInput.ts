class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;

    public getInput() {
        return {
            queryStr: this.input.queryStr || "",
            newTableName: this.input.newTableName,
            jdbcCheckTime: this.input.jdbcCheckTime
        };
    }
}