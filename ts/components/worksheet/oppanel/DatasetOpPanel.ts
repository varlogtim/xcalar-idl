/**
 * The operation editing panel for Dataset operator
 */
class DatasetOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // $('#datasetOpPanel');
    private _dsList: ListDSInfo[]; // List of datasets
    private _fileLister: FileLister;
    private _$datasetList: JQuery; // $("#dsOpListSection");
    private _advMode: boolean;
    protected _dagNode: DagNodeDataset;
    private _schemaSection: ColSchemaSection;
    private _dagGraph: DagGraph;
    private _synthesize: boolean;
    private _loadArgs: string;
    private _currentStep: number;

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
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
        this._setupFileLister();
        this._addEventListeners();
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
        this._currentStep = 1;
        this._gotoStep();
        this._dagGraph = DagView.getActiveDag();
        const model = $.extend(dagNode.getParam(), {
            schema: dagNode.getSchema(true) || []
        });
        this._restorePanel(model, true);
        MainMenu.setFormOpen();
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        MainMenu.setFormClose();
        DatasetColRenamePanel.Instance.close();
        this._dagGraph = null;
        this._synthesize = null;
        this._loadArgs = null;
        this._currentStep = null;
        this._advMode = false;
        DagTable.Instance.closeDatasetPreview();
    }

    private _getSchemaSection(): JQuery {
        return this.$panel.find(".colSchemaSection");
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string, options: {inActivated: boolean}}[],
            folders: string[]
        ): string => {
            let html: HTML = "";
            // Add files
            files.forEach((file) => {
                if (file.options.inActivated) {
                    html +=
                    '<li class="fileName inActivated"' +
                    ' data-toggle="tooltip"' +
                    ' data-placement"top"' +
                    ' data-container="body"' +
                    ' data-original-title="' + DSTStr.inActivated + '"' +
                    ' data-id="' + file.id + '">' +
                        '<i class="gridIcon icon xi_data"></i>' +
                        '<div class="name">' + file.name + '</div>' +
                    '</li>';
                } else {
                    html +=
                    '<li class="fileName" data-id="' + file.id + '">' +
                        '<i class="gridIcon icon xi_data"></i>' +
                        '<div class="name">' + file.name + '</div>' +
                        '<i class="viewTable icon xi-show"' +
                        ' data-toggle="tooltip"' +
                        ' data-placement"top"' +
                        ' data-container="body"' +
                        ' data-original-title="' + DSTStr.Preview + '"></i>' +
                    '</li>';
                }
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
        const sharedOnly: boolean = DagView.getActiveTab() instanceof DagTabPublished;
        const rootPath: string = sharedOnly ? DSObjTerm.SharedFolder : DSTStr.Home;
        this._dsList = DS.listDatasets(sharedOnly);
        this._fileLister.setRootPath(rootPath);
        this._fileLister.setFileObj(this._dsList)
    }

    private _convertAdvConfigToModel(): {
        prefix: string,
        source: string,
        synthesize: boolean,
        schema: ColSchema[],
        loadArgs: string
    } {
        const input = JSON.parse(this._editor.getValue());
        if (JSON.stringify(input, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(input);
            if (error) {
                throw new Error(error.error);
            }
        }
        return input;
    }

    private _toggleSynthesize(synthesize: boolean, schema: ColSchema[]): void {
        this._synthesize = synthesize;
        const $prefix: JQuery = this._getPrefixInput();
        if (this._synthesize) {
            $prefix.addClass("xc-disabled");
        } else {
            $prefix.removeClass("xc-disabled");
        }
        this._schemaSection.render(schema);
    }

    private _normalizePrefix(prefix: string) {
        return this._synthesize ? null : prefix;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const id: string = this._getSource();
            this._fetchLoadArgs(id)
            .then((loadArgs) =>  {
                this._loadArgs = loadArgs;
                const json = {
                    prefix: this._getPrefix(),
                    source: this._getSource() || "",
                    schema: this._schemaSection.getSchema(true),
                    synthesize: this._synthesize || false,
                    loadArgs: loadArgs
                };
                const paramStr = JSON.stringify(json, null, 4);
                this._cachedBasicModeParam = paramStr;
                this._editor.setValue(paramStr);
                this._advMode = true;
            });
        } else {
            try {
                const newModel = this._convertAdvConfigToModel();
                this._fileLister.goToRootPath();
                this._restorePanel(newModel);
                this._advMode = false;
            } catch (e) {
                return {error: e};
            }
        }
        this._gotoStep();
        return null;
    }

    protected _startInAdvancedMode(model) {
        this._updateMode(true);
        const paramStr = JSON.stringify(model, null, 4);
        this._cachedBasicModeParam = paramStr;
        this._editor.setValue(paramStr);
        this._advMode = true;
        this._gotoStep();
    }

    private _autoDetectSchema(userOldSchema: boolean): {error: string} {
        const source: string = this._getSource();
        const oldParam: DagNodeDatasetInputStruct = this._dagNode.getParam();
        let oldSchema: ColSchema[] = null;
        if (userOldSchema &&
            source != null &&
            source === oldParam.source
        ) {
            // when only has prefix change
            oldSchema = this._schemaSection.getSchema(true);
        }

        const res = DS.getSchema(source);
        if (res.error == null) {
            const schema = res.schema;
            this._schemaSection.setInitialSchema(schema);
            this._schemaSection.render(oldSchema || schema);
            return null;
        } else {
            return {error: res.error}
        }
    }

    private _gotoStep(): void {
        let btnHTML: HTML = "";
        const $section: JQuery = this.$panel.find(".mainContent > .bottomSection");
        if (this._advMode) {
            btnHTML =
                '<button class="btn btn-submit btn-rounded submit">' +
                    CommonTxtTstr.Save +
                '</button>';
        } else if (this._currentStep === 1) {
            $section.find(".step1").removeClass("xc-hidden")
                    .end()
                    .find(".step2").addClass("xc-hidden");
            btnHTML =
                '<button class="btn btn-next btn-rounded next">' +
                    CommonTxtTstr.Next +
                '</button>';
        } else if (this._currentStep === 2) {
            $section.find(".step2").removeClass("xc-hidden")
                    .end()
                    .find(".step1").addClass("xc-hidden");
            btnHTML =
                '<button class="btn btn-submit btn-rounded submit">' +
                    CommonTxtTstr.Save +
                '</button>' +
                '<button class="btn btn-back btn-rounded back">' +
                    CommonTxtTstr.Back +
                '</button>';
        } else {
            throw new Error("Error step");
        }
        $section.find(".btnWrap").html(btnHTML);
    }

    private _goToSchemaStep(): void {
        let prefix: string = this._getPrefix();
        const id = this._getSource();
        if (!this._checkOpArgs(prefix, id)) {
            return;
        }
        const $nextBtn: JQuery = this.$panel.find(".bottomSection .next");
        const dsObj = DS.getDSObj(id);
        if (dsObj && !dsObj.activated) {
            StatusBox.show(ErrTStr.InactivatedDS2, $nextBtn, false);
            return;
        }

        this._renderPrefixHint(prefix);
        this._fetchLoadArgs(id)
        .then((loadArgs) => {
            this._loadArgs = loadArgs;
            xcHelper.disableSubmit($nextBtn);
            const res = this._autoDetectSchema(true);
            if (res != null) {
                // error case
                return PromiseHelper.reject({error: res.error});
            } else {
                this._currentStep = 2;
                this._gotoStep();
            }
        })
        .fail((error) => {
            StatusBox.show(error.error, $nextBtn, false);
        })
        .always(() => {
            xcHelper.enableSubmit($nextBtn);
        });
    }

    private _renderPrefixHint(prefix: string) {
        const $schemaSection: JQuery = this._getSchemaSection();
        prefix = this._normalizePrefix(prefix);
        $schemaSection.find(".prefixSection").remove();
        if (prefix != null) {
            const html: HTML = '<div class="prefixSection">' +
                                    'Prefix: ' + prefix +
                                '</div>';
            $schemaSection.find(".buttonSection").prepend(html);
        }

    }

    private _addEventListeners() {
        const $panel: JQuery = this.$panel;
        $panel.on("click", ".close, .cancel", () => {
            this.close();
        });

        $panel.on("click", ".next", () => {
            this._goToSchemaStep();
        });

        $panel.on("click", ".back", () => {
            this._currentStep = 1;
            this._gotoStep();
        });

        $panel.on("click", ".submit", () => {
            this._submitForm();
        });

        this._$datasetList.on("click", ".viewTable", (event) => {
            const $btn: JQuery = $(event.currentTarget);
            if ($btn.hasClass("showing")) {
                $btn.removeClass("showing");
                DagTable.Instance.closeDatasetPreview();
            } else {
                $("#dsOpListSection .showing").removeClass("showing");
                $btn.addClass("showing");
                const $dataset: JQuery = $btn.parent();
                const id: string = $dataset.data("id");
                DagTable.Instance.previewDataset(id);
            }
        });

        this._$datasetList.on("click", "li", (event) => {
            const $li = $(event.currentTarget);
            if ($li.hasClass("inActivated")) {
                return;
            }
            $("#dsOpListSection li.active").removeClass("active");
            $li.addClass("active");
            const $prefixInput: JQuery = this._getPrefixInput();
            if ($li.hasClass("fileName")) {
                let prefix: string = $li.find(".name").text();
                prefix = xcHelper.normalizePrefix(prefix);
                $prefixInput.val(prefix);
            } else {
                $prefixInput.val("");
            }
        });

        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", (event) => {
            const error = this._autoDetectSchema(false);
            if (error != null) {
                StatusBox.show(ErrTStr.DetectSchema, $(event.currentTarget), false, {
                    detail: error.error
                });
            }
        });
    }

    private _restorePanel(
        input: {
            prefix: string,
            source: string,
            synthesize: boolean,
            loadArgs: string,
            schema: ColSchema[]
        },
        atStart?: boolean
    ): void {
        this._loadArgs = input.loadArgs;
        if (input == null || input.source == "") {
            this._fileLister.goToRootPath();
            $("#datasetOpPanel .datasetPrefix input").val("");
            this._toggleSynthesize(false, []);
        } else {
            $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
            const schema: ColSchema[] = input.schema || [];
            this._toggleSynthesize(input.synthesize, schema);
            const ds: ListDSInfo = this._dsList.find((obj) => {
                return obj.id == input.source;
            });
            if (ds == null) {
                if (atStart) {
                    this._startInAdvancedMode(input);
                    MainMenu.checkMenuAnimFinish()
                    .then(() => {
                        StatusBox.show(DSTStr.InvalidPriorDataset + input.source,
                                    this._$elemPanel.find(".advancedEditor"),
                                    false, {'side': 'right'});
                    });

                    this._dagNode.beErrorState(DSTStr.InvalidPriorDataset + input.source);
                    return;
                }

                $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
                this._fileLister.goToRootPath();
                return;
            } else {
                const path: string = ds.path;
                this._fileLister.goToPath(path);
                $("#dsOpListSection").find("[data-id='" + input.source +"']").eq(0).addClass("active");
            }
        }
    }

    private _checkOpArgs(prefix: string, id: string): boolean {
        const $panel: JQuery = this.$panel;
        let error: string = null;
        let $location: JQuery = null;
        if (prefix == null || id == null) {
            error = "Please select a dataset source and provide a prefix."
            $location = $panel.find(".btn-submit");
        } else if (DS.getDSObj(id) == null && !xcHelper.checkValidParamBrackets(id)) {
            error = "Invalid dataset source selected."
            $location = $("#dsOpListSection");
        } else {
            error = xcHelper.validatePrefixName(xcHelper.replaceParamForValidation(prefix));
            $location = $panel.find(".datasetPrefix .inputWrap");
        }

        if (this._advMode) {
            $location = $panel.find(".advancedEditor");
        }

        if (error != null) {
            StatusBox.show(error, $location, false, {side: "right"});
            return false;
        }
        return true;
    }

    private _getSource(): string {
        return this._$datasetList.find("li.fileName.active").data('id');
    }

    private _getPrefix(): string {
        return this._getPrefixInput().val().trim();
    }

    private _getPrefixInput(): JQuery {
        return this.$panel.find(".datasetPrefix input");
    }

    private _isSameSchema(oldSchema: ColSchema[], newSchema: ColSchema[]): boolean {
        if (oldSchema.length !== newSchema.length) {
            return false;
        }

        for (let i = 0; i < oldSchema.length; i++) {
            const oldColInfo = oldSchema[i];
            const newColInfo = newSchema[i];
            if (oldColInfo.type !== newColInfo.type) {
                return false;
            }
            const oldColName: string = xcHelper.parsePrefixColName(oldColInfo.name).name;
            const newColName: string = xcHelper.parsePrefixColName(newColInfo.name).name;
            if (oldColName !== newColName) {
                return false;
            }
        }
        return true;
    }

    private _fetchLoadArgs(source): XDPromise<string> {
        if (source === this._dagNode.getParam().source) {
            // when source not change, use the cached one
            return PromiseHelper.resolve(this._dagNode.getLoadArgs());
        }
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const $panel: JQuery = this._getPanel();
        $panel.addClass("loading");
        DS.getLoadArgsFromDS(source)
        .then(deferred.resolve)
        .fail(() => {
            deferred.resolve(""); // still resolve it
        })
        .always(() => {
            $panel.removeClass("loading");
        });

        return deferred.promise();
    }

    private _submitForm(): void {
        const dagNode: DagNodeDataset = this._dagNode;
        let prefix: string;
        let id: string;
        let schema: ColSchema[];
        if (this._advMode) {
            let error: string;
            try {
                const newModel = this._convertAdvConfigToModel();
                prefix = newModel.prefix;
                id = newModel.source;
                schema = newModel.schema;
                this._loadArgs = newModel.loadArgs;
                this._synthesize = newModel.synthesize;
                if (schema == null || schema.length === 0) {
                    error = ErrTStr.NoEmptySchema;
                }
            } catch (e) {
                error = e;
            }
            if (error != null) {
                StatusBox.show(error, $("#datasetOpPanel .advancedEditor"),
                false, {'side': 'right'});
                return;
            }
        } else {
            prefix = this._getPrefix();
            id = this._getSource();
            schema = this._schemaSection.getSchema(false);
        }
        if (schema == null || !this._checkOpArgs(prefix, id)) {
            return;
        }

        const oldParam: DagNodeDatasetInputStruct = dagNode.getParam();
        if (oldParam.source === id &&
            oldParam.prefix === prefix &&
            oldParam.loadArgs === this._loadArgs &&
            oldParam.synthesize === this._synthesize &&
            oldParam.synthesize === false
        ) {
            // only has schema change
            dagNode.setSchema(schema, true);
            this.close(true);
            return;
        }

        const $bg: JQuery = $("#initialLoadScreen");
        $bg.show();
        const oldSchema: ColSchema[] = dagNode.getSchema();
        const oldColumns: ProgCol[] = dagNode.getLineage().getColumns();
        const dagGraph: DagGraph = this._dagGraph;
        dagNode.setSchema(schema);

        const getLoadgArgs: XDPromise<string> = this._advMode ?
        PromiseHelper.resolve(this._loadArgs) : this._fetchLoadArgs(id);

        getLoadgArgs
        .then((dsLoadArgs) => {
            dagNode.setParam({
                source: id,
                prefix: prefix,
                synthesize: this._synthesize,
                loadArgs: dsLoadArgs
            }, true);

            $bg.hide();
            if (oldParam.source === id && this._isSameSchema(oldSchema, schema)) {
                // only the prefix changed so we automatically do the map
                // without prompting the user
                const renameMap = {
                    columns: {},
                    prefixes: {}
                };
                const normalizedPrefix = this._normalizePrefix(prefix);
                oldColumns.forEach((col) => {
                    renameMap.columns[col.getBackColName()] =
                       xcHelper.getPrefixColName(normalizedPrefix, col.getFrontColName());

                });
                renameMap.prefixes[oldParam.prefix] = normalizedPrefix;
                dagGraph.applyColumnMapping(dagNode.getId(), renameMap);
                dagNode.confirmSetParam();
                this.close();
            } else if (oldColumns.length || !dagNode.getLineage().getColumns().length) {
                this._$elemPanel.find(".opSection, .mainContent > .bottomSection").hide();
                // advancedEditor has a styling of display: block !important
                this._$elemPanel.find(".advancedEditor").addClass("xc-hidden");
                DatasetColRenamePanel.Instance.show(dagNode, oldColumns, {
                    onClose: () => {
                        dagNode.confirmSetParam();
                        this.close(true);
                        this._$elemPanel.find(".opSection, .mainContent > .bottomSection").show();
                        this._$elemPanel.find(".advancedEditor").removeClass("xc-hidden")
                    }
                });
            } else {
                dagNode.confirmSetParam();
                this.close(true);
            }
        }).fail((error) => {
            $bg.hide();
            console.error(error);
            this._dagNode.setSchema(oldSchema);
            StatusBox.show(JSON.stringify(error), this._$elemPanel.find(".btn-submit"),
                false, {"side": "right"});
        });
    }
}