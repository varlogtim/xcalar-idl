/**
 * The operation editing panel for Export operator
 */
class ExportOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // $('#exportOpPanel');
    private _$exportDest: JQuery = null; // $("#exportDest");
    private _$exportDestList: JQuery = null; // $("#exportDestList");
    private _$exportColList: JQuery = null; // $("#exportOpColumns .cols");
    private _$exportArgSection: JQuery = null; // $("#exportOpPanel .argsSection");
    private _dagNode: DagNodeExport = null;
    private _dataModel: ExportOpPanelModel = null;
    private _currentDriver: string = "";

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'exportOpPanel';


    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        let self = this;
        this._$elemPanel = $("#exportOpPanel");
        this._$exportDest = $("#exportDriver");
        this._$exportDestList = $("#exportDriverList");
        this._$exportColList = $("#exportOpColumns .cols");
        this._$exportArgSection = $("#exportOpPanel .argsSection");
        super.setup(this._$elemPanel);

        this._activateDropDown(this._$exportDestList, "#exportDriverList");

        let expList: MenuHelper = new MenuHelper($("#exportDriverList"), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                self._$exportDest.val($li.text());
                self.renderDriverArgs();
                const driver: ExportDriver = self._dataModel.exportDrivers.find((driver) => {
                    return driver.name == self._currentDriver;
                });
                self._dataModel.setUpParams(driver);
            }
        });
        expList.setupListeners();
        this._setupEventListener();
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

    /**
     *
     */
    private _convertAdvConfigToModel(): ExportOpPanelModel {
        const dagInput: DagNodeExportInputStruct = <DagNodeExportInputStruct>JSON.parse(this._editor.getValue());
        const allColMap: Map<string, ProgCol> = ExportOpPanelModel.getColumnsFromDag(this._dagNode);
        const error = this._dataModel.verifyDagInput(dagInput);
        if (error != "") {
            throw new Error(error);
        }
        return ExportOpPanelModel.fromDagInput(dagInput, allColMap, this._dataModel.exportDrivers);
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeExportInputStruct = this._dataModel.toDag();
            this._editor.setValue(JSON.stringify(param, null, 4));
            this._dataModel.setAdvMode(true);
            this._updateUI();
        } else {
            try {
                const newModel: ExportOpPanelModel = this._convertAdvConfigToModel();
                newModel.setAdvMode(false);
                this._dataModel = newModel;
                this._$exportDest.val(this._dataModel.currentDriver.name);
                this._currentDriver = "Switching to: " + this._dataModel.currentDriver.name;
                this._updateUI();
                return;
            } catch (e) {
                StatusBox.show(e, $("#exportOpPanel .modalTopMain"),
                    false, {'side': 'right'});
                return;
            }
        }
        return null;
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeExport, options?): void {
        // Show panel
        if (!super.showPanel(null, options)) {
            return;
        }
        this._dagNode = dagNode;
        this._dataModel = ExportOpPanelModel.fromDag(dagNode);
        if (this._dataModel.loadedName == "") {
            this._currentDriver = "";
        }
        this._dataModel.loadDrivers()
        .then(() => {
            this._updateUI();
            MainMenu.setFormOpen();
        })
        .fail((error) => {
            console.error(error);
            this.close();
        });
    }

    private _updateUI(): void {
        this._renderColumns();
        this._renderDriverList();
        this.renderDriverArgs();
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == this._currentDriver;
        });
        if (driver == null) {
            let inputDriverName: string = $("#exportDriverList #exportDriver").val();
            StatusBox.show(ExportTStr.DriverNotFound + inputDriverName, this._$exportArgSection,
                false, {'side': 'right'});
            this._dagNode.beErrorState(ExportTStr.DriverNotFound + inputDriverName);
            return;
        }
        this._dataModel.setUpParams(driver);
    }

    private _renderColumns(): void {
        const columnList = this._dataModel.columnList;
        if (columnList.length == 0) {
            this._$exportColList.empty();
            $("#exportOpColumns .noColsHint").show();
            $("#exportOpColumns .selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            let checked = column.isSelected ? " checked" : "";
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
                '<div class="checkbox' + checked + '">' +
                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                '</div>' +
            '</li>';
        });
        this._$exportColList.html(html);
        $("#exportOpColumns .selectAllWrap").show();
        $("#exportOpColumns .noColsHint").hide();
        if (this._$exportColList.find('.col .checked').length == this._$exportColList.find('.checkbox').length) {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }
    }

    private _renderDriverList() {
        let $list: JQuery = $("#exportDriverList .exportDrivers");
        $list.empty();
        const drivers: ExportDriver[] = this._dataModel.exportDrivers;
        let html: string = "";
        drivers.forEach(driver => {
            html += '<li class="exportDriver">' + driver.name + '</li>';
        });
        $list.append(html);
    }

    private _createTargetListHtml(): string {
        let html: string = '<div class="dropDownList">' +
            '<input class="text" type="text" value="" spellcheck="false">' +
            '<div class="iconWrapper"><i class="icon xi-arrow-down"></i></div>' +
            '<div class="list"><ul class="exportDrivers">';
        // Object.values is not supported by many browsers
        const obj = DSTargetManager.getAllTargets();
        let targets: {name: string}[] = Object.keys(obj).map((key) => obj[key]);
        targets.forEach((target) => {
            html += "<li>" + target.name + "</li>";
        });
        html += '</ul><div class="scrollArea top"><i class="arrow icon xi-arrow-up"></i></div>' +
            '<div class="scrollArea bottom"><i class="arrow icon xi-arrow-down"></i>' +
            '</div></div></div>'
        return html;
    }

    private _createParamHtml(param: ExportParam): string {
        let argHtml: string = "";
        let type: string = "";
        switch (param.type) {
            case "integer":
                type = "number";
                break;
            case "boolean":
                type = "checkbox";
                break;
            case "target":
                type = "target";
                break;
            case "string":
                type = "text";
                break;
            default:
                break;
        }
        type = param.secret ? "password" : type;
        argHtml = '';
        argHtml = '<div class="exportArg formRow ' + param.name.replace(/ /g,"_") + ' ' + type + 'Arg">' +
            '<div class="subHeading clearfix">' +
                '<div class="label">' + param.name
        if (param.optional) {
            argHtml += ' (optional)'
        }
        argHtml += ':</div>' +
            '</div>' +
            '<p class="instrText">' + param.description + '</p>';
        if (param.type == "target") {
            argHtml += this._createTargetListHtml();
        } else if (param.type == "boolean") {
            argHtml += '<div class="checkbox">' +
            '<i class="icon xi-ckbox-empty"></i>' +
            '<i class="icon xi-ckbox-selected"></i></div>'
        } else {
            argHtml += '<div class="inputWrap">' +
                '<input class="arg ';
            if (param.optional) {
                argHtml += 'optional'
            }
            argHtml += '" type="' + type + '"></div>';
        }
        argHtml += '</div>'
        return argHtml;
    }

    /**
     * Renders the current driver arguments on XD
     */
    public renderDriverArgs(): void {
        let driverName: string = this._$exportDest.val();
        if (driverName == "") {
            driverName = $("#exportDriverList .exportDriver").eq(0).text();
            this._$exportDest.val(driverName);
        } else if (driverName == this._currentDriver) {
            return;
        }
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == driverName;
        });
        if (driver == null) {
            return;
        }
        this._currentDriver = driverName;
        let html: string = "";
        this._$exportArgSection.empty();
        let targetParams: string[] = [];
        driver.params.forEach((param: ExportParam) => {
            html += this._createParamHtml(param);
            if (param.type == "target") {
                targetParams.push(param.name.replace(/ /g,"_"));
            }
        });
        this._$exportArgSection.append(html);
        let $targetList: JQuery = null;
        let container: string = "";
        targetParams.forEach((paramName) => {
            let self = this;
            container = "#exportOpPanel .argsSection ." + paramName + " .dropDownList"
            $targetList = $(container);
            this._activateDropDown($targetList, container);
            let expList: MenuHelper = new MenuHelper($(container), {
                "onSelect": ($li) => {
                    if ($li.hasClass("hint")) {
                        return false;
                    }

                    if ($li.hasClass("unavailable")) {
                        return true; // return true to keep dropdown open
                    }

                    $li.closest('.dropDownList').find('input').val($li.text());
                    let index: number = $("#exportOpPanel .exportArg").index($($li.closest(".exportArg")));
                    self._dataModel.setParamValue($li.text(), index);
                }
            });
            expList.setupListeners();
        });
    }

    /**
     * Hide the panel
     */
    public close(): void {
        super.hidePanel();
        MainMenu.setFormClose();
    }



    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        // Clear existing event handlers
        this._$elemPanel.off(`.${ExportOpPanel._eventNamespace}`);
        const self: ExportOpPanel = this;

        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${ExportOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close() }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${ExportOpPanel._eventNamespace}`,
            '.confirm',
            () => {
                if (this._dataModel.isAdvMode()) {
                    try {
                        const newModel: ExportOpPanelModel = this._convertAdvConfigToModel();
                        this._dataModel = newModel;
                    } catch (e) {
                        StatusBox.show(e, $("#exportOpPanel .advancedEditor"),
                            false, {'side': 'right'});
                        return;
                    }
                }
                if (this._dataModel.saveArgs(this._dagNode)) {
                    this.close();
                }
            }
        );

        this._$elemPanel.on({
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                $("#exportDriverList #exportDriver").data("value", $(this).text().trim());
            }
        }, '#exportDriverList .list li');

        this._$exportDestList.keypress(function(event) {
            if ((event.keyCode || event.which) == 13) {
                self.renderDriverArgs();
                const driver: ExportDriver = self._dataModel.exportDrivers.find((driver) => {
                    return driver.name == self._currentDriver;
                });
                self._dataModel.setUpParams(driver);
            }
        });

        $('#exportOpColumns .selectAllWrap .checkbox').click(function(event) {
            let $box: JQuery = $(this);
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$exportColList.find('.checked').removeClass("checked");
                self._dataModel.setAllCol(false);
            } else {
                $box.addClass("checked");
                self._$exportColList.find('.col').addClass("checked");
                self._$exportColList.find('.checkbox').addClass("checked");
                self._dataModel.setAllCol(true);
            }
        });

        $('#exportOpColumns .columnsWrap').on("click", ".checkbox", function(event) {
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
                if (self._$exportColList.find('.col .checked').length == self._$exportColList.find('.checkbox').length) {
                    self._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
                }
            }
            let colIndex = $("#exportOpColumns .columnsToExport .cols .col").index($col);
            self._dataModel.toggleCol(colIndex);
        });

        $('#exportOpPanel .argsSection').on("click", ".checkbox", function(event) {
            event.stopPropagation();
            let $box: JQuery = $(this);
            let $arg: JQuery = $(this).parent();
            let paramIndex: number = $("#exportOpPanel .exportArg").index($arg);
            if ($arg.hasClass("checked")) {
                $arg.removeClass("checked");
                $box.removeClass("checked");
                self._dataModel.setParamValue("false", paramIndex);
            } else {
                $arg.addClass("checked");
                $box.addClass("checked");
                self._dataModel.setParamValue("true", paramIndex);
            }
        });

        $('#exportOpPanel .argsSection').on("change", "input", function(event) {
            event.stopPropagation();
            let $input = $(this);
            let $arg = $(this).closest('.exportArg');
            let paramIndex = $("#exportOpPanel .exportArg").index($arg);
            self._dataModel.setParamValue($input.val(), paramIndex);
        });
    }

}