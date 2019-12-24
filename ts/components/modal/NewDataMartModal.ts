class NewDataMartModal {
    private static _instance: NewDataMartModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _existingDataMarts: DataMarts;
    private _onSubmit: Function;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    /**
     * NewDataMartModal.Instance.show
     * @param options
     */
    public show(
        existingDataMarts: DataMarts,
        onSubmit: (name) => any
    ): void {
        this._existingDataMarts = existingDataMarts;
        this._onSubmit = onSubmit;
        this._modalHelper.setup();
        this._getInput().val(this._generateName());
    }

    private _getModal(): JQuery {
        return $("#newDataMartModal");
    }

    private _getInput(): JQuery {
        return this._getModal().find("input");
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getInput().val("");
        this._existingDataMarts = null;
        this._onSubmit = null;
    }

    private _submitForm(): void {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return;
        }
        if (typeof this._onSubmit === "function") {
            this._onSubmit(res.name);
        }
        this._close();
    }

    private _validate(): {name: string} {
        let $input: JQuery = this._getInput();
        let name: string = $input.val().trim();
        let isValid = xcHelper.validate([{
            $ele: $input
        }, {
            $ele: $input,
            error: DataMartTStr.AlredyExist,
            check: () => {
                return this._existingDataMarts.has(name);
            }
        }, {
            $ele: $input,
            error: ErrTStr.InvalidDataMartName,
            check: () => {
                let category = PatternCategory.DataMart;
                return !xcHelper.checkNamePattern(category, PatternAction.Check, name);
            }
        }]);
        if (!isValid) {
            return;
        }
        return {
            name: name
        };
    }

    private _generateName(): string {
        const size: number = this._existingDataMarts.getAllList().length;
        const validFunc = (name: string): boolean => !this._existingDataMarts.has(name);
        const nameGenFunc = (tryCnt: number): string => `${DataMartTStr.Title} ${tryCnt + size}`;
        const startName: string = `${DataMartTStr.Title} ${size + 1}`;
        const name: string = xcHelper.uniqueName(startName, validFunc, nameGenFunc, 30);
        return name;
    }

    private _addEventListeners(): void {
        const $modal = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });
    }
}