class DagNodeSetInput extends DagNodeInput {
    protected input: DagNodeSetInputStruct;
    private dagNode;

    constructor(inputStruct, dagNode) {
        super(inputStruct);
        this.dagNode = dagNode;
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "dedup",
          "columns"
        ],
        "properties": {
          "dedup": {
            "$id": "#/properties/dedup",
            "type": "boolean",
            "title": "The Dedup Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "The Columns Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/columns/items",
              "type": "array",
              "title": "The Items Schema",
              "minItems": 1,
              "additionalItems": false,
              "items": {
                "$id": "#/properties/columns/items/items",
                "type": "object",
                "title": "The Items Schema",
                "additionalProperties": false,
                "required": [
                  "sourceColumn",
                  "destColumn",
                  "columnType",
                  "cast"
                ],
                "properties": {
                  "sourceColumn": {
                    "$id": "#/properties/columns/items/items/properties/sourceColumn",
                    "type": "string",
                    "title": "The Sourcecolumn Schema",
                    "default": "",
                    "examples": [
                      "a1::class_id"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "destColumn": {
                    "$id": "#/properties/columns/items/items/properties/destColumn",
                    "type": "string",
                    "title": "The Destcolumn Schema",
                    "default": "",
                    "examples": [
                      "class_id"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "columnType": {
                    "$id": "#/properties/columns/items/items/properties/columnType",
                    "type": "string",
                    "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp
                    ],
                    "title": "The Columntype Schema",
                    "default": "",
                    "examples": [
                      "integer"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "cast": {
                    "$id": "#/properties/columns/items/items/properties/cast",
                    "type": "boolean",
                    "title": "The Cast Schema",
                    "default": false,
                    "examples": [
                      false
                    ]
                  }
                }
              }
            }
          }
        }
    };

    public getInput() {
        let columns = this.input.columns;
        if (columns == null) {
            columns = this.dagNode.getParents().map(() => {
                return [{
                    sourceColumn: "",
                    destColumn: "",
                    columnType: ColumnType.string,
                    cast: false
                }]
            });
        }
        return {
            unionType: this.input.unionType || UnionType.Union,
            columns: this.input.columns || columns,
            dedup: this.input.dedup || false
        };
    }
}