window.TblFunc = (function(TblFunc, $) {
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
    TblFunc.autosizeCol = function($th, options) {
        options = options || {};

        var colNum = xcHelper.parseColNum($th);
        var $table = $th.closest(".dataTable");
        var table = null;

        var includeHeader = options.includeHeader || false;
        var fitAll = options.fitAll || false;
        var minWidth = options.minWidth || (gRescol.cellMinWidth - 5);
        var maxWidth = options.maxWidth || 700;
        var datastore = options.datastore || false;

        if (!datastore) {
            var tableId = xcHelper.parseTableId($table);
            table = gTables[tableId];
        }

        var widestTdWidth = TblFunc.getWidestTdWidth($th, {
            "includeHeader": includeHeader,
            "fitAll": fitAll,
            "datastore": datastore
        });
        var newWidth = Math.max(widestTdWidth, minWidth);
        // dblClick is autoSized to a fixed width
        if (!options.dblClick) {
            var originalWidth = minWidth;

            if (table != null) {
                originalWidth = table.tableCols[colNum - 1].width;
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
    };

    /*
     * options:
     *  includeHeader,
     *  fitAll,
     *  datastore: if it's datastore table
     */
    TblFunc.getWidestTdWidth = function(el, options) {
        options = options || {};

        var includeHeader = options.includeHeader || false;
        var fitAll = options.fitAll || false;
        var id = xcHelper.parseColNum(el);
        var $table = el.closest('.dataTable');
        var largestWidth = 0;
        var longestText = 0;
        var textLength;
        var padding = 10;
        var $largestTd = $table.find('tbody tr:first td:eq(' + id + ')');
        var headerWidth = 0;
        var prefixWidth = 0;

        if (fitAll || includeHeader) {
            var extraPadding = 48;
            if (options.datastore) {
                extraPadding += 4;
            }
            var $th;
            if ($table.find('.col' + id + ' .dataCol').length === 1) {
                $th = $table.find('.col' + id + ' .dataCol');
            } else {
                $th = $table.find('.col' + id + ' .editableHead');
            }
            if (!$th.length) {
                $th = $table.find('th.col' + id);
                extraPadding -= 40;
            }

            headerWidth = xcHelper.getTextWidth($th) + extraPadding;
            // include prefix width
            if ($th.closest('.xcTable').length) {
                var prefixText = $th.closest('.header').find('.prefix').text();
                prefixWidth = xcHelper.getTextWidth(null, prefixText, {
                    "defaultHeaderStyle": true
                });
                headerWidth = Math.max(headerWidth, prefixWidth);
            }

            if (!fitAll) {
                return (headerWidth);
            }
        }

        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        $table.find('tbody tr').each(function() {
            var $td = $(this).children(':eq(' + (id) + ')');
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

        largestWidth = xcHelper.getTextWidth($largestTd) + padding;

        if (fitAll) {
            largestWidth = Math.max(headerWidth, largestWidth);
        }

        return (largestWidth);
    };

    TblFunc.matchHeaderSizes = function($table) {
        // concurrent build table may make some $table be []
        if ($table.length === 0) {
            return;
        }

        var tableWidth = $table.width();

        TblFunc.moveTableDropdownBoxes();
        TblFunc.moveTableTitles();
        // for scrollbar
        TblFunc.moveFirstColumn();
        $table.find('.rowGrab').width(tableWidth);
        $table.siblings('.rowGrab').width(tableWidth);
    };

    TblFunc.moveTableDropdownBoxes = function() {
        var $startingTableHead;
        var mainFrameOffsetLeft = MainMenu.getOffset();

        $('.xcTableWrap:not(".inActive")').each(function() {
            if ($(this)[0].getBoundingClientRect().right > mainFrameOffsetLeft) {
                $startingTableHead = $(this).find('.xcTheadWrap');
                return false;
            }
        });

        var tablesAreVisible;
        if ($startingTableHead && $startingTableHead.length > 0) {
            tablesAreVisible = true;
        } else {
            tablesAreVisible = false;
        }

        var windowWidth = $(window).width();

        while (tablesAreVisible) {
            var tableRight = $startingTableHead[0].getBoundingClientRect().right;
            if (tableRight > windowWidth) { // right side of table is offscreen to the right
                var position = tableRight - windowWidth + 3;
                $startingTableHead.find('.dropdownBox')
                                    .css('right', position + 'px');
                tablesAreVisible = false;
            } else { // right side of table is visible
                $startingTableHead.find('.dropdownBox').css('right', -3 + 'px');
                $startingTableHead = $startingTableHead.closest('.xcTableWrap')
                                                       .next()
                                                       .find('.xcTheadWrap');
                if ($startingTableHead.length < 1) {
                    tablesAreVisible = false;
                }
            }
        }
    };

    // options used to animate table titles when main menu opening or closing
    TblFunc.moveTableTitles = function($tableWraps, options) {
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }
        options = options || {};
        var modifiedOffset = options.offset || 0;
        var menuAnimating = options.menuAnimating;
        var animSpeed = options.animSpeed;

        $tableWraps = $tableWraps ||
                  $('.xcTableWrap:not(.inActive):not(.tableHidden):not(.hollowed)');

        var mainFrameWidth = $('#mainFrame').width() - modifiedOffset;
        var mainFrameOffsetLeft = MainMenu.getOffset();


        var viewWidth = mainFrameWidth + mainFrameOffsetLeft;

        $tableWraps.each(function() {
            var $table = $(this);
            var $thead = $table.find('.xcTheadWrap');
            if ($thead.length === 0) {
                return null;
            }
            if ($table.hasClass('tableDragging')) {
                return null;
            }

            var rect = $thead[0].getBoundingClientRect();
            var rectRight = rect.right + modifiedOffset;
            var rectLeft = rect.left + modifiedOffset;
            // if right side of table is to the right of left edge of screen
            if (rectRight > mainFrameOffsetLeft) {
                // if left side of table isn't offscreen to the right
                if (rectLeft < viewWidth) {
                    var $tableTitle = $table.find('.tableTitle .text');
                    var titleWidth = $tableTitle.outerWidth();
                    var tableWidth = $thead.width();
                    var center;
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
                        $tableTitle.animate({left: center}, animSpeed, function() {
                            $thead.find('.dropdownBox')
                                  .removeClass('dropdownBoxHidden');
                            TblFunc.moveTableDropdownBoxes();
                        });
                    } else {
                        $tableTitle.css('left', center);
                    }

                    $table.find('.lockedTableIcon')
                          .css('left', center + titleWidth / 2 + 5);
                } else {
                    return false;
                }
            }
        });
    };

    TblFunc.moveTableTitlesAnimated = function(tableId, oldWidth, widthChange, speed) {
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }
        if (speed == null) { // lets speed 0 be 0
            speed = 250;
        }

        var $table = $('#xcTableWrap-' + tableId);
        var $thead = $table.find('.xcTheadWrap');
        var rect = $thead[0].getBoundingClientRect();
        var right = rect.right - widthChange;
        var mainFrameWidth = $('#mainFrame').width();
        var mainFrameOffsetLeft = MainMenu.getOffset();

        var viewWidth = $('#mainFrame').width() + mainFrameOffsetLeft;

        if (right > mainFrameOffsetLeft && rect.left < viewWidth) {
            var $tableTitle = $table.find('.tableTitle .text');
            var $input = $tableTitle.find('input');
            var inputTextWidth = xcHelper.getTextWidth($input, $input.val()) + 1;
            var titleWidth = $tableTitle.outerWidth();
            var inputWidth = $input.width();
            var inputWidthChange = inputTextWidth - inputWidth;
            var expectedTitleWidth;
            // because the final input width is variable we need to figure out
            // how much it's going to change and what the expected title width is
            if (widthChange > 0) {
                var extraSpace = $thead.width() - titleWidth - 2;
                expectedTitleWidth = titleWidth -
                                     Math.max(0, (widthChange - extraSpace));
            } else {
                expectedTitleWidth = titleWidth +
                                     Math.min(inputWidthChange, -widthChange);
            }

            titleWidth = expectedTitleWidth;
            var tableWidth = oldWidth - widthChange - 5;
            var center;
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
            $tableTitle.animate({left: center}, speed, "linear", function() {
                $thead.find('.dropdownBox').removeClass('dropdownBoxHidden');
                TblFunc.moveTableDropdownBoxes();
                // for tableScrollBar
                TblFunc.moveFirstColumn();
            });
        }
    };

    TblFunc.focusTable = function(tableId, focusDag) {
        if (WSManager.getWSFromTable(tableId) !== WSManager.getActiveWS()) {
            if ((SQL.isRedo() || SQL.isUndo()) && SQL.viewLastAction() !== "Join") {
                var wsToFocus = WSManager.getWSFromTable(tableId);
                var activeWS = WSManager.getActiveWS();
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
        // var alreadyFocused = gActiveTableId === tableId;
        var wsNum = WSManager.getActiveWS();
        $('.xcTableWrap.worksheet-' + wsNum).find('.tableTitle')
                                            .removeClass('tblTitleSelected');
        var $xcTheadWrap = $('#xcTheadWrap-' + tableId);
        $xcTheadWrap.find('.tableTitle').addClass('tblTitleSelected');
        // unhighlight any selected columns from all other tables
        $('.xcTable:not(#xcTable-' + tableId + ')').find('.selectedCell')
                                                   .removeClass('selectedCell');
        gActiveTableId = tableId;
        RowScroller.update(tableId);

        if (gTables[tableId].resultSetCount === 0) {
            $('#rowInput').val(0).data('val', 0);
        } else {
            RowScroller.genFirstVisibleRowNum();
        }
        if (focusDag) {
            var tableFocused = true;
            Dag.focusDagForActiveTable(null, tableFocused);
        } else {
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        }
        $('.dagWrap').addClass('notSelected').removeClass('selected');
        $('#dagWrap-' + tableId).addClass('selected').removeClass('notSelected');

        Tips.refresh();
    };

    TblFunc.isTableScrollable = function(tableId) {
        var $firstRow = $('#xcTable-' + tableId).find('tbody tr:first');
        var topRowNum = xcHelper.parseRowNum($firstRow);
        var tHeadHeight = $('#xcTheadWrap-' + tableId).height();
        var tBodyHeight = $('#xcTable-' + tableId).height();
        var tableWrapHeight = $('#xcTableWrap-' + tableId).height();
        if ((tHeadHeight + tBodyHeight) >= (tableWrapHeight)) {
            return (true);
        }
        if (topRowNum === 0 &&
            gTables[tableId].currentRowNumber === gTables[tableId].resultSetMax) {
            return (false);
        } else {
            return (true);
        }
    };

    TblFunc.checkTableDraggable = function() {
        // disallow dragging if only 1 table in worksheet
        var activeWS = WSManager.getActiveWS();
        var $tables = $('#mainFrame').find('.xcTableWrap.worksheet-' +
                                            activeWS);
        if ($tables.length === 1) {
            $tables.addClass('noDrag');
        } else {
            $tables.removeClass('noDrag');
        }
    };

    TblFunc.moveFirstColumn = function($targetTable, noScrollBar) {
        var rightOffset;
        var datasetPreview;
        var mainMenuOffset;
        var windowWidth;
        var $rightTable;
        var moveScrollBar = !noScrollBar;
        var $allTables = $('.xcTableWrap:not(".inActive")');
        if (isBrowserMicrosoft || isBrowserSafari) {
            return;
        }

        if (!$targetTable) {
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
                    return false;
                }
            });

        } else {
            datasetPreview = true;
            mainMenuOffset = 0;
        }

        if ($targetTable && $targetTable.length > 0) {
            var $idCol =  $targetTable.find('.idSpan');
            var cellWidth = $idCol.outerWidth();
            var scrollLeft;

            if (datasetPreview) {
                scrollLeft = -($targetTable.offset().left -
                                  $('#dsTableContainer').offset().left);
            } else {
                scrollLeft = mainMenuOffset - $targetTable.offset().left;
            }

            var rightDiff = rightOffset - (cellWidth + 5);

            if (rightDiff < mainMenuOffset) {
                scrollLeft += rightDiff - mainMenuOffset;
            }
            scrollLeft = Math.min($targetTable.width() - (cellWidth + 15), scrollLeft);

            scrollLeft = Math.max(0, scrollLeft);
            $idCol.css('left', scrollLeft);
            $targetTable.find('th.rowNumHead > div').css('left', scrollLeft);
            if (!datasetPreview) {
                var adjustNext = true;
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

        if (moveScrollBar) {
            if (!$rightTable || !$rightTable.length) {
                $rightTable = $allTables.last();
                if (!$rightTable.length) {
                    return;
                }
            }

            rightOffset = $rightTable[0].getBoundingClientRect().right;
            var right = Math.max(5, rightOffset - windowWidth);
            $rightTable.find(".tableScrollBar").css("right", right);

            var adjustNext = true;
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

    };

    //options:
    // moveHtml: boolean, if true we replace html (for undo/redo or
    // through table menu)
    TblFunc.reorderAfterTableDrop = function(tableId, srcIndex,desIndex, options) {
        WSManager.reorderTable(tableId, srcIndex, desIndex);
        options = options || {};
        var moveHtml = options.moveHtml;

        var newIndex = WSManager.getTablePosition(tableId);

        var $dagWrap = $('#dagWrap-' + tableId);
        var $dagWraps = $('.dagWrap:not(.tableToRemove)');
        var $tableWrap;
        var $tableWraps;
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

        if (moveHtml) {
            xcHelper.centerFocusedTable(tableId);
            TblManager.alignTableEls($tableWrap);
        }

        SQL.add(SQLTStr.ReorderTable, {
            "operation": "reorderTable",
            "tableId": tableId,
            "tableName": gTables[tableId].tableName,
            "srcIndex": srcIndex,
            "desIndex": desIndex
        });
    };

    // set display none on tables that are not currently in the viewport but are
    // active. Tables will maintain their widths;
    TblFunc.hideOffScreenTables = function(options) {
        options = options || {};
        var leftLimit = -options.marginLeft || 0;
        var marginRight = options.marginRight || 0;
        var $tableWraps = $('.xcTableWrap:not(.inActive)');
        var mainFrameRect = $('#mainFrame')[0].getBoundingClientRect();
        var viewWidth =  mainFrameRect.right + marginRight;
        leftLimit += mainFrameRect.left;

        $tableWraps.each(function() {
            var $table = $(this);
            var $thead = $table.find('.xcTheadWrap');
            if (!$thead.length) {
                return null;
            }

            var rect = $thead[0].getBoundingClientRect();
            if (rect.right > leftLimit) {
                if (rect.left < viewWidth) {
                    $table.addClass('inViewPort');
                } else {
                    return false;
                }
            }
        });

        $tableWraps.not('.inViewPort').each(function() {
            var $table = $(this);
            $table.width($table.width()).addClass('hollowed');
        });
    };

    TblFunc.unhideOffScreenTables = function() {
        var mainFrameScroll;
        var cachedMouseStatus = gMouseStatus;
        if (!window.isBrowserChrome) {
            // to reset scrollposition in case it gets changed
            mainFrameScroll = $('#mainFrame').scrollLeft();
            gMouseStatus = "movingTable";
        }
        var $tableWraps = $('.xcTableWrap:not(.inActive)');
        $tableWraps.width('auto');
        $tableWraps.removeClass('inViewPort hollowed');
         //vertically align any locked table icons
        var mainFrameHeight = $('#mainFrame').height();
        $('.tableLocked:visible').each(function() {
            var $tableWrap = $(this);
            var tbodyHeight = $tableWrap.find('tbody').height() + 1;
            var tableWrapHeight = $tableWrap.find('.xcTbodyWrap').height();
            var $lockedIcon = $tableWrap.find('.lockedTableIcon');
            var iconHeight = $lockedIcon.height();
            var topPos = 50 * ((tableWrapHeight - (iconHeight / 2)) /
                                mainFrameHeight);
            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');
            $tableWrap.find('.tableCover').height(tbodyHeight);
        });
        if (!window.isBrowserChrome) {
            // to reset scrollposition in case it gets changed
            $('#mainFrame').scrollLeft(mainFrameScroll);
            // firefox and IE will trigger a delayed scroll
            setTimeout(function() {
                gMouseStatus = cachedMouseStatus;
            }, 0);
        }
    };

    return (TblFunc);
}({}, jQuery));
