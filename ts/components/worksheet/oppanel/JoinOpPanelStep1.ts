class JoinOpPanelStep1 {
    private _templateMgr = new OpPanelTemplateManager();
    private _$elem: JQuery = null;
    private _onDataChange = () => {};
    private static readonly _templateIdClasue = 'templateClause';
    private static readonly _templateIdCast = 'templateCast';
    private _$elemInstr: JQuery = null;
    private _$elemPreview: JQuery = null;
    private _componentJoinTypeDropdown: OpPanelDropdown = null;
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
        container: JQuery
    }) {
        const { container } = props;
        this._$elem = BaseOpPanel.findXCElement(container, 'joinFirstStep');
        this._$elemInstr = BaseOpPanel.findXCElement(this._$elem, 'colInstruction');
        this._$elemPreview = BaseOpPanel.findXCElement(this._$elem, 'joinPreview');
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
        modelRef: JoinOpPanelModel,
        onDataChange: () => void
    }): void {
        const { modelRef, onDataChange } = props;
        this._modelRef = modelRef;
        this._onDataChange = onDataChange;
        this._updateUI();
    }

    private _updateUI(): void {
        const joinType = this._modelRef.getJoinType();
        if (this._modelRef.getCurrentStep() !== 1 || this._modelRef.isAdvMode()) {
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
                this._onDataChange();
            }
        });
        // Setup instruction section
        let text = JoinTStr.DagColSelectInstr;
        if (this._modelRef.isCrossJoin()) {
            text = JoinTStr.DagColSelectInstrCross;
        }
        this._$elemInstr.text(text);
        // Setup main section
        const $elemClauseArea = BaseOpPanel.findXCElement(this._$elem, 'clauseArea');
        const $elemCrossJoinFilter = BaseOpPanel.findXCElement(this._$elem, 'crossJoinFilter');
        if (this._modelRef.isCrossJoin()) {
            $elemClauseArea.hide();
            $elemCrossJoinFilter.show();
            // Setup crossJoinFilter section
            const $elemEvalString = BaseOpPanel.findXCElement($elemCrossJoinFilter, 'evalStr');
            $elemEvalString.val(this._modelRef.getEvalString());
            $elemEvalString.off();
            $elemEvalString.on('input', (e) => {
                this._modelRef.setEvalString($(e.target).val().trim());
                this._onDataChange();
            });
            if (!this._modelRef.isValidEvalString()) {
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
        if (this._isEnableAddClause()) {
            $elemAddClause.on('click', () => {
                this._addColumnPair();
                this._onDataChange();
            });
            $elemAddClause.removeClass('btn-disabled');
        } else {
            if (!$elemAddClause.hasClass('btn-disabled')) {
                $elemAddClause.addClass('btn-disabled');
            }
        }
        // Command Preview section
        this._updatePreview();
    }

    private _updatePreview() {
        let html;
        const htmlJoinType = `<span class="joinType keyword">${this._getJoinTypeText(this._modelRef.getJoinType())}</span>`;
        const htmlTables = ' <span class="highlighted">table1</span>,<span class="highlighted">table2</span>';

        if (this._modelRef.isCrossJoin()) {
            const htmlWhere = '<br/><span class="keyword">WHERE </span>';
            const htmlClause = xcHelper.escapeHTMLSpecialChar(this._modelRef.getEvalString());
            html = `${htmlJoinType}${htmlTables}${htmlWhere}${htmlClause}`;
        } else {
            const emptyColumn = '""';
            const htmlOn = '<br/><span class="keyword">ON </span>';
            const htmlClause = this._modelRef.getColumnPairs().reduce( (res, pair, i) => {
                const col1 = xcHelper.escapeHTMLSpecialChar(
                    pair.leftName.length == 0
                        ? emptyColumn
                        : pair.leftName
                );
                const col2 = xcHelper.escapeHTMLSpecialChar(
                    pair.rightName.length == 0
                        ? emptyColumn
                        : pair.rightName
                );
                const pre = (i > 0) ? '<span class="keyword"><br/>AND </span>' : '';
                const cols = `<span class="highlighted">${col1}</span> = 
                    <span class="highlighted">${col2}</span>`;
                return `${res}${pre}${cols}`;
            }, '');
            html = `${htmlJoinType}${htmlTables}${htmlOn}${htmlClause}`;
        }

        this._$elemPreview.html(html);
    }

    private _updateJoinClauseUI() {
        const columnPairs = this._modelRef.getColumnPairs();
        const nodeList = [];
        for (let i = 0; i < columnPairs.length; i++) {
            const columnPair = columnPairs[i];
            const { leftName, leftCast, rightName, rightCast } = columnPair;
            const isLeftDetached = this._modelRef.isColumnDetached(leftName, true);
            const isRightDetached = this._modelRef.isColumnDetached(rightName, false);
            const clauseSection = this._templateMgr.createElements(JoinOpPanelStep1._templateIdClasue, {
                'onDelClick': columnPairs.length > 1
                    ? () => {
                        this._removeColumnPair(i);
                        this._onDataChange();
                    }
                    : () => {},
                'delCss': columnPairs.length > 1 ? '' : 'removeIcon-nodel',
                'leftColErrCss': (isLeftDetached ? 'dropdown-detach' : ''),
                'rightColErrCss': (isRightDetached ? 'dropdown-detach' : '')
            });
            if (clauseSection == null || clauseSection.length > 1) {
                // This should never happend. Possibly caused by invalid template.
                console.error('JoinOpPanelStep1.updateUI: template error');
                continue;
            }
            const $clauseSection = $(clauseSection[0]);
            // Type cast row
            if (this._modelRef.isCastNeed(columnPair)) {
                const $castContainer = BaseOpPanel.findXCElement($clauseSection, 'castRow');
                const castMsg = this._createCastMessage({
                    type1: leftCast,
                    type2: rightCast
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
                    typeSelected: leftCast,
                    pairIndex: i,
                    isLeft: true,
                });
                // Right column type dropdown
                this._createTypeCastDropdown({
                    container: $castContainer,
                    dropdownId: 'rightCastDropdown',
                    typeValues: JoinOpPanelStep1._typeCastMenuValues.map((type) => type),
                    typeSelected: rightCast,
                    pairIndex: i,
                    isLeft: false,
                });
            }

            const {
                left: leftColsToShow,
                right: rightColsToShow
            } = this._getColumnsToShow(i);
            const {
                left: leftTableName,
                right: rightTableName
            } = this._modelRef.getPreviewTableNames();
            // left column dropdown
            const leftCols = isLeftDetached ? [] : leftColsToShow;
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'leftColDropdown',
                colNames: leftCols,
                colSelected: leftName,
                pairIndex: i,
                isLeft: true,
                smartSuggestParam: {
                    srcColumnName: rightName,
                    srcTableName: rightTableName,
                    suggestTableName: leftTableName
                }
            });
            // right column dropdown
            const rightCols = isRightDetached ? [] : rightColsToShow;
            this._createColumnDropdown({
                container: $clauseSection,
                dropdownId: 'rightColDropdown',
                colNames: rightCols,
                colSelected: rightName,
                pairIndex: i,
                isLeft: false,
                smartSuggestParam: {
                    srcColumnName: leftName,
                    srcTableName: leftTableName,
                    suggestTableName: rightTableName
                }
            });
            nodeList.push($clauseSection[0]);
        }
        const $clauseContainer = BaseOpPanel.findXCElement(this._$elem, 'clauseContainer');
        this._templateMgr.updateDOM($clauseContainer[0], nodeList);
    }

    private _getJoinTypeText(type: string) {
        switch(type) {
            case JoinOperatorTStr[JoinOperatorT.InnerJoin]:
                return JoinTStr.joinTypeInner;
            case JoinOperatorTStr[JoinOperatorT.LeftOuterJoin]:
                return JoinTStr.joinTypeLeft;
            case JoinOperatorTStr[JoinOperatorT.RightOuterJoin]:
                return JoinTStr.joinTypeRight;
            case JoinCompoundOperatorTStr.LeftSemiJoin:
                return JoinTStr.joinTypeLeftSemi;
            case JoinCompoundOperatorTStr.LeftAntiSemiJoin:
                return JoinTStr.joinTypeLeftAnti;
            case JoinOperatorTStr[JoinOperatorT.CrossJoin]:
                return JoinTStr.joinTypeCross;
            default:
                return '';
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
                this._onDataChange();
            }
        });
        return componentDropdown;
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
        container: JQuery,
        dropdownId: string,
        colNames: string[],
        colSelected: string,
        pairIndex: number,
        isLeft: boolean,
        smartSuggestParam: {
            srcColumnName: string, srcTableName: string, suggestTableName: string
        }
    }): OpPanelDropdown {
        const {
            container, dropdownId, colNames, colSelected,
            pairIndex, isLeft, smartSuggestParam
        } = props;
        const { srcColumnName, srcTableName, suggestTableName } = smartSuggestParam;
        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = colNames.map((colName) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: colName,
                value: { pairIndex: pairIndex, colName: colName },
                isSelected: (colName === colSelected)
            };
            return menuItem;
        });
        if ( srcColumnName != null && srcColumnName.length > 0
            && srcTableName != null && srcTableName.length > 0
            && suggestTableName != null && suggestTableName.length > 0
            && this._isTalbeExist(srcTableName) && this._isTalbeExist(suggestTableName)
        ) {
            menuItems.unshift({
                text: 'Smart Suggest',
                value: { pairIndex: pairIndex, isSmartSugg: true },
            });
        }
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems',
            setTitleFunc: ($elem, text) => { $elem.text(text); }
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            defaultText: colSelected,
            onSelectCallback: ({ pairIndex, colName, isSmartSugg }) => {
                if (isSmartSugg) {
                    const suggestInput = this._getSmartSuggestInput({
                        srcColumnName: srcColumnName,
                        srcTableName: srcTableName,
                        suggestTableName: suggestTableName,
                        candidateColumnNames: colNames
                    });
                    if (suggestInput != null) {
                        const suggestion = xcSuggest.suggestJoinKey(suggestInput);
                        if (suggestion != null && suggestion.colToSugg != null) {
                            this._modifyColumnPair(isLeft, pairIndex, suggestion.colToSugg);
                        }
                    }
                } else {
                    this._modifyColumnPair(isLeft, pairIndex, colName);
                }
                this._updateUI();
            }
        });
        return componentDropdown;
    }

    private _isEnableAddClause(): boolean {
        const joinClauseLen = this._modelRef.getColumnPairs().length;
        const colLen = Math.min(
            this._modelRef.getColumnMetaLeft().length,
            this._modelRef.getColumnMetaRight().length
        );
        return joinClauseLen < colLen;
    }

    private _isTalbeExist(tableName: string) {
        return gTables[xcHelper.getTableId(tableName)] != null;
    }

    private _getSmartSuggestInput(props: {
        srcColumnName: string,
        srcTableName: string,
        suggestTableName: string,
        candidateColumnNames: string[]
    }): xcSuggest.ColInput {
        try {
            const {
                srcColumnName, srcTableName, suggestTableName, candidateColumnNames
            } = props;
            const candidateMap = {};
            for (const name of candidateColumnNames) {
                candidateMap[name] = true;
            }
            // Source info
            const srcTable = getTable(srcTableName);
            const srcInfo = getColumnInfo(srcTable, srcColumnName);
            // Suggest(Dest) Info
            const destInfo = [];
            const suggTable = getTable(suggestTableName);
            for (const col of suggTable.getAllCols()) {
                const colName = col.getBackColName();
                if (!col.isDATACol() && candidateMap[colName] != null) {
                    destInfo.push(getColumnInfo(suggTable, col.getBackColName()));
                }
            }
            
            return {
                srcColInfo: srcInfo,
                destColsInfo: destInfo
            };
        } catch {
            return null;
        }

        function getTable(tableName) {
            return gTables[xcHelper.getTableId(tableName)];
        }

        function getColumnInfo(table, columnName): xcSuggest.ColInfo {
            const colInfo = table.getColByBackName(columnName);
            const colId = table.getColNumByBackName(columnName);
            const colData = table.getColContents(colId);
            return {
                type: colInfo.getType(),
                length: colData.length,
                name: colInfo.getFrontColName(),
                data: colData,
                uniqueIdentifier: columnName,
                tableId: table.getId()
            };
        }
    }

    // Data model manipulation === start
    private _changeJoinType(typeId: string): void {
        this._modelRef.setJoinType(typeId);
    }
    private _removeColumnPair(pairIndex: number): void {
        this._modelRef.removeColumnPair(pairIndex);
    }
    private _modifyColumnPair(isLeft: boolean, pairIndex: number, colName: string): void {
        const pairInfo = {
            left: isLeft ? colName : null,
            right: isLeft ? null : colName
        };
        this._modelRef.modifyColumnPairName(pairIndex, pairInfo);
    }
    private _modifyColumnType(isLeft: boolean, pairIndex: number, type: ColumnType): void {
        const typeInfo = {
            left: isLeft ? type : null,
            right: isLeft ? null : type
        };
        this._modelRef.modifyColumnPairCast(pairIndex, typeInfo);
    }
    private _addColumnPair() {
        this._modelRef.addColumnPair();
    }

    private _getColumnsToShow(currentPairIndex: number) {
        const pairs = this._modelRef.getColumnPairs();
        pairs.splice(currentPairIndex, 1);
        const leftExclude = {};
        const rightExclude = {};
        for (const {leftName, rightName} of pairs) {
            leftExclude[leftName] = true;
            rightExclude[rightName] = true;
        }

        const leftCols: string[] = [];
        for (const col of this._modelRef.getColumnMetaLeft()) {
            const name = col.name;
            if (!leftExclude[name]) {
                leftCols.push(name);
            }
        }
        const rightCols: string[] = [];
        for (const col of this._modelRef.getColumnMetaRight()) {
            const name = col.name;
            if (!rightExclude[name]) {
                rightCols.push(name);
            }
        }

        return {
            left: leftCols, right: rightCols
        };
    }
    // Data model manipulation === end
}