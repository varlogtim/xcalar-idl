/**
 * The operation editing panel for SQLFuncOut operator
 */
class SQLFuncOutOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeSQLFuncOut;
    private _schemaSection: ColSchemaSection;

    public constructor() {
        super();
        this._setup();
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
        this._schemaSection.setValidTypes(BaseOpPanel.getBasicColTypes());
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQLFuncOut, options?): void {
        // Show panel
        if (!super.showPanel(null, options)) {
            return;
        }
        this._dagNode = dagNode;
        const model = dagNode.getParam();
        this._restorePanel(model);
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        this._clear();
        super.hidePanel(isSubmit);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param = this._validate(true) || {
                schema: []
            };
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._convertAdvConfigToModel();
                this._restorePanel(param);
                return;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _setup(): void {
        super.setup($("#sqlFuncOutPanel"));
        this._addEventListeners();
    }

    private _clear(): void {
        this._dagNode = null;
        this._schemaSection.clear();
    }

    private _getSchemaSection(): JQuery {
        return this.$panel.find(".colSchemaSection");
    }

    private _convertAdvConfigToModel(): {schema: ColSchema[]} {
        const input = JSON.parse(this._editor.getValue());
        if (JSON.stringify(input, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(input);
            if (error) {
                throw new Error(error.error);
            }
        }
        return input;
    }

    private _autoDetectSchema(): void {
        let schema: ColSchema[] = [];
        if (this._dagNode == null) {
            schema = [];
        } else {
            const parents: DagNode[] = this._dagNode.getParents();
            if (parents && parents[0]) {
                const parent: DagNode = parents[0];
                schema = parent.getLineage().getColumns().map((progCol) => {
                    return {
                        name: progCol.getBackColName(),
                        type: progCol.getType()
                    }
                });
              
            }
        }
        this._schemaSection.setInitialSchema(schema);
        this._schemaSection.render(schema);
    }

    private _restorePanel(
        input: {
            schema: ColSchema[]
        }
    ): void {
        this._schemaSection.render(input.schema);
    }

    private _submitForm(): void {
        let args: {schema: ColSchema[]};
        if (this._isAdvancedMode()) {
            args = this._validAdvancedMode();
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }
        
        this._dagNode.setParam(args);
        this.close(true);
    }

    private _validate(ingore: boolean = false): {schema: ColSchema[]} {
        const schema = this._schemaSection.getSchema(ingore);
        if (schema != null) {
            return {
                schema: schema
            }
        } else {
            return null
        }
    }

    private _validAdvancedMode() {
        let args;
        let error: string;
        try {
            args = this._convertAdvConfigToModel();
            if (args.schema.length === 0) {
                error = ErrTStr.NoEmptySchema;
            }
        } catch (e) {
            error = e;
        }

        if (error == null) {
            return args;
        } else {
            StatusBox.show(error, this.$panel.find(".advancedEditor"));
            return null;
        }
    }

    private _addEventListeners() {
        const $panel: JQuery = this.$panel;
        $panel.on("click", ".close, .cancel", () => {
            this.close();
        });

        $panel.on("click", ".submit", () => {
            this._submitForm();
        });

        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", () => {
            this._autoDetectSchema();
        });
    }
}