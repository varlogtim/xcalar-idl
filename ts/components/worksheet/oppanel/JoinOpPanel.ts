class JoinOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null;
    private _componentFirstStep: JoinOpPanelStep1 = null;
    private _componentSecondStep: JoinOpPanelStep2 = null;
    private _dataModel: JoinOpPanelModel = null;
    private _dagNode: DagNodeJoin = null;

    public setup(): void {
        this._$elemPanel = $('#joinOpPanel');
        this._componentFirstStep = new JoinOpPanelStep1({
            container: this._$elemPanel
        });
        this._componentSecondStep = new JoinOpPanelStep2({
            container: this._$elemPanel
        });

        super.setup(this._$elemPanel);
    }

    public show(
        dagNode: DagNodeJoin,
        options: { isNoCast?: boolean, exitCallback?: Function }
    ): void {
        if (!super.showPanel(null, options)) {
            return;
        }
        const { isNoCast = true } = (options || {});
        this._dagNode = dagNode;
        // Setup data model
        this._dataModel = JoinOpPanelModel.fromDag(dagNode, {
            currentStep: 1,
            isAdvMode: this._isAdvancedMode(),
            isNoCast: isNoCast
        });
        if (this._dataModel.getColumnPairsLength() === 0) {
            this._dataModel.addColumnPair();
        }

        // Update UI according to the data model
        this._updateUI();
    }

    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        this._dagNode = null;
        this._dataModel = null;
    }

    private _updateUI() {
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
            modelRef: this._dataModel,
            onDataChange: () => {
                this._updateUI();
            }
        });
        this._componentSecondStep.updateUI({
            modelRef: this._dataModel,
            onDataChange: () => {
                this._updateUI();
            }
        });
        this._updateUIBottomSection();
    }

    /**
     * Update the UI of bottom section
     * @description There are 3 variants:
     * 1. Step1: Next button, with adv switch
     * 2. Step2: Next & Back buttons, with adv switch
     * 3. AdvMode: Save button, with adv switch
     */
    private _updateUIBottomSection() {
        const findXCElement = BaseOpPanel.findXCElement;

        const $bottomSection = findXCElement(this._$elemPanel, 'bottomSection');
        const $bottomStep1 = findXCElement($bottomSection, 'step1');
        const $bottomStep2 = findXCElement($bottomSection, 'step2');
        const $bottomAdv = findXCElement($bottomSection, 'adv');
        if (this._dataModel.isAdvMode()) {
            $bottomStep1.hide();
            $bottomStep2.hide();
            $bottomAdv.show();
            $bottomAdv.off();
            $bottomAdv.on('click', () => {
                const $elemEditor = this._$elemPanel.find(".advancedEditor");
                try {
                    const model = this._convertAdvConfigToModel(this._dataModel);
                    this._validateStep1(model);
                    this._validateStep2(model);
                    this._submitForm(model);
                } catch(e) {
                    StatusBox.show(this._getErrorMessage(e), $elemEditor);
                    return false;
                }
            })
        } else {
            if (this._dataModel.getCurrentStep() === 1) {
                $bottomStep1.show();
                $bottomStep2.hide();
                $bottomAdv.hide();
                // Next step button
                const $elemNextStep = findXCElement($bottomStep1, 'btnNextStep');
                const isEnableNext = this._isEnableNext();
                $elemNextStep.off();
                if (isEnableNext) {
                    $elemNextStep.on('click', () => {
                        this._dataModel.setCurrentStep(2);
                        this._updateUI();
                    });
                }
                this._enableButton($elemNextStep, isEnableNext);
            } else {
                $bottomStep1.hide();
                $bottomStep2.show();
                $bottomAdv.hide();
                // Go back button
                const $elemBackBtn = findXCElement($bottomStep2, 'goBack');
                $elemBackBtn.off();
                $elemBackBtn.on('click', () => {
                    this._dataModel.setCurrentStep(1);
                    this._updateUI();
                });

                // Submit(Join Table) button
                const $elemJoinBtn = findXCElement($bottomStep2, 'joinTables');
                const isEnableJoin = this._isEnableSave();
                $elemJoinBtn.off();
                if (isEnableJoin) {
                    $elemJoinBtn.on('click', () => {
                        this._submitForm(this._dataModel);
                    });
                }
                this._enableButton($elemJoinBtn, isEnableJoin);
            }
        }
    }

    private _enableButton($btn: JQuery, isEnable: boolean) {
        if (isEnable) {
            $btn.removeClass('btn-disabled');
        } else {
            if (!$btn.hasClass('btn-disabled')) {
                $btn.addClass('btn-disabled');
            }
        }
    }

    private _submitForm(model: JoinOpPanelModel) {
        if (this._dagNode != null) {
            this._dagNode.setParam(
                xcHelper.deepCopy(model.toDag())
            );
            this.close(true);
        }
    }

    private _isEnableNext() {
        try {
            this._validateStep1(this._dataModel);
            return true;
        } catch(e) {
            return false;
        }
    }

    private _isEnableSave() {
        try {
            this._validateStep2(this._dataModel);
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        this._dataModel.setAdvMode(toAdvancedMode);
        if (toAdvancedMode) {
            const param: DagNodeJoinInput = this._dataModel.toDag();
            this._editor.setValue(JSON.stringify(param, null, 4));
            this._updateUI();
        } else {
            try {
                const newModel = this._convertAdvConfigToModel(this._dataModel);
                this._dataModel = newModel;
                this._updateUI();
            } catch (e) {
                return {error: this._getErrorMessage(e)};
            }
        }
        return null;
    }

    /**
     * Convert config string to data model, throw JoinOpError/JS exception if any errors
     */
    private _convertAdvConfigToModel(oldModel: JoinOpPanelModel) {
        const dagInput: DagNodeJoinInput = <DagNodeJoinInput>JSON.parse(this._editor.getValue());
        const {
            left: leftCols,
            right: rightCols
        } = JoinOpPanelModel.getColumnsFromDag(this._dagNode);
        const {
            left: leftTableName,
            right: rightTableName
        } = JoinOpPanelModel.getPreviewTableNamesFromDag(this._dagNode);
        const newModel = JoinOpPanelModel.fromDagInput(
            leftCols, rightCols, dagInput, leftTableName, rightTableName,
            {
                currentStep: oldModel.getCurrentStep(),
                isAdvMode: oldModel.isAdvMode(),
                isNoCast: oldModel.isNoCast(),
                isFixedType: oldModel.isFixedType()
            }
        );

        if (newModel.isFixedType()
            && newModel.getJoinType() !== oldModel.getJoinType()
        ) {
            // Cannot change sub category operator's join type
            throw new Error(JoinOpError.InvalidJoinType);
        }

        return newModel;
    }

    /**
     * Validate data model, and throw JoinOpError if any errors
     * @param dataModel
     */
    private _validateStep1(dataModel: JoinOpPanelModel): void {
        if (dataModel.isCrossJoin()) {
            if (!dataModel.isValidEvalString()) {
                throw new Error(JoinOpError.InvalidEvalString);
            }
        } else {
            if (dataModel.getColumnPairsLength() === 0) {
                throw new Error(JoinOpError.InvalidJoinClause);
            }
            for (const pair of dataModel.getColumnPairs()) {
                // if (this._dataModel.isColumnDetached(pair.leftName, true)) {
                //     return false;
                // }
                // if (this._dataModel.isColumnDetached(pair.rightName, false)) {
                //     return false;
                // }
                if (dataModel.isCastNeed(pair)) {
                    throw new Error(JoinOpError.NeedTypeCast);
                }
                if (pair.leftName.length === 0 || pair.rightName.length === 0) {
                    throw new Error(JoinOpError.InvalidJoinClause);
                }
            }
        }
    }

    /**
     * Validate data model, and throw JoinOpError if any errors
     * @param dataModel
     */
    private _validateStep2(dataModel: JoinOpPanelModel): void {
        const {
            columnLeft: columnCollisionLeft, prefixLeft: prefixCollisionLeft,
            columnRight: columnCollisionRight, prefixRight: prefixCollisionRight
        } = dataModel.getCollisionNames();

        if (columnCollisionLeft.size > 0 || columnCollisionRight.size > 0) {
            throw new Error(JoinOpError.ColumnNameConflict);
        }
        if (prefixCollisionLeft.size > 0 || prefixCollisionRight.size > 0) {
            throw new Error(JoinOpError.PrefixConflict);
        }
    }

    // XXX TODO: Add string in jsTStr
    private _getErrorMessage(e: Error): string {
        if (e == null || e.message == null) {
            return '';
        }
        switch (e.message) {
            case JoinOpError.ColumnTypeLenMismatch:
            case JoinOpError.InvalidJoinClause:
                return 'Invalid join clause';
            case JoinOpError.ColumnNameConflict:
                return 'Column name conflicts';
            case JoinOpError.InvalidEvalString:
                return 'Invalid eval string';
            case JoinOpError.NeedTypeCast:
                return 'Can not join columns with different type';
            case JoinOpError.PrefixConflict:
                return 'Prefix conflicts';
            case JoinOpError.InvalidJoinType:
                return 'Invalid join type';
            default:
                return e.message;
        }
    }
}