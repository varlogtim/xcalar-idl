window.ProjectView = (function($, ProjectView) {
    var $projectView;
    var formHelper;
    var exportHelper;
    var tableId;
    var $table;
    var focusedListNum;
    var focusedThNum;
    var table;
    var isEditMode;

    ProjectView.setup = function() {
        $projectView = $("#projectView");
        formHelper = new FormHelper($projectView, {
            "columnPicker": {
                "state": "projectState",
                "colCallback": function($target, event) {
                    colHeaderClick($target, event);
                },
            }
        });

        exportHelper = new ExportHelper($projectView);

        addFormEvents();
    };
    // colnums start at [1]
    ProjectView.show = function(tId, colNums, options) {
        if (formHelper.isOpen()) {
            return;
        }
        options = options || {};
        if (options.restoreTime && options.restoreTime !== formHelper.getOpenTime()) {
            return;
        }
        formHelper.showView();
        updateFormTitles(options);

        isEditMode = options.prefill ? true : false;
        if (options.prefill && options.prefill.isDroppedTable) {
            table = gDroppedTables[tId];
        } else if (!options.restoreTime) {
            table = gTables[tId];
        }

        if (options.restoreTime) {
            $table = $('#xcTable-' + tableId);
            restoreSelectedTableCols();
        } else {
            tableId = tId;
            $table = $('#xcTable-' + tableId);
            clearAllCols();
            fillTableList();
            refreshTableColList();
            selectInitialTableCols(colNums);
        }

        $(document).on("keypress.projectView", function(event) {
            if (event.which === keyCode.Enter &&
                gMouseEvents.getLastMouseDownTarget()
                .closest('#projectView').length)
            {
                submitForm();
            }
        });

        formHelper.setup({
            allowAllColPicker: true
        });
    };

    ProjectView.close = function() {
        if (!formHelper.isOpen()) {
            return;
        }

        formHelper.hideView();

        $('.xcTableWrap').find('.modalHighlighted')
                         .removeClass('modalHighlighted');

        $(document).off(".projectView");
        focusedThNum = null;
        focusedListNum = null;

        formHelper.clear();
    };

    ProjectView.updateColumns = function() {
        if (!formHelper.isOpen()) {
            return;
        }
        var selectedCols = exportHelper.getExportColumns();
        clearAllCols();
        refreshTableColList();

        var colNums = [];
        var $cols = $projectView.find(".cols li");
        selectedCols.forEach(function(colName) {
            var $col = $cols.filter(function() {
                return $(this).text() === colName;
            });
            colNums.push($col.data("colnum"));
        });

        $table.find(".selectedCell").removeClass("selectedCell");
        selectInitialTableCols(colNums);

    };

    function addFormEvents() {
        $projectView.on("click", ".close, .cancel", function() {
            ProjectView.close();
        });

        $projectView.on("click", ".confirm", function() {
            submitForm();
        });

        setupTableList();

        $projectView.on('click', '.focusTable', function() {
            if (!gTables[tableId]) {
                return;
            }
            xcHelper.centerFocusedTable(tableId, true);
        });

        $projectView.find('.exportColumnsSection').on('click', 'li', function(event) {
            var $li = $(this);
            if ($li.closest(".prefixedSection").length) {
                focusedListNum = null;
                focusedThNum = null;
                return;
            }
            var colNum = $li.data('colnum');
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }

            if (event.shiftKey && focusedListNum != null) {
                var $lis = $projectView.find(".cols li");
                var $prevLi = $projectView.find('li[data-colnum="' +
                            focusedListNum + '"]');
                var prevIndex = $lis.index($prevLi);
                var currIndex = $lis.index($li);
                var start = Math.min(prevIndex, currIndex);
                var end = Math.max(prevIndex, currIndex);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol($lis.eq(i).data("colnum"));
                    } else {
                        deselectCol($lis.eq(i).data("colnum"));
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum);
                } else {
                    deselectCol(colNum);
                }
            }

            focusedListNum = colNum;
            focusedThNum = null;
        });

        $projectView.find('.exportColumnsSection').on("click", ".selectAllWrap", function() {
            var isPrefix = $(this).closest(".prefixedSection").length;
            if ($(this).find('.checkbox').hasClass('checked')) {
                deselectAll(isPrefix, $(this).closest(".prefixGroup"));
            } else {
                selectAll(isPrefix, $(this).closest(".prefixGroup"));
            }
        });
    }

    function setupTableList() {
        var $tableList = $projectView.find(".tableList");
        var tableList = new MenuHelper($tableList, {
            "onOpen": function() {
                fillTableList(true);
            },
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $projectView.find('.tableList').find(".text");
                var originalText = $textBox.text();

                if (originalText !== tableName) {
                    $textBox.text(tableName);
                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    tableId = $li.data('id');
                    if (!gTables[tableId]) {
                        return;
                    }
                    table = gTables[tableId];
                    $table = $('#xcTable-' + tableId);
                    clearAllCols();
                    refreshTableColList();
                    selectInitialTableCols([]);
                    xcHelper.centerFocusedTable(tableId, true);
                } else {
                    return;
                }
            }
        });
        tableList.setupListeners();
    }

    function restoreSelectedTableCols() {
        var $table;
        if (gTables[tableId]) {
            $table = $("#xcTable-" + tableId);
        } else {
            return;
        }
        $projectView.find(".cols li.checked").each(function() {
            var colNum = $(this).data("colnum");
            $table.find(".col" + colNum).addClass("modalHighlighted");
        });
    }

    function refreshTableColList() {
        var allCols = table.getAllCols();
        var splitName;
        var prefixed = [];
        var derived = [];
        var prefixedGroups = {};
        for (var i = 0; i < allCols.length; i++) {
            if (!allCols[i].backName.trim().length || allCols[i].isDATACol()) {
                continue;
            }
            var colName = allCols[i].getFrontColName(true);
            var colNum = i + 1;

            var prefix = allCols[i].getPrefix();
            if (prefix) {
                splitName = xcHelper.parsePrefixColName(colName);
                if (!prefixedGroups[prefix]) {
                    prefixedGroups[prefix] = {prefix: prefix, group: []};
                }
                prefixedGroups[prefix].group.push({colName: splitName.name,
                                colNum: colNum});
            } else {
                derived.push({colName: colName,
                                colNum: colNum});
            }
        }
        for (var i in prefixedGroups) {
            prefixed.push(prefixedGroups[i]);
        }
        prefixed.sort(function(a, b) {
            return xcHelper.sortVals(a.prefix, b.prefix);
        });

        for (var i = 0; i < prefixed.length; i++) {
            prefixed[i].group.sort();
        }

        derived.sort(sort);

        var derivedHtml = "";
        var prefixedHtml = "";

        for (var i = 0; i < derived.length; i++) {
            var colName = xcHelper.escapeHTMLSpecialChar(derived[i].colName);
            derivedHtml +=
                '<li data-colnum="' + derived[i].colNum + '">' +
                    '<span class="text tooltipOverflow" ' +
                    'data-original-title="' + xcHelper.escapeDblQuoteForHTML(
                        xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                    'data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body">' +
                        colName +
                    '</span>' +
                    '<div class="checkbox">' +
                        '<i class="icon xi-ckbox-empty fa-13"></i>' +
                        '<i class="icon xi-ckbox-selected fa-13"></i>' +
                    '</div>' +
                '</li>';
        }

        for (var i = 0; i < prefixed.length; i++) {
            prefixedHtml +=
                '<div class="prefixGroup columnGroup">' +
                    '<div class="prefixName" data-toggle="tooltip" ' +
                        'data-container="body" data-original-title="' +
                        ProjectTStr.prefixTip + '">' +
                        prefixed[i].prefix + '</div>' +
                    '<div class="checkboxWrap selectAllWrap">' +
                      '<div class="checkbox">' +
                        '<i class="icon xi-ckbox-empty fa-13"></i>' +
                        '<i class="icon xi-ckbox-selected fa-13"></i>' +
                      '</div>' +
                      '<div class="text">' + CommonTxtTstr.SelectAll + '</div>' +
                    '</div>' +
                    '<div class="columnsToExport columnsWrap flexWrap clearfix">' +
                      '<ul class="cols">';

            for (var j = 0; j < prefixed[i].group.length; j++) {
                var group = prefixed[i].group;
                var colName = xcHelper.escapeHTMLSpecialChar(group[j].colName);
                prefixedHtml +=
                    '<li data-colnum="' + group[j].colNum + '">' +
                        '<span class="text tooltipOverflow" ' +
                        'data-original-title="' + 
                        xcHelper.escapeDblQuoteForHTML(
                            xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                            colName +
                        '</span>' +
                    '</li>';
            }
            for (var j = 0; j < 10; j++) {
                prefixedHtml += '<div class="flexSpace"></div>';
            }
            prefixedHtml += '</ul>' +
                    '</div>' +
                  '</div>';
        }

        for (var i = 0; i < 10; i++) {
            derivedHtml += '<div class="flexSpace"></div>';
        }

        $projectView.find('.derivedSection .cols').html(derivedHtml);

        $projectView.find('.prefixContainer').html(prefixedHtml);

        if ($projectView.find(".derivedSection .cols li").length === 0) {
            $projectView.find(".derivedSection").addClass("empty");
        } else {
            $projectView.find(".derivedSection").removeClass("empty");
        }
        if ($projectView.find(".prefixedSection .cols li").length === 0) {
            $projectView.find(".prefixedSection").addClass("empty");
        } else {
            $projectView.find(".prefixedSection").removeClass("empty");
        }

        function sort(a, b) {
            return xcHelper.sortVals(a.colName, b.colName);
        }
    }

    function fillTableList(refresh) {
        var tableLis = WSManager.getTableList();
        var $tableListSection = $projectView.find('.tableListSection');
        $tableListSection.find('ul').html(tableLis);
        var tableName;
        // select li and fill left table name dropdown
        if (refresh) {
            tableName = $tableListSection.find('.dropDownList .text').text();
        } else {
            tableName = table.getName();
            $tableListSection.find('.dropDownList .text').text(tableName);
        }

        $tableListSection.find('li').filter(function() {
            return ($(this).text() === tableName);
        }).addClass('selected');
    }

    function clearAllCols() {
        $('.xcTable').find('th.modalHighlighted, td.modalHighlighted')
                    .removeClass('modalHighlighted');
        $projectView.find('.cols li').removeClass('checked')
                   .find('.checkbox').removeClass('checked');
        $projectView.find('.selectAllWrap').find('.checkbox')
                                          .removeClass('checked');
        focusedThNum = null;
        focusedListNum = null;
    }

    function selectInitialTableCols(colNums) {
        var allCols = table.getAllCols();
        for (var i = 0; i < colNums.length; i++) {
            var colNum = colNums[i];
            if (!allCols[colNum - 1].backName.trim().length ||
                allCols[colNum - 1].isDATACol()) {
                continue;
            }
            selectCol(colNum, true);
        }
    }

    function colHeaderClick($target, event) {
        if (isInvalidTableCol($target)) {
            return;
        }
        if ($target.closest('.rowNumHead').length) {
            selectAll(false);
            $projectView.find(".prefixGroup").each(function() {
                selectAll(true, $(this));
            });
            return;
        }
        var $cell = $target.closest("th");
        if (!$cell.length) {
            $cell = $target.closest("td");
        }
        var colNum = xcHelper.parseColNum($cell);
        var toHighlight = !$cell.hasClass("modalHighlighted");

        if (event.shiftKey && focusedThNum != null) {
            var start = Math.min(focusedThNum, colNum);
            var end = Math.max(focusedThNum, colNum);

            for (var i = start; i <= end; i++) {
                if (toHighlight) {
                    selectCol(i, true);
                } else {
                    deselectCol(i, true);
                }
            }
        } else {
            if (toHighlight) {
                selectCol(colNum, true);
            } else {
                deselectCol(colNum, true);
            }
        }
        focusedThNum = colNum;
        focusedListNum = null;
    }

    function isInvalidTableCol($target) {
        if ($target.closest($table).length === 0 ||
            $target.closest(".dataCol").length ||
            $target.closest(".jsonElement").length ||
            $target.closest(".dropdownBox").length ||
            $target.closest(".newColumn").length) {
            return true;
        } else {
            return false;
        }
    }

    function selectCol(colNum, fromTableHeader) {
        $table.find('.col' + colNum).addClass('modalHighlighted');

        var $colList = $projectView.find(".cols");
        var $li = $colList.find('li[data-colnum="' + colNum + '"]');

        if (fromTableHeader) {
            var $prefixGroup = $li.closest(".prefixGroup");
            if ($prefixGroup.length) {
                selectAll(true, $prefixGroup);
                return;
            }
        }
        $li.addClass('checked').find('.checkbox').addClass('checked');

        checkToggleSelectAllBox();
    }

    function deselectCol(colNum, fromTableHeader) {
        $table.find('.col' + colNum).removeClass('modalHighlighted');
        var $colList = $projectView.find(".cols");
        var $li = $colList.find('li[data-colnum="' + colNum + '"]');

        if (fromTableHeader) {
            var $prefixGroup = $li.closest(".prefixGroup");
            if ($prefixGroup.length) {
                deselectAll(true, $prefixGroup);
                return;
            }
        }
        $li.removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
    }

    function selectAll(isPrefix, $group) {
        var $colList;
        var $section;
        if (isPrefix) {
            $section = $group;
        } else {
            $section = $projectView.find(".derivedSection");
        }

        $colList = $section.find(".cols");

        $colList.find('li').each(function() {
            var $li = $(this);
            if (!$li.hasClass('checked')) {
                var colNum = $li.data('colnum');
                $li.addClass('checked').find('.checkbox').addClass('checked');
                $table.find('.col' + colNum).addClass('modalHighlighted');
            }
        });
        $section.find('.selectAllWrap').find('.checkbox').addClass('checked');
        focusedThNum = null;
        focusedListNum = null;
    }

    function deselectAll(isPrefix, $group) {
        var $section;
        if (isPrefix) {
            $section = $group;
        } else {
            $section = $projectView.find(".derivedSection");
        }

        var $colList = $section.find(".cols");

        $colList.find('li').each(function() {
            var $li = $(this);
            var colNum = $li.data('colnum');
            $li.removeClass('checked').find('.checkbox').removeClass('checked');
            $table.find('.col' + colNum)
                    .removeClass('modalHighlighted');
        });
        $section.find('.selectAllWrap').find('.checkbox')
                                          .removeClass('checked');

        focusedThNum = null;
        focusedListNum = null;
    }

    // if all lis are checked, select all checkbox will be checked as well
    function checkToggleSelectAllBox() {
        var $colList =  $projectView.find(".derivedSection .cols");
        var totalCols = $colList.find('li').length;
        var selectedCols = $colList.find('li.checked').length;
        if (selectedCols === 0) {
            $colList.closest(".columnGroup").find('.selectAllWrap')
                                           .find('.checkbox')
                                           .removeClass('checked');
        } else if (selectedCols === totalCols) {
            $colList.closest(".columnGroup").find('.selectAllWrap')
                                            .find('.checkbox')
                                            .addClass('checked');
        }
    }


    function updateFormTitles(options) {
        var titleName = "Project";
        var submitText;
        if (options.prefill) {
            titleName = "EDIT " + titleName;
            submitText = "SAVE";
        } else {
            submitText = titleName.toUpperCase();
        }
        $projectView.find('.title').text(titleName);
        $projectView.find('.confirm').text(submitText);
    }

    function submitForm() {
        var deferred = jQuery.Deferred();
        var isValid = xcHelper.validate([
            {
                "$ele": $projectView.find('.tableList').find(".text"),
                "error": ErrTStr.TableNotExists,
                "check": function() {
                    return !gTables[tableId] && !isEditMode;
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "tableNotFound"});
        }

        if (!isEditMode && !gTables[tableId].isActive()) {
            StatusBox.show(TblTStr.NotActive,
                            $projectView.find('.tableList').find(".text"));
            return PromiseHelper.reject({"error": "tableNotFound"});
        }

        var frontColumnNames = exportHelper.getExportColumns(
                                $projectView.find(".derivedSection"));

        $projectView.find(".prefixGroup").each(function() {
            var $group = $(this);
            var prefix = $group.find(".prefixName").text();
            $group.find("li.checked").each(function() {
                frontColumnNames.push(prefix + gPrefixSign +
                                      $(this).text().trim());
            });
        });

        isValid = xcHelper.validate([
            {
                "$ele": $projectView.find(".cols:visible").last(),
                "error": ErrTStr.NoColumns,
                "check": function() {
                    return (frontColumnNames.length === 0);
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "invalid input"});
        }

        var backColumnNames = xcHelper.convertFrontColNamesToBack(
                                    frontColumnNames, tableId, null);

        if (backColumnNames.invalid) {
            var errorText;
            if (backColumnNames.reason === 'notFound') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": backColumnNames.name
                });
            } else if (backColumnNames.reason === "tableNotFound") {
                errorText = ErrTStr.SourceTableNotExists;
            }
            isValid = false;
            StatusBox.show(errorText,
                           $projectView.find(".exportColumnsSection"));
            return PromiseHelper.reject({"error": "invalid input"});
        }

        ProjectView.close();
        var options = {
            "formOpenTime": formHelper.getOpenTime()
        };

        if (isEditMode) {
            DagEdit.store({
                args: {columns: backColumnNames}
            });
        } else {
            xcFunction.project(backColumnNames, tableId, options)
            .then(deferred.resolve)
            .fail(deferred.reject);
        }
    }


      /* Unit Test Only */
    if (window.unitTestMode) {
        ProjectView.__testOnly__ = {};
        ProjectView.__testOnly__.submitForm = submitForm;
        ProjectView.__testOnly__.getFormHelper = function(){
            return formHelper;
        };
    }
    /* End Of Unit Test Only */

    return (ProjectView);
}(jQuery, {}));