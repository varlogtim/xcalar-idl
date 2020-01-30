class SQLResultQueryLister extends AbstractSQLResultLister{
    constructor(container) {
        super(container);
    }

    protected async _getList(): Promise<string[]> {
        let snippets = await SQLSnippet.Instance.listSnippetsAsync();
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
        .on("open", ({ name, $target }) => {
            const succeed = SQLEditorSpace.Instance.openSnippet(name);
            if (!succeed) {
                StatusBox.show(SQLTStr.ReadOnly, $target);
            }
        })
        .on("download", ({ name }) => {
            SQLSnippet.Instance.downloadSnippet(name);
        })
        .on("delete", ({ name }) => {
            SQLSnippet.Instance.deleteSnippet(name, () => {
                // refresh the list
                this._render();
            });
        });
    }
}