class UpdateIMDOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#UpdateIMDOpPanel');
    private _advMode: boolean;
    private _columns: ProgCol[];
    protected _dagNode: DagNodeUpdateIMD;
    private _$pubTableInput: JQuery; // $('#UpdateIMDOpPanel .pubTableInput')
    private _$operatorInput: JQuery; // $('#UpdateIMDOpPanel .IMDOperatorInput')
    private _tables: PbTblInfo[];


    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'UpdateIMDOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._$elemPanel = $('#UpdateIMDOpPanel');
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._$pubTableInput = $('#UpdateIMDOpPanel .pubTableInput');
        this._$operatorInput = $('#UpdateIMDOpPanel .IMDOperatorInput');

        this._setupEventListener();
    }


    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     * @param options
     */
    public show(dagNode: DagNodeUpdateIMD, options?): void {
        this._dagNode = dagNode;
        // Show panel
        super.showPanel("IMD Table", options)
        .then(() => {
            this._columns = dagNode.getParents().map((parentNode) => {
                return parentNode.getLineage().getColumns(false, true);
            })[0] || [];

            this._tables = PTblManager.Instance.getAvailableTables();
            this._updateTableList();
            this._setupColumnHints();
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
    }

    private _convertAdvConfigToModel() {
        let args: DagNodeUpdateIMDInputStruct = <DagNodeUpdateIMDInputStruct>JSON.parse(this._editor.getValue());
        if (JSON.stringify(args, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(args);
            if (error) {
                throw new Error(error.error);
            }
        }
        if (this._checkOpArgs(args)) {
            return args;
        }
        return null;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            let param: DagNodeUpdateIMDInputStruct = this._getParams();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeUpdateIMDInputStruct = this._convertAdvConfigToModel();
                if (newModel == null) {
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

    private _getParams(): DagNodeUpdateIMDInputStruct {
        return {
            pubTableName: this._$pubTableInput.val(),
            operator: this._$operatorInput.val()
        }
    }


    private _restorePanel(input: DagNodeUpdateIMDInputStruct): void {
        this._$pubTableInput.val(input.pubTableName);
        this._$operatorInput.val(input.operator);
    }

    private _updateTableList(): void {
        let $list: JQuery = $('#updatePubTableList .pubTables');
        $list.empty();
        let html = '';
        this._tables.forEach((table) => {
            html += '<li>' + table.name + '</li>';
        });
        $list.append(html);
    }

    private _checkOpArgs(input: DagNodeUpdateIMDInputStruct): boolean {
        let $location: JQuery = null;
        let error: string = "";
        if (input == null) {
            return false;
        }
        if (input.pubTableName == "") {
            error = "Input must have a publish table's name";
            $location = this._$pubTableInput;
        }

        if (input.operator != "" && !xcHelper.hasValidColPrefix(input.operator)) {
            error = ErrTStr.ColInModal;
            $location = this._$operatorInput;
        }

        if (error != "") {
            if (this._advMode) {
                $location = $("#UpdateIMDOpPanel .advancedEditor");
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
            `click.close.${UpdateIMDOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${UpdateIMDOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        let $list = $('#updatePubTableList');
        this._activateDropDown($list, '#updatePubTableList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$pubTableInput.val($li.text());
            }
        });
        expList.setupListeners();

        $list = $('#UpdateIMDOpPanel .IMDOperatorList');
        this._activateDropDown($list, '#UpdateIMDOpPanel .IMDOperatorList');
        expList = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$operatorInput.val("$" + $li.text());
            }
        });
        expList.setupListeners();
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


    private _submitForm(dagNode: DagNodeUpdateIMD): void {
        let params: DagNodeUpdateIMDInputStruct = null;
        if (this._advMode) {
            try {
                params = this._convertAdvConfigToModel();
            } catch (e) {
                StatusBox.show(e, $("#UpdateIMDOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            params = this._getParams();
        }
        if (!this._checkOpArgs(params)) {
            return;
        }

        dagNode.setParam(params);
        this.close(true);
    }

    private _setupColumnHints(): void {
        let $list: JQuery = $('#UpdateIMDOpPanel .IMDOperatorList .IMDOperatorColumns');
        let html = '';
        this._columns.forEach((column: ProgCol) => {
            html += '<li data-value="$' + column.getBackColName() + '">' +
                column.getBackColName() + '</li>';
        });
        $list.empty();
        $list.append(html);
    }
}