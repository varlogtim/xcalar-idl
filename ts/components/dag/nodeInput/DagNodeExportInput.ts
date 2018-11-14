class DagNodeExportInput extends DagNodeInput {
    protected input: DagNodeExportInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "required": [
          "columns",
          "driver",
          "driverArgs"
        ],
        "additionalProperties": false,
        "properties": {
            "columns": {
                "$id": "#/properties/columns",
                "type": "array",
                "title": "The Columns Schema",
                "minItems": 1,
                "additionalItems": false
            },
            "driver": {
                "$id": "#/properties/driver",
                "type": "string",
                "title": "The Export Driver Schema",
                "minLength": 1
            },
            "driverArgs": {
                "$id": "#/properties/driverArgs",
                "type": "object",
                "title": "The Driver Args Schema",
            },
        }
    };


    public getInput(replaceParameters?: boolean): DagNodeExportInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            driver: input.driver || "",
            driverArgs: input.driverArgs || {}
        };
    }
}