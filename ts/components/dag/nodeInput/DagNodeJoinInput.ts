class DagNodeJoinInput extends DagNodeInput {
    protected input: DagNodeJoinInputStruct;
    private dagNode: DagNode;

    public constructor(inputStruct: DagNodeJoinInputStruct, dagNode: DagNode) {
      if (inputStruct == null) {
        inputStruct = {
          joinType: DagNodeJoinInput._convertSubTypeToJoinType(dagNode.getSubType())
            || JoinOperatorTStr[JoinOperatorT.InnerJoin],
          left: null, right: null, evalString: null
        };
      }
      if (inputStruct.left == null) {
        inputStruct.left = DagNodeJoinInput._getDefaultTableInfo();
      }
      if (inputStruct.right == null) {
        inputStruct.right = DagNodeJoinInput._getDefaultTableInfo();
      }
      if (inputStruct.evalString == null) {
        inputStruct.evalString = '';
      }

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
          "joinType",
          "left",
          "right",
          "evalString"
        ],
        "properties": {
          "joinType": {
            "$id": "#/properties/joinType",
            "type": "string",
            "enum": JoinOpPanelStep1.joinTypeMenuItems.filter((item)=> {
                return !item.isNotMenuItem;
            }).map((item) => {
                return item.value;
            }),
            "title": "The Jointype Schema",
            "default": "",
            "examples": [
              "innerJoin"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "left": {
            "$id": "#/properties/left",
            "type": "object",
            "title": "The Left Schema",
            "additionalProperties": false,
            "required": [
              "columns",
              "casts",
              "rename"
            ],
            "properties": {
              "columns": {
                "$id": "#/properties/left/properties/columns",
                "type": "array",
                "title": "The Columns Schema",
                "minItems": 1,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/columns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::class_id"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "casts": {
                "$id": "#/properties/left/properties/casts",
                "type": "array",
                "title": "The Casts Schema",
                "minItems": 1, // TODO: array length should be equal to columns length
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/casts/items",
                  "type": ["string", "null"],
                  "enum": [
                    ColumnType.integer,
                    ColumnType.float,
                    ColumnType.string,
                    ColumnType.boolean,
                    ColumnType.timestamp,
                    null
                  ],
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "rename": {
                "$id": "#/properties/left/properties/rename",
                "type": "array",
                "title": "The Rename Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/rename/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "additionalProperties": false,
                  "required": [
                    "sourceColumn",
                    "destColumn",
                    "prefix"
                  ],
                  "properties": {
                    "sourceColumn": {
                      "$id": "#/properties/left/properties/rename/items/properties/sourceColumn",
                      "type": "string",
                      "title": "The Sourcecolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "destColumn": {
                      "$id": "#/properties/left/properties/rename/items/properties/destColumn",
                      "type": "string",
                      "title": "The Destcolumn Schema",
                      "default": "",
                      "examples": [
                        "a1"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "prefix": {
                      "$id": "#/properties/left/properties/rename/items/properties/prefix",
                      "type": "boolean",
                      "title": "The Prefix Schema",
                      "default": false,
                      "examples": [
                        true
                      ]
                    }
                  }
                }
              }
            }
          },
          "right": {
            "$id": "#/properties/right",
            "type": "object",
            "title": "The Right Schema",
            "additionalProperties": false,
            "required": [
              "columns",
              "casts",
              "rename"
            ],
            "properties": {
              "columns": {
                "$id": "#/properties/right/properties/columns",
                "type": "array",
                "title": "The Columns Schema",
                "minItems": 1,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/columns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::duration"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "casts": {
                "$id": "#/properties/right/properties/casts",
                "type": "array",
                "title": "The Casts Schema",
                "minItems": 1,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/casts/items",
                  "type": ["string", "null"],
                  "enum": [
                    ColumnType.integer,
                    ColumnType.float,
                    ColumnType.string,
                    ColumnType.boolean,
                    ColumnType.timestamp,
                    null
                  ],
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "string"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "rename": {
                "$id": "#/properties/right/properties/rename",
                "type": "array",
                "title": "The Rename Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/rename/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "additionalProperties": false,
                  "required": [
                    "sourceColumn",
                    "destColumn",
                    "prefix"
                  ],
                  "properties": {
                    "sourceColumn": {
                      "$id": "#/properties/right/properties/rename/items/properties/sourceColumn",
                      "type": "string",
                      "title": "The Sourcecolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "destColumn": {
                      "$id": "#/properties/right/properties/rename/items/properties/destColumn",
                      "type": "string",
                      "title": "The Destcolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "prefix": {
                      "$id": "#/properties/right/properties/rename/items/properties/prefix",
                      "type": "boolean",
                      "title": "The Prefix Schema",
                      "default": false,
                      "examples": [
                        true
                      ]
                    }
                  }
                }
              }
            }
          },
          "evalString": {
            "$id": "#/properties/evalString",
            "type": "string",
            "title": "The Evalstring Schema",
            "default": "",
            "examples": [
              ""
            ],
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeJoinInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString
        };
    }

    public setEval(evalString: string) {
        this.input.evalString = evalString;
    }

    /**
     * Check if the joinType is converted from node subType
     */
    public isJoinTypeConverted(): boolean {
      return DagNodeJoinInput._convertSubTypeToJoinType(this.dagNode.getSubType()) != null;
    }

    private static _convertSubTypeToJoinType(subType: DagNodeSubType): string {
      if (subType == null) {
          return null;
      }

      const typeMap = {};
      typeMap[DagNodeSubType.LookupJoin] = JoinOperatorTStr[JoinOperatorT.LeftOuterJoin];

      return typeMap[subType];
    }

    private static _getDefaultTableInfo(): DagNodeJoinTableInput {
        return {
            columns: [""],
            casts: [null],
            rename: [{sourceColumn: "", destColumn: "", prefix: false}]
        }
    }
}