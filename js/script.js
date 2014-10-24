// JavaScript Document
// Menu Bar JS
var selectedTab = 1;
var numTabs = 3;
var tableRowIndex = 1;
var currentPageNumber = 0;
// var numEntriesPerPage = 12;
var numEntriesPerPage = 24;
var numPageTurners = 10;
var resultSetId = 0;
var newCellWidth = 116;
var columnBorderWidth = -1;
var colPadding = 4;
var numPages = 0;
var keyName = "";
var mouseStatus = null;
var dragObj = {};
var rescol = {
    first: true,
    cellMinWidth: 40
};

function setTabs() {
    var i;
    for (i = 1; i<=numTabs; i++) {
        dataSourceMouseOver(i);
    }
    dataSourceClick(1);
}

function infScrolling() {
    // Feature: As we're scrolling we can update the skip to row box.
    // However, all solutions that I've seen so far are shitty in terms of
    // performance. So unless there's a nice quick method, I don't think this
    // feature is necessary.

    $("#mainFrame").scroll(function() {
        if ($(this)[0].scrollHeight - $(this).scrollTop()+8 ==
            $(this).outerHeight()) {// XXX: Figure out why it's 8 lol 
            // Should be because of the scrollbar
            goToPage(currentPageNumber); 
        }
    });
}

// XXX: This function should disappear. But I need to be able to free the
// result sets
function loadMainContent(op) {
    if (window.location.pathname.search("cat_table.html") > -1) {
        freeAllResultSets();
    }
}

function menuAreaClose() {
    $("#menuArea").hide();
}

function menuBarArt() {
    var clickTarget = "";
    $("#menuBar div").on("click", function() {
        if (clickTarget == $(event.target).text()) {
            //if clicking on an already open menu, close it
            $("#menuBar div").removeClass("menuSelected");
            $("#menuArea").height(0);
            clickTarget = "";
            return;
        }
        clickTarget = $(event.target).text();
        $("#menuBar div").removeClass("menuSelected");
        $(this).addClass("menuSelected");
        switch ($(this).text()) {
        case ("datastore"):
            $("#menuArea").show().height(76);
            $("#datastorePanel").show();
            $("#datastorePanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        case ("monitor"):
            $("#menuArea").show().height(76);;
            $("#monitorPanel").show();
            $("#monitorPanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        case ("tablestore"):
            $("#menuArea").show().height(76);
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

function displayTable() {
    var numRowsToAdd = 20;
    var numCols = $('#autoGenTable th').length;
    for (var i = 1; i < numRowsToAdd; i++) {
        $('#autoGenTable tbody').append('<tr></tr>');
        for (var j = 1; j < numCols+1; j++) {
            $('#autoGenTable tbody tr:last').append('<td id="bodyr'+i+'c'+j+'"><div class="addedBarTextWrap"'+
                'style="max-height:'+14+'px;">'+
                '<div class="addedBarText">'+'text djk'+'</div></div></td>');
        }
    }
    
    $('#autoGenTable th:eq(2)').after('<th class="selectedCell">Header</th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="selectedCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="selectedCell"></td>');

    $('#autoGenTable th:eq(2)').after('<th class="unusedCell"></th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="unusedCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="unusedCell"></td>');
}

function getTablesAndDatasets() {
    var tables = XcalarGetTables();
    var numTables = tables.numTables;
    var i;
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
    for (i = 0; i<numDatasets; i++) {
         var tableDisplay = '<div class="dataset datasetName">'+
                                 '<span>DATA<br>SET</span>'+
                             '</div>'+
                             '<div class="monitorSubDiv">'+
                                  datasets.datasets[i].datasetId+
                             '</div>';
        $("#datastorePanel div:last").after(tableDisplay);
    };
    monitorOverlayPercent();
    // XXX: UNCOMMENT!
    // resizableColumns();
}

function fillPageWithBlankCol() {
    var tableWidth = $("#autoGenTable").width();
    var windowWidth = $(window).width();
    // Ensures that empty cols will stretch the page to more than window width
    var numColsToFill = Math.ceil((windowWidth - tableWidth)/newCellWidth) + 1;
    var startColId = $("#autoGenTable th").size();
    for (var i = 0; i<numColsToFill; i++) {
        addCol("headCol"+(startColId+i), "");
        $("#headCol"+(startColId+i+1)).addClass("unusedCell");
        for (var j = 0; j<$("#autoGenTable tr").size()-2; j++) {
             $("#bodyr"+(j+1)+"c"+(startColId+i+1)).addClass("unusedCell");
        }
        $("#sumFn"+(startColId+i+1)).addClass("unusedCell"); 
    }
     
}

function generatePageInput() {
    $('#pageInput').attr('max', resultSetCount);
}

function deselectPage(pageNumber) {
    $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == pageNumber.toString();
    }).parent().removeClass("pageTurnerPageSelected");
} 

function selectPage(pageNumber) {
    $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == pageNumber.toString();
    }).parent().addClass("pageTurnerPageSelected");
} 

function goToPrevPage() {
    if (currentPageNumber <=1) {
        console.log("First page, cannot move");
        return;
    } 
    var currentPage = currentPageNumber;
    var prevPage = currentPage-1;
    var prevPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return ($(this).text() == prevPage.toString());
    });
    if (prevPageElement.length) {
        selectPage(prevPage);
        deselectPage(currentPage);
        getPrevPage(resultSetId);
    } else {
        goToPage(prevPage-1);
    }
}

