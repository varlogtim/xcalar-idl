class PopupManager {
    private static readonly BaseZIndex: number = 32;
    private static _stack: PopupPanel[] = [];
    private static _popupMap: Map<string, PopupPanel> = new Map();

    /**
     * PopupManager.register
     * @param popup
     */
    public static register(popup: PopupPanel): void {
        this._popupMap.set(popup.getId(), popup);

        popup
        .on("Undock_BroadCast", () => {
            this._addPopup(popup);
            this._updateZIndex();
        })
        .on("Dock_BroadCast", () => {
            this._removePopup(popup, true);
            this._updateZIndex();
        })
        .on("BringFront_BroadCast", () => {
            this._bringFrontPopup(popup);
        });
    }

    public static isDocked(popupId): boolean {
        const popup: PopupPanel = this._popupMap.get(popupId);
        if (!popup) {
            console.log(popupId + " not found", this._popupMap);
            return true;
        } else {
            return popup.isDocked();
        }
    }

    private static _addPopup(popup: PopupPanel): void {
        this._stack.push(popup);
    }

    private static _removePopup(popup: PopupPanel, removeZIndex: boolean): number {
        let index: number = -1;
        for (let i = 0; i < this._stack.length; i++) {
            if (this._stack[i] === popup) {
                index = i;
                this._stack.splice(i, 1);
                break;
            }
        }
        if (removeZIndex) {
            popup.getPanel().css("z-index", "");
        }
        return index;
    }

    private static _bringFrontPopup(popup: PopupPanel): void {
        const index: number = this._removePopup(popup, false);
        this._addPopup(popup);
        if (this._stack[index] !== popup) {
            this._updateZIndex(); // when has order change
        }
    }

    private static _updateZIndex(): void {
        this._stack.forEach((popup, i) => {
            const zIndex: number = this.BaseZIndex + i;
            popup.getPanel().css("z-index", zIndex);
        });
    }
}