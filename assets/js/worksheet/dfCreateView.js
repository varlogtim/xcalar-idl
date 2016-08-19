window.DFCreateView = (function($, DFCreateView) {
    var $dfView;          // $('#dfCreateView')
    var $newNameInput; //     $('#newDFNameInput')
    var $confirmBtn;        // $("#dataFlowModalConfirm")
    var focusedColNum = null; // last table header clicked, for shift+click
    var $colList;           //$dfView.find('.cols')
    var $curDagWrap;

    var tableName;
    var modalHelper;
    var tableId;
    // constant
    var validTypes = ['string', 'integer', 'float', 'boolean'];
    var isOpen = false; // tracks if form is open
    var saveFinished = true; // tracks if last submit ended

    DFCreateView.setup = function() {
        $dfView = $('#dfCreateView');
        $newNameInput = $('#newDFNameInput');
        $confirmBtn = $("#dataFlowModalConfirm");
        $colList = $dfView.find('.cols');

        var minHeight = 400;
        var minWidth  = 700;

        modalHelper = new ModalHelper($dfView, {
            "focusOnOpen": true,
            "minHeight"  : minHeight,
            "minWidth"   : minWidth
        });

        addModalEvents();
    };

    DFCreateView.show = function($dagWrap) {
        if (!saveFinished) { // did not finish saving from last form submit
            return;
        }
        isOpen = true;
        $curDagWrap = $dagWrap;
        $('#workspaceMenu').find('.menuSection:not(.xc-hidden)')
                           .addClass('lastOpened');
        $('#workspaceMenu').find('.menuSection').addClass('xc-hidden');
        $dfView.removeClass('xc-hidden');
        $('#container').addClass('columnPicker');
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
            if (e.which === keyCode.Enter) {
                submitForm();
            }
        });

        DagPanel.heightForDFView(wasMenuOpen);
        createColumnsList();
        selectInitialTableCols();
        setupTableColListeners();
     

        // modalHelper.setup()
        // .always(function() {
            $newNameInput.focus();
        // });
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
                            '<span class="text">' + allCols[i].name + 
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
        var allCols = gTables[tableId].tableCols;
        var $xcTable = $('#xcTable-' + tableId);
        $colList.find('li').each(function() {
            var $li = $(this);
            var colNum
            if (!$li.hasClass('checked')) {
                colNum = $li.data('colnum');
                $li.addClass('checked').find('.checkbox').addClass('checked');
                $xcTable.find('.col' + (colNum + 1))
                        .addClass('modalHighlighted');
            }
        });
        $dfView.find('.selectAllWrap').find('.checkbox').addClass('checked');
        focusedColNum = null;
    }

    function deselectAll() {
        var allCols = gTables[tableId].tableCols;
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
        focusedColNum = null;
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
        
        $("#xcTableWrap-" + tableId).addClass("columnPicker allowSelectAll");
        $("#xcTable-" + tableId).on("click.columnPicker", "th, td.clickable", 
            function(event) {

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


            if (event.shiftKey && focusedColNum != null) {
                var start = Math.min(focusedColNum, colNum);
                var end = Math.max(focusedColNum, colNum);

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
            focusedColNum = colNum;
            
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
        var currColName = gTables[tableId].tableCols[colNum].name;
        $('#xcTable-' + tableId).find('.col' + (colNum + 1))
                                .addClass('modalHighlighted');

        $colList.find('li[data-colnum="' + colNum + '"]').addClass('checked')
                                    .find('.checkbox').addClass('checked');

        checkToggleSelectAllBox();
    }

    function deselectCol(colNum) {
        $('#xcTable-' + tableId).find('.col' + (colNum + 1))
                                .removeClass('modalHighlighted');
        var currColName = gTables[tableId].tableCols[colNum].name;

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

    function addModalEvents() {
        $dfView.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeDFView();
        });

        $dfView.on("click", ".confirm", function() {
            submitForm();
        });

        $dfView.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        $colList.on('click', 'li', function() {
            var $li = $(this);
            var colNum = $li.data('colnum');
            if ($li.hasClass('checked')) {
                deselectCol(colNum);
            } else {
                selectCol(colNum);
            }
        });

        $dfView.find('.selectAllWrap').click(function() {
            if ($(this).find('.checkbox').hasClass('checked')) {
                deselectAll();
            } else {
                selectAll();
            }
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
                "frontCol": progCol.getFronColName(),
                "backCol" : progCol.getBackColName()
            });
        }
        
        var isNewGroup = true;

        modalHelper.disableSubmit();

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
            modalHelper.enableSubmit();
            saveFinished = true;
        });

        closeDFView();
    }


    function closeDFView() {
        // modalHelper.clear()
        // .always(function() {
            resetDFView();
        // });
        isOpen = false;
    }

    function resetDFView() {
        $('#container').removeClass('columnPicker');
        $("#xcTableWrap-" + tableId).removeClass("columnPicker allowSelectAll");
        $("#xcTable-" + tableId).off(".columnPicker");
        $("#xcTable-" + tableId).find('.modalHighlighted')
                                .removeClass('modalHighlighted');
        $dfView.addClass('xc-hidden');
        $('#workspaceMenu').find('.menuSection.lastOpened')
                           .removeClass('lastOpened xc-hidden');

        $newNameInput.val("");
        $(document).off('keypress.DFView');
        focusedColNum = null;
        $curDagWrap = null;
    }

    return (DFCreateView);

}(jQuery, {}));
