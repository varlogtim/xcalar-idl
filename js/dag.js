
function setupDag() {
    $('#compSwitch').click(function() {
        var compSwitch = $(this);
        var dag = $('#dagPanel');
        var workspacePanel = $('#workspacePanel');
        
        if (dag.hasClass('hidden')) {
            dag.removeClass('hidden');
            compSwitch.addClass('active');
            if (dag.hasClass('midway')) {
                $('#mainFrame').addClass('midway');
            }
        } else if (workspacePanel.hasClass('active')) {
            dag.addClass('hidden');
            compSwitch.removeClass('active');
            $('#mainFrame').removeClass('midway');
        }

        $('.mainPanel').hide().removeClass('active');
        $('.mainMenuTab').removeClass('active');
        workspacePanel.show().addClass('active');
        $('#workspaceTab').addClass('active');
    });

    $('#dagPulloutTab').click(function() {
        var dag = $('#dagPanel');
        if (dag.hasClass('midway')) {
            dag.removeClass('midway').addClass('full');
        } else {
            dag.removeClass('full').addClass('midway');
            $('#mainFrame').addClass('midway');
        }
    });

    $('#closeDag').click(function() {
        $('#compSwitch').trigger('click');
    });

    var $dagPanel = $('#dagPanel');

    // add new retina
    $dagPanel.on('click', '.addRet', function(){
        var $addBtn = $(this);
        $dagPanel.find('.retTab.active').removeClass('active');
        var $retTabSection = $addBtn.closest('.retinaArea')
                                    .find('.retTabSection');
        var len = $retTabSection.children().length;
        var retName = 'Retina ' + (len + 1);
        var html = 
            '<div class="retTab unconfirmed">' + 
                '<div class="tabWrap">' + 
                    '<input type="text" class="retTitle"' + 
                    ' placeholder="' + retName + '" >' + 
                    '<div class="retDown">' + 
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
        for (var i = 0; i < 7; i++) {
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

        $retTab = $(html);
        $retTab.data('retname', retName);
        $retTabSection.append($retTab);
        $retTab.find('.retTitle').focus();
    });
    
    // keyup on retina title to confirm the input
    $dagPanel.on('keyup', '.retTitle', function(event) {
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return;
        }
        var $input = $(this);
        var $retTab = $input.closest('.retTab');
        var retName = jQuery.trim($input.val());
        if (retName == "") {
            retName = $retTab.data('retname');
            $input.val(retName);
        }

        var tableName = $input.closest('.retinaArea')
                              .data('tablename');
        console.log('Make retina with table:', tableName,
                    'and retina name:', retName);

        // XcalarMakeRetina(retinaName, tableName)
        // .done(function() {
        //     console.log('Create New Retina for', tableName);
        // XXX Can bu put outside if you want to 
        // make this change before xcalar call
            $retTab.data('retname', retName);
            $retTab.removeClass('unconfirmed');
            $input.attr('disabled', 'disabled');
            $input.blur();
        // });
    });

    // toggle open retina pop up
    $dagPanel.on('click', '.tabWrap', function() {
        var $tab = $(this).closest('.retTab');
        if ($tab.hasClass('unconfirmed')) {
            return;
        }
        // the tab is open, close it
        if ($tab.hasClass('active')) {
            $tab.removeClass('active');
        } else {
            $dagPanel.find('.retTab.active').removeClass('active');
            $tab.addClass('active');
        }
    });

    // create new parameters to retina
    $dagPanel.on('click', '.addParam', function() {
        var $btn = $(this);
        var $input = $btn.prev('.newParam');
        var paramName = jQuery.trim($input.val());
        if (paramName == "" || paramName == undefined) {
            var text = "Please input a valid parameter name!";
            displayErrorMessage(text, $input);
            $input.val("");
            return;
        }

        var $retPopUp = $btn.closest('.retPopUp');
        var $tbody = $retPopUp.find('tbody');

        var retName = $retPopUp.closest('.retTab').data('retname');
        $input.val("");
        console.log('New Parameter in retina:', retName,
                    'parameter name:',paramName);
        // XcalarAddVariableToRetina(retName, varName)
        // .done(function() {
            // XXX Can bu put outside if you want to 
            // make this change before xcalar call
            var $trs = $tbody.find('.unfilled');
            if ($trs.length > 0) {
                var $tr = $trs.eq(0);
                $tr.find('.paramName').html(paramName);
                $tr.removeClass('unfilled');
            }
        // });
        
        // XXX currently, it is useless code
        // else {
        //     var html = '<tr>' +
        //                     '<td class="paramName">' + 
        //                             paramName +  
        //                     '</td>' + 
        //                     '<td>' + 
        //                         '<div class="paramVal"></div>' + 
        //                         '<div class="delete paramDelete">' +
        //                             '<span class="icon"></span>' + 
        //                         '</div>' + 
        //                     '</td>' + 
        //                '</tr>';
        //     $tbody.append(html);
        // }
    });

    // delete retina para
    $dagPanel.on('click', '.paramDelete', function() {
        var $delBtn = $(this);
        var $tr = $delBtn.closest('tr');
        var paramName = $tr.find('.paramName').text();
        var options = {};
        options.title = 'DELETE RETINA PARAMETER';
        options.msg = 'Are you sure you want to delete parameter ' 
                      + paramName + '?';
        options.isCheckBox = true;
        options.confirmFunc = function() {
            $tr.find('.paramName').empty();
            $tr.find('.paramVal').empty();
            $tr.addClass('unfilled');
        }
        showAlertModal(options);
    });
}

