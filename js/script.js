// JavaScript Document
// Menu Bar JS
var gTableRowIndex = 1;
var gCurrentPageNumber = 0;
var gNumEntriesPerPage = 20;
var gNumPageTurners = 10;
var gResultSetId = 0;
var gNewCellWidth = 125;
var gKeyName = "";
var gMouseStatus = null;
var gDragObj = {};
var gRescol = {
    minCellHeight: 20,
    cellMinWidth: 30,
    first: true,
    clicks: 0,
    delay: 500,
    timer: null,
    lastCellGrabbed: false
};
var resrow = {};
var gScrollbarHeight = 8;
var gTempStyle = "";
var gMinTableWidth = 1200;

// Classes
var ProgCol = function() {
    this.index = -1;
    this.name = "New heading";
    this.type = "Object";
    this.func = {};
    this.width = 0;
    this.userStr = "";
    this.isDark = true;
};

var gTableCols = []; // This is what we call setIndex on

function infScrolling() {
  $("#mainFrame").scroll(function() {
        if ($(this).scrollTop() == 0 && 
            $('#autoGenTable tbody td:first').attr('id') != 'bodyr1c1') {
            console.log('the top!');
            var firstRow = $('#autoGenTable tbody tr:first');
            var initialTop = firstRow.offset().top;
            goToPage(gCurrentPageNumber-1, RowDirection.Top);
            $('#mainFrame').scrollTop(firstRow.offset().top - initialTop + 10);
            $("#autoGenTable tbody tr:gt(79)").remove();
        } else if ($(this)[0].scrollHeight - $(this).scrollTop()+
                    gScrollbarHeight - $(this).outerHeight() <= 1) {
            console.log('the bottom!');
            gTempStyle = $("#autoGenTable tbody tr:nth-last-child(1)").html();
            if ($('#autoGenTable tbody tr').length > 79) {
                // keep row length at 80
                $("#autoGenTable tbody tr:lt(20)").remove();
            }
            goToPage(gCurrentPageNumber+1, RowDirection.Bottom); 
        }
        generateFirstLastVisibleRowNum();
    });
}

// XXX: This function should disappear. But I need to be able to free the
// result sets
function loadMainContent(op) {
    if (window.location.pathname.search("cat_table.html") > -1) {
        freeAllResultSets();
    }
}

function loadLoad(op) {
    $("#loadArea").load('/'+op.concat('_r.html'));
}

function menuAreaClose() {
    $("#menuArea").hide();
}

function menuBarArt() {
    var clickTarget = null;
    var clickTooFast = false;
    $("#menuBar div").on("click", function() {
        if (clickTooFast) {
            return;
        }
        clickTooFast = true;
        setTimeout(function() {clickTooFast = false}, 300);
        if (clickTarget == $(event.target).text()) {
            //if clicking on an already open menu, close it
            $("#menuBar div").removeClass("menuSelected");
            $('#mainFrame').height('calc(100% - 148px)');

            $("#menuArea").height(0);
            clickTarget = null;
            $('.trueTHead').css('top',111).addClass('moveTop');
            setTimeout(function() {
                $('.trueTHead').removeClass('moveTop');
                $('.colGrab').height($('#mainFrame').height());
            },300);
            return;
        }
        clickTarget = $(event.target).text();

        $('.trueTHead').css('top',177).addClass('moveTop');

        setTimeout(function() {
            $('.trueTHead').removeClass('moveTop');
            $('.colGrab').height($('#mainFrame').height());
        },300);

        $("#menuBar div").removeClass("menuSelected");
        $(this).addClass("menuSelected");
        $("#menuArea").show().height(66);
        $('#mainFrame').height('calc(100% - 214px)');
        

        switch ($(this).text()) {
        case ("datastore"):
            $("#datastorePanel").show();
            $("#datastorePanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        case ("monitor"):
            resetLoadArea();
            $("#monitorPanel").show();
            $("#monitorPanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        case ("tablestore"):
            resetLoadArea();
            $("#tablestorePanel").show();
            $("#tablestorePanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        default:
            console.log($(this.text()+" is not implemented!"));
            break;
        }
    });
}

function resetLoadArea() {
    $('#loadArea').html("").css('z-index', 'auto');
    $('#datastorePanel').width('100%');
    $('.datasetWrap').removeClass('shiftRight');
}

function monitorOverlayPercent() {
    $(".monitor").each(function() {
        var widthOfText = $(this).find("span").width();
        var amountToMove = -($(this).width()-widthOfText)/2-widthOfText/2-25;
        $(this).css("margin-right", amountToMove);
    });
    $(".datasetName").each(function() {
        var widthOfText = $(this).find("span").width();
        var amountToMove = -($(this).width()-widthOfText)/2-widthOfText/2-35;
        $(this).css("margin-right", amountToMove);
    });
}

function getTablesAndDatasets() {
    var tables = XcalarGetTables();
    var numTables = tables.numTables;
    var i;
    $(".datasetWrap").empty(); // Otherwise multiple calls will append the
    // same DS over and over again.
    for (i = 0; i<numTables; i++) {

        var tableDisplay = '<div class="menuAreaItem">'+
                               '<span class="menuAreaLabel monitorSmall">'+
                               'DATA<br>SET</span>'+
                               '<span class="menuAreaValue">'+
                                    tables.tables[i].tableName+
                               '</span>'+
                            '</div>';

        $("#tablestorePanel div:last").after(tableDisplay);
    }

    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    for (i = 0; i<numDatasets; i++) {
        var dsName = getDsName(datasets.datasets[i].datasetId);
        var tableDisplay = '<div class="menuAreaItem">'+
                                '<span class="menuAreaLabel monitorSmall">'+
                                    'DATA<br>SET</span>'+
                                '<span class="menuAreaValue">'+
                                    dsName+
                                '</span>'+
                            '</div>';
        $(".datasetWrap").append(tableDisplay);
    };
    monitorOverlayPercent();
    // XXX: UNCOMMENT!
    // resizableColumns();
}



function fillPageWithBlankCol() {
    var tableWidth = $("#autoGenTable").width();
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil((screenWidth - tableWidth)/gNewCellWidth) ;
    var startColId = $("#autoGenTable tr:first th").length;
    for (var i = 0; i<numColsToFill; i++) {
        addCol("headCol"+(startColId+i), "", {'isDark': true});
    }
}

function goToPage(pageNumber, direction) {
    // deselectPage(gCurrentPageNumber);
    if (pageNumber > gNumPages) {
        console.log("Already at last page!");
        return;
    }
    if (pageNumber < 1) {
        console.log("Cannot go below one!");
        return;
    }
    gCurrentPageNumber = pageNumber;
    if (direction == 1) {
        var shift = Math.floor($('#autoGenTable tbody tr').length /
                                    gNumEntriesPerPage);
    } else {
        var shift = 1;
    }
    console.log(shift)
    XcalarSetAbsolute(gResultSetId, (pageNumber-shift)*gNumEntriesPerPage);
    getPage(gResultSetId, null, direction);
}

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?')
                 + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function resetAutoIndex() {
    gTableRowIndex = 1;
}

function getNextPage(resultSetId, firstTime) {
    if (resultSetId == 0) {
        return;
    }
    gCurrentPageNumber++;
    console.log("HERE!");
    getPage(resultSetId, firstTime);
}

function getPage(resultSetId, firstTime, direction) {
    console.log('made it to getpage')
    if (resultSetId == 0) {
        return;
        // Reached the end
    }
    var resize = false;
    var tdHeights = getTdHeights();
    var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           gNumEntriesPerPage);
    if (tableOfEntries.kvPairs.numRecords < gNumEntriesPerPage) {
        // This is the last iteration
        // Time to free the handle
        // XXX: Function call to free handle?
        resultSetId = 0;
    }
    if (direction == 1) {
        var shift = Math.floor($('#autoGenTable tbody tr').length / gNumEntriesPerPage);
        var indexNumber = (gCurrentPageNumber-shift) * gNumEntriesPerPage;
    } else {
        var indexNumber = (gCurrentPageNumber-1) * gNumEntriesPerPage;
    }
    var numRows = Math.min(gNumEntriesPerPage,
                           tableOfEntries.kvPairs.numRecords);
    for (var i = 0; i<numRows; i++) {
        if (direction == 1) {
            if (tableOfEntries.kvPairs.recordType ==
                GenericTypesRecordTypeT.GenericTypesVariableSize) { 
                var value = tableOfEntries.kvPairs.records[numRows-1-i].kvPairVariable.value;
            } else {
                var value = tableOfEntries.kvPairs.records[numRows-1-i].kvPairFixed.value;
            }
        } else {
            if (tableOfEntries.kvPairs.recordType ==
                GenericTypesRecordTypeT.GenericTypesVariableSize) { 
                var value = tableOfEntries.kvPairs.records[i].kvPairVariable.value;
            } else {
                var value = tableOfEntries.kvPairs.records[i].kvPairFixed.value;
            }

        }
        if (firstTime) {
            generateFirstScreen(value, indexNumber+i+1, tdHeights[i]);
        } else {
            if (direction ==1) {
                generateRowWithCurrentTemplate(value, indexNumber+(numRows-i), direction);
            } else {
                generateRowWithCurrentTemplate(value, indexNumber+i+1, direction);
            }         
        }
    }

    if (firstTime && !getIndex(gTableName)) {
        gKeyName = tableOfEntries.keysAttrHeader.name;
        // We cannot rely on addCol to create a new progCol object because
        // add col relies on gTableCol entry to determine whether or not to add
        // the menus specific to the main key
        var newProgCol = new ProgCol();
        newProgCol.index = 2;
        newProgCol.isDark = false;
        newProgCol.name = gKeyName;
        newProgCol.func.func = "pull";
        newProgCol.func.args = [gKeyName];
        newProgCol.userStr = '"' + gKeyName + '" = pull('+gKeyName+')';
        insertColAtIndex(0, newProgCol);
        addCol("headCol1", gKeyName, {progCol: newProgCol}); 
        newProgCol = new ProgCol();
        newProgCol.index = 3;
        newProgCol.name = "DATA";
        newProgCol.width = gNewCellWidth; // XXX FIXME Grab from CSS
        newProgCol.func.func = "raw";
        newProgCol.func.args = [];
        newProgCol.userStr = '"DATA" = raw()';
        newProgCol.isDark = false;
        insertColAtIndex(1, newProgCol);
    }
    console.log("gTableCols.length: "+gTableCols.length);
    for (var i = 0; i<gTableCols.length; i++) {
        if (gTableCols[i].name == "DATA") {
            // We don't need to do anything here because if it's the first time
            // they won't have anything stored. If it's not the first time, the
            // column would've been sized already. If it's indexed, we
            // would've sized it in CatFunction
        } else {
            if (firstTime && !getIndex(gTableName)) {
                execCol(gTableCols[i]);
            } else {
                execCol(gTableCols[i]);
                if (gTableCols[i].name == gKeyName) {
                    console.log(gKeyName);
                    autosizeCol($('#headCol'+(gTableCols[i].index)));
                }
            }
        }
    }
    $('.colGrab').height($('#mainFrame').height());
    var idColWidth = getTextWidth($('#autoGenTable tr:last td:first'));
    var newWidth = Math.max(idColWidth, 24);
    console.log(newWidth, 'newwidth')
    $('#autoGenTable th:first-child').width(newWidth+14);
    matchHeaderSizes();
    getFirstVisibleRowNum();
}

function getFirstVisibleRowNum() {
     var mainFramePos = $('#mainFrame')[0].getBoundingClientRect();
    var mfPosTop = mainFramePos.top;
    var mfPosLeft = mainFramePos.left;
    var tdXCoor = 30;
    var tdYCoor = 45;
    var el = document.elementFromPoint(tdXCoor+mfPosLeft, tdYCoor+mfPosTop);
    var rowNum = parseInt($(el).closest('td').attr('id').substring(5));
}

function generateFirstLastVisibleRowNum() {
    var mainFramePos = $('#mainFrame')[0].getBoundingClientRect();
    var mfPosTop = mainFramePos.top;
    var mfPosLeft = mainFramePos.left;
    var mfPosBot = mainFramePos.bottom;
    var tdXCoor = 30;
    var tdYCoor = 50;
    var tdBotYCoor = -20;
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+mfPosLeft,
                                            tdYCoor+mfPosTop);
    var firstId = $(firstEl).closest('td').attr('id');
    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(5));
    }

    if (tdBotYCoor + mfPosBot >= $(window).height()) {
        var tdBottom = $(window).height()-10;
    } else {
        var tdBottom = tdBotYCoor + mfPosBot;
    }
    var lastEl = document.elementFromPoint(tdXCoor+mfPosLeft,
                                           tdBottom);
    var lastId = $(lastEl).closest('td').attr('id');
    if (lastId && lastId.length > 0) {
        var lastRowNum = parseInt(lastId.substring(5));
    }

    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar .rowNum:first-of-type').html(firstRowNum);
        movePageScroll(firstRowNum);
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar .rowNum:last-of-type').html(lastRowNum);
    } 
}

