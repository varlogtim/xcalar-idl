window.WorkbookInfoModal = (function(WorkbookInfoModal, $) {
    var $modal; // $("#workbookInfoModal")
    var modalHelper;
    var activeWorkbookId;
    var $title;
    var $workbookName;
    var $workbookDescription;
    var $filePathWKBK;
    var isUpload;
    var $fileUpload;

    WorkbookInfoModal.setup = function() {
        $modal = $("#workbookInfoModal");

        modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });

        $title = $modal.find(".modalHeader").find(".text");
        $workbookName = $modal.find(".name input");
        $workbookDescription = $modal.find(".description input");
        $filePathWKBK = $modal.find("#filePathWKBK");
        $fileUpload = $("#WKBK_uploads");

        addEvents();
    };

    WorkbookInfoModal.show = function(workbookId, upload) {
        activeWorkbookId = workbookId;
        isUpload = upload || false;
        modalHelper.setup();
        showWorkbookInfo(workbookId, isUpload);
        if (isUpload) {
            $modal.find(".file").removeClass("xc-hidden");
        } else {
            $modal.find(".file").addClass("xc-hidden");
        }
    };

    function addEvents() {
        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $filePathWKBK.click(function() {
            $fileUpload.click();
        });

        $fileUpload.change(function() {
            $filePathWKBK.val($(this).val().replace(/C:\\fakepath\\/i, '').trim());
            $workbookName.val($filePathWKBK.val().replace(".tar", "").replace(".gz", "").trim());
        });
    }

    function closeModal() {
        modalHelper.clear();
        activeWorkbookId = null;
        $workbookName.val("").select();
        $workbookDescription.val("");
        $fileUpload.val("");
        $filePathWKBK.val("");
    }

    function showWorkbookInfo(workbookId) {
        if (workbookId) {
            $title.text(WKBKTStr.EditTitle);
            var workbook = WorkbookManager.getWorkbook(workbookId);
            $workbookName.val(workbook.getName()).select();
            $workbookDescription.val(workbook.getDescription() || "");
        } else {
            if (!isUpload) {
                $title.text(WKBKTStr.CreateTitle);
            } else {
                $title.text(WKBKTStr.UploadTitle);
                //open download thingie
                $fileUpload.click();
            }
        }
    }

    function submitForm() {
        var workbookId = activeWorkbookId;
        var $submit = $modal.find(".confirm");
        var name = $workbookName.val();
        var description = $workbookDescription.val();

        if (!validate(workbookId)) {
            return;
        }
        closeModal();
        if (workbookId) {
            WorkbookPanel.edit(workbookId, name, description);
        } else {
            if (!isUpload) {
                workbookPanel.createNewWorkbook(name, description)
                .fail(function(error) {
                    StatusBox.show(error || WKBKTStr.CreateErr, $("#createWKBKbtn"));
                });
            } else {
                //XXX Placeholder, does not pass file yet
                var file = $fileUpload[0].files[0];; //get file from input element?
                WorkbookManager.uploadWKBK(name, file)
                .then()
                .fail(function(error) {
                    StatusBox.show(error, $("#browseWKBKbtn"));
                });
            }
        }
    }

    function validate(workbookId) {
        var workbookName = $workbookName.val();
        var validations = [
            {
                "$ele": $workbookName,
                "error": WKBKTStr.WkbkNameRequired,
                "check": function() {
                    return $workbookName.val() === "";
                }
            },
            {
                "$ele": $workbookName,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.checkNamePattern("workbook", "check", workbookName);
                }
            },
            {
                "$ele": $workbookName,
                "error": xcHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": workbookName
                }),
                "check": function() {
                    var workbooks = WorkbookManager.getWorkbooks();
                    for (var wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === workbookName &&
                            wkbkId !== workbookId) {
                            return true;
                        }
                    }
                    return false;
                }
            }];
        if (isUpload) {
            validations.unshift({
                "$ele": $filePathWKBK,
                "error": WKBKTStr.FileError,
                "check": function() {
                    return $filePathWKBK.val() === "";
                }
            });
        }
        var isValid = xcHelper.validate(validations);
        return isValid;
    }

    return WorkbookInfoModal;
}({}, jQuery));