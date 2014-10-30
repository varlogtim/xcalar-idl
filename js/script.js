// JavaScript Document
// Menu Bar JS
var gTableRowIndex = 1;
var gCurrentPageNumber = 0;
var gNumEntriesPerPage = 20;
var gNumPageTurners = 10;
var gResultSetId = 0;
var gNewCellWidth = 125;
var gColumnBorderWidth = -1;
var gColPadding = 4;
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
    this.func = {};
    this.width = 0;
    this.isDark = true;
    this.resize = false;
};

var gTableCols = []; // This is what we call setIndex on

function infScrolling() {
    // Feature: As we're scrolling we can update the skip to row box.
    // However, all solutions that I've seen so far are shitty in terms of
    // performance. So unless there's a nice quick method, I don't think this
    // feature is necessary.

    $("#mainFrame").scroll(function() {
        if ($(this)[0].scrollHeight - $(this).scrollTop()+gScrollbarHeight ==
            $(this).outerHeight()) {
            goToPage(gCurrentPageNumber+1); 
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
            $("#menuArea").height(0);
            clickTarget = null;
            $('.trueTHead').css('top',111).addClass('moveTop');
            setTimeout(function() {
                $('.trueTHead').removeClass('moveTop');
            },300);
            return;
        }
        clickTarget = $(event.target).text();

        $('.trueTHead').css('top',177).addClass('moveTop');

        setTimeout(function() {
            $('.trueTHead').removeClass('moveTop');
        },300);

        $("#menuBar div").removeClass("menuSelected");
        $(this).addClass("menuSelected");
        $("#menuArea").show().height(66);

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
        var tableDisplay = '<div class="dataset datasetName">'+
                                 '<span>DATA<br>SET</span>'+
                             '</div>'+
                             '<div class="monitorSubDiv">'+
                                    tables.tables[i].tableName+
                             '</div>';

        $("#tablestorePanel div:last").after(tableDisplay);
    }
    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    console.log(datasets);
    for (i = 0; i<numDatasets; i++) {
        var dsName = getDsName(datasets.datasets[i].datasetId);
        var tableDisplay = '<div class="dataset datasetName">'+
                                 '<span>DATA<br>SET</span>'+
                             '</div>'+
                             '<div class="monitorSubDiv">'+
                                  dsName+
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

// XXX: Prototype only function. Remove?
function generatePageInput() {
    $('#pageInput').attr('max', resultSetCount);
}

// XXX: Prototyep only function. Remove?
function deselectPage(pageNumber) {
    $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == pageNumber.toString();
    }).parent().removeClass("pageTurnerPageSelected");
} 

// XXX; Prototype only function. Remove?
function selectPage(pageNumber) {
    $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == pageNumber.toString();
    }).parent().addClass("pageTurnerPageSelected");
} 

function goToPrevPage() {
    if (gCurrentPageNumber <=1) {
        console.log("First page, cannot move");
        return;
    } 
    var currentPage = gCurrentPageNumber;
    var prevPage = currentPage-1;
    var prevPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return ($(this).text() == prevPage.toString());
    });
    if (prevPageElement.length) {
        selectPage(prevPage);
        deselectPage(currentPage);
        getPrevPage(gResultSetId);
    } else {
        goToPage(prevPage);
    }
}

function goToNextPage() {
    if (gCurrentPageNumber >= gNumPages) {
        return;
    }
    var currentPage = gCurrentPageNumber;
    var nextPage = currentPage+1;
    var nextPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return ($(this).text() == nextPage.toString());
    });
    if (nextPageElement.length) {
        selectPage(nextPage);
        deselectPage(currentPage);
        getNextPage(gResultSetId);
        if (gCurrentPageNumber == gNumPages) {
            $('#pageTurnerRight').css('visibility', 'hidden');
        }
    } else {
        goToPage(nextPage);
    }
}

function goToPage(pageNumber) {
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
    // generatePages(); 
    selectPage(pageNumber);
    // Page number starts at 1, but we start at offset 0.
    XcalarSetAbsolute(gResultSetId, (pageNumber-1)*gNumEntriesPerPage);
    getPage(gResultSetId);
}

