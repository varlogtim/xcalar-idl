class DFSettingsModal {
    private static _instance: DFSettingsModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _settings: {name: string, text: string}[];
    private modalHelper: ModalHelper;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this.modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._initSettings();
        this._addEventListeners();
    }

    public show(): void {
        this.modalHelper.setup();
        this._render();
    }

    private _getModal(): JQuery {
        return $("#dfSettingsModal");
    }

    private _close(): void {
        this.modalHelper.clear();
        this._getModal().find(".modalMain").empty();
    }

    private _submitForm(): void {
        const $modal: JQuery = this._getModal();
        const $rows: JQuery = $modal.find(".modalMain .row");
        this._settings.forEach((setting, index) => {
            const name: string = setting.name;
            const val: boolean = $rows.eq(index).find(".checkbox").hasClass("checked");
            UserSettings.setPref(name, val, false);
            switch(name) {
                case ("dfProgressTips"):
                    DagViewManager.Instance.toggleProgressTips(val);
                    break;
                case ("dfLabel"):
                    DagViewManager.Instance.toggleLabels(val);
                    break;
                case ("dfConfigInfo"):
                    DagViewManager.Instance.toggleConfigInfo(val);
                    break;
                case ("dfTableName"):
                    DagViewManager.Instance.toggleTableName(val);
                    break;
                case ("dfPinOperatorBar"):
                    DagViewManager.Instance.pinOperatorBar(val);
                    break;
                default:
                    break;
            }
        });

        const promise: XDPromise<void> = UserSettings.commit(true, false, true);
        xcUIHelper.showRefreshIcon($modal.find(".confirm"), false, promise);
        promise
        .always(() => {
            this._close();
        });
    }

    private _render(): void {
        const html: HTML = this._settings.map(this._renderRowFromSetting).join("");
        this._getModal().find(".modalMain").html(html);
    }

    private _renderRowFromSetting(setting: {name: string, text: string}): string {
        const name: string = setting.name;
        const pref: boolean = UserSettings.getPref(name) || false;
        let html: HTML =
            '<div class="row ' + name + ' checkboxSection">' +
                '<div class="checkbox' + (pref ? ' checked' : '') + '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="text">' + setting.text + '</div>' +
            '</div>';
        return html;
    }

    private _initSettings(): void {
        this._settings = [{
            name: "dfAutoExecute",
            text: DFTStr.AutoExecute
        }, {
            name: "dfAutoPreview",
            text: DFTStr.AutoPreview
        }, {
            name: "dfProgressTips",
            text: DFTStr.ShowProgressTips
        }, {
            name: "dfLabel",
            text: DFTStr.ShowLabels
        }, {
            name: "dfConfigInfo",
            text: DFTStr.ShowConfigInfo
        }, {
            name: "dfTableName",
            text: DFTStr.ShowTableName
        }, {
            name: "dfPinOperatorBar",
            text: DFTStr.PinOperatorBar
        }];
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        $modal.on("click", ".checkboxSection .text, .checkboxSection .checkbox", (event) => {
            $(event.currentTarget).closest(".checkboxSection")
            .find(".checkbox").toggleClass("checked");
        });
    }
}