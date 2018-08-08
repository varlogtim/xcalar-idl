interface IOpPanel {
    setup(): void;
    show(dagNode: DagNode): void;
    close(): void;
}

class BaseOpPanel {
    private static _instance = null;
    private $panel: JQuery;
    private advancedMode: boolean;
    protected _formHelper: FormHelper = null;
    protected _editor: CodeMirror.EditorFromTextArea;

    protected constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    protected setup($panel: JQuery, options?: FormHelperOptions): void {
        this.$panel = $panel;
        this._formHelper = new FormHelper($panel, options);
        this._setupEditor($panel);
        this._setupModeSwitch($panel);
    }

    protected showPanel(formName?: string): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }
        this._formHelper.showView(formName);
        this._reset();
        return true;
    }

    protected hidePanel(): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        this._formHelper.removeWaitingBG();
        this._formHelper.hideView();
        this._formHelper.clear();
    }

    protected toggleCheckbox($checkbox: JQuery, isCheck: boolean = true): void {
        if (isCheck) {
            if (!$checkbox.hasClass('checked')) {
                $checkbox.addClass('checked');
            }
        } else {
            $checkbox.removeClass('checked');
        }
    }

    protected _getPanel(): JQuery {
        return this.$panel;
    }

    private _updateMode(toAdvancedMode: boolean) {
        const $panel: JQuery = this.$panel;
        const $switch: JQuery = $panel.find(".bottomSection .switch");
        if (toAdvancedMode) {
            $switch.addClass("on");
            $panel.addClass("advanced");
            this.advancedMode = true;
            if (this._editor) {
                this._editor.refresh();
            }
        } else {
            $switch.removeClass("on");
            $panel.removeClass("advanced");
            this.advancedMode = false;
            if (this._editor) {
                this._editor.setValue("");
            }
        }
    }

    protected _reset(): void {
        this._updateMode(false);
    }

    protected _isAdvancedMode(): boolean {
        return this.advancedMode;
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return null;
    }

    private _setupModeSwitch($panel: JQuery): void {
        const $switcher = $panel.find(".bottomSection .switcher");
        $switcher.on("click", ".switch", (event) => {
            const $switch: JQuery = $(event.target).closest(".switch");
            const toAdvanceMode: boolean = $switch.hasClass("on") ? false : true;
            const error: {error: string} = this._switchMode(toAdvanceMode);
            if (error == null) {
                this._updateMode(toAdvanceMode);
            } else {
                const $e = toAdvanceMode ? $panel.find(".opSection") : $panel.find(".advancedEditor");
                StatusBox.show(error.error, $e);
            }
        });
    }

    private _setupEditor($panel: JQuery): void {
        const $editor: JQuery = $panel.find(".advancedEditor textArea");
        if (!$editor.length) {
            return;
        }
        this._editor = CodeMirror.fromTextArea(<HTMLTextAreaElement>$editor[0], {
            "mode": {
                "name": "application/json"
            },
            "lint": true,
            "lineNumbers": true,
            "lineWrapping": true,
            "indentWithTabs": false,
            "indentUnit": 4,
            // "matchBrackets": true,
            // "autoCloseBrackets": true,
            // "search": true,
            "gutters": ["CodeMirror-lint-markers"]
        });
    }
}

namespace BaseOpPanel {
    /**
     * Helper class to implement the SelectAll behavior in a group of checkboxes
     */
    export class CheckboxGroup {
        private _checkboxList: { check: Function, uncheck: Function }[] = [];
        private _checkAll: { check?: Function, uncheck?: Function } = {};

        public clear() {
            this._checkboxList = [];
        }

        public setCheckAll(
            {check, uncheck}: {
                check: Function,
                uncheck?: Function
            }
        ): void {
            this._checkAll.check = check;
            this._checkAll.uncheck = uncheck;
        }

        public addCheckbox(
            {check, uncheck}: {
                check: Function,
                uncheck: Function
            }
        ): void {
            this._checkboxList.push({ check: check, uncheck: uncheck });
        }

        /**
         * Select all checkboxes in the list
         */
        public checkList() {
            for (const {check} of this._checkboxList) {
                check();
            }
        }

        /**
         * Unselect all checkboxes in the list
         */
        public unCheckList() {
            for (const {uncheck} of this._checkboxList) {
                uncheck();
            }
        }

        /**
         * Select SelectAll checkbox
         */
        public checkAll() {
            this._checkAll.check();
        }

        /**
         * Unselect SelectAll checkbox
         */
        public unCheckAll() {
            this._checkAll.uncheck();
        }
    }
}