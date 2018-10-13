// DagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.
class DagTabManager{
    private static _instance: DagTabManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _activeUserDags: DagTab[];
    private _dagKVStore: KVStore;
    private _editingName: string;
    private _tabListScroller: ListScroller;
    private _subTabs: Map<string, string> = new Map(); // subTabId => parentTabId

    public setup(): void {
        let key: string = KVStore.getKey("gDagManagerKey");
        this._dagKVStore = new KVStore(key, gKVScope.WKBK);
        this._activeUserDags = [];
        this._subTabs = new Map();

        const $tabArea: JQuery = this._getTabArea();
        this._tabListScroller = new ListScroller($('#dagTabSectionTabs'),
        $tabArea, false, {
            bounds: "#DagTabView",
            noPositionReset: true
        });

        this._addEventListeners();
        this._getManagerDataAsync();
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
        const dagTabs: DagTab[] = this._activeUserDags.filter((dagTab) => {
            return dagTab.getId() === tabId;
        });
        return dagTabs.length > 0 ? dagTabs[0] : null;
    }

    /**
     * Tells us the index of dag tab
     * @param tabId The id we're looking for.
     */
    public getTabIndex(tabId: string): number {
        return this._activeUserDags.findIndex((dag) => dag.getId() === tabId);
    }

    /**
     *  Creates a new Tab and dataflow.
     */
    public newTab(): void {
        const tab: DagTab = this._newTab();
        Log.add(DagTStr.NewTab, {
            "operation": SQLOps.NewDagTab,
            "dataflowId": tab.getId()
        });
    }

