window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');
    var $severityList; // $modal.find('.severityList');
    var $ticketIdSection;
    var $severitySection;
    var $commentSection;
    var tickets = [];
    var firstTouch = true;
    var subjectLimit = 100;
    var descLimit = 10000;

    SupTicketModal.setup = function() {
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');
        $severityList = $modal.find('.severityList');
        $ticketIdSection = $modal.find(".ticketIDSection");
        $severitySection = $modal.find(".severitySection");
        $commentSection = $modal.find(".commentSection");

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
            Alert.tempHide();
        }
        updateTimes();
    };

    function getTickets() {
        var deferred = jQuery.Deferred();

        var reqStr = JSON.stringify({userId: userIdUnique});
        XFTSupportTools.getTickets(reqStr)
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
        var deferred = jQuery.Deferred();
        modalHelper.addWaitingBG();
        // always resolves
        getTickets()
        .then(function(oldTickets) {
            return getComments(oldTickets);
        })
        .then(function(oldTickets) {
            tickets = oldTickets;
            listTickets();
            modalHelper.removeWaitingBG();
            deferred.resolve();
        });

        return deferred.promise();
    };

    function getComments(oldTickets) {
        var deferred = jQuery.Deferred();
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
                if (tixGroup) {
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

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
            $btn.closest(".row").removeClass("xc-hidden");
            $modal.find("textArea").focus();

        }, {deselectFromContainer: true});

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
            ticketObj.xiLog = Log.getAllLogs(true);
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

            SupTicketModal.fetchLicenseInfo()
            .then(function(licenseObj) {
                return SupTicketModal.submitTicket(ticketObj, licenseObj);
            })
            .then(function(ret) {
                if (ret.logs.indexOf("error") > -1) {
                    ticketError(genBundle, bundleSendAttempted);
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
                    severity: severity
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
                ticketError(genBundle, bundleSendAttempted);
                deferred.reject();
            })
            .always(function() {
                modalHelper.enableSubmit();
                modalHelper.removeWaitingBG();
            });
        }

        return deferred.promise();
    }

    function ticketError(genBundle, bundleSendAttempted) {
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
    }

    function appendTicketToList(ticket) {
        var ticketId = ticket.id;
        var groupFound = false;
        ticket.author = "user";
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

        // xcalarSupportGenerate has an alert on success
        XcalarSupportGenerate(false, ticketId)
        .then(deferred.resolve)
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
            $("#monitor-genSub").removeClass("xc-disabled");
        });

        return deferred.promise();
    }

    SupTicketModal.getTicket = function(ticketId) {
        var deferred = jQuery.Deferred();

        var reqStr = JSON.stringify({ticketId: ticketId});
        XFTSupportTools.getTickets(reqStr)
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
        var className = "";
        if (ticket[0] && isNaN(parseInt(ticket[0].id))) {
            className += " invalid";
        }
        var html = '<div class="row ' + className + '">';
        for (var i = 0; i < ticket.length; i++) {
            var time = moment(ticket[i].created_at).format("M-D-Y h:mm A");
            html += '<div class="innerRow">' +
              '<div class="td">';
            if (i === 0) {
                html += '<div class="radioButtonGroup ' + '">' +
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

        if (strLogs.length > 100 * KB) {
            var strErrors = "";
            var numErrorsAdded = 0;
            for (var i = xiLogs.errors.length - 1; i >= 0; i--) {
                var strError = JSON.stringify(xiLogs.errors[i]);
                if (strErrors.length + strError.length < errorLimit) {
                    if (strErrors.length) {
                        strErrors += ",";
                    }
                    strErrors += strError;
                } else {
                    numErrorsAdded = xiLogs.errors.length - 1 - i;
                    break;
                }
            }

            var lenRemaining = (100 * KB) - strErrors.length;
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
                         '"errors":[' + strErrors + ']}';
        }
        return strLogs;
    };

    SupTicketModal.submitTicket = function (ticketObj, licenseObj, noTop, noLog) {
        ticketObj.license = licenseObj;
        var deferred = jQuery.Deferred();
        PromiseHelper.alwaysResolve(XcalarApiTop(1000))
        .then(function(ret) {
            if (!noTop) {
                ticketObj.topInfo = ret;
            }
            var ticketStr = JSON.stringify(ticketObj);
            if (!noLog) {
                var logStr = SupTicketModal.trimRecentLogs();
                ticketStr = ticketStr.slice(0, -1);
                ticketStr += ',"xiLog":' + logStr + "}";
            }
            return XFTSupportTools.fileTicket(ticketStr);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    SupTicketModal.fetchLicenseInfo = function() {
        var deferred = jQuery.Deferred();
        XFTSupportTools.getLicense()
        .then(function(data) {
            var key = data.logs;
            jQuery.ajax({
                "type": "GET",
                "url": "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/keyinfo/" + encodeURIComponent(key),
                success: function(data) {
                    if (data.hasOwnProperty("expiration")) {
                        deferred.resolve({"key": key,
                                          "expiration": data.expiration,
                                          "organization": data.organization});
                    } else {
                        deferred.reject();
                    }
                },
                error: function(error) {
                    deferred.reject(error);
                }
            });
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        SupTicketModal.__testOnly__ = {};
        SupTicketModal.__testOnly__.submitBundle = submitBundle;
        SupTicketModal.__testOnly__.downloadTicket = downloadTicket;
        SupTicketModal.__testOnly__.submitForm = submitForm;
        SupTicketModal.__testOnly__.parseTicketList = parseTicketList;
        SupTicketModal.__testOnly__.getTickets = getTickets;
        SupTicketModal.__testOnly__.trimRecentLogs = SupTicketModal.trimRecentLogs;
    }
    /* End Of Unit Test Only */

    return (SupTicketModal);
}(jQuery, {}));
