// XXX Do not use alertModal! Write your own for extensions!!!!
window.UExtTableauDemo = (function(UExtTableauDemo, $) {
    var viz;

    UExtTableauDemo.buttons = [{
        "buttonText"   : "Visualize",
        "fnName"       : "visualize",
        "arrayOfFields": [{
            //"type"      : "column",
            "type"      : "string",
            "name"      : "Columns To Visualize",
            "fieldClass": "col",
            //"typeCheck" : ["number", "string", "boolean"]
        }]
    }];

    UExtTableauDemo.actionFn = function(functionName) {
        switch (functionName) {
            case ("visualize"):
                return visualizeInTableau();
            default:
                return null;
        }
    };

    function visualizeInTableau() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var self = this;
            var deferred = XcSDK.Promise.deferred();
            var table = self.getTriggerTable();
            var waitTime = 5;
            // XXXX this is a hack, should change to the SDK way
            var tableName = table.getName();
            var col = self.getArgs().col;
            var names = col.split(",");
            showModal(col, waitTime);
            waitForUpdate(waitTime)
            .then(function() {
                initializeViz(names);
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function initializeViz(colnameArray) {
        // First remove current div. This is because tableau sucks shit
        $("#extContent").empty();
        var vizName = "demoTableau-" + Math.ceil(Math.random() * 100000);
        $("#extContent").append("<div id='" + vizName +
                                "' class='vizArea'></div>");
        var $placeHolder = $("#" + vizName);
        var placeholderDiv = $placeHolder[0];

        var i = 0;
        var url = "https://10ay.online.tableau.com/t/xcalartableaucloud/views/"+
                   "Graphs/Bar&:original_view=yes&:showShareOptions=true"+
                   "&:showVizHome=yes&:embeded=yes&:refresh=yes";
        for (; i<colnameArray.length; i++) {
            if (colnameArray[i].indexOf("Risk_Segment") > -1) {
                url = "https://10ay.online.tableau.com/t/xcalartableaucloud/views/testWb/Tablularformat?:embed=y&:showShareOptions=true&:display_count=no&:showVizHome=no";
                break;
                debugger;
            }
        }

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

    return (UExtTableauDemo);
}({}, jQuery));

