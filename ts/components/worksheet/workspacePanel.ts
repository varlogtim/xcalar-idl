namespace WorkspacePanel {
    let $workspacePanel: JQuery;
    let hasSetup = false;

    export function setup() {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        $("#workspaceTab").removeClass("xc-hidden");
        $("#workspacePanel").addClass("active");
        $("#worksheetView").addClass("active");
        $workspacePanel = $("#workspacePanel");
    };

    // when coming from a different panel
    export function active() {
        if (!hasSetup) {
            return;
        }
        $workspacePanel.addClass("active");
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
}
