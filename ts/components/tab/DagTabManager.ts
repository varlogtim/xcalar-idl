// DagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.
class DagTabManager extends AbstractTabManager {
    private static _instance: DagTabManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _activeUserDags: DagTab[];
    private _cachedSQLDags: Map<string, DagTabUser>;
    private _subTabs: Map<string, string>; // subTabId => parentTabId
    private _activeTab: DagTab;
    private _sqlPreviewTab: DagTab;
    private _hiddenDags: Map<string, DagTab>; // used to store undone tabs
    private _statsTab: DagTab;
    private _event: XcEvent;

    private constructor() {
        super("dagTabView", "gDagManagerKey")
        this._activeUserDags = [];
        this._cachedSQLDags = new Map();
        this._subTabs = new Map();
        this._hiddenDags = new Map();
        this._event = new XcEvent();
    }

    /**
     * Public events that inherits from Parent:
     * DagTabManager.Instance.setup
     *
     */

     /**
      * DagTabManager.Instance.on
      * @param event
      * @param callback
      */
    public on(event: string, callback: Function): DagTabManager {
        this._event.addEventListener(event, callback);
        return this;
    }

    /**
     * DagTabManager.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        // Not use this.$dagView as it's called before setup
        let $section: JQuery = $("#dagTabView");
        if (disable) {
            $section.addClass("xc-hidden");
        } else {
            $section.removeClass("xc-hidden");
        }
    }

    public getTabs(): DagTab[] {
        return this._activeUserDags;
    }

    public getNumTabs(): number {
        return this._activeUserDags.length;
    }

    /**
     * Get DagTab by index
     * @param index
     */
    public getTabByIndex(index: number): DagTab {
        return this._activeUserDags[index];
    }

    /**
     * Get Dag Tab by id
     * @param tabId
     */
    public getTabById(tabId: string): DagTab {
        let dagTab: DagTab = this._activeUserDags.find((dagTab) => {
            return dagTab.getId() === tabId;
        });
        dagTab = dagTab || this._cachedSQLDags.get(tabId);
        if (!dagTab && this._sqlPreviewTab
            && this._sqlPreviewTab.getId() === tabId) {
            dagTab = this._sqlPreviewTab;
        }
        if (!dagTab && this._statsTab && this._statsTab.getId() === tabId) {
            dagTab = this._statsTab;
        }
        return dagTab;
    }

    /**
     * Tells us the index of dag tab
     * @param tabId The id we're looking for.
     */
    public getTabIndex(tabId: string, isSqlPreview?: boolean): number {
        if (isSqlPreview && this._sqlPreviewTab &&
            this._sqlPreviewTab.getId() === tabId) {
            return 0;
        }
        return this._activeUserDags.findIndex((dag) => dag.getId() === tabId);
    }

    public addSQLTabCache(tab: DagTabUser): void {
        this._cachedSQLDags.set(tab.getId(), tab);
    }

    public removeSQLTabCache(tab: DagTabUser): void {
        this._cachedSQLDags.delete(tab.getId());
    }

    /**
     * DagTabManager.Instance.newTab
     * Creates a new Tab and dataflow.
     * @param isEmpty will create a new graph with no immediate plans to add any nodes
     * used to indicate it's a blank graph and we can add instructions to it
     */
    public newTab(isEmpty?: boolean): string {
        const name = DagList.Instance.getValidName();
        const graph: DagGraph = new DagGraph();
        const tab: DagTab = this._newTab(name, graph, false, isEmpty);
        this._tabListScroller.showOrHideScrollers();
        Log.add(SQLTStr.NewTab, {
            "operation": SQLOps.NewDagTab,
            "isSQLFunc": false,
            "dataflowId": tab.getId(),
            "dataflowName": name
        });
        return tab.getId();
    }

    /**
     * DagTabManager.Instance.newSQLFunc
     * @param graph
     */
    public newSQLFunc(
        name: string,
        graph?: DagGraph
    ): string {
        if (DagList.Instance.validateName(name, true) != null) {
            // when not a valid sql function name
            console.error("invalid sql function name " + name + " regenrate valid name!");
            name = DagList.Instance.getValidName(null, false, true);
        }
        graph = graph || new DagGraph();
        const tab: DagTab = this._newTab(name, graph, true);
        this._tabListScroller.showOrHideScrollers();
        Log.add(SQLTStr.NewTab, {
            "operation": SQLOps.NewDagTab,
            "isSQLFunc": true,
            "dataflowId": tab.getId(),
            "dataflowName": name
        });
        return tab.getId();
    }

