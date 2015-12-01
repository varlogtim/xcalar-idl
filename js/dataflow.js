function DFGConstructor(name, options) {
    options = options || {};
    this.name = name;
    this.dataFlows = options.dataFlows || [];
    this.schedules = options.schedules || [];
    this.parameters = options.parameters || [];
    this.paramMap = options.paramMap || {};
    this.retinaNodes = options.retinaNodes || {};

    return (this);
}

DFGConstructor.prototype = {
    "addRetinaNode": function(dagNodeId, paramInfo) {
        this.retinaNodes[dagNodeId] = paramInfo;
        $('#schedulerPanel').find('[data-id=' + dagNodeId + ']')
                            .addClass('hasParam');
    },

    "getRetinaNode": function(dagNodeId) {
        return (this.retinaNodes[dagNodeId]);
    },

    "addParameter": function(name, val) {
        xcHelper.assert(!this.paramMap.hasOwnProperty(name), "Invalid name");

        this.parameters.push(name);
        this.paramMap[name] = val;
    },

    "getParameter": function(paramName) {
        return (this.paramMap[paramName]);
    },

    "getAllParameters": function() {
        var res = [];
        var paramMap = this.paramMap;
        for (var paramName in paramMap) {
            res.push({
                "parameterName" : paramName,
                "parameterValue": paramMap[paramName]
            });
        }

        return (res);
    },

    "updateParameter": function(name, val) {
        xcHelper.assert(this.paramMap.hasOwnProperty(name), "Invalid name");
        this.paramMap[name] = val;
    },

    "checkParamInUse": function(paramName) {
        var str = "<" + paramName + ">";
        var retinsNodes = this.retinaNodes;

        for (var dagNodeId in retinsNodes) {
            var dagQuery = retinsNodes[dagNodeId].paramQuery;
            for (var i = 0, len = dagQuery.length; i < len; i++) {
                if (dagQuery[i].indexOf(str) >= 0) {
                    return (true);
                }
            }
        }

        return (false);
    },

    "removeParameter": function(name) {
        var index = this.parameters.indexOf(name);

        xcHelper.assert((index >= 0), "Invalid name");

        this.parameters.splice(index, 1);
        delete this.paramMap[name];
    },

    "updateSchedule": function() {
        var promises = [];
        var dfgName = this.name;
        this.schedules.forEach(function(scheduleName) {
            promises.push(Scheduler.updateDFG.bind(this, scheduleName, dfgName));
        });

        return (chain(promises));
    }
};

