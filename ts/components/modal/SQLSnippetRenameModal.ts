class SQLSnippetRenameModal {
    private static _instance: SQLSnippetRenameModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _callback: Function;
    private _deferredPromise: XDDeferred<void>;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    private _getModal(): JQuery {
        return $("#sqlSnippetRenameModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find("input.name");
    }

    public show(callback: Function, deferredPromise: XDDeferred<void>): void {
        this._modalHelper.setup();
        this._getNameInput().val("");
        this._callback = callback;
        this._deferredPromise = deferredPromise;
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getNameInput().val("");
        this._callback = null;
        this._deferredPromise = null;
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
        let $input: JQuery = this._getNameInput();
        let isValid = xcHelper.validate([{
            $ele: $input
        }]);
        if (!isValid) {
            StatusBox.show("Invalid Name", $input, false);
            return;
        } else if ($input.val().trim() == CommonTxtTstr.Untitled){
            StatusBox.show('Name cannot be "' + CommonTxtTstr.Untitled + '"', $input, false);
            return;
        }
        return {
            name: $input.val().trim()
        }
    }

    private _addEventListeners() {
        const $modal = this._getModal();
        // click discard or close button
        $modal.on("click", ".close", (event) => {
            event.stopPropagation();
            this._deferredPromise.reject();
            this._close();
        });

        $modal.on("click", ".discard", (event) => {
            event.stopPropagation();
            this._deferredPromise.resolve();
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

    }
}