class SourceModal {
    private static _instance: SourceModal;
    private _modalHelper: ModalHelper;

    public static get Instance(): SourceModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._addEventListeners();
        this._modalHelper = new ModalHelper(this._getModal(), {
            center: {verticalQuartile: true},
            noResize: true,
            noEnter: true
        });
        this._swtichTab("connector");
    }

    /**
     * SourceModal.Instance.show
     */
    public show(): void {
        this._modalHelper.setup();
        const $list = this._getModal().find(".sourceList");
        const $li = $list.find("li.active");
        if ($li.length) {
            const tab = $li.data("tab");
            this._swtichTab(tab); // reset the tab
        }
    }

    /**
     * SourceModal.Instance.switchTab
     * @param tab
     */
    public switchTab(tab: string): void {
        return this._swtichTab(tab);
    }

    private _getModal(): JQuery {
        return $("#sourceModal");
    }

    private _close() {
        this._modalHelper.clear();
    }

    private _swtichTab(tab: string): void {
        const $list = this._getModal().find(".sourceList");
        $list.find("li.active").removeClass("active");
        $list.find(`li[data-tab="${tab}"]`).addClass("active");
        switch (tab) {
            case "connector":
                DataSourceManager.switchToConnectorView();
                break;
            case "import":
                DataSourceManager.swichToImportView();
                break;
            case "loadWizard":
                if (typeof gEnableLW != 'undefined' && gEnableLW) {
                    DataSourceManager.switchToLoadWizardView();
                } else {
                    Alert.show({
                        title: "Coming Soon",
                        msg: "Import Data Source Wizard will release in the next version.",
                        isAlert: true
                    });
                }
                break;
            default:
                break;
        }
    }

    private _addEventListeners(): void {
        const $modal = this._getModal();
        $modal.find(".close").click(() => {
            this._close();
        });

        $modal.find(".sourceList").on("click", "li", (event) => {
            const tab = $(event.currentTarget).data("tab");
            this._swtichTab(tab);
        });
    }
}