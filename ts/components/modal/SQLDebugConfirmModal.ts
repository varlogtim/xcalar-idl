class SQLDebugConfirmModal {
    private static _instance: SQLDebugConfirmModal;

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
     * SQLDebugConfirmModal.Instance.show
     * @param options
     */
    public show(
        options: {
            onSubmit: Function,
            onCancel: Function
        }
    ): void {
        this._modalHelper.setup();
        this._getInput().val(SQLDagExecutor.generateTabName());
        this._onSubmit = options.onSubmit;
        this._onCancel = options.onCancel;
    }

    private _getModal(): JQuery {
        return $("#sqlDebugConfirmModal");
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
            this._onSubmit(res.name);
        }
        this._close(false);
    }

    private _validate(): {name: string} {
        let $input: JQuery = this._getInput();
        let name: string = $input.val().trim();
        // XXX TODO: combine with the _tabRenameCheck in DagTabManager.ts
        let isValid = xcHelper.validate([{
            $ele: $input
        }, {
            $ele: $input,
            error: DFTStr.DupDataflowName,
            check: () => {
                return !DagList.Instance.isUniqueName(name);
            }
        }, {
            $ele: $input,
            error: ErrTStr.DFNameIllegal,
            check: () => {
                let category = PatternCategory.Dataflow;
                return !xcHelper.checkNamePattern(category, PatternAction.Check, name);
            }
        }]);
        if (!isValid) {
            return;
        }
        return {
            name: name
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