    /**
     * Create a new tab for the sub-graph of a custom operator
     * @param customNode
     * @description
     * 1. The tab doesn't associate with a dataflow
     * 2. The tab doesn't persist in KVStore, as the sub-graph information is persisted by the tab which owns the custom operator
     */
    public newCustomTab(customNode: DagNodeCustom): string {
        const parentTabId = DagViewManager.Instance.getActiveTab().getId();
        // the string to show on the tab
        const validatedName = customNode.getCustomName();
        // the td to find the tab
        const tabId: string = `${parentTabId}-${customNode.getId()}`;
        const tabIndex: number = this.getTabIndex(tabId);
        if (tabIndex < 0) {
            // No tab for this custom operator, create a new tab
            // Create a new tab object
            const newTab = new DagTabCustom({
                id: tabId,
                name: validatedName,
                customNode: customNode
            });
            newTab.setGraph(newTab.getGraph());
            newTab.getGraph().setTabId(tabId);
            // Register the new tab in DagTabManager
            if (this._addSubTab(parentTabId, tabId)) {
                this._addDagTab(newTab);

                // Switch to the tab(UI)
                this._switchTabs();
            }
        } else {
            // Tab already opened, switch to that one
            this._switchTabs(tabIndex);
        }
        return tabId;
    }

    public newStatsTab(dagTab) {
        this._statsTab = dagTab;
        dagTab.load()
        .then(() => {
            const $container = $("#dagStatsPanel .dataflowWrap .innerDataflowWrap");
            $container.find(".dataflowArea").remove();
            const tabId = dagTab.getId();
            DagViewManager.Instance.addDataflowHTML($container, tabId, true, true, true);
            DagViewManager.Instance.renderStatsDag(dagTab);
            dagTab.focus(true);
        });
    }

    public newSQLTab(SQLNode: DagNodeSQL, isSqlPreview?: boolean): string {
        if (isSqlPreview) {
            const validatedName = SQLNode.getSQLName();
            const tabId = SQLNode.getId();
            const newTab = new DagTabSQL({
                id: tabId,
                name: validatedName,
                SQLNode: SQLNode
            });
            newTab.setGraph(newTab.getGraph());
            this._sqlPreviewTab = <DagTab>newTab;

            const $container = $("#sqlDataflowArea .dataflowWrap .innerDataflowWrap");
            $container.empty();
            DagViewManager.Instance.addDataflowHTML($container, tabId, true, false);

            DagViewManager.Instance.renderSQLPreviewDag(<DagTab>newTab);
            return;
        }
        const activeTab: DagTab = DagViewManager.Instance.getActiveTab();
        const parentTabId = activeTab.getId();
        // the string to show on the tab
        const validatedName = SQLNode.getSQLName();
        // the td to find the tab
        const tabId: string = `${parentTabId}-${SQLNode.getId()}`;
        const tabIndex: number = this.getTabIndex(tabId);
        if (tabIndex < 0) {
            // No tab for this custom operator, create a new tab
            // Create a new tab object
            const newTab = new DagTabSQL({
                id: tabId,
                name: validatedName,
                SQLNode: SQLNode
            });
            newTab.setGraph(newTab.getGraph());
            // Register the new tab in DagTabManager
            if (this._addSubTab(parentTabId, tabId)) {
                this._addDagTab(<DagTab>newTab);
                // Switch to the tab(UI)
                this._switchTabs();
            }
        } else {
            // Tab already opened, switch to that one
            this._switchTabs(tabIndex);
        }
        return tabId;
    }

    /**
     * DagTabManager.Instance.newOptimizedTab
     * @param tabId
     * @param tabName
     * @param queryNodes
     * @param executor
     */
    public newOptimizedTab(
        tabId: string,
        tabName: string,
        queryNodes: any[],
        executor?: DagGraphExecutor
    ): DagTabOptimized {
        tabName = DagList.Instance.getValidName(tabName, true, false, true);
        // Create a new tab object
        const newTab: DagTabOptimized = new DagTabOptimized({
            id: tabId,
            name: tabName,
            queryNodes: queryNodes,
            executor: executor
        });
        // links tab to graph and vice versa
        newTab.setGraph(newTab.getGraph());
        if (!this._addNewTab(newTab)) {
            return null;
        }
        return newTab;
    }

