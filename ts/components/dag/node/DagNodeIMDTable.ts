class DagNodeIMDTable extends DagNodeIn {
    protected input: DagNodeIMDTableInput;
    protected columns: ProgCol[];
    private elapsedTime: number;

    public constructor(options: DagNodeInInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.IMDTable;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xe910;";
        this.input = this.getRuntime().accessible(new DagNodeIMDTableInput(options.input));
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
            "maxItems": 0,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The schema Schema",
            "minItems": 0,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/schema/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "name",
                "type"
              ],
              "properties": {
                "name": {
                  "$id": "#/properties/schema/items/properties/name",
                  "type": "string",
                  "minLength": 1,
                  "title": "The name Schema",
                  "default": "",
                  "examples": ["column name"],
                  "pattern": "^(.*)$"
                },
                "type": {
                  "$id": "#/properties/schema/items/properties/type",
                  "type": ["string", "null"],
                  "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp,
                        ColumnType.money,
                        ColumnType.mixed,
                        ColumnType.object,
                        ColumnType.array,
                        ColumnType.unknown,
                        null
                    ],
                  "title": "The type Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              }
            }
          }
        }
    };

    /**
     * Set dataset node's parameters
     * @param input {DagNodeIMDTableInputStruct}
     */
    public setParam(input: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>{}, noAutoExecute?: boolean): void {
        const source: string = input.source;
        const version: number = input.version;
        const filterString: string = input.filterString;
        const schema: ColSchema[] = input.schema;
        const limitedRows: number = input.limitedRows;
        this.setSchema(schema);
        this.input.setInput({
            source: source,
            version: version,
            filterString: filterString,
            schema: schema,
            limitedRows: limitedRows
        });
        super.setParam(null, noAutoExecute);
    }

    public getSource(): string {
        return this.getParam().source;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Table";
    }


    /**
     * executing an IMDTable node involves doing a XcalarRestoreTable and XcalarRefreshTable
     * which do not go through XcalarQuery so we get stats via XIApi.getTableMeta
     * instead of XcalarQueryState
     * @override
     */
    public async updateStepThroughProgress(): Promise<void> {
        return super._updateProgressFromTable(XcalarApisT.XcalarApiSelect, this.elapsedTime);
    }

    public setElapsedTime(elapsedTime) {
        this.elapsedTime = elapsedTime;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeIMDTableInputStruct = this.getParam();
        if (input.source) {
            hint = `Source: ${input.source}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIMDTable = DagNodeIMDTable;
};
