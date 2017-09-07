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
        setProtocol(FileProtocol.hdfs);
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
        } else if (protocol === FileProtocol.mapR) {
            var $credential = $pathCard.find(".credential");
            var isValid = xcHelper.validate([
                {
                    "$ele": $credential.find(".hostname input")
                },
                {
                    "$ele": $credential.find(".username input")
                },
                {
                    "$ele": $credential.find(".password input")
                }
            ]);
            return isValid;
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
        var $credential = $pathCard.find(".credential");
        if (protocol === FileProtocol.mapR) {
            $credential.removeClass("xc-hidden");
        } else {
            $credential.addClass("xc-hidden");
        }
    }

    function getFilePath() {
        var path = $filePath.val().trim();
        return path;
    }

    function getCredentials(protocol) {
        if (protocol !== FileProtocol.mapR) {
            return null;
        }

        var $credential = $pathCard.find(".credential");
        var hostname = $credential.find(".hostname input").val();
        var port = $credential.find(".port input").val();
        var username = $credential.find(".username input").val();
        var password = $credential.find(".password input").val();
        var host = port ? (hostname + ":" + port) : hostname;

        return {
            "credential": username + ":" + password,
            "host": host
        };
    }

    function setupPathCard() {
        //set up dropdown list for protocol
        new MenuHelper($("#fileProtocol"), {
            "onSelect": function($li) {
                setProtocol($li.text());
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
        var protocol = getProtocol() || FileProtocol.nfs;
        setProtocol(protocol);
    }

    function getFullPath(protocol, path) {
        var credentials = getCredentials(protocol);
        var fullPath;
        if (credentials == null) {
            fullPath = path;
        } else {
            path = path.startsWith("/") ? path.substring(1) : path;
            fullPath = credentials.credential + "@" +
                       credentials.host + "/" + path;
        }
        return fullPath;
    }

    function goToBrowse() {
        var protocol = getProtocol();
        var path = getFilePath();
        if (!isValidPathToBrowse(protocol, path)) {
            return;
        }
        var fullPath = getFullPath(protocol, path);
        FileBrowser.show(protocol, fullPath);
    }

    function goToPreview() {
        var protocol = getProtocol();
        var path = getFilePath();
        if (!isValidPathToBrowse(protocol, path) || !isValidToPreview()) {
            return;
        }

        DSPreview.show({
            "path": protocol + getFullPath(protocol, path),
            "format": xcHelper.getFormat(path),
        }, true);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSForm.__testOnly__ = {};
        DSForm.__testOnly__.resetForm = resetForm;
        DSForm.__testOnly__.getFilePath = getFilePath;
        DSForm.__testOnly__.getCredentials = getCredentials;
        DSForm.__testOnly__.getFullPath = getFullPath;
        DSForm.__testOnly__.setProtocol = setProtocol;
        DSForm.__testOnly__.getProtocol = getProtocol;
        DSForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        DSForm.__testOnly__.isValidToPreview = isValidToPreview;
    }
    /* End Of Unit Test Only */

    return (DSForm);
}(jQuery, {}));
