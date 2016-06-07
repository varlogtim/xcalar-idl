// XXX Do not use alertModal! Write your own for extensions!!!!
window.UExtTableau = (function(UExtTableau, $) {
    UExtTableau.buttons = [{
        "buttonText"   : "Visualize",
        "fnName"       : "visualize",
        "arrayOfFields": []
    }];

    UExtTableau.actionFn = function(txId, colNum, tableId, functionName, argList) {
        var waitTime = 45;
        switch (functionName) {
            case ("visualize"):
                return visualizeInTableau(colNum, tableId);
            default:
                return PromiseHelper.reject("Invalid Function");
        }

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

            var options = {
                "format": DfFormatTypeT.DfFormatCsv,
                "splitType": ExSFFileSplitTypeT.ExSFFileSplitForceSingle,
                "headerType": ExSFHeaderTypeT.ExSFHeaderEveryFile,
                "createRule": ExExportCreateRuleT.ExExportCreateOnly,
                "csvArgs": {
                    "fieldDelim": "\t",
                    "recordDelim": "\n"
                }
            };

            xcFunction.exportTable(tableName, tempExportName, "Default",
                                   1, [backColName],["Value"], false, true,
                                   options)
            .then(function() {
                deferred.resolve();
                showModal(colName, waitTime);
                return waitForUpdate(waitTime);
            })
            .then(function() {
                initializeViz(tempExportName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    };

    function showModal(colName, waitTime) {
        $("#extHeader .text").text("GENERATING VISUALIZATION");
        $("#extInstruction .text").text("Your column " + colName +
                    " is currently being visualized in Tableau. " +
                    "Please wait.");

        var html = '<div class="tableauWaitingContainer">' +
                        '<div class="waitingTime">' +
                            '<span class="title">' +
                                'Wait Time:' +
                            '</span>' +
                            '<span class="text">' +
                                waitTime +
                            '</span>' +
                        '</div>' +
                        '<div class="progressContainer">' +
                            '<div class="progressBar" style="width:0px"></div>' +
                        '</div>' +
                    '</div>';
        $("#extContent").html(html);
        ExtModal.show();
    }

    function waitForUpdate(waitTime) {
        var deferred = jQuery.Deferred();
        var $waitTime = $("#extContent .waitingTime .text");
        var $progressContainer = $("#extContent .progressContainer");
        var $progressBar = $progressContainer.find(".progressBar");

        var intTimer = setInterval(function() {
            var timeLeft = $waitTime.text();
            if (jQuery.isNumeric(timeLeft)) {
                timeLeft = parseInt(timeLeft) - 1;
                // since the css has 1s transition, the prgoress
                // show be ahead of 1s for it
                var progress = 1 - (timeLeft - 1) / waitTime;
                // two digits
                progress = Math.round(progress * 100) / 100;
                progress = Math.min(progress, 1);

                var newWidth = $progressContainer.width() * progress;
                $progressBar.width(newWidth);
                $waitTime.text(timeLeft);

                if (timeLeft === 0) {
                    clearInterval(intTimer);
                    deferred.resolve();
                }
            } else {
                $waitTime.text(waitTime);
            }
        }, 1000);

        return deferred.promise();
    }

    return (UExtTableau);
}({}, jQuery));

