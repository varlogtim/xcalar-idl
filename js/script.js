// JavaScript Document
// Menu Bar JS
var selectedTab = 1;
var numTabs = 3;
var tableRowIndex = 1;
var currentPageNumber = 0;
var numEntriesPerPage = 12;
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
    $("#menuBar div").on("click", function() {
        $("#menuBar div").removeClass("menuSelected");
        $(this).addClass("menuSelected");
        switch ($(this).text()) {
        case ("datastore"):
            $("#menuArea").show();
            $("#datastorePanel").show();
            $("#datastorePanel").siblings().each(function() {
                $(this).hide();
            }); 
            break;
        case ("monitor"):
            $("#menuArea").show();
            $("#monitorPanel").show();
            $("#monitorPanel").siblings().each(function() {
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
    
    $('#autoGenTable th:eq(2)').after('<th class="pinkCell">Header</th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="pinkCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="pinkCell"></td>');

    $('#autoGenTable th:eq(2)').after('<th class="darkCell"></th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="darkCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="darkCell"></td>');
}

function getTables() {
    var tables = XcalarGetTables();
    var numTables = tables.numTables;
    var i;
    for (i = 0; i<numTables; i++) {
        console.log(tables.tables[i].tableName);
        var datasetDisplay = '<div class="dataset datasetName">'+
                                 '<span>DATA<br>SET</span>'+
                             '</div>'+
                             '<div class="monitorSubDiv">'+
                                  tables.tables[i].tableName+
                             '</div>';
        $("#datastorePanel div:last").after(datasetDisplay);
    }
    monitorOverlayPercent();
    // XXX: UNCOMMENT!
    // resizableColumns();
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
    console.log(pageNumber+1);
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
    console.log(headingsArray);
    if (headingsArray != null && headingsArray.length > 2) {
        var numRemoved = 0;
        for (var i = 1; i<headingsArray.length; i++) {
            if (headingsArray[i] !== "JSON") {
                console.log("deleted: "+headingsArray[i]);
                var indName = {index: i,
                               name: headingsArray[i],
                               width: $("#headCol"+(i+1-numRemoved)).width()};
                delCol("closeButton"+(i+1-numRemoved), false);
                numRemoved++;
                indices.push(indName);
            }
        }
    }
    $("#autoGenTable tbody").find("tr:gt(0)").remove();
    var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           numEntriesPerPage);
    // console.log(tableOfEntries.meta.fieldAttr.name);
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
        generateRowWithAutoIndex2(value, indexNumber+i+1);
    }
    if (firstTime) {
        if (headingsArray.length != 2) {
            console.log("BUG BUG BUG");
            alert("Possible bug");
            console.log(headingsArray)
        }
        keyName = tableOfEntries.meta.fieldAttr.name;
        var indName = {index: 1,
                       name: keyName,
                       width: newCellWidth};
        indices.push(indName); 
        resize = true;
    }
 
    for (var i = 0; i<indices.length; i++) {
        addCol("headCol"+(indices[i].index), indices[i].name,
                {width: indices[i].width, resize: resize});
        pullCol(indices[i].name, 1+indices[i].index);
    }
    showHidePageTurners();
    $('.jsonElement').dblclick(function(){
        showJsonPopup($(this));
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
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)"'+
        ' onclick="javascript: window.location.href=\'cat_table.html?'+
        'tablename='+
        URIEncoded+'\'">'+
        '<div class="cellRelative"><span '+clickable+'>'+text+'</span>'+
        '<div class="dropdownBox"></div>'+
        '</div></td></tr>');
    tableRowIndex++;
}

function generateRowWithAutoIndex2(text2, idNo) {
    $("#autoGenTable tbody").append('<tr>'+
        '<td height="17" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        idNo+"c1"+'">'
        +idNo+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="jsonElement monacotype" id="bodyr'+
        idNo+"c2"+'">'+
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

function pullCol(key, newColid) {
    console.log(arguments)
    if (/\.([0-9])/.test(key)) {//check for dot followed by number (invalid)
        return;
    }
    var colid = $("#autoGenTable th:contains('JSON')").filter(
        function() {
            return $(this).text().indexOf("JSON") != -1;
    }).attr("id");

    colid = colid.substring(7);
    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
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
 
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+value+"</div></div>";
        $("#bodyr"+i+"c"+newColid).html(value); 

    }    
}

function addCol(id, name, options) {
    console.log('addCol()', arguments);
    var numCol = $("#autoGenTable th").length;
    var colid = parseInt(id.substring(7));
    var newColid = colid;
    var options = options || {};
    var width = options.width || newCellWidth;
    var resize = options.resize || false;
    if (options.direction != "L") {
        newColid += 1;
    }
    if (name == null) {
        var name = "New Heading";
        var select = true;
        var resize = true;
    } else {
        var select = false;
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
    }        
    
    var columnHeadTd = '<th class="table_title_bg editableCol'+
        '" id="headCol'+
        newColid+
        '" style="height:17px; width:'+(width+colPadding+columnBorderWidth)+'px;">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox"></div>'+
        '<span><input type="text" id="rename'+newColid+'" '+
        'class="editableHead" '+
        'value="'+name+'"/></span>'+
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
            '<li>Duplicate the column</li>'+
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
    // $('#headCol'+newColid).append(dropDownHTML);

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
        var newCellHTML = '<td height="17" bgcolor="#FFFFFF"'+
            'class="monacotype" id="bodyr'+i+"c"+(newColid)+
            '"'+
            '>&nbsp;</td>';
        if (newColid > 1) {
            $("#bodyr"+i+"c"+(newColid-1)).after(newCellHTML);
        } else {
            $("#bodyr"+i+"c"+(newColid+1)).before(newCellHTML);
        }
    }
    $('#autoGenTable tfoot tr').append('<td>SumFn</td>');

    $("#headCol"+newColid).click(function() {
        $(this).select();
    });
    $("#headCol"+newColid+" .editableHead").keypress(function(e) {
      if (e.which==13) {
        var thisId = parseInt($(this).closest('.table_title_bg').
                     attr('id').substring(7));
        pullCol($(this).val(), thisId);
        $(this).blur();
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
    });

    $('#renameCol'+colId).click(function() {
        var index = $(this).attr('id').substring(9);
        $('#rename'+index).select();
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
        headings.push($.trim(head.eq(i).text()));
        if (headings[i] == "") {
            headings.pop();
            headings.push($.trim(head.eq(i).children('input').val()));
        }
    }
    return headings;
}

// XXX: FIXME: This does not preserve undefined columns!!!
function convertColNamesToIndexArray() {
    var head = $("#autoGenTable th");
    var numCol = head.length;
    var headings = [];
    for (var i = 2; i<numCol; i++) {
        var indexObj = {
            index: i-1,
            name: $("#headCol"+i).children("span").children("input").val(),
            width: $("#headCol"+i).width()
        };
        headings.push(indexObj);
    }
    console.log(headings);
    return headings;
}

function resizableColumns(resize, newWidth) {
    console.log('resizableColumns()');

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
    $('#pageInput').width((""+resultSetCount).length*6+8);
    $('#pageInput').keypress(function(e) {
        if (e.which === 13) {
            val = $('#pageInput').val();
            if (val == "") {
                return;
            } else if (val < 1) {
                $('#pageInput').val('1');
            } else if (val > resultSetCount) {
                $('#pageInput').val(resultSetCount);
            }
            $(this).blur(); 
        }
    });

    $('#pageForm').submit(function(e) {
        e.preventDefault();
        goToPage(Math.ceil(parseInt($('#pageInput').val())/numEntriesPerPage)-1);
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
    }
    reenableTextSelection(); 
}

function createTransparentDragDropCol(startYPos) {
    $('#mainFrame').append('<table id="autoGenTable" class="fauxCol" style="left:'+
                        (dragObj.startXPos)+'px;top:'+(startYPos)+'px;width:'+
                        (dragObj.colWidth)+'px"></table>');

    $('#autoGenTable tr').each(function(){
        var td = $(this).children();
        var row = $("<tr></tr>");
        var rowColor = $(this).css('background-color');
        var clone = td.eq(dragObj.colIndex).clone();
        var cloneHeight = parseInt(td.eq(dragObj.colIndex).outerHeight());
        var cloneColor = td.eq(dragObj.colIndex).css('background-color');
        row.css('background-color', rowColor);
        clone.outerHeight(cloneHeight);
        clone.width(dragObj.colWidth);
        clone.css('background-color', cloneColor);
        row.append(clone).appendTo($(".fauxCol"));
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
        getNextPage(resultSetId, false);
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(resultSetId,
                                           numEntriesPerPage);
        keyName = tableOfEntries.meta.fieldAttr.name;
        for (var i = 0; i<index.length; i++) {
            addCol("headCol"+(index[i].index), index[i].name,
                  {width: index[i].width, resize: true});
            pullCol(index[i].name, 1+index[i].index);
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
        getTables();

        // documentReadyCommonFunction();
        // XXX uncomment above?



        documentReadyCatFunction();

        for (var i = 0; i<5; i++) {
            addCol("headCol2", 5-i, {resize: true});
        }
    });

    // documentReadyCommonFunction();
    // generatePages();
    // showHidePageTurners();
}

function rescolDelWidth(id, resize) {
    var id = parseInt(id.substring(11));
    var delTd = $('#autoGenTable tr:first td').eq(id-1)
    var delTdWidth = delTd.width();
    if (resize == false) {
        var tableWidth = $('#autoGenTable').width();
        $('#autoGenTable').width(tableWidth - delTdWidth - colPadding - columnBorderWidth);
    } else {
        var adjustedTd = $('#autoGenTable tr:first td').eq(id);
        if (adjustedTd.length < 1) {
            adjustedTd = $('#autoGenTable tr:first td').eq(id-2);
            adjustedTd.children('.colGrab').remove();
        }
        var adjustedTdWidth = adjustedTd.width();
        adjustedTd.width(adjustedTdWidth+delTdWidth+colPadding+columnBorderWidth);
    }
}

// XXX: Dedupe with checkLoad!!!!
function checkStatus(newTableName) {
    var refCount = XcalarGetTableRefCount(newTableName);
    console.log(refCount);
    if (refCount == 1) {
        $("body").css({"cursor": "default"});
        console.log("Done loading");
        window.location.href="cat_table.html?tablename="+newTableName;
    } else {
        // Check twice per second
        setTimeout(function() {
            checkStatus(newTableName);
        }, 500);
    }
}

function sortRows(fieldName) {
    console.log(fieldName);
    console.log(tableName);
    var rand = Math.floor((Math.random() * 100000) + 1);
    var newTableName = "tempSortTable"+rand;
    var convertedIndex = convertColNamesToIndexArray();
    setIndex(newTableName, convertedIndex);
    commitToStorage(); 
    $("body").css({"cursor": "wait"}); 
    XcalarLoadFromIndex(tableName, fieldName, newTableName);
    checkStatus(newTableName);
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

function showJsonPopup(el) {
    var jsonString = $.parseJSON(el.children('.elementText').text());
    var newString = prettifyJson(jsonString);
    $('.jObject').html(newString);
    $('#jsonModal, #jsonModalBackground').show();
    $('body').addClass('hideScroll');
    window.getSelection().removeAllRanges();
    
    $('.jKey, .jArray>.jString, .jArray>.jNum').click(function(){
        var name = createJsonNestedField($(this));
        var id = $('.jsonColHead').attr('id');
        var colIndex = parseInt(id.substring(7));
        addCol(id, name, {direction: "L", resize: true, select: false});
        pullCol(name, colIndex);
        $('#jsonModal, #jsonModalBackground').hide();
        $('body').removeClass('hideScroll');
    });
}
