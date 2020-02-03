class PopupManager {
    private static readonly BaseZIndex: number = 32;
    private static _stack: PopupPanel[] = [];

    /**
     * PopupManager.register
     * @param popup
     */
    public static register(popup: PopupPanel): void {
        popup
        .on("Undock_BroadCast", () => {
            this._addPopup(popup);
        })
        .on("Dock_BroadCast", () => {
            this._removePopup(popup, false);
        })
        .on("BringFront_BroadCast", () => {
            this._bringFrontPopup(popup);
        });
    }

    private static _addPopup(popup: PopupPanel): void {
        this._stack.push(popup);
        this._updateZIndex();
    }

    private static _removePopup(popup: PopupPanel, noUpdate: boolean): void {
        for (let i = 0; i < this._stack.length; i++) {
            if (this._stack[i] === popup) {
                this._stack.splice(i, 1);
                break;
            }
        }
        popup.getPanel().css("z-index", "");
        this._updateZIndex();
    }

    private static _bringFrontPopup(popup: PopupPanel): void {
        this._removePopup(popup, true);
        this._addPopup(popup);
    }

    private static _updateZIndex(): void {
        this._stack.forEach((popup, i) => {
            const zIndex: number = this.BaseZIndex + i;
            popup.getPanel().css("z-index", zIndex);
        });
    }
}