// XXX: Prototype only function. Remove?
function showHidePageTurners() {
    $('#pageTurnerLeft a, #pageTurnerRight a').css('visibility', 'visible');
    if (gCurrentPageNumber < 2) {
        $('#pageTurnerLeft a').css('visibility', 'hidden');
    } 
    if (gCurrentPageNumber >= gNumPages) {
        $('#pageTurnerRight a').css('visibility', 'hidden');
    }
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

function generatePages() { 
    var rightDots = false;
    var leftDots = false;
    var startNumber = Math.max(gCurrentPageNumber-6, 0); 
    // number furthest on left side
    if (gNumPages > gNumPageTurners) {
        var number = gNumPageTurners; 
        if ((gNumPages-startNumber) > gNumPageTurners) {
            rightDots = true;
        } else {
           startNumber = gNumPages - gNumPageTurners;
        }
    } else {
        var number = gNumPages;
    }
    var htmlString =
                   '<table class="noBorderTable" id="pageTurnerNumberBarInner">\
                        <tr>\
                          <td class="pageTurnerLeftSpacer"></td>\
                          <td class="pageTurnerWrap">\
                            <table class="pageTurnerWrap noBorderTable">\
                            <tr>\
                            <td class="pageTurner" id="pageTurnerLeft">';
    htmlString += '<a href="javascript:goToPrevPage();" class="pageTurner">\
                    < Prev</a>\
                </td>';
    if (startNumber > 0) {
        // There are previous pages
        var leftDotsNumber = Math.max((startNumber-5), 0); 
        // left dots direct to this page#
        htmlString += '<td class="pageTurner"\
               id="leftDots"><a href="javascript:goToPage(';
        htmlString += (leftDotsNumber+1);
        htmlString += ');" class="pageTurner">...</a></td>';
    } else {
        htmlString += '</td>';
    }
    
    var i;
    for (i = 0; i<number; i++) {
        htmlString += '\
              <td class="pageTurnerPage">\
                  <a href="javascript:goToPage(';
        htmlString += (i+startNumber+1);
        htmlString += ');" class="pageTurnerPageNumber">';
        htmlString += (i+1+startNumber);
        htmlString += '</a>\
              </td>';
    }

    if (rightDots) {
        // There are next pages
        var rightDotsNumber = (startNumber + number + 5);
        if (rightDotsNumber >= gNumPages) {
            rightDotsNumber = gNumPages-1;
        }
        htmlString += '<td id="rightDots" class="pageTurner">\
                <a href="javascript:goToPage(';
        htmlString += rightDotsNumber+1;
        htmlString += ');" class="pageTurner">...</a></td>';
    } 

    htmlString += '<td id="pageTurnerRight">\
                <a href="javascript:goToNextPage();"\
                class="pageTurner">Next ></a>\
                </td>\
              </tr>\
              </table>\
              </td>\
              <td class="spaceFiller pageTurnerRightSpacer"></td>\
            </tr>\
          </table>\
          ';
    $("#pageTurnerNumberBar").html(htmlString);
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

function getPrevPage(resultSetId) {
    if (resultSetId == 0) {
        return;
        // Reached the end
    }       
    if (gCurrentPageNumber == 1) {
        console.log("At first page already");
    } else {
        gCurrentPageNumber--;
        XcalarSetAbsolute(resultSetId,
                          (gCurrentPageNumber-1)*gNumEntriesPerPage);
    }
    getPage(resultSetId);
}

function getPage(resultSetId, firstTime) {
    console.log('made it ot getpage')
    if (resultSetId == 0) {
        return;
        // Reached the end
    }
    var resize = false;
    var tdHeights = getTdHeights();
    var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           gNumEntriesPerPage);
    if (tableOfEntries.kvPairs.numRecords < gNumEntriesPerPage) {
        console.log("Last Page!");
        // This is the last iteration
        // Time to free the handle
        // XXX: Function call to free handle?
        resultSetId = 0;
    }
    var indexNumber = (gCurrentPageNumber-1) * gNumEntriesPerPage;
    var numRows = Math.min(gNumEntriesPerPage,
                           tableOfEntries.kvPairs.numRecords);
    for (var i = 0; i<numRows; i++) {
        if (tableOfEntries.kvPairs.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) { 
            var value = tableOfEntries.kvPairs.records[i].kvPairVariable.value;
        } else {
            var value = tableOfEntries.kvPairs.records[i].kvPairFixed.value;
        }
        if (firstTime) {
            generateFirstScreen(value, indexNumber+i+1, tdHeights[i]);
        } else {
            generateRowWithCurrentTemplate(value, indexNumber+i+1);
        }
    }
    if (firstTime && !getIndex(gTableName)) {
        gKeyName = tableOfEntries.keysAttrHeader.name;
        addCol("headCol1", gKeyName,
                    {resize: true,
                    isDark: false}); 
        gTableCols[0].func.func = "pull";
        gTableCols[0].func.args = [gKeyName];
        var newProgCol = new ProgCol();
        newProgCol.index = 3;
        newProgCol.name = "JSON";
        newProgCol.width = gNewCellWidth; // XXX FIXME Grab from CSS
        newProgCol.func.func = "raw";
        newProgCol.func.args = [];
        newProgCol.isDark = false;
        insertColAtIndex(1, newProgCol);
    }
    console.log("gTableCols.length: "+gTableCols.length);
    for (var i = 0; i<gTableCols.length; i++) {
        if (gTableCols[i].name == "JSON") {
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
                    /// XXX: +1?
                    autosizeCol($('#headCol'+(gTableCols[i].index)));
                }
            }
        }
    }
    showHidePageTurners();
    $('.colGrab').height($('#autoGenTable').height());
}

