// sets up monitor panel and system menubar
namespace WorkspacePanel {
    let $workspacePanel: JQuery;
    let wasWorkspaceMenuOpen: boolean = false;

    export function setup() {
        $workspacePanel = $("#workspacePanel");
        setupViewToggling();
    };

    // when coming from a different panel
    export function active() {
        $("#workspacePanel").addClass("active");
        if ($("#worksheetButton").hasClass("active")) {
            $("#statusBar").addClass("worksheetMode");
            WSManager.focusOnWorksheet();
            if (!$("#dagPanel").hasClass("hidden")) {
                xcTooltip.changeText($("#dfPanelSwitch"),
                                     TooltipTStr.CloseQG);
            }
        } else {
            BottomMenu.unsetMenuCache();
        }

    }

    export function inActive() {
        xcTooltip.changeText($("#dfPanelSwitch"), TooltipTStr.OpenQG);
        $("#statusBar").removeClass("worksheetMode");
        if ($("#worksheetButton").hasClass("active")) {
                // hide off screen tables so that the next time we return to the
            // workspace panel, the switch is quicker because we have less html
            // to render. WSManager.focusOnWorksheet() will reveal hidden tables
            TblFunc.hideOffScreenTables();
        }
    }

    // when coming from a different subpanel
    function setupViewToggling() {

        // main menu
        $('#workspaceTab').find('.subTab').click(function() {
            const $button: JQuery = $(this);
            if ($button.hasClass('active')) {
                return;
            }
            let $menu: JQuery = $("#workspaceMenu");
            // XXX temp
            $("#workspacePanel").children(".mainContent").show();
            $("#userBox").removeClass("dagMode");

            switch ($button.attr("id")) {
                case ("worksheetButton"):
                    if (wasWorkspaceMenuOpen) {
                        MainMenu.open(true);
                    }
                    $menu.removeClass("imdMode");
                    $workspacePanel.find(".mainContent").scrollTop(0);
                    $("#worksheetView").addClass("active");
                    $("#workspaceBar").removeClass("xc-hidden");
                    $("#statusBar").addClass("worksheetMode");
                    WSManager.focusOnWorksheet();
                    break;
                default:
                    break;
            }
        });
    }
}
