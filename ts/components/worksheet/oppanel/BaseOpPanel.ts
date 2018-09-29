/**
 * Base class of the Operation Panels.
 * It is a singleton.
 */
class BaseOpPanel {
    /**
     * Create DOM element from a string
     * @param htmlStr HTML string
     * @returns DOM element
     */
    public static createElementFromString(htmlStr: string): JQuery {
        return $($.trim(htmlStr));
    }

    /**
     * Creat DOM element specified by tagName
     * @param tagName HTML tag
     * @returns JQuery element
     * @description
     * Trying to create a element by using document.creatElement()
     * If the browser doesn't support document.createElement(), fallback to JQuery's way
     * Performance: document.createElement(tagName) is much faster than $(tagName)
     */
    public static createElement(tagName: string): JQuery {
        if (document && document.createElement) {
            return $(document.createElement(tagName));
        } else {
            return $(tagName);
        }
    }

    /**
     * Find a element in DOM by attribute data-xcid
     * @param $container The container element
     * @param xcid Value of data-xcid
     * @description The HTML looks like: <div data-xcid="yourXcID">...</div>
     */
    public static findXCElement(container: JQuery, xcid: string): JQuery {
        return container.find(`[data-xcid="${xcid}"]`);
    }

    /**
     * Read template content from a DOM element
     * @param container A ancestor element of the template
     * @param xcid Value of data-xcid
     */
    public static readTemplate(container: JQuery, xcid: string): string {
        return this.findXCElement(container, xcid).html();
    }


    public static craeteColumnListHTML(
        colType: ColumnType,
        colNameTemplate: HTML
    ): HTML {
        const html: HTML =
        '<div class="typeIcon flexContainer flexRow type-' + colType + '">' +
            '<div class="flexWrap flex-left" ' +
            ' data-toggle="tooltip"' +
            ' data-title="' + colType + '"' +
            ' data-container="body"' +
            ' data-placement="top"' +
            '>' +
                '<span class="iconHidden"></span>' +
                '<span class="type icon"></span>' +
            '</div>' +
            '<div class="flexWrap flex-mid">' +
                colNameTemplate +
            '</div>' +
            '<div class="flexWrap flex-right"></div>' +
        '</div>';
        return html;
    }

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public getEditor(): CodeMirror.EditorFromTextArea {
        return this._editor;
    }

    public isOpen(): boolean {
        return this._formHelper.isOpen();
    }

    private static _instance = null;
    protected $panel: JQuery;
    private advancedMode: boolean;
    protected _formHelper: FormHelper = null;
    protected _editor: CodeMirror.EditorFromTextArea;
    private _exitCallback: Function;

    protected constructor() {}

    protected setup($panel: JQuery, options?: FormHelperOptions): void {
        options = options || {};
        this.$panel = $panel;
        this._formHelper = new FormHelper($panel, options);
        this._setupEditor($panel);
        this._setupModeSwitch($panel);
    }

    protected showPanel(formName?: string, options?): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }
        this._reset();
        this._formHelper.showView(formName);
        MainMenu.setFormOpen();
        options = options || {};
        this._exitCallback = options.exitCallback || function(){};
        return true;
    }

    protected hidePanel(isSubmit?: boolean): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        this._formHelper.removeWaitingBG();
        this._formHelper.hideView();
        this._formHelper.clear();
        if (!isSubmit) {
            this._exitCallback();
        }
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

    protected _switchMode(_toAdvancedMode: boolean): {error: string} {
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
            "matchBrackets": false,
            "autoCloseBrackets": false,
            "search": false,
            "gutters": ["CodeMirror-lint-markers"],
        });
    }
}