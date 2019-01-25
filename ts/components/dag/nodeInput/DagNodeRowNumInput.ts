class DagNodeRowNumInput extends DagNodeInput {
    protected input: DagNodeRowNumInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": ["newField"],
        "properties": {
            "newField": {
                "$id": "#/properties/newField",
                "type": "string",
                "title": "The newField Schema",
                "default": "",
                "examples": ["col1"],
                "minLength": 1,
                "pattern": "^(.*)$"
            }
        }
    };

    public constructor(inputStruct: DagNodeRowNumInputStruct) {
        if (inputStruct == null) {
            inputStruct = { newField: '' };
        }
        if (inputStruct.newField == null) {
            inputStruct.newField = '';
        }
        super(inputStruct);
    }

    public getInput() {
        return {
            newField: this.input.newField,
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeRowNumInput = DagNodeRowNumInput;
}
