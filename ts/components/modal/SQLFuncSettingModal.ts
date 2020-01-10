class SQLFuncSettingModal {
    private static _instance: SQLFuncSettingModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _onSubmit: Function;
    private _onCancel: Function;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

     /**
     * SQLFuncSettingModal.Instance.show
     * @param callback
     */
    public show(onSubmit: Function, onCancel: Function): void {
        this._modalHelper.setup();
        this._getInput().val(1);
        this._onSubmit = onSubmit;
        this._onCancel = onCancel;
    }

    private _getModal(): JQuery {
        return $("#sqlFuncSettingModal");
    }

    private _getInput(): JQuery {
        return this._getModal().find("input");
    }

    private _close(isCancel: boolean): void {
        if (isCancel && typeof this._onCancel === "function") {
            this._onCancel();
        }
        this._modalHelper.clear();
        this._getInput().val("");
        this._onSubmit = null;
        this._onCancel = null;
    }

    private _submitForm(): void {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return;
        }
        if (typeof this._onSubmit === "function") {
            this._onSubmit(res.num);
        }
        SQLResultSpace.Instance.refresh();
        this._close(false);
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
            this._close(true);
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });
    }
}