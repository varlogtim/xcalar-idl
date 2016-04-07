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
                $el = $el.find('.truncated');
            }
            text = $.trim($el.text());
        }
    } else {
        text = val;
    }
    text = text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");

    tempDiv = $('<div>' + text + '</div>');
    tempDiv.css({
        'font-family': defaultStyle.fontFamily || $el.css('font-family'),
        'font-size'  : defaultStyle.fontSize || $el.css('font-size'),
        'font-weight': defaultStyle.fontWeight || $el.css('font-weight'),
        'position'   : 'absolute',
        'display'    : 'inline-block',
        'white-space': 'pre'
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
    } else if ($table.attr('id') === 'worksheetTable') {
        $("#dataSetTableWrap").width($('#worksheetTable').width());
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
        if ($td.hasClass('truncated')) {
            textLength = $.trim($td.find('.truncated').text()).length;
        } else {
            textLength = $.trim($td.text()).length;
        }

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
        options = options || {};
        var target = options.target;
        var tableId;

        var $th = $el.parent().parent();
        var $table = $th.closest('.dataTable');
        var oldColumnWidths = [];
        var newColumnWidths = [];

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
                columns[indices[i]].sizeToHeader = !includeHeader;
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

        $('#col-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
        $table.removeClass('resizingCol');

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
                "htmlExclude"    : ["columnNums", "oldColumnWidths",
                                    "newColumnWidths"]
            });
        }
    }
}

function createTableHeader(tableId) {
    var $xcTheadWrap = $('<div id="xcTheadWrap-' + tableId +
                         '" class="xcTheadWrap dataTable" ' +
                         '" data-id="' + tableId + '" ' +
                         'style="top:0px;"></div>');

    $('#xcTableWrap-' + tableId).prepend($xcTheadWrap);

    // var tableName = "";
    // build this table title somewhere else
    // var table = gTables[tableId];
    // if (table != null) {
    //     tableName = table.tableName;
    // }
    var tableTitleClass = "";
    if ($('.xcTable:visible').length === 1) {
        tableTitleClass = " tblTitleSelected";
        $('.dagWrap.selected').removeClass('selected').addClass('notSelected');
        $('#dagWrap-' + tableId).removeClass('notSelected')
                                .addClass('selected');
    }

    var html = '<div class="tableTitle ' + tableTitleClass + '">' +
                    '<div class="tableGrab"></div>' +
                    '<div class="labelWrap">' +
                        '<label class="text" ></label>' +
                    '</div>' +
                    '<div class="dropdownBox">' +
                        '<span class="innerBox"></span>' +
                    '</div>' +
                '</div>';

    $xcTheadWrap.prepend(html);

    //  title's Format is tablename  [cols]
    updateTableHeader(tableId);

    // Event Listener for table title
    $xcTheadWrap.on({
        // must use keypress to prevent contenteditable behavior
        "keypress": function(event) {
            if (event.which === keyCode.Enter) {
                event.preventDefault();
                event.stopPropagation();
                renameTableHead($(this));
            }
        },
        "keydown": function(event) {
            if (event.which === keyCode.Space) {
                // XXX temporary do not allow space
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }, ".tableTitle .text");

    $xcTheadWrap.on({
        "focus": function() {
            var val = $(this).val();
            var width = getTextWidth($(this), val);
            $(this).width(width + 1);
            $(this)[0].setSelectionRange(val.length, val.length);
            moveTableTitles();
        },
        "blur": function() {
            updateTableHeader(null, $(this).parent());
            moveTableTitles();
        },
        "input": function() {
            var width = getTextWidth($(this), $(this).val());
            $(this).width(width + 1);
            moveTableTitles($(this).closest('.xcTableWrap'));
        }
    }, ".tableTitle .tableName");

    $xcTheadWrap[0].oncontextmenu = function(e) {
        var $target = $(e.target).closest('.dropdownBox');
        if ($target.length) {
            $target.trigger('click');
            e.preventDefault();
        }
    };

    $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function(event) {
        var classes   = "tableMenu";
        var $dropdown = $(this);
        var $tableWrap = $dropdown.closest('.xcTableWrap');


        if ($tableWrap.hasClass('tableLocked')) {
            classes += " locked";
        }

        if ($tableWrap.hasClass('tableHidden')) {
            classes += " tableHidden";
        }

        var options = {
            "type"   : "tableDropdown",
            "classes": classes
        };

        if (event.rightClick) {
            options.mouseCoors = {"x": event.pageX,
                                  "y": $dropdown.offset().top + 30};
        }

        dropdownClick($dropdown, options);
    });

    // Change from $xcTheadWrap.find('.tableGrab').mosedown...
    $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
        // Not Mouse down
        if (event.which !== 1) {
            return;
        }
        TblAnim.startTableDrag($(this).parent(), event);
    });

    $xcTheadWrap.on('click', '.tableGrab', function(e) {
        var $target = $(this);
        if (!$(this).hasClass('noDropdown')) {
            var click = $.Event("click");
            click.rightClick = true;
            click.pageX = e.pageX;
            $target.siblings('.dropdownBox').trigger(click);
            e.preventDefault();
        }
    });

    $xcTheadWrap[0].oncontextmenu = function(e) {
        var $target = $(e.target).closest('.tableGrab');
        if ($target.length) {
            var click = $.Event("click");
            click.rightClick = true;
            click.pageX = e.pageX;
            $target.siblings('.dropdownBox').trigger(click);
            e.preventDefault();
        }
    };

    var $table = $('#xcTable-' + tableId);
    $table.width(0);
    matchHeaderSizes($table);
}

