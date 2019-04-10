window.UploadExtensionCard = (function($, UploadExtensionCard) {
    var $card;             // $("#extension-upload")
    var $extPath;          // $car.find(".path");
    var $browserBtn;       // $card.find(".browse");
    var file;
    var extName;
    var lockTimer;

    UploadExtensionCard.setup = function() {
        $card = $("#extension-upload");
        $extPath = $card.find(".path");
        $browserBtn = $card.find(".browse");
        addCardEvents();
    };

    function submitForm() {
        lockCard();

        readAndUploadFile()
        .always(function() {
            unlockCard();
        });
    }

    function readAndUploadFile() {
        var reader = new FileReader();
        var deferred = PromiseHelper.deferred();

        reader.readAsBinaryString(file);
        reader.onload = function(event) {
            var entireString;
            if (event) {
                entireString = event.target.result;
            } else {
                content = this.content;
            }
            var base64Str = btoa(entireString);

            uploadExt(base64Str)
            .then(function() {
                clear();
                xcUIHelper.showSuccess(SuccessTStr.Upload);
                $("#refreshExt").click();
                deferred.resolve();
            })
            .fail(function(error) {
                console.error(error);
                StatusBox.show(ErrTStr.ExtUploadFailed, $card.find(".confirm"),
                false, {side: "left", detail: error});
                deferred.reject(error);
            });
        };

        return deferred.promise();
    }

    function uploadExt(str) {
        var url = xcHelper.getAppUrl();
        return ExtensionPanel.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/upload",
            "data": {"targz": str, "name": extName},
        });
    }

    function addCardEvents() {
        $("#uploadExtension").click(function() {
            $card.removeClass("xc-hidden");
            $("#monitorPanel").find(".mainContent").scrollTop(0);
        });

        // click cancel or close button
        $card.on("click", ".close, .cancel", function() {
            event.stopPropagation();
            closeCard();
        });

        // click upload button
        $card.on("click", ".confirm", function() {
            submitForm();
        });

        // click browse button
        $card.on("click", ".fakeBrowse", function() {
            $(this).blur();
            $browserBtn.click();
            return false;
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        $browserBtn.change(function(event) {
            if ($(this).val() === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            var path = $(this).val().replace(/C:\\fakepath\\/i, '');
            file = $browserBtn[0].files[0];
            extName = path.substring(0, path.indexOf(".")).replace(/ /g, "");
            $extPath.val(path);
            if (path.indexOf(".tar.gz") > 0) {
                $card.find(".confirm").removeClass("btn-disabled");
                xcTooltip.disable($card.find(".buttonTooltipWrap"));
            } else {
                $card.find(".confirm").addClass("btn-disabled");
                xcTooltip.enable($card.find(".buttonTooltipWrap"));
                StatusBox.show(ErrTStr.RetinaFormat, $extPath, false, {
                    "side": "bottom"
                });
            }
        });
    }

    function lockCard() {
        lockTimer = setTimeout(function() {
            $card.find(".cardLocked").show();
        }, 500);
        xcUIHelper.disableSubmit($card.find(".fakeBrowse, .confirm"));
    }

    function unlockCard() {
        clearTimeout(lockTimer);
        $card.find(".cardLocked").hide();
        xcUIHelper.enableSubmit($card.find(".fakeBrowse, .confirm"));
    }

    function closeCard() {
        $card.addClass("xc-hidden");
        clear();
        unlockCard();
    }

    function clear() {
        file = "";
        extName = null;
        $extPath.val("");
        $card.find(".confirm").addClass("btn-disabled");
        $browserBtn.val("");
        xcTooltip.enable($card.find(".buttonTooltipWrap"));
    }

    return (UploadExtensionCard);

}(jQuery, {}));
