function getTextWidth($el, val, options) {
    var width;
    var text;
    options = options || {};
    var defaultStyle;
    if (options.defaultHeaderStyle) {
        defaultStyle = { // styling we use for column header
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize"  : "13px",
            "fontWeight": "600",
            "padding"   : 48
        };
    } else {
        defaultStyle = {padding: 0};
    }
    if (val === undefined) {
        if ($el.is('input')) {
            text = $.trim($el.val() + " ");
        } else {
            if ($el.hasClass('truncated')) {
                $el = $el.find('.displayedData');
            }
            text = $.trim($el.text());
        }
    } else {
        text = val;
    }

    // XXX why this part need escape?
    text = xcHelper.escapeHTMlSepcialChar(text);

    tempDiv = $('<div>' + text + '</div>');
    tempDiv.css({
        'font-family': defaultStyle.fontFamily || $el.css('font-family'),
        'font-size'  : defaultStyle.fontSize || $el.css('font-size'),
        'font-weight': defaultStyle.fontWeight || $el.css('font-weight'),
        'position'   : 'absolute',
        'display'    : 'inline-block',
        'white-space': 'nowrap'
    }).appendTo($('body'));

    width = tempDiv.width() + defaultStyle.padding;
    tempDiv.remove();
    return (width);
}

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
                double click
*/
function autosizeCol($th, options) {
    options = options || {};

    var index = xcHelper.parseColNum($th);
    var $table = $th.closest('.dataTable');
    var tableId = xcHelper.parseTableId($table);
    var table = gTables[tableId];

    var includeHeader = options.includeHeader || false;
    var fitAll = options.fitAll || false;
    var minWidth = options.minWidth || (gRescol.cellMinWidth - 5);
    var maxWidth = options.maxWidth || 700;
    var datastore = options.datastore || false;

    var widestTdWidth = getWidestTdWidth($th, {
        "includeHeader": includeHeader,
        "fitAll"       : fitAll,
        "datastore"    : datastore
    });
    var newWidth = Math.max(widestTdWidth, minWidth);
    // dblClick is autoSized to a fixed width
    if (!options.dblClick) {
        var originalWidth = table.tableCols[index - 1].width;
        if (originalWidth === "auto") {
            originalWidth = 0;
        }
        newWidth = Math.max(newWidth, originalWidth);
    }

    if (!options.unlimitedWidth) {
        newWidth = Math.min(newWidth, maxWidth);
    }

    $th.outerWidth(newWidth);
    if ($table.attr('id').indexOf('xc') > -1) {
        table.tableCols[index - 1].width = newWidth;
    } else if ($table.attr('id') === 'dsTable') {
        $("#dsTableWrap").width($('#dsTable').width());
    }
    if (!options.multipleCols) {
        matchHeaderSizes($table);
    }
    return (newWidth);
}

function getWidestTdWidth(el, options) {
    options = options || {};

    var includeHeader = options.includeHeader || false;
    var fitAll = options.fitAll || false;
    var id = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 10;
    var largestTd = $table.find('tbody tr:first td:eq(' + id + ')');
    var headerWidth = 0;

    if (fitAll || includeHeader) {
        var $th;
        if ($table.find('.col' + id + ' .dataCol').length === 1) {
            $th = $table.find('.col' + id + ' .dataCol');
        } else {
            $th = $table.find('.col' + id + ' .editableHead');
        }
        var extraPadding = 48;
        if (options.datastore) {
            extraPadding += 4;
        }
        headerWidth = getTextWidth($th) + extraPadding;

        if (!fitAll) {
            return (headerWidth);
        }
    }

    $table.find('tbody tr').each(function() {
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var $td = $(this).children(':eq(' + (id) + ')');
        textLength = $.trim($td.find('.displayedData').text()).length;

        if (textLength > longestText) {
            longestText = textLength;
            largestTd = $td;
        }
    });

    largestWidth = getTextWidth(largestTd) + padding;

    if (fitAll) {
        largestWidth = Math.max(headerWidth, largestWidth);
    }

    return (largestWidth);
}

