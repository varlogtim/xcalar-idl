class DagNodeProjectInput extends DagNodeInput {
    protected input: DagNodeProjectInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "columns"
        ],
        "properties": {
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "The Columns Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/columns/items",
              "type": "string",
              "title": "The Items Schema",
              "default": "",
              "examples": [
                "col1"
              ],
              "minLength": 1,
              "pattern": "^(.*)$"
            }
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeProjectInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || []
        };
    }

    public setColumns(columns) {
        this.input.columns = columns;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeProjectInput = DagNodeProjectInput;
}
