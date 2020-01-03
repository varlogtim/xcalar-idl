namespace DagPanel {
    let _setup: boolean = false;

    /**
     * DagPanel.setup
     */
    export function setup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasAfterLoadCalled: boolean = false;

        _beforeLoad();
        DagTabManager.Instance.on("afterFirstTabLoad", () => {
            // when the first tab loaded, can go into afterLoad State
            hasAfterLoadCalled = true;
            _afterLoad();
        });

        _basicSetup()
        .then(() => {
            return _loadTabs();
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
            _setup = true;
            if (!hasAfterLoadCalled) {
                _afterLoad();
            }
        });

        return deferred.promise();
    }

    /**
     * DagPanel.hasSetup
     */
    export function hasSetup(): boolean {
        return _setup;
    }

    function _basicSetup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        DagParamPopup.setup();
        _updateSetupStatus("Initializing Aggregates");

        DagAggManager.Instance.setup()
        .then(() => {
            _updateSetupStatus("Initializing Modules");
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

    function _loadTabs(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(DagTabManager.Instance.setup());
    }

    function _getDagViewEl(): JQuery {
        return $("#dagView");
    }

    function _getLoadSectionEl(): JQuery {
        return _getDagViewEl().find(".loadingSection");
    }

    function _beforeLoad(): void {
        DagList.Instance.toggleDisable(true);
        DagTopBar.Instance.toggleDisable(true);
        DagGraphBar.Instance.toggleDisable(true);
        DagTabManager.Instance.toggleDisable(true);
        _getDagViewEl().append(_generateLoadingSection());
    }

    function _afterLoad(): void {
        DagList.Instance.toggleDisable(false);
        DagTopBar.Instance.toggleDisable(false);
        DagGraphBar.Instance.toggleDisable(false);
        DagTabManager.Instance.toggleDisable(false);
        _getLoadSectionEl().remove();
    }

    function _updateSetupStatus(msg: string): void {
        _getLoadSectionEl().find(".text").text(msg);
    }

    function _generateLoadingSection(): HTML {
        let html: HTML = xcUIHelper.getLoadingSectionHTML("", "loadingSection");
        return html;
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.setSetup = function(isSetup) {
            _setup = isSetup;
        };
    }
    /* End Of Unit Test Only */
}