function dblClickResize($el, options) {
    // $el is the colGrab div inside the header
    gRescol.clicks++;  //count clicks
    if (gRescol.clicks === 1) {
        gRescol.timer = setTimeout(function() {
            gRescol.clicks = 0; //after action performed, reset counter
        }, gRescol.delay);
    } else {
        // XX part of this can be moved to TblManager.resizeColumns
        $('#resizeCursor').remove();
        $('body').removeClass('tooltipOff');
        $el.tooltip('destroy');
        gMouseStatus = null;
        $(document).off('mousemove.onColResize');
        $(document).off('mouseup.endColResize');
        unhideOffScreenTables();
        xcHelper.reenableTextSelection();
        $('.xcTheadWrap').find('.dropdownBox').show();
        $('#col-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter

        options = options || {};
        var target = options.target;
        var tableId;

        var $th = $el.parent().parent();
        var $table = $th.closest('.dataTable');
        $table.removeClass('resizingCol');

        // check if unhiding
        if (target !== "datastore" && $th.outerWidth() === 15) {
            tableId = $table.data('id');
            var index = xcHelper.parseColNum($th);
            $th.addClass('userHidden');
            $table.find('td.col' + index).addClass('userHidden');
            gTables[tableId].tableCols[index - 1].isHidden = true;
            ColManager.unhideCols([index], tableId, true);
            return;
        }

        var oldColumnWidths = [];
        var newColumnWidths = [];
        var oldWidthStates = [];
        var newWidthStates = [];

        $table.find('.colGrab')
              .removeAttr('data-toggle data-original-title title');

        var $selectedCols;
        if (target === "datastore") {
            $selectedCols = $table.find('th.selectedCol');
        } else {
            $selectedCols = $table.find('th.selectedCell');
        }
        var numSelectedCols = $selectedCols.length;
        if (numSelectedCols === 0) {
            $selectedCols = $th;
            numSelectedCols = 1;
        }
        var indices = [];
        var colNums = [];
        $selectedCols.each(function() {
            indices.push($(this).index() - 1);
            colNums.push($(this).index());
        });

        var includeHeader = false;

        if (target === "datastore") {
            $selectedCols.find('.colGrab').each(function() {
                if ($(this).data('sizetoheader')) {
                    includeHeader = true;
                    return false;
                }
            });

            $selectedCols.find('.colGrab').each(function() {
                $(this).data('sizetoheader', !includeHeader);
            });

        } else {
            tableId = $table.data('id');
            var columns = gTables[tableId].tableCols;
            var i;
            for (i = 0; i < numSelectedCols; i++) {
                if (columns[indices[i]].sizeToHeader) {
                    includeHeader = true;
                    break;
                }
            }
            for (i = 0; i < numSelectedCols; i++) {
                oldWidthStates.push(columns[indices[i]].sizeToHeader);
                columns[indices[i]].sizeToHeader = !includeHeader;
                newWidthStates.push(!includeHeader);
                oldColumnWidths.push(columns[indices[i]].width);
            }
        }

        var minWidth;
        if (options.minWidth) {
            minWidth = options.minWidth;
        } else {
            minWidth = 17;
        }

        $selectedCols.each(function() {
            newColumnWidths.push(autosizeCol($(this), {
                "dblClick"      : true,
                "minWidth"      : minWidth,
                "unlimitedWidth": true,
                "includeHeader" : includeHeader,
                "datastore"     : target === "datastore"
            }));
        });

        if (target !== "datastore") {
            var table = gTables[tableId];
            var resizeTo;
            if (includeHeader) {
                resizeTo = "sizeToHeader";
            } else {
                resizeTo = "sizeToContents";
            }

            SQL.add("Resize Columns", {
                "operation"      : SQLOps.ResizeTableCols,
                "tableName"      : table.tableName,
                "tableId"        : tableId,
                "resizeTo"       : resizeTo,
                "columnNums"     : colNums,
                "oldColumnWidths": oldColumnWidths,
                "newColumnWidths": newColumnWidths,
                "oldWidthStates" : oldWidthStates,
                "newWidthStates" : newWidthStates,
                "htmlExclude"    : ["columnNums", "oldColumnWidths",
                                    "newColumnWidths","oldWidthStates",
                                    "newWidthStates"]
            });
        }
    }
}

function updateTableHeader(tableId, $tHead) {
    var fullTableName = "";
    var cols = 0;

    // for blur and focus on table header
    if (tableId == null) {
        cols = $tHead.data("cols");
        fullTableName = $tHead.data("title");
    } else {
        // for update table header
        $tHead = $("#xcTheadWrap-" + tableId).find(".tableTitle .text");
        var table = gTables[tableId];

        if (table != null) {
            fullTableName = table.tableName;
            cols = table.tableCols.length - 1; // skip DATA col
        }
        $tHead.data("cols", cols);
        $tHead.data("title", fullTableName);
    }

    fullTableName = fullTableName.split("#");

    var tableName = fullTableName[0];

    if (fullTableName.length === 2) {
        tableName =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off" spellcheck="false">' +
            '<span class="hashName">#' +
                fullTableName[1] +
            '</span>';
    }

    var colsHTML = '<span class="colNumBracket" ' +
                    'data-toggle="tooltip" ' +
                    'data-placement="top" ' +
                    'data-container="body" ' +
                    'title="' + CommonTxtTstr.NumCol + '">' +
                    ' [' + cols + ']</span>';

    $tHead.html(tableName + colsHTML);
    var $tableName = $tHead.find('.tableName');
    var width = getTextWidth($tableName, $tableName.val());
    $tableName.width(width + 1);
}

function matchHeaderSizes($table) {
    // concurrent build table may make some $table be []
    if ($table.length === 0) {
        return;
    }

    var tableWidth = $table.width();

    moveTableDropdownBoxes();
    moveTableTitles();
    $table.find('.rowGrab').width(tableWidth);
    $table.siblings('.rowGrab').width(tableWidth);
}

function highlightCell($td, tableId, rowNum, colNum, isShift, options) {
    // draws a new div positioned where the cell is, intead of highlighting
    // the actual cell
    options = options || {};
    if (options.jsonModal && $td.find('.jsonModalHighlightBox').length !== 0) {
        $td.find('.jsonModalHighlightBox').data().count++;
        return;
    }

    var border = 5;
    var width = $td.outerWidth() - border;
    var height = $td.outerHeight();
    var left = $td.position().left;
    var top = $td.position().top;
    var styling = 'width:' + width + 'px;' +
                  'height:' + height + 'px;' +
                  'left:' + left + 'px;' +
                  'top:' + top + 'px;';
    var divClass;
    if (options.jsonModal) {
        divClass = "jsonModalHighlightBox";
    } else {
        divClass = "highlightBox " + tableId;
    }

    if (isShift) {
        divClass += " shiftKey";
    } else {
        // this can be used as a base cell when user press shift
        // to select multi rows
        divClass += " noShiftKey";
    }

    var $highlightBox = $('<div class="' + divClass + '" ' +
                            'style="' + styling + '" data-count="1">' +
                        '</div>');

    $highlightBox.data("rowNum", rowNum)
                 .data("colNum", colNum);

    $td.append($highlightBox);
}

function unHighlightCell($td) {
    $td.find(".highlightBox").remove();
}

/* START GENERAL MENU FUNCTIONS */

// adds default menu behaviors to menus passed in as arguments
// behaviors include highlighting lis on hover, opening submenus on hover
function addMenuBehaviors($mainMenu) {
    var $subMenu;
    var $allMenus = $mainMenu;
    var subMenuId = $mainMenu.data('submenu');
    var hideTimeout;
    var showTimeout;
    var subListScroller;

    if (subMenuId) {
        $subMenu = $('#' + subMenuId);
        $allMenus = $allMenus.add($subMenu);
        subListScroller = new MenuHelper($subMenu, {
            "scrollerOnly" : true,
            "bottomPadding": 4
        });

        $subMenu.on('mousedown', '.subMenuArea', function(event) {
            if (event.which !== 1) {
                return;
            }
            closeMenu($allMenus);
        });

        $subMenu.on('mouseenter', '.subMenuArea', function() {
            var className = $(this).siblings(':visible').attr('class');
            $mainMenu.find('.' + className).addClass('selected');
            clearTimeout(hideTimeout);
        });

        // prevents input from closing unless you hover over a different li
        // on the main column menu
        // $subMenu.find('input').on({
        $subMenu.on({
            "focus": function() {
                $(this).parents('li').addClass('inputSelected')
                       .parents('.subMenu').addClass('inputSelected');
            },
            "blur": function() {
                $(this).parents('li').removeClass('inputSelected')
                       .parents('.subMenu').removeClass('inputSelected');
            },
            "keyup": function() {
                if ($subMenu.find('li.selected').length) {
                    return;
                }
                var $input = $(this);
                $input.parents('li').addClass('inputSelected')
                .parents('.subMenu').addClass('inputSelected');

            }
        }, 'input');

        $subMenu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            event.stopPropagation();

            if (!$li.hasClass('unavailable') &&
                $li.closest('input').length === 0 &&
                $li.closest('.clickable').length === 0) {
                // hide li if doesnt have an input field
                closeMenu($allMenus);
                clearTimeout(showTimeout);
            }
        });

        $subMenu.on({
            "mouseenter": function() {
                if ($(this).closest('.dropDownList').length) {
                    return;
                }
                $subMenu.find('li').removeClass('selected');

                var $li = $(this);
                var className = $li.parent().attr('class');
                $mainMenu.find('.' + className).addClass('selected');
                $li.addClass('selected');

                if (!$li.hasClass('inputSelected')) {
                    $subMenu.find('.inputSelected').removeClass('inputSelected');
                }
                clearTimeout(hideTimeout);
            },
            "mouseleave": function() {
                $subMenu.find('li').removeClass('selected');
                var $li = $(this);
                $li.find('.dropDownList').removeClass("open")
                    .find('.list').hide();
                // $li.removeClass('selected');
                $('.tooltip').remove();
            }
        }, "li");
    }

    $mainMenu.on('mouseup', 'li', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $li = $(this);
        if ($li.hasClass('parentMenu')) {
            return;
        }
        event.stopPropagation();

        if (!$li.hasClass('unavailable')) {
            // hide li if doesnt have a submenu or an input field
            closeMenu($allMenus);
            clearTimeout(showTimeout);
        }
    });

    $mainMenu.on({
        "mouseenter": function(event) {
            if ($mainMenu.hasClass('disableMouseEnter')) {
                $mainMenu.removeClass('disableMouseEnter');
                return;
            }
            var $li = $(this);
            $mainMenu.find('.selected').removeClass('selected');
            $mainMenu.addClass('hovering');
            $li.addClass('selected');
            var hasSubMenu = $li.hasClass('parentMenu');

            if (!hasSubMenu || $li.hasClass('unavailable')) {
                if ($subMenu) {
                    if (event.keyTriggered) {
                        $subMenu.hide();
                    } else {
                        clearTimeout(hideTimeout);
                        hideTimeout = setTimeout(function() {
                            $subMenu.hide();
                        }, 150);
                    }
                }
                return;
            }

            clearTimeout(hideTimeout);
            var subMenuClass = $li.data('submenu');
            if (event.keyTriggered) { // mouseenter triggered by keypress
                showSubMenu($li, subMenuClass);
            } else {
                showTimeout = setTimeout(function() {
                    showSubMenu($li, subMenuClass);
                }, 150);
            }

        },
        "mouseleave": function() {
            if ($mainMenu.hasClass('disableMouseEnter')) {
                return;
            }
            $mainMenu.removeClass('hovering');
            $mainMenu.find('.selected').removeClass('selected');
            var $li = $(this);
            $li.children('ul').removeClass('visible');
            $('.tooltip').remove();
        }
    }, "li");

    function showSubMenu($li, subMenuClass) {
        if ($li.hasClass('selected')) {
            $subMenu.show();
            var $targetSubMenu = $subMenu.find('.' + subMenuClass);
            var visible = false;
            if ($targetSubMenu.is(':visible')) {
                visible = true;
            }
            $subMenu.children('ul').hide().css('max-height', 'none');
            $subMenu.find('li').removeClass('selected');
            $subMenu.css('max-height', 'none');
            $targetSubMenu.show();

            if (!visible) {
                StatusBox.forceHide();
            }
            var top = $li.offset().top + 30;
            var left = $li.offset().left + 155;
            var shiftedLeft = false;

            // move submenu to left if overflowing to the right
            var viewportRight = $(window).width() - 5;
            if (left + $subMenu.width() > viewportRight) {
                $subMenu.addClass('left');
                shiftedLeft = true;
                top -= 29;
            } else {
                $subMenu.removeClass('left');
            }

            // move submenu up if overflowing to the bottom
            var viewportBottom = $(window).height();
            if (top + $subMenu.height() > viewportBottom) {
                top -= $subMenu.height();
                if (shiftedLeft) {
                    top += 29;
                }
            }
            top = Math.max(2, top);

            $subMenu.css({left: left, top: top});
            $subMenu.find('.scrollArea').hide();
            subListScroller.showOrHideScrollers($targetSubMenu);
        }
    }

    if ($mainMenu.find('.scrollArea').length !== 0) {
        new MenuHelper($mainMenu, {
            $subMenu    : $subMenu,
            scrollerOnly: true
        });
    }
}

