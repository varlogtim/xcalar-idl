class FnBar {
    private static _instance: FnBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _$functionArea: JQuery; // $("#functionArea");
    private _$fnBar: JQuery; // $('#functionArea .CodeMirror')

    private _searchHelper: SearchBar;
    private _editor: CodeMirror.Editor;
    private _colNamesCache: object;
    private _initialTableId: TableId;//used to track table that was initially active
    // when user started searching

    private constructor() {
        this._searchHelper = null;
        this._colNamesCache = {};
        this._initialTableId = null;
    }

    public setup(): void {
        const self = this;
        self._$functionArea = $("#functionArea");
        self._$functionArea.addClass('searching');

        self._editor = CodeMirror.fromTextArea(<HTMLTextAreaElement>$('#fnBar')[0], {
            "mode": "spreadsheetCustom",
            "indentWithTabs": true,
            "indentUnit": 4,
            "placeholder": WSTStr.SearchTableAndColumn,
        });

        $(window).blur(function() {
            self._editor.getInputField().blur();
        });

        self._$functionArea.find('pre').addClass('fnbarPre');
        self._$fnBar = $('#functionArea .CodeMirror');

        self._setupSearchHelper();

        self._editor.on("mousedown", function() {
            self._$fnBar.addClass("inFocus");
            self._$fnBar.find('.CodeMirror-placeholder').show();
        });

        self._editor.on("focus", function() {
            xcTooltip.hideAll();
            self.updateColNameCache();
        });

        // editor.on("blur") is triggered during selection range mousedown
        // which it shouldn't (due to dragndrop) so it's not reliable to use


        // disallow adding newlines
        self._editor.on("beforeChange", function(instance, change) {
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
        self._editor.on("change", function(instance, change) {
            var val = self._editor.getValue();
            var trimmedVal = val.trim();
            if (self._$fnBar.hasClass('disabled')) {
                // $functionArea.removeClass('searching');
                return;
            }

            if (!self._$fnBar.hasClass('inFocus')) {
                // change event can be triggered when removing focus from
                // a table column and switching to search mode when clicking
                // away. We do not want to trigger search if fnBar is not
                // in focus because user is not actually typing a change
                return;
            }
            self._colNamesCache = {};

            var args = {
                "value": trimmedVal,
                "searchBar": self._searchHelper,
                "initialTableId": self._initialTableId
            };
            ColManager.execCol("search", null, null, null, args);
        });
    };

    public updateColNameCache(): void {
        if (this._initialTableId && this._initialTableId !== gActiveTableId ||
            $.isEmptyObject(this._colNamesCache)) {
            this._resetColNamesCache(gActiveTableId);
        }
        this._initialTableId = gActiveTableId;
    };


    public clear(): void {
        this._editor.setValue("");
        this._$fnBar.removeClass("active inFocus disabled");
        this._colNamesCache = {};

    };

    // sets cursor to blink at the end of the input string
    public focusCursor(): void{
        var valLen = this._editor.getValue().length;
        this._editor.focus();
        let pos: CodeMirror.Position = {ch: 0,line: valLen};
        this._editor.getDoc().setCursor(pos);
    };

    public getEditor(): CodeMirror.Editor {
        return this._editor;
    };



    private _resetColNamesCache(tableId: TableId): void {
        if (!gTables[tableId]) {
            return;
        }
        this._colNamesCache = xcHelper.getColNameMap(<string>tableId);
    }

    private _setupSearchHelper(): void {
        this._searchHelper = new SearchBar(this._$functionArea, {
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
                    TableComponent.empty();
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
            "codeMirror": this._editor,
            "$input": this._$fnBar,
            "ignore": "=",
            "arrowsPreventDefault": true
        });
    }


}
