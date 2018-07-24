// dagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.

interface TabManagerJSON {
    id: number,
    dagKeys: string[]
}

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
        self._keys = [];
        let key = KVStore.getKey("gDagManagerKey");
        self._dagKVStore = new KVStore(key, gKVScope.WKBK);
        self._activeUserDags = [];


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
            $("<input type='text'>").appendTo($tab_name).focus();
        });

        self._$dagTabArea.on("focusout", "input", function() {
            let $tab_input = $(this);
            let $tab_name = $(this).parent();
            $tab_name.text($tab_input.val() || self._editingName);

            let $tab = $tab_name.parent();
            let index = self._$dagTabs.index($tab);
            self._activeUserDags[index].setName($tab_name.text());
            $tab_input.remove();
        });

        this._getManagerDataAsync();
    }

    private _getJSON(): TabManagerJSON {
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
                self._unique_id = 1;
                self._keys = [];
                return;
            }
            self._unique_id = ManagerData.id;
            self._keys = ManagerData.dagKeys;
            self._loadDagTabs(ManagerData.dagKeys);
        })
        .fail(function() {
            self._unique_id = 1;
            self._keys = [];
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
                    const tabJSON: TagJSON = tab.getJSON();
                    if (tabJSON.name == null) {
                        innerDeferred.resolve();
                        return;
                    } else {
                        // Success Case
                        self._addDagTab(tab);
                        self._addTabHTML(tabJSON.name);
                        innerDeferred.resolve();
                    }
                });
                return innerDeferred.promise();
            }).bind(this);
            promises.push(promise);
        }
        //Use a chain to ensure all are run sequentially.
        PromiseHelper.chain(promises);
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
    }

    // Deletes the tab represented by $tab
    private _deleteTab($tab: JQuery): void {
        this._$dagTabs.removeClass("active");
        this._$dataFlowAreas.removeClass("active");
        let index = this._$dagTabs.index($tab);
        this._activeUserDags[index].delete();
        this._activeUserDags.splice(index, 1);
        this._keys.splice(index,1);
        let json = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json),true,true);
        $tab.remove();
        this._$dagTabs = $("#dagTabSectionTabs .dagTab");
        $(this._$dataFlowAreas.get(index)).remove();
        this._$dataFlowAreas = $("#dagView .dataflowArea");
    }

    // Creates a new Tab.
    private _newTab(): void {
        let uid = this._unique_id;
        let key = KVStore.getKey("gDagManagerKey") + "-DF-" + uid;
        this._unique_id++;
        this._keys.push(key);
        // obviously this isn't a unique ID. Unique ID's coming with storage.
        let newTab = new DagTab("Dataflow " + uid, uid, key, new DagGraph());
        this._activeUserDags.push(newTab);
        let json = this._getJSON();
        this._dagKVStore.put(JSON.stringify(json), true, true);
        // TODO: Store actual dagGraph once serialize is done.
        newTab.saveTab();
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
    }

    /**
     * Resets keys and tabs in the case of error.
     */
    public reset(): void {
        this._unique_id = 1;
        this._keys = [];
    }

    // Used for testing/simple setup.
    public demoTabs(): void {
        this._newTab();
        this._newTab();
    }
}