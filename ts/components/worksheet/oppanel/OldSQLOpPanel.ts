/**
 * The operation editing panel for SQL operator
 */
class OldSQLOpPanel extends BaseOpPanel {
    private static readonly _udfDefault: string =
        "Example:\n" +
        "select * from table_identifier";

    private _$elemPanel: JQuery; // The DOM element of the panel
    protected _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;

    private _sqlEditor: SQLEditor;
    private _$sqlIdentifiers = $("#oldSqlOpPanel .sqlIdentifiers");
    private _$tableWrapper: JQuery;
    private _sqlTables = {};
    private _alertOff: boolean = false;

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#oldSqlOpPanel');
        this._$tableWrapper = this._$elemPanel.find(".tableWrapper").eq(0);
        super.setup(this._$elemPanel);

        this._setupSQLEditor();
        this._setupDropAsYouGo();
    }

    public getSQLEditor(): CodeMirror.Editor {
        return this._sqlEditor.getEditor();
    };


        /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQL, options?): void {
        this._dagNode = dagNode;
        this._dataModel = new SQLOpPanelModel(dagNode);
        let error: string;
        try {
            this._updateUI();
        } catch (e) {
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }

        super.showPanel(null, options)
        .then(() => {
            this._sqlEditor.refresh();
            if (error) {
                this._startInAdvancedMode(error);
            } else if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    public hasUnsavedChange(): boolean {
        if (!this.isOpen()) return false;
        const curSQL = this._sqlEditor.getValue().replace(/;+$/, "")
        const curIdentifiers = this.extractIdentifiers().identifiers;
        const preSQL = this._dagNode.getParam().sqlQueryStr;
        const preIdentifiers = this._dagNode.getIdentifiers();
        let hasChange = false;
        if (curSQL !== preSQL && curSQL !== OldSQLOpPanel._udfDefault) {
            hasChange = true;
        } else if (curIdentifiers.size !== preIdentifiers.size) {
            hasChange = true;
        } else {
            const curIterator = curIdentifiers.entries();
            const preIterator = preIdentifiers.entries();
            for (let i = 0; i < curIdentifiers.size; i++) {
                let curEntry = curIterator.next().value;
                let preEntry = preIterator.next().value;
                if (curEntry[0] !== preEntry[0] || curEntry[1] !== preEntry[1]) {
                    hasChange = true;
                    break;
                }
            }
        }
        return hasChange;
    }
    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    private _setupSQLEditor(): void {
        const self = this;
        this._sqlEditor = new SQLEditor("sqlEditor");
        this._sqlEditor
        .on("cancelExecute", () => {
            console.log("SQL cancel triggered!");
            SQLUtil.resetProgress();
        })
        .on("autoComplete", (editor: CodeMirror.Editor) => {
            editor.execCommand("autocompleteSQLInDF");
        });
        CodeMirror.commands.autocompleteSQLInDF = function(cmeditor) {
            const acTables = {};
            for(const tableName in self._sqlTables) {
                acTables[tableName] = [];
                const idx = self._sqlTables[tableName];
                if (idx) {
                    const parent = self._dagNode.getParents()[idx - 1];
                    if (parent) {
                        parent.getLineage().getColumns(false, true).forEach((parentCol) => {
                            let colName = xcHelper.cleanseSQLColName(parentCol.name);
                            let upperName = colName.toUpperCase();
                            if (colName != "DATA" &&
                                !upperName.startsWith("XCALARRANKOVER") &&
                                !upperName.startsWith("XCALAROPCODE") &&
                                !upperName.startsWith("XCALARBATCHID") &&
                                !upperName.startsWith("XCALARROWNUMPK")) {
                                acTables[tableName].push(colName);
                                acTables[colName] = [];
                            }
                        });
                    }
                }
            }

            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
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

        self._$elemPanel.on("click", ".maximize", function() {
            const $title = $(this).parent();
            const minimize = $(this).find(".icon").hasClass("xi-minus");
            self._toggleExpandSection($title, minimize);
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

    private _toggleExpandSection($title: JQuery, minimize: boolean): void {
        if (minimize) {
            // expand sql snippet section
            this._toggleExpadHelper($title.find(".maximize .icon"), true);
            this._$tableWrapper.addClass("xc-hidden");
        } else {
             // back to default size
             this._toggleExpadHelper($title.find(".maximize .icon"), false);
             this._$tableWrapper.removeClass("xc-hidden");
        }

        this._sqlEditor.refresh();
    }

    private _toggleExpadHelper($icon: JQuery, collapse: boolean) {
        if (collapse) {
            $icon.removeClass("xi-minus").addClass("xi-plus");
            xcTooltip.add($icon, {title: "Expand"});
        } else {
            $icon.addClass("xi-minus").removeClass("xi-plus");
            xcTooltip.add($icon, {title: "Collapse"});
        }
    }


    public getAlertOff(): boolean {
        return this._alertOff;
    }

    public setAlertOff(alertOff: boolean = false): void {
        this._alertOff = alertOff;
    }

    public configureSQL(
        query: string,
        identifiers?: Map<number, string>,
        identifiersNameMap?: {}
    ): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const sql = query ||
                    // XXX Currently disable multi/partial query
                    // self._sqlEditor.getSelection().replace(/;+$/, "") ||
                    self._sqlEditor.getValue().replace(/;+$/, "");
        const dropAsYouGo: boolean = this._isDropAsYouGo();
        if (!identifiers || !identifiersNameMap) {
            let retStruct = this.extractIdentifiers();
            identifiers = identifiers || retStruct.identifiers;
            identifiersNameMap = identifiersNameMap || retStruct.identifiersNameMap;
        }
        self._dagNode.setIdentifiersNameMap(identifiersNameMap);
        if (!sql) {
            self._dataModel.setDataModel("", identifiers, dropAsYouGo);
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
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail(function(err) {
                self._dataModel.setDataModel(sql, identifiers, dropAsYouGo);
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

    protected _updateUI() {
        this._renderSqlQueryString();
        this._renderIdentifiers();
        this._renderDropAsYouGo();
        // Setup event listeners
        this._setupEventListener();
    }

    public updateIdentifiers(identifiers: Map<number, string>) {
        this._dataModel.setIdentifiers(identifiers);
        this._renderIdentifiers();
    }

    private _renderSqlQueryString(): void {
        const sqlQueryString: string = this._dataModel.getSqlQueryString();
        if (!sqlQueryString) {
            this._sqlEditor.setPlaceholder(OldSQLOpPanel._udfDefault);
            this._sqlEditor.setValue("");
        } else {
            this._sqlEditor.setValue(sqlQueryString);
        }
        this._sqlEditor.refresh();
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
        const identifiers = new Map<number, string>();
        const identifiersNameMap = {};
        const valueSet = new Set();
        const sqlNode = this._dagNode;
        this._$sqlIdentifiers.find(">li").each(function() {
            const $li = $(this);
            const key = parseInt($li.find(".source .text").text());
            const value = $li.find(".dest.text").val().trim();
            if (key && xcHelper.checkNamePattern(PatternCategory.Dataset,
                                                 PatternAction.Check, value)) {
                if (validate && value) {
                    if (identifiers.has(key) || valueSet.has(value)) {
                        const duplicates = identifiers.has(key) ?
                            "Check source \"" + key + "\"" :
                            "Check identifier \"" + value + "\"";
                        throw SQLErrTStr.InvalidIdentifierMapping + ". " + duplicates;
                    }
                    if (!xcHelper.checkNamePattern(PatternCategory.SQLIdentifier,
                        PatternAction.Check, value)) {
                        throw SQLErrTStr.InvalidIdentifier + ": " + value;
                    }
                }
                identifiers.set(key, value);
                valueSet.add(value);
                let parentNode = sqlNode.getParents()[key - 1];
                if (parentNode) {
                    identifiersNameMap[parentNode.getId()] = value;
                }
            }
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
        self._$elemPanel.on('click', '.close, .cancel:not(.confirm)', function() {
            if (self.hasUnsavedChange()) {
                Alert.show({
                    title: "SQL",
                    msg: SQLTStr.UnsavedSQL,
                    onConfirm: () => {
                        self.close(false);
                    }
                });
            } else {
                self.close(false);
            }
        });

        // Submit button
        self._$elemPanel.on('click', '.submit', function() {
            if (self._isAdvancedMode()) {
                const failure = self._switchMode(false);
                if (failure) {
                    StatusBox.show(failure.error, self._$elemPanel.find(".advancedEditor"));
                    return;
                }
            }
            let identifiers;
            let identifiersNameMap;
            try {
                let retStruct = self.extractIdentifiers(true);
                identifiers = retStruct.identifiers;
                identifiersNameMap = retStruct.identifiersNameMap;
            } catch (e) {
                StatusBox.show(e, self._$elemPanel.find(".btn-submit"));
                return;
            }
            const sql = self._sqlEditor.getValue().replace(/;+$/, "");
            self.configureSQL(sql, identifiers, identifiersNameMap)
            .then(function() {
                self.close(true);
            })
            .fail(function(err) {
                Alert.show({
                    title: SQLErrTStr.Err,
                    msg: "Error details: " + JSON.stringify(err),
                    isAlert: true
                });
                self._dagNode.beErrorState();
            });
        });
        this._addEventListeners();
    }

    protected _updateMode(toAdvancedMode: boolean) {
        super._updateMode(toAdvancedMode);
        if (!toAdvancedMode) {
            this._sqlEditor.refresh();
        }
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
            const sqlQueryString = this._sqlEditor.getValue();
            const advancedParams = {
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
                const sqlQueryString = advancedParams.sqlQueryString;
                this._sqlEditor.setValue(sqlQueryString);
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