function generateRowWithCurrentTemplate(json, id, direction) {
    // Replace JSON
    var startString = '<div class="elementText">';
    var endString="</div>";
    var originalString = $("#autoGenTable tbody tr:nth-last-child(1)").html() ||
                         gTempStyle;
    var index = originalString.indexOf(startString);
    var firstPart = originalString.substring(0, index+startString.length);
    var secondPart = originalString.substring(index+startString.length+1);
    var secondIndex = secondPart.indexOf(endString);
    secondPart = secondPart.substring(secondIndex);
    var finalString = firstPart+json+secondPart;
    // console.log(finalString,1)
    // Replace id
    firstIndex = finalString.indexOf('idSpan">')+('idSpan">').length;
    secondIndex = finalString.indexOf("<", firstIndex);
    firstPart = finalString.substring(0, firstIndex);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr>"+firstPart + id + secondPart+"</tr>";

    if (direction == 1) {
        var row = "tr:first-child";
    } else {
        var row = "tr:last-child";
    }

    if ($("#autoGenTable tbody tr").length == 0) {
        $("#autoGenTable tbody").append(finalString);
    } else { 
        if (direction == 1) {
            $("#autoGenTable tbody tr:first-child").before(finalString);
        } else {
            $("#autoGenTable tbody tr:nth-last-child(1)").after(finalString);
        }    
    }

    // Replace element id
    $("#autoGenTable tbody "+row).find("[id]").each(function() {
        var colNoInd = (this.id).indexOf("c");
        var colNo = (this.id).substring(colNoInd+1);
        this.id = "bodyr"+id+"c"+colNo;
    });

    $('#autoGenTable tbody '+row+' .jsonElement').dblclick(function() {
        showJsonPopup($(this));
    });

    $('#autoGenTable  tbody '+row+' .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}

function generateRowWithAutoIndex(text, hoverable) {
    var URIEncoded = encodeURIComponent(text);
    console.log(URIEncoded);
    if (hoverable) {
        var clickable = 'class="mousePointer"';
    } 
    else { 
        var clickable = "";
    }
    $("#autoGenTable tr:last").after('<tr><td height="18" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        gTableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'+
        gTableRowIndex+'</td>'+
        '<td bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        gTableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)"'+
        ' onclick="javascript: window.location.href=\'cat_table.html?'+
        'tablename='+
        URIEncoded+'\'">'+
        '<div class="cellRelative"><span '+clickable+'>'+text+'</span>'+
        '<div class="dropdownBox"></div>'+
        '</div></td></tr>');
    gTableRowIndex++;
}

function generateFirstScreen(value, idNo, height) {
    if (height == undefined) {
        var cellHeight = gRescol.minCellHeight;
    } else {
        var cellHeight = height;
    }
    $("#autoGenTable tbody").append('<tr>'+
        '<td align="center" id="bodyr'+
        idNo+'c1"'+
        'style="height:'+cellHeight+'px;">'+
        '<div class="idWrap"><span class="idSpan">'+
        idNo+'</span><div class="rowGrab"></div></div></td>'+
        '<td class="jsonElement" id="bodyr'+
        idNo+'c2">'+
        '<div class="elementTextWrap" style="max-height:'+
        (cellHeight-4)+'px;">'+
        '<div class="elementText">'+
        value+'</div>'+
        '</div>'+
        '</td>'+
        '</tr>');

    $('#autoGenTable tbody tr:eq('+(idNo-1)+') .jsonElement').dblclick(
        function(){
            showJsonPopup($(this));
        }
    );
    $('#bodyr'+idNo+'c1 .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}

function insertColAtIndex(index, obj) {
    for (var i = gTableCols.length-1; i>=index; i--) {
        gTableCols[i].index += 1;
        gTableCols[i+1] = gTableCols[i];
    }
    gTableCols[index] = obj;
}

function removeColAtIndex(index) {
    var removed = gTableCols[index];
    for (var i = index+1; i<gTableCols.length; i++) {
        gTableCols[i].index -= 1;
    }
    gTableCols.splice(index, 1);
    return (removed);
}

function parsePullColArgs(progCol) {
    if (progCol.func.func != "pull") {
        console.log("Wrong function!");
        return (false);
    }
    if (progCol.func.args.length != 1) {
        console.log("Wrong number of arguments!");
        return (false);
    }
    return (true);
}

function execCol(progCol, args) {
    switch(progCol.func.func) {
    case ("pull"):
        if (!parsePullColArgs(progCol)) {
            console.log("Arg parsing failed");
        }
        var startIndex;
        var numberOfRows;
        if (args) {
            if (args.index) {
                progCol.index = args.index;
            }
            if (args.startIndex) {
                startIndex = args.startIndex;
            }
            if (args.numberOfRows) {
                numberOfRows = args.numberOfRows;
            }
        }
        if (progCol.isDark) {
            progCol.isDark = false;
        }
        pullCol(progCol.func.args[0], progCol.index,
                startIndex, numberOfRows);
        break;
    case ("raw"):
        console.log("Raw data");
        break;
    case (undefined):
        console.log("Blank col?");
        break;
    default:
        console.log(progCol);
        console.log("No such function yet!"+progCol.func.func
                    + progCol.func.args);
        return;
    }
}

function parseCol(funcString, colId, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open = funcString.indexOf("\"");
    var close = (funcString.substring(open+1)).indexOf("\"")+open+1;
    var name = funcString.substring(open+1, close);
    var funcSt = funcString.substring(funcString.indexOf("=")+1);
    var progCol;
    if (modifyCol) {
        progCol = gTableCols[colId-2];
    } else {
        progCol = new ProgCol();
    }
    console.log(progCol)
    progCol.userStr = funcString;
    progCol.name = name;
    progCol.func = cleanseFunc(funcSt);
    progCol.index = colId;
    return (progCol);
}

function removeSpaces(str) {
    var start = -1;
    var end = -1;
    for (var i = 0; i<str.length; i++) {
        if (str[i] != " ") {
            start = i;
            break;
        }
    }
    for (var i = str.length-1; i>=0; i--) {
        if (str[i] != " ") {
            end = i;
            break;
        }
    }
    return (str.substring(start, end+1));
}

function cleanseFunc(funcString) {
    var open = funcString.indexOf("(");
    var close = -1;
    for (var i = funcString.length-1; i>open; i--) {
       if (funcString[i] == ")") {
           close = i;
           break;
       }
    }
    var funcName = funcString.substring(0, open);
    funcName = removeSpaces(funcName);
    var args = (funcString.substring(open+1, close)).split(",");
    for (var i = 0; i<args.length; i++) {
        args[i] = removeSpaces(args[i]);
    }
    return ({func: funcName, args: args});
}

function updateFunctionBar(text) {
    $('#fnBar').val(text);
}

function delCol(id, resize) {
    var colid = parseInt(id.substring(11));
    var numCol = $("#autoGenTable tr:first th").length;
    
    $("#headCol"+colid).remove();
    removeColAtIndex(colid-2);
    $("#autoGenTable tr:eq(1) #headCol"+colid).remove();
    for (var i = colid+1; i<=numCol; i++) {
        $("#headCol"+i).attr("id", "headCol"+(i-1));
        $("#closeButton"+i).attr("id", "closeButton"+(i-1));
        $("#addLCol"+i).attr("id", "addLCol"+(i-1));
        $("#addRCol"+i).attr("id", "addRCol"+(i-1));
        $("#rename"+i).attr("id", "rename"+(i-1));
        $("#renameCol"+i).attr("id", "renameCol"+(i-1));
        $('#sort'+i).attr("id", "sort"+(i-1));
        $('#revSort'+i).attr("id", "revSort"+(i-1));
        $('#filter'+i).attr("id", "filter"+(i-1));
        $("#duplicate"+i).attr("id", "duplicate"+(i-1));
        $("#autoGenTable tr:eq(1) #headCol"+i).attr("id", "headCol"+(i-1));
    }
 
    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);

    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        $("#bodyr"+i+"c"+colid).remove();
        for (var j = colid+1; j<=numCol; j++) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j-1));
        }
    }
    gRescolDelWidth(id, resize);
}

