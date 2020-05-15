/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    protected _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;
    private _$sqlIdentifiers = $("#sqlOpPanel .sqlIdentifiers");
    private _sqlTables = {};
    private _alertOff: boolean = false;
    private _ignoreQueryConfirm = false;
    private _ignoreUpdateConfirm = false;
    private _identifiers: string[] = [];
    private _connectors: {label: string, nodeId: string}[] = [];
    private _queryStr = "";
    private _graph: DagGraph;
    private _isQueryUpdated: boolean = false;
    private _snippetIdNotFound: boolean = false;

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#sqlOpPanel');
        super.setup(this._$elemPanel);

        this._setupDropAsYouGo();
        this._setupQuerySelector();
    }

        /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQL, options?): void {
        this._dagNode = dagNode;
        this._dataModel = new SQLOpPanelModel(dagNode);
        this.$panel.find(".nextForm").addClass('xc-hidden');
        this._queryStr = "";
        let error: string;
        this._graph = DagViewManager.Instance.getActiveDag();
        this._identifiers = [];
        this._connectors = [];
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
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }
    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        this._identifiers = [];
        this._connectors = [];
        this._graph = null;
        this.updateIdentifiersList();
    }

    private _setupQuerySelector(): void {
        const $list = this.$panel.find(".snippetsList");
        let preventOpen = false;

        const menuHelper = new MenuHelper($list, {
            "fixedPosition": {
                selector: "input"
            },
            "onOpen": function() {
                if (preventOpen) {
                    return;// when triggered by autocomplete
                }
                const snippets = SQLSnippet.Instance.list();
                let html = "";
                html += `<li class="createNew">+ Create a new query</li>`;
                snippets.forEach((snippet) => {
                    html += `<li data-id="${snippet.id}">${snippet.name}</li>`;
                });
                $list.find('ul').html(html);
            },
            "onSelect": ($li) => {
                if ($li.hasClass("hint")) {
                    return false;
                }
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let snippetId: string = $li.data("id");
                if ($li.hasClass("createNew")) {
                    SQLEditorSpace.Instance.bringToFront();
                    snippetId = SQLTabManager.Instance.newTab();
                } else {
                    SQLTabManager.Instance.openTab(snippetId);
                }

                this._selectQuery(snippetId, null, true);
                this._isQueryUpdated = true;
                if (this._$elemPanel.hasClass("queryNotUpdated") ||
                    this._$elemPanel.hasClass("snippetNotFound")) {
                    this._$elemPanel.find(".snippetUpdated").fadeIn(800, () => {
                        setTimeout(() => {
                            this._$elemPanel.find(".snippetUpdated").fadeOut(800);
                        }, 2000);
                    });
                }
                this._$elemPanel.removeClass("queryNotUpdated");
                this._$elemPanel.removeClass("snippetNotFound");
            }
        });
        menuHelper.setupListeners();

        const $input = $list.find("input");
        let timer;
        $input.on("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const value: string = $input.val().trim().toLowerCase();
                const snippets = SQLSnippet.Instance.list();
                let html = "";
                // html += `<li class="createNew">+ Create a new query</li>`;
                snippets.forEach((snippet) => {
                    if (value === "" || snippet.name.toLowerCase().includes(value)) {
                        html += `<li data-id="${snippet.id}">${snippet.name}</li>`;
                    }
                });
                let $lis = $(html);
                $lis = $lis.sort((a, b) => {
                    return ($(b).text()) < ($(a).text()) ? 1 : -1;
                });

                const $ul = $input.siblings(".list").find("ul");
                $ul.empty().append($lis);

                for (let i = $lis.length; i >= 0; i--) {
                    const $li = $lis.eq(i);
                    if ($li.text().startsWith(value)) {
                        $ul.prepend($li);
                    }
                }

                menuHelper.hideDropdowns();
                preventOpen = true;
                menuHelper.toggleList($list);
                preventOpen = false;
            }, 100);
        });

        $input.on("change", () => {
            const snippets = SQLSnippet.Instance.list();
            let value = $input.val().trim();
            let snippet: SQLSnippetDurable;
            let snippetId = null;
            for (let i = 0; i < snippets.length; i++) {
                let candidate = snippets[i];
                if (candidate.name === value) {
                    snippet = candidate;
                    break;
                }
            }
            if (snippet) {
                snippetId = snippet.id;
                SQLTabManager.Instance.openTab(snippetId);
                this._selectQuery(snippetId, null, true);
                this._$elemPanel.removeClass("snippetNotFound");
            } else {
                this._snippetIdNotFound = true;
                this._queryStr = "";
                $input.data("id", null);
                this.$panel.find(".editorWrapper").text("");
                this._identifiers = [];
                this.updateIdentifiersList();
                this._$elemPanel.addClass("snippetNotFound");
            }

            this._isQueryUpdated = true;
            if (this._$elemPanel.hasClass("queryNotUpdated") && !this._snippetIdNotFound) {
                this._$elemPanel.find(".snippetUpdated").fadeIn(800, () => {
                    setTimeout(() => {
                        this._$elemPanel.find(".snippetUpdated").fadeOut(800);
                    }, 2000);
                });
            }
            this._$elemPanel.removeClass("queryNotUpdated");
        });
    }

    private _selectQuery(snippetId: string, queryStr?: string, forceUpdate?: boolean): SQLSnippetDurable {
        if (snippetId || queryStr) {
            this.$panel.find(".nextForm").removeClass('xc-hidden');
        }
        const $list = this.$panel.find(".snippetsList");
        const $input = $list.find("input");
        let queryName = "";
        let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
        if (snippet) {
            if (queryStr == null) {
                queryStr = snippet.snippet;
            }
            queryName = snippet.name;
        }
        queryStr = queryStr || "";
        $input.val(queryName);
        if (queryStr && !queryName) {
            $input.attr("placeholder", "Query name not found");
        } else {
            $input.attr("placeholder", "");
        }
        $input.data("id", snippetId);
        this.$panel.find(".editorWrapper").text(queryStr);
        this._queryStr = queryStr;
        this._$elemPanel.find(".identifiersSection").addClass("disabled");
        SQLUtil.getSQLStruct(queryStr)
        .then((ret) => {
            if (this.isOpen() && this._queryStr === queryStr) {
                if (!forceUpdate && !ret.identifiers.length && this._identifiers.length &&
                    (ret.sql.toLowerCase().includes(" from ") ||
                    (queryStr.toLowerCase().includes("from") &&
                    queryStr.toLowerCase().includes("select")))) {
                    return;
                }
                this._identifiers = ret.identifiers;
                this.updateIdentifiersList();
            }
        })
        .fail((e) => {
            this._identifiers = [];
            this.updateIdentifiersList();
            console.error(e);
        })
        .always(() => {
            this._$elemPanel.find(".identifiersSection").removeClass("disabled");
        });
        return snippet;
    }

    private _addTableIdentifier(key?: number, value?: string): void {
        const html = '<li>' +
                     '  <div class="dropDownList source">' +
                     '      <div class="text"></div>' +
                     '  </div>' +
                     '  <i class="icon xi-equal"></i>' +
                     '  <input class="dest text" spellcheck="false"></input>' +
                     '</li>';
        const $li = $(html);
        if (key) {
            $li.find(".source .text").text(key);
        }
        if (value) {
            $li.find(".dest.text").val(value);
        }
        $li.appendTo(this._$sqlIdentifiers);
        const $scrollArea = this._$sqlIdentifiers.closest(".identifiers");
        $scrollArea.scrollTop($scrollArea.prop('scrollHeight'));
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

    private _addEventListeners(): void {
        const self = this;
        // Identifier section listeners
        self._$elemPanel.find(".identifiers").scroll(function() {
            self._$sqlIdentifiers.find(">li").each(function() {
                const $dropDown = $(this).find(".dropDownList");
                if ($dropDown.hasClass("open")) {
                    // close the dropdown
                    $dropDown.click();
                }
            });
        });
        self._$sqlIdentifiers.on("mouseup", ".source", function() {
            const $li = $(this).closest("li");
            self._populateSourceIds($li);
        });
        self._$sqlIdentifiers.on("blur", ".text.dest", function() {
            const $input = $(this)
            const key = $input.val().trim();
            if (key && !xcHelper.checkNamePattern(PatternCategory.SQLIdentifier,
                                                  PatternAction.Check, key)) {
                StatusBox.show(SQLErrTStr.InvalidIdentifier, $input);
                return;
            }
            if (key) {
                // remove the old key
                const lastKey = $input.attr("last-value");
                delete self._sqlTables[lastKey];
                $input.attr("last-value", key);
                const value = parseInt($input.siblings(".source")
                                             .find(".text").text()) || undefined;
                self._sqlTables[key] = value;
            }
        });
        self._$elemPanel.on("click", ".refreshSnippet", () => {
            this._isQueryUpdated = true;
            this._$elemPanel.removeClass("queryNotUpdated");
            const snippetId = this.$panel.find(".snippetsList input").data("id");
            this._selectQuery(snippetId, null, true);
            this._$elemPanel.find(".snippetUpdated").fadeIn(800, () => {
                setTimeout(() => {
                    this._$elemPanel.find(".snippetUpdated").fadeOut(800);
                }, 2000);
            });
        });
    }

    private _populateSourceIds($li: JQuery): void {
        let content = "";
        for (let i = 0; i < this._dagNode.getParents().length; i++) {
            content += "<li>" + (i + 1) + "</li>";
        }
        const $ul = $li.find("ul");
        const topOff = $li.offset().top + $li.height();
        $ul.html(content).css({top: topOff + "px"});
    }

    public updateSnippet(snippetId: string, name?: string) {
        if (!this._hasActiveSnippet(snippetId)) {
            if (this.isOpen() && name && this.$panel.find(".snippetsList").find("input").val().trim() === name) {
                this.$panel.find(".snippetsList").find("input").data("id", snippetId);
                this._isQueryUpdated = true;
                this._snippetIdNotFound = false;
                if (this._$elemPanel.hasClass("queryNotUpdated") ||
                    this._$elemPanel.hasClass("snippetNotFound")) {
                    this._$elemPanel.find(".snippetUpdated").fadeIn(800, () => {
                        setTimeout(() => {
                            this._$elemPanel.find(".snippetUpdated").fadeOut(800);
                        }, 2000);
                    });
                }
                this._$elemPanel.removeClass("queryNotUpdated");
                this._$elemPanel.removeClass("snippetNotFound");
            } else {
                return;
            }
        }
        if (!this._isQueryUpdated) {
            return;
        }
        this._selectQuery(snippetId);
    }


    private _hasActiveSnippet(snippetId) {
        return (this.isOpen() &&
        this.$panel.find(".snippetsList input").data("id") === snippetId);
    }

    public getAlertOff(): boolean {
        return this._alertOff;
    }

    public setAlertOff(alertOff: boolean = false): void {
        this._alertOff = alertOff;
    }

    private configureSQL(
        snippetId: string,
        query?: string,
        identifiers?: Map<number, string>,
        identifiersNameMap?: {}
    ): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();

        let sql = "";
        if (query == null) {
            let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
            if (snippet) {
                sql = snippet.snippet;
            }
        } else {
            sql = query;
        }

        const dropAsYouGo: boolean = this._isDropAsYouGo();
        if (!identifiers || !identifiersNameMap) {
            let retStruct = this.extractIdentifiers();
            identifiers = identifiers || retStruct.identifiers;
            identifiersNameMap = identifiersNameMap || retStruct.identifiersNameMap;
        }
        self._dagNode.setIdentifiersNameMap(identifiersNameMap);
        if (!sql) {
            self._dataModel.setDataModel("", identifiers, dropAsYouGo, snippetId);
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
            .then(function() {
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo, snippetId);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail(function(err) {
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo, snippetId);
                self._dataModel.submit(true);
                deferred.reject(err);
            })
            .always(function() {
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
        this._renderSnippet();
        this._renderIdentifiers();
        this._renderDropAsYouGo();
        // Setup event listeners
        this._setupEventListener();
    }

    public updateIdentifiers(identifiers: Map<number, string>) {
        this._dataModel.setIdentifiers(identifiers);
        this._renderIdentifiers();
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
        this._identifiers.forEach((identifier, i) => {
            leftCol += `<div class="source">
                    ${identifier}
                    </div>`;
            let connectorName = "";
            if (this._connectors[i]) {
                connectorName = this._connectors[i].label;
                seenConnectors.add(i);
            }
            rightCol +=
                `<div class="dest">
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
        });

        this._connectors.forEach((connector, index) => {
            let connectorName = connector.label;
            if (seenConnectors.has(index)) {
                return;
            }
            leftCol += `<div class="source notSpecified">
                Not Specified
            </div>`;
            rightCol +=
                `<div class="dest">
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
        });
        let html = `<div class="col">${leftCol}</div><div class="col">${rightCol}</div>`;
        this._$elemPanel.find(".identifiersList").html(html);
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
                    nodeInfos.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    nodeInfos = [...nodeInfosInUse, ...nodeInfos];

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
                    $dropDownList.find("input").val(val);
                    this._setConnector(index, val, $li.data('id'));
                }
            }).setupListeners();
        });

        if (this._identifiers.length === 0) {
            this._$elemPanel.find(".tableInstruction").removeClass("xc-hidden");
        } else {
            this._$elemPanel.find(".tableInstruction").addClass("xc-hidden");
        }
    }

    public getAutoCompleteList() {
        const acTables = {};
        this._dagNode.getParents().forEach((parent, index) => {
            let tableName = this._identifiers[index];
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
        let snippetId: string = this._dataModel.getSnippetId();
        const queryStr: string = this._dataModel.getSqlQueryString() || null;
        if (snippetId) {
            let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
            if (snippet) {
                this._isQueryUpdated = (snippet.snippet === queryStr);
                this._snippetIdNotFound = false;
                SQLTabManager.Instance.openTab(snippetId);
            } else {
                snippetId = SQLTabManager.Instance.newTab();
                SQLTabManager.Instance.openTab(snippetId);
                SQLEditorSpace.Instance.newSQL(queryStr);
                this._dataModel.setNewSnippetId(snippetId);
                this._isQueryUpdated = true;
                this._snippetIdNotFound = false;
            }
        } else {
            this._isQueryUpdated = true;
            this._snippetIdNotFound = true;
        }
        this._selectQuery(snippetId, queryStr);
        if (this._isQueryUpdated) {
            this._$elemPanel.removeClass("queryNotUpdated");
        } else {
            this._$elemPanel.addClass("queryNotUpdated");
        }
        if (!queryStr) {
            this._snippetIdNotFound = false;
        }
        if (this._snippetIdNotFound) {
            this._$elemPanel.addClass("snippetNotFound");
        } else {
            this._$elemPanel.removeClass("snippetNotFound");
        }
    }

    private _renderIdentifiers(): void {
        const self = this;
        // clean up old elements first
        self._$sqlIdentifiers.html("");
        self._sqlTables = {};
        const identifiers = this._dataModel.getIdentifiers();
        if (identifiers.size > 0) {
            this._$sqlIdentifiers.siblings(".tableInstruction").addClass("xc-hidden");
            identifiers.forEach(function(value, key) {
                self._addTableIdentifier(key, value);
                self._sqlTables[value] = key;
            });
        } else {
            this._$sqlIdentifiers.siblings(".tableInstruction").removeClass("xc-hidden");
        }
    }

    private _renderDropAsYouGo(): void {
        let dropAsYouGo: boolean = this._dataModel.isDropAsYouGo();
        this._toggleDropAsYouGo(dropAsYouGo);
    }

    public extractIdentifiers(
        validate: boolean = false
    ): {
        identifiers: Map<number, string>,
        identifiersNameMap: {}
    } {
        let identifiers = new Map<number, string>();
        let identifiersNameMap = {};
        this._identifiers.forEach((identifier, index) => {
            identifiers.set(index + 1, identifier);
            if (!this._connectors[index] || !this._connectors[index].label) {
                throw "Query Table \'" + identifier + "\' does not have a corresponding module table.";
            }
            identifiersNameMap[this._connectors[index].nodeId] = identifier;
        });

        return {
            identifiers: identifiers,
            identifiersNameMap: identifiersNameMap
        };
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
            this.submit();
        });
        this._addEventListeners();
    }

    protected _updateMode(toAdvancedMode: boolean) {
        super._updateMode(toAdvancedMode);
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const identifiers = {};
            const identifiersOrder = [];
            let identifiersMap;
            try {
                identifiersMap = this.extractIdentifiers(true).identifiers;
            } catch (e) {
                return {error: e};
            }
            identifiersMap.forEach(function(value, key) {
                identifiers[key] = value;
                identifiersOrder.push(key);
            });

            const snippetId = this.$panel.find(".snippetsList input").data("id");
            let sqlQueryString = this._queryStr;
            if (!sqlQueryString) {
                let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
                if (snippet) {
                    sqlQueryString = snippet.snippet;
                }
            }
            const advancedParams = {
                snippetId: snippetId,
                sqlQueryString: sqlQueryString,
                identifiers: identifiers,
                identifiersOrder: identifiersOrder,
                dropAsYouGo: this._isDropAsYouGo()
            };
            const paramStr = JSON.stringify(advancedParams, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const advancedParams = JSON.parse(this._editor.getValue());
                let errorMsg = this._validateAdvancedParams(advancedParams);
                if (errorMsg) {
                    return {error: errorMsg};
                }
                const identifiers = advancedParams.identifiers;
                let identifiersOrder = advancedParams.identifiersOrder.map((identifier) => {
                    return parseInt(identifier);
                });
                if (!this._validateIdentifiers(identifiers, identifiersOrder)) {
                    return {error: SQLErrTStr.IdentifierMismatch};
                }
                if (advancedParams.dropAsYouGo != null) {
                    this._toggleDropAsYouGo(advancedParams.dropAsYouGo);
                }
                const snippetId = advancedParams.snippetId;
                let queryStr = advancedParams.sqlQueryString;
                if (!queryStr) {
                    let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
                    if (snippet) {
                        queryStr = snippet.snippet;
                    }
                }
                this._selectQuery(snippetId, queryStr, true);
                this._$sqlIdentifiers.html("");
                this._sqlTables = {};
                if (Object.keys(identifiers).length > 0) {
                    for (let key of identifiersOrder) {
                        if (!this._validateSourceId(key)) {
                            return {error: SQLErrTStr.InvalidSourceId +
                                           this._dagNode.getParents().length};
                        }
                        this._addTableIdentifier(key, identifiers[key]);
                        this._sqlTables[identifiers[key]] = key;
                    }
                    this._$sqlIdentifiers.siblings(".tableInstruction").addClass("xc-hidden");
                } else {
                    this._$sqlIdentifiers.siblings(".tableInstruction").removeClass("xc-hidden");
                }
                if (this._identifiers.length === 0) {
                    this._$elemPanel.find(".tableInstruction").removeClass("xc-hidden");
                } else {
                    this._$elemPanel.find(".tableInstruction").addClass("xc-hidden");
                }
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
            } catch (e) {
                return {error: e};
            }
        }
        return null;
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

    private _confirmOutdatedQuery() {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        if (this._ignoreUpdateConfirm) {
            return PromiseHelper.resolve();
        }
        Alert.show({
            "title": "Query out of sync",
            "msg": "SQL query has not been updated. Do you want to continue?",
            "onConfirm": (checked) => {
                this._ignoreUpdateConfirm = checked;
                deferred.resolve();
            },
            "onCancel": (checked) => {
                this._ignoreUpdateConfirm = checked;
                deferred.reject("cancel"); // should not show error
            },
            isCheckBox: true,
            isInfo: true
        });
        return deferred.promise();
    }

    private submit() {
        if (this._isAdvancedMode()) {
            const failure = this._switchMode(false);
            if (failure) {
                StatusBox.show(failure.error, this._$elemPanel.find(".advancedEditor"));
                return;
            }
        }
        let identifiers;
        let identifiersNameMap;
        try {
            let retStruct = this.extractIdentifiers(true);
            identifiers = retStruct.identifiers;
            identifiersNameMap = retStruct.identifiersNameMap;
        } catch (e) {
            StatusBox.show(e, this._$elemPanel.find(".btn-submit"));
            return;
        }
        const query = this._queryStr.replace(/;+$/, "");
        const snippetId = this.$panel.find(".snippetsList input").data("id");
        let promise;
        if (!this._isQueryUpdated) {
            promise = this._confirmOutdatedQuery();
        } else {
            promise = PromiseHelper.resolve();
        }
        promise
        .then(() => {
            return this.configureSQL(snippetId, query, identifiers, identifiersNameMap);
        })
        .then(() => {
            this.close(true);
            if (!this._ignoreQueryConfirm && this._isQueryUpdated &&
                !this._ignoreUpdateConfirm) {
                Alert.show({
                    isAlert: true,
                    title: AlertTStr.Title,
                    msg: "Any future modifications to the original SQL statment will not affect this operator.",
                    // msg: "The SQL statement in this operator will not be affected by any future modifications to the original SQL statement.",
                    onCancel: (checked) => {
                        this._ignoreQueryConfirm = checked;
                    },
                    isCheckBox: true,
                    isInfo: true
                })
            }
        })
        .fail((err) => {
            Alert.show({
                title: SQLErrTStr.Err,
                msg:  "Error details: " + xcHelper.parseError(err),
                isAlert: true
            });
            if (err !== "Cancel") {
                this._dagNode.beErrorState();
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
              }
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
}

interface derivedColStruct {
    colName: string,
    mapStr: string,
    colType: string
}