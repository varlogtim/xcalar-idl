window.TblMenu = (function(TblMenu, $) {
    var $workspacePanel = $('#workspacePanel');

    TblMenu.setup = function() {
        generateTableMenu();
        addMenuBehaviors($('#tableMenu'));
        addTableMenuActions();

        generateColMenu();
        addMenuBehaviors($('#colMenu'));
        addMenuBehaviors($('#cellMenu'));
        addColMenuActions();
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
            TblManager.inActiveTables([tableId]);
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

            var msg = xcHelper.replaceMsg(TblTStr.DelMsg, {"table": tableName});
            Alert.show({
                "title"  : TblTStr.Del,
                "msg"    : msg,
                "confirm": function() {
                    TblManager.deleteTables(tableId, TableType.Active);
                }
            });
        });

        $tableMenu.on('mouseup', '.exportTable', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            ExportModal.show(tableId);
        });

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
            MultiCastModal.show(tableId);
        });

        $subMenu.on('mouseup', '.aggregates', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            AggModal.quickAgg(tableId);
        });

        $subMenu.on('mouseup', '.correlation', function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $tableMenu.data('tableId');
            AggModal.corr(tableId);
        });


        // opeartion for move to worksheet and copy to worksheet
        $tableMenu.on('mouseenter', '.moveToWorksheet', function() {
            var $list = $subMenu.find(".list");
            $list.empty().append(WSManager.getWSLists(false));
        });


        $tableMenu.on('mouseenter', '.dupToWorksheet', function() {
            var $list = $(this).find(".list");
            $list.empty().append(WSManager.getWSLists(true));
        });

        xcHelper.dropdownList($subMenu.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".wsName");
                $input.val($li.text()).focus();
            }
        });

        $subMenu.on('keypress', '.moveToWorksheet input', function(event) {
            if (event.which === keyCode.Enter) {
                var tableId = $tableMenu.data('tableId');
                var $input  = $(this);
                var wsName  = $input.val().trim();
                var $option = $input.siblings(".list").find("li").filter(function() {
                    return ($(this).text() === wsName);
                });

                var isValid = xcHelper.validate([
                    {
                        "$selector": $input
                    },
                    {
                        "$selector": $input,
                        "text"     : ErrTStr.InvalidWSInList,
                        "check"    : function () {
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

        // XXX Temporary disable it
        // $tableMenu.on('keypress', '.dupToWorksheet input', function(event) {
        //     if (event.which === keyCode.Enter) {
        //         var $li = $(this).closest(".dupToWorksheet");
        //         // there are two inputs in the sectin, so not use $(this)
        //         var $wsInput        = $li.find(".wsName");
        //         var $tableNameInput = $li.find(".tableName");
        //         // validation check
        //         var isValid = xcHelper.validate([
        //             { "$selector": $wsInput
        //             },
        //             { "$selector": $tableNameInput
        //             }
        //         ]);

        //         if (!isValid) {
        //             return false;
        //         }

        //         var wsName       = $wsInput.val().trim();
        //         var newTableName = $tableNameInput.val().trim();

        //         var $option = $li.find(".list li").filter(function() {
        //             return ($(this).text() === wsName);
        //         });
        //         // XXX also need to check table name conflict
        //         isValid = xcHelper.validate({
        //             "$selector": $wsInput,
        //             "text"     : ErrTStr.InvalidWSInList,
        //             "check"    : function() {
        //                 return ($option.length === 0);
        //             }
        //         });

        //         if (!isValid) {
        //             return false;
        //         }
        //         var tableId = $tableMenu.data('tableId');
        //         var table = gTables[tableId];
        //         var wsId = $option.data("ws");

        //         WSManager.copyTable(table.tableName, newTableName, wsId);

        //         $wsInput.val("");
        //         $wsInput.blur();

        //         $tableNameInput.val(xcHelper.randName(table.tableName, undefined,
        //                                               true));
        //         $tableNameInput.blur();
        //         closeMenu($allMenus);
        //     }
        // });

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

            // add sql
            var table = gTables[tableId];
            var sqlOptions = {
                "operation"  : SQLOps.AddNewCol,
                "tableName"  : table.tableName,
                "tableId"    : tableId,
                "siblColName": table.tableCols[colNum - 1].name,
                "siblColNum" : colNum
            };

            var direction;
            if ($(this).hasClass('addColLeft')) {
                direction = "L";
                sqlOptions.direction = "L";
            } else {
                sqlOptions.direction = "R";
            }

            ColManager.addCol(colNum, tableId, null, {
                "direction": direction,
                "isNewCol" : true,
                "inFocus"  : true
            });

            SQL.add("Add New Column", sqlOptions);
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

                if (ColManager.checkColDup($input, null, tableId, false, colNum))
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

            var format = $(this).data("format");
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.format(colNum, tableId, format);
        });

        $subMenu.on('keypress', '.digitsToRound', function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }

            var val = parseInt($(this).val().trim());
            if (isNaN(val) || val < 0 || val > 14) {
                // when this field is empty
                var error = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                    "num1": 0,
                    "num2": 14
                });
                StatusBox.show(error, $(this), null, {
                    "side"     : "left",
                    "closeable": true
                });
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.roundToFixed(colNum, tableId, val);
            closeMenu($allMenus);
        });

        $subMenu.on('mouseup', '.changeRound.default', function(event) {
            if (event.which !== 1) {
                return;
            }
            // chagne round to default value
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            ColManager.roundToFixed(colNum, tableId, -1);
        });

        $subMenu.on('keypress', '.splitCol input', function(event) {
            if (event.which === keyCode.Enter) {
                var colNum = $colMenu.data("colNum");
                var tableId = $colMenu.data('tableId');
                var $li = $(this).closest("li");
                var $delimInput = $li.find(".delimiter");
                var delim = $delimInput.val();

                if (delim.trim() === "") {
                    if (delim.length === 0) {
                        // when this field is empty
                        StatusBox.show(ErrTStr.NoEmpty, $delimInput, null,
                                        {"closeable": true});
                        return;
                    }
                    // cast of space/tab
                    // XXX FIXME: this part maybe buggy
                    delim = delim.charAt(0);
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
                            "$selector": $numInput,
                            "text"     : ErrTStr.OnlyNumber,
                            "check"    : function() {
                                return (isNaN(numColToGet) ||
                                        !Number.isInteger(numColToGet));
                            }
                        },
                        {
                            "$selector": $numInput,
                            "text"     : ErrTStr.OnlyPositiveNumber,
                            "check"    : function() {
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

        $subMenu.on('keypress', '.partitionNums', function(event) {
            if (event.which === keyCode.Enter) {
                var colNum = $colMenu.data("colNum");
                var tableId = $colMenu.data('tableId');

                var $input = $(this);
                var partitionNums = Number($input.val().trim());
                var rangeErr = xcHelper.replaceMsg(ErrWRepTStr.InvalidRange, {
                    "num1": 1,
                    "num2": 10
                });

                var isValid = xcHelper.validate([
                    {
                        "$selector": $input,
                        "text"     : ErrTStr.OnlyNumber
                    },
                    {
                        "$selector": $input,
                        "text"     : ErrTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(partitionNums) ||
                                    !Number.isInteger(partitionNums));
                        }
                    },
                    {
                        "$selector": $input,
                        "text"     : rangeErr,
                        "check"    : function() {
                            return partitionNums < 1 || partitionNums > 10;
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }

                ColManager.hPartition(colNum, tableId, partitionNums);
                $input.val("").blur();
                closeMenu($allMenus);
            }
        });

        $subMenu.on('keypress', '.window input', function(event) {
            if (event.which === keyCode.Enter) {
                var colNum = $colMenu.data("colNum");
                var tableId = $colMenu.data('tableId');
                var $li = $(this).closest("li");
                var $lagInput = $li.find(".lag");
                var $leadInput = $li.find(".lead");

                var lag = Number($lagInput.val());
                var lead = Number($leadInput.val());
                // validation check
                var isValid = xcHelper.validate([
                    {
                        "$selector": $lagInput
                    },
                    {
                        "$selector": $leadInput
                    },
                    {
                        "$selector": $lagInput,
                        "text"     : ErrTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(lag) || !Number.isInteger(lag));
                        }
                    },
                    {
                        "$selector": $lagInput,
                        "text"     : ErrTStr.NoNegativeNumber,
                        "check"    : function() { return (lag < 0); }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(lead) || !Number.isInteger(lead));
                        }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrTStr.NoNegativeNumber,
                        "check"    : function() { return (lead < 0); }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrTStr.NoAllZeros,
                        "check"    : function() {
                            return (lag === 0 && lead === 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }

                ColManager.windowChain(colNum, tableId, lag, lead);
                $lagInput.val("").blur();
                $leadInput.val("").blur();
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

        $subMenu.on('mouseup', '.textAlign', function(event) {
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
            ColManager.textAlign(colNums, tableId, $(this).attr("class"));
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

        $subMenu.on('mouseup', '.extensions', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            var classNames = $(this)[0].className.split(/\s+/);
            for (var i = 0; i < classNames.length; i++) {
                if (classNames[i].indexOf("::") > -1) {
                    ColManager.extension(colNum, tableId, classNames[i]);
                    break;
                }
            }

        });

        $subMenu.on('mouseup', '.typeList', function(event) {
            if (event.which !== 1) {
                return;
            }

            var $li = $(this);
            var colTypeInfos = [];
            var colNum;
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
            xcFunction.sort(colNum, tableId, SortDirection.Forward);
        });

        $subMenu.on('mouseup', 'li.revSort', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            xcFunction.sort(colNum, tableId, SortDirection.Backward);
        });

        $colMenu.on('mouseup', '.joinList', function(event) {
            if (event.which !== 1) {
                return;
            }

            var colNum  = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            JoinModal.show(tableId, colNum);
        });

        $colMenu.on('mouseup', '.functions', function(event) {
            if (event.which !== 1 || $(this).hasClass('unavailable')) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            var func = $(this).text().replace(/\./g, '');
            OperationsModal.show(tableId, colNum, func);
        });

        $colMenu.on('mouseup', '.profile', function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $colMenu.data('colNum');
            var tableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum);
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
            var hasCheckExist = false;
            var colVal;

            $highlightBoxs.each(function() {
                var $td = $(this).closest("td");

                if ($td.find(".undefined").length > 0) {
                    // FNF case
                    hasCheckExist = true;
                    return true; // continue to next iteration
                }

                if ($header.hasClass("type-integer")) {
                    colVal = $td.data("val");
                    if (colVal == null || colVal === "") {
                        hasCheckExist = true;
                        return true; // continue to next iteration
                    }
                    colVal = parseInt(colVal);
                } else if ($header.hasClass("type-float")) {
                    colVal = $td.data("val");
                    if (colVal == null || colVal === "") {
                        hasCheckExist = true;
                        return true; // continue to next iteration
                    }
                    colVal = parseFloat(colVal);
                } else if ($header.hasClass("type-string")) {
                    // colVal = colVal + ""; // if it's number, change to string
                    // XXX for string, text is more reliable
                    // since data-val might be messed up
                    colVal = $td.children(".addedBarTextWrap").text();
                    colVal = JSON.stringify(colVal);
                } else if ($header.hasClass("type-boolean")) {
                    colVal = $td.children(".addedBarTextWrap").text();
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

            if (notValid) {
                $highlightBoxs.remove();
                return;
            }

            var colVals = [];

            for (var val in uniqueVals) {
                colVals.push(val);
            }

            var operator;
            var str = "";
            var len = colVals.length;

            if ($li.hasClass("tdFilter")) {
                operator = "eq";

                if (len > 0) {
                    for (var i = 0; i < len - 1; i++) {
                        str += "or(eq(" + colName + ", " + colVals[i] + "), ";
                    }

                    str += "eq(" + colName + ", " + colVals[len - 1];

                    for (var i = 0; i < len; i++) {
                        str += ")";
                    }
                }

                if (hasCheckExist) {
                    if (len > 0) {
                        str = "or(" + str + ", not(exists(" + colName + ")))";
                    } else {
                        str = "not(exists(" + colName + "))";
                    }
                }
            } else {
                operator = "exclude";

                if (len > 0) {
                    for (var i = 0; i < len - 1; i++) {
                        str += "and(not(eq(" + colName + ", " + colVals[i] + ")), ";
                    }

                    str += "not(eq(" + colName + ", " + colVals[len - 1] + ")";

                    for (var i = 0; i < len; i++) {
                        str += ")";
                    }
                }

                if (hasCheckExist) {
                    if (len > 0) {
                        str = "and(" + str + ", exists(" + colName + "))";
                    } else {
                        str = "exists(" + colName + ")";
                    }
                }
            }

            var options = {
                "operator"    : operator,
                "filterString": str
            };
            xcFunction.filter(colNum - 1, tableId, options);
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
            var isArray = $table.find("th.col" + colNum + " > div")
                                .hasClass('type-array');
            JSONModal.show($td, isArray);
        });

        $cellMenu.on('mouseup', '.tdUnnest', function(event) {
            if (event.which !== 1) {
                return;
            }

            var tableId = $cellMenu.data('tableId');
            var rowNum  = $cellMenu.data('rowNum');
            var colNum  = $cellMenu.data('colNum');
            var $table  = $("#xcTable-" + tableId);
            var $td     = $table.find(".row" + rowNum + " .col" + colNum);
            var isArray = $table.find("th.col" + colNum + " > div")
                                .hasClass('type-array');
            $(".xcTable").find(".highlightBox").remove();
            setTimeout(function() {
               ColManager.unnest($td, isArray);
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
            var cells = sortHightlightCells($highlightBoxs);

            for (var i = 0, len = cells.length; i < len; i++) {
                colVal = cells[i].siblings(".addedBarTextWrap").text();
                valArray.push(colVal);
            }

            copyToClipboard(valArray);
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
            ColManager.unhideCols(columns, tableId, {"autoResize": true});
        });
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

    function sortHightlightCells($highlightBoxes) {
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

    function generateTableMenu() {
        var tableMenuHTML =
        '<div id="tableMenu" class="menu tableMenu" data-submenu="tableSubMenu">' +
            '<ul>' +
                '<li class="archiveTable">' + MenuTStr.Archive + '</li>' +
                '<li class="hideTable">' + MenuTStr.HideTbl + '</li>' +
                '<li class="unhideTable">' + MenuTStr.UnHideTbl + '</li>' +
                // '<li class="deleteTable">' + MenuTStr.DelTbl + '</li>' + XXX temporary
                '<li class="exportTable">' + MenuTStr.ExportTbl + '</li>' +
                /**
                '<li class="visualize">' +
                '    <a href="'+paths.tableau+'" target="_blank" '+
                'style="text-decoration:none;color:#838383">'+
                MenuTStr.Visual + '</a>' +
                '</li>' +
                '<li class="copyColNames">' + MenuTStr.CPColNames + '</li>'+*/
                '<li class="delAllDuplicateCols">' +
                    MenuTStr.DelAllDups +
                '</li>' +
                '<li class="quickAgg parentMenu" data-submenu="quickAgg">' +
                    MenuTStr.QuickAgg +
                '</li>' +
                '<li class="multiCast">' +
                    MenuTStr.SmartCast + "..." +
                '</li>' +
                '<li class="moveToWorksheet parentMenu" ' +
                    'data-submenu="moveToWorksheet" data-toggle="tooltip" ' +
                    'data-placement="top" ' +
                    'title="' + TooltipTStr.NoWSToMV + '">' +
                    MenuTStr.MVWS +
                '</li>' +
                '<li class="sort parentMenu" data-submenu="sort">' +
                    MenuTStr.SortCols +
                '</li>' +
                '<li class="resizeCols parentMenu" data-submenu="resizeCols">' +
                    MenuTStr.ResizeAllCols +
                '</li>' +
            '</ul>' +
            '<div class="scrollArea top">' +
                '<div class="arrow"></div>' +
            '</div>' +
            '<div class="scrollArea bottom">' +
                '<div class="arrow"></div>' +
            '</div>' +
        '</div>';

        var subMenuHTML =
            '<div id="tableSubMenu" class="menu subMenu">' +
                '<ul class="quickAgg">' +
                    '<li class="aggregates">' +
                        MenuTStr.QuckAggaggFunc +
                    '</li>' +
                    '<li class="correlation">' +
                        MenuTStr.QuickAggcorrFunc +
                    '</li>' +
                '</ul>' +
                '<ul class="moveToWorksheet">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<span>' + WSTStr.WSName + '</span>' +
                        '<div class="dropDownList">' +
                            '<input class="wsName" type="text" width="100px" ' +
                            'placeholder="' + CommonTxtTstr.ClickToOpts + '" ' +
                            'spellcheck="false" />' +
                            '<ul class="list wsList"></ul>' +
                        '</div>' +
                    '</li>' +
                    '<div class="subMenuArea"></div>' +
                '</ul>' +
                '<ul class="sort">' +
                    '<li class="sortForward">' +
                        '<span class="sortUp"></span>' + MenuTStr.SortAsc +
                    '</li>' +
                    '<li class="sortReverse">' +
                        '<span class="sortDown"></span>' + MenuTStr.SortDesc +
                    '</li>' +
                    '<div class="subMenuArea"></div>' +
                '</ul>' +
                '<ul class="resizeCols">' +
                    '<li class="sizeToHeader">' +
                        MenuTStr.ResizeHeader +
                    '</li>' +
                    '<li class="sizeToContents">' +
                        MenuTStr.ResizeToContents +
                    '</li>' +
                    '<li class="sizeToFitAll">' +
                        MenuTStr.ResizeToAll +
                    '</li>' +
                    '<div class="subMenuArea"></div>' +
                '</ul>' +
                '<div class="subMenuArea"></div>' +
            '</div>';

        $workspacePanel.append(tableMenuHTML, subMenuHTML);
    }

    function generateColMenu() {
        var types = ['Boolean', 'Integer', 'Float', 'String'];
        var typeMenu = '';

        types.forEach(function(type) {
            typeMenu +=
                '<li class="flexContainer flexRow typeList type-' +
                    type.toLowerCase() + '">' +
                    '<div class="flexWrap flex-left">' +
                        '<span class="type icon"></span>' +
                    '</div>' +
                    '<div class="flexWrap flex-right">' +
                        '<span class="label">' + type + '</span>' +
                    '</div>' +
                '</li>';
        });

        var mainMenuHTML =
            '<div id="colMenu" class="menu mainMenu" data-submenu="colSubMenu">' +
                '<ul>' +
                    '<li class="addColumn parentMenu" data-submenu="addColumn">' +
                        MenuTStr.AddCol +
                    '</li>' +
                    '<li class="deleteColumn">' + MenuTStr.DelCol + '</li>' +
                    '<li class="duplicate">' + MenuTStr.DupCol + '</li>' +
                    '<li class="deleteDuplicates">' +
                        MenuTStr.DelOtherDups +
                    '</li>' +
                    '<li class="hide">' + MenuTStr.HideCol + '</li>' +
                    '<li class="unhide">' + MenuTStr.UnHideCol + '</li>' +
                    '<li class="textAlign parentMenu" data-submenu="textAlign">' +
                        MenuTStr.TxtAlign +
                    '</li>' +
                    '<li class="resize parentMenu" data-submenu="resize">' +
                        MenuTStr.Resize +
                    '</li>' +
                    '<div class="divider identityDivider thDropdown"></div>' +
                    '<li class="rename parentMenu" data-submenu="rename">' +
                        MenuTStr.RenameCol +
                    '</li>' +
                    '<li class="splitCol parentMenu" data-submenu="splitCol">' +
                        MenuTStr.SplitCol +
                    '</li>' +
                    '<li class="hPartition parentMenu" data-submenu="hPartition">' +
                        MenuTStr.HP +
                    '</li>' +
                    '<li class="changeDataType parentMenu" data-submenu="changeDataType">' +
                        MenuTStr.ChangeType +
                    '</li>' +
                    '<li class="window parentMenu" data-submenu="window">' +
                        MenuTStr.Win +
                    '</li>' +
                    '<li class="format parentMenu" data-submenu="format">' +
                        MenuTStr.Format +
                    '</li>' +
                    '<li class="roundToFixed parentMenu" data-submenu="roundToFixed">' +
                        MenuTStr.Round +
                    '</li>' +
                    '<div class="divider functionsDivider"></div>' +
                    '<li class="sort parentMenu" data-submenu="sort">' +
                        MenuTStr.Sort +
                    '</li>' +
                    '<li class="functions aggregate">' +
                        MenuTStr.Agg + "..." +
                    '</li>' +
                    '<li class="functions filter">' +
                        MenuTStr.Flt + "..." +
                    '</li>' +
                    '<li class="functions groupby">' +
                        MenuTStr.GB + "..." +
                    '</li>' +
                    '<li class="functions map">' +
                        MenuTStr.Map + '...' +
                    '</li>' +
                    '<li class="joinList">' +
                        MenuTStr.Join + '...' +
                    '</li>' +
                    '<li class="profile">' +
                        MenuTStr.Profile + '...' +
                    '</li>' +
                    '<div class="divider functionsDivider"></div>' +
                    '<li class="extensions parentMenu" data-submenu="extensions">' +
                        MenuTStr.Exts +
                    '</li>' +
                    '<li class="multiColumn hideColumns">' +
                        MenuTStr.HideColPlura +
                    '</li>' +
                    '<li class="multiColumn unhideColumns">' +
                        MenuTStr.UnHideColPlura +
                    '</li>' +
                    '<li class="multiColumn deleteColumns">' +
                        MenuTStr.DelColPlura +
                    '</li>' +
                    '<li class="multiColumn textAlignColumns parentMenu" data-submenu="multiTextAlign">' +
                        MenuTStr.TxtAlign +
                    '</li>' +
                    '<li class="multiColumn resizeColumns parentMenu" data-submenu="multiResize">' +
                        MenuTStr.Resize +
                    '</li>' +
                    '<li class="multiColumn multiChangeDataType parentMenu" data-submenu="multiChangeDataType">' +
                        MenuTStr.ChangeType +
                    '</li>' +
                '</ul>' +
                '<div class="scrollArea top">' +
                    '<div class="arrow"></div>' +
                '</div>' +
                '<div class="scrollArea bottom">' +
                    '<div class="arrow"></div>' +
                '</div>' +
            '</div>';

        var subMenuHTML =
            '<div id="colSubMenu" class="menu subMenu">' +
                '<ul class="addColumn">' +
                    '<li class="addColumn addColLeft">' +
                        MenuTStr.AddColLeft +
                    '</li>' +
                    '<li class="addColumn addColRight">' +
                        MenuTStr.AddColRight +
                    '</li>' +
                '</ul>' +
                '<ul class="textAlign">' +
                    '<li class="textAlign leftAlign">' +
                        MenuTStr.TxtAlignLeft +
                    '</li>' +
                    '<li class="textAlign centerAlign">' +
                        MenuTStr.TxtAlignCenter +
                    '</li>' +
                    '<li class="textAlign rightAlign">' +
                        MenuTStr.TxtAlignRight +
                    '</li>' +
                    '<li class="textAlign wrapAlign">' +
                        MenuTStr.TxtAlignWrap +
                    '</li>' +
                '</ul>' +
                '<ul class="resize">' +
                    '<li class="resize sizeToHeader">' +
                        MenuTStr.ResizeHeader +
                    '</li>' +
                    '<li class="resize sizeToContents">' +
                        MenuTStr.ResizeToContents +
                    '</li>' +
                    '<li class="resize sizeToFitAll">' +
                        MenuTStr.ResizeToAll +
                    '</li>' +
                '</ul>' +
                '<ul class="extensions">' +
                '</ul>' +
                '<ul class="rename">' +
                    '<li style="text-align: center" class="rename clickable">' +
                        '<div>' +
                            MenuTStr.RenameColTitle +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="colName" type="text"' +
                                ' autocomplete="on" spellcheck="false"/>' +
                            '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
                '<ul class="format">' +
                    '<li class="changeFormat" data-format="percent">' +
                        MenuTStr.Percent +
                    '</li>' +
                    '<li class="changeFormat" data-format="default">' +
                        CommonTxtTstr.BackToOrig +
                    '</li>' +
                '</ul>' +
                '<ul class="roundToFixed">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div title="ex. an input of 2 would change 1.2345 ' +
                        'to 1.23">' +
                            MenuTStr.RoundTitle +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="digitsToRound" type="number" ' +
                                'max="14" min="0" autocomplete="on" ' +
                                'spellcheck="false" />' +
                                '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</li>' +
                    '<div class="divider"></div>' +
                    '<li class="changeRound default">' +
                        CommonTxtTstr.BackToOrig +
                    '</li>' +
                '</ul>' +
                '<ul class="splitCol">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>' +
                            MenuTStr.SplitColDelim +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="delimiter" type="text"' +
                            ' spellcheck="false"/>' +
                            '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            MenuTStr.SplitColNum +
                        '</div>' +
                        '<input class="num" type="number"' +
                            ' placeholder="' + CommonTxtTstr.Optional + '"' +
                            ' spellcheck="false"/>' +
                    '</li>' +
                '</ul>' +
                '<ul class="hPartition">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>' +
                            MenuTStr.HPNum +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="partitionNums" type="number" ' +
                            'placeholder="' + MenuTStr.HPPlaceholder + '" ' +
                            'spellcheck="false"/>' +
                            '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
                '<ul class="changeDataType">' + typeMenu + '</ul>' +
                '<ul class="window">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>' +
                           MenuTStr.WinLag +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="lag" type="number"' +
                            ' spellcheck="false"/>' +
                            '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            MenuTStr.WinLead +
                        '</div>' +
                        '<div class="inputWrap">' +
                            '<input class="lead" type="number"' +
                            ' spellcheck="false"/>' +
                            '<div class="iconWrapper inputAction">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
                '<ul class="sort">' +
                    '<li class="sort">' +
                        '<span class="sortUp"></span>' + MenuTStr.SortAsc +
                    '</li>' +
                    '<li class="revSort">' +
                        '<span class="sortDown"></span>' + MenuTStr.SortDesc +
                    '</li>' +
                '</ul>' +
                '<ul class="multiTextAlign">' +
                    '<li class="textAlign leftAlign">' +
                        MenuTStr.TxtAlignLeft +
                    '</li>' +
                    '<li class="textAlign centerAlign">' +
                        MenuTStr.TxtAlignCenter +
                    '</li>' +
                    '<li class="textAlign rightAlign">' +
                        MenuTStr.TxtAlignRight +
                    '</li>' +
                    '<li class="textAlign wrapAlign">' +
                        MenuTStr.TxtAlignWrap +
                    '</li>' +
                '</ul>' +
                '<ul class="multiResize">' +
                    '<li class="resize sizeToHeader">' +
                        MenuTStr.ResizeHeader +
                    '</li>' +
                    '<li class="resize sizeToContents">' +
                        MenuTStr.ResizeToContents +
                    '</li>' +
                    '<li class="resize sizeToFitAll">' +
                        MenuTStr.ResizeToAll +
                    '</li>' +
                '</ul>' +
                '<ul class="multiChangeDataType">' + typeMenu + '</ul>' +
                '<div class="subMenuArea"></div>' +
            '</div>';

        var cellMenuHTML =
            '<ul id="cellMenu" class="menu">' +
                '<li class="tdFilter">' +
                    MenuTStr.FltCell +
                '</li>' +
                '<li class="tdExclude">' +
                    MenuTStr.ExclCell +
                '</li>' +
                '<li class="tdJsonModal">' +
                    MenuTStr.ExamCell +
                '</li>' +
                '<li class="tdUnnest">' +
                    MenuTStr.PullAllCell +
                '</li>' +
                '<li class="tdCopy">' +
                    MenuTStr.CPCell +
                '</li>' +
            '</ul>';

        $workspacePanel.append(mainMenuHTML, subMenuHTML, cellMenuHTML);
    }

    return (TblMenu);
}({}, jQuery));

