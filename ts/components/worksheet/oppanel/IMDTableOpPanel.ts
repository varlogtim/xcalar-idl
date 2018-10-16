class IMDTableOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#IMDTableOpPanel');
    private _advMode: boolean;
    private _dagNode: DagNodeIMDTable;
    private _$pubTableInput: JQuery; // $('#IMDTableOpPanel .pubTableInput')
    private _$tableVersionInput: JQuery; // $('#IMDTableOpPanel .tableVersionInput')
    private _$filterStringInput: JQuery; // $('#IMDTableOpPanel .filterStringInput')
    private _$columns: JQuery; // $('#IMDTableOpColumns')
    private _$versionList: JQuery; // $('#IMDTableOpPanel #tableVersionList .tableVersions');
    private _tables: PublishTable[];
    private _selectedTable: PublishTable;
    private _primaryKeys: string[];

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
        this._$tableVersionInput.val(-1);
        this._setupEventListener();
    }


    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     * @param options
     */
    public show(dagNode: DagNodeIMDTable, options?): void {
        // Show panel
        if (!super.showPanel("IMD Table", options)) {
            return;
        }
        this._dagNode = dagNode;
        const self = this;
        this._selectedTable = null;
        this._primaryKeys = [];
        this._$columns.empty();
        this._$versionList.empty();
        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            self._tables = result.tables;
            self._updateTableList();
            self._restorePanel(self._dagNode.getParam());
        })
        .fail(function() {
            $('#pubTableList .pubTables').empty();
            //Status Box
            self._restorePanel(self._dagNode.getParam());
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    private _convertAdvConfigToModel() {
        let args: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>JSON.parse(this._editor.getValue());
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
            let param: DagNodeIMDTableInputStruct = this._getParams();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeIMDTableInputStruct = this._convertAdvConfigToModel();
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

    private _getColumns(): string[] {
        let $selectedCols = this._$columns.find(".col.checked");
        let columns: string[] = [];
        $selectedCols.each((index: number, elem: Element) => {
            columns.push($(elem).text());
        });
        return columns;
    }

    private _getParams(): DagNodeIMDTableInputStruct {
        return {
            source: this._$pubTableInput.val(),
            version: this._$tableVersionInput.val(),
            columns: this._getColumns(),
            filterString: this._$filterStringInput.val()
        }
    }

    private _changeSelectedTable(source: string): void {
        if (source == "") {
            return;
        }
        this._selectedTable =
            this._tables.find((pubTab: PublishTable) => {
                return (pubTab.name == source);
            });
        if (this._selectedTable != null) {
            const keyList: XcalarApiColumnInfoT[] = this._selectedTable.keys;
            this._primaryKeys = keyList.map((col: XcalarApiColumnInfoT) => {
                return col.name;
            })
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
        versionList.forEach((update: UpdateInfo) => {
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

    private _renderColumns(oldColumns: string[]) {
        if (this._selectedTable == null ||
                this._selectedTable.values.length == 0) {
            this._$columns.empty();
            $("#IMDTableOpColumns .noColsHint").show();
            $("#IMDTableOpColumns .selectAllWrap").hide();
            return;
        }
        const columnList: PublishTableCol[] = this._selectedTable.values;
        const self = this;
        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            let checked: string = oldColumns.includes(colName) ? " checked" : "";
            let isKey: string = " notKey";
            if (self._primaryKeys.includes(colName)) {
                checked = " checked";
                isKey = " key";
            }
            html += '<li class="col' + checked +
                '" data-colnum="' + colNum + '">' +
                '<span class="text tooltipOverflow" ' +
                'data-original-title="' +
                    xcHelper.escapeDblQuoteForHTML(
                        xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                'data-toggle="tooltip" data-placement="top" ' +
                'data-container="body">' +
                    colName +
                '</span>' +
                '<div class="checkbox' + checked + isKey +'">' +
                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                '</div>' +
                '</li>';
        });
        this._$columns.html(html);
        $("#IMDTableOpColumns .selectAllWrap").show();
        $("#IMDTableOpColumns .noColsHint").hide();
        if (this._$columns.find('.col .checked').length == this._$columns.find('.checkbox').length) {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }
    }

    private _restorePanel(input: DagNodeIMDTableInputStruct): void {
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
        this._renderColumns(input.columns);
    }

    private _updateTableList(): void {
        let $list: JQuery = $('#pubTableList .pubTables');
        $list.empty();
        let html = '';
        this._tables.forEach((table: PublishTable) => {
            html += '<li>' + table.name + '</li>';
        });
        $list.append(html);
    }

    private _checkOpArgs(input: DagNodeIMDTableInputStruct): boolean {
        let $location: JQuery = null;
        let error: string = "";
        if (input == null) {
            return false;
        }
        if (input.source == "") {
            error = "Input must have a source";
            $location = this._$pubTableInput;
        }
        if (input.version < -1) {
            error = "Version cannot be less than -1 (latest).";
            $location = this._$tableVersionInput;
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

        // Submit button
        this._$elemPanel.on(
            `click.submit.${IMDTableOpPanel._eventNamespace}`,
            '.confirm',
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
                self._renderColumns([]);
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

        $('#IMDTableOpColumns .selectAllWrap .checkbox').click(function(event) {
            let $box: JQuery = $(this);
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$columns.find('.checked.notKey').removeClass("checked");
            } else {
                $box.addClass("checked");
                self._$columns.find('.col').addClass("checked");
                self._$columns.find('.checkbox.notKey').addClass("checked");
            }
        });

        $('#IMDTableOpColumns .columnsWrap').on("click", ".checkbox.notKey", function(event) {
            let $box: JQuery = $(this);
            let $col: JQuery = $(this).parent();
            event.stopPropagation();
            if ($col.hasClass("checked")) {
                $col.removeClass("checked");
                $box.removeClass("checked");
                self._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
            } else {
                $col.addClass("checked");
                $box.addClass("checked");
                if (self._$columns.find('.col .checked').length == self._$columns.find('.checkbox').length) {
                    self._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
                }
            }
        });

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

        dagNode.setParam(params);
        this.close();
    }

}