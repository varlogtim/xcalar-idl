// JavaScript Document
// Menu Bar JS
var selectedTab = 0;
var numTabs = 3;

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
	  document.getElementById(left).src = "images/light_l.png";
	  document.getElementById(vanishLeft).src = "images/light_m.png";
  }
  document.getElementById(center).style.backgroundImage = "url('images/light_m.png')";
  document.getElementById(right).src = "images/light_r.png";
  if (tabNumber != 3) {
    document.getElementById(vanishRight).src = "images/light_m.png";
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
  for (index = 1; index <= 3; index++) {
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