function addMenuKeyboardNavigation($menu, $subMenu) {
    $('body').addClass('noSelection');
    $(document).on('keydown.menuNavigation', function(event) {
        listHighlight(event);
    });
    var $lis = $menu.find('li:visible:not(.unavailable)');
    var numLis = $lis.length;

    function listHighlight(event) {
        var keyCodeNum = event.which;
        var direction;
        var lateral = false;
        var enter;

        switch (keyCodeNum) {
            case (keyCode.Up):
                direction = -1;
                break;
            case (keyCode.Down):
                direction = 1;
                break;
            case (keyCode.Left):
                if ($(event.target).is('input')) {
                    if ($(event.target).attr('type') === "number") {
                        return;
                    }
                    if ($(event.target)[0].selectionStart !== 0) {
                        return;
                    }
                }
                lateral = true;
                break;
            case (keyCode.Right):
                if ($(event.target).is('input')) {
                    return;
                }
                lateral = true;
                break;
            case (keyCode.Enter):
                enter = true;
                break;
            case (keyCode.Escape):
            case (keyCode.Backspace):
                if ($(event.target).is('input')) {
                    return;
                }
                event.preventDefault();
                closeMenu($menu.add($subMenu));
                return;
            default:
                return; // key not supported
        }

        if (!enter) {
            event.preventDefault();
        }

        var $highlightedLi = $lis.filter(function() {
            return ($(this).hasClass('selected'));
        });

        var $highlightedSubLi = "";
        var $subLis;
        var numSubLis;
        if ($subMenu) {
            $subLis = $subMenu.find('li:visible');
            numSubLis = $subLis.length;
            $highlightedSubLi = $subLis.filter('.selected');
        }

        if (enter) {
            if ($highlightedSubLi.length === 1) {
                if (!$highlightedSubLi.hasClass('unavailable')) {
                    $highlightedSubLi.trigger(fakeEvent.mouseup);
                }
                return;
            } else if ($highlightedSubLi.length === 0 &&
                        $highlightedLi.length === 1) {
                if (!$highlightedLi.hasClass('unavailable')) {
                    if ($highlightedLi.hasClass('parentMenu')) {
                        // if li has submenu, treat enter key as a
                        // right keypress
                        lateral = true;
                        keyCodeNum = keyCode.Right;
                    } else {
                        $highlightedLi.trigger(fakeEvent.mouseup);
                        return;
                    }
                } else {
                    return;
                }
            }
        }

        if (!lateral) {
            var index;
            var newIndex;
            if ($subMenu && $subMenu.is(':visible')) {
                // navigate vertically through sub menu if it's open
                if ($highlightedSubLi.length) {
                    if ($highlightedSubLi.hasClass('inputSelected')) {
                        // we don't want navigation if an input has focus
                        return;
                    }
                    index = $subLis.index($highlightedSubLi);
                    $highlightedSubLi.removeClass('selected');
                    newIndex = (index + direction + numSubLis) % numSubLis;
                    $highlightedSubLi = $subLis.eq(newIndex);
                } else {
                    index = (direction === -1) ? (numSubLis - 1) : 0;
                    $highlightedSubLi = $subLis.eq(index);
                }
                $highlightedSubLi.addClass('selected');
            } else {
                // navigate vertically through main menu
                if ($highlightedLi.length) {// When a li is highlighted
                    index = $lis.index($highlightedLi);
                    $highlightedLi.removeClass('selected');
                    newIndex = (index + direction + numLis) % numLis;
                    $highlightedLi = $lis.eq(newIndex);
                } else {
                    index = (direction === -1) ? (numLis - 1) : 0;
                    $highlightedLi = $lis.eq(index);
                }
                $highlightedLi.addClass('selected');

                // adjust scroll position if newly highlighted li is not visible
                var menuHeight = $menu.height();
                var liTop = $highlightedLi.position().top;
                var liHeight = 30;
                var currentScrollTop;

                if (liTop > menuHeight - liHeight) {
                    currentScrollTop = $menu.find('ul').scrollTop();
                    var newScrollTop = liTop - menuHeight + liHeight +
                                       currentScrollTop;
                    $menu.find('ul').scrollTop(newScrollTop);
                    if ($menu.hasClass('hovering')) {
                        $menu.addClass('disableMouseEnter');
                    }
                } else if (liTop < 0) {
                    currentScrollTop = $menu.find('ul').scrollTop();
                    $menu.find('ul').scrollTop(currentScrollTop + liTop);
                    if ($menu.hasClass('hovering')) {
                        $menu.addClass('disableMouseEnter');
                    }
                }
            }
        } else if (lateral) { // left or right key is pressed
            if (!$subMenu) { // if no submenu, do nothing
                return;
            }
            if ($highlightedLi.length &&
                $highlightedLi.hasClass('parentMenu')) {
                var e;
                // if mainmenu li is highlighted and has a submenu
                if (keyCodeNum === keyCode.Right) {
                    if ($subMenu.is(':visible')) {
                        if (!$highlightedSubLi.length) {
                            // select first sub menu li if sub menu is open
                            // but no sub menu li is highlighted
                            e = $.Event('mouseenter');
                            e.keyTriggered = true;
                            $highlightedLi.trigger(e);
                            var $subLis = $subMenu.find('li:visible');
                            $subLis.eq(0).mouseover();
                            if ($subLis.find('input').length > 0) {
                                $subLis.find('input').eq(0).focus();
                            }
                        } else {
                            // close menus if sub menu li is already highlighted
                            closeMenu($menu.add($subMenu));
                        }
                    } else {
                        // open submenu and highlight first li
                        e = $.Event('mouseenter');
                        e.keyTriggered = true;
                        $highlightedLi.trigger(e);
                        $subLis = $subMenu.find('li:visible');
                        $subLis.eq(0).mouseover();
                        if ($subLis.find('input').length > 0) {
                            $subLis.find('input').eq(0).focus();
                        }
                    }
                } else { // left key is pressed
                    if ($subMenu.is(':visible')) { // if submenu open, hide it
                        $subMenu.hide();
                    } else { // if no submenu is open, close all menus
                        closeMenu($menu);
                    }
                }
            } else {
                closeMenu($menu.add($subMenu));
            }
        }
    }
}

