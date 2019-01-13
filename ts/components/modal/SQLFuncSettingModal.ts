class SQLFuncSettingModal {
    private static _instance: SQLFuncSettingModal;

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
        return $("#sqlFuncSettingModal");
    }

    private _getInput(): JQuery {
        return this._getModal().find("input");
    }

    public show(callback: Function): void {
        this._modalHelper.setup();
        this._getInput().val(1);
        this._callback = callback;
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getInput().val("");
        this._callback = null;
    }

    private _submitForm(): void {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return;
        }
        if (typeof this._callback === "function") {
            this._callback(res.num);
        }
        this._close();
    }

    private _validate(): {num: number} {
        let $input: JQuery = this._getInput();
        let num: number = Number($input.val());
        let isValid = xcHelper.validate([{
            $ele: $input
        }, {
            $ele: $input,
            error: ErrTStr.PositiveInteger,
            check: () => {
                return isNaN(num) || num <= 0 || !Number.isInteger(num);
            }
        }]);
        if (!isValid) {
            return;
        }
        return {
            num: num
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
    }
}