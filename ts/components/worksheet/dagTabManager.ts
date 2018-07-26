// dagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.

class DagTabManager{
    private static _instance: DagTabManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _$dagTabArea: JQuery; // $("#dagTabSectionTabs");
    private _$dagTabs: JQuery; // $("#dagTabSectionTabs .dagTab")
    private _$dataFlowAreas: JQuery; // $("#dagView .dataflowArea")
    private _activeUserDags: DagTab[];
    private _dagKVStore: KVStore;
    private _unique_id: number;
    private _keys: string[];
    private _editingName: string;

    public setup(): void {
        const self: DagTabManager = this;
        self._$dagTabArea = $("#dagTabSectionTabs").find("ul");;
        self._$dataFlowAreas = $("#dagView .dataflowArea");
        self._$dagTabs = null;
        self._keys = [];
        let key = KVStore.getKey("gDagManagerKey");
        self._dagKVStore = new KVStore(key, gKVScope.WKBK);
        self._activeUserDags = [];
        this._$dagTabs = null;


        self._$dagTabArea.on("click", ".after", function(event) {
            event.stopPropagation();
            var $tab = $(this).parent();
            self._deleteTab($tab);
        });

        self._$dagTabArea.on("click", ".dagTab", function() {
            var $tab = $(this);
            self._switchTabs($tab);
        });

        // Adding a new tab creates a new tab and adds
        // The html for a dataflowArea.
        $("#tabButton").on("click", function(){
            self._newTab();
        });


        self._$dagTabArea.on("dblclick", ".name", function() {
            let $tab_name = $(this);
            self._editingName = $tab_name.text();
            $tab_name.text("");
            let inputArea: string = 
                "<span contentEditable='true' class='xc-input'></span>";
            $(inputArea).appendTo($tab_name);
            let $input = $tab_name.find('.xc-input');
            $input.text(self._editingName);
            $input.focus();
            document.execCommand('selectAll', false, null);
        });

        self._$dagTabArea.on("focusout", ".xc-input", function() {
            let $tab_input = $(this);
            let $tab_name = $(this).parent();
            let newName = $tab_input.text() || self._editingName;
            $tab_name.text(newName);
            if (newName != self._editingName) {
                let $tab = $tab_name.parent();
                let index = self._$dagTabs.index($tab);
                self._activeUserDags[index].setName($tab_name.text());
                const dagList: DagList = DagList.Instance;
                dagList.changeName(newName, self._keys[index]);
            }
            $tab_input.remove();
        });

        this._getManagerDataAsync();
    }

    private _getJSON(): DagTabManagerJSON {
        return {
            "id": this._unique_id,
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
            self._unique_id = ManagerData.id;
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
                        this._switchTabs(this._$dagTabs.last());
                        DagView.redraw();
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
            if (this._$dagTabs != null && this._$dagTabs.length > 0) {
                this._switchTabs($(this._$dagTabs[0]));
            } else {
                this.reset();
            }
        });
    }

    // Clicking a tab activates the dataflow connected
    // to the tab.
    private _switchTabs($tab: JQuery): void {
        this._$dagTabs.removeClass("active");
        this._$dataFlowAreas.removeClass("active");
        $tab.addClass("active");
        let index = this._$dagTabs.index($tab);
        let dataflowArea = this._$dataFlowAreas.get(index);
        $(dataflowArea).addClass("active");
        DagView.switchActiveDagTab(this._activeUserDags[index]);
    }

    // Deletes the tab represented by $tab
    private _deleteTab($tab: JQuery): void {
        if (this._$dagTabs.length == 1) {
            return;
        }
        let index = this._$dagTabs.index($tab);
        if ($tab.hasClass("active")) {
            this._$dagTabs.removeClass("active");
            this._$dataFlowAreas.removeClass("active");
            if (index > 0) {
                this._switchTabs($(this._$dagTabs[index-1]));
            } else if (this._$dagTabs.length > 1) {
                this._switchTabs($(this._$dagTabs[index+1]));
            }
        }
        this._activeUserDags.splice(index, 1);
        this._keys.splice(index,1);
        let json = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json),true,true);
        $tab.remove();
        this._$dagTabs = $("#dagTabSectionTabs .dagTab");
        $(this._$dataFlowAreas.get(index)).remove();
        this._$dataFlowAreas = $("#dagView .dataflowArea");
        if (this._$dagTabs.length == 1) {
            $("#dagTabSectionTabs .dagTab .after").addClass("xc-hidden")
        }
    }

    // Creates a new Tab and dataflow.
    private _newTab(): void {
        let uid = this._unique_id;
        let key = KVStore.getKey("gDagManagerKey") + "-DF-" + uid;
        let name = "Dataflow " + uid;
        this._unique_id++;
        this._keys.push(key);
        let newTab = new DagTab(name, uid, key, new DagGraph());
        this._activeUserDags.push(newTab);
        let json = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json), true, true);
        newTab.saveTab();
        const dagList: DagList = DagList.Instance;
        dagList.addDag(name, key);
        this._addTabHTML('Dataflow ' + uid );
        let $tab = this._$dagTabs.last();
        this._switchTabs($tab);
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
     */
    private _addTabHTML(name: string): void {
        name = xcHelper.escapeHTMLSpecialChar(name);
        let html = '<li class="dagTab"><div class="name">' + name +
                    '</div><div class="after"><i class="icon xi-close-no-circle"></i></div></li>';
        this._$dagTabArea.append(html);
        this._$dagTabs = $("#dagTabSectionTabs .dagTab");
        $(".dataflowWrap").append(
            '<div class="dataflowArea">\
            <div class="sizer"></div>\
            <svg class="mainSvg"></svg>\
            </div>'
        );
        this._$dataFlowAreas = $("#dagView .dataflowArea");
        if (this._$dagTabs.length > 1) {
            $("#dagTabSectionTabs .dagTab .after").removeClass("xc-hidden")
        } else {
            $("#dagTabSectionTabs .dagTab .after").addClass("xc-hidden")
        }
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
        this._deleteTab($(this._$dagTabs.get(index)));
        return true;
    }

    /**
     * Either loads up a new tab or switches to an existing one.
     * @param key Key for the dagTab we want to load
     */
    public loadTab(key: string): void {
        // Check if we already have the tab
        const index: number = this._keys.indexOf(key);
        if (index != -1) {
            this._switchTabs($(this._$dagTabs.get(index)));
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
                this._addTabHTML(tabJSON.name);
                this._switchTabs(this._$dagTabs.last());
                DagView.redraw();
                this._keys.push(key);
                let json: DagTabManagerJSON = this._getJSON();
                this._dagKVStore.put(JSON.stringify(json), true, true);
            }
        });
    }

    /**
     * Resets keys and tabs in the case of error.
     */
    public reset(): void {
        this._unique_id = 1;
        this._keys = [];
        this._newTab();
    }

    // Used for testing/simple setup.
    public demoTabs(): void {
        this._newTab();
        this._newTab();
    }
}