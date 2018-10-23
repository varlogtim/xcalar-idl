class DagNodeSplitInput extends DagNodeInput {
    protected input: DagNodeSplitInputStruct;

    public constructor(inputStruct: DagNodeSplitInputStruct) {
        if (inputStruct == null) {
            inputStruct = { source: '', delimiter:'', dest: [] };
        }
        if (inputStruct.source == null) {
            inputStruct.source = '';
        }
        if (inputStruct.delimiter == null) {
            inputStruct.delimiter = '';
        }
        if (inputStruct.dest == null) {
            inputStruct.dest = [];
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
          "source", "delimiter", "dest"
        ],
        "properties": {
            "source": {
                "$id": "#/properties/source",
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
            "dest": {
                "$id": "#/properties/dest",
                "type": "array",
                "minItems": 1,
                "title": "The dest column Schema",
                "additionalItems": false,
                "itmes": {
                    "$id": "#/properties/dest/items",
                    "type": "string",
                    "minLength": 1,
                    "title": "The dest column items Schema",
                    "default": "",
                    "examples": ["col2"],
                    "pattern": "^(.*)$"
                }
            },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeSplitInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source,
            delimiter: input.delimiter,
            dest: input.dest.map((v) => v)
        };
    }
}