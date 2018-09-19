class FileManager {
    private static _instance: fileManager = null;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}
