class TableMenuManager {
    private static _instance: TableMenuManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public constructor() {
        new TableMenu();
        new ColMenu();
        new CellMenu();
    }

    /**
     * show/hides menu items common to both table and dag menus
     * must provide either tableId if it's a worksheet table or $dagTable
     * if it's a dagTable
     * @param $menu
     * @param tableId
     * @param $dagTable
     */
    public showDagAndTableOptions(
        $menu: JQuery,
        tableId: TableId,
        $dagTable: JQuery
    ): void {
        const $genIcvLi: JQuery = $menu.find('.generateIcv');
        const tableInfo = Dag.getTableInfo(tableId, $dagTable);
        if (tableInfo.isIcv) {
            xcHelper.disableMenuItem($genIcvLi, {
                "title": TooltipTStr.AlreadyIcv
            });
        } else {
            if (tableInfo.generatingIcv) {
                xcHelper.disableMenuItem($genIcvLi, {
                    "title": TooltipTStr.IcvGenerating
                });
            } else if (tableInfo.canBeIcv) {
                if (tableInfo.hasDroppedParent) {
                    xcHelper.disableMenuItem($genIcvLi, {
                        "title": TooltipTStr.IcvSourceDropped
                    });
                } else {
                    xcHelper.enableMenuItem($genIcvLi);
                }
            } else {
                xcHelper.disableMenuItem($genIcvLi, {
                    "title": TooltipTStr.IcvRestriction
                });
            }
        }

        var $complimentLi = $menu.find('.complementTable');
        if (tableInfo.type === "filter") {
            if (tableInfo.generatingComplement) {
                xcHelper.disableMenuItem($complimentLi, {
                    "title": TooltipTStr.generatingComplement
                });
            } else if (tableInfo.hasDroppedParent) {
                xcHelper.disableMenuItem($complimentLi, {
                    "title": TooltipTStr.ComplementSourceDropped
                });
            } else {
                xcHelper.enableMenuItem($complimentLi);
            }
        } else {
            xcHelper.disableMenuItem($complimentLi, {
                "title": TooltipTStr.ComplementRestriction
            });
        }
    };

    /**
     *
     * @param menuId
     * @param nameInput
     */
    public updateExitOptions(menuId: string, nameInput?: string): void {
        const $menu: JQuery = $(menuId).find(".exitOp:first");
        $menu.attr('class', 'exitOp exitMainMenuOp');
        if (!nameInput) {
            return;
        }
        const name: string = nameInput;
        let nameUpper: string = xcHelper.capitalize(name);
        let label: string = nameUpper;
        switch (nameInput) {
            case ('dfcreate'):
                nameUpper = 'Dataflow';
                label = 'Batch Dataflow';
                break;
            case ('group by'):
                label = 'Group By';
                break;
            case ('smartcast'):
                nameUpper = 'SmartCast';
                label = 'Smart Cast';
                break;
            default:
                break;
        }
        $menu.html('<span class="label">Exit ' + label + '</span>');
        $menu.addClass('exit' + nameUpper.replace(/ /g,''));
    }
}