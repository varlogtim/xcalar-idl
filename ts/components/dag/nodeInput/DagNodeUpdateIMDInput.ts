class DagNodeUpdateIMDInput extends DagNodeInput {
    protected input: DagNodeUpdateIMDInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "pubTableName",
          "operator"
        ],
        "properties": {
          "pubTableName": {
            "$id": "#/properties/pubTableName",
            "type": "string",
            "title": "The Pubtablename Schema",
            "default": "",
            "examples": [
              ""
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "operator": {
            "$id": "#/properties/operator",
            "type": "string",
            "title": "The Operator Schema",
            "default": "",
            "examples": [
              ""
            ],
            "minLength": 0,
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeUpdateIMDInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            pubTableName: input.pubTableName || "",
            operator: input.operator || ""
        };
    }
}