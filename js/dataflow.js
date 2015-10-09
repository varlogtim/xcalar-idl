var DFG = (function($, DFG) {
    // var dfGroups = {};
    // var dfGroups = {
    //                     "group1": [{name: 'yelpUsers', dataFlow:{}},
    //                                 {name: 'yelpReviews', dataFlow: {}}],
    //                     "group2": [{name: 'classes', dataFlow:{}},
    //                                {name: 'schedules', dataFlow: {}}]
    //                 };

    var dfGroups = {"group1": {
                        "dataFlows": [
                            {"name":"joinTable-82736#fr26",
                            "canvasInfo":{
                                "tables":[
                                    {"index":7,"children":"5","type":"dataStore","left":10,"top":0,"title":"Dataset classes"},
                                    {"index":5,"children":"3","type":"table","left":220,"top":0,"title":"classes3#fr22"},
                                    {"index":3,"children":"1","type":"table","left":433,"top":0,"title":"classes3#fr24"},
                                    {"index":1,"children":"0","type":"table","left":647,"top":0,"title":"classes3#fr28"},
                                    {"index":6,"children":"4","type":"dataStore","left":223,"top":65,"title":"Dataset schedule"},
                                    {"index":4,"children":"2","type":"table","left":433,"top":65,"title":"schedule4#fr23"},
                                    {"index":2,"children":"0","type":"table","left":647,"top":65,"title":"schedule4#fr27"},
                                    {"index":0,"type":"table","left":861,"top":32,"title":"joinTable-82736#fr26"}
                                    ],
                                "operations":[
                                    {"tooltip":"Indexed on recordNum","type":"sort","parents":"recordNum","left":70,"top":4, "classes":"dagIcon filter filtergt"},
                                    {"tooltip":"Filtered table \"classes3#fr22\" where class_id is greater than 1.","type":"filter","parents":"class_id","left":283,"top":4,"classes":"dagIcon filter filtergt"},
                                    {"tooltip":"Indexed by class_id","type":"sort","parents":"class_id","left":497,"top":4, "classes":"dagIcon filter filtergt"},
                                    {"tooltip":"Indexed on recordNum","type":"sort","parents":"recordNum","left":283,"top":69, "classes":"dagIcon filter filtergt"},
                                    {"tooltip":"Indexed by class_id","type":"sort","parents":"class_id","left":497,"top":69, "classes":"dagIcon filter filtergt"},
                                    {"tooltip":"Inner Join between table \"classes3#fr28\" and table \"schedule4#fr27\"","type":"join","parents":"classes3#fr28 & schedule4#fr27","left":711,"top":36,"classes":"dagIcon filter filtergt"}
                                    ],
                                "height": 155,
                                "width": 945
                                }
                            }
                        ],
                        "schedules": []
                    }};
    DFG.restoreGroups = function() {

    };

    DFG.getAllGroups = function() {
        return (dfGroups);
    };

    DFG.setGroup = function(groupName, group) {
        dfGroups[groupName] = group;
    };

    DFG.drawCanvas = function($dagImage, isSchedulerPanel) {
        var canvas = $('<canvas class="previewCanvas" width="' +
                        $dagImage.width() + '" height="' + $dagImage.height() +
                        '">')[0];
        $dagImage.append(canvas);

        var ctx = canvas.getContext('2d');

        ctx.strokeStyle = '#999999';

        var $dagTables = $dagImage.find($('.dagTable'));
        var numTables = $dagTables.length;
        for (var i = 0; i < numTables; i++) {
            var $dagTable = $dagTables.eq(i);
            // var index = $dagTable.data('index');
            var children = ($dagTable.data('children') + "").split(",");
            var numChildren = children.length;
            var child;
            if (isSchedulerPanel) {
                child = children;
            } else {
                child = children[numChildren - 2];
            }
            
            var dagMidHeight = 21;
            var dagMidWidth = 20;
            if (child !== undefined) {
                var child = $dagImage.find('.dagTable[data-index=' + child + ']');
                var top1 = parseInt($dagTable.css('top')) + dagMidHeight;
                var left1 = parseInt($dagTable.css('left')) + dagMidWidth;
                var top2 = parseInt(child.css('top')) + dagMidHeight;
                var left2 = parseInt(child.css('left')) + 10;
                
                ctx.beginPath();
                ctx.moveTo(left1, top1);
                
                if (top1 != top2) {
                    var midLeft = left2 - 120;
                    ctx.lineTo(midLeft, top1);
                    var endX = left2 - 80;
                    var endY = top2;
                    if (top1 < top2) {
                        ctx.bezierCurveTo( midLeft + 30, top1,
                            midLeft + 30, top1 + 30,
                            endX, endY);
                    } else {
                        ctx.bezierCurveTo( midLeft + 30, top1,
                            midLeft + 30, top1 - 30,
                            endX, endY);
                    }
                     
                    ctx.lineTo(left2 + dagMidWidth, top2);
                } else {
                    ctx.lineTo(left2, top2);
                }
                 ctx.stroke();
            }
        }
    }

    return (DFG);

}(jQuery, {}));

