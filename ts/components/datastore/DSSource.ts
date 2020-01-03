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
        if (XVM.isDataMart()) {
            // data mart only show the s3 form
            DSS3Config.Instance.show();
        } else if (XVM.isCloud()) {
            DataSourceManager.switchView(DataSourceManager.View.Source);
        } else {
            // on-prem will rediret to the old import screen
            DSForm.show();
        }
    }

    function _getCard() {
        return $("#dsForm-source");
    }

    function _addEventListeners(): void {
        let $card = _getCard();
        $card.find(".location.file").click(() => {
            CloudFileBrowser.show(false);
        });

        $card.find(".location.s3").click(() => {
            DSS3Config.Instance.show();
        });

        $card.find(".location.database").click(() => {
            DSDBConfig.Instance.show();
        });

        $card.find(".more").click(() => {
            DSForm.show();
        });
    }
}