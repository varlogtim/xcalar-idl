class DagNodeExplodeInput extends DagNodeInput {
    protected input: DagNodeExplodeInputStruct;

    public constructor(inputStruct: DagNodeExplodeInputStruct) {
        if (inputStruct == null) {
            inputStruct = { sourceColumn: null, delimiter: null, destColumn: null };
        }
        if (inputStruct.sourceColumn == null) {
            inputStruct.sourceColumn = '';
        }
        if (inputStruct.delimiter == null) {
            inputStruct.delimiter = '';
        }
        if (inputStruct.destColumn == null) {
            inputStruct.destColumn = '';
        }

        super(inputStruct);
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "sourceColumn", "delimiter", "destColumn"
        ],
        "properties": {
            "sourceColumn": {
                "$id": "#/properties/sourceColumn",
                "type": "string",
                "minLength": 1,
                "title": "The source column Schema",
                "default": "",
                "examples": ["col1"],
                "pattern": "^(.*)$"
            },
            "delimiter": {
                "$id": "#/properties/delimiter",
                "type": "string",
                "minLength": 1,
                "title": "The delimiter Schema",
                "default": "",
                "examples": ["|"],
                "pattern": "^(.*)$"
            },
            "destColumn": {
                "$id": "#/properties/destColumn",
                "type": "string",
                "minLength": 1,
                "title": "The dest column Schema",
                "default": "",
                "examples": ["col2"],
                "pattern": "^(.*)$"
            },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeExplodeInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            sourceColumn: input.sourceColumn,
            delimiter: input.delimiter,
            destColumn: input.destColumn
        };
    }
}