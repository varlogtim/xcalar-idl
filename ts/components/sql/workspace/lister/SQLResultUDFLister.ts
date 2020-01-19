class SQLResultUDFLister extends AbstractSQLResultLister{
    constructor(container) {
        super(container);
        this._addExtraEventListeners();
    }

    protected async _getList(): Promise<string[]> {
        return UDFFileManager.Instance.listSQLUDFFuncs().map((fn) => fn.name);
    }

    protected _getActions(): {name: string, text: string}[] {
        return [{
            name: "compose",
            text: SQLTStr.Compose
        }];
    }

    protected _getHintHTML(): HTML {
        return '<div class="hintArea">' +
                    '<b>No available UDF</b>' +
                    '<div class="hint">Add a new UDF to get started</div>' +
                '</div>';
    }

    protected _registerEvents(): void {
        this
        .on("compose", async ({ name }) => {
            try {
                const fn = UDFFileManager.Instance.listSQLUDFFuncs().find((fn) => fn.name === name);
                const inputSignature = new Array(fn.numArg).fill(null)
                .map((_v, i) => `Column${i + 1}`).join(", ");
                const sql: string =
                `-- This is a sample code to use UDF\n` +
                `select ${fn.name}(${inputSignature}) from;`;
                SQLWorkSpace.Instance.newSQL(sql);
            } catch (e) {
                console.error(e);
                Alert.error(ErrTStr.Error, "Error occurred when compose query from table function.");
            }
        });
    }

    private _addExtraEventListeners(): void {
        this._getSection().find(".newUDF").click(() => {
            UDFFileManager.Instance.open("sql.py");
        })
    }
}