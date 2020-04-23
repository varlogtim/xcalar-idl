class DFLinkOutOpPanel extends BaseOpPanel {
    private dagNode: DagNodeDFOut;
    private dagGraph: DagGraph;
    private model: DFLinkOutOpPanelModel;
    private _$colList: JQuery;
    private needsColumns: boolean; // XXX to deprecated

    public constructor() {
        super();
        this._setup();
    }

    public show(dagNode: DagNodeDFOut, options?) {
        this._dagNode = dagNode;
        super.showPanel("Func Output", options)
        .then(() => {
            this.model = new DFLinkOutOpPanelModel(dagNode, () => {
                this._renderColumns();
            });
            this._initialize(dagNode);
            this._restorePanel(this.dagNode.getParam());
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    public close(isSubmit?: boolean): void {
        if (!this.isOpen()) {
            return;
        }
        super.hidePanel(isSubmit);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeDFOutInputStruct = this._validate(true) || {
                "name": "",
                "linkAfterExecution": false,
                "columns": []
            };
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._validateAdvancedMode();
                if (param["error"]) {
                    return <{error: string}>param;
                }
                this.model.updateColumns(param["columns"]);
                this._restorePanel(<DagNodeDFOutInputStruct>param);
                return null;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    public refreshColumns(): void {
        this.model.refreshColumns();
        this._renderColumns();
    }

    private _setup(): void {
        super.setup($("#dfLinkOutPanel"));
        this._$colList = this._getPanel().find(".cols");
        this._addEventListeners();
    }

    private _initialize(dagNode: DagNodeDFOut): void {
        this.dagNode = dagNode;
        this.dagGraph = DagViewManager.Instance.getActiveDag();
        if (!this.dagGraph.hasNode(this.dagNode.getId())) {
            throw new Error("Invalid dag node");
        }
    }

    private _restorePanel(param: DagNodeDFOutInputStruct): void {
        this._getLinkOutNameInput().val(param.name);
        this.needsColumns = this.dagNode.getSubType() === DagNodeSubType.DFOutOptimized ? true : false;

        const $checkbox: JQuery = this._getOptionCheckbox().find(".checkbox");
        if (!param.linkAfterExecution) {
            // checked means deep copy, uncheck is shallow copy
            $checkbox.addClass("checked");
        } else {
            $checkbox.removeClass("checked");
        }
        this._renderColumns();
    }

    private _convertAdvConfigToModel(): DagNodeDFOutInputStruct {
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

    private _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();
        const self = this;

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        const $checkboxSection: JQuery = this._getOptionCheckbox();
        $checkboxSection.on("click", ".checkbox, .text", () => {
            this._getOptionCheckbox().find(".checkbox").toggleClass("checked");
        });

        $panel.find('.selectAllWrap').click(function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$colList.find('.checked').removeClass("checked");
                self.model.setAllCol(false);
            } else {
                $box.addClass("checked");
                self._$colList.find('.col').addClass("checked");
                self._$colList.find('.checkbox').addClass("checked");
                self.model.setAllCol(true);
            }
        });

        $panel.find('.columnsWrap').on("click", ".checkbox", function(event) {
            let $box: JQuery = $(this);
            let $col: JQuery = $(this).parent();
            event.stopPropagation();
            if ($col.hasClass("checked")) {
                $col.removeClass("checked");
                $box.removeClass("checked");
                self._getPanel().find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
            } else {
                $col.addClass("checked");
                $box.addClass("checked");
                if (self._$colList.find('.col .checked').length == self._$colList.find('.checkbox').length) {
                    self._getPanel().find(".selectAllWrap .checkbox").eq(0).addClass("checked");
                }
            }
            let colIndex = $panel.find(".columnsToExport .cols .col").index($col);
            self.model.toggleCol(colIndex);
        });
    }

    private _submitForm(): void {
        let args: DagNodeDFOutInputStruct | {error: any};
        if (this._isAdvancedMode()) {
            try {
                args = this._validateAdvancedMode();
            } catch (e) {
                return;
            }
        } else {
            args = this._validate();
        }
        if (args == null || args["error"]) {
            // invalid case
            return;
        }
        this.dagNode.setParam(<DagNodeDFOutInputStruct>args);
        this.close(true);
    }

    private _validate(ignore: boolean = false): DagNodeDFOutInputStruct {
        const $input: JQuery = this._getLinkOutNameInput();
        const name: string = $input.val().trim();
        const columns = this.model.getColumnList();
        const selectedColumns = [];
        const takenNames = {};
        for (const colInfo of columns) {
            if (colInfo.isSelected) {
                let destName: string = colInfo.destName;
                if (!destName) {
                    const parsedName = xcHelper.parsePrefixColName(colInfo.name);
                    if (parsedName.prefix) {
                        destName = parsedName.prefix + "_" + parsedName.name;
                    } else {
                        destName = parsedName.name;
                    }
                }

                destName = xcHelper.autoName(destName, takenNames, null, "_");
                takenNames[destName] = true;
                selectedColumns.push({
                    sourceName: colInfo.name,
                    destName: destName
                });
            }
        }
        let isValid: boolean = true;
        if (!ignore) {
            isValid = xcHelper.validate([{
                $ele: $input
            }, {
                $ele: $input,
                check: () => {
                    return this._isNonUniqueName(name);
                },
                error: OpPanelTStr.DFLinkOutNameDup
            }, {
                    $ele: this._getPanel().find(".columnsToExport"),
                    check: () => {
                        if (this.needsColumns) {
                            return selectedColumns.length === 0;
                        } else {
                            return false;
                        }
                    },
                    error: ErrTStr.NoColumns
                }
            ]);
        }

        if (isValid) {
            const noLink: boolean = this._getOptionCheckbox()
                                        .find(".checkbox").hasClass("checked");
            return {
                name: name,
                linkAfterExecution: !noLink,
                columns: selectedColumns
            };
        } else {
            return null;
        }
    }

    private _validateAdvancedMode() {
        let args: DagNodeDFOutInputStruct;
        let error: string;
        try {
            args = this._convertAdvConfigToModel();

            let sourceColSet = new Set();
            let destColSet = new Set();
            if (!args.columns || !(args.columns instanceof Array)) {
                error = "Must have array property: columns"
            };
            for (let i = 0; i < args.columns.length; i++){
                if (sourceColSet.has(args.columns[i].sourceName)) {
                    error = xcStringHelper.replaceMsg(ErrTStr.DuplicateSourceColName, {
                        col: args.columns[i].sourceName
                    });
                    break;
                }
                if (destColSet.has(args.columns[i].destName)) {
                    error = xcStringHelper.replaceMsg(ErrTStr.DuplicateDestColName, {
                        col: args.columns[i].destName
                    });
                    break;
                }
                if (destColSet)
                error = xcHelper.validateColName(args.columns[i].destName, true, false, true);
                if (error) {
                    break;
                }
                sourceColSet.add(args.columns[i].sourceName);
                destColSet.add(args.columns[i].destName);
            }
        } catch (e) {
            error = e;
        }

        if (error == null) {
            return args;
        } else {
            StatusBox.show(error, this.$panel.find(".advancedEditor"));
            return {error: error};
        }
    }

    private _isNonUniqueName(name: string): boolean {
        const nodes: DagNode[] = this.dagGraph.filterNode((node: DagNode) => {
            return node.getType() === DagNodeType.DFOut &&
            (<DagNodeDFOut>node).getParam().name === name &&
            node !== this.dagNode;
        });
        return nodes.length !== 0;
    }

    private _getLinkOutNameInput(): JQuery {
        return this._getPanel().find(".linkOutName input");
    }

    private _getOptionCheckbox(): JQuery {
        return this._getPanel().find(".option .checkboxSection");
    }

    private _renderColumns(): void {
        const columnList = this.model.getColumnList();
        const $panel = this._getPanel();
        if (columnList.length === 0) {
            this._$colList.empty();
            $panel.find(".noColsHint").show();
            $panel.find(".selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcStringHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            let checked = column.isSelected ? " checked" : "";
            html += '<li class="col' + checked +
                '" data-colnum="' + colNum + '">' +
                '<span class="text tooltipOverflow" ' +
                'data-original-title="' +
                    xcStringHelper.escapeDblQuoteForHTML(
                        xcStringHelper.escapeHTMLSpecialChar(colName)) + '" ' +
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
        this._$colList.html(html);
        $panel.find(".selectAllWrap").show();
        $panel.find(".noColsHint").hide();
        if (this._$colList.find('.col .checked').length == this._$colList.find('.checkbox').length) {
            this._getPanel().find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._getPanel().find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }
    }
}