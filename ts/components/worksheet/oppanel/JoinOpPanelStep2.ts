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
        if (this._modelRef.getCurrentStep() !== 2) {
            this._$elem.hide();
            return;
        }
        this._$elem.show();

        const findXCElement = BaseOpPanel.findXCElement;

        // Prefixed columns rename
        const elemPrefixContainer = findXCElement(this._$elem, 'prefixRename')[0];
        const prefixLeftList = this._modelRef.getRenames({
            isPrefix: true, isLeft: true
        });
        const prefixRightList = this._modelRef.getRenames({
            isPrefix: true, isLeft: false
        });
        let prefixSection = [];
        if (prefixLeftList.length > 0 || prefixRightList.length > 0) {
            prefixSection = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIdRenameSection,
                {
                    'renameHeader': 'Prefixes',
                    'APP-LEFTRENAME': this._createRenameTable({
                        isLeft: true, isPrefix: true,
                        renameInfoList: prefixLeftList
                    }),
                    'APP-RIGHTRENAME': this._createRenameTable({
                        isLeft: false, isPrefix: true,
                        renameInfoList: prefixRightList
                    })
                }
            );
        }
        this._templateMgr.updateDOM(elemPrefixContainer, prefixSection);

        // Derived columns rename
        const elemDerivedContainer = findXCElement(this._$elem, 'derivedRename')[0];
        const derivedLeftList = this._modelRef.getRenames({
            isLeft: true, isPrefix: false
        });
        const derivedRightList = this._modelRef.getRenames({
            isLeft: false, isPrefix: false
        });
        let derivedSection = [];
        if (derivedLeftList.length > 0 || derivedRightList.length > 0) {
            derivedSection = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIdRenameSection,
                {
                    'renameHeader': 'Derived Fields',
                    'APP-LEFTRENAME': this._createRenameTable({
                        isLeft: true, isPrefix: false,
                        renameInfoList: derivedLeftList
                    }),
                    'APP-RIGHTRENAME': this._createRenameTable({
                        isLeft: false, isPrefix: false,
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
        isLeft: boolean,
        isPrefix: boolean,
        renameInfoList: JoinOpRenameInfo[] // !!! Items in list are references !!!
    }) {
        const { isLeft, renameInfoList, isPrefix } = props;

        if (renameInfoList == null || renameInfoList.length === 0) {
            return [];
        }

        // Create rename rows
        const nodeRowList: NodeDefDOMElement[] = [];
        for (const renameInfo of renameInfoList) {
            const isDetached = isPrefix
                ? (this._modelRef.isPrefixDetached(renameInfo.source, isLeft))
                : (this._modelRef.isColumnDetached(renameInfo.source, isLeft));

                const renameRow = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIdRenameRow,
                {
                    oldName: renameInfo.source,
                    newName: renameInfo.dest,
                    colErrCss: isDetached ? 'text-detach' : '',
                    onClickRename: () => {
                        this._autoRenameColumn(renameInfo, renameInfo.source, isLeft);
                        this._updateUI();
                    },
                    onNameChange: (e) => {
                        this._renameColumn(renameInfo, e.target.value.trim());
                        this._updateUI();
                    }
                }
            );

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

    // Data model manipulation === start
    private _renameColumn(renameInfo: JoinOpRenameInfo, newName: string) {
        renameInfo.dest = newName;
    }

    private _validateData(): boolean {
        const {
            column: columnCollision, prefix: prefixCollision
        } = this._modelRef.getCollisionNames();

        if (columnCollision.size > 0 || prefixCollision.size > 0) {
            return false;
        }

        return true;
    }

    private _autoRenameColumn(
        renameInfo: JoinOpRenameInfo, orignName: string, isLeft: boolean
    ) {

        const nameMap = {};
        const {
            left: leftNames, right: rightNames
        } = this._modelRef.getResolvedNames(renameInfo.isPrefix);
        if (isLeft) {
            removeName(leftNames, orignName);
        } else {
            removeName(rightNames, orignName);
        }
        const nameList = leftNames.concat(rightNames);
        for (const name of nameList) {
            nameMap[name.dest] = true;
        }

        const newName = xcHelper.autoName(orignName, nameMap, Object.keys(nameMap).length);
        renameInfo.dest = newName;

        function removeName(list, name) {
            for (let i = 0; i < list.length; i ++) {
                if (list[i].source === name) {
                    list.splice(i, 1);
                    return;
                }
            }
        }
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
    // Data model manipulation === end
}