class SQLEditor {
    private _editor: CodeMirror.Editor;
    private _callbacks: {[key: string]: Function};
    private _keywordsToRemove: string[] = [
        "alter",
        "begin",
        "delete",
        "drop",
        "insert",
        "into",
        "set",
        "update",
        "values"
    ];
    private _extraSyntaxKeywords: string[] = [
        "all",
        "anti",
        "any",
        "case",
        "cast",
        "cross",
        "cube",
        "current",
        "describe",
        "else",
        "end",
        "except",
        "exists",
        "false",
        "following",
        "full",
        "grouping",
        "grouping_id",
        "if",
        "inner",
        "intersect",
        "interval",
        "left",
        "limit",
        "natural",
        "null",
        "nulls",
        "outer",
        "over",
        "partition",
        "position",
        "preceding",
        "range",
        "right",
        "rollup",
        "row",
        "rows",
        "semi",
        "sets",
        "show",
        "tables",
        "then",
        "true",
        "unbounded",
        "using",
        "when",
        "with"
    ];
    private _extraFunctionKeywords: string[] = [
        "abs",
        "acos",
        "add_months",
        "ascii",
        "asin",
        "atan",
        "atan2",
        "avg",
        "bigint",
        "bit_length",
        "boolean",
        "ceil",
        "ceiling",
        "char",
        "char_length",
        "character_length",
        "chr",
        "coalesce",
        "concat",
        "cos",
        "cosh",
        "count",
        "cume_dist",
        "current_date",
        "current_timestamp",
        "date",
        "date_add",
        "date_format",
        "date_sub",
        "date_trunc",
        "datediff",
        "day",
        "dayofmonth",
        "dayofweek",
        "dayofyear",
        "decimal",
        "degree",
        "dense_rank",
        "double",
        "e",
        "exp",
        "first",
        "first_value",
        "float",
        "floor",
        "format",
        "format_number",
        "from_unixtime",
        "hour",
        "ifnull",
        "initcap",
        "instr",
        "int",
        "isnotnull",
        "isnull",
        "lag",
        "last",
        "last_day",
        "last_value",
        "lcase",
        "lead",
        "left",
        "length",
        "levenshtein",
        "like",
        "ln",
        "locate",
        "log10",
        "log2",
        "lower",
        "lpad",
        "ltrim",
        "max",
        "mean",
        "min",
        "minute",
        "mod",
        "month",
        "months_between",
        "negative",
        "next_day",
        "now",
        "ntile",
        "nullif",
        "nvl",
        "nvl2",
        "octet_length",
        "percent_rank",
        "pi",
        "position",
        "positive",
        "pow",
        "power",
        "quarter",
        "radians",
        "rand",
        "randn",
        "rank",
        "regexp_extract",
        "repeat",
        "replace",
        "reverse",
        "right",
        "round",
        "row_number",
        "rpad",
        "rtrim",
        "second",
        "sin",
        "sinh",
        "smallint",
        "soundex",
        "sqrt",
        "std",
        "stddev",
        "stddev_pop",
        "stddev_samp",
        "string",
        "substr",
        "substring",
        "substring_index",
        "sum",
        "tan",
        "tanh",
        "timestamp",
        "tinyint",
        "to_date",
        "to_timestamp",
        "to_unix_timestamp",
        "trim",
        "trunc",
        "ucase",
        "unix_timestamp",
        "upper",
        "var_pop",
        "var_samp",
        "variance",
        "weekofyear",
        "year"
    ];

    public constructor(id: string, callbacks) {
        this._callbacks = callbacks;
        this._setup(id);
    }

    public getEditor(): CodeMirror.Editor {
        return this._editor;
    }

    public getSelection(): string {
        return this._editor.getSelection();
    }

    public getValue(): string {
        return this._editor.getValue();
    }

    public setValue(str): void {
        this._editor.setValue(str);
    }

    public refresh(): void {
        this._editor.refresh();
    }

