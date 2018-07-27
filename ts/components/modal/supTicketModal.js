window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');
    var $severityList; // $modal.find('.severityList');
    var $ticketIdSection;
    var $severitySection;
    var $commentSection;
    var $ticketIdInput;
    var tickets = [];
    var firstTouch = true;
    var hasSetup = false;
    var subjectLimit = 100;
    var descLimit = 10000;
    var updatedTickets = {}; // holds recently submitted/updated tickets that
    // may not show up when all tickets are fetched

    SupTicketModal.setup = function() {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');
        $severityList = $modal.find('.severityList');
        $ticketIdSection = $modal.find(".ticketIDSection");
        $severitySection = $modal.find(".severitySection");
        $commentSection = $modal.find(".commentSection");
        $ticketIdInput = $modal.find(".customTicketRow input");

        modalHelper = new ModalHelper($modal, {
            noEnter: true
        });
        setupListeners();
    };

    SupTicketModal.show = function() {
        $modal.addClass('flex-container');
        modalHelper.setup();

        if ($("#modalBackground").hasClass('locked')) {
            $modal.addClass('locked');
            Alert.hide();
        }
        updateTimes();
    };

    function getTickets() {
        var deferred = PromiseHelper.deferred();

        var reqStr = JSON.stringify({userId: userIdUnique});
        adminTools.getTickets(reqStr)
        .then(function(ret) {
            var oldTickets = [];

            if (ret.logs) {
                var logs = JSON.parse(ret.logs);
                if (logs.tickets) {
                    oldTickets = parseTicketList(logs.tickets);
                }
            }

            oldTickets.sort(sort);
            function sort(a, b) {
                if (a.created_at < b.created_at) {
                    return 1;
                } else if (a.created_at > b.created_at) {
                    return -1;
                } else {
                    return 0;
                }
            }

            deferred.resolve(oldTickets);
        })
        .fail(function(err) {
            console.error(err);
            deferred.resolve([]);
        });
        return deferred.promise();
    }

    function parseTicketList(ticketList) {
        ticketList.forEach(function(ticket) {
            ticket.created_at = Date.parse(ticket.created_at);
            if (ticket.updated_at) {
                ticket.updated_at = Date.parse(ticket.updated_at);
                if (ticket.created_at !== ticket.updated_at) {
                    ticket.hasUpdate = true;
                }
            }
            ticket.author = "user";
            ticket.author_id = ticket.submitter_id;
        });

        return ticketList;
    }

    SupTicketModal.restore = function() {
        var deferred = PromiseHelper.deferred();
        modalHelper.addWaitingBG();
        // always resolves
        getTickets()
        .then(function(oldTickets) {
            return getComments(oldTickets);
        })
        .then(function(oldTickets) {
            tickets = oldTickets;
            includeUpdatedTickets();
            listTickets();
            modalHelper.removeWaitingBG();
            deferred.resolve();
        });

        return deferred.promise();
    };

    function getComments(oldTickets) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = 0; i < oldTickets.length; i++) {
            var ticket = oldTickets[i];
            if (ticket.hasUpdate) {
                promises.push(SupTicketModal.getTicket(ticket.id));
            } else {
                promises.push(PromiseHelper.resolve(ticket));
            }
        }

        PromiseHelper.when.apply(window, promises)
        .then(function() {
            var tixs = arguments;
            var allTix = [];
            for (var i = 0; i < tixs.length; i++) {
                if (!tixs[i]) {
                    continue;
                }
                var tixGroup = tixs[i];
                var userId = oldTickets[i].author_id;
                var modifiedTicket = [];
                modifiedTicket.push(oldTickets[i]);

                for (var j = 1; j < tixGroup.length; j++) {
                    tixGroup[j].created_at = Date.parse(tixGroup[j].created_at);
                    if (tixGroup[j].author_id === userId ||
                        tixGroup[j].from === "user") {
                        tixGroup[j].author = "user";
                    } else {
                        tixGroup[j].author = "xcalar";
                    }
                    modifiedTicket.push(tixGroup[j]);
                }

                allTix.push(modifiedTicket);
            }
            deferred.resolve(allTix);
        })
        .fail(function() {
            console.error(arguments);
            deferred.reject(arguments);
        });

        return deferred.promise();
    }

    function setupListeners() {
        $modal.on("click", ".close, .cancel", closeModal);
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
                    $ticketIdSection.removeClass("xc-hidden");
                    $severitySection.addClass("xc-hidden");
                    $modal.find(".subjectArea").addClass("xc-hidden");
                    $commentSection.addClass("inactive");
                    $ticketIdSection.removeClass("inactive");
                    $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
                    $modal.find(".confirm").text(CommonTxtTstr.UPDATETICKET);
                    if (firstTouch) {
                        SupTicketModal.restore()
                        .then(function() {
                            firstTouch = false;
                        });
                    }
                } else { // New
                    $ticketIdSection.addClass("xc-hidden");
                    $severitySection.removeClass("xc-hidden");
                    $modal.find(".subjectArea").removeClass("xc-hidden");
                    $commentSection.removeClass("inactive");
                    $modal.find(".confirm").text(CommonTxtTstr.GENTICKET);
                }
            },
            "container": "#supTicketModal"
        }).setupListeners();

        new MenuHelper($severityList, {
            "onSelect": function($li) {
                var newVal = $li.data("val");
                var textVal = $li.text().trim();
                $severityList.find(".text").val(textVal);
                $severityList.find(".text").data("val", newVal);
                if ($modal.find(".subjectInput").val().trim() === "") {
                    $modal.find(".subjectInput").focus();
                } else {
                    $modal.find(".xc-textArea").focus();
                }
            }
        }).setupListeners();

        // ticket id radio buttons
        xcHelper.optionButtonEvent($modal.find(".ticketIDSection"), function(option, $btn) {
            $ticketIdSection.addClass("inactive");
            $commentSection.removeClass("inactive");

            $ticketIdInput.val("");

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
            $btn.closest(".row").removeClass("xc-hidden");
            $modal.find("textArea").focus();

        }, {deselectFromContainer: true});

        $ticketIdInput.on("input", function() {
            if ($(this).val()) {
                $ticketIdSection.find(".radioButton").removeClass("active");
            }
        });

        // expand comment section in table
        $ticketIdSection.on("click", ".subjectWrap, .expand", function() {
            var $row = $(this).closest(".row");
            if ($row.hasClass("expanded")) {
                $row.removeClass("expanded");
                $ticketIdSection.removeClass("expanded");
            } else {
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

        $modal.find(".subjectInput").keypress(function(event) {
            var val = $(this).val();
            var count = val.length;
            var remaining = subjectLimit - count;

            if (remaining <= 0) {
                event.preventDefault();
            }
        });
        $modal.find(".subjectInput").on("input", function() {
            var val = $(this).val();
            var count = val.length;
            var remaining = subjectLimit - count;

            if (remaining < 0) {
                $(this).val(val.slice(0, subjectLimit));
                remaining = 0;
            }
            $modal.find(".remainingChar").text(remaining);
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

        $modal.find(".refresh").click(function() {
            SupTicketModal.restore();
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
        $ticketIdSection.find(".tableBody").scrollTop(0);
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
        $ticketIdSection.on("mousedown", ".radioButtonGroup", function() {
            if ($ticketIdSection.hasClass("inactive")) {
                $ticketIdSection.removeClass("inactive");
                $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
                $commentSection.addClass("inactive");
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
        var deferred = PromiseHelper.deferred();
        var genBundle = false;
        var issueType = getIssueType();
        var ticketId;
        var needsOrgCheck = false;
        if (issueType === CommonTxtTstr.Existing) {
            var $radio = $ticketIdSection.find(".radioButton.active");
            if ($radio.length) {
                ticketId = parseInt($radio.find(".label").text());
            } else if ($ticketIdInput.val()) {
                ticketId = parseInt($ticketIdInput.val());
                needsOrgCheck = true;
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
        var subject = $modal.find(".subjectInput").val().trim();
        var comment = $modal.find('.xc-textArea').val().trim();
        var severity = $severityList.find(".text").data("val");

        if (comment.length > descLimit) {
            StatusBox.show(xcHelper.replaceMsg(MonitorTStr.CharLimitErr, {
                "limit": xcHelper.numToStr(descLimit)
            }), $modal.find(".xc-textArea"));
            return PromiseHelper.reject();
        }

        var ticketObj = {
            "type": issueType,
            "ticketId": ticketId,
            "server": document.location.href,
            "subject": subject,
            "comment": comment,
            "severity": severity,
            "needsOrgCheck": needsOrgCheck,
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
            ticketObj.xiLog = reverseLogs(Log.getAllLogs(true));
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
            var errHandled = false;

            SupTicketModal.fetchLicenseInfo()
            .then(function(licenseObj) {
                if (needsOrgCheck && (!licenseObj || !licenseObj.organization)) {
                    ticketIDError(genBundle, bundleSendAttempted, ticketObj, {noOrg: true});
                    errHandled = true;
                    return PromiseHelper.reject();
                } else {
                    return SupTicketModal.submitTicket(ticketObj, licenseObj);
                }
            })
            .then(function(ret) {
                if (ret.logs.indexOf("error") > -1) {
                    ticketError(genBundle, bundleSendAttempted, ret.logs, ticketObj);
                    errHandled = true;
                    return PromiseHelper.reject();
                }

                var ticketId;
                var admin;

                try {
                    var logs = JSON.parse(ret.logs);
                    ticketId = logs.ticketId;
                    admin = logs.admin;
                } catch (err) {
                    console.error(err);
                }

                if (!ticketId) {
                    ticketId = "N/A";
                }
                if (!admin) {
                    admin = "N/A";
                }

                if (genBundle) {
                    submitBundle(ticketId);
                    bundleSendAttempted = true;
                }

                ticket = {
                    id: ticketId,
                    comment: comment,
                    created_at: time,
                    severity: severity,
                    subject: subject
                };
                // var ticketStr = JSON.stringify(ticket) + ",";
                appendTicketToList(ticket);
                var msg = MonitorTStr.TicketSuccess + "<br/>" +
                                    MonitorTStr.TicketId + ": " + ticketId +
                                    "<br/>" + MonitorTStr.AcctAdmin + ": " +
                                    admin;

                Alert.show({
                    title: SuccessTStr.SubmitTicket,
                    msgTemplate: msg,
                    isAlert: true
                });
                if (!$modal.hasClass("bundleError")) {
                    closeModal();
                }
                deferred.resolve();
            })
            .fail(function() {
                if (!errHandled) {
                    ticketError(genBundle, bundleSendAttempted, null, ticketObj);
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

    function ticketError(genBundle, bundleSendAttempted, logs, ticketObj) {
        var detail = "";
        if (logs) {
            try {
                var parsedLog = JSON.parse(logs);
                var error = parsedLog.error;
                if (typeof error === "object") {
                    detail = JSON.stringify(error);
                } else {
                    detail = error;
                }
            } catch (err) {
                detail = "";
                console.warn(err);
            }
        }

        if (detail.indexOf("User does not belong") > -1) {
            ticketIDError(genBundle, bundleSendAttempted, ticketObj, {orgMisMatch: true});
            return;
        } else if (detail.indexOf("Ticket could not be found") > -1) {
            ticketIDError(genBundle, bundleSendAttempted, ticketObj, {ticketNotFound: true});
            return;
        }

        $modal.addClass('downloadMode');
        var msg = "Ticket failed, try downloading and uploading to " +
                  "ZenDesk.";
        if ($modal.is(":visible")) {
            StatusBox.show(msg, $modal.find('.download'), false, {
                highZindex: $modal.hasClass('locked'),
                detail: detail
            });
        } else {
            Alert.error('Submit Ticket Failed', msg + " " + detail);
        }
        if (genBundle && !bundleSendAttempted) {
            submitBundle(0);
        }
    }

    function ticketIDError(genBundle, bundleSendAttempted, ticketObj, errorType) {
        var msg;
        if (errorType.noOrg) {
            msg = MonitorTStr.TicketErr1;
        } else if (errorType.orgMisMatch) {
            msg = MonitorTStr.TicketErr2;
        } else if (errorType.ticketNotFound) {
            msg = MonitorTStr.TicketErr2;
        }

        if ($modal.is(":visible")) {
            StatusBox.show(msg, $modal.find('.customTicketRow'), false, {
                highZindex: $modal.hasClass('locked')
            });
        } else {
            Alert.error('Submit Ticket Failed', msg);
        }
        if (genBundle && !bundleSendAttempted) {
            submitBundle(0);
        }
    }

    function appendTicketToList(ticket) {
        var ticketId = ticket.id;
        var groupFound = false;
        ticket.author = "user";
        for (var i = 0; i < tickets.length; i++) {
            var curId = tickets[i][0].id;
            if (curId === ticketId) {
                tickets[i].push(ticket);
                updatedTickets[ticketId] = tickets[i];
                groupFound = true;
                break;
            }
        }
        if (!groupFound) {
            ticket.status = "new";
            tickets.unshift([ticket]);
            updatedTickets[ticketId] = tickets[0];
        }
        listTickets();
    }

    // after a fetch of all tickets, add in recently submitted tickets that are
    // not yet showing up as part of fetched tickets
    function includeUpdatedTickets() {
        var ticketsToAdd = [];
        for (ticketId in updatedTickets) {
            ticketsToAdd.push(updatedTickets[ticketId]);
        }
        // this is the opposite order of "tickets"
        ticketsToAdd.sort(function(a, b) {
            if (a.created_at < b.created_at) {
                return -1;
            } else if (a.created_at > b.created_at) {
                return 1;
            } else {
                return 0;
            }
        });

        for (var i = 0; i < ticketsToAdd.length; i++) {
            var ticket = null;
            var ticketIndex;
            for (var j = 0; j < tickets.length; j++) {
                if (tickets[j][0].id === ticketsToAdd[i][0].id) {
                    ticket = tickets[j];
                    ticketIndex = j;
                    break;
                }
            }
            if (ticket) {
                if (ticket.length < ticketsToAdd[i].length) {
                    // if updated ticket has more comments then replace old
                    // ticket with new one
                    tickets[ticketIndex] = ticketsToAdd[i];
                } else {
                    // current ticket is updated, so we can remove this ticket
                    // from updatedTickets
                    delete updatedTickets[ticketsToAdd[i][0].id];
                }
            } else {
                tickets.unshift(ticketsToAdd[i]);
            }
        }
    }

    function getIssueType() {
        return $modal.find('.issueList .text').val();
    }
    function submitBundleSuccess(alertMsg) {
        Alert.show({
            title: SuccessTStr.BundleGenerated,
            msg: alertMsg,
            isAlert: true
        });
    }
    function submitBundle(ticketId) {
        var deferred = PromiseHelper.deferred();
        $("#userMenu").find(".supTicket").addClass("xc-disabled");
        var mgmtdRet;
        // xcalarSupportGenerate has an alert on success
        XcalarSupportGenerate(false, ticketId)
        .then(function(ret) {
            mgmtdRet = ret;
            deferred.resolve(ret.bundlePath, ret.supportId,
                             ret.supportBundleSent);
        }, function() {
            var innerDeferred = PromiseHelper.deferred();
            HTTPService.Instance.ajax({
                "type": "POST",
                "contentType": "application/json",
                "url": xcHelper.getAppUrl() + "/service/bundle",
                success: function(data) {
                    data = parseSuccessData(data);
                    innerDeferred.resolve(data.logs);
                },
                error: function(xhr) {
                    var data = parseErrorData(xhr);
                    innerDeferred.reject(data.logs);
                }
            });
            return innerDeferred.promise();
        })
        .then(function(ret) {
            if (mgmtdRet != null) {
                submitBundleSuccess(SuccessTStr.BundleUploaded +
                                    mgmtdRet.supportBundleSent);
            } else {
                submitBundleSuccess(ret);
                deferred.resolve(ret);
            }
        })
        .fail(function(err) {
            if ($modal.is(":visible")) {
                modalHelper.removeWaitingBG();
                $modal.addClass("bundleError");
                var error = "";
                if (err && err.error) {
                    error = " " + err.error;
                }
                $modal.find(".errorText").text(ErrTStr.BundleFailed + error);
            } else {
                Alert.error(ErrTStr.BundleFailed, err);
            }
            deferred.reject(err);
        })
        .always(function() {
            $("#userMenu").find(".supTicket").removeClass("xc-disabled");
        });
        return deferred.promise();
    }

    SupTicketModal.getTicket = function(ticketId) {
        var deferred = PromiseHelper.deferred();

        var reqStr = JSON.stringify({ticketId: ticketId});
        adminTools.getTickets(reqStr)
        .then(function(ret) {
            var ticket;
            if (ret.logs) {
                ticket = JSON.parse(ret.logs).comments;
            } else {
                ticket = [];
            }
            deferred.resolve(ticket);
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function downloadTicket(ticketObj) {
        ticketObj.time = new Date();
        xcHelper.downloadAsFile("xcalarTicket.txt", JSON.stringify(ticketObj));
    }

    function closeModal() {
        modalHelper.clear();
        $modal.find('.genBundleRow .checkbox').removeClass('checked');
        $modal.find('.xc-textArea').val("");
        $modal.find('.issueList .text').val("New");
        $ticketIdSection.addClass("xc-hidden");
        $severitySection.removeClass("xc-hidden");
        $modal.find(".subjectArea").removeClass("xc-hidden");
        $modal.find(".subjectInput").val("").trigger("input");
        $modal.find(".genBundleRow").find(".label").text("2. " +
                                    MonitorTStr.AdditionalInfo + ":");
        $ticketIdInput.val("");

        $modal.removeClass('downloadMode downloadSuccess bundleError');
        $ticketIdSection.removeClass("expanded").removeClass("inactive");
        $commentSection.removeClass("inactive");
        $modal.removeClass("expanded");
        $ticketIdSection.removeClass("fetching");
        $modal.find(".row.expanded").removeClass("expanded");
        $modal.find(".confirm").text(CommonTxtTstr.GENTICKET);

        Alert.unhide();
        StatusBox.forceHide();
    }

    // ticket consists of a group of tickets with the same id;
    function getTicketRowHtml(ticket) {
        var className = "";
        var isClosed = false;
        if (ticket[0] && isNaN(parseInt(ticket[0].id))) {
            className += " invalid";
        }
        if (ticket[0] && ticket[0].status === "closed") {
            className += " closed ";
            isClosed = true;
        }
        var html = '<div class="row ' + className + '">';
        for (var i = 0; i < ticket.length; i++) {
            var time = moment(ticket[i].created_at).format("M-D-Y h:mm A");
            html += '<div class="innerRow">' +
              '<div class="td">';
            if (i === 0) {
                var radioTip = "";
                if (isClosed) {
                    radioTip = 'data-toggle="tooltip" data-container="body" ' +
                               'data-placement="top" data-original-title="' +
                               MonitorTStr.ClosedTicket + '"';
                }
                html += '<div class="radioButtonGroup" ' + radioTip + '>' +
                          '<div class="radioButton" data-option="blank">' +
                            '<div class="radio">' +
                              '<i class="icon xi-radio-selected"></i>' +
                              '<i class="icon xi-radio-empty"></i>' +
                            '</div>' +
                            '<div class="label">' + ticket[i].id + '</div>' +
                          '</div>' +
                        '</div>';
            }

            html += '</div>';

            var commentSection = "";
            var comment = xcHelper.escapeHTMLSpecialChar(ticket[i].comment);
            if (i === 0) {
                var status = ticket[i].status || "open";
                html += '<div class="td status">' + status + '</div>';
                commentSection = '<div class="subject"><b>' +
                                 MonitorTStr.Subject + ': </b>' +
                                 ticket[i].subject + '</div>';
                var severity = "";
                if (ticket[i].severity != null &&
                    MonitorTStr["Severity" + ticket[i].severity]) {
                    severity = '<div class="severity" data-toggle="tooltip" ' +
                            'data-placement="top" data-container="body" ' +
                            'data-original-title="' + MonitorTStr["Severity" +
                            ticket[i].severity] + '"><b>' +
                            MonitorTStr.Severity + ': </b> ' +
                            ticket[i].severity + '</div>';
                } else {
                    severity = '<div class="severity unavailable"></div>';
                }
                commentSection += severity;
                commentSection = '<div class="subjectWrap">' + commentSection + '</div>';
                commentSection += '<div class="comment"><b>' + OpFormTStr.Descript + ':</b> ' + comment + '</div>';

            } else {
                html += '<div class="td status"></div>';
                if (ticket[i].author === "user") {
                    comment = "<b>Comment</b> (You): " + comment;
                } else {
                    comment = "<b>Comment</b> (Xcalar): " + comment;
                }
                commentSection = '<div class="comment">' + comment + '</div>';
            }

            html += '<div class="td time" data-toggle="tooltip" ' +
            'data-container="body" data-placement="top" data-original-title="' +
                time + '" data-time="' + ticket[i].created_at + '">'+
                moment(ticket[i].created_at).fromNow() + '</div>' +
              '<div class="td details">' +
                '<div class="text">' + commentSection + '</div>';
            if (i === 0) {
                html += '<span class="expand xc-action">' +
                            '<i class="icon xi-arrow-down fa-7"></i>' +
                        '</span>';
            }
            html += '</div>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    // stringify logs and take up to 100KB worth of logs and errors
    SupTicketModal.trimRecentLogs = function() {
        var xiLogs = Log.getAllLogs(true);
        var strLogs = JSON.stringify(xiLogs);
        var errorLimit = 50 * KB;
        var totalLimit = 100 * KB;

        // if more than 100kb, take 50kb worth of errors, then take
        // 50kb worth of logs, and if there aren't 50kb worth of logs, take
        // overwritten logs, and if space still remains, take the remaining
        // error logs
        if (strLogs.length > totalLimit) {
            var strErrors = "";
            var strOverwrites = "";
            var numErrorsAdded = 0;
            for (var i = xiLogs.errors.length - 1; i >= 0; i--) {
                var strError = JSON.stringify(xiLogs.errors[i]);
                if (strErrors.length + strError.length < errorLimit) {
                    if (strErrors.length) {
                        strErrors += ",";
                    }
                    strErrors += strError;
                    numErrorsAdded = xiLogs.errors.length - i;
                } else {
                    numErrorsAdded = xiLogs.errors.length - 1 - i;
                    break;
                }
            }

            var lenRemaining = totalLimit - strErrors.length;
            strLogs = "";
            for (var i = xiLogs.logs.length - 1; i >= 0; i--) {
                var strLog = JSON.stringify(xiLogs.logs[i]);
                if (strLogs.length + strLog.length < lenRemaining) {
                    if (strLogs.length) {
                        strLogs += ",";
                        lenRemaining--;
                    }
                    strLogs += strLog;
                    lenRemaining -= strLog.length;
                } else {
                    break;
                }
            }

            for (var i = xiLogs.overwrittenLogs.length - 1; i >= 0; i--) {
                var strLog = JSON.stringify(xiLogs.overwrittenLogs[i]);
                if (strOverwrites.length + strLog.length < lenRemaining) {
                    if (strOverwrites.length) {
                        strOverwrites += ",";
                        lenRemaining--;
                    }
                    strOverwrites += strLog;
                    lenRemaining -= strLog.length;
                } else {
                    break;
                }
            }

            for (var i = xiLogs.errors.length - (1 + numErrorsAdded);
                 i >= 0; i--) {
                var strError = JSON.stringify(xiLogs.errors[i]);
                if (strError.length < lenRemaining) {
                    if (strErrors.length) {
                        strErrors += ",";
                        lenRemaining--;
                    }
                    strErrors += strError;
                    lenRemaining -= strError.length;
                } else {
                    break;
                }
            }
            strLogs = '{"version":"' + xiLogs.version + '",' +
                         '"logs":[' + strLogs + '],' +
                         '"overwrittenLogs":[' + strOverwrites + '],' +
                         '"errors":[' + strErrors + ']}';
        } else {
            // make most recent logs at top
            strLogs = JSON.stringify(reverseLogs(xiLogs));
        }
        return strLogs;
    };

    SupTicketModal.submitTicket = function (ticketObj, licenseObj, noTop, noLog) {
        ticketObj.license = licenseObj;
        var deferred = PromiseHelper.deferred();
        var ticketStr;
        PromiseHelper.alwaysResolve(XcalarApiTop(1000))
        .then(function(ret) {
            if (!noTop) {
                ticketObj.topInfo = ret;
            }
            ticketStr = JSON.stringify(ticketObj);
            if (!noLog) {
                var logStr = SupTicketModal.trimRecentLogs();
                ticketStr = ticketStr.slice(0, -1);
                ticketStr += ',"xiLog":' + logStr + "}";
            }
            return adminTools.fileTicket(ticketStr);
        })
        .then(deferred.resolve)
        .fail(function() {
            adminTools.submitTicketBrowser(ticketStr)
            .then(deferred.resolve)
            .fail(deferred.reject);
        });

        return deferred.promise();
    };

    SupTicketModal.fetchLicenseInfo = function() {
        var deferred = PromiseHelper.deferred();
        adminTools.getLicense()
        .then(function(data) {
            return adminTools.finishGettingLicense(data);
        })
        .fail(function(err) {
            deferred.reject(err);
        });
        return deferred.promise();
    };

    function updateTimes() {
        $modal.find(".time").each(function() {
            var time = $(this).data("time");
            $(this).html(moment(time).fromNow());
        });
    }

    function parseSuccessData(data) {
        if (data.logs) {
            data.logs = atob(data.logs);
        }
        return data;
    }

    function parseErrorData(xhr) {
        var data;
        if (xhr.responseJSON) {
            data = xhr.responseJSON;
            if (data.logs) {
                data.logs = atob(data.logs);
            }
        } else {
            data = {
                "status": xhr.status,
                "logs": xhr.statusText,
                "unexpectedError": true
            };
        }
        return data;
    }

    function reverseLogs(logs) {
        try {
            for (var key in logs) {
                if (logs[key] instanceof Array) {
                    logs[key] = logs[key].reverse();
                }
            }
            return logs;
        } catch (e) {
            console.error(e);
            return logs;
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SupTicketModal.__testOnly__ = {};
        SupTicketModal.__testOnly__.submitBundle = submitBundle;
        SupTicketModal.__testOnly__.downloadTicket = downloadTicket;
        SupTicketModal.__testOnly__.submitForm = submitForm;
        SupTicketModal.__testOnly__.parseTicketList = parseTicketList;
        SupTicketModal.__testOnly__.getTickets = getTickets;
        SupTicketModal.__testOnly__.includeUpdatedTickets = includeUpdatedTickets;
        SupTicketModal.__testOnly__.reverseLogs = reverseLogs;
        SupTicketModal.__testOnly__.addUpdatedTickets = function(tixs) {
            updatedTickets = tixs;
        };
        SupTicketModal.__testOnly__.get = function() {
            return tickets;
        };
        SupTicketModal.__testOnly__.submitTicketBrowser = function() {
            return PromiseHelper.reject();
        };
    }
    /* End Of Unit Test Only */

    return (SupTicketModal);
}(jQuery, {}));
