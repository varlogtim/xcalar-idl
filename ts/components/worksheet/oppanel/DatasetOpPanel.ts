/**
 * The operation editing panel for Dataset operator
 */
class DatasetOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // $('#datasetOpPanel');
    private _dsList: ListDSInfo[]; // List of datasets
    private _dsObject: DatasetBrowseFolder; //Object holding all the datasets
    private _currentPath: string[];
    private _futurePath: string[];
    private _$datasetList: JQuery; // $("#dsOpListSection");
    private _advMode: boolean;
    private _dagNode: DagNodeDataset;

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'datasetOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#datasetOpPanel');
        this._$datasetList = $("#dsOpListSection");
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._dsObject = { folders:{}, datasets: [] };
        this._setupDatasetList();
        this._currentPath = [];
        this._futurePath = [];
        this._renderList();
        this._registerHandlers();
    }

    private _setupDatasetList(): void {
        this._dsList = DS.listDatasets();
        let path: string = "";
        let splitPath: string[] = [];
        let obj: DatasetBrowseFolder = this._dsObject;
        let splen = 0;
        for (let i = 0; i < this._dsList.length; i++) {
            obj = this._dsObject;
            path = this._dsList[i].path;
            splitPath = path.split("/");
            splen = splitPath.length;
            for (let j = 1; j < splen - 1; j++) {
                if (obj.folders[splitPath[j]] == null) {
                    obj.folders[splitPath[j]] = { folders:{}, datasets: [] };
                }
                obj = obj.folders[splitPath[j]];
            }
            obj.datasets.push({name: splitPath[splen - 1], id: this._dsList[i].id});
        }
    }

    private _convertAdvConfigToModel() {
        return <DagNodeDatasetInput>JSON.parse(this._editor.getValue());
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const prefix: string = this._$elemPanel.find(".datasetPrefix input").val();
            let id: string = this._$datasetList.find(".li.datasetName.active").data('id') || "";
            const paramStr = JSON.stringify({"prefix": prefix, "source": id}, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeDatasetInput = this._convertAdvConfigToModel();
                this._resetCurrentPath();
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                StatusBox.show(e, $("#datasetOpPanel .modalTopMain"),
                    false, {'side': 'right'});
                return;
            }
        }
        return null;
    }

    private _renderList() {
        this._$datasetList.empty();
        let html: string = "";
        let curObj: DatasetBrowseFolder = this._dsObject;
        let path: string = "";
        const pathLen: number = this._currentPath.length;
        // Wind down the path
        for (let i = 0; i < pathLen; i++) {
            // Only show the last two
            if (i < pathLen - 2) {
                path += '...' + '/';
            } else {
                path += this._currentPath[i] + '/';
            }
            curObj = curObj.folders[this._currentPath[i]];
        }
        // Add datasets
        for (let i = 0; i < curObj.datasets.length; i++) {
            html += "<li class='li datasetName' data-id='" + curObj.datasets[i].id + "'>" +
                "<i class='gridIcon icon xi_data'></i>" +
                "<div class='name'>" + curObj.datasets[i].name + "</div>" +
                "<i class='viewTable icon xi-show'" +
                " data-toggle='tooltip' data-placement'top' " +
                "data-container='body' data-original-title='Preview Dataset' ></i></li>";
        }
        // Add folders
        const keys: string[] = Object.keys(curObj.folders);
        for (let i = 0; i < keys.length; i++) {
            // TODO: what if their folder is called datasets
            html += "<li class='li folderName'><i class='gridIcon icon xi-folder'></i>" +
                "<div class='name'>" + keys[i] + "</div>" +
                "</li>";
        }
        $("#datasetOpBrowser .path").text(path);
        $(html).appendTo("#dsOpListSection");
    }

    private _registerHandlers() {
        const self = this;

        this._$datasetList.on("click", ".xi-show", function() {
            if ($(this).hasClass("showing")) {
                $(this).removeClass("showing");
                DagTable.Instance.close();
            } else {
                $("#dsOpListSection .showing").removeClass("showing");
                $(this).addClass("showing");
                const $dataset: JQuery = $(this).parent();
                const id: string = $dataset.data("id");
                const viewer: XcDatasetViewer = new XcDatasetViewer(DS.getDSObj(id));
                DagTable.Instance.show(viewer);
            }
        });

        this._$datasetList.on("click", ".li", function() {
            $("#dsOpListSection .li.active").removeClass("active");
            $(this).addClass("active");
        });

        this._$datasetList.on("dblclick", ".folderName", function() {
            self._currentPath.push($(this).text());
            self._futurePath = [];
            $('#datasetOpPanel .forwardFolderBtn').addClass('xc-disabled');
            self._renderList();
            $('#datasetOpPanel .backFolderBtn').removeClass('xc-disabled');
        });

        $('#datasetOpPanel .backFolderBtn').click(function() {
            self._futurePath.push(self._currentPath.pop());
            $('#datasetOpPanel .forwardFolderBtn').removeClass('xc-disabled');
            self._renderList();
            if (self._currentPath.length == 0) {
                $('#datasetOpPanel .backFolderBtn').addClass('xc-disabled');
            }
        });

        $('#datasetOpPanel .forwardFolderBtn').click(function() {
            self._currentPath.push(self._futurePath.pop());
            $('#datasetOpPanel .backFolderBtn').removeClass('xc-disabled');
            self._renderList();
            if (self._futurePath.length == 0) {
                $('#datasetOpPanel .forwardFolderBtn').addClass('xc-disabled');
            }
        });

    }

    private _resetCurrentPath() {
        this._currentPath = [];
        this._futurePath = [];
        $('#datasetOpPanel .backFolderBtn').addClass('xc-disabled');
        $('#datasetOpPanel .forwardFolderBtn').addClass('xc-disabled');
    }

    private _restorePanel(input: DagNodeDatasetInput): void {
        if (input == null || input.source == "") {
            this._resetCurrentPath();
            this._renderList();
            $("#datasetOpPanel .datasetPrefix input").val("");
        } else {
            const ds: ListDSInfo = this._dsList.find((obj) => {
                return obj.id == input.source;
            })
            if (ds == null) {
                if (!this._advMode) {
                    StatusBox.show(DSTStr.InvalidPriorDataset + input.source, this._$datasetList,
                        false, {'side': 'right'});
                    this._dagNode.beErrorState(DSTStr.InvalidPriorDataset + input.source);
                }
                this._resetCurrentPath();
                this._renderList();
                return;
            }
            $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
            const path: string = ds.path;
            this._currentPath = [];
            this._futurePath = [];
            let splitPath: string[] = path.split('/');
            for (let i = 1; i < splitPath.length - 1; i++) {
                this._currentPath.push(splitPath[i]);
            }
            if (this._currentPath.length > 0) {
                $('#datasetOpPanel .backFolderBtn').removeClass('xc-disabled');
            }
            this._renderList();
            $("#dsOpListSection").find("[data-id='" + input.source +"']").eq(0).addClass("active");
        }
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeDataset, options?): void {
        // Show panel
        if (!super.showPanel(null, options)) {
            return;
        }
        this._dagNode = dagNode;
        this._resetCurrentPath();
        this._dsObject = { folders: {}, datasets: [] };
        this._setupDatasetList();
        this._restorePanel(dagNode.getParam());
        // Setup event listeners
        this._setupEventListener(dagNode);
        MainMenu.setFormOpen();
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        MainMenu.setFormClose();
        DatasetColRenamePanel.Instance.close();
    }

    private _checkOpArgs(prefix: string, id: string): boolean {
        let error: string = null;
        let $location: JQuery = null;
        if (prefix == null || id == null) {
            error = "Please select a dataset source and provide a prefix."
            $location = $("#datasetOpPanel .btn-submit");
        } else if (DS.getDSObj(id) == null) {
            error = "Invalid dataset source selected."
            $location = $("#datasetOpPanel #dsOpListSection");
        } else {
            error = xcHelper.validatePrefixName(prefix);
            $location = $("#datasetOpPanel .datasetPrefix .inputWrap");
        }

        if (this._advMode) {
            $location = $("#datasetOpPanel .advancedEditor");
        }

        if (error != null) {
            StatusBox.show(error, $location,
                false, {"side": "top"});
            return false;
        }
        return true;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(dagNode: DagNodeDataset): void {
        // Clear existing event handlers
        this._$elemPanel.off(`.${DatasetOpPanel._eventNamespace}`);

        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${DatasetOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${DatasetOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(dagNode); }
        );
    }

    private _submitForm(dagNode: DagNodeDataset): void {
        let prefix: string;
        let id: string;
        if (this._advMode) {
            try {
                const newModel: DagNodeDatasetInput = this._convertAdvConfigToModel();
                prefix = newModel.prefix;
                id = newModel.source;
            } catch (e) {
                StatusBox.show(e, $("#datasetOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            prefix = this._$elemPanel.find(".datasetPrefix input").val();
            id = this._$datasetList.find(".li.datasetName.active").data('id');
        }
        if (!this._checkOpArgs(prefix, id)) {
            return;
        }

        const oldParam: DagNodeDatasetInput = dagNode.getParam();
        if (oldParam.source === id && oldParam.prefix === prefix) {
            // no change
            this.close(true);
            return;
        }

        const oldColumns: ProgCol[] = dagNode.getLineage().getColumns();
        const $bg: JQuery = $("#initialLoadScreen");
        $bg.show();

        dagNode.setParam({
            source: id,
            prefix: prefix
        })
        .then(() => {
            $bg.hide();

            if (oldParam.source === id) {
                // only the prefix changed so we automatically do the map
                // without prompting the user
                const renameMap = {
                    columns: {},
                    prefixes: {}
                }
                oldColumns.forEach((col) => {
                    renameMap.columns[col.getBackColName()] =
                       xcHelper.getPrefixColName(prefix, col.getFrontColName());

                });
                renameMap.prefixes[oldParam.prefix] = prefix;
                const dagGraph = DagView.getActiveDag();
                dagGraph.applyColumnMapping(dagNode.getId(), renameMap);
                this.close();
            } else if (oldColumns.length) {
                this._$elemPanel.find(".opSection, .mainContent > .bottomSection").hide();
                DatasetColRenamePanel.Instance.show(dagNode, oldColumns, {
                    onClose: () => {
                        this.close(true);
                        this._$elemPanel.find(".opSection, .mainContent > .bottomSection").show();
                    }
                });
            } else {
                this.close(true);
            }
        }).fail((error) => {
            $bg.hide();
            console.error(error);
            StatusBox.show(JSON.stringify(error), this._$elemPanel.find(".btn-submit"),
                false, {"side": "top"});
        });
    }
}