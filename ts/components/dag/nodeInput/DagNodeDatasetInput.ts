class DagNodeDatasetInput extends DagNodeInput {
    protected input: DagNodeDatasetInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "prefix",
          "source"
        ],
        "properties": {
          "prefix": {
            "$id": "#/properties/prefix",
            "type": "string",
            "title": "The Prefix Schema",
            "default": "",
            "examples": [
              "a"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "source": {
            "$id": "#/properties/source",
            "type": "string",
            "title": "The Source Schema",
            "default": "",
            "examples": [
              "DF2_5BC3F08E2DA3BFF3_1539568312810_0"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeDatasetInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source || "",
            prefix: input.prefix || ""
        };
    }
}