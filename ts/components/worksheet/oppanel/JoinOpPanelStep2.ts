class JoinOpPanelStep2 {
    private _$elem: JQuery = null;
    private _modelRef: JoinOpPanelModel = null;
    private _goPrevStep: () => void = () => {};
    private _submitDataFunc: () => void;
    private _templateMgr = new OpPanelTemplateManager();
    private static readonly _templateIdRenameRow = 'templateRenameRow';
    private static readonly _templateIdRenameTable = 'templateRename';
    private static readonly _templateIdRenameSection = 'templateRenameSection';

    public constructor(props: {
        container: JQuery,
        goPrevStepFunc: () => void,
        submitDataFunc: () => void
    }) {
        const { container, goPrevStepFunc = ()=>{}, submitDataFunc = ()=>{} } = props;
        this._$elem = BaseOpPanel.findXCElement(container, 'joinSecondStep');
        this._goPrevStep = goPrevStepFunc;
        this._submitDataFunc = submitDataFunc;
        this._templateMgr.loadTemplate(JoinOpPanelStep2._templateIdRenameTable, this._$elem);
        this._templateMgr.loadTemplate(JoinOpPanelStep2._templateIdRenameRow, this._$elem);
        this._templateMgr.loadTemplate(JoinOpPanelStep2._templateIdRenameSection, this._$elem);
    }

    public updateUI(props: {
        modelRef: JoinOpPanelModel,
    }): void {
        const { modelRef } = props;
        this._modelRef = modelRef;
        this._updateUI();
    }

    private _updateUI() {
        if (this._modelRef.currentStep !== 2) {
            this._$elem.hide();
            return;
        }
        this._$elem.show();

        const findXCElement = BaseOpPanel.findXCElement;

        // Prefixed columns rename
        const elemPrefixContainer = findXCElement(this._$elem, 'prefixRename')[0];
        const prefixLeftList = this._modelRef.columnRename.left.filter( (v) => (v.isPrefix));
        const prefixRightList = this._modelRef.columnRename.right.filter( (v) => (v.isPrefix));
        let prefixSection = [];
        if (prefixLeftList.length > 0 || prefixRightList.length > 0) {
            prefixSection = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIdRenameSection,
                {
                    'renameHeader': 'Prefixes',
                    'APP-LEFTRENAME': this._createRenameTable({
                        isLeft: true,
                        renameInfoList: prefixLeftList
                    }),
                    'APP-RIGHTRENAME': this._createRenameTable({
                        isLeft: false,
                        renameInfoList: prefixRightList
                    })
                }
            );
        }
        this._templateMgr.updateDOM(elemPrefixContainer, prefixSection);

        // Derived columns rename
        const elemDerivedContainer = findXCElement(this._$elem, 'derivedRename')[0];
        const derivedLeftList = this._modelRef.columnRename.left.filter( (v) => (!v.isPrefix) );
        const derivedRightList = this._modelRef.columnRename.right.filter( (v) => (!v.isPrefix));
        let derivedSection = [];
        if (derivedLeftList.length > 0 || derivedRightList.length > 0) {
            derivedSection = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIdRenameSection,
                {
                    'renameHeader': 'Derived Fields',
                    'APP-LEFTRENAME': this._createRenameTable({
                        isLeft: true,
                        renameInfoList: derivedLeftList
                    }),
                    'APP-RIGHTRENAME': this._createRenameTable({
                        isLeft: false,
                        renameInfoList: derivedRightList
                    })
                }
            )
        }
        this._templateMgr.updateDOM(elemDerivedContainer, derivedSection);

        // Go back button
        const $elemBackBtn = findXCElement(this._$elem, 'goBack');
        $elemBackBtn.off();
        $elemBackBtn.on('click', () => {
            this._goPrevStep();
        })

        // Submit(Join Table) button
        const $elemJoinBtn = findXCElement(this._$elem, 'joinTables');
        $elemJoinBtn.off();
        if (this._validateData()) {
            $elemJoinBtn.removeClass('btn-disabled');
            $elemJoinBtn.on('click', () => {
                this._submitDataFunc();
            });
        } else {
            if (!$elemJoinBtn.hasClass('btn-disabled')) {
                $elemJoinBtn.addClass('btn-disabled');
            }
        }
    }

    private _setupBatchRename($container: JQuery, isLeft: boolean, isPrefix: boolean): void {
        $container.find(".menu").each(function() {
            xcMenu.add($(this), {"keepOpen": true});
        });

        $container.off('click', '.option');
        $container.on("click", ".option", function(event) {
            var $target = $(event.target);
            var $menu = $target.closest(".optionWrap").find(".menu");
            $menu.find("input").val("");

            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": 0, "y": -71},
                "floating": true
            });
            return false;
        });
        $container.on("click", ".copyAll", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._batchRename({ isLeft: isLeft, isPrefix: isPrefix });
            this._updateUI();
        });

        $container.on("click", ".copyAppend", function(event) {
            if (event.which !== 1) {
                return;
            }
            $(this).find("input").focus();
        });

        $container.on("input", ".copyAppend input", (event) => {
            const suffix = $(event.target).val();
            this._batchRename({ isLeft: isLeft, isPrefix: isPrefix, suffix: suffix});
            this._updateUI();
        });
    }

    private _createRenameTable(props: {
        isLeft: boolean
        renameInfoList: JoinOpRenameInfo[] // !!! Items in list are references !!!
    }) {
        const { isLeft, renameInfoList } = props;

        if (renameInfoList == null || renameInfoList.length === 0) {
            return [];
        }
        const isPrefix = renameInfoList[0].isPrefix;

        // Create rename rows
        const nodeRowList: NodeDefDOMElement[] = [];
        for (const renameInfo of renameInfoList) {
            const renameRow = this._createRenameRow({
                oldName: this._modelRef.getRenameMetaName({
                    renameInfo: renameInfo,
                    isLeft: isLeft
                }),
                newName: renameInfo.dest,
                onClickRename: (name) => {
                    this._autoRenameColumn(renameInfo, name, isLeft);
                    this._updateUI();
                },
                onNameChange: (newName) => {
                    this._renameColumn(renameInfo, newName.trim());
                    this._updateUI();
                }
            });
            for (const row of renameRow) {
                nodeRowList.push(row);
            }
        }

        // Create rename table
        const nodeTable = this._templateMgr.createElements(
            JoinOpPanelStep2._templateIdRenameTable,
            {
                'oldColTitle': isLeft? 'Left Table': 'Right Table',
                'newColTitle': 'New Name',
                'APP-RENAME_TABLE': nodeRowList, 
            }
        )

        // Setup batch rename
        this._setupBatchRename($(nodeTable[0]), isLeft, isPrefix);
        return nodeTable;
    }

    private _createRenameRow(props: {
        oldName: string,
        newName: string,
        onClickRename: (name: string) => void,
        onNameChange: (name: string) => void,
    }) {
        const { oldName, newName, onClickRename, onNameChange } = props;

        return this._templateMgr.createElements(
            JoinOpPanelStep2._templateIdRenameRow,
            {
                oldName: oldName,
                newName: newName,
                onClickRename: () => {
                    onClickRename(oldName);
                },
                onNameChange: (e) => {
                    onNameChange(e.target.value.trim());
                }
            }
        );
    }

    private _renameColumn(renameInfo: JoinOpRenameInfo, newName: string) {
        renameInfo.dest = newName;
    }

    private _validateData(): boolean {
        return true;
    }

    private _autoRenameColumn(
        renameInfo: JoinOpRenameInfo, orignName: string, isLeft: boolean
    ) {
        const {
            leftColumns, leftPrefixes, rightColumns, rightPrefixes
        } = this._modelRef.getResolvedNames();

        const nameMap = {};
        if (renameInfo.isPrefix) {
            if (isLeft) {
                leftPrefixes.splice(renameInfo.source, 1);
            } else {
                rightPrefixes.splice(renameInfo.source, 1);
            }
            const prefixList = leftPrefixes.concat(rightPrefixes);
            for (const prefix of prefixList) {
                nameMap[prefix] = true;
            }
        } else {
            if (isLeft) {
                leftColumns.splice(renameInfo.source, 1);
            } else {
                rightColumns.splice(renameInfo.source, 1);
            }
            const columnList = leftColumns.concat(rightColumns);
            for (const col of columnList) {
                if (!col.isPrefix) {
                    nameMap[col.name] = true;
                }
            }
        }

        const newName = xcHelper.autoName(orignName, nameMap, Object.keys(nameMap).length);
        renameInfo.dest = newName;
    }

    private _batchRename(options: {
        isLeft: boolean, isPrefix: boolean, suffix?: string
    }) {
        const { isLeft, isPrefix, suffix } = options;
        this._modelRef.batchRename({
            isLeft: isLeft,
            isPrefix: isPrefix,
            suffix: suffix
        });
    }
}