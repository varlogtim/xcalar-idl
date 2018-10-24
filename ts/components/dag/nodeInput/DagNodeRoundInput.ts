class DagNodeRoundInput extends DagNodeInput {
    protected input: DagNodeRoundInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "sourceColumn", "numDecimals", "destColumn"
        ],
        "properties": {
            "sourceColumn": {
                "$id": "#/properties/sourceColumn",
                "type": "string",
                "title": "The sourceColumn Schema",
                "default": "",
                "examples": ["col1"],
                "minLength": 1,
                "pattern": "^(.*)$"
            },
            "numDecimals": {
                "$id": "#/properties/numDecimals",
                "type": "integer",
                "title": "The numDecimals Schema",
                "minimum": 0
            },
            "destColumn": {
                "$id": "#/properties/destColumn",
                "type": "string",
                "title": "The destColumn Schema",
                "default": "",
                "examples": ["col2"],
                "minLength": 1,
                "pattern": "^(.*)$"
            }
        }
    };

    public constructor(inputStruct: DagNodeRoundInputStruct) {
        if (inputStruct == null) {
            inputStruct = {
                sourceColumn: '', numDecimals: 0, destColumn: ''
            };
        }
        if (inputStruct.sourceColumn == null) {
            inputStruct.sourceColumn = '';
        }
        if (inputStruct.numDecimals == null) {
            inputStruct.numDecimals = 0;
        }
        if (inputStruct.destColumn == null) {
            inputStruct.destColumn = '';
        }

        super(inputStruct);
    }

    public getInput() {
        return {
            sourceColumn: this.input.sourceColumn,
            numDecimals: this.input.numDecimals,
            destColumn: this.input.destColumn
        };
    }
}