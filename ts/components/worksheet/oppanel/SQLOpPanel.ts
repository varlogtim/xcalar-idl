/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    private _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;

    private _sqlEditor: SQLEditor;
    private _$sqlIdentifiers = $("#sqlIdentifiers");
    private _$tableWrapper: JQuery;
    private _$editorWrapper: JQuery;
    private _sqlTables = {};
    private _alertOff: boolean = false;

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#sqlOpPanel');
        this._$tableWrapper = this._$elemPanel.find(".tableWrapper").eq(0);
        this._$editorWrapper = this._$elemPanel.find(".editorWrapper").eq(0);
        super.setup(this._$elemPanel);

        this._setupSQLEditor();
        this._setupDropAsYouGo();
    }

    public getSQLEditor(): CodeMirror.Editor {
        return this._sqlEditor.getEditor();
    };

    public refresh(): void {
        this._refreshEllipsis();
    }

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
        const curSQL = this._sqlEditor.getValue().replace(/;+$/, "");
        const curIdentifiers = this._extractIdentifiers();
        const preSQL = this._dagNode.getParam().sqlQueryStr;
        const preIdentifiers = this._dagNode.getIdentifiers();
        let hasChange = false;
        if (curSQL !== preSQL) {
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
        const callbacks = {
            onExecute: () => {
                // $("#sqlExecute").click();
            },
            onCancelExecute: () => {
                console.log("SQL cancel triggered!");
                SQLUtil.resetProgress();
            },
            onAutoComplete: (editor: CodeMirror.Editor) => {
                editor.execCommand("autocompleteSQLInDF");
            }
        }
        this._sqlEditor = new SQLEditor("sqlEditor", callbacks);

        CodeMirror.commands.autocompleteSQLInDF = function(cmeditor) {
            const acTables = {};
            for(const tableName in self._sqlTables) {
                acTables[tableName] = [];
                const idx = self._sqlTables[tableName];
                if (idx) {
                    const parent = self._dagNode.getParents()[idx - 1];
                    if (parent) {
                        parent.getLineage().getColumns().forEach((parentCol) => {
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
                     '  <div class="dropDownList source yesclickable">' +
                     '      <div class="text"></div>' +
                     '      <div class="iconWrapper dropdown">' +
                     '          <i class="icon xi-arrow-up"></i>' +
                     '      </div>' +
                     '      <div class="list openList">' +
                     '          <ul></ul>' +
                     '          <div class="scrollArea top">' +
                     '              <i class="arrow icon xi-arrow-up"></i>' +
                     '          </div>' +
                     '          <div class="scrollArea bottom">' +
                     '              <i class="arrow icon xi-arrow-down"></i>' +
                     '          </div>' +
                     '      </div>' +
                     '  </div>' +
                     '  <i class="icon xi-equal"></i>' +
                     '  <input class="dest text" spellcheck="false"></input>' +
                     '  <i class="icon xi-trash xc-action"></i>' +
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
        const dropDown = new MenuHelper($li.find(".dropDownList"), {
            "onSelect": this._selectSource.bind(this),
            "container": "#sqlOpPanel",
            "bounds": "#sqlOpPanel",
            "bottomPadding": 2
        });
        dropDown.setupListeners();
    }
    private _selectSource($li: JQuery): void {
        const sourceId = $li.text();
        const $source = $li.closest(".source");
        $source.find(".text").text(sourceId);
        const tableIdentifier = $source.siblings(".dest.text").val().trim();
        this._sqlTables[tableIdentifier] = sourceId;
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
        self._$elemPanel.on("click", ".addIdentifier", function() {
            $(this).blur();
            self._addTableIdentifier();
        });
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
            if (key && !xcHelper.checkNamePattern(PatternCategory.Dataset,
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
        self._$sqlIdentifiers.on("click", ".xi-trash", function() {
            const $li = $(this).closest("li");
            const key = $li.find(".dest.text").val().trim();
            delete self._sqlTables[key];
            $li.remove();
        });

        self._$elemPanel.on("click", ".maximize", function() {
            const $title = $(this).parent();
            const restore = $(this).find(".icon").hasClass("xi-exit-fullscreen");
            self._maximizeSection($title, restore);
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

    private _maximizeSection($title: JQuery, restore: boolean): void {
        const self = this;
        // refer to opPanel.less @table-h & @title-h
        const tableHeight = 180;
        const titleHeight = 40;
        const maxHeight = "calc(100% - " + (titleHeight * 2) + "px)";
        if (restore) {
            self._$elemPanel.find(".maximize .icon")
                            .removeClass("xi-exit-fullscreen")
                            .addClass("xi-fullscreen");
            self._$tableWrapper.removeClass("xc-hidden");
            self._$tableWrapper.css({height: tableHeight});
            self._$editorWrapper.css({height: "calc(100% - " +
                                      (tableHeight + titleHeight * 2) + "px)"});
        } else if ($title.hasClass("tableTitle")) {
            $title.find(".maximize .icon").removeClass("xi-fullscreen")
                                          .addClass("xi-exit-fullscreen");
            self._$editorWrapper.prev(".editorTitle").find(".maximize .icon")
                .removeClass("xi-exit-fullscreen").addClass("xi-fullscreen");
            self._$tableWrapper.css({height: maxHeight});
            self._$editorWrapper.css({height: 0});
            self._$tableWrapper.removeClass("xc-hidden");
        } else {
            $title.find(".maximize .icon").removeClass("xi-fullscreen")
                                          .addClass("xi-exit-fullscreen");
            self._$tableWrapper.prev(".tableTitle").find(".maximize .icon")
                .removeClass("xi-exit-fullscreen").addClass("xi-fullscreen");
            self._$tableWrapper.css({height: 0});
            self._$editorWrapper.css({height: maxHeight});
            self._$tableWrapper.addClass("xc-hidden");
        }
        // Sometimes gutter height won't adjust itself. Looks like a codemirror bug
        // const gutterHeight = self._$editorWrapper.find(".CodeMirror-scroll").height();
        // self._$editorWrapper.find(".CodeMirror-gutters").height(gutterHeight);
        self._sqlEditor.refresh();
    }

    private _refreshEllipsis(): void {
        const labels = document.getElementById("sqlSection")
                             .getElementsByClassName("label");
        for (let i = 0; i < labels.length; i++) {
            const el = labels[i];
            const $label = $(el);
            const name = $label.closest(".unit").attr("data-name");
            const isEllipsis = el.scrollWidth > el.clientWidth;
            this._toggleTooltip($label, name, isEllipsis);
        }
    }

    private _toggleTooltip(
        $text: JQuery,
        name: string,
        isEllipsis: boolean
    ): void {
        if (isEllipsis) {
            xcTooltip.add($text, {title: name});
        } else {
            xcTooltip.remove($text);
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
        identifiers: Map<number, string>
    ): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const sql = query ||
                    // XXX Currently disable multi/partial query
                    // self._sqlEditor.getSelection().replace(/;+$/, "") ||
                    self._sqlEditor.getValue().replace(/;+$/, "");
        const dropAsYouGo: boolean = this._isDropAsYouGo();
        identifiers = identifiers || this._extractIdentifiers();
        if (!sql) {
            self._dataModel.setDataModel("", "", [], "", identifiers, {}, dropAsYouGo);
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
            .then(function(ret) {
                const newTableName = ret.newTableName;
                const allCols = ret.allCols;
                const xcQueryString = ret.xcQueryString;
                const tableSrcMap = ret.tableSrcMap;
                self._dataModel.setDataModel(sql, newTableName,
                                             allCols, xcQueryString,
                                             identifiers, tableSrcMap, dropAsYouGo);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail(function(err) {
                self._dataModel.setDataModel(sql, "", [], "", identifiers, {}, dropAsYouGo);
                self._dataModel.submit();
                deferred.reject(err);
            })
            .always(function() {
                SQLUtil.resetProgress();
            });
        } catch (e) {
            SQLUtil.resetProgress();
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            deferred.reject();
        }
        return deferred.promise();
    };

    private _updateUI() {
        this._renderSqlQueryString();
        this._renderIdentifiers();
        this._renderDropAsYouGo();
        // Setup event listeners
        this._setupEventListener();
    }

    private _renderSqlQueryString(): void {
        const sqlQueryString = this._dataModel.getSqlQueryString();
        this._sqlEditor.setValue(sqlQueryString);
    }

    private _renderIdentifiers(): void {
        const self = this;
        // clean up old elements first
        self._$sqlIdentifiers.html("");
        self._sqlTables = {};
        const identifiers = this._dataModel.getIdentifiers();
        if (identifiers.size > 0) {
            identifiers.forEach(function(value, key) {
                self._addTableIdentifier(key, value);
                self._sqlTables[value] = key;
            });
        } else {
            self._addTableIdentifier();
        }
    }

    private _renderDropAsYouGo(): void {
        let dropAsYouGo: boolean = this._dataModel.isDropAsYouGo();
        this._toggleDropAsYouGo(dropAsYouGo);
    }

    private _extractIdentifiers(validate: boolean = false): Map<number, string> {
        const identifiers = new Map<number, string>();
        const valueSet = new Set();
        this._$sqlIdentifiers.find(">li").each(function() {
            const $li = $(this);
            const key = parseInt($li.find(".source .text").text());
            const value = $li.find(".dest.text").val().trim();
            if (key && value &&
                xcHelper.checkNamePattern(PatternCategory.Dataset,
                                          PatternAction.Check, value)) {
                if (validate) {
                    if (identifiers.has(key) || valueSet.has(value)) {
                        const duplicates = identifiers.has(key) ?
                            "Check source \"" + key + "\"" :
                            "Check identifier \"" + value + "\"";
                        throw SQLErrTStr.InvalidIdentifierMapping + ". " + duplicates;
                    }
                    if (!xcHelper.checkNamePattern(PatternCategory.Dataset,
                        PatternAction.Check, value)) {
                        throw SQLErrTStr.InvalidIdentifier;
                    }
                }
                identifiers.set(key, value);
                valueSet.add(value);
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
            try {
                identifiers = self._extractIdentifiers(true);
            } catch (e) {
                StatusBox.show(e, self._$elemPanel.find(".btn-submit"));
                return;
            }
            const sql = self._sqlEditor.getValue().replace(/;+$/, "");
            self.configureSQL(sql, identifiers)
            .then(function() {
                self.close(true);
            })
            .fail(function(err) {
                if (err === SQLErrTStr.EmptySQL) {
                    StatusBox.show(err, self._$elemPanel.find(".btn-submit"));
                }
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
                identifiersMap = this._extractIdentifiers(true);
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
            this._editor.setValue(JSON.stringify(advancedParams, null, 4));
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
                } else {
                    this._addTableIdentifier();
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

    protected _restoreBasicModeParams() {
        const identifiers = {};
        this._dataModel.getIdentifiers().forEach(function(value, key) {
            identifiers[key] = value;
        });
        const sqlQueryString = this._dataModel.getSqlQueryString();
        const advancedParams = {identifiers: identifiers, sqlQueryString: sqlQueryString};
        this._editor.setValue(JSON.stringify(advancedParams, null, 4));
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
}

interface derivedColStruct {
    colName: string,
    mapStr: string,
    colType: string
}