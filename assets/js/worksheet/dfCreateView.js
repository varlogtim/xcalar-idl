window.DFCreateView = (function($, DFCreateView) {
    var $dfView;          // $('#dfCreateView')
    var $newNameInput; //     $('#newDFNameInput')
    var focusedThNum = null; // last table header clicked, for shift+click
    var focusedListNum = null; // last list number clicked, for shift+click
    var $colList;           //$dfView.find('.cols')
    // var $curDagWrap;

    var tableName;
    var formHelper;
    var exportHelper;
    var tableId;
    // constant
    var validTypes = ['string', 'integer', 'float', 'boolean'];
    var isOpen = false; // tracks if form is open
    var saveFinished = true; // tracks if last submit ended

    DFCreateView.setup = function() {
        $dfView = $('#dfCreateView');
        $newNameInput = $('#newDFNameInput');
        $colList = $dfView.find('.cols');

        formHelper = new FormHelper($dfView, {
            "focusOnOpen" : true,
            "columnPicker": {
                "state"  : "dataflowState",
                "noEvent": true
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
        if ($dagWrap.hasClass('fromRetina')) {
            Alert.error(DFGTStr.CannotCreate, DFGTStr.CannotCreateMsg);
            return;
        }

        isOpen = true;
        $curDagWrap = $dagWrap;

        var wasMenuOpen = formHelper.showView();
        tableName = $dagWrap.find('.tableName').text();
        tableId = xcHelper.getTableId(tableName);


        $(document).on("keypress.DFView", function(e) {
            if (e.which === keyCode.Enter &&
                (gMouseEvents.getLastMouseDownTarget()
                             .closest('#dfCreateView').length ||
                $newNameInput.is(':focus'))) {
                submitForm();
            }
        });

        var onlyIfNeeded = true;
        DagPanel.heightForDFView(wasMenuOpen, onlyIfNeeded);
        createColumnsList();
        selectInitialTableCols();
        setupTableColListeners();
        formHelper.setup();
        exportHelper.showHelper();

        if (!wasMenuOpen) {
            // due to lag if many columns are present, do another table
            // alignment 500 ms after menu opens
            setTimeout(function() {
                if (isOpen) {
                    moveTableDropdownBoxes();
                    moveTableTitles();
                    moveFirstColumn(); 
                }
            }, 500); 
        }
    };

    DFCreateView.close = function() {
        if (isOpen) {
            closeDFView();
        }
    };

    function createColumnsList() {
        var colHtml = ExportHelper.getTableCols(tableId, validTypes);
        $colList.html(colHtml);
        if ($colList.find('li').length === 0) {
            $dfView.find('.exportColumnsSection').addClass('empty');
        } else {
            $dfView.find('.exportColumnsSection').removeClass('empty');
        }
        $dfView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');

    }

    function selectAll() {
        // var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        $colList.find('li').each(function() {
            var $li = $(this);
            if (!$li.hasClass('checked')) {
                var colNum = $li.data('colnum');
                $li.addClass('checked').find('.checkbox').addClass('checked');
                $xcTable.find('.col' + colNum)
                        .addClass('modalHighlighted');
            }
        });
        $dfView.find('.selectAllWrap').find('.checkbox').addClass('checked');
        focusedThNum = null;
        focusedListNum = null;
        exportHelper.clearRename();
    }

    function deselectAll() {
        // var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        $colList.find('li.checked').each(function() {
            var $li = $(this);
            var colNum = $li.data('colnum');
            $li.removeClass('checked').find('.checkbox').removeClass('checked');
            $xcTable.find('.col' + colNum)
                    .removeClass('modalHighlighted');
        });
        $dfView.find('.selectAllWrap').find('.checkbox')
                                      .removeClass('checked');
        focusedThNum = null;
        focusedListNum = null;
        exportHelper.clearRename();
    }

    function selectInitialTableCols() {
        var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        for (var i = 0; i < allCols.length; i++) {
            if (validTypes.indexOf(allCols[i].type) > -1) {
                $xcTable.find('.col' + (i + 1)).addClass('modalHighlighted');
            }
        }
    }

    function setupTableColListeners() {
        $("#xcTableWrap-" + tableId).addClass("allowSelectAll");
        $("#xcTable-" + tableId).on("click.columnPicker", "th, td.clickable", function(event) {
            var $target = $(event.target);
            if (isInvalidTableCol($target)) {
                return;
            }
            if ($target.closest('.rowNumHead').length) {
                selectAll();
                return;
            }
            var $cell = $(this);
            var colNum = xcHelper.parseColNum($cell);
            var toHighlight = !$cell.hasClass("modalHighlighted");


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

    function selectCol(colNum) {
        var colType = gTables[tableId].getCol(colNum).getType();
        if (validTypes.indexOf(colType) === -1) {
            return;
        }
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]').addClass('checked')
                .find('.checkbox').addClass('checked');

        checkToggleSelectAllBox();
        exportHelper.clearRename();
    }

    function deselectCol(colNum) {
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .removeClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]').removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
        exportHelper.clearRename();
    }

    // if all lis are checked, select all checkbox will be checked as well
    function checkToggleSelectAllBox() {
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

    function saveDataFlow(dataflowName, columns, tableName) {
        var dataflowParams = {
            "tableName": tableName,
            "columns"  : columns,
        };

        var df = new Dataflow(dataflowName, dataflowParams);

        return (DF.addDataflow(dataflowName, df));
    }

    function addFormEvents() {
        $dfView.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeDFView();
        });

        $dfView.on("click", ".confirm", function() {
            submitForm();
        });


        $colList.on('click', 'li', function(event) {
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

        $dfView.find('.selectAllWrap').click(function() {
            if ($(this).find('.checkbox').hasClass('checked')) {
                deselectAll();
            } else {
                selectAll();
            }
        });
    }

    function validateDFName(dfName) {
        var isValid = xcHelper.validate([
            {
                "$ele": $newNameInput
            },
            {
                "$ele" : $newNameInput,
                "error": ErrTStr.DFConflict,
                "check": function() {
                    return DF.hasDataflow(dfName);
                }
            },
            {
                "$ele" : $newNameInput,
                "error": ErrTStr.DFNameIllegal,
                "check": function() {
                    var regex = new RegExp("^[a-zA-Z0-9_-]*$");
                    return !regex.test(dfName);
                }
            }
        ]);
        return isValid;
    }

    function validateCurTable() {
        var isValid = xcHelper.validate([
            {
                "$ele" : $dfView.find('.confirm'),
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
        var isValid;

        var dfName = $newNameInput.val().trim();

        if (!validateDFName(dfName)) {
            deferred.reject();
            return deferred.promise();
        }

        if (!validateCurTable()) {
            deferred.reject();
            return deferred.promise();
        }

        var table = gTables[tableId];


        var frontColNames = [];
        var backColNames = [];

        $colList.find('li.checked').each(function() {
            var colNum = $(this).data('colnum');
            var progCol = table.getCol(colNum);
            frontColNames.push(progCol.getFrontColName(true));
            backColNames.push(progCol.getBackColName());
        });

        if (frontColNames.length === 0) {
            xcTooltip.transient($colList, {
                "title"   : TooltipTStr.ChooseColToExport,
                "template": xcTooltip.Template.Error
            }, 1500);

            deferred.reject();
            return deferred.promise();
        }

        frontColNames = exportHelper.checkColumnNames(frontColNames);
        if (frontColNames == null) {
            deferred.reject();
            return deferred.promise();
        }

        var columns = [];
        for (var i = 0, len = frontColNames.length; i < len; i++) {
            columns.push({
                "frontCol": frontColNames[i],
                "backCol" : backColNames[i]
            });
        }

        formHelper.disableSubmit();

        // XXX This part is buggy,
        // thrift call maybe slow, and next time open the modal
        // the call may still not finish yet!!!
        saveFinished = false;
        saveDataFlow(dfName, columns, gTables[tableId].tableName)
        .then(function() {
            xcHelper.showSuccess();
            // refresh dataflow lists in modal and scheduler panel
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DFTStr.DFCreateFail, error);
            deferred.reject();
        })
        .always(function() {
            formHelper.enableSubmit();
            saveFinished = true;
        });

        closeDFView();

        return deferred.promise();
    }


    function closeDFView() {
        resetDFView();
        isOpen = false;
    }

    function resetDFView() {
        $("#xcTableWrap-" + tableId).removeClass("allowSelectAll");
        $("#xcTable-" + tableId).off(".columnPicker");
        $("#xcTable-" + tableId).find('.modalHighlighted')
                                .removeClass('modalHighlighted');
        formHelper.hideView();

        $newNameInput.val("");
        $(document).off('keypress.DFView');
        focusedThNum = null;
        focusedListNum = null;
        $curDagWrap = null;
        formHelper.clear();
        exportHelper.clear();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFCreateView.__testOnly__ = {};
        DFCreateView.__testOnly__.submitForm = submitForm;
        DFCreateView.__testOnly__.resetDFView = resetDFView;
        DFCreateView.__testOnly__.validateDFName = validateDFName;
        DFCreateView.__testOnly__.selectAll = selectAll;
        DFCreateView.__testOnly__.deselectAll = deselectAll;
    }
    /* End Of Unit Test Only */

    return (DFCreateView);

}(jQuery, {}));
