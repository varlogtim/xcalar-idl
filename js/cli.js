// CLI right side bar for users to talk to the backend
window.CLIBox = (function($, CLIBox) {
    var cliBox = $("#scratchPadSection .cliArea");
    var lineBox = $("#scratchPadSection .lineArea");
    var nl = "> ";
    var cliUnit = "<div contenteditable='true' spellcheck='false'"
                  +"class='cliUnit'></div>";
    var lineUnit = "<div class='lineUnit'>"+nl+"</div>";
    CLIBox.setup = function() {
        if (lineBox.html().length > 0) {
            lineBox.html(lineBox.html()+lineUnit);
        } else {
            lineBox.html(lineUnit);
        }
        if (cliBox.html().length > 0) {
            cliBox.html(cliBox.html()+cliUnit);
        } else {
            cliBox.html(cliUnit);
        }
        addNl();
    };

    CLIBox.restore = function(oldCLI) {
        cliBox.html(oldCLI);
    };
    
    CLIBox.clear = function() {
        lineBox.html(lineUnit);
        cliBox.html(cliUnit);
    };
   
    CLIBox.getCli = function() {
        return (cliBox.html());
    };

    function addNl() {
        var $cliUnits = $(".cliUnit");
        cliBox.on("paste", $cliUnits, function(event) {
            setTimeout(function() {
                $(event.target).html($(event.target).text());
            }, 1);
        });
        cliBox.on("keydown", $cliUnits, function(event) {
            if (event.which === 13) { 
                event.preventDefault();
                // Find out which kid this is
                var kidId = $(".cliArea .cliUnit").index($(event.target));
                // Adjust the line kiddo's height to the same
                var $corresLineUnit = $(".lineArea .lineUnit").eq(kidId);
                $corresLineUnit.css("height", $(event.target).height());
                // Add new cliUnit and lineUnit
                $(event.target).after(cliUnit);
                $corresLineUnit.after(lineUnit);
                // Disable this cliUnit from edits
                $(event.target).prop("contenteditable", false);
                $(event.target).addClass("cliDisabled"); 
                // Focus on next kid
                $(event.target).next().focus();
                // Check if the command is a comment
                var queryStr = $(event.target).text();
                if (queryStr.indexOf("//") == 0 ||
                    queryStr.indexOf("#") == 0) {
                    return;
                }
                // Run the command
                var randId = Math.floor(Math.random() * 100000);
                XcalarQuery("XIQuery"+randId, queryStr);
                commitToStorage();
            }
        });
    }

    CLIBox.realignNl = function() {
        // This function must be called everytime the user resizes his
        // rightSideBar
        // Find out how many cliUnits there are
        var numUnits = $(".cliUnit").length;
        // Add this number of lineUnits to the left
        var lineHTML = "";
        for (var i = 0; i<numUnits; i++) {
            var unitHeight = $(".cliUnit").eq(i).height();
            lineHTML += "<div class='lineUnit' style='height:"+unitHeight
                        +"px'>"+nl+"</div>";
        }
        lineBox.html(lineHTML);
    }
    return (CLIBox);
}(jQuery, {}));
