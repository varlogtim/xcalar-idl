class PopupPanel {
    private _id: string;
    private _options;
    private _event: XcEvent;
    private _isDocked: boolean;

    constructor(
        id: string,
        options
    ) {
        this._id = id;
        this._options = options;
        this._isDocked = true;
        this._event = new XcEvent();
        this._addEventListeners();
        this.getPanel().addClass("undockable");
        PopupManager.register(this);
    }

    public on(event: string, callback: Function): PopupPanel {
        this._event.addEventListener(event, callback);
        return this;
    }

    public toggleDock(): void {
        if (this._isDocked) {
            this._undock();
        } else {
            this._dock();
        }
    }

    public isDocked(): boolean {
        return this._isDocked;
    }

    public getPanel(): JQuery {
        return $(`#${this._id}`);
    }

    public getId(): string {
        return this._id;
    }

    public setDraggable(handleSelector: string): void {
        let minLeft = -40;
        let maxLeft: number;
        let maxTop: number;
        this.getPanel().draggable({
            "handle": handleSelector,
            "cursor": "-webkit-grabbing",
            "disabled": false,
            "containment": "",
            start: () => {
                let winWidth = window.innerWidth;
                let winHeight = window.innerHeight;
                maxLeft = winWidth - 40;
                maxTop = winHeight - 30;
            },
            drag: (_event, ui) => {
                if (ui.position.left < minLeft) {
                    ui.helper.css("left", minLeft);
                    ui.position.left = minLeft;
                } else if (ui.position.left > maxLeft) {
                    ui.helper.css("left", maxLeft);
                    ui.position.left = maxLeft;
                }
                if (ui.position.top < 1) {
                    ui.helper.css("top", 1);
                    ui.position.top = 1;
                } else if (ui.position.top > maxTop) {
                    ui.helper.css("top", maxTop);
                    ui.position.top = maxTop;
                }
            }
        });
    }

    private _getPopupButton(): JQuery {
        return this.getPanel().find(".undock");
    }

    // undock = pop up the panel
    private _undock(): void {
        this._isDocked = false;
        const $button = this._getPopupButton();
        xcTooltip.changeText($button, SideBarTStr.PopBack);
        $button.removeClass("xi_popout").addClass("xi_popin");

        this._event.dispatchEvent("Undock");
        this._event.dispatchEvent("Undock_BroadCast");

        const $panel = this.getPanel();
        $panel.on("mousedown.undock", () => {
            if (!this._isDocked) {
                this._event.dispatchEvent("BringFront_BroadCast");
            }
        });

        $panel.addClass("undocked"); // only when all set make it undocked
    }

    // dock = pop back the panel
    private _dock(): void {
        const $panel = this.getPanel();
        this._isDocked = true;
        $panel
        .removeClass("undocked")
        .attr("style", ""); // reset position and size to default
        $panel.off("mousedown.undock");

        const $button = this._getPopupButton();
        xcTooltip.changeText($button, SideBarTStr.PopOut);
        $button.removeClass("xi_popin").addClass("xi_popout");

        this._event.dispatchEvent("Dock");
        this._event.dispatchEvent("Dock_BroadCast");
    }

    private _addEventListeners(): void {
        const $button = this._getPopupButton();
        $button.click(() => {
            this.toggleDock();
        });

    }
}