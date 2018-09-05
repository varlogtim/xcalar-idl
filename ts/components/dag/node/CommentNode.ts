class CommentNode {

    private static idCount: number = 0;
    private static idPrefix: string;

    private id: CommentNodeId;
    private text: string;
    private position: Coordinate;
    private dimensions: Dimensions;

    public static setIdPrefix(idPrefix: string): void {
        CommentNode.idPrefix = idPrefix;
    }

    public static generateId(): string {
        return "comment." + CommentNode.idPrefix + "." +
                new Date().getTime() + "." + (CommentNode.idCount++);
    }
    public constructor(options: CommentInfo) {
        this.id = options.id || CommentNode.generateId();
        this.text = options.text || "";
        this.position = options.position || {x: -1, y: -1};
        this.dimensions = options.dimensions || {width: 200, height: 100};
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
     * Generates string representing this node, for use in serializing a dagGraph.
     * @returns {string}
     */
    public serialize(): string {
        const seriazliedInfo = {
            id: this.id,
            text: this.text,
            position: this.position,
            dimensions: this.dimensions
        };
        return JSON.stringify(seriazliedInfo);
    }

    /**
     * @returns {CommentNode}
     * @param commentNode
     */
    public static deserialize(commentNode: string) {
        let commentJson = null;
        try {
            commentJson = JSON.parse(commentNode);
        } catch (error) {
            console.error("Could not parse JSON of commentNode: " + error);
            return null;
        }
        let comment = new CommentNode(commentJson);
        return comment;
    }
}