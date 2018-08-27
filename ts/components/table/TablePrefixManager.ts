// Module for manageing table prefix
class TablePrefixManager {
    private static _instance: TablePrefixManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private colorMaps: object;

    public constructor() {
        this.colorMaps = {};
        this._addMenuActions();
    }

    /**
     * Get cached prefix to color maps
     */
    public getCache(): object {
        return this.colorMaps;
    }

    /**
     * Restore old maps
     */
    public restore(oldMaps: object): void {
        this.colorMaps = oldMaps || {};
    }

    /**
     * Get color from prefix
     * @param prefix {string}
     */
    public getColor(prefix: string): string {
        return this.colorMaps[prefix] || "";
    }

    /**
     * Mark color of the prefix
     * @param prefix {string} prefix
     * @param newColor {string} new color of the prefix
     */
    public markColor(prefix: string, newColor: string): void {
        const oldColor: string = this.getColor(prefix);
        $(".th .topHeader").each((_index, ele) => {
            const $topHeader: JQuery = $(ele);
            if ($topHeader.find(".prefix").text() === prefix) {
                $topHeader.attr("data-color", newColor)
                        .data("color", newColor);
            }
        });
        this._addColor(prefix, newColor);

        Log.add(SQLTStr.MarkPrefix, {
            "operation": SQLOps.MarkPrefix,
            "prefix": prefix,
            "oldColor": oldColor,
            "newColor": newColor,
        });
    }

    /**
     * Update a table column's prefix color
     * @param tableId {TableId} Table's id
     * @param colNum {number} column number
     */
    public updateColor(tableId: TableId, colNum: number): void {
        const table: TableMeta = gTables[tableId];
        const $topHeader: JQuery = $("#xcTable-" + tableId).find(".th.col" + colNum +
                                                        " .topHeader");

        let prefix: string = table.getCol(colNum).getPrefix();
        if (prefix === "") {
            // displayed text
            prefix = CommonTxtTstr.Immediates;
        }

        $topHeader.find(".prefix").text(prefix);
        const color: string = this.getColor(prefix);
        $topHeader.attr("data-color", color).data("color", color);
    }

    private _addColor(prefix: string, color: string): void {
        this.colorMaps[prefix] = color;
    }

    private _addMenuActions(): void {
        const $prefixColorMenu: JQuery = $("#prefixColorMenu");
        $prefixColorMenu.on("mouseup", ".wrap", (event) => {
            if (event.which !== 1) {
                return;
            }

            const $wrap: JQuery = $(event.currentTarget);
            const prefix: string = $prefixColorMenu.data("prefix");
            const color: string = $wrap.data("color");

            $wrap.addClass("selected").siblings().removeClass("selected");
            this.markColor(prefix, color);
            xcMenu.close($prefixColorMenu);
        });
    }
}
