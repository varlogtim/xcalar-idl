class ExtensionModal {
    private static _instance: ExtensionModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
   

    private constructor() {
        let $modal = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            "center": {"verticalQuartile": true},
            "noBackground": true
        });
        this._addEventListerners();
    }

    /**
     * ExtensionModal.Instance.show
     */
    public show(): void {
        this._modalHelper.setup();
    }

    private _getModal(): JQuery {
        return $("#extModal");
    }

    private _close(): void {
        $("#extActions").find(".funcBtn").remove();
        this._modalHelper.clear();
    }

    private _addEventListerners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });
    }
}
