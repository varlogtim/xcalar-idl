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
            var numDS = $("#dsListSection .gridItems .ds").length;
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

        return deferred.promise();
    };

    function setupViews() {
        // main menu
        $("#dataStoresTab").find(".subTab").click(function() {
            var $button = $(this);
            if ($button.hasClass("active")) {
                return;
            }

            var $panel = $("#datastorePanel");
            var $title = $panel.find(".topBar .title");
            var $menu = $("#datastoreMenu");

            if ($button.attr("id") === "outButton") {
                var $exportView = $("#datastore-out-view");
                $panel.removeClass("in").addClass("out");
                $title.text(DSTStr.OUT);
                $menu.find(".out").removeClass("xc-hidden")
                    .end()
                    .find(".in").addClass("xc-hidden");
                if ($exportView.hasClass("firstTouch")) {
                    DSExport.refresh();
                    $exportView.removeClass("firstTouch");
                }
            } else {
                $panel.removeClass("out").addClass("in");
                $title.text(DSTStr.IN);
                $menu.find(".in").removeClass("xc-hidden")
                    .end()
                    .find(".out").addClass("xc-hidden");
                DSTable.refresh();
                DSCart.refresh();
            }
            // button switch styling handled in mainMenu.js
        });
    }

    return (DataStore);
}(jQuery, {}));
