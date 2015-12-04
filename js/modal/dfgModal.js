window.DataFlowModal = (function($, DataFlowModal) {
    var $dfgModal = $('#dataFlowModal');
    var $dfPreviews = $('#dataFlowPreviews');
    var $dfExport = $("#dataFlowExport");
    var $dfTable  = $("#dataFlowTable");
    var $modalBackground = $("#modalBackground");
    var $modalMain = $dfgModal.find('.modalMain');
    var $sideListSection = $dfgModal.find('.sideListSection');
    var $previewSection = $dfgModal.find('.previewSection');
    var $radios = $dfgModal.find('.radio');
    var $newGroupNameInput = $('#newGroupNameInput');
    var $confirmBtn = $("#dataFlowModalConfirm");
    var tableName;

    var minHeight = 400;
    var minWidth  = 700;
    var modalHelper = new xcHelper.Modal($dfgModal, {
        "focusOnOpen": true,
        "minHeight"  : minHeight,
        "minWidth"   : minWidth
    });

    DataFlowModal.setup = function() {    
        $dfgModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $dfgModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $dfExport.scroll(function(){
            $(this).scrollTop(0);
        });
        
        addModalEvents();
        setupDFGList();
    };

    DataFlowModal.show = function($dagWrap) {
        modalHelper.setup();
        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        var winWidth = $(window).width();
        var winHeight = $(window).height();
        if ($dfgModal.width() > winWidth - 10) {
            var updatedWidth = Math.max(winWidth - 40, minWidth);
            $dfgModal.width(updatedWidth);
        }
        if ($dfgModal.height() > winHeight - 10) {
            var updatedHeight = Math.max(winHeight - 40, minHeight);
            $dfgModal.height(updatedHeight);
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
            $radios.eq(1).parent().addClass('unavailable');
        } else if (numLists === 1 && $existingFlow.length === 1) {
            $radios.eq(1).parent().addClass('unavailable');
        } else {
            $radios.eq(1).parent().removeClass('unavailable');
        }
        var existsText = "data flow already exists";
        
        $existingFlow.closest('.dataFlowGroup').addClass('unavailable')
                                               .attr('data-original-title',
                                                     existsText);
        $modalMain.find('.dataFlowGroup:not(.unavailable)')
                  .removeAttr('title data-original-title');

        $dfgModal.show();
        setupDFGImage($dagWrap);
        setupDFGTable();

        $newGroupNameInput.focus();
    };

    function saveDataFlow(groupName, columns) {
        var tables = [];
        var operations = [];
        var table;
        var operation;
        var $dagImage = $dfPreviews.find('.dagImage');

        // put each blue table icon into an object, recording position and info
        $dagImage.find('.dagTable').each(function() {
            var $dagTable = $(this);
            var children = ($dagTable.data('children') + "").split(",");
            children = children[children.length - 2];
            table = {
                "index"   : $dagTable.data('index'),
                "children": children,
                "type"    : $dagTable.data('type') || 'table',
                "left"    : parseInt($dagTable.css('left')),
                "top"     : parseInt($dagTable.css('top')),
                "title"   : $dagTable.find('.tableTitle').text()
            };

            if ($dagTable.hasClass('dataStore')) {
                table.url = $dagTable.data('url');
                table.id = $dagTable.data('id');
            }
            tables.push(table);
        });

        // put each gray operation icon into an object,
        // recording position and info
        $dagImage.find('.actionType').each(function() {
            var $operation = $(this);
            var tooltip = $operation.attr('data-original-title') ||
                                     $operation.attr('title');
            tooltip = tooltip.replace(/"/g, '&quot');                         
            operation = {
                "tooltip": tooltip,
                "type"   : $operation.data('type'),
                "column" : $operation.data('column'),
                "info"   : $operation.data('info'),
                "id"     : $operation.data('id'),
                "parents": $operation.find('.parentsTitle').text(),
                "left"   : parseInt($operation.css('left')),
                "top"    : parseInt($operation.css('top')),
                "classes": $operation.find('.dagIcon').attr('class')
            };
            operations.push(operation);
        });

        // insert new dfg into the main dfg object
        var canvasInfo = {
            "tables"    : tables,
            "operations": operations,
            "height"    : $dagImage.height(),
            "width"     : $dagImage.width()
        };

        var group = DFG.getGroup(groupName) || new DFGConstructor(groupName);
        group.dataFlows.push({
            "name"      : tableName,
            "columns"   : columns,
            "canvasInfo": canvasInfo
        });
        DFG.setGroup(groupName, group);
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

        $dfgModal.find(".radioWrap").click(function() {
            var $option = $(this);
            $radios.removeClass("checked");
            $option.find(".radio").addClass("checked");
            var optionNum = $(this).index();
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

        $dfTable.on("click", "th.exportable", function() {
            var $th = $(this);
            var colNum = $th.data("col");
            if ($th.hasClass("colSelected")) {
                // deselect column
                $dfTable.find(".col" + colNum).removeClass("colSelected");
            } else {
                $dfTable.find(".col" + colNum).addClass("colSelected");
            }
        });

        $dfgModal.on("click", ".modifyDSButton.selectAll", function() {
            $dfTable.find('.exportable').each(function() {
                var $th = $(this);
                var colNum = $th.data('col');
                $dfTable.find('.col' + colNum).addClass('colSelected');
            });
        });

        $dfgModal.on("click", ".modifyDSButton.clear", function() {
            $dfTable.find(".colSelected").removeClass("colSelected");
        });
    }

    function exportStep() {
        $dfgModal.addClass("exportMode");
        $confirmBtn.removeClass("next").text("Save");
        $previewSection.find(".titleSection .titleWrap .text")
                       .text("Export columns of " + tableName);
        $dfPreviews.hide();
        $dfExport.show();
    }

    function backToDFGView() {
        $dfgModal.removeClass("exportMode");
        $confirmBtn.addClass("next").text("Next");
        $previewSection.find(".titleSection .titleWrap .text")
                       .text("Preview");
        $dfExport.hide();
        $dfPreviews.show();
    }

    function submitForm() {
        var isValid;
        // when in first step
        if (!$dfgModal.hasClass("exportMode")) {

            if ($radios.eq(0).hasClass('checked')) {
                isValid = xcHelper.validate([
                    {
                        "$selector": $newGroupNameInput
                    }
                ]);
            } else {
                isValid = xcHelper.validate([
                    {
                        "$selector": $sideListSection.find('.listBox').eq(0),
                        "text"     : ErrorTextTStr.NoGroupSelect,
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
                "title"    : "Please Selected Columns you want to export",
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
            var colName = tableCols[colNum - 1].func.args[0];
            columns.push(colName);
        });

        var isNewGroup = true;
        if (groupName === "") {
            isNewGroup = false;
            groupName = $sideListSection.find('.listBox.selected')
                                        .find('.label')
                                        .text();
        }

        saveDataFlow(groupName, columns);

        modalHelper.submit();
        closeDFGModal();

        // refresh dataflow lists in modal and scheduler panel
        setupDFGList();

        DFGPanel.updateDFG(groupName, isNewGroup);
        modalHelper.enableSubmit();
    }

    function setupDFGImage($dagWrap) {
        var $dagImage = $dagWrap.find('.dagImage').clone();
        $dagImage.find('canvas').remove();
        // $dagImage.append('<canvas></canvas>');
        // var originalCanvas = $dagWrap.find('canvas')[1];
        // var destinationCanvas = $dagImage.find('canvas')[0];
        // destinationCanvas.width = originalCanvas.width;
        // destinationCanvas.height = originalCanvas.height;

        // var destCtx = destinationCanvas.getContext('2d');
        // destCtx.drawImage(originalCanvas, 0, 0);
        $dfPreviews.html($dagImage);
        DFG.drawCanvas($dagImage);
    }

    function closeDFGModal() {
        modalHelper.clear();
        $dfgModal.hide();
        $('#modalBackground').fadeOut(300);
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
            modalHelper.clear();
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
        $confirmBtn.text("Next").addClass("next");
        $(document).off('keypress.dfgModal');
    }

    function setupDFGList() {
        var groups = DFG.getAllGroups();
        var html = "";
        for (var group in groups) {
            var list = groups[group].dataFlows;
            var listLen = list.length;
            html += '<div class="dataFlowGroup" data-toggle="tooltip" ' +
                     'data-container="body" title="data flow already exists">' +
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
        }
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

            var type    = tableCols[i].type;
            var colNum  = i + 1;
            var thClass = "col" + colNum + " type-" + type;
            var exportable = true;
            var validTypes = ["string", "integer", "foat", "boolean"];
            if (tableCols[i].args &&
                tableCols[colNum].args[0].indexOf(".") > -1) {
                exportable = false;
            } else if (validTypes.indexOf(type) === -1) {
                exportable = false;
            }
            if (exportable) {
                thClass += " exportable";
            }

            html += '<th class="' + thClass + '" data-col="' + colNum + '">' +
                        '<div class="header">' +
                            '<div title="' + colName +
                            '" data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="columnTab textOverflow tooltipOverflow">' +
                                colName +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead>';

        var $tbody = $("#xcTable-" + tableId).find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();
        $tbody.find(".indexedColumn").removeClass('indexedColumn');
        $tbody.find(".addedBarTextWrap.clickable").removeClass("clickable");

        html += $tbody.html();

        $dfTable.html(html);
    }

    return (DataFlowModal);

}(jQuery, {}));
