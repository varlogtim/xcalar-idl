// TODO: remove
class UDF {
    /* Unit Test Only */
    public static __testOnly__: {
        isEditableUDF;
        getEntireUDF;
        parseSyntaxError;
        upload;
        inputUDFFuncList;
        readUDFFromFile;
    } = {};

    public static setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.isEditableUDF = (moduleName: string) =>
                this._isEditableUDF(moduleName);
            this.__testOnly__.getEntireUDF = (moduleName: string) =>
                this._getEntireUDF(moduleName);
            this.__testOnly__.parseSyntaxError = (error: {error: string}) =>
                this._parseSyntaxError(error);
            this.__testOnly__.upload = (
                moduleName: string,
                entireString: string
            ) => this._upload(moduleName, entireString);
            this.__testOnly__.inputUDFFuncList = (module: string) =>
                this._inputUDFFuncList(module);
            this.__testOnly__.readUDFFromFile = (
                file: File,
                moduleName: string
            ) => this._readUDFFromFile(file, moduleName);
        }
    }
    /* End Of Unit Test Only */
}
