window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');


    SupTicketModal.setup = function() {
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');
        var minWidth = 400;
        var minHeight = 400;

        modalHelper = new ModalHelper($modal, {
            "minWidth": minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close, .cancel", closeModal);

        setupListeners();
    };

    SupTicketModal.show = function() {
        $modal.addClass('flex-container');
        modalHelper.setup();
        // Alert.tempHide();
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
                    if (newVal.indexOf('Crash') > -1 ||
                        newVal.indexOf('Performance Issue') > -1) {
                        showSupBundle();
                    } else {
                        hideSupBundle();
                    }
                }
            },
            "container": "#supTicketModal"
        }).setupListeners();

        $modal.find('.genBundleRow .checkboxSection').click(function() {
            var $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass('checked');
        });
    }

    function showSupBundle() {
        $modal.find('.genBundleRow').removeClass('xc-hidden');
    }

    function hideSupBundle() {
        $modal.find('.genBundleRow').addClass('xc-hidden');
    }

    function submitForm(download) {
        var genBundle = false;
        var perfOrCrash;
        var issueType = getIssueType();
        if (issueType.toLowerCase().indexOf('perf') > -1 ||
            issueType.toLowerCase().indexOf('crash') > -1) {
            perfOrCrash = true;
        } else {
            perfOrCrash = false;
        }
        if (perfOrCrash &&
            $modal.find('.genBundleRow .checkbox').hasClass('checked')) {
            genBundle = true;
        }
        var comment = $modal.find('.xc-textArea').val().trim();
        var ticketObj = {
            "type": issueType,
            "comment": comment,
        };

        if (download) {
            downloadTicket(ticketObj);
            $modal.addClass('downloadSuccess');
            $modal.removeClass('downloadMode');
            // closeModal();
            xcHelper.showSuccess(SuccessTStr.DownloadTicket);
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
            })
            .always(function() {
                modalHelper.enableSubmit();
                modalHelper.removeWaitingBG();
            });
        }
    }

    function getIssueType() {
        return $modal.find('.issueList .text').val();
    }

    function submitBundle() {
        var deferred = jQuery.Deferred();

        $("#monitor-genSub").addClass('xc-disabled');

        XcalarSupportGenerate()
        .then(function(ret) {
            deferred.resolve(ret);
            // do not show anything if succeeds
        })
        .fail(function(err) {
            deferred.reject(err);
            if ($modal.is(":visible")) {
                modalHelper.removeWaitingBG();
                $modal.addClass('bundleError');
                $modal.find('.errorText').text('Submit bundle failed. ' + err);
            } else {
                Alert.error('Submit Bundle Failed', err);
            }
        })
        .always(function() {
            $("#monitor-genSub").removeClass('xc-disabled');
        });

        return (deferred.promise());
    }

    function submitTicket(ticketObj) {
        function promiseHandler(topRet, licRet) {
            // Even if it fails and returns undef, we continue with the values
            ticketObj.topInfo = topRet;
            ticketObj.license = licRet;
            ticketObj.xiLog = SQL.getAllLogs();
            ticketObj.userIdName = userIdName;
            ticketObj.userIdUnique = userIdUnique;
            ticketObj.sessionName = WorkbookManager.getActiveWKBK();
            ticketObj.version = {
                "backendVersion": XVM.getBackendVersion(),
                "frontendVersion": gGitVersion,
                "thriftVersion": XVM.getSHA(),
            };
            return XFTSupportTools.fileTicket(JSON.stringify(ticketObj));
        }

        var deferred = jQuery.Deferred();
        var topProm = XcalarApiTop(1000);
        var licProm = XFTSupportTools.getLicense();
        PromiseHelper.when(topProm, licProm)
        .then(promiseHandler, promiseHandler)
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return deferred.promise();
    }

    function downloadTicket(ticketObj) {
        ticketObj.time = new Date();
        xcHelper.downloadAsFile('xcalarTicket.txt', JSON.stringify(ticketObj));
    }

    function closeModal() {
        modalHelper.clear();
        $modal.find('.genBundleRow .checkbox').removeClass('checked');
        $modal.find('.xc-textArea').val("");
        $modal.removeClass('downloadMode downloadSuccess bundleError');
        Alert.unhide();
        StatusBox.forceHide();
    }

    return (SupTicketModal);
}(jQuery, {}));
