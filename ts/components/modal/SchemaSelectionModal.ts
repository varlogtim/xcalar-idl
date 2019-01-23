class SchemaSelectionModal {
    private static _instance: SchemaSelectionModal;
    
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _currentSchema: ColSchema[];
    private _callback: Function;
    private _schemaSection: ColSchemaSection;

    private constructor(){
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true},
            minHeight: 400
        });
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
        this._schemaSection.setValidTypes(BaseOpPanel.getBasicColTypes());
        this._addEventListeners();
    }

    /**
     * SchemaSelectionModal.Instance.show
     */
    public show(schema: ColSchema[], callback: Function): void {
        this._currentSchema = schema;
        this._callback = callback;
        this._modalHelper.setup();
        this._schemaSection.setHintSchema(schema);
        this._schemaSection.render(schema);
    }

    public setInitialSchema(schema: ColSchema[]): void {
        this._schemaSection.setInitialSchema(schema);
    }

    private _getModal(): JQuery {
        return $("#schemaSelectionModal");
    }

    private _getSchemaSection(): JQuery {
        return this._getModal().find(".colSchemaSection");
    }

    private _close(): void {
        this._modalHelper.clear();
        this._callback = null;
        this._currentSchema = null;
        this._schemaSection.setInitialSchema(null);
    }

    private _submitForm(): void {
        let schema: ColSchema[] = this._schemaSection.getSchema(false);
        if (schema == null) {
            // error case
            return;
        }
        if (typeof this._callback === "function") {
            this._callback(schema);
        }
        this._close();
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", () => {
            if (this._currentSchema) {
                this._schemaSection.render(this._currentSchema);
            }
        });
    }
}