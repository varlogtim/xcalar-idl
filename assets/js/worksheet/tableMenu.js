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
            TblManager.archiveTable(tableId, {"del": ArchiveTable.Keep});
            // add sql
            SQL.add('Archive Table', {
                "operation": SQLOps.ArchiveTable,
                "tableId"  : tableId,
                "tableName": gTables[tableId].tableName
            });
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

            var msg = "Are you sure you want to delete table " + tableName + "?";
            Alert.show({
                "title"     : "DELETE TABLE",
                "msg"       : msg,
                "isCheckBox": true,
                "confirm"   : function() {
                    TblManager.deleteTable(tableId, TableType.Active)
                    .then(function() {
                        commitToStorage();
                    })
                    .fail(function(error) {
                        Alert.error("Delete Table Fails", error);
                    });
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
                        "text"     : ErrorTextTStr.InvalidWSInList,
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
        //             "text"     : ErrorTextTStr.InvalidWSInList,
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

        $subMenu.on('keypress', '.rename input', function(event) {
            if (event.which === keyCode.Enter) {
                var $input  = $(this);
                var tableId = $colMenu.data('tableId');
                var colName = $input.val().trim();
                var colNum  = $colMenu.data('colNum');

                if (colName === "" ||
                    ColManager.checkColDup($input, null, tableId, false, colNum))
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
                StatusBox.show(ErrorTextWReplaceTStr.InvalidRange
                                                    .replace("<num1>", 0)
                                                    .replace("<num2>", 14),
                                                    $(this), null, null,
                                                    {"side": "left", "closeable": true});
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
                        StatusBox.show(ErrorTextTStr.NoEmpty, $delimInput, null,
                                        null, {closeable: true});
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
                            "text"     : ErrorTextTStr.OnlyNumber,
                            "check"    : function() {
                                return (isNaN(numColToGet) ||
                                        !Number.isInteger(numColToGet));
                            }
                        },
                        {
                            "$selector": $numInput,
                            "text"     : ErrorTextTStr.OnlyPositiveNumber,
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
                var isValid = xcHelper.validate([
                    {
                        "$selector": $input,
                        "text"     : ErrorTextTStr.OnlyNumber
                    },
                    {
                        "$selector": $input,
                        "text"     : ErrorTextTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(partitionNums) ||
                                    !Number.isInteger(partitionNums));
                        }
                    },
                    {
                        "$selector": $input,
                        "text"     : ErrorTextWReplaceTStr.InvalidRange
                                    .replace("<num1>", 1).replace("<num2>", 10),
                        "check": function() {
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
                        "text"     : ErrorTextTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(lag) || !Number.isInteger(lag));
                        }
                    },
                    {
                        "$selector": $lagInput,
                        "text"     : ErrorTextTStr.NoNegativeNumber,
                        "check"    : function() { return (lag < 0); }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrorTextTStr.OnlyNumber,
                        "check"    : function() {
                            return (isNaN(lead) || !Number.isInteger(lead));
                        }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrorTextTStr.NoNegativeNumber,
                        "check"    : function() { return (lead < 0); }
                    },
                    {
                        "$selector": $leadInput,
                        "text"     : ErrorTextTStr.NoAllZeros,
                        "check"    : function() {
                            return (lag === 0 && lead === 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }

                ColManager.windowCalc(colNum, tableId, lag, lead);
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
            ColManager.unhideCols([colNum], tableId, {"autoResize": true});
        });

        $subMenu.on('mouseup', '.textAlign', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var colNum;
            if ($li.closest('.multiTextAlign').length !== 0) {
                colNum = $colMenu.data('columns');
            } else {
                colNum = $colMenu.data('colNum');
            }
            var tableId = $colMenu.data('tableId');
            ColManager.textAlign(colNum, tableId, $(this).attr("class"));
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
            ColManager.changeType(colTypeInfos, tableId);
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

                if ($header.hasClass("type-integer")) {
                    colVal = $td.data("val");
                    if (colVal === "") {
                        hasCheckExist = true;
                        return true; // continue to next iteration
                    }
                    colVal = parseInt(colVal);
                } else if ($header.hasClass("type-float")) {
                    colVal = $td.data("val");
                    if (colVal === "") {
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
               unnest($td, isArray);
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

    function generateTableMenu() {
        var tableMenuHTML =
            '<div id="tableMenu" class="menu tableMenu" data-submenu="tableSubMenu">' +
            '<ul>' +
                '<li class="archiveTable">Archive Table</li>' +
                '<li class="hideTable">Hide Table</li>' +
                '<li class="unhideTable">Unhide Table</li>' +
                // '<li class="deleteTable">Delete Table</li>' + XXX temporary
                '<li class="exportTable">Export Table</li>' +
                /**
                '<li class="visualize">' +
                '    <a href="'+paths.tableau+'" target="_blank" '+
                'style="text-decoration:none;color:#838383">'+
                'Visualize in Tableau</a>' +
                '</li>' +
                '<li class="copyColNames">Copy Column Names</li>'+*/
                '<li class="delAllDuplicateCols">Delete All Duplicates</li>' +
                '<li class="quickAgg parentMenu" data-submenu="quickAgg">' +
                    'Quick Aggregates' +
                '</li>' +
                '<li class="multiCast">Smart Type Casting...</li>' +
                '<li class="moveToWorksheet parentMenu" ' +
                    'data-submenu="moveToWorksheet" data-toggle="tooltip" ' +
                    'data-placement="top" title="no worksheet to move to">' +
                    'Move to worksheet' +
                '</li>' +
                '<li class="sort parentMenu" data-submenu="sort">Sort Columns' +
                '</li>' +
                '<li class="resizeCols parentMenu" data-submenu="resizeCols">' +
                    'Resize All Columns' +
                '</li>' +
                // XX copy to worksheet is temporarily disabled until we can do
                // an actual copy of a table

                // '<li class="dupToWorksheet">' +
                //     '<span class="label">Copy to worksheet</span>' +
                //     '<ul class="subMenu">' +
                //         '<li style="text-align: center" class="clickable">' +
                //             '<span>Worksheet Name</span>' +
                //             '<div class="dropDownList">' +
                //                 '<input class="wsName" type="text" width="100px" ' +
                //                     'placeholder="click to see options" ' +
                //                     'spellcheck="false"/>' +
                //                 '<ul class="list wsList"></ul>' +
                //             '</div>' +
                //         '</li>' +
                //         '<li style="text-align: center" class="clickable">' +
                //             '<span>New Table Name</span>' +
                //             '<input class="tableName" type="text" width="100px" ' +
                //                     'placeholder="Enter a new table name" ' +
                //                     'spellcheck="false" ' +
                //                     'value="' + newTableName + '"/>' +
                //         '</li>' +
                //         '<div class="subMenuArea"></div>' +
                //     '</ul>' +
                //     '<div class="dropdownBox"></div>' +
                // '</li>' +
            '</ul>' +
            '<div class="scrollArea top"><div class="arrow"></div></div>' +
            '<div class="scrollArea bottom"><div class="arrow"></div></div>' +
            '</div>';

        var subMenuHTML =
            '<div id="tableSubMenu" class="menu subMenu">' +
                '<ul class="quickAgg">' +
                    '<li class="aggregates">Aggregate Functions</li>' +
                    '<li class="correlation">Correlation Coefficient</li>' +
                '</ul>' +
                '<ul class="moveToWorksheet">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<span>Worksheet Name</span>' +
                        '<div class="dropDownList">' +
                            '<input class="wsName" type="text" width="100px" ' +
                                'placeholder="click to see options" ' +
                                'spellcheck="false" />' +
                            '<ul class="list wsList"></ul>' +
                        '</div>' +
                    '</li>' +
                    '<div class="subMenuArea"></div>' +
                '</ul>' +
                '<ul class="sort">' +
                    '<li class="sortForward">' +
                        '<span class="sortUp"></span>A-Z</li>' +
                    '<li class="sortReverse">' +
                        '<span class="sortDown"></span>Z-A</li>' +
                    '<div class="subMenuArea"></div>' +
                '</ul>' +
                '<ul class="resizeCols">' +
                    '<li class="sizeToHeader">Size To Headers</li>' +
                    '<li class="sizeToContents">Size To Contents</li>' +
                    '<li class="sizeToFitAll">Size To Fit All</li>' +
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
                        'Add a column' +
                    '</li>' +
                    '<li class="deleteColumn">Delete column</li>' +
                    '<li class="duplicate">Duplicate column</li>' +
                    '<li class="deleteDuplicates">' +
                        'Delete other duplicates' +
                    '</li>' +
                    '<li class="hide">Hide column</li>' +
                    '<li class="unhide">Unhide column</li>' +
                    '<li class="textAlign parentMenu" data-submenu="textAlign">' +
                        'Text align' +
                    '</li>' +
                    '<div class="divider identityDivider thDropdown"></div>' +
                    '<li class="rename parentMenu" data-submenu="rename">' +
                        'Rename column' +
                    '</li>' +
                    '<li class="splitCol parentMenu" data-submenu="splitCol">' +
                        'Split column' +
                    '</li>' +
                    '<li class="hPartition parentMenu" data-submenu="hPartition">' +
                        'Horizontal Partition' +
                    '</li>' +
                    '<li class="changeDataType parentMenu" data-submenu="changeDataType">' +
                        'Change data type' +
                    '</li>' +
                    '<li class="window parentMenu" data-submenu="window">' +
                        'Window' +
                    '</li>' +
                    '<li class="format parentMenu" data-submenu="format">' +
                        'Format' +
                    '</li>' +
                    '<li class="roundToFixed parentMenu" data-submenu="roundToFixed">' +
                        'Round' +
                    '</li>' +
                    '<div class="divider functionsDivider"></div>' +
                    '<li class="sort parentMenu" data-submenu="sort">' +
                        'Sort' +
                    '</li>' +
                    '<li class="functions aggregate">Aggregate...</li>' +
                    '<li class="functions filter">Filter...</li>' +
                    '<li class="functions groupby">Group By...</li>' +
                    '<li class="functions map">Map...</li>' +
                    '<li class="joinList">Join...</li>' +
                    '<li class="profile">Profile...</li>' +
                    '<li class="multiColumn hideColumns">Hide Columns</li>' +
                    '<li class="multiColumn unhideColumns">Unhide Columns</li>' +
                    '<li class="multiColumn deleteColumns">Delete Columns</li>' +
                    '<li class="multiColumn textAlignColumns parentMenu" data-submenu="multiTextAlign">' +
                        'Text align' +
                    '</li>' +
                    '<li class="multiColumn multiChangeDataType parentMenu" data-submenu="multiChangeDataType">' +
                        'Change data type' +
                    '</li>' +
                    '<li class="tdFilter tdDropdown">Filter this value</li>' +
                    '<li class="tdExclude tdDropdown">Exclude this value</li>' +
                    '<li class="tdJsonModal tdDropdown">Examine</li>' +
                    '<li class="tdUnnest tdDropdown">Pull all</li>' +
                    '<li class="tdCopy tdDropdown">Copy to clipboard</li>' +
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
                    'On the left</li>' +
                    '<li class="addColumn addColRight">On the right</li>' +
                '</ul>' +
                '<ul class="textAlign">' +
                    '<li class="textAlign leftAlign">Left Align</li>' +
                    '<li class="textAlign centerAlign">Center Align</li>' +
                    '<li class="textAlign rightAlign">Right Align</li>' +
                '</ul>' +
                '<ul class="rename">' +
                    '<li style="text-align: center" class="rename clickable">' +
                        '<span>New Column Name</span>' +
                        '<div class="listSection">' +
                            '<input class="colName" type="text"' +
                                ' autocomplete="on" spellcheck="false"/>' +
                        '</div>' +
                    '</li>' +
                '</ul>' +
                '<ul class="format">' +
                    '<li class="changeFormat" data-format="percent">Percent</li>' +
                    '<li class="changeFormat" data-format="default">Back to original</li>' +
                '</ul>' +
                '<ul class="roundToFixed">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<span title="ex. an input of 2 would change 1.2345 ' +
                        'to 1.23">Num. of decimals to keep</span>' +
                        '<div class="listSection">' +
                            '<input class="digitsToRound" type="number"' +
                                ' max="14" min="0" autocomplete="on" ' +
                                'spellcheck="false" />' +
                        '</div>' +
                    '</li>' +
                    '<div class="divider"></div>' +
                    '<li class="changeRound default">Back to original</li>' +
                '</ul>' +
                '<ul class="splitCol">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>Split Column By</div>' +
                        '<input class="delimiter" type="text"' +
                            ' spellcheck="false"/>' +
                        '<div>Number of Split Columns</div>' +
                        '<input class="num" type="number" min="1" step="1"' +
                            ' placeholder="Unlimited if left blank"' +
                            ' spellcheck="false"/>' +
                    '</li>' +
                '</ul>' +
                '<ul class="hPartition">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>Number of partitions</div>' +
                        '<input class="partitionNums" type="number"' +
                        ' placeholder="Max value of 10" spellcheck="false"/>' +
                    '</li>' +
                '</ul>' +
                '<ul class="changeDataType">' + typeMenu + '</ul>' +
                '<ul class="window">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<div>Lag</div>' +
                        '<input class="lag" type="number"' +
                        ' spellcheck="false"/>' +
                        '<div>Lead</div>' +
                        '<input class="lead" type="number"' +
                        ' spellcheck="false"/>' +
                    '</li>' +
                '</ul>' +
                '<ul class="sort">' +
                    '<li class="sort">' +
                    '<span class="sortUp"></span>A-Z</li>' +
                    '<li class="revSort">' +
                    '<span class="sortDown"></span>Z-A</li>' +
                '</ul>' +
                '<ul class="multiTextAlign">' +
                    '<li class="textAlign leftAlign">Left Align</li>' +
                    '<li class="textAlign centerAlign">Center Align</li>' +
                    '<li class="textAlign rightAlign">Right Align</li>' +
                '</ul>' +
                '<ul class="multiChangeDataType">' + typeMenu + '</ul>' +
                '<div class="subMenuArea"></div>' +
            '</div>';

        var cellMenuHTML =
            '<ul id="cellMenu" class="menu">' +
                '<li class="tdFilter">Filter this value</li>' +
                '<li class="tdExclude">Exclude this value</li>' +
                '<li class="tdJsonModal">Examine</li>' +
                '<li class="tdUnnest">Pull all</li>' +
                '<li class="tdCopy">Copy to clipboard</li>' +
            '</ul>';

        $workspacePanel.append(mainMenuHTML, subMenuHTML, cellMenuHTML);
    }

    return (TblMenu);
}({}, jQuery));

