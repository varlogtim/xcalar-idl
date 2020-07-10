enum TableTabType {
    SQL = "SQL",
    PbTable = "PbTable",
    ResultSet = "ResultSet",
    SQLHistory = "SQLHistory",
    Preview = "Preview"
}

class TableTabManager extends AbstractTabManager {
    public static SQLTab = "SQL Result";

    private static _instance: TableTabManager;
    private _activeTabs: {name: string, type: TableTabType, meta?: any}[];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super("tableTabView", "gTableManagerKey");
        this._activeTabs = [];
    }

    /**
     * Public events that inherits from Parent:
     * TableTabManager.Instance.setup
     *
     */

    /**
     * TableTabManager.Instance.getNumTabs
     */
    public getNumTabs(): number {
        return this._activeTabs.length;
    }

    /**
     * TableTabManager.Instance.openTab
     * @param name
     */
    public async openTab(
        name: string,
        type: TableTabType,
        meta?: any,
        displayName?: string
    ): Promise<void> {
        if (this._belongToSQLTab(type, meta)) {
            const sqlTab = this._getSQLTab();
            name = sqlTab.name;
            type = sqlTab.type;
        }
        const index: number = this._getTabIndexByName(name);
        if (index > -1) {
            if (type === TableTabType.SQL) {
                this._activeTabs[index].meta = meta;
            }
            await this._switchResult(index);
        } else {
            const tab = {
                name,
                type,
                meta,
                displayName: displayName || name
            };
            this._loadTab(tab);
            this._save();
            this._updateList();
            await this._switchResult();
        }
    }

    /**
     * TableTabManager.Instance.openSQLTab
     */
    public async openSQLTab(): Promise<void> {
        const sqlTab = this._getSQLTab();
        return this.openTab(sqlTab.name, sqlTab.type);
    }

    /**
     * TableTabManager.Instance.refershTab
     */
    public refershTab(): void {
        const index: number = this._getTabArea().find(".tab.active").index();
        if (index > -1) {
            this._switchResult(index);
        }
    }

    /**
     * @override
     * XXXX todo disable it until further confirmation
     */
    protected _save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    protected _restoreTabs(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // this._loadTab(this._getSQLTab());
        this._getKVStore().getAndParse()
        .then((restoreData: {tabs: {
            name: string,
            type: TableTabType,
            meta?: {tabId: string, nodeId: DagNodeId}
        }[]}) => {
            if (restoreData != null) {
                restoreData.tabs.forEach((tab) => {
                    this._loadTab(tab);
                });
            }

            if (this._activeTabs.length) {
                this._switchResult(0);
            }
            this._updateList();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * @override
     * @param index
     */
    protected _switchTabs(index?: number): number {
        this._switchResult(index);
        return null;
    }

    public deleteTab(name: string) {
        const index = this._getTabIndexByName(name);
        if (index < 0) return;
        this._deleteTabAction(index);
    }

    protected _deleteTabAction(index: number): void {
        const $tab: JQuery = this._getTabElByIndex(index);
        if ($tab.hasClass("active")) {
            // when this is the current active table
            if (index > 0) {
                this._switchResult(index - 1);
            } else if (this.getNumTabs() > 1) {
                this._switchResult(index + 1);
            }
        }
        this._activeTabs.splice(index, 1);
        this._save();

        $tab.remove();
        if (this.getNumTabs() === 0) {
            DagTable.Instance.close();
        }
        this._updateList();
    }

    protected _deleteOtherTabsAction(index: number, rightOnly?: boolean): void {
        let start = rightOnly ? (index + 1) : 0;
        for (let i = start; i < this._activeTabs.length; i++) {
            if (i !== index) {
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


    // do nothing
    protected _renameTabAction(_$input: JQuery): string {
        return null;
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

    protected _getJSON(): {
        tabs: {name: string, type: TableTabType, meta?: {tabId: string, nodeId: DagNodeId}}[]
    } {
        const tabs: {name: string, type: TableTabType, meta?: {tabId: string, nodeId: DagNodeId}}[] = [];
        this._activeTabs.forEach((tab) => {
            if (tab.type !== TableTabType.SQL && tab.type !== TableTabType.Preview) {
                tabs.push(tab);
            }
        });
        return { tabs };
    }

    protected _addEventListeners(): void {
        super._addEventListeners();

        const $tabArea: JQuery = this._getTabArea();
        $tabArea.off("dblclick", ".dragArea"); // turn off dblick to rename
        const $menu: JQuery = this._getMenu();
        const $rename = $menu.find(".rename");
        $rename.addClass("unavailable");
        xcTooltip.add($rename, {title: "Tables cannot be renamed"});
    }

    private _getTabIndexByName(name: string): number {
        return this._activeTabs.findIndex((tab) => tab.name === name);
    }

    private _loadTab(
        tab: {
            name: string,
            type: TableTabType,
            meta?: {tabId: string, nodeId: DagNodeId},
            displayName?: string
        },
        index?: number,

    ): void {
        let tabIndex: number = null;
        if (index == null) {
            index = this.getNumTabs();
        } else {
            tabIndex = index;
        }
        this._activeTabs.splice(index, 0, tab);
        this._addTabHTML(tab.displayName || tab.name, tabIndex);
    }

    private _getSQLTab(): {name: string, type: TableTabType} {
        return {
            name: TableTabManager.SQLTab,
            type: TableTabType.SQL
        };
    }

    private _addTabHTML(
        name: string,
        tabIndex?: number
    ): void {
        name = xcStringHelper.escapeHTMLSpecialChar(name);
        const classNames: string[] = ["tab", "tooltipOverflow"];
        let html: HTML =
            '<li class="' + classNames.join(" ") + '" ' +
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
        const $view = $("#tableViewContainer");
        if (this._activeTabs.length === 0) {
            $view.addClass("hint");
        } else {
            $view.removeClass("hint");
        }
        this._tabListScroller.showOrHideScrollers();
    }

    private async _switchResult(index?: number): Promise<void> {
        try {
            index = super._switchTabs(index);
            const tab = this._activeTabs[index];
            let viewName: string = "result";
            switch (tab.type) {
                case TableTabType.PbTable:
                    SQLResultSpace.Instance.showHint();
                    await SQLResultSpace.Instance.viewPublishedTable(tab.name);
                    break;
                case TableTabType.ResultSet:
                case TableTabType.Preview:
                    SQLResultSpace.Instance.showHint();
                    await this._viewResult(tab.meta);
                    break;
                case TableTabType.SQL:
                    const meta = tab.meta || {};
                    if (meta.columns) {
                        this._viewSQLHistoryResult(meta);
                    } else if (meta.tabId) {
                        SQLResultSpace.Instance.showHint();
                        await this._viewResult(meta);
                    } else {
                        viewName = "sql";
                        DagTable.Instance.close();
                    }
                    break;
                default:
                    break;
            }
            SQLResultSpace.Instance.switchTab(viewName);
            this._focusOnList(tab);
        } catch (e) {
            this._handleErrorCase(e);
        }
    }

    private async _viewResult(
        meta: {tabId: string, nodeId: DagNodeId}
    ): Promise<void> {
        const {tabId, nodeId} = meta;
        const tab = DagTabManager.Instance.getTabById(tabId);
        if (tab == null) {
            const dfTab = DagList.Instance.getDagTabById(tabId);
            let error: string;
            if (dfTab == null) {
                error = "The corresponding module doesn't exist";
            } else {
                error = `Module "${dfTab.getName()}" is closed, cannot view result`;
            }
            throw error;
        }
        DagTable.Instance.close();
        await this._viewDagNodeResult(tab, nodeId);
    }

    private async _viewDagNodeResult(tab: DagTab, nodeId: DagNodeId): Promise<void> {
        const dagNode: DagNode = tab.getGraph().getNode(nodeId);
        const viewer: XcDagTableViewer = <XcDagTableViewer>await DagTable.Instance.previewTable(tab.getId(), dagNode);
        let dagView = DagViewManager.Instance.getDagViewById(viewer.getDataflowTabId());
        let table = XcDagTableViewer.getTableFromDagNode(dagNode);
        if (dagView && table) {
            dagView.syncProgressTip(dagNode.getId(), table.resultSetCount);
        }
    }

    private _viewSQLHistoryResult(meta: {tableName: string, columns}): void {
        const {tableName, columns} = meta;
        const tableId = xcHelper.getTableId(tableName);
        const table = new TableMeta({
            tableId: tableId,
            tableName: tableName
        });
        SQLResultSpace.Instance.viewTable(table, columns, () => {
            this._handleErrorCase("Query result has been deleted");
        });
    }

    private _belongToSQLTab(type: TableTabType, meta: any): boolean {
        if (type === TableTabType.ResultSet && meta) {
            const tab = DagTabManager.Instance.getTabById(meta.tabId);
            if (tab instanceof DagTabSQLExecute) {
                return true;
            }
        }
        if (type === TableTabType.SQLHistory) {
            return true;
        }
        return false;
    }

    private _handleErrorCase(error: Error | string) {
        console.error(error);
        let errMsg: string;
        if (error instanceof Error) {
            errMsg = "Result has been deleted.";
        } else {
            errMsg = xcHelper.parseError(error);
        }
        SQLResultSpace.Instance.showError(errMsg);
    }

    private _focusOnList(tab: {name: string, type: TableTabType}): void {
        const $list: JQuery = ResourceMenu.Instance.getContainer().find(".tableList");
        $list.find("li.active").removeClass("active");
        if (tab.type === TableTabType.PbTable) {
            const $li: JQuery = $list.find('li').filter((_index, e) => {
                return $(e).find(".name").text() === tab.name;
            });
            if ($li.length) {
                $li.addClass("active");
                ResourceMenu.Instance.focusOnList($li);
            }
        }
    }
}