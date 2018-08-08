// dagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.

class DagTabManager{
    private static _instance: DagTabManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _$dagTabArea: JQuery; // $("#dagTabSectionTabs");
    private _activeUserDags: DagTab[];
    private _dagKVStore: KVStore;
    private _unique_id: number;
    private _keys: string[];
    private _editingName: string;
    private _disableLog: boolean;
    private _tabListScroller: ListScroller;

    public setup(): void {
        const self: DagTabManager = this;
        self._$dagTabArea = $("#dagTabSectionTabs").find("ul");;
        self._keys = [];
        let key: string = KVStore.getKey("gDagManagerKey");
        self._dagKVStore = new KVStore(key, gKVScope.WKBK);
        self._activeUserDags = [];
        self._unique_id = 0;
        self._disableLog = false;

        this._tabListScroller = new ListScroller($('#dagTabSectionTabs'),
            $('#dagTabSectionTabs'), false, {
            bounds: '#DagTabView'
        });

        self._$dagTabArea.on("click", ".after", function(event) {
            event.stopPropagation();
            var $tab: JQuery = $(this).parent();
            let index: number = self.getDagTabIndex($tab);
            let key: string = self._keys[index];
            let name: string = $tab.find(".name").text();
            self._deleteTab($tab);
            self._tabListScroller.showOrHideScrollers();
            Log.add(DagTStr.RemoveTab, {
                "operation": SQLOps.RemoveDagTab,
                "key": key,
                "index": index,
                "name": name
            });
        });

        self._$dagTabArea.on("click", ".dagTab", function() {
            var $tab = $(this);
            self._switchTabs($tab);
        });

        // Adding a new tab creates a new tab and adds
        // The html for a dataflowArea.
        $("#tabButton").on("click", function(){
            self.newTab();
            self._tabListScroller.showOrHideScrollers();
        });

        self._$dagTabArea.on("dblclick", ".name", function() {
            let $tab_name: JQuery = $(this);
            self._editingName = $tab_name.text();
            $tab_name.text("");
            let inputArea: string =
                "<span contentEditable='true' class='xc-input'></span>";
            $(inputArea).appendTo($tab_name);
            let $input: JQuery = $tab_name.find('.xc-input');
            $input.text(self._editingName);
            $input.focus();
            document.execCommand('selectAll', false, null);
        });

        self._$dagTabArea.on("focusout", ".xc-input", function() {
            let $tab_input: JQuery = $(this);
            let $tab_name: JQuery = $(this).parent();
            let newName: string = $tab_input.text() || self._editingName;
            if (newName != self._editingName && self._validateName(newName)) {
                let $tab: JQuery = $tab_name.parent();
                let index: number = self.getDagTabIndex($tab);
                self._activeUserDags[index].setName($tab_name.text());
                const dagList: DagList = DagList.Instance;
                dagList.changeName(newName, self._keys[index]);
            } else {
                // Reset name if it already exists
                newName = self._editingName;
            }
            $tab_name.text(newName);
            $tab_input.remove();
            self._tabListScroller.showOrHideScrollers();
        });

        this._getManagerDataAsync();
    }

