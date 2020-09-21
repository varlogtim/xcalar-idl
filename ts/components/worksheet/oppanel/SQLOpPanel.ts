/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    protected _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;
    private _identifiers: string[] = [];
    private _parsedIdentifiers: string[] = [];
    private _connectors: {label: string, nodeId: string}[] = [];
    private _queryStr = "";
    private _graph: DagGraph;
    private _labelCache: Set<string>;
    private _snippetId: string;
    private _queryStrHasError = false;
    private _outputTableName = "";
    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#sqlOpPanel');
        super.setup(this._$elemPanel);

        this._setupDropAsYouGo();
        const advancedEditor = this.getEditor();
        let timer;
        advancedEditor.on("change", (_cm, e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                advancedEditor.getValue();
                try {
                    const advancedParams = JSON.parse(advancedEditor.getValue());
                    if (!advancedParams.hasOwnProperty("sqlQueryString")) {
                        return;
                    }
                    let queryStr = advancedParams.sqlQueryString;
                    SQLSnippet.Instance.update(this._snippetId, queryStr);
                    if (SQLEditorSpace.Instance.getCurrentSnippetId() === this._snippetId) {
                        const editor = SQLEditorSpace.Instance.getEditor();
                        editor.setValue(queryStr);
                        editor.refresh();
                    }
                } catch(e) {}
            }, 500);
        });
    }

        /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQL, options?): void {
        this._dagNode = dagNode;
        this._dataModel = new SQLOpPanelModel(dagNode);
        this._queryStr = "";
        this._queryStrHasError = false;
        let error: string;
        this._graph = DagViewManager.Instance.getActiveDag();
        this._identifiers = [];
        this._parsedIdentifiers = [];
        this._connectors = [];
        this._labelCache = new Set();
        this._outputTableName = this._dataModel.getOutputTableName();
        this._dataModel.getIdentifiers().forEach((value, key) => {
            this._identifiers[key - 1] = value;
            const parentNode =  this._dagNode.getParents()[key - 1];
            if (parentNode) {
                this._connectors[key - 1] = {
                    label: parentNode.getTitle(),
                    nodeId: parentNode.getId()
                }
            } else {
                this._connectors[key - 1] = {
                    label: "",
                    nodeId: null
                }
            }
        });
        this._dagNode.getParents().forEach((parentNode, i) => {
            this._connectors[i] = {
                label: parentNode.getTitle(),
                nodeId: parentNode.getId()
            };
        });

        try {
            this._updateUI();
        } catch (e) {
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }

        super.showPanel(null, options)
        .then(() => {
            if (error) {
                this._startInAdvancedMode(error);
            } else if (BaseOpPanel.isLastModeAdvanced) {
                this._switchModes(true);
                this._updateMode(true);
            }
        });
    }
    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean, noTab?: boolean): void {
        if (!this.isOpen()) {
            return;
        }
        super.hidePanel(isSubmit);
        this._identifiers = [];
        this._parsedIdentifiers = [];
        this._connectors = [];
        this._graph = null;
        this._queryStrHasError = false;
        this.updateIdentifiersList();
        if (!noTab) {
            SQLTabManager.Instance.closeTempTab();
        }
    }

    private _selectQuery(snippetId: string, queryStr?: string, forceUpdate?: boolean): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
        if (snippet) {
            if (queryStr == null) {
                queryStr = snippet.snippet;
            }
        }
        queryStr = queryStr || "";
        this.$panel.find(".editorWrapper").text(queryStr);
        this._queryStr = queryStr;
        this._$elemPanel.find(".identifiersSection").addClass("disabled");
        SQLUtil.getSQLStruct(queryStr)
        .then((ret) => {
            if (this.isOpen() && this._queryStr === queryStr) {
                this._queryStrHasError = false;
                if (!forceUpdate && !ret.identifiers.length && this._identifiers.length &&
                    (ret.sql.toLowerCase().includes(" from ") ||
                    (queryStr.toLowerCase().includes("from") &&
                    queryStr.toLowerCase().includes("select")))) {
                    return;
                }
                if (forceUpdate) {
                    this._identifiers = [];
                }
                this._parsedIdentifiers = ret.identifiers;
                this._identifiers.length = Math.min(this._parsedIdentifiers.length, this._identifiers.length);
                this.updateIdentifiersList();
            }
        })
        .fail((e) => {
            if (!this.isOpen() || this._queryStr !== queryStr) {
                return;
            }
            if (!forceUpdate && this._identifiers.length && queryStr &&
                (queryStr.toLowerCase().includes("from") &&
                queryStr.toLowerCase().includes("select"))) {
                    this._queryStrHasError = true;
                    this._updateHintMessage();
                return;
            }
            if (queryStr.trim().length) {
                this._queryStrHasError = true;
            } else {
                this._queryStrHasError = false;
            }
            this._identifiers = [];
            this._parsedIdentifiers = [];
            this.updateIdentifiersList();
            console.error(e);
        })
        .always(() => {
            this._$elemPanel.find(".identifiersSection").removeClass("disabled");
            deferred.resolve();
        });
        return deferred.promise();
    }

    private _getDropAsYouGoSection(): JQuery {
        return this.$panel.find(".dropAsYouGo");
    }

    private _isDropAsYouGo(): boolean {
        let $checkboxSection = this._getDropAsYouGoSection();
        return $checkboxSection.find(".checkbox").hasClass("checked");
    }

    private _toggleDropAsYouGo(checked: boolean): void {
        let $checkbox = this._getDropAsYouGoSection().find(".checkbox");
        if (checked == null) {
            checked = !$checkbox.hasClass("checked");
        }

        if (checked === true) {
            $checkbox.addClass("checked");
        } else if (checked === false) {
            $checkbox.removeClass("checked");
        }
    }

    private _setupDropAsYouGo(): void {
        let $dropAsYouGo = this._getDropAsYouGoSection();
        $dropAsYouGo.on("click", ".checkbox, .text", () =>{
            this._toggleDropAsYouGo(null);
        });
    }

    public updateSnippet(snippetId: string) {
        if (!this._hasActiveSnippet(snippetId)) {
            return;
        }
        this._selectQuery(snippetId);
    }


    private _hasActiveSnippet(snippetId) {
        return (this.isOpen() && this._snippetId === snippetId);
    }

    private configureSQL(
        sql?: string,
        identifiers?: Map<number, string>
    ): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        sql = sql || "";

        const dropAsYouGo: boolean = this._isDropAsYouGo();

        if (!sql) {
            self._dataModel.setDataModel("", identifiers, dropAsYouGo, this._outputTableName);
            self._dataModel.submit();

            return PromiseHelper.resolve();
        }
        const queryId = xcHelper.randName("sql", 8);
        try {
            SQLUtil.lockProgress();
            const options = {
                identifiers: identifiers,
                dropAsYouGo: dropAsYouGo
            };
            self._dagNode.compileSQL(sql, queryId, options)
            .then(() => {
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo, this._outputTableName);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail((err) => {
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo, this._outputTableName);
                self._dataModel.submit(true);
                deferred.reject(err);
            })
            .always(() => {
                SQLUtil.resetProgress();
            });
        } catch (e) {
            SQLUtil.resetProgress();
            deferred.reject(e);
        }
        return deferred.promise();
    };

    // currently only called whenever the form opens
    protected _updateUI() {
        // Setup event listeners
        this._setupEventListener();
        this._renderSnippet();
        this._renderDropAsYouGo();
    }

    public updateIdentifiers(identifiers: Map<number, string>) {
        this._dataModel.setIdentifiers(identifiers);
    }

    public updateNodeParents() {
        let parents = this._dagNode.getParents();
        this._connectors = [];
        this._identifiers.forEach((identifier, i) => {
            const parentNode = parents[i];
            if (parentNode) {
                this._connectors[i] = {
                    label: parentNode.getTitle(),
                    nodeId: parentNode.getId()
                }
            } else {
                this._connectors[i] = {
                    label: "",
                    nodeId: null
                }
            }
        });
        this._parsedIdentifiers.forEach((identifier, i) => {
            if (this._identifiers[i]) {
                return;
            }
            const parentNode = parents[i];
            if (parentNode) {
                this._connectors[i] = {
                    label: parentNode.getTitle(),
                    nodeId: parentNode.getId()
                }
            } else {
                this._connectors[i] = {
                    label: "",
                    nodeId: null
                }
            }
        });
        parents.forEach((parentNode, i) => {
            this._connectors[i] = {
                label: parentNode.getTitle(),
                nodeId: parentNode.getId()
            };
        });
        this.updateIdentifiersList();
    }

    private updateIdentifiersList() {
        let leftCol = "";
        let rightCol = "";
        let seenConnectors = new Set();
        let seenIdentifiers = new Set();
        this._identifiers.forEach((identifier, i) => {
            if (i >= this._parsedIdentifiers.length) {
                return;
            }
            seenIdentifiers.add(identifier);
            leftCol +=  this._getIdentifierHTML(identifier);
            let connectorName = "";
            if (this._connectors[i]) {
                connectorName = this._connectors[i].label;
                seenConnectors.add(i);
            }
            rightCol += this._getConnectorHTML(connectorName);
        });

        this._parsedIdentifiers.forEach((identifier, i) => {
            if (this._identifiers[i]) {
                return;
            }
            leftCol +=  this._getIdentifierHTML(identifier);
            let connectorName = "";
            if (this._connectors[i]) {
                connectorName = this._connectors[i].label;
                seenConnectors.add(i);
            }
            rightCol += this._getConnectorHTML(connectorName);
        });

        this._connectors.forEach((connector, index) => {
            let connectorName = connector.label;
            if (seenConnectors.has(index)) {
                return;
            }
            leftCol += `<div class="source notSpecified">
                Not Found
            </div>`;
            rightCol += this._getConnectorHTML(connectorName);
        });

        let html = `<div class="col">${leftCol}</div><div class="col">${rightCol}</div>`;
        this._$elemPanel.find(".identifiersList").html(html);

        this._$elemPanel.find(".identifiersList .source").each((index, el) => {
            const $dropDownList: JQuery = $(el).find(".dropDownList");
            new MenuHelper($dropDownList, {
                fixedPosition: {
                    selector: "input"
                },
                onOpen: () => {
                    let html = "";
                    this._parsedIdentifiers.forEach((identifier) => {
                        html += `<li>${identifier}</li>`;
                    });

                    if (!this._parsedIdentifiers.length) {
                        html += `<li data-id="" class="hint">No tables found</li>`
                    }
                    $dropDownList.find("ul").html(html);
                },
                onSelect: ($li) => {
                    let val;
                    if ($li.hasClass("hint")) {
                        return;
                    } else {
                        val = $li.text().trim();
                    }
                    $dropDownList.find("input").val(val);
                    this._identifiers[index] = val;
                }
            }).setupListeners();
        });

        this._$elemPanel.find(".identifiersList .dest").each((index, el) => {
            const $dropDownList: JQuery = $(el).find(".dropDownList");
            new MenuHelper($dropDownList, {
                fixedPosition: {
                    selector: "input"
                },
                onOpen: () => {
                    const nodes = this._graph.getAllNodes();
                    let html = "";
                    let nodeInfos = [];
                    let nodeInfosInUse = [];
                    let connectorNodeIds = new Map();
                    this._connectors.forEach((c) => {
                        connectorNodeIds.set(c.nodeId, c);
                    });
                    let connectorIndex = this._dagNode.getNextOpenConnectionIndex();
                    let cachedLabels = [];
                    nodes.forEach(node => {
                        if (node === this._dagNode) {
                            return;
                        }
                        if (!this._graph.canConnect(node.getId(), this._dagNode.getId(),
                            connectorIndex)) {
                            return;
                        }
                        if (connectorNodeIds.has(node.getId())) {
                            nodeInfosInUse.push({
                                id: node.getId(),
                                label: node.getTitle()
                            });
                        } else if (this._labelCache.has(node.getId())) {
                            cachedLabels.push({
                               id: node.getId(),
                               label: node.getTitle()
                            });
                        } else {
                            nodeInfos.push({
                                id: node.getId(),
                                label: node.getTitle()
                            });
                        }
                    });
                    nodeInfosInUse.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    cachedLabels.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    nodeInfos.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    nodeInfos = [...nodeInfosInUse, ...cachedLabels, ...nodeInfos];

                    nodeInfos.forEach((nodeInfo) => {
                        html += `<li data-id="${nodeInfo.id}">${xcStringHelper.escapeHTMLSpecialChar(nodeInfo.label)}</li>`;
                    });
                    if (!nodeInfos.length) {
                        html += `<li data-id="" class="hint">No tables found</li>`
                    }
                    $dropDownList.find("ul").html(html);
                },
                onSelect: ($li) => {
                    let val;
                    if ($li.hasClass("hint")) {
                        return;
                    } else {
                        val = $li.text().trim();
                    }

                    if (this._connectors[index]) {
                        this._labelCache.add(this._connectors[index].nodeId);
                    }
                    $dropDownList.find("input").val(val);
                    this._setConnector(index, val, $li.data('id'));
                }
            }).setupListeners();
        });

        this._updateHintMessage();
    }

    private _updateHintMessage() {
        if (this._queryStrHasError) {
            this._$elemPanel.find(".noSQLHint").removeClass("xc-hidden");
            this._$elemPanel.find(".noTableHint").addClass("xc-hidden");
        } else {
            if (this._parsedIdentifiers.length === 0) {
                this._$elemPanel.find(".noTableHint").removeClass("xc-hidden");
                this._$elemPanel.find(".noSQLHint").addClass("xc-hidden");
            } else {
                this._$elemPanel.find(".noTableHint").addClass("xc-hidden");
                this._$elemPanel.find(".noSQLHint").addClass("xc-hidden");
            }
        }
    }

    private _getIdentifierHTML(identifier): HTML {
        return `<div class="source">
                <div class="dropDownList">
                    <input class="text" type="text" value="${identifier}" spellcheck="false" readonly>
                    <div class="iconWrapper">
                        <i class="icon xi-arrow-down"></i>
                    </div>
                    <div class="list">
                        <ul>
                        </ul>
                        <div class="scrollArea top stopped" style="display: none;">
                            <i class="arrow icon xi-arrow-up"></i>
                        </div>
                        <div class="scrollArea bottom" style="display: none;">
                            <i class="arrow icon xi-arrow-down"></i>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    private _getConnectorHTML(connectorName: string): HTML {
        return `<div class="dest">
            <div class="dropDownList">
                <input class="text" type="text" value="${connectorName}" spellcheck="false" readonly>
                <div class="iconWrapper">
                    <i class="icon xi-arrow-down"></i>
                </div>
                <div class="list">
                    <ul>
                    </ul>
                    <div class="scrollArea top stopped" style="display: none;">
                        <i class="arrow icon xi-arrow-up"></i>
                    </div>
                    <div class="scrollArea bottom" style="display: none;">
                        <i class="arrow icon xi-arrow-down"></i>
                    </div>
                </div>
            </div>
        </div>`;
    }

    public getAutoCompleteList() {
        const acTables = {};
        this._dagNode.getParents().forEach((parent, index) => {
            let tableName = this._identifiers[index];
            if (!tableName) {
                tableName = this._parsedIdentifiers[index];
            }
            let tableColumns = [];
            if (tableName) {
                acTables[tableName] = tableColumns;
            }

            parent.getLineage().getColumns(false, true).forEach((parentCol) => {
                let colName = xcHelper.cleanseSQLColName(parentCol.name);
                let upperName = colName.toUpperCase();
                if (colName != "DATA" &&
                    !upperName.startsWith("XCALARRANKOVER") &&
                    !upperName.startsWith("XCALAROPCODE") &&
                    !upperName.startsWith("XCALARBATCHID") &&
                    !upperName.startsWith("XCALARROWNUMPK")) {
                    tableColumns.push(colName);
                    if (!acTables[colName]) {
                        acTables[colName] = [];
                    }
                }
            });
        });
        return acTables;
    }

    public getColumnHintList(): Set<string> {
        const columnSet: Set<string> = new Set();
        this._dagNode.getParents().forEach((parent, index) => {
            let tableName = this._identifiers[index];
            if (!tableName) {
                tableName = this._parsedIdentifiers[index];
            }
            if (tableName) {
                tableName += ".";
            } else {
                tableName = "";
            }

            parent.getLineage().getColumns(false, true).forEach((parentCol) => {
                let colName = xcHelper.cleanseSQLColName(parentCol.name);
                let upperName = colName.toUpperCase();
                if (colName != "DATA" &&
                    !upperName.startsWith("XCALARRANKOVER") &&
                    !upperName.startsWith("XCALAROPCODE") &&
                    !upperName.startsWith("XCALARBATCHID") &&
                    !upperName.startsWith("XCALARROWNUMPK")) {
                    columnSet.add(tableName + colName); // includes "."
                }
            });
        });
        return columnSet;
    }

    private _setConnector(index, label, nodeId) {
        let oldNodeId;
        let needsConnection = true;
        if (this._connectors[index] && this._connectors[index].nodeId) {
            oldNodeId = this._connectors[index].nodeId;
            let oldNode = this._graph.getNode(oldNodeId);
            let parentNode = this._dagNode.getParents()[index]
            if (parentNode && (parentNode === oldNode)) {
                DagViewManager.Instance.disconnectNodes(oldNodeId, this._dagNode.getId(),
                index, this._graph.getTabId());
                if (nodeId && (nodeId !== this._dagNode.getId())) {
                    DagViewManager.Instance.connectNodes(nodeId, this._dagNode.getId(),
                    index, this._graph.getTabId(), false, true);
                    needsConnection = false;
                }
            }
        }
        if (needsConnection && nodeId && (nodeId !== this._dagNode.getId())) {
            let index = this._dagNode.getNextOpenConnectionIndex();
            DagViewManager.Instance.connectNodes(nodeId, this._dagNode.getId(),
                index, this._graph.getTabId());
        }

        this._connectors[index] = {
            label: label,
            nodeId: nodeId
        };
    }

    private _renderSnippet() {
        const queryStr: string = this._dataModel.getSqlQueryString() || null;
        const snippetId = SQLTabManager.Instance.newTempTab("SQL Graph Node", queryStr || "");
        this._snippetId = snippetId;
        this._selectQuery(snippetId, queryStr);
    }

    private _renderDropAsYouGo(): void {
        let dropAsYouGo: boolean = this._dataModel.isDropAsYouGo();
        this._toggleDropAsYouGo(dropAsYouGo);
    }

    public extractIdentifiers(): Map<number, string> {
        let identifiers = new Map<number, string>();
        this._identifiers.forEach((identifier, index) => {
            identifiers.set(index + 1, identifier);
            if (!this._connectors[index] || !this._connectors[index].label) {
                throw "Query Table \'" + identifier + "\' does not have a corresponding module table.";
            }
        });

        this._parsedIdentifiers.forEach((identifier, index) => {
            if (this._identifiers[index]) {
                return;
            }
            identifiers.set(index + 1, identifier);
            if (!this._connectors[index] || !this._connectors[index].label) {
                throw "Query Table \'" + identifier + "\' does not have a corresponding module table.";
            }
        });

        return identifiers;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        const self = this;
        // Clear existing event handlers
        self._$elemPanel.off();

        // Close icon & Cancel button
        self._$elemPanel.on('click', '.close, .cancel:not(.confirm)', () => {
            this.close(false);
        });

        // Submit button
        self._$elemPanel.on('click', '.submit', () => {
            this._submit();
        });

        self._$elemPanel.on("click", ".preview", () => {
            this._preview();
        })
    }

    protected _updateMode(toAdvancedMode: boolean) {
        super._updateMode(toAdvancedMode);
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchModes(toAdvancedMode: boolean): XDPromise<any> {
        if (toAdvancedMode) {
            const identifiers = {};
            const identifiersOrder = [];
            let identifiersMap;
            try {
                identifiersMap = this.extractIdentifiers();
            } catch (e) {
                return PromiseHelper.reject(e);
            }
            identifiersMap.forEach(function(value, key) {
                identifiers[key] = value;
                identifiersOrder.push(key);
            });

            let sqlQueryString = this._queryStr;
            const advancedParams = {
                sqlQueryString: sqlQueryString,
                identifiers: identifiers,
                identifiersOrder: identifiersOrder,
                dropAsYouGo: this._isDropAsYouGo(),
                outputTableName: this._outputTableName
            };
            const paramStr = JSON.stringify(advancedParams, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            return PromiseHelper.resolve();
        } else {
            return this._switchToStandardMode();
        }
    }

    protected _switchToStandardMode() {
        try {
            const advancedParams = JSON.parse(this._editor.getValue());
            let errorMsg = this._validateAdvancedParams(advancedParams);
            if (errorMsg) {
                return PromiseHelper.reject(errorMsg);
            }
            this._outputTableName = advancedParams.outputTableName;
            const identifiers = advancedParams.identifiers;
            let identifiersOrder = advancedParams.identifiersOrder.map((identifier) => {
                return parseInt(identifier);
            });
            if (!this._validateIdentifiers(identifiers, identifiersOrder)) {
                return PromiseHelper.reject(SQLErrTStr.IdentifierMismatch);
            }
            if (advancedParams.dropAsYouGo != null) {
                this._toggleDropAsYouGo(advancedParams.dropAsYouGo);
            }

            let queryStr = advancedParams.sqlQueryString;
            SQLSnippet.Instance.update(this._snippetId, queryStr);
            if (SQLEditorSpace.Instance.getCurrentSnippetId() === this._snippetId) {
                const editor = SQLEditorSpace.Instance.getEditor();
                editor.setValue(queryStr);
                editor.refresh();
            }

            if (Object.keys(identifiers).length > 0) {
                for (let key of identifiersOrder) {
                    if (!this._validateSourceId(key)) {
                        return PromiseHelper.reject(SQLErrTStr.InvalidSourceId +
                            this._dagNode.getParents().length);
                    }
                }
            }
            this._updateHintMessage();
            let identifiersArr = [];
            for (let i in identifiers) {
                identifiersArr.push({
                    index: i,
                    identifier: identifiers[i]
                });
            }
            identifiersArr.sort((a,b) => {
                if (a.index < b.index) {
                    return -1;
                } else {
                    return 1;
                }
            });
            this._identifiers = identifiersArr.map((i) => {
                return i.identifier
            });
            return this._selectQuery(this._snippetId, queryStr);
        } catch (e) {
            return PromiseHelper.reject(e);
        }
    }

    protected _handleModeSwitch($panel: JQuery, event) {
        const $switch: JQuery = $(event.target).closest(".switch");
        const toAdvanceMode: boolean = $switch.hasClass("on") ? false : true;
        this._switchModes(toAdvanceMode)
        .then(() => {
            this._updateMode(toAdvanceMode);
        })
        .fail((error) => {
            const $e = toAdvanceMode ? $panel.find(".opSection") : $panel.find(".advancedEditor");
            StatusBox.show(error, $e);
        });
    }

    private _validateIdentifiers(identifiers: {}, identifiersOrder: number[]): boolean {
        if (Object.keys(identifiers).length !== identifiersOrder.length) {
            return false;
        }
        for (const key of identifiersOrder) {
            if (!identifiers.hasOwnProperty(key + "")) {
                return false;
            }
        }
        for (const key in identifiers) {
            if (identifiersOrder.indexOf(parseInt(key)) === -1) {
                return false;
            }
        }
        return true;
    }

    private _validateSourceId(sourceId: number): boolean {
        if (sourceId > 0 && sourceId <= this._dagNode.getParents().length) {
            return true;
        }
        return false;
    }

    private _submit() {
        let modePromise;
        if (this._isAdvancedMode()) {
            modePromise = this._switchModes(false);
        } else {
            modePromise = PromiseHelper.resolve();
        }

        modePromise
        .then(() => {
            let identifiers;
            try {
                identifiers = this.extractIdentifiers();
                this._validateIdentifierNames(identifiers);
            } catch (e) {
                StatusBox.show(e, this._$elemPanel.find(".btn-submit"));
                return;
            }
            const query = this._queryStr.replace(/;+$/, "");

            this.configureSQL(query, identifiers)
            .then(() => {
                this.close(true);
            })
            .fail((err) => {
                if (err !== "Cancel" && err !== "cancel") {
                    Alert.show({
                        title: SQLErrTStr.Err,
                        msg:  "Error details: " + xcHelper.parseError(err),
                        isAlert: true
                    });
                    this._dagNode.beErrorState();
                }
            });
        })
        .fail((error) => {
            StatusBox.show(error, this._$elemPanel.find(".advancedEditor"));
        });
    }

    private _validateIdentifierNames(identifiers) {
        let identiferSet = new Set();
        for (let [key, identifier] of identifiers) {
            if (!this._parsedIdentifiers.includes(identifier)) {
                throw(`Table ${identifier} not found in SQL statement`);
            }
            if (identiferSet.has(identifier)) {
                throw(`Duplicate table found: ${identifier}`)
            }
            identiferSet.add(identifier);
        }
        this._parsedIdentifiers.forEach(identifier => {
            if (!identiferSet.has(identifier)) {
                throw(`Specify a corresponding module table for '${identifier}'`);
            }
        });
    }


    private _validateAdvancedParams(advancedParams): any {
        const schema = {
            "definitions": {},
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": "http://example.com/root.json",
            "type": "object",
            "title": "The Root Schema",
            "required": [
              "sqlQueryString",
              "identifiers",
              "identifiersOrder",
              "dropAsYouGo"
            ],
            "optional" : [
                "outputTableName"
            ],
            "properties": {
              "sqlQueryString": {
                "$id": "#/properties/sqlQueryString",
                "type": "string",
                "title": "The Sqlquerystring Schema",
                "default": "",
                "examples": [
                  "SELECT * from t"
                ]
              },
              "identifiers": {
                "$id": "#/properties/identifiers",
                "type": "object",
                "title": "The Identifiers Schema",
                "properties": {
                  "1": {
                    "$id": "#/properties/identifiers/properties/1",
                    "type": "string",
                    "title": "TheSchema",
                    "default": "",
                    "examples": [
                      "t1"
                    ],
                    "pattern": "^(.*)$"
                  },
                  "2": {
                    "$id": "#/properties/identifiers/properties/2",
                    "type": "string",
                    "title": "TheSchema",
                    "default": "",
                    "examples": [
                      "t2"
                    ],
                    "pattern": "^(.*)$"
                  }
                }
              },
              "identifiersOrder": {
                "$id": "#/properties/identifiersOrder",
                "type": "array",
                "title": "The Identifiersorder Schema",
                "items": {
                  "$id": "#/properties/identifiersOrder/items",
                  "type": "integer",
                  "title": "The Items Schema",
                  "default": 0,
                  "examples": [
                    2,
                    1
                  ]
                }
              },
              "dropAsYouGo": {
                "$id": "#/properties/dropAsYouGo",
                "type": "boolean",
                "title": "The Dropasyougo Schema",
                "default": true,
                "examples": [
                  true
                ]
              },
              "outputTableName": {
                "$id": "#/properties/outputTableName",
                "type": "string",
                "title": "The outputTableName Schema",
                "maxLength": XcalarApisConstantsT.XcalarApiMaxTableNameLen - 10,
                "pattern": "^[a-zA-Z][a-zA-Z\\d\\_\\-]*$|^$"
              },
            }
          };
        let ajv = new Ajv();
        let validate = ajv.compile(schema);
        let valid = validate(advancedParams);
        if (!valid) {
            // only saving first error message
            let error = validate.errors[0];
            if (error.dataPath != null && error.message != null) {
                return error.dataPath + " " + error.message;
            } else {
                return SQLErrTStr.InvalidParams;
            }
        }
    }

    protected _updateColumns(): ProgCol[] {
        this.allColumns = [];
        return this.allColumns;
    }

    protected _preview() {
        let modePromise;
        if (this._isAdvancedMode()) {
            modePromise = this._switchModes(false);
        } else {
            modePromise = PromiseHelper.resolve();
        }
        modePromise
        .then(() => {
            let identifiers;
            try {
                identifiers = this.extractIdentifiers();
                this._validateIdentifierNames(identifiers);
            } catch (e) {
                StatusBox.show(e, this._$elemPanel.find(".preview"));
                return;
            }

            const sql = this._queryStr.replace(/;+$/, "");

            const queryId = xcHelper.randName("sql", 8);
            try {
                const graph = this._tab.getGraph();
                if (this._clonedNode) {
                    const table = this._clonedNode.getTable();
                    graph.removeNode(this._clonedNode.getId());
                    TableTabManager.Instance.deleteTab(table);
                }

                const nodeInfo = this._dagNode.getNodeCopyInfo(true, false, true);
                delete nodeInfo.id;
                nodeInfo.isHidden = true;
                this._clonedNode = graph.newNode(nodeInfo);

                this._dagNode.getParents().forEach((parent, index) => {
                    if (!parent) return;
                    graph.connect(parent.getId(), this._clonedNode.getId(), index, false, false);
                });

                this._lockPreview();
                const options = {
                    identifiers: identifiers,
                    dropAsYouGo: true
                };
                this._clonedNode.compileSQL(sql, queryId, options)
                .then(() => {
                    this._clonedNode.setIdentifiers(identifiers);
                    this._clonedNode.setParam({
                        sqlQueryStr: sql,
                        identifiers: identifiers,
                        dropAsYouGo: true,
                        outputTableName: "xcPreview"
                    }, true);
                    const dagView = DagViewManager.Instance.getDagViewById(this._tab.getId());

                    return dagView.run([this._clonedNode.getId()])
                })
                .then(() => {
                    if (!UserSettings.Instance.getPref("dfAutoPreview")) {
                        DagViewManager.Instance.viewResult(this._clonedNode, this._tab.getId());
                    }
                })
                .fail((err) => {
                    if (err !== "Cancel" && err !== "cancel" &&
                        err !== StatusTStr[StatusT.StatusCanceled]) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg:  "Error details: " + xcHelper.parseError(err),
                            isAlert: true
                        });
                    }
                })
                .always(() => {
                    this._unlockPreview();
                });
            } catch (e) {
                this._unlockPreview();
            }
        })
        .fail((error) => {
            StatusBox.show(error, this._$elemPanel.find(".advancedEditor"));
            this._unlockPreview();
        });

        return true;
    }


    protected _lockPreview() {
        this._$elemPanel.find('.preview').addClass("xc-disabled");
        this._previewInProgress = true;
    }

    protected _unlockPreview() {
        this._$elemPanel.find('.preview').removeClass("xc-disabled");
        this._previewInProgress = false;
    }

}

interface derivedColStruct {
    colName: string,
    mapStr: string,
    colType: string
}