function removeMenuKeyboardNavigation() {
    $(document).off('keydown.menuNavigation');
    $('body').removeClass('noSelection');
}

function closeMenu($menu) {
    $menu.hide();
    removeMenuKeyboardNavigation();
}

function resetColMenuInputs($el) {
    var tableId = xcHelper.parseTableId($el.closest('.xcTableWrap'));
    var $menu = $('#colMenu-' + tableId);
    $menu.find('.gb input').val("groupBy");
    $menu.find('.numFilter input').val(0);
    $menu.find('.strFilter input').val("");
    $menu.find('.mixedFilter input').val("");
    $menu.find('.regex').next().find('input').val("*");
}

/* END GENERAL MENU FUNCTIONS */

function highlightColumn($el, keepOthersSelected) {
    var index   = xcHelper.parseColNum($el);
    var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
    var $table  = $('#xcTable-' + tableId);
    if (!keepOthersSelected) {
        $('.selectedCell').removeClass('selectedCell');
    }
    $table.find('th.col' + index).addClass('selectedCell');
    $table.find('td.col' + index).addClass('selectedCell');
}

function unhighlightColumn($el) {
    var index    = xcHelper.parseColNum($el);
    var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
    var $table = $('#xcTable-' + tableId);
    $table.find('th.col' + index).removeClass('selectedCell');
    $table.find('td.col' + index).removeClass('selectedCell');
}

