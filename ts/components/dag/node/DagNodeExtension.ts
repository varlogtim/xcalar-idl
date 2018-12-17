/* XXX TODO: The current extension node is a quick implementation
to fit the old extension architecture into DF 2.0.
In next step, Extension should combine with the custom node,
this will require the ability to anti comiple a xcalar query into
DF 2.0 operators. Once this is possible, extension(aka custome) can be
built by:
1. run Extension trigger function after parameter is configure
2. comiple the xcalarQuery into DF 2.0 operators
3. build the custome node
*/
class DagNodeExtension extends DagNode {
    protected input: DagNodeExtensionInput;
    private newColumns: {name: string, type: ColumnType}[];
    private droppedColumns: string[];

    public constructor(options: DagNodeExtensionInfo) {
        super(options);
        this.type = DagNodeType.Extension;
        this.allowAggNode = true;
        this.maxParents = -1;
        this.minParents = 1;
        this.newColumns = options.newColumns || [];
        this.droppedColumns = options.droppedColumns || [];
        this.display.icon = "&#xe96d;";
        this.input = new DagNodeExtensionInput(options.input);
    }

    public getConvertedParam(): DagNodeExtensionInputStruct {
        const param: DagNodeExtensionInputStruct = this.input.getInput();
        const convertedArgs: object = this._convertExtensionArgs(param.args);
        return {
            moduleName: param.moduleName,
            functName: param.functName,
            args: convertedArgs
        }
    }

    /**
     * Set Extension node's parameters
     * @param input {DagNodeExtensionInputStruct}
     * @param input.evalString {string}
     */
    public setParam(
        input: DagNodeExtensionInputStruct = <DagNodeExtensionInputStruct>{}
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getColumnChangs(input)
        .then(() => {
            this.input.setInput({
                moduleName: input.moduleName,
                functName: input.functName,
                args: input.args
            });
            super.setParam();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO: This is a hack now, should check if all the extension
    // we have can apply this, otherwise need to change
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const set: Set<string> = new Set();
        this.droppedColumns.forEach((name) => {
            set.add(name);
        });
        columns = columns.filter((progCol) => {
            if (set.has(progCol.getBackColName())) {
                // drop column
                changes.push({
                    from: progCol,
                    to: null
                });
                return false;
            }
            return true;
        });
        this.newColumns.forEach((column) => {
            // add column
            const fonrtName: string = xcHelper.parsePrefixColName(column.name).name;
            const progCol: ProgCol = ColManager.newPullCol(fonrtName, column.name, column.type);
            columns.push(progCol);
            changes.push({
                from: null,
                to: progCol
            })
        });
        return {
            columns: columns,
            changes: changes
        }
    }

    /**
     * @override
     */
    protected _getSerializeInfo(includeStats?: boolean):DagNodeExtensionInfo {
        const serializedInfo: DagNodeExtensionInfo = <DagNodeExtensionInfo>super._getSerializeInfo(includeStats);
        serializedInfo.newColumns = this.newColumns;
        serializedInfo.droppedColumns = this.droppedColumns;
        return serializedInfo;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        try {
            const input: DagNodeExtensionInputStruct = this.getParam();
            const ext: ExtensionInfo = ExtensionManager.getEnabledExtensions().filter((ext) => {
                return ext.name === input.moduleName;
            })[0];
            if (ext != null) {
                const func: ExtensionFuncInfo = ext.buttons.filter((funcInfo) => {
                    return funcInfo.fnName === input.functName;
                })[0];

                if (func != null) {
                    hint = `Func: ${func.buttonText}`;
                }
            }
        } catch (e) {
            console.error(e);
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    private _convertExtensionArgs(args: object): object {
        const extArgs: object = {};
        for (let key in args) {
            let val: any = args[key];
            if (key === "triggerNode") {
                val = this._getExtensionTable(args[key]);
            } else if (val instanceof Array) {
                // subArgs
                val = val.map((subArg) => {
                    if (typeof subArg === "object" &&
                        subArg["triggerColumn"] != null
                    ) {
                        return this._getExtensionColumn(subArg["triggerColumn"]);
                    } else {
                        return subArg;
                    }
                })
            } else if (typeof val == "object") {
                if (val["triggerNode"] != null) {
                    val = this._getExtensionTable(args[key]["triggerNode"]);
                } else if (val["triggerColumn"] != null) {
                    val = this._getExtensionColumn(val["triggerColumn"]);
                }
            }
            extArgs[key] = val;
        }
        return extArgs;
    }

    private _getExtensionTable(nodeIndex): XcSDK.Table {
        if (nodeIndex == null) {
            return null;
        }
        const parentNode: DagNode = this.getParents()[nodeIndex];
        if (parentNode == null) {
            return null;
        }
        return new XcSDK.Table(parentNode.getTable(), null, true);
    }

    private _getExtensionColumn = (col: {
        name: string,
        type: ColumnType
    } | {
        name: string,
        type: ColumnType
    }[]): XcSDK.Column | XcSDK.Column[] => {
        if (col instanceof Array) {
            return col.map((col: {name: string, type: ColumnType}) => {
                return new XcSDK.Column(col.name, col.type);
            });
        } else {
            return  new XcSDK.Column(col.name, col.type);
        }
    }

    private _getColumnChangs(params: DagNodeExtensionInputStruct): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            const args: object = this._convertExtensionArgs(params.args);
            // overwrite old triggerNode
            if (args["triggerNode"]) {
                const tableName: string = xcHelper.randName("XcTable");
                args["triggerNode"] = new XcSDK.Table(tableName, null, true)
            }

            const startCols: ProgCol[] = this._getColumnsFromArg(args);
            ExtensionManager.triggerFromDF(params.moduleName, params.functName, args)
            .then((_finalTable, _query, finalCols: ProgCol[]) => {
                this._updateColumnsChange(startCols, finalCols);
                deferred.resolve();
            })
            .fail(deferred.reject);
        } catch (e) {
            console.error(e);
            return deferred.reject(e);
        }
        return deferred.promise();
    }

    private _getColumnsFromArg(args: object): ProgCol[] {
        const progCols: ProgCol[] = [];
        for (let key in args) {
            let val: any = args[key];
            if (!(val instanceof Array)) {
                val = [val];
            }
            val.forEach((arg) => {
                if (arg instanceof XcSDK.Column) {
                    const colName: string = arg.getName();
                    const frontName: string = xcHelper.parsePrefixColName(colName).name;
                    const progCol: ProgCol = ColManager.newPullCol(frontName, colName, arg.getType());
                    progCols.push(progCol);
                }
            });
        }
        return progCols;
    }

    private _updateColumnsChange(
        startCols: ProgCol[],
        finalCols: ProgCol[]
    ): void {
        const map: {[key: string]: ProgCol} = {};
        startCols.forEach((progCol) => {
            if (!progCol.isDATACol()) {
                map[progCol.getBackColName()] = progCol;
            }
        });
        const newColumns: {name: string, type: ColumnType}[] = [];
        const droppedColumns: string[] = [];
        finalCols.forEach((progCol) => {
            if (progCol.isDATACol()) {
                return;
            }
            const colName: string = progCol.getBackColName();
            const colType: ColumnType = progCol.getType();
            if (map.hasOwnProperty(colName)) {
                // this column is still there, no change
                delete map[colName];
            } else {
                // new added column
                newColumns.push({
                    name: colName,
                    type: colType
                });
            }
        });

        for (let colName in map) {
            // these column are count as removed
            droppedColumns.push(colName);
        }

        this.newColumns = newColumns;
        this.droppedColumns = droppedColumns;
    }
}