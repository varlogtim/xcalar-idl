// JavaScript Document
// Menu Bar JS
var selectedTab = 1;
var numTabs = 3;
var tableRowIndex = 1;
var currentPageNumber = 0;
var numEntriesPerPage = 12;
var tableName = "";
var resultSetId = 0;

function setTabs() {
    var i;
    for (i = 1; i<=numTabs; i++) {
        dataSourceMouseOver(i);
    }
    dataSourceClick(1);
}

function loadMainContent(op) {
    $("#leftFrame").load(op.concat('_l.html'));
    $("#mainFrame").load(op.concat('_r.html'));
}

function dataSourceMouseOver(tabNumber) {
    var left = "tab" + tabNumber + "l";
    var center = "tab" + tabNumber + "c";
    var right = "tab" + tabNumber + "r";
  
    var vanishRight = "tab" + (tabNumber+1) + "l";
    var vanishLeft = "tab" + (tabNumber-1) + "r";
  
    if (tabNumber != 1) {
        if (tabNumber-1 == selectedTab) {
            document.getElementById(left).src = "images/white_m.png";
        } else {
            document.getElementById(vanishLeft).src = "images/light_m.png";
            document.getElementById(left).src = "images/light_l.png";
        }
    }
    document.getElementById(center).style.backgroundImage =
        "url('images/light_m.png')";
    if (tabNumber != numTabs) {
        if (tabNumber+1 == selectedTab) {
            document.getElementById(right).src = "images/white_m.png";
        } else {
            document.getElementById(vanishRight).src = "images/light_m.png";
            document.getElementById(right).src = "images/light_r.png";
        }
    } else {
        document.getElementById(right).src = "images/light_r.png";
    }
}

function dataSourceMouseOut(tabNumber) {
    var left = "tab" + tabNumber + "l";
    var center = "tab" + tabNumber + "c";
    var right = "tab" + tabNumber + "r";
  
    var vanishRight = "tab" + (tabNumber+1) + "l";
    var vanishLeft = "tab" + (tabNumber-1) + "r";
  
    if (tabNumber != 1) {
        document.getElementById(left).src = "images/dark_m.png";
        if (tabNumber-1 != selectedTab) {
            document.getElementById(left).src = "images/dark_m.png";
            document.getElementById(vanishLeft).src = "images/dark_r.png";
        } else {
            document.getElementById(left).src = "images/white_m.png";
            document.getElementById(vanishLeft).src = "images/white_r.png";
        }
    }
    document.getElementById(center).style.backgroundImage =
        "url('images/dark_m.png')";
    document.getElementById(right).src = "images/dark_r.png";
    if (tabNumber != numTabs) {
        if (tabNumber+1 != selectedTab) {
            document.getElementById(right).src = "images/dark_m.png";
            document.getElementById(vanishRight).src = "images/dark_r.png";
        } else {
            document.getElementById(right).src = "images/white_m.png";
            document.getElementById(vanishRight).src = "images/white_l.png";
        }
    }
}

function dataSourceClick(tabNumber) {
    selectedTab = tabNumber;
    var left = "tab" + tabNumber + "l";
    var center = "tab" + tabNumber + "c";
    var right = "tab" + tabNumber + "r";
  
    var vanishRight = "tab" + (tabNumber+1) + "l";
    var vanishLeft = "tab" + (tabNumber-1) + "r";
  
    if (tabNumber != 1) {
        document.getElementById(left).src = "images/white_l.png";
        document.getElementById(vanishLeft).src = "images/white_m.png";
    }
  
    document.getElementById(center).style.backgroundImage =
        "url('images/white_m.png')";
    document.getElementById(right).src = "images/white_r.png";
    if (tabNumber != numTabs) {
        document.getElementById(vanishRight).src = "images/white_m.png";
    }
  
    // Disable onmouseout
    document.getElementById(center).onmouseout = function() {null};
    document.getElementById(center).onmouseover = function() {null};
  
    // Enable mouseover and mouseout for other elements
    var index;
    for (index = 1; index <= numTabs; index++) {
        if (index != tabNumber) {
            var tabName = "tab" + index + "c";
            var func1 = "dataSourceMouseOver(" + index + ");";
            var func2 = "dataSourceMouseOut(" + index + ");";
            document.getElementById(tabName).onmouseover = new Function(func1);
            document.getElementById(tabName).onmouseout = new Function(func2);
            document.getElementById(tabName).onmouseout();
        }
    }
}

