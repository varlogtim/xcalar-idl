class DagNodeSetInput extends DagNodeInput {
    protected input: DagNodeSetInputStruct;
    private dagNode: DagNode;

    constructor(inputStruct: DagNodeSetInputStruct, dagNode) {
        if (inputStruct == null) {
          inputStruct = {
            unionType: DagNodeSetInput._convertSubTypeToUnionType(dagNode.getSubType())
              || UnionType.Union,
            columns: null, dedup: false
          };
        }

        if (inputStruct.columns == null) {
          inputStruct.columns = dagNode.getParents().map(() => {
                return [{
                    sourceColumn: "",
                    destColumn: "",
                    columnType: ColumnType.string,
                    cast: false
                }]
            });
        }

        inputStruct.dedup = inputStruct.dedup || false;

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

    public getInput(replaceParameters?: boolean): DagNodeSetInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            unionType: input.unionType,
            columns: input.columns,
            dedup: input.dedup
        };
    }

    /**
     * Check if the unionType is converted from node subType
     */
    public isUnionTypeConverted(): boolean {
      return DagNodeSetInput._convertSubTypeToUnionType(this.dagNode.getSubType()) != null;
    }

    private static _convertSubTypeToUnionType(subType: DagNodeSubType): UnionType {
        if (subType == null) {
            return null;
        }

        const typeMap = {};
        typeMap[DagNodeSubType.Union] = UnionType.Union;
        typeMap[DagNodeSubType.Except] = UnionType.Except;
        typeMap[DagNodeSubType.Intersect] = UnionType.Intersect;

        return typeMap[subType];
    }
}