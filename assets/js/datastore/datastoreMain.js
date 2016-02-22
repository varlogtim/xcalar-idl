/*
 * Controller Module for DataStore Section
 */
window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        setupViews();
        DatastoreForm.setup();
        DataPreview.setup();
        DataSampleTable.setup();
        DataCart.setup();
        ExportTarget.setup();
        ExportTarget.restore();
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
        DataSampleTable.clear();
        DataCart.clear();
        DatastoreForm.clear();
        DataStore.update(0);

        DataPreview.clear()
        .then(DS.release)
        .then(deferred.resolve)
        .then(deferred.reject);

        return (deferred.promise());
    };

    function setupViews() {
        var $exploreView = $('#exploreView');
        var $exportView = $('#exportView');
        var $contentHeaderRight = $('#contentHeaderRight');
        var $contentHeaderMidText = $('#contentHeaderMid').find('.text');
        $('#contentHeaderLeft').find('.buttonArea').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }

            if ($button.attr('id') === "outButton") {
                $exploreView.hide();
                $contentHeaderRight.hide();
                $exportView.show();
                $contentHeaderMidText.text('EXPORT FORM');
            } else {
                $exploreView.show();
                $contentHeaderRight.show();
                $exportView.hide();
                $contentHeaderMidText.text('DATASET');
                DataSampleTable.sizeTableWrapper();
            }
            $button.siblings().removeClass('active');
            $button.addClass('active');
        });
    }

    return (DataStore);

}(jQuery, {}));