function goToNextPage() {
    if (currentPageNumber >= numPages) {
        return;
    }
    var currentPage = currentPageNumber;
    var nextPage = currentPage+1;
    var nextPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return ($(this).text() == nextPage.toString());
    });
    if (nextPageElement.length) {
        selectPage(nextPage);
        deselectPage(currentPage);
        getNextPage(resultSetId);
        if (currentPageNumber == numPages) {
            $('#pageTurnerRight').css('visibility', 'hidden');
        }
    } else {
        goToPage(nextPage-1);
    }
}

function goToPage(pageNumber) {
    deselectPage(currentPageNumber);
    currentPageNumber = pageNumber+1;
    generatePages(); 
    selectPage(pageNumber+1);
    XcalarSetAbsolute(resultSetId, pageNumber*numEntriesPerPage);
    getPage(resultSetId);
}

function showHidePageTurners() {
    $('#pageTurnerLeft a, #pageTurnerRight a').css('visibility', 'visible');
    if (currentPageNumber < 2) {
        $('#pageTurnerLeft a').css('visibility', 'hidden');
    } 
    if (currentPageNumber >= numPages) {
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
    var startNumber = Math.max(currentPageNumber-6, 0); // number furthest on left side
    if (numPages > numPageTurners) {
        var number = numPageTurners; 
        if ((numPages-startNumber) > numPageTurners) {
            rightDots = true;
        } else {
           startNumber = numPages - numPageTurners;
        }
    } else {
        var number = numPages;
    }
    var htmlString = '<table class="noBorderTable" id="pageTurnerNumberBarInner">\
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
        htmlString += leftDotsNumber;
        htmlString += ');" class="pageTurner">...</a></td>';
    } else {
        htmlString += '</td>';
    }
    
    var i;
    for (i = 0; i<number; i++) {
        htmlString += '\
              <td class="pageTurnerPage">\
                  <a href="javascript:goToPage(';
        htmlString += (i+startNumber);
        htmlString += ');" class="pageTurnerPageNumber">';
        htmlString += (i+1+startNumber);
        htmlString += '</a>\
              </td>';
    }

    if (rightDots) {
        // There are next pages
        var rightDotsNumber = (startNumber + number + 5);
        if (rightDotsNumber >= numPages) {
            rightDotsNumber = numPages-1;
        }
        htmlString += '<td id="rightDots" class="pageTurner">\
                <a href="javascript:goToPage(';
        htmlString += rightDotsNumber;
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
    tableRowIndex = 1;
}

function getNextPage(resultSetId, firstTime) {
    if (resultSetId == 0) {
        return;
    }
    currentPageNumber++;
    getPage(resultSetId, firstTime);
}

function getPrevPage(resultSetId) {
    if (resultSetId == 0) {
        return;
        // Reached the end
    }       
    if (currentPageNumber == 1) {
        console.log("At first page already");
    } else {
        currentPageNumber--;
        XcalarSetAbsolute(resultSetId,
                          (currentPageNumber-1)*numEntriesPerPage);
    }
    getPage(resultSetId);
}

function getPage(resultSetId, firstTime) {
    if (resultSetId == 0) {
        return;
        // Reached the end
    }
    var indices = [];
    var resize = false;
    var headingsArray = convertColNamesToArray();
    if (headingsArray != null) {
        for (var i = 1; i<headingsArray.length; i++) {
            var indName = {index: i,
                           name: headingsArray[i],
                           width: $("#headCol"+(i+1)).width(),
                           isDark: $("#headCol"+(i+1)).hasClass('unusedCell')};
            indices.push(indName);
        }
    }
    var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           numEntriesPerPage);
    if (tableOfEntries.numRecords < numEntriesPerPage) {
        // This is the last iteration
        // Time to free the handle
        // XXX: Function call to free handle?
        resultSetId = 0;
    }
    var indexNumber = (currentPageNumber-1) * numEntriesPerPage;
    for (var i = 0; i<Math.min(numEntriesPerPage, 
          tableOfEntries.numRecords); i++) {
        var value = tableOfEntries.records[i].value;
        if (firstTime) {
            generateRowWithAutoIndex2(value, indexNumber+i+1);
        } else {
            generateRowWithCurrentTemplate(value, indexNumber+i+1);
        }
    }
    if (firstTime && !getIndex(tableName)) {
        if (headingsArray.length != 2) {
            console.log("BUG BUG BUG");
            alert("Possible bug");
            console.log(headingsArray)
        }
        keyName = tableOfEntries.meta.keysAttrHeader.name;
        var indName = {index: 1,
                       name: keyName,
                       width: newCellWidth};
        indices.push(indName); 
        resize = true;
    }
    for (var i = 0; i<indices.length; i++) {
        if (indices[i].name == "JSON") {
            // We don't need to do anything here because if it's the first time
            // they won't have anything stored. If it's not the first time, the
            // column would've been sized already. If it's indexed, we
            // would've sized it in CatFunction
        } else {
            if (firstTime && !getIndex(tableName)) {
                addCol("headCol"+(indices[i].index), indices[i].name,
                    {width: indices[i].width, resize: resize,
                    isDark: indices[i].isDark}); 
                pullCol(indices[i].name, 1+indices[i].index);
            } else {
                pullCol(indices[i].name, 1+indices[i].index, indexNumber+1);
            }
        }
    }
    showHidePageTurners();
    $('.jsonElement').dblclick(function(){
        showJsonPopup($(this));
    });
}

