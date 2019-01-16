class SQLSnippetListModal {
    private static _instance: SQLSnippetListModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _callback: Function;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    private _getModal(): JQuery {
        return $("#sqlSnippetListModal");
    }

    private _getListSection(): JQuery {
        return this._getModal().find(".listSection");
    }

    public show(callback: Function): void {
        this._modalHelper.setup();
        this._render();
        this._callback = callback;
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getListSection().empty();
        this._callback = null;
    }

    private _submitForm(): void {
        let $row: JQuery = this._getListSection().find(".row.selected");
        if ($row.length && typeof this._callback === "function") {
            let name = $row.text();
            this._callback(name);
        }
        this._close();
    }

    private _render(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let timer = setTimeout(() => {
            xcHelper.showRefreshIcon(this._getListSection(), true, deferred.promise());
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
            let row: HTML =
                '<div class="row">' +
                    `<div>${list.name}</div>` +
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

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        const $listSection = this._getListSection();
        $listSection.on("click", ".row", (event) => {
            this._selectRow($(event.currentTarget));
        });

        $listSection.on("dblclick", ".row", (event) => {
            this._selectRow($(event.currentTarget));
            this._submitForm();
        });
    }
}