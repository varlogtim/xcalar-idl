/*
 * Controller Module for DataStore Section
 */
window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        setupViews();
        DSForm.setup();
        DSPreview.setup();
        DSTable.setup();
        DSCart.setup();
        DSExport.setup();
    };

    DataStore.update = function(numDatasets) {
        var $numDataStores = $(".numDataStores");

        if (numDatasets != null) {
            $numDataStores.text(numDatasets);
        } else {
            var numDS = $("#exploreView .gridItems .ds").length;
            $numDataStores.text(numDS);
        }
    };

    DataStore.clear = function() {
        var deferred = jQuery.Deferred();

        DS.clear();
        DSTable.clear();
        DSCart.clear();
        DSForm.clear();
        DataStore.update(0);

        DSPreview.clear()
        .then(DS.release)
        .then(deferred.resolve)
        .then(deferred.reject);

        return (deferred.promise());
    };

    function setupViews() {
        $('#contentHeaderLeft').find('.buttonArea').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }

            var $exploreView = $('#exploreView');
            var $exportView = $('#exportView');
            var $contentHeaderRight = $('#contentHeaderRight');
            var $contentHeaderMidText = $('#contentHeaderMid').find('.text');

            if ($button.attr('id') === "outButton") {
                $exploreView.hide();
                $contentHeaderRight.hide();
                $exportView.show();
                $contentHeaderMidText.text(DSTStr.Export);
                if ($exportView.hasClass("firstTouch")) {
                    DSExport.refresh();
                    $exportView.removeClass("firstTouch");
                }
            } else {
                $exploreView.show();
                $contentHeaderRight.show();
                $exportView.hide();
                $contentHeaderMidText.text(DSTStr.DS);
                DSTable.refresh();
            }
            $button.siblings().removeClass('active');
            $button.addClass('active');
        });
    }

    return (DataStore);
}(jQuery, {}));
