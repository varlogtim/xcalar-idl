class DagNodeDFInInput extends DagNodeInput {
    protected input: DagNodeDFInInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "dataflowId", "schema"
        ],
        "properties": {
            "linkOutName": {
                "$id": "#/properties/linkOutName",
                "type": "string",
                "title": "The linkOutName Schema",
                "default": "",
                "examples": ["linkOutName"],
                "minLength": 1,
                "pattern": "^(.*)$"
            },
            "dataflowId": {
                "$id": "#/properties/dataflowId",
                "type": "string",
                "title": "The dataflowId Schema",
                "default": "",
                "examples": ["dataflowId"],
                "minLength": 1,
                "pattern": "^(.*)$"
            },
            "schema": {
                "$id": "#/properties/schema",
                "type": "array",
                "title": "The schema Schema",
                "minItems": 1,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/schema/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "required": [
                    "name",
                    "type"
                  ],
                  "properties": {
                    "name": {
                      "$id": "#/properties/schema/items/properties/name",
                      "type": "string",
                      "minLength": 1,
                      "title": "The name Schema",
                      "default": "",
                      "examples": ["column name"],
                      "pattern": "^(.*)$"
                    },
                    "type": {
                      "$id": "#/properties/eval/schema/properties/type",
                      "type": "string",
                      "enum": [
                            ColumnType.integer,
                            ColumnType.float,
                            ColumnType.string,
                            ColumnType.boolean,
                            ColumnType.timestamp,
                            ColumnType.mixed,
                            ColumnType.unknown
                        ],
                      "title": "The type Schema",
                      "default": "",
                      "examples": [
                        "integer"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    }
                  }
                }
              },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeDFInInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            dataflowId: input.dataflowId || "",
            linkOutName: input.linkOutName || "",
            schema: input.schema || []
        };
    }
}