window.DFG = (function($, DFG) {
    var dfGroups = {};

    // var dfGroups = {"group1": {
    //                     "dataFlows": [
    //                         {
    //                             "name"      : "joinTable-82736#fr26",
    //                             "canvasInfo": {
    //                                 "tables": [
    //                                     {"index": 7, "children": "5", "type": "dataStore", "left": 10, "top": 0, "title": "Dataset classes"},
    //                                     {"index": 5, "children": "3", "type": "table", "left": 220, "top": 0, "title": "classes3#fr22"},
    //                                     {"index": 3, "children": "1", "type": "table", "left": 433, "top": 0, "title": "classes3#fr24"},
    //                                     {"index": 1, "children": "0", "type": "table", "left": 647, "top": 0, "title": "classes3#fr28"},
    //                                     {"index": 6, "children": "4", "type": "dataStore", "left": 223, "top": 65, "title": "Dataset schedule"},
    //                                     {"index": 4, "children": "2", "type": "table", "left": 433, "top": 65, "title": "schedule4#fr23"},
    //                                     {"index": 2, "children": "0", "type": "table", "left": 647, "top": 65, "title": "schedule4#fr27"},
    //                                     {"index": 0, "type": "table", "left": 861, "top": 32, "title": "joinTable-82736#fr26"}
    //                                 ],
    //                                 "operations": [
    //                                     {"tooltip": "Indexed on recordNum", "type": "index", "parents": "recordNum", "left": 70, "top": 4, "classes": "dagIcon index index"},
    //                                     {"tooltip": "Filtered table \"classes3#fr22\" where class_id is greater than 1.", "type": "filter", "parents": "class_id", "left": 283, "top": 4, "classes": "dagIcon filter filtergt"},
    //                                     {"tooltip": "Sorted by class_id", "type": "sort", "parents": "class_id", "left": 497, "top": 4, "classes": "dagIcon sort sort"},
    //                                     {"tooltip": "Indexed on recordNum", "type": "index", "parents": "recordNum", "left": 283, "top": 69, "classes": "dagIcon index index"},
    //                                     {"tooltip": "Sorted by class_id", "type": "sort", "parents": "class_id", "left": 497, "top": 69, "classes": "dagIcon sort sort"},
    //                                     {"tooltip": "Inner Join between table \"classes3#fr28\" and table \"schedule4#fr27\"", "type": "join", "parents": "classes3#fr28 & schedule4#fr27", "left": 711, "top": 36, "classes": "dagIcon join inner"}
    //                                 ],
    //                                 "height": 155,
    //                                 "width" : 945
    //                             }
    //                         }
    //                     ],
    //                     "schedules": [],
    //                     "parameters": [],
    //                     "retina": {}
    //                 }};
    DFG.restore = function(groups) {
        dfGroups = {};

        for (var name in groups) {
            dfGroups[name] = new DFGConstructor(name, groups[name]);
        }
    };

    DFG.getAllGroups = function() {
        return (dfGroups);
    };

    DFG.getGroup = function(groupName) {
        return (dfGroups[groupName]);
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

    DFG.createRetina = function(retName, isNew) {
        var deferred = jQuery.Deferred();
        var dfg = dfGroups[retName];

        var tableArray = [];
        dfg.dataFlows.forEach(function(dataFlow) {
            var tableName   = dataFlow.name;
            var columnNames = dataFlow.columns;
            var numColumns  = columnNames.length;

            tableArray.push({
                "tableName"  : tableName,
                "numColumns" : numColumns,
                "columnNames": columnNames
            });
        });

        console.log(retName, tableArray);

        makeRetinaHelper()
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());

        function makeRetinaHelper() {
            var innerDeferred = jQuery.Deferred();
            if (isNew) {
                return (XcalarMakeRetina(retName, tableArray));
            } else {
                XcalarDeleteRetina(retName)
                .then(function() {
                    return (XcalarMakeRetina(retName));
                })
                .then(function() {
                    // XXX TODO: handle the buggy dagNodeId (new id is different from old one)
                    // XXX TODO: check if the way to update params list is right
                    var promises = [];
                    var retinaNodes = dfg.retinaNodes;
                    for (var dagNodeId in retinaNodes) {
                        var node = retinaNodes[dagNodeId];
                        console.log(node);
                        promises.push(XcalarUpdateRetina.bind(this, retName,
                                dagNodeId, node.paramType, node.paramValue));
                    }

                    return (chain(promises));
                })
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);
            }

            return (innerDeferred.promise());
        }
    };

    return (DFG);

}(jQuery, {}));