function pullCol(key, newColid, startIndex, numberOfRows) {
    if (key == "" || /\.([0-9])/.test(key)) {
        //check for dot followed by number (invalid)
        return;
    }
    var colid = $("#autoGenTable th").filter(
        function() {
            return $(this).find("input").val() == "DATA";
    }).attr("id");
    colid = colid.substring(7);
    var numRow = -1;
    var startingIndex = -1;
    if (!startIndex) {
        var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
        idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
        startingIndex = parseInt(idOfFirstRow);
        numRow = $("#autoGenTable tbody tr").length;
    } else {
        startingIndex = startIndex;
        numRow = numberOfRows||gNumEntriesPerPage;
    } 
    var nested = key.trim().replace(/\]/g, "").replace(/\[/g, ".").split(".");
    
    // store the variable type
    var jsonStr = $("#bodyr"+startingIndex+"c"+colid+ " .elementText").text(); 
    var value = jQuery.parseJSON(jsonStr);
    for (var j = 0; j<nested.length; j++) {
        if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
            value = "";
            break;
        }
        value = value[nested[j]];
    }
    gTableCols[newColid-2].type = (typeof value);
    
    for (var i =  startingIndex; i<numRow+startingIndex; i++) {
        var jsonStr = $("#bodyr"+i+"c"+colid+ " .elementText").text(); 
        var value = jQuery.parseJSON(jsonStr); 
        for (var j = 0; j<nested.length; j++) {
            if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
                value = "";
                break;
            }
            value = value[nested[j]];
        }  
        if (value == undefined) {
            value = '<span class="undefined">'+value+'</span>';
        } else {
            switch (value.constructor) {
                case (Object):
                    if ($.isEmptyObject(value)) {
                        value = "";
                    } else {
                        value = JSON.stringify(value).replace(/,/g, ", ");
                    }
                    break;
                case (Array):
                    value = value.join(', ');
                    break;
                default: // leave value as is;
            }
        }
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+
                value+"</div></div>";
        $("#bodyr"+i+"c"+newColid).html(value); 
    } 
}

function addCol(id, name, options) {
    var numCol = $("#autoGenTable tr:first th").length;
    var colid = parseInt(id.substring(7));
    var newColid = colid;
    var options = options || {};
    var width = options.width || gNewCellWidth;
    var resize = options.resize || false;
    var isDark = options.isDark || false;
    var select = options.select || false;
    var newProgCol = options.progCol || new ProgCol();
    if (options.direction != "L") {
        newColid += 1;
    }
    if (name == null) {
        name = "";
        var select = true;
    } 
    if (select) {
        var color = "selectedCell";
        $('.selectedCell').removeClass('selectedCell');
    } else if (isDark) {
        var color = "unusedCell";
    } else {
        var color = "";
    }

    if (!options.progCol) {
        newProgCol.name = name;
        newProgCol.index = newColid;
        newProgCol.width = width;
        newProgCol.isDark = isDark;
        insertColAtIndex(newColid-2, newProgCol);
    }
    for (var i = numCol; i>=newColid; i--) {
        $("#headCol"+i).attr("id", "headCol"+(i+1));
        $("#closeButton"+i).attr("id", "closeButton"+(i+1));
        $("#addRCol"+i).attr("id", "addRCol"+(i+1));
        $("#addLCol"+i).attr("id", "addLCol"+(i+1));
        $("#rename"+i).attr("id", "rename"+(i+1));
        $("#renameCol"+i).attr("id", "renameCol"+(i+1));
        $("#sort"+i).attr("id", "sort"+(i+1));
        $("#revSort"+i).attr("id", "revSort"+(i+1));
        $("#filter"+i).attr("id", "filter"+(i+1));
        $("#duplicate"+i).attr("id", "duplicate"+(i+1));
        $("#autoGenTable tr:eq(1) #headCol"+i).attr("id", "headCol"+(i+1));
    }        
    
    var columnHeadTd = '<th class="table_title_bg '+color+' editableCol'+
        '" id="headCol'+
        newColid+
        '" style="width:'+width+'px;">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox"></div>'+
        '<span><input autocomplete="on" type="text" id="rename'+newColid+'" '+
        'class="editableHead" '+
        'value="'+name+'" size="15" placeholder=""/></span>'+
        '</div>'+
        '</th>';
    $("#headCol"+(newColid-1)).after(columnHeadTd); 
    $("#autoGenTable tr:eq(1) #headCol"+(newColid-1)).after(columnHeadTd); 

    var dropDownHTML = '<ul class="colMenu">'+
            '<li>'+
                'Add a column'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns" id="addLCol'+
                    newColid+'">On the left</li>'+
                    '<li class="addColumns" id="addRCol'+
                    newColid+'">On the right</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>'+
            '<li class="deleteColumn" onclick="delCol(this.id);" '+
            'id="closeButton'+newColid+'">Delete column</li>'+
            '<li id="duplicate'+newColid+'">Duplicate column</li>'+
            '<li id="renameCol'+newColid+'">Rename column</li>'+
            '<li class="sort">Sort'+
                '<ul class="subColMenu">'+
                    '<li id="sort'+newColid+'">A-Z</li>'+
                    '<li id="revSort'+newColid+'">Z-A</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>';
    // console.log(gTableCols[newColid-2]);
    if (gTableCols[newColid-2].func.func == "pull" &&
        gTableCols[newColid-2].func.args[0] == gKeyName) {
        // XXX FIXME TODO
        // if (gTableCols[newColid-2].type == "number") { 
        if (true) {
        dropDownHTML += '<li class="filterWrap" id="filter'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Greater Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Greater Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Equals'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Regex'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="*"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="rightArrow"></div>'+
                        '</li>'+
                        '<li id="join">'+'Join'+
                            '<div class="rightArrow"></div>'+
                            '<ul class="subColMenu">';
        } else {
        dropDownHTML += '<li class="filterWrap" id="filter'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Regex'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="*"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                        '</ul>'+
                        '<div class="rightArrow"></div>'+
                        '</li>'+
                        '<li id="join">'+'Join'+
                            '<div class="rightArrow"></div>'+
                            '<ul class="subColMenu">';
        }
        var tables = XcalarGetTables();
        var numTables = tables.numTables;
        for (var i = 0; i<numTables; i++) {
            var t = tables.tables[i];
            dropDownHTML += '<li class="join">'+t.tableName+'</li>';
        }
        dropDownHTML +=     '<div class="subColMenuArea"></div>'+
                            '</ul>'+ 
                        '</li>';
    }
    dropDownHTML += '</ul>';
    $('#headCol'+newColid+' .header').append(dropDownHTML);

    addColListeners(newColid);

    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        for (var j = numCol; j>=newColid; j--) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j+1));
            // every column after the new column gets id shifted +1;
        }
        var newCellHTML = '<td '+
            'class="'+color+'" id="bodyr'+i+"c"+(newColid)+
            '">&nbsp;</td>';
            $("#bodyr"+i+"c"+(newColid-1)).after(newCellHTML);
    }

    $("#rename"+newColid).keyup(function(e) {
         updateFunctionBar($(this).val());
        if (e.which==13) {
            var index = parseInt($(this).attr('id').substring(6));
            var progCol = parseCol($(this).val(), index, true);
            execCol(progCol);
            if (progCol.name.length > 0) {
                console.log(progCol.name, 'name')
                $(this).val(progCol.name);
            } else {
                console.log($(this).val(), 'else');
            }
            $(this).blur();
            $(this).closest('th').removeClass('unusedCell');
            $('#autoGenTable td:nth-child('+index+')').removeClass('unusedCell');
        }
    });

    // XXX on.input updates fnbar faster than keyup or keypress
    // keypress/keyup doesn't detect if you're holding down backspace
    // but on.input doesn't detect e.which
    $("#rename"+newColid).on('input', function(e) {
        updateFunctionBar($(this).val());
    });

    if (select) {
        // $('#rename'+newColid).select().focus();
        $('#rename'+newColid).focus();
    }
    resizableColumns();
    matchHeaderSizes();
}

