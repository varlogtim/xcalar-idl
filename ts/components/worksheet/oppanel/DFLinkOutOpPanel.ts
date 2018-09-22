class DFLinkOutOpPanel extends BaseOpPanel {
    private dagNode: DagNodeDFOut;
    private dagGraph: DagGraph;

    public constructor() {
        super();
        this._setup();
    }

    public show(dagNode: DagNodeDFOut): boolean {
        if (!super.showPanel("Link Out")) {
            return false;
        }
        this._initialize(dagNode);
        this._restorePanel();
        return true;
    }

    public close(): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        super.hidePanel();
    }

    private _setup(): void {
        super.setup($("#dfLinkOutPanel"));
        this._addEventListeners();
    }

    private _initialize(dagNode: DagNodeDFOut): void {
        this.dagNode = dagNode;
        this.dagGraph = DagView.getActiveDag();
        if (!this.dagGraph.hasNode(this.dagNode.getId())) {
            throw new Error("Invalid dag node");
        }
    }

    private _restorePanel(): void {
        const name: string = this.dagNode.getParam().name;
        const $input: JQuery = this._getLinkOutNameInput();
        $input.val(name);
    }

    private _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".confirm", (event) => {
            $(event.target).blur();
            this._submitForm();
        });
    }

    private _submitForm(): void {
        const args: DagNodeDFOutInput = this._validate();
        if (args == null) {
            // invalid case
            return;
        }
        this.dagNode.setParam(args);
        this.close();
    }

    private _validate(): DagNodeDFOutInput {
        const $input: JQuery = this._getLinkOutNameInput();
        const name: string = $input.val().trim();
        const isValid: boolean = xcHelper.validate([{
            $ele: $input
        }, {
            $ele: $input,
            check: () => {
                return this._isNonUniqueName(name);
            },
            error: OpPanelTStr.DFLinkOutNameDup
        }]);
        if (isValid) {
            return {
                name: name
            };
        } else {
            return null;
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
}