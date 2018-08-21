class JoinOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null;
    private _componentFirstStep: JoinOpPanelStep1 = null;
    private _componentSecondStep: JoinOpPanelStep2 = null;
    private _dataModel: JoinOpPanelModel = null;
    private _dagNode: DagNodeJoin = null;

    public setup(): void {
        this._$elemPanel = $('#joinOpPanel');
        this._componentFirstStep = new JoinOpPanelStep1({
            container: this._$elemPanel,
            goNextStepFunc: () => {
                this._dataModel.currentStep = 2;
                this._updateUI();
            }
        });
        this._componentSecondStep = new JoinOpPanelStep2({
            container: this._$elemPanel,
            goPrevStepFunc: () => {
                this._dataModel.currentStep = 1;
                this._updateUI();
            },
            submitDataFunc: () => {
                if (this._dagNode != null) {
                    this._dagNode.setParam(
                        xcHelper.deepCopy(this._dataModel.toDag())
                    );
                    this.close();
                }
            }
        });

        super.setup(this._$elemPanel);
    }

    public show(dagNode: DagNodeJoin): void {
        this._dagNode = dagNode;
        // Setup data model
        this._dataModel = JoinOpPanelModel.fromDag(dagNode);
        if (this._dataModel.joinColumnPairs.length === 0) {
            this._dataModel.addColumnPair();
        }
        this._dataModel.currentStep = 1;

        // Update UI according to the data model
        this._updateUI();

        // Show panel
        super.showPanel();
    }

    public close(): void {
        super.hidePanel();
    }

    private _updateUI() {
        // if (this._repo.push(this._dataModel)) {
        //     return;
        // }
    
        // Event handlers for the container panel
        this._$elemPanel.off();
        // Close icon & Cancel button
        this._$elemPanel.on(
            'click',
            '.close, .cancel',
            () => this.close()
        );

        // Child components
        this._componentFirstStep.updateUI({
            modelRef: this._dataModel
        });
        this._componentSecondStep.updateUI({
            modelRef: this._dataModel
        });
    }

    public static test() {
        const leftCols = fakeCols(8,1,5);
        const [leftJoinCols, leftCasts] = fakeJoins(leftCols, 4);
        const rightCols = fakeCols(3,2,4);
        const [rightJoinCols, rightCasts] = fakeJoins(rightCols, 4);

        const parentNode1 = DagNodeFactory.create({type: DagNodeType.Dataset});
        parentNode1.getLineage().setColumns(leftCols);
        const parentNode2 = DagNodeFactory.create({type: DagNodeType.Dataset});
        parentNode2.getLineage().setColumns(rightCols);
        const dagNode = <DagNodeJoin>DagNodeFactory.create({type: DagNodeType.Join});
        dagNode.connectToParent(parentNode1, 0);
        dagNode.connectToParent(parentNode2, 1);
        parentNode1.connectToChild(dagNode);
        parentNode2.connectToChild(dagNode);
        dagNode.setParam({
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: [].concat(leftJoinCols),
                casts: [].concat(leftCasts),
                rename: []
            },
            right: {
                columns: [].concat(rightJoinCols),
                casts: [].concat(rightCasts),
                rename: []
            },
            evalString: 'testEvalString'
        });

        JoinOpPanel.Instance.setup();
        JoinOpPanel.Instance.show(dagNode);

        function fakeCols(derivedCount, prefixGroupCount, prefixedCount) {
            const colTypes = [
                ColumnType.boolean,
                ColumnType.integer,
                ColumnType.float,
                ColumnType.string
            ];
    
            const cols = [];
            for (let i = 0; i < derivedCount; i ++) {
                const colName = `DerivedCol${i}`;
                const colType = colTypes[Math.floor(Math.random() * colTypes.length)];
                cols.push(ColManager.newPullCol(colName, colName, colType));
            }
            for (let i = 0; i < prefixGroupCount; i ++) {
                for (let j = 0; j < prefixedCount; j ++) {
                    const colName = `Prefix${i}${gPrefixSign}Col${j}`;
                    const colType = colTypes[Math.floor(Math.random() * colTypes.length)];
                    cols.push(ColManager.newPullCol(colName, colName, colType));
                }
            }
            return cols;
        }

        function fakeJoins(cols: ProgCol[], count) {
            const len = cols.length;
            const joinCols = [];
            const joinCasts = [];
            for (let i = 0; i < count; i ++) {
                const index = Math.floor(Math.random() * len);
                joinCols.push(cols[index].getBackColName());
                joinCasts.push(cols[index].getType());
            }
            return [joinCols, joinCasts];
        }
    }
}