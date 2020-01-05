class SQLResultFuncLister extends AbstractSQLResultLister{
    constructor(container) {
        super(container);
        this._addExtraEventListeners();
    }

    protected async _getList(): Promise<string[]> {
        return DagTabSQLFunc.listFuncs();
    }

    protected _getActions(): {name: string, text: string}[] {
        return [{
            name: "edit",
            text: SQLTStr.Edit
        }, {
            name: "compose",
            text: SQLTStr.Compose
        }];
    }

    protected _getHintHTML(): HTML {
        return '<div class="hintArea">' +
                    '<b>No available table creator functions</b>' +
                    '<div class="hint">Add a new table creator function to get started</div>' +
                '</div>';
    }

    protected _registerEvents(): void {
        this
        .on("edit", ({ name }) => {
            $("#modelingDataflowTab").click();
            const dagTab = DagTabSQLFunc.getFunc(name);
            DagTabManager.Instance.loadTab(dagTab);
        })
        .on("compose", async ({ name }) => {
            try {
                const numInput = await DagTabSQLFunc.getFuncInputNum(name);
                const inputSignature = new Array(numInput).fill(null)
                .map((_v, i) => `Input${i + 1}`).join(", ");
                const sql: string =
                `-- This is a sample code to use table creator function\n` +
                `select * from ${name}(${inputSignature});`;
                SQLWorkSpace.Instance.newSQL(sql);
            } catch (e) {
                console.error(e);
                Alert.error(ErrTStr.Error, "Error occurred when compose query from table creator function.");
            }
        });
    }

    private _addExtraEventListeners(): void {
        this._getSection().find(".newSQLFunc").click(() => {
            DagViewManager.Instance.createSQLFunc(true);
        })
    }
}