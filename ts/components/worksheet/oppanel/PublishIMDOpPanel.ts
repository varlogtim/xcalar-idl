class PublishIMDOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#PublishIMDOpPanel');
    private _advMode: boolean;
    private _dagNode: DagNodePublishIMD;
    private _columns: ProgCol[];
    private _$nameInput: JQuery; // $('#publishIMDOpPanel .IMDNameInput')
    private _$primaryKey: JQuery; // $('#publishIMDOpPanel .primaryKeyInput')
    private _$operatorInput: JQuery; // $('#publishIMDOpPanel .IMDOperatorInput')

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'publishIMDOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._$elemPanel = $('#publishIMDOpPanel');
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._$nameInput = $('#publishIMDOpPanel .IMDNameInput');
        this._$primaryKey = $('#publishIMDOpPanel .primaryKeyInput');
        this._$operatorInput = $('#publishIMDOpPanel .IMDOperatorInput');
        this._setupEventListener();
    }


    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodePublishIMD, options?): void {
        // Show panel
        if (!super.showPanel("Publish Table", options)) {
            return;
        }
        this._dagNode = dagNode;
        this._columns = dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0] || [];
        this._setupColumnHints();
        this._restorePanel(dagNode.getParam());
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    private _convertAdvConfigToModel() {
        const dagInput = <DagNodePublishIMDInputStruct>JSON.parse(this._editor.getValue());

        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(dagInput);
            if (error) {
                throw new Error(error.error);
            }
        }
        return dagInput;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            let param: DagNodePublishIMDInputStruct = this._getParams();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodePublishIMDInputStruct = this._convertAdvConfigToModel();
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                return {error: e.message || e.error};
            }
        }
        return null;
    }

    private _getParams(): DagNodePublishIMDInputStruct {
        return {
            pubTableName: this._$nameInput.val(),
            primaryKey: this._$primaryKey.val(),
            operator: this._$operatorInput.val()
        }
    }

    private _restorePanel(input: DagNodePublishIMDInputStruct): void {
        this._$nameInput.val(input.pubTableName);
        this._$primaryKey.val(input.primaryKey);
        this._$operatorInput.val(input.operator);
    }

    private _setupColumnHints(): void {
        let $list: JQuery = $('#primaryKeyList .primaryKeyColumns');
        let html = '';
        this._columns.forEach((column: ProgCol) => {
            html += '<li>$' + column.getBackColName() + '</li>';
        });
        $list.empty();
        $list.append(html);
        $list = $('#IMDOperatorList .IMDOperatorColumns');
        $list.empty();
        $list.append(html);
    }

    private _checkOpArgs(name: string, key: string, operator: string): boolean {
        let $location: JQuery = null;
        let error: string = "";

        if (!xcHelper.tableNameInputChecker(this._$nameInput)) {
            error = ErrTStr.InvalidTableName;
            $location = this._$nameInput;
        }
        if (!xcHelper.hasValidColPrefix(key)) {
            error = ErrTStr.ColInModal;
            $location = this._$primaryKey;
        }
        if (operator != "" && !xcHelper.hasValidColPrefix(operator)) {
            error = ErrTStr.ColInModal;
            $location = this._$operatorInput;
        }
        if (error != "") {
            if (this._advMode) {
                $location = $("#publishIMDOpPanel .advancedEditor");
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
            `click.close.${PublishIMDOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${PublishIMDOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        let $list = $('#primaryKeyList');
        this._activateDropDown($list, '#primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$primaryKey.val($li.text());
            }
        });
        expList.setupListeners();

        $list = $('#IMDOperatorList');
        this._activateDropDown($list, '#IMDOperatorList');
        expList = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$operatorInput.val($li.text());
            }
        });
        expList.setupListeners();
    }


    private _activateDropDown($list: JQuery, container: string) {
        let dropdownHelper: MenuHelper = new MenuHelper($list, {
            "onOpen": function() {
                var $lis = $list.find('li').sort(xcHelper.sortHTML);
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


    private _submitForm(dagNode: DagNodePublishIMD): void {
        let key: string = "";
        let operator: string = "";
        let name: string = "";
        if (this._advMode) {
            try {
                const newModel: DagNodePublishIMDInputStruct = this._convertAdvConfigToModel();
                key = newModel.primaryKey;
                operator = newModel.operator;
                name = newModel.pubTableName;
            } catch (e) {
                StatusBox.show(e, $("#publishIMDOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            key = this._$primaryKey.val();
            operator = this._$operatorInput.val();
            name = this._$nameInput.val();
        }
        if (!this._checkOpArgs(name, key, operator)) {
            return;
        }

        dagNode.setParam({
            pubTableName: name,
            primaryKey: key,
            operator: operator
        });
        this.close(true);
    }

}