function renameTableHead($div) {
    var newName = $div.find(".tableName").val().trim();
    var $th = $div.closest('.xcTheadWrap');
    var tableId = xcHelper.parseTableId($th);
    var newTableName = newName + "#" + tableId;
    var oldTableName = gTables[tableId].tableName;

    if (newTableName === oldTableName) {
        $div.blur();
        return;
    }

    var isValid = xcHelper.validate([
        {
            "$selector": $div.find(".tableName"),
            "text"     : ErrTStr.NoSpecialChar,
            "check"    : function() {
                return xcHelper.hasSpecialChar(newName);
            }
        },
        {
            "$selector": $div.find(".tableName"),
            "text"     : ErrTStr.InvalidColName,
            "check"    : function() {
                return (newName.length === 0);
            }
        }
    ]);

    if (!isValid) {
        return;
    }

    // XXX Shall we really check if the name part has conflict?
    xcHelper.checkDuplicateTableName(newName)
    .then(function() {
        return (xcFunction.rename(tableId, newTableName));
    })
    .then(function() {
        $div.blur();
    })
    .fail(function() {
        var text = xcHelper.replaceMsg(ErrWRepTStr.TableConflict, {
            "name": newName
        });
        StatusBox.show(text, $div, false);
    });
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

    if (subMenuId) {
        $subMenu = $('#' + subMenuId);
        $allMenus = $allMenus.add($subMenu);

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
        $subMenu.find('input').on({
            "focus": function() {
                $(this).parents('li').addClass('inputSelected')
                       .parents('.subMenu').addClass('inputSelected');
            },
            "blur": function() {
                $(this).parents('li').removeClass('inputSelected')
                       .parents('.subMenu').removeClass('inputSelected');
            },
            "keyup": function() {
                var $input = $(this);
                $input.parents('li').addClass('inputSelected')
                .parents('.subMenu').addClass('inputSelected');
            }
        });

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
            $subMenu.children('ul').hide();
            $subMenu.find('li').removeClass('selected');
            $targetSubMenu.show();
            if (!visible) {
                StatusBox.forceHide();
            }
            var top = $li.offset().top + 30;
            var left = $li.offset().left + 155;
            var shiftedLeft = false;

            // move submenu to left if overflowing to the right
            var viewportRight;
            var $rightSideBar = $('#rightSideBar');
            if (!$rightSideBar.hasClass('poppedOut')) {
                viewportRight = $rightSideBar.offset().left;
            } else {
                viewportRight = $(window).width();
            }
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

            $subMenu.css({left: left, top: top});
        }
    }

    if ($mainMenu.find('.scrollArea').length !== 0) {
        var listScroller = new xcHelper.dropdownList($mainMenu, {
            $subMenu    : $subMenu,
            scrollerOnly: true
        });
    }
}