    /**
     * Create a new tab for the sub-graph of a custom operator
     * @param customNode
     * @description
     * 1. The tab doesn't associate with a dataflow
     * 2. The tab doesn't persist in KVStore, as the sub-graph information is persisted by the tab which owns the custom operator
     */
    public newCustomTab(customNode: DagNodeCustom): void {
        const parentTabId = DagView.getActiveTab().getId();
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
    public removeTab(tabId: string): boolean {
        const index: number = this.getTabIndex(tabId);
        if (index < 0) {
            // Dag not in active tabs, so it's fine to delete it.
            return true;
        }
        const subTabIds = this._getSubTabIds(tabId);
        if (subTabIds.length > 0) {
            // Sub tabs are still open, so cannot delete it
            return false;
        }
        return this._deleteTab(index);
    }

    /**
     * Remove the tab showing custom OP's sub graph recursively.
     * @param dagNode
     */
    public removeCustomTabByNode(dagNode: DagNodeCustom): void {
        const allTabs: DagTab[]  = this.getTabs();
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
     * Load a existing tab
     * @param dagTab the dagTab we want to load
     */
    public loadTab(dagTab: DagTab): XDPromise<void> {
        // Check if we already have the tab
        const index: number = this.getTabIndex(dagTab.getId());
        if (index != -1) {
            this._switchTabs(index);
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        dagTab.load()
        .then(() => {
            this._addDagTab(dagTab);
            this._switchTabs();
            this._save();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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
        return this._getTabsEle().eq(index);
    }

    /**
     * Resets keys and tabs in the case of error.
     */
    public reset(): void {
        this._getDataflowArea().remove();
        this._getTabsEle().remove();
        DagView.resetActiveDagTab();
    }

    private _save(): XDPromise<void> {
        let jsonStr: string = JSON.stringify(this._getJSON());
        return this._dagKVStore.put(jsonStr, true, true);
    }

    private _getJSON(): {dagKeys: string[]} {
        const keys: string[] = this.getTabs().map((dagTab) => dagTab.getId());
        return {
            dagKeys: keys
        }
    }

    //getManagerDataAsync handles loading the tabManager
    private _getManagerDataAsync(): XDPromise<void> {
        if (DagList.Instance.getAll().length === 0) {
            DagList.Instance.reset();
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagKVStore.getAndParse()
        .then((managerData) => {
            if (managerData == null) {
                this.reset();
                return;
            }
            // sync up dag list with the opened tab's data
            const idSet: Set<string> = new Set();
            DagList.Instance.getAll().forEach((dagInfo) => {
                idSet.add(dagInfo.getId());
            });
            const dagIds: string[] = managerData.dagKeys.filter((id) => idSet.has(id));
            this._loadDagTabs(dagIds);
            deferred.resolve();
        })
        .fail((error) => {
            this.reset();
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _loadDagTabHelper(id: string): XDPromise<void> {
        const dagTab: DagTab = DagList.Instance.getDagTabById(id);
        if (dagTab == null) {
            return PromiseHelper.reject();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        dagTab.load()
        .then(()=> {
            this._addDagTab(dagTab);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    //loadDagTabs handles loading dag tabs from prior sessions.
    private _loadDagTabs(dagTabIds: string[]): void {
        let promises = dagTabIds.map((id) => {
            return this._loadDagTabHelper.bind(this, id);
        });
        //Use a chain to ensure all are run sequentially.
        PromiseHelper.chain(promises)
        .then(() => {
            if (this.getNumTabs() > 0) {
                this._switchTabs(0);
            } else {
                this.reset();
            }
        });
    }

    // Clicking a tab activates the dataflow connected
    // to the tab.
    private _switchTabs(index?: number): void {
        if (index == null) {
            index = this.getNumTabs() - 1;
        }
        const $tabs: JQuery = this._getTabsEle();
        const $tab: JQuery = $tabs.eq(index);
        const $dataflowAreas: JQuery = this._getDataflowArea();
        $tabs.removeClass("active");
        $dataflowAreas.removeClass("active");

        $tab.addClass("active");
        $dataflowAreas.eq(index).addClass("active");

        // Switch to the corresponding dataflow in the left panel(DagList)
        const dagTab: DagTab = this.getTabByIndex(index);
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

        DagView.switchActiveDagTab(this.getTabByIndex(index));
        DagTopBar.Instance.reset();
    }

    private _newTab(): DagTab {
        const name: string = DagList.Instance.getValidName();
        const newDagTab: DagTabUser = new DagTabUser(name, null, new DagGraph());
        if (!DagList.Instance.addDag(newDagTab)) {
            return null;
        }
        newDagTab.save();
        this._addDagTab(newDagTab);
        this._save();
        this._switchTabs();
        DagView.newGraph();
        return newDagTab;
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
    private _deleteTab(index: number): boolean {
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

        const $tab: JQuery = this.getDagTabElement(index);
        if ($tab.hasClass("active")) {
            if (index > 0) {
                this._switchTabs(index - 1);
            } else if (this.getNumTabs() > 1) {
                this._switchTabs(index + 1);
            }
        }
        this._activeUserDags.splice(index, 1);
        this._save();
        $tab.remove();
        this._getDataflowArea(index).remove();
        if (this.getNumTabs() > 0) {
            this._updateTabsText();
        } else {
            this.reset();
        }

        return true;
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
     */
    private _addDagTab(dagTab: DagTab, index?: number): void {
        if (index == null) {
            index = this.getNumTabs();
        }
        this._activeUserDags.splice(index, 0, dagTab);
        this._addTabHTML(dagTab);
        this._updateTabsText();
    }

    /**
     * handles the jquery logic of adding a tab and its dataflow area
     * @param name Name of the tab we want to add
     * @param {number} [tabIndex] Optional tab index
     */
    private _addTabHTML(dagTab: DagTab, tabIndex?: number): void {
        const tabName = xcHelper.escapeHTMLSpecialChar(dagTab.getName());
        const isEditable = !(dagTab instanceof DagTabCustom);
        let html = '<li class="dagTab"><div class="name ' + (isEditable? '': 'nonedit') + '">' + tabName +
                    '</div><div class="after"><i class="icon xi-close-no-circle"></i></div></li>';
        this._getTabArea().append(html);
        $("#dagView .dataflowWrap").append(
            '<div class="dataflowArea">\
                <div class="dataflowAreaWrapper">\
                    <div class="commentArea"></div>\
                    <svg class="edgeSvg"></svg>\
                    <svg class="operatorSvg"></svg>\
                </div>\
            </div>'
        );
        if (tabIndex != null) {
            // Put the tab and area where they should be
            const numTabs: number = this.getNumTabs();
            let $newTab: JQuery = this.getDagTabElement(numTabs - 1);
            let $newTabArea: JQuery = this._getDataflowArea(numTabs);
            $newTab.insertBefore(this.getDagTabElement(tabIndex));
            $newTabArea.insertBefore(this._getDataflowArea(tabIndex));
        }
    }

    // display the tab name like file editor
    // specifically for shared df tabs,  if no name dup, show short name
    // otherwise, show the whole name
    private _updateTabsText(): void {
        const $tabs: JQuery = this._getTabsEle();
        const set: Set<string> = new Set();
        const sharedTabs: Array<[DagTabShared, JQuery]> = [];
        this.getTabs().forEach((dagTab, index) => {
            const $tab: JQuery = $tabs.eq(index);
            if (dagTab instanceof DagTabShared) {
                sharedTabs.push([dagTab, $tab]);
            } else {
                set.add(dagTab.getName());
            }
        });

        sharedTabs.forEach(([dagTab, $tab]) => {
            let name: string = dagTab.getShortName();
            if (set.has(name)) {
                name = dagTab.getName();
            }
            $tab.find(".name").text(name);
            set.add(name);
        });
    }


    private _getDataflowArea(index?: number): JQuery {
        const $area: JQuery = $("#dagView .dataflowArea");
        return (index == null) ? $area : $area.eq(index);
    }

    private _getTabArea(): JQuery {
        return $("#dagTabSectionTabs").find("ul");
    }

    private _getTabsEle(): JQuery {
        return this._getTabArea().find(".dagTab");
    }

    private _addEventListeners(): void {
        const $dagTabArea: JQuery = this._getTabArea();
        $dagTabArea.on("click", ".after", (event) => {
            event.stopPropagation();
            const $tab: JQuery = $(event.currentTarget).parent();
            let index: number = $tab.index();
            let tabId: string = this.getTabByIndex(index).getId();
            const isLogDisabled: boolean = this._isTabLogDisabled(tabId);
            let name: string = $tab.find(".name").text();
            this._deleteTab(index);
            this._tabListScroller.showOrHideScrollers();
            if (!isLogDisabled) {
                Log.add(DagTStr.RemoveTab, {
                    "operation": SQLOps.RemoveDagTab,
                    "id": tabId,
                    "index": index,
                    "name": name
                });
            }
        });

        $dagTabArea.on("click", ".dagTab", (event) => {
            const $tab: JQuery = $(event.currentTarget);
            this._switchTabs($tab.index());
        });

        // Adding a new tab creates a new tab and adds
        // The html for a dataflowArea.
        $("#tabButton").on("click", () => {
            this.newTab();
            this._tabListScroller.showOrHideScrollers();
        });

        $dagTabArea.on("dblclick", ".name", (event) => {
            let $tab_name: JQuery = $(event.currentTarget);
            if ($tab_name.hasClass('nonedit')) {
                return;
            }
            this._editingName = $tab_name.text();
            $tab_name.text("");
            let inputArea: string =
                "<span contentEditable='true' class='xc-input'></span>";
            $(inputArea).appendTo($tab_name);
            let $input: JQuery = $tab_name.find('.xc-input');
            $input.text(this._editingName);
            $input.focus();
            document.execCommand('selectAll', false, null);
        });

        $dagTabArea.on("keypress", ".name .xc-input", (event) => {
            if (event.which === keyCode.Enter) {
                $(event.currentTarget).blur();
            }
        });

       $dagTabArea.on("focusout", ".name .xc-input", (event) => {
            let $tab_input: JQuery = $(event.currentTarget);
            let $tab_name: JQuery = $tab_input.parent();
            let newName: string = $tab_input.text().trim() || this._editingName;
            if (newName != this._editingName &&
                DagList.Instance.isUniqueName(newName) &&
                xcHelper.checkNamePattern(PatternCategory.Dataflow,
                    PatternAction.Check, newName)
            ) {
                let $tab: JQuery = $tab_name.parent();
                let index: number = $tab.index();
                const dagTab: DagTab = this.getTabByIndex(index);
                dagTab.setName(newName);
                DagList.Instance.changeName(newName, dagTab.getId());
                this._updateTabsText();
            } else {
                // Reset name if it already exists
                newName = this._editingName;
            }
            $tab_name.text(newName);
            $tab_input.remove();
            this._tabListScroller.showOrHideScrollers();
        });

        $dagTabArea.mouseenter(() => {
            this._tabListScroller.showOrHideScrollers();
        });
    }
}