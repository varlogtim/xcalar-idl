class TableMenuManager {
    private static _instance: TableMenuManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private tableMenu: TableMenu;
    private colMenu: ColMenu;
    private cellMenu: CellMenu;

    public constructor() {
        this.tableMenu = new TableMenu();
        this.colMenu = new ColMenu();
        this.cellMenu = new CellMenu();
    }

    public getTableMenu(): TableMenu {
        return this.tableMenu;
    }

    /**
     * Get TableManuManger Instance
     */
    public getColMenu(): ColMenu {
        return this.colMenu;
    }

    public getCellMenu(): CellMenu {
        return this.cellMenu;
    }

    /**
     * show/hides menu items common to both table and dag menus
     * must provide either tableId if it's a worksheet table or $dagTable
     * if it's a dagTable
     * @param $menu
     * @param tableId
     * @param $dagTable
     */
    public showTableMenuOptions($menu: JQuery,): void {
        try {
            const nodeId: DagNodeId = DagTable.Instance.getBindNodeId();
            if (nodeId == null) {
                return;
            }
            const node: DagNode = DagView.getActiveDag().getNode(nodeId);

            // handle icv
            const $genIcvLi: JQuery = $menu.find(".generateIcv");
            const nodeType: DagNodeType = node.getType();
            if (nodeType === DagNodeType.Map && node.getSubType() == null ||
                nodeType === DagNodeType.GroupBy
            ) {
                let icv: boolean = node.getParam().icv;
                if (icv) {
                    xcHelper.disableMenuItem($genIcvLi, {
                        title: TooltipTStr.AlreadyIcv
                    });
                } else {
                    xcHelper.enableMenuItem($genIcvLi);
                }
            } else {
                xcHelper.disableMenuItem($genIcvLi, {
                    title: TooltipTStr.IcvRestriction
                });
            }

            // handle complement
            const $complimentLi: JQuery = $menu.find(".complementTable");
            if (node.getType() === DagNodeType.Filter) {
                xcHelper.enableMenuItem($complimentLi);
            } else {
                xcHelper.disableMenuItem($complimentLi, {
                    title: TooltipTStr.ComplementRestriction
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

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