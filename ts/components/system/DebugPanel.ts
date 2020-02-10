class DebugPanel {
    private static _instance: DebugPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._addEventListeners();
    }

    /**
     * DebugPanel.Instance.toggleDisplay
     * @param display
     */
    public toggleDisplay(display?: boolean): void {
        const $container = this._getContainer().parent();
        if (display == null) {
            display = $container.hasClass("xc-hidden");
        }

        const $tab = $("#debugTab");
        if (display) {
            $tab.addClass("active");
            $container.removeClass("xc-hidden");
        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
        }
    }

    /**
     * DebugPanel.Instance.addOutput
     * @param output
     */
    public addOutput(output: string): void {
        const html = this._getOutputHTML(output);
        const $section = this._getOutputSection();
        $section.append(html);
    }

    private _getContainer(): JQuery {
        return $("#debugViewContainer");
    }

    private _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    private _getContentSection(): JQuery {
        return this._getContainer().find(".contentSection");
    }

    private _getOutputSection(): JQuery {
        return this._getContentSection().find(".section.output");
    }

    private _switchTab(tab: string): void {
        const $topSection = this._getTopSection();
        $topSection.find(".tab.active").removeClass("active");
        $topSection.find(`.tab[data-tab="${tab}"]`).addClass("active");

        const $contentSection = this._getContentSection();
        $contentSection.find(".section:not(.xc-hidden)").addClass("xc-hidden");
        $contentSection.find(`.section.${tab}`).removeClass("xc-hidden");
    }

    private _getOutputHTML(output: string): HTML {
        const time = moment().format("HH:mm:ss MM/DD/YYYY");
        return '<div class="row">' +
                    time + ": " + output +
                '</div>';
    }

    private _addEventListeners(): void {
        const $topSection = this._getContainer().find(".topSection");

        $topSection.on("click", ".tab", (event) => {
            const $tab = $(event.currentTarget);
            if (!$tab.hasClass("active")) {
                this._switchTab($tab.data("tab"));
            }
        });

        $topSection.find(".closeResult").click(() => {
            this.toggleDisplay(false);
        });
    }
}