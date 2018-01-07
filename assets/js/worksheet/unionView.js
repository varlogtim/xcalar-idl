window.UnionView = (function(UnionView, $) {
    var $unionView; // $("#unionView")
    var formHelper;
    var isOpen = false;
    // constant
    var validTypes = ["string", "integer", "float", "boolean"];
    var tableInfoLists = [];
    var editingInfo = {};

    UnionView.setup = function() {
        $unionView = $("#unionView");
        var columnPicker = {
            "state": "unionState",
            "noEvent": true,
            "validColTypes": validTypes
        };
        formHelper = new FormHelper($unionView, {
            columnPicker: columnPicker
        });
        addEvents();
    };

    /*
     * options:
     *     restore: boolean, it's a restore case or not
     *     restoreTime: number, restoredTime
     *     prefill: object, prefill info
     */
    UnionView.show = function(tableId, colNums, options) {
        options = options || {};
        var restoreTime = options.restoreTime;
        var restore = options.restore;
        if (restoreTime && restoreTime !== formHelper.getOpenTime()) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            if (!$unionView.hasClass("xc-hidden")) {
                autoResizeView();
            }
            return;
        }
        if (!restore) {
            reset();
            var hiddenCols;
            if (options.prefill) {
                hiddenCols = options.prefill.tableCols[0];
            }
            addTable(tableId, colNums, hiddenCols);
            // wait for open menu panel animation
            setTimeout(function() {
                if (options.prefill) {
                    restorePrefill(options.prefill);
                } else {
                    $unionView.find(".addTable").click();
                }
            }, 1);
        } else {
            autoResizeView();
        }


        isOpen = true;
        formHelper.showView();
        formHelper.setup();
        updateFormTitles(options);
    };

    UnionView.close = function() {
        if (!isOpen) {
            return;
        }

        isOpen = false;
        formHelper.hideView();
        formHelper.clear();
        StatusBox.forceHide(); // hides any error boxes;
        xcTooltip.hideAll();
        autoResizeView({reset: true});
        editingInfo = {};
    };

    function addEvents() {
        $unionView.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $unionView.on("click", ".close", function() {
            UnionView.close();
        });

        $unionView.on("click", ".confirm", function() {
            $(this).blur();
            submitForm();
        });

        $unionView.on("click", ".addTable", function() {
            $(this).blur();
            addTable(null, null);
        });

        $unionView.on("click", ".removeTable", function(event) {
            event.stopPropagation();
            var index = getListIndex($(this));
            removeTable(index);
        });

        $unionView.on("click", ".candidateSection .addCol", function() {
            var $col = $(this).closest(".inputCol");
            var colName = $col.find(".text").text();
            var colType = $col.data("type");
            var index = getListIndex($col);
            addColumn({name: colName, type: colType}, index);
            xcTooltip.hideAll();
        });

        $unionView.on("click", ".removeCol", function() {
            var $col = $(this).closest(".resultCol");
            var colIndex = Number($col.data("index"));
            removeColumn(colIndex);
        });

        var $modeList = $unionView.find(".modeList");
        new MenuHelper($modeList, {
            onSelect: function($li) {
                var mode = $li.text();
                $modeList.find(".text").text(mode);
                $modeList.data("option", $li.attr("name"));
                $unionView.find(".confirm").text(mode.substring(0, mode.indexOf(" (")));
            },
            container: "#unionView",
            bounds: "#unionView"
        }).setupListeners();

        $unionView.on("click", ".focusTable", function() {
            var $input = $(this).closest(".lists").find(".unionTableList .text");
            var tableId = xcHelper.getTableId($input.val());
            xcHelper.centerFocusedTable(tableId, true);
        });

        $unionView.on("input", ".searchArea input", function() {
            var $input = $(this);
            var keyword = $input.val();
            var index = getListIndex($input);
            searchColumn(keyword, index);
        });

        $unionView.on("click", ".focusCol", function() {
            var $div = $(this);
            var tableIndex = getListIndex($div);
            focusOnColumn($div.text(), tableIndex);
        });
    }

    function restorePrefill(options) {
        editingInfo = options;
        for (var i = 1; i < options.sourceTables.length; i++) {
            var tId = xcHelper.getTableId(options.sourceTables[i]);
            addTable(tId, null, options.tableCols[i]);
        }
        var $resultInputs = $unionView.find(".resultInput");
        for (var i = 0; i < options.tableCols[0].length; i++) {
            $resultInputs.eq(i).val(options.tableCols[0][i].rename);
        }
        $unionView.find(".newTableName").val(options.dest);
    }

    function searchColumn(keyword, index) {
        var $inputs = $unionView.find('.lists[data-index="' + index + '"]')
                                .find(".inputCol .text");
        $inputs.removeClass("highlight");
        if (!keyword) {
            return;
        }
        $inputs.filter(function() {
            return $(this).text().includes(keyword);
        }).addClass("highlight");
    }

    function focusOnColumn(colName, tableIndex) {
        var tableId = tableInfoLists[tableIndex].tableId;
        if (colName != null) {
            var colNum = gTables[tableId].getColNumByBackName(colName);
            formHelper.focusOnColumn(tableId, colNum);
        }
    }

    function addTable(tableId, colNums, colInfos) {
        colNums = colNums || [];
        var tableInfo = {
            tableId: tableId,
            selectedCols: []
        };

        if (tableId != null) {
            var table = gTables[tableId] || gDroppedTables[tableId];
            if (colInfos) {
                tableInfo.selectedCols = colInfos.map(function(colInfo) {
                    return {
                        name: colInfo.name,
                        type: colInfo.type
                    };
                });
            } else {
                tableInfo.selectedCols = colNums.map(function(colNum) {
                    var progCol = table.getCol(colNum);
                    return {
                        name: progCol.getBackColName(),
                        type: progCol.getType()
                    };
                });
            }

        }
        tableInfoLists.push(tableInfo);
        updateList();
        autoResizeView({addTable: true});
    }

    function selectTable(tableId, tableIndex) {
        tableInfoLists[tableIndex] = {
            tableId: tableId,
            selectedCols: []
        };
        updateList();
    }

    function removeTable(tableIndex) {
        tableInfoLists.splice(tableIndex, 1);
        updateList();
        autoResizeView({removeTable: true});
    }

    function addColumn(colInfo, tableIndex) {
        tableInfoLists[tableIndex].selectedCols.push(colInfo);
        updateList();
    }

    function removeColumn(colIndex) {
        var $result = $unionView.find(".resultSection .listSection");
        $result.find(".lists").each(function() {
            var $lists = $(this);
            $lists.find(".resultCol").eq(colIndex).remove();
            $lists.find(".inputCol").eq(colIndex).remove();
        });

        tableInfoLists.forEach(function(tableInfo) {
            tableInfo.selectedCols.splice(colIndex, 1);
        });
        updateList();
    }

    function selectColumn(colInfo, colIndex, tableIndex) {
        tableInfoLists[tableIndex].selectedCols[colIndex] = colInfo;
        if (colInfo.used != null) {
            tableInfoLists[tableIndex].selectedCols[colInfo.used] = null;
        }
        updateList();
    }

    function updateList() {
        var $table = $unionView.find(".tableSection .listSection");
        var $result = $unionView.find(".resultSection .listSection");
        var $candidate = $unionView.find(".candidateSection .listSection");
        var resultCols = [];
        var newTableName = $unionView.find(".newTableName").val();
        // the resultCol inputs is the first thing to follow
        $result.find(".lists:first-child .resultCol").each(function(index) {
            var $col = $(this);
            var type = $col.data("type");
            if (type) {
                resultCols[index] = {
                    name: $col.find("input").val(),
                    type: type
                };
            }
        });

        tableInfoLists.forEach(function(tableIfo) {
            tableIfo.selectedCols.forEach(function(colInfo, index) {
                // use the first col that is not empty as resultCol
                resultCols[index] = resultCols[index] || colInfo;
            });
        });

        var tableHTML = '<div class="lists newTable">' +
                            '<div class="topPart">' +
                                UnionTStr.UnionTable +
                            '</div>' +
                            '<input class="newTableName bottomPart" type="text"' +
                            ' placeholder="' + UnionTStr.NewTableName + '"' +
                            ' spellcheck="false">' +
                        '</div>';
        var resultHTML = getNewTableColNameList(resultCols);
        var candidateHTML = '<div class="lists newTable">' +
                                UnionTStr.CandidateHint +
                            '</div>';

        tableInfoLists.forEach(function(tableInfo, index) {
            tableHTML += getTableList(tableInfo, index);
            resultHTML += getResultList(tableInfo, resultCols, index);
            var hiddenCols;
            if (editingInfo.tableCols) {
                hiddenCols = editingInfo.tableCols[index];
            }
            candidateHTML += getCandidateList(tableInfo, index, hiddenCols);
        });

        $table.html(tableHTML);
        $result.html(resultHTML);
        $candidate.html(candidateHTML);
        $unionView.find(".newTableName").val(newTableName);
        setupDrodownList();
    }

    function autoResizeView(options) {
        options = options || {};
        var $mainMenu = $("#mainMenu");
        var sectionW = parseFloat($unionView.find(".lists").eq(0).css("min-width")) + 5;
        var minWidth = parseFloat($mainMenu.css("min-width"));
        var width;
        if (options.reset) {
            $mainMenu.width(minWidth);
        } else {
            width = minWidth + Math.max(0, tableInfoLists.length - 1) * sectionW;
            width = Math.min(width, $("#workspacePanel").width() * 0.5);

            var currentW = $mainMenu.width();
            var shouldNotResize = (options.addTable && currentW >= width) ||
                                  (options.removeTable && currentW <= width);
            if (!shouldNotResize) {
                $mainMenu.width(width);
            }
        }
    }

    function setupDrodownList() {
        $unionView.find(".unionTableList").each(function() {
            var $dropDownList = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    var tableLis = WSManager.getTableList();
                    $dropDownList.find("ul").html(tableLis);
                },
                onSelect: function($li) {
                    var tableName = $li.text();
                    var $text = $dropDownList.find(".text");
                    if (tableName === $text.val()) {
                        return;
                    }
                    $text.val(tableName);
                    selectTable($li.data("id"), getListIndex($li));
                    xcTooltip.hideAll();
                },
                container: "#unionView",
                bounds: "#unionView"
            }).setupListeners();
        });

        $unionView.find(".columnList").each(function() {
            var $dropDownList = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    getCandidateDropdownList($dropDownList);
                },
                onSelect: function($li) {
                    var colName = $li.text();
                    var $text = $dropDownList.find(".text");
                    if (colName === $text.text()) {
                        return;
                    }
                    var tableIndex = getListIndex($dropDownList);
                    var colIndex = Number($dropDownList.data("index"));
                    var colInfo = {
                        name: colName,
                        type: $li.data("type"),
                        used: Number($li.data("used"))
                    };
                    selectColumn(colInfo, colIndex, tableIndex);
                    xcTooltip.hideAll();
                },
                onlyClickIcon: true,
                container: "#unionView .middleSection",
                bounds: "#unionView .middleSection"
            }).setupListeners();
        });

        $unionView.find(".typeList").each(function() {
            var $dropDownList = $(this);
            new MenuHelper($dropDownList, {
                onSelect: function($li) {
                    var type = $li.text();
                    $dropDownList.find(".text").val($li.text());
                    $dropDownList.closest(".resultCol")
                                 .attr("data-type", type)
                                 .data("type", type);
                    xcTooltip.hideAll();
                },
                container: "#unionView .middleSection",
                bounds: "#unionView .middleSection"
            }).setupListeners();
        });
    }

    function getListIndex($ele) {
        var index = $ele.closest(".lists").data("index");
        return Number(index);
    }

    function getTableList(tableInfo, index) {
        var tableId = tableInfo.tableId;
        var table = gTables[tableId] || gDroppedTables[tableId];
        var isEmpty = (tableId == null);
        var tableName = isEmpty ? "" : table.getName();
        var focusTableClass = isEmpty ? " xc-disabled" : "";
        var tooltip = TooltipTStr.UnionFocus;
        if (isEmpty) {
            tooltip = TooltipTStr.UnionFocusSelect;
        }
        return ('<div class="lists" data-index="' + index + '">' +
                    '<div class="topPart">' +
                        '<span>' + UnionTStr.Table + " " + (index + 1) +
                        '</span>' +
                        '<i class="removeTable icon xi-close-no-circle' +
                        ' xc-action fa-12" data-original-title="' +
                        TooltipTStr.UnionDeleteTable +
                        '" data-toggle="tooltip"></i>' +
                        '<div class="tooltipWrapper" data-toggle="tooltip" ' +
                        'data-original-title="' + tooltip +'">' +
                        '<i class="focusTable icon xi-show xc-action' +
                        ' fa-16' + focusTableClass + '"></i>' +
                        '</div>' +
                    '</div>' +
                    '<div class="dropDownList unionTableList bottomPart">' +
                        '<input class="text" value="' + tableName + '" ' +
                        'placeholder="' + SideBarTStr.SelectTable + '" disabled>' +
                        '<div class="iconWrapper">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul></ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>');
    }

    function getNewTableColNameList(resultCols) {
        var resultColHTML = "";
        var nameMap = {};
        var checkName = function(name) {
            return !nameMap.hasOwnProperty(name);
        };

        resultCols.forEach(function(resultCol, colIndex) {
            var colType = resultCol.type;
            var colName = resultCol.name;

            colName = xcHelper.parsePrefixColName(colName).name;
            colName = xcHelper.uniqueName(colName, checkName);
            nameMap[colName] = true;

            resultColHTML +=
                '<div class="resultCol"' +
                ' data-type="' + colType + '"' +
                ' data-index="' + colIndex + '">' +
                    '<input class="resultInput" type="text"' +
                    ' value="' + colName + '"' +
                    ' placeholder="' + UnionTStr.NewColName + '">' +
                    '<i class="removeCol icon xi-close-no-circle' +
                    ' xc-action fa-10"></i>' +
                    '<div class="dropDownList typeList">' +
                        '<input class="text" placeholder="' +
                        UnionTStr.ChooseType + '" disabled>' +
                        '<div class="iconWrapper">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul>' +
                                '<li>' + ColumnType.boolean + '</li>' +
                                '<li>' + ColumnType.float + '</li>' +
                                '<li>' + ColumnType.integer + '</li>' +
                                '<li>' + ColumnType.string + '</li>' +
                            '</ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });

        return '<div class="lists newTable">' +
                    '<div class="searchArea placeholder"></div>' +
                    resultColHTML +
                '</div>';
    }

    function getResultList(tableInfo, resultCols, index) {
        var tableId = tableInfo.tableId;
        var selectedCols = tableInfo.selectedCols;
        var selectedColLen = selectedCols.length;
        var lists = '<div class="searchArea">' +
                        '<input type="text" spellcheck="false"' +
                        'placeholder="' + UnionTStr.SearchCol + '">' +
                        '<i class="icon xi-search fa-13" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' + TooltipTStr.UnionSearch +
                        '"></i>' +
                    '</div>';

        resultCols.forEach(function(resultCol, colIndex) {
            if (colIndex >= selectedColLen) {
                // placeholder
                selectedCols[colIndex] = null;
            }
        });

        resultCols.forEach(function(resultCol, colIndex) {
            var innerHTML = "";
            if (selectedCols[colIndex] != null) {
                var inputColName = selectedCols[colIndex].name;
                innerHTML = '<div class="text focusCol textOverflowOneLine' +
                            ' tooltipOverflow"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + inputColName + '">' +
                                inputColName +
                            '</div>' +
                            '<div class="iconWrapper down xc-action">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>';
            } else {
                innerHTML = '<div class="text"></div>';
                if (tableId != null) {
                    innerHTML += '<div class="iconWrapper down xc-action">' +
                                    '<i class="icon xi-arrow-down"></i>' +
                                '</div>';
                }
            }

            if (tableId != null) {
                // add dropdown list
                innerHTML += '<div class="list">' +
                                '<ul></ul>' +
                                '<div class="scrollArea top">' +
                                    '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                    '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>';
            }

            lists += '<div class="inputCol dropDownList columnList" ' +
                    'data-index="' + colIndex + '">' +
                        innerHTML +
                    '</div>';
        });

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    function getCandidateList(tableInfo, index, hiddenCols) {
        var tableId = tableInfo.tableId;
        var lists = "";

        if (tableId != null) {
            var candidateCols = getCandidateCols(tableInfo, false, hiddenCols);
            lists = candidateCols.map(function(col) {
                var colType = col.type;
                var colName = col.name;
                return '<div class="inputCol" data-type="' + colType + '">' +
                            '<i class="addCol icon xi-plus xc-action"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + UnionTStr.AddCol + '"' +
                            '></i>' +
                            '<div class="text focusCol textOverflowOneLine tooltipOverflow"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + colName + '">' +
                                colName +
                            '</div>' +
                        '</div>';
            }).join("");
        }

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    function getCandidateCols(tableInfo, includeAll, hiddenCols) {
        var candidateCols = [];
        var tableId = tableInfo.tableId;
        if (tableId == null) {
            return candidateCols;
        }

        var selectedColNameMap = {};
        var $resultInputs = $unionView.find(".resultInput");
        tableInfo.selectedCols.forEach(function(col, index) {
            if (col != null) {
                if (includeAll) {
                    selectedColNameMap[col.name] = {
                        name: $resultInputs.eq(index).val(),
                        index: index
                    };
                } else {
                    selectedColNameMap[col.name] = true;
                }
            }
        });

        var table = gTables[tableId] || gDroppedTables[tableId];
        var used = {};

        table.tableCols.forEach(function(progCol) {
            var colName = progCol.getBackColName();
            var colType = progCol.getType();
            if (validTypes.includes(colType)) {
                if (!selectedColNameMap.hasOwnProperty(colName)) {
                    candidateCols.push({
                        name: colName,
                        type: colType
                    });
                    used[colName] = true;
                } else if (includeAll) {
                    candidateCols.push({
                        name: colName,
                        type: colType,
                        used: selectedColNameMap[colName]
                    });
                    used[colName] = true;
                }
            }
        });
        if (hiddenCols) {
            hiddenCols.forEach(function(col) {
                var colName = col.name;
                var colType = col.type;
                if (used[colName]) {
                    return;
                }

                if (validTypes.includes(colType)) {
                    if (!selectedColNameMap.hasOwnProperty(colName)) {
                        candidateCols.push({
                            name: colName,
                            type: colType
                        });
                    } else if (includeAll) {
                        candidateCols.push({
                            name: colName,
                            type: colType,
                            used: selectedColNameMap[colName]
                        });
                    }
                }
            });
        }
        return candidateCols;
    }

    function getCandidateDropdownList($dropDownList) {
        var index = getListIndex($dropDownList);
        var editCols;
        if (editingInfo.tableCols) {
            editCols = editingInfo.tableCols[index];
        }
        var candidateCols = getCandidateCols(tableInfoLists[index], true, editCols);
        var ul = candidateCols.map(function(col) {
            var isUsed = (col.used != null);
            var extraClass;
            var title;
            if (isUsed) {
                extraClass = "used";
                title = xcHelper.replaceMsg(UnionTStr.UsedFor, {
                    col: col.used.name
                });
            } else {
                extraClass = "tooltipOverflow";
                title = col.name;
            }
            return '<li class="type-' + col.type + ' ' + extraClass + '"' +
                    ' data-type="' + col.type + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-title="' + title + '"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    (isUsed ? ' data-used="' + col.used.index + '"' : '') +
                    '>' +
                        col.name +
                    '</li>';
        });
        if (candidateCols.length === 0) {
            ul = '<div class="hint">' +
                    UnionTStr.EmptyList +
                '</div>';
        }
        $dropDownList.find("ul").html(ul);
    }

    function reset() {
        $unionView.find(".newTableName").val("");
        $unionView.find(".listSection").empty();
        $unionView.find(".modeList li:first-child").trigger(fakeEvent.mouseup);
        $unionView.find(".searchArea input").val("");
        $unionView.find(".highlight").removeClass("highlight");
        tableInfoLists = [];
        editingInfo = {};
    }

    function submitForm() {
        if (!validate()) {
            return;
        }

        var resultCols = [];
        $unionView.find(".resultCol").each(function() {
            var $resultCol = $(this);
            var index = Number($resultCol.data("index"));
            resultCols[index] = {
                name: $resultCol.find(".resultInput").val(),
                type: $resultCol.data("type")
            };
        });

        var tableInfos = [];
        tableInfoLists.forEach(function(tableInfo) {
            var tableId = tableInfo.tableId;
            if (tableId == null) {
                return;
            }
            var table = gTables[tableId] || gDroppedTables[tableId];
            var tableName = table.getName();
            var columns = tableInfo.selectedCols.map(function(col, index) {
                var cast = false;
                var name = null;
                if (col != null) {
                    cast = (col.type !== resultCols[index].type);
                    name = col.name;
                }

                return {
                    name: name,
                    rename: resultCols[index].name,
                    type: resultCols[index].type,
                    cast: cast
                };
            });

            tableInfos.push({
                tableName: tableName,
                columns: columns
            });
        });

        var newTableName = $unionView.find(".newTableName").val();
        var dedup = ($unionView.find(".modeList").data("option") === "union");
        var options = {
            "formOpenTime": formHelper.getOpenTime()
        };

        if (DagEdit.isEditMode()) {
            var columns = [];
            for (var i = 0; i < tableInfos.length; i++) {
                var columnSet = [];
                for (var j = 0; j < tableInfos[i].columns.length; j++) {
                    var type = xcHelper.convertColTypeToFeildType(tableInfos[i]
                                                            .columns[j].type);
                    type = DfFieldTypeTStr[type];
                    columnSet.push({
                        "sourceColumn": tableInfos[i].columns[j].name,
                        "destColumn": tableInfos[i].columns[j].rename,
                        "columnType": type
                    });
                }
                columns.push(columnSet);
            }
            DagEdit.store({
                args: {
                    columns: columns
                }
            });
        } else {
            xcFunction.union(tableInfos, dedup, newTableName, options);
        }


        UnionView.close();
    }

    function validate() {
        var isValid = true;
        var $unionTableList = $unionView.find(".unionTableList");
        isValid = xcHelper.validate([{
            $ele: $unionView.find(".addTable"),
            error: UnionTStr.OneTableToUnion,
            check: function() { return $unionTableList.length <= 1; }
        }]);
        if (!isValid) {
            return false;
        }

        var tableNameValids = [];
        $unionTableList.each(function() {
            tableNameValids.push({$ele: $(this).find(".text")});
        });
        if (!xcHelper.validate(tableNameValids)) {
            return false;
        }

        isValid = xcHelper.validate([{
            $ele: $unionView.find(".newTableName")
        }]);

        if (!isValid) {
            return false;
        }

        var $columnLists = $unionView.find(".columnList .text");
        var $notEmptyCol = $columnLists.filter(function() {
            return ($(this).text() !== "");
        });
        if ($notEmptyCol.length === 0) {
            StatusBox.show(UnionTStr.SelectCol, $unionView.find(".resultSection"));
            return false;
        }

        var newColumnValids = [];
        $unionView.find(".resultInput").each(function() {
            newColumnValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(newColumnValids)) {
            return false;
        }

        var typeValids = [];
        $unionView.find(".resultCol.cast .typeList .text").each(function() {
            typeValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(typeValids)) {
            return false;
        }

        // validate types
        var columns = tableInfoLists[0].selectedCols;
        for (var i = 0; i < columns.length; i++) {
            var columnInfo = null;
            var $resultCol = $unionView.find('.resultCol[data-index="' + i + '"]');
            for (var j = 0; j < tableInfoLists.length; j++) {
                if (tableInfoLists[j].selectedCols[i] != null) {
                    if (columnInfo == null) {
                        columnInfo = tableInfoLists[j].selectedCols[i];
                    } else if (columnInfo.type !==
                              tableInfoLists[j].selectedCols[i].type &&
                              !$resultCol.hasClass("cast")) {
                        if (DagEdit.isEditMode()) {
                            // not allowed to cast when editing
                            StatusBox.show(UnionTStr.TypeMismatch,
                                           $unionView.find('.inputCol[data-index="' +
                                                            i + '"]').eq(0));
                        } else {
                            $resultCol.addClass("cast");
                            $unionView.find('.columnList[data-index="' + i + '"]')
                                  .addClass("cast");
                            StatusBox.show(UnionTStr.Cast,
                                           $resultCol.find(".typeList"));
                        }

                        return false;
                    }
                }
            }
        }

        return isValid;
    }

    function updateFormTitles(options) {
        var titleName = "Union";
        var submitText;
        if (options.prefill) {
            titleName = "EDIT " + titleName;
            submitText = "SAVE";
        } else {
            submitText = titleName.toUpperCase() + " ALL";
        }
        $unionView.find('.title').text(titleName);
        $unionView.find('.confirm').text(submitText);
    }

    return UnionView;
}({}, jQuery));