window.ExportView = (function($, ExportView) {
    var $exportView;   // $("#exportView")
    var $exportName;    // $("#exportName")
    var $exportPath;    // $("#exportPath")
    var $exportColumns; // $("#exportColumns")
    var $advancedSection; // $('#xportModal .advancedSection')
    var $colList;

    var $selectableThs;
    var exportTableName;
    var tableId;
    var focusedThNum;
    var focusedListNum;
    var $table;

    var exportTargInfo;
    var formHelper;
    var isOpen = false; // tracks if form is open

    // constant
    var validTypes = ['string', 'integer', 'float', 'boolean'];

    ExportView.setup = function() {
        $exportView = $("#exportView");
        $exportName = $("#exportName");
        $exportPath = $("#exportPath");
        $exportColumns = $("#exportColumns");
        $advancedSection = $exportView.find('.advancedSection');
        $colList = $exportView.find('.cols');

        var columnPicker = {
            "state"  : "exportState",
            "noEvent": true
        };
        formHelper = new FormHelper($exportView, {
            "columnPicker": columnPicker
        });

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

                // only show export in sorted order if file stystem
                if (parseInt(type) === ExTargetTypeT.ExTargetSFType) {
                    $exportView.find('.exportRowOrderSection')
                                .removeClass('xc-hidden');
                } else {
                    $exportView.find('.exportRowOrderSection')
                                .addClass('xc-hidden');
                }
            }
        });
        expList.setupListeners();

        xcHelper.optionButtonEvent($exportView.find(".formRow"), function(option, $radio) {
            if ($radio.closest(".typeRow").length > 0) {
                if (option !== "DfFormatCsv") {
                    $advancedSection.find('.csvRow').removeClass('csvSelected')
                                                    .addClass('csvHidden');
                } else {
                    $advancedSection.find('.csvRow').addClass('csvSelected')
                                                     .removeClass('csvHidden');
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
        isOpen = true;
        formHelper.showView();

        tableId = tablId;
        $table = $('#xcTable-' + tableId);

        $('.xcTableWrap').addClass('exportViewOpen');

        var tableName = gTables[tableId].tableName;
        exportTableName = tableName;
        $exportName.val(tableName.split('#')[0].replace(/[\W_]+/g, "")).focus();
        $exportName[0].select();
        restoreAdvanced();
        fillTableList();

        addColumnSelectListeners();

        $(document).on("keypress.exportView", function(e) {
            if (e.which === keyCode.Enter &&
                                gMouseEvents.getLastMouseDownTarget()
                                            .closest('#dfCreateView').length) {
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
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    ExportView.close = function() {
        if (!isOpen) {
            return;
        }
        // xx some of this code can be reused for all operation views
        var $tableWraps = $('.xcTableWrap');
        formHelper.hideView();

        $tableWraps.removeClass('exportViewOpen');
        $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .removeClass('tableOpSection');


        $tableWraps.find('.modalHighlighted')
                  .removeClass('modalHighlighted');
           
        $exportView.find('.exportRowOrderSection').addClass('xc-hidden');
        exportTableName = null;
        exportTargInfo = null;
        $exportPath.val("");
        $exportColumns.val("");
        $('.exportable').removeClass('exportable');
        $selectableThs = null;
        $(document).off(".exportView");
        $exportView.find('.checkbox').removeClass('checked');
        $exportView.find('.checked').removeClass('checked');
        $table = null;
        focusedThNum = null;
        focusedListNum = null;

        restoreAdvanced();
        restoreXcTableColumns();
        $advancedSection.addClass('collapsed').removeClass('expanded');
        formHelper.clear();

        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    };

    function submitForm() {
        var deferred = jQuery.Deferred();

        var keepOrder = false;
        if (parseInt($exportPath.data('type')) === ExTargetTypeT.ExTargetSFType 
            && $exportView.find('.keepOrderedCBWrap')
                          .find('.checkbox.checked').length) {
            keepOrder = true;
        }

        var exportName = $exportName.val().trim();
        var columnsVal = [];
        var columnsValStr = ""; // used to search for invalid characters
        $exportView.find('.cols li.checked').each(function() {
            columnsVal.push($(this).text().trim());
            columnsValStr += $(this).text().trim();
        });

        var isValid = xcHelper.validate([
            {
                "$ele": $exportName // checks if it's empty
            },
            {
                "$ele" : $exportName,
                "error": ErrTStr.NoSpecialChar,
                "check": function() {
                    return xcHelper.hasSpecialChar(exportName);
                }
            },
            {
                "$ele" : $exportName,
                "error": ErrTStr.TooLong,
                "check": function() {
                    return ($exportName.val().length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                }
            },
            {
                "$ele" : $exportView.find('.columnsWrap'),
                "error": ErrTStr.NoColumns,
                "check": function() {
                    return (columnsVal.length === 0);
                }
            },
            {
                "$ele" : $exportView.find('.columnsWrap'),
                "error": ErrTStr.InvalidColName,
                "check": function() {
                    if (!gExportNoCheck) {
                        return (columnsValStr.indexOf('[') !== -1);
                    }
                }
            }
        ]);

        if (!isValid) {
            deferred.reject({error: 'invalid input'});
            return (deferred.promise());
        }

        var frontColumnNames = columnsVal;
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
            } else if (backColumnNames.reason === 'type') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                    "name": backColumnNames.name,
                    "type": backColumnNames.type
                });
            }

            xcHelper.validate([{
                "$ele" : $exportColumns,
                "error": errorText,
                "check": function() {
                    return (true);
                }
            }]);
            isValid = false;
        }


        if (!isValid) {
            deferred.reject({error: 'invalid input'});
            return (deferred.promise());
        }

        var advancedOptions = getAdvancedOptions();
        if (advancedOptions.error) {
            xcHelper.validate([{
                "$ele" : advancedOptions.$target,
                "error": advancedOptions.errorMsg,
                "check": function() {
                    return true;
                }
            }]);
            return (deferred.promise());
        }

        checkDuplicateExportName(exportName, advancedOptions)
        .then(function(hasDuplicate) {
            if (hasDuplicate) {
                xcHelper.validate([{
                    "$ele" : $exportName,
                    "error": ErrTStr.ExportConflict,
                    "check": function() {
                        return true;
                    }
                }]);
            } else {
                var closeModal = true;
                var modalClosed = false;

                xcFunction.exportTable(exportTableName, exportName,
                                       $exportPath.val(),
                                       frontColumnNames.length,
                                       backColumnNames, frontColumnNames,
                                       keepOrder, false, advancedOptions)
                .then(function() {
                    closeModal = false;
                    if (!modalClosed) {
                        ExportView.close();
                    }

                    deferred.resolve();
                })
                .fail(function(error) {
                    closeModal = false;
                    deferred.reject(error);
                });

                setTimeout(function() {
                    if (closeModal) {
                        modalClosed = true;
                        ExportView.close();
                    }
                }, 200);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    // if duplicate is found, returns true
    function checkDuplicateExportName(name, advancedOptions) {
        var deferred = jQuery.Deferred();
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
                filePath = exportTargInfo.targets[i].specificInput.sfInput.url;
                break;
            }
        }
        if (filePath === "") {
            deferred.resolve(false);
        } else {
            XcalarListFiles(filePath, false)
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
                console.log(error);
                deferred.resolve(false);
            });
        }

        return (deferred.promise());
    }

    function restoreExportPaths(targs) {
        var targets = targs.targets;
        var numTargets = targs.numTargets;
        var $exportList = $('#exportLists').find('ul');
        var lis = '<li class="hint">Choose a target</li>';
        for (var i = 0; i < numTargets; i++) {
            lis += '<li data-type="' + targets[i].hdr.type + '">' + targets[i].hdr.name + '</li>';
        }
        $exportList.html(lis);
        var $defaultLi = $exportList.find('li').filter(function() {
            return ($(this).text().indexOf('Default') === 0);
        });

        $exportPath.val($defaultLi.text()).attr('value', $defaultLi.text());
        var type = $defaultLi.data('type')
        $exportPath.data('type', type);
        if (parseInt(type) === ExTargetTypeT.ExTargetSFType) {
            $exportView.find('.exportRowOrderSection')
                        .removeClass('xc-hidden');
        } else {
            $exportView.find('.exportRowOrderSection')
                        .addClass('xc-hidden');
        }
    }

    function addColumnSelectListeners() {
        var $tables = $('.xcTable');

        // select ths that are not arrays or objects
        var $ths = $tables.find('.header').filter(function() {
            var $header = $(this);
            var $th = $header.parent();
            var colNum = xcHelper.parseColNum($th) - 1;
            var tblId = $th.closest('.xcTable').data('id');
            var tableCols = gTables[tblId].tableCols;
            if (colNum === -1) {
                return true;
            }

            if (gExportNoCheck) {
                if (tableCols[colNum].isEmptyCol() ||
                    tableCols[colNum].isDATACol()) {
                    return false;
                }
                return true;
            }

            var classes = $header.attr('class').replace('type-', '').split(' ');
            var validTypeFound = false;
            for (var i = 0; i < classes.length; i++) {
                if (validTypes.indexOf(classes[i]) > -1) {
                    validTypeFound = true;
                    break;
                }
            }
            return (validTypeFound);

        }).parent();

        $selectableThs = $ths.not('.rowNumHead');

        // $ths.find('input').css('pointer-events', 'none');
        $ths.addClass('exportable');

        $ths.on('mousedown.addColToExport', function(event) {
            closeMenu($('#colMenu'));
            if ($(event.target).hasClass('colGrab')) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            gMouseEvents.setMouseDownTarget($(event.target));
        });


        $tables.on('click.addColToExport', '.exportable', function(event) {
            // var $table = $(this).closest('.xcTable');

            // event.target is not reliable here for some reason so that is
            // why we're using last mousedown target
            var $mousedownTarg = gMouseEvents.getLastMouseDownTarget();
            if ($mousedownTarg.closest('.dropdownBox').length) {
                return;
            }
            if (isInvalidTableCol($mousedownTarg)) {
                return;
            }

            var $th = $(this);

            if ($th.hasClass('rowNumHead')) {
                selectAllCols();
                return;
            }

            var colNum = xcHelper.parseColNum($th) - 1;
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

    function isInvalidTableCol($target) {
        if ($target.closest(".dataCol").length ||
            $target.closest(".jsonElement").length ||
            $target.closest(".dropdownBox").length) {
            return true;
        } else {
            return false;
        }
    }

    function fillTableList(refresh) {
        var tableLis = xcHelper.getWSTableList();
        var $tableListSection = $exportView.find('.tableListSection');
        $tableListSection.find('ul').html(tableLis);
        var tableName;
        // select li and fill left table name dropdown
        if (refresh) {
            tableName = $tableListSection.find('.dropDownList .text').text();
        } else {
            tableName = gTables[tableId].getName();
            $tableListSection.find('.dropDownList .text').text(tableName);
        }

        $tableListSection.find('li').filter(function() {
            return ($(this).text() === tableName);
        }).addClass('selected');
    }

    function selectCol(colNum) {
        var colType = gTables[tableId].tableCols[colNum].type;
        if (validTypes.indexOf(colType) === -1) {
            return;
        }
        $table.find('.col' + (colNum + 1)).addClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]')
                .addClass('checked')
                .find('.checkbox').addClass('checked');
        checkToggleSelectAllBox();
    }

    function deselectCol(colNum) {
        $table.find('.col' + (colNum + 1))
                            .removeClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]')
                .removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
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
        $tables.off('click.addColToExport');
        $ths.off('mousedown.addColToExport');
        $ths.removeClass('modalHighlighted');
        $tables.find('td').removeClass('modalHighlighted');

        // $ths.find('input').css('pointer-events', 'initial');
        focusedThNum = null;
        focusedListNum = null;
    }

    function selectAllCols() {
        $selectableThs.each(function() {
            var colNum = xcHelper.parseColNum($(this));
            var $table = $(this).closest('.xcTable');
            var tblId = $table.data('id');
            if (tblId === tableId) {
                $(this).addClass('modalHighlighted');
                $table.find('td.col' + colNum).addClass('modalHighlighted');
            }
        });
        $exportView.find('.cols li').addClass('checked')
                   .find('.checkbox').addClass('checked');
        $exportView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');
        
        focusedThNum = null;
        focusedListNum = null;
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
    }

    function setupFormDelimiter() {
         // set up dropdown list for csv de

        // setUp both line delimiter and field delimiter
        var delimLists = new MenuHelper(
            $exportView.find('.csvRow').find(".dropDownList"), {
                "container": "#exportView",
                "bounds"   : "#exportView",
                "onSelect" : function($li) {
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
        $advancedSection.find('.csvRow').addClass('csvSelected')
                                        .removeClass('csvHidden');

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
    }

    function refreshTableColList() {
        var colHtml = getTableColList();
        $exportView.find('.cols').html(colHtml);
        $exportView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');
    }

    // each li has data-colnum that will link it to the corresponding
    // xcTable header
    function getTableColList() {
        var html = "";
        var numBlanks = 10; // to take up flexbox space
        var allCols = gTables[tableId].tableCols;
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
            if (validTypes.indexOf(progCol.getType()) > -1) {
                var colName = progCol.getFrontColName(true);
                html += '<li class="checked" data-colnum="' + i + '">' +
                            '<span class="text  tooltipOverflow" ' +
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
        for (var i = 0; i < numBlanks; i++) {
            html += '<div class="flexSpace"></div>';
        }
        return (html);
    }


    // get selected options when submitting form
    function getAdvancedOptions() {

        var options = {};
        options.format = DfFormatTypeT[$advancedSection.find('.typeRow')
                                                .find('.radioButton.active')
                                                .data('option')];
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

        if (options.format === DfFormatTypeT.DfFormatCsv) {
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
        } else if (options.format === DfFormatTypeT.DfFormatSql) {
            options.sqlArgs = {};

            // XX are there sql specific arguments?
        } else {
            options.error = true;
            options.errorMsg = ExportTStr.InvalidType;
            options.$target = $exportView.find('.typeRow');
        }
        return (options);
    }

    return (ExportView);
}(jQuery, {}));
