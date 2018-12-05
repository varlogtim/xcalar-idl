class DagNodeIMDTableInput extends DagNodeInput {
    protected input: DagNodeIMDTableInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "source",
          "version",
          "columns"
        ],
        "optional" : [
          "filterString"
        ],
        "properties": {
          "source": {
            "$id": "#/properties/source",
            "type": "string",
            "title": "The Source Schema",
            "default": "",
            "examples": [
              "Base_table_L"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "version": {
            "$id": "#/properties/version",
            "type": "number",
            "title": "The Version Schema",
            "default": -1,
            "examples": [
              1
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "The Columns Schema",
            "minItems": 1,
            "additionalItems": false
          },
          "filterString": {
            "$id": "#/properties/filterString",
            "type": "string",
            "title": "The Filterstring Schema",
            "default": "",
            "examples": [
              ""
            ],
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeIMDTableInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source || "",
            version: input.version || -1,
            filterString: input.filterString || "",
            columns: input.columns || [],
        };
    }
}