function constructDagImage(tableName) {
    drawDag(tableName).done(function(dagDrawing) {
      var outerDag = '<div class="dagWrap">'+
            '<div class="header clearfix">'+
                '<div class="btn btnSmall infoIcon">'+
                    '<div class="icon"></div>'+
                '</div>'+
                '<div class="tableTitleArea">'+
                    'Table: <span class="tableName">'+tableName+'</span>'+
                '</div>'+
                '<div class="retinaArea" data-tablename="' + tableName + '">' + 
                    '<div title="Add New Retina" class="btn addRet">' + 
                        '<span class="icon"></span>' + 
                    '</div>' + 
                    '<div class="retTabSection"></div>' +
                '</div>' +
            '</div>'+
            '</div>';

        var innerDag = '<div class="dagImageWrap"><div class="dagImage">'+
                        dagDrawing+'</div></div>';
        $('.dagArea').append(outerDag);
        $('.dagWrap:last').append(innerDag);
        var canvas = createCanvas();
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#999999';
        // var delay = 300;
        $('.dagWrap:last').find('.dagTableWrap').each(function() {
            var el = $(this);
            // setTimeout(function() {
                drawDagLines(el, ctx);
            // }, delay+= 300)
            // drawDagLines(el, ctx);
        });

        // $('.dagImageWrap').scrollLeft($('.dagImage').width());
    });
}

function drawDagUnit(dagUnit, prop, dagArray, html, index, parentChildMap) {
    var properties = {};
    properties.x = prop.x+1;
    properties.width = prop.width;
    var numChildren = parentChildMap[index].length;
    var accumulatedDrawings = "";

    for (var i = 0; i < numChildren; i++) {
        var childIndex = parentChildMap[index][i];
        properties.y = i*2 +1 - numChildren + prop.y;
        accumulatedDrawings += drawDagUnit(dagArray[childIndex], properties, 
                               dagArray, html, childIndex, parentChildMap);
    }
    
    var oneTable = drawDagTable(dagUnit, prop, dagArray);
    var newHtml;
    if (accumulatedDrawings) {
        newHtml = "<div class='joinWrap'><div class='childContainer'>"+
                  accumulatedDrawings+"</div>"+oneTable+"</div>";
    }

    if (newHtml) {
        return (newHtml);
    } else {
        return (accumulatedDrawings+oneTable);
    }
}

