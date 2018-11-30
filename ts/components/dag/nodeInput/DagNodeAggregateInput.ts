class DagNodeAggregateInput extends DagNodeInput {
    protected input: DagNodeAggregateInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "evalString",
          "dest",
          "mustExecute"
        ],
        "properties": {
          "evalString": {
            "$id": "#/properties/evalString",
            "type": "string",
            "title": "The Evalstring Schema",
            "default": "",
            "examples": [
              "avg(a::class_id)"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "dest": {
            "$id": "#/properties/dest",
            "type": "string",
            "title": "The Dest Schema",
            "default": "",
            "examples": [
              "^aggName"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "mustExecute": {
            "$id": "#/properties/mustExecute",
            "type": "boolean",
            "title": "The Mustexecute Schema",
            "default": false,
            "examples": [
              true
            ]
          }
        }
    };

    public getInput(replaceParameters?: boolean) {
        const input = super.getInput(replaceParameters);
        return {
            evalString: input.evalString || "",
            dest: input.dest || "",
            mustExecute: input.mustExecute || false
        };
    }

    public setEval(evalString) {
        this.input.evalString = evalString;
    }
}