window.DFGPanel = (function($, DFGPanel) {
    var $dfgView = $('#dataflowView');
    var $listSection = $dfgView.find('.listSection');
    var $header = $dfgView.find('.midContentHeader h2');
    var $addGroupBtn = $dfgView.find('.mainButtonArea').find('.addGroup');

    var $retTabSection = $dfgView.find('.retTabSection');
    var retinaTrLen = 7;
    var retinaTr = '<tr class="unfilled">' +
                        '<td class="paramName"></td>' +
                        '<td>' +
                            '<div class="paramVal"></div>' +
                            '<div class="delete paramDelete">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</td>' +
                   '</tr>';

    var currentDFG = null;

    DFGPanel.setup = function() {
        DagParamModal.setup();
        AddScheduleModal.setup();
        addListeners();
        setupViewToggling();
        updateList();
        setupDagDropdown();
        setupRetinaTab();
    };

    DFGPanel.updateDFG = function(groupName, isNewGroup) {
        // XXX TODO: disable the dfg when creating retina
        DFG.createRetina(groupName, isNewGroup)
        .then(function() {
            // XXX TODO:
            // 1. enable the dfg when retain is created
            // 2. updateList should use the correct dagNode Id
            // and append export table (call XcalarGetRetina(retName))
            updateList();
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    DFGPanel.getCurrentDFG = function() {
        return (currentDFG);
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
        var html = "";
        for (var i = 0; i < retinaTrLen; i++) {
            html += retinaTr;
        }

        var $tbody = $retTabSection.find(".tableContainer table tbody");
        $tbody.html(html);

        var dfg = DFG.getGroup(retName);
        var paramMap = dfg.paramMap;

        dfg.parameters.forEach(function(paramName) {
            addParamToRetina($tbody, paramName, paramMap[paramName]);
        });

        $retTabSection.removeClass("hidden");
    };

    function addParamToRetina($tbody, name, val) {
        var $trs = $tbody.find('.unfilled');
        var $tr;

        if ($trs.length === 0) {
            $tr = $(retinaTr);
            $tbody.append($tr);
            xcHelper.scrollToBottom($tbody.closest(".tableWrapper"));
        } else {
            $tr = $trs.eq(0);
        }

        $tr.find('.paramName').html(name);
        if (val != null) {
            $tr.find('.paramVal').html(val);
        }

        $tr.removeClass('unfilled');
    }

    function setupRetinaTab() {
        $dfgView.on("mousedown", function() {
            if ($(event.target).closest('#statusBox').length) {
                return;
            }
            $retTabSection.find(".retTab").removeClass("active");
        });
        // Remove focus when click other places other than retinaArea
        // add new retina
        $retTabSection.on('mousedown', '.retPopUp', function(event){
            event.stopPropagation();
        });

        // toggle open retina pop up
        $retTabSection.on('mousedown', '.retTab', function(event) {
            event.stopPropagation();
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                // close it tab
                $tab.removeClass('active');
            } else {
                // open tab
                $tab.addClass('active');
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
            var paramName = $input.val().trim();

            var isValid = xcHelper.validate([
                {
                    "$selector": $input
                },
                {
                    "$selector": $input,
                    "text"     : "Parameter name contains invalid character!",
                    "check"    : function() {
                        return /\W/.test(paramName);
                    }
                }
            ]);

            if (!isValid) {
                return;
            }

            var $tbody = $btn.closest(".retPopUp").find('tbody');
            // Check name conflict
            var isNameConflict = false;
            $tbody.find('tr:not(.unfilled)').each(function(index, tr) {
                var name = $(tr).find('.paramName').html();
                if (paramName === name) {
                    isNameConflict = true;
                    return false; // exist loop
                }
            });

            if (isNameConflict) {
                var text = "Parameter " + paramName + " already exists!";
                StatusBox.show(text, $input);
                return;
            }

            DFG.getGroup(currentDFG).addParameter(paramName);

            addParamToRetina($tbody, paramName);
            $input.val("");
        });

        // delete retina para
        $retTabSection.on('click', '.paramDelete', function(event) {
            event.stopPropagation();
            var $delBtn = $(this);
            var $tr = $delBtn.closest('tr');
            var $tbody = $tr.closest("tbody");
            var $paramName = $tr.find('.paramName');
            var paramName = $tr.find('.paramName').text();
            var dfg = DFG.getGroup(currentDFG);

            if (dfg.checkParamInUse(paramName)) {
                var text = "This parameter is in use!";
                StatusBox.show(text, $paramName);
                return;
            }

            $tr.remove();
            if ($tbody.find("tr").length < retinaTrLen) {
                $tbody.append(retinaTr);
            }

            dfg.removeParameter(paramName);
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
            currentDFG = groupName;
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
        var $schedulesView = $('#schedulesView');

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
        var html = "";
        var group = DFG.getGroup(groupName);

        var numDataFlows = group.dataFlows.length;
        var retinaNodes = group.retinaNodes;
        for (var i = 0; i < numDataFlows; i++) {
            var dataFlow = group.dataFlows[i];
            html += '<div class="dagWrap clearfix">' +
                        '<div class="header clearfix">' +
                            '<div class="btn btnSmall infoIcon">' +
                                '<div class="icon"></div>' +
                            '</div>' +
                            '<div class="tableTitleArea">' +
                                '<span>Table: </span>' +
                                '<span class="tableName" draggable="true" ' +
                                'ondragstart="xcDrag(event)">' +
                                    dataFlow.name +
                                '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="dagImageWrap">' +
                            '<div class="dagImage" style="width:' +
                            dataFlow.canvasInfo.width + 'px;height:' +
                            dataFlow.canvasInfo.height + 'px;">';

            var tables = dataFlow.canvasInfo.tables;
            var hasParam;
            for (var j = 0, numTables = tables.length; j < numTables; j++) {
                hasParam = false;
                if (tables[j].id !== undefined) {
                    if (retinaNodes[tables[j].id]) {
                        hasParam = true;
                    }
                }
                html += getTableHtml(tables[j], hasParam);
            }

            var operations = dataFlow.canvasInfo.operations;
            for (var j = 0, numOps = operations.length; j < numOps; j++) {
                hasParam = false;
                if (operations[j].id !== undefined) {
                    if (retinaNodes[operations[j].id]) {
                        hasParam = true;
                    }
                }
                html += getOperationHtml(operations[j], hasParam);
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
        '</ul>';
        return (html);
    }

    function getTableHtml(table, hasParam) {
        var icon;
        if (table.type === 'table') {
            icon = 'dagTableIcon';
        } else {
            icon = 'dataStoreIcon';
        }
        var paramClass = "";
        if (hasParam) {
            paramClass = " hasParam";
        }
        var html =
        '<div class="dagTable ' + table.type + paramClass + '" data-index="' +
        table.index +
        '" data-children="' + table.children + '" data-type="' +
        table.type + '"';
        if (icon === 'dataStoreIcon') {
            html += ' data-url="' + table.url + '" data-id="' + table.id + '"';
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

    function getOperationHtml(operation, hasParam) {
        //XX TODO: loop through operation data instead
        var paramClass = "";
        if (hasParam) {
            paramClass = " hasParam";
        }
        var html =
        '<div class="actionType ' + operation.type + paramClass +
        '" style="top: ' + operation.top + 'px; left: ' +
        operation.left + 'px; position: absolute;" ' +
        'data-type="' + operation.type + '" data-info="' + operation.info +
        '" data-id="' + operation.id + '" data-column="' + operation.column +
        '" data-toggle="tooltip" ' +
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
            DagParamModal.show($currentIcon);
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
                        // '<div class="checkmark"></div>' +
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

        // XXX TODO: add waiting icon if the promise takes too long
        Scheduler.addDFG(selectedSchedule, groupName)
        .then(function() {
            DFGPanel.listSchedulesInHeader(groupName);
            closeModal();
        })
        .fail(function(error) {
            Alert.error("Add schedule fails", error);
        });
    }

    function addModalEvents() {
        var scheduleListScroller = new ListScroller($list.find('.list'));
        xcHelper.dropdownList($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $scheduleListInput.val($li.text());
            },
            "onOpen": function() {
                return (scheduleListScroller.showOrHideScrollers());
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

window.DagParamModal = (function($, DagParamModal){
    var $dagParamModal = $("#dagParameterModal");
    var $modalBg       = $("#modalBackground");
    var modalHelper    = new xcHelper.Modal($dagParamModal, { "noResize": true });

    var $paramLists  = $("#dagModleParamList");
    var $editableRow = $dagParamModal.find('.editableRow');

    var paramListTrLen = 6;
    var trTemplate = '<tr class="unfilled">' +
                        '<td class="paramName"></td>' +
                        '<td>' +
                            '<input class="paramVal" spellcheck="false" disabled/>' +
                            '<div class="options">' +
                                '<div class="option paramEdit">' +
                                    '<span class="icon"></span>' +
                                '</div>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
    var filterTypeMap = {
        "gt"   : ">",
        "ge"   : "&ge;",
        "eq"   : "=",
        "lt"   : "<",
        "le"   : "&le;",
        "regex": "regex",
        "like" : "like",
        "not"  : "not"
    };

    DagParamModal.setup = function() {
        $dagParamModal.find('.cancel, .close').click(function() {
            closeDagParamModal();
        });

        $dagParamModal.find('.confirm').click(function() {
            storeRetina();
        });

        $dagParamModal.on('click', '.draggableDiv .close', function() {
            var value = $(this).siblings('.value').text();
            $(this).parent().remove();

            var $dups = $editableRow.find('.editableParamDiv .value').filter(function() {
                return ($(this).text() === value);
            });

            if ($dups.length > 0) {
                return;
            }

            var $tbody = $paramLists.find("tbody");
            $tbody.find('.paramName').filter(function() {
                return ($(this).text() === value);
            }).closest('tr').remove();

            if ($tbody.find("tr").length < paramListTrLen) {
                $tbody.append(trTemplate);
            }
        });

        $dagParamModal.on('focus', '.paramVal', function() {
            $(this).next().find('.paramEdit').addClass('selected');
        });

        $dagParamModal.on('blur', '.paramVal', function() {
            $(this).next().find('.paramEdit').removeClass('selected');
        });

        $dagParamModal.on('click', '.paramEdit', function() {
            $(this).closest('td').find('.paramVal').focus();
        });

        $dagParamModal.on('keypress', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dagParamModal.on("click", ".editableTable .defaultParam", function() {
            var $div = $(this);
            var target = $div.data("target");
            var defaultVal = $dagParamModal.find(".templateTable .boxed")
                                            .eq(target).text();
            $div.siblings(".editableParamDiv").text(defaultVal);
        });

        $dagParamModal.draggable({
            handle     : '.modalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });
    };

    DagParamModal.show = function($currentIcon) {
        var type = $currentIcon.data('type');
        var id = $currentIcon.data('id');
        var dfgName = DFGPanel.getCurrentDFG();

        $dagParamModal.data({
            "id" : id,
            "dfg": dfgName
        });
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized Query:
        if ($currentIcon.hasClass('dataStore')) {
            defaultText += '<td>Load</td>';
            defaultText += '<td><div class="boxed large">' +
                            $currentIcon.data('url') +
                            '</div></td>';

            editableText += "<td class='static'>Load</td>";
            editableText += getParameterInputHTML(0, "large load");
        } else { // not a datastore but a table
            defaultText += "<td>" + type + "</td>";
            defaultText += "<td><div class='boxed medium'>" +
                            $currentIcon.data('column') +
                            "</div></td>";

            editableText += "<td class='static'>" + type + "</td>";
        }

        if (type === "filter") {
            var filterInfo = $currentIcon.data('info') + " ";
            var parenIndex = filterInfo.indexOf("(");
            var abbrFilterType = filterInfo.slice(0, parenIndex);
            var filterValue = filterInfo.slice(filterInfo.indexOf(',') + 2,
                                                  filterInfo.indexOf(')'));

            defaultText += "<td class='static'>by</td>";
            defaultText += "<td><div class='boxed small'>" +
                            filterTypeMap[abbrFilterType] + "</div></td>";
            defaultText += "<td><div class='boxed medium'>" +
                            filterValue + "</div></td>";

            editableText += getParameterInputHTML(0, "medium") +
                            '<td class="static">by</td>' +
                            getParameterInputHTML(1, "medium") +
                            getParameterInputHTML(2, "medium allowEmpty");
            
        } else if ($currentIcon.hasClass('dataStore')) {
            // do nothing
        } else { // index, sort, map etc to be added in later
            defaultText += "<td>by</td>";
        }

        $dagParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);

        // var $dagWrap = $currentIcon.closest('.dagWrap');
        var draggableInputs = "";
        DFG.getGroup(dfgName).parameters.forEach(function(paramName) {
            draggableInputs += generateDraggableParams(paramName);
        });

        $dagParamModal.find('.draggableParams').html(draggableInputs);

        generateParameterDefaultList();
        populateSavedFields(id, dfgName);

        modalHelper.setup();
        if (gMinModeOn) {
            $modalBg.show();
            $dagParamModal.show();
            Tips.refresh();
        } else {
            $modalBg.fadeIn(300, function() {
                $dagParamModal.fadeIn(180);
                Tips.refresh();
            });
        }
    };

    DagParamModal.paramDragStart = function(event) {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        event.dataTransfer.setData("text", event.target.id);
        event.stopPropagation();
        var origin;
        if ($(event.target).parent().hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $(event.target).parent().data('target');
        }

        $editableRow.data('origin', origin);
    };

    DagParamModal.paramDragEnd = function (event) {
        event.stopPropagation();
        $editableRow.data('copying', false);
    };

    DagParamModal.paramDrop = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var paramId = event.dataTransfer.getData("text");
        if (!$dropTarget.hasClass('editableParamDiv')) {
            return; // only allow dropping into the appropriate boxes
        }

        var $draggableParam = $('#' + paramId).clone();
        var data = $editableRow.data('origin');

        if (data !== 'home') {
            // the drag origin is from another box, therefore we're moving the
            // div so we have to remove it from its old location
            $editableRow.find('.editableParamDiv').filter(function() {
                return ($(this).data('target') === data);
            }).find('#' + paramId + ':first').remove();
            // we remove the dragging div from its source
        }

        $dropTarget.append($draggableParam);

        var paramName = $draggableParam.find('.value').text();
        var $paramRow = $paramLists.find('.paramName').filter(function() {
            return ($(this).text() === paramName);
        });

        if ($paramRow.length === 0) {
            var dfg = DFG.getGroup($dagParamModal.data("dfg"));
            var paramVal = dfg.getParameter(paramName) || "";
            addParamToLists(paramName, paramVal);
        }
    };

    DagParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function addParamToLists(paramName, paramVal) {
        var $tbody = $paramLists.find("tbody");
        var $row = $tbody.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $tbody.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableWrapper"));
        }

        $row.find(".paramName").text(paramName)
            .end()
            .find(".paramVal").val(paramVal).removeAttr("disabled")
            .end()
            .removeClass("unfilled");
    }

    function storeRetina() {
        //XX need to check if all default inputs are filled
        var $paramPart = $dagParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('.editableParamDiv');
        var isValid = true;

        $editableDivs.each(function() {
            var $div = $(this);
            if (!$div.hasClass("allowEmpty") && $div.text().trim() === "") {
                isValid = false;
                StatusBox.show("Please fill out this field", $div);
                return false;
            }
        });

        if (!isValid) {
            return;
        }

        var retName = $dagParamModal.data("dfg");
        var dfg = DFG.getGroup(retName);
        var dagNodeId = $dagParamModal.data("id");

        updateRetina()
        .then(function(paramInfo) {
            // store meta
            dfg.addRetinaNode(dagNodeId, paramInfo);

            $dagParamModal.find(".tableWrapper tbody tr")
            .not(".unfilled").each(function() {

                var name = $(this).find(".paramName").text();
                var val  = $(this).find(".paramVal").val();

                dfg.updateParameter(name, val);
            });

            DFGPanel.updateRetinaTab(retName);

            return (dfg.updateSchedule());
        })
        .then(function() {
            commitToStorage();
            closeDagParamModal();
            // show success message??
        })
        .fail(function(error) {
            Alert.error("Update Params fails", error);
        });

        return;

        function updateRetina() {
            var deferred  = jQuery.Deferred();
            var operation = $paramPart.find("td:first").text();
            var paramType = null;
            var paramValue;
            var paramQuery;
            // var paramInput = new XcalarApiParamInputT();

            switch (operation) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;

                    var filterText = $editableDivs.eq(1).text().trim();
                    var str1 = $editableDivs.eq(0).text()
                                                  .replace(/\+/g, "")
                                                  .trim();
                    var str2 = $editableDivs.eq(2).text()
                                                  .replace(/\+/g, "")
                                                  .trim();
                    var filter;
                    // Only support these filter now
                    switch (filterText) {
                        case (">"):
                            filter = "gt";
                            break;
                        case ("<"):
                            filter = "lt";
                            break;
                        case (">="):
                            filter = "ge";
                            break;
                        case ("<="):
                            filter = "le";
                            break;
                        case ("="):
                            filter = "eq";
                            break;
                        default:
                            deferred.reject("currently not supported filter");
                            return (deferred.promise());
                    }
                    paramValue = filter + "(" + str1 + "," + str2 + ")";
                    // paramInput.paramFilter = new XcalarApiParamFilterT();
                    // paramInput.paramFilter.filterStr = str;
                    paramQuery = [str1, filterText, str2];
                    break;
                case ("Load"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramValue = $editableDivs.eq(0).text()
                                            .replace(/\+/g, "")
                                            .trim();
                    // paramInput.paramLoad = new XcalarApiParamLoadT();
                    // paramInput.paramLoad.datasetUrl = str;
                    paramQuery = [paramValue];
                    break;
                case ("Export"):
                    // XX TODO: add export
                    deferred.reject("TODO: Add export");
                    break;
                default:
                    console.warn("currently not supported");
                    break;
            }

            if (paramType == null) {
                deferred.reject("currently not supported");
            } else {
                XcalarUpdateRetina(retName, dagNodeId, paramType, paramValue)
                .then(function() {
                    var paramInfo = {
                        "paramType" : paramType,
                        "paramValue": paramValue,
                        "paramQuery": paramQuery
                    };
                    deferred.resolve(paramInfo);
                })
                .fail(deferred.reject);
            }

            return (deferred.promise());
        }
    }

    function getParameterInputHTML(inputNum, extraClass) {
        var divClass = "editableParamDiv boxed";
        if (extraClass != null) {
            divClass += " " + extraClass;
        }
        var td = '<td>' +
                    '<div class="tdWrapper">' +
                        '<div class="' + divClass + '" ' +
                        'ondragover="DagParamModal.allowParamDrop(event)"' +
                        'ondrop="DagParamModal.paramDrop(event)" ' +
                        'data-target="' + inputNum + '" ' +
                        'contenteditable="true" ' +
                        'spellcheck="false"></div>' +
                        '<div title="Default Value" ' +
                        'data-target="' + inputNum + '" ' +
                        'class="defaultParam iconWrap" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body">' +
                            '<span class="icon"></span>' +
                        '</div>' +
                    '</div>' +
                '</td>';
        return (td);
    }

    function populateSavedFields(dagNodeId, retName) {
        var dfg = DFG.getGroup(retName);
        var retinaNode = dfg.getRetinaNode(dagNodeId);
        var paramMap = dfg.paramMap;
        var nameMap = {};

        if (retinaNode != null && retinaNode.paramQuery != null) {
            var $editableDivs = $editableRow.find(".editableParamDiv");

            retinaNode.paramQuery.forEach(function(query, index) {
                var html = "";
                var len = query.length;
                var p = 0;
                var startIndex;
                var endIndex;
                var paramName;

                while (p < len) {
                    startIndex = query.indexOf("<", p);
                    if (startIndex < 0) {
                        // do not find <,
                        html += query.substring(p);
                        break;
                    }

                    html += query.substring(p, startIndex);
                    endIndex = query.indexOf(">", startIndex);
                    if (endIndex < 0) {
                        // do not find >,
                        html += "&lt;" + query.substring(startIndex + 1);
                        break;
                    }

                    // when find a "<>"
                    paramName = query.substring(startIndex + 1, endIndex);
                    if (!paramMap.hasOwnProperty(paramName)) {
                        // string btw "<>" is not a param name
                        html += "&lt;" + paramName + "&gt;";
                    } else {
                        nameMap[paramName] = true;
                        html += generateDraggableParams(paramName);
                    }

                    p = endIndex + 1;
                }

                $editableDivs.eq(index).html(html);
            });

            // keep the order of paramName the in dfg.parameters
            dfg.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)) {
                    addParamToLists(paramName, paramMap[paramName]);
                }
            });
        }
    }

    function generateParameterDefaultList() {
        var html = "";
        for (var i = 0; i < paramListTrLen; i++) {
            html += trTemplate;
        }
        $paramLists.find("tbody").html(html);
    }

    function generateDraggableParams(paramName) {
        var html = '<div id="draggableParam-' + paramName +
                '" class="draggableDiv" ' +
                'draggable="true" ' +
                'ondragstart="DagParamModal.paramDragStart(event)" ' +
                'ondragend="DagParamModal.paramDragEnd(event)" ' +
                'ondrop="return false" ' +
                'title="click and hold to drag" ' +
                'contenteditable="false">' +
                    '<div class="icon"></div>' +
                    '<span class="delim"><</span>' +
                    '<span class="value">' + paramName + '</span>' +
                    '<span class="delim">></span>' +
                    '<div class="close"><span>+</span></div>' +
                '</div>';

        return (html);
    }

    function closeDagParamModal() {
        modalHelper.clear();
        var fadeOutTime = gMinModeOn ? 0 : 300;

        $dagParamModal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });

        $editableRow.empty();
        $dagParamModal.find('.draggableParams').empty();
        $paramLists.find("tbody").empty();
    }

    return (DagParamModal);

}(jQuery, {}));