function drawDagTable(dagUnit, prop, dagArray) {
    var top = 200 + (prop.y*60);
    var right = 100 + (prop.x*170);
    var dagOrigin = drawDagOrigin(dagUnit, prop, dagArray);
    var dagTable = '<div class="dagTableWrap clearfix">' +
                    dagOrigin;
    if (dagOrigin == "") {
        dagTable += '<div class="dagTable dataStore">'+
                    '<div class="dataStoreIcon"></div>'+
                    '<div class="icon"></div>'+
                    '<span class="tableTitle">Dataset '+
                    getDagName(dagUnit)+
                    '</span>';
    } else {
        dagTable += '<div class="dagTable">' +
                    '<div class="dagTableIcon"></div>'+
                    '<div class="icon"></div>'+
                    '<span class="tableTitle">'+getDagName(dagUnit)+'</span>';
    }
    dagTable += '</div></div>';
    return (dagTable);
}

function drawDagOrigin(dagUnit, prop, dagArray) {
    var originHTML = "";
    var numChildren = getDagNumChildren(dagUnit);

    if (numChildren > 0) {
        var children = getDagChildren(dagUnit.api, dagUnit);
        var additionalInfo = "";
        if (numChildren == 2) {
            additionalInfo += " & "+children[1];
        }
        var key = dagApiMap[dagUnit.api];
        var name = key.substring(0, key.length - 5);
        var info = getDagActionInfo(dagUnit, key, children);
        if (info.type == "sort") {
            name = "sort";
        }

        var top = 210 + (prop.y*60);
        var right = 180 + (prop.x*170);
        originHTML += '<div class="actionType '+name+'" '+
                    'style="top:'+0+'px; right:'+0+'px;" '+
                    'data-toggle="tooltip" '+
                    'data-placement="top" '+
                    'data-container="body" '+
                    'title="'+info.tooltip+'">'+
                        '<div class="actionTypeWrap">'+
                            '<div class="dagIcon '+name+' '+info.type+'">'+
                                '<div class="icon"></div>'+
                            '</div>'+
                            '<span class="typeTitle">'+name+
                            '</span>'+
                            '<span class="childrenTitle">'+
                                children[0]+additionalInfo+
                            '</span>'+
                            '<span class="info">'+
                                info.text+
                            '</span>'+
                        '</div>'+
                    '</div>';
    }
    
    return (originHTML);
}

function drawDag(tableName) {
    var deferred = jQuery.Deferred();
    XcalarGetDag(tableName).done(function(dagObj) {
        var prop = {
            x:0, 
            y:0, 
            childCount: 0,
        };
        var index = 0;
        var dagArray = dagObj.node;
        var parentChildMap = getParentChildDagMap(dagObj);
        console.log(dagObj);
        
        deferred.resolve(drawDagUnit(dagArray[index], prop, dagArray, "", 
                         index, parentChildMap));
    });


    function getParentChildDagMap(dagObj) {
        var dagArray = dagObj.node;
        var numNodes = dagObj.numNode;
        var map = {}; // will hold a map of nodes, and array indices of children
        var childIndex = 0;
        for (var i = 0; i < numNodes; i++) {
            var dagUnit = dagArray[i];
            var numChildren = getDagNumChildren(dagUnit);
            map[i] = []; 
            for (var j = 0; j < numChildren; j++) {
                map[i].push(++childIndex);
            }
        }
        return (map);
    }

    return (deferred.promise());
}

function getDagNumChildren(dagUnit) {
    var numChildren = 0;
    if (dagUnit.api == XcalarApisT.XcalarApiJoin) {
        var numChildren = 2;
    } else if (dagUnit.api != XcalarApisT.XcalarApiBulkLoad) {
        var numChildren = 1;
    } 
    return (numChildren);
}

