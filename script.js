// JavaScript Document
// Menu Bar JS
function loadMainContent(op) {
  $("#leftFrame").load(op.concat('_l.html'));
  $("#mainFrame").load(op.concat('_r.html'));
}