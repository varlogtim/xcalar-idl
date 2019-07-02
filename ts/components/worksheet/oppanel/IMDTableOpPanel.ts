class IMDTableOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#IMDTableOpPanel');
    private _advMode: boolean;
    protected _dagNode: DagNodeIMDTable;
    private _$pubTableInput: JQuery; // $('#IMDTableOpPanel .pubTableInput')
    private _$tableVersionInput: JQuery; // $('#IMDTableOpPanel .tableVersionInput')
    private _$filterStringInput: JQuery; // $('#IMDTableOpPanel .filterStringInput')
    private _$columns: JQuery; // $('#IMDTableOpColumns')
    private _$versionList: JQuery; // $('#IMDTableOpPanel #tableVersionList .tableVersions');
    private _tables: PbTblInfo[];
    private _selectedTable: PbTblInfo;
    private _schemaSection: ColSchemaSection;
    private _primaryKeys: string[];
    private _currentStep: number;
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
        this._$tableVersionInput = $('#IMDTableOpPanel .tableVersionInput');
        this._$filterStringInput = $('#IMDTableOpPanel .filterStringInput');
        this._$columns = $('#IMDTableOpPanel #IMDTableOpColumns .cols');
        this._$versionList = $('#IMDTableOpPanel #tableVersionList .tableVersions');
        this._schemaSection = new ColSchemaSection(this._$elemPanel.find(".colSchemaSection"));
        this._$tableVersionInput.val(-1);
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
        super.showPanel("IMD Table", options)
        .then(() => {
            this._selectedTable = null;
            this._primaryKeys = [];
            this._$columns.empty();
            this._$versionList.empty();
            this._currentStep = 1;
            this._gotoStep();

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
            this._gotoStep();
        } else {
            try {
                const newModel: DagNodeIMDTableInputStruct = this._convertAdvConfigToModel();
                if (newModel == null) {
                    this._advMode = false;
                    this._currentStep = 1;
                    this._gotoStep();
                    return;
                }
                this._restorePanel(newModel);
                this._currentStep = 1;
                this._advMode = false;
                this._gotoStep();
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
            version: parseInt(this._$tableVersionInput.val()),
            schema: this._schemaSection.getSchema(false),
            filterString: this._$filterStringInput.val(),
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

    private _renderVersions() {
        if (this._selectedTable == null) {
            this._$versionList.empty();
            return;
        }
        if (!this._selectedTable.active) {
            // Inactive table, can't list updates
            let $checkbox: JQuery = $('#IMDTableOpPanel .tableVersion .checkbox');
            $checkbox.removeClass("active");
            $checkbox.addClass("checked");
            $checkbox.parent().addClass("checked");
            $("#IMDTableOpPanel #tableVersionList").addClass("xc-disabled");
            return;
        }
        $('#IMDTableOpPanel .tableVersion .checkbox').addClass("active");
        const versionList = this._selectedTable.updates;
        let html: string = "";
        versionList.forEach((update) => {
            let id: number = update.batchId;
            let time: string = moment.unix(update.startTS).format("M-D-Y h:mm:ss A");
            html += '<li class="versionListItem" data-version="' + id +
                '"> <span class="text tooltipOverflow">' +
                '<div class="versionText">' +
                    id +
                '</div><div class="dateText">' +
                    time +
                '</div></span>' +
                '</li>';
        });
        this._$versionList.html(html);
    }

    private _restorePanel(input: DagNodeIMDTableInputStruct): void {
        this._limitedRows = input.limitedRows;
        this._$pubTableInput.val(input.source);
        this._$tableVersionInput.val(input.version);
        if (input.version != -1) {
            $("#IMDTableOpPanel #tableVersionList").removeClass("xc-disabled");
            $('#IMDTableOpPanel .tableVersion .checkbox').removeClass("checked");
            $('#IMDTableOpPanel .tableVersion .checkboxWrap').removeClass("checked");
        }
        this._$filterStringInput.val(input.filterString);
        this._changeSelectedTable(input.source);
        this._renderVersions();
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
        } else {
            for (let i = 0; i < this._primaryKeys.length; i++) {
                let key: string = this._primaryKeys[i];
                if (!input.schema.find((col: ColSchema) => {
                    return (col.name == key);
                })) {
                    error = "Schema must include primary key: " + key;
                    $location = this._$elemPanel.find(".colSchemaSection");
                    break;
                }
            }
        }

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

        this._$elemPanel.on("click", ".next", () => {
            this._goToSchemaStep();
        });

        this._$elemPanel.on("click", ".back", () => {
            this._currentStep = 1;
            this._gotoStep();
        });

        // Submit button
        this._$elemPanel.on(
            `click.submit.${IMDTableOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        let $list = $('#pubTableList');
        this._activateDropDown($list, '#pubTableList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$pubTableInput.val($li.text());
                self._changeSelectedTable($li.text());
                self._renderVersions();
            }
        });
        expList.setupListeners();

        $list = $('#tableVersionList');
        this._activateDropDown($list, '#tableVersionList');
        expList = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$tableVersionInput.val($li.data("version"));
            }
        });
        expList.setupListeners();

        this._$pubTableInput.on('blur', function() {
            self._changeSelectedTable(self._$pubTableInput.val());
            self._renderVersions();
        })

        $('#IMDTableOpPanel .tableVersion .checkbox').on("click", function(event) {
            event.stopPropagation();
            let $box: JQuery = $(this);
            if (!$box.hasClass("active")) {
                return;
            }
            let $arg: JQuery = $(this).parent();
            let $versionListWrap: JQuery = $("#IMDTableOpPanel #tableVersionList");
            if ($arg.hasClass("checked")) {
                $arg.removeClass("checked");
                $box.removeClass("checked");
                $versionListWrap.removeClass("xc-disabled");
            } else {
                $arg.addClass("checked");
                $box.addClass("checked");
                $versionListWrap.addClass("xc-disabled");
                self._$tableVersionInput.val(-1);
            }
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
        dagNode.setParam(params);
        this.close(true);
    }

    private _gotoStep(): void {
        let btnHTML: HTML = "";
        const $section: JQuery = this._$elemPanel.find(".modalTopMain");
        if (this._advMode) {
            btnHTML =
                '<button class="btn btn-submit btn-rounded submit">' +
                    CommonTxtTstr.Save +
                '</button>';
        } else if (this._currentStep === 1) {
            $section.find(".step1").removeClass("xc-hidden")
                    .end()
                    .find(".step2").addClass("xc-hidden");
            btnHTML =
                '<button class="btn btn-next btn-rounded next">' +
                    CommonTxtTstr.Next +
                '</button>';
        } else if (this._currentStep === 2) {
            $section.find(".step2").removeClass("xc-hidden")
                    .end()
                    .find(".step1").addClass("xc-hidden");
            btnHTML =
                '<button class="btn btn-submit btn-rounded submit">' +
                    CommonTxtTstr.Save +
                '</button>' +
                '<button class="btn btn-back btn-rounded back">' +
                    CommonTxtTstr.Back +
                '</button>';
        } else {
            throw new Error("Error step");
        }
        this.$panel.find(".mainContent > .bottomSection")
        .find(".btnWrap").html(btnHTML);
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
        let schema: ColSchema[] = this._selectedTable.getSchema();
        this._schemaSection.setInitialSchema(schema);
        this._schemaSection.render(oldSchema || schema);
        return null;
    }

    private _goToSchemaStep(): void {
        if (this._selectedTable == null) {
            StatusBox.show("Input must have a source", this._$pubTableInput, false, {'side': 'right'});
            return;
        }
        this._autoDetectSchema(true);
        this._currentStep = 2;
        this._gotoStep();
    }

}