function getDagChildren(api, dagUnit) {
    var children = [];
    var key = dagApiMap[api];
    var value = dagUnit.input[key];
    if (key == 'filterInput') {
        children.push(value.srcTable.tableName);
    } else if (key == 'indexInput') {
        if (value.srcTable.tableName == "") {
            children.push(value.dstTable.tableName);
        } else {
            children.push(value.srcTable.tableName);
        }
    } else if (key == 'joinInput') {
        children.push(value.leftTable.tableName);
        children.push(value.rightTable.tableName);
    }
    return (children);
}

function getDagName(dagUnit) {
    var key = dagApiMap[dagUnit.api];
    var value = dagUnit.input[key];
    var childName;
    if (key == 'filterInput') {
        childName = value.dstTable.tableName;
    } else if (key == 'indexInput') {
        childName = value.dstTable.tableName;
    } else if (key == 'joinInput') {
        childName = value.joinTable.tableName;
    } else if (key == 'loadInput') {
        childName = value.dataset.name;
    }
    return (childName);
}

function getDagActionInfo(dagUnit, key, children) {
    var value = dagUnit.input[key];
    // console.log(value);
    var info = {};
    info.type = "";
    info.text = "";
    info.tooltip = "";

    if (key == 'filterInput') {
        var filterStr = value.filterStr;
        var abbrFilterType = filterStr.slice(0,2);
        
        info.type = "filter"+abbrFilterType;
        info.text = filterStr;
        var filterType = "";

        var filterTypeMap = {
            "gt" : "greater than",
            "ge" : "reater than or equal to",
            "eq" : "equal to",
            "lt" : "less than",
            "le" : "less than or equal to",
            "regex" : false,
            "like" : false,
        }

        if (filterTypeMap[abbrFilterType]) {
            var filteredOn = filterStr.slice(3, filterStr.indexOf(','));
            var filterType = filterTypeMap[abbrFilterType];
            var filterValue = filterStr.slice(filterStr.indexOf(',')+2, 
                                              filterStr.indexOf(')'));

            info.tooltip = "Filtered table &quot;"+children[0]+"&quot; where "+
                        filteredOn+" is "+filterType+" "+filterValue+".";
        } else {
            info.tooltip = "Filtered table &quot;"+children[0]+"&quot;: "+filterStr;
        }
    } else if (key == 'indexInput') {
        if (value.datasetId === 0) {
            info.type = "sort";
            info.tooltip = "Sorted by "+value.keyName;
        } else {
            info.tooltip = "Indexed on "+value.keyName;
        }
        info.text = "indexed on " + value.keyName;
    } else if (key == 'joinInput') {
        info.type = OperatorsOpTStr[value.joinType][9].toLowerCase() +
                    OperatorsOpTStr[value.joinType].slice(10);
        info.text = OperatorsOpTStr[value.joinType].slice(9);
        var joinType = info.text.slice(0, info.text.indexOf("Join"));
        info.tooltip = joinType+ " Join between table &quot;"+children[0]+
                       "&quot; and table &quot;"+children[1]+"&quot;";
    } 
    return (info);
}

var dagApiMap = {
    2 : 'loadInput', 
    3 : 'indexInput',
    6 : 'statInput', 
    7 : 'statByGroupIdInput', 
    10 : 'listTablesInput', 
    13 : 'makeResultSetInput', 
    14 : 'resultSetNextInput', 
    15 : 'joinInput', 
    16 : 'filterInput', 
    17 : 'groupByInput', 
    19 : 'editColInput', 
    20 : 'resultSetAbsoluteInput', 
    21 : 'freeResultSetInput', 
    22 : 'deleteTableInput', 
    23 : 'getTableRefCountInput', 
    23 : 'tableInput', 
    24 : 'bulkDeleteTablesInput', 
    25 : 'destroyDsInput', 
    26 : 'mapInput', 
    27 : 'aggregateInput', 
    28 : 'queryInput', 
    29 : 'queryStateInput', 
    30 : 'exportInput', 
    31 : 'dagTableNameInput', 
    32 : 'listFilesInput'
};

