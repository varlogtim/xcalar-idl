class CommentNode {

    private static uid: XcUID;

    private id: CommentNodeId;
    private text: string;
    private position: Coordinate;
    private dimensions: Dimensions;

    public static setup(): void {
        this.uid = new XcUID("comment");
    }

    public static generateId(): string {
        return this.uid.gen();
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": true,
        "required": [
          "id",
          "dimensions",
          "text"
        ],
        "properties": {
          "id": {
            "$id": "#/properties/id",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "nodeId": {
            "$id": "#/properties/nodeId",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "position": {
            "$id": "#/properties/position",
            "type": "object",
            "additionalProperties": true,
            "required": [
              "x",
              "y"
            ],
            "properties": {
              "x": {
                "$id": "#/properties/position/properties/x",
                "type": "integer",
                "minimum": 0
              },
              "y": {
                "$id": "#/properties/position/properties/y",
                "type": "integer",
                "minimum": 0
              }
            }
          },
          "dimensions": {
            "$id": "#/properties/dimensions",
            "type": "object",
            "additionalProperties": true,
            "required": [
              "width",
              "height"
            ],
            "properties": {
              "width": {
                "$id": "#/properties/dimensions/properties/width",
                "type": "integer",
                "minimum": 20.0,
                "maximum": 2000.0
              },
              "height": {
                "$id": "#/properties/dimensions/properties/height",
                "type": "integer",
                "minimum": 20.0,
                "maximum": 2000.0
              }
            }
          },
          "text": {
            "$id": "#/properties/text",
            "type": "string"
          }
        }
    };

     /**
     * @returns schema with id replaced with nodeId (used for validating copied nodes)
     */
    public static getCopySchema() {
        let schema = xcHelper.deepCopy(CommentNode.schema);
        schema.required.splice(schema.required.indexOf("id"), 1);
        schema.required.push("nodeId");
        return schema;
    }


    public constructor(options: CommentInfo) {
        this.id = options.id || CommentNode.generateId();
        this.text = options.text || "";
        this.position = options.position || {x: -1, y: -1};
        this.dimensions = options.dimensions || {width: 180, height: 80};
    }

    public getId(): string {
        return this.id;
    }

    public setText(text): void {
        this.text = text;
    }

    public getText(): string {
        return this.text;
    }

    public clear(): void {
        this.text = "";
    }

    public setPosition(position: Coordinate): void {
        this.position.x = position.x;
        this.position.y = position.y;
    }

    public getPosition(): Coordinate {
        return this.position;
    }

    public setDimensions(dimensions: Dimensions) {
        this.dimensions = dimensions;
    }

    public getDimensions(): Dimensions {
        return this.dimensions;
    }

    /**
     * Generates the serializable info
     */
    public getSerializableObj(): CommentInfo {
        return {
            id: this.id,
            text: this.text,
            position: this.position,
            dimensions: this.dimensions
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.CommentNode = CommentNode;
};
