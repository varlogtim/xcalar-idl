window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');
    var $ticketIdSection;
    var $commentSection;
    var tickets = [];

    SupTicketModal.setup = function() {
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');
        $ticketIdSection = $modal.find(".ticketIDSection");
        $commentSection = $modal.find(".commentSection");

        modalHelper = new ModalHelper($modal, {
            afterResize: function() {
                if (!$ticketIdSection.hasClass("closed")) {
                    showHideCommentExpandIcon();
                }
            }
        });
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
    };

    function getTickets() {
        var deferred = jQuery.Deferred();
        KVStore.get(KVStore.gTktKey, gKVScope.USER)
        .then(function(ticketList) {
            var oldTickets = parseTicketList(ticketList);
            deferred.resolve(oldTickets);
        })
        .fail(function(err) {
            console.error(err);
            deferred.resolve([]);
        });
        return deferred.promise();
    }

    function parseTicketList(ticketList) {
        var parsedTickets = [];

        if (ticketList == null) {
            return parsedTickets;
        }

        try {
            var len = ticketList.length;
            if (ticketList.charAt(len - 1) === ",") {
                ticketList = ticketList.substring(0, len - 1);
            }
            var tktStr = "[" + ticketList + "]";
            parsedTickets= JSON.parse(tktStr);
        } catch (error) {
            xcConsole.error("parse log failed", error);
        }

        return parsedTickets;
    }


    SupTicketModal.restore = function() {
        var deferred = jQuery.Deferred();
        // always resolves
        getTickets()
        .then(function(oldTickets) {
            // group tickets by id and then sort by date
            var ticketMap = {};
            for (var i = 0; i < oldTickets.length; i++) {
                var oldTicket = oldTickets[i];
                if (!ticketMap[oldTicket.id]) {
                    ticketMap[oldTicket.id] = [];
                }
                ticketMap[oldTicket.id].push(oldTicket);
            }
            tickets = [];
            for (var i in ticketMap) {
                ticketMap[i].sort(sort);
                tickets.push(ticketMap[i]);
            }
            tickets = tickets.sort(function(a, b) {
                return sort(b[0], a[0]);
            });
            function sort(a, b) {
                if (a.time > b.time) {
                    return 1;
                } else if (a.time < b.time) {
                    return -1;
                } else {
                    return 0;
                }
            }

            listTickets();
            deferred.resolve();
        });

        return deferred.promise();
    };

    function setupListeners() {
        // type dropdown
        new MenuHelper($issueList, {
            "onSelect": function($li) {
                var newVal = $li.text().trim();
                var $input = $issueList.find('.text');
                var inputVal = $input.val();
                if (newVal === inputVal) {
                    return;
                }

                $input.val(newVal);
                if (newVal === CommonTxtTstr.Existing) {
                    $ticketIdSection.removeClass("closed");
                    $modal.find(".genBundleRow").find(".label")
                                .text("3. " + MonitorTStr.AdditionalInfo + ":");
                    $commentSection.addClass("inactive");
                    $ticketIdSection.removeClass("inactive");
                    $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
                    showHideCommentExpandIcon();
                } else { // New
                    $ticketIdSection.addClass("closed");
                    $modal.find(".genBundleRow").find(".label")
                                .text("2. " + MonitorTStr.AdditionalInfo + ":");
                    $commentSection.removeClass("inactive");
                    $modal.find("textArea").focus();
                }
            },
            "container": "#supTicketModal"
        }).setupListeners();

        // ticket id radio buttons
        xcHelper.optionButtonEvent($modal.find(".ticketIDSection"), function(option, $btn) {
            $ticketIdSection.addClass("inactive");
            $commentSection.removeClass("inactive");

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
            $btn.closest(".row").removeClass("xc-hidden");
            $modal.find("textArea").focus();

        }, {deselectFromContainer: true});

        // expand comment section in table
        $ticketIdSection.on("click", ".expand", function() {
            var $row = $(this).closest(".innerRow");
            if ($row.hasClass("expanded")) {
                $row.removeClass("expanded");
                $ticketIdSection.removeClass("expanded");
            } else {
                $ticketIdSection.find(".innerRow").removeClass("expanded");
                $row.addClass("expanded");
                resizeModal($row);
            }
        });

        $ticketIdSection.on("click", ".comments", function(event) {
            if ($(event.target).closest(".expand").length ||
                !$(this).closest(".overflow").length) {
                return;
            }
            var $row = $(this).closest(".innerRow");
            if (!$row.hasClass("expanded")) {
                $ticketIdSection.find(".innerRow").removeClass("expanded");
                $row.addClass("expanded");
                resizeModal($row);
            }
        });

        // support bundle checkboxes
        $modal.find(".genBundleRow .checkboxSection").click(function() {
            var $section = $(this);
            var $checkbox = $section.find(".checkbox");
            if ($section.hasClass("inactive")) {
                return;
            }
            $checkbox.toggleClass("checked");
        });

        // toggling active sections
        setupTogglingActiveSections();

        // submit buttons
        $modal.find('.confirm').click(function() {
            submitForm();
        });

        $modal.find('.download').click(function() {
            var download = true;
            submitForm(download);
        });
    }

    function showHideCommentExpandIcon() {
        var width = $ticketIdSection.find(".comments .text").eq(0).outerWidth();
        $ticketIdSection.find(".comments").removeClass("overflow");
        $ticketIdSection.find(".comments .text").each(function() {
            var $text = $(this);
            if ($text[0].scrollWidth > width) {
                $text.parent().addClass("overflow");
            }
        });
    }


    function listTickets() {
        var html = "";
        for (var i = 0; i < tickets.length; i++) {
            html += getTicketRowHtml(tickets[i]);
        }
        // append empty row if no tickets found
        if (!tickets.length) {
            html = '<div class="row empty">' +
                        '<div class="td">' + MonitorTStr.NoTickets + '</div>' +
                    '</div>';
        }
        $ticketIdSection.find(".tableBody").html(html);
    }

    function setupTogglingActiveSections() {
        $ticketIdSection.click(function(event) {
            if (!$(event.target).closest(".radioButtonGroup").length) {
                if ($ticketIdSection.hasClass("inactive")) {
                    $ticketIdSection.removeClass("inactive");
                    $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
                    $commentSection.addClass("inactive");
                }
            }
        });
        $commentSection.mousedown(function() {
            if ($commentSection.hasClass("inactive")) {
                $commentSection.removeClass("inactive");
                $ticketIdSection.addClass("inactive");

                var $selectedRow = $ticketIdSection.find(".radioButton.active")
                                             .closest(".row");

                if ($selectedRow.length) {
                    $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
                    $selectedRow.removeClass("xc-hidden");
                }
            }
        });
    }

    // increase modal size when expanding a row
    function resizeModal($row) {
        var maxHeight = 250;
        var rowHeight = $row.height();
        var tbodyHeight = $row.closest(".tableBody").height();
        if (rowHeight - tbodyHeight > 0 && tbodyHeight < maxHeight) {
            var diff = maxHeight - tbodyHeight;
            var distFromBottom = $(window).height() -
                                 $modal[0].getBoundingClientRect().bottom;
            distFromBottom = Math.max(0, distFromBottom);

            $modal.height("+=" + Math.min(diff, distFromBottom));
            $ticketIdSection.addClass("expanded");
        }
    }

    function submitForm(download) {
        var deferred = jQuery.Deferred();
        var genBundle = false;
        var issueType = getIssueType();
        var ticketId;
        if (issueType === CommonTxtTstr.Existing) {
            var $radio = $ticketIdSection.find(".radioButton.active");
            if ($radio.length) {
                ticketId = parseInt($radio.find(".label").text());
            } else {
                StatusBox.show(MonitorTStr.SelectExistingTicket,
                    $ticketIdSection.find(".tableBody"));
                return PromiseHelper.reject();
            }
        } else {
            ticketId = null;
        }

        if ($modal.find('.genBundleBox .checkbox').hasClass('checked')) {
            genBundle = true;
        }
        var comment = $modal.find('.xc-textArea').val().trim();
        var ticketObj = {
            "type": issueType,
            "ticketId": ticketId,
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
            return PromiseHelper.resolve();
        } else {
            modalHelper.disableSubmit();
            modalHelper.addWaitingBG();

            var time = Date.now();
            var ticket;
            var bundleSendAttempted = false;

            submitTicket(ticketObj)
            .then(function(ret) {
                ticketId = JSON.parse(ret.logs).ticketId;

                if (genBundle) {
                    submitBundle(ticketId);
                    bundleSendAttempted = true;
                }

                ticket = {
                    id: ticketId,
                    comment: comment,
                    time: time
                };
                var ticketStr = JSON.stringify(ticket) + ",";
                return KVStore.append(KVStore.gTktKey, ticketStr, true,
                                      gKVScope.USER);
            })
            .then(function() {
                appendTicketToList(ticket);
                xcHelper.showSuccess(SuccessTStr.SubmitTicket);
                if (!$modal.hasClass("bundleError")) {
                    closeModal();
                }
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
                if (genBundle && !bundleSendAttempted) {
                    submitBundle(0);
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

    function appendTicketToList(ticket) {
        var ticketId = ticket.id;
        var groupFound = false;
        for (var i = 0; i < tickets.length; i++) {
            var curId = tickets[i][0].id;
            if (curId === ticketId) {
                tickets[i].push(ticket);
                groupFound = true;
                break;
            }
        }
        if (!groupFound) {
            tickets.unshift([ticket]);
        }
        listTickets();
    }

    function getIssueType() {
        return $modal.find('.issueList .text').val();
    }

    function submitBundle(ticketId) {
        var deferred = jQuery.Deferred();

        $("#monitor-genSub").addClass("xc-disabled");

        XcalarSupportGenerate(false, ticketId)
        .then(deferred.resolve)
        .fail(function(err) {
            if ($modal.is(":visible")) {
                modalHelper.removeWaitingBG();
                $modal.addClass("bundleError");
                $modal.find(".errorText").text(ErrTStr.BundleFailed + " " + err);
            } else {
                Alert.error(ErrTStr.BundleFailed, err);
            }
            deferred.reject(err);
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
        $modal.find('.issueList .text').val("New");
        $ticketIdSection.addClass("closed");
        $modal.find(".genBundleRow").find(".label").text("2. " +
                                    MonitorTStr.AdditionalInfo + ":");

        $modal.removeClass('downloadMode downloadSuccess bundleError');
        $ticketIdSection.removeClass("expanded").removeClass("inactive");
        $commentSection.removeClass("inactive");
        $modal.removeClass("expanded");
        $ticketIdSection.removeClass("fetching");

        Alert.unhide();
        StatusBox.forceHide();
    }

    // ticket consists of a group of tickets with the same id;
    function getTicketRowHtml(ticket) {
        var html = '<div class="row">';
        for (var i = 0; i < ticket.length; i++) {
            var date = xcHelper.getDate("-", null, ticket[i].time);
            var time = xcHelper.getTime(null, ticket[i].time, true);
            html += '<div class="innerRow">' +
              '<div class="td">';
            if (i === 0) {
                html += '<div class="radioButtonGroup">' +
                          '<div class="radioButton" data-option="blank">' +
                            '<div class="radio">' +
                              '<i class="icon xi-radio-selected"></i>' +
                              '<i class="icon xi-radio-empty"></i>' +
                            '</div>' +
                            '<div class="label">' + ticket[i].id + '</div>' +
                          '</div>' +
                        '</div>';
            }

            html += '</div>' +
              '<div class="td">' + date + ' ' + time + '</div>' +
              '<div class="td comments">' +
                '<div class="text">' +
                  xcHelper.escapeHTMLSpecialChar(ticket[i].comment) +
                '</div>' +
                '<span class="expand">' +
                  '<i class="icon xi-arrow-down fa-7"></i>' +
                '</span>' +
              '</div>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SupTicketModal.__testOnly__ = {};
        SupTicketModal.__testOnly__.submitBundle = submitBundle;
        SupTicketModal.__testOnly__.submitTicket = submitTicket;
        SupTicketModal.__testOnly__.downloadTicket = downloadTicket;
        SupTicketModal.__testOnly__.submitForm = submitForm;
        SupTicketModal.__testOnly__.parseTicketList = parseTicketList;
        SupTicketModal.__testOnly__.getTickets = getTickets;
    }
    /* End Of Unit Test Only */

    return (SupTicketModal);
}(jQuery, {}));
