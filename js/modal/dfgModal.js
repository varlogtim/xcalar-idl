window.DataFlowModal = (function($, DataFlowModal) {
    var $dfgModal = $('#dataFlowModal');
    var $dfPreviews = $('#dataFlowPreviews');
    var $modalBackground = $("#modalBackground");
    var $modalMain = $dfgModal.find('.modalMain');
    var $sideListSection = $dfgModal.find('.sideListSection');
    var $previewSection = $dfgModal.find('.previewSection');
    var $radios = $dfgModal.find('.radio');
    var $newGroupNameInput = $('#newGroupNameInput');
    var tableName;

    var modalHelper = new xcHelper.Modal($dfgModal, {"focusOnOpen": true});
    var minHeight = 400;
    var minWidth = 700;

    DataFlowModal.setup = function() {    
        $dfgModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": 'window'
        });

        $dfgModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });
        
        addModalEvents();
        setupDFGList();
    };

    DataFlowModal.show = function($dagWrap) {
        xcHelper.removeSelectionRange();

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

        centerPositionElement($dfgModal);
        $dfgModal.show();
        setupDFGImage($dagWrap);
        
        modalHelper.setup();
        $newGroupNameInput.focus();
    };

    function saveDataFlow(groupName, isNewGroup) {
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
                        index: $dagTable.data('index'),
                        children: children,
                        type: $dagTable.data('type') || 'table',
                        left: parseInt($dagTable.css('left')),
                        top: parseInt($dagTable.css('top')),
                        title: $dagTable.find('.tableTitle').text()
                    };
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
                            tooltip: tooltip,
                            type: $operation.data('type'),
                            parents: $operation.find('.parentsTitle').text(),
                            left: parseInt($operation.css('left')),
                            top: parseInt($operation.css('top')),
                            classes: $operation.find('.dagIcon').attr('class')
                        };
            operations.push(operation);
        });

        // insert new dfg into the main dfg object
        var canvasInfo = {
                            tables: tables,
                            operations: operations,
                            height: $dagImage.height(),
                            width: $dagImage.width()
                        };
        var existingGroups = DFG.getAllGroups();
        var group = existingGroups[groupName] || {dataFlows: [], schedules: []};
        group.dataFlows.push({name: tableName, canvasInfo: canvasInfo});
        DFG.setGroup(groupName, group);
    }

    function addModalEvents() {
        $dfgModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeDFGModal();
        });

        $dfgModal.on("click", ".confirm", function(event) {
            submitForm();
        });

        $dfgModal.find(".select-item").click(function() {
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

        $modalMain.find(".listSection").on("click", ".listBox", function() {
            var $groupLi = $(this);
            if ($groupLi.parent().hasClass('unavailable')) {
                return;
            }

            $modalMain.find('.listBox').removeClass('selected');
            $groupLi.addClass('selected');
        });
    }

    function submitForm() {
        var groupName = $newGroupNameInput.val().trim();
        var isValid;
        var newGroup = true;
        if ($radios.eq(0).hasClass('checked')) {
            
            isValid  = xcHelper.validate([
                {
                    "$selector": $newGroupNameInput,
                    "text"     : "Please fill out this field.",
                    "check"    : function() {
                        return (groupName === "");
                    }
                }
            ]);
        } else {
            isValid  = xcHelper.validate([
                {
                    "$selector": $sideListSection.find('.listBox').eq(0),
                    "text"     : "No group selected.",
                    "check"    : function() {
                        return ($modalMain.find('.listBox.selected')
                                          .length === 0)
                    }
                }
            ]);
        }
        
        if (!isValid) {
            return;
        }
        if (groupName === "") {
            newGroup = false;
            groupName = $sideListSection.find('.listBox.selected')
                                        .find('.label')
                                        .text();
        }
        
        saveDataFlow(groupName, newGroup);

        modalHelper.submit();
        closeDFGModal();

        // refresh dataflow lists in modal and scheduler panel
        setupDFGList();
        DFGPanel.refresh();
        // modalHelper.enableSubmit();
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
        $dfgModal.find('.select-item').eq(0).click();
        $modalMain.find('.listBox').removeClass('selected');
        $modalMain.find('.dataFlowGroup').removeClass('unavailable');
        $newGroupNameInput.val("");
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

    return (DataFlowModal);

}(jQuery, {}));