var DFGPanel = (function($, DFGPanel) {
    var $dfgView = $('#dataflowView');
    var $listSection = $dfgView.find('.listSection');
    var $header = $dfgView.find('.midContentHeader h2');
    var $addGroupBtn = $dfgView.find('.mainButtonArea').find('.addGroup');

    DFGPanel.setup = function() {
        addListeners();
        setupViewToggling();
        updateList();
    };

    DFGPanel.refresh = function() {
        updateList();
    };

    DFGPanel.listSchedulesInHeader = function(groupName) {
        var group = DFG.getAllGroups()[groupName];
        var schedules = group.schedules;
        var numSchedules = schedules.length;
        // var lis = "";
        var list = "schedules: ";
        for (var i = 0; i < numSchedules; i++) {
            // lis += "<li>" + schedules[i] + "</li>";
            if (i !== 0) {
                list += ", ";
            }
            list += schedules[i];
        }
        if (numSchedules === 0) {
            list += "none";
        }
        $dfgView.find('.midContentHeader .schedulesList').html(list);
    }

    function addListeners() {
        $listSection.on('click', '.dataFlowGroup', function() {
            var $dfg = $(this);
            var $groupLi = $dfg.find('.listBox');
            if ($groupLi.hasClass('selected')) {
                return;
            }
            var groupName = $groupLi.find('.label').text();
            $header.text(groupName);
            drawDags(groupName);
            DFGPanel.listSchedulesInHeader(groupName);
            
            $listSection.find('.listBox').removeClass('selected');
            $groupLi.addClass('selected');

            if (gMinModeOn) {
                $listSection.find('.list').hide();
                $dfg.find('.list').show();
            } else {
                $listSection.find('.list').slideUp(200);
                $dfg.find('.list').slideDown(200);
            }
            $addGroupBtn.removeClass('btnInactive');
            
        });

        $addGroupBtn.click(function() {
            var groupName = $listSection.find('.listBox.selected').text();
            AddScheduleModal.show(groupName);
        });
    }

    function setupViewToggling() {
        $schedulesView = $('#schedulesView');

        $('#schedulerTopBar').find('.buttonArea').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }

            if ($button.attr('id') === "schedulesButton") {
                $dfgView.hide();
                $schedulesView.show();
                Scheduler.refresh();
            } else {
                $dfgView.show();
                $schedulesView.hide();
            }
            $button.siblings().removeClass('active');
            $button.addClass('active');
        });
    }

    function drawDags(groupName) {
        var group = DFG.getAllGroups()[groupName];
        var numDataFlows = group.dataFlows.length;
        var html = "";
        for (var i = 0; i < numDataFlows; i++) {
            html += '<div class="dagWrap clearfix">' +
                        '<div class="header clearfix">' +
                            '<div class="btn btnSmall infoIcon">' +
                                '<div class="icon"></div>' +
                            '</div>' +
                            '<div class="tableTitleArea">' +
                                '<span>Table: </span>' +
                                '<span class="tableName" draggable="true" ' +
                                'ondragstart="xcDrag(event)">' +
                                    group.dataFlows[i].name +
                                '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="dagImageWrap">' +
                            '<div class="dagImage" style="width:' +
                            group.dataFlows[i].canvasInfo.width + 'px;height:' +
                            group.dataFlows[i].canvasInfo.height + 'px;">';

            var tables = group.dataFlows[i].canvasInfo.tables;
            var numTables = tables.length;
            for (var j = 0; j < numTables; j++) {
                html += getTableHtml(tables[j]);
            }

            var operations = group.dataFlows[i].canvasInfo.operations;
            var numOperations = operations.length;
            for (var j = 0; j < numOperations; j++) {
                html += getOperationHtml(operations[j]);
            }
            html += '</div></div></div>';
        }
        $dfgView.find('.midContentMain').html(html);
        $dfgView.find('.dagImage').each(function() {
            DFG.drawCanvas($(this), true);
        });
    }

    function getTableHtml(table) {
        var icon;
        if (table.type === 'table') {
            icon = 'dagTableIcon';
        } else {
            icon = 'dataStoreIcon';
        }
        var html =
        '<div class="dagTable ' + table.type + '" data-index="' + table.index +
        '" data-children="' + table.children+ '" data-type="' + table.type +
        '" style="top: ' + table.top + 'px; left: ' + table.left + 'px; ' +
        'position: absolute;">' +
            '<div class="' + icon + '"></div>' +
            '<div class="icon"></div>' +
            '<span class="tableTitle" data-toggle="tooltip" ' +
                'data-placement="bottom" data-container="body"' +
                'title="' + table.title + '">' + table.title +
            '</span>' +
        '</div>';

        return (html);
    }

    function getOperationHtml(operation) {
        var html = 
        '<div class="actionType" style="top: ' + operation.top + 'px; left: ' +
        operation.left + 'px; position: absolute;" ' +
        'data-type="' + operation.type + '"  data-toggle="tooltip" ' +
        'data-placement="top" data-container="body" title="' +
        operation.tooltip + '">' +
            '<div class="actionTypeWrap">' +
                '<div class="' + operation.classes + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<span class="typeTitle">' + operation.type + '</span>' +
                '<span class="parentsTitle">' + operation.parents + '</span>' +
            '</div>' +
        '</div>';

        return (html);
    }

    function updateList() {
        resetDFGView();
        
        var groups = DFG.getAllGroups();
        var html = "";
        var numGroups = 0;
        for (var group in groups) {
            numGroups++;
            var list = groups[group].dataFlows;
            var listLen = list.length;
            html += '<div class="dataFlowGroup">' +
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
        $dfgView.find('.listSection').html(html);
        $dfgView.find('.numGroups').text(numGroups);
    }

    function resetDFGView() {
        $dfgView.find('.dagWrap').remove();
        $header.empty();
        $dfgView.find('.midContentHeader .schedulesList').empty();
        $addGroupBtn.addClass('btnInactive');
    }

    return (DFGPanel);

}(jQuery, {}));

