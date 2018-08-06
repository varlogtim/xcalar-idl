
class JoinOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null;
    private _repo: OpPanelDataRepo = new OpPanelDataRepo();
    private _componentFirstStep: JoinOpPanelStep1 = null;
    private _dataModel: JoinOpPanelModel = null;

    public setup(): void {
        this._$elemPanel = $('#joinOpPanel');
        this._componentFirstStep = new JoinOpPanelStep1({
            container: this._$elemPanel
        });

        super.setup(this._$elemPanel);
    }

    public show(dagNode: DagNodeJoin): void {
        // Setup data model
        this._dataModel = JoinOpPanelModel.fromDag(dagNode);

        // Update UI according to the data model
        this._updateUI();

        // Show panel
        super.showPanel();
    }

    public close(): void {
        super.hidePanel();
    }

    private _updateUI() {
        if (this._repo.push(this._dataModel)) {
            return;
        }
    
        // Event handlers for the container panel
        this._$elemPanel.off();
        // Close icon & Cancel button
        this._$elemPanel.on(
            'click',
            '.close, .cancel',
            () => this.close()
        );

        // Child components
        if (this._dataModel.currentStep === 1) {
            // Update Step1 UI
            this._componentFirstStep.updateUI({ modelRef: this._dataModel });
        } else {
            // TODO: Update Step2 UI
        }
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

class JoinOpPanelStep1 {
    private _templateMgr = new OpPanelTemplateManager();
    private _$elem: JQuery = null;
    private _repo: OpPanelDataRepo = new OpPanelDataRepo();
    private static readonly _templateIdClasue = 'templateClause';
    private _$elemInstr: JQuery = null;
    private _componentJoinTypeDropdown: OpPanelDropdown = null;
    private static readonly _joinTypeMenuItems: OpPanelDropdownMenuItem[] = [
        { text: JoinTStr.joinTypeInner, value: JoinOperatorTStr[JoinOperatorT.InnerJoin] },
        { text: JoinTStr.joinTypeLeft, value: JoinOperatorTStr[JoinOperatorT.LeftOuterJoin] },
        { text: JoinTStr.joinTypeRight, value: JoinOperatorTStr[JoinOperatorT.RightOuterJoin] },
        { text: JoinTStr.joinTypeSepAdv, cssClass: ['sectionLabel'] , isNotMenuItem: true},
        { text: JoinTStr.joinTypeLeftSemi, value: JoinCompoundOperatorTStr.LeftSemiJoin, cssClass: ['advanced'] },
        { text: JoinTStr.joinTypeLeftAnti, value: JoinCompoundOperatorTStr.LeftAntiSemiJoin, cssClass: ['advanced'] },
        { text: JoinTStr.joinTypeCross, value: JoinOperatorTStr[JoinOperatorT.CrossJoin], cssClass: ['advanced'] },
    ];
    private static readonly _typeCastMenuValues: ColumnType[] = [
        ColumnType.boolean,
        ColumnType.integer,
        ColumnType.float,
        ColumnType.string
    ];

    public constructor({container}: {
        container: JQuery
    }) {
        this._$elem = BaseOpPanel.findXCElement(container, 'joinFirstStep');
        this._$elemInstr = BaseOpPanel.findXCElement(this._$elem, 'colInstruction');
        this._componentJoinTypeDropdown = new OpPanelDropdown({
            container: BaseOpPanel.findXCElement(this._$elem, 'joinType'),
            inputXcId: 'text',
            ulXcId: 'menuItems',
            setTitleFunc: ($elemTitle, text) => { $elemTitle.text(text) }
        });

        this._templateMgr.loadTemplate(
            JoinOpPanelStep1._templateIdClasue, this._$elem
        );
    }

    public updateUI(props: { modelRef: JoinOpPanelModel }): void {
        const { modelRef } = props;
        // The data model needed to render the UI
        const joinType = modelRef.joinType;
        const columnPairs = modelRef.joinColumnPairs;
        const columnMeta = modelRef.columnMeta;
        // Check if the data model is changed
        if (this._repo.push(
            {joinType: joinType, columnPairs: columnPairs, columnMeta: columnMeta}
        )) {
            // No data model change, so skip the rendering
            return;
        }

        // Setup join type dropdown
        const joinTypeMenuItems = JoinOpPanelStep1._joinTypeMenuItems.map( (item) => {
            const menuInfo: OpPanelDropdownMenuItem = {
                text: item.text,
                value: item.value,
                isNotMenuItem: item.isNotMenuItem,
                isSelected: (item.value === joinType),
                cssClass: (item.cssClass != null)? [].concat(item.cssClass): []
            };
            return menuInfo;
        });
        this._componentJoinTypeDropdown.updateUI({
            menuItems: joinTypeMenuItems,
            onSelectCallback: (typeId: string) => {
                this._changeJoinType(typeId, modelRef);
                this.updateUI({modelRef: modelRef});
            }
        });

        // Setup instruction section
        let text = JoinTStr.DagColSelectInstr;
        if (joinType === JoinOperatorTStr[JoinOperatorT.CrossJoin]) {
            text = JoinTStr.DagColSelectInstrCross;
        }
        this._$elemInstr.text(text);

        // Setup clause section
        const nodeList = [];
        for (let i = 0; i < columnPairs.length; i ++) {
            const {left: leftColIndex, right: rightColIndex, isCastNeed } = columnPairs[i];

            const clauseSection = this._templateMgr.createElements(
                JoinOpPanelStep1._templateIdClasue,
                {
                    'onDelClick': columnPairs.length > 1
                        ? () => {
                            this._removeColumnPair(i, modelRef);
                            this.updateUI({modelRef: modelRef});
                        }
                        : () => {},
                    'delCss': columnPairs.length > 1? '': 'removeIcon-nodel'
                }
            )
            if (clauseSection == null || clauseSection.length > 1) {
                // This should never happend. Possibly caused by invalid template.
                console.error('JoinOpPanelStep1.updateUI: template error');
                continue;
            }
            const $clauseSection = $(clauseSection[0]);
            // Type cast row
            const $castRow = BaseOpPanel.findXCElement($clauseSection, 'castRow');
            $castRow.removeClass('overflowVisible');
            if (isCastNeed) {
                $castRow.addClass('overflowVisible');
                // Left column type dropdown
                this._createTypeCastDropdown({
                    container: $castRow,
                    dropdownId: 'leftCastDropdown',
                    typeValues: JoinOpPanelStep1._typeCastMenuValues.map( (type) => type ),
                    typeSelected: columnMeta.left[leftColIndex].type,
                    pairIndex: i,
                    isLeft: true,
                    modelRef: modelRef
                });
                // Right column type dropdown
                this._createTypeCastDropdown({
                    container: $castRow,
                    dropdownId: 'rightCastDropdown',
                    typeValues: JoinOpPanelStep1._typeCastMenuValues.map( (type) => type ),
                    typeSelected: columnMeta.right[rightColIndex].type,
                    pairIndex: i,
                    isLeft: false,
                    modelRef: modelRef
                });
            }

            // left column dropdown
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'leftColDropdown',
                colNames: columnMeta.left.map( (meta) => (meta.name) ),
                colSelected: leftColIndex,
                pairIndex: i,
                isLeft: true,
                modelRef: modelRef
            })
            // right column dropdown
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'rightColDropdown',
                colNames: columnMeta.right.map( (meta) => (meta.name) ),
                colSelected: rightColIndex,
                pairIndex: i,
                isLeft: false,
                modelRef: modelRef
            })
            nodeList.push($clauseSection[0]);
        }
        const $clauseContainer = BaseOpPanel.findXCElement(this._$elem, 'clauseContainer');
        this._templateMgr.updateDOM($clauseContainer[0], nodeList);

        // Add clause button
        const $elemAddClause = BaseOpPanel.findXCElement(this._$elem, 'addClauseBtn');
        $elemAddClause.off();
        $elemAddClause.on('click', () => {
            this._addColumnPair(modelRef);
            this.updateUI({modelRef: modelRef});
        });
    }

    private _createTypeCastDropdown(props: {
        container: JQuery,
        dropdownId: string,
        typeValues: ColumnType[],
        typeSelected: ColumnType,
        pairIndex: number,
        isLeft: boolean,
        modelRef: JoinOpPanelModel
    }): OpPanelDropdown {
        const {
            container, dropdownId, typeValues, typeSelected,
            pairIndex, isLeft, modelRef
        } = props;

        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = typeValues.map( (type) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: type as string,
                value: {pairIndex: pairIndex, type: type},
                isSelected: (typeSelected === type)
            };
            return menuItem;
        });
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems'
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            onSelectCallback: ({pairIndex, type}) => {
                this._modifyColumnType(isLeft, pairIndex, type, modelRef);
                this.updateUI({modelRef: modelRef});
            }
        });
        return componentDropdown;
    }

    private _createColumnDropdown(props: {
            container: JQuery,
            dropdownId: string,
            colNames: string[],
            colSelected: number,
            pairIndex: number,
            modelRef: JoinOpPanelModel,
            isLeft: boolean
        }
    ): OpPanelDropdown {
        const {
            container, dropdownId, colNames,
            colSelected, pairIndex, modelRef, isLeft
        } = props;
        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = colNames.map( (colName, index) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: colName,
                value: {pairIndex: pairIndex, colIndex: index}, // This value will be returned in onSelectCallback
                isSelected: (index === colSelected)
            };
            return menuItem;
        });
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems'
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            onSelectCallback: ({pairIndex, colIndex}) => {
                this._modifyColumnPair(isLeft, pairIndex, colIndex, modelRef);
                this.updateUI({modelRef: modelRef});
            }
        });
        return componentDropdown;
    }

    // Data model manipulation === start
    private _changeJoinType(typeId: string, modelRef: JoinOpPanelModel): void {
        modelRef.joinType = typeId;
    }

    private _removeColumnPair(
        pairIndex: number,
        modelRef: JoinOpPanelModel
    ): void {
        modelRef.removeColumnPair(pairIndex);
    }

    private _modifyColumnPair(
        isLeft: boolean,
        pairIndex: number,
        colIndex: number,
        modelRef: JoinOpPanelModel
    ): void {
        const pairInfo = {
            left: isLeft ? colIndex : null,
            right: isLeft ? null : colIndex
        };
        modelRef.modifyColumnPair(pairIndex, pairInfo);
    }

    private _modifyColumnType(
        isLeft: boolean,
        pairIndex: number,
        type: ColumnType,
        modelRef: JoinOpPanelModel
    ): void {
        const typeInfo = {
            left: (isLeft ? type : null) as ColumnType,
            right: isLeft ? null : type
        };
        modelRef.modifyColumnTypeByPair(pairIndex, typeInfo);
    }

    private _addColumnPair(modelRef: JoinOpPanelModel) {
        modelRef.addColumnPair();
    }
    // Data model manipulation === end
}

class JoinOpPanelStep2 {
}