function generateRowWithCurrentTemplate(json, id) {
    // Replace JSON
    var startString = '<div class="elementText">';
    var endString="</div>";
    var originalString = $("#autoGenTable tbody tr:nth-last-child(1)").html();
    var index = originalString.indexOf(startString);
    var firstPart = originalString.substring(0, index+startString.length);
    var secondPart = originalString.substring(index+startString.length+1);
    var secondIndex = secondPart.indexOf(endString);
    secondPart = secondPart.substring(secondIndex);
    var finalString = firstPart+json+secondPart;

    // Replace id
    firstIndex = finalString.indexOf(">");
    secondIndex = finalString.indexOf("</td>");
    firstPart = finalString.substring(0, firstIndex+1);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr>"+firstPart + id + secondPart+"</tr>";
    $("#autoGenTable tbody tr:nth-last-child(1)").after(finalString);

    // Replace element id
    $("#autoGenTable tbody tr:nth-last-child(1)").find("[id]").each(function() {
        var colNoInd = (this.id).indexOf("c");
        var colNo = (this.id).substring(colNoInd+1);
        this.id = "bodyr"+id+"c"+colNo;
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
        tableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'+
        tableRowIndex+'</td>'+
        '<td bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)"'+
        ' onclick="javascript: window.location.href=\'cat_table.html?'+
        'tablename='+
        URIEncoded+'\'" style="height:18px;">'+
        '<div class="cellRelative"><span '+clickable+'>'+text+'</span>'+
        '<div class="dropdownBox"></div>'+
        '</div></td></tr>');
    tableRowIndex++;
}

function generateRowWithAutoIndex2(text2, idNo) {
    $("#autoGenTable tbody").append('<tr>'+
        '<td align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        idNo+"c1"+'" style="height:18px;">'
        +idNo+'</td>'+
        '<td bgcolor="#FFFFFF" class="jsonElement monacotype" id="bodyr'+
        idNo+"c2"+'" style="height:18px;">'+
        '<div class="elementTextWrap">'+
        '<div class="elementText">'+
        text2+'</div>'+
        '</div>'+
        '</td>'+
        '</tr>');
}

function delCol(id, resize) {
    rescolDelWidth(id, resize);
    var numCol = $("#autoGenTable th").length;
    var colid = parseInt(id.substring(11));
    $("#headCol"+colid).remove();
    $("#sumFn"+colid).remove();
    console.log($("#headCol"+colid).html());
    for (var i = colid+1; i<=numCol; i++) {
        $("#headCol"+i).attr("id", "headCol"+(i-1));
        $("#closeButton"+i).attr("id", "closeButton"+(i-1));
        $("#addLCol"+i).attr("id", "addLCol"+(i-1));
        $("#addRCol"+i).attr("id", "addRCol"+(i-1));
        $("#rename"+i).attr("id", "rename"+(i-1));
        $("#renameCol"+i).attr("id", "renameCol"+(i-1));
        $('#sort'+i).attr("id", "sort"+(i-1));
        $('#filter'+i).attr("id", "filter"+(i-1));
        $("#duplicate"+i).attr("id", "duplicate"+(i-1));
        $('#sumFn'+i).attr("id", "sumFn"+(i-1));
    }
 
    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tbody tr:eq(0) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);

    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        $("#bodyr"+i+"c"+colid).remove();
        for (var j = colid+1; j<=numCol; j++) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j-1));
        }
    }
}

function pullCol(key, newColid, startIndex) {
    if (/\.([0-9])/.test(key)) {//check for dot followed by number (invalid)
        return;
    }
    var colid = $("#autoGenTable th:contains('JSON')").filter(
        function() {
            return $(this).text().indexOf("JSON") != -1;
    }).attr("id");

    colid = colid.substring(7);
    var numRow = -1;
    var startindIndex = -1;
    if (!startIndex) {
        var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
        idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
        startingIndex = parseInt(idOfFirstRow);
        numRow = $("#autoGenTable tbody tr").length;
    } else {
        startingIndex = startIndex;
        numRow = numEntriesPerPage;
    } 
    var nested = key.trim().replace(/\]/g, "").replace(/\[/g, ".").split(".");

    for (var i =  startingIndex; i<numRow+startingIndex; i++) {
        var jsonStr = $("#bodyr"+i+"c"+colid+ " .elementText").text();
        // console.log('we good', jsonStr) 
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
 
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+value+"</div></div>";
        $("#bodyr"+i+"c"+newColid).html(value); 
    } 

}

