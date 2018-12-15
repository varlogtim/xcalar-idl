class DagNodeJupyter extends DagNodeOut {
    protected input: DagNodeJupyterInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Jupyter;
        this.maxParents = 1;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeJupyterInput(<DagNodeJupyterInputStruct>options.input);
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

    public setParam(input: DagNodeJupyterInputStruct = <DagNodeJupyterInputStruct>{}) {
        this.input.setInput({
            numExportRows: input.numExportRows,
            renames: input.renames.map((v) => ({
                sourceColumn: v.sourceColumn,
                destColumn: v.destColumn
            }))
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[], replaceParameters?: boolean
    ): DagLineageChange {
        const sourceColumnMap: Map<string, ProgCol> = new Map();
        for (const col of columns) {
            sourceColumnMap.set(col.getBackColName(), col);
        }

        const params = this.input.getInput(replaceParameters);
        const resultColumns: ProgCol[] = [];
        const changes: { from: ProgCol, to: ProgCol }[] = [];
        for (const { sourceColumn, destColumn } of params.renames) {
            const sourceCol = sourceColumnMap.get(sourceColumn);
            const destCol = ColManager.newPullCol(
                destColumn, destColumn, sourceCol.getType()
            );
            resultColumns.push(destCol);
            changes.push({
                from: sourceCol, to: destCol
            });
        }
        return {
            columns: resultColumns,
            changes: changes
        };
    }

    /**
     * Append code stub to current/new Jupyter notebook, and bring up the JupyterPanel
     * @description The resultant table must be generated before calling this method
     */
    public showJupyterNotebook(): void {
        const tableName = this.getTable();
        if (tableName == null || tableName.length === 0) {
            return;
        }
        const params: DagNodeJupyterInputStruct = this.getParam();
        JupyterPanel.publishTable(
            tableName,
            params.numExportRows,
            true);
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}