function addColListeners(colId) {
    $('#rename'+colId).focus(function() {  
        $('.colMenu').hide();
        var index = parseInt($(this).attr('id').substring(6));
        if (gTableCols[index-2].userStr.length > 0) {
            $(this).val(gTableCols[index-2].userStr);
        }
        
        updateFunctionBar($(this).val());
        $('.selectedCell').removeClass('selectedCell');
        $(this).closest('th').addClass('selectedCell');
        $('#autoGenTable td:nth-child('+index+')')
                .addClass('selectedCell');
        $(this).parent().siblings('.dropdownBox')
            .addClass('hidden');
        // $(this).select();
    }).blur(function() {
        var index = parseInt($(this).attr('id').substring(6));
        if (gTableCols[index-2].name.length > 0) {
            $(this).val(gTableCols[index-2].name);
        } 
        $(this).parent().siblings('.dropdownBox')
            .removeClass('hidden');
    });

    $('#headCol'+colId+' .dropdownBox').click(function() {
        $('.colMenu').hide().removeClass('leftColMenu')
                    .find('.subColMenu').removeClass('leftColMenu');
        $(this).siblings('.colMenu').show();
        var colMenu = $(this).siblings('.colMenu');
        if (colMenu[0].getBoundingClientRect().right > $(window).width()) {
            colMenu.addClass('leftColMenu');
        }
        if (colMenu.find('.subColMenu').length > 0) {
            if (colMenu.find('.subColMenu')[0].getBoundingClientRect().right > 
                $(window).width()) {
                    colMenu.find('.subColMenu').addClass('leftColMenu');
            }
        }
    });

    $('#headCol'+colId+' .dropdownBox').mouseenter(function() {
        $(this).removeClass('hidden');
    }).mouseout(function() {
        var input = $(this).siblings('span').children('.editableHead');
        if (input.is(':focus')) {
            $(this).addClass('hidden');
        }
    });

    $('#headCol'+colId+' .subColMenuArea').mousedown(function() {
        $('.colMenu').hide();
    });

    $('#headCol'+colId+' ul.colMenu > li:first-child').mouseenter(function(){
        $(this).parent().removeClass('white');
    }).mouseleave(function(){
        $(this).parent().addClass('white');
    });

    $('#headCol'+colId+' .subColMenu li').mouseenter(function() {
            subColMenuMouseEnter($(this));
        }).mouseleave(function() {
            subColMenuMouseLeave($(this));
    });

    $('#headCol'+colId+' .colMenu ul').mouseleave(function(){
        if ($(this).parent().is(':first-child')) {
            $(this).parent().parent().siblings('.rightArrow').
            removeClass('dimmed').addClass('arrowExtended');
        } 
    });

    $('#headCol'+colId+' .dragArea').mousedown(function(event){
        var headCol = $(this).parent().parent();
        headCol.find('.editableHead').focus();
        dragdropMouseDown(headCol, event);
    });

    $('#headCol'+colId+' .addColumns').click(function() {
        var id = $(this).attr('id');
        var direction = id.substring(3,4);
        $('.colMenu').hide();
        addCol(id, null, {direction: direction, isDark: true});
    });

    $('#renameCol'+colId).click(function() {
        var index = $(this).attr('id').substring(9);
        $('#rename'+index).focus().select();
    });

    $("#headCol"+colId).mouseover(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $(this).find('.dropdownBox').css('opacity', 1);
        }
    }).mouseleave(function() {
        $(this).find('.dropdownBox').css('opacity', 0.4);
    });


    $('#duplicate'+colId).click(function() {
        var id = $(this).attr('id').substring(2);
        var index = parseInt(id.substring(7));
        var name = $('#rename'+index).val();
        var width = $('#headCol'+index).outerWidth();
        var isDark = $('#headCol'+index).hasClass('unusedCell');

        console.log(name, 'name')
        addCol(id, name, {width: width, isDark: isDark});
        // Deep copy
        // XXX: TEST THIS FEATURE!
        gTableCols[index-1].func.func = gTableCols[index-2].func.func;
        gTableCols[index-1].func.args = gTableCols[index-2].func.args;
        gTableCols[index-1].userStr = gTableCols[index-2].userStr;
        execCol(gTableCols[index-1], null); 
    });

    $('#sort'+colId).click(function() {
        var index = $(this).attr("id").substring(4);
        sortRows(index, SortDirection.Forward);
    }); 
    
    $('#revSort'+colId).click(function() {
        var index = $(this).attr("id").substring(7);
        sortRows(index, SortDirection.Backward);
    }); 

    $('#headCol'+colId+' .editableHead').mousedown(function(event) {
        event.stopPropagation();
    });

    $('#filter'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        $(this).closest('.filter').siblings().find('input').val(value);
        if (e.which === 13) {
            var operator = $(this).closest('.filter').text(); 
            filterCol(operator, value);
        }
    });

    $('#filter'+colId+' input').click(function(){
        $(this).select();
    });

    $('#join .subColMenu li').click(function() {
        joinTables($(this).text());
    });

    $('#headCol'+colId+' .colMenu li').click(function() {
        if ($(this).children('.subColMenu, input').length === 0) {
            // hide li if doesnt have a submenu or an input field
            $(this).closest('.colMenu').hide();
        }
    });
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function resizableColumns() {
    $('#autoGenTable tr:first .header').each(
        function() {
            if (!$(this).children().hasClass('colGrab') 
                &&!$(this).parent().is(':first-child')) {
                    var tdId = $(this).parent().attr('id');
                    $(this).prepend('<div class="colGrab"></div>');
                    $('#autoGenTable tr:eq(1) #'+tdId+' .header').prepend(
                        '<div class="colGrab"></div>');
                    var firstEl = '#'+tdId+' .colGrab';
                    var secondEl = '#autoGenTable tr:eq(1) #'+tdId+' .colGrab';
                    $(firstEl+','+secondEl).mousedown(
                        function(event) {
                            if (event.which === 1) {
                                gRescolMouseDown($(this), event);
                                dblClickResize($(this));
                            }
                        }
                    );
            }
        }
    );
    // $('.colGrab').height($('#autoGenTable').height());
    $('.colGrab').height($('#mainFrame').height());
    if (gRescol.first) {
        $('#autoGenTable tr:first th').each(
            function() {
                    var initialWidth = $(this).width();
                    $(this).width(initialWidth);
                    $(this).removeAttr('width');
            } 
        );
        gRescol.first = false;
    } 
}

//XXX consider using mouseover
// el is #headCol2 .subColMenu li
function subColMenuMouseEnter(el) {
    el.siblings().addClass('subColUnselected');
    el.addClass('subColSelected');
    el.parent().parent().addClass('subSelected');

    if (el.is(':first-child')) {
        el.parent().siblings('.rightArrow').addClass('arrowExtended');
    }
    
    if (el.parent().parent().is(':first-child')) {
        el.parent().parent().parent().addClass('dimmed');
        el.parent().parent().parent().siblings('.rightArrow').
            removeClass('arrowExtended').addClass('dimmed');
    }
    
}

function subColMenuMouseLeave(el) {
    el.siblings().removeClass('subColUnselected');
    el.removeClass('subColSelected');
    el.parent().parent().removeClass('subSelected');
    el.parent().siblings('.rightArrow').removeClass('arrowExtended').
        removeClass('dimmed');
    el.closest('.colMenu').removeClass('dimmed');
}

function disableTextSelection() {
    window.getSelection().removeAllRanges();
    var style = '<style id="disableSelection" type="text/css">*'+ 
        '{ -ms-user-select:none;-moz-user-select:-moz-none;'+
        '-khtml-user-select:none;'+
        '-webkit-user-select:none;user-select:none; }</style>';
    $(document.head).append(style);
    $('input').prop('disabled', true);
}

function reenableTextSelection() {
    $('#disableSelection').remove();
    $('input').prop('disabled', false);
}

