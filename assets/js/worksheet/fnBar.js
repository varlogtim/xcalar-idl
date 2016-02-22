window.FnBar = (function(FnBar, $) {
    var $functionArea = $("#functionArea");
    var $fnBar = $("#fnBar");

    var $lastColInput = null;
    var searchHelper;

    FnBar.setup = function() {
        setupSearchHelper();
        var initialTableId; //used to track table that was initially active
        // when user started searching

        $fnBar.on({
            "input": function() {
                var val = $(this).val();
                var trimmedVal = val.trim();
                if (trimmedVal.indexOf('=') !== 0) {
                    $functionArea.addClass('searching');
                    var args = {value: trimmedVal, searchBar: searchHelper,
                                initialTableId: initialTableId};
                    ColManager.execCol({func: {func: 'search'}}, null, null, args);
                } else {
                    $functionArea.removeClass('searching');
                }
            },
            "keyup": function(event) {
                if (event.which === keyCode.Enter) {
                    functionBarEnter();
                }
            },
            "mousedown": function() {
                $(this).addClass("inFocus");
                $fnBar.attr('placeholder', WorksheetStr.SearchTableAndColumn);
            },
            "focus": function() {
                initialTableId = gActiveTableId;
            },
            "blur": function() {
                $(this).removeClass("inFocus");
                $fnBar.attr('placeholder', "");
                searchHelper.clearSearch(function() {
                    $functionArea.removeClass('searching');
                });
            }
        });
    };

    FnBar.focusOnCol = function($colInput, tableId, colNum, forceFocus) {
        if (!forceFocus && $lastColInput != null &&
            $colInput.get(0) === $lastColInput.get(0))
        {
            // the function bar origin hasn't changed so just return
            // and do not rehighlight or update any text
            return;
        }

        $lastColInput = $colInput;

        var progCol = gTables[tableId].tableCols[colNum - 1];
        if ($colInput.parent().hasClass("editable")) {
            if (!progCol.isNewCol) {
                throw "Error Case, only new column can be editable";
            }
            $fnBar.val("Please specify column's name first")
                  .addClass("disabled");
        } else {
            var userStr = progCol.userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            $fnBar.val(userStr).addClass('active').removeClass('disabled');
        }
    };

    FnBar.clear = function() {
        $lastColInput = null;
        $fnBar.val("").removeClass("active");
    };

    function setupSearchHelper() {
        searchHelper = new xcHelper.SearchBar($functionArea, {
            "removeSelected": function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell');
            },
            "highlightSelected": function($match) {
                if ($match.is('th')) {
                    highlightColumn($match);
                    $('#mainFrame').find('.tblTitleSelected')
                                   .removeClass('tblTitleSelected');
                    RowScroller.empty();
                } else if ($match.is('.tableTitle')) {
                    var tableId = $match.closest('.xcTableWrap').data('id');
                    focusTable(tableId, true);
                }
            },
            "scrollMatchIntoView": function($match) {
                var $mainFrame = $('#mainFrame');
                var mainFrameWidth = $mainFrame.width();
                var matchOffsetLeft = $match.offset().left;
                var scrollLeft = $mainFrame.scrollLeft();
                var matchWidth = $match.width();
                if (matchOffsetLeft > mainFrameWidth - matchWidth) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                } else if (matchOffsetLeft < 25) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                }
            },
            "ignore": "="
        });

        searchHelper.setup();
    }

    function functionBarEnter() {
        var fnBarVal = $fnBar.val();
        var fnBarValTrim = fnBarVal.trim();
        var $colInput = $lastColInput;

        if (fnBarValTrim.indexOf('=') === 0) {
            var $table   = $colInput.closest('.dataTable');
            var tableId  = xcHelper.parseTableId($table);
            var colNum   = xcHelper.parseColNum($colInput);
            var table    = gTables[tableId];
            var tableCol = table.tableCols[colNum - 1];
            var colName  = tableCol.name;
            $fnBar.blur();

            if (tableCol.isNewCol && colName === "") {
                // when it's new column and do not give name yet
                StatusBox.show(ErrorTextTStr.NoEmpty, $colInput);
                return;
            }

            $fnBar.removeClass("inFocus");

            var newFuncStr = '"' + colName + '" ' + fnBarValTrim;
            var oldUsrStr  = tableCol.userStr;

            $colInput.blur();
            // when usrStr not change
            if (newFuncStr === oldUsrStr) {
                return;
            }

            $colInput.closest('th').removeClass('unusedCell');
            $table.find('td:nth-child(' + colNum + ')').removeClass('unusedCell');
            var isValid = checkFuncSyntaxValidity(fnBarValTrim);
            if (!isValid) {
                return;
            }
            var progCol = parseFunc(newFuncStr, colNum, table, true);
            // add sql
            SQL.add("Pull Column", {
                "operation": "pullCol",
                "tableName": table.tableName,
                "colName"  : progCol.name,
                "colIndex" : colNum
            });

            ColManager.execCol(progCol, tableId, colNum)
            .then(function() {
                updateTableHeader(tableId);
                TableList.updateTableInfo(tableId);
                commitToStorage();
            });
        }
    }

    function checkFuncSyntaxValidity(funcStr) {
        if (funcStr.indexOf("(") === -1 || funcStr.indexOf(")") === -1) {
            return false;
        }

        var count = 0;
        var strLen = funcStr.length;
        for (var i = 0; i < strLen; i++) {
            if (funcStr[i] === "(") {
                count++;
            } else if (funcStr[i] === ")") {
                count--;
            }
            if (count < 0) {
                return false;
            }
        }

        return (count === 0);
    }

    function parseFunc(funcString, colNum, table, modifyCol) {
        // Everything must be in a "name" = function(args) format
        var open   = funcString.indexOf("\"");
        var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
        var name   = funcString.substring(open + 1, close);
        var funcSt = funcString.substring(funcString.indexOf("=") + 1);
        var progCol;

        if (modifyCol) {
            progCol = table.tableCols[colNum - 1];
        } else {
            progCol = ColManager.newCol();
        }

        progCol.name = name;
        progCol.func = cleanseFunc(funcSt, name);
        progCol.userStr = '"' + progCol.func.args[0] + '" =' + funcSt;

        return (progCol);
    }

    function cleanseFunc(funcString, name) {
        // funcString should be: function(args)
        var open  = funcString.indexOf("(");
        var close = funcString.lastIndexOf(")");
        var func  = funcString.substring(0, open).trim();
        var args  = (funcString.substring(open + 1, close)).split(",");

        if (func === "map") {
            args = [name];
        } else {
            for (var i = 0; i < args.length; i++) {
                args[i] = args[i].trim();
            }
        }

        return new ColFunc({"func": func, "args": args});
    }

    return (FnBar);
}({}, jQuery));
