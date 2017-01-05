window.TblMenu = (function(TblMenu, $) {
    TblMenu.setup = function() {
        try {
            addMenuBehaviors($('#tableMenu'));
            addMenuBehaviors($('#colMenu'));
            addMenuBehaviors($('#cellMenu'));
            addTableMenuActions();
            addColMenuActions();
            addPrefixColumnMenuActions();
        } catch (error) {
            console.error(error);
        }
    };

    function addTableMenuActions() {
        var $tableMenu = $('#tableMenu');
        var $subMenu = $('#tableSubMenu');
        var $allMenus = $tableMenu.add($subMenu);

        $tableMenu.on('mouseup', '.archiveTable', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            TblManager.archiveTables([tableId]);
        });

        $tableMenu.on('mouseup', '.hideTable', function(event) {
            if (event.which !== 1) {
                return;
            }

            var tableId = $tableMenu.data('tableId');
            TblManager.hideTable(tableId);
        });

        $tableMenu.on('mouseup', '.unhideTable', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            TblManager.unHideTable(tableId);
        });

        $tableMenu.on('mouseup', '.deleteTable', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var tableName = gTables[tableId].tableName;
            // TblManager.sendTablesToTrash(tableId, TableType.Active);

            var msg = xcHelper.replaceMsg(TblTStr.DelMsg, {"table": tableName});
            Alert.show({
                "title"    : TblTStr.Del,
                "msg"      : msg,
                "onConfirm": function() {
                    TblManager.deleteTables(tableId, TableType.Active);
                }
            });
        });

        $tableMenu.on('mouseup', '.exportTable', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            ExportView.show(tableId);
        });

        $tableMenu.on('mouseup', '.exitOp', function(event) {
            if (event.which !== 1) {
                return;
            }
            var exitType = $(this).data('exittype');
            switch (exitType) {
                case ('aggregate'):
                case ('filter'):
                case ('groupby'):
                case ('map'):
                    OperationsView.close();
                    break;
                case ('export'):
                    ExportView.close();
                    break;
                case ('smartCast'):
                    SmartCastView.close();
                    break;
                case ('join'):
                    JoinView.close();
                    break;
                case ('ext'):
                    BottomMenu.close();
                    break;
                case ("dataflow"):
                    DFCreateView.close();
                    break;
                default:
                    break;
            }
        });

        // xx currently not visible
        $tableMenu.on('mouseup', '.copyColNames', function(event) {
            if (event.which !== 1) {
                return;
            }

            function getAllColNames(tableId) {
                var colNames = [];
                $.each(gTables[tableId].tableCols, function() {
                    if (this.name !== "DATA") {
                        colNames.push(this.name);
                    }
                });
                return colNames;
            }

            var wsId = WSManager.getActiveWS();
            var allColNames = [];
            $.each(WSManager.getWorksheets()[wsId].tables, function() {
                var tableColNames = getAllColNames(this);
                for (var i = 0; i < tableColNames.length; i++) {
                    var value = tableColNames[i];
                    if (allColNames.indexOf(value) === -1) {
                        allColNames.push(value);
                    }
                }
            });
            copyToClipboard(allColNames, true);
        });

        $tableMenu.on('mouseup', '.delAllDuplicateCols', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            ColManager.delAllDupCols(tableId);
        });

        $tableMenu.on('mouseup', '.multiCast', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            SmartCastView.show(tableId);
        });

        $tableMenu.on('mouseup', '.corrAgg', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            AggModal.corrAgg(tableId);
        });

        // opeartion for move to worksheet and copy to worksheet
        $tableMenu.on('mouseenter', '.moveTable', function() {
            var $list = $subMenu.find(".list");
            $list.empty().append(WSManager.getWSLists(false));
            
        });

        $tableMenu.on('mouseup', '.createDf', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var $dagWrap = $('#dagWrap-' + tableId);
            if (!$dagWrap.hasClass('fromRetina')) {
                DFCreateView.show($dagWrap);
            }
        });

        // SUBMENU CODE

        var subMenuList = new MenuHelper($subMenu.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".wsName");
                $input.val($li.text()).focus();
            }
        });
        subMenuList.setupListeners();

        $subMenu.on('keypress', '.moveTable input', function(event) {
            if (event.which === keyCode.Enter) {
                var tableId = $tableMenu.data('tableId');
                var $input  = $(this);
                var wsName  = $input.val().trim();
                var $option = $input.siblings(".list").find("li").filter(function() {
                    return ($(this).text() === wsName);
                });

                var isValid = xcHelper.validate([
                    {
                        "$ele": $input,
                        "side": "left"
                    },
                    {
                        "$ele" : $input,
                        "error": ErrTStr.InvalidWSInList,
                        "side" : "left",
                        "check": function () {
                            return ($option.length === 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return false;
                }

                var wsId = $option.data("ws");

                WSManager.moveTable(tableId, wsId);

                $input.val("");
                $input.blur();
                closeMenu($allMenus);
            }
        });

        $subMenu.on('mouseup', '.moveLeft', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var curIndex = WSManager.getTableRelativePosition(tableId);
            reorderAfterTableDrop(tableId, curIndex, curIndex - 1, {
                moveHtml: true
            });
        });

        $subMenu.on('mouseup', '.moveRight', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            var curIndex = WSManager.getTableRelativePosition(tableId);
            reorderAfterTableDrop(tableId, curIndex, curIndex + 1, {
                moveHtml: true
            });
        });

        $subMenu.on('mouseup', '.sortForward', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.sortColumns(tableId, "forward");
            }, 0);
        });

        $subMenu.on('mouseup', '.sortReverse', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.sortColumns(tableId, "reverse");
            }, 0);
        });

        $subMenu.on('mouseup', '.resizeCols li', function(event) {
            if (event.which !== 1) {
                return;
            }

            var $li = $(this);
            var tableId = $tableMenu.data('tableId');
            var resizeTo;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'sizeToHeader';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'sizeToFitAll';
            } else {
                resizeTo = 'sizeToContents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.resizeColumns(tableId, resizeTo);
            }, 0);
        });
    }

    function addColMenuActions() {
        var $colMenu = $('#colMenu');
        var $subMenu = $('#colSubMenu');
        var $cellMenu = $('#cellMenu');

        var $colMenus = $colMenu.add($subMenu);
        var $allMenus = $colMenus.add($cellMenu);

        // add new column
        $subMenu.on('mouseup', '.addColumn', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');

            var direction;
            if ($(this).hasClass('addColLeft')) {
                direction = ColDir.Left;
            } else {
                direction = ColDir.Right;
            }

            ColManager.addNewCol(colNum, tableId, direction);
        });

        $colMenu.on('mouseup', '.deleteColumn', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum  = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.delCol([colNum], tableId);
        });

        $colMenu.on('mouseup', '.deleteDuplicates', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.delDupCols(colNum, tableId);
        });

        $subMenu.on('click', '.inputAction', function() {
            $(this).siblings('input').trigger(fakeEvent.enter);
        });

        $subMenu.on('keypress', 'input', function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                if ($input.closest('.extensions').length) {
                    $input.siblings('.inputAction').find('.extensions')
                                                   .trigger(fakeEvent.mouseup);
                }
            }
        });

        $subMenu.on('keypress', '.rename input', function(event) {
            if (event.which === keyCode.Enter) {
                var $input  = $(this);
                var tableId = $colMenu.data('tableId');
                var colName = $input.val().trim();
                var colNum  = $colMenu.data('colNum');

                if (colName === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $input, null);
                    return false;
                }

                if (ColManager.checkColName($input, tableId, colNum))
                {
                    return false;
                }

                ColManager.renameCol(colNum, tableId, colName);
                $input.val("").blur();
                closeMenu($allMenus);
            }
        });

        $subMenu.on('mouseup', '.changeFormat', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var tableId = $colMenu.data('tableId');
            var format = $(this).data("format");
            var formats = [];
            var colNums = [];

            if ($li.closest('.multiFormat').length !== 0) {
                var allColNums = $colMenu.data('columns');
                var table = gTables[tableId];

                allColNums.forEach(function(colNum) {
                    var progCol = table.getCol(colNum);
                    if (progCol.isNumberCol()) {
                        formats.push(format);
                        colNums.push(colNum);
                    }
                });
            } else {
                colNums = [$colMenu.data('colNum')];
                formats.push(format);
            }

            ColManager.format(colNums, tableId, formats);
        });

        $subMenu.on('keypress', '.digitsToRound', function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }

            var $input = $(this);
            var decimal = parseInt($input.val().trim());
            if (isNaN(decimal) || decimal < 0 || decimal > 14) {
                // when this field is empty
                var error = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                    "num1": 0,
                    "num2": 14
                });
                StatusBox.show(error, $input, null, {
                    "side"     : "left",
                    "closeable": true
                });
                return;
            }

            var tableId = $colMenu.data('tableId');
            var colNums;
            var decimals = [];

            if ($input.closest('.multiRoundToFixed').length !== 0) {
                colNums = $colMenu.data('columns');
                decimals = getDecimals(tableId, decimal, colNums);
            } else {
                colNums = [$colMenu.data('colNum')];
                decimals.push(decimal);
            }
            ColManager.roundToFixed(colNums, tableId, decimals);
            closeMenu($allMenus);
        });

        $subMenu.on('mouseup', '.changeRound.default', function(event) {
            if (event.which !== 1) {
                return;
            }
            // chagne round to default value
            var tableId = $colMenu.data('tableId');
            var $li = $(this);
            var decimals = [];
            var colNums;

            if ($li.closest('.multiRoundToFixed').length !== 0) {
                colNums = $colMenu.data('columns');
                decimals = getDecimals(tableId, -1, colNums);
            } else {
                colNums = [$colMenu.data('colNum')];
                decimals.push(-1);
            }

            ColManager.roundToFixed(colNums, tableId, decimals);
        });

        function getDecimals(tableId, decimal, colNums) {
            var decimals = [];
            var table = gTables[tableId];

            colNums.forEach(function(colNum) {
                var progCol = table.getCol(colNum);
                if (progCol.getType() === ColumnType.float) {
                    decimals.push(decimal);
                }
            });

            return decimals;
        }

        $subMenu.on('keypress', '.splitCol input', function(event) {
            if (event.which === keyCode.Enter) {
                var colNum = $colMenu.data("colNum");
                var tableId = $colMenu.data('tableId');
                var $li = $(this).closest("li");
                var $delimInput = $li.find(".delimiter");
                var delim = $delimInput.val();

                if (delim === "") {
                    StatusBox.show(ErrTStr.NoEmpty, $delimInput, null, {
                        "closeable": true
                    });
                }

                var $numInput = $li.find(".num");
                var num = $numInput.val().trim();
                var numColToGet;

                if (num === "") {
                    numColToGet = null;
                } else {
                    numColToGet = Number(num);
                    var isValid = xcHelper.validate([
                        {
                            "$ele" : $numInput,
                            "error": ErrTStr.OnlyNumber,
                            "check": function() {
                                return (isNaN(numColToGet) ||
                                        !Number.isInteger(numColToGet));
                            }
                        },
                        {
                            "$ele" : $numInput,
                            "error": ErrTStr.OnlyPositiveNumber,
                            "check": function() {
                                return (numColToGet < 1);
                            }
                        }
                    ]);

                    if (!isValid) {
                        return;
                    }
                }

                ColManager.splitCol(colNum, tableId, delim, numColToGet, true);
                $delimInput.val("").blur();
                $numInput.val("").blur();
                closeMenu($allMenus);
            }
        });

        $colMenu.on('mouseup', '.duplicate', function(event) {
            if (event.which !== 1) {
                return;
            }

            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.dupCol(colNum, tableId);
        });

        $colMenu.on('mouseup', '.hide', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.hideCols([colNum], tableId);
        });

        $colMenu.on('mouseup', '.unhide', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.unhideCols([colNum], tableId);
        });

        $subMenu.on('mouseup', 'li.textAlign', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var colNums;
            if ($li.closest('.multiTextAlign').length !== 0) {
                colNums = $colMenu.data('columns');
            } else {
                colNums = [$colMenu.data('colNum')];
            }
            var tableId = $colMenu.data('tableId');
            ColManager.textAlign(colNums, tableId, $li.attr("class"));
        });

        $subMenu.on('mouseup', '.resize', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var colNum;
            if ($li.closest('.multiResize').length !== 0) {
                colNum = $colMenu.data('columns');
            } else {
                colNum = $colMenu.data('colNum');
            }
            var tableId = $colMenu.data('tableId');
            var resizeTo;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'sizeToHeader';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'sizeToFitAll';
            } else {
                resizeTo = 'sizeToContents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(function() {
                TblManager.resizeColumns(tableId, resizeTo, colNum);
            }, 0);
        });

        $subMenu.on('mouseup', '.typeList', function(event) {
            if (event.which !== 1) {
                return;
            }

            var $li = $(this);
            var colTypeInfos = [];
            var colNum;
            // xx need to use data or class instead of text in case of language
            var newType = $li.find(".label").text().toLowerCase();
            if ($li.closest(".multiChangeDataType").length !== 0) {
                var colNums = $colMenu.data("columns");
                for (var i = 0, len = colNums.length; i < len; i++) {
                    colNum = colNums[i];
                    colTypeInfos.push({
                        "colNum": colNum,
                        "type"  : newType
                    });
                }
            } else {
                colNum = $colMenu.data("colNum");
                colTypeInfos.push({
                    "colNum": colNum,
                    "type"  : newType
                });
            }
            var tableId = $colMenu.data('tableId');
            ColManager.changeType(colTypeInfos, tableId)
            .then(function(newTableId) {
                if ($('.xcTable th.selectedCell').length === 0) {
                    $('#xcTable-' + newTableId).find('th.col' + (colNum) +
                                               ' .flexContainer').mousedown();
                }
            });
        });

        $subMenu.on('mouseup', 'li.sort', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            sortColumn(colNum, tableId, SortDirection.Forward);
        });

        $subMenu.on('mouseup', 'li.revSort', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            sortColumn(colNum, tableId, SortDirection.Backward);
        });

        $colMenu.on('mouseup', '.joinList', function(event) {
            if (event.which !== 1) {
                return;
            }

            var colNum  = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            JoinView.show(tableId, colNum);
        });

        $colMenu.on('mouseup', '.functions', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var $li = $(this);
            var tableId = $colMenu.data('tableId');
            var func = $li.data('func');
            var colNums;
            var options = {};

            if ($li.hasClass('multiGroupby')) {
                options.multiGroupby = true;
                colNums = $colMenu.data('columns');
            } else {
                colNums = [$colMenu.data('colNum')];
            }

            OperationsView.show(tableId, colNums, func, options);
        });

        $colMenu.on('mouseup', '.profile', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum);
        });

        $colMenu.on('mouseup', '.extensions', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            
            ExtensionManager.openView(colNum, tableId);
        });

        $cellMenu.on('mouseup', '.tdFilter, .tdExclude', function(event) {
            var $li =  $(this);

            if (event.which !== 1 || $li.hasClass('unavailable')) {
                return;
            }

            var colNum  = $cellMenu.data('colNum');
            var tableId = $cellMenu.data('tableId');

            var $table  = $("#xcTable-" + tableId);
            var $header = $table.find("th.col" + colNum + " .header");

            var colName = gTables[tableId].tableCols[colNum - 1].getBackColName();
            var $highlightBoxs = $table.find(".highlightBox");

            var notValid = false;
            var uniqueVals = {};
            var isExist = false;
            var colVal;

            $highlightBoxs.each(function() {
                var $td = $(this).closest("td");

                if ($td.find(".undefined").length > 0) {
                    // FNF case
                    isExist = true;
                    return true; // continue to next iteration
                }

                if ($header.hasClass("type-integer")) {
                    colVal = $td.find('.originalData').text();
                    if (colVal == null || colVal === "") {
                        isExist = true;
                        return true; // continue to next iteration
                    }
                    colVal = parseInt(colVal);
                } else if ($header.hasClass("type-float")) {
                    colVal = $td.find('.originalData').text();
                    if (colVal == null || colVal === "") {
                        isExist = true;
                        return true; // continue to next iteration
                    }
                    colVal = parseFloat(colVal);
                } else if ($header.hasClass("type-string")) {
                    // colVal = colVal + ""; // if it's number, change to string
                    // XXX for string, text is more reliable
                    // since data-val might be messed up
                    colVal = $td.find('.originalData').text();
                    colVal = JSON.stringify(colVal);
                } else if ($header.hasClass("type-boolean")) {
                    colVal = $td.find('.originalData').text();
                    if (colVal === "true") {
                        colVal = true;
                    } else {
                        colVal = false;
                    }
                } else {
                    notValid = true;
                    return false;
                }

                uniqueVals[colVal] = true;
            });

            if (!notValid) {
                var operator = $li.hasClass("tdFilter") ? FltOp.Filter :
                                                          FltOp.Exclude;
                var options = xcHelper.getFilterOptions(operator, colName,
                                        uniqueVals, isExist);

                if (options != null) {
                    xcFunction.filter(colNum, tableId, options);
                }
            }

            $highlightBoxs.remove();
        });

        $cellMenu.on('mouseup', '.tdJsonModal', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $cellMenu.data('tableId');
            var rowNum  = $cellMenu.data('rowNum');
            var colNum  = $cellMenu.data('colNum');
            var $table  = $("#xcTable-" + tableId);
            var $td     = $table.find(".row" + rowNum + " .col" + colNum);
            var colType = gTables[tableId].tableCols[colNum - 1].getType();

            JSONModal.show($td, {type: colType});
        });

        $cellMenu.on('mouseup', '.tdUnnest', function(event) {
            if (event.which !== 1) {
                return;
            }

            var tableId = $cellMenu.data('tableId');
            var rowNum = $cellMenu.data('rowNum');
            var colNum = $cellMenu.data('colNum');

            $(".xcTable").find(".highlightBox").remove();
            setTimeout(function() {
                ColManager.unnest(tableId, colNum, rowNum);
            }, 0);
        });

        $cellMenu.on('mouseup', '.tdCopy', function(event) {
            var $li = $(this);
            if (event.which !== 1 || $li.hasClass('unavailable')) {
                return;
            }
            var tableId = $cellMenu.data('tableId');
            var $highlightBoxs = $("#xcTable-" + tableId).find(".highlightBox");
            var valArray = [];
            var colVal;
            var cells = sortHighlightCells($highlightBoxs);
            for (var i = 0, len = cells.length; i < len; i++) {
                colVal = cells[i].siblings(".originalData").text();

                valArray.push(colVal);
            }

            copyToClipboard(valArray);
            xcHelper.showSuccess();
            $highlightBoxs.remove();
        });

        // multiple columns
        $colMenu.on('mouseup', '.deleteColumns', function(event) {
            if (event.which !== 1) {
                return;
            }
            var columns = $colMenu.data('columns');
            var tableId = $colMenu.data('tableId');
            ColManager.delCol(columns, tableId);
        });

        $colMenu.on('mouseup', '.hideColumns', function(event) {
            if (event.which !== 1) {
                return;
            }

            var columns = $colMenu.data('columns');
            var tableId = $colMenu.data('tableId');
            ColManager.hideCols(columns, tableId);
        });

        $colMenu.on('mouseup', '.unhideColumns', function(event) {
            if (event.which !== 1) {
                return;
            }

            var columns = $colMenu.data('columns');
            var tableId = $colMenu.data('tableId');
            ColManager.unhideCols(columns, tableId);
        });

        $colMenu.on('mouseup', '.exitOp', function(event) {
            if (event.which !== 1) {
                return;
            }
            var exitType = $(this).data('exittype');
            switch (exitType) {
                case ('export'):
                    ExportView.close();
                    break;
                case ('aggregate'):
                case ('filter'):
                case ('groupby'):
                case ('map'):
                    OperationsView.close();
                    break;
                case ('smartCast'):
                    SmartCastView.close();
                    break;
                case ('join'):
                    JoinView.close();
                    break;
                case ('ext'):
                    BottomMenu.close();
                    break;
                case ("dataflow"):
                    DFCreateView.close();
                    break;
                default:
                    break;
            }
            
        });
    }

    function addPrefixColumnMenuActions() {
        var $prefixColorMenu = $("#prefixColorMenu");
        $prefixColorMenu.on("mouseup", ".wrap", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $wrap = $(this);
            var prefix = $prefixColorMenu.data("prefix");
            var color = $(this).data("color");

            $wrap.addClass("selected").siblings().removeClass("selected");
            TPrefix.markColor(prefix, color);
            closeMenu($prefixColorMenu);
        });
    }

    function sortColumn(colNum, tableId, order) {
        var progCol = gTables[tableId].tableCols[colNum - 1];
        var type = progCol.getType();

        if (type !== "string") {
            xcFunction.sort(colNum, tableId, order);
            return;
        }

        var $tds = $("#xcTable-" + tableId).find("tbody td.col" + colNum);
        var datas = [];
        var val;

        $tds.each(function() {
            val = $(this).find('.originalData').text();
            datas.push(val);
        });

        var suggType = xcHelper.suggestType(datas, type, 0.9);
        if (suggType === "integer" || suggType === "float") {
            var instr = xcHelper.replaceMsg(IndexTStr.SuggInstr, {
                "type": suggType
            });

            Alert.show({
                "title"  : IndexTStr.SuggTitle,
                "instr"  : instr,
                "msg"    : IndexTStr.SuggMsg,
                "buttons": [{
                    "name": IndexTStr.NoCast,
                    "func": function() {
                        xcFunction.sort(colNum, tableId, order);
                    }
                },
                {
                    "name": IndexTStr.CastToNum,
                    "func": function() {
                        xcFunction.sort(colNum, tableId, order, suggType);
                    }
                }]
            });
        } else {
            xcFunction.sort(colNum, tableId, order);
        }
    }

    function copyToClipboard(valArray, stringify) {
        var $hiddenInput = $("<input>");
        var str = "";
        if (stringify) {
            str = JSON.stringify(valArray);
        } else {
            str = valArray.join(", ");
        }

        $("body").append($hiddenInput);
        $hiddenInput.val(str).select();
        document.execCommand("copy");
        $hiddenInput.remove();
    }

    function sortHighlightCells($highlightBoxes) {
        var cells = [];

        $highlightBoxes.each(function() {
            cells.push($(this));
        });

        cells.sort(function($a, $b) {
            // first sort by colNum, then sort by rowNum if in same col
            var res = $a.data("colNum") - $b.data("colNum");

            if (res === 0) {
                res = $a.data("rowNum") - $b.data("rowNum");
            }

            return (res);
        });

        return (cells);
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        TblMenu.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (TblMenu);
}({}, jQuery));