function addCol(id, name, options) {
    var numCol = $("#autoGenTable th").length;
    var colid = parseInt(id.substring(7));
    var newColid = colid;
    var options = options || {};
    var width = options.width || newCellWidth;
    var resize = options.resize || false;
    var isDark = options.isDark || false;
    if (options.direction != "L") {
        newColid += 1;
    }
    if (name == null) {
        name = "New Heading";
        // resize = true;
        var select = true;
    } else {
        var select = false;
    }
    if (isDark) {
        var color = "unusedCell";
    } else {
        var color = "";
    }

    for (var i = numCol; i>=newColid; i--) {
        $("#headCol"+i).attr("id", "headCol"+(i+1));
        $("#closeButton"+i).attr("id", "closeButton"+(i+1));
        $("#addRCol"+i).attr("id", "addRCol"+(i+1));
        $("#addLCol"+i).attr("id", "addLCol"+(i+1));
        $("#rename"+i).attr("id", "rename"+(i+1));
        $("#renameCol"+i).attr("id", "renameCol"+(i+1));
        $("#sort"+i).attr("id", "sort"+(i+1));
        $("#filter"+i).attr("id", "filter"+(i+1));
        $("#duplicate"+i).attr("id", "duplicate"+(i+1));
        $("#sumFn"+i).attr("id", "sumFn"+(i+1));
    }        
    
    var columnHeadTd = '<th class="table_title_bg '+color+' editableCol'+
        '" id="headCol'+
        newColid+
        '" style="height:17px; width:'+(width+colPadding+columnBorderWidth)+'px;">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox"></div>'+
        '<span><input type="text" id="rename'+newColid+'" '+
        'class="editableHead" '+
        'value="'+name+'" size="15" placeholder=""/></span>'+
        '</div>'+
        '</th>';
    $("#headCol"+(newColid-1)).after(columnHeadTd); 

    var dropDownHTML = '<ul class="colMenu">'+
            '<li class="menuClickable">'+
                'Add a column'+
                '<div class="rightArrow"></div>'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns" id="addLCol'+
                    newColid+'">On the left</li>'+
                    '<li class="addColumns" id="addRCol'+
                    newColid+'">On the right</li>'+
                '</ul>'+ 
            '</li>'+
            '<li class="deleteColumn" onclick="delCol(this.id);" '+
            'id="closeButton'+newColid+'">Delete the column</li>'+
            '<li id="duplicate'+newColid+'">Duplicate the column</li>'+
            '<li id="renameCol'+newColid+'">Rename the column</li>'+
            '<li class="sort" id="sort'+newColid+'">Sort</li>';
    if (name == keyName) {
        dropDownHTML += '<li class="filterWrap menuClickable" id="filter'+newColid+'">Filter'+
                            '<div class="rightArrow"></div>'+
                            '<ul class="subColMenu">'+
                                '<li class="filter">Greater Than'+
                                    '<ul class="subColMenu">'+
                                        '<li><input type="text" value="0"/></li>'+
                                    '</ul>'+
                                '</li>'+
                                '<li class="filter">Greater Than Equal To'+
                                    '<ul class="subColMenu">'+
                                        '<li><input type="text" value="0"/></li>'+
                                    '</ul>'+
                                '</li>'+
                                '<li class="filter">Equals'+
                                    '<ul class="subColMenu">'+
                                        '<li><input type="text" value="0"/></li>'+
                                    '</ul>'+
                                '</li>'+
                                '<li class="filter">Less Than'+
                                    '<ul class="subColMenu">'+
                                        '<li><input type="text" value="0"/></li>'+
                                    '</ul>'+
                                '</li>'+
                                '<li class="filter">Less Than Equal To'+
                                    '<ul class="subColMenu">'+
                                        '<li><input type="text" value="0"/></li>'+
                                    '</ul>'+
                                '</li>'+
                            '</ul>'+
                        '</li>'+
                        '<li class="menuClickable" id="join">'+'Join'+
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
    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        for (var j = numCol; j>=newColid; j--) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j+1));
            // every column after the new column gets id shifted +1;

        }
        var newCellHTML = '<td bgcolor="#FFFFFF"'+
            'class="monacotype '+color+'" id="bodyr'+i+"c"+(newColid)+
            '"'+
            ' style="height:18px;">&nbsp;</td>';
        if (newColid > 1) {
            $("#bodyr"+i+"c"+(newColid-1)).after(newCellHTML);
        } else {
            $("#bodyr"+i+"c"+(newColid+1)).before(newCellHTML);
        }
    }
    // XXX: This has an issue assigning id because of the testing that's going
    // on. Should be fixed the moment we are done.
    // Rudy: I think the issue was in delcol() and I fixed it
    // $("#sumFn"+(newColid-1)).after('<td id="sumFn'+newColid+'">SumFn</td>'); 
    var sumFn = '<td id="sumFn'+newColid+'" class="'+color+'">'+
                '<input class="editableHead" value="sumFn"/></td>';
    $("#sumFn"+(newColid-1)).after(sumFn); 

    $("#headCol"+newColid).click(function() {
        $(this).select();
    });
    $("#headCol"+newColid+" .editableHead").keypress(function(e) {
      if (e.which==13) {
        var thisId = parseInt($(this).closest('.table_title_bg').
                     attr('id').substring(7));
        pullCol($(this).val(), thisId);
        $(this).blur();
        $(this).closest('th').removeClass('unusedCell');
        $('#autoGenTable td:nth-child('+thisId+')').removeClass('unusedCell');
      }
    });
    resizableColumns(resize, width);
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
    });

    $('#headCol'+colId+' .dragArea').mousedown(function(event){
        dragdropMouseDown($(this).parent().parent(), event);
    });

    $('#headCol'+colId+' .subColMenu li').mouseenter(function() {
        subColMenuMouseEnter($(this));
    }).mouseleave(function() {
        subColMenuMouseLeave($(this));
    });

    $('#headCol'+colId+' .addColumns').click(function() {
        var id = $(this).attr('id');
        var direction = id.substring(3,4);
        $('.colMenu').hide();
        addCol(id, null, {direction: direction});
        // addCol(id, null, {direction: direction, resize:false});
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

        addCol(id, name, {resize: true, width: width});
        pullCol(name, (index+1));
    });

    $('#sort'+colId).click(function() {
        var index = $(this).attr("id").substring(4);
        sortRows($('#rename'+index).val());
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
    $('#join .subColMenu li').click(function() {
        joinTables($(this).text());
    });
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function convertColNamesToArray() {
    var head = $("#autoGenTable th span");
    var numCol = head.length;
    var headings = [];
    for (var i = 0; i<numCol; i++) {
        if (!head.eq(i).parent().parent().hasClass("unusedCell")) {
            headings.push($.trim(head.eq(i).text()));
            if (headings[i] == "") {
                headings.pop();
                headings.push($.trim(head.eq(i).children('input').val()));
            }
        }
    }
    return headings;
}

// XXX: FIXME: This should not preserve undefined columns!!!
function convertColNamesToIndexArray() {
    var head = $("#autoGenTable th span");
    var numCol = head.length;
    var headings = [];
    for (var i = 2; i<numCol; i++) {
        if (!$("#headCol"+i).hasClass("unusedCell")) {
            if ($("#headCol"+i+" span").text() == "JSON") {
                var indexObj = {
                    index: i-1,
                    name: $("#headCol"+i+" span").text(),
                    width: $("#headCol"+i).width()
                };
            } else {
                var indexObj = {
                    index: i-1,
                    name: $("#headCol"+i+" span"+" input").val(),
                    width: $("#headCol"+i).width()
                };
            }
            console.log(indexObj.name);
            headings.push(indexObj);
        }
    }
    return headings;
}

function resizableColumns(resize, newWidth) {
    $('#autoGenTable th:not(:last-child) .header').each(
        function() {
            if (!$(this).children().hasClass('colGrab') 
                &&!$(this).parent().is(':first-child')) {
                $(this).prepend('<div class="colGrab"></div>');
                var tdId = $(this).parent().attr('id');
                $('#'+tdId+' .colGrab').mousedown(
                    function(event) {
                        if (event.which === 1) {
                            rescolMouseDown($(this), event);
                        }
                    }
                );
            }
        }
    );
    $('.colGrab').height($('#autoGenTable').height());
    if (rescol.first) {
        $('#autoGenTable th').each(
            function() {
                    var initialWidth = $(this).width();
                    $(this).width(initialWidth);
                    $(this).removeAttr('width');
            } 
        );
        rescol.first = false;
    } 
    if (resize) {
        shrinkLargestCell(newWidth);
    } 
}

function shrinkLargestCell(newWidth) {
    /* 
    var largestCell;
    var largestCellWidth = 0;
    $('#autoGenTable th').each(
        function() {
            if ($(this).width() > largestCellWidth) {
                largestCell = $(this);
                largestCellWidth = $(this).width();
            }
        }
    );
    var newLargeWidth = largestCellWidth - (newWidth + colPadding + columnBorderWidth);
    largestCell.width(newLargeWidth);
    console.log(newLargeWidth, 'new large')
    */
}

function subColMenuMouseEnter(el) {
    el.siblings().addClass('subColUnselected');
    el.addClass('subColSelected');
    el.parent().parent().addClass('subSelected');
}

function subColMenuMouseLeave(el) {
    el.siblings().removeClass('subColUnselected');
    el.removeClass('subColSelected');
    el.parent().parent().removeClass('subSelected');
}

function disableTextSelection() {
    window.getSelection().removeAllRanges();
    var style = '<style id="disableSelection" type="text/css">*'+ 
        '{ -ms-user-select:none;-moz-user-select:-moz-none;-khtml-user-select:none;'+
        '-webkit-user-select:none;user-select:none; }</style>';
    $(document.head).append(style);
    $('input').prop('disabled', true);
}

function reenableTextSelection() {
    $('#disableSelection').remove();
    $('input').prop('disabled', false);
}

function documentReadyCommonFunction() {
    columnBorderWidth = parseInt($('#autoGenTable th:first').css('border-left-width'))+
                        parseInt($('#autoGenTable th:first').css('border-right-width'));
    colPadding = parseInt($('#autoGenTable td:first').css('padding-left')) * 2;
    dropdownAttachListeners(2); // set up listeners for json column

    if (typeof tableName === 'undefined') {
        var searchText = "View Tables";
    } else {
        var searchText = tableName;
    }
    $("#searchBar").val('tablename = "'+searchText+'"');
    $('#pageInput').width((""+resultSetCount).length*7+8);
    $('#pageInput').attr('maxLength', (""+resultSetCount).length);
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
             goToPage(Math.ceil(parseInt($('#pageInput').val())/numEntriesPerPage)-1);
            // $(this).blur(); 
        }
    });


    $('.closeJsonModal, #jsonModalBackground').click(function(){
        $('#jsonModal, #jsonModalBackground').hide();
        $('body').removeClass('hideScroll');
    });

    $(document).click(function(event) {
        var clickable = $(event.target).closest('.menuClickable').length > 0;
        if (!clickable && !$(event.target).is('.dropdownBox')) {
                $('.colMenu').hide();
        } 
    });
    $(document).mousemove(function(event){
        if (mouseStatus != null) {
            switch (mouseStatus) {
                case ("resizingCol"):
                    rescolMouseMove(event);
                    break;
                case ("resizingRow"):
                    //XXX resrowMouseMove(event) to go here
                    break;
                case ("movingCol"):
                    dragdropMouseMove(event);
                    break;
                default:  // do nothing
            }
        }
    });
    $(document).mouseup(function(event){
        if (mouseStatus != null) {
            switch (mouseStatus) {
                case ("resizingCol"):
                    rescolMouseUp();
                    break;
                case ("resizingRow"):
                    //XXX resrowMouseUp() to go here
                    break;
                case ("movingCol"):
                    dragdropMouseUp();
                    break;
                default: // do nothing
            }
        }
    });
    
}

