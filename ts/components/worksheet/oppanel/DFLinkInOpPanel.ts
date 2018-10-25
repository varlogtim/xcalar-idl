class DFLinkInOpPanel extends BaseOpPanel {
    private dagNode: DagNodeDFIn;
    private dataflows: {tab: DagTab, displayName: string}[];
    private linkOutNodes: {node: DagNodeDFOut, displayName: string}[];
    private schemaSection: DFLinkInOpPanelSchemaSection;

    public constructor() {
        super();
        this._setup();
        this.schemaSection = new DFLinkInOpPanelSchemaSection(this._getSchemaSection());
    }

    public show(dagNode: DagNodeDFIn, options?): boolean {
        if (!super.showPanel("Link In", options)) {
            return false;
        }
        this._initialize(dagNode);
        this._restorePanel();
        this.schemaSection.render(dagNode.getSchema());
        return true;
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

    private _setup(): void {
        super.setup($("#dfLinkInPanel"));
        this._addEventListeners();
    }

    private _clear(): void {
        this.dagNode = null;
        this.dataflows = null;
        this.linkOutNodes = null;
        this.schemaSection.clear();
        const $drdopwonList: JQuery = this._getPanel().find(".dropDownList");
        $drdopwonList.find("input").val("");
        $drdopwonList.find("ul").empty();
    }

    private _initialize(dagNode: DagNodeDFIn): void {
        this.dagNode = dagNode;
        this._initializeDataflows();
    }

    private _initializeDataflows(): void {
        const tabs: DagTab[] = DagTabManager.Instance.getTabs();
        const dataflows = tabs.map((tab) => {
            const name: string = tab.getName();
            const shared: boolean = (tab instanceof DagTabShared);
            const displayName: string = shared ? (<DagTabShared>tab).getPath() : name;
            return {
                tab: tab,
                displayName: displayName
            }
        });

        this.dataflows = dataflows;
    }

    private _initializeLinkOutNodes(dataflowName: string): void {
        this.linkOutNodes = [];
        const dataflow = this.dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        if (dataflow.length === 1) {
            const nodes: Map<DagNodeId, DagNode> = dataflow[0].tab.getGraph().getAllNodes();
            for (const [_nodeId, node] of nodes) {
                if (node.getType() === DagNodeType.DFOut) {
                    const name: string = (<DagNodeDFOut>node).getParam().name;
                    if (name) {
                        this.linkOutNodes.push({
                            node: <DagNodeDFOut>node,
                            displayName: name
                        });
                    }
                }
            }
        }
    }

    private _restorePanel(): void {
        const param: DagNodeDFInInputStruct = this.dagNode.getParam();
        const dataflowName: string = this._dataflowIdToName(param.dataflowId);
        this._getDFDropdownList().find("input").val(dataflowName);
        this._getLinkOutDropdownList().find("input").val(param.linkOutName);
        this._initializeLinkOutNodes(dataflowName);
    }

    private _submitForm(): void {
        const args: DagNodeDFInInputStruct = this._validate();
        if (args == null) {
            // invalid case
            return;
        }
        this.dagNode.setParam(args);
        this.close(true);
    }

    private _validate(): DagNodeDFInInputStruct {
        const $dfInput: JQuery = this._getDFDropdownList().find("input");
        const $linkOutInput: JQuery = this._getLinkOutDropdownList().find("input");
        const dataflowId: string = this._dataflowNameToId($dfInput.val().trim());
        const linkOutName: string = $linkOutInput.val().trim();
        let isValid: boolean = xcHelper.validate([{
            $ele: $dfInput
        }, {
            $ele: $dfInput,
            error: OpPanelTStr.DFLinkInNoDF,
            check: () => dataflowId == null
        }, {
            $ele: $linkOutInput
        }, {
            $ele: $linkOutInput,
            error: OpPanelTStr.DFLinkInNoOut,
            check: () => {
                return this.linkOutNodes.filter((node) => {
                    return node.displayName === linkOutName;
                }).length === 0;
            }
        }]);

        if (!isValid) {
            return null;
        }

        const schema = this.schemaSection.getSchema();
        if (isValid && schema != null) {
            return {
                dataflowId: dataflowId,
                linkOutName: linkOutName,
                schema: schema
            }
        } else {
            return null
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
        let dataflows = this.dataflows;
        if (keyword) {
            keyword = keyword.toLowerCase();
            dataflows = dataflows.filter((df) => {
                return df.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getDFDropdownList(), dataflows);
    }

    private _searchLinkOutNodeName(keyword?: string): void {
        let linkOutNodes = this.linkOutNodes;
        if (keyword) {
            keyword = keyword.toLowerCase();
            linkOutNodes = linkOutNodes.filter((node) => {
                return node.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getLinkOutDropdownList(), linkOutNodes);
    }

    private _dataflowIdToName(dataflowId: string): string {
        if (!dataflowId) {
            return "";
        }
        const dataflow = this.dataflows.filter((dataflow) => {
            return dataflow.tab.getId() === dataflowId;
        });
        return dataflow.length === 1 ? dataflow[0].displayName : "";
    }

    private _dataflowNameToId(dataflowName: string): string {
        if (!dataflowName) {
            return null;
        }
        const dataflow = this.dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        return dataflow.length === 1 ? dataflow[0].tab.getId() : null;
    }

    private _getDFDropdownList(): JQuery {
        return this._getPanel().find(".dataflowName .dropDownList");
    }

    private _getLinkOutDropdownList(): JQuery {
        return this._getPanel().find(".linkOutNodeName .dropDownList");
    }

    private _getSchemaSection(): JQuery {
        return this._getPanel().find(".schemaSection");
    }

    private _autoDetectSchema(): {error: string} {
        try {
            const $dfInput: JQuery = this._getDFDropdownList().find("input");
            const $linkOutInput: JQuery = this._getLinkOutDropdownList().find("input");
            const dataflowId: string = this._dataflowNameToId($dfInput.val().trim());
            const linkOutName: string = $linkOutInput.val().trim();
            if (!dataflowId) {
                return {error: OpPanelTStr.DFLinkInNoDF};
            }
            if (!linkOutName) {
                return {error: OpPanelTStr.DFLinkInNoOut};
            }
            const fakeLinkInNode: DagNodeDFIn = <DagNodeDFIn>DagNodeFactory.create({
                type: DagNodeType.DFIn
            });
            fakeLinkInNode.setParam({
                dataflowId: dataflowId,
                linkOutName: linkOutName,
                schema: []
            });
            const dfOutNode: DagNodeDFOut = fakeLinkInNode.getLinedNodeAndGraph().node;
            const progCols: ProgCol[] = dfOutNode.getLineage().getColumns();
            const schema: {name: string, type: ColumnType}[] = progCols.map((progCol) => {
                return {
                    name: progCol.getBackColName(),
                    type: progCol.getType()
                }
            });
            this.schemaSection.render(schema);
        } catch (e) {
            return {error: e};
        }
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
            container: selector
        }).setupListeners();

        $dropdown.find("input")
        .on("input", (event) => {
            const keyword: string = $(event.currentTarget).val().trim();
            searchCallback.call(this, keyword);
        });
    }

    private _addEventListeners(): void {
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
            this._initializeLinkOutNodes(dataflowName);
        });

        $panel.on("change", ".linkOutNodeName input", () => {
            this._autoDetectSchema();
        });

        // dropdown for dataflowName
        const $dfList: JQuery = this._getDFDropdownList();
        this._addEventListenersForDropdown($dfList, this._searchDF);
        // dropdown for linkOutNodeName
        const $linkOutDropdownList: JQuery = this._getLinkOutDropdownList();
        this._addEventListenersForDropdown($linkOutDropdownList, this._searchLinkOutNodeName);
    
        
        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", (event) => {
            const error: {error: string} = this._autoDetectSchema();
            if (error != null) {
                StatusBox.show(OpPanelTStr.DFLinkInDetectFail, $(event.currentTarget), false, {
                    detail: error.error
                });
            }
        });
    }
}