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
        $("#dataflowPanel").find(".mainContent").scrollTop(0);
    };

    function readRetinaFromFile(file, retName) {
        var reader = new FileReader();
        var deferred = jQuery.Deferred();

        reader.onload = function(event) {
            var entireString;
            if (event) {
                entireString = event.target.result;
            } else {
                entireString = this.content;
            }
            var overwriteUDF = $card.find(".checkbox").hasClass("checked");
            XcalarImportRetina(retName, overwriteUDF, entireString)
            .then(function() {
                deferred.resolve(overwriteUDF);
            })
            .fail(function(error) {
                console.error(error);
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
        var retName = $dfName.val().trim();
        if (retName.length === 0) {
            StatusBox.show(ErrTStr.NoEmpty, $dfName);
            return PromiseHelper.reject();
        }

        var valid = xcHelper.checkNamePattern("dataflow", "check", retName);
        if (!valid) {
            StatusBox.show(ErrTStr.DFNameIllegal, $dfName);
            return PromiseHelper.reject();
        }
        var limit = 1024 * 1024; // 1M
        if (file && file.size > limit) {
            Alert.error(DSTStr.UploadLimit, DFTStr.UploadLimitMsg);
            return PromiseHelper.reject();
        }

        var deferred = jQuery.Deferred();
        var $btn = $card.find(".confirm");
        xcHelper.disableSubmit($btn);

        var timer = setTimeout(function() {
            lockCard();
        }, 1000);

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
        .then(function(overwriteUDF) {
            UDF.refreshWithoutClearing(overwriteUDF);
            XcSocket.sendMessage("refreshUDFWithoutClear", overwriteUDF);
            return (DF.addDataflow(retName, new Dataflow(retName), null, {
                "isUpload": true,
                "noClick": true
            }));
        })
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.Upload);
            closeCard();
            var df = DF.getDataflow(retName);
            return df.updateParamMapInUsed();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            clearTimeout(timer);
            unlockCard();
            xcHelper.enableSubmit($btn);
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
            submitForm();
        });

        // hit enter on name input submits form
        $dfName.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                submitForm();
            }
        });

        // click browse button
        $("#dataflow-fakeBrowse").click(function() {
            $(this).blur();
            $browserBtn.click();
            return false;
        });

        $retPath.mousedown(function() {
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
        retName = xcHelper.checkNamePattern("dataflow", "fix", retName);
        retName = xcHelper.uniqueName(retName, function(name) {
            return !DF.hasDataflow(name);
        });

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
