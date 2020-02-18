class MainOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeDFIn;
    private _dataflows: {tab: DagTab, displayName: string}[];
    private _fns: {nodeId: DagNodeId, displayName: string}[];
    private _schemaSection: ColSchemaSection;
    private _source: string;

    public constructor() {
        super();
        this._setup();
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
    }

    public show(dagNode: DagNodeDFIn, options?): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagNode = dagNode;
        super.showPanel("Main", options)
        .then(() => {
            this._initialize(dagNode);
            const model = $.extend(this._dagNode.getParam(), {
                schema: this._dagNode.getSchema()
            });
            this._restorePanel(model);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Close the view
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
            const param: DagNodeDFInInputStruct = this._validate(true) || {
                linkOutName: "",
                dataflowId: "",
                source: "",
                schema: []
            };
            param.dataflowId = param.dataflowId || "";
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._convertAdvConfigToModel();
                this._restorePanel(param);
                return null;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _setup(): void {
        super.setup($("#mainOpPanel"));
        this._addEventListeners();
    }

    private _clear(): void {
        this._dagNode = null;
        this._dataflows = null;
        this._fns = null;
        this._source = null;
        this._schemaSection.clear();
        let $panel = this._getPanel();
        const $drdopwonList: JQuery = $panel.find(".dropDownList");
        $drdopwonList.find("input").val("");
        $drdopwonList.find("ul").empty();
        $panel.removeClass("withSource");
        this._toggleTableNameOption(false);
    }

    private _initialize(dagNode: DagNodeDFIn): void {
        this._dagNode = dagNode;
        this._initializeDataflows();
    }

    private _initializeDataflows(): void {
        const tabs: DagTab[] = DagTabManager.Instance.getTabs();
        const dataflows: {tab: DagTab, displayName: string}[] = [];
        tabs.forEach((tab) => {
            // don't show sql tab, custom tab, or optimized tab
            if (!(tab instanceof DagTabUser)) {
                return;
            }
            let isValidDataflow: boolean = false;
            try {
                // const nodes: Map<DagNodeId, DagNode> = tab.getGraph().getAllNodes();
                // for (let node of nodes.values()) {
                //     if (node instanceof DagNodeOut) {
                //         isValidDataflow = true;
                //         break;
                //     }
                // }
                const nodeHeadsMap = tab.getGraph().getNodeHeadsMap();
                if (!nodeHeadsMap.size) {
                    isValidDataflow = false;
                }
            } catch (e) {
                console.error(e);
            }
            if (!isValidDataflow) {
                // exclude dataflow that don't have link out node
                return;
            }
            const name: string = tab.getName();
            dataflows.push({
                tab: tab,
                displayName: name
            });
        });

        this._dataflows = dataflows;
    }

    private _initializeFns(dataflowName: string): void {
        this._fns = [];
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        if (dataflow.length === 1) {
            const nodeHeadsMap = dataflow[0].tab.getGraph().getNodeHeadsMap();
            nodeHeadsMap.forEach((nodeId, head) => {
                this._fns.push({nodeId: nodeId, displayName: head});
            });
        }
    }

    private _setSource(source: string): void {
        this._source = source;
        let $panel = this._getPanel();
        if (this._source) {
            $panel.addClass("withSource");
        } else {
            $panel.removeClass("withSource");
        }
        $panel.find(".sourceTableName input").val(this._source);
        this._toggleTableNameOption(this._source != null && this._source != "");
    }

    private _restorePanel(param: {
        linkOutName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
    }): void {
        this._setSource(param.source);
        const dataflowName: string = this._dataflowIdToName(param.dataflowId);
        this._getDFDropdownList().find("input").val(dataflowName);
        this._getLinkOutDropdownList().find("input").val(param.linkOutName);
        this._initializeFns(dataflowName);
        this._schemaSection.render(param.schema);
    }

    private _submitForm(): void {
        let args: {linkOutName: string, dataflowId: string, source: string, schema: ColSchema[]};
        if (this._isAdvancedMode()) {
            args = this._validAdvancedMode();
            if (args != null) {
                this._setSource(args.source || "");
            }
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }

        this._dagNode.setSchema(args.schema);
        this._dagNode.setParam(args);
        this.close(true);
    }

    private _validate(ignore: boolean = false): {
        linkOutName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
    } {
        const $dfInput: JQuery = this._getDFDropdownList().find("input");
        const $linkOutInput: JQuery = this._getLinkOutDropdownList().find("input");
        const dataflowName = $dfInput.val().trim();
        const dataflowId: string = this._dataflowNameToId(dataflowName);
        const outName: string = $linkOutInput.val().trim();


        this._fns = [];
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        let hasFn = false;
        if (dataflow.length === 1) {
            const graph = dataflow[0].tab.getGraph();
            hasFn = graph.hasHead(outName);
        }


        let isValid: boolean = false;
        if (ignore) {
            isValid = true;
        } else if (this._source) {
            isValid = true;
        } else {
            // only check when there is no source
            isValid = xcHelper.validate([{
                $ele: $dfInput
            }, {
                $ele: $dfInput,
                error: OpPanelTStr.DFLinkInNoDF,
                check: () => dataflowId == null
            }, {
                $ele: $linkOutInput
            }, {
                $ele: $linkOutInput,
                error: "Function not found",
                check: () => !hasFn
            }]);
        }

        if (!isValid) {
            return null;
        }


        if (isValid) {
            return {
                dataflowId: dataflowId,
                fnNodeId: outName
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

    private _populateList(
        $dropdown: JQuery,
        names: {displayName: string}[]
    ): void {
        let html: HTML = null;
        names = names || [];
        html = names.map((name) => `<li>${name.displayName}</li>`).join("");
        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _searchDF(keyword?: string): void {
        let dataflows = this._dataflows;
        if (keyword) {
            keyword = keyword.toLowerCase();
            dataflows = dataflows.filter((df) => {
                return df.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getDFDropdownList(), dataflows);
    }

    private _searchFnName(keyword?: string): void {
        let fns = this._fns;
        if (keyword) {
            keyword = keyword.toLowerCase();
            fns = fns.filter((fn) => {
                return fn.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getFnDropdownList(), fns);
    }

    private _dataflowIdToName(dataflowId: string): string {
        if (!dataflowId) {
            return "";
        }
        if (dataflowId === DagNodeDFIn.SELF_ID) {
            dataflowId = DagViewManager.Instance.getActiveTab().getId();
        }
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.tab.getId() === dataflowId;
        });
        return dataflow.length === 1 ? dataflow[0].displayName : "";
    }

    private _dataflowNameToId(dataflowName: string): string {
        if (!dataflowName) {
            return null;
        }
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        return dataflow.length === 1 ? dataflow[0].tab.getId() : null;
    }

    private _getGraphFromDataflowName(dataflowName: string): DagGraph {
        if (!dataflowName) {
            return null;
        }
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        return dataflow.length === 1 ? dataflow[0].tab.getGraph() : null;
    }

    private _getDFDropdownList(): JQuery {
        return this._getPanel().find(".dataflowName .dropDownList");
    }

    private _getLinkOutDropdownList(): JQuery {
        return this._getPanel().find(".linkOutNodeName .dropDownList");
    }

    private _getFnDropdownList(): JQuery {
        return this._getPanel().find(".linkOutNodeName .dropDownList");
    }

    private _getSchemaSection(): JQuery {
        return this._getPanel().find(".colSchemaSection");
    }

    private _getSourceOptions(): JQuery {
        return this._getPanel().find(".sourceSection .radioButton");
    }

    private _convertAdvConfigToModel(): {
        outName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
    } {
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

    private _addEventListenersForDropdown(
        $dropdown: JQuery,
        searchCallback: Function
    ): void {
        const selector: string = `#${this._getPanel().attr("id")}`;
        new MenuHelper($dropdown, {
            onOpen: () => {
                searchCallback.call(this);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    $dropdown.find("input").val($li.text()).trigger("change");
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        $dropdown.find("input")
        .on("input", (event) => {
            const keyword: string = $(event.currentTarget).val().trim();
            searchCallback.call(this, keyword);
        });
    }

    protected _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        $panel.on("change", ".dataflowName input", (event) => {
            const dataflowName: string = $(event.currentTarget).val().trim();
            this._initializeFns(dataflowName);
        });

        $panel.find(".sourceTableName input").change(() =>{
            this._source = $(event.currentTarget).val().trim();
        });

        // dropdown for dataflowName
        const $dfList: JQuery = this._getDFDropdownList();
        this._addEventListenersForDropdown($dfList, this._searchDF);
        // dropdown for outNodeName
        const $fnNameDropdownList: JQuery = this._getFnDropdownList();
        this._addEventListenersForDropdown($fnNameDropdownList, this._searchFnName);
    }

    private _toggleTableNameOption(withSource: boolean): void {
        let $panel: JQuery = this._getPanel();
        let $options: JQuery = this._getSourceOptions();
        $options.removeClass("active");
        if (withSource) {
            $panel.addClass("withSource");
            $options.filter(`[data-option="table"]`).addClass("active");
        } else {
            $panel.removeClass("withSource");
            $options.filter(`[data-option="node"]`).addClass("active");
        }
    }

}