function rescolMouseDown(el, event) {
    mouseStatus = "resizingCol";
    event.preventDefault();
    rescol.mouseStart = event.pageX;
    rescol.grabbedCell = el.parent().parent();  // the td 
    rescol.startWidth = rescol.grabbedCell.width(); 
    rescol.nextCell = rescol.grabbedCell.next();  // the next td
    rescol.nextCellWidth = rescol.nextCell.width();
    if (rescol.startWidth < rescol.cellMinWidth) {
        rescol.tempCellMinWidth = rescol.startWidth;
    } else {
        rescol.tempCellMinWidth = rescol.cellMinWidth;
    }
    rescol.rightDragMax = rescol.nextCellWidth - rescol.tempCellMinWidth;
    rescol.leftDragMax =  rescol.tempCellMinWidth - rescol.startWidth;

    disableTextSelection();
    $(document.head).append('<style id="ew-resizeCursor" type="text/css">*'+ 
        '{cursor: ew-resize !important;}</style>');
}

function rescolMouseMove(event) {
    var dragDist = (event.pageX - rescol.mouseStart);
    if ( dragDist > rescol.leftDragMax && dragDist < rescol.rightDragMax ) {
        rescol.grabbedCell.width(rescol.startWidth + dragDist);
        rescol.nextCell.width(rescol.nextCellWidth - dragDist);
    } else if ( dragDist < rescol.leftDragMax ) {
        // set grabbed cell to min width if mouse quickly moves to the left
        rescol.grabbedCell.width(rescol.tempCellMinWidth);
        rescol.nextCell.width(rescol.nextCellWidth + (rescol.startWidth 
        - rescol.tempCellMinWidth));
    } else if (dragDist > rescol.rightDragMax) {
        rescol.grabbedCell.width(rescol.startWidth+ (rescol.nextCellWidth 
        - rescol.cellMinWidth));
        rescol.nextCell.width(rescol.cellMinWidth);
    }
}

