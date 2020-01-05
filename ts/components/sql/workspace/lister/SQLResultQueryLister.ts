class SQLResultQueryLister extends AbstractSQLResultLister{
    private _isShowing: boolean;

    constructor(container) {
        super(container);
    }

    /**
     * @override
     */
    public show(): void {
        if (this._isShowing) {
            return;
        }
        this._isShowing = true;
        super.show();
    }

    /**
     * @override
     */
    public close(): void {
        this._isShowing = false;
        super.close();
    }

    protected async _getList(): Promise<string[]> {
        const snippets = await SQLSnippet.Instance.listSnippetsAsync();
        return snippets.map((snippet) => snippet.name);
    }

    protected _getActions(): {name: string, text: string}[] {
        return [{
            name: "delete",
            text: SQLTStr.toDelete
        }, {
            name: "download",
            text: SQLTStr.download
        }, {
            name: "open",
            text: SQLTStr.open
        }];
    }

    protected _getHintHTML(): HTML {
        return '<div class="hintArea">' +
                    '<b>No saved queries</b>' +
                    '<div class="hint">Write and save a SQL query to get started</div>' +
                '</div>';
    }
    
    protected _registerEvents(): void {
        this
        .on("open", ({ name }) => {
            SQLEditorSpace.Instance.openSnippet(name);
        })
        .on("download", ({ name }) => {
            SQLSnippet.Instance.downloadSnippet(name);
        })
        .on("delete", ({ name }) => {
            SQLEditorSpace.Instance.deleteSnippet(name, () => {
                // refresh the list
                this._render();
            });
        });
    }
}