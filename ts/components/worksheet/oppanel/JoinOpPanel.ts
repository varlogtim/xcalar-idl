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

    public show(dagNode: DagNodeJoin): void {
        this._reset();
        this._dagNode = dagNode;
        // Setup data model
        this._dataModel = JoinOpPanelModel.fromDag(dagNode);
        if (this._dataModel.getColumnPairsLength() === 0) {
            this._dataModel.addColumnPair();
        }
        this._dataModel.setCurrentStep(1);
        this._dataModel.setAdvMode(this._isAdvancedMode());

        // Update UI according to the data model
        this._updateUI();

        // Show panel
        super.showPanel();
    }

    public close(): void {
        super.hidePanel();
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
                    const model = this._convertAdvConfigToModel();
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
            this.close();
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
        if (toAdvancedMode) {
            const param: DagNodeJoinInput = this._dataModel.toDag();
            this._editor.setValue(JSON.stringify(param, null, 4));
            this._dataModel.setAdvMode(true);
            this._updateUI();
        } else {
            try {
                const newModel = this._convertAdvConfigToModel();
                newModel.setCurrentStep(this._dataModel.getCurrentStep());
                newModel.setAdvMode(false);
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
    private _convertAdvConfigToModel() {
        const dagInput: DagNodeJoinInput = <DagNodeJoinInput>JSON.parse(this._editor.getValue());
        const {
            left: leftCols,
            right: rightCols
        } = JoinOpPanelModel.getColumnsFromDag(this._dagNode);
        const {
            left: leftTableName,
            right: rightTableName
        } = JoinOpPanelModel.getPreviewTableNamesFromDag(this._dagNode);
        return JoinOpPanelModel.fromDagInput(
            leftCols, rightCols, dagInput, leftTableName, rightTableName
        );
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
            column: columnCollision, prefix: prefixCollision
        } = dataModel.getCollisionNames();

        if (columnCollision.size > 0) {
            throw new Error(JoinOpError.ColumnNameConflict);
        }
        if (prefixCollision.size > 0) {
            throw new Error(JoinOpError.PrefixConflict);
        }
    }

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
            default:
                return e.message;
        }
    }
}