function rescolMouseUp() {
    mouseStatus = null;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
}

// start drag n drop column script
function dragdropMouseDown(el, event) {
    mouseStatus = "movingCol";
    dragObj.mouseStart = event.pageX;
    dragObj.id = el.attr('id');
    console.log(dragObj.id);
    dragObj.colId = parseInt(dragObj.id.substring(7));
    dragObj.colIndex = parseInt(el.index());
    dragObj.colOffLeft = el.offset().left;
    dragObj.colOffTop = el.offset().top;
    // dragObj.borderHeight = parseInt(el.css('border-top-width'))+ 
    //                     parseInt(el.css('border-bottom-width'));
    dragObj.borderHeight = 0;
    dragObj.docHeight = $(document).height();
    var tableHeight = el.closest('table').height();

    // get dimensions and position of column that was clicked
    dragObj.colWidth = el.width() + colPadding;
    dragObj.startXPos = el.position().left;
    var startYPos = el.position().top;

    //create a replica shadow with same column width, height, and starting position
    $('#mainFrame').prepend('<div class="shadowDiv" style="width:'+(dragObj.colWidth+5)+
                        'px;height:'+(tableHeight)+'px;left:'+(dragObj.startXPos)+
                        'px;top:'+(startYPos)+'px;"></div>');

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
    var newXPos = dragObj.startXPos + (event.pageX - dragObj.mouseStart);
    $('.fauxCol').css('left', newXPos);
}

