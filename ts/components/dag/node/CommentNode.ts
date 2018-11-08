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