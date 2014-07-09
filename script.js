// JavaScript Document
// Menu Bar JS
var selectedTab = 1;
var numTabs = 3;
var tableRowIndex = 1;

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
                        <a href="javascript:addTab();">\
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
                    bgcolor="#e77e23">\
                    <a class="menuItems" onClick="loadMainContent(\'' + page + '\')">'+
					  text + '</a></td>');
}

function resetAutoIndex() {
	tableRowIndex = 1;
}

function generateRowWithAutoIndex(text) {
	$("#autoGenTable tr:last").after('<tr><td height="17" align="center" bgcolor="#FFFFFF" class="monacotype">'
                    +tableRowIndex+'</td><td height="17" bgcolor="#FFFFFF" class="monacotype">'
                    +text+'</td></tr>');
	tableRowIndex++;
}

function tgenerateRowWithAutoIndex(text) {
	$("#tautoGenTable tr:last").after('<tr><td height="17" align="center" bgcolor="#FFFFFF" class="monacotype">'
                    +tableRowIndex+'</td><td height="17" bgcolor="#FFFFFF" class="monacotype">'
                    +text+'</td></tr>');
	tableRowIndex++;
}
