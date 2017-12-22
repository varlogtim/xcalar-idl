/*
 * Controller Module for DataStore Section
 */
window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        setupViews();
        DSForm.setup();
        DSParser.setup();
        DSTable.setup();
        DSCart.setup();
        DSExport.setup();
        DSTargetManager.setup();
    };

    DataStore.initialize = function() {
        DSUploader.initialize();
    };

    DataStore.update = function(numDatasets) {
        var $numDataStores = $(".numDataStores:not(.tutor)");

        if (numDatasets != null) {
            $numDataStores.text(numDatasets);
        } else {
            var numDS = $("#dsListSection .gridItems .ds").length;
            $numDataStores.text(numDS);
        }
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
            $panel.removeClass("in")
                  .removeClass("out")
                  .removeClass("target");
            $menu.find(".menuSection").addClass("xc-hidden");

            var id = $button.attr("id");
            if (id === "outButton") {
                var $exportView = $("#datastore-out-view");
                $panel.addClass("out");
                $title.text(DSTStr.OUT);
                $menu.find(".out").removeClass("xc-hidden");
                if ($exportView.hasClass("firstTouch")) {
                    DSExport.refresh(true);
                    $exportView.removeClass("firstTouch");
                }
            } else if (id === "targetButton") {
                var $targetView = $("#datastore-target-view");
                $panel.addClass("target");
                $menu.find(".target").removeClass("xc-hidden");
                $title.text(DSTStr.TARGET);
                if ($targetView.hasClass("firstTouch")) {
                    DSTargetManager.getTargetTypeList();
                    $targetView.removeClass("firstTouch");
                }
            } else {
                // inButton
                $panel.addClass("in");
                $title.text(DSTStr.IN);
                $menu.find(".in").removeClass("xc-hidden");
                DSTable.refresh();
                DSCart.refresh();
            }
            // button switch styling handled in mainMenu.js
        });
    }

    return (DataStore);
}(jQuery, {}));