function moveTableDropdownBoxes() {
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
}

// options used to animate table titles when main menu opening or closing
function moveTableTitles($tableWraps, options) {
    if (isBrowserMicrosoft) {
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

        if (rectRight > mainFrameOffsetLeft) {
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
                        moveTableDropdownBoxes();
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
}

function moveTableTitlesAnimated(tableId, oldWidth, widthChange, speed) {
    if (isBrowserMicrosoft) {
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
        var inputTextWidth = getTextWidth($input, $input.val()) + 1;
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
            moveTableDropdownBoxes();
        });
    }
}

function focusTable(tableId, focusDag) {
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
        RowScroller.updateViewRange(tableId);
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
}

function checkTableDraggable() {
    // disallow dragging if only 1 table in worksheet
    var activeWS = WSManager.getActiveWS();
    var $tables = $('#mainFrame').find('.xcTableWrap.worksheet-' + activeWS);
    if ($tables.length === 1) {
        $tables.addClass('noDrag');
    } else {
        $tables.removeClass('noDrag');
    }
}

function isTableScrollable(tableId) {
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
}

function bookmarkRow(rowNum, tableId) {
    //XXX allow user to select color in future?
    var $table = $('#xcTable-' + tableId);
    var td = $table.find('.row' + rowNum + ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('data-original-title', TooltipTStr.Bookmarked);
    td.find('.idSpan').attr('title', '');
    $('.tooltip').hide();
    RowScroller.addBookMark(rowNum, tableId);
    var table = gTables[tableId];
    if (table.bookmarks.indexOf(rowNum) < 0) {
        table.bookmarks.push(rowNum);
    }
    SQL.add("Bookmark Row", {
        "operation": SQLOps.BookmarkRow,
        "tableId"  : tableId,
        "tableName": gTables[tableId].tableName,
        "rowNum"   : rowNum
    });
}

function unbookmarkRow(rowNum, tableId) {
    var $table = $('#xcTable-' + tableId);
    var td = $table.find('.row' + rowNum + ' .col0');
    td.removeClass('rowBookmarked');
    td.find('.idSpan').attr('title', '');
    td.find('.idSpan').attr('data-original-title', TooltipTStr.Bookmark);
    $('.tooltip').hide();
    RowScroller.removeBookMark(rowNum, tableId);
    var table = gTables[tableId];
    var index = table.bookmarks.indexOf(rowNum);
    table.bookmarks.splice(index, 1);
    SQL.add("Remove Bookmark", {
        "operation": SQLOps.RemoveBookmark,
        "tableId"  : tableId,
        "tableName": gTables[tableId].tableName,
        "rowNum"   : rowNum
    });
}

function moveFirstColumn($targetTable) {
    var rightOffset;
    var datasetPreview;
    var tableOffsetLeft;
    if (isBrowserMicrosoft) {
        return;
    }

    if (!$targetTable) {
        datasetPreview = false;
        tableOffsetLeft = MainMenu.getOffset();
        
        $('.xcTableWrap:not(".inActive")').each(function() {
            rightOffset = $(this)[0].getBoundingClientRect().right;
            if (rightOffset > tableOffsetLeft) {
                $targetTable = $(this);
                return false;
            }
        });
        
    } else {
        datasetPreview = true;
        tableOffsetLeft = 0;
    }

    if ($targetTable && $targetTable.length > 0) {
        var $idCol =  $targetTable.find('.idSpan');
        var cellWidth = $idCol.width();
        var scrollLeft;

        if (datasetPreview) {
            scrollLeft = -($targetTable.offset().left -
                              $('#dsTableContainer').offset().left);
        } else {
            scrollLeft = -$targetTable.offset().left + tableOffsetLeft;
        }

        var rightDiff = rightOffset - (cellWidth + 15);

        if (rightDiff < tableOffsetLeft) {
            scrollLeft += rightDiff - tableOffsetLeft;
        }

        scrollLeft = Math.max(0, scrollLeft);
        $idCol.css('left', scrollLeft);
        $targetTable.find('th.rowNumHead > div').css('left', scrollLeft);
        if (!datasetPreview) {
            var adjustNext = true;
            while (adjustNext) {
                $targetTable = $targetTable.next();
                if ($targetTable.length === 0) {
                    return;
                }
                rightOffset = $targetTable[0].getBoundingClientRect().right;
                if (rightOffset > $(window).width()) {
                    adjustNext = false;
                }
                $targetTable.find('.idSpan').css('left', 0);
                $targetTable.find('th.rowNumHead > div').css('left', 0);
            }
        }
    }
}

function showWaitCursor() {
    var waitCursor = '<style id="waitCursor" type="text/css">' +
                        '*{cursor: progress !important;}' +
                    '</style>';
    $(document.head).append(waitCursor);
}

function removeWaitCursor() {
    $('#waitCursor').remove();
}

//options:
// undoRedo: boolean, if true we replace html (for undo/redo)
function reorderAfterTableDrop(tableId, srcIndex, desIndex, options) {
    WSManager.reorderTable(tableId, srcIndex, desIndex);
    options = options || {};
    var undoRedo = options.undoRedo;

    var newIndex = WSManager.getTablePosition(tableId);

    var $dagWrap = $('#dagWrap-' + tableId);
    var $dagWraps = $('.dagWrap:not(.tableToRemove)');
    var $tableWrap;
    var $tableWraps;
    if (undoRedo) {
        $tableWraps = $('.xcTableWrap:not(.tableToRemove)');
        $tableWrap = $('#xcTableWrap-' + tableId);
    }

    if (newIndex === 0) {
        $('.dagArea').find('.legendArea').after($dagWrap);
        if (undoRedo) {
            $('#mainFrame').prepend($tableWrap);
        }
    } else if (srcIndex < desIndex) {
        $dagWraps.eq(newIndex).after($dagWrap);
        if (undoRedo) {
            $tableWraps.eq(newIndex).after($tableWrap);
        }
    } else if (srcIndex > desIndex) {
        $dagWraps.eq(newIndex).before($dagWrap);
        if (undoRedo) {
            $tableWraps.eq(newIndex).before($tableWrap);
        }
    }

    if (undoRedo) {
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();
    }

    SQL.add("Change Table Order", {
        "operation": "reorderTable",
        "tableId"  : tableId,
        "tableName": gTables[tableId].tableName,
        "srcIndex" : srcIndex,
        "desIndex" : desIndex
    });
}

// set display none on tables that are not currently in the viewport but are
// active. Tables will maintain their widths;
function hideOffScreenTables(options) {
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
}

function unhideOffScreenTables() {
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
}