function generateFirstLastVisibleRowNum() {
    var mainFramePos = $('#mainFrame')[0].getBoundingClientRect();
    var mfPosTop = mainFramePos.top;
    var mfPosLeft = mainFramePos.left;
    var mfPosBot = mainFramePos.bottom;
    var tdXCoor = 30;
    var tdYCoor = 45;
    var tdBotYCoor = -15;
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+mfPosLeft,
                                            tdYCoor+mfPosTop);
    var firstId = $(firstEl).closest('td').attr('id');
    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(5));
    }

    var lastEl = document.elementFromPoint(tdXCoor+mfPosLeft,
                                           tdBotYCoor+mfPosBot);
    var lastId = $(lastEl).closest('td').attr('id');
    if (lastId && lastId.length > 0) {
        var lastRowNum = parseInt(lastId.substring(5));
    }

    console.log('row: '+firstRowNum, '2ndrow: '+lastRowNum);
    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar span:first-of-type').html(firstRowNum);
        movePageScroll(firstRowNum);
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar span:last-of-type').html(lastRowNum);
    } 
}

function generateRowWithCurrentTemplate(json, id) {
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

    // Replace id
    firstIndex = finalString.indexOf('idSpan">')+('idSpan">').length;
    secondIndex = finalString.indexOf("<", firstIndex);
    firstPart = finalString.substring(0, firstIndex);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr>"+firstPart + id + secondPart+"</tr>";
    if ($("#autoGenTable tbody tr").length == 0) {
        $("#autoGenTable tbody").append(finalString);
    } else { 
        $("#autoGenTable tbody tr:nth-last-child(1)").after(finalString);
    }
    // Replace element id
    $("#autoGenTable tbody tr:nth-last-child(1)").find("[id]").each(function() {
        var colNoInd = (this.id).indexOf("c");
        var colNo = (this.id).substring(colNoInd+1);
        this.id = "bodyr"+id+"c"+colNo;
    });

    $('#autoGenTable tr:nth-last-child(1) .jsonElement').dblclick(function() {
        showJsonPopup($(this));
    });
    $('#autoGenTable tr:nth-last-child(1) .rowGrab').mousedown(function(event) {
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

function delCol(id, resize) {
    var colid = parseInt(id.substring(11));
    var delTd = $('#autoGenTable tr:first th').eq(colid-1);
    var delTdWidth = delTd.width();
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
    gRescolDelWidth(id, resize, delTdWidth);
}

function pullCol(key, newColid, startIndex, numberOfRows) {
    if (/\.([0-9])/.test(key)) {//check for dot followed by number (invalid)
        return;
    }
    var colid = $("#autoGenTable th").filter(
        function() {
            return $(this).find("input").val() == "JSON";
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
    var newProgCol = options.progCol || new ProgCol();
    if (options.direction != "L") {
        newColid += 1;
    }

    if (name == null) {
        name = "";
        var select = true;
    } else {
        var select = false;
    }
    if (isDark) {
        var color = "unusedCell";
    } else {
        var color = "";
    }

    if (!options.progCol) {
        newProgCol.name = name;
        newProgCol.index = newColid;
        newProgCol.width = width;
        newProgCol.resize = resize;
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
        '<span><input type="text" id="rename'+newColid+'" '+
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
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>';
    if (gTableCols[newColid-2].func.func == "pull" &&
        gTableCols[newColid-2].func.args[0] == gKeyName) {
        dropDownHTML += '<li class="filterWrap" id="filter'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Greater Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Greater Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Equals'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                        '</ul>'+
                        '<div class="rightArrow"></div>'+
                        '</li>'+
                        '<li id="join">'+'Join'+
                            '<div class="rightArrow"></div>'+
                            '<ul class="subColMenu">';
        var tables = XcalarGetTables();
        var numTables = tables.numTables;
        for (var i = 0; i<numTables; i++) {
            var t = tables.tables[i];
            dropDownHTML += '<li class="join">'+t.tableName+'</li>';
        }
        dropDownHTML +=     '</ul>'+ 
                        '</li>';
    }
    dropDownHTML += '</ul>';
    $('#headCol'+newColid+' .header').append(dropDownHTML);

    dropdownAttachListeners(newColid);

    if (select) {
        $('#rename'+newColid).select();
    }
    $('#rename'+newColid).click(function() {
        $(this).select();
        $('.colMenu').hide();
    });
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
        if (newColid > 1) {
            $("#bodyr"+i+"c"+(newColid-1)).after(newCellHTML);
        } else {
            $("#bodyr"+i+"c"+(newColid+1)).before(newCellHTML);
        }
    }

    $("#headCol"+newColid+" .editableHead").keypress(function(e) {
      if (e.which==13) {
        var thisId = parseInt($(this).closest('.table_title_bg').
                     attr('id').substring(7));
        var progCol = parseCol($(this).val(), newColid, true);
        execCol(progCol);
        $(this).val(progCol.name);
        // autosizeCol($('#headCol'+thisId), {includeHeader: true});
        $(this).blur();
        $(this).closest('th').removeClass('unusedCell');
        $('#autoGenTable td:nth-child('+thisId+')').removeClass('unusedCell');
      }
    });
    $("#headCol"+newColid).mouseover(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $(this).find('.dropdownBox').css('opacity', 1);
        }
    }).mouseleave(function() {
        $(this).find('.dropdownBox').css('opacity', 0.5);
    });

    resizableColumns(resize, width);
    matchHeaderSizes();
}

function dropdownAttachListeners(colId) {
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
        $('.colGrab').css('z-index', -1);
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
        dragdropMouseDown($(this).parent().parent(), event);
    });

    $('#headCol'+colId+' .addColumns').click(function() {
        var id = $(this).attr('id');
        var direction = id.substring(3,4);
        $('.colMenu').hide();
        addCol(id, null, {direction: direction, isDark: true});
    });

    $('#renameCol'+colId).click(function() {
        var index = $(this).attr('id').substring(9);
        $('#rename'+index).select();
    });

    $('#duplicate'+colId).click(function() {
        var id = $(this).attr('id').substring(2);
        var index = parseInt(id.substring(7));
        var name = $('#rename'+index).val();
        var width = $('#headCol'+index).width();
        var isDark = $('#headCol'+index).hasClass('unusedCell');

        addCol(id, name, {resize: true, width: width, isDark: isDark});
        // Deep copy
        // XXX: TEST THIS FEATURE!
        gTableCols[index-1].func.func = gTableCols[index-2].func.func;
        gTableCols[index-1].func.args = gTableCols[index-2].func.args;
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
        $(this).closest('.filterWrap').find('input').val(value);
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
            $('.colGrab').css('z-index', 4);
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
    $('.colGrab').height($('#autoGenTable').height());
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
    gColumnBorderWidth = parseInt($('#autoGenTable th:first').
                            css('border-left-width'))+
                        parseInt($('#autoGenTable th:first').
                            css('border-right-width'));
    gColPadding = parseInt($('#autoGenTable td:first').css('padding-left')) * 2;
    dropdownAttachListeners(2); // set up listeners for json column

    if (typeof gTableName === 'undefined') {
        var searchText = "View Tables";
    } else {
        var searchText = gTableName;
    }
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
            generateFirstLastVisibleRowNum();
            movePageScroll($('#pageInput').val());
            // $(this).blur(); 
        }
    });
    $('.functionField:last-child').append('of '+resultSetCount);


    $('.closeJsonModal, #jsonModalBackground').click(function(){
        $('#jsonModal, #jsonModalBackground').hide();
        $('body').removeClass('hideScroll');
    });

    $('#datastorePanel .monitorSubDiv:first').click(function(){
        $("#loadArea").load('load_r.html', function(){
            $('#progressBar').css('transform', 'translateX(330px)');
            $('.dataStep').css('transform', 'translateX(320px)');
            $('.dataOptions').css('left',330).css('z-index', 6);
        });
        // load_r.html contains load.js where this function is defined
        loadReadyFunction();
        $('.datasetWrap').addClass('shiftRight');
    });

    $('#autoGenTable thead').mouseenter(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $('.dropdownBox').css('opacity', 0.5);
            $('.editableHead').addClass('resizeEditableHead');
        }
    })
    .mouseleave(function() {
        $('.dropdownBox').css('opacity', 0);
        $('.editableHead').removeClass('resizeEditableHead');
    });

    $('#newWorksheet span').click(function(){
        var tabCount = $('.worksheetTab').length;
        $('#newWorksheet').after('<div class="worksheetTab">Worksheet '+
                                    (tabCount-1)+'</div>');
        $('.worksheetTab:first').click(function(){
            $('.worksheetTab').removeClass('tabSelected');
            $(this).addClass('tabSelected');
        });
        $('.worksheetTab').width(((1/(tabCount+1)))*70+'%');
        $('.worksheetTab:first').click();   
    });

    $('.worksheetTab').click(function() {
        $('.worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
    });

    $('#pageScroll').mousedown(function(event) {
        var mouseX = event.pageX - $(this).offset().left;
        var scrollWidth = $(this).outerWidth();
        var pageNum = Math.ceil((mouseX / scrollWidth) * resultSetCount);
        var pageInputNum = $("#pageInput").val();
        var e = $.Event("keypress");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#pageInput").val(pageNum).trigger(e);
        $("#pageInput").val(pageInputNum);
        $('#pageMarker').css('transform', 'translateX('+mouseX+'px)');
    });


    $(document).mousedown(function(event) {
        var clickable = $(event.target).closest('.colMenu').length > 0;
        if (!clickable && !$(event.target).is('.dropdownBox')) {
                $('.colMenu').hide();
                $('.colGrab').css('z-index', 4);
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
    gRescol.startWidth = gRescol.grabbedCell.outerWidth(); 
    gRescol.nextCell = gRescol.grabbedCell.next();  // the next td
    gRescol.nextCellWidth = gRescol.nextCell.outerWidth();
    gRescol.id = gRescol.grabbedCell.attr('id');
    gRescol.nextId = gRescol.nextCell.attr('id');
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
    gRescol.rightDragMax = gRescol.nextCellWidth - gRescol.tempCellMinWidth;
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
    $('.colGrab').height($('#autoGenTable').height());
    generateFirstLastVisibleRowNum()
}

// start drag n drop column script
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
    gDragObj.borderHeight = 0;
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
    $('.shadowDiv, .fauxCol, .dropTarget, #moveCursor').remove();
    var head = $("#autoGenTable tr:first th span");
    var progCol = gTableCols[gDragObj.colId-2];
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex+1) != gDragObj.colId) { 
        delCol("closeButton"+gDragObj.colId, false);
        progCol.index = gDragObj.colIndex+1;
        insertColAtIndex(gDragObj.colIndex-1, progCol);
        addCol("headCol"+gDragObj.colIndex, progCol.name, {width: progCol.width,
               resize: progCol.resize, isDark: false, progCol: progCol});
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
    $('.fauxCol').append('<table id="autoGenTable" class="fauxTable" '+
                         'style="width:'+(gDragObj.colWidth-5)+'px"></table>');

    // We cannot just copy the entire column because columns may now be too
    // big. So we binary search to the first visible and backtrack a few, find
    // the last visible and add a few. Then we create the fake shadow column
    // Find first visible body tr
    var topPx = $(window).scrollTop();
    var topRowId = -1;
    $('#autoGenTable tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowId = $(this).find("td:first").text();
            return (false);
        }
    });
    if (topRowId == -1) {
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

    // Just do 40 cols for fun now.
    var count = 0;
    $('#autoGenTable tbody tr').each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= 40) {
                return (false);
            }
    });

    // Clone tail
    // $('#autoGenTable tfoot tr').each(function(i, ele) {
    //     cloneCellHelper(ele);
    // });

    var fauxColHeight = Math.min($('.fauxTable').height(), $('#mainFrame').
                             height()- gScrollbarHeight);
    $('.fauxCol').height(fauxColHeight);
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

