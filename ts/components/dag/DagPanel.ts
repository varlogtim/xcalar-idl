class DagPanel {
    private static _instance: DagPanel;
    private _setup: boolean = false;
    private _popup: PopupPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
    /**
     * DagPanel.setup
     */
    public setup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasAfterLoadCalled: boolean = false;

        this._beforeLoad();
        DagTabManager.Instance.on("afterFirstTabLoad", () => {
            // when the first tab loaded, can go into afterLoad State
            hasAfterLoadCalled = true;
            this._afterLoad();
        });

        this._setupPopup();

        this._basicSetup()
        .then(() => {
            return this._loadTabs();
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error("DagPanel initialize fails", error);
            Alert.show({
                title: DFTStr.SetupFail,
                msg: DFTStr.SetupFailsMsg,
                isAlert: true,
                detail: xcHelper.parseError(error)
            });
            deferred.reject(error);
        })
        .always(() => {
            this._setup = true;
            if (!hasAfterLoadCalled) {
                this._afterLoad();
            }
        });

        return deferred.promise();
    }

    /**
     * DagPanel.hasSetup
     */
    public hasSetup(): boolean {
        return this._setup;
    }

    public isDocked(): boolean {
        return this._popup.isDocked();
    }

    private _basicSetup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        DagParamPopup.setup();
        this._updateSetupStatus("Initializing Aggregates");

        DagAggManager.Instance.setup()
        .then(() => {
            this._updateSetupStatus("Initializing Modules");
            return DagTblManager.Instance.setup();
        })
        .then(() => {
            DagViewManager.Instance.setup();
            DagSearch.Instance.setup();
            return DagList.Instance.setup();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _loadTabs(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(DagTabManager.Instance.setup());
    }

    private _getDagViewEl(): JQuery {
        return $("#dagView");
    }

    private _getLoadSectionEl(): JQuery {
        return this._getDagViewEl().find(".loadingSection");
    }

    private _beforeLoad(): void {
        DagList.Instance.toggleDisable(true);
        DagTopBar.Instance.toggleDisable(true);
        DagGraphBar.Instance.toggleDisable(true);
        DagTabManager.Instance.toggleDisable(true);
        this._getDagViewEl().append(this._generateLoadingSection());
    }

    private _afterLoad(): void {
        DagList.Instance.toggleDisable(false);
        DagTopBar.Instance.toggleDisable(false);
        DagGraphBar.Instance.toggleDisable(false);
        DagTabManager.Instance.toggleDisable(false);
        this._getLoadSectionEl().remove();
    }

    private _updateSetupStatus(msg: string): void {
        this._getLoadSectionEl().find(".text").text(msg);
    }

    private _generateLoadingSection(): HTML {
        let html: HTML = xcUIHelper.getLoadingSectionHTML("", "loadingSection");
        return html;
    }

    private _setupPopup() {
        this._popup = new PopupPanel("dagView", {});
        this._popup
        .on("Undock", () => {
            this._undock();
        })
        .on("Dock", () => {
            this._dock();
        });
    }

    private _undock(): void {
        let $dockableSection = this._popup.getPanel();
        let rect = $dockableSection[0].getBoundingClientRect();
        let height = Math.min(500, Math.max(300, $(window).height() - (rect.top + 10)));
        let width = 500;
        let left = Math.min($(window).width() - (width + 5), rect.left + 15);
        $dockableSection.css({
            "left": left,
            "top": rect.top + 10,
            "width": width,
            "height": height
        });

        $("#sqlWorkSpacePanel").addClass("dagPanelUndocked")
                                .removeClass("dagPanelDocked");

        DagCategoryBar.Instance.showOrHideArrows();
        $dockableSection.resizable("option", "containment", "#sqlWorkSpacePanel");
        this._toggleDraggable(true);
    }

    private _dock(): void {
        // reset to default
        let $dockableSection = this._popup.getPanel();
        $("#sqlWorkSpacePanel").removeClass("dagPanelUndocked")
                                .addClass("dagPanelDocked")
                                .find(".rightSection .bottomPart")
                                .css({"top": "", "height": ""});

        if (PopupManager.isDocked("sqlEditorSpace")) {
            $("#sqlEditorSpace").css({"left": "", "width": ""});
        }

        $("#sqlWorkSpacePanel").find(".rightSection .topPart")
                                .css({"height": ""});

        DagCategoryBar.Instance.showOrHideArrows();

        $dockableSection.resizable("option", "containment", "parent");
        this._toggleDraggable(false);
    }

    private _toggleDraggable(isDraggable: boolean): void {
        const $section: JQuery = this._popup.getPanel();
        if (isDraggable) {
            this._popup.setDraggable( ".categoryBar");
;        } else {
            $section.draggable({disabled: true});
        }
    }

    /* Unit Test Only */
    public __testOnly__: any = {};
}