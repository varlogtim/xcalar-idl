class DagNodeExportInput extends DagNodeInput {
    protected input: DagNodeExportInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeExportInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            driver: input.driver || "",
            driverArgs: input.driverArgs || null
        };
    }
}