function gRescolDelWidth(id, resize, delTdWidth) {
    matchHeaderSizes();
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
    var el = $('#'+el.attr('id'));
    var index = parseInt(el.attr('id').substring(7));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var oldTableWidth = $('#autoGenTable').width();
    var maxWidth = 500;
    var oldWidth = el.width();  
    var newWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
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
    matchHeaderSizes(resizeFirstRow);
}

function getWidestTdWidth(el, options) {
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var id = (el.attr('id')).substr(7);
    var largestWidth = gRescol.cellMinWidth - 10; // default minimum width
    var firstRow = true;
    var width;
    if (includeHeader) {
        var selector = ':gt(0)';
    } else {
        var selector = ':gt(1)';
    }
    var rightMargin = 6;

    $('#autoGenTable tr'+selector).each(function(){
        var td = $(this).children(':eq('+(id-1)+')');
        if (firstRow && includeHeader) {
            width = getTextWidth(td.find('.editableHead'));
            firstRow = false;
        } else if (td.children('.addedBarText').length) {
            width = getTextWidth(td.children('.addedBarText'));
        } else {
            width = getTextWidth(td);
        }
        width += rightMargin;
        if (width > largestWidth) {
            largestWidth = width; 
        }
    });
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
            if (index[i].name != "JSON") {
                addCol("headCol"+(index[i].index-1), index[i].name,
                      {width: index[i].width, resize: true,
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

function documentReadyIndexFunction() {
    $(document).ready(function() {
        readFromStorage();
        menuBarArt();
        monitorOverlayPercent();
        menuAreaClose();
        // displayTable();
        getTablesAndDatasets();
        documentReadyCatFunction();

        fillPageWithBlankCol();
        goToPage(gCurrentPageNumber+1);
        generateFirstLastVisibleRowNum();
        cloneTableHeader();   
        infScrolling();
        
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
    $('#jsonModal, #jsonModalBackground').show();
    var modalHeight = $('#jsonModal').outerHeight();
    var modalWidth = $('#jsonModal').outerWidth();
    var closeHeight = $('.closeJsonModal').height();
    var closeTop = jsonTdPos.top - closeHeight/2 + 2;
    var closeLeft = jsonTdPos.left+(jsonTdWidth/2);

    if (jsonTdPos.top < winHeight/2) {
        var modalTop = jsonTdPos.top; 
    } else {
        var modalTop = jsonTdPos.top - modalHeight + jsonTdHeight;
    }

    if (modalTop < 5) {
        modalTop = 5;
    } else if (modalTop+modalHeight > winHeight) {
        modalTop = Math.max(winHeight - modalHeight - 5, 5);
    }

    if (jsonTdPos.left+(jsonTdWidth/2) > (winWidth/2)) {
        var modalLeft = Math.min((jsonTdPos.left+(jsonTdWidth/2)) - modalWidth, 
            winWidth - modalWidth - 20);
        closeLeft += 5;
    } else {
        var modalLeft = Math.max(jsonTdPos.left+(jsonTdWidth/2) , 20);
        closeLeft -= 15;
    }
    
    $('#jsonModal').css({'left': modalLeft, 'top': modalTop});
    $('.closeJsonModal').css({'left': closeLeft, 'top': closeTop});

    $('.jKey, .jArray>.jString, .jArray>.jNum').click(function(){
        var name = createJsonNestedField($(this));
        var id = $("#autoGenTable th").filter(function() {
                        return $(this).find("input").val() == "JSON";
                    }).attr("id");
        var colIndex = parseInt(id.substring(7)); 
        addCol(id, name, {resize: false, select: false});
        gTableCols[colIndex-1].func.func = "pull";        
        gTableCols[colIndex-1].func.args = [name];
        execCol(gTableCols[colIndex-1]);
        autosizeCol($('#headCol'+(colIndex+1)), {includeHeader: true, 
                resizeFirstRow: true});
        $('#jsonModal, #jsonModalBackground').hide();
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
    $('.fauxTHead .colGrab').height($('#autoGenTable').height());
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
    var pct = (pageNum/resultSetCount) * 100;
    var dist = pct*$('#pageMarker').width();
    console.log(dist)
    $('#pageMarker').css('transform', 'translateX('+dist+'px)');
}
