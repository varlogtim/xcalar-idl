/*
 * Module for the dataset form part
 */
window.DSForm = (function($, DSForm) {
    var $pathCard; // $("#dsForm-path");
    var $filePath;  // $("#filePath");

    DSForm.View = {
        "Path"   : "DSForm",
        "Browser": "FileBrowser",
        "Preview": "DSPreview"
    };

    DSForm.setup = function() {
        $pathCard = $("#dsForm-path");
        $filePath = $("#filePath");

        setupPathCard();
        DSPreview.setup();
        FileBrowser.setup();

        // click to go to form section
        $("#importDataButton").click(function() {
            $(this).blur();
            DSForm.show();
        });
    };

    DSForm.initialize = function() {
        // reset anything browser may have autofilled
        setProtocol(FileProtocol.nfs);
        resetForm();
        DSPreview.update();
    };

    DSForm.show = function(options) {
        options = options || {};

        if (!options.noReset) {
            resetForm();
        }

        DSForm.switchView(DSForm.View.Path);
        $filePath.focus();
    };

    DSForm.switchView = function(view) {
        var $cardToSwitch = null;
        switch (view) {
            case DSForm.View.Path:
                $cardToSwitch = $pathCard;
                break;
            case DSForm.View.Browser:
                $cardToSwitch = $("#fileBrowser");
                break;
            case DSForm.View.Preview:
                $cardToSwitch = $("#dsForm-preview");
                break;
            default:
                console.error("invalid view");
                return;
        }

        $cardToSwitch.removeClass("xc-hidden")
        .siblings().addClass("xc-hidden");

        var $dsFormView = $("#dsFormView");
        if (!$dsFormView.is(":visible")) {
            $dsFormView.removeClass("xc-hidden");
            DSTable.hide();
        }
    };

    DSForm.hide = function() {
        $("#dsFormView").addClass("xc-hidden");
        DSPreview.clear();
    };

    DSForm.clear = function() {
        DSForm.show();
        resetForm();
        return DSPreview.clear();
    };

    function isValidPathToBrowse(protocol, path) {
        path = path.trim();

        if (protocol === FileProtocol.hdfs) {
            var match = path.match(/^.*?\//);

            if (match != null && match[0] !== "/") {
                return true;
            } else {
                StatusBox.show(DSTStr.InvalidHDFS, $filePath, true);
                return false;
            }
        }

        return true;
    }

    function isValidToPreview() {
        var isValid = xcHelper.validate([{
            "$ele": $filePath
        }]);

        if (isValid) {
            return true;
        } else {
            return false;
        }
    }

    function getProtocol() {
        return $("#fileProtocol input").val();
    }

    function setProtocol(protocol) {
        $("#fileProtocol input").val(protocol);
    }

    function getFilePath() {
        var path = $filePath.val().trim();
        return path;
    }

    function setupPathCard() {
        //set up dropdown list for protocol
        new MenuHelper($("#fileProtocol"), {
            "onSelect": function($li) {
                setProtocol($li.text());
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        }).setupListeners();


        // open file browser
        $pathCard.on("click", ".browse", function() {
            $(this).blur();
            goToBrowse();
        });

        $pathCard.on("click", ".confirm", function() {
            goToPreview();
        });

        $pathCard.on("click", ".cancel", resetForm);
    }

    function resetForm() {
        $filePath.val("").focus();
        var protocol = getProtocol() || FileProtocol.nfs;
        setProtocol(protocol);
    }

    function goToBrowse() {
        var protocol = getProtocol();
        var path = getFilePath();
        if (!isValidPathToBrowse(protocol, path)) {
            return;
        }

        FileBrowser.show(protocol, path);
    }

    function goToPreview() {
        var protocol = getProtocol();
        var path = getFilePath();
        if (!isValidPathToBrowse(protocol, path) || !isValidToPreview()) {
            return;
        }

        DSPreview.show({
            "path"  : protocol + path,
            "format": xcHelper.getFormat(path),
        }, true);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSForm.__testOnly__ = {};
        DSForm.__testOnly__.resetForm = resetForm;
        DSForm.__testOnly__.getFilePath = getFilePath;
        DSForm.__testOnly__.setProtocol = setProtocol;
        DSForm.__testOnly__.getProtocol = getProtocol;
        DSForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        DSForm.__testOnly__.isValidToPreview = isValidToPreview;
    }
    /* End Of Unit Test Only */

    return (DSForm);
}(jQuery, {}));
