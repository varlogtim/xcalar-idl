class DagNodeUpdateIMD extends DagNodeOut {
    protected input: DagNodeUpdateIMDInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.UpdateIMD;
        this.display.icon = "&#xea55;";
        this.input = new DagNodeUpdateIMDInput(options.input);
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    /**
     * Set dataset node's parameters
     * @param input {DagNodeUpdateIMDInputStruct}

     */
    public setParam(input: DagNodeUpdateIMDInputStruct): void {
        this.input.setInput({
            pubTableName: input.pubTableName,
            operator: input.operator
        });
        super.setParam();
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}