var AddScheduleModal = (function($, AddScheduleModal) {
    var $modal = $('#addScheduleModal');
    var modalHelper = new xcHelper.Modal($modal, {"focusOnOpen": true});
    var $list = $modal.find('.scheduleList');
    var $scheduleListInput = $modal.find('.scheduleListInput');
    var $modalBackground = $("#modalBackground");
    var groupName;

    AddScheduleModal.setup = function() {    
        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": 'window'
        });

        addModalEvents();
    };

    AddScheduleModal.show = function(groupname) {
        groupName = groupname;
        xcHelper.removeSelectionRange();

        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        $(document).on("keypress.addScheduleModal", function(e) {
            if (e.which === keyCode.Enter) {
                if (!$modal.find('.confirm').hasClass('unavailable')) {
                    submitForm();
                }
            }
        });

        $(document).on("mousedown.addScheduleModal", function() {
            xcHelper.hideDropdowns($modal);
        });

        centerPositionElement($modal);
        updateModalList();
        $modal.show();
        modalHelper.setup();
    };

    function updateModalList() {
        var lis;
        var schedules = Scheduler.getAllSchedules();
        var numSchedules = schedules.length;
        var scheduleName;
        var hasValidSchedule = false;

        if (numSchedules > 0) {
            lis = '<li class="hint">Select a schedule</li>';
            $modal.find('.confirm').removeClass('unavailable');
            for (var i = 0; i < numSchedules; i++) {
                scheduleName = schedules[i].name;

                if (Scheduler.hasDFG(scheduleName, groupName)) {
                    continue;
                }
                lis += '<li>' + scheduleName + '</li>';
                if (!hasValidSchedule) {
                    hasValidSchedule = true;
                    $scheduleListInput.val(scheduleName)
                              .attr('value', scheduleName);
                }
            }

        }

        if (!hasValidSchedule) {
            $scheduleListInput.val('No available schedules')
                              .attr('value', 'No available schedules');
            lis = '<li class="hint">No available schedules</li>';
            $modal.find('.confirm').addClass('unavailable');
        }

        $list.find('ul').html(lis);
    }

    function submitForm() {
        var selectedSchedule = $scheduleListInput.val();
        var schedules = Scheduler.getAllSchedules();


        // add group to schedule
        Scheduler.addDFG(selectedSchedule, groupName);

        // add schedule to group
        var groups = DFG.getAllGroups();
        var group = groups[groupName];
        group.schedules.push(selectedSchedule);

        DFGPanel.listSchedulesInHeader(groupName);

        closeModal();
    }

    function addModalEvents() {
        xcHelper.dropdownList($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $scheduleListInput.val($li.text());
            }
        });

        // click cancel or close button
        $modal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeModal();
        });

        // click confirm button
        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("click", ".createNewSchedule", function() {
            closeModal();
            $('#schedulesButton').click();
            $('#addSchedule').click();
        });

    }

    function closeModal() {
        $(document).off(".addScheduleModal");
        modalHelper.clear();

        var hide = true;
        var animationTime;

        if (gMinModeOn) {
            $modal.hide();
            $modalBackground.hide();
        } else {
            $modal.fadeOut(300);
            $modalBackground.fadeOut(300);
        }

        setTimeout(function() {
            Tips.refresh();
        }, 200);
    }

    return (AddScheduleModal);

}(jQuery, {}));
