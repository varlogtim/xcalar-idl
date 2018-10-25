/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    private _dataModel: SQLOpPanelModel; // The key data structure
    private _dagNode: DagNodeSQL;

    private _sqlEditor: CodeMirror.Editor;
    private _$sqlButton: JQuery;
    private _$sqlSnippetDropdown = $("#sqlSnippetsList");
    private _$sqlIdentifiers = $("#sqlIdentifiers");
    private _$snippetSave: JQuery;
    private _$snippetConfirm: JQuery;
    private _$tableWrapper: JQuery;
    private _$editorWrapper: JQuery;
    private _sqlTables = {};
    private _snippetQueryKvStore : KVStore;
    private _snippetKvStore: KVStore;
    private _sqlComs : SQLCompiler[];
    private _keywordsToRemove: string[];
    private _keywordsToAdd: string[];
    private _defaultSnippet: string;
    private _allSnippets : {};
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

        this._keywordsToRemove = ["alter", "begin", "create", "delete", "drop",
                                  "insert", "into", "set", "table", "update",
                                  "values"];
        this._keywordsToAdd = ["over", "partition", "intersect", "except",
                               "with", "left", "right", "outer", "natural",
                               "semi", "anti", "rollup", "cube", "grouping",
                               "sets", "limit", "sum", "avg", "max", "min"];
        this._defaultSnippet = "Default Snippet";
        this._allSnippets = {};
        this._curSnippet = this._defaultSnippet;
        this._sqlComs = [];

        const snippetQueryKey = KVStore.getKey("gSQLSnippetQuery");
        const snippetKey = KVStore.getKey("gSQLSnippet");
        this._snippetQueryKvStore = new KVStore(snippetQueryKey, gKVScope.WKBK);
        this._snippetKvStore = new KVStore(snippetKey, gKVScope.WKBK);
        this._loadSnippets();


        this._setupSQLEditor();
        this._setupSnippetsList();
    }

    public getSQLEditor(): CodeMirror.Editor {
        return this._sqlEditor;
    };

    public refresh(): void {
        this._refreshEllipsis();
    }

    private _loadSnippets(): void {
        const self = this;
        self._snippetQueryKvStore.get()
        .then(function(ret) {
            try {
                if (ret) {
                    self._allSnippets = JSON.parse(ret);
                }
            } catch (e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidSQLQuery,
                    isAlert: true
                });
            }
            return self._snippetKvStore.get();
        })
        .then(function(ret) {
            let snippetsOrder = [];
            try {
                if (ret) {
                    snippetsOrder = JSON.parse(ret);
                }
            } catch(e) {
                Alert.show({
                    title: "SQLEditor Error",
                    msg: SQLErrTStr.InvalidSnippetMeta,
                    isAlert: true
                });
            }
            // only populate dropdown
            const $ul = self._$sqlSnippetDropdown.find("ul");
            for (const snippetName of snippetsOrder) {
                const html = '<li data-name="' + snippetName +
                             '" data-toggle="tooltip" data-container="body"' +
                             ' data-placement="top">' + snippetName +
                             '<i class="icon xi-trash"></i></li>';
                $(html).appendTo($ul);
            }
        })
        .fail(function() {
            Alert.show({
                title: "SQLEditor Error",
                msg: "Failed to get SQL snippets",
                isAlert: true
            });
        });
    }

    private _updateSnippetKVStore(): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const allSnippets = jQuery.extend(true, {}, this._allSnippets);
        delete allSnippets[this._defaultSnippet];
        self._snippetQueryKvStore.put(JSON.stringify(allSnippets), true)
        .then(function() {
            const snippetsOrder = [];
            self._$sqlSnippetDropdown.find("li[data-name]").each(function() {
                snippetsOrder.push($(this).attr("data-name"));
            });
            return self._snippetKvStore.put(JSON.stringify(snippetsOrder), true);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
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

    public resetProgress(): void {
        this._$sqlButton.removeClass("btn-disabled");
        this._$sqlButton.html("Save"); // XXX Change to variable
        this._$sqlSnippetDropdown.removeClass("xc-disabled");
    };

    public lockProgress(): void {
        this._$sqlButton.addClass("btn-disabled");
        this._$sqlSnippetDropdown.addClass("xc-disabled");
    }

    private _executeTrigger(): void {
        $("#sqlExecute").click();
    }

    private _cancelExec(): void {
        console.error("SQL cancel triggered!");
        this._sqlComs.forEach(function(sqlCom) {
            sqlCom.setStatus(SQLStatus.Cancelled);
        })
    }

    private _convertTextCase(flag: boolean): void {
        const text = this._sqlEditor.getSelection();
        if (text != "") {
            if (flag) {
                this._sqlEditor.replaceSelection(text.toLocaleUpperCase(), "around");
            } else {
                this._sqlEditor.replaceSelection(text.toLocaleLowerCase(), "around");
            }
        }
    }

    private _toggleComment(): void {
        const startPos = this._sqlEditor.getCursor("from");
        const endPos = this._sqlEditor.getCursor("to");
        const startLineNum = startPos.line;
        const endLineNum = endPos.line;
        let commentCount = 0;
        this._sqlEditor.eachLine(startLineNum, endLineNum + 1, function(lh) {
            if (lh.text.trimStart().startsWith("--")) {
                commentCount++;
            }
        })
        if (commentCount === endLineNum - startLineNum + 1) {
            for (let i = startLineNum; i <= endLineNum; i++) {
                const text = this._sqlEditor.getLine(i);
                this._sqlEditor.setSelection({line: i, ch: 0},
                                          {line: i, ch: text.length});
                this._sqlEditor.replaceSelection(text.replace(/--/, ""));
            }
        } else {
            for (let i = startLineNum; i <= endLineNum; i++) {
                const text = this._sqlEditor.getLine(i);
                this._sqlEditor.setSelection({line: i, ch: 0},
                                          {line: i, ch: text.length});
                this._sqlEditor.replaceSelection("--" + text);
            }
        }
        this._sqlEditor.setSelection(startPos,endPos);
    }

    private _scrollLine(flag: boolean): void {
        if (flag) {
            this._sqlEditor.scrollTo(null, this._sqlEditor.getScrollInfo().top -
                                        this._sqlEditor.defaultTextHeight());
        } else {
            this._sqlEditor.scrollTo(null, this._sqlEditor.getScrollInfo().top +
                                        this._sqlEditor.defaultTextHeight());
        }
    }

    private _insertLine(flag: boolean): void {
        if (flag) {
            const curPos = this._sqlEditor.getCursor("from");
            const insertPos = {line: curPos.line, ch: 0};
            this._sqlEditor.replaceRange("\n", insertPos);
            this._sqlEditor.setCursor(insertPos);
        } else {
            const curPos = this._sqlEditor.getCursor("to");
            const insertPos = {line: curPos.line,
                               ch: this._sqlEditor.getLine(curPos.line).length};
            this._sqlEditor.replaceRange("\n", insertPos);
            this._sqlEditor.setCursor({line: curPos.line + 1, ch: 0});
        }
    }

    private _setupSQLEditor(): void {
        const self = this;
        const textArea = document.getElementById("sqlEditor");
        if (!textArea) {
            // For Release Candidates
            return;
        }

        const extraKeys = {"F5": self._executeTrigger,
                         "Alt-X": self._executeTrigger,
                         "Ctrl-Space": "autocomplete", // Need to write autocomplete code
                         "Ctrl--": self._toggleComment};

        let cButton = "Ctrl";
        if (isSystemMac) {
            cButton = "Cmd";
            extraKeys[cButton + "-Alt-F"] = "replace";
            extraKeys["Shift-" + cButton + "-Backspace"] = "delWordAfter";
            extraKeys["F6"] = self._cancelExec;
            extraKeys["F3"] = "findNext";
            extraKeys["Shift-F3"] = "findPrev";
        } else {
            extraKeys[cButton + "-H"] = "replace";
            extraKeys[cButton + "-Delete"] = "delWordAfter";
            extraKeys["Ctrl-Alt-C"] = self._cancelExec;
            extraKeys["Ctrl-Alt-G"] = "findNext";
            extraKeys["Shift-Ctrl-Alt-G"] = "findPrev";
        }
        extraKeys[cButton + "-E"] = self._executeTrigger;
        extraKeys[cButton + "-Left"] = "goWordLeft";
        extraKeys[cButton + "-Right"] = "goWordRight";
        extraKeys[cButton + "-Backspace"] = "delWordBefore";
        extraKeys["Shift-" + cButton + "-U"] = self._convertTextCase.bind(window, true);
        extraKeys["Shift-" + cButton + "-L"] = self._convertTextCase.bind(window, false);
        extraKeys["Shift-" + cButton + "-K"] = "deleteLine";
        extraKeys[cButton + "-Up"] = self._scrollLine.bind(window, true);
        extraKeys[cButton + "-Down"] = self._scrollLine.bind(window, false);
        extraKeys[cButton + "-Enter"] = self._insertLine.bind(window, true);
        extraKeys["Shift-" + cButton + "-Enter"] = self._insertLine.bind(window, false);

        self._sqlEditor = CodeMirror.fromTextArea(textArea as HTMLTextAreaElement,
            {
                "mode": "text/x-sql",
                "theme": "xcalar-light",
                "lineNumbers": true,
                "lineWrapping": true,
                "smartIndent": true,
                "indentWithTabs": false,
                // "indentUnit": 4,
                "matchBrackets": true,
                "autofocus": true,
                "autoCloseBrackets": true,
                "search": true,
                "hint": CodeMirror.hint.sql,
                "extraKeys": extraKeys,
            }
        );

        self._sqlEditor.on("keyup", function(_cm, e) {
            if (e.keyCode >= 65 && e.keyCode <= 90 ||
                e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey ||
                e.keyCode === 190 && !e.shiftKey) {
                self._sqlEditor.execCommand("autocomplete");
            }
        });

        self._keywordsToRemove.forEach(function(key) {
            delete CodeMirror.resolveMode("text/x-sql").keywords[key];
        })

        self._keywordsToAdd.forEach(function(key) {
            CodeMirror.resolveMode("text/x-sql").keywords[key] = true;
        })

        CodeMirror.commands.autocomplete = function (cmeditor) {
            var acTables = {};
            for(var tableName in self._sqlTables) {
                acTables[tableName] = [];
                const idx = self._sqlTables[tableName];
                if (idx) {
                    const parent = self._dagNode.getParents()[idx - 1];
                    parent.getLineage().getColumns().forEach((parentCol) => {
                        if (parentCol.name != "DATA") {
                            acTables[tableName].push(parentCol.name);
                            acTables[parentCol.name] = [];
                        }
                    });
                }
            }

            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
        self._sqlEditor.refresh();
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
        const dropDown = new MenuHelper($li.find(".dropDownList"), {
            "onSelect": this._selectSource,
            "container": "#sqlOpPanel",
            "bounds": "#sqlOpPanel",
            "bottomPadding": 2
        });
        dropDown.setupListeners();
    }
    private _selectSource($li: JQuery): void {
        const sourceId = $li.text();
        $li.closest(".source").find(".text").text(sourceId);
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
            if (this._allSnippets.hasOwnProperty(snippetName)) {
                StatusBox.show(SQLErrTStr.SnippetNameExists,
                               this._$elemPanel.find("input.snippetName"));
                return;
            } else {
                const html = '<li data-name="' + snippetName + '" data-toggle="tooltip" ' +
                             'data-container="body" data-placement="top">' +
                             snippetName + '<i class="icon xi-trash"></i></li>';
                $ul.append(html);
                this._allSnippets[snippetName] = this._sqlEditor.getValue();
                this._curSnippet = snippetName;
            }
        } else {
            // overwriting snippet
            $ul.find('li[data-name="'+ this._curSnippet +'"]').attr("data-name", snippetName).text(snippetName);
            delete this._allSnippets[this._curSnippet];
            this._allSnippets[snippetName] = this._sqlEditor.getValue();
            this._curSnippet = snippetName;
        }
        this._selectSnippetByName(snippetName);
        this._updateSnippetKVStore();
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
        self._$sqlIdentifiers.on("mouseup", ".source", function() {
            self._$sqlIdentifiers.find(">li").each(function() {
                const $li = $(this);
                self._populateSourceIds($li);
            });
        })
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
        $li.find("ul").html(content);
    }

    private _deleteSnippet($li: JQuery): void {
        const snippetName = $li.text();
        delete this._allSnippets[snippetName];
        $li.remove();
        if (this._curSnippet === snippetName) {
            this._selectSnippetByName(this._defaultSnippet);
        } else {
            this._updateSnippetKVStore();
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
            !this._allSnippets.hasOwnProperty(snippetName)) {
            this._selectSnippetByName(this._defaultSnippet);
        } else {
            this._sqlEditor.setValue(this._allSnippets[snippetName]);
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

    private _updatePlanServer(
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

    public getPrevQueries(): SQLCompiler[] {
        return this._sqlComs;
    }

    private _getDerivedColName(colName: string): string {
        if (colName.indexOf("::") > 0) {
            colName = colName.split("::")[1];
        }
        if (colName.endsWith("_integer") || colName.endsWith("_float") ||
            colName.endsWith("_boolean") || colName.endsWith("_string")) {
            colName = colName.substring(0, colName.lastIndexOf("_"));
        }
        colName = colName.replace(/[\^,\(\)\[\]{}'"\.\\ ]/g, "_");
        return colName;
    }

    // === Copied from derived conversion
    private _getDerivedCol(col: ProgCol): derivedColStruct {

        if (col.type === 'array' || col.type === 'object' || col.type === 'mixed'
            || col.type === 'undefined' || col.type === 'unknown') {
            // array and object columns will be projected away at the end
            // this case also handles 'DATA' column, and leaves table unchanged
            return;
        } else {
            // convert prefix field of primitive type to derived
            let mapFn;
            let overwriteType;
            if (col.type === 'integer' ||col.type === 'number'
                || col.type === 'float') {
                // convert all numbers to float, since we cannot determine
                // actual type of prefix fields
                mapFn = "float";
                overwriteType = "float";
            } else if (col.type === 'boolean') {
                mapFn = "bool";
            } else if (col.type === 'timestamp') {
                mapFn = "timestamp";
            } else {
                mapFn = "string";
            }
            const mapStr = mapFn + "(" + col.backName + ")";
            const newColName = this._getDerivedColName(col.backName).toUpperCase();
            const colStruct = {
                colName: newColName,
                mapStr: mapStr,
                colType: overwriteType || col.type
            };
            return colStruct;
        }

    }

    private _finalizeTable(sourceId: number): XDPromise<any> {
        // XXX May be removed when CAST screen is done
        if (this._dagNode.getParents().length < sourceId) {
            return PromiseHelper.reject("Node connection doesn't exist");
        }
        const deferred = PromiseHelper.deferred();
        const srcTable = this._dagNode.getParents()[sourceId - 1];
        const srcTableName = srcTable.getTable() ||
                     xcHelper.randName("sqlTable") + Authentication.getHashId();

        const cols = srcTable.getLineage().getColumns();
        const tableInfo = {"name": srcTableName, "colsToProject": []};

        const mapArray = [];
        const schema = [];
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (col.name === "DATA") {
                continue;
            }
            const colStruct = this._getDerivedCol(col);
            if (!colStruct) {
                var colName = col.backName === ""? col.name : col.backName;
                deferred.reject(SQLErrTStr.InvalidColTypeForFinalize
                                + colName + "(" + col.type + ")");
                return deferred.promise();
            }
            tableInfo.colsToProject.push(colStruct.colName);
            mapArray.push(colStruct.mapStr);
            const schemaStruct = {};
            schemaStruct[colStruct.colName] = colStruct.colType;
            schema.push(schemaStruct);
        }

        let txId = Transaction.start({
            "operation": "SQL Simulate",
            "simulate": true
        });
        let cliArray = [];
        XIApi.map(txId, mapArray, srcTableName, tableInfo.colsToProject)
        .then(function(newTableName) {
            cliArray.push(Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            }));
            txId = Transaction.start({
                "operation": "SQL Simulate",
                "simulate": true
            });
            return XIApi.project(txId, tableInfo.colsToProject, newTableName);
        })
        .then(function(finalizedTableName) {
            cliArray.push(Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            }));
            const ret = {
                finalizedTableName: finalizedTableName,
                cliArray: cliArray,
                schema: schema,
                srcTableName: srcTableName
            }
            deferred.resolve(ret);
        })
        .fail(function() {
            deferred.reject(SQLErrTStr.FinalizingFailed);
        });

        return deferred.promise();
    }

    private _finalizeAndGetSchema(
        sourceId: number,
        tableName: string
    ): XDPromise<any> {
        var deferred = PromiseHelper.deferred();
        const self = this;
        self._finalizeTable(sourceId)
        .then(function(ret) {
            const finalizedTableName = ret.finalizedTableName;
            const schema = ret.schema;
            var tableMetaCol = {};
            tableMetaCol["XC_TABLENAME_" + finalizedTableName] = "string";
            schema.push(tableMetaCol);

            const structToSend = {
                tableName: tableName.toUpperCase(),
                tableColumns: schema
            }

            console.log(structToSend);
            const retStruct = {
                cliArray: ret.cliArray,
                structToSend: structToSend,
                srcTableName: ret.srcTableName
            }
            deferred.resolve(retStruct);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _sendSchema(identifiers: Map<number, string>): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const self = this;
        let schemaQueryArray = [];
        const promiseArray = [];
        const allSchemas = [];
        const srcTableMap = {};
        identifiers.forEach(function(value, key) {
            const innerDeferred = PromiseHelper.deferred();
            const sourceId = key;
            const tableName = value;
            self._finalizeAndGetSchema(sourceId, tableName)
            .then(function(retStruct) {
                schemaQueryArray = schemaQueryArray.concat(retStruct.cliArray);
                allSchemas.push(retStruct.structToSend);
                srcTableMap[key] = retStruct.srcTableName;
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
            promiseArray.push(innerDeferred.promise());
        });
        PromiseHelper.when.apply(self, promiseArray)
        .then(function() {
            // always drop schema on plan server first
            return self._updatePlanServer("dropAll");
        })
        .then(function() {
            // send schema to plan server
            return self._updatePlanServer("update", allSchemas);
        })
        .then(function() {
            schemaQueryArray = schemaQueryArray.map(function(cli) {
                if (cli.endsWith(",")) {
                    cli = cli.substring(0, cli.length - 1);
                }
                return cli;
            });
            const queryString = "[" + schemaQueryArray.join(",") + "]";
            const ret = {
                queryString: queryString,
                srcTableMap: srcTableMap
            }
            deferred.resolve(ret);
        })
        .fail(function(err) {
            if (err && err.responseJSON) {
                deferred.reject(err.responseJSON.exceptionMsg);
            } else if (err && err.status === 0) {
                deferred.reject(SQLErrTStr.FailToConnectPlanner);
            } else if (err) {
                deferred.reject(JSON.stringify(err));
            } else {
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    private _configureSQL(query: string): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const sql = query ||
                    // XXX Currently disable multi/partial query
                    // self._sqlEditor.getSelection().replace(/;+$/, "") ||
                    self._sqlEditor.getValue().replace(/;+$/, "");
        const queryId = xcHelper.randName("sql", 8);
        const sqlCom = new SQLCompiler();
        const identifiers = this._extractIdentifiers();
        let schemaQueryString;
        let srcTableMap;
        let resTableName;
        let allCols;
        self._sqlComs.push(sqlCom);
        try {
            self.lockProgress();
            self._sendSchema(identifiers)
            .then(function(ret) {
                schemaQueryString = ret.queryString;
                srcTableMap = ret.srcTableMap;
                return sqlCom.compile(queryId, sql, undefined);
            })
            .then(function(queryString, newTableName, newCols) {
                // XXX TO-DO implement caching
                resTableName = newTableName;
                allCols = newCols;
                const schemaQueryArray = JSON.parse(schemaQueryString);
                const sqlQueryArray = JSON.parse(queryString);
                const xcQueryString = JSON.stringify(schemaQueryArray.concat(sqlQueryArray));
                return sqlCom.addDrops(xcQueryString);
            })
            .then(function(queryStringWithDrop) {
                self._dataModel.setDataModel(queryStringWithDrop,
                                             resTableName, allCols,
                                             sql, identifiers, srcTableMap);
                self._dataModel.submit();
                deferred.resolve();
            })
            .fail(function(errorMsg) {
                if (typeof errorMsg === "string") {
                    if (errorMsg.indexOf(SQLErrTStr.Cancel) === -1) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg: errorMsg,
                            isAlert: true,
                            align: "left",
                            preSpace: true,
                            sizeToText: true
                        });
                    }
                }
                deferred.reject();
            })
            .always(function() {
                // XXX need to change this line once we decide the new sql status panel design
                self._sqlComs.splice(self._sqlComs.indexOf(sqlCom, 1));
                self.resetProgress();
            });
        } catch (e) {
            console.error(e);
            // XXX need to change this line once we decide the new sql status panel design
            self._sqlComs.splice(self._sqlComs.indexOf(sqlCom, 1));
            sqlCom.setStatus(SQLStatus.Failed);
            sqlCom.setError(e.message || JSON.stringify(e));
            sqlCom.updateQueryHistory();
            self.resetProgress();
            Alert.show({
                title: "Compilation Error",
                msg: "Error details: " + JSON.stringify(e),
                isAlert: true
            });
            deferred.reject();
        }
        return deferred.promise();
    };
    public throwError(errStr: string): void {
        this.resetProgress();
        Alert.show({
            title: "Compilation Error",
            msg: "Error details: " + errStr,
            isAlert: true
        });
    }
    public isOnHistPanel(): boolean {
        return $("#monitor-query-history").hasClass("active");
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQL, options?): void {
        this._dagNode = dagNode;
        this._dataModel = new SQLOpPanelModel(dagNode);
        this._updateUI();

        super.showPanel(null, options);
        this._sqlEditor.refresh();
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
        this._allSnippets[this._defaultSnippet] = sqlQueryString;
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
            const sql = self._sqlEditor.getValue();
            self._configureSQL(sql)
            .then(function() {
                self.close();
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
            this._extractIdentifiers().forEach(function(value, key) {
                identifiers[key] = value;
            });
            const sqlQueryString = this._sqlEditor.getValue();
            const advancedParams = {identifiers: identifiers, sqlQueryString: sqlQueryString};
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
                const sqlQueryString = advancedParams.sqlQueryString;
                this._sqlEditor.setValue(sqlQueryString);
                this._allSnippets[this._defaultSnippet] = sqlQueryString;
                // select default snippet
                this._selectSnippetByName(this._defaultSnippet);

                this._$sqlIdentifiers.html("");
                this._sqlTables = {};
                if (Object.keys(identifiers).length > 0) {
                    for (const key in identifiers) {
                        const sourceId = parseInt(key);
                        if (!this._validateSourceId(sourceId)) {
                            return {error: SQLErrTStr.InvalidSourceId +
                                           this._dagNode.getParents().length};
                        }
                        this._addTableIdentifier(sourceId, identifiers[key]);
                        this._sqlTables[identifiers[key]] = sourceId;
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