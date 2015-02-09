function setupDag() {
    $('#compSwitch').click(function() {
        var compSwitch = $(this);
        var dag = $('#dagPanel');
        var workspacePanel = $('#workspacePanel');
        
        if (dag.hasClass('hidden')) {
            dag.removeClass('hidden');
            compSwitch.addClass('active');
        } else if (workspacePanel.hasClass('active')) {
            dag.addClass('hidden');
            compSwitch.removeClass('active');
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
        }
    });

    $('#closeDag').click(function() {
        $('#compSwitch').trigger('click');
    });

    var outerDag = '<div class="dagWrap">'+
                '<div class="header clearfix">'+
                    '<div class="btn btnSmall infoIcon">'+
                        '<div class="icon"></div>'+
                    '</div>'+
                    '<div class="tableTitleArea">'+
                        'Table: <span class="tableName">Table 0</span>'+
                    '</div>'+
                '</div>'+
                '</div>';
    var innerDag = '<div class="dagImageWrap"><div class="dagImage">'+
                   drawDag()+
                   '</div></div>';
    $('.dagArea').append(outerDag);
    $('.dagWrap:last').append(innerDag);
    var canvas = createCanvas();
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#999999';
    $('.dagTableWrap').each(function() {
        var el = $(this)
        drawJoinLines(el, canvas, ctx);
    });

    $('.dagImageWrap').scrollLeft($('.dagImage').width());
}

function drawJoinLines(dagTable, canvas, ctx) {
    if (dagTable.prev().children().length != 2 || 
        !dagTable.prev().hasClass('childContainer')) {
            if (dagTable.children('.filter').length != 0) {
                var tableX = dagTable.find('.dagTable').position().left;
                var farLeftX = dagTable.position().left;
                var tableY = dagTable.find('.dagTable').position().top + 
                             dagTable.height()/2;
                drawLine(ctx, tableX, tableY, (tableX - farLeftX + 20));
            }
            return;
    }

    var origin1 = dagTable.prev().children().eq(0);
    var origin2 = dagTable.prev().children().eq(1);

    if (origin1.hasClass('dagTableWrap')) {
        origin1 = origin1.children();
    } else if (origin1.hasClass('joinWrap')) {
        origin1 = origin1.children().eq(1).find('.dagTable');
    }
    if (origin2.hasClass('dagTableWrap')) {
        origin2 = origin2.children();
    } else if (origin2.hasClass('joinWrap')) {
        origin2 = origin2.children().eq(1).find('.dagTable');
    }

    var desiredY = (origin1.position().top + origin2.position().top)/2;
    var currentY = dagTable.find('.dagTable').position().top;
    var yAdjustment = (desiredY - currentY)*2;// 10 is the current margin 
    dagTable.css({'margin-top': yAdjustment}); 

    var tableX = dagTable.find('.dagTable').position().left;
    var tableY = dagTable.find('.dagTable').position().top + dagTable.height()/2;
    drawLine(ctx, tableX, tableY); // line entering table

    curvedLineCoor = {
        x1: origin1.position().left + origin1.width(),
        y1: origin1.position().top + origin1.height()/2,
        x2: Math.floor(dagTable.find('.actionTypeWrap').position().left + 12),
        y2: Math.floor(dagTable.find('.actionTypeWrap').position().top)
    }
    
    drawCurve(ctx, curvedLineCoor); // top curvedLine
    drawLine(ctx, curvedLineCoor.x1, curvedLineCoor.y1); // continuation of curved line
    curvedLineCoor.x1 = origin2.position().left + origin2.width();
    curvedLineCoor.y1 = origin2.position().top + origin2.height()/2;
    curvedLineCoor.y2 = Math.floor(dagTable.find('.actionTypeWrap')
                        .position().top + 30);
    drawCurve(ctx, curvedLineCoor); // bottom curvedLine
    drawLine(ctx, curvedLineCoor.x1, curvedLineCoor.y1); // continuation of curved line
}


function createCanvas() {
    var dagWrap = $('.dagWrap:last');
    var dagWidth = dagWrap.find('.dagImage > .joinWrap').width();
    var dagHeight = dagWrap.find('.dagImage > .joinWrap').height();
    var canvasHTML = $('<canvas id="canvas" width="'+dagWidth+
                     '" height="'+dagHeight+'"></canvas>');
    // $('.dagWrap:last').append(canvasHTML);
    $('.dagWrap:last .dagImage').append(canvasHTML);
    return (canvasHTML[0]);
}

