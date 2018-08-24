class JoinOpPanelStep1 {
    private _templateMgr = new OpPanelTemplateManager();
    private _$elem: JQuery = null;
    private static readonly _templateIdClasue = 'templateClause';
    private static readonly _templateIdCast = 'templateCast';
    private static readonly _templateIdCastMsg = 'templateCastMessage';
    private _$elemInstr: JQuery = null;
    private _componentJoinTypeDropdown: OpPanelDropdown = null;
    private _goNextStepFunc = () => { };
    private _modelRef: JoinOpPanelModel = null;
    private static readonly _joinTypeMenuItems: OpPanelDropdownMenuItem[] = [
        { text: JoinTStr.joinTypeInner, value: JoinOperatorTStr[JoinOperatorT.InnerJoin] },
        { text: JoinTStr.joinTypeLeft, value: JoinOperatorTStr[JoinOperatorT.LeftOuterJoin] },
        { text: JoinTStr.joinTypeRight, value: JoinOperatorTStr[JoinOperatorT.RightOuterJoin] },
        { text: JoinTStr.joinTypeSepAdv, cssClass: ['sectionLabel'], isNotMenuItem: true },
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
    public constructor(props: {
        container: JQuery;
        goNextStepFunc: () => void;
    }) {
        const { container, goNextStepFunc } = props;
        this._goNextStepFunc = goNextStepFunc;
        this._$elem = BaseOpPanel.findXCElement(container, 'joinFirstStep');
        this._$elemInstr = BaseOpPanel.findXCElement(this._$elem, 'colInstruction');
        this._componentJoinTypeDropdown = new OpPanelDropdown({
            container: BaseOpPanel.findXCElement(this._$elem, 'joinType'),
            inputXcId: 'text',
            ulXcId: 'menuItems',
            setTitleFunc: ($elemTitle, text) => { $elemTitle.text(text); }
        });
        this._templateMgr.loadTemplate(JoinOpPanelStep1._templateIdClasue, this._$elem);
        this._templateMgr.loadTemplate(JoinOpPanelStep1._templateIdCast, this._$elem);
    }

    public updateUI(props: {
        modelRef: JoinOpPanelModel;
    }): void {
        const { modelRef } = props;
        this._modelRef = modelRef;
        this._updateUI();
    }

    private _updateUI(): void {
        const joinType = this._modelRef.joinType;
        if (this._modelRef.currentStep !== 1) {
            this._$elem.hide();
            return;
        }
        this._$elem.show();
        // Setup join type dropdown
        const joinTypeMenuItems = JoinOpPanelStep1._joinTypeMenuItems.map((item) => {
            const menuInfo: OpPanelDropdownMenuItem = {
                text: item.text,
                value: item.value,
                isNotMenuItem: item.isNotMenuItem,
                isSelected: (item.value === joinType),
                cssClass: (item.cssClass != null) ? [].concat(item.cssClass) : []
            };
            return menuInfo;
        });
        this._componentJoinTypeDropdown.updateUI({
            menuItems: joinTypeMenuItems,
            onSelectCallback: (typeId: string) => {
                this._changeJoinType(typeId);
                this._updateUI();
            }
        });
        // Setup instruction section
        let text = JoinTStr.DagColSelectInstr;
        if (this._isCrossJoin()) {
            text = JoinTStr.DagColSelectInstrCross;
        }
        this._$elemInstr.text(text);
        // Setup main section
        const $elemClauseArea = BaseOpPanel.findXCElement(this._$elem, 'clauseArea');
        const $elemCrossJoinFilter = BaseOpPanel.findXCElement(this._$elem, 'crossJoinFilter');
        if (this._isCrossJoin()) {
            $elemClauseArea.hide();
            $elemCrossJoinFilter.show();
            // Setup crossJoinFilter section
            const $elemEvalString = BaseOpPanel.findXCElement($elemCrossJoinFilter, 'evalStr');
            $elemEvalString.val(this._modelRef.evalString);
            $elemEvalString.off();
            $elemEvalString.on('input', (e) => {
                this._modelRef.evalString = $(e.target).val().trim();
                this._updateUI();
            });
            if (!this._isValidEvalString()) {
                // TODO: Show error message
            }
        }
        else {
            $elemClauseArea.show();
            $elemCrossJoinFilter.hide();
            // Setup clause section
            this._updateJoinClauseUI();
        }
        // Add clause button
        const $elemAddClause = BaseOpPanel.findXCElement(this._$elem, 'addClauseBtn');
        $elemAddClause.off();
        $elemAddClause.on('click', () => {
            this._addColumnPair();
            this._updateUI();
        });
        // Next step button
        const $elemNextStep = BaseOpPanel.findXCElement(this._$elem, 'btnNextStep');
        $elemNextStep.off();
        if (this._validateData()) {
            $elemNextStep.removeClass('btn-disabled');
            $elemNextStep.on('click', () => {
                this._goNextStepFunc();
            });
        }
        else {
            if (!$elemNextStep.hasClass('btn-disabled')) {
                $elemNextStep.addClass('btn-disabled');
            }
        }
    }

    private _createTypeCastDropdown(props: {
        container: JQuery;
        dropdownId: string;
        typeValues: ColumnType[];
        typeSelected: ColumnType;
        pairIndex: number;
        isLeft: boolean;
    }): OpPanelDropdown {
        const { container, dropdownId, typeValues, typeSelected, pairIndex, isLeft } = props;
        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = typeValues.map((type) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: type as string,
                value: { pairIndex: pairIndex, type: type },
                isSelected: (typeSelected === type)
            };
            return menuItem;
        });
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems',
            setTitleFunc: ($elem, text) => { $elem.text(text); }
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            onSelectCallback: ({ pairIndex, type }) => {
                this._modifyColumnType(isLeft, pairIndex, type);
                this._updateUI();
            }
        });
        return componentDropdown;
    }

    private _updateJoinClauseUI() {
        const columnPairs = this._modelRef.joinColumnPairs;
        const columnMeta = this._modelRef.columnMeta;
        const nodeList = [];
        for (let i = 0; i < columnPairs.length; i++) {
            const { left: leftColIndex, right: rightColIndex, isCastNeed } = columnPairs[i];
            const clauseSection = this._templateMgr.createElements(JoinOpPanelStep1._templateIdClasue, {
                'onDelClick': columnPairs.length > 1
                    ? () => {
                        this._removeColumnPair(i);
                        this._updateUI();
                    }
                    : () => { },
                'delCss': columnPairs.length > 1 ? '' : 'removeIcon-nodel'
            });
            if (clauseSection == null || clauseSection.length > 1) {
                // This should never happend. Possibly caused by invalid template.
                console.error('JoinOpPanelStep1.updateUI: template error');
                continue;
            }
            const $clauseSection = $(clauseSection[0]);
            // Type cast row
            if (isCastNeed) {
                const $castContainer = BaseOpPanel.findXCElement($clauseSection, 'castRow');
                const castMsg = this._createCastMessage({
                    type1: columnMeta.left[leftColIndex].type,
                    type2: columnMeta.right[rightColIndex].type
                })
                const castRow = this._templateMgr.createElements(
                    JoinOpPanelStep1._templateIdCast,
                    { 'APP-ERRORMSG': castMsg }
                );
                for (const row of castRow) {
                    $castContainer.append(row);
                }
                // Left column type dropdown
                this._createTypeCastDropdown({
                    container: $castContainer,
                    dropdownId: 'leftCastDropdown',
                    typeValues: JoinOpPanelStep1._typeCastMenuValues.map((type) => type),
                    typeSelected: columnMeta.left[leftColIndex].type,
                    pairIndex: i,
                    isLeft: true,
                });
                // Right column type dropdown
                this._createTypeCastDropdown({
                    container: $castContainer,
                    dropdownId: 'rightCastDropdown',
                    typeValues: JoinOpPanelStep1._typeCastMenuValues.map((type) => type),
                    typeSelected: columnMeta.right[rightColIndex].type,
                    pairIndex: i,
                    isLeft: false,
                });
            }
            // left column dropdown
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'leftColDropdown',
                colNames: columnMeta.left.map((meta) => (meta.name)),
                colSelected: leftColIndex,
                pairIndex: i,
                isLeft: true,
            });
            // right column dropdown
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'rightColDropdown',
                colNames: columnMeta.right.map((meta) => (meta.name)),
                colSelected: rightColIndex,
                pairIndex: i,
                isLeft: false,
            });
            nodeList.push($clauseSection[0]);
        }
        const $clauseContainer = BaseOpPanel.findXCElement(this._$elem, 'clauseContainer');
        this._templateMgr.updateDOM($clauseContainer[0], nodeList);
    }

    private _createCastMessage(props: {
        type1: string, type2: string
    }) {
        const { type1, type2 } = props;
        const content = xcHelper.replaceMsg(
            JoinTStr.MismatchDetail,
            { type1: `<b>${type1}</b>`, type2: `<b>${type2}</b>` }
        );
        const $element = BaseOpPanel.createElementFromString(`<span>${content}</span>`);
        return $element[0];
    }

    private _createColumnDropdown(props: {
        container: JQuery;
        dropdownId: string;
        colNames: string[];
        colSelected: number;
        pairIndex: number;
        isLeft: boolean;
    }): OpPanelDropdown {
        const { container, dropdownId, colNames, colSelected, pairIndex, isLeft } = props;
        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = colNames.map((colName, index) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: colName,
                value: { pairIndex: pairIndex, colIndex: index },
                isSelected: (index === colSelected)
            };
            return menuItem;
        });
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems',
            setTitleFunc: ($elem, text) => { $elem.text(text); }
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            onSelectCallback: ({ pairIndex, colIndex }) => {
                this._modifyColumnPair(isLeft, pairIndex, colIndex);
                this._updateUI();
            }
        });
        return componentDropdown;
    }
    // Data model manipulation === start
    private _validateData() {
        if (this._isCrossJoin()) {
            if (!this._isValidEvalString()) {
                return false;
            }
        } else {
            if (this._modelRef.joinColumnPairs.length === 0) {
                return false;
            }
            for (const pair of this._modelRef.joinColumnPairs) {
                if (pair.isCastNeed) {
                    return false;
                }
                if (pair.left < 0 || pair.right < 0) {
                    return false;
                }
            }
        }

        return true;
    }

    private _isCrossJoin() {
        return this._modelRef.joinType === JoinOperatorTStr[JoinOperatorT.CrossJoin];
    }

    private _isValidEvalString() {
        const evalStr = this._modelRef.evalString;
        return evalStr.length > 0
            && evalStr.indexOf("(") >= 0
            && evalStr.indexOf(")") > 0;
    }

    private _changeJoinType(typeId: string): void {
        this._modelRef.joinType = typeId;
    }
    private _removeColumnPair(pairIndex: number): void {
        this._modelRef.removeColumnPair(pairIndex);
    }
    private _modifyColumnPair(isLeft: boolean, pairIndex: number, colIndex: number): void {
        const pairInfo = {
            left: isLeft ? colIndex : null,
            right: isLeft ? null : colIndex
        };
        this._modelRef.modifyColumnPair(pairIndex, pairInfo);
    }
    private _modifyColumnType(isLeft: boolean, pairIndex: number, type: ColumnType): void {
        const typeInfo = {
            left: (isLeft ? type : null) as ColumnType,
            right: isLeft ? null : type
        };
        this._modelRef.modifyColumnTypeByPair(pairIndex, typeInfo);
    }
    private _addColumnPair() {
        this._modelRef.addColumnPair();
    }
}