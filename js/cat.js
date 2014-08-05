// Auto run
var tName = getUrlVars()["tablename"];
$("#searchBar").val('tablename = "'+tName+'"');
var tableName = tName;
var resultSetId = XcalarGetTableId(tableName);
