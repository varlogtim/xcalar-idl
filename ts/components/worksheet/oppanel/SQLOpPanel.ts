/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    private _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;

    private _sqlEditor: SQLEditor;
    private _$sqlButton: JQuery;
    private _$sqlSnippetDropdown = $("#sqlSnippetsList");
    private _$sqlIdentifiers = $("#sqlIdentifiers");
    private _$snippetSave: JQuery;
    private _$snippetConfirm: JQuery;
    private _$tableWrapper: JQuery;
    private _$editorWrapper: JQuery;
    private _sqlTables = {};
    private _defaultSnippet: string;
    private _curSnippet : string;
    private _dropdownHint: InputDropdownHint;

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#sqlOpPanel');
        this._$snippetSave = this._$elemPanel.find(".saveSection").eq(0);
        this._$snippetConfirm = this._$elemPanel.find(".confirmSection").eq(0);
        this._$sqlButton = this._$elemPanel.find(".btn-submit").eq(0);
        this._$tableWrapper = this._$elemPanel.find(".tableWrapper").eq(0);
        this._$editorWrapper = this._$elemPanel.find(".editorWrapper").eq(0);
        super.setup(this._$elemPanel);

        this._defaultSnippet = SQLSnippet.Default;
        this._curSnippet = this._defaultSnippet;

        this._loadSnippets();

        this._setupSQLEditor();
        this._setupSnippetsList();
    }

    public getSQLEditor(): CodeMirror.Editor {
        return this._sqlEditor.getEditor();
    };

    public refresh(): void {
        this._refreshEllipsis();
    }

    private _loadSnippets(): void {
        SQLSnippet.Instance.listSnippetsAsync()
        .then((snippets: {name: string, snippet: string}[]) => {
            try {
                // only populate dropdown
                const $ul = this._$sqlSnippetDropdown.find("ul");
                snippets.forEach((snippetInfo) => {
                    const html =
                        '<li data-name="' + snippetInfo.name +
                        '" data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top">' + snippetInfo.name +
                            '<i class="icon xi-trash"></i>' +
                        '</li>';
                    $(html).appendTo($ul);
                });
            } catch(e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidSnippetMeta,
                    isAlert: true
                });
            }
        })
        .fail(() => {
            Alert.show({
                title: "SQLEditor Error",
                msg: "Failed to get SQL snippets",
                isAlert: true
            });
        });
    }

    // SQLEditor.setCurId = function(txId) {
    //     curQueryId = txId;
    // }

    public fakeCompile(numSteps: number): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this.lockProgress();
        this._$sqlButton.html("Compiling... 0/" + numSteps);

        const numMilSeconds = 1500;
        // update once every 100ms
        const frequency = 100;

        const amtPerTick = numSteps/(numMilSeconds/frequency);
        for (let i = 0; i < numMilSeconds/frequency; i++) {
            setTimeout(function() {
                const buttonText = this._$sqlButton.html();
                let numCurSteps = parseInt(buttonText.substring(13,
                                                      buttonText.indexOf("/")));
                const backPart = buttonText.substring(buttonText.indexOf("/"));
                numCurSteps += Math.ceil(Math.random() * amtPerTick * 2);
                if (numCurSteps > parseInt(backPart.substring(1))) {
                    numCurSteps = parseInt(backPart.substring(1));
                }
                this._$sqlButton.html("Compiling... " + numCurSteps
                                                                    + backPart);
            }, i*frequency);
        }

        setTimeout(function() {
            deferred.resolve();
        }, numMilSeconds);
        return deferred.promise();
    };

    public startCompile(numSteps: number): void {
        this.lockProgress();
        if (numSteps === 0) {
            this._$sqlButton.html("Compiling...");
        } else {
            const buttonText = this._$sqlButton.html();
            if (buttonText === "Compiling...") {
                return;
            }
            this._$sqlButton.html("Compiling... 0/" + numSteps);
        }
    };

    // public startExecution(): void {
    //     this._$sqlButton.html("Executing... ");
    // };

    public updateProgress(): void {
        const buttonText = this._$sqlButton.html();
        if (buttonText.indexOf("/") === -1) {
            return;
        }
        let numCurSteps = parseInt(buttonText.substring(13,
                                                      buttonText.indexOf("/")));
        const backPart = buttonText.substring(buttonText.indexOf("/"));
        numCurSteps++;
        this._$sqlButton.html("Compiling... " + numCurSteps + backPart);
    };

    public static resetProgress(): void {
        const $sqlButton = $("#sqlOpPanel").find(".btn-submit");
        $sqlButton.removeClass("btn-disabled");
        $sqlButton.html("Save"); // XXX Change to variable
        $("#sqlSnippetsList").removeClass("xc-disabled");
    };

    public lockProgress(): void {
        this._$sqlButton.addClass("btn-disabled");
        this._$sqlSnippetDropdown.addClass("xc-disabled");
    }

    private _setupSQLEditor(): void {
        const self = this;
        const callbacks = {
            onExecute: () => {
                // $("#sqlExecute").click();
            },
            onCancelExecute: () => {
                console.log("SQL cancel triggered!");
                SQLOpPanel.resetProgress();
            },
            onAutoComplete: (editor: CodeMirror.Editor) => {
                editor.execCommand("autocompleteSQLInDF");
            }
        }
        this._sqlEditor = new SQLEditor("sqlEditor", callbacks);

        CodeMirror.commands.autocompleteSQLInDF = function(cmeditor) {
            var acTables = {};
            for(var tableName in self._sqlTables) {
                acTables[tableName] = [];
                const idx = self._sqlTables[tableName];
                if (idx) {
                    const parent = self._dagNode.getParents()[idx - 1];
                    if (parent) {
                        parent.getLineage().getColumns().forEach((parentCol) => {
                            if (parentCol.name != "DATA") {
                                acTables[tableName].push(parentCol.name);
                                acTables[parentCol.name] = [];
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
                     '  <i class="icon xi-trash"></i>' +
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
        let usedIdentifier;
        this._$sqlIdentifiers.find(">li").each(function() {
            if (!$(this).find(".source").is($source) &&
                sourceId === $(this).find(".source .text").text()) {
                usedIdentifier = $(this).find(".dest.text").val().trim();
            }
        });
        if (usedIdentifier) {
            StatusBox.show(SQLErrTStr.SourceUsed + usedIdentifier,
                           $source.find(".text"));
        } else {
            $source.find(".text").text(sourceId);
            const tableIdentifier = $source.siblings(".dest.text").val().trim();
            this._sqlTables[tableIdentifier] = sourceId;
        }
    }

    private _toggleSnippetSave(): void {
        const $icon = this._$elemPanel.find(".snippetSection .save:not(.confirm) .icon");
        const editorHeight = this._$elemPanel.find(".editSection").outerHeight();
        let adjustHeight = this._$elemPanel.find(".snippetSection").outerHeight();
        if (this._$snippetSave.hasClass("xc-hidden") &&
            this._$snippetConfirm.hasClass("xc-hidden")) {
            $icon.removeClass("xi-save");
            $icon.addClass("xi-close");
            this._$elemPanel.find(".editSection").outerHeight(editorHeight - adjustHeight);
            if (this._$snippetConfirm.hasClass("xc-hidden")) {
                this._$snippetSave.removeClass("xc-hidden");
            } else {
                this._$snippetConfirm.addClass("xc-hidden");
            }
            // if it's default snippet, disable overwriting
            if (this._curSnippet === this._defaultSnippet) {
                this._$snippetSave.find(".overwriteSnippet").addClass("xc-disabled");
            } else {
                this._$snippetSave.find(".overwriteSnippet").removeClass("xc-disabled");
            }
        } else {
            $icon.removeClass("xi-close");
            $icon.addClass("xi-save");
            this._$elemPanel.find(".editSection").outerHeight(editorHeight + adjustHeight);
            this._$snippetSave.addClass("xc-hidden");
            this._$snippetConfirm.addClass("xc-hidden");
        }
    }

    private _toggleSnippetConfirmation(newSnippet?: boolean): void {
        if (this._$snippetConfirm.hasClass("xc-hidden")) {
            this._$snippetConfirm.removeClass("xc-hidden");
            this._$snippetSave.addClass("xc-hidden");
            if (newSnippet) {
                this._$snippetConfirm.find(".snippetName").val("");
                this._$snippetConfirm.addClass("newSnippet");
            } else {
                this._$snippetConfirm.find(".snippetName").val(this._curSnippet);
                this._$snippetConfirm.removeClass("newSnippet");
            }
        } else {
            this._$snippetConfirm.addClass("xc-hidden");
            this._$snippetConfirm.removeClass("newSnippet");
            this._$snippetSave.removeClass("xc-hidden");
        }
    }

    private _updateSnippet(snippetName: string): void {
        if (!snippetName || !xcHelper.checkNamePattern(PatternCategory.SQLSnippet,
                                                   PatternAction.Check,
                                                   snippetName)) {
            StatusBox.show(SQLErrTStr.InvalidEditorName,
                           this._$elemPanel.find("input.snippetName"));
            return;
        }
        const $ul = this._$sqlSnippetDropdown.find("ul");
        if (this._$snippetConfirm.hasClass("newSnippet")) {
            // saving as a new snippet
            if (SQLSnippet.Instance.hasSnippet(snippetName)) {
                StatusBox.show(SQLErrTStr.SnippetNameExists,
                               this._$elemPanel.find("input.snippetName"));
                return;
            } else {
                const html = '<li data-name="' + snippetName + '" data-toggle="tooltip" ' +
                             'data-container="body" data-placement="top">' +
                             snippetName + '<i class="icon xi-trash"></i></li>';
                $ul.append(html);
                this._curSnippet = snippetName;
                SQLSnippet.Instance.writeSnippet(snippetName, this._sqlEditor.getValue(), false);
            }
        } else {
            // overwriting snippet
            $ul.find('li[data-name="'+ this._curSnippet +'"]').attr("data-name", snippetName).text(snippetName);
            this._curSnippet = snippetName;
            SQLSnippet.Instance.writeSnippet(snippetName, this._sqlEditor.getValue(), true);
        }
        this._selectSnippetByName(snippetName);
    }

    private _addEventListeners(): void {
        const self = this;
        // Snippet section listeners
        self._$sqlSnippetDropdown.on("mouseup", ".xi-trash", function() {
            const $li = $(this).closest("li");
            self._deleteSnippet($li);
        });
        self._$elemPanel.on("click", ".snippetSection .save:not(.confirm)", function() {
            self._toggleSnippetSave();
        });

        self._$elemPanel.on("click", ".saveSection .btn", function() {
            const newSnippet = $(this).hasClass("newSnippet");
            self._toggleSnippetConfirmation(newSnippet);
        })

        self._$elemPanel.on("click", ".confirmSection .confirm", function() {
            const confirm = $(this).hasClass("save");
            if (confirm) {
                const newSnippetName = self._$elemPanel.find(".snippetName").val().trim();
                self._updateSnippet(newSnippetName);
                self._toggleSnippetSave();
            } else {
                self._toggleSnippetConfirmation();
            }
        })

        // Identifier section listeners
        self._$elemPanel.on("click", ".addIdentifier button", function() {
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
            let valid = true;
            if (key && !xcHelper.checkNamePattern(PatternCategory.Dataset,
                                                  PatternAction.Check, key)) {
                StatusBox.show(SQLErrTStr.InvalidIdentifier, $input);
                valid = false;
                return;
            }
            self._$sqlIdentifiers.find(".text.dest").each(function() {
                if (!$(this).is($input) && key && $(this).val().trim() === key) {
                    StatusBox.show(SQLErrTStr.IdentifierExists, $input);
                    valid = false;
                }
            });
            if (key && valid) {
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

        // XXX Disabling multi-queries for now
        // $("#sqlExecute").click(function() {
        //     const promiseArray = [];
        //     let sql = self._sqlEditor.getSelection();
        //     if (sql === "") {
        //         sql = self._sqlEditor.getValue();
        //     }
        //     let allQueries;
        //     if (sql.indexOf(";") === -1) {
        //         allQueries = [sql];
        //     } else {
        //         allQueries = XDParser.SqlParser.getMultipleQueriesViaParser(sql);
        //     }
        //     if (allQueries.length > 1) {
        //         self.startCompile(0);
        //     }
        //     for (const query of allQueries) {
        //         const promise = self.executeSQL(query);
        //         promiseArray.push(promise);
        //     }
        //     PromiseHelper.when.apply(window, promiseArray);
        // });

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

    private _deleteSnippet($li: JQuery): void {
        const snippetName = $li.text();
        SQLSnippet.Instance.deleteSnippet(snippetName);
        $li.remove();
        if (this._curSnippet === snippetName) {
            this._selectSnippetByName(this._defaultSnippet);
        }
    }

    private _setupSnippetsList(): void {
        const menuHelper = new MenuHelper(this._$sqlSnippetDropdown, {
            "onSelect": this._selectSnippet.bind(this),
            "container": "#sqlOpPanel",
            "bounds": "#sqlOpPanel",
            "bottomPadding": 2
        });

        this._dropdownHint = new InputDropdownHint(this._$sqlSnippetDropdown, {
            "menuHelper": menuHelper,
            "onEnter": this._selectSnippetByName.bind(this),
            "noBold": true
        });
    }

    private _selectSnippet($li: JQuery): any {
        if (!this._$snippetSave.hasClass("xc-hidden") ||
            !this._$snippetConfirm.hasClass("xc-hidden")) {
                this._toggleSnippetSave();
        }
        if ($li.length > 1) {
            $li = $li.eq(0);
        }
        $li.parent().find("li").removeClass("selected");
        $li.addClass("selected");

        const $snippetListInput = this._$sqlSnippetDropdown.find("input").eq(0);
        const snippetName = $li.text().trim();

        StatusBox.forceHide();
        this._dropdownHint.setInput(snippetName);

        xcTooltip.changeText($snippetListInput, snippetName);
        this._curSnippet = snippetName;

        if (snippetName !== this._defaultSnippet &&
            !SQLSnippet.Instance.hasSnippet(snippetName)) {
            this._selectSnippetByName(this._defaultSnippet);
        } else {
            this._sqlEditor.setValue(SQLSnippet.Instance.getSnippet(snippetName));
            this._sqlEditor.refresh();
        }
    }

    private _selectSnippetByName(snippetName: string): boolean {
        const $li = $("#sqlSnippetMenu").find("li").filter(function() {
            return $(this).text().trim() === snippetName;
        });
        if ($li.length === 0) {
            StatusBox.show(SQLErrTStr.NoSnippet, this._$sqlSnippetDropdown);
            return true;
        } else {
            this._selectSnippet($li);
            return false;
        }
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

    public static updatePlanServer(
        type: string,
        struct?: {}[]
    ): XDPromise<any> {
        let url;
        let action;
        const session = WorkbookManager.getActiveWKBK();
        switch (type) {
            case ("update"):
                url = planServer + "/schemasupdate/" +
                      encodeURIComponent(encodeURIComponent(session));
                action = "PUT";
                break;
            case ("dropAll"):
                url = planServer + "/schemadrop/" +
                      encodeURIComponent(encodeURIComponent(session));
                action = "DELETE";
                break;
            default:
                return PromiseHelper.reject("Invalid type for updatePlanServer");
        }
        const deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: action,
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: url,
            dataType: "text", // XXX remove this when the planner bug is fixed
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
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

    public configureSQL(query: string): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const sql = query ||
                    // XXX Currently disable multi/partial query
                    // self._sqlEditor.getSelection().replace(/;+$/, "") ||
                    self._sqlEditor.getValue().replace(/;+$/, "");
        const paramterizedSQL = xcHelper.replaceMsg(sql,
                                DagParamManager.Instance.getParamMap(), true);
        const identifiers = this._extractIdentifiers();
        if (!paramterizedSQL) {
            self._dataModel.setDataModel("", "", [], "", identifiers, {});
            self._dataModel.submit();
            return PromiseHelper.resolve();
        }
        const queryId = xcHelper.randName("sql", 8);
        try {
            self.lockProgress();
            self._dagNode.compileSQL(paramterizedSQL, queryId, identifiers)
            .then(function(ret) {
                const newTableName = ret.newTableName;
                const allCols = ret.allCols;
                const xcQueryString = ret.xcQueryString;
                const tableSrcMap = ret.tableSrcMap;
                self._dataModel.setDataModel(paramterizedSQL, newTableName,
                                             allCols, xcQueryString,
                                             identifiers, tableSrcMap);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail(function(err) {
                self._dataModel.setDataModel(paramterizedSQL, "", [], "", identifiers, {});
                self._dataModel.submit();
                deferred.reject(err);
            })
            .always(function() {
                SQLOpPanel.resetProgress();
            });
        } catch (e) {
            SQLOpPanel.resetProgress();
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            deferred.reject();
        }
        return deferred.promise();
    };
    public static throwError(errStr) {
        SQLOpPanel.resetProgress();
        Alert.show({
            title: "Compilation Error",
            msg: "Error details: " + errStr,
            isAlert: true
        });
    };
    public static isOnHistPanel(): boolean {
        return $("#monitor-query-history").hasClass("active");
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

        super.showPanel(null, options);
        this._sqlEditor.refresh();
        if (error) {
            this._startInAdvancedMode(error);
        }
    }

    /**
     * Hide the panel
     */
    public close(): void {
        super.hidePanel();
    }

    private _updateUI() {
        this._renderSqlQueryString();
        this._renderIdentifiers();

        // Setup event listeners
        this._setupEventListener();
    }

    private _renderSqlQueryString(): void {
        const sqlQueryString = this._dataModel.getSqlQueryString();
        this._sqlEditor.setValue(sqlQueryString);
        SQLSnippet.Instance.writeSnippet(this._defaultSnippet, sqlQueryString, true);
        // select default snippet
        this._selectSnippetByName(this._defaultSnippet);
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
    private _extractIdentifiers(): Map<number, string>{
        const identifiers = new Map<number, string>();
        this._$sqlIdentifiers.find(">li").each(function() {
            const $li = $(this);
            const key = parseInt($li.find(".source .text").text());
            const value = $li.find(".dest.text").val().trim();
            if (key && value &&
                xcHelper.checkNamePattern(PatternCategory.Dataset,
                                          PatternAction.Check, value)) {
                identifiers.set(key, value);
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
            self.close();
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
            const sql = self._sqlEditor.getValue().replace(/;+$/, "");
            self.configureSQL(sql)
            .then(function() {
                self.close();
            })
            .fail(function(err) {
                if (err === SQLErrTStr.EmptySQL) {
                    StatusBox.show(err, self._$elemPanel.find(".btn-submit"));
                }
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
            this._extractIdentifiers().forEach(function(value, key) {
                identifiers[key] = value;
                identifiersOrder.push(key);
            });
            const sqlQueryString = this._sqlEditor.getValue();
            const advancedParams = {sqlQueryString: sqlQueryString,
                                    identifiers: identifiers,
                                    identifiersOrder: identifiersOrder};
            this._editor.setValue(JSON.stringify(advancedParams, null, 4));
        } else {
            try {
                const advancedParams = JSON.parse(this._editor.getValue());
                if (!advancedParams.hasOwnProperty("identifiers")) {
                    return {error: SQLErrTStr.MissingField + "identifiers"};
                }
                if (!advancedParams.hasOwnProperty("sqlQueryString")) {
                    return {error: SQLErrTStr.MissingField + "sqlQueryString"};
                }
                const identifiers = advancedParams.identifiers;
                let identifiersOrder = advancedParams.identifiersOrder.map((identifier) => {
                    return parseInt(identifier);
                });
                if (!this._validateIdentifiers(identifiers, identifiersOrder)) {
                    return {error: SQLErrTStr.IdentifierMismatch};
                }
                const sqlQueryString = advancedParams.sqlQueryString;
                this._sqlEditor.setValue(sqlQueryString);
                SQLSnippet.Instance.writeSnippet(this._defaultSnippet, sqlQueryString, true);
                // select default snippet
                this._selectSnippetByName(this._defaultSnippet);

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
}

interface derivedColStruct {
    colName: string,
    mapStr: string,
    colType: string
}