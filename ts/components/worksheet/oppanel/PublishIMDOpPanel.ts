class PublishIMDOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#PublishIMDOpPanel');
    private _advMode: boolean;
    protected _dagNode: DagNodePublishIMD;
    private _columns: ProgCol[];
    private _$nameInput: JQuery; // $('#publishIMDOpPanel .IMDNameInput')
    private _$primaryKeys: JQuery; // $('#publishIMDOpPanel .IMDKey')
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
        this._$primaryKeys = $('#publishIMDOpPanel .IMDKey');
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

    private _getKeyValues(): string[] {
        let keys: string[] = [];
        let $inputs: JQuery = this._$primaryKeys.find(".primaryKeyInput");
        for (let i = 0; i < $inputs.length; i++) {
            keys.push($inputs.eq(i).val());
        }
        return keys;
    }

    private _getParams(): DagNodePublishIMDInputStruct {
        let keys: string[] = this._getKeyValues();
        return {
            pubTableName: this._$nameInput.val(),
            primaryKeys: keys,
            operator: this._$operatorInput.val()
        }
    }

    private _restoreKeys(keyList: string[]) {
        if (keyList.length == 0) {
            keyList = [""];
        }
        let $keys: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        let rowsLen = $keys.length;
        if (rowsLen < keyList.length) {
            let numNew: number = keyList.length - $keys.length;
            for (let i = 0; i < numNew; i++) {
                this._addKeyField();
            }
        } else if (rowsLen > keyList.length) {
            let numRem: number = rowsLen - keyList.length;
            for (let i = 0; i < numRem; i++) {
                $keys.eq(rowsLen - 1 - i).remove();
            }
        }
        $keys = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns li').removeClass("unavailable");
        for (let i = 0; i < keyList.length; i++) {
            $keys.eq(i).find(".primaryKeyInput").val(keyList[i]);
            $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + keyList[i] + "']").addClass("unavailable");
        }
    }

    private _restorePanel(input: DagNodePublishIMDInputStruct): void {
        this._$nameInput.val(input.pubTableName);
        let keyList: string[] = input.primaryKeys || [];
        //process
        this._restoreKeys(keyList);
        this._$operatorInput.val(input.operator);
    }

    private _replicateColumnHints(): void {
        let $list: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns');
        let toCopy: string = $list.eq(0).html();
        $list.empty();
        $list.append(toCopy);
    }

    private _setupColumnHints(): void {
        let $list: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns');
        let html = '';
        this._columns.forEach((column: ProgCol) => {
            html += '<li data-value="$' + column.getBackColName() + '">' +
                column.getBackColName() + '</li>';
        });
        $list.empty();
        $list.append(html);
        $list = $('#IMDOperatorList .IMDOperatorColumns');
        $list.empty();
        $list.append(html);
    }

    private _addKeyField(): void {
        let html = '<div class="primaryKeyList dropDownList">' +
            '<input class="text primaryKeyInput" type="text" value="" spellcheck="false">' +
            '<i class="icon xi-cancel"></i>' +
            '<div class="iconWrapper">' +
                '<i class="icon xi-arrow-down"></i>' +
            '</div>' +
            '<div class="list">' +
                '<ul class="primaryKeyColumns"></ul>' +
                '<div class="scrollArea top stopped" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-up"></i>' +
                '</div>' +
                '<div class="scrollArea bottom" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-down"></i>'
                '</div>' +
            '</div>' +
        '</div>';
        this._$primaryKeys.append(html);
        this._replicateColumnHints();
        let $list = $('#publishIMDOpPanel .IMDKey .primaryKeyList').last();
        this._activateDropDown($list, '.IMDKey .primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $li.closest('.primaryKeyList').find('.primaryKeyInput');
                let oldVal = $primaryKey.val();
                if (oldVal != "") {
                    $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                }
                $primaryKey.val("$" + $li.text());
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
            }
        });
        expList.setupListeners();
    }

    private _checkOpArgs(keys: string[], operator: string): boolean {
        let $location: JQuery = null;
        let error: string = "";

        if (!xcHelper.tableNameInputChecker(this._$nameInput)) {
            error = ErrTStr.InvalidTableName;
            $location = this._$nameInput;
        }
        const $keys = $(".IMDKey .primaryKeyList")
        keys.forEach(((key, index) => {
            if (!xcHelper.hasValidColPrefix(key)) {
                error = ErrTStr.ColInModal;
                $location = $keys.eq(index);
            }
        }))
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

        this._$elemPanel.on("click", ".addKeyArg", function() {
            self._addKeyField();
        });

        this._$elemPanel.on('click', '.primaryKeyList .xi-cancel', function() {
            const $key: JQuery = $(this).closest(".primaryKeyList");
            let oldVal = $key.find(".primaryKeyInput").val();
            if (oldVal != "") {
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + oldVal + "']").removeClass("unavailable");
            }
            $key.remove();
        });

        let $list = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        this._activateDropDown($list, '#publishIMDOpPanel .IMDKey .primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $('.IMDKey .primaryKeyList').eq(0).find('.primaryKeyInput');
                let oldVal = $primaryKey.val();
                if (oldVal != "") {
                    $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                }
                $primaryKey.val("$" + $li.text());
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
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

                self._$operatorInput.val("$" + $li.text());
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
        let keys: string[] = [];
        let operator: string = "";
        let name: string = "";
        if (this._advMode) {
            try {
                const newModel: DagNodePublishIMDInputStruct = this._convertAdvConfigToModel();
                keys = newModel.primaryKeys;
                operator = newModel.operator;
                name = newModel.pubTableName;
            } catch (e) {
                StatusBox.show(e, $("#publishIMDOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            keys = this._getKeyValues();
            operator = this._$operatorInput.val();
            name = this._$nameInput.val();
        }
        if (!this._checkOpArgs(keys, operator)) {
            return;
        }

        dagNode.setParam({
            pubTableName: name,
            primaryKeys: keys,
            operator: operator
        });
        this.close(true);
    }

}