function documentReadyCommonFunction() {
    addColListeners(2); // set up listeners for json column

    if (typeof gTableName === 'undefined') {
        var searchText = "View Tables";
    } else {
        var searchText = gTableName;
    }

    $('#fnBar').on('input', function(e) {
        var selectedCell = $('th.selectedCell .editableHead');
        selectedCell.val($(this).val());
    });

    $('#fnBar').keyup(function(e) {
        var selectedCell = $('th.selectedCell .editableHead');
        if (e.which == 13) {
            selectedCell.trigger(e);
        }
    });

    $('#fnBar').mousedown(function() {
        var fnBar = $(this);
        // must activate mousedown after header's blur, hence delay
        setTimeout(selectCell, 1);
        function selectCell() {
            var selectedCell = $('th.selectedCell .editableHead');
            selectedCell.val(fnBar.val());
        }
        
    });

    $('#fnBar').blur(function() {
        var selectedCell = $('th.selectedCell .editableHead');
        var index = $('th.selectedCell').index();
        if (selectedCell.length !=0) {
            if (gTableCols[index-1].name.length > 0) {
                selectedCell.val(gTableCols[index-1].name);
            } 
        }
    });

    $("#searchBar").val('tablename = "'+searchText+'"');
    var resultTextLength = (""+resultSetCount).length
    $('#pageInput').attr({'maxLength': resultTextLength,
                          'size': resultTextLength});
    $('#pageInput').keypress(function(e) {
        if (e.which === 13) {
            val = $('#pageInput').val();
            if (val == "" || val%1 != 0) {
                return;
            } else if (val < 1) {
                $('#pageInput').val('1');
            } else if (val > resultSetCount) {
                $('#pageInput').val(resultSetCount);
            }
            // XXX: HACK
            gTempStyle = $("#autoGenTable tbody tr:nth-last-child(1)").html();
            $("#autoGenTable tbody").empty();
            goToPage(Math.ceil(
                     parseInt($('#pageInput').val())/gNumEntriesPerPage));
            goToPage(Math.ceil(
                     parseInt($('#pageInput').val())/gNumEntriesPerPage)+1);
            goToPage(Math.ceil(
                     parseInt($('#pageInput').val())/gNumEntriesPerPage)+2);
            generateFirstLastVisibleRowNum();
            movePageScroll($('#pageInput').val());
            $('#mainFrame').scrollTop('0.1');
            // should be 0 but can't because would activate scrolltop pages
            // $(this).blur(); 
        }
    });
    $('#pageBar > div:last-child').append('<span>of '+resultSetCount+'</span>');

    $(window).resize(function() {
        $('.colGrab').height($('#mainFrame').height());
        checkForScrollBar();
    });

    $('.closeJsonModal, #modalBackground').click(function(){
        if ($('#jsonModal').css('display') == 'block') {
            $('#modalBackground').hide(); 
            $('body').removeClass('hideScroll');
        }
        $('#jsonModal').hide();
       
    });


    $('#datastorePanel .menuAreaItem:first').click(function(){
        $("#loadArea").load('load_r.html', function(){
            // load_r.html contains load.js where this function is defined
            loadReadyFunction();
            $('#progressBar').css('transform', 'translateX(330px)');
            $('.dataStep').css('transform', 'translateX(320px)');
            $('.dataOptions').css('left',330).css('z-index', 6);
        });
        $('.datasetWrap').addClass('shiftRight');
    });

    $('#autoGenTable thead').mouseenter(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $('.dropdownBox').css('opacity', 0.4);
            $('.editableHead').addClass('resizeEditableHead');
        }
    })
    .mouseleave(function() {
        $('.dropdownBox').css('opacity', 0);
        $('.editableHead').removeClass('resizeEditableHead');
    });

    $('#newWorksheet span').click(function(){
        var tabCount = $('#worksheetBar .worksheetTab').length;
        var text = "worksheet "+(tabCount-1);
        if (tabCount > 4) {
            var width = ((1/(tabCount+1)))*70+'%';
            $('.worksheetTab').width(((1/(tabCount+1)))*70+'%');
        } else {
            var width = $('.worksheetTab').width();
        }
        
        $('#worksheetBar').append('<div class="worksheetTab" '+
                            'style="width:'+width+';margin-top:-26px;">'+
                            '<input type="text" '+
                            'value="'+text+'" '+
                            'size="'+text.length+'"></div>');

        $('.worksheetTab:last').click(function(){
            $('.worksheetTab').removeClass('tabSelected');
            $(this).addClass('tabSelected');
        });

        $('.worksheetTab:last input').on('input', function() {
            var size = $(this).val().length;
            $(this).attr('size', size);
        });
        $('.worksheetTab:last').click();
        setTimeout(function() { 
            $('#worksheetBar .worksheetTab:last').css('margin-top', 0);
        }, 1);

        $('#modalBackground').show();
        $('body').addClass('hideScroll');
        shoppingCart();
    });

    $('.worksheetTab').mousedown(function() {
        $('.worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
    });

    $('.worksheetTab input').each(function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    $('.worksheetTab input').on('input', function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    $("#shoppingCart").hide();

    $('#pageScroll').mousedown(function(event) {
        var mouseX = event.pageX - $(this).offset().left;
        var scrollWidth = $(this).outerWidth();
        var pageNum = Math.ceil((mouseX / scrollWidth) * resultSetCount);
        var pageInputNum = $("#pageInput").val();
        var e = $.Event("keypress");
        e.which = 13;
        $("#pageInput").val(pageNum).trigger(e);
        $("#pageInput").val(pageInputNum);
        $('#pageMarker').css('transform', 'translateX('+mouseX+'px)');
    });


    $(document).mousedown(function(event) {
        var clickable = $(event.target).closest('.colMenu').length > 0;
        if (!clickable && !$(event.target).is('.dropdownBox')) {
                $('.colMenu').hide();
        } 
    });
    $(document).mousemove(function(event){
        if (gMouseStatus != null) {
            switch (gMouseStatus) {
                case ("resizingCol"):
                    if (gRescol.lastCellGrabbed) {
                        gRescolMouseMoveLast(event);
                    } else {
                        gRescolMouseMove(event);
                    }
                    break;
                case ("resizingRow"):
                    resrowMouseMove(event);
                    break;
                case ("movingCol"):
                    dragdropMouseMove(event);
                    break;
                default:  // do nothing
            }
        }
    });
    $(document).mouseup(function(event){
        if (gMouseStatus != null) {
            switch (gMouseStatus) {
                case ("resizingCol"):
                    gRescolMouseUp();
                    break;
                case ("resizingRow"):
                    resrowMouseUp();
                    break;
                case ("movingCol"):
                    dragdropMouseUp();
                    break;
                default: // do nothing
            }
        }
    });   
}

function gRescolMouseDown(el, event) {
    gMouseStatus = "resizingCol";
    event.preventDefault();
    gRescol.mouseStart = event.pageX;
    gRescol.grabbedCell = el.parent().parent();  // the td 
    gRescol.index = gRescol.grabbedCell.index();
    gRescol.startWidth = gRescol.grabbedCell.outerWidth(); 
    gRescol.id = gRescol.grabbedCell.attr('id');
    gRescol.lastCellWidth = $('#autoGenTable thead:last th:last').outerWidth();
    gRescol.tableWidth = $('#autoGenTable').outerWidth();
    gRescol.tableExcessWidth = gRescol.tableWidth - gMinTableWidth;

    if (gRescol.grabbedCell.is(':last-child')) {
        gRescol.lastCellGrabbed = true;
    }
    if (gRescol.startWidth < gRescol.cellMinWidth) {
        gRescol.tempCellMinWidth = gRescol.startWidth;
    } else {
        gRescol.tempCellMinWidth = gRescol.cellMinWidth;
    }

    gRescol.leftDragMax =  gRescol.tempCellMinWidth - gRescol.startWidth;
    disableTextSelection();
    $(document.head).append('<style id="ew-resizeCursor" type="text/css">*'+ 
        '{cursor: ew-resize !important;}</style>');
}

function gRescolMouseMove(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist > gRescol.leftDragMax) {
        $('#'+gRescol.id).outerWidth(gRescol.startWidth + dragDist);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).outerWidth(gRescol.startWidth +
            dragDist);
        $('#autoGenTable thead:first').outerWidth($('#autoGenTable').width());

        if (dragDist <= -gRescol.tableExcessWidth) {
            $('#autoGenTable thead th:last-child').outerWidth(
                gRescol.lastCellWidth - 
                (dragDist + gRescol.tableExcessWidth));
            $('#autoGenTable thead:first').outerWidth(
                $('#autoGenTable').width());
        }     
    } else if ( dragDist < gRescol.leftDragMax ) {
        $('#'+gRescol.id).outerWidth(gRescol.tempCellMinWidth);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).
            outerWidth(gRescol.tempCellMinWidth);
        if (dragDist < -gRescol.tableExcessWidth) {
            $('#autoGenTable thead:first').outerWidth(gMinTableWidth);
            var addWidth = gMinTableWidth - $('#autoGenTable').width();
            $('#autoGenTable thead th:last-child').
                outerWidth('+='+addWidth+'px');
        } 
        else {
            $('#autoGenTable thead:first').
                outerWidth($('#autoGenTable').outerWidth());
        }
    }
}

function gRescolMouseMoveLast(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist >= -gRescol.tableExcessWidth) {
        if (dragDist > gRescol.leftDragMax) {
            $('#'+gRescol.id).outerWidth(gRescol.startWidth + dragDist);
            $('#autoGenTable tr:eq(1) #'+gRescol.id).
                outerWidth(gRescol.startWidth +
            dragDist);
            $('#autoGenTable thead:first').width(gRescol.tableWidth + dragDist);
        } 
    } else {
        $('#'+gRescol.id).
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable thead').width(gMinTableWidth);
    } 
}

function gRescolMouseUp() {
    gMouseStatus = null;
    gRescol.lastCellGrabbed = false;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    $('.rowGrab').width($('#autoGenTable').width());
    var progCol = gTableCols[gRescol.index-1];
    progCol.width = gRescol.grabbedCell.outerWidth();
    matchHeaderSizes();
    checkForScrollBar();
}

function resrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
    resrow.startHeight = resrow.targetTd.outerHeight();
    resrow.rowIndex = resrow.targetTd.closest('tr').index();
    disableTextSelection();
    var style = '<style id="ns-resizeCursor" type="text/css">*'+ 
        '{cursor: ns-resize !important;}</style>';
    $(document.head).append(style);
    $('body').addClass('hideScroll');
}

function resrowMouseMove(event) {
    var mouseDistance = event.pageY - resrow.mouseStart;
    var newHeight = resrow.startHeight + mouseDistance;
    var row = resrow.rowIndex;
    if (newHeight < gRescol.minCellHeight) {
        resrow.targetTd.outerHeight(gRescol.minCellHeight);
        $('#autoGenTable tbody tr:eq('+row+') td > div').
            css('max-height', gRescol.minCellHeight-4);
    } else {
        resrow.targetTd.outerHeight(newHeight);
        $('#autoGenTable tbody tr:eq('+row+') td > div').
            css('max-height', newHeight-4);
    }
}

function resrowMouseUp() {
    gMouseStatus = null;
    reenableTextSelection();
    $('#ns-resizeCursor').remove();
    $('body').removeClass('hideScroll'); 
    // $('.colGrab').height($('#autoGenTable').height());
    $('.colGrab').height($('#mainFrame').height());
    generateFirstLastVisibleRowNum()
}

function dragdropMouseDown(el, event) {
    gMouseStatus = "movingCol";
    gDragObj.mouseStart = event.pageX;
    gDragObj.id = el.attr('id');
    gDragObj.colId = parseInt(gDragObj.id.substring(7));
    gDragObj.colIndex = parseInt(el.index());
    gDragObj.colOffLeft = el.offset().left;
    gDragObj.colOffTop = el.offset().top;
    var firstTd = $('#autoGenTable td:eq('+(gDragObj.colId-1)+')');
    gDragObj.colOffLeft = firstTd.offset().left;
    gDragObj.docHeight = $(document).height();
    var tableHeight = el.closest('table').height();
    var mainFrameHeight = $('#mainFrame').height()-gScrollbarHeight;
    var shadowDivHeight = Math.min(tableHeight,mainFrameHeight);

    // get dimensions and position of column that was clicked
    gDragObj.colWidth = el.outerWidth();
    gDragObj.startXPos = el.position().left;
    gDragObj.startXPos = firstTd.position().left;
    var startYPos = el.position().top;
    // create a replica shadow with same column width, height,
    // and starting position
    $('#mainFrame').prepend('<div class="shadowDiv" style="width:'+
                            (gDragObj.colWidth)+
                            'px;height:'+(shadowDivHeight)+'px;left:'+
                            (gDragObj.startXPos)+
                            'px;top:'+(gDragObj.colOffTop)+'px;"></div>');

    // create a fake transparent column by cloning 
    createTransparentDragDropCol(startYPos);

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
        '{cursor:move !important; cursor: -webkit-grabbing !important;'+
        'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);
    disableTextSelection();
    createDropTargets();
}

function dragdropMouseMove(event) {
    var newXPos = gDragObj.startXPos + (event.pageX - gDragObj.mouseStart);
    $('.fauxCol').css('left', newXPos);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    // var name = $('.fauxCol .editableHead').val();
    $('.shadowDiv, .fauxCol, .dropTarget, #moveCursor').remove();
    var head = $("#autoGenTable tr:first th span");
    var progCol = gTableCols[gDragObj.colId-2];
    var isDark = $('#headCol'+gDragObj.colId).hasClass('unusedCell');
    var selected = $('#headCol'+gDragObj.colId).hasClass('selectedCell');
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex+1) != gDragObj.colId) { 
        delCol("closeButton"+gDragObj.colId, true);
        progCol.index = gDragObj.colIndex+1;
        insertColAtIndex(gDragObj.colIndex-1, progCol);
        addCol("headCol"+gDragObj.colIndex, progCol.name, {width: progCol.width,
                isDark: isDark, select: selected, progCol: progCol});
        execCol(progCol);
    }
    reenableTextSelection(); 
}

function cloneCellHelper(obj) {
    var td = $(obj).children();
    var row = $("<tr></tr>");
    var rowColor = $(obj).css('background-color');
    var clone = td.eq(gDragObj.colIndex).clone();
    var cloneHeight = td.eq(gDragObj.colIndex).outerHeight();
    var cloneColor = td.eq(gDragObj.colIndex).css('background-color');
    row.css('background-color', rowColor);
    clone.outerHeight(cloneHeight);
    clone.outerWidth(gDragObj.colWidth-5);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($(".fauxTable"));
}

