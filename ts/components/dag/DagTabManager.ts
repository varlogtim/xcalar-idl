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
    private _subTabs: { parentId: string, childId: string }[] = [];

    public setup(): void {
        let key: string = KVStore.getKey("gDagManagerKey");
        this._dagKVStore = new KVStore(key, gKVScope.WKBK);
        this._activeUserDags = [];
        this._subTabs = [];

        const $tabArea: JQuery = this._getTabArea();
        this._tabListScroller = new ListScroller($tabArea, $tabArea, false, {
            bounds: "#DagTabView"
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
        // the string to show on the tab
        // TODO: should get it from DagNodeCustom
        const validatedName = customNode.getCustomName();
        // the td to find the tab
        const tabId: string = validatedName;
        const tabIndex: number = this.getTabIndex(tabId);
        if (tabIndex < 0) {
            // No tab for this custom operator, create a new tab
            // Create a new tab object
            const newTab = new DagTabCustom({
                name: validatedName,
                customNode: customNode
            });
            // Register the new tab in DagTabManager
            this._addSubTab(DagView.getActiveTab().getId(), newTab.getId());
            this._addDagTab(newTab);
            // Show the tab in DOM(UI)
            this._addTabHTML({ name: validatedName, isEditable: false });
            // Switch to the tab(UI)
            this._switchTabs();
            // Redraw the graph(UI)
            DagView.reactivate();
        } else {
            // Tab already opened, switch to that one
            this._switchTabs(tabIndex);
        }
    }

    /**
     * Persist parent tabs to KVStore
     * @param childKey The key of the child tab
     * @returns Promise with void
     * @description
     * Use case: Any changes in the subGraph(shown in the child tab) of a custom operator whill trigger this function
     */
    public saveParentTab(childKey: string): XDPromise<void> {
        const saveTasks = this._getParentTabs(childKey).map( (parentTab) => {
            return parentTab.saveTab();
        });
        if (saveTasks.length === 0) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...saveTasks)
        .then( () => {
            deferred.resolve();
        })
        .fail( () => {
            deferred.reject();
        });

        return deferred.promise();
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
     * Either loads up a new tab or switches to an existing one.
     * @param key Key for the dagTab we want to load
     * @param {number} [tabIndex] optional index for where the tab should go
     */
    public loadTab(key: string, tabIndex?: number): void {
        // Check if we already have the tab
        const index: number = this.getTabIndex(key);
        if (index != -1) {
            this._switchTabs(index);
            return;
        }
        DagTab.restore(key)
        .then((tab: DagTab)=> {
            const name: string = tab.getName();
            if (name == null) {
                return;
            } else {
                // Success Case
                this._addDagTab(tab, tabIndex);
                this._addTabHTML({ name: name, tabIndex: tabIndex });
                this._switchTabs(tabIndex);
                DagView.reactivate();
                this._save();
            }
        });
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
        this._newTab();
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
    private _getManagerDataAsync(): void {
        const self = this;
        this._dagKVStore.getAndParse()
        .then(function(ManagerData) {
            if (ManagerData == null) {
                self.reset();
                return;
            }
            self._loadDagTabs(ManagerData.dagKeys);
        })
        .fail(function() {
            self.reset();
            return;
        });
    }

    private _loadUserDagTab(id: string): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTab.restore(id)
        .then((tab: DagTab)=> {
            const name: string = tab.getName();
            if (tab.getName() == null) {
                // XXX TODO handle this case
                deferred.resolve();
                return;
            } else {
                // Success Case
                this._addDagTab(tab);
                this._addTabHTML({ name: name });
                deferred.resolve();
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    //loadDagTabs handles loading dag tabs from prior sessions.
    private _loadDagTabs(dagTabIds: string[]): void {
        let promises = dagTabIds.map((id) => {
            return this._loadUserDagTab.bind(this, id);
        });
        //Use a chain to ensure all are run sequentially.
        PromiseHelper.chain(promises)
        .then(() => {
            if (this.getNumTabs() > 0) {
                this._switchTabs(0);
            } else {
                this.reset();
            }
            DagView.reactivate();
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
        const parentTabIds = this._getParentTabIds(tabId);
        if (parentTabIds.length > 0) {
            // This is a sub tab(to show custom operator sub graph), so switch to its parent dagList
            // A sub tab can have only one parent tab for now, even the data structure supports multiple parents.
            DagList.Instance.switchActiveDag(parentTabIds[0]);
        } else {
            DagList.Instance.switchActiveDag(tabId);
        }

        DagView.switchActiveDagTab(this.getTabByIndex(index));
        DagTopBar.Instance.reset();
    }

    private _newTab(): DagTab {
        const name: string = DagList.Instance.getValidName();
        let newTab: DagTab = new DagTab(name, null, new DagGraph());
        const key: string = newTab.getId();
        this._activeUserDags.push(newTab);
        this._save();
        newTab.saveTab();
        DagList.Instance.addDag(name, key);
        this._addTabHTML({name: name});
        this._switchTabs();
        DagView.newGraph();
        return newTab;
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
        // XXX TODO: allow delete even it's the only one
        if (this.getNumTabs() == 1 ||
            dagTab == null ||
            dagTab.getGraph().isLocked()
        ) {
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
        this._updateDeletButton();
        return true;
    }

    private _addSubTab(parentId: string, childId: string): void {
        for (const subTabInfo of this._subTabs) {
            if (parentId === subTabInfo.parentId &&
                childId === subTabInfo.childId
            ) {
                return;
            }
        }
        this._subTabs.push({
            parentId: parentId,
            childId: childId
        });
    }

    private _getParentTabIds(childId: string): string[] {
        const parentTabIds: string[] = [];
        for (const subTabInfo of this._subTabs) {
            if (childId === subTabInfo.childId) {
                parentTabIds.push(subTabInfo.parentId);
            }
        }
        return parentTabIds;
    }

    private _getParentTabs(childId: string): DagTab[] {
        const parentTabs: DagTab[] = [];
        for (const parentId of this._getParentTabIds(childId)) {
            const index = this.getTabIndex(parentId);
            if (index >= 0) {
                parentTabs.push(this.getTabByIndex(index));
            }
        }
        return parentTabs;
    }

    private _getSubTabIds(parentId: string): string[] {
        const subTabs: string[] = [];
        for (const subTabInfo of this._subTabs) {
            if (parentId === subTabInfo.parentId) {
                subTabs.push(subTabInfo.childId);
            }
        }
        return subTabs;
    }

    private _removeParentTabById(parentId: string): void {
        this._subTabs = this._subTabs.filter((subTabInfo) => {
            return subTabInfo.parentId !== parentId;
        });
    }

    private _removeChildTabById(childId: string): void {
        this._subTabs = this._subTabs.filter((subTabInfo) => {
            return subTabInfo.childId !== childId;
        });
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
    }


    /**
     * handles the jquery logic of adding a tab and its dataflow area
     * @param name Name of the tab we want to add
     * @param {number} [tabIndex] Optional tab index
     */
    private _addTabHTML(options: {
        name: string, tabIndex?: number, isEditable?: boolean
    }): void {
        const { name, tabIndex, isEditable = true } = options;
        const tabName = xcHelper.escapeHTMLSpecialChar(name);
        let html = '<li class="dagTab"><div class="name ' + (isEditable? '': 'nonedit') + '">' + tabName +
                    '</div><div class="after"><i class="icon xi-close-no-circle"></i></div></li>';
        this._getTabArea().find("ul").append(html);
        $("#dagView .dataflowWrap").append(
            '<div class="dataflowArea">\
                <div class="dataflowAreaWrapper">\
                    <div class="commentArea"></div>\
                    <svg class="edgeSvg"></svg>\
                    <svg class="operatorSvg"></svg>\
                </div>\
            </div>'
        );
        this._updateDeletButton();
        if (tabIndex != null) {
            // Put the tab and area where they should be
            const numTabs: number = this.getNumTabs();
            let $newTab: JQuery = this.getDagTabElement(numTabs - 1);
            let $newTabArea: JQuery = this._getDataflowArea(numTabs);
            $newTab.insertBefore(this.getDagTabElement(tabIndex));
            $newTabArea.insertBefore(this._getDataflowArea(tabIndex));
        }
    }

    private _updateDeletButton(): void {
        const $tabs: JQuery = this._getTabsEle();
        if (this.getNumTabs() > 1) {
            $tabs.find(".after").removeClass("xc-hidden")
        } else {
            $tabs.find(".after").addClass("xc-hidden")
        }
    }

    private _getDataflowArea(index?: number): JQuery {
        const $area: JQuery = $("#dagView .dataflowArea");
        return (index == null) ? $area : $area.eq(index);
    }

    private _getTabArea(): JQuery {
        return $("#dagTabSectionTabs");
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
            let newName: string = $tab_input.text() || this._editingName;
            if (newName != this._editingName &&
                DagList.Instance.isUniqueName(newName)
            ) {
                let $tab: JQuery = $tab_name.parent();
                let index: number = $tab.index();
                const dagTab: DagTab = this.getTabByIndex(index);
                dagTab.setName(newName);
                DagList.Instance.changeName(newName, dagTab.getId());
            } else {
                // Reset name if it already exists
                newName = this._editingName;
            }
            $tab_name.text(newName);
            $tab_input.remove();
            this._tabListScroller.showOrHideScrollers();
        });
    }
}