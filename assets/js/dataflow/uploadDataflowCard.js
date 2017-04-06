window.UploadDataflowCard = (function($, UploadDataflowCard) {
    var $card;             // $("#uploadDataflowCard")
    var $retPath;          // $card.find("#retinaPath")
    var $dfName;           // $card.find("#dfName")
    var file;
    var $browserBtn;       // $("#dataflow-browse");

    UploadDataflowCard.setup = function() {
        $card = $("#uploadDataflowCard");
        $retPath = $card.find("#retinaPath");
        $dfName = $card.find("#dfName");
        $browserBtn = $("#dataflow-browse");
        addCardEvents();
    };

    UploadDataflowCard.show = function() {
        $card.show();
    };

    function readRetinaFromFile(file, moduleName) {
        var reader = new FileReader();
        var deferred = jQuery.Deferred();

        reader.onload = function(event) {
            var entireString = event.target.result;
            XcalarImportRetina(moduleName,
                               $card.find(".checkbox").hasClass("checked"),
                               entireString)
            .then(function() {
                xcHelper.showSuccess(SuccessTStr.Upload);
                deferred.resolve();
            })
            .fail(function(error) {
                xcConsole.error(error);
                StatusBox.show(ErrTStr.RetinaFailed, $card.find(".confirm"),
                               false, {"side": "left"});
                deferred.reject(error);
            });
        };
        // XXX this should really be read as data URL
        // But requires that backend changes import retina to not
        // do default base 64 encoding. Instead take it as flag
        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    function submitForm() {
        var deferred = jQuery.Deferred();
        var retName = $dfName.val().trim();
        var valid = xcHelper.checkNamePattern("dataflow", "check", retName);
        if (!valid) {
            StatusBox.show(ErrTStr.DFNameIllegal, $dfName);
            return;
        }
        var limit = 1024 * 1024; // 1M
        if (file && file.size > limit) {
            Alert.error(DSTStr.UploadLimit, DFTStr.UploadLimitMsg);
            return;
        }

        lockCard();
        XcalarListRetinas()
        .then(function(ret) {
            for (var i = 0; i < ret.retinaDescs.length; i++) {
                if (ret.retinaDescs[i].retinaName === retName) {
                    StatusBox.show(ErrTStr.NameInUse, $dfName);
                    return PromiseHelper.reject();
                }
            }

            return readRetinaFromFile(file, retName);
        })
        .then(function() {
            DF.addDataflow(retName, new Dataflow(retName), null, {
                "isUpload": true,
                "noClick": true
            });

            closeCard();
            // Click on the newly uploaded dataflow
            $(".groupName:contains('" + retName + "')").closest(".dataFlowGroup")
                                                        .click();
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            unlockCard();
        });

        return deferred.promise();
    }

    function addCardEvents() {
        // click cancel or close button
        $card.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeCard();
        });

        // click upload button
        $card.on("click", ".confirm", function() {
            if ($dfName.val().trim().length === 0) {
                StatusBox.show(ErrTStr.NoEmpty, $dfName);
                return;
            }
            submitForm();
        });

        // click browse button
        $("#dataflow-fakeBrowse").click(function() {
            $(this).blur();
            $browserBtn.click();
            return false;
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        $browserBtn.change(function(event) {
            var path = $(this).val();
            if (path === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            changeFilePath(path);
        });

        $card.on("click", ".checkbox", function() {
            $(this).toggleClass("checked");
        });

        $card.on("click", ".overwriteUdf span", function() {
            $card.find(".checkbox").click();
        });
    }

    function changeFilePath(path) {
        path = path.replace(/C:\\fakepath\\/i, '');
        file = $browserBtn[0].files[0];
        var retName = path.substring(0, path.indexOf(".")).toLowerCase()
                          .replace(/ /g, "");
        $retPath.val(path);
        $dfName.val(retName);
        if (path.indexOf(".tar.gz") > 0) {
            $card.find(".confirm").removeClass("btn-disabled");
            xcTooltip.disable($card.find(".buttonTooltipWrap"));
        } else {
            $card.find(".confirm").addClass("btn-disabled");
            xcTooltip.enable($card.find(".buttonTooltipWrap"));
            StatusBox.show(ErrTStr.RetinaFormat, $retPath, false, {
                "side": "bottom"
            });
        }
    }

    function lockCard() {
        $card.find(".cardLocked").show();
    }

    function unlockCard() {
        $card.find(".cardLocked").hide();
    }

    function closeCard() {
        $card.hide();
        file = "";
        $retPath.val("");
        $dfName.val("");
        $card.find(".confirm").addClass("btn-disabled");
        $browserBtn.val("");
        // Not user friendly but safer
        $card.find(".checkbox").removeClass("checked");
        xcTooltip.enable($card.find(".buttonTooltipWrap"));
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        UploadDataflowCard.__testOnly__ = {};
        UploadDataflowCard.__testOnly__.changeFilePath = changeFilePath;
        UploadDataflowCard.__testOnly__.submitForm = submitForm;
    }
    /* End Of Unit Test Only */

    return (UploadDataflowCard);

}(jQuery, {}));
