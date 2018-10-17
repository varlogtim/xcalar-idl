window.ExportView = (function($, ExportView) {
    var $exportView;   // $("#exportView")
    var $exportName;    // $("#exportName")
    var $exportPath;    // $("#exportPath")
    var $advancedSection; // $('#xportModal .advancedSection')
    var $colList;

    var exportTableName;
    var tableId;
    var focusedThNum;
    var focusedListNum;
    var $table;

    var exportTargInfo;
    var formHelper;
    var exportHelper;
    var isOpen = false; // tracks if form is open
    var validTypes;

    ExportView.setup = function() {
        // constant
        validTypes = [ColumnType.string, ColumnType.integer, ColumnType.float,
            ColumnType.boolean, ColumnType.timestamp, ColumnType.mixed, ColumnType.undefined, ColumnType.unknown];
        $exportView = $("#exportView");
        $exportName = $("#exportName");
        $exportPath = $("#exportPath");
        $exportList = $("#exportLists");
        $advancedSection = $exportView.find('.advancedSection');
        $colList = $exportView.find('.cols');

        var columnPicker = {
            "state": "exportState",
            "noEvent": true,
            "validColTypes": validTypes
        };
        formHelper = new FormHelper($exportView, {
            "columnPicker": columnPicker
        });

        exportHelper = new ExportHelper($exportView);
        exportHelper.setup();
        // click cancel or close button
        $exportView.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            ExportView.close();
        });

        // click confirm button
        $exportView.on("click", ".confirm", function() {
            // error is handled in xcfunction.export
            submitForm();
        });

        var $list = $exportList;
        var dropdownHelper = new MenuHelper($list, {
            "onOpen": function() {
                var $lis = $list.find('li').sort(xcHelper.sortHTML);
                $lis.prependTo($list.find('ul'));
            },
            "container": "#exportLists"
        });
        dropdownHelper.setupListeners();
        new InputDropdownHint($list, {
            "preventClearOnBlur": true,
            "order": true,
            "menuHelper": dropdownHelper,
            "onEnter": function (val, $input) {
                if (val === $.trim($input.val())) {
                    return;
                }
                $input.val(val);
            }
        });

        $exportView.find('.keepOrderedCBWrap').click(function() {
            $(this).find('.checkbox').toggleClass('checked');
        });

        $exportView.on('click', '.focusTable', function() {
            if (!gTables[tableId]) {
                return;
            }
            xcHelper.centerFocusedTable(tableId, true);
        });

        $exportView.find('.advancedTitle').click(function() {
            if ($advancedSection.hasClass('collapsed')) {
                $advancedSection.addClass('expanded').removeClass('collapsed');

                // scroll to the advanced section
                var advSectionTop = $advancedSection.position().top;
                var expTitleHeight = $exportView.find('header').height();
                if (advSectionTop > expTitleHeight) {
                    var $opSection = $exportView.find('.opSection');
                    var scrollTop = advSectionTop - $opSection.position().top;
                    $exportView.find('.mainContent').animate({
                        scrollTop: scrollTop}, 500
                    );
                }
            } else {
                $advancedSection.addClass('collapsed').removeClass('expanded');
            }
        });

        $exportView.find('.selectAllWrap').click(function() {
            if ($(this).find('.checkbox').hasClass('checked')) {
                clearAllCols();
            } else {
                selectAllCols();
            }
        });

        var tableListScroller = new MenuHelper($exportView.find('.tableList'), {
            "onOpen": function() {
                fillTableList(true);
            },
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $exportView.find('.tableList').find(".text");
                var originalText = $textBox.text();

                if (originalText !== tableName) {
                    $textBox.text(tableName);
                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    tableId = $li.data('id');
                    $table = $('#xcTable-' + tableId);
                    checkSortedTable();
                    clearAllCols();
                    refreshTableColList();
                    selectAllCols();
                    // xx should we focus on the table that was selected?
                    xcHelper.centerFocusedTable(tableId, true);
                } else {
                    return;
                }
            }
        });
        tableListScroller.setupListeners();


        var expList = new MenuHelper($("#exportLists"), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $exportPath.val($li.text());
                var type = $li.data('type');
                $exportPath.data('type', type);

                checkSortedTable();
            }
        });
        expList.setupListeners();

        xcHelper.optionButtonEvent($exportView.find(".formRow"),
        function(option, $radio) {
            if ($radio.closest('.createRule').length) {
                var appendCode = ExExportCreateRuleT[option];
                if (appendCode === ExExportCreateRuleT.ExExportAppendOnly) {
                    toggleHeaderOptions(true);
                } else {
                    toggleHeaderOptions(false);
                }
            }
        });

        $advancedSection.find('.restore').click(function() {
            restoreAdvanced();
        });

        setupFormDelimiter();

        $exportView.find('.cols').on('click', 'li', function(event) {
            var $li = $(this);
            var colNum = $li.data('colnum');
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }

            if (event.shiftKey && focusedListNum != null) {
                var start = Math.min(focusedListNum, colNum);
                var end = Math.max(focusedListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i);
                    } else {
                        deselectCol(i);
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
    };

    ExportView.show = function(tablId) {
        var deferred = PromiseHelper.deferred();
        isOpen = true;
        formHelper.showView();

        tableId = tablId;
        $table = $('#xcTable-' + tableId);

        exportHelper.showHelper();

        var tableName = gTables[tableId].tableName;
        exportTableName = tableName;
        // remove anything that is not alphanumeric or _-
        $exportName.val(tableName.split('#')[0]
                   .replace(/[^a-zA-Z\d\_\-]+/g, "")).focus();
        $exportName[0].select();
        restoreAdvanced();
        fillTableList();

        addColumnSelectListeners();

        $(document).on("keypress.exportView", function(event) {
            if (event.which === keyCode.Enter &&
                gMouseEvents.getLastMouseDownTarget()
                .closest('#exportView').length && $exportView.is(":visible"))
            {
                submitForm();
            }
        });

        selectAllCols();
        refreshTableColList();

        formHelper.setup();

        XcalarListExportTargets("*", "*")
        .then(function(targs) {
            exportTargInfo = targs;
            restoreExportPaths(targs);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(ExportTStr.ListTargFail, error);
            console.error(error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    ExportView.close = function() {
        if (!isOpen) {
            return;
        }
        // xx some of this code can be reused for all operation views
        var $tableWraps = $('.xcTableWrap');
        formHelper.hideView();

        $tableWraps.find('.modalHighlighted')
                  .removeClass('modalHighlighted');

        $exportView.find('.exportRowOrderSection').addClass('xc-hidden');
        exportTableName = null;
        exportTargInfo = null;
        // leave target path as is
        $(document).off(".exportView");
        $exportView.find('.checkbox').removeClass('checked');
        $exportView.find('.checked').removeClass('checked');
        exportHelper.clear();
        $table = null;
        focusedThNum = null;
        focusedListNum = null;

        restoreAdvanced();
        restoreXcTableColumns();
        $advancedSection.addClass('collapsed').removeClass('expanded');
        formHelper.clear();
    };

    ExportView.updateColumns = function() {
        if (!formHelper.isOpen()) {
            return;
        }
        // keep deselected cols deselected and select the new cols
        // var selectedCols = exportHelper.getExportColumns();
        var nonSelectedCols = [];
        $exportView.find('.cols li:not(.checked)').each(function() {
            nonSelectedCols.push($(this).text().trim());
        });

        clearAllCols();
        refreshTableColList();
        var colNums = [];
        var $cols = $exportView.find(".cols li");
        nonSelectedCols.forEach(function(colName) {
            var $col = $cols.filter(function() {
                return $(this).text() === colName;
            });
            colNums.push($col.data("colnum"));
        });

        var allCols = gTables[tableId].getAllCols();
        for (var i = 0; i < colNums.length; i++) {
            var colNum = colNums[i];
            if (!allCols[colNum - 1].backName.trim().length ||
                allCols[colNum - 1].isDATACol()) {
                continue;
            }
            deselectCol(colNum, true);
        }
    };

    function submitForm() {
        var deferred = PromiseHelper.deferred();
        var isValid = xcHelper.validate([
            {
                "$ele": $exportView.find('.tableList').find(".text"),
                "error": ErrTStr.TableNotExists,
                "check": function() {
                    return !gTables[tableId];
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "tableNotFound"});
        }

        isValid = xcHelper.validate([
            {
                "$ele": $exportPath,
                "error": ExportTStr.LocationNotFound,
                "check": function() {
                    return $exportPath.val() === "";
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "targetNotFound"});
        }

        var keepOrder = false;
        if (checkSortedTable() &&
            $exportView.find('.keepOrderedCBWrap')
                        .find('.checkbox.checked').length) {
            keepOrder = true;
        }

        var exportName = $exportName.val().trim();

        // check export name
        isValid = xcHelper.validate([
            {
                "$ele": $exportName // checks if it's empty
            },
            {
                "$ele": $exportName,
                "error": ErrTStr.NoSpecialChar,
                "check": function() {
                    return !xcHelper.checkNamePattern("export", "check",
                                                      exportName);
                }
            },
            {
                "$ele": $exportName,
                "error": ErrTStr.TooLong,
                "check": function() {
                    return (exportName.length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "invalid input"});
        }

        // check columns to export
        var frontColumnNames = exportHelper.getExportColumns();
        var $columnsExportSection = $exportView.find('.columnsToExport');

        isValid = xcHelper.validate([
            {
                "$ele": $columnsExportSection,
                "error": ErrTStr.NoColumns,
                "check": function() {
                    return (frontColumnNames.length === 0);
                }
            },
            {
                "$ele": $columnsExportSection,
                "error": ErrTStr.InvalidColName,
                "check": function() {
                    if (!gExportNoCheck) {
                        return (frontColumnNames.join("").includes('['));
                    }
                }
            }
        ]);

        if (!isValid) {
            return PromiseHelper.reject({"error": "invalid input"});
        }

        var backColumnNames = xcHelper.convertFrontColNamesToBack(
                                    frontColumnNames, tableId, validTypes);
        // convertFrontColnamesToBack will return an array of column names if
        // successful, or will return an error object with the first
        // invalid column name

        if (backColumnNames.invalid) {
            var errorText;
            if (backColumnNames.reason === 'notFound') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": backColumnNames.name
                });
            } else if (backColumnNames.reason === "tableNotFound") {
                errorText = ErrTStr.SourceTableNotExists;
            } else if (backColumnNames.reason === 'type') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                    "name": backColumnNames.name,
                    "type": backColumnNames.type
                });
            }

            xcHelper.validate([{
                "$ele": $exportView.find(".columnsToExport"),
                "error": errorText,
                "check": function() {
                    return (true);
                }
            }]);

            isValid = false;
        }


        if (!isValid) {
            return PromiseHelper.reject({"error": "invalid input"});
        }

        frontColumnNames = exportHelper.checkColumnNames(frontColumnNames);
        if (frontColumnNames == null) {
            return PromiseHelper.reject({"error": "invalid input"});
        }

        var advancedOptions = getAdvancedOptions();
        if (advancedOptions.error) {
            xcHelper.validate([{
                "$ele": advancedOptions.$target,
                "error": advancedOptions.errorMsg,
                "check": function() {
                    return true;
                }
            }]);

            return PromiseHelper.reject({"error": "invalid advanced options"});
        }

        formHelper.disableSubmit();
        var tableName = exportTableName;
        checkDuplicateExportName(exportName, advancedOptions)
        .then(function(hasDuplicate) {
            if (hasDuplicate) {
                xcHelper.validate([{
                    "$ele": $exportName,
                    "error": ErrTStr.ExportConflict,
                    "check": function() {
                        return true;
                    }
                }]);
                formHelper.enableSubmit();
                deferred.reject();
            } else {
                var closeModal = true;
                var modalClosed = false;
                console.error("Export View is currently unsupported. Please export using the dataflow");
                closeModal = false;
                if (!modalClosed) {
                    ExportView.close();
                }

                deferred.resolve();
                formHelper.enableSubmit();

                setTimeout(function() {
                    if (closeModal) {
                        modalClosed = true;
                        ExportView.close();
                    }
                }, 200);
            }
        })
        .fail(deferred.reject); //checkDuplicateExportName only resolves

        return deferred.promise();
    }

    // if duplicate is found, returns true
    function checkDuplicateExportName(name, advancedOptions) {
        var deferred = PromiseHelper.deferred();
        if (advancedOptions.createRule !==
            ExExportCreateRuleT.ExExportCreateOnly) {
            deferred.resolve(false);
            return deferred.promise();
        }

        var targName = $exportPath.val();
        var numTargs = exportTargInfo.numTargets;
        var filePath = "";
        for (var i = 0; i < numTargs; i++) {
            if (exportTargInfo.targets[i].hdr.name === targName) {
                if (exportTargInfo.targets[i].hdr.type ===
                    ExTargetTypeT.ExTargetUDFType) {
                    deferred.resolve(false);
                    return deferred.promise();
                }
                
                if (exportTargInfo.targets[i].specificInput.sfInput) {
                    filePath = exportTargInfo.targets[i].specificInput.sfInput.url;
                }
                break;
            }
        }
        if (!filePath) {
            deferred.resolve(false);
        } else {
            XcalarListFiles({
                targetName: gDefaultSharedRoot,
                path: filePath
            })
            .then(function(result) {
                // var dupFound = false;
                for (var i = 0; i < result.numFiles; i++) {
                    if (result.files[i].name === name) {
                        deferred.resolve(true);
                        return;
                    }
                }

                deferred.resolve(false);
            })
            .fail(function(error) {
                console.error(error);
                deferred.resolve(false);
            });
        }

        return (deferred.promise());
    }

    function restoreExportPaths(targs) {
        var targets = targs.targets;
        var numTargets = targs.numTargets;
        targets.sort(sortTargets);

        var $exportList = $('#exportLists').find('ul');
        var lis = '';
        for (var i = 0; i < numTargets; i++) {
            lis += '<li data-type="' + targets[i].hdr.type + '">' + targets[i].hdr.name + '</li>';
        }
        $exportList.html(lis);
        var prevVal = $exportPath.val();
        var $selectedLi;
        if (prevVal) {
            $selectedLi = $exportList.find('li').filter(function() {
                return ($(this).text().trim() === prevVal);
            });
        }
        if (!prevVal || !$selectedLi.length) {
            prevVal = "Default";
            $selectedLi = $exportList.find('li').filter(function() {
                return ($(this).text().trim() === prevVal);
            });
        }

        $exportPath.val(prevVal).attr('value', prevVal);
        var type = $selectedLi.data('type');
        $exportPath.data('type', type);
        checkSortedTable();

        function sortTargets(a, b) {
            return xcHelper.sortVals(a.hdr.name, b.hdr.name);
        }
    }

    function addColumnSelectListeners() {
        $("#mainFrame").on("mousedown.addColToExport", ".xcTable th",
        function(event) {
            xcMenu.close($('#colMenu'));
            if ($(event.target).hasClass('colGrab')) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            gMouseEvents.setMouseDownTarget($(event.target));
        });

        $("#mainFrame").on("click.addColToExport", ".xcTable th",
        function(event) {
            var $th = $(this);
            var colNum = xcHelper.parseColNum($th);
            var tblId = $th.closest('.xcTable').data('id');
            if (tblId !== tableId) {
                return;
            }
            var table = gTables[tblId];

            if (colNum === 0) {
                selectAllCols();
                return;
            }
            // event.target is not reliable here for some reason so that is
            // why we're using last mousedown target
            var $mousedownTarg = gMouseEvents.getLastMouseDownTarget();
            if ($mousedownTarg.closest('.dropdownBox').length) {
                return;
            }
            if (isInvalidTableCol($mousedownTarg)) {
                return;
            }

            var progCol = table.getCol(colNum);

            if (progCol.isEmptyCol() || progCol.isDATACol()) {
                return;
            } else if (!gExportNoCheck &&!validTypes.includes(progCol.getType())) {
                return;
            }
            var toHighlight = !$th.hasClass("modalHighlighted");

            if (event.shiftKey && focusedThNum != null) {
                var start = Math.min(focusedThNum, colNum);
                var end = Math.max(focusedThNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i);
                    } else {
                        deselectCol(i);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum);
                } else {
                    deselectCol(colNum);
                }
            }
            focusedThNum = colNum;
            focusedListNum = null;
        });
    }

    // enables or disables radio depending on overwrite options
    // if appending, then we only allow header=none
    function toggleHeaderOptions(disable) {
        var $row =  $advancedSection.find('.headerType');
        if (disable) {
            $row.children().addClass('xc-disabled');
            xcTooltip.changeText($row, ExportTStr.DisableHeader);
        } else {
            $row.children().removeClass('xc-disabled');
            xcTooltip.changeText($row, "");
        }
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

    // we only allow option to preserve sorted order if the current table
    // is already sorted and the export target is SFType
    function checkSortedTable() {
        var exportType = $exportPath.data('type');

        var isTableOrdered = false;
        if (!gTables[tableId]) {
            return false;
        }
        var backTableMeta = gTables[tableId].backTableMeta;
        if (backTableMeta) {
            var order = backTableMeta.ordering;
            if (order === XcalarOrderingT.XcalarOrderingAscending ||
                order === XcalarOrderingT.XcalarOrderingDescending) {
                isTableOrdered = true;
            }
        }

        if (isTableOrdered &&
            parseInt(exportType) === ExTargetTypeT.ExTargetSFType) {
            $exportView.find('.exportRowOrderSection')
                        .removeClass('xc-hidden');
            return true;
        } else {
            $exportView.find('.exportRowOrderSection')
                        .addClass('xc-hidden');
            return false;
        }
    }

    function fillTableList(refresh) {
        var tableLis = WSManager.getTableList();
        var $tableListSection = $exportView.find('.tableListSection');
        $tableListSection.find('ul').html(tableLis);
        var tableName;
        // select li and fill left table name dropdown
        if (refresh) {
            tableName = $tableListSection.find('.dropDownList .text').text();
        } else {
            tableName = gTables[tableId].getName();
            $tableListSection.find('.dropDownList .text').text(tableName);
            checkSortedTable();
        }

        $tableListSection.find('li').filter(function() {
            return ($(this).text() === tableName);
        }).addClass('selected');
    }

    function selectCol(colNum) {
        if (!gTables[tableId]) {
            return;
        }
        var colType = gTables[tableId].getCol(colNum).getType();
        if (!gExportNoCheck && !validTypes.includes(colType)) {
            return;
        }
        $table.find('.col' + colNum).addClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]')
                .addClass('checked')
                .find('.checkbox').addClass('checked');
        checkToggleSelectAllBox();
        exportHelper.clearRename();
    }

    function deselectCol(colNum) {
        $table.find('.col' + colNum)
                            .removeClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]')
                .removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
        exportHelper.clearRename();
    }

    // if all lis are checked, select all checkbox will be checked as well
    function checkToggleSelectAllBox() {
        var totalCols = $exportView.find('.cols li').length;
        var selectedCols = $exportView.find('.cols li.checked').length;
        if (selectedCols === 0) {
            $exportView.find('.selectAllWrap').find('.checkbox')
                                              .removeClass('checked');
        } else if (selectedCols === totalCols) {
            $exportView.find('.selectAllWrap').find('.checkbox')
                                              .addClass('checked');
        }
    }

    function restoreXcTableColumns() {
        // removes listeners and classes for .xcTable
        var $tables = $('.xcTable');
        var $ths = $tables.find('th');
        $("#mainFrame").off(".addColToExport");
        $ths.removeClass('modalHighlighted');
        $tables.find('td').removeClass('modalHighlighted');

        // $ths.find('input').css('pointer-events', 'initial');
        focusedThNum = null;
        focusedListNum = null;
    }

    function selectAllCols() {
        var table = gTables[tableId];
        if (!table) {
            return;
        }
        var $selectableThs = $table.find("th").filter(function() {
            var $th = $(this);
            var colNum = xcHelper.parseColNum($th);
            if (colNum <= 0) {
                // row marker
                return false;
            }

            var progCol = table.getCol(colNum);
            if (progCol.isEmptyCol() || progCol.isDATACol()) {
                return false;
            }

            return gExportNoCheck || validTypes.includes(progCol.getType());
        });
        $selectableThs.each(function() {
            var colNum = xcHelper.parseColNum($(this));
            $(this).addClass('modalHighlighted');
            $table.find('td.col' + colNum).addClass('modalHighlighted');
        });

        $exportView.find('.cols li').addClass('checked')
                   .find('.checkbox').addClass('checked');
        $exportView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');

        focusedThNum = null;
        focusedListNum = null;
        exportHelper.clearRename();
    }

    function clearAllCols() {
        $('.xcTable').find('th.modalHighlighted, td.modalHighlighted')
                    .removeClass('modalHighlighted');
        $exportView.find('.cols li').removeClass('checked')
                   .find('.checkbox').removeClass('checked');
        $exportView.find('.selectAllWrap').find('.checkbox')
                                          .removeClass('checked');
        focusedThNum = null;
        focusedListNum = null;
        exportHelper.clearRename();
    }

    function setupFormDelimiter() {
         // set up dropdown list for csv de

        // setUp both line delimiter and field delimiter
        var delimLists = new MenuHelper(
            $exportView.find('.csvRow').find(".dropDownList"), {
                "container": "#exportView",
                "bounds": "#exportView",
                "onSelect": function($li) {
                    var $input = $li.closest(".dropDownList").find(".text");
                    switch ($li.attr("name")) {
                        case "default":
                            if ($input.hasClass("fieldDelim")) {
                                $input.val("\\t");
                            } else {
                                $input.val("\\n");
                            }
                            $input.removeClass("nullVal");
                            return false;
                        case "comma":
                            $input.val(",");
                            $input.removeClass("nullVal");
                            return false;
                        case "null":
                            $input.val("Null");
                            $input.addClass("nullVal");
                            return false;
                        default:
                            // keep list open
                            return true;
                    }
                }
            });
        delimLists.setupListeners();

        // Input event on csv args input box
        $exportView.find('.csvRow').on({
            "keypress": function(event) {
                // prevent form to be submitted
                if (event.which === keyCode.Enter) {
                    return false;
                }
            },
            "keyup": function(event) {
                // input other delimiters
                if (event.which === keyCode.Enter) {
                    var $input = $(this);

                    event.stopPropagation();
                    applyOtherDelim($input);
                }
            }
        }, ".delimVal");

        $exportView.find(".inputAction").on("mousedown", function() {
            var $input = $(this).siblings(".delimVal");
            applyOtherDelim($input);
        });
    }

    function applyOtherDelim($input) {
        if ($input == null || $input.length === 0) {
            // invalid case
            return;
        }

        var val = $input.val();
        if (val !== "") {
            $input.closest(".dropDownList")
                    .find(".text").val(val).removeClass("nullVal");
            $input.val("").blur();
            hideDropdownMenu();
        }
    }

    function hideDropdownMenu() {
        $exportView.find(".dropDownList").removeClass("open")
                            .find(".list").hide();
        $exportView.find('.csvRow').find(".delimVal").val("");
    }

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $advancedSection.find('.csvRow').find('.text').removeClass("nullVal");
    }

    function restoreAdvanced() {
        var $formRow;
        $advancedSection.find('.formRow').each(function(){
            $formRow = $(this);
            var $radios = $formRow.find('.radioButton');
            if ($radios.length) {
                $radios.removeClass('active');
                $radios.eq(0).addClass('active');
            }
        });

        var $input;
        $advancedSection.find('.csvRow').each(function() {
            $input = $(this).find(".dropDownList").find(".text");
            if ($input.hasClass("fieldDelim")) {
                $input.val("\\t");
            } else {
                $input.val("\\n");
            }
        });
        resetDelimiter();
        toggleHeaderOptions(false);
    }

    function refreshTableColList() {
        var colHtml = ExportHelper.getTableCols(tableId, validTypes);
        $exportView.find('.cols').html(colHtml);
        $exportView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');
        if ($exportView.find(".cols li").length === 0) {
            $exportView.find(".exportColumnsSection").addClass("empty");
        } else {
            $exportView.find(".exportColumnsSection").removeClass("empty");
        }
    }

    // get selected options when submitting form
    function getAdvancedOptions() {
        var options = {};
        options.format = DfFormatTypeT.DfFormatCsv;
        options.splitType = ExSFFileSplitTypeT[$advancedSection
                                                .find('.splitType')
                                                .find('.radioButton.active')
                                                .data('option')];
        options.headerType = ExSFHeaderTypeT[$advancedSection
                                                .find('.headerType')
                                                .find('.radioButton.active')
                                                .data('option')];
        options.createRule = ExExportCreateRuleT[$advancedSection
                                                .find('.createRule')
                                                .find('.radioButton.active')
                                                .data('option')];

        // if appending, then we only allow header=none
        if (options.createRule === ExExportCreateRuleT.ExExportAppendOnly) {
            options.headerType = ExSFHeaderTypeT.ExSFHeaderNone;
        }


        options.csvArgs = {};
        var $fieldDelim = $advancedSection.find('.fieldDelim');
        var $recordDelim = $advancedSection.find('.recordDelim');
        options.csvArgs.fieldDelim = xcHelper.delimiterTranslate($fieldDelim
                                                );
        options.csvArgs.recordDelim = xcHelper.delimiterTranslate(
                                                $recordDelim);
        if (options.csvArgs.fieldDelim === "") {
            options.error = true;
            options.errorMsg = ErrTStr.NoEmpty;
            options.$target = $fieldDelim;
        } else if (options.csvArgs.recordDelim === "") {
            options.error = true;
            options.errorMsg = ErrTStr.NoEmpty;
            options.$target = $recordDelim;
        }

        return (options);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        ExportView.__testOnly__ = {};
        ExportView.__testOnly__.getAdvancedOptions = getAdvancedOptions;
        ExportView.__testOnly__.submitForm = submitForm;
        ExportView.__testOnly__.checkDuplicateExportName = checkDuplicateExportName;
        ExportView.__testOnly__.checkSortedTable = checkSortedTable;
        ExportView.__testOnly__.applyOtherDelim = applyOtherDelim;
        ExportView.__testOnly__.restoreAdvanced = restoreAdvanced;

    }
    /* End Of Unit Test Only */


    return (ExportView);
}(jQuery, {}));
