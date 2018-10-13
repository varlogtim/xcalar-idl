class DagNodeGroupByInput extends DagNodeInput {
    protected input: DagNodeGroupByInputStruct;

    public getInput() {
        return {
            groupBy: this.input.groupBy || [""],
            aggregate: this.input.aggregate || [{operator: "", sourceColumn: "", destColumn: "", distinct: false, cast: null}],
            includeSample: this.input.includeSample || false,
            icv: this.input.icv || false,
            groupAll: this.input.groupAll || false,
            newKeys: this.input.newKeys || []
        };
    }

    public setNewKeys(newKeys) {
        this.input.newKeys = newKeys;
    }

    public setGroupBy(groupBy) {
        this.input.groupBy = groupBy;
    }

    public setAggregate(aggregate) {
        this.input.aggregate = aggregate;
    }
}