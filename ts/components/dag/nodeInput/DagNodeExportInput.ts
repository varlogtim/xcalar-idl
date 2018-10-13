class DagNodeExportInput extends DagNodeInput {
    protected input: DagNodeExportInputStruct;

    public getInput(): DagNodeExportInputStruct {
        return {
            columns: this.input.columns || [],
            driver: this.input.driver || "",
            driverArgs: this.input.driverArgs || null
        };
    }
}