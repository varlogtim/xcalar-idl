/**
 * The operation editing panel for Dataset operator
 */
class DatasetOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // $('#datasetOpPanel');
    private _dsList: ListDSInfo[]; // List of datasets
    private _fileLister: FileLister;
    private _$datasetList: JQuery; // $("#dsOpListSection");
    private _advMode: boolean;
    private _dagNode: DagNodeDataset;
    private _currentSource: string;

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
        $("#datasetOpBrowser ul").attr("id", "dsOpListSection");
        this._$datasetList = $("#dsOpListSection");
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._setupFileLister();
        this._registerHandlers();
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
        this._setupDatasetList();
        this._advMode = false;
        this._restorePanel(dagNode.getParam(), true);
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
        this._currentSource = null;
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string}[],
            folders: string[]
        ): string => {
            let html: HTML = "";
            // Add files
            files.forEach((file) => {
                html +=
                '<li class="fileName" data-id="' + file.id + '">' +
                    '<i class="gridIcon icon xi_data"></i>' +
                    '<div class="name">' + file.name + '</div>' +
                    '<i class="viewTable icon xi-show"' +
                    ' data-toggle="tooltip"' +
                    ' data-placement"top"' +
                    ' data-container="body"' +
                    ' data-original-title="Preview Dataset" ></i>' +
                '</li>';
            });
            // Add folders
            folders.forEach((folder) => {
                // TODO: what if their folder is called datasets
                html += '<li class="folderName">' +
                            '<i class="gridIcon icon xi-folder"></i>' +
                            '<div class="name">' + folder + '</div>' +
                        '</li>';
            });
            return html;
        };
        this._fileLister = new FileLister($("#datasetOpBrowser"), {
            renderTemplate: renderTemplate,
            folderSingleClick: true
        });
    }

    private _setupDatasetList(): void {
        this._dsList = DS.listDatasets();
        this._fileLister.setFileObj(this._dsList)
    }

    private _convertAdvConfigToModel() {
        const dagInput: DagNodeDatasetInputStruct = <DagNodeDatasetInputStruct>JSON.parse(this._editor.getValue());
        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(dagInput);
            if (error) {
                throw new Error(error.error);
            }
        }
        return dagInput;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const prefix: string = this._$elemPanel.find(".datasetPrefix input").val();
            let id: string = this._currentSource || "";
            const paramStr = JSON.stringify({"prefix": prefix, "source": id}, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeDatasetInputStruct = this._convertAdvConfigToModel();
                this._fileLister.goToRootPath();
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _startInAdvancedMode() {
        this._updateMode(true);
        const paramStr = JSON.stringify(this._dagNode.getParam(), null, 4);
        this._cachedBasicModeParam = paramStr;
        this._editor.setValue(paramStr);
        this._advMode = true;
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

        this._$datasetList.on("click", "li", function() {
            $("#dsOpListSection li.active").removeClass("active");
            $(this).addClass("active");
            self._currentSource = $(this).data("id");
        });
    }

    private _restorePanel(input: DagNodeDatasetInputStruct, atStart?: boolean): void {
        if (input == null || input.source == "") {
            this._fileLister.goToRootPath();
            $("#datasetOpPanel .datasetPrefix input").val("");
        } else {
            const ds: ListDSInfo = this._dsList.find((obj) => {
                return obj.id == input.source;
            })
            this._currentSource = input.source;
            if (ds == null) {
                if (atStart) {
                   this._startInAdvancedMode();
                   return;
                }

                if (!this._advMode) {
                    StatusBox.show(DSTStr.InvalidPriorDataset + input.source, this._$datasetList,
                        false, {'side': 'right'});
                    this._dagNode.beErrorState(DSTStr.InvalidPriorDataset + input.source);
                }
                $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
                this._fileLister.goToRootPath();
                return;
            }
            $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
            const path: string = ds.path;
            this._fileLister.goToPath(path);
            $("#dsOpListSection").find("[data-id='" + input.source +"']").eq(0).addClass("active");
        }
    }

    private _checkOpArgs(prefix: string, id: string): boolean {
        let error: string = null;
        let $location: JQuery = null;
        if (prefix == null || id == null) {
            error = "Please select a dataset source and provide a prefix."
            $location = $("#datasetOpPanel .btn-submit");
        } else if (DS.getDSObj(id) == null && !xcHelper.checkValidParamBrackets(id)) {
            error = "Invalid dataset source selected."
            $location = $("#datasetOpPanel #dsOpListSection");
        } else {
            error = xcHelper.validatePrefixName(xcHelper.replaceParamForValidation(prefix));
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
                const newModel: DagNodeDatasetInputStruct = this._convertAdvConfigToModel();
                prefix = newModel.prefix;
                id = newModel.source;
            } catch (e) {
                StatusBox.show(e, $("#datasetOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            prefix = this._$elemPanel.find(".datasetPrefix input").val();
            id = this._$datasetList.find("li.fileName.active").data('id');
        }
        if (!this._checkOpArgs(prefix, id)) {
            return;
        }

        const oldParam: DagNodeDatasetInputStruct = dagNode.getParam();
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
            } else if (oldColumns.length || !dagNode.getLineage().getColumns().length) {
                this._$elemPanel.find(".opSection, .mainContent > .bottomSection").hide();
                // advancedEditor has a styling of display: block !important
                this._$elemPanel.find(".advancedEditor").addClass("xc-hidden");
                DatasetColRenamePanel.Instance.show(dagNode, oldColumns, {
                    onClose: () => {
                        this.close(true);
                        this._$elemPanel.find(".opSection, .mainContent > .bottomSection").show();
                        this._$elemPanel.find(".advancedEditor").removeClass("xc-hidden")
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