class PopupPanel {
    private _id: string;
    private _options: {draggableHeader?: string, noUndock?: boolean};
    private _event: XcEvent;
    private _isDocked: boolean;

    constructor(
        id: string,
        options: {draggableHeader?: string, noUndock?: boolean}
    ) {
        this._id = id;
        this._options = options;
        this._isDocked = true;
        this._event = new XcEvent();
        this._addEventListeners();

        const $panel = this.getPanel();
        if (!this._options.noUndock) {
            $panel.addClass("undockable");
        }

        PopupManager.register(this);
    }

    public on(event: string, callback: Function): PopupPanel {
        this._event.addEventListener(event, callback);
        return this;
    }

    public trigger(event: string, info?: any): void {
        this._event.dispatchEvent(event, info);
    }

    public restore(state) {
        if (state.isVisible) {
            this._event.dispatchEvent("Show");
        } else {
            this._event.dispatchEvent("Hide", {restoring: true});
        }

        this._event.dispatchEvent("ResizeDocked", state);

        if (state.isUndocked) {
            this._undock();
            if (state.undockedWidth !== "auto") {
                this.getPanel().outerWidth(state.undockedWidth);
            }
            if (state.undockedHeight !== "auto") {
                this.getPanel().outerHeight(state.undockedHeight);
            }
            if (state.undockedTop !== "auto") {
                const top = Math.min(state.undockedTop, $(window).height() - 40);
                this.getPanel().css("top", top);
            }
            if (state.undockedLeft !== "auto") {
                const left = Math.min(state.undockedLeft, $(window).width() - 40);
                this.getPanel().css("left", left);
            }
        }
        if (state.isVertStacked) {
            this._event.dispatchEvent("VertStack", state);
        }
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

    private _getPopupButton(): JQuery {
        return this.getPanel().find(".undock");
    }

    // undock = pop up the panel
    private _undock(): void {
        this._isDocked = false;
        const $button = this._getPopupButton();
        xcTooltip.changeText($button, SideBarTStr.PopBack);
        $button.removeClass("xi_popout").addClass("xi_popin");
        this._setUndockSizeAndPos();

        this._event.dispatchEvent("Undock");
        this._event.dispatchEvent("Undock_BroadCast");

        const $panel = this.getPanel();
        $panel.on("mousedown.undock", () => {
            if (!this._isDocked) {
                this._event.dispatchEvent("BringFront_BroadCast");
            }
        });

        $panel.resizable("enable");
        $panel.draggable("enable");
        $panel.addClass("undocked"); // only when all set make it undocked
        $panel.parent().addClass("contentUndocked");
        this.checkAllContentUndocked();
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
        $panel.resizable("disable");
        $panel.draggable("disable");
        $panel.parent().removeClass("contentUndocked");
        this.checkAllContentUndocked();

        this._event.dispatchEvent("Dock");
        this._event.dispatchEvent("Dock_BroadCast");
    }

    private _setUndockSizeAndPos(): void {
        const $panel = this.getPanel();
        const rect = $panel[0].getBoundingClientRect();
        const height = Math.min(500, Math.max(300, $(window).height() - (rect.top + 10)));
        const width = 500;
        const left = Math.min($(window).width() - (width + 5), rect.left + 15);
        $panel.css({
            "left": left,
            "top": rect.top + 10,
            "width": width,
            "height": height
        });
    }

    private _addEventListeners(): void {
        if (!this._options.noUndock) {
            const $button = this._getPopupButton();
            $button.click(() => {
                this.toggleDock();
            });
            const $panel = this.getPanel();

            $panel.resizable({
                handles: "w, e, s, n, nw, ne, sw, se",
                containment: '#sqlWorkSpacePanel',
                minWidth: 36,
                minHeight: 50,
                stop: (_, ui) => {
                    const rect = ui.element[0].getBoundingClientRect();
                    this._event.dispatchEvent("Resize");
                    this._event.dispatchEvent("Resize_BroadCast", {
                        undockedWidth: rect.width,
                        undockedHeight: rect.height
                    });
                }
            });

            if (this._options.draggableHeader) {
                this._setDraggable(this._options.draggableHeader);
            }

            $panel.resizable("disable");
            $panel.draggable("disable");
        }
    }

    private _setDraggable(handleSelector: string): void {
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
            },
            stop: (_event, ui) => {
                const rect = ui.helper[0].getBoundingClientRect();
                this._event.dispatchEvent("Drag");
                this._event.dispatchEvent("Drag_BroadCast", {
                    undockedTop: rect.top,
                    undockedLeft: rect.left
                });
            }
        });
    }

    public checkAllContentUndocked() {
        const $panel = this.getPanel();
        checkUndocked($panel.parent());

        function checkUndocked($section) {
            let $parent = $section.parent();
            if (!$parent.hasClass("flexResizeContainer") ||
                !$parent.hasClass("flexResizeItem")) {
                return;
            }
            // use xc-hidden to detect visiblity because non-hidden element
            // with 0 height and width will return visible: false which is
            // incorrect
            if ($parent.children(".flexResizeItem:not(.xc-hidden)").length ===
                $parent.children(".flexResizeItem.contentUndocked:not(.xc-hidden)," +
                                " .flexResizeItem.allContentUndocked:not(.xc-hidden)").length) {
                $parent.addClass("allContentUndocked");
            } else {
                $parent.removeClass("allContentUndocked");
            }
            checkUndocked($parent);
        }
    }
}