function generateTabs() {
    var i;
    document.write('<td class="dataSourceMenu" id="tab1c"\
    onMouseOver="dataSourceMouseOver(1);"\
    onMouseOut="dataSourceMouseOut(1);"\
    onClick="dataSourceClick(1);">\
    &nbsp;&nbsp;DataSource-1&nbsp;&nbsp;\
    </td>\
    <td class="dataSourceMenu">\
      <img src="images/dark_l.png" height="25px" id="tab2l">\
    </td>');
    for (i = 2; i<=numTabs; i++) {
        document.write('\
          <td class="dataSourceMenu">\
            <img src="images/dark_r.png" height="25px" id="tab'+(i-1)+'r">\
          </td>\
          <td class="dataSourceMenu" id="tab'+i+'c"\
            onMouseOver="dataSourceMouseOver('+i+');"\
            onMouseOut="dataSourceMouseOut('+i+');"\
            onClick="dataSourceClick('+i+');">\
            &nbsp;&nbsp;DataSource-'+i+'&nbsp;&nbsp;\
          </td>');
          if (i < numTabs) {
           document.write('<td class="dataSourceMenu">\
                            <img src="images/dark_l.png" height="25px"\
                            id="tab'+(i+1)+'l">\
                            </td>');
          } else {
              document.write('<td class="dataSourceMenu">\
                                   <img src="images/dark_r.png" height="25px"\
                                     id="tab'+i+'r">\
                             </td>');
          }
    }
    document.write('<td id="addTabButton">\
                        <a href="javascript:addTab();" class="addTabBg">\
                            <img src="images/add-data-grey.png"\
                                 alt="Add Data Source" width="33" height="16"\
                                 id="Image7">\
                        </a>\
                    </td>\
                   ');
}

function addTab() {
    var lastTabR = document.getElementById("tab"+numTabs+"r");
    lastTabR.setAttribute("src","images/dark_l.png");
    numTabs++;
    lastTabR.setAttribute("id", ("tab"+numTabs+"l"));
    $("#addTabButton").remove();
    $("#tabsArea tr").append('\
        <td class="dataSourceMenu">\
            <img src="images/dark_r.png" height="25px"\
                 id="tab'+(numTabs-1)+'r">\
        </td>\
        <td class="dataSourceMenu" id="tab'+numTabs+'c"\
            onMouseOver="dataSourceMouseOver('+numTabs+');"\
            onMouseOut="dataSourceMouseOut('+numTabs+');"\
            onClick="dataSourceClick('+numTabs+');">\
            &nbsp;&nbsp;DataSource-'+numTabs+'&nbsp;&nbsp;\
        </td>\
        <td class="dataSourceMenu">\
            <img src="images/dark_r.png" height="25px" id="tab'+numTabs+'r">\
        </td>\
    ');
    for (var i = 1; i<=numTabs; i++) {
        if (i != selectedTab) {
            dataSourceMouseOver(i);
            dataSourceMouseOut(i);
        }
    }
    $("#tabsArea tr").append('\
        <td id="addTabButton">\
            <a href="javascript:addTab();">\
                <img src="images/add-data-grey.png"\
                    alt="Add Data Source" width="33" height="16" id="Image7">\
            </a>\
        </td>\
    ');
}

function generateBar(width, text, page) {
    document.write('<td width="' + width + 
                    '" height="40" align="center" class="helvertica_grey"\
                    onMouseOver="this.bgColor=\'#d55401\'"\
                    onMouseOut="this.bgColor=\'#e77e23\'"\
                    bgcolor="#e77e23" onClick="loadMainContent(\'' + page +
                    '\');">\
                    <a class="menuItems" onClick="loadMainContent(\'' + page +
                    '\')">'+ text + '</a></td>');
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
    console.log(currentPageNumber);
    if (currentPageNumber == 1) {
        console.log("First page, cannot move");
        return;
    }
    var currentPage = currentPageNumber;
    var prevPage = currentPage-1;
    var prevPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == prevPage.toString();
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
    // XXX: TODO: Check whether we are already at the max
    var currentPage = currentPageNumber;
    var nextPage = currentPage+1;

    var nextPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == nextPage.toString();
    });
    if (nextPageElement.length) {
        selectPage(nextPage);
        deselectPage(currentPage);
        getNextPage(resultSetId);
    } else {
        goToPage(nextPage-1);
    }
}

