abstract class AbstractSQLResultLister {
    private _container: string;
    private _event: XcEvent;

    constructor(container) {
        this._container = container;
        this._event = new XcEvent();
        this._addEventListeners();
        this._registerEvents();
    }

    public show(): void {
        this._render();
    }

    public close(): void {
        this._getListSection().empty();
    }

    public on(event: string, callback: Function): AbstractSQLResultLister {
        this._event.addEventListener(event, callback);
        return this;
    }

    public trigger(event: string): void {
        this._event.dispatchEvent(event);
    }

    protected abstract _getHintHTML(): HTML;
    protected abstract async _getList(): Promise<string[]>;
    protected abstract _getActions(): {name: string, text: string}[];
    protected abstract _registerEvents(): void;

    protected _getSection(): JQuery {
        return $(`#${this._container}`);
    }

    protected async _render(): Promise<void> {
        let html: HTML = "";
        let timer;
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        try {
            timer = setTimeout(() => {
                xcUIHelper.showRefreshIcon(this._getListSection(), true, deferred.promise());
            }, 500);

            const list: string[] = await this._getList();
            if (list.length === 0) {
                html = this._getHintHTML();
            } else {
                const actionHTML: HTML = this._getActionsHTML();
                html = list.map((name) => {
                    const row: HTML =
                    '<div class="row">' +
                        '<span class="name">' +
                            name +
                        '</span>' +
                        actionHTML +
                    '</div>';
                    return row;
                }).join("");
            }
        } catch (e) {
            console.error(e);
            html = '<div class="error">' +
                        'Error Occurred, cannot list the result' +
                    '</div>';
        } finally {
            this._getListSection().html(html);
            this._selectRow(null);
            clearTimeout(timer);
            deferred.resolve();
        }
    }

    private _getListSection(): JQuery {
        return this._getSection().find(".listSection");
    }

    private _getEntryNameFromRow($row: JQuery): string {
        return $row.find(".name").text();
    }


    private _getActionsHTML(): HTML {
        const html: HTML = this._getActions().map((action) => {
            const classNames: string[] = ["action", "xc-action", action.name];
            return '<span class="' + classNames.join(" ") + '" data-action="' + action.name + '">' +
                        action.text +
                    '</span>';
        }).join("");
        return html;
    }

    private _selectRow($row: JQuery): void {
        this._getListSection().find(".row.selected").removeClass("selected");
        if ($row != null) {
            $row.addClass("selected");
        }
    }

    private _addEventListeners(): void {
        const $listSection = this._getListSection();
        $listSection.on("click", ".row", (event) => {
            this._selectRow($(event.currentTarget));
        });

        // click on an action
        $listSection.on("click", ".action", (event) => {
            const $action = $(event.currentTarget);
            const action = $action.data("action");
            const $row = $action.closest(".row");
            const name: string = this._getEntryNameFromRow($row);
            this._event.dispatchEvent(action, {name})
        });
    }
}