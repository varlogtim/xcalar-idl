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
        setupDragDrop();
    };

    UploadDataflowCard.show = function() {
        $card.show();
        $("#dataflowView").scrollTop(0);
        DFCard.adjustScrollBarPositionAndSize();
    };

    function readRetinaFromFile(file, retName) {
        var reader = new FileReader();
        var deferred = PromiseHelper.deferred();

        reader.onload = function(event) {
            var entireString;
            if (event) {
                entireString = event.target.result;
            } else {
                entireString = this.content;
            }
            var dag = new DagGraph();
            if (!dag.deserializeDagGraph(entireString)) {
                StatusBox.show(DFTStr.DFDrawError, $("#retinaPath"));
                deferred.reject();
                return;
            }
            DagList.Instance.uploadDag(retName, dag);
            deferred.resolve();
        };

        reader.onloadend = function(event) {
            var error = event.target.error;
            if (error != null) {
                var options = {
                    side: "left",
                    detail: error.message || null
                };
                StatusBox.show(ErrTStr.RetinaFailed, $card.find(".confirm"),
                                false, options);
                deferred.reject(error);
            }
        };
        // XXX this should really be read as data URL
        // But requires that backend changes import retina to not
        // do default base 64 encoding. Instead take it as flag
        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    function submitForm() {
        const self = this;
        var retName = $dfName.val().trim();
        if (retName.length === 0) {
            StatusBox.show(ErrTStr.NoEmpty, $dfName);
            return PromiseHelper.reject();
        }

        // TODO: checkNamePattern is very strict. What names do we want to support?
        var valid = xcHelper.checkNamePattern("dataflow", "check", retName);
        if (!valid) {
            StatusBox.show(ErrTStr.DFNameIllegal, $dfName);
            return PromiseHelper.reject();
        }
        if (!DagList.Instance.isUniqueName(retName)) {
            StatusBox.show(DFTStr.DupDataflowName, $dfName);
            return PromiseHelper.reject();
        }
        var limit = 1024 * 1024; // 1M
        if (file && file.size > limit) {
            Alert.error(DSTStr.UploadLimit, DFTStr.UploadLimitMsg);
            return PromiseHelper.reject();
        }

        var deferred = PromiseHelper.deferred();
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
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.Upload);
            closeCard();
            deferred.resolve();
        })
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

    }

    function changeFilePath(path, fileInfo) {
        path = path.replace(/C:\\fakepath\\/i, '');
        file = fileInfo || $browserBtn[0].files[0];

        var retName = path.substring(0, path.indexOf(".")).toLowerCase()
                          .replace(/ /g, "");
        retName = xcHelper.checkNamePattern("dataflow", "fix", retName);

        $retPath.val(path);
        $dfName.val(retName);
        if (path.indexOf(".json") > 0) {
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
        DFCard.adjustScrollBarPositionAndSize();
    }

    function setupDragDrop() {
        var ddUploader = new DragDropUploader({
            $container: $card,
            text: "Drop a dataflow file to upload",
            onDrop: function(file) {
                changeFilePath(file.name, file);
            },
            onError: function(error) {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }

            }
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        UploadDataflowCard.__testOnly__ = {};
        UploadDataflowCard.__testOnly__.changeFilePath = changeFilePath;
        UploadDataflowCard.__testOnly__.submitForm = submitForm;
        UploadDataflowCard.__testOnly__.setFile = function(f) {
            file = f;
        };
        UploadDataflowCard.__testOnly__.readRetinaFromFile = readRetinaFromFile;
    }
    /* End Of Unit Test Only */

    return (UploadDataflowCard);

}(jQuery, {}));