    private _setup(id: string): void {
        const textArea = document.getElementById(id);
        if (!textArea) {
            // For Release Candidates
            return;
        }

        const extraKeys = this._setupShortCutKeys();
        this._editor = CodeMirror.fromTextArea(textArea as HTMLTextAreaElement,
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
        this._addEventListeners();
        this.refresh();
    }

    private _setupShortCutKeys(): object {
        const callbacks = this._callbacks;
        let callbackTrigger = (eventName: string): void => {
            const event = callbacks[eventName];
            if (typeof event !== "undefined") {
                event();
            }
        };
    
        let executeTrigger = (): void => {
            callbackTrigger("onExecute");
        };
    
        let cancelExec = (): void => {
            callbackTrigger("onCancelExecute");
        };

        const extraKeys = {
            "F5": executeTrigger,
            "Alt-X": executeTrigger,
            "Ctrl-Space": "autocomplete", // Need to write autocomplete code
            "Ctrl--": this._toggleComment.bind(this)
        };

        let cButton = "Ctrl";
        if (isSystemMac) {
            cButton = "Cmd";
            extraKeys[cButton + "-Alt-F"] = "replace";
            extraKeys["Shift-" + cButton + "-Backspace"] = "delWordAfter";
            extraKeys["F6"] = cancelExec;
            extraKeys["F3"] = "findNext";
            extraKeys["Shift-F3"] = "findPrev";
        } else {
            extraKeys[cButton + "-H"] = "replace";
            extraKeys[cButton + "-Delete"] = "delWordAfter";
            extraKeys["Ctrl-Alt-C"] = cancelExec;
            extraKeys["Ctrl-Alt-G"] = "findNext";
            extraKeys["Shift-Ctrl-Alt-G"] = "findPrev";
        }
        extraKeys[cButton + "-E"] = executeTrigger;
        extraKeys[cButton + "-Left"] = "goWordLeft";
        extraKeys[cButton + "-Right"] = "goWordRight";
        extraKeys[cButton + "-Backspace"] = "delWordBefore";
        extraKeys["Shift-" + cButton + "-U"] = this._convertTextCase.bind(this, true);
        extraKeys["Shift-" + cButton + "-L"] = this._convertTextCase.bind(this, false);
        extraKeys["Shift-" + cButton + "-K"] = "deleteLine";
        extraKeys[cButton + "-Up"] = this._scrollLine.bind(this, true);
        extraKeys[cButton + "-Down"] = this._scrollLine.bind(this, false);
        extraKeys[cButton + "-Enter"] = this._insertLine.bind(this, true);
        extraKeys["Shift-" + cButton + "-Enter"] = this._insertLine.bind(this, false);
        return extraKeys;
    }

    private _toggleComment(): void {
        const editor = this.getEditor();
        const selections = editor.getDoc().listSelections();
        const ranges: Array<{anchor: CodeMirror.Position, head: CodeMirror.Position}> = [];
        for (let selection of selections) {
            const startLineNum = Math.min(selection.head.line, selection.anchor.line);
            const endLineNum = Math.max(selection.head.line, selection.anchor.line);
            let commentCount = 0;
            let offset = 0;
            editor.eachLine(startLineNum, endLineNum + 1, function(lh) {
                if (lh.text.trimStart().startsWith("--")) {
                    commentCount++;
                }
            })
            if (commentCount === endLineNum - startLineNum + 1) {
                // To uncomment
                for (let i = startLineNum; i <= endLineNum; i++) {
                    const text = editor.getLine(i);
                    editor.setSelection({line: i, ch: 0},
                                            {line: i, ch: text.length});
                    editor.replaceSelection(text.replace(/--/, ""));
                }
                offset -= 2;
            } else {
                // To comment
                for (let i = startLineNum; i <= endLineNum; i++) {
                    const text =editor.getLine(i);
                    editor.setSelection({line: i, ch: 0},
                                            {line: i, ch: text.length});
                    editor.replaceSelection("--" + text);
                }
                offset += 2;
            }
            ranges.push({
                anchor: {
                    line: selection.anchor.line,
                    ch: selection.anchor.ch + offset
                },
                head: {
                    line: selection.head.line,
                    ch: selection.head.ch + offset
                }
            });
        }
        editor.getDoc().setSelections(ranges);
    }

    private _convertTextCase(flag: boolean): void {
        const editor = this._editor;
        const text = editor.getSelection();
        if (text != "") {
            if (flag) {
                editor.replaceSelection(text.toLocaleUpperCase(), "around");
            } else {
                editor.replaceSelection(text.toLocaleLowerCase(), "around");
            }
        }
    }

    private _scrollLine(flag: boolean): void {
        const editor = this._editor;
        if (flag) {
            editor.scrollTo(null, editor.getScrollInfo().top -
            editor.defaultTextHeight());
        } else {
            editor.scrollTo(null, editor.getScrollInfo().top +
            editor.defaultTextHeight());
        }
    }

    private _insertLine(flag: boolean): void {
        const editor = this._editor;
        if (flag) {
            const curPos = editor.getCursor("from");
            const insertPos = {line: curPos.line, ch: 0};
            editor.replaceRange("\n", insertPos);
            editor.setCursor(insertPos);
        } else {
            const curPos = editor.getCursor("to");
            const insertPos = {
                line: curPos.line,
                ch: editor.getLine(curPos.line).length
            };
            editor.replaceRange("\n", insertPos);
            editor.setCursor({line: curPos.line + 1, ch: 0});
        }
    }

    private _addEventListeners(): void {
        const self = this;
        self._editor.on("keyup", function(_cm, e) {
            const pos = _cm.getCursor();
            if (self._editor.getTokenTypeAt(pos) === "comment") {
                // disable auto-completion for comment
                return;
            }
            if (e.keyCode >= 65 && e.keyCode <= 90 ||
                e.keyCode >= 48 && e.keyCode <= 57 && !e.shiftKey ||
                e.keyCode === 190 && !e.shiftKey
            ) {
                const event = self._callbacks["onAutoComplete"];
                if (typeof event !== "undefined") {
                    event(self._editor);
                }
            }
        });

        self._keywordsToRemove.forEach(function(key) {
            delete CodeMirror.resolveMode("text/x-sql").keywords[key];
        });

        self._extraSyntaxKeywords.forEach(function(key) {
            CodeMirror.resolveMode("text/x-sql").keywords[key] = true;
        });

        self._extraFunctionKeywords.forEach(function(key) {
            CodeMirror.resolveMode("text/x-sql").keywords[key] = true;
        });
    }
}