function goToPage(pageNumber) {
    deselectPage(currentPageNumber);
    currentPageNumber = pageNumber+1;
    var startNumber = pageNumber-5;
    if (startNumber < 0) {
        startNumber = 0;
    }
    generatePages(10, startNumber, true); 
    selectPage(pageNumber+1);
    XcalarSetAbsolute(resultSetId, (currentPageNumber-1)*numEntriesPerPage);
    getPage(resultSetId);
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

function generatePages(number, startNumber, rightDots) {
    var htmlString = '\
          <table height="35" width="1365" class="noBorderTable"\
          id="pageTurnerNumberBar">\
            <tr>\
              <td height="35" width="956" bgcolor="#FFFFFF"></td>\
              <td height="35" width="409" bgcolor="#FFFFFF" align="right">\
              <table class="noBorderTable" style="height: 35;max-width: 389;">\
              <tr>\
              <td width="45" height="35" align="right" bgcolor="#FFFFFF"\
              class="pageTurner" id="pageTurnerLeft">\
                  <a href="javascript:goToPrevPage();" class="pageTurner">\
                  < Prev</a>\
              </td>';
    if (startNumber > 0) {
        // There are previous pages
        htmlString += '\
              <td height="35" width="20" align="right" class="pageTurner">\
                <a href="javascript:goToPage(';
        htmlString += (startNumber-5);
        htmlString += ');" class="pageTurner">...</a></td>';
    }
    var i;
    for (i = 0; i<number; i++) {
        htmlString += '\
              <td height="35" width= "35" class="pageTurnerPage">\
                <center>\
                  <a href="javascript:goToPage(';
        htmlString += (i+startNumber);
        htmlString += ');" class="pageTurnerPageNumber">';
        htmlString += (i+1+startNumber);
        htmlString += '</a>\
                </center>\
              </td>';
    }
    
    if (rightDots) {
        // There are previous pages
        htmlString += '\
              <td height="35" width="20" align="left" class="pageTurner">\
                <a href="javascript:goToPage(';
        htmlString += (startNumber+number+5);
        htmlString += ');" class="pageTurner">...</a></td>';
    }

    htmlString += '\
              <td height="35" width="44" id="pageTurnerRight"\
              bgcolor="#FFFFFF">\
              <a href="javascript:goToNextPage();" class="pageTurner">\
              Next ></a>\
              </td>\
              </tr>\
              </table>\
              </td>\
              <td height="35" bgcolor="#FFFFFF" class="spaceFiller"></td>\
            </tr>\
          </table>\
          ';
    $("#pageTurnerNumberBar").html(htmlString);
}

function resetAutoIndex() {
    tableRowIndex = 1;
}

function getNextPage(resultSetId) {
    if (resultSetId == 0) {
        return;
    }
    currentPageNumber++;
    getPage(resultSetId);
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

function getPage(resultSetId) {
    if (resultSetId == 0) {
        return;
        // Reached the end
    }
    var indices = [];
    var headingsArray = convertColNamesToArray();

    if (headingsArray != null && headingsArray.length > 3) {
        var numRemoved = 0;
        for (var i = 1; i<headingsArray.length; i++) {
            if (headingsArray[i] !== "JSON" &&
                headingsArray[i] !== "Key") {
                console.log("deleted: "+headingsArray[i]);
                delCol("closeButton"+(i+1-numRemoved));
                numRemoved++;
                var indName = {index: i,
                               name: headingsArray[i]};
                indices.push(indName);
            }
        }
    }
    $("#autoGenTable").find("tr:gt(0)").remove();
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
        var key = tableOfEntries.records[i].key;
        var value = tableOfEntries.records[i].value;
        generateRowWithAutoIndex2(key, value, indexNumber+i+1);
    }
    for (var i = 0; i<indices.length; i++) {
        addCol("headCol"+(indices[i].index), indices[i].name);
        pullCol(indices[i].name, 1+indices[i].index);
    }
}

function generateNewTableHeading() {
    $("#autoGenTable").append('\
      <tr>\
        <td width="3%" height="17" class="table_title_bg" id="headCol1">\
          <strong>ID</strong>\
        </td>\
        <td width="auto" height="17" class="table_title_bg" id="headCol2">\
          <strong>Key</strong>\
        </td>\
        <td width="auto" height="17" class="table_title_bg" id="headCol3">\
          <strong>JSON</strong>\
        </td>\
      </tr>\
    ');
    $(document).on('dblclick', '.table_title_bg', function(event) {
       addCol($(this).attr("id"));
    });
}

function generateRowWithAutoIndex(text) {
    var URIEncoded = encodeURIComponent(text);
    console.log(URIEncoded);
    $("#autoGenTable tr:last").after('<tr><td height="17" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'+
        tableRowIndex+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)"'+
        ' ondblclick="javascript: window.location.href=\'cat_table.html?'+
        'tablename='+
        URIEncoded+'\'">'+
        text+'</td></tr>');
    tableRowIndex++;
}

