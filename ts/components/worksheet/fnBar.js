window.FnBar = (function(FnBar, $) {
    var $functionArea; // $("#functionArea");
    var $fnBar; // $('#functionArea .CodeMirror')

    var searchHelper;
    var editor;
    var colNamesCache = {};
    var initialTableId;//used to track table that was initially active
    // when user started searching

    FnBar.setup = function() {
        $functionArea = $("#functionArea");
        $functionArea.addClass('searching');

        editor = CodeMirror.fromTextArea($('#fnBar')[0], {
            "mode": "spreadsheetCustom",
            "indentWithTabs": true,
            "indentUnit": 4,
            "matchBrackets": true,
            "matchTags": true,
            "placeholder": WSTStr.SearchTableAndColumn,
            "autoCloseBrackets": true
        });


        $(window).blur(function() {
            editor.getInputField().blur();
        });

        $functionArea.find('pre').addClass('fnbarPre');
        $fnBar = $('#functionArea .CodeMirror');

        setupSearchHelper();

        editor.on("mousedown", function() {
            $fnBar.addClass("inFocus");
            $fnBar.find('.CodeMirror-placeholder').show();
        });

        editor.on("focus", function() {
            xcTooltip.hideAll();
            FnBar.updateColNameCache();
        });

        // editor.on("blur") is triggered during selection range mousedown
        // which it shouldn't (due to dragndrop) so it's not reliable to use


        // disallow adding newlines
        editor.on("beforeChange", function(instance, change) {
        // remove ALL \n
            var newText = change.text.join("").replace(/\n/g, "");
            // Notes: "change" arg is incremental- user can type in "="
            // anywhere and be caught by this, but doesn't catch paste as long
            // as equal sign is not at beginning
            if (newText.trim().indexOf("=") === 0) {
                // No active column, disallow user from typing in a
                newText = "";
                var $div = $('#funcBarMenuArea');
                var timeoutTime;
                if ($('#container').hasClass('columnPicker')) {
                    xcTooltip.changeText($div, TooltipTStr.NoFnBarFormOpen);
                    timeoutTime = 2500;
                } else {
                    xcTooltip.changeText($div, TooltipTStr.SelectCol);
                    timeoutTime = 1200;
                }
                xcTooltip.refresh($div, timeoutTime);
            }
            if (change.update) {
                change.update(change.from, change.to, [newText]);
            }
            return true;
        });


        // change is triggered during user's input or when clearing/emptying
        // the input field
        editor.on("change", function(instance, change) {
            var val = editor.getValue();
            var trimmedVal = val.trim();
            if ($fnBar.hasClass('disabled')) {
                // $functionArea.removeClass('searching');
                return;
            }

            if (!$fnBar.hasClass('inFocus')) {
                // change event can be triggered when removing focus from
                // a table column and switching to search mode when clicking
                // away. We do not want to trigger search if fnBar is not
                // in focus because user is not actually typing a change
                return;
            }
            colNamesCache = {};

            var args = {
                "value": trimmedVal,
                "searchBar": searchHelper,
                "initialTableId": initialTableId
            };
            ColManager.execCol("search", null, null, null, args);
        });
    };

    FnBar.updateColNameCache = function() {
        if (initialTableId && initialTableId !== gActiveTableId ||
            $.isEmptyObject(colNamesCache)) {
            resetColNamesCache(gActiveTableId);
        }
        initialTableId = gActiveTableId;
    };


    FnBar.clear = function() {
        editor.setValue("");
        $fnBar.removeClass("active inFocus disabled");
        colNamesCache = {};

    };

    // sets cursor to blink at the end of the input string
    FnBar.focusCursor = function() {
        var valLen = editor.getValue().length;
        editor.focus();
        editor.setCursor(0, valLen);
    };

    FnBar.getEditor = function() {
        return editor;
    };



    function resetColNamesCache(tableId) {
        if (!gTables[tableId]) {
            return;
        }
        colNamesCache = xcHelper.getColNameMap(tableId);
    }

    function setupSearchHelper() {
        searchHelper = new SearchBar($functionArea, {
            "removeSelected": function() {
                $('.xcTable').find('.selectedCell')
                             .removeClass('selectedCell');
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                             .removeClass('modalHighlighted');
                }
            },
            "highlightSelected": function($match) {
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                                 .removeClass('modalHighlighted');
                }

                if ($match.is('th')) {
                    TblManager.highlightColumn($match);
                    $('#mainFrame').find('.tblTitleSelected')
                                   .removeClass('tblTitleSelected');
                    $('.dagWrap.selected').removeClass('selected')
                                          .addClass('notSelected');
                    RowScroller.empty();
                } else if ($match.is('.tableTitle')) {
                    var tableId = $match.closest('.xcTableWrap').data('id');
                    TblFunc.focusTable(tableId, true);
                }
            },
            "scrollMatchIntoView": function($match) {
                var $mainFrame = $('#mainFrame');
                var mainFrameOffset = MainMenu.getOffset();
                var rightBoundary = mainFrameOffset + $mainFrame.width();
                var matchOffsetLeft = $match.offset().left;
                var matchWidth = $match.width();
                var matchDiff = matchOffsetLeft - (rightBoundary - matchWidth);

                if (matchDiff > 0 || matchOffsetLeft < (mainFrameOffset)) {
                    var scrollLeft = $mainFrame.scrollLeft();
                    var mainFrameWidth = $mainFrame.width();
                    $mainFrame.scrollLeft(scrollLeft + matchDiff +
                                        ((mainFrameWidth - matchWidth) / 2));
                }
            },
            "codeMirror": editor,
            "$input": $fnBar,
            "ignore": "=",
            "arrowsPreventDefault": true
        });
    }



    /* Unit Test Only */
    if (window.unitTestMode) {
        FnBar.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (FnBar);
}({}, jQuery));