function addMenuKeyboardNavigation($menu, $subMenu) {
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
                        var $subLis = $subMenu.find('li:visible');
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
}

function closeMenu($menu) {
    $menu.hide();
    $('body').removeClass('noSelection');
    removeMenuKeyboardNavigation();
}

function dropdownClick($el, options) {
    options = options || {};
    var tableId;

    if (!options.type) {
        console.error("Wrong dropdownClick call");
        return;
    }

    if (options.type !== "tabMenu") {
        tableId = xcHelper.parseTableId($el.closest(".xcTableWrap"));
    }

    var $menu;
    var $subMenu;
    var $allMenus;
    var menuHeight;
    $('.menu .selected').removeClass('selected');
    $('.tooltip').hide();

    if (typeof options.callback === "function") {
        options.callback();
    }

    if (options.type === "tableDropdown") {
        $menu = $('#tableMenu');
        $subMenu = $('#tableSubMenu');
        $allMenus = $menu.add($subMenu);

        // case that should close table menu
        if ($menu.is(":visible") && $menu.data('tableId') === tableId) {
            closeMenu($allMenus);
            return;
        }
        menuHeight = $(window).height() - 116;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        if (options.classes && options.classes.indexOf('locked') !== -1) {
            $menu.find('li:not(.hideTable, .unhideTable)')
                  .addClass('unavailable');
        } else {
            $menu.find('li').removeClass('unavailable');
        }
        if (WSManager.getWSLen() <= 1) {
            $menu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $menu.find(".moveToWorksheet").removeClass("unavailable");
        }
    } else if (options.type === "thDropdown") {
        $menu = $('#colMenu');
        $subMenu = $('#colSubMenu');
        $allMenus = $menu.add($subMenu);
        // case that should close column menu
        if ($menu.is(":visible") && $menu.data("colNum") === options.colNum &&
            $menu.data('tableId') === tableId && !$menu.hasClass('tdMenu')) {
            closeMenu($allMenus);
            return;
        }
        if (options.multipleColNums) {
            $menu.data('columns', options.multipleColNums);
        } else {
            $menu.data('columns', []);
        }
        menuHeight = $(window).height() - 150;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);

        // Use CSS to show the options
    } else if (options.type === "tdDropdown") {
        $menu = $('#cellMenu');
        // case that should close column menu
        if (options.isUnSelect && !options.shiftKey)
        {
            closeMenu($menu);
            return;
        }

        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        var tableCol = gTables[tableId].tableCols[options.colNum - 1];
        var columnType = tableCol.type;
        var shouldNotFilter = options.isMutiCol ||
                            (
                                columnType !== "string" &&
                                columnType !== "float" &&
                                columnType !== "integer" &&
                                columnType !== "boolean"
                            );
        var notAllowed = $el.find('.null, .blank').length;
        var isMultiCell = $("#xcTable-" + tableId).find(".highlightBox").length > 1;

        var $tdFilter  = $menu.find(".tdFilter");
        var $tdExclude = $menu.find(".tdExclude");

        if (shouldNotFilter || notAllowed) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
        }

        if (!options.isMutiCol &&
            (tableCol.format != null || tableCol.decimals > -1))
        {
            // when it's only on one column and column is formatted
            if (isMultiCell) {
                $tdFilter.text('Filter pre-formatted values');
                $tdExclude.text('Exclude pre-formatted values');
            } else {
                $tdFilter.text('Filter pre-formatted value');
                $tdExclude.text('Exclude pre-formatted value');
            }
            options.classes += " long";
        } else {
            if (isMultiCell) {
                $tdFilter.text('Filter these values');
                $tdExclude.text('Exclude these values');
            } else {
                $tdFilter.text('Filter this value');
                $tdExclude.text('Exclude this value');
            }
        }

        if ((columnType === "object" || columnType === "array") && !notAllowed) {
            if ($el.text().trim() === "") {
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else if (isMultiCell) {
                // when more than one cell is selected
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else {
                $menu.find(".tdJsonModal").removeClass("hidden");
                $menu.find(".tdUnnest").removeClass("hidden");
            }
        } else {
            if ($el.hasClass('truncated')) {
                $menu.find(".tdJsonModal").removeClass("hidden");
            } else {
                $menu.find(".tdJsonModal").addClass("hidden");
            }
            $menu.find(".tdUnnest").addClass("hidden");
        }
    } else if (options.type === "tabMenu") {
        $menu = $('#worksheetTabMenu');
    }

    if (options.type !== "tdDropdown") {
        $('.highlightBox').remove();
    }

    $(".menu:visible").hide();
    removeMenuKeyboardNavigation();
    $(".leftColMenu").removeClass("leftColMenu");
    // case that should open the menu (note that colNum = 0 may make it false!)
    if (options.colNum != null && options.colNum > -1) {
        $menu.data("colNum", options.colNum);
        $menu.data("tableId", tableId);

    } else {
        $menu.removeData("colNum");
        $menu.removeData("tableId");
    }
    if (options.type === "tableDropdown") {
        $menu.data("tableId", tableId);
    }

    if (options.rowNum != null && options.rowNum > -1) {
        $menu.data("rowNum", options.rowNum);
    } else {
        $menu.removeData("rowNum");
    }

    if (options.classes != null) {
        var className = options.classes.replace("header", "");
        $menu.attr("class", "menu " + className);
        if ($subMenu) {
            $subMenu.attr("class", "menu subMenu " + className);
        }
    }

    if (options.type === 'thDropdown') {
        $subMenu.find('.sort').removeClass('unavailable');
    }

    //position menu
    var topMargin  = options.type === "tdDropdown" ? 15 : -4;
    var leftMargin = 5;

    var left;
    var top;
    if (options.mouseCoors) {
        left = options.mouseCoors.x - 5;
        top = options.mouseCoors.y + topMargin;
    } else {
        top = $el[0].getBoundingClientRect().bottom + topMargin;
        left = $el[0].getBoundingClientRect().left + leftMargin;
    }

    if (options.offsetX) {
        left += options.offsetX;
    }

    $menu.css({"top": top, "left": left}).show();
    $menu.children('ul').scrollTop(0);

    // size menu and ul
    var $ul = $menu.find('ul');
    if ($ul.length > 0) {
        var ulHeight = $menu.find('ul')[0].scrollHeight;
        if (ulHeight > $menu.height()) {
            $menu.children('ul').css('max-height', menuHeight);
            $menu.find('.scrollArea').show();
            $menu.find('.scrollArea.bottom').addClass('active');
        } else {
            $menu.children('ul').css('max-height', 'auto');
            $menu.find('.scrollArea').hide();
        }
    }
    // set scrollArea states
    $menu.find('.scrollArea.top').addClass('stopped');
    $menu.find('.scrollArea.bottom').removeClass('stopped');


    //positioning if dropdown menu is on the right side of screen
    if (!options.ignoreSideBar) {
        var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
        if ($menu[0].getBoundingClientRect().right > leftBoundary) {
            left = leftBoundary - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }
    }

    //positioning if td menu is below the screen
    if (options.type === "tdDropdown" || options.type === "tabMenu") {
        if (top + $menu.height() + 5 > $(window).height()) {
            top -= ($menu.height() + 20);
            $menu.css('top', top);
        }
    }

    addMenuKeyboardNavigation($menu, $subMenu);

    $('body').addClass('noSelection');
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

    $('.xcTableWrap:not(".inActive")').each(function() {
        if ($(this)[0].getBoundingClientRect().right > 0) {
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

    var rightSideBarWidth = 10;
    var windowWidth = $(window).width();
    if (windowWidth === $('#container').width()) {
        windowWidth -= rightSideBarWidth;
    }
    while (tablesAreVisible) {
        var tableRight = $startingTableHead[0].getBoundingClientRect().right;
        if (tableRight > windowWidth) {
            var position = tableRight - windowWidth - 3;
            $startingTableHead.find('.dropdownBox')
                                .css('right', position + 'px');
            tablesAreVisible = false;
        } else {
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

function moveTableTitles($tableWraps) {
    if (isBrowserMicrosoft) {
        return;
    }

    $tableWraps = $tableWraps ||
                  $('.xcTableWrap:not(.inActive):not(.tableHidden)');
    var viewWidth = $('#mainFrame').width();
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
        if (rect.right > 0) {
            if (rect.left < viewWidth) {
                var $tableTitle = $table.find('.tableTitle .text');
                var titleWidth = $tableTitle.outerWidth();
                var tableWidth = $thead.width();
                var center;
                if (rect.left < 0) {
                    // left side of table is offscreen to the left
                    if (rect.right > viewWidth) { // table spans the whole screen
                        center = -rect.left + ((viewWidth - titleWidth) / 2);
                    } else { // right side of table is visible
                        center = tableWidth - ((rect.right + titleWidth) / 2);
                        center = Math.min(center, tableWidth - titleWidth - 6);
                    }
                } else { // the left side of the table is visible
                    if (rect.right < viewWidth) {
                        // the right side of the table is visible
                        center = (tableWidth - titleWidth) / 2;
                    } else { // the right side of the table isn't visible
                        center = (viewWidth - rect.left - titleWidth) / 2;
                        center = Math.max(10, center);
                    }
                }
                center = Math.floor(center);
                $tableTitle.css('left', center);
                $table.find('.lockedIcon')
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
    var duration = speed || 250;
    var viewWidth = $('#mainFrame').width();
    var $table = $('#xcTableWrap-' + tableId);
    var $thead = $table.find('.xcTheadWrap');
    var rect = $thead[0].getBoundingClientRect();
    var right = rect.right - widthChange;


    if (right > 0 && rect.left < viewWidth) {
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
        if (rect.left < 0) {
            // left side of table is offscreen to the left
            if (right > viewWidth) { // table spans the whole screen
                center = -rect.left + ((viewWidth - titleWidth) / 2);
            } else { // right side of table is visible
                center = tableWidth - ((right + titleWidth) / 2);
                center = Math.min(center, tableWidth - titleWidth - 6);
            }
        } else { // the left side of the table is visible
            if (right < viewWidth) {
                // the right side of the table is visible
                center = (tableWidth - titleWidth) / 2;
            } else { // the right side of the table isn't visible
                center = (viewWidth - rect.left - titleWidth) / 2;
                center = Math.max(10, center);
            }
        }
        center = Math.floor(center);
        $tableTitle.animate({left: center}, duration, "linear");
    }
}

function focusTable(tableId, focusDag) {
    if (WSManager.getWSFromTable(tableId) !== WSManager.getActiveWS())
    {
        console.warn("Table not in current worksheet");
        return;
    }
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
    if (isBrowserMicrosoft) {
        return;
    }

    if (!$targetTable) {
        datasetPreview = false;
        $('.xcTableWrap:not(".inActive")').each(function() {
            rightOffset = $(this)[0].getBoundingClientRect().right;
            if (rightOffset > 0) {
                $targetTable = $(this);
                return false;
            }
        });
    } else {
        datasetPreview = true;
    }

    if ($targetTable && $targetTable.length > 0) {
        var $idCol =  $targetTable.find('.idSpan');
        var cellWidth = $idCol.width();
        var scrollLeft;

        if (datasetPreview) {
            scrollLeft = -($targetTable.offset().left -
                              $('#datasetWrap').offset().left);
        } else {
            scrollLeft = -$targetTable.offset().left;
        }

        var rightDiff = rightOffset - (cellWidth + 15);
        if (rightDiff < 0) {
            scrollLeft += rightDiff;
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

function centerPositionElement($target, options) {
    // to position elements in the center of the window i.e. for modals
    var $window = $(window);
    var top;
    options = options || {};

    if (!options.horizontalOnly) {
        var winHeight   = $window.height();
        var modalHeight = $target.height();
        top = ((winHeight - modalHeight) / 2);

        // maxTop if we'd like to position the modal say at least 100 pixels
        // from the top of the screen if possible
        if (options.maxTop && top < options.maxTop) {
            top = options.maxTop;
            var bottom = top + modalHeight;
            if (bottom > winHeight) {
                top -= (bottom - winHeight);
            }
        }
        if (options.limitTop) {
            top = Math.max(top, 0);
        }
    }

    var winWidth    = $window.width();
    var modalWidth  = $target.width();

    var left = ((winWidth - modalWidth) / 2);

    if (options.horizontalOnly) {
        $target.css({"left": left});
    } else {
        $target.css({
            "left": left,
            "top" : top
        });
    }
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
    var viewWidth = $('#mainFrame').width() + marginRight;

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
}
