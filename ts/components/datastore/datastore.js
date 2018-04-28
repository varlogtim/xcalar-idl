/*
 * Controller Module for DataStore Section
 */
window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        setupViews();
        DSForm.setup();
        DSTable.setup();
        DSCart.setup();
        DSExport.setup();
        DSTargetManager.setup();
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

            var isAdmin = readOnlyForNoAdmin();
            var id = $button.attr("id");

            switch (id) {
                case "outButton":
                    switchToViewOut();
                    break;
                case "targetButton":
                    switchToViewTarget();
                    break;
                case "inButton":
                    switchToViewIn();
                    break;
                default:
                    console.error("invalid view");
                    return;
            }

            function switchToViewOut() {
                $panel.addClass("out");
                $title.text(DSTStr.OUT);
                $menu.find(".out").removeClass("xc-hidden");

                var $exportView = $("#datastore-out-view");
                if ($exportView.hasClass("firstTouch")) {
                    DSExport.refresh(true)
                    .always(function() {
                        if (!isAdmin) {
                            DSExport.clickFirstGrid();
                        }
                    });
                    $exportView.removeClass("firstTouch");
                }
            }

            function switchToViewIn() {
                $panel.addClass("in");
                $title.text(DSTStr.IN);
                $menu.find(".in").removeClass("xc-hidden");

                DSTable.refresh();
                DSCart.refresh();
                DS.resize();
            }

            function switchToViewTarget() {
                $panel.addClass("target");
                $menu.find(".target").removeClass("xc-hidden");
                $title.text(DSTStr.TARGET);

                var $targetView = $("#datastore-target-view");
                if ($targetView.hasClass("firstTouch")) {
                    DSTargetManager.getTargetTypeList()
                    .always(function() {
                        if (!isAdmin) {
                            DSTargetManager.clickFirstGrid();
                        }
                    });
                    $targetView.removeClass("firstTouch");
                }
            }

            // button switch styling handled in mainMenu.js
            function readOnlyForNoAdmin() {
                var isAdmin = Admin.isAdmin();
                if (!isAdmin) {
                    $panel.addClass("noAdmin");
                    $menu.addClass("noAdmin");
                    xcTooltip.changeText($("#dsTarget-create-tooltipWrap"), DSTargetTStr.AdminOnly);
                    xcTooltip.changeText($("#exportTarget-create-tooltipWrap"), DSExportTStr.AdminOnly);
                } else {
                    $panel.removeClass("noAdmin");
                    $menu.removeClass("noAdmin");
                    xcTooltip.changeText($("#dsTarget-create-tooltipWrap"), DSTargetTStr.Create);
                    xcTooltip.changeText($("#exportTarget-create-tooltipWrap"), DSExportTStr.Create);
                }
                return isAdmin;
            }
        });
    }

    return (DataStore);
}(jQuery, {}));
