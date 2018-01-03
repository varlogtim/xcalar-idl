window.DFCreateView = (function($, DFCreateView) {
    var $dfView;          // $('#dfCreateView')
    var $newNameInput; //     $('#newDFNameInput')
    var focusedThNum = null; // last table header clicked, for shift+click
    var focusedListNum = null; // last list number clicked, for shift+click
    var focusedGroupId = null; // last group clicked, for shift+click

    var formHelper;
    var exportHelper;

    // constant
    var validTypes = ['string', 'integer', 'float', 'boolean'];
    var isOpen = false; // tracks if form is open
    var saveFinished = true; // tracks if last submit ended
    var dfTablesCache = []; // holds all the table names from the dataflow
    var srcRefCounts = {}; // counts how many times a table is included as an ancestor
    var srcMap = {}; // map of src tables and their ancestors
    var $curDagWrap;

    DFCreateView.setup = function() {
        $dfView = $('#dfCreateView');
        $newNameInput = $('#newDFNameInput');

        formHelper = new FormHelper($dfView, {
            "focusOnOpen": true,
            "columnPicker": {
                "state": "dataflowState",
                "validColTypes": validTypes,
                "colCallback": function($target, event) {
                    colHeaderClick($target, event);
                },
                "dagCallback": function($target) {
                    var tableName = $target.data("tablename");
                    if (dfTablesCache.indexOf(tableName) > -1) {
                        var $input = $(document.activeElement);
                        if ($input.is("input") &&
                            $input.closest(".tableList").length) {

                            var originalText = $input.val();
                            xcHelper.fillInputFromCell($target, $input, null,
                                {type: "dag"});
                            var newTableName = $input.val();
                            if (originalText !== newTableName) {
                                $input.trigger("change");
                            }
                        }
                    }
                }
            }
        });

        exportHelper = new ExportHelper($dfView);
        exportHelper.setup();

        addFormEvents();
    };

    DFCreateView.show = function($dagWrap) {
        if (!saveFinished) { // did not finish saving from last form submit
            return;
        }

        isOpen = true;
        $curDagWrap = $dagWrap;

        var wasMenuOpen = formHelper.showView();
        var mainTableName = $dagWrap.find(".tableName").text();
        var mainTableId = xcHelper.getTableId(mainTableName);
        $dfView.find(".tableList .text").eq(0).val(mainTableName);
        var allDagInfo = $dagWrap.data("allDagInfo");
        var nodeIdMap = allDagInfo.nodeIdMap;
        for (var i in nodeIdMap) {
            var node = nodeIdMap[i];
            if (node.value.numParents && node.value.name.indexOf("#") > -1) {
                // exclude datasets
                if (node.value.state === DgDagStateT.DgDagStateReady) {
                    dfTablesCache.push(node.value.name);
                }
            }
        }
        dfTablesCache.sort();

        var onlyIfNeeded = true;
        DagPanel.heightForTableReveal(wasMenuOpen, onlyIfNeeded);
        $dfView.find(".group").eq(0).attr("data-id", mainTableId);
        createColumnsList(mainTableId);
        selectInitialTableCols(mainTableId);
        formHelper.setup();
        exportHelper.showHelper();
        $("#mainFrame").addClass("dfCreateMode");

        $(document).on("keypress.DFView", function(e) {
            if (e.which === keyCode.Enter &&
                (gMouseEvents.getLastMouseDownTarget()
                             .closest('#dfCreateView').length ||
                $newNameInput.is(':focus'))) {
                submitForm();
            }
        });
    };

    DFCreateView.close = function() {
        if (isOpen) {
            closeDFView();
        }
    };

    DFCreateView.updateTables = function(tableId, addColumns) {
        if (!isOpen || !saveFinished) {
            return;
        }
        var $group = getGroup(tableId);
        if ($group.length) {
            if (addColumns) {
                $(".selectedCell").removeClass("selectedCell");
                var numCols = $group.find(".cols li").length;
                var allCols = gTables[tableId].getAllCols();
                var html = "";
                for (var i = numCols; i < allCols.length; i++) {
                    var progCol = allCols[i];
                    if (validTypes.indexOf(progCol.getType()) > -1) {
                        var colName = progCol.getFrontColName(true);
                        var colNum = (i + 1);
                        html +=
                            '<li class="checked" data-colnum="' + colNum + '">' +
                                '<span class="text tooltipOverflow" ' +
                                'data-original-title="' + colName + '" ' +
                                'data-toggle="tooltip" data-placement="top" ' +
                                'data-container="body">' +
                                    colName +
                                '</span>' +
                                '<div class="checkbox checked">' +
                                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                                '</div>' +
                            '</li>';
                    }
                }
                $group.find(".cols .flexSpace").eq(0).before(html);
            }
            var $cols = $group.find(".cols li.checked");
            $cols.each(function() {
                var colNum = $(this).data("colnum");
                selectCol(colNum, tableId);
            });
            if ($group.find(".cols li").length) {
                $group.find('.exportColumnsSection').removeClass('empty');
            }
        }
    };

    function createColumnsList(tableId) {
        var colHtml = ExportHelper.getTableCols(tableId, validTypes);
        var $group = getGroup(tableId);
        var $colList = $group.find(".cols");
        $colList.html(colHtml);
        if ($colList.find('li').length === 0) {
            $group.find('.exportColumnsSection').addClass('empty');
        } else {
            $group.find('.exportColumnsSection').removeClass('empty');
        }
        $group.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');

    }

    function getGroup(id) {
        return $dfView.find(".group[data-id='" + id + "']");
    }

    function selectAll(tableId) {
        var $group = getGroup(tableId);
        var $xcTable = $('#xcTable-' + tableId);
        var $colList = $group.find(".cols");
        $colList.find('li').each(function() {
            var $li = $(this);
            if (!$li.hasClass('checked')) {
                var colNum = $li.data('colnum');
                $li.addClass('checked').find('.checkbox').addClass('checked');
                $xcTable.find('.col' + colNum)
                        .addClass('modalHighlighted');
            }
        });
        $group.find('.selectAllWrap').find('.checkbox').addClass('checked');
        focusedThNum = null;
        focusedListNum = null;
        focusedGroupId = null;
        exportHelper.clearRename($group);
    }

    function deselectAll(tableId) {
        var $group = getGroup(tableId);
        var $xcTable = $('#xcTable-' + tableId);
        var $colList = $group.find(".cols");
        $colList.find('li.checked').each(function() {
            var $li = $(this);
            var colNum = $li.data('colnum');
            $li.removeClass('checked').find('.checkbox').removeClass('checked');
            $xcTable.find('.col' + colNum)
                    .removeClass('modalHighlighted');
        });
        $group.find('.selectAllWrap').find('.checkbox')
                                      .removeClass('checked');
        focusedThNum = null;
        focusedListNum = null;
        focusedGroupId = null;
        exportHelper.clearRename($group);
    }

    function selectInitialTableCols(tableId) {
        var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        for (var i = 0; i < allCols.length; i++) {
            if (validTypes.indexOf(allCols[i].type) > -1) {
                $xcTable.find('.col' + (i + 1)).addClass('modalHighlighted');
            }
        }
    }

    function getSelectedTables() {
        var tables = [];
        $dfView.find(".group .tableList .text").each(function() {
            var val = $.trim($(this).val());
            if (val.length) {
                tables.push(val);
            }
        });
        return tables;
    }

    function getSelectedSrcTables() {
        var tables = [];
        $dfView.find(".sourceTableWrap .tableList .text").each(function() {
            var val = $.trim($(this).val());
            if (val.length) {
                tables.push(val);
            }
        });
        return tables;
    }

    function colHeaderClick($target, event) {
        if (isInvalidTableCol($target)) {
            return;
        }
        if ($target.closest('.rowNumHead').length) {
            selectAll();
            return;
        }
        var $cell = $target.closest("th");
        if (!$cell.length) {
            $cell = $target.closest("td");
        }
        var colNum = xcHelper.parseColNum($cell);
        var toHighlight = !$cell.hasClass("modalHighlighted");
        var tableId = $target.closest(".xcTable").data("id");

        if (event.shiftKey && focusedThNum != null) {
            var start = Math.min(focusedThNum, colNum);
            var end = Math.max(focusedThNum, colNum);

            for (var i = start; i <= end; i++) {
                if (toHighlight) {
                    selectCol(i, tableId);
                } else {
                    deselectCol(i, tableId);
                }
            }
        } else {
            if (toHighlight) {
                selectCol(colNum, tableId);
            } else {
                deselectCol(colNum, tableId);
            }
        }
        focusedThNum = colNum;
        focusedListNum = null;
        focusedGroupId = tableId;
    }

    function isInvalidTableCol($target) {
        if ($target.closest(".dataCol").length ||
            $target.closest(".jsonElement").length ||
            $target.closest(".dropdownBox").length) {
            return true;
        } else {
            return false;
        }
    }

    function selectCol(colNum, tableId) {
        if (!gTables[tableId]) {
            return;
        }
        var colType = gTables[tableId].getCol(colNum).getType();
        if (validTypes.indexOf(colType) === -1) {
            return;
        }
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');
        var $group = getGroup(tableId);
        var $colList = $group.find(".cols");

        $colList.find('li[data-colnum="' + colNum + '"]').addClass('checked')
                .find('.checkbox').addClass('checked');

        checkToggleSelectAllBox(tableId);
        exportHelper.clearRename($group);
    }

    function deselectCol(colNum, tableId) {
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .removeClass('modalHighlighted');
        var $group = getGroup(tableId);
        var $colList = $group.find(".cols");
        $colList.find('li[data-colnum="' + colNum + '"]').removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox(tableId);
        exportHelper.clearRename($group);
    }

    // if all lis are checked, select all checkbox will be checked as well
    function checkToggleSelectAllBox(tableId) {
        var $group = getGroup(tableId);
        var $colList = $group.find(".cols");
        var totalCols = $colList.find('li').length;
        var selectedCols = $colList.find('li.checked').length;
        if (selectedCols === 0) {
            $dfView.find('.selectAllWrap').find('.checkbox')
                                              .removeClass('checked');
        } else if (selectedCols === totalCols) {
            $dfView.find('.selectAllWrap').find('.checkbox')
                                              .addClass('checked');
        }
    }

    function addFormEvents() {
        $dfView.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeDFView();
        });

        $dfView.on("click", ".confirm", function() {
            submitForm();
        });

        setupTableList($dfView.find(".group").last());

        $dfView.on("click", ".focusTable", function() {
            var tableId = $(this).closest(".group").attr("data-id");
            if (gTables[tableId]) {
                xcHelper.centerFocusedTable(tableId, true);
            }
        });

        $dfView.on("change", ".group .tableList .text", function() {
            var $input = $(this);
            var tableName = $.trim($input.val());
            var tableId = xcHelper.getTableId(tableName);
            var $group = $input.closest(".group");
            var groupId = $group.attr("data-id");

            if (tableId !== groupId) {
                $("#xcTable-" + groupId).find(".modalHighlighted")
                                .removeClass('modalHighlighted');
            }
            if (gTables[tableId]) {
                if (getGroup(tableId).length) {
                    StatusBox.show(DFTStr.TableAlreadySelected, $input, true);
                    return;
                }
                $group.attr("data-id", tableId);
                createColumnsList(tableId);
                selectInitialTableCols(tableId);

                xcHelper.centerFocusedTable(tableId, true, {noClear: true});
            } else {
                $group.attr("data-id", null);
                $group.find(".renameSection").addClass("xc-hidden")
                      .find(".renamePart").empty();
                $group.find(".cols").empty();
                $group.find('.exportColumnsSection').addClass('empty');
            }
        });

        // need this because mousedown on dataflow table triggers a change,
        // which can cause a status box but the mouseup causes the status
        // box to close so we open again with the blur event
        $dfView.on("blur", ".group .tableList .text", function() {
            var $input = $(this);
            var tableName = $.trim($input.val());
            var tableId = xcHelper.getTableId(tableName);
            var $group = $input.closest(".group");
            if (gTables[tableId]) {
                var $existingGroup = getGroup(tableId);
                if ($existingGroup.length && !$existingGroup.is($group)) {
                    StatusBox.show(DFTStr.TableAlreadySelected, $input, true);
                    return;
                }
            }
        });

        $dfView.on("change", ".sourceTableWrap .tableList .text", function() {
            var $input = $(this);
            var tableName = $.trim($input.val());

            if ($input.data("prevval")) {
                var prevTableName = $input.data("prevval");
                if (srcMap[prevTableName]) {
                    var $dagTable;
                    var prevAncestors = srcMap[prevTableName];
                    for (var i = 0; i < prevAncestors.length; i++) {
                        srcRefCounts[prevAncestors[i]]--;

                        if (srcRefCounts[prevAncestors[i]] === 0) {
                            $dagTable = Dag.getTableIconByName($curDagWrap,
                                                            prevAncestors[i]);
                            $dagTable.closest(".dagTableWrap")
                                     .removeClass("isAncestor");
                            delete srcRefCounts[prevAncestors[i]];
                        }
                    }

                    $dagTable = Dag.getTableIconByName($curDagWrap,
                                                        prevTableName);
                    $dagTable.closest(".dagTableWrap").removeClass("isSource");
                    delete srcMap[prevTableName];
                }
            }

            if (srcMap[tableName]) {
                StatusBox.show(DFTStr.TableAlreadySelected, $input, true);
                return;
            }

            $input.data("prevval", tableName);

            if (dfTablesCache.indexOf(tableName) > -1) {
                var ancestors = Dag.styleSrcTables($curDagWrap, tableName);
                for (var i = 0; i < ancestors.length; i++) {
                    if (!srcRefCounts[ancestors[i]]) {
                        srcRefCounts[ancestors[i]] = 0;
                    }
                    srcRefCounts[ancestors[i]]++;
                }
                srcMap[tableName] = ancestors;
            }
        });

        $dfView.on("blur", ".sourceTableWrap .tableList .text", function() {
            var $input = $(this);
            var tableName = $.trim($input.val());
            if (srcMap[tableName]) {
                $dfView.find(".sourceTableWrap").find(".tableList .text").each(function() {
                    var text = $(this).val().trim();
                    if (text === tableName && !$(this).is($input)) {
                        StatusBox.show(DFTStr.TableAlreadySelected, $input, true);
                        return false;
                    }
                });
            }
        });

        $dfView.on("click", ".cols li", function(event) {
            var $li = $(this);
            var colNum = $li.data('colnum');
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }
            var tableId = $li.closest(".group").attr("data-id");

            if (event.shiftKey && focusedListNum != null &&
                focusedGroupId === tableId) {
                var start = Math.min(focusedListNum, colNum);
                var end = Math.max(focusedListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i, tableId);
                    } else {
                        deselectCol(i, tableId);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum, tableId);
                } else {
                    deselectCol(colNum, tableId);
                }
            }

            focusedListNum = colNum;
            focusedGroupId = tableId;
            focusedThNum = null;
        });

        $dfView.on("click", ".selectAllWrap", function() {
            var groupId = $(this).closest(".group").attr("data-id");
            if ($(this).find('.checkbox').hasClass('checked')) {
                deselectAll(groupId);
            } else {
                selectAll(groupId);
            }
        });

        $dfView.on("click", ".minGroup", function() {
            minimizeGroups($(this).closest(".group"));
        });

        $dfView.on("mouseup", ".group", function() {
            $(this).removeClass("minimized");
        });

        $dfView.on('click', '.group .closeGroup', function() {
            removeGroup($(this).closest('.group'));
        });

        $dfView.on('click', '.sourceTableWrap .closeGroup', function() {
            removeSrcTable($(this).closest('.tableListSection'));
        });

        // add extra exports
        $dfView.find(".addDest button, .addDest .text").click(function() {
            addExportGroup();
        });

        $dfView.find(".addSrc button, .addSrc .text").click(function() {
            addExportSrc();
        });
    }

    function addExportGroup() {
        minimizeGroups();
        $dfView.find('.group').last().after(getExportGroupHtml());
        setupTableList($dfView.find(".group").last());

        scrollToBottom();
        $dfView.find('.group').last().find('.tableList .text').focus();
        formHelper.refreshTabbing();
        $dfView.find('.group').last().find('.tableList .text').focus();
    }

    function addExportSrc() {
        var html = '<div class="tableListSection clearfix">' +
                    '<div class="subHeading clearfix">' +
                      '<i class="icon xi-close closeGroup"></i>' +
                    '</div>' +
                    '<div class="dropDownList tableList">' +
                      '<input type="text" class="text arg" spellcheck="false">' +
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
                    '</div>';
        $dfView.find(".sourceTableWrap").append(html);
        var $tableList = $dfView.find(".sourceTableWrap").find(".tableList")
                                                         .last();
        var tableList = new MenuHelper($tableList, {
            "onOpen": function() {
                fillSrcTableLists($tableList);
            },
            "onSelect": function($li) {
                if ($li.hasClass("inUse") && !$li.hasClass("selected")) {
                    return true; // keep open
                }
                tableListSelect($li);
            }
        });
        tableList.setupListeners();
        formHelper.refreshTabbing();
        $tableList.find(".text").focus();
    }

    function removeGroup($group) {
        var groupId = $group.attr("data-id");
        $("#xcTable-" + groupId).find(".modalHighlighted")
                                .removeClass('modalHighlighted');
        $group.remove();
    }

    function removeSrcTable($tableListSection) {
        var prevTableName = $tableListSection.find("input").val();
        $tableListSection.remove();
        if (srcMap[prevTableName]) {
            var multipleFound = false;
            $dfView.find(".sourceTableWrap").find(".tableList .text").each(function() {
                var text = $(this).val().trim();
                if (text === prevTableName) {
                    multipleFound = true;
                    return false;
                }
            });

            if (!multipleFound) {
                var $dagTable;
                var prevAncestors = srcMap[prevTableName];
                for (var i = 0; i < prevAncestors.length; i++) {
                    srcRefCounts[prevAncestors[i]]--;

                    if (srcRefCounts[prevAncestors[i]] === 0) {
                        $dagTable = Dag.getTableIconByName($curDagWrap,
                                                        prevAncestors[i]);
                        $dagTable.closest(".dagTableWrap")
                                 .removeClass("isAncestor");
                        delete srcRefCounts[prevAncestors[i]];
                    }
                }

                $dagTable = Dag.getTableIconByName($curDagWrap,
                                                    prevTableName);
                $dagTable.closest(".dagTableWrap").removeClass("isSource");
                delete srcMap[prevTableName];
            }
        }
    }

    function getExportGroupHtml() {
        var html = '<div class="group">' +
          '<div class="tableListSection clearfix">' +
            '<div class="subHeading clearfix">' +
              '<span class="text">' + CommonTxtTstr.Table + ':</span>' +
                '<div class="iconWrap focusTable">' +
                  '<i class="icon xi-show"></i>' +
                '</div>' +
              '<i class="icon xi-close closeGroup"></i>' +
              '<i class="icon xi-minus minGroup"></i>' +
            '</div>' +
            '<div class="dropDownList tableList">' +
              '<input type="text" class="text arg" spellcheck="false">' +
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
          '</div>' +
          '<div class="exportColumnsSection formRow empty">' +
            '<div class="subHeading clearfix">' +
              '<div class="label">' + ExportTStr.ColumnsToExport + ':</div>' +
            '</div>' +
            '<div class="checkboxWrap selectAllWrap">' +
              '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-13"></i>' +
                '<i class="icon xi-ckbox-selected fa-13"></i>' +
              '</div>' +
              '<div class="text">' + CommonTxtTstr.SelectAll + '</div>' +
            '</div>' +
            '<div class="columnsToExport columnsWrap clearfix">' +
              '<ul class="cols"></ul>' +
              '<div class="hint noColsHint empty">' + ExportTStr.NoColumns +
              '</div>' +
            '</div>' +
            '<div class="renameSection clearfix xc-hidden">' +
              '<div class="subHeading clearfix">' +
                '<div>' + CommonTxtTstr.ColRenames + '</div>' +
              '</div>' +
              '<p>' + CommonTxtTstr.ColRenameInstr + '</p>' +
              '<div class="tableRenames">' +
                '<div class="subSubHeading clearfix">' +
                  '<div>' + ExportTStr.CurrentColName + '</div>' +
                  '<div>' + ExportTStr.NewColName + '</div>' +
                '</div>' +
                '<div class="renamePart"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

        return html;
    }

    function minimizeGroups($group) {
        if (!$group) {
            $dfView.find(".group").each(function () {
                var $group = $(this);
                if ($group.hasClass("minimized")) {
                    return;
                }

                $group.addClass("minimized");
            });
        } else {
            $group.addClass("minimized");
        }
    }

    function scrollToBottom() {
        var animSpeed = 500;
        var scrollTop = $dfView.find('.mainContent')[0].scrollHeight -
                        $dfView.find('.mainContent').height();
        $dfView.find(".mainContent").animate({scrollTop: scrollTop}, animSpeed);
    }

    DFCreateView.scrollToElement = function($el) {
        FormHelper.scrollToElement($el, {paddingTop: 30});
    };

    function setupTableList($section) {
        var $tableList = $section.find(".tableList").last();
        var tableList = new MenuHelper($tableList, {
            "onOpen": function() {
                fillTableLists($tableList);
            },
            "onSelect": function($li) {
                if ($li.hasClass("inUse") && !$li.hasClass("selected")) {
                    return true; // keep open
                }
                tableListSelect($li);
            }
        });
        tableList.setupListeners();
    }

    function getTableListHtml() {
        var tableList = "";
        var selectedTables = getSelectedTables();
        var classNames = "";

        for (var i = 0; i < dfTablesCache.length; i++) {
            var tableName = dfTablesCache[i];
            if (selectedTables.indexOf(tableName) > -1) {
                classNames = " inUse";
            } else {
                classNames = "";
            }
            tableList +=
                    '<li class="tooltipOverflow' + classNames + '"' +
                    ' data-original-title="' + tableName + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body">' +
                        tableName +
                    '</li>';
        }
        var otherTableList = "";
        var otherTables = [];
        for (var i in gTables) {
            var table = gTables[i];
            if (table.isActive()) {
                var tableName = table.getName();
                if (dfTablesCache.indexOf(tableName) === -1) {
                    otherTables.push(tableName);
                }
            }
        }
        otherTables.sort();

        for (var i = 0; i < otherTables.length; i++) {
            var tableName = otherTables[i];
            if (selectedTables.indexOf(tableName) > -1) {
                classNames = " inUse";
            } else {
                classNames = "";
            }
            otherTableList +=
                    '<li class="tooltipOverflow' + classNames + '"' +
                    ' data-original-title="' + tableName + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body">' +
                        tableName +
                    '</li>';

        }
        if (otherTableList.length) {
            tableList = '<div class="sectionLabel">Dataflow tables</div>' + tableList;
            tableList += '<div class="sectionLabel">Other</div>' + otherTableList;
        }
        return tableList;
    }

    function getSrcTableListHtml(tName) {
        var tableList = "";
        var selectedTables = getSelectedSrcTables();
        var classNames = "";

        for (var i = 0; i < dfTablesCache.length; i++) {
            var tableName = dfTablesCache[i];
            if (selectedTables.indexOf(tableName) > -1) {
                classNames = " inUse";
            } else if (srcRefCounts[tableName]) {
                // if only has one reference and its from the current table
                // then it's ok to allow on list
                if (srcRefCounts[tableName] === 1 &&
                    srcMap[tName] && srcMap[tName].indexOf(tableName) > -1) {
                    classNames = "";
                } else {
                    classNames = " inUse";
                }
            } else {
                classNames = "";
            }
            tableList +=
                    '<li class="tooltipOverflow' + classNames + '"' +
                    ' data-original-title="' + tableName + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body">' +
                        tableName +
                    '</li>';
        }
        return tableList;
    }

    function fillTableLists($tableDropdown) {
        var tableLis = getTableListHtml();
        $tableDropdown.find("ul").html(tableLis);
        var tableName = $tableDropdown.find(".text").val();
        $tableDropdown.find("li").filter(function() {
            return ($(this).text() === tableName);
        }).addClass("selected");
    }


    function fillSrcTableLists($tableDropdown) {
        var tableName = $tableDropdown.find(".text").val();
        var tableLis = getSrcTableListHtml(tableName);
        $tableDropdown.find("ul").html(tableLis);
        $tableDropdown.find("li").filter(function() {
            return ($(this).text() === tableName);
        }).addClass("selected");
    }

    function tableListSelect($li) {
        var tableName = $li.text();
        var $dropdown = $li.closest(".dropDownList");
        var $textBox = $dropdown.find(".text");
        var originalText = $textBox.val();

        if (originalText !== tableName) {
            $textBox.val(tableName);

            $li.siblings().removeClass("selected");
            $li.addClass("selected");
            $textBox.trigger("change");
        }
    }

    function validateDFName(dfName) {
        var isValid = xcHelper.validate([
            {
                "$ele": $newNameInput
            },
            {
                "$ele": $newNameInput,
                "error": ErrTStr.DFConflict,
                "check": function() {
                    return DF.hasDataflow(dfName);
                }
            },
            {
                "$ele": $newNameInput,
                "error": ErrTStr.DFNameIllegal,
                "check": function() {
                    return !xcHelper.checkNamePattern("dataflow", "check",
                                                      dfName);
                }
            }
        ]);
        return isValid;
    }

    function validateTable(tableId, $tableList) {
        var isValid = xcHelper.validate([
            {
                "$ele": $tableList.find(".text")
            },
            {
                "$ele": $tableList,
                "error": ErrTStr.TableNotExists,
                "check": function() {
                    return !gTables[tableId];
                }
            }
        ]);
        return isValid;
    }

    function submitForm() {
        var deferred = jQuery.Deferred();
        var dfName = $.trim($newNameInput.val());
        var invalidTableFound = false;
        var invalidColFound = false;
        var exportTables = [];
        var srcTables = [];

        if (!validateDFName(dfName)) {
            return PromiseHelper.reject();
        }

        var tableIds = [];
        $dfView.find(".group").each(function() {
            var tableName = $.trim($(this).find(".tableList .text").val());
            var tableId = xcHelper.getTableId(tableName);
            if (!validateTable(tableId, $(this).find(".tableList"))) {
                invalidTableFound = true;
                FormHelper.scrollToElement($(this).find(".tableList"),
                                            {paddingTop: 30});
                return false;
            } else {
                tableIds.push(tableId);
            }
        });

        if (invalidTableFound) {
            return PromiseHelper.reject();
        }

        $dfView.find(".group").each(function(i) {
            var $group = $(this);
            var tableId = tableIds[i];
            var table = gTables[tableId];

            var frontColNames = [];
            var backColNames = [];

            var $colList = $group.find(".cols").eq(0);

            $colList.find('li.checked').each(function() {
                var colNum = $(this).data('colnum');
                var progCol = table.getCol(colNum);
                frontColNames.push(progCol.getFrontColName(true));
                backColNames.push(progCol.getBackColName());
            });

            if (frontColNames.length === 0) {
                $group.removeClass("minimized");
                FormHelper.scrollToElement($group);
                xcTooltip.transient($colList, {
                    "title": TooltipTStr.ChooseColToExport,
                    "template": xcTooltip.Template.Error
                }, 2000);

                invalidColFound = true;
                return false;
            }

            frontColNames = exportHelper.checkColumnNames(frontColNames, $group);
            if (frontColNames == null) {
                invalidColFound = true;
                return false;
            }

            var columns = [];
            for (var i = 0, len = frontColNames.length; i < len; i++) {
                columns.push({
                    "frontCol": frontColNames[i],
                    "backCol": backColNames[i]
                });
            }

            exportTables.push({
                columns: columns,
                tableName: table.getName()
            });
        });

        if (invalidColFound) {
            return PromiseHelper.reject();
        }

        var invalidSrc = false;
        $dfView.find(".sourceTableWrap").find(".tableList .text").each(function(){
            var text = $(this).val().trim();
            if (dfTablesCache.indexOf(text) === -1) {
                invalidSrc = true;
                FormHelper.scrollToElement($(this));
                StatusBox.show("This table was not found in the selected dataflow.",
                    $(this), true);
                return false;
            }
            if (text) {
                srcTables.push(text);
            }
        });

        if (invalidSrc) {
            return PromiseHelper.reject();
        }

        formHelper.disableSubmit();
        saveFinished = false;

        checkNoDuplicateDFName(dfName)
        .then(function() {
            closeDFView();
            return DF.addDataflow(dfName, new Dataflow(dfName), exportTables, srcTables);
        })
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.SaveDF);
            // refresh dataflow lists in modal and scheduler panel
            deferred.resolve();
        })
        .fail(function(error) {
            if (error === "duplicate name") {
                xcHelper.validate([{
                    "$ele": $newNameInput,
                    "error": ErrTStr.DFConflict,
                    "check": function() {
                        return true;
                    }
                }]);
            } else {
                Alert.error(DFTStr.DFCreateFail, error);
            }

            deferred.reject();
        })
        .always(function() {
            formHelper.enableSubmit();
            saveFinished = true;
        });

        return deferred.promise();
    }

    function checkNoDuplicateDFName(dfName) {
        var deferred = jQuery.Deferred();
        XcalarGetRetina(dfName)
        .then(function() {
            deferred.reject("duplicate name");
        })
        .fail(deferred.resolve);
        return deferred.promise();
    }

    function closeDFView() {
        isOpen = false;
        $("#mainFrame").removeClass("dfCreateMode");
        $(".xcTable").find('.modalHighlighted').removeClass('modalHighlighted');
        $curDagWrap.find(".isSource").removeClass("isSource");
        $curDagWrap.find(".isAncestor")
                   .removeClass("isAncestor");
        $dfView.find(".group").not(":first").remove();
        $dfView.find(".group").removeClass("minimized");
        $dfView.find(".sourceTableWrap").empty();
        $newNameInput.val("");
        $(document).off('keypress.DFView');
        focusedThNum = null;
        focusedListNum = null;
        focusedGroupId = null;
        $curDagWrap = null;
        formHelper.clear();
        formHelper.hideView();
        exportHelper.clear();
        dfTablesCache = [];
        srcRefCounts = {};
        srcMap = {};
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFCreateView.__testOnly__ = {};
        DFCreateView.__testOnly__.submitForm = submitForm;
        DFCreateView.__testOnly__.closeDFView = closeDFView;
        DFCreateView.__testOnly__.validateDFName = validateDFName;
        DFCreateView.__testOnly__.selectAll = selectAll;
        DFCreateView.__testOnly__.deselectAll = deselectAll;
    }
    /* End Of Unit Test Only */

    return (DFCreateView);

}(jQuery, {}));
