window.DFCreateView = (function($, DFCreateView) {
    var $dfView;          // $('#dfCreateView')
    var $newNameInput; //     $('#newDFNameInput')
    var focusedThNum = null; // last table header clicked, for shift+click
    var focusedListNum = null; // last list number clicked, for shift+click
    var $colList;           //$dfView.find('.cols')
    var $curDagWrap;

    var tableName;
    var formHelper;
    var tableId;
    // constant
    var validTypes = ['string', 'integer', 'float', 'boolean'];
    var isOpen = false; // tracks if form is open
    var saveFinished = true; // tracks if last submit ended
    var mainMenuPrevState;

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

        addFormEvents();
    };

    DFCreateView.show = function($dagWrap) {
        if (!saveFinished) { // did not finish saving from last form submit
            return;
        }
        isOpen = true;
        $curDagWrap = $dagWrap;
        mainMenuPrevState = MainMenu.getState();
        $('#workspaceMenu').find('.menuSection').addClass('xc-hidden');
        $dfView.removeClass('xc-hidden');
        var wasMenuOpen = false;
        if (!MainMenu.isMenuOpen("mainMenu")) {
            MainMenu.open();
        } else {
            BottomMenu.close(true);
            wasMenuOpen = false;
        }

        tableName = $dagWrap.find('.tableName').text();
        tableId = xcHelper.getTableId(tableName);


        $(document).on("keypress.DFView", function(e) {
            if (e.which === keyCode.Enter &&
                gMouseEvents.getLastMouseDownTarget()
                            .closest('#dfCreateView').length) {

                submitForm();
            }
        });

        var onlyIfNeeded = true;
        DagPanel.heightForDFView(wasMenuOpen, onlyIfNeeded);
        createColumnsList();
        selectInitialTableCols();
        setupTableColListeners();
     
        // $newNameInput.focus();
        formHelper.setup();
    };

    DFCreateView.close = function() {
        if (isOpen) {
            closeDFView();
        }
    };

    function createColumnsList() {
        var colHtml = getTableColList();
        $colList.html(colHtml);
        if ($colList.find('li').length === 0) {
            $dfView.find('.exportColumnsSection').addClass('empty');
        } else {
            $dfView.find('.exportColumnsSection').removeClass('empty');
        }
        $dfView.find('.selectAllWrap').find('.checkbox')
                                          .addClass('checked');

    }

    function getTableColList() {
        var html = "";
        var allCols = gTables[tableId].tableCols;
        for (var i = 0; i < allCols.length; i++) {
            if (validTypes.indexOf(allCols[i].type) > -1) {
                html += '<li class="checked" data-colnum="' + i + '">' +
                            '<span class="text tooltipOverflow" ' +
                            'title="' + allCols[i].name + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body">' +
                                allCols[i].name +
                            '</span>' +
                            '<div class="checkbox checked">' +
                                '<i class="icon xi-ckbox-empty fa-13"></i>' +
                                '<i class="icon xi-ckbox-selected fa-13"></i>' +
                            '</div>' +
                        '</li>';
            }
        }
        return (html);
    }

    function selectAll() {
        // var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        $colList.find('li').each(function() {
            var $li = $(this);
            if (!$li.hasClass('checked')) {
                var colNum = $li.data('colnum');
                $li.addClass('checked').find('.checkbox').addClass('checked');
                $xcTable.find('.col' + (colNum + 1))
                        .addClass('modalHighlighted');
            }
        });
        $dfView.find('.selectAllWrap').find('.checkbox').addClass('checked');
        focusedThNum = null;
        focusedListNum = null;
    }

    function deselectAll() {
        // var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        $colList.find('li.checked').each(function() {
            var $li = $(this);
            var colNum = $li.data('colnum');
            $li.removeClass('checked').find('.checkbox').removeClass('checked');
            $xcTable.find('.col' + (colNum + 1))
                    .removeClass('modalHighlighted');
        });
        $dfView.find('.selectAllWrap').find('.checkbox')
                                      .removeClass('checked');
        focusedThNum = null;
        focusedListNum = null;
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
            var colNum = xcHelper.parseColNum($cell) - 1;
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
        var colType = gTables[tableId].tableCols[colNum].type;
        if (validTypes.indexOf(colType) === -1) {
            return;
        }
        $('#xcTable-' + tableId).find('.col' + (colNum + 1))
                                .addClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]').addClass('checked')
                .find('.checkbox').addClass('checked');

        checkToggleSelectAllBox();
    }

    function deselectCol(colNum) {
        $('#xcTable-' + tableId).find('.col' + (colNum + 1))
                                .removeClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]').removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
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


    function saveDataFlow(groupName, columns, isNewGroup) {
        var $dagImage = $curDagWrap.find('.dagImage');
        var canvasInfo = DFG.getCanvasInfo($dagImage);

        var group = DFG.getGroup(groupName) || new DFGObj(groupName);
        group.addDataFlow({
            "name"      : canvasInfo.tableName,
            "columns"   : columns,
            "canvasInfo": canvasInfo.canvasInfo
        });

        return (DFG.setGroup(groupName, group, isNewGroup));
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
 
        $dfView.on("mouseenter", ".tooltipOverflow", function() {
            xcHelper.autoTooltip(this);
        });
    }

    function submitForm() {
        var isValid;

        var dfName = $newNameInput.val().trim();

        isValid = xcHelper.validate([
            {
                "$selector": $newNameInput
            },
            {
                "$selector": $newNameInput,
                "text"     : ErrTStr.DFGConflict,
                "check"    : function() {
                    return DFG.hasGroup(dfName);
                }
            }
        ]);


        if (!isValid) {
            return;
        }

        var colNums = [];
    
        $colList.find('li.checked').each(function() {
            colNums.push($(this).data('colnum'));
        });

        if (colNums.length === 0) {
            $colList.tooltip({
                "title"    : TooltipTStr.ChooseColToExport,
                "placement": "top",
                "animation": "true",
                "container": "body",
                "trigger"  : "manual",
                "template" : TooltipTemplate.Error
            });
            $colList.tooltip('show');
            setTimeout(function() {
                $colList.tooltip("destroy");
            }, 1500);
            return;
        }

        var columns = [];
        var tableCols = gTables[tableId].tableCols;

        for (var i = 0; i < colNums.length; i++) {
            var progCol = tableCols[colNums[i]];
            columns.push({
                "frontCol": progCol.getFrontColName(),
                "backCol" : progCol.getBackColName()
            });
        }
        
        var isNewGroup = true;

        formHelper.disableSubmit();

        // XXX This part is buggy,
        // thrift call maybe slow, and next time open the modal
        // the call may still not finish yet!!!
        saveFinished = false;
        saveDataFlow(dfName, columns, isNewGroup)
        .then(function() {
            xcHelper.showSuccess();
            // refresh dataflow lists in modal and scheduler panel
        })
        .fail(function(error) {
            Alert.error(DFGTStr.DFCreateFail, error);

        })
        .always(function() {
            formHelper.enableSubmit();
            saveFinished = true;
        });

        closeDFView();
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
        $dfView.addClass('xc-hidden');
        MainMenu.restoreState(mainMenuPrevState);

        $newNameInput.val("");
        $(document).off('keypress.DFView');
        focusedThNum = null;
        focusedListNum = null;
        $curDagWrap = null;
        formHelper.clear();
    }

    return (DFCreateView);

}(jQuery, {}));
