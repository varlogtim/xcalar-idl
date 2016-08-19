window.DataFlowModal = (function($, DataFlowModal) {
    var $dfgModal;          // $('#dataFlowModal')
    var $dfPreviews;        // $('#dataFlowPreviews')
    var $dfExport;          // $("#dataFlowExport")
    var $dfTable;           // $("#dataFlowTable")
    var $modalMain;         // $dfgModal.find('.modalMain')
    var $sideListSection;   // $dfgModal.find('.sideListSection')
    var $previewSection;    // $dfgModal.find('.previewSection')
    var $searchInput;       // $("#dataFlowSearch")
    var $radios;            // $dfgModal.find('.radioButton')
    var $newGroupNameInput; // $('#newGroupNameInput')
    var $confirmBtn;        // $("#dataFlowModalConfirm")

    var isFirstTouch = true;
    var tableName;
    var modalHelper;

    DataFlowModal.setup = function() {
        $dfgModal = $('#dataFlowModal');
        $dfPreviews = $('#dataFlowPreviews');
        $dfExport = $("#dataFlowExport");
        $dfTable = $("#dataFlowTable");
        $modalMain = $dfgModal.find('.modalMain');
        $sideListSection = $dfgModal.find('.sideListSection');
        $previewSection = $dfgModal.find('.previewSection');
        $searchInput = $("#dataFlowSearch");
        $radios = $dfgModal.find('.radioButton');
        $newGroupNameInput = $('#newGroupNameInput');
        $confirmBtn = $("#dataFlowModalConfirm");

        var minHeight = 400;
        var minWidth  = 700;

        modalHelper = new ModalHelper($dfgModal, {
            "focusOnOpen": true,
            "minHeight"  : minHeight,
            "minWidth"   : minWidth
        });

        $dfgModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $dfgModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $dfExport.scroll(function(){
            $(this).scrollTop(0);
        });

        addModalEvents();
    };

    DataFlowModal.show = function($dagWrap) {
        if (isFirstTouch) {
            setupDFGList();
            isFirstTouch = false;
        }

        $(document).on("keypress.dfgModal", function(e) {
            if (e.which === keyCode.Enter) {
                submitForm();
            }
        });

        tableName = $dagWrap.find('.tableName').text();
        var $existingFlow = $modalMain.find('li').filter(function() {
            return ($(this).text() === tableName);
        });

        var numLists = $modalMain.find('.listBox').length;
        if (numLists === 0) {
            $radios.eq(1).addClass('disabled');
        } else if (numLists === 1 && $existingFlow.length === 1) {
            $radios.eq(1).addClass('disabled');
        } else {
            $radios.eq(1).removeClass('disabled');
        }

        $existingFlow.closest('.dataFlowGroup').addClass('unavailable')
                                               .attr('data-original-title',
                                                     DFGTStr.DFExists);
        $modalMain.find('.dataFlowGroup:not(.unavailable)')
                  .removeAttr('title data-original-title');

        setupDFGImage($dagWrap);
        setupDFGTable();

        modalHelper.setup()
        .always(function() {
            $newGroupNameInput.focus();
        });
    };

    function saveDataFlow(groupName, columns, isNewGroup) {
        var $dagImage = $dfPreviews.find('.dagImage');
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
        $dfgModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeDFGModal();
        });

        $dfgModal.on("click", ".confirm", function() {
            submitForm();
        });

        $dfgModal.on("click", ".back", function() {
            backToDFGView();
        });

        xcHelper.optionButtonEvent($dfgModal.find(".radioButtonGroup"), function(option) {
            var optionNum = Number(option);
            if (optionNum === 0) {
                $modalMain.addClass('unavailable');
                $newGroupNameInput.parent().removeClass('unavailable');
            } else {
                $modalMain.removeClass('unavailable');
                $newGroupNameInput.parent().addClass('unavailable');
            }
        });

        $dfgModal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        $modalMain.find(".listSection").on("click", ".listBox", function() {
            var $groupLi = $(this);
            if ($groupLi.parent().hasClass('unavailable')) {
                return;
            }

            $modalMain.find('.listBox').removeClass('selected');
            $groupLi.addClass('selected');
        });

        $dfTable.on("click", "th", function() {
            var $th = $(this);
            if (!$th.hasClass("exportable")) {
                showErrorTooltip($th);
                return;
            }

            var colNum = $th.data("col");
            if ($th.hasClass("colSelected")) {
                // deselect column
                $dfTable.find(".col" + colNum).removeClass("colSelected");
            } else {
                $dfTable.find(".col" + colNum).addClass("colSelected");
            }
        });

        $dfgModal.on("click", ".modifyDSButton.selectAll", function() {
            selectAllCols();
        });

        $dfgModal.on("click", ".modifyDSButton.clear", function() {
            $dfTable.find(".colSelected").removeClass("colSelected");
        });

        // event on dfg seach area
        $searchInput.siblings(".clear").click(function(event) {
            event.stopPropagation();
            clearSearchInput(true);
        });

        $searchInput.keydown(function(event) {
            if (event.which === keyCode.Enter) {
                // prevent enter to submit form
                return false;
            }
        });

        $searchInput.keyup(function() {
            filterDFG($searchInput.val());
        });
    }

    function selectAllCols() {
        $dfTable.find('.exportable').each(function() {
            var $th = $(this);
            var colNum = $th.data('col');
            $dfTable.find('.col' + colNum).addClass('colSelected');
        });
    }

    function clearSearchInput(isFocus) {
        $searchInput.val("");
        filterDFG();

        if (isFocus) {
            $searchInput.focus();
        } else {
            $searchInput.blur();
        }
    }

    function exportStep() {
        var text = xcHelper.replaceMsg(ExportTStr.ExportOfCol, {
            "table": tableName
        });
        $dfgModal.addClass("exportMode");
        $confirmBtn.removeClass("next").text(CommonTxtTstr.SAVE);
        $previewSection.find(".titleSection .titleWrap .text").text(text);
        $dfPreviews.hide();
        $dfExport.show();
    }

    function backToDFGView() {
        $dfgModal.removeClass("exportMode");
        $confirmBtn.addClass("next").text(CommonTxtTstr.NEXT);
        $previewSection.find(".titleSection .titleWrap .text")
                       .text(CommonTxtTstr.Preview);
        $dfExport.hide();
        $dfPreviews.show();
    }

    function submitForm() {
        var isValid;
        // when in first step
        if (!$dfgModal.hasClass("exportMode")) {

            if ($radios.eq(0).hasClass('active')) {
                // when create new dfg
                isValid = xcHelper.validate([
                    {
                        "$selector": $newGroupNameInput
                    },
                    {
                        "$selector": $newGroupNameInput,
                        "text"     : ErrTStr.DFGConflict,
                        "check"    : function() {
                            var name = $newGroupNameInput.val().trim();
                            return DFG.hasGroup(name);
                        }
                    }
                ]);
            } else {
                clearSearchInput();
                isValid = xcHelper.validate([
                    {
                        "$selector": $sideListSection.find('.listBox').eq(0),
                        "text"     : ErrTStr.NoGroupSelect,
                        "check"    : function() {
                            return ($modalMain.find('.listBox.selected')
                                              .length === 0);
                        }
                    }
                ]);
            }

            if (!isValid) {
                return;
            }

            exportStep();
            return;
        }

        var groupName = $newGroupNameInput.val().trim();
        var $ths = $dfTable.find("th.colSelected");
        if ($ths.length === 0) {
            var $tablePadding = $dfExport.find(".tablePadding");
            $tablePadding.tooltip({
                "title"    : TooltipTStr.ChooseColToExport,
                "placement": "top",
                "animation": "true",
                "container": "#dataFlowModal",
                "trigger"  : "manual",
                "template" : TooltipTemplate.Error
            });

            $tablePadding.tooltip("show");
            setTimeout(function() {
                $tablePadding.tooltip("destroy");
            }, 1000);
            return;
        }

        var columns = [];
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = gTables[tableId].tableCols;
        
        $ths.each(function() {
            var colNum = Number($(this).data("col"));
            var progCol = tableCols[colNum - 1];
            columns.push({
                "frontCol": progCol.getFronColName(),
                "backCol" : progCol.getBackColName()
            });
        });

        var isNewGroup = true;
        if (groupName === "") {
            isNewGroup = false;
            groupName = $sideListSection.find('.listBox.selected')
                                        .find('.label')
                                        .text();
        }

        modalHelper.disableSubmit();

        // XXX This part is buggy,
        // thrift call maybe slow, and next time open the modal
        // the call may still not finish yet!!!
        saveDataFlow(groupName, columns, isNewGroup)
        .then(function() {
            xcHelper.showSuccess();
            // refresh dataflow lists in modal and scheduler panel
            setupDFGList();
        })
        .fail(function(error) {
            Alert.error(DFGTStr.DFCreateFail, error);
        })
        .always(function() {
            modalHelper.enableSubmit();
        });

        closeDFGModal();
    }

    function setupDFGImage($dagWrap) {
        var $dagImage = $dagWrap.find('.dagImage').clone();
        $dagImage.find('canvas').remove();
        $dfPreviews.html($dagImage);
        DFG.drawCanvas($dagImage);
    }

    function filterDFG(str) {
        var delay = 50;
        var $dfgLists = $sideListSection.find(".dataFlowGroup");

        // show all lists
        if (!str || str.trim() === "") {
            $dfgLists.fadeIn(delay);
            return;
        }

        str = xcHelper.escapeRegExp(str);
        var reg = new RegExp("^" + str);

        $dfgLists.each(function() {
            var $li = $(this);
            var dfgName = $li.find(".listBox .label").text();

            if (reg.test(dfgName) === true) {
                $li.fadeIn(delay);
            } else {
                $li.fadeOut(delay);
            }
        });
    }

    function closeDFGModal() {
        modalHelper.clear()
        .always(function() {
            resetDFGModal();
        });
    }

    function resetDFGModal() {
        $dfgModal.removeClass("exportMode")
                .find('.radioWrap').eq(0).click();
        $modalMain.find('.listBox').removeClass('selected');
        $modalMain.find('.dataFlowGroup').removeClass('unavailable');
        $newGroupNameInput.val("");
        $dfExport.hide();
        $dfPreviews.show();
        $dfTable.empty();
        $previewSection.find(".titleSection .titleWrap .text").text("Preview");
        $confirmBtn.addClass("next").text(CommonTxtTstr.NEXT);
        $(document).off('keypress.dfgModal');
    }

    function setupDFGList() {
        var groups = DFG.getAllGroups();
        var html = "";
        var groupCnt = 0;

        for (var group in groups) {
            var list = groups[group].dataFlows;
            var listLen = list.length;
            html += '<div class="dataFlowGroup" data-toggle="tooltip" ' +
                     'data-container="body" title="' + DFGTStr.DFExists + '">' +
                      '<div class="listBox">' +
                        '<div class="iconWrap">' +
                          '<span class="icon"></span>' +
                        '</div>' +
                        '<div class="label">' + group + '</div>' +
                        '<div class="checkmark"></div>' +
                      '</div>' +
                      '<ul class="sublist list">';

            for (var i = 0; i < listLen; i++) {
                html += '<li>' + list[i].name + '</li>';
            }

            html += '</ul></div>';
            groupCnt++;
        }

        $sideListSection.find('.title .num').text(groupCnt);
        $sideListSection.find('.listSection').html(html);
    }

    function setupDFGTable() {
        var tableId = xcHelper.getTableId(tableName);
        var tableCols = gTables[tableId].tableCols;
        var html = '<thead>' +
                        '<tr>';

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var colName = tableCols[i].name;

            if (colName === "DATA") {
                continue;
            }

            var type = tableCols[i].type;
            var colNum = i + 1;
            var thClass = "col" + colNum + " type-" + type;
            var exportable = true;
            var validTypes = ["string", "integer", "float", "boolean"];
            if (tableCols[i].backName.indexOf(".") > -1) {
                exportable = false;
            } else if (validTypes.indexOf(type) === -1) {
                exportable = false;
            }
            if (exportable) {
                thClass += " exportable";
            }

            html += '<th class="' + thClass + '" data-col="' + colNum + '">' +
                        '<div class="header">' +
                            '<div class="columnPadding"></div>' +
                            '<div class="columnTab">' +
                                '<div class="iconWrap">' +
                                    '<span class="icon"></span>' +
                                '</div>' +
                                '<div title="' + colName +
                                '" data-toggle="tooltip" data-placement="top" ' +
                                'data-container="body" ' +
                                'class="text textOverflowOneLine tooltipOverflow">' +
                                    colName +
                                '</div>' +
                            '<div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead>';

        var $tbody = $("#xcTable-" + tableId).find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();
        $tbody.find(".indexedColumn").removeClass('indexedColumn')
                                    .removeClass('noIndexStyle');
        $tbody.find(".tdText.clickable").removeClass("clickable");

        html += $tbody.html();

        $dfTable.html(html);
        // Start with everything deselected because we want as little stuff
        // out as possible. This is a choice based on backend LRQ.
        // selectAllCols();
    }

    function showErrorTooltip($th) {
        var $columnPadding = $th.find(".columnPadding");
        var title = xcHelper.replaceMsg(TooltipTStr.NoExport, {
            "type": getType($th)
        });
        $columnPadding.tooltip({
            "title"    : title,
            "placement": "top",
            "animation": "true",
            "container": "#dataFlowModal",
            "trigger"  : "manual",
            "template" : TooltipTemplate.Error
        });

        $columnPadding.tooltip("show");
        setTimeout(function() {
            $columnPadding.tooltip("destroy");
        }, 1000);
    }

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    return (DataFlowModal);

}(jQuery, {}));
