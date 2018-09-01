class TblFunc {
    /* Possible Options:
        includeHeader: boolean, default is false. If set, column head will be
                        included when determining column width
        fitAll: boolean, default is false. If set, both column head and cell widths
                will be included in determining column width
        minWidth: integer, default is 10. Minimum width a column can be.
        maxWidth: integer, default is 2000. Maximum width a column can be.
        unlimitedWidth: boolean, default is false. Set to true if you don't want to
                        limit the width of a column
        dataStore: boolean, default is false. Set to true if measuring columns
                    located in the datastore panel
        dblClick: boolean, default is false. Set to true when resizing using a
                    double click,
        multipleCols: boolean, default is false. Set to true if this is one of many cols
        being resized so we don't call matchHeaders() multiple times
    */

   /**
    * TblFunc.autosizeCol 
    * @param $th th element to resize
    * @param options option for resizing
    * includeHeader: If set, column head will be included when determining column width.
    * fitAll: If set, both column head and cell widths will be included in determining column width.
    * minWidth: Minimum width a column can be.
    * maxWidth: Maximum width a column can be.
    * unlimitedWidth: Set to true if you don't want to limit the width of a column.
    * dataStore: Set to true if measuring columns located in the datastore panel.
    * dblClick: Set to true when resizing using a double click.
    * multipleCols: Set to true if this is one of many cols being resized so we
    *               don't call matchHeaders() multiple times.
    */
    public static autosizeCol(
        $th: JQuery,
        options: {
            includeHeader: boolean,
            fitAll: boolean,
            minWidth: number,
            maxWidth: number,
            datastore: boolean
            dblClick: boolean,
            unlimitedWidth: boolean
            multipleCols: boolean
        }
    ): number {
        const colNum: number = $th.index();
        const $table: JQuery = $th.closest(".dataTable");

        const includeHeader: boolean = options.includeHeader || false;
        const fitAll: boolean = options.fitAll || false;
        const minWidth: number = options.minWidth || (gRescol.cellMinWidth - 5);
        const maxWidth: number = options.maxWidth || 700;
        const datastore: boolean = options.datastore || false;

        let table: TableMeta = null;
        if (!datastore) {
            const tableId: TableId = xcHelper.parseTableId($table);
            table = gTables[tableId];
        }

        const widestTdWidth: number = TblFunc.getWidestTdWidth($th, {
            "includeHeader": includeHeader,
            "fitAll": fitAll,
            "datastore": datastore
        });
        let newWidth: number = Math.max(widestTdWidth, minWidth);
        // dblClick is autoSized to a fixed width
        if (!options.dblClick) {
            let originalWidth: number = minWidth;
            if (table != null) {
                originalWidth = <number>table.getCol(colNum).width;
            }

            newWidth = Math.max(newWidth, originalWidth);
        }

        if (!options.unlimitedWidth) {
            newWidth = Math.min(newWidth, maxWidth);
        }

        $th.outerWidth(newWidth);
        if (table != null) {
            table.tableCols[colNum - 1].width = newWidth;
        } else if (datastore) {
            $("#dsTableWrap").width($("#dsTable").width());
        }
        if (!options.multipleCols) {
            TblFunc.matchHeaderSizes($table);
        }
        return newWidth;
    }

    /**
     * TblFunc.getWidestTdWidth
     * @param $el a data cell element
     * @param options
     */
    public static getWidestTdWidth(
        $el: JQuery,
        options: {
            includeHeader: boolean,
            fitAll: boolean,
            datastore: boolean
        }
    ) {
        const includeHeader: boolean = options.includeHeader || false;
        const fitAll: boolean = options.fitAll || false;
        const colNum: number = $el.index();
        const $table: JQuery = $el.closest('.dataTable');
        let headerWidth: number = 0;

        if (fitAll || includeHeader) {
            let extraPadding: number = 48;
            if (options.datastore) {
                extraPadding += 4;
            }
            let $th: JQuery;
            if ($table.find('.col' + colNum + ' .dataCol').length === 1) {
                $th = $table.find('.col' + colNum + ' .dataCol');
            } else {
                $th = $table.find('.col' + colNum + ' .editableHead');
            }
            if (!$th.length) {
                $th = $el;
                extraPadding -= 40;
            }

            headerWidth = xcHelper.getTextWidth($th) + extraPadding;
            // include prefix width
            if ($th.closest('.xcTable').length) {
                const prefixText: string = $th.closest('.header').find('.prefix').text();
                const prefixWidth: number = xcHelper.getTextWidth(null, prefixText);
                headerWidth = Math.max(headerWidth, prefixWidth);
            }

            if (!fitAll) {
                return headerWidth;
            }
        }

        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        let $largestTd: JQuery = $table.find('tbody tr:first td:eq(' + colNum + ')');
        let longestText: number = 0;
        $table.find('tbody tr').each(function() {
            const $td: JQuery = $(this).children(':eq(' + colNum + ')');
            let textLength: number;
            if (options.datastore) {
                textLength = $.trim($td.text()).length;
            } else {
                textLength = $.trim($td.find('.displayedData').text()).length;
            }
            if (textLength > longestText) {
                longestText = textLength;
                $largestTd = $td;
            }
        });

        const padding: number = 10;
        let largestWidth: number = xcHelper.getTextWidth($largestTd) + padding;
        if (fitAll) {
            largestWidth = Math.max(headerWidth, largestWidth);
        }

        return largestWidth;
    }

    /**
     * TblFunc.matchHeaderSizes
     * @param $table table element
     */
    public static matchHeaderSizes($table: JQuery): void {
        // concurrent build table may make some $table be []
        if ($table.length === 0) {
            return;
        }

        const tableWidth: number = $table.width();
        TblFunc.moveTableDropdownBoxes();
        TblFunc.moveTableTitles(null);
        // for scrollbar
        TblFunc.moveFirstColumn(null);
        $table.find('.rowGrab').width(tableWidth);
        $table.siblings('.rowGrab').width(tableWidth);
    }

    /**
     * TblFunc.moveTableDropdownBoxes
     */
    public static moveTableDropdownBoxes(): void {
        let $startingTableHead: JQuery;
        const mainFrameOffsetLeft: number = MainMenu.getOffset();

        $('.xcTableWrap:not(".inActive")').each(function() {
            if ($(this)[0].getBoundingClientRect().right > mainFrameOffsetLeft) {
                $startingTableHead = $(this).find('.xcTheadWrap');
                return false;
            }
        });

        let tablesAreVisible: boolean;
        if ($startingTableHead && $startingTableHead.length > 0) {
            tablesAreVisible = true;
        } else {
            tablesAreVisible = false;
        }

        const windowWidth: number = $(window).width();
        while (tablesAreVisible) {
            const rect: ClientRect = $startingTableHead[0].getBoundingClientRect();
            const tableLeft: number = rect.left;
            const tableRight: number = rect.right;
            let iconPosition: number;

            if (tableRight > windowWidth) { // right side of table is offscreen to the right
                const position: number = tableRight - windowWidth + 3;
                $startingTableHead.find('.dropdownBox')
                                    .css('right', position + 'px');
                iconPosition = mainFrameOffsetLeft - tableLeft;
                iconPosition = Math.max(0, iconPosition);
                iconPosition = Math.min(iconPosition, tableRight - tableLeft - 40);
                $startingTableHead.find(".lockIcon")
                                  .css("left", iconPosition + "px");
                tablesAreVisible = false;
            } else { // right side of table is visible
                $startingTableHead.find('.dropdownBox').css('right', -3 + 'px');
                iconPosition = mainFrameOffsetLeft - tableLeft;
                iconPosition = Math.max(0, iconPosition);
                iconPosition = Math.min(iconPosition, tableRight - tableLeft - 40);
                $startingTableHead.find(".lockIcon")
                                  .css("left", iconPosition + "px");
                $startingTableHead = $startingTableHead.closest('.xcTableWrap')
                                                       .next()
                                                       .find('.xcTheadWrap');
                if ($startingTableHead.length < 1) {
                    tablesAreVisible = false;
                }
            }
        }
    }

    /**
     * TblFunc.moveTableTitles
     * @param $tableWraps 
     * @param options used to animate table titles when main menu opening or closing
     */
    public static moveTableTitles(
        $tableWraps: JQuery,
        options: {
            offset: number,
            menuAnimating: boolean
            animSpeed?: number
        } = {
            offset: 0,
            menuAnimating: false
        }
    ): void {
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }
        const modifiedOffset: number = options.offset || 0;
        const menuAnimating: boolean = options.menuAnimating || false;
        const animSpeed: number = options.animSpeed;

        $tableWraps = $tableWraps ||
                  $('.xcTableWrap:not(.inActive):not(.tableHidden):not(.hollowed)');

        const mainFrameWidth: number = $('#mainFrame').width() - modifiedOffset;
        const mainFrameOffsetLeft: number = MainMenu.getOffset();
        const viewWidth: number = mainFrameWidth + mainFrameOffsetLeft;

        $tableWraps.each(function() {
            const $table: JQuery = $(this);
            const $thead: JQuery = $table.find('.xcTheadWrap');
            if ($thead.length === 0) {
                return null;
            }
            if ($table.hasClass('tableDragging')) {
                return null;
            }

            const rect: ClientRect = $thead[0].getBoundingClientRect();
            const rectRight: number = rect.right + modifiedOffset;
            const rectLeft: number = rect.left + modifiedOffset;
            // if right side of table is to the right of left edge of screen
            if (rectRight > mainFrameOffsetLeft) {
                // if left side of table isn't offscreen to the right
                if (rectLeft < viewWidth) {
                    const $tableTitle: JQuery = $table.find('.tableTitle .text');
                    const titleWidth: number = $tableTitle.outerWidth();
                    const tableWidth: number = $thead.width();
                    let center: number;
                    if (rectLeft < mainFrameOffsetLeft) {
                        // left side of table is offscreen to the left
                        if (rectRight > viewWidth) { // table spans the whole screen
                            center = ((mainFrameWidth - titleWidth) / 2) +
                                     mainFrameOffsetLeft - rectLeft;
                        } else { // right side of table is visible
                            center = tableWidth - ((rectRight + titleWidth -
                                                    mainFrameOffsetLeft) / 2);
                            // prevents title from going off the right side of table
                            center = Math.min(center, tableWidth - titleWidth - 6);
                        }
                    } else { // the left side of the table is visible
                        if (rectRight < viewWidth) {
                            // the right side of the table is visible
                            center = (tableWidth - titleWidth) / 2;
                        } else { // the right side of the table isn't visible
                            center = (viewWidth - rectLeft - titleWidth) / 2;
                            center = Math.max(10, center);
                        }
                    }
                    center = Math.floor(center);
                    if (menuAnimating) {
                        $thead.find('.dropdownBox').addClass('dropdownBoxHidden');
                        $thead.find(".lockIcon").addClass("xc-hidden");
                        $tableTitle.addClass("animating");
                        $tableTitle.stop().animate({left: center}, animSpeed, function() {
                            $tableTitle.removeClass("animating");
                            $thead.find('.dropdownBox')
                                  .removeClass('dropdownBoxHidden');
                            $thead.find(".lockIcon").removeClass("xc-hidden");
                            TblFunc.moveTableDropdownBoxes();
                        });
                    } else {
                        if (!$tableTitle.hasClass("animating")) {
                            $tableTitle.css('left', center);
                        }
                    }

                    $table.find('.lockedTableIcon')
                          .css('left', center + titleWidth / 2 + 5);
                } else {
                    return false; // stop loop
                }
            }
        });
    }

    /**
     * TblFunc.moveTableTitlesAnimated
     * @param tableId
     * @param oldWidth
     * @param widthChange
     * @param speed
     */
    public static moveTableTitlesAnimated(
        tableId: TableId,
        oldWidth: number,
        widthChange: number,
        speed: number = 250
    ): void {
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }

        const $table: JQuery = $('#xcTableWrap-' + tableId);
        const $thead: JQuery = $table.find('.xcTheadWrap');
        if ($thead.length <= 0) {
            return;
        }
        const rect: ClientRect = $thead[0].getBoundingClientRect();
        const right: number = rect.right - widthChange;
        const mainFrameWidth: number = $('#mainFrame').width();
        const mainFrameOffsetLeft: number = MainMenu.getOffset();
        const viewWidth: number = $('#mainFrame').width() + mainFrameOffsetLeft;

        if (right > mainFrameOffsetLeft && rect.left < viewWidth) {
            const $tableTitle: JQuery = $table.find('.tableTitle .text');
            const $input: JQuery = $tableTitle.find('input');
            const inputTextWidth: number = xcHelper.getTextWidth($input, $input.val()) + 1;
            let titleWidth: number = $tableTitle.outerWidth();
            const inputWidth: number = $input.width();
            const inputWidthChange: number = inputTextWidth - inputWidth;
            let expectedTitleWidth: number;
            // because the final input width is variable we need to figure out
            // how much it's going to change and what the expected title width is
            if (widthChange > 0) {
                const extraSpace: number = $thead.width() - titleWidth - 2;
                expectedTitleWidth = titleWidth -
                                     Math.max(0, (widthChange - extraSpace));
            } else {
                expectedTitleWidth = titleWidth +
                                     Math.min(inputWidthChange, -widthChange);
            }

            titleWidth = expectedTitleWidth;
            const tableWidth: number = oldWidth - widthChange - 5;
            let center: number;
            if (rect.left < mainFrameOffsetLeft) {
                // left side of table is offscreen to the left
                if (right > viewWidth) { // table spans the whole screen
                    center = ((mainFrameWidth - titleWidth) / 2) +
                             mainFrameOffsetLeft - rect.left;
                } else { // right side of table is visible
                    center = tableWidth - ((right + titleWidth - mainFrameOffsetLeft) / 2);
                    center = Math.min(center, tableWidth - titleWidth - 6);
                }
            } else { // the left side of the table is visible
                if (right < viewWidth) { // the right side of the table is visible
                    center = (tableWidth - titleWidth) / 2;
                } else { // the right side of the table isn't visible
                    center = (viewWidth - rect.left - titleWidth) / 2;
                    center = Math.max(10, center);
                }
            }
            center = Math.floor(center);
            $thead.find('.dropdownBox').addClass('dropdownBoxHidden');
            $thead.find(".lockIcon").addClass("xc-hidden");
            $tableTitle.animate({left: center}, speed, "linear", function() {
                $thead.find('.dropdownBox').removeClass('dropdownBoxHidden');
                $thead.find(".lockIcon").removeClass("xc-hidden");
                TblFunc.moveTableDropdownBoxes();
                // for tableScrollBar
                TblFunc.moveFirstColumn(null);
            });
        }
    }
    
    /**
     * TblFunc.focusTable
     * @param tableId
     * @param focusDag
     */
    public static focusTable(tableId: TableId, focusDag: boolean = false): void {
        if (WSManager.getWSFromTable(tableId) !== WSManager.getActiveWS()) {
            if ((Log.isRedo() || Log.isUndo()) &&
                Log.viewLastAction() !== "Join"
            ) {
                const wsToFocus: string = WSManager.getWSFromTable(tableId);
                const activeWS: string = WSManager.getActiveWS();
                if (wsToFocus !== activeWS) {
                    $("#worksheetTab-" + wsToFocus).trigger(fakeEvent.mousedown);
                }
            } else {
                console.warn("Table not in current worksheet");
                return;
            }
        }

        if ($("#xcTableWrap-" + tableId).hasClass("tableLocked")) {
            return;
        }

        const alreadyFocused: boolean = (gActiveTableId === tableId);
        if (!alreadyFocused && gActiveTableId) {
            TblManager.unHighlightCells(gActiveTableId);
            if (!$("#xcTable-" + tableId).find(".selectedCell").length) {
                FnBar.clear();
            }
        }
        const wsNum: string = WSManager.getActiveWS();
        $('.xcTableWrap.worksheet-' + wsNum).find('.tableTitle')
                                            .removeClass('tblTitleSelected');
        const $xcTheadWrap: JQuery = $('#xcTheadWrap-' + tableId);
        $xcTheadWrap.find('.tableTitle').addClass('tblTitleSelected');
        // unhighlight any selected columns from all other tables
        $('.xcTable:not(#xcTable-' + tableId + ')').find('.selectedCell')
                                                   .removeClass('selectedCell');
        gActiveTableId = tableId;
        TableComponent.update();

        if (focusDag) {
            Dag.focusDagForActiveTable(null, true);
        } else {
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        }
        $('.dagWrap').addClass('notSelected').removeClass('selected');
        $('#dagWrap-' + tableId).addClass('selected').removeClass('notSelected');
    }

    /**
     * TblFunc.isTableScrollable
     * @param tableId
     */
    public static isTableScrollable(tableId: TableId): boolean {
        const $firstRow: JQuery = $('#xcTable-' + tableId).find('tbody tr:first');
        const topRowNum: number = xcHelper.parseRowNum($firstRow);
        const tHeadHeight: number = $('#xcTheadWrap-' + tableId).height();
        const tBodyHeight: number = $('#xcTable-' + tableId).height();
        const tableWrapHeight: number = $('#xcTableWrap-' + tableId).height();
        if ((tHeadHeight + tBodyHeight) >= (tableWrapHeight)) {
            return true;
        }
        const table: TableMeta = gTables[tableId];
        if (topRowNum === 0 &&
            table != null &&
            table.currentRowNumber === table.resultSetMax) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * TblFunc.checkTableDraggable
     */
    public static checkTableDraggable(): void {
        // disallow dragging if only 1 table in worksheet
        const activeWS: string = WSManager.getActiveWS();
        const $tables: JQuery = $('#mainFrame').find('.xcTableWrap.worksheet-' + activeWS);
        if ($tables.length === 1) {
            $tables.addClass('noDrag');
        } else {
            $tables.removeClass('noDrag');
        }
    }

    /**
     * TblFunc.moveFirstColumn
     * @param $targetTable
     * @param noScrollBar
     */
    public static moveFirstColumn(
        $targetTable: JQuery,
        noScrollBar: boolean = false
    ): void {
        const moveScrollBar: boolean = !noScrollBar;
        let $allTables: JQuery;
        if (DagEdit.isEditMode()) {
            $allTables = $(".xcTableWrap:visible");
        } else {
            $allTables = $('.xcTableWrap:not(".inActive")');
        }
        if ((isBrowserMicrosoft || isBrowserSafari) && !moveScrollBar) {
            return;
        }

        let rightOffset: number;
        let datasetPreview: boolean;
        let mainMenuOffset: number;
        let windowWidth: number;
        let $rightTable: JQuery;

        if ($targetTable == null) {
            datasetPreview = false;
            mainMenuOffset = MainMenu.getOffset();
            windowWidth = $(window).width() - 5;
            var tableFound = false;

            $allTables.each(function() {
                rightOffset = this.getBoundingClientRect().right;
                if (!tableFound && rightOffset > mainMenuOffset) {
                    $targetTable = $(this);
                    tableFound = true;
                    if (!moveScrollBar) {
                        return false;
                    }
                }
                if (moveScrollBar && (rightOffset > windowWidth)) {
                    $rightTable = $(this);
                    return false; // stop loop
                }
            });

        } else {
            datasetPreview = true;
            mainMenuOffset = 0;
        }

        if (!(isBrowserMicrosoft || isBrowserSafari) &&
            $targetTable && $targetTable.length > 0) {
            const $idCol: JQuery = $targetTable.find('.idSpan');
            const cellWidth: number = $idCol.outerWidth();
            let scrollLeft: number;

            if (datasetPreview) {
                const $container: JQuery = $targetTable.closest("#dsTableContainer").length
                                ? $('#dsTableContainer') : $targetTable.closest(".datasetTableWrap");
                scrollLeft = -($targetTable.offset().left -
                                $container.offset().left);
            } else {
                scrollLeft = mainMenuOffset - $targetTable.offset().left;
            }

            const rightDiff: number = rightOffset - (cellWidth + 5);
            if (rightDiff < mainMenuOffset) {
                scrollLeft += rightDiff - mainMenuOffset;
            }
            scrollLeft = Math.min($targetTable.width() - (cellWidth + 15), scrollLeft);

            scrollLeft = Math.max(0, scrollLeft);
            $idCol.css('left', scrollLeft);
            $targetTable.find('th.rowNumHead > div').css('left', scrollLeft);
            if (!datasetPreview) {
                let adjustNext: boolean = true;
                while (adjustNext) {
                    $targetTable = $targetTable.next();
                    if ($targetTable.length === 0) {
                        adjustNext = false;
                    } else {
                        rightOffset = $targetTable[0].getBoundingClientRect()
                                                     .right;
                        if (rightOffset > $(window).width()) {
                            adjustNext = false;
                        }
                        $targetTable.find('.idSpan').css('left', 0);
                        $targetTable.find('th.rowNumHead > div').css('left', 0);
                    }
                }
            }
        }

        if (moveScrollBar && !datasetPreview) {
            if (!$rightTable || !$rightTable.length) {
                $rightTable = $allTables.last();
                if (!$rightTable.length) {
                    return;
                }
            }

            rightOffset = $rightTable[0].getBoundingClientRect().right;
            var right = Math.max(5, rightOffset - windowWidth);
            $rightTable.find(".tableScrollBar").css("right", right);

            let adjustNext: boolean = true;
            while (adjustNext) {
                $rightTable = $rightTable.prev();
                if ($rightTable.length === 0) {
                    return;
                }
                rightOffset = $rightTable[0].getBoundingClientRect().right;
                if (rightOffset < mainMenuOffset) {
                    return;
                }

                $rightTable.find(".tableScrollBar").css("right", 5);
            }
        }
    }

    /**
     * TblFunc.reorderAfterTableDrop
     * @param tableId
     * @param srcIndex
     * @param desIndex
     * @param options - moveHtml: boolean, if true we replace html
     *                  (for undo/redo or through table menu)
     */
    public static reorderAfterTableDrop(
        tableId: TableId,
        srcIndex: number,
        desIndex: number,
        options: {
            moveHtml: boolean
        } = {
            moveHtml: false
        }
    ): void {
        WSManager.reorderTable(tableId, srcIndex, desIndex);
        const moveHtml: boolean = options.moveHtml || false;
        const newIndex: number = WSManager.getTablePosition(tableId);

        const $dagWrap: JQuery = $('#dagWrap-' + tableId);
        const $dagWraps: JQuery = $('.dagWrap:not(.tableToRemove)');
        let $tableWrap: JQuery;
        let $tableWraps: JQuery;
        if (moveHtml) {
            $tableWraps = $('.xcTableWrap:not(.tableToRemove)');
            $tableWrap = $('#xcTableWrap-' + tableId);
        }

        if (newIndex === 0) {
            $('.dagArea').find('.legendArea').after($dagWrap);
            if (moveHtml) {
                $('#mainFrame').prepend($tableWrap);
            }
        } else if (srcIndex < desIndex) {
            $dagWraps.eq(newIndex).after($dagWrap);
            if (moveHtml) {
                $tableWraps.eq(newIndex).after($tableWrap);
            }
        } else if (srcIndex > desIndex) {
            $dagWraps.eq(newIndex).before($dagWrap);
            if (moveHtml) {
                $tableWraps.eq(newIndex).before($tableWrap);
            }
        }

        TableList.reorderTable(tableId);

        if (moveHtml) {
            xcHelper.centerFocusedTable(tableId, false);
            TblManager.alignTableEls($tableWrap);
        }

        Log.add(SQLTStr.ReorderTable, {
            "operation": "reorderTable",
            "tableId": tableId,
            "tableName": gTables[tableId].tableName,
            "srcIndex": srcIndex,
            "desIndex": desIndex
        });
    }

    /**
     * TblFunc.hideOffScreenTables
     * For performance, during animations, we set display none on tables
     * that are not currently in the viewport but are active.
     * ables will maintain their widths;
     * @param options 
     */
    public static hideOffScreenTables(
        options: {
            marginLeft?: number,
            marginRight?: number
        } = {}
    ): void {
        let leftLimit: number = -options.marginLeft || 0;
        const marginRight: number = options.marginRight || 0;
        const $tableWraps: JQuery = $('.xcTableWrap:not(.inActive)');
        const mainFrameRect: ClientRect = $('#mainFrame')[0].getBoundingClientRect();
        const viewWidth: number =  mainFrameRect.right + marginRight;
        leftLimit += mainFrameRect.left;

        $tableWraps.each(function() {
            const $table: JQuery = $(this);
            const $thead: JQuery = $table.find('.xcTheadWrap');
            if (!$thead.length) {
                return null;
            }

            const rect: ClientRect = $thead[0].getBoundingClientRect();
            if (rect.right > leftLimit) {
                if (rect.left < viewWidth) {
                    $table.addClass('inViewPort');
                } else {
                    return false; // stop loop
                }
            }
        });

        $tableWraps.not('.inViewPort').each(function() {
            const $table: JQuery = $(this);
            $table.width($table.width()).addClass('hollowed');
        });
    }

    /**
     * TblFunc.unhideOffScreenTables
     */
    public static unhideOffScreenTables(): void {
        let mainFrameScroll: number;
        const cachedMouseStatus: string = gMouseStatus;
        if (!isBrowserChrome) {
            // to reset scrollposition in case it gets changed
            mainFrameScroll = $('#mainFrame').scrollLeft();
            gMouseStatus = "movingTable";
        }
        const $tableWraps: JQuery = $('.xcTableWrap:not(.inActive)');
        $tableWraps.width('auto');
        $tableWraps.removeClass('inViewPort hollowed');
         //vertically align any locked table icons
        const mainFrameHeight: number = $('#mainFrame').height();
        $('.tableLocked:visible').each(function() {
            const $tableWrap: JQuery = $(this);
            const tbodyHeight: number = $tableWrap.find('tbody').height() + 1;
            const tableWrapHeight: number = $tableWrap.find('.xcTbodyWrap').height();
            const $lockedIcon: JQuery = $tableWrap.find('.lockedTableIcon');
            const iconHeight: number = $lockedIcon.height();
            let topPos: number = 50 * ((tableWrapHeight - (iconHeight / 2)) /
                                mainFrameHeight);
            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');
            $tableWrap.find('.tableCover').height(tbodyHeight);
        });
        if (!isBrowserChrome) {
            // to reset scrollposition in case it gets changed
            $('#mainFrame').scrollLeft(mainFrameScroll);
            // firefox and IE will trigger a delayed scroll
            setTimeout(function() {
                gMouseStatus = cachedMouseStatus;
            }, 0);
        }
    }

    /**
     * TblFunc.scrollTable
     * @param tableId
     * @param scrollType
     * @param isUp
     */
    public static scrollTable(
        tableId: TableId,
        scrollType: string,
        isUp: boolean
    ): boolean {
        if (!$("#workspaceTab").hasClass("active") ||
            !$("#worksheetButton").hasClass("active") ||
            tableId == null)
        {
            return false;
        }

        const $visibleMenu: JQuery = $('.menu:visible');
        if ($visibleMenu.length !== 0) {
            // if the menu is only .tdMenu, allow scroll
            if ($visibleMenu.length > 1 || !$visibleMenu.hasClass("tdMenu")) {
                return false;
            }
        }

        if ($("#functionArea .CodeMirror").hasClass("CodeMirror-focused") ||
            $(document.activeElement).is("input")) {
            return false;
        }

        // XXX TODO: fix it with rowInput
        const $rowInput: JQuery = $("#rowInputArea input");
        const $lastTarget: JQuery = gMouseEvents.getLastMouseDownTarget();
        const isInMainFrame: boolean = !$lastTarget.context ||
                            ($lastTarget.closest("#mainFrame").length > 0 &&
                            !$lastTarget.is("input"));

        if (isInMainFrame && xcHelper.isTableInScreen(tableId)) {
            if (gIsTableScrolling ||
                $("#modalBackground").is(":visible") ||
                !TblFunc.isTableScrollable(tableId)) {
                // not trigger table scroll, but should return true
                // to prevent table's natural scroll
                return true;
            }

            const table: TableMeta = gTables[tableId];
            const maxRow: number = table.resultSetCount;
            const curRow: number = $rowInput.data("val");
            const rowManager: RowManager = new RowManager(table, $("#xcTableWrap-" + tableId));
            const lastRowNum: number = rowManager.getLastVisibleRowNum();
            let rowToGo: number;

            // validation check
            xcAssert((lastRowNum != null), "Error Case!");

            if (scrollType === "homeEnd") {
                // isUp === true for home button, false for end button
                rowToGo = isUp ? 1 : maxRow;
            } else {
                let rowToSkip: number;
                if (scrollType === "updown") {
                    const $xcTbodyWrap: JQuery = $("#xcTbodyWrap-" + tableId);
                    const scrollTop: number = $xcTbodyWrap.scrollTop();
                    const $trs: JQuery = $("#xcTable-" + tableId + " tbody tr");
                    const trHeight: number = $trs.height();
                    let rowNum: number;

                    if (!isUp) {
                        rowNum = xcHelper.parseRowNum($trs.eq($trs.length - 1)) + 1;
                        if (rowNum - lastRowNum > 5) {
                            // when have more then 5 buffer on bottom
                            $xcTbodyWrap.scrollTop(scrollTop + trHeight);
                            return true;
                        }
                    } else {
                        rowNum = xcHelper.parseRowNum($trs.eq(0)) + 1;
                        if (curRow - rowNum > 5) {
                            // when have more then 5 buffer on top
                            $xcTbodyWrap.scrollTop(scrollTop - trHeight);
                            return true;
                        }
                    }

                    rowToSkip = 1;
                } else if (scrollType === "pageUpdown") {
                    // this is one page's row
                    rowToSkip = lastRowNum - curRow;
                } else {
                    // error case
                    console.error("Invalid case!");
                    return false;
                }

                rowToGo = isUp ? Math.max(1, curRow - rowToSkip) :
                                Math.min(maxRow, curRow + rowToSkip);
            }

            if (isUp && curRow === 1 || !isUp && lastRowNum === maxRow) {
                // no need for backend call
                return true;
            }

            xcMenu.close();
            gMouseEvents.setMouseDownTarget(null);
            $rowInput.val(rowToGo).trigger(fakeEvent.enter);

            return true;
        }
        return false;
    }

    /**
     * TblFunc.keyEvent
     * @param event
     */
    public static keyEvent(event: JQueryEventObject): void {
        // only being used for ctrl+o to open column dropdown
        if (!(isSystemMac && event.metaKey) &&
            !(!isSystemMac && event.ctrlKey))
        {
            return;
        }
        if (letterCode[event.which] !== "o") {
            return;
        }

        if ($('#workspacePanel').hasClass('active') &&
            !$('#modalBackground').is(":visible") &&
            !$('textarea:focus').length &&
            !$('input:focus').length) {

            const $th: JQuery = $(".xcTable th.selectedCell");
            if ($th.length > 0) {
                event.preventDefault();
            }
            if ($th.length !== 1) {
                return;
            }

            $th.find(".dropdownBox").trigger(fakeEvent.click);
        }
    }
}
