class SQLSnippetListModal {
    private static _instance: SQLSnippetListModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _callback: (name: string, action: string) => void;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    /**
     * SQLSnippetListModal.Instance.show
     * @param callback
     */
    public show(callback: (name: string, action: string) => void): void {
        this._modalHelper.setup();
        this._render();
        this._callback = callback;
    }

    private _getModal(): JQuery {
        return $("#sqlSnippetListModal");
    }

    private _getListSection(): JQuery {
        return this._getModal().find(".listSection");
    }

    private _getSnippetNameFromRow($row: JQuery): string {
        return $row.find(".name").text();
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getListSection().empty();
        this._callback = null;
    }

    private _submitForm(action: string): void {
        const $row: JQuery = this._getListSection().find(".row.selected");
        if ($row.length && typeof this._callback === "function") {
            const name: string = this._getSnippetNameFromRow($row);
            this._callback(name, action);
        }
        this._close();
    }

    private _refresh(): void {
        const list = SQLSnippet.Instance.listSnippets();
        this._renderList(list);
        this._selectRow(null);
    }

    private _render(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let timer = setTimeout(() => {
            xcUIHelper.showRefreshIcon(this._getListSection(), true, deferred.promise());
        }, 500);

        SQLSnippet.Instance.listSnippetsAsync()
        .then((res) => {
            this._renderList(res);
            this._selectRow(null);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            clearTimeout(timer);
        });

        return deferred.promise();
    }

    private _renderList(lists: {name: string, snippet: string}[]): void {
        let html: HTML = lists.map((list) => {
            if (list.name == CommonTxtTstr.Untitled) {
                return "";
            }
            let row: HTML =
                '<div class="row">' +
                    '<span class="name">' +
                        list.name +
                    '</span>' +
                    '<span class="action delete xc-action">' +
                        SQLTStr.toDelete +
                    '</span>' +
                    '<span class="action download xc-action">' +
                        SQLTStr.download +
                    '</span>' +
                    '<span class="action open xc-action">' +
                        SQLTStr.open +
                    '</span>' +
                '</div>';
            return row;
        }).join("");
        this._getListSection().html(html);
    }

    private _selectRow($row: JQuery): void {
        let $confirmBtn: JQuery = this._getModal().find(".confirm");
        this._getListSection().find(".row.selected").removeClass("selected");
        if ($row != null) {
            $row.addClass("selected");
            $confirmBtn.removeClass("xc-disabled");
        } else {
            $confirmBtn.addClass("xc-disabled");
        }
    }

    private _addEventListeners() {
        const $modal = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        const $listSection = this._getListSection();
        $listSection.on("click", ".row", (event) => {
            this._selectRow($(event.currentTarget));
        });

        // click open button
        $listSection.on("click", ".open", (event) => {
            const $row = $(event.currentTarget).closest(".row");
            this._selectRow($row);
            this._submitForm("open");
        });

        // click download button
        $listSection.on("click", ".download", (event) => {
            const $row = $(event.currentTarget).closest(".row");
            const name: string = this._getSnippetNameFromRow($row);
            SQLSnippet.Instance.downloadSnippet(name);
        });

        // click delete button
        $listSection.on("click", ".delete", (event) => {
            const $row = $(event.currentTarget).closest(".row");
            const name: string = this._getSnippetNameFromRow($row);
            SQLEditorSpace.Instance.deleteSnippet(name, () => {
                this._refresh();
            });
        });
    }
}