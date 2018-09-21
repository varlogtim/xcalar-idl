class TableComponent {
    private static menuManager: TableMenuManager;
    private static prefixManager: TablePrefixManager;
    private static viewersMap: Map<TableId, XcTableInWSViewer>;
    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableComponent.menuManager = TableMenuManager.Instance;
            TableComponent.prefixManager = TablePrefixManager.Instance;
            TableComponent.viewersMap = new Map();
            this._setupSkewInfo();
            this._setupMainFrame();
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @returns {TableMenuManager} return menu manager
     */
    public static getMenu(): TableMenuManager {
        return TableComponent.menuManager;
    }

    /**
     * @returns {TablePrefixManager} return prefix manager
     */
    public static getPrefixManager(): TablePrefixManager {
        return TableComponent.prefixManager;
    }

    public static addViewer(tableId: TableId, viewer: XcTableInWSViewer): void {
        this.viewersMap.set(tableId, viewer);
    }

    public static empty(): void {
        gActiveTableId = null;
        TableComponent.update();
    }

    public static update(): void {
        const $rowInputArea: JQuery = $("#rowInputArea");
        const viewer: XcTableInWSViewer = this.viewersMap.get(gActiveTableId);
        const table: TableMeta = gTables[gActiveTableId];
        if (viewer == null || table == null) {
            $rowInputArea.empty();
            this._emptySkew();
        } else {
            this._updateSkew(table.getSkewness());
            const rowInput: RowInput = viewer.getRowInput();
            rowInput.render($rowInputArea);
            rowInput.updateTotalRows(table.resultSetCount);

            if (table.resultSetCount === 0) {
                rowInput.setRowNum(0);
            } else {
                rowInput.genFirstVisibleRowNum();
            }
        }
    }

    private static _setupSkewInfo(): void {
        $("#skewInfoArea").click(() => {
            SkewInfoModal.show(gActiveTableId);
        });
    }

    private static _setupMainFrame(): void {
        let mainFrameScrolling: boolean = false;
        let mainFrameScrollTimer: number;
        let scrollPrevented: boolean = false;
        $('#mainFrame').scroll(function(): void {
            if (!mainFrameScrolling) {
                mainFrameScrolling = true;
                // apply the following actions only once per scroll session

                if ($(this).hasClass('scrollLocked')) {
                    scrollPrevented = true;
                } else {
                    xcMenu.close();
                }

                xcMenu.removeKeyboardNavigation();
                // table head's dropdown has position issue if not hide
                $('.xcTheadWrap').find('.dropdownBox')
                                 .addClass('dropdownBoxHidden');
                $(".xcTheadWrap").find(".lockIcon").addClass("xc-hidden");
                xcTooltip.hideAll();
                $('.tableScrollBar').hide();
            }
            $(this).scrollTop(0);

            clearTimeout(mainFrameScrollTimer);
            mainFrameScrollTimer = <any>setTimeout(mainFrameScrollingStop, 300);
            if (!scrollPrevented) {
                TblFunc.moveFirstColumn(null, true);
                TblFunc.moveTableTitles(null);
            }
        });

        function mainFrameScrollingStop(): void {
            $('.xcTheadWrap').find('.dropdownBox')
                             .removeClass('dropdownBoxHidden');
            $(".xcTheadWrap").find(".lockIcon").removeClass("xc-hidden");
            $('.tableScrollBar').show();
            TblFunc.moveFirstColumn(null);
            TblFunc.moveTableDropdownBoxes();
            mainFrameScrolling = false;
            scrollPrevented = false;
        }

    }

    private static _updateSkew(skew: number): void {
        var $section = $("#skewInfoArea").addClass("active");
        var $text = $section.find(".text");
        if (skew == null || isNaN(skew)) {
            $text.text("N/A");
            $text.css("color", "");
        } else {
            $text.text(skew);
            $text.css("color", this._getSkyewColor(skew));
        }
    }

    private static _getSkyewColor(skew: number): string {
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h: number = 104;
        if (skew != null) {
            if (skew <= 25) {
                h = 104 - 54 / 25 * skew;
            } else if (skew <= 50) {
                h = 50 - 2 * (skew - 25);
            } else {
                h = 0;
            }
        }
        return "hsl(" + h + ", 100%, 33%)";
    }

    private static _emptySkew() {
        $("#skewInfoArea").removeClass("active").find(".text").text("");
    }
}