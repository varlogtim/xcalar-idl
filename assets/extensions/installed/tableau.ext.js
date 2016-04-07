// XXX Do not use alertModal! Write your own for extensions!!!!
var intTimer;
window.UExtTableau = (function(UExtTableau, $) {
    UExtTableau.buttons = [
        {"buttonText": "Visualize",
         "fnName": "visualize",
         "arrayOfFields": []
        },
    ];

    UExtTableau.undoActionFn = undefined;
    UExtTableau.actionFn = function(colNum, tableId, functionName, argList) {
        switch (functionName) {
        case ("visualize"):
            closeMenu(argList["allMenus"]);
            visualizeInTableau(colNum, tableId);
            break;
        default:
            break;
        }
        var waitTime = 45;
        function initializeViz(vizName) {
            // First remove current div. This is because tableau sucks shit
            $("#extContent").empty();
            $("#extContent").append("<div id='"+vizName+
                                    "' class='vizArea'></div>");
            var $placeHolder = $("#"+vizName);
            var placeholderDiv = $placeHolder[0];
            var url = "https://10ay.online.tableau.com/t/xcalartableaucloud/views/"+
                       "Graphs/Bar&:original_view=yes&:showShareOptions=true"+
                       "&:showVizHome=yes&:embeded=yes&:refresh=yes";
            var options = {
                width: $placeHolder.width(),
                height: $placeHolder.height() - 20,
                hideTabs: false,
                hideToolbar: false,
                onFirstInteractive: function()
                {
                    workbook = viz.getWorkbook();
                    activeSheet = workbook.getActiveSheet();
                }
            };
            viz = new tableau.Viz(placeholderDiv, url, options);
        }

        function visualizeInTableau(colNum, tableId) {
            var isValidParam = (colNum != null && tableId != null);
            xcHelper.assert(isValidParam, "Invalid Parameters");
            var deferred    = jQuery.Deferred();
            var worksheet   = WSManager.getWSFromTable(tableId);
            var table       = gTables[tableId];
            var tableName   = table.tableName;
            var tableCols   = table.tableCols;
            var colType     = tableCols[colNum - 1].type;
            var colName     = tableCols[colNum - 1].name;
            var backColName = tableCols[colNum - 1].getBackColName();
            var newTables = [];
            
            if (colType !== "integer" && colType !== "float" &&
                colType !== "string" && colType !== "boolean") {
                console.error("Invalid col type!");
                xcHelper.assert(false,
                                "Sorry cannot visualize this column type");
            }
            
            var tempExportName = xcHelper.randName("tempGraph");

            xcFunction.exportTable(tableName, tempExportName, "Default",
                                   1, [backColName],["Value"], true)
            .then(function() {

                $("#extHeader .text").text("GENERATING VISUALIZATION");
                $("#extInstruction .text").text("Your column "+colName+
                    " is currently being visualized in Tableau. "+
                    "Please wait.");
                $("#extContent").empty().text(waitTime);
                ExtModal.show();
                intTimer = setInterval(function() {
                    var timeLeft = $("#extContent").text();
                    if (jQuery.isNumeric(timeLeft)) {
                        timeLeft = parseInt(timeLeft)-1;
                        if (timeLeft == 0) {
                            console.log("here");
                            clearInterval(intTimer);
                            initializeViz(tempExportName);
                        } else {
                            $("#extContent").text(timeLeft);
                        }
                    } else {
                        $("#extContent").text(waitTime);
                    }
                }, 1000);
            });
        }
    }
                    
    return (UExtTableau);
}({}, jQuery));

