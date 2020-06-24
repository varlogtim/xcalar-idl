class SQLTabManager extends AbstractTabManager {
    private static _instance: SQLTabManager;
    private _activeTabs: string[];
    private _activeId: string;
    private _tempTabId: string;
    private _tabBeforeTemp: string;

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
    public newTab(name = null, focusName = false): string {
        const id: string = SQLSnippet.Instance.create(name);
        this.openTab(id);
        if (focusName) {
            const index = this._activeTabs.indexOf(id);
            const $tab: JQuery = this._getTabElByIndex(index);
            $tab.find(".dragArea").dblclick();
        }
        return id;
    }

    public newTempTab(name = null, statement = ""): string {
        this._tabBeforeTemp = this._activeId;
        const id: string = SQLSnippet.Instance.createTemp(name);
        this.openTab(id);
        SQLEditorSpace.Instance.newSQL(statement);
        this._tempTabId = id;
        this._getContainer().addClass("hasTempTab");
        ResourceMenu.Instance.toggleTempSQLTab(true);
        return id;
    }

    public closeTempTab() {
        const index: number = this._activeTabs.indexOf(this._tempTabId);
        this._deleteTabAction(index, this._tabBeforeTemp);
    }

    /**
     * SQLTabManager.Instance.openTab
     * @param id
     */
    public openTab(id: string): void {
        const index: number = this._activeTabs.indexOf(id);
        if (index > -1) {
            this._switchTabs(index);
        } else {
            this._loadTab(id);
            this._save();
            // Note: need to upate list to hide hintSection, show contentSection
            // first then open the codeMirror, otherwise the render will have issue
            this._updateList();
            this._switchTabs();
        }
        this._activeId = id;
    }

    /**
     * SQLTabManager.Instance.closeTab
     * @param id
     */
    public closeTab(id: string): void {
        const index: number = this._activeTabs.indexOf(id);
        if (index > -1) {
            this._deleteTabAction(index);
            this._tabListScroller.showOrHideScrollers();
        }
    }

    /**
     * SQLTabManager.Instance.isOpen
     * @param id
     */
    public isOpen(id: string): boolean {
        return this._activeTabs.includes(id);
    }

    /**
     * @override
     * @param index
     */
    protected _switchTabs(index?: number): number {
        index = super._switchTabs(index);
        const id: string = this._activeTabs[index];
        SQLEditorSpace.Instance.openSnippet(id);
        this._focusOnList(id);
        this._activeId = id;
        if (this._tempTabId && this._activeId !== this._tempTabId) {
            this._tabBeforeTemp = this._activeId;
        }
        return index;
    }

    protected _restoreTabs(): XDPromise<void> {
        const snippets = SQLSnippet.Instance.list();
        if (snippets.length === 0) {
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

    protected _deleteTabAction(index: number, idToSwitchTo?: string): void {
        const $tab: JQuery = this._getTabElByIndex(index);
        const id: string = this._activeTabs[index];
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj.temp) {
            SQLOpPanel.Instance.close(false, true);
            SQLSnippet.Instance.deleteTempTab(this._tempTabId);
            this._tempTabId = null;
            this._getContainer().removeClass("hasTempTab");
            this._tabListScroller.showOrHideScrollers();
            ResourceMenu.Instance.toggleTempSQLTab();
        }

        if ($tab.hasClass("active")) {
            // when this is the current active table
            if (idToSwitchTo && this._activeTabs.indexOf(idToSwitchTo) > -1) {
                const newIndex = this._activeTabs.indexOf(idToSwitchTo);
                this._switchTabs(newIndex);
            } else if (index > 0) {
                this._switchTabs(index - 1);
            } else if (this.getNumTabs() > 1) {
                this._switchTabs(index + 1);
            }

        }
        this._activeTabs.splice(index, 1);
        this._save();

        $tab.remove();
        this._updateList();
    }

    protected _deleteOtherTabsAction(index: number, rightOnly?: boolean): void {
        let start = rightOnly ? (index + 1) : 0;
        for (let i = start; i < this._activeTabs.length; i++) {
            if (i !== index) {
                const id: string = this._activeTabs[i];
                const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
                if (snippetObj.temp) {
                    SQLOpPanel.Instance.close(false, true);
                }

                this._activeTabs.splice(i, 1);
                const $tab: JQuery = this._getTabElByIndex(i);
                $tab.remove();
                if (i < index) {
                    index--;
                }
                i--;
            }
        }
        const $tab: JQuery = this._getTabElByIndex(index);
        if (!$tab.hasClass("active")) {
            this._switchTabs(index);
        }
        this._save();
        this._updateList();
    }

    protected _renameTabAction($input: JQuery): string {
        let newName: string = $input.text().trim();
        const $tabName: JQuery = $input.parent();
        const $tab: JQuery = $tabName.parent();
        const index: number = $tab.index();
        const id: string = this._activeTabs[index];
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        const oldName: string = snippetObj.name;
        if (newName != oldName &&
            this._tabRenameCheck(newName, $tabName)
        ) {
            SQLSnippet.Instance.rename(id, newName);
            this._save();
            this._updateList();
        }
        return this._getAppPath(snippetObj);
    }

    /**
     * @override
     * @param $tabName
     */
    protected _getEditingName($tabName: JQuery): string {
        const index: number = this._getTabIndexFromEl($tabName);
        const id = this._activeTabs[index];
        return SQLSnippet.Instance.getSnippetObj(id).name;
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

        this._getView().find(".hintSection .action").click(() => {
            this.newTab();
        });
    }

    private _getView(): JQuery {
        return $("#sqlViewContainer");
    }

    private _loadTab(id: string, index?: number): void {
        let tabIndex: number = null;
        if (index == null) {
            index = this.getNumTabs();
        } else {
            tabIndex = index;
        }
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj != null) {
            this._activeTabs.splice(index, 0, id);
            this._addTabHTML(snippetObj, tabIndex);
        }
    }

    private _addTabHTML(snippetObj: SQLSnippetDurable, tabIndex?: number): void {
        let liClass = "";
        if (snippetObj.temp) {
            liClass += " tempTab";
        }
        const name: string = this._getAppPath(snippetObj);
        const html: HTML =
            '<li class="tab tooltipOverflow ' + liClass + '"' +
            ' data-id="${snippetObj.id}"' +
            xcTooltip.Attrs +
            ' data-title="' + name + '"' +
            '>' +
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
        ResourceMenu.Instance.render(ResourceMenu.KEY.SQL);
        const $view = this._getView();
        if (this._activeTabs.length === 0) {
            $view.addClass("hint");
            $("#sqlEditorSpace").removeClass("hasTempTab");
        } else {
            $view.removeClass("hint");
        }
        this._tabListScroller.showOrHideScrollers();
    }

    private _validateTabName(name: string): string | null {
        if (!xcHelper.checkNamePattern(PatternCategory.Dataflow, PatternAction.Check, name)) {
            return ErrTStr.DFNameIllegal;
        } else if (SQLSnippet.Instance.hasSnippet(name)) {
            return "SQL with the same name already exists";
        } else {
            return null;
        }
    }

    private _tabRenameCheck(name: string, $tab: JQuery): boolean {
        const error: string | null = this._validateTabName(name);
        return xcHelper.validate([
            {
                $ele: $tab
            },
            {
                $ele: $tab,
                error: error,
                check: () => {
                    return error != null;
                }
            }
        ]);
    }

    private _getAppPath(snippetObj: SQLSnippetDurable): string {
        return SQLSnippet.getAppPath(snippetObj);
    }

    private _focusOnList(id): void {
        const $list: JQuery = ResourceMenu.Instance.getContainer().find(".sqlList");
        const $li: JQuery = $list.find('li[data-id="' + id + '"]');
        if ($li.length) {
            $list.find("li.active").removeClass("active");
            $li.addClass("active");
            ResourceMenu.Instance.focusOnList($li);
        }
    }
}