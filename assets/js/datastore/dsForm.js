/*
 * Module for the dataset form part
 */
window.DSForm = (function($, DSForm) {
    var $pathCard; // $("#dsForm-path");
    var $filePath;  // $("#filePath")

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
        resetForm();
        DSPreview.update();
    };

    DSForm.show = function(options) {
        options = options || {};
        var $dsFormView = $("#dsFormView");
        if (!$dsFormView.is(":visible"))
        {
            if (!options.noReset) {
                resetForm();
            }

            $dsFormView.removeClass("xc-hidden");
            $("#dsTableView").addClass("xc-hidden");
            $("#dsTableWrap").empty();
            $("#dataCartBtn").addClass("xc-hidden");

            $("#dsListSection").find(".gridItems .grid-unit.active")
                                .removeClass("active");
        }

        $pathCard.removeClass("xc-hidden").siblings().addClass("xc-hidden");
        $filePath.focus();
    };

    DSForm.hide = function() {
        $("#dsFormView").addClass("xc-hidden");
        $("#dsTableView").removeClass("xc-hidden");
        $("#dataCartBtn").removeClass("xc-hidden");
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
            "$selector": $filePath
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

            var protocol = getProtocol();
            var path = getFilePath();
            if (isValidPathToBrowse(protocol, path)) {
                FileBrowser.show(protocol, path);
            }
        });

        $pathCard.on("click", ".confirm", function() {
            var protocol = getProtocol();
            var path = getFilePath();
            if (isValidPathToBrowse(protocol, path) && isValidToPreview()) {
                DSPreview.show({
                    "path"  : protocol + path,
                    "format": xcHelper.getFormat(path)
                });
            }
        });

        $pathCard.on("click", ".cancel", resetForm);
    }

    function resetForm() {
        $filePath.val("").focus();
        var protocol = getProtocol() || FileProtocol.nfs;
        setProtocol(protocol);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSForm.__testOnly__ = {};
        // DSForm.__testOnly__.resetForm = resetForm;
        DSForm.__testOnly__.submitForm = submitForm;
        // DSForm.__testOnly__.toggleFormat = toggleFormat;
        // DSForm.__testOnly__.checkUDF = checkUDF;
        DSForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        // DSForm.__testOnly__.promoptHeaderAlert = promoptHeaderAlert;
        // DSForm.__testOnly__.resetDelimiter = resetDelimiter;
        // DSForm.__testOnly__.resetUdfSection = resetUdfSection;
        // DSForm.__testOnly__.selectUDFModule = selectUDFModule;
        // DSForm.__testOnly__.selectUDFFunc = selectUDFFunc;
    }
    /* End Of Unit Test Only */

    return (DSForm);
}(jQuery, {}));
