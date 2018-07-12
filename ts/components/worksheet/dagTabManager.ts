// dagTabManager is in charge of managing and loading dataflows
// depending on which tab is selected.

class DagTabManager{
    private static _instance: DagTabManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _$dagTabArea: JQuery; // $(".dagTabSectionTabs");
    private _$dagTabs: JQuery; // $(".dagTab")
    private _$dataFlowAreas: JQuery; // $(".dataflowArea")
    private _activeUserDags: DagTab[];



    public setup(): void {
        const self = this;
        self._$dagTabArea = $(".dagTabSectionTabs");
        self._$dagTabs = $(".dagTab");
        self._$dataFlowAreas = $(".dataflowArea");

        this.demoTabs();

        
        self._$dagTabArea.on("click", ".dagTab", function() {
            var $tab = $(this);
            self._switchTabs($tab);
        });

        // Adding a new tab creates a new tab and adds 
        // The html for a dataflowArea.
        $("#tabButton").on("click", function(){
            self._newTab();
        });
    }

    // Clicking a tab activates the dataflow connected
    // to the tab.
    private _switchTabs($tab: JQuery): void {
        this._$dagTabs.removeClass("active");
        this._$dataFlowAreas.removeClass("active");
        $tab.addClass("active");
        let index = this._$dagTabs.index($tab);
        console.log(index);
        this._activeUserDags[index].initializeTab();
        let dataflowArea = this._$dataFlowAreas.get(index);
        $(dataflowArea).addClass("active");
    }

    private _newTab(): void {
        let size = (this._$dagTabs.length + 1);
        console.log(size);
        // obviously this isn't a unique ID. Unique ID's coming with storage.
        this._activeUserDags.push(new DagTab("Dataflow " + size,size));
        console.log(this._activeUserDags);
        var $newTab = '<li class="dagTab">Dataflow ' + size + '</li>';
        $($newTab).insertAfter(this._$dagTabs.last());
        this._$dagTabs = $(".dagTab");
        $(".dataflowWrap").append(
                '<div class="dataflowArea">\
                <div class="sizer"></div>\
                </div>'
        );
        this._$dataFlowAreas = $(".dataflowArea");
    }

    // Used for testing/simple setup.
    private demoTabs(): void {
        this._activeUserDags = [];
        this._activeUserDags.push(new DagTab("Dataflow",1));
        this._activeUserDags.push(new DagTab("Dataflow 2",2));
    }
}