function drawCurve(ctx, coor) {
    var yoffset = Math.ceil((coor.y1-coor.y2)/5);
    var xoffset = 20;
    // drawDot(coor.x2, coor.y2+offset);
    ctx.beginPath();
    ctx.moveTo(coor.x1+(xoffset*2), coor.y1);
    ctx.bezierCurveTo(coor.x2+xoffset, coor.y1, coor.x2+xoffset, 
                      coor.y2+yoffset, coor.x2+xoffset, coor.y2+yoffset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(coor.x2+xoffset,coor.y2+yoffset);
    ctx.lineTo(coor.x2+xoffset, coor.y2);
    ctx.stroke();

    drawLine(ctx, coor.x1+(xoffset*2), coor.y1, (xoffset*2));
}

function drawLine(ctx, x, y, length) {
    // draw a horizontal line
    var dist = 20;
    if (length != undefined) {
        dist = length;
    }
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x - dist, y);
    ctx.stroke();
}


function drawDagUnit(dagUnit, prop, dagArray, html) {
    var properties = {};
    properties.x = prop.x+1;
    properties.width = prop.width;
    var numChildren = dagUnit.children.length;
    var numJoins = Math.max(0, numChildren-1);

    var accumulatedDrawings = "";

    for (var i = 0; i < numChildren; i++) {
        properties.y = i*2 +1 - numChildren + prop.y;
        accumulatedDrawings += drawDagUnit(dagArray[dagUnit.children[i]], 
                               properties, dagArray, html);
    }

    var oneTable = drawDagTable(dagUnit, prop, dagArray);

    var newHtml;
    if (accumulatedDrawings) {
        newHtml = "<div class='joinWrap'><div class='childContainer'>"+
                  accumulatedDrawings+"</div>"+oneTable+"</div>";
    }

    if (newHtml) {
        return newHtml;
    } else {
        return (accumulatedDrawings+oneTable);
    }
}

function drawDagTable(dagUnit, prop, dagArray) {
    var top = 200 + (prop.y*60);
    var right = 100 + (prop.x*170);
    var dagTable = '<div class="dagTableWrap clearfix">' +
                drawDagOrigin(dagUnit, prop, dagArray);
    if (dagUnit.children.length == 0) {
        dagTable += '<div class="dagTable dataStore">'+
                    '<div class="dataStoreIcon"></div>'+
                    '<div class="icon"></div>'+
                    '<span class="tableTitle">Dataset</span>';
    } else {
        dagTable += '<div class="dagTable">' +
                    '<div class="dagTableIcon"></div>'+
                    '<div class="icon"></div>'+
                    '<span class="tableTitle">'+dagUnit.tableName+'</span>';
    }
    dagTable += '</div></div>';
    return dagTable;
}

function drawDagOrigin(dagUnit, prop, dagArray) {
    var originHTML = "";
    for (var i = 0; i < dagUnit.origin.length; i++) {

        if (dagUnit.origin[i] == "original") {
            return "";
        } 
        // console.log(origin, prop);
        var additionalInfo = "";
        if (dagUnit.children.length == 2) {
            additionalInfo += " & Table "+dagUnit.children[1];
        }

        var top = 210 + (prop.y*60);
        var right = 180 + (prop.x*170);
        originHTML += '<div class="actionType '+dagUnit.origin[i]+'" '+
                    'style="top:'+0+'px; right:'+0+'px;">'+
                        '<div class="actionTypeWrap">'+
                            '<div class="dagIcon '+dagUnit.origin[i]+'">'+
                                '<div class="icon"></div>'+
                            '</div>'+
                            '<span class="typeTitle">'+dagUnit.origin[i]+'</span>'+
                            '<span class="childrenTitle">Table '+
                                dagUnit.children[0]+additionalInfo+
                            '</span>'+
                        '</div>'+
                    '</div>';
    }
    return originHTML;
}

function drawDag() {
    var dagArray = getDag();
    var leafCount = 1;
    for (var i = 0; i < dagArray.length; i++) {
        if (dagArray[i].origin[0] == "original") {
            leafCount++;
        }
    }
    // leaf count should be 1 greater than the number of joins
    // leaf count will determine how wide the tree will need to be

    var prop = {
        x:0, 
        y:0, 
        width: leafCount,
        childCount: 0
    };

    var permProps = {
        joinCount: 0
    }
    return drawDagUnit(dagArray[0], prop, dagArray, "");
}

function drawDot(x, y) {
    var html = '<div style="font-size: 8px; width:3px;height:3px;'+
               'background-color:green;position:absolute; left:'+x+
               'px;top:'+y+'px;">'+x+','+y+'</div>';
    $('.dagImage').append(html);
}