function createTransparentDragDropCol(startYPos) {
    $('#mainFrame').append('<div class="fauxCol" style="left:'+
                        (gDragObj.startXPos)+'px;top:'+
                        (gDragObj.colOffTop)+'px;width:'+
                        (gDragObj.colWidth-5)+'px"></div>');
    $('.fauxCol').append('<table id="autoGenTable" class="dataTable fauxTable" '+
                         'style="width:'+(gDragObj.colWidth-5)+'px"></table>');
    
    var rowHeight = 20;
    // turn this into binary search later
    var topPx = $('#autoGenTable thead').offset().top + 
                $('#autoGenTable thead').outerHeight() -
                rowHeight;
    var topRowIndex = -1;
    var topRowTd = null;
    $('#autoGenTable tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowIndex = $(this).index();
            topRowEl = $(this).find('td');
            return (false);
        }
    });

    //XXX check to see if topRowEl was found;
    if (topRowIndex == -1) {
        console.log("BUG! Cannot find first visible row??");
        // Clone entire shit and be done.
        $('#autoGenTable tr').each(function(i, ele) {
            cloneCellHelper(ele);
        });
        return;
    }

    // Clone head
    $('#autoGenTable tr:first').each(function(i, ele) {
            cloneCellHelper(ele);
    });

    var totalRowHeight = $('#mainFrame').height()-
            $('#autoGenTable th:first').outerHeight() - gScrollbarHeight;
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    $('#autoGenTable tr:gt('+(topRowIndex+1)+')').each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= numRows+topRowIndex) {
                return (false);
            }
    });

    // Ensure rows are offset correctly
    var fauxTableHeight = $('.fauxTable').height()+
                        $('.fauxTable tr:first').outerHeight();
    var mainFrameHeight = $('#mainFrame').height()- gScrollbarHeight;
    var fauxColHeight = Math.min(fauxTableHeight, mainFrameHeight);
    $('.fauxCol').height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx-rowHeight;
    $('.fauxTable').css('margin-top', $('.fauxTable tr:first').outerHeight()+
                        firstRowOffset);
    $('.fauxTable tr:first-child').css({'margin-top': 
            -($('.fauxTable tr:first').outerHeight()+firstRowOffset)});
}

function createDropTargets() {
    // var offset = distance from the left side of dragged column
    // to the point that was grabbed
    var offset = gDragObj.mouseStart - gDragObj.colOffLeft;
    var dragMargin = 30; 
    // targets extend this many pixels to left of each column
    $('.dropTarget').remove(); 
    var i = 0;
    $('#autoGenTable tr:first th:not(:last)').each(function(){
        if (i == 0 || i == gDragObj.colIndex) {
            i++;
            return true;  
        }
        var colLeft = $(this)[0].getBoundingClientRect().left;
        if ((gDragObj.colWidth-dragMargin) < Math.round(0.5*$(this).width())) {
            var targetWidth = gDragObj.colWidth;
        } else {
            var targetWidth = Math.round(0.5*$(this).outerWidth())+dragMargin;
        }
        var dropTarget = '<div id="dropTarget'+i+'" class="dropTarget"'+
                        'style="left:'+(colLeft-dragMargin+offset)+'px;'+
                        'width:'+targetWidth+'px;height:'
                        +(gDragObj.docHeight)+'px;">'+
                        '</div>';
        $('body').append(dropTarget);
        i++;
    });

    $('.dropTarget').mouseenter(function(){
        var dropTargetId = parseInt(($(this).attr('id')).substring(10));
        var nextCol = Math.abs(dropTargetId-gDragObj.colIndex);
        if (dropTargetId>gDragObj.colIndex) {
            $('#autoGenTable tr').each(function() { 
                $(this).children(':eq('+(dropTargetId)+')').after(
                    $(this).children(':eq('+(dropTargetId-nextCol)+')'));
            });
        } else {
            $('#autoGenTable tr').each(function() { 
                $(this).children(':eq('+(dropTargetId)+')').before(
                    $(this).children(':eq('+(dropTargetId+nextCol)+')'));
            });
        }
        $('.shadowDiv').css('left',
                            $('#autoGenTable #'+gDragObj.id).offset().left); 
        gDragObj.colIndex = dropTargetId;
        createDropTargets(gDragObj);
    });
}

function gRescolDelWidth(id, resize) {
    matchHeaderSizes(true);
    var id = parseInt(id.substring(11));
    var oldTableWidth = $('#autoGenTable').width();
    if (!resize && (oldTableWidth < gMinTableWidth)) {
        var lastTd = $('#autoGenTable tr:first th').length;
        var lastTdWidth = $('#headCol'+lastTd).width();
        $('#autoGenTable thead:last #headCol'+lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth));
    }
    matchHeaderSizes();
}

function getTextWidth(el) {
    var width;
    if (el.is('input')) {
        var text = el.val();
    } else {
        var text = el.text();
    }
    tempDiv = $('<div>'+text+'</div>');
    tempDiv.css({'font': el.css('font'), 'position': 'absolute', 
        'display': 'inline-block', 'white-space': 'pre'}).appendTo($('body'));
    width = tempDiv.width();
    tempDiv.remove();
    return (width);
}

function autosizeCol(el, options) {
    var index = parseInt(el.attr('id').substring(7));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || gRescol.cellMinWidth-10;
    var oldTableWidth = $('#autoGenTable').width();
    var maxWidth = 600;
    var oldWidth = el.width();  
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var newWidth = Math.max(widestTdWidth, minWidth);
    newWidth = Math.min(newWidth, maxWidth);
    var widthDiff = newWidth - oldWidth; 
    if (widthDiff > 0) {
        $('#autoGenTable thead').width('+='+(newWidth-oldWidth));
        el.width(newWidth);
    } else if (oldTableWidth + widthDiff < gMinTableWidth) {
        el.width(newWidth);
        $('#autoGenTable tr:first th:last').outerWidth('+='+
            (gMinTableWidth-(oldTableWidth+widthDiff)));
    } else {
        el.width(newWidth);
    }
    if (index != 1) { // don't store id column
        gTableCols[index-2].width = el.outerWidth();
    }
    matchHeaderSizes(resizeFirstRow);
}

function getWidestTdWidth(el, options) {
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var id = (el.attr('id')).substr(7);
    var largestWidth = 0;
    var firstRow = true;
    var width;
    var rightMargin = 6;

    if (includeHeader) {
        var th = $('#autoGenTable th:eq('+(id-1)+') .editableHead');
        width = getTextWidth(th);
        largestWidth = width;
    }
    $('#autoGenTable tbody tr').each(function(){
        var td = $(this).children(':eq('+(id-1)+')');
        if (td.children('.addedBarText').length) {
            width = getTextWidth(td.children('.addedBarText'));
        } else {
            width = getTextWidth(td);
        }
        if (width > largestWidth) {
            largestWidth = width; 
        }
    });
    largestWidth += rightMargin;
    return (largestWidth);
}

// XXX: Td heights are not persisted
function getTdHeights() {
    var tdHeights = [];
    $("#autoGenTable tbody tr").each(function(){
        tdHeights.push($(this).children().eq(0).outerHeight());
    });
    return (tdHeights);  
}

