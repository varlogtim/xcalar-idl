// JavaScript Document
// Menu Bar JS
var selectedTab = 1;
var numTabs = 3;
var tableRowIndex = 1;
var currentPageNumber = 0;

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
  document.getElementById(center).style.backgroundImage = "url('images/light_m.png')";
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
  document.getElementById(center).style.backgroundImage = "url('images/dark_m.png')";
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
  
  document.getElementById(center).style.backgroundImage = "url('images/white_m.png')";
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
            <img src="images/dark_r.png" height="25px" id="tab'+(numTabs-1)+'r">\
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
	document.write('<td width="'+width+'" height="40" align="center" class="helvertica_grey"\
                    onMouseOver="this.bgColor=\'#d55401\'"\
                    onMouseOut="this.bgColor=\'#e77e23\'"\
                    bgcolor="#e77e23" onClick="loadMainContent(\'' + page +'\');">\
                    <a class="menuItems" onClick="loadMainContent(\'' + page + '\')">'+
					  text + '</a></td>');
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
    if (currentPageNumber == 0) {
        return;
    }
    var currentPage = currentPageNumber+1;
    var prevPage = currentPage-1;
    var prevPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == prevPage.toString();
    });
    if (prevPageElement.length) {
        selectPage(prevPage);
        deselectPage(currentPage);
        currentPageNumber--;
    } else {
        goToPage(prevPage-1);
    }
}

function goToNextPage() {
    // XXX: TODO: Check whether we are already at the max
    var currentPage = currentPageNumber+1;
    var nextPage = currentPage+1;

    var nextPageElement = $("a.pageTurnerPageNumber").filter(function() {
        return $(this).text() == nextPage.toString();
    });
    if (nextPageElement.length) {
        selectPage(nextPage);
        deselectPage(currentPage);
        currentPageNumber++;
    } else {
        goToPage(nextPage-1);
    }
}

function generatePages(number, startNumber, rightDots) {
    var htmlString = '\
          <table height="35" width="1365" class="noBorderTable"\
          id="pageTurnerNumberBar">\
            <tr>\
              <td height="35" width="956" bgcolor="#FFFFFF"></td>\
              <td height="35" width="409" bgcolor="#FFFFFF" align="right">\
              <table class="noBorderTable" style="height: 35; max-width: 389;">\
              <tr>\
              <td width="45" height="35" align="right" bgcolor="#FFFFFF"\
              class="pageTurner" id="pageTurnerLeft">\
                  <a href="javascript:goToPrevPage();" class="pageTurner">< Prev</a>\
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
              <a href="javascript:goToNextPage();" class="pageTurner">Next ></a>\
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

function generateRowWithAutoIndex(text) {
	$("#autoGenTable tr:last").after('<tr><td height="17" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'+tableRowIndex+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)">'+text+'</td></tr>');
	tableRowIndex++;
}

function generateRowWithAutoIndex2(text1, text2) {
    // text1 is an int since it's the key
	$("#autoGenTable tr:last").after('<tr>'+
        '<td height="17" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'
        +tableRowIndex+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)">'+
        text1+'</td>'+
        '<td height="17" bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        tableRowIndex+"c3"+'" onmouseover="javascript: console.log(this.id)">'+
        '<div class="elementText">'+
        text2+'</div></td>'+
        '</tr>');
	tableRowIndex++;
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
    for (var i = 1; i<numRow; i++) {
        $("#bodyr"+i+"c"+colid).remove();
        for (var j = colid+1; j<=numCol; j++) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j-1));
        }
    }
}

function addCol(id) {
    var numCol = $("#autoGenTable").find("tr:first td").length;
    var colid = parseInt(id.substring(7));
    for (var i = numCol; i>=colid+1; i--) {
        $("#headCol"+i).attr("id", "headCol"+(i+1));
        $("#closeButton"+i).attr("id", "closeButton"+(i+1));
    }
    $("#"+id).after('<td contentEditable height="17" class="table_title_bg" id="headCol'+
        (colid+1)+
        '" onmouseover="javascript: console.log(this.id)"'+
        '><strong>New Heading</strong><img src="images/closeButton.png" '+
        'style="background-size: 15px 15px; float:right; cursor: pointer;'+
        'z-index: 2;"'+
        'onclick="javascript: delCol(this.id);" id="closeButton'+
        (colid+1)+'">'+
        '</td>');
 
    var numRow = $("#autoGenTable tr").length;
    for (var i = 1; i<numRow; i++) {
        for (var j = numCol; j>=colid+1; j--) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j+1));

        }
        $("#bodyr"+i+"c"+colid).after('<td height="17" bgcolor="#FFFFFF"'+
            'class="monacotype" id="bodyr'+i+"c"+(colid+1)+'" onmouseover="javascript: console.log(this.id)">&nbsp;</td>');
    }
}

function goToPage(pageNumber) {
    deselectPage(currentPageNumber+1);
    currentPageNumber = pageNumber;
    var startNumber = pageNumber-5;
    if (startNumber < 0) {
        startNumber = 0;
    }
    generatePages(10, startNumber, true); 
    selectPage(pageNumber+1);
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function getSearchBarText() {
    var tName = $("#searchBar").text();
    alert(tName);
}
