window.DFG = (function($, DFG) {
    // var dfGroups = {};
    // var dfGroups = {
    //                     "group1": [{name: 'yelpUsers', dataFlow:{}},
    //                                 {name: 'yelpReviews', dataFlow: {}}],
    //                     "group2": [{name: 'classes', dataFlow:{}},
    //                                {name: 'schedules', dataFlow: {}}]
    //                 };

    var dfGroups = {"group1": {
                        "dataFlows": [
                            {
                                "name"      : "joinTable-82736#fr26",
                                "canvasInfo": {
                                    "tables": [
                                        {"index": 7, "children": "5", "type": "dataStore", "left": 10, "top": 0, "title": "Dataset classes"},
                                        {"index": 5, "children": "3", "type": "table", "left": 220, "top": 0, "title": "classes3#fr22"},
                                        {"index": 3, "children": "1", "type": "table", "left": 433, "top": 0, "title": "classes3#fr24"},
                                        {"index": 1, "children": "0", "type": "table", "left": 647, "top": 0, "title": "classes3#fr28"},
                                        {"index": 6, "children": "4", "type": "dataStore", "left": 223, "top": 65, "title": "Dataset schedule"},
                                        {"index": 4, "children": "2", "type": "table", "left": 433, "top": 65, "title": "schedule4#fr23"},
                                        {"index": 2, "children": "0", "type": "table", "left": 647, "top": 65, "title": "schedule4#fr27"},
                                        {"index": 0, "type": "table", "left": 861, "top": 32, "title": "joinTable-82736#fr26"}
                                    ],
                                    "operations": [
                                        {"tooltip": "Indexed on recordNum", "type": "index", "parents": "recordNum", "left": 70, "top": 4, "classes": "dagIcon index index"},
                                        {"tooltip": "Filtered table \"classes3#fr22\" where class_id is greater than 1.", "type": "filter", "parents": "class_id", "left": 283, "top": 4, "classes": "dagIcon filter filtergt"},
                                        {"tooltip": "Sorted by class_id", "type": "sort", "parents": "class_id", "left": 497, "top": 4, "classes": "dagIcon sort sort"},
                                        {"tooltip": "Indexed on recordNum", "type": "index", "parents": "recordNum", "left": 283, "top": 69, "classes": "dagIcon index index"},
                                        {"tooltip": "Sorted by class_id", "type": "sort", "parents": "class_id", "left": 497, "top": 69, "classes": "dagIcon sort sort"},
                                        {"tooltip": "Inner Join between table \"classes3#fr28\" and table \"schedule4#fr27\"", "type": "join", "parents": "classes3#fr28 & schedule4#fr27", "left": 711, "top": 36, "classes": "dagIcon join inner"}
                                    ],
                                    "height": 155,
                                    "width" : 945
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
                child = $dagImage.find('.dagTable[data-index=' + child + ']');
                var top1 = parseInt($dagTable.css('top')) + dagMidHeight;
                var left1 = parseInt($dagTable.css('left')) + dagMidWidth;
                var top2 = parseInt(child.css('top')) + dagMidHeight;
                var left2 = parseInt(child.css('left')) + 10;
                
                ctx.beginPath();
                ctx.moveTo(left1, top1);
                
                if (top1 !== top2) {
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
    };

    return (DFG);

}(jQuery, {}));

window.DFGPanel = (function($, DFGPanel) {
    var $dfgView = $('#dataflowView');
    var $listSection = $dfgView.find('.listSection');
    var $header = $dfgView.find('.midContentHeader h2');
    var $addGroupBtn = $dfgView.find('.mainButtonArea').find('.addGroup');

    DFGPanel.setup = function() {
        addListeners();
        setupViewToggling();
        updateList();
        setupDagDropdown();
        setupRetinaTab();
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
    };

    DFGPanel.updateRetinaTab = function(retName) {
        var deferred = jQuery.Deferred();
        var $retTabSection = $('.retTabSection');
        var retClass = "retTab";
        // var inputVal = "";
        var isNewRetina = false;

        var html =
            '<div class="' + retClass + '">' +
                '<div class="tabWrap">' +
                    '<input type="text" class="retTitle" val="' + retName +
                    '">' +
                    '<div class="caret">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="retPopUp">' +
                    '<div class="divider"></div>' +
                    '<div class="inputSection">' +
                        '<input class="newParam" type="text"' +
                        ' placeholder="Input New Parameter">' +
                        '<div class="btn addParam">' +
                            '<span class="icon"></span>' +
                            '<span class="label">' +
                                'CREATE NEW PARAMETER' +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="tableContainer">' +
                        '<div class="tableWrapper">' +
                            '<table>' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Current Parameter' +
                                            '</div>' +
                                        '</th>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Default Value' +
                                            '</div>' +
                                        '</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody>';
        for (var t = 0; t < 7; t++) {
            html += '<tr class="unfilled">' +
                        '<td class="paramName"></td>' +
                        '<td>' +
                            '<div class="paramVal"></div>' +
                            '<div class="delete paramDelete">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</td>' +
                   '</tr>';
        }

        html += '</tbody></table></div></div></div></div>';

        var $retTab = $(html);
        $retTab.data('retname', retName);
        $retTabSection.html($retTab);


        var $input = $retTab.find('.retTitle');
        $input.val(retName);
        if ($retTabSection.find('.retTitle[disabled="disabled"]')
                          .length === 0) {
            $input.attr('disabled', 'disabled');
        }
        var $tbody = $retTab.find('tbody');
        // Only disable the first retina
        XcalarListParametersInRetina(retName)
        .then(function(output) {
            var num = output.numParameters;
            var params = output.parameters;
            for (var i = 0; i < num; i++) {
                var param = params[i];
                var paramName = param.parameterName;
                var paramVal = param.parameterValue;
                DFGPanel.addParamToRetina($tbody, paramName, paramVal);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("list retina parameters fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DFGPanel.addParamToRetina = function($tbody, name, val) {
        var $trs = $tbody.find('.unfilled');
        // Now only allow to add 7 parameters
        if ($trs.length > 0) {
            var $tr = $trs.eq(0);
            $tr.find('.paramName').html(name);
            if (val) {
                $tr.find('.paramVal').html(val);
            }
            $tr.removeClass('unfilled');
        }
    };

    function setupRetinaTab() {
        // Remove focus when click other places other than retinaArea
        var $retTabSection = $('.retTabSection');
        // add new retina
        $retTabSection.on('mousedown', '.retPopUp', function(event){
            event.stopPropagation();
        });

        // toggle open retina pop up
        $retTabSection.on('mousedown', '.retTab', function(event) {
            event.stopPropagation();
            var $tab = $(this);
            if ($tab.hasClass('unconfirmed')) {
                return;
            }
            // the tab is open, close it
            if ($tab.hasClass('active')) {
                $tab.removeClass('active');
            } else {
                $dagPanel.find('.retTab.active').removeClass('active');
                $tab.addClass('active');
                $(document).on('mousedown.closeRetTab', function(event) {
                    if ($(event.target).closest('#statusBox').length) {
                        return;
                    }
                    $tab.removeClass('active');
                    $(document).off('mousedown.closeRetTab');
                });
            }
        });

        $retTabSection.on('keyup', '.newParam', function(event){
            event.preventDefault();
            if (event.which !== keyCode.Enter) {
                return;
            }
            var $btn = $(this).siblings('.addParam');
            $btn.click();
        });

        // create new parameters to retina
        $retTabSection.on('click', '.addParam', function(event) {
            event.stopPropagation();
            var $btn = $(this);
            var $input = $btn.prev('.newParam');
            var paramName = jQuery.trim($input.val());
            var text;

            // empty input
            if (paramName === "") {
                text = "Please input a valid parameter name!";
                StatusBox.show(text, $input, true);
                $input.val("");
                return;
            }

            var $retPopUp = $btn.closest('.retPopUp');
            var $tbody = $retPopUp.find('tbody');

            // var retName = $retPopUp.closest('.retTab').data('retname');
            // console.log('New Parameter in retina:', retName,
            //             'parameter name:',paramName);

            // Check name conflict
            var isNameConflict = false;
            $tbody.find('tr:not(.unfilled)').each(function(index, tr) {
                if (isNameConflict === true) {
                    return;
                }
                var $tr = $(tr);
                var name = $tr.find('.paramName').html();
                if (paramName === name) {
                    isNameConflict = true;
                }
            });
            if (isNameConflict === true) {
                text = "Parameter " + paramName + " already exists!";
                StatusBox.show(text, $input, true);
                return;
            }

            $input.val("");
            DFGPanel.addParamToRetina($tbody, paramName);
        });

        // delete retina para
        $retTabSection.on('click', '.paramDelete', function(event) {
            event.stopPropagation();
            var $delBtn = $(this);
            var $tr = $delBtn.closest('tr');
            var $tbody = $tr.parent();
            var paramName = $tr.find('.paramName').text();
            var options = {};
            options.title = 'DELETE RETINA PARAMETER';
            options.msg = 'Are you sure you want to delete parameter ' +
                           paramName + '?';
            options.isCheckBox = true;
            options.confirm = function() {
                $tr.find('.paramName').empty();
                $tr.find('.paramVal').empty();
                $tr.addClass('unfilled');
                $tbody.append($tr);
            };

            Alert.show(options);
        });
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
            DFGPanel.updateRetinaTab(groupName);
            
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

        // var retinaSign = '<div class="retinaArea" data-tableid="' +
        //                 // tableId + 
        //                 '">' +
        //                 '<div data-toggle="tooltip" data-container="body" ' +
        //                 'data-placement="top" title="Add Data Flow" ' +
        //                 'class="btn btnSmall addDataFlow">' +
        //                     '<span class="icon"></span>' +
        //                 '</div>' +
        //                 '<div data-toggle="tooltip" data-container="body" ' +
        //                 'data-placement="top" title="Create New Retina" ' +
        //                 'class="btn btnSmall addRet btnInactive">' +
        //                     '<span class="icon"></span>' +
        //                 '</div>' +
        //             '</div>' ;
    }

    function getDagDropDownHTML() {
        var html =
        '<ul class="menu dagDropDown">' +
            '<li class="createParamQuery">Create Parameterized Query</li>' +
            '<li class="modifyParams">Modify Existing Parameters</li>' +
            // '<li class="listParams">List of ? Parameters</li>' +
        '</ul>';
        return (html);
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
        '" data-children="' + table.children + '" data-type="' +
        table.type + '"';
        if (icon === 'dataStoreIcon') {
            html += ' data-url="' + table.url + '"';
        }
        html += ' style="top: ' + table.top + 'px; left: ' + table.left +
        'px; position: absolute;">' +
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
        '<div class="actionType ' + operation.type + '" style="top: '
        + operation.top + 'px; left: ' +
        operation.left + 'px; position: absolute;" ' +
        'data-type="' + operation.type + '" data-info="' + operation.info +
        '" data-column="' + operation.column + '" data-toggle="tooltip" ' +
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

    function setupDagDropdown() {
        var dropdownHtml = getDagDropDownHTML();
        var $dagArea = $dfgView.find('.midContent');
        $dfgView.find('.midContent').append(dropdownHtml);

        var $currentIcon;
        
        var $menu = $dagArea.find('.dagDropDown');

        $dagArea[0].oncontextmenu = function(e) {
           
            var $target = $(e.target).closest('.actionType');
           
            if ($target.length) {
                $target.trigger('click');
                e.preventDefault();
                e.stopPropagation();
            } else {
                var $secondTarget = $(e.target).closest('.dagTable.dataStore');
                if ($secondTarget.length) {
                    $secondTarget.trigger('click');
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        $dagArea.on('click', '.dagTable.dataStore, .actionType', function() {
            $('.menu').hide();
            removeMenuKeyboardNavigation();
            $('.leftColMenu').removeClass('leftColMenu');
            $currentIcon = $(this);


            if ($currentIcon.hasClass('actionType')) {
                if (!$currentIcon.find('.dagIcon').hasClass('filter')) {
                    return;
                }
            }



            var el = $(this);
            //position colMenu
            var topMargin = 0;
            var leftMargin = 0;
            var top = el[0].getBoundingClientRect().bottom + topMargin;
            var left = el[0].getBoundingClientRect().left + leftMargin;

            $menu.css({'top': top, 'left': left});
            $menu.show();

            //positioning if dropdown menu is on the right side of screen
            var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect()
                                                    .left;
            if ($menu[0].getBoundingClientRect().right > leftBoundary) {
                left = el[0].getBoundingClientRect().right - $menu.width();
                $menu.css('left', left).addClass('leftColMenu');
            }
            $menu.find('.subMenu').each(function() {
                if ($(this)[0].getBoundingClientRect().right > leftBoundary) {
                    $menu.find('.subMenu').addClass('leftColMenu');
                }
            });
            addMenuKeyboardNavigation($menu);
            $('body').addClass('noSelection');
        });


        addMenuBehaviors($menu);

        $menu.find('.createParamQuery').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagModal.show($currentIcon);
        });

        //XX both dropdown options will do the same thing
        $menu.find('.modifyParams').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagModal.show($currentIcon);
        });

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

window.AddScheduleModal = (function($, AddScheduleModal) {
    var $modal = $('#addScheduleModal');
    var modalHelper = new xcHelper.Modal($modal, {"focusOnOpen": true});
    var $list = $modal.find('.scheduleList');
    var $scheduleListInput = $modal.find('.scheduleListInput');
    var $modalBackground = $("#modalBackground");
    var groupName;

    AddScheduleModal.setup = function() {    
        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
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
        // var schedules = Scheduler.getAllSchedules();

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

        // var hide = true;
        // var animationTime;

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
