// XXX TODO: rename sqlType to logType
class XcLog extends Durable {
    private title: string; // log's title,
    private options: any; // log's options
    private cli: string; // (optional) cli log
    private error: string; // (optional) error log
    private sqlType: string; // (optional) log's type
    private timestamp: number; // time

    constructor(options: XcLogDurable) {
        options = options || <XcLogDurable>{};
        super(options.version);
        this.title = options.title;
        this.options = options.options || {};

        if (options.cli != null) {
            this.cli = options.cli;
        }

        if (options.error != null) {
            this.sqlType = SQLType.Error;
            this.error = options.error;
        }

        this.timestamp = options.timestamp || new Date().getTime();
    }

    public isError(): boolean {
        if (this.sqlType === SQLType.Error) {
            return true;
        } else {
            return false;
        }
    }

    public getOperation(): string {
        return this.options.operation;
    }

    public getTitle(): string {
        return this.title;
    }

    public getOptions(): any {
        return this.options;
    }

    // not used
    public serialize(): string {
        return null;
    }

    protected _getDurable() {
        return null;
    }
}