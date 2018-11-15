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
    private _schemaSection: ColSchemaSection;
    private _dagGraph: DagGraph;
    private _synthesize: boolean;
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
            schema: dagNode.getSchema() || []
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
        this._currentStep = null;
        this._advMode = false;
    }

    private _getSchemaSection(): JQuery {
        return this.$panel.find(".colSchemaSection");
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

    private _convertAdvConfigToModel(): {
        prefix: string,
        source: string,
        synthesize: boolean,
        schema: ColSchema[]
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
        const $prefix: JQuery = this._$elemPanel.find(".datasetPrefix input");
        if (this._synthesize) {
            $prefix.addClass("xc-disabled");
        } else {
            $prefix.removeClass("xc-disabled");
        }
        schema = this._normalizeSchema(schema);
        this._schemaSection.render(schema);
    }

    private _normalizeSchema(schema: ColSchema[]): ColSchema[] {
        const prefix: string = this._normalizePrefix(this._getPrefix());
        return schema.map((colInfo) => {
            const colName = xcHelper.parsePrefixColName(colInfo.name).name;
            return {
                name: xcHelper.getPrefixColName(prefix, colName),
                type: colInfo.type
            };
        });
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
            const json = {
                prefix: this._getPrefix(),
                source: this._getSource() || "",
                schema: this._schemaSection.getSchema(true),
                synthesize: this._synthesize || false
            };
            const paramStr = JSON.stringify(json, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
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

    private _startInAdvancedMode() {
        this._updateMode(true);
        const paramStr = JSON.stringify(this._dagNode.getParam(), null, 4);
        this._cachedBasicModeParam = paramStr;
        this._editor.setValue(paramStr);
        this._advMode = true;
    }

    private _autoDetectSchema(skipIfHasOldSchema: boolean): XDPromise<void> {
        const source: string = this._getSource();
        const oldParam: DagNodeDatasetInputStruct = this._dagNode.getParam();
        if (skipIfHasOldSchema &&
            source != null &&
            source === oldParam.source
        ) {
            // when only has prefix change
            let schema = this._schemaSection.getSchema(true);
            schema = this._normalizeSchema(schema);
            this._schemaSection.render(schema);
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.addClass("loading");

        DS.getSchema(source)
        .then((res) => {
            const schema = this._normalizeSchema(res);
            this._schemaSection.render(schema);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $schemaSection.removeClass("loading");
        });

        const promise = deferred.promise();
        xcHelper.showRefreshIcon($schemaSection, false, promise);
        return promise;
    }

    private _gotoStep(): void {
        let btnHTML: HTML = "";
        if (this._advMode) {
            btnHTML =
                '<button class="btn btn-submit btn-rounded submit">' +
                    CommonTxtTstr.Save +
                '</button>';
        } else if (this._currentStep === 1) {
            this.$panel.find(".step1").removeClass("xc-hidden")
                    .end()
                    .find(".step2").addClass("xc-hidden");
            btnHTML =
                '<button class="btn btn-next btn-rounded next">' +
                    CommonTxtTstr.Next +
                '</button>';
        } else if (this._currentStep === 2) {
            this.$panel.find(".step2").removeClass("xc-hidden")
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
        this.$panel.find(".bottomSection .btnWrap").html(btnHTML);
    }

    private _addEventListeners() {
        const $panel: JQuery = this.$panel;
        $panel.on("click", ".close, .cancel", () => {
            this.close();
        });

        $panel.on("click", ".next", (event) => {
            const $btn: JQuery = $(event.currentTarget);
            xcHelper.disableSubmit($btn);

            this._autoDetectSchema(true)
            .then(() => {
                this._currentStep = 2;
                this._gotoStep();
            })
            .fail((error) => {
                StatusBox.show(error.error, $btn, false);
            })
            .always(() => {
                xcHelper.enableSubmit($btn);
            });
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
                DagTable.Instance.close();
            } else {
                $("#dsOpListSection .showing").removeClass("showing");
                $btn.addClass("showing");
                const $dataset: JQuery = $btn.parent();
                const id: string = $dataset.data("id");
                const viewer: XcDatasetViewer = new XcDatasetViewer(DS.getDSObj(id));
                DagTable.Instance.show(viewer);
            }
        });

        this._$datasetList.on("click", "li", (event) => {
            $("#dsOpListSection li.active").removeClass("active");
            const $li = $(event.currentTarget);
            $li.addClass("active");
            if ($li.hasClass("fileName")) {
                const prefix = $li.find(".name").text();
                $("#datasetOpPanel .datasetPrefix input").val(prefix);
            } else {
                $("#datasetOpPanel .datasetPrefix input").val("");
            }
        });

        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", (event) => {
            this._autoDetectSchema(false)
            .fail((error) => {
                StatusBox.show(ErrTStr.DetectSchema, $(event.currentTarget), false, {
                    detail: error.error
                });
            })
        });
    }

    private _restorePanel(
        input: {
            prefix: string,
            source: string,
            synthesize: boolean,
            schema: ColSchema[]
        },
        atStart?: boolean
    ): void {
        if (input == null || input.source == "") {
            this._fileLister.goToRootPath();
            $("#datasetOpPanel .datasetPrefix input").val("");
            this._toggleSynthesize(false, []);
        } else {
            const ds: ListDSInfo = this._dsList.find((obj) => {
                return obj.id == input.source;
            });
            if (ds == null) {
                if (atStart) {
                    this._startInAdvancedMode();
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
            }
            $("#datasetOpPanel .datasetPrefix input").val(input.prefix);
            const path: string = ds.path;
            this._fileLister.goToPath(path);
            const schema: ColSchema[] = input.schema || [];
            this._toggleSynthesize(input.synthesize, schema);
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

    private _getSource(): string {
        return this._$datasetList.find("li.fileName.active").data('id');
    }

    private _getPrefix(): string {
        return this._$elemPanel.find(".datasetPrefix input").val().trim();
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

    private _submitForm(): void {
        const dagNode: DagNodeDataset = this._dagNode;
        let prefix: string;
        let id: string;
        let schema: ColSchema[];
        if (this._advMode) {
            try {
                const newModel = this._convertAdvConfigToModel();
                prefix = newModel.prefix;
                id = newModel.source;
                schema = newModel.schema;
                this._synthesize = newModel.synthesize;
            } catch (e) {
                StatusBox.show(e, $("#datasetOpPanel .advancedEditor"),
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

        schema = this._normalizeSchema(schema);
        const oldParam: DagNodeDatasetInputStruct = dagNode.getParam();
        if (oldParam.source === id &&
            oldParam.prefix === prefix &&
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
        dagNode.setParam({
            source: id,
            prefix: prefix,
            synthesize: this._synthesize
        }, true)
        .then(() => {
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
                false, {"side": "top"});
        });
    }
}