function dragdropMouseUp() {
    mouseStatus = null;
    $('.shadowDiv, .fauxCol, .dropTarget, #moveCursor').remove();
    var head = $("#autoGenTable th span");
    var name = $.trim(head.eq(dragObj.colIndex).text());
    if (name == "") {
        name = $.trim(head.eq(dragObj.colIndex).children('input').val());
    }
    // only pull col if column is dropped in new location
    if ((dragObj.colIndex+1) != dragObj.colId) { 
        var width = dragObj.colWidth-colPadding;
        console.log(dragObj.colId, dragObj.colIndex);
        delCol("closeButton"+(dragObj.colId), false);
        addCol(("headCol"+dragObj.colIndex), name, 
            {width : (dragObj.colWidth-colPadding)});
        pullCol(name, (dragObj.colIndex+1));
        console.log(dragObj.colIndex+1);
        // $("#sumFn"+(dragObj.colIndex+1)).removeClass("unusedCell");
    }
    reenableTextSelection(); 
}

function cloneCellHelper(obj) {
    var td = $(obj).children();
    var row = $("<tr></tr>");
    var rowColor = $(obj).css('background-color');
    var clone = td.eq(dragObj.colIndex).clone();
    var cloneHeight = parseInt(td.eq(dragObj.colIndex).outerHeight());
    var cloneColor = td.eq(dragObj.colIndex).css('background-color');
    row.css('background-color', rowColor);
    clone.outerHeight(cloneHeight);
    clone.width(dragObj.colWidth);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($(".fauxCol"));
}

function createTransparentDragDropCol(startYPos) {
    $('#mainFrame').append('<table id="autoGenTable" class="fauxCol" style="left:'+
                        (dragObj.startXPos)+'px;top:'+(startYPos)+'px;width:'+
                        (dragObj.colWidth)+'px"></table>');

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
    $('#autoGenTable thead tr').each(function(i, ele) {
            cloneCellHelper(ele);
    });

    // Just do 50 cols for fun now.
    var count = 0;
    $('#autoGenTable tbody tr').each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= 50) {
                return (false);
            }
    });

    // Clone tail
    $('#autoGenTable tfoot tr').each(function(i, ele) {
        cloneCellHelper(ele);
    });
}


function createDropTargets() {
    // var offset = distance from the left side of dragged column
    // to the point that was grabbed
    var offset = dragObj.mouseStart - dragObj.colOffLeft;
    var dragMargin = 30; // targets extend this many pixels to left of each column
    $('.dropTarget').remove(); 
    var i = 0;
    $('#autoGenTable th:not(:last)').each(function(){
        var colLeft = $(this).offset().left;
        if ((dragObj.colWidth-dragMargin) < Math.round(0.5*$(this).width())) {
            var targetWidth = dragObj.colWidth;
        } else {
            var targetWidth = Math.round(0.5*$(this).width())+dragMargin;
        }
        var dropTarget = '<div id="dropTarget'+i+'" class="dropTarget"'+
                        'style="left:'+(colLeft-dragMargin+offset)+'px;'+
                        'width:'+targetWidth+'px;height:'
                        +(dragObj.docHeight)+'px;">'+
                        '</div>';
        $('body').append(dropTarget);
        i++;
    });

    $('.dropTarget').mouseenter(function(){
        var dropTargetId = parseInt(($(this).attr('id')).substring(10));
        if (dropTargetId != dragObj.colIndex && dropTargetId != 0) {
            var nextCol = Math.abs(dropTargetId-dragObj.colIndex);
            if (dropTargetId>dragObj.colIndex) {
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
            $('.shadowDiv').css('left', $('#autoGenTable #'+dragObj.id).position().left); 
            dragObj.colIndex = dropTargetId;
            createDropTargets(dragObj);
        }
    });
}

function documentReadyCatFunction() {
    readFromStorage();
    documentReadyCommonFunction();
    convertColNamesToArray();
    // XXX: Should this be called here or at the end? I think it should be here
    // or I may end up attaching 2 listeners?
    resizableColumns();
    var index = getIndex(tableName);
    if (index) {
        console.log("Stored "+tableName);
        getNextPage(resultSetId, true);
        // XXX Move this into getPage
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           numEntriesPerPage);
        keyName = tableOfEntries.meta.keysAttrHeader.name;
        console.log(index);
        for (var i = 0; i<index.length; i++) {
            if (index[i].name != "JSON") {
                addCol("headCol"+(index[i].index), index[i].name,
                      {width: index[i].width, resize: true});
                pullCol(index[i].name, 1+index[i].index);
            } else {
                $("#headCol"+(index[i].index+1)).css("width", 
                    index[i].width+colPadding+columnBorderWidth);
            }
        }
    } else {
        console.log("Not stored "+tableName);
        getNextPage(resultSetId, true);
    }
}

