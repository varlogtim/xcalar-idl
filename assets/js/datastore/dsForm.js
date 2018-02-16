/*
 * Module for the dataset form part
 */
window.DSForm = (function($, DSForm) {
    var $pathCard; // $("#dsForm-path");
    var $filePath;  // $("#filePath");
    var historyPathsSet = {};

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
        $("#dsForm-target input").val(gDefaultSharedRoot);
    };

    DSForm.show = function(options) {
        options = options || {};

        // if (!options.noReset) {
        //     resetForm();
        // }

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

    DSForm.addHistoryPath = function(targetName, path) {
        historyPathsSet[targetName] = historyPathsSet[targetName] || [];
        var historyPaths = historyPathsSet[targetName];
        for (var i = 0, len = historyPaths.length; i < len; i++) {
            if (historyPaths[i] === path) {
                historyPaths.splice(i, 1);
                break;
            }
        }

        historyPaths.unshift(path);
        if (historyPaths.length > 5) {
            // remove the oldest path
            historyPaths.pop();
        }
        $filePath.val(path);
    };

    function isValidPathToBrowse() {
        var isValid = xcHelper.validate([{
            $ele: $("#dsForm-target").find(".text")
        }]);
        if (!isValid) {
            return false;
        }

        var targetName = getDataTarget();
        var path = $filePath.val().trim();
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            isValid = xcHelper.validate([{
                $ele: $filePath,
                error: DSFormTStr.GeneratedTargetHint,
                check: function() {
                    return !Number.isInteger(Number(path));
                }
            }]);
        }

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
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            $pathCard.addClass("target-generated");
            $filePath.attr("placeholder", DSFormTStr.GeneratedTargetHint);
        } else {
            $pathCard.removeClass("target-generated");
            $filePath.removeAttr("placeholder");
        }

        var historyPaths = historyPathsSet[targetName];
        var oldPath = "";
        if (historyPaths != null) {
            oldPath = historyPaths[0] || "";
        }
        $filePath.val(oldPath).focus();
    }

    function setPathMenu() {
        var $list = $filePath.closest(".dropDownList").find(".list");
        var $ul = $list.find("ul");
        var target = getDataTarget();
        var historyPaths = historyPathsSet[target];
        if (historyPaths == null || historyPaths.length === 0) {
            $ul.empty();
            $list.addClass("empty");
        } else {
            var list = historyPaths.map(function(path) {
                return "<li>" + path + "</li>";
            }).join("");
            $ul.html(list);
            $list.removeClass("empty");
        }
    }

    function getFilePath(targetName) {
        var path = $filePath.val().trim();
        if (!path.startsWith("/") && !DSTargetManager.isGeneratedTarget(targetName)) {
            path = "/" + path;
        }
        return path;
    }

    function setupPathCard() {
        //set up dropdown list for data target
        new MenuHelper($("#dsForm-target"), {
            onSelect: function($li) {
                setDataTarget($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();

        var $filePathDropDown = $filePath.closest(".dropDownList");
        new MenuHelper($filePathDropDown, {
            onOpen: setPathMenu,
            onSelect: function($li) {
                $filePathDropDown.find("input").val($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
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
        var targetName = getDataTarget() || "";
        setDataTarget(targetName);
        $filePath.val("").focus();
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
        var path = getFilePath(targetName);
        if (path !== "/") {
            DSForm.addHistoryPath(targetName, path);
        }

        DSPreview.show({
            targetName: targetName,
            files: [{path: path}]
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
