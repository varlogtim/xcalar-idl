namespace DSSource {
    /**
     * DSSource.setup
     */
    export function setup(): void {
        _addEventListeners();
    }
    
    /**
     * DSSource.show
     */
    export function show(): void {
        if (!XVM.isCloud()) {
            // on-prem will rediret to the old import screen
            DSForm.show();
            return;
        }
        DataSourceManager.switchView(DataSourceManager.View.Source);
    }

    function _getCard() {
        return $("#dsForm-source");
    }

    function _addEventListeners(): void {
        let $card = _getCard();
        $card.find(".location.file").click(() => {
            CloudFileBrowser.show(null, false);
        });

        $card.find(".location.s3").click(() => {
            DSS3Config.show();
        });

        $card.find(".location.database").click(() => {
            // XXX TODO: implement it
            Alert.show({
                "title": "New Feature",
                "msg": "This feature is coming soon",
                "isAlert": true
            });
        });

        $card.find(".more").click(() => {
            DSForm.show();
        });
    }
}