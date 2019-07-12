class DagNodeDFOut extends DagNodeOutOptimizable {
    protected input: DagNodeDFOutInput;

    private _queries: Map<string, string>; // non-persist

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.DFOut;
        this.display.icon = "&#xe955;"; // XXX TODO: UI design
        this.input = this.getRuntime().accessible(new DagNodeDFOutInput(options.input));
        this.optimized = this.subType === DagNodeSubType.DFOutOptimized;
        this._queries = new Map<string, string>();
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "enum": [DagNodeSubType.DFOutOptimized, null]
          }
        }
    };

    public setParam(input: DagNodeDFOutInputStruct = <DagNodeDFOutInputStruct>{}): void {
        this.input.setInput({
            name: input.name,
            linkAfterExecution: input.linkAfterExecution,
            columns: input.columns
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        if (this.optimized) {
            const allCols = [];
            const changes = [];
            const selectedCols = this.input.getInput(replaceParameters).columns;
            let hiddenColumns = this.lineage.getHiddenColumns();
            columns.forEach((col) => {
                const colName = col.getBackColName();
                const selectedCol = selectedCols.find((selCol) => {
                    return selCol.sourceName === colName;
                });
                if (selectedCol != null) {
                    if (selectedCol.destName !== colName) {
                        const progCol = ColManager.newPullCol(selectedCol.destName, selectedCol.destName, col.getType());
                        allCols.push(progCol);
                        changes.push({
                            from: col,
                            to: progCol,
                            hidden: hiddenColumns.has(colName)
                        });
                    } else {
                        if (!hiddenColumns.has(colName)) {
                            allCols.push(col);
                        }
                    }
                } else {
                    changes.push({
                        from: col,
                        to: null,
                        hidden: hiddenColumns.has(col.getBackColName())
                    });
                }
            });
            hiddenColumns.forEach((col) => {
                const colName = col.getBackColName();
                const selectedCol = selectedCols.find((selCol) => {
                    return selCol.sourceName === colName;
                });
                if (selectedCol != null) {
                    if (selectedCol.destName !== colName) {
                        const progCol = ColManager.newPullCol(selectedCol.destName, selectedCol.destName, col.getType());
                        allCols.push(progCol);
                        changes.push({
                            from: col,
                            to: progCol
                        });
                    } else {
                        allCols.push(col);
                    }
                } else {
                    changes.push({
                        from: col,
                        to: null,
                        hidden: true
                    });
                }
            });
            hiddenColumns.clear();
            return {
                columns: allCols,
                changes: changes
            }
        } else {
            let hiddenColumns = this.lineage.getHiddenColumns();
            let allCols = [];
            columns.forEach((col) => {
                if (!hiddenColumns.has(col.getBackColName())) {
                    allCols.push(col);
                }
            })
            return {
                columns: allCols,
                changes: []
            };
        }
    }

    public shouldLinkAfterExecuition(): boolean {
        return this.input.getInput().linkAfterExecution;
    }

    /**
     * @override
     */
    public beRunningState(): void {
        this._queries.clear();
        super.beRunningState();
    }

    /**
     * Stores the query and destable for a specific tabid's request
     * @param tabId the tab making the request
     * @param destTable destination table
     */
    public setStoredQueryDest(tabId: string, destTable: string): void{
        this._queries.set(tabId, destTable);
    }

    /**
     * Returns stored query info
     * @param tabId
     */
    public getStoredQueryDest(tabId: string): string {
        return this._queries.get(tabId);
    }

    /**
     * Removes stored query info
     * @param tabId
     */
    public deleteStoredQuery(tabId: string) {
        this._queries.delete(tabId);
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return this.optimized ? "Link Out Optimized" : "Link Out";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFOutInputStruct = this.getParam();
        if (input.name) {
            hint = `Name: ${input.name}`;
        }
        return hint;
    }


    protected _getColumnsUsedInInput() {
        return null;
    }

    protected _clearConnectionMeta(keepRetina?: boolean): void {
        super._clearConnectionMeta(keepRetina);
        this._queries.clear();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDFOut = DagNodeDFOut;
};
