class DagNodeSQLFuncOut extends DagNodeOut {
    protected input: DagNodeSQlFuncOutInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.SQLFuncOut;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeSQlFuncOutInput(options.input);
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
          }
        }
    };

    /**
     * Set node's parameters
     * @param input {DagNodeExportInputStruct}
     */
    public setParam(input: DagNodeSQLFuncOutInputStruct = <DagNodeSQLFuncOutInputStruct>{}) {
        this.input.setInput({
            schema: input.schema,
        });
        super.setParam();
    }

    public getSchema(): ColSchema[] {
        return this.getParam().schema;
    }

    public lineageChange(
        _columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        // there should be only one parent
        const schema: ColSchema[] = this.getSchema(); // DagNodeDataset overide the function
        const colNameCache: {[key: string]: ProgCol} = {};
        const columns: ProgCol[] = schema.map((colInfo) => {
            const colName: string = colInfo.name;
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            const proglCol = ColManager.newPullCol(frontName, colName, colInfo.type);
            colNameCache[colName] = proglCol;
            return proglCol;
        });

        const changes: {from: ProgCol, to: ProgCol}[] = [];
        _columns.forEach((progCol) => {
            let name: string = progCol.getBackColName();
            if (colNameCache.hasOwnProperty(name)) {
                delete colNameCache[name];
            } else {
                changes.push({
                    from: progCol,
                    to: null
                });
            }
        });

        for (let name in colNameCache) {
            changes.push({
                from: null,
                to: colNameCache[name]
            });
        }

        return {
            columns: columns,
            changes: changes
        };
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
      let hint: string = "";
      const input: DagNodeSQLFuncOutInputStruct = this.getParam();
      if (input.schema && input.schema.length) {
          hint = `Schema: ${JSON.stringify(input.schema)}`;
      }
      return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}