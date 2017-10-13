/*
 * Module for the dataset form part
 */
window.DSForm = (function($, DSForm) {
    var $pathCard; // $("#dsForm-path");
    var $filePath;  // $("#filePath");

    DSForm.View = {
        "Path": "DSForm",
        "Uploader": "DSUploader",
        "Browser": "FileBrowser",
        "Preview": "DSPreview",
        "Parser": "DSParser"
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
            xcTooltip.transient($("#filePath"), {
                "title": TooltipTStr.Focused
            }, 800);
        });
    };

    DSForm.initialize = function() {
        // reset anything browser may have autofilled
        resetForm();
        DSPreview.update();
    };

    DSForm.show = function(options) {
        options = options || {};

        if (!options.noReset) {
            resetForm();
        }

        if (XVM.getLicenseMode() === XcalarMode.Demo) {
            DSForm.switchView(DSForm.View.Uploader);
        } else {
            DSForm.switchView(DSForm.View.Path);
        }

        $filePath.focus();
    };

    DSForm.switchView = function(view) {
        var $cardToSwitch = null;
        switch (view) {
            case DSForm.View.Path:
                $cardToSwitch = $pathCard;
                break;
            case DSForm.View.Uploader:
                $cardToSwitch = $("#dsUploader");
                break;
            case DSForm.View.Browser:
                $cardToSwitch = $("#fileBrowser");
                break;
            case DSForm.View.Preview:
                $cardToSwitch = $("#dsForm-preview");
                break;
            case DSForm.View.Parser:
                $cardToSwitch = $("#dsParser");
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
        FileBrowser.clear();
    };

    DSForm.clear = function() {
        DSForm.show();
        resetForm();
        return DSPreview.clear();
    };

    function isValidPathToBrowse() {
        var isValid = xcHelper.validate([{
            $ele: $("#dsForm-target").find(".text")
        }]);
        return isValid;
    }

    function isValidToPreview() {
        var isValid = xcHelper.validate([{
            $ele: $filePath
        }]);
        return isValid;
    }

    function getDataTarget() {
        return $("#dsForm-target input").val();
    }

    function setDataTarget(targetName) {
        $("#dsForm-target input").val(targetName);
    }

    function getFilePath() {
        var path = $filePath.val().trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return path;
    }

    function setupPathCard() {
        //set up dropdown list for data target
        new MenuHelper($("#dsForm-target"), {
            "onSelect": function($li) {
                setDataTarget($li.text());
            },
            "container": "#dsFormView",
            "bounds": "#dsFormView"
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

        $filePath.on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                goToBrowse();
            }
        });
    }

    function resetForm() {
        $filePath.val("").focus();
        var targetName = getDataTarget() || "";
        setDataTarget(targetName);
    }

    function goToBrowse() {
        if (!isValidPathToBrowse()) {
            return;
        }
        var targetName = getDataTarget();
        var path = getFilePath();
        FileBrowser.show(targetName, path);
    }

    function goToPreview() {
        if (!isValidPathToBrowse() || !isValidToPreview()) {
            return;
        }
        var targetName = getDataTarget();
        var path = getFilePath();
        DSPreview.show({
            targetName: targetName,
            "path": path,
            "format": xcHelper.getFormat(path),
        }, true);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSForm.__testOnly__ = {};
        DSForm.__testOnly__.resetForm = resetForm;
        DSForm.__testOnly__.getFilePath = getFilePath;
        DSForm.__testOnly__.setDataTarget = setDataTarget;
        DSForm.__testOnly__.getDataTarget = getDataTarget;
        DSForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        DSForm.__testOnly__.isValidToPreview = isValidToPreview;
    }
    /* End Of Unit Test Only */

    return (DSForm);
}(jQuery, {}));