function createCanvas() {
    var dagWrap = $('.dagWrap:last');
    var dagWidth = dagWrap.find('.dagImage > .joinWrap').width();
    var dagHeight = dagWrap.find('.dagImage > .joinWrap').height();
    var canvasHTML = $('<canvas class="canvas" width="'+dagWidth+
                     '" height="'+dagHeight+'"></canvas>');
    $('.dagWrap:last .dagImage').append(canvasHTML);
    return (canvasHTML[0]);
}

// this function draws all the lines going into a blue table icon and its
// corresponding gray origin rectangle 
function drawDagLines(dagTable, ctx) {
    if (dagTable.prev().children().length != 2 ) { // exclude joins
        if (dagTable.children('.dataStore').length == 0) { //exclude datasets
            drawStraightDagConnectionLine(dagTable, ctx);
        } 
    } else { // draw lines for joins

        var origin1 = dagTable.prev().children().eq(0)
                      .children().eq(1).find('.dagTable');
        var origin2 = dagTable.prev().children().eq(1)
                      .children().eq(1).find('.dagTable');

        var desiredY = (origin1.position().top + origin2.position().top)/2;
        var currentY = dagTable.find('.dagTable').position().top;
        var yAdjustment = (desiredY - currentY)*2;
        dagTable.css({'margin-top': yAdjustment}); 

        var tableX = dagTable.find('.dagTable').position().left;
        var tableY = dagTable.find('.dagTable').position().top +
                     dagTable.height()/2;
        drawLine(ctx, tableX, tableY); // line entering table

        curvedLineCoor = {
            x1: origin1.position().left + origin1.width(),
            y1: origin1.position().top + origin1.height()/2,
            x2: Math.floor(dagTable.find('.actionTypeWrap').position().left+12),
            y2: Math.floor(dagTable.find('.actionTypeWrap').position().top)
        }
        drawCurve(ctx, curvedLineCoor); 
    }
}

// draw the lines corresponding to tables not resulting from joins
function drawStraightDagConnectionLine(dagTable, ctx) {
    var tableX = dagTable.find('.dagTable').position().left;
    var farLeftX = dagTable.position().left;
    var currentY = dagTable.offset().top;
    if (dagTable.prev().children().children('.dagTableWrap').length > 0) {
        var desiredY = dagTable.prev().children().children('.dagTableWrap').offset().top;
    } else {
         var desiredY = dagTable.prev().children('.dagTableWrap').offset().top;
    }
    var yAdjustment = (desiredY - currentY)*2;
    dagTable.css({'margin-top': yAdjustment});
    var tableCenterY = dagTable.find('.dagTable').position().top + 
                 dagTable.height()/2;
    drawLine(ctx, tableX, tableCenterY, (tableX - farLeftX + 20));
}

function drawCurve(ctx, coor) {
    var x1 = coor.x1;
    var y1 = coor.y1;
    var x2 = coor.x2;
    var y2 = coor.y2;
    var vertDist = y2 - y1;

    var xoffset = 0;
    if (vertDist < 60) {
        xoffset = 1000 / vertDist;
    }
   
    ctx.beginPath();
    ctx.moveTo(x1 + xoffset, y1);
    ctx.bezierCurveTo( x2+50, y1,
                        x2+50, y1 + (vertDist + 16)*2,
                        x1 + xoffset, y1 + (vertDist + 16)*2 + 1);
    ctx.moveTo(x1 - 10, y1);
    ctx.lineTo(x1 + xoffset, y1);
    ctx.moveTo(x1 - 10, y1 + (vertDist + 17)*2);
    ctx.lineTo(x1 + xoffset, y1 + (vertDist + 16)*2 +1);
    ctx.stroke();
}


function drawLine(ctx, x, y, length) {
    // draw a horizontal line
    var dist = 30;
    if (length != undefined) {
        dist = length;
    }
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x - dist, y);
    ctx.stroke();
}

function drawDot(x, y) {
    var html = '<div style="font-size: 8px; width:3px;height:3px;'+
               'background-color:green;position:absolute; left:'+x+
               'px;top:'+y+'px;">'+x+','+y+'</div>';
    $('.dagImage').append(html);
}