function dblClickResize(el) {
    gRescol.clicks++;  //count clicks
    if (gRescol.clicks === 1) {
        gRescol.timer = setTimeout(function() {   
            gRescol.clicks = 0; //after action performed, reset counter
        }, gRescol.delay);
    } else {
        gMouseStatus = null;
        reenableTextSelection();
        autosizeCol(el.parent().parent(), {resizeFirstRow: true});
        $('#ew-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
    }
}

function documentReadyCatFunction() {
    documentReadyCommonFunction();
    // XXX: Should this be called here or at the end? I think it should be here
    // or I may end up attaching 2 listeners?
    resizableColumns();
    var index = getIndex(gTableName);
    getNextPage(gResultSetId, true);
    
    if (index) {
        gTableCols = index;
        console.log("Stored "+gTableName);
        // XXX Move this into getPage
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(gResultSetId,
                                           gNumEntriesPerPage);
        gKeyName = tableOfEntries.keysAttrHeader.name;
        console.log(index);
        for (var i = 0; i<index.length; i++) {
            if (index[i].name != "DATA") {
                addCol("headCol"+(index[i].index-1), index[i].name,
                      {width: index[i].width,
                       isDark: index[i].isDark,
                       progCol:index[i]});
            } else {
                $("#headCol"+(index[i].index+1)).css("width", 
                    index[i].width);
            }
        }
    } else {
        console.log("Not stored "+gTableName);
    }    
}

// XXX: REMOVE!
function hackyShit() {
    if (gTableName === "joined") {
        // XXX TODO: Create a new worksheet tab here and make it selected
    }
}

function startupFunctions(table) {
    readFromStorage();
    setCatGlobals(table);
    menuBarArt();
    monitorOverlayPercent();
    menuAreaClose();
    getTablesAndDatasets();
    documentReadyCatFunction();

    fillPageWithBlankCol();
    goToPage(gCurrentPageNumber+1);
    goToPage(gCurrentPageNumber+1);
    generateFirstLastVisibleRowNum();
    cloneTableHeader();   
    infScrolling();
    hackyShit();
    if (!getIndex(gTableName)) {
        $('#autoGenTable th, #autoGenTable td').empty();
        $('.rowNum').text('-');
        $('#pageInput').next().remove();
        $('#searchBar').val('');
    }
}        

function documentReadyIndexFunction() {
    $(document).ready(function() {
       startupFunctions("gdelt"); 
    });
}

function getDatasetSamples() {
    // Get datasets and names
    var datasets = XcalarGetDatasets();
    var samples = {};
    for (var i = 0; i<datasets.numDatasets; i++) {
        // This variable should have been stored when the table is loaded.
        // Otherwise, just run this command setDsToName("gdelt", 4)
        // Commit your change by running the command commitToStorage()
        // Alternatively you can just randomly pick a static placeholder name
        var datasetName = getDsName(datasets.datasets[i].datasetId);
        // Gets the first 20 entries and stores it.
        samples[datasetName] = XcalarSample(datasets.datasets[i].datasetId, 20);

        // add the tab and the table for this dataset to shoppingcart div
        addDatasetTable(datasetName, i+1);
        addSelectedTables(i+1);
        var records = samples[datasetName].kvPairs;

        if (records.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) {
            console.log(records.records[0]);
            var json = $.parseJSON(records.records[0].kvPairVariable.value);
        } else {
            var json = $.parseJSON(records.records[0].kvPairFixed.value);
        }

        // build the table headers
        var count = 0;
        for (key in json) {
            $('#worksheetTable'+(i+1)+' tr:first').append('\
                <th class="table_title_bg">\
                    <div class="header">\
                        <input spellcheck="false" \
                        class="editableHead shoppingCartCol" value="'+key+'"\
                        id ="ds'+datasets.datasets[i].datasetId+'cn'+key+'">\
                        <div class="keyCheckmark">\
                            <div class="keyCheckmarkWrap">\
                                <span>&#x2713;</span>\
                                <span>+</span>\
                            </div>\
                        </div>\
                    </div>\
                </th>');

            $('.keyCheckmark:last').click(function() {
                var inputText = $(this).siblings('input').val();
                var index = $(this).closest('.worksheetTable').index()+1;
                console.log(index, 'index');
                var selectedKey = $('#selectedTable'+index).
                    find('td:contains('+inputText+')');
                selectedKey.find('.removeKey').click();
            });

            $('#worksheetTable'+(i+1)+' th:last input').focus(function() {  
                var index = $(this).closest('th').index()+1;
                var tableIndex = $(this).closest('table').index()+1;
                var value = $(this).val();
                $('.selectedCell').removeClass('selectedCell');
                $(this).closest('.table_title_bg').addClass('selectedCell');
                $(this).closest('table').find('td:nth-child('+index+')').
                    addClass('selectedCell');
                $('.keySelected').removeClass('keySelected');
                $('#selectedTable'+tableIndex).find('.keyWrap:contains('+value+')')
                    .addClass('keySelected');
            });

            $('#worksheetTable'+(i+1)+' th:last input').dblclick(function() {
                // $(this).prop('disabled', true);
                var input = $(this);
                window.getSelection().removeAllRanges();
                if ($(this).parent().hasClass('keyAdded')) {
                    return;
                } else {
                    $(this).parent().addClass('keyAdded');
                    $(this).attr('readonly', 'true');
                }
                
                var index = $(this).closest('table').index()+1;
                var tabName = $('#worksheetTab'+index+' input').val();
                var selectedTable = $('#selectedTable'+index);
                if (selectedTable.length == 0) {
                    //add new selectedTable
                    $('#selectedTableWrap'+index).append('\
                            <table class="dataTable selectedTable" \
                            id="selectedTable'+index+'" \
                            style="width:0px;">\
                                <thead><tr>\
                                <th>'+tabName+'</th>\
                                </tr></thead>\
                                <tbody></tbody>\
                            </table>').css('margin-left', '5px');
                    selectedTable = $('#selectedTable'+index);
                    $('.selectedTable th').removeClass('orangeText');
                    selectedTable.find('th').addClass('orangeText');
                    selectedTable.width(175);
                }
                selectedTable.find('tbody').append('\
                    <tr><td><div style="font-size:15px;" class="keyWrap">'
                        +"<span>"+$(this).val()+"</span>"+
                        '<div class="removeKey">+</div>\
                        <div class="removeCover"></div>\
                    </div></td></tr>');

                $('.keySelected').removeClass('keySelected');
                selectedTable.find('.keyWrap:last').addClass('keySelected');
                setTimeout(function() {
                    selectedTable.find('.keyWrap:last').css('font-size', '13px');
                }, 1);
                
                selectedTable.find('.removeKey:last').click(function() {
                    var removeBox = $(this);
                    input.parent().removeClass('keyAdded').prop;
                    input.removeAttr('readonly');
                    if ($(this).closest('tr').siblings().length == 0) {
                        $(this).closest('.selectedTableWrap')
                            .css('margin-left', '0px');
                        $(this).closest('table').width(0);
                        setTimeout(function() {
                            removeBox.closest('table').remove();
                        }, 500);
                    } else {
                        $(this).closest('tr').remove();
                    }
                });
            });
        }
        addDataSetRows(records, i+1);
    }
}

function addDatasetTable(datasetTitle, tableNumber) { 
    $('#builderTabWrap').append('\
            <div class="tabWrap">\
                <div class="worksheetTab" \
                id="worksheetTab'+tableNumber+'">\
                    <input size="10" type="text" value="'+datasetTitle+'"\
                    readonly>\
                </div>\
            </div>');

    //append the table to datasetbrowser div
    $('#datasetBrowser').append('\
        <table id="worksheetTable'+tableNumber+'"\
        class="worksheetTable dataTable">\
            <thead>\
              <tr>\
                <th style="width:40px;" class="table_title_bg">\
                  <div class="header">\
                    <span><input value="ID" readonly></span>\
                  </div>\
                </th>\
              <tr/>\
            </thead>\
            <tbody></tbody>\
        </table>');
}

// add row by row
function addDataSetRows(records, tableNumber) {
    var html = "";
    // loop through each row
    for (var i = 0; i<records.numRecords; i++) {
        if (records.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) {
            var key = records.records[i].kvPairVariable.key;
            var jsonValue = records.records[i].kvPairVariable.value;
        } else {
            var key = records.records[i].kvPairFixed.key;
            var jsonValue = records.records[i].kvPairFixed.value;
        }

        var json = $.parseJSON(jsonValue);

        //append the id cell
        html += '<tr><td>'+(key+1)+'</td>';

        // loop through each td, parse object, and add cell content
        for (key in json) {
            var value = json[key];
            if (value == undefined) {
                value = '<span class="undefined">'+value+'</span>';
            } else {
                switch (value.constructor) {
                    case (Object):
                        if ($.isEmptyObject(value)) {
                            value = "";
                        } else {
                            value = JSON.stringify(value).replace(/,/g, ", ");
                        }
                        break;
                    case (Array):
                        value = value.join(', ');
                        break;
                    default: // leave value as is;
                }
            }
            html += '<td>\
                        <div class="addedBarTextWrap">\
                            <div class="addedBarText">'
                            +value+
                            '</div>\
                        </div>\
                    </td>';
        }
        html += '</tr>';
    }
    $('#worksheetTable'+tableNumber+' tbody').append(html);
}

function createWorksheet() {
    var newTableCols = [];
    var startIndex = 2;
    $("#selectedDataset table tbody tr td div span").each(function() {
        var colname = $.trim($(this).text());
        var progCol = new ProgCol();
        progCol.index = startIndex;
        progCol.type = "string";
        progCol.name = colname;
        progCol.width = gNewCellWidth;
        progCol.userStr = '"'+colname+'" = pull('+colname+')';
        progCol.func.func = "pull";
        progCol.func.args = [colname];
        progCol.isDark = false;
        newTableCols[startIndex-2] = progCol;
        startIndex++;
    });
    var progCol = new ProgCol();
    progCol.index = startIndex;
    progCol.type = "object";
    progCol.name = "DATA";
    progCol.width = 700;
    progCol.userStr = "DATA = raw()";
    progCol.func.func = "raw";
    progCol.func.args = [];
    progCol.isDark = false;
    newTableCols[startIndex-2] = progCol;
    var datasets = "csv";
    $("#selectedDataset div table thead tr th").each(function() {
        if ($(this).text().indexOf("yelp") >= 0) {
            datasets = "json";
        }
    });
    if (datasets == "csv") {
        setIndex("joined", newTableCols); 
    } else {
        setIndex("joined2", newTableCols);
    }
    commitToStorage();
    if (datasets == "csv") {
        window.location.href="?tablename=joined";
    } else {
        window.location.href="?tablename=joined2";
    }
}

function attachShoppingCartListeners() {
    $(".shoppingCartCol").keypress(function(e) {
        if (e.which === 13) {
            var oldid = $(this).attr("id");
            var oldColName = oldid.substring(oldid.indexOf("cn")+2);
            var dsnumber = parseInt(oldid.substring(2, oldid.indexOf("cn")));
            XcalarEditColumn(dsnumber, oldColName, $(this).val(),
                             DfFieldTypeT.DfString);
            $(this).blur();
        }
    });
    $("#createButton").css("cursor", "pointer");
    $("#createButton").click(function() {
        createWorksheet();
    });
    $("#cancelButton").css("cursor", "pointer");
    $("#cancelButton").click(function() {
        // $("#modalBackground").hide();
        // $("#shoppingCart").hide();
        window.location.href=""; 
    });
}

function addSelectedTables(tableNumber) {
    $('#selectedDataset').append('\
        <div class="selectedTableWrap" \
        id="selectedTableWrap'+tableNumber+'">\
        </div>');
}

function shoppingCart() {
    // Cleanup current table
    $("#autoGenTable td, th").each(function() {
        $(this).empty().removeClass('selectedCell');
    });

    // Display the shopping cart tabs
    $("#shoppingCart").show();
    getDatasetSamples();
    addTabFunctionality();
    $('.worksheetTable').hide();
    $('.worksheetTable:first').show();
    attachShoppingCartListeners();
    $('#builderTabBar .worksheetTab:first').mousedown();
}

function addTabFunctionality() {
    $('#builderTabBar .worksheetTab').mousedown(function() {
        var index = $(this).parent().index()+1;
        var text = $(this).find('input').val();
        $('.selectedCell').removeClass('selectedCell');
        $('#builderTabBar .worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
        $('.selectedTable th').removeClass('orangeText');
        $('#selectedTable'+index+' th').addClass('orangeText');

        $('.worksheetTable').hide();
        $('.worksheetTable:nth-child('+index+')').show();
    });

    $('#builderTabBar .worksheetTab input').each(function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    $('#builderTabBar .worksheetTab input').on('input', function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

     $('#builderTabBar input').click(function() { 
        $(this).removeAttr('readonly');
    });

    $('#builderTabBar input').dblclick(function() {
        $(this).removeAttr('readonly');
        $(this).focus();
    }).blur(function() {
        $(this).attr('readonly', 'true');
    });

    $('#builderTabBar input').on('input', function() {
        var index = $(this).closest('.tabWrap').index()+1;
        $('#selectedTable'+index+' th').text($(this).val());
    });
}

var tempCountShit = 0;
// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName) {
    tempCountShit++;
    var refCount = XcalarGetTableRefCount(newTableName);
    console.log(refCount);
    if (refCount == 1) {
        $("body").css({"cursor": "default"});
        console.log("Done loading");
        window.location.href="?tablename="+newTableName;
    } else {
        console.log(refCount);
        if (tempCountShit > 400) {
            console.log("WTF");
            return;
        }
        // Check twice per second
        setTimeout(function() {
            checkStatus(newTableName);
        }, 500);
    }
}

function sortRows(index, order) {
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    // XXX: Update widths here
    setOrder(newTableName, order);
    setIndex(newTableName, gTableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    //XXX Use this instead or else other elements' cursors will take precedence,
    // but you must remove #waitCursor once you're done.
    // $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
    //    '{cursor: wait !important;}</style>');
    var datasetId = $("#datastorePanel .monitorSubDiv")[1].innerHTML;
    console.log(datasetId);
    var fieldName;
    switch(gTableCols[index-2].func.func) {
    case ("pull"):
        // Pulled directly, so just sort by this
        fieldName = gTableCols[index-2].func.args[0];
        break;
    default:
        console.log("Cannot sort a col derived from unsupported func");
        return;
    }
    XcalarIndexFromTable(gTableName, fieldName, newTableName);
    checkStatus(newTableName);
}

function filterCol(operator, value) {
    console.log(gTableName);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempFilterTable"+rand;
    setIndex(newTableName, gTableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarFilter(operator, value, gTableName, newTableName);
    checkStatus(newTableName);
}

function joinTables(rightTable) {
    console.log("Joining "+gTableName+" and "+rightTable);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempJoinTable"+rand;
    setIndex(newTableName, gTableCols);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarJoin(gTableName, rightTable, newTableName);
    checkStatus(newTableName);
}


function prettifyJson(obj, indent, options) {
    if (typeof obj != 'object') {
        return (JSON.stringify(obj));
    }
    var result = "";
    var indent = indent || "";
    var options = options || {};
    options['inarray'] = options['inarray'] || 0;
    for (var key in obj) {
        var value = obj[key];
        switch (typeof value) {
        case ('string'):
            value = '"<span class="jString">'+value+'</span>"';
            if (options.inarray) {
                value = '<span class="jArray jInfo" data-key="'+
                        key+'">'+value+'</span>, ';
            }
            break;
        case ('number'):
            value = '<span class="jNum">'+value+'</span>';
            if (options.inarray) {
                value = '<span class="jArray jInfo" data-key="'+
                        key+'">'+value+'</span>,';
            } 
            break;
        case ('boolean'):
            value = '<span class="jBool">'+value+'</span>';
            if (options.inarray) {
                value += ',';
            }
            break;
        case ('object'):
            if (value.constructor == Array) {
                options.inarray++;
                value = '[<span class="jArray jInfo" data-key="'+
                        key+'">'+prettifyJson(value, indent, options)+
                        '</span>],';
            } else {
                var object = prettifyJson(value,
                                          indent+'&nbsp;&nbsp;&nbsp;&nbsp;');
                value = '{\n'+object +indent+'}'
                if (options.inarray) {
                    value = '<span class="jArray jInfo" data-key="'+
                            key+'">'+value+'</span>,';
                } 
            }
            break;
        default:
            value = '<span class="jUndf">'+value+'</span>';
            if (options.inarray) {
                value += ',';
            }
            break;
        }

        if (options.inarray) {
            result += value;
        } else {
            value = value.replace(/,$/, "");
            result += '<div class="jsonBlock jInfo" data-key="'+key+'">'+indent
            +'"<span class="jKey">'+key+'</span>": '+value+',</div>';
        }
    }
   
    options.inarray--;
    return (result.replace(/\,<\/div>$/, "</div>").replace(/\, $/, "")
                                                  .replace(/\,$/, "")); 
    // .replace used to remove comma if last value in object
}

function createJsonNestedField(el) {
    var obj = "";
    el.parents('.jInfo').each(function(){
        var key = "";
        if ($(this).parent().hasClass('jArray') &&
            !$(this).hasClass('jsonBlock')) {
            key = '['+$(this).data('key')+']'; 
        } else if (!$(this).hasClass('jArray')) {
            key = '.'+$(this).data('key'); 
        }
        obj = key+obj;
    });
    if (obj.charAt(0) == '.') {
        obj = obj.substr(1);
    }
    return (obj);
}

function showJsonPopup(jsonTd) {
    var winHeight = $(window).height();
    var winWidth = $(window).width();
    var jsonTdHeight = jsonTd.outerHeight(); 
    var jsonTdWidth = jsonTd.outerWidth(); 
    var jsonTdPos = jsonTd[0].getBoundingClientRect();
    var jsonString = $.parseJSON(jsonTd.find('.elementText').text());
    var newString = prettifyJson(jsonString);
    $('.jObject').html(newString);
    $('#jsonModal, #modalBackground').show();
    var modalHeight = $('#jsonModal').outerHeight();
    var modalWidth = $('#jsonModal').outerWidth();
    var closeHeight = $('.closeJsonModal').height();
    var closeTop = jsonTdPos.top - closeHeight/2 + 2;
    var closeLeft = jsonTdPos.left+(jsonTdWidth/2);
    $('#closeArrow').removeClass('jsonRight');

    if (jsonTdPos.top < winHeight/2) {
        var modalTop = jsonTdPos.top; 
    } else {
        var modalTop = jsonTdPos.top - modalHeight + jsonTdHeight;
    }

    if (modalTop < 5) {
        modalTop = 5;
        console.log('here')
    } else if (modalTop+modalHeight > winHeight) {
        modalTop = Math.max(winHeight - modalHeight - 5, 5);
        closeTop -= 8;
    }

    if (jsonTdPos.left+(jsonTdWidth/2) > (winWidth/2)) {
        var modalLeft = Math.min((jsonTdPos.left+(jsonTdWidth/2)) - modalWidth, 
            winWidth - modalWidth - 20);
        // closeLeft += 5;
        $('#closeArrow').addClass('jsonRight');
    } else {
        var modalLeft = Math.max(jsonTdPos.left+(jsonTdWidth/2) , 20);
        closeLeft -= 25;
    }
    
    $('#jsonModal').css({'left': modalLeft, 'top': modalTop});
    $('.closeJsonModal').css({'left': closeLeft, 'top': closeTop});

    $('.jKey, .jArray>.jString, .jArray>.jNum').click(function(){
        var name = createJsonNestedField($(this));
        var id = $("#autoGenTable th").filter(function() {
                        return $(this).find("input").val() == "DATA";
                    }).attr("id");
        var colIndex = parseInt(id.substring(7)); 
        addCol(id, name);
        gTableCols[colIndex-1].func.func = "pull";        
        gTableCols[colIndex-1].func.args = [name];
        gTableCols[colIndex-1].userStr = '"'+name+'" = pull('+name+')';
        execCol(gTableCols[colIndex-1]);
        autosizeCol($('#headCol'+(colIndex+1)), {includeHeader: true, 
                resizeFirstRow: true});
        $('thead:first #headCol'+(colIndex+1)+' .editableHead').focus();
        // XXX call autosizeCol after focus if you want to make column wide enough
        // to show the entire function in the header
        // autosizeCol($('#headCol'+(colIndex+1)), {includeHeader: true, 
        //         resizeFirstRow: true});
        $('#jsonModal, #modalBackground').hide();
        $('#jsonModal').css('left',0);
        $('body').removeClass('hideScroll');
    });
    window.getSelection().removeAllRanges();
    $('body').addClass('hideScroll');
}

function cloneTableHeader() {
    var mainFrameTop = $('#mainFrame').offset().top;
    var tHead = $('#autoGenTable thead');
    var tHeadXPos = tHead.offset().left;
    var tHeadYPos = tHead.offset().top;
    var tHeadClone = $('#autoGenTable thead').clone();
    var leftPos = $('#autoGenTable').position().left;

    tHeadClone.addClass('fauxTHead');
    tHead.addClass('trueTHead');
    $('#autoGenTable thead').after(tHeadClone);
    tHead.css({'position':'fixed', 'top':mainFrameTop,
                    'left':leftPos, 'padding-top':5});
    matchHeaderSizes() ;
    $('.fauxTHead th .header').each(function() {
        var tdId = $(this).parent().attr('id');
        $('.fauxTHead #'+tdId+' .colGrab').mousedown(
            function(event) {
                if (event.which === 1) {
                    gRescolMouseDown($(this), event);
                    dblClickResize($(this));
                }
            }
        );
    });
    $('#autoGenTable').width(0); 
    $('#mainFrame').scroll(function() {
        var leftPos = $('#autoGenTable').position().left -
                      $(window).scrollLeft();
        tHead.css('left', leftPos);
    });
    $(window).scroll(function(){
        var tHeadTop = $('#mainFrame').offset().top - $(window).scrollTop();
        var tHeadLeft = $('#autoGenTable').position().left -
                        $(window).scrollLeft();
        tHead.css({'top': tHeadTop, 'left':tHeadLeft});
    });
}

function matchHeaderSizes(reverse) {
    var tHeadLength = $('.fauxTHead th').length;
    if (reverse) {
        var trueTHead = '.fauxTHead';
        var fauxTHead = '.trueTHead';
    } else {
        var trueTHead = '.trueTHead';
        var fauxTHead = '.fauxTHead';
    }
    for (var i = 0; i < tHeadLength; i++) {
        var width = $(fauxTHead+' th').eq(i).outerWidth();
        $(trueTHead+' th').eq(i).outerWidth(width);
    }
    $('#autoGenTable thead').width($('#autoGenTable').width());
    $('.rowGrab').width($('#autoGenTable').width());
}

function movePageScroll(pageNum) {
    var pct = (pageNum/resultSetCount);
    var dist = Math.floor(pct*$('#pageScroll').width());
    $('#pageMarker').css('transform', 'translateX('+dist+'px)');
}

function checkForScrollBar() {
    var tableWidth = $('#autoGenTable').width()+
        parseInt($('#autoGenTable').css('margin-left'));
    if (tableWidth > $(window).width()) {
        gScrollbarHeight = 8;
    } else {
        gScrollbarHeight = 0;
    }
}

//XXX remove this for production. I updated load_r.html
// but the jquery load function loads the old load_r.html 
// unless I use ajaxSetup cache: false;
$.ajaxSetup ({
    // Disable caching of AJAX responses
    cache: false
});