function getDag() {
    var dagUnitArray = [];
    var DagUnit = function(tableName, origin, children) {
        this.tableName = tableName;
        this.origin = origin;
        this.children = children;
    }

    var dag17 = new DagUnit('Table 17', ['original'], []);
    var dag16 = new DagUnit('Table 16', ['original'], []);
    var dag15 = new DagUnit('Table 15', ['join'], [16, 17]);
    var dag14 = new DagUnit('Table 14', ['filter', 'filter'], [15]);
    var dag13 = new DagUnit('Table 13', ['original'], []);
    var dag12 = new DagUnit('Table 12', ['join'], [13, 14]);
    // var dag12 = new DagUnit('Table 12', ['original'], []);
    var dag11 = new DagUnit('Table 11', ['original'], []);
    var dag10 = new DagUnit('Table 10', ['original'], []);
    var dag9 = new DagUnit('Table 9', ['original'], []);
    var dag8 = new DagUnit('Table 8', ['original'], []);
    var dag7 = new DagUnit('Table 7', ['original'], []);
    var dag6 = new DagUnit('Table 6', ['join'], [11,12]);
    var dag5 = new DagUnit('Table 5', ['filter'], [10]);
    var dag4 = new DagUnit('Table 4', ['join'], [8,9]);
    var dag3 = new DagUnit('Table 3', ['join'], [6, 7]);
    var dag2 = new DagUnit('Table 2', ['filter', 'duplicateColumn'], [5]);
    var dag1 = new DagUnit('Table 1', ['join'], [3,4]);
    var dag0 = new DagUnit('Table 0', ['join'], [1,2]);
    // var daga = new DagUnit('Table a', ['filter'], [0]);
    // dagUnitArray.push(daga);
    dagUnitArray.push(dag0);
    dagUnitArray.push(dag1);
    dagUnitArray.push(dag2);
    dagUnitArray.push(dag3);
    dagUnitArray.push(dag4);
    dagUnitArray.push(dag5);
    dagUnitArray.push(dag6);
    dagUnitArray.push(dag7);
    dagUnitArray.push(dag8);
    dagUnitArray.push(dag9);
    dagUnitArray.push(dag10);
    dagUnitArray.push(dag11);
    dagUnitArray.push(dag12);
    dagUnitArray.push(dag13);
    dagUnitArray.push(dag14);
    dagUnitArray.push(dag15);
    dagUnitArray.push(dag16);
    dagUnitArray.push(dag17);
    return dagUnitArray;
}

// function getDag() {
//     var dagUnitArray = [];
//     var DagUnit = function(tableName, origin, children) {
//         this.tableName = tableName;
//         this.origin = origin;
//         this.children = children;
//     }

//     // var dag18 = new DagUnit('Table 18', ['original'], []);
//     // var dag17 = new DagUnit('Table 17', ['original'], []);
//     // var dag16 = new DagUnit('Table 16', ['original'], []);
//     // var dag15 = new DagUnit('Table 15', ['join'], [17, 18]);
//     // var dag14 = new DagUnit('Table 14', ['filter', 'filter'], [16]);
//     // var dag13 = new DagUnit('Table 13', ['original'], []);
//     // var dag12 = new DagUnit('Table 12', ['join'], [14, 15]);
//     // var dag12 = new DagUnit('Table 12', ['original'], []);
//     var dag11 = new DagUnit('Table 11', ['original'], []);
//     var dag10 = new DagUnit('Table 10', ['original'], []);
//     var dag9 = new DagUnit('Table 9', ['original'], []);
//     var dag8 = new DagUnit('Table 8', ['original'], []);
//     var dag7 = new DagUnit('Table 7', ['join'], [10, 11]);
//     var dag6 = new DagUnit('Table 6', ['original'], []);
//     var dag5 = new DagUnit('Table 5', ['join'], [8, 9]);
//     var dag4 = new DagUnit('Table 4', ['join'], [6,7]);
//     var dag3 = new DagUnit('Table 3', ['filter'], [5]);
//     var dag2 = new DagUnit('Table 2', ['filter', 'duplicateColumn'], [4]);
//     var dag1 = new DagUnit('Table 1', ['join'], [2,3]);
//     var dag0 = new DagUnit('Table 0', ['filter'], [1]);
//     dagUnitArray.push(dag0);
//     dagUnitArray.push(dag1);
//     dagUnitArray.push(dag2);
//     dagUnitArray.push(dag3);
//     dagUnitArray.push(dag4);
//     dagUnitArray.push(dag5);
//     dagUnitArray.push(dag6);
//     dagUnitArray.push(dag7);
//     dagUnitArray.push(dag8);
//     dagUnitArray.push(dag9);
//     dagUnitArray.push(dag10);
//     dagUnitArray.push(dag11);
//     // dagUnitArray.push(dag12);
//     // dagUnitArray.push(dag13);
//     // dagUnitArray.push(dag14);
//     // dagUnitArray.push(dag15);
//     // dagUnitArray.push(dag16);
//     // dagUnitArray.push(dag17);
//     // dagUnitArray.push(dag18);
//     return dagUnitArray;
// }