function documentReadyIndexFunction() {
    $(document).ready(function() {
        menuBarArt();
        monitorOverlayPercent();
        menuAreaClose();
        // displayTable();
        getTablesAndDatasets();
        documentReadyCatFunction();
        // for (var i = 0; i<5; i++) {
        //     addCol("headCol2", 5-i, {resize: true});
        // }
        fillPageWithBlankCol();
        goToPage(currentPageNumber);
        infScrolling();     
    });

    // documentReadyCommonFunction();
    // generatePages();
    // showHidePageTurners();
}

function rescolDelWidth(id, resize) {
    var id = parseInt(id.substring(11));
    var delTd = $('#autoGenTable th').eq(id-1)
    var delTdWidth = delTd.outerWidth();
    if (resize == false) {
        console.log('here', delTdWidth, tableWidth)
        var tableWidth = $('#autoGenTable').width();
        $('#autoGenTable').width(tableWidth - delTdWidth);
    } else {
        var adjustedTd = $('#autoGenTable th').eq(id);
        if (adjustedTd.length < 1) {
            adjustedTd = $('#autoGenTable th').eq(id-2);
            adjustedTd.children('.colGrab').remove();
        }
        var adjustedTdWidth = adjustedTd.width();
        adjustedTd.width(adjustedTdWidth+delTdWidth);
    }
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

function sortRows(fieldName) {
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    var convertedIndex = convertColNamesToIndexArray();
    setIndex(newTableName, convertedIndex);
    console.log(convertedIndex);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    var datasetId = $("#datastorePanel .monitorSubDiv")[1].innerHTML;
    console.log(datasetId);
    XcalarIndexFromDataset(datasetId, fieldName, newTableName);
    checkStatus(newTableName);
    // XXX: IndexFromTable is not implemented yet. So we're hacking the shit out
    // of this right now
    // XcalarIndexFromTable(tableName, fieldName, newTableName);
}

function filterCol(operator, value) {
    console.log(tableName);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempFilterTable"+rand;
    var convertedIndex = convertColNamesToIndexArray();
    setIndex(newTableName, convertedIndex);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarFilter(operator, value, tableName, newTableName);
    checkStatus(newTableName);
}

function joinTables(rightTable) {
    console.log("Joining "+tableName+" and "+rightTable);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempJoinTable"+rand;
    var convertedIndex = convertColNamesToIndexArray();
    setIndex(newTableName, convertedIndex);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarJoin(tableName, rightTable, newTableName);
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
                value = '<span class="jArray jInfo" data-key="'+key+'">'+value+'</span>, ';
            }
            break;
        case ('number'):
            value = '<span class="jNum">'+value+'</span>';
            if (options.inarray) {
                value = '<span class="jArray jInfo" data-key="'+key+'">'+value+'</span>,';
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
                value = '[<span class="jArray jInfo" data-key="'+key+'">'+prettifyJson(value, indent, options)+'</span>],';
            } else {
                var object = prettifyJson(value, indent+'&nbsp;&nbsp;&nbsp;&nbsp;');
                value = '{\n'+object +indent+'}'
                if (options.inarray) {
                    value = '<span class="jArray jInfo" data-key="'+key+'">'+value+'</span>,';
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
    return (result.replace(/\,<\/div>$/, "</div>").replace(/\, $/, "").replace(/\,$/, "")); 
    // .replace used to remove comma if last value in object
}

function createJsonNestedField(el) {
    var obj = "";
    el.parents('.jInfo').each(function(){
        var key = "";
        if ($(this).parent().hasClass('jArray') && !$(this).hasClass('jsonBlock')) {
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

function showJsonPopup(el) {console.log('here')
    var jsonString = $.parseJSON(el.children().children('.elementText').text());
    var newString = prettifyJson(jsonString);
    $('.jObject').html(newString);
    $('#jsonModal, #jsonModalBackground').show();
    $('body').addClass('hideScroll');
    window.getSelection().removeAllRanges();

    
    $('.jKey, .jArray>.jString, .jArray>.jNum').click(function(){
        var name = createJsonNestedField($(this));
        var id = $('.jsonColHead').attr('id');
        var colIndex = parseInt(id.substring(7));
        addCol(id, name, {direction: "L", resize: false, select: false});
        pullCol(name, colIndex);
        $('#jsonModal, #jsonModalBackground').hide();
        $('body').removeClass('hideScroll');
    });
}
