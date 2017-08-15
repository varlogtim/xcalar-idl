window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');


    SupTicketModal.setup = function() {
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');

        modalHelper = new ModalHelper($modal);
        $modal.on("click", ".close, .cancel", closeModal);

        setupListeners();
    };

    SupTicketModal.show = function() {
        $modal.addClass('flex-container');
        modalHelper.setup();

        if ($("#modalBackground").hasClass('locked')) {
            $modal.addClass('locked');
            Alert.tempHide();
        }
        if (!$issueList.find('.text').val()) {
            $issueList.find('.text').val('Other');
        }
    };

    function setupListeners() {
        $modal.find('.confirm').click(function() {
            submitForm();
        });

        $modal.find('.download').click(function() {
            var download = true;
            submitForm(download);
        });

        new MenuHelper($issueList, {
            "onSelect": function($li) {
                var newVal = $li.text().trim();
                var $input = $issueList.find('.text');
                var inputVal = $input.val();
                if (newVal !== inputVal) {
                    $input.val(newVal);
                }
            },
            "container": "#supTicketModal"
        }).setupListeners();

        $modal.find(".genBundleRow .checkboxSection").click(function() {
            var $checkbox = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
        });
    }

    function submitForm(download) {
        var deferred = jQuery.Deferred();
        var genBundle = false;
        var issueType = getIssueType();

        if ($modal.find('.genBundleRow .checkbox').hasClass('checked')) {
            genBundle = true;
        }
        var comment = $modal.find('.xc-textArea').val().trim();
        var ticketObj = {
            "type": issueType,
            "server": document.location.href,
            "comment": comment,
            "xiLog": Log.getAllLogs(),
            "userIdName": userIdName,
            "userIdUnique": userIdUnique,
            "sessionName": WorkbookManager.getActiveWKBK(),
            "version": {
                "backendVersion": XVM.getBackendVersion(),
                "frontendVersion": gGitVersion,
                "thriftVersion": XVM.getSHA()
            }
        };

        if (download) {
            downloadTicket(ticketObj);
            $modal.addClass("downloadSuccess");
            $modal.removeClass("downloadMode");
            xcHelper.showSuccess(SuccessTStr.DownloadTicket);
            return deferred.resolve().promise();
        } else {
            modalHelper.disableSubmit();
            modalHelper.addWaitingBG();
            if (genBundle) {
                submitBundle();
            }

            submitTicket(ticketObj)
            .then(function() {
                xcHelper.showSuccess(SuccessTStr.SubmitTicket);
                closeModal();
                deferred.resolve();
            })
            .fail(function() {
                $modal.addClass('downloadMode');
                var msg = "Ticket failed, try downloading and uploading to " +
                          "ZenDesk.";
                if ($modal.is(":visible")) {
                    StatusBox.show(msg, $modal.find('.download'), false, {
                        highZindex: $modal.hasClass('locked')
                    });
                } else {
                    Alert.error('Submit Ticket Failed', msg);
                }
                deferred.reject();
            })
            .always(function() {
                modalHelper.enableSubmit();
                modalHelper.removeWaitingBG();
            });
        }

        return deferred.promise();
    }

    function getIssueType() {
        return $modal.find('.issueList .text').val();
    }

    function submitBundle() {
        var deferred = jQuery.Deferred();

        $("#monitor-genSub").addClass("xc-disabled");

        XcalarSupportGenerate()
        .then(deferred.resolve)
        .fail(function(err) {
            deferred.reject(err);
            if ($modal.is(":visible")) {
                modalHelper.removeWaitingBG();
                $modal.addClass("bundleError");
                $modal.find(".errorText").text(ErrTStr.BundleFailed + " " + err);
            } else {
                Alert.error(ErrTStr.BundleFailed, err);
            }
        })
        .always(function() {
            $("#monitor-genSub").removeClass("xc-disabled");
        });

        return deferred.promise();
    }

    function submitTicket(ticketObj) {
        function promiseHandler(topRet, licRet) {
            // Even if it fails and returns undef, we continue with the values
            ticketObj.topInfo = topRet;
            ticketObj.license = licRet;
            return XFTSupportTools.fileTicket(JSON.stringify(ticketObj));
        }
        var deferred = jQuery.Deferred();
        var topProm = XcalarApiTop(1000);
        var licProm = XFTSupportTools.getLicense();
        PromiseHelper.when(topProm, licProm)
        .then(promiseHandler, promiseHandler)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function downloadTicket(ticketObj) {
        ticketObj.time = new Date();
        xcHelper.downloadAsFile("xcalarTicket.txt", JSON.stringify(ticketObj));
    }

    function closeModal() {
        modalHelper.clear();
        $modal.find('.genBundleRow .checkbox').removeClass('checked');
        $modal.find('.xc-textArea').val("");
        $modal.removeClass('downloadMode downloadSuccess bundleError');
        Alert.unhide();
        StatusBox.forceHide();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SupTicketModal.__testOnly__ = {};
        SupTicketModal.__testOnly__.submitBundle = submitBundle;
        SupTicketModal.__testOnly__.submitTicket = submitTicket;
        SupTicketModal.__testOnly__.downloadTicket = downloadTicket;
        SupTicketModal.__testOnly__.submitForm = submitForm;
    }
    /* End Of Unit Test Only */

    return (SupTicketModal);
}(jQuery, {}));
