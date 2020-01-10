class SQLSnippetSaveModal {
    private static _instance: SQLSnippetSaveModal;

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

    /**
     * SQLSnippetSaveModal.Instance.show
     * @param name
     * @param callback
     */
    public show(name: string, callback: Function): void {
        this._modalHelper.setup();
        this._getNameInput().val(name);
        this._render();
        this._callback = callback;
    }

    private _getModal(): JQuery {
        return $("#sqlSnippetSaveModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find("input.name");
    }

    private _getListSection(): JQuery {
        return this._getModal().find(".listSection");
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getListSection().empty();
        this._getNameInput().val("");
        this._callback = null;
    }

    private _submitForm(): void {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return;
        }
        if (typeof this._callback === "function") {
            this._callback(res.name);
        }
        this._close();
    }

    private _validate(): {name: string} {
        let $nameInput: JQuery = this._getNameInput();
        const newName: string = $nameInput.val().trim();
        const isValid = xcHelper.validate([{
            $ele: $nameInput
        }, {
            $ele: $nameInput,
            error: SQLTStr.NoUntitledSnippet,
            check: () => {
                return newName === CommonTxtTstr.Untitled;
            }
        }, {
            $ele: $nameInput,
            error: SQLTStr.NoDupSnippetName,
            check: () => {
                return SQLSnippet.Instance.hasSnippet(newName);
            }
        }]);
        if (!isValid) {
            return;
        }
        return {
            name: newName
        }
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
            let row: HTML =
                '<div class="row">' +
                    `<div>${list.name}</div>` +
                '</div>';
            return row;
        }).join("");
        this._getListSection().html(html);
    }

    private _selectRow($row: JQuery): void {
        this._getListSection().find(".row.selected").removeClass("selected");
        if ($row != null) {
            $row.addClass("selected");
            this._getNameInput().val($row.text());
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
    }
}