function generateRowWithAutoIndex2(text1, text2, idNo) {
    // text1 is an int since it's the key
    $("#autoGenTable tr:last").after('<tr>'+
        '<td height="17" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        idNo+"c1"+'" onmouseover="javascript: console.log(this.id)">'
        +idNo+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        idNo+"c2"+'" onmouseover="javascript: console.log(this.id)">'+
        text1+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        idNo+"c3"+'" onmouseover="javascript: console.log(this.id)">'+
        '<div class="elementText">'+
        text2+'</div></td>'+
        '</tr>');
}

function delCol(id) {
    var numCol = $("#autoGenTable").find("tr:first td").length;
    var colid = parseInt(id.substring(11));
    $("#headCol"+colid).remove();
    for (var i = colid+1; i<=numCol; i++) {
        $("#headCol"+i).attr("id", "headCol"+(i-1));
        $("#closeButton"+i).attr("id", "closeButton"+(i-1));
    }
 
    var numRow = $("#autoGenTable tr").length;
    var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);

    for (var i = startingIndex; i<startingIndex+numRow-1; i++) {
        $("#bodyr"+i+"c"+colid).remove();
        for (var j = colid+1; j<=numCol; j++) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j-1));
        }
    }
}

function pullCol(key, newColid) {
    var colid = $("#autoGenTable tr:first-child td:contains('JSON')").filter(
        function() {
            return $(this).text().indexOf("JSON") != -1;
    }).attr("id");
    colid = colid.substring(7);
    var numRow = $("#autoGenTable tr").length;
    var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
 
    for (var i =  startingIndex; i<numRow+startingIndex-1; i++) {
        var jsonStr = $("#bodyr"+i+"c"+colid).text();
        var value = jQuery.parseJSON(jsonStr);

        var nested = key.split(".");
        for (var j = 0; j<nested.length; j++) {
            value = value[nested[j]];
            console.log(value)
        }    

        value = '<div class="addedBarText">'+value+"</div>"
        $("#bodyr"+i+"c"+newColid).html(value);
    }    
}

function addCol(id, name) {
    var numCol = $("#autoGenTable").find("tr:first td").length;
    var colid = parseInt(id.substring(7));
    for (var i = numCol; i>=colid+1; i--) {
        $("#headCol"+i).attr("id", "headCol"+(i+1));
        $("#closeButton"+i).attr("id", "closeButton"+(i+1));
    }
    if (name == null) {
        name = "New Heading";
    }
    $("#"+id).after(
        '<td contentEditable height="17" width="150" class="table_title_bg'+
        '" id="headCol'+
        (colid+1)+
        '" onmouseover="javascript: console.log(this.id)"'+
        '><strong>'+name+
        '</strong><img src="images/closeButton.png" '+
        'style="background-size: 15px 15px; float:right; cursor: pointer;'+
        'z-index: 3;"'+
        'onclick="javascript: delCol(this.id);" id="closeButton'+
        (colid+1)+'">'+
        '</td>');
 
    var numRow = $("#autoGenTable tr").length;
    var idOfFirstRow = $("#autoGenTable tr:eq(1) td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
    for (var i = startingIndex; i<startingIndex+numRow-1; i++) {
        for (var j = numCol; j>=colid+1; j--) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j+1));

        }
        $("#bodyr"+i+"c"+colid).after('<td height="17" bgcolor="#FFFFFF"'+
            'class="monacotype" id="bodyr'+i+"c"+(colid+1)+
            '" onmouseover="javascript: console.log(this.id)"'+
            '>&nbsp;</td>');
    }
     
    $("#headCol"+(colid+1)).click(function() {
        $(this).select();
    });

    $("#headCol"+(colid+1)).keypress(function(e) {
      if (e.which==13) {
        pullCol($(this).text(), (colid+1));
        $(this).blur();
      }
    });
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function getSearchBarText() {
    var tName = $("#searchBar").text();
    alert(tName);
}

function convertColNamesToArray() {
    var head = $("#autoGenTable tr:first-child td");
    var numCol = head.length;
    var headings = [];
    for (var i = 0; i<numCol; i++) {
        headings.push($.trim(head.eq(i).text()));
    }
    return headings;
}

// Auto run
$(document).on('dblclick', '.table_title_bg', function(event) {
  addCol($(this).attr("id"));
});
