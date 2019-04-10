abstract class Durable {
    public static Version = 1;
    protected version: number;

    constructor(version) {
        this.version = version || Durable.Version;
    }

    public getVersion() {
        return this.version;
    }

    public abstract serialize(arg?: any): string;
    protected abstract _getDurable(arg?: any);
}

if (typeof exports !== 'undefined') {
    exports.Durable = Durable;
};