class DagNodePublishIMDInput extends DagNodeInput {
    protected input: DagNodePublishIMDInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "pubTableName",
          "primaryKey",
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
          "primaryKey": {
            "$id": "#/properties/primaryKey",
            "type": "string",
            "title": "The Primarykey Schema",
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
            "minLength": 1,
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodePublishIMDInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            pubTableName: input.pubTableName || "",
            primaryKey: input.primaryKey || "",
            operator: input.operator || ""
        };
    }
}