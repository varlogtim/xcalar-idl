class SQLEditor {
    private _editor: CodeMirror.Editor;
    private _keywordsToRemove: string[];
    private _keywordsToAdd: string[];
    private _callbacks: {[key: string]: Function};

    public constructor(id: string, callbacks) {
        this._callbacks = callbacks;
        this._setupKeyWords();
        this._setup(id);
    }

    public getEditor(): CodeMirror.Editor {
        return this._editor;
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

    private _setupKeyWords(): void {
        this._keywordsToRemove = ["alter", "begin", "create", "delete", "drop",
        "insert", "into", "set", "table", "update", "values"];
        this._keywordsToAdd = ["over", "partition", "intersect", "except",
        "with", "left", "right", "outer", "natural",
        "semi", "anti", "rollup", "cube", "grouping",
        "sets", "limit", "sum", "avg", "max", "min"];
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
        const callbakcs = this._callbacks;
        let callbackTrigger = (eventName: string): void => {
            const event = callbakcs[eventName];
            if (typeof event !== "undefined") {
                event();
            }
        };
    
        let executeTrigger = (): void => {
            callbackTrigger("onExecute");
        };
    
        let cancelExec = (): void => {
            callbackTrigger("onCalcelExecute");
        };

        const extraKeys = {
            "F5": executeTrigger,
            "Alt-X": executeTrigger,
            "Ctrl-Space": "autocomplete", // Need to write autocomplete code
            "Ctrl--": this._toggleComment
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
        const startPos = editor.getCursor("from");
        const endPos = editor.getCursor("to");
        const startLineNum = startPos.line;
        const endLineNum = endPos.line;
        let commentCount = 0;
        editor.eachLine(startLineNum, endLineNum + 1, function(lh) {
            if (lh.text.trimStart().startsWith("--")) {
                commentCount++;
            }
        })
        if (commentCount === endLineNum - startLineNum + 1) {
            for (let i = startLineNum; i <= endLineNum; i++) {
                const text = editor.getLine(i);
                editor.setSelection({line: i, ch: 0},
                                          {line: i, ch: text.length});
                                          editor.replaceSelection(text.replace(/--/, ""));
            }
        } else {
            for (let i = startLineNum; i <= endLineNum; i++) {
                const text =editor.getLine(i);
                editor.setSelection({line: i, ch: 0},
                                          {line: i, ch: text.length});
                                          editor.replaceSelection("--" + text);
            }
        }
        editor.setSelection(startPos,endPos);
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
        })

        self._keywordsToAdd.forEach(function(key) {
            CodeMirror.resolveMode("text/x-sql").keywords[key] = true;
        });
    }
}