    /**
     * DagTabManager.Instance.convertSQLExecuteTabToDF
     * @param dagTab
     */
    public convertSQLExecuteTabToDF(dagTab: DagTabSQLExecute): void {
        const graphJSON = dagTab.getGraph().getSerializableObj(true);
        const name: string = DagList.Instance.getValidName();
        const graph: DagGraph = new DagGraph();
        graph.create(graphJSON);
        this._newTab(name, graph, false, false);
        this._tabListScroller.showOrHideScrollers();
    }

    /**
     *  DagTabManager.Instance.duplicateTab
     *  Creates a new Tab and dataflow.
     */
    public duplicateTab(tab: DagTab): void {
        if (tab == null) {
            return;
        }
        const graph: DagGraph = tab.getGraph();
        if (graph == null) {
            return;
        }

        let name: string = tab.getName().replace(/\//g, "_");
        let isSQLFunc: boolean = (tab instanceof DagTabSQLFunc);
        name = DagList.Instance.getValidName(name, true, isSQLFunc);
        let newTab: DagTab = this._newTab(name, graph.clone(), isSQLFunc);
        Log.add(SQLTStr.DupTab, {
            "operation": SQLOps.DupDagTab,
            "dataflowId": newTab.getId()
        });
    }

    /**
     * Persist parent tabs to KVStore
     * @param subTabId The key of the child tab
     * @returns Promise with void
     * @description
     * Use case: Any changes in the subGraph(shown in the sub tab) of a custom operator whill trigger this function
     */
    public saveParentTab(subTabId: string): XDPromise<void> {
        const parentTab = this._getParentTab(subTabId);
        if (parentTab == null) {
            return PromiseHelper.resolve();
        }
        return parentTab.save();
    }

    /**
     * Removes the tab representing the dag with "id"
     * @param tabId DagTab's id.
     * @returns {boolean}
     */
    public removeTab(tabId: string): {success: boolean, error?: string} {
        const index: number = this.getTabIndex(tabId);
        if (index < 0) {
            // Dag not in active tabs, so it's fine to delete it.
            return { success: true };
        }
        const subTabIds = this._getSubTabIds(tabId);
        if (subTabIds.length > 0) {
            // Sub tabs are still open, so cannot delete it
            return { success: false, error: DFTStr.DelSubErr };
        }
        return { success: this._deleteTab(index) };
    }

    /**
     * Remove the tab showing custom/SQL OP's sub graph recursively.
     * @param dagNode
     */
    public removeTabByNode(dagNode: DagNodeCustom | DagNodeSQL): void {
        const allTabs: DagTab[]  = this.getTabs() || [];
        let rootTab: DagTab = null;
        for (const tab of allTabs) {
            if (tab.getGraph() === dagNode.getSubGraph()) {
                rootTab = tab;
                break;
            }
        }

        if (rootTab != null) {
            this._deleteSubTabsDFS(rootTab.getId());
        }
    }

    /**
     * DagTabManager.Instance.loadTab
     * Load a existing tab
     * @param dagTab the dagTab we want to load
     * @param validate set to true during upload so we validate dataflows coming from
     *  an external source, can also be true upon activation
     */
    public loadTab(dagTab: DagTab, reset: boolean = false): XDPromise<void> {
        if (dagTab == null) {
            console.error("error case");
            return PromiseHelper.reject();
        }
        // Check if we already have the tab
        const index: number = this.getTabIndex(dagTab.getId());
        if (index != -1) {
            this._switchTabs(index);
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._loadOneTab(dagTab, reset)
        .then(() => {
            this._addDagTab(dagTab);
            this._switchTabs();
            this._save();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public reloadTab(dagTab: DagTab): XDPromise<void> {
        return this._loadOneTab(dagTab, false);
    }

    /**
     * Given the id of a tab, switch to it.
     * @param tabId The id of a dagTab.
     */
    public switchTab(tabId: string): boolean {
        const index: number = this.getTabIndex(tabId);
        if (index == -1) {
            return false;
        }
        this._switchTabs(index);
        return true;
    }

    /**
     * Finds the dagTab at the index passed in.
     * @param index Index of the dagTab element we want to get
     * @return {JQuery}
     */
    public getDagTabElement(index: number): JQuery {
        return this._getTabElByIndex(index);
    }

    /**
     * Resets keys and tabs in the case of error.
     */
    public reset(): void {
        this._getDataflowArea().remove();
        this._getTabsEle().remove();
        DagViewManager.Instance.resetActiveDagTab();
    }

    public lockTab(tabId: string): void {
        this._getTabEleById(tabId).find(".after").addClass("xc-disabled");
    }

    public unlockTab(tabId: string): void {
        this._getTabEleById(tabId).find(".after").removeClass("xc-disabled");
    }

    /**
     * Returns the tab ID of the tab that has an open dagnode panel associated with it
     * If there is no such tab, it returns undefined
     */
    public getPanelTabId(): string {
        let $tab = $("#dagTabSectionTabs .dagTab .after.xc-disabled").parent(".dagTab");
        return $tab.data('id');
    }

    // used to undo creating a new
    public hideTab(tabId: string) {
        const dagTab: DagTab = this.getTabById(tabId);
        DagList.Instance.removeDataflow(tabId);
        const index = this.getTabIndex(dagTab.getId());
        this._deleteTab(index, true);
        this._tabListScroller.showOrHideScrollers();
    }

    // used for redoing new tab
    public unhideTab(id: string): void {
        const tab: DagTab = this._hiddenDags.get(id);
        DagList.Instance.addDataflow(tab);
        this._addDagTab(tab);
        this._hiddenDags.delete(id);
        this._switchTabs();
        this._save();
        this._tabListScroller.showOrHideScrollers();
    }

    public deleteHiddenTabs(): void {
        this._hiddenDags.forEach((tab, id) => {
            tab.delete();
            this._hiddenDags.delete(id);
        });
    }

    /**
     * DagTabManager.Instance.openAndResetSQLExecuteTab
     * open the tab and clear the graph inside it
     */
    public openAndResetSQLExecuteTab(): void {
        // Check if we already have the tab
        const dagTab: DagTabSQLExecute = new DagTabSQLExecute();
        const index: number = this.getTabIndex(dagTab.getId());
        if (index != -1) {
            this._switchTabs(index);
            const oldTab = this._activeUserDags[index];
            // reset graph
            const graph = oldTab.getGraph();
            graph.reset();
            graph.initialize();
            const $dagArea = DagViewManager.Instance.getAreaByTab(oldTab.getId());
            $dagArea.find(".commentArea").empty();
            $dagArea.find(".edgeSvg").empty();
            $dagArea.find(".operatorSvg").empty();
        } else {
            this._addSQLExecuteTab(dagTab);
        }
    }

    protected _restoreTabs(): XDPromise<void> {
        const dagMaps: Map<string, DagTab> = DagList.Instance.getAllDags();
        if (dagMaps.size === 0) {
            DagList.Instance.reset();
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadSQLExecuteTab()
        .then(() => {
            return this._getKVStore().getAndParse();
        })
        .then((managerData) => {
            if (managerData == null) {
                return;
            }
            // sync up dag list with the opened tab's data
            const idSet: Set<string> = new Set();
            dagMaps.forEach((dagTab) => {
                idSet.add(dagTab.getId());
            });
            const dagIds: string[] = managerData.dagKeys.filter((id) => idSet.has(id));
            return this._loadDagTabs(dagIds);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            this.reset();
            deferred.reject(error);
        });
        return deferred.promise();
    }

    protected _getJSON(): {dagKeys: string[]} {
        // filter out retina tabs as we don't want to persist these viewonly tabs
        const keys: string[] = this.getTabs().reduce((res, dagTab) => {
            if (!(dagTab instanceof DagTabProgress) &&
                !(dagTab instanceof DagTabSQLExecute) // DagTabSQLExecute use openSQLExecuteTab to handle the load/setup
            ) {
                res.push(dagTab.getId());
            }
            return res;
        }, []);
        return {
            dagKeys: keys
        };
    }

    private _loadOneTab(
        dagTab: DagTab,
        reset: boolean,
        noAlert: boolean = false
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._event.dispatchEvent("beforeLoad", dagTab);
        dagTab.load(reset)
        .then(()=> {
            deferred.resolve();
        })
        .fail((error) => {
            this._event.dispatchEvent("loadFail", dagTab, noAlert);
            deferred.reject(error);
        })
        .always(() => {
            this._event.dispatchEvent("afterLoad", dagTab);
        });

        return deferred.promise();
    }

    // always resolves so that chain doesn't end early
    private _loadDagTabHelper(id: string): XDPromise<void> {
        const dagTab: DagTab = DagList.Instance.getDagTabById(id);
        if (dagTab == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadOneTab(dagTab, false, true)
        .then(()=> {
            this._addDagTab(dagTab, null, true);
            if (this.getTabByIndex(0) === dagTab) {
                // if it's the first tab
                this._switchTabs(0);
                this._event.dispatchEvent("afterFirstTabLoad");
            }
            deferred.resolve();
        })
        .fail(() => {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    //loadDagTabs handles loading dag tabs from prior sessions.
    private _loadDagTabs(dagTabIds: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promises = dagTabIds.map((id) => {
            return () => this._loadDagTabHelper(id);
        });
        //Use a chain to ensure all are run sequentially.
        PromiseHelper.chain(promises)
        .always(() => {
            DagList.Instance.refreshMenuList(ResourceMenu.KEY.DF);
            DagList.Instance.refreshMenuList(ResourceMenu.KEY.TableFunc);
            if (this.getNumTabs() === 0) {
                this.reset();
            }
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     * Clicking a tab activates the dataflow connected to the tab.
     * @override
     * @param index
     */
    protected _switchTabs(index?: number): number {
        index = super._switchTabs(index);

        const $dataflowAreas: JQuery = this._getDataflowArea();
        $dataflowAreas.removeClass("active");
        $dataflowAreas.eq(index).addClass("active");

        // Switch to the corresponding dataflow in the left panel(DagList)
        const dagTab: DagTab = this.getTabByIndex(index);
        if (this._activeTab && this._activeTab instanceof DagTabProgress) {
            this._activeTab.unfocus();
        }

        this._activeTab = dagTab;
        const tabId: string = dagTab.getId();
        let parentTabId = this._getParentTabId(tabId);
        if (parentTabId != null) {
            // This is a sub tab(to show custom operator sub graph), so switch to its root dagList
            for (let aId = null; aId != null; aId = this._getParentTabId(aId)) {
                parentTabId = aId;
            }
            DagList.Instance.switchActiveDag(parentTabId);
        } else {
            DagList.Instance.switchActiveDag(tabId);
        }

        DagViewManager.Instance.switchActiveDagTab(this.getTabByIndex(index), $dataflowAreas.eq(index));
        DagGraphBar.Instance.reset();
        if (dagTab instanceof DagTabProgress) {
            dagTab.focus();
        }
        return index;
    }

    private _newTab(
        name: string,
        graph: DagGraph,
        isSQLFunc: boolean,
        isEmpty?: boolean
    ): DagTab {
        const tabConstructor = isSQLFunc ? DagTabSQLFunc : DagTabUser;
        const newDagTab = <DagTab>new tabConstructor({
            name,
            dagGraph: graph,
            createdTime: xcTimeHelper.now()
        });

        let succeed = this._addNewTab(newDagTab);
        if (!succeed) {
            return null;
        }

        if (isEmpty) {
            DagViewManager.Instance.addInstructionNode();
        }
        return newDagTab;
    }

    private _addNewTab(dagTab: DagTab): boolean {
        if (!DagList.Instance.addDag(dagTab)) {
            return false;
        }
        dagTab.save();
        this._addDagTab(dagTab);
        this._save();
        this._switchTabs();
        return true;
    }

    // Delete a tab, as well as sub tabs(DFS order)
    private _deleteSubTabsDFS(tabId: string) {
        // Delete sub tabs
        const subTabIds: string[] = this._getSubTabIds(tabId);
        for (const chilId of subTabIds) {
            this._deleteSubTabsDFS(chilId);
        }

        // Delete myself
        const index: number = this.getTabIndex(tabId);
        this._deleteTab(index);
    }

    // Deletes the tab represented by $tab
    private _deleteTab(index: number, hide?: boolean): boolean {
        const dagTab: DagTab = this.getTabByIndex(index);
        if (dagTab == null || dagTab.getGraph().isLocked()) {
            return false;
        }

        const tabId = dagTab.getId();
        // Try to remove the tab as a parent tab
        const subTabIds: string[] = this._getSubTabIds(tabId);
        if (subTabIds.length > 0) {
            // There are sub tabs still open
            // Switch to the first sub tab
            const subTabIndex = this.getTabIndex(subTabIds[0]);
            const $subTab = this.getDagTabElement(subTabIndex);
            StatusBox.show('Close sub tab first', $subTab);
            return false;
        }
        // Remove the tab as a sub tab
        this._removeChildTabById(tabId);
        this._removeParentTabById(tabId);

        if (DagTable.Instance.isTableFromTab(tabId)) {
            DagTable.Instance.close();
        }

        const $tab: JQuery = this.getDagTabElement(index);
        if ($tab.hasClass("active")) {
            // when this is the current active table
            if (index > 0) {
                this._switchTabs(index - 1);
            } else if (this.getNumTabs() > 1) {
                this._switchTabs(index + 1);
            }
        }
        this._activeUserDags.splice(index, 1);
        if (hide) {
            this._hiddenDags.set(tabId,  dagTab);
        } else {
            dagTab.setClosed();
            this._save();
        }

        $tab.remove();
        this._getDataflowArea(index).remove();
        if (this.getNumTabs() === 0) {
            this.reset();
        }

        DagViewManager.Instance.cleanupClosedTab(dagTab.getGraph());
        if (dagTab instanceof DagTabSQLFunc) {
            DagList.Instance.refreshMenuList(ResourceMenu.KEY.TableFunc);
        } else {
            DagList.Instance.refreshMenuList(ResourceMenu.KEY.DF);
        }
        return true;
    }

    protected _deleteTabAction(index: number, name: string): void {
        const dagTab: DagTab = this.getTabByIndex(index);
        const tabId: string = dagTab.getId();
        const isLogDisabled: boolean = this._isTabLogDisabled(tabId);
        this._deleteTab(index);
        if (!isLogDisabled) {
            Log.add(DagTStr.RemoveTab, {
                "operation": SQLOps.RemoveDagTab,
                "id": tabId,
                "index": index,
                "name": name
            });
        }
    }

    protected _renameTabAction($input: JQuery): string {
        let newName: string = $input.text().trim();
        const $tabName: JQuery = $input.parent();
        const $tab: JQuery = $tabName.parent();
        const index: number = $tab.index();
        const dagTab: DagTab = this.getTabByIndex(index);
        if (dagTab instanceof DagTabSQLFunc) {
            // sql func force name to be case insensitive
            newName = newName.toLowerCase();
        }

        if (dagTab != null &&
            newName != dagTab.getName() &&
            this._tabRenameCheck(newName, $tabName)
        ) {
            dagTab.setName(newName);
            DagList.Instance.changeName(newName, dagTab.getId());
        } else {
            // Reset name if it already exists
            newName = dagTab ? dagTab.getName() : null;
        }
        return this._getAppPath(dagTab);
    }

    /**
     * @override
     * @param $tabName
     */
    protected _getEditingName($tabName: JQuery): string {
        const index: number = this._getTabIndexFromEl($tabName);
        const dagTab = this.getTabByIndex(index);
        return dagTab.getName();
    }

    private _addSubTab(parentId: string, childId: string): boolean {
        // Every subTab can have only 1 parent
        if (this._subTabs.has(childId)) {
            return false;
        }
        // No cycle check
        let aId = parentId;
        while ((aId = this._getParentTabId(aId)) != null) {
            if (aId === childId) {
                return false;
            }
        }
        this._subTabs.set(childId, parentId);
        return true;
    }

    private _getParentTabId(childId: string): string {
        return this._subTabs.get(childId);
    }

    private _getParentTab(childId: string): DagTab {
        return this.getTabById(this._getParentTabId(childId));
    }

    private _getSubTabIds(parentId: string): string[] {
        const subTabs: string[] = [];
        for (const [childId, pId] of this._subTabs.entries()) {
            if (pId === parentId) {
                subTabs.push(childId);
            }
        }
        return subTabs;
    }

    private _removeParentTabById(parentId: string): void {
        const subTabIds = this._getSubTabIds(parentId);
        for (const subTabId of subTabIds) {
            this._subTabs.delete(subTabId);
        }
    }

    private _removeChildTabById(childId: string): void {
        this._subTabs.delete(childId);
    }

    private _isTabLogDisabled(tabId: string): boolean {
        const dagTab = this.getTabById(tabId);
        if (dagTab == null) {
            return true;
        }
        return (dagTab instanceof DagTabCustom);
    }

    /**
     * Adds a dagTab to the activeUserDags
     * @param dagTab The dagTab we want to add
     * @param index?
     * @param noUpdate? when loading multiple tabs at once, we don't need to
     * update the dag list until the end so we don't do it here
     */
    private _addDagTab(dagTab: DagTab, index?: number, noUpdate?: boolean): void {
        let tabIndex: number = null;
        if (index == null) {
            index = this.getNumTabs();
        } else {
            tabIndex = index;
        }
        this._activeUserDags.splice(index, 0, dagTab);
        dagTab.setOpen();
        if (!noUpdate) {
            if (dagTab instanceof DagTabSQLFunc) {
                DagList.Instance.refreshMenuList(ResourceMenu.KEY.TableFunc);
            } else {
                DagList.Instance.refreshMenuList(ResourceMenu.KEY.DF);
            }
        }
        this._addTabHTML(dagTab, tabIndex);
        this._addTabEvents(dagTab);
    }

    private _addTabEvents(dagTab: DagTab): void {
        dagTab
        .on("modify", () => {
            this._getTabEleById(dagTab.getId()).addClass("unsave");
        })
        .on("save", () => {
            this._getTabEleById(dagTab.getId()).removeClass("unsave");
        })
        .on("rerender", () => {
            const index = this.getTabIndex(dagTab.getId());
            const $dataflowAreas = this._getDataflowArea();
            $dataflowAreas.eq(index).removeClass("rendered");
            DagViewManager.Instance.render($dataflowAreas.eq(index), dagTab.getGraph());
            DFNodeLineagePopup.Instance.update(dagTab.getId());
        })
    }

    private _getAppPath(dagTab: DagTab): string {
        const app = dagTab.getApp();
        if (app == null) {
            return dagTab.getName();
        } else {
            return AppList.Instance.getAppPath(app, dagTab.getName());
        }
    }

    /**
     * handles the jquery logic of adding a tab and its dataflow area
     * @param name Name of the tab we want to add
     * @param {number} [tabIndex] Optional tab index
     */
    private _addTabHTML(dagTab: DagTab, tabIndex?: number): void {
        let tabName: string = this._getAppPath(dagTab);
        const tabId = dagTab.getId();
        let isEditable: boolean = (dagTab instanceof DagTabUser);
        const isViewOnly: boolean = (dagTab instanceof DagTabProgress);
        const isProgressGraph: boolean = (dagTab instanceof DagTabProgress);
        const isOptimized: boolean = (dagTab instanceof DagTabOptimized);
        const isQuery: boolean = (dagTab instanceof DagTabQuery);

        let extraClass = "";
        let extraIcon = "";
        if (isQuery) {
            extraClass += " query";
        } else if (isOptimized) {
            extraClass += " optimized";
            let optimizedTab: DagTabOptimized = <DagTabOptimized>dagTab;
            if (!optimizedTab.isFromSDK()) {
                isEditable = true;
            }
        } else if (dagTab instanceof DagTabSQLFunc) {
            extraClass += " sqlFunc";
            extraIcon = '<i class="icon xi-SQLfunction tabIcon"></i>';
        } else if (dagTab instanceof DagTabCustom) {
            extraClass += " custom";
        } else if (DagTabUser.isForSQLFolder(dagTab) || dagTab instanceof DagTabSQL) {
            extraClass += " sql";
        } else if (dagTab instanceof DagTabSQLExecute) {
            extraClass += " sqlExecute";
            extraIcon = '<i class="icon xi-menu-sql tabIcon"></i>';
            isEditable = false;
        } else if (dagTab instanceof DagTabMain) {
            extraClass += " main";
            // extraIcon = '<i class="icon xi-recommend tabIcon"></i>';
        }
        let html: HTML =
            '<li class="tab dagTab' + extraClass + '" data-id="' + tabId +'">' +
                '<div class="dragArea">' +
                    '<i class="icon xi-ellipsis-v" ' + xcTooltip.Attrs + ' data-original-title="' + CommonTxtTstr.HoldToDrag+ '"></i>' +
                '</div>' +
                extraIcon +
                '<div class="name ' + (isEditable? '': 'nonedit') + '">' +
                    tabName +
                '</div>' +
                '<div class="after">' +
                    '<i class="icon xi-close-no-circle close" ' +
                    xcTooltip.Attrs +
                    ' data-original-title="' + DFTStr.CloseModule + '" ' +
                    '></i>' +
                    '<i class="icon xi-solid-circle dot"></i>' +
                '</div>' +
            '</li>';

        this._getTabArea().append(html);
        DagViewManager.Instance.addDataflowHTML($("#dagView .dataflowWrap .innerDataflowWrap"), tabId, isViewOnly, isProgressGraph);

        if (tabIndex != null) {
            // Put the tab and area where they should be
            const numTabs: number = this.getNumTabs();
            let $newTab: JQuery = this.getDagTabElement(numTabs - 1);
            let $newTabArea: JQuery = this._getDataflowArea(numTabs - 1);
            $newTab.insertBefore(this.getDagTabElement(tabIndex));
            $newTabArea.insertBefore(this._getDataflowArea(tabIndex));
        }
    }

    private _getDataflowArea(index?: number): JQuery {
        const $area: JQuery = $("#dagView .dataflowArea");
        return (index == null) ? $area : $area.eq(index);
    }

    private _getTabEleById(tabId: string): JQuery {
        const index: number = this.getTabIndex(tabId);
        if (index >= 0) {
            return this._getTabsEle().eq(index);
        } else {
            return $();
        }
    }

    private _tabRenameCheck(name: string, $tab: JQuery): boolean {
        const isSQLFunc: boolean = $tab.closest(".dagTab").hasClass("sqlFunc");
        const error: string = DagList.Instance.validateName(name, isSQLFunc);
        if (error) {
            StatusBox.show(error, $tab);
            return false;
        } else {
            return true;
        }
    }

    protected _startReorderTabAction(): void {
        $("#dagView").addClass("sortingTabs");
    }

    protected _stopReorderTabAction(previousIndex: number, newIndex: number): void {
        if (previousIndex !== newIndex) {
            // update activeUserDags order as well as dataflowArea
            const tab = this._activeUserDags.splice(previousIndex, 1)[0];
            this._activeUserDags.splice(newIndex, 0, tab);
            const $dataflowArea: JQuery = this._getDataflowArea(previousIndex);
            // if last tab, just append
            if (newIndex === this._activeUserDags.length - 1) {
                $("#dagView .dataflowWrap .innerDataflowWrap").append($dataflowArea);
            } else {
                // because the current area still exists, we need to place before
                // or after the dataflow at the current index depending on the
                // reorder direction
                if (newIndex > previousIndex) {
                    this._getDataflowArea(newIndex).after($dataflowArea);
                } else {
                    this._getDataflowArea(newIndex).before($dataflowArea);
                }
            }
            this._save();
        }
        $("#dagView").removeClass("sortingTabs");
    }

    private _loadSQLExecuteTab(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const dagTab: DagTabSQLExecute = new DagTabSQLExecute();
        dagTab.load()
        .then(() => {
            this._addSQLExecuteTab(dagTab);
            deferred.resolve();
        })
        .fail(() => {
            // assume it's a new sql tab case
            dagTab.save();
            this._addSQLExecuteTab(dagTab);
            deferred.resolve();
        });

        return deferred.promise();
    }

    private _addSQLExecuteTab(dagTab: DagTabSQLExecute): void {
        // always add the tab at the front
        this._addDagTab(dagTab, 0);
        this._switchTabs(0);
    }

    /**
     * @override
     */
    protected _addEventListeners(): void {
        super._addEventListeners();
        // Adding a new tab creates a new tab and adds
        // The html for a dataflowArea.
        $("#tabButton").on("click", () => {
            this.newTab(true);
        });
    }
}