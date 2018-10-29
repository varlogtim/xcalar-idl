class XcUID {
    private _prefix: string;
    private _count: number;
    private _generator: (prefix: string, count: number) => string;

    public constructor(prefix: string) {
        this._prefix = prefix;
        this._count = 0;
        this._generator = this._defaultGenrator;
    }

    get count(): number {
        return this._count;
    }

    /**
     * Generate new id
     */
    public gen(): string {
        const id: string = this._generator(this._prefix, this._count);
        this._count++;
        return id;
    }

    /**
     * To Overwrite the default generator
     * @param func
     */
    public setGenerator(func: (prefix: string, count: number) => string): void {
        this._generator = func;
    }

    private _defaultGenrator(prefix: string, count: number): string {
        const activeWKBNK: string = WorkbookManager.getActiveWKBK();
        const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
        let id: string = (workbook == null) ? null : workbook.sessionId;
        id = id || xcHelper.randName("id");
        if (prefix) {
            id = prefix + "_" + id;
        }
        return id + "_" + new Date().getTime() + "_" + count;
    }
}