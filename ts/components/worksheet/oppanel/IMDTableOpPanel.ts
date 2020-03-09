class IMDTableOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#IMDTableOpPanel');
    private _advMode: boolean;
    protected _dagNode: DagNodeIMDTable;
    private _$pubTableInput: JQuery; // $('#IMDTableOpPanel .pubTableInput')
    private _$columns: JQuery; // $('#IMDTableOpColumns')
    private _tables: PbTblInfo[];
    private _selectedTable: PbTblInfo;
    private _schemaSection: ColSchemaSection;
    private _primaryKeys: string[];
    private _limitedRows: number;

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'IMDTableOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._$elemPanel = $('#IMDTableOpPanel');
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._$pubTableInput = $('#IMDTableOpPanel .pubTableInput');
        this._$columns = $('#IMDTableOpPanel #IMDTableOpColumns .cols');
        this._schemaSection = new ColSchemaSection(this._$elemPanel.find(".colSchemaSection"));
        this._setupEventListener();
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     * @param options
     */
    public show(dagNode: DagNodeIMDTable, options?): void {
        this._dagNode = dagNode;
        // Show panel
        super.showPanel("Table", options)
        .then(() => {
            this._selectedTable = null;
            this._primaryKeys = [];
            this._$columns.empty();

            this._tables = PTblManager.Instance.getAvailableTables();
            this._updateTableList();
            this._restorePanel(this._dagNode.getParam());
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        this._advMode = false;
        this._limitedRows = null;
    }

    private _convertAdvConfigToModel() {
        let args: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>JSON.parse(this._editor.getValue());
        if (JSON.stringify(args, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(args);
            if (error) {
                throw new Error(error.error);
            }
            if (this._checkOpArgs(args)) {
                return args;
            }
        }
        return null;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            let param: DagNodeIMDTableInputStruct = this._getParams();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeIMDTableInputStruct = this._convertAdvConfigToModel();
                if (newModel == null) {
                    this._advMode = false;
                    return;
                }
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                return {error: e.message || e.error};
            }
        }
        return null;
    }

    private _getParams(): DagNodeIMDTableInputStruct {
        return {
            source: this._$pubTableInput.val(),
            version: -1,
            schema: this._schemaSection.getSchema(false),
            filterString: "",
            limitedRows: this._limitedRows
        }
    }

    private _changeSelectedTable(source: string): void {
        if (source == "") {
            return;
        }
        this._selectedTable = this._tables.find((table) => table.name === source);
        if (this._selectedTable != null) {
            this._primaryKeys = this._selectedTable.keys;
        }
    }

    private _restorePanel(input: DagNodeIMDTableInputStruct): void {
        this._limitedRows = input.limitedRows;
        this._$pubTableInput.val(input.source);
        this._changeSelectedTable(input.source);
        this._schemaSection.render(input.schema);
    }

    private _updateTableList(): void {
        let $list: JQuery = $('#pubTableList .pubTables');
        $list.empty();
        let html = '';
        this._tables.forEach((table) => {
            html += '<li>' + table.name + '</li>';
        });
        $list.append(html);
    }

    private _checkOpArgs(input: DagNodeIMDTableInputStruct): boolean {
        let $location: JQuery = this._$elemPanel.find(".btn-submit");
        let error: string = "";
        if (input == null) {
            return false;
        }
        if (input.source == "") {
            error = "Input must have a source";
        }
        if (input.version < -1) {
            error = "Version cannot be less than -1 (latest).";
        }
        if (input.schema == null || input.schema.length == 0) {
            error = "Table must have columns.";
            $location = this._$elemPanel.find(".colSchemaSection");
        }
        // XXX TODO: enable it if schema must include primary key
        // otherwise remove it
        // else {
        //     for (let i = 0; i < this._primaryKeys.length; i++) {
        //         let key: string = this._primaryKeys[i];
        //         if (!input.schema.find((col: ColSchema) => {
        //             return (col.name == key);
        //         })) {
        //             error = "Schema must include primary key: " + key;
        //             $location = this._$elemPanel.find(".colSchemaSection");
        //             break;
        //         }
        //     }
        // }

        if (error != "") {
            if (this._advMode) {
                $location = $("#IMDTableOpPanel .advancedEditor");
            }
            StatusBox.show(error, $location, false, {'side': 'right'});
            return false;
        }
        return true;
    }


    private _setupEventListener(): void {
        const self = this;
        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${IMDTableOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${IMDTableOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        let $list = $('#pubTableList');
        this._activateDropDown($list, '#pubTableList');
        new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$pubTableInput.val($li.text());
                self._changeSelectedTable($li.text());
                self._autoDetectSchema(true);
            }
        }).setupListeners();

        this._$pubTableInput.on('blur', function() {
            self._changeSelectedTable(self._$pubTableInput.val());
            self._autoDetectSchema(true);
        });

        this._$elemPanel.find(".detect").click(function() {
            self._autoDetectSchema(false);
        });
    }

    private _activateDropDown($list: JQuery, container: string) {
        let dropdownHelper: MenuHelper = new MenuHelper($list, {
            "onOpen": function() {
                var $lis = $list.find('li').sort(xcUIHelper.sortHTML);
                $lis.prependTo($list.find('ul'));
            },
            "container": container
        });
        dropdownHelper.setupListeners();
        new InputDropdownHint($list, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val, $input) {
                if (val === $.trim($input.val())) {
                    return;
                }
                $input.val(val);
            },
            "order": true
        });
    }


    private _submitForm(dagNode: DagNodeIMDTable): void {
        let params: DagNodeIMDTableInputStruct = null;
        if (this._advMode) {
            try {
                params = this._convertAdvConfigToModel();
            } catch (e) {
                StatusBox.show(e, $("#IMDTableOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            params = this._getParams();
        }
        if (!this._checkOpArgs(params)) {
            return;
        }
        this._limitedRows = params.limitedRows;
        //XX: TODO: Uncomment this out when backend truly supports aggregates in filter string
        //const aggs: string[] = DagNode.getAggsFromEvalStrs([{evalString: params.filterString}]);
        //this._dagNode.setAggregates(aggs);
        // XXX TODO: add a waiting state for the async all
        dagNode.setSubgraph();
        dagNode.setParam(params);
        this.close(true);
    }

    private _autoDetectSchema(userOldSchema: boolean): {error: string} {
        const oldParam: DagNodeIMDTableInputStruct = this._dagNode.getParam();
        let oldSchema: ColSchema[] = null;
        if (userOldSchema &&
            this._selectedTable != null &&
            this._selectedTable.name === oldParam.source
        ) {
            // when only has prefix change
            oldSchema = this._schemaSection.getSchema(true);
        }
        let schema: ColSchema[] = this._selectedTable ? this._selectedTable.getSchema() : [];
        this._schemaSection.setInitialSchema(schema);
        this._schemaSection.render(oldSchema || schema);
        return null;
    }
}