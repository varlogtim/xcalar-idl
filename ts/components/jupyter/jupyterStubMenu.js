window.JupyterStubMenu = (function($, JupyterStubMenu) {
    var $jupyterPanel;
    var $dropdownBox;

    JupyterStubMenu.setup = function() {
        $jupyterPanel = $("#jupyterPanel");
        var $jupMenu = $jupyterPanel.find(".jupyterMenu");
        xcMenu.add($jupMenu);
        $dropdownBox = $jupyterPanel.find(".topBar .dropdownBox");

        $dropdownBox.click(function() {
            if ($dropdownBox.hasClass("xc-unavailable")) {
                return;
            }

            xcHelper.dropdownOpen($dropdownBox, $jupMenu, {
                "offsetX": -7,
                "toClose": function() {
                    return $jupMenu.is(":visible");
                }
            });
        });

        $jupyterPanel.on("click", ".jupyterMenu li", function() {
            var stubName = $(this).attr("data-action");
            if (stubName === "basicUDF") {
                JupyterUDFModal.show("map");
            } else if (stubName === "importUDF") {
                JupyterUDFModal.show("newImport");
            } else {
                JupyterPanel.appendStub(stubName);
            }
        });
    };

    JupyterStubMenu.toggleVisibility = function(show) {
        if (show) {
            $jupyterPanel.find(".topBar .rightArea").removeClass("xc-hidden");
        } else {
            $jupyterPanel.find(".topBar .rightArea").addClass("xc-hidden");
        }
    };

    JupyterStubMenu.toggleAllow = function(allow) {
        if (allow) {
            $dropdownBox.removeClass("xc-unavailable");
            xcTooltip.remove($dropdownBox);
        } else {
            $dropdownBox.addClass("xc-unavailable");
            xcTooltip.add($dropdownBox, {
                "title": JupyterTStr.NoSnippetOtherWkbk
            });
        }
    };

    /* Unit Test Only */
    if (window.unitTestMode) {
        JupyterStubMenu.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (JupyterStubMenu);
}(jQuery, {}));
