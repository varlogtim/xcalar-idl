window.UnionView = (function(UnionView, $) {
    var $unionView; // $("#unionView")
    var formHelper;
    var isOpen = false;
    // constant
    var validTypes = ["string", "integer", "float", "boolean"];
    var tableInfoLists = [];

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

    UnionView.show = function(tableId, colNums, options) {
        options = options || {};
        var restoreTime = options.restoreTime;
        var restore = options.restore;
        if (restoreTime && restoreTime !== formHelper.getOpenTime()) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            autoResizeView();
            return;
        }
        if (!restore) {
            reset();
            addTable(tableId, colNums);
        }

        isOpen = true;
        formHelper.showView();
        formHelper.setup();
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
        autoResizeView(true);
    };

    function addEvents() {
        $unionView.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $unionView.on("click", ".close", function() {
            UnionView.close();
        });

        $unionView.on("click", ".confirm", function() {
            submitForm();
        });

        $unionView.on("click", ".addTable", function() {
            $(this).blur();
            addTable(null, null);
        });

        $unionView.on("click", ".removeTable", function(event) {
            event.stopPropagation();
            removeTable($(this).closest(".lists").index());
        });

        $unionView.on("click", ".candidateSection .inputCol", function() {
            var $col = $(this);
            var colName = $col.find(".text").text();
            var colType = $col.data("type");
            var index = $col.closest(".lists").index();

            addColumn({name: colName, type: colType}, index);
            xcTooltip.hideAll();
        });

        $unionView.on("click", ".removeCol", function() {
            var $col = $(this).closest(".resultCol");
            var colIndex = Number($col.data("index"));
            removeColumn(colIndex);
        });

        $unionView.on("click", ".editCol", function() {
            $(this).closest(".resultCol").find("input").focus();
        });

        var $modeList = $unionView.find(".modeList");
        new MenuHelper($modeList, {
            onSelect: function($li) {
                var mode = $li.text();
                $modeList.find(".text").text(mode);
                $modeList.data("option", $li.attr("name"));
                $unionView.find(".confirm").text(mode);
            },
            container: "#unionView",
            bounds: "#unionView"
        }).setupListeners();
    }

    function addTable(tableId, colNums) {
        colNums = colNums || [];
        var tableInfo = {
            tableId: tableId,
            selectedCols: []
        };

        if (tableId != null) {
            var table = gTables[tableId];
            tableInfo.selectedCols = colNums.map(function(colNum) {
                var progCol = table.getCol(colNum);
                return {
                    name: progCol.getBackColName(),
                    type: progCol.getType()
                };
            });
        }
        tableInfoLists.push(tableInfo);
        updateList();
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
        updateList();
    }

    function updateList() {
        var $table = $unionView.find(".tableSection .listSection");
        var $result = $unionView.find(".resultSection .listSection");
        var $candidate = $unionView.find(".candidateSection .listSection");
        var resultCols = [];
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

        var tableHTML = "";
        var resultHTML = "";
        var candidateHTML = "";

        tableInfoLists.forEach(function(tableInfo, index) {
            tableHTML += getTableList(tableInfo);
            resultHTML += getResultList(tableInfo, resultCols, index);
            candidateHTML += getCandidateList(tableInfo);
        });

        $table.html(tableHTML);
        $result.html(resultHTML);
        $candidate.html(candidateHTML);
        setupDrodownList();
        autoResizeView();
    }

    function autoResizeView(reset) {
        var $mainMenu = $("#mainMenu");
        var sectionW = parseFloat($unionView.find(".lists").eq(0).css("min-width")) + 5;
        var minWidth = parseFloat($mainMenu.css("min-width"));
        var width;
        if (reset) {
            $mainMenu.width(minWidth);
        } else {
            width = minWidth + Math.max(0, tableInfoLists.length - 2) * sectionW;
            width = Math.min(width, $("#workspacePanel").width() * 0.5);

            if (width > $mainMenu.width()) {
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
                    selectTable($li.data("id"), $li.closest(".lists").index());
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
                    var index = $dropDownList.closest(".lists").index();
                    var candidateCols = getCandidateCols(tableInfoLists[index]);
                    var ul = candidateCols.map(function(col) {
                        return '<li class="type-' + col.type +
                                ' tooltipOverflow"' +
                                ' data-type="' + col.type + '"' +
                                ' data-toggle="tooltip"' +
                                ' data-title="' + col.name + '"' +
                                ' data-container="body"' +
                                ' data-placement="top">' +
                                    col.name +
                                '</li>';
                    });
                    $dropDownList.find("ul").html(ul);
                },
                onSelect: function($li) {
                    var colName = $li.text();
                    var $text = $dropDownList.find(".text");
                    if (colName === $text.text()) {
                        return;
                    }
                    var tableIndex = $dropDownList.closest(".lists").index();
                    var colIndex = Number($dropDownList.data("index"));
                    var colInfo = {
                        name: colName,
                        type: $li.data("type")
                    };
                    selectColumn(colInfo, colIndex, tableIndex);
                    xcTooltip.hideAll();
                },
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
                    $dropDownList.closest(".resultCol").attr("data-type", type);
                    xcTooltip.hideAll();
                },
                container: "#unionView .middleSection",
                bounds: "#unionView .middleSection"
            }).setupListeners();
        });
    }

    function getTableList(tableInfo) {
        var tableId = tableInfo.tableId;
        var tableName = (tableId != null) ? gTables[tableId].getName() : "";
        return ('<div class="lists">' +
                    '<div class="dropDownList unionTableList">' +
                        '<i class="removeTable icon xi-close-no-circle ' +
                        'xc-action"></i>' +
                        '<input class="text" value="' + tableName + '" ' +
                        'placeholder="' + SideBarTStr.SelectTable + '">' +
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

    function getResultList(tableInfo, resultCols, index) {
        var tableId = tableInfo.tableId;
        var selectedCols = tableInfo.selectedCols;
        var lists = "";
        var selectedColLen = selectedCols.length;
        var nameMap = {};
        var checkName = function(name) {
            return !nameMap.hasOwnProperty(name);
        };

        resultCols.forEach(function(resultCol, colIndex) {
            if (colIndex >= selectedColLen) {
                // placeholder
                selectedCols[colIndex] = null;
            }
        });

        resultCols.forEach(function(resultCol, colIndex) {
            var resultColHTML = "";
            var inputColHTML = "";
            if (index === 0) {
                var resultColType = resultCol.type;
                var resultColName = resultCol.name;

                resultColName = xcHelper.parsePrefixColName(resultColName).name;
                resultColName = xcHelper.uniqueName(resultColName, checkName);
                nameMap[resultColName] = true;

                resultColHTML =
                    '<div class="resultCol"' +
                    ' data-type="' + resultColType + '"' +
                    ' data-index="' + colIndex + '">' +
                        '<input class="resultInput" type="text" value="' + resultColName + '"' +
                        ' placeholder="' + OpFormTStr.ResultColName + '">' +
                        '<div class="resultColAction">' +
                            '<i class="removeCol icon xi-close-no-circle' +
                            ' xc-action"></i>' +
                            '<i class="editCol icon xi-edit xc-action"></i>' +
                        '</div>' +
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
            } else {
                resultColHTML = '<div class="resultCol placeholder" ' +
                                'data-index="' + colIndex + '"></div>';
            }

            var innerHTML = "";
            if (selectedCols[colIndex] != null) {
                var inputColName = selectedCols[colIndex].name;
                innerHTML = '<div class="text textOverflowOneLine' +
                            ' tooltipOverflow"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + inputColName + '">' +
                                inputColName +
                            '</div>' +
                            '<i class="down icon xi-arrow-down xc-action"></i>';
            } else {
                innerHTML = '<div class="text"></div>';
                if (tableId != null) {
                    innerHTML += '<i class="down icon xi-arrow-down xc-action"></i>';
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

            inputColHTML = '<div class="inputCol dropDownList columnList" ' +
                            'data-index="' + colIndex + '">' +
                                innerHTML +
                            '</div>';
            lists += resultColHTML + inputColHTML;
        });

        return ('<div class="lists">' + lists + '</div>');
    }

    function getCandidateList(tableInfo) {
        var tableId = tableInfo.tableId;
        var lists = "";

        if (tableId != null) {
            var candidateCols = getCandidateCols(tableInfo);
            lists = candidateCols.map(function(col) {
                var colType = col.type;
                var colName = col.name;
                return '<div class="inputCol" data-type="' + colType + '">' +
                            '<i class="addCol icon xi-plus"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + UnionTStr.AddCol + '"' +
                            '></i>' +
                            '<div class="text textOverflowOneLine"' +
                            ' tooltipOverflow"' +
                            ' data-toggle="tooltip" data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + colName + '">' +
                                colName +
                            '</div>' +
                        '</div>';
            }).join("");
        }

        return ('<div class="lists">' +
                    lists +
                '</div>');
    }

    function getCandidateCols(tableInfo) {
        var candidateCols = [];
        var tableId = tableInfo.tableId;
        if (tableId == null) {
            return candidateCols;
        }

        var selectedColNameMap = {};
        tableInfo.selectedCols.forEach(function(col) {
            if (col != null) {
                selectedColNameMap[col.name] = true;
            }
        });

        
        gTables[tableId].tableCols.forEach(function(progCol) {
            var colName = progCol.getBackColName();
            var colType = progCol.getType();
            if (!selectedColNameMap[colName] &&
                validTypes.includes(colType)) {
                candidateCols.push({
                    name: colName,
                    type: colType
                });
            }
        });
        return candidateCols;
    }

    function reset() {
        $unionView.find(".newTableName").val("");
        $unionView.find(".listSection").empty();
        $unionView.find(".modeList li:first-child").trigger(fakeEvent.mouseup);
        tableInfoLists = [];
    }

    function submitForm() {
        if (!validate()) {
            return;
        }

        var resultCols = [];
        $unionView.find(".resultSection .lists").eq(0).find(".resultCol").each(function() {
            var $resultCol = $(this);
            resultCols.push({
                name: $resultCol.find("input").val(),
                type: $resultCol.data("type")
            });
        });

        var tableInfos = [];
        tableInfoLists.forEach(function(tableInfo) {
            var tableId = tableInfo.tableId;
            if (tableId == null) {
                return;
            }
            var tableName = gTables[tableId].getName();
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

        xcFunction.union(tableInfos, dedup, newTableName, options);
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

        var columnValids = [];
        $unionView.find(".columnList").each(function() {
            columnValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(columnValids)) {
            return false;
        }

        var tyepValids = [];
        $unionView.find(".resultCol.cast .typeList .text").each(function() {
            tyepValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(tyepValids)) {
            return false;
        }

        xcHelper.validate([{
            $ele: $unionView.find(".newTableName")
        }]);

        if (!isValid) {
            return false;
        }

        // validate types
        var columns = tableInfoLists[0].selectedCols;
        for (var i = 0; i < columns.length; i++) {
            for (var j = 1; j < tableInfoLists.length; j++) {
                var $resultCols = $unionView.find('.resultCol[data-index="' + i + '"]');
                if (columns[i].type !== tableInfoLists[j].selectedCols[i].type &&
                    !$resultCols.eq(0).hasClass("cast"))
                {
                    $resultCols.addClass("cast");
                    StatusBox.show(UnionTStr.Cast, $resultCols.eq(0).find(".typeList"));
                    return false;
                }
            }
        }

        return isValid;
    }

    return UnionView;
}({}, jQuery));