    private _getJSON(): DagTabManagerJSON {
        return {
            "dagKeys": this._keys
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
            self._keys = ManagerData.dagKeys;
            self._loadDagTabs(ManagerData.dagKeys);
        })
        .fail(function() {
            self.reset();
            return;
        });
    }

    //loadDagTabs handles loading dag tabs from prior sessions.
    private _loadDagTabs(dagTabData: string[]): void {
        const self = this;
        const len = dagTabData.length;
        let promises = [];
        for (var i = 0; i < len; i++) {
            let dagKey = dagTabData[i];
            let newTab = new DagTab(null, null, null, null);
            let promise = (function() {
                let innerDeferred: JQueryDeferred<{}> = PromiseHelper.deferred();
                newTab.initializeTab(dagKey)
                .then((tab: DagTab)=> {
                    if (tab == null) {
                        // Error
                        self.reset();
                        innerDeferred.resolve();
                        return;
                    }
                    const tabJSON: DagTabJSON = tab.getJSON();
                    if (tabJSON.name == null) {
                        innerDeferred.resolve();
                        return;
                    } else {
                        // Success Case
                        self._addDagTab(tab);
                        self._addTabHTML(tabJSON.name);
                        self._switchTabs($("#dagTabSectionTabs .dagTab").last());
                        DagView.reactivate();
                        innerDeferred.resolve();
                    }
                });
                return innerDeferred.promise();
            }).bind(this);
            promises.push(promise);
        }
        //Use a chain to ensure all are run sequentially.
        PromiseHelper.chain(promises)
        .then(() => {
            if ($("#dagTabSectionTabs .dagTab") != null && this._keys.length > 0) {
                this._switchTabs(this.getDagTab(0));
            } else {
                this.reset();
            }
        });
    }

    // Clicking a tab activates the dataflow connected
    // to the tab.
    private _switchTabs($tab: JQuery): void {
        $("#dagTabSectionTabs .dagTab").removeClass("active");
        $("#dagView .dataflowArea").removeClass("active");
        $tab.addClass("active");
        let index: number = this.getDagTabIndex($tab);
        let $dataflowArea: JQuery = this.getDataflowArea(index);
        $dataflowArea.addClass("active");
        DagList.Instance.switchActiveDag(this._keys[index]);
        DagView.switchActiveDagTab(this._activeUserDags[index]);
    }

    // Deletes the tab represented by $tab
    private _deleteTab($tab: JQuery): void {
        if (this._keys.length == 1) {
            return;
        }
        let index: number = this.getDagTabIndex($tab);
        if ($tab.hasClass("active")) {
            $tab.removeClass("active");
            $("#dagView .dataflowArea").removeClass("active");
            if (index > 0) {
                this._switchTabs(this.getDagTab(index-1));
            } else if (this._keys.length > 1) {
                this._switchTabs(this.getDagTab(index+1));
            }
        }
        this._activeUserDags.splice(index, 1);
        this._keys.splice(index,1);
        let json: DagTabManagerJSON = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json),true,true);
        $tab.remove();
        this.getDataflowArea(index).remove();
        if (this._keys.length == 1) {
            $("#dagTabSectionTabs .dagTab .after").addClass("xc-hidden")
        }
    }

    /**
     *  Creates a new Tab and dataflow.
     *  @param {string} [restoreKey] optional Key for redoing a newTab
     *  @param {string} [restoreName] optional param for what the name should be.
     */
    public newTab(restoreKey?: string): void {
        const activeWKBNK: string = WorkbookManager.getActiveWKBK();
        const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
        const prefix: string = workbook.sessionId + Date.now();
        if (this._unique_id == 0) {
            this._unique_id = this._keys.length + 1;
        }
        const uid: string = prefix + this._unique_id;
        const key: string = restoreKey || (KVStore.getKey("gDagManagerKey") + "-DF-" + uid);
        let name: string = "Dataflow " + this._unique_id;
        let validatedName: string = name;
        let repCount: number = 2;
        while (!this._validateName(name)) {
            // Ensure a new valid name is made
            name = validatedName + " (" + repCount + ")";
            repCount++;
        }
        validatedName = name;
        this._unique_id++;
        this._keys.push(key);
        let newTab: DagTab = new DagTab(validatedName, uid, key, new DagGraph());
        this._activeUserDags.push(newTab);
        let json: DagTabManagerJSON = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json), true, true);
        newTab.saveTab();
        const dagList: DagList = DagList.Instance;
        dagList.addDag(validatedName, key);
        this._addTabHTML(validatedName);
        let $tab: JQuery = this.getDagTab(this._keys.length - 1);
        if (!this._disableLog) {
            Log.add(DagTStr.NewTab, {
                "operation": SQLOps.NewDagTab,
                "dataflowId": uid,
                "key": key
            });
        }
        this._switchTabs($tab);
        DagView.newGraph();
    }

    /**
     * Adds a dagTab to the activeUserDags
     * @param dagTab The dagTab we want to add
     */
    private _addDagTab(dagTab: DagTab): void {
        this._activeUserDags.push(dagTab);
    }


    /**
     * handles the jquery logic of adding a tab and its dataflow area
     * @param name Name of the tab we want to add
     * @param {number} [tabIndex] Optional tab index
     */
    private _addTabHTML(name: string, tabIndex?: number): void {
        name = xcHelper.escapeHTMLSpecialChar(name);
        let html = '<li class="dagTab"><div class="name">' + name +
                    '</div><div class="after"><i class="icon xi-close-no-circle"></i></div></li>';
        this._$dagTabArea.append(html);
        $(".dataflowWrap").append(
            '<div class="dataflowArea">\
            <div class="sizer"></div>\
            <svg class="mainSvg"></svg>\
            </div>'
        );
        if (this._keys.length > 1) {
            $("#dagTabSectionTabs .dagTab .after").removeClass("xc-hidden")
        } else {
            $("#dagTabSectionTabs .dagTab .after").addClass("xc-hidden")
        }
        if (tabIndex != null) {
            // Put the tab and area where they should be
            let newTab: JQuery = this.getDagTab(this._keys.length - 1);
            let newTabArea: JQuery = this.getDataflowArea(this._keys.length);
            newTab.insertBefore(this.getDagTab(tabIndex));
            newTabArea.insertBefore(this.getDataflowArea(tabIndex));
        }
    }

    private _validateName(name: string): boolean {
        const dagList: DagList = DagList.Instance;
        return dagList.isUniqueName(name);
    }

    /**
     * Removes the tab representing the dag with "key"
     * @param key The kvstore key for the dagTab.
     * @returns {boolean}
     */
    public removeTab(key: string): boolean {
        const index: number = this._keys.indexOf(key);
        if (index == -1) {
            // Dag not in active tabs, so it's fine to delete it.
            return true;
        } else if (this._keys.length == 1) {
            return false;
        }
        this._deleteTab(this.getDagTab(index));
        return true;
    }

    /**
     * Either loads up a new tab or switches to an existing one.
     * @param key Key for the dagTab we want to load
     * @param {number} [tabIndex] optional index for where the tab should go
     */
    public loadTab(key: string, tabIndex?: number): void {
        // Check if we already have the tab
        const index: number = this._keys.indexOf(key);
        if (index != -1) {
            this._switchTabs(this.getDagTab(index));
            return;
        }
        let newTab: DagTab = new DagTab(null, null, null, null);
        newTab.initializeTab(key)
        .then((tab: DagTab)=> {
            if (tab == null) {
                // Error
                // TODO: Either retry, or delete that dag from the dagList.
                console.error("Invalid DagTabKey");
                return;
            }
            const tabJSON: DagTabJSON = tab.getJSON();
            if (tabJSON.name == null) {
                return;
            } else {
                // Success Case
                this._addDagTab(tab);
                let index: number = tabIndex || this._keys.length;
                this._keys.splice(index, 0, key);
                this._addTabHTML(tabJSON.name, tabIndex);
                tabIndex = tabIndex || this._keys.length - 1;
                this._switchTabs(this.getDagTab(tabIndex));
                DagView.reactivate();
                let json: DagTabManagerJSON = this._getJSON();
                this._dagKVStore.put(JSON.stringify(json), true, true);
            }
        });
    }

    /**
     * Given the id of a tab, switch to it.
     * @param id The id of a dagTab.
     */
    public switchTabId(id: string): boolean {
        const index: number = this._activeUserDags.findIndex((dag) => {
            return (dag.getId() == id);
        });
        if (index == -1) {
            return false;
        }
        this._switchTabs(this.getDagTab(index));
        return true;
    }

    /**
     * Finds the index of the dagTab passed in.
     * @param $tab DagTab element we want to find the index of
     * @return {number}
     */
    public getDagTabIndex($tab: JQuery): number {
        return $("#dagTabSectionTabs .dagTab").index($tab);
    }

    /**
     * Finds the dagTab at the index passed in.
     * @param index Index of the dagTab element we want to get
     * @return {JQuery}
     */
    public getDagTab(index: number): JQuery {
        return $("#dagTabSectionTabs .dagTab").eq(index);
    }

    /**
     * Finds the dataflowArea at the index passed in.
     * @param index Index of the ddataflowArea element we want to get
     * @return {JQuery}
     */
    public getDataflowArea(index: number): JQuery {
        return $("#dagView .dataflowArea").eq(index);
    }

    /**
     * Decrements the tab manager unique id by one, unless it's zero.
     * Should only be used by undo newTab
     */
    public decrementUID() {
        if (this._unique_id != 0) {
            this._unique_id--;
        }
    }

    /**
     * Resets keys and tabs in the case of error.
     */
    public reset(): void {
        $("#dagView .dataflowArea").remove();
        $("#dagTabSectionTabs .dagTab").remove();
        this._unique_id = 1;
        this._keys = [];
        this._disableLog = true;
        this.newTab();
        this._disableLog = false;
    }

    // Used for testing/simple setup.
    public demoTabs(): void {
        this.newTab();
        this.newTab();
    }
}