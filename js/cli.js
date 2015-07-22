// CLI right side bar for users to talk to the backend
window.CLIBox = (function($, CLIBox) {
    var $cliBox  = $("#scratchPadSection .cliArea");
    var $lineBox = $("#scratchPadSection .lineArea");

    var nl = "> ";
    var cliUnit = "<div contenteditable='true' spellcheck='false'" +
                    "class='cliUnit'></div>";
    var lineUnit = "<div class='lineUnit'>" + nl + "</div>";

    CLIBox.setup = function() {
        // initialize lineBox and cliBox
        $lineBox.append(lineUnit);
        $cliBox.append(cliUnit);
        addNl();
    };

    CLIBox.restore = function(oldCLI) {
        $cliBox.html(oldCLI);
    };
    
    CLIBox.clear = function() {
        $lineBox.html(lineUnit);
        $cliBox.html(cliUnit);
    };
   
    CLIBox.getCli = function() {
        return ($cliBox.html());
    };

    CLIBox.realignNl = function() {
        // This function must be called everytime the user resizes his
        // rightSideBar
        // Find out how many cliUnits there are
        // Add this number of lineUnits to the left
        var lineHTML = "";

        $(".cliUnit").each(function() {
            var unitHeight = $(this).height();
            lineHTML += "<div class='lineUnit' style='height:" + unitHeight +
                        "px'>" +
                            nl +
                        "</div>";
        });

        $lineBox.html(lineHTML);
    };

    function addNl() {
        $cliBox.on("paste", ".cliUnit", function(event) {
            var $div = $(event.target);
            setTimeout(function() {
                $div.html($div.text());
            }, 1);
        });

        $cliBox.on("keydown", ".cliUnit", function(event) {
            if (event.which === keyCode.Enter) {
                event.preventDefault();

                var $div = $(event.target);
                // Find out which kid this is
                var kidId = $(".cliArea .cliUnit").index($div);
                // Adjust the line kiddo's height to the same
                var $corresLineUnit = $(".lineArea .lineUnit").eq(kidId);
                $corresLineUnit.css("height", $div.height());
                // Add new cliUnit and lineUnit
                $div.after(cliUnit);
                $corresLineUnit.after(lineUnit);
                // Disable this cliUnit from edits
                $div.removeAttr("contenteditable").addClass("cliDisabled");
                // Focus on next kid
                $div.next().focus();
                // Check if the command is a comment
                var queryStr = $div.text();
                if (queryStr.indexOf("//") === 0 ||
                    queryStr.indexOf("#") === 0)
                {
                    return;
                }
                // Run the command
                var randId = Math.floor(Math.random() * 100000);
                XcalarQuery("XIQuery" + randId, queryStr);
                commitToStorage();
            }
        });

        // ctrl+L to clean up the cli
        var ctrlPressed = false;
        $cliBox.on({
            "keydown": function(event) {
                if (event.which === keyCode.Ctrl) {
                    ctrlPressed = true;
                } else if (ctrlPressed && event.which === 76) { // 76 = key L
                    CLIBox.clear();
                    $cliBox.children().focus();
                }
            },
            "keyup": function(event) {
                if (event.which === keyCode.Ctrl) {
                    ctrlPressed = false;
                }
            }
        });
    }

    return (CLIBox);
}(jQuery, {}));
