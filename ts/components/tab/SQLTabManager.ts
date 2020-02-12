class SQLTabManager extends AbstractTabManager {
    private static _instance: SQLTabManager;
    private _activeTabs: string[];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super("sqlTabView", "gSQLManagerKey");
        this._activeTabs = [];
    }

    /**
     * Public events that inherits from Parent:
     * SQLTabManager.Instance.setup
     *
     */

    /**
     * SQLTabManager.Instance.getNumTabs
     */
    public getNumTabs(): number {
        return this._activeTabs.length;
    }

    /**
     * SQLTabManager.Instance.newTab
     */
    public newTab(): void {
        const name: string = SQLSnippet.Instance.newSnippet(null);
        this.openTab(name);
    }

    /**
     * SQLTabManager.Instance.openTab
     * @param name
     */
    public openTab(name: string): void {
        const index: number = this._activeTabs.indexOf(name);
        if (index > -1) {
            this._switchTabs(index);
        } else {
            this._loadTab(name);
            this._save();
            this._switchTabs();
            this._updateList();
        }
    }

    /**
     * SQLTabManager.Instance.closeTab
     * @param name
     */
    public closeTab(name: string): void {
        const index: number = this._activeTabs.indexOf(name);
        if (index > -1) {
            this._deleteTabAction(index);
            this._tabListScroller.showOrHideScrollers();
        } 
    }

    /**
     * SQLTabManager.Instance.isOpen
     * @param name
     */
    public isOpen(name: string): boolean {
        return this._activeTabs.includes(name);
    }

    /**
     * @override
     * @param index
     */
    protected _switchTabs(index?: number): number {
        index = super._switchTabs(index);
        const name: string = this._activeTabs[index];
        SQLEditorSpace.Instance.openSnippet(name);
        return index;
    }

    protected _restoreTabs(): XDPromise<void> {
        const snippets = SQLSnippet.Instance.listSnippets();
        if (snippets.length === 0) {
            SQLTabManager.Instance.newTab();
            this._updateList();
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getKVStore().getAndParse()
        .then((restoreData: {tabs: string[]}) => {
            if (restoreData != null) {
                restoreData.tabs.forEach((tab) => {
                    this._loadTab(tab);
                });
                if (this._activeTabs.length) {
                    this._switchTabs(0);
                }
                this._updateList();
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    protected _deleteTabAction(index: number): void {
        const $tab: JQuery = this._getTabElByIndex(index);
        if ($tab.hasClass("active")) {
            // when this is the current active table
            if (index > 0) {
                this._switchTabs(index - 1);
            } else if (this.getNumTabs() > 1) {
                this._switchTabs(index + 1);
            }
        }
        this._activeTabs.splice(index, 1);
        this._save();

        $tab.remove();
        DagList.Instance.refreshMenuList(ResourceMenu.KEY.SQL);
    }

    protected _renameTabAction($input: JQuery): string {
        let newName: string = $input.text().trim();
        const $tabName: JQuery = $input.parent();
        const $tab: JQuery = $tabName.parent();
        const index: number = $tab.index();
        const oldName: string = this._activeTabs[index];

        if (newName != oldName &&
            this._tabRenameCheck(newName, $tabName)
        ) {
            this._activeTabs[index] = newName;
            SQLSnippet.Instance.renameSnippet(oldName, newName);
            this._save();
            this._updateList();
        } else {
            // Reset name if fail to rename
            newName = oldName;
        }
        return newName;
    }

    protected _startReorderTabAction(): void {};
    protected _stopReorderTabAction(previousIndex: number, newIndex: number): void {
        if (previousIndex !== newIndex) {
            // update activeUserDags order as well as dataflowArea
            const tab = this._activeTabs.splice(previousIndex, 1)[0];
            this._activeTabs.splice(newIndex, 0, tab);
            this._save();
        }
    } 

    protected _getJSON(): {tabs: string[]} {
        return {
            tabs: this._activeTabs
        };
    }

    protected _addEventListeners(): void {
        super._addEventListeners();

        this._getContainer().find(".addTab").click(() => {
            this.newTab();
        });
    }

    private _loadTab(name: string, index?: number): void {
        let tabIndex: number = null;
        if (index == null) {
            index = this.getNumTabs();
        } else {
            tabIndex = index;
        }
        this._activeTabs.splice(index, 0, name);
        this._addTabHTML(name, tabIndex);
    }

    private _addTabHTML(name: string, tabIndex?: number): void {
        name = xcStringHelper.escapeHTMLSpecialChar(name);
        let html: HTML =
            '<li class="tab">' +
                '<div class="dragArea">' +
                    '<i class="icon xi-ellipsis-v" ' + xcTooltip.Attrs + ' data-original-title="' + CommonTxtTstr.HoldToDrag+ '"></i>' +
                '</div>' +
                '<div class="name">' +
                    name +
                '</div>' +
                '<div class="after">' +
                    '<i class="icon xi-close-no-circle close" ' +
                    xcTooltip.Attrs +
                    ' data-original-title="' + AlertTStr.Close + '" ' +
                    '></i>' +
                    '<i class="icon xi-solid-circle dot"></i>' +
                '</div>' +
            '</li>';

        this._getTabArea().append(html);
        if (tabIndex != null) {
            // Put the tab and area where they should be
            const numTabs: number = this.getNumTabs();
            const $tabs = this._getTabsEle();
            let $newTab: JQuery = $tabs.eq(numTabs - 1);
            $newTab.insertBefore($tabs.eq(tabIndex));
        }
    }

    private _updateList(): void {
        DagList.Instance.refreshMenuList(ResourceMenu.KEY.SQL);
        const $view = $("#sqlViewContainer");
        if (this._activeTabs.length === 0) {
            $view.addClass("hint");
        } else {
            $view.removeClass("hint");
        }
        this._tabListScroller.showOrHideScrollers();
    }

    private _tabRenameCheck(name: string, $tab: JQuery): boolean {
        return xcHelper.validate([
            {
                $ele: $tab
            },
            {
                $ele: $tab,
                error: ErrTStr.DFNameIllegal,
                check: () => {
                    return !xcHelper.checkNamePattern(PatternCategory.Dataflow, PatternAction.Check, name);
                }
            },
            {
                $ele: $tab,
                error: "SQL with the same name already exists",
                check: () => {
                    return SQLSnippet.Instance.hasSnippet(name);
                }

            }
        ]);
    }
}