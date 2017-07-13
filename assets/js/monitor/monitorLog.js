window.MonitorLog = (function(MonitorLog, $) {
    var $logCard;
    var colorNum = 8;
    var defaultXcalarLogPath = "/var/log/xcalar/";
    var emptyString = "is empty";
    var logsString = "Logs:";
    var hasEmptyRecord = {};

    MonitorLog.setup = function() {
        $logCard = $("#monitorLogCard");
        addListeners();
    };

    MonitorLog.show = function() {
        $logCard.show();
    };

    MonitorLog.close = function() {
        $logCard.hide();
    };

    function addListeners() {
        $logCard.find(".recentLogsGroup").find(".xc-input")
        .on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                getRecentLogs();
            }
        });
        $logCard.find(".getRecentLogs").click(function() {
            getRecentLogs();
        });

        $logCard.find(".removeSessGroup").find(".xc-input")
        .on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                removeSessionFiles();
            }
        });
        $logCard.find(".removeSessionFiles").click(function() {
            removeSessionFiles();
        });

        $logCard.find(".streamBtns").on("click", ".btn", function() {
            if ($(this).parent().hasClass("xc-disabled")) {
                return;
            }
            if ($(this).hasClass("stopStream")) {
                stopMonitorLog();
            } else {
                startMonitorLog();
            }
        });

        $logCard.find(".clear").click(function() {
            clearLogs();
        });
    }

    function getRecentLogs() {
        var $recentLogsGroup = $logCard.find(".recentLogsGroup");
        var $input = $recentLogsGroup.find(".xc-input").eq(1);
        var lastNRow = $recentLogsGroup.find(".lastRow .xc-input").val().trim();
        var fileName = $recentLogsGroup.find(".logName .xc-input").val().trim();
        var filePath = getFilePath();
        $input.blur();

        var isValid = xcHelper.validate([
            {
                "$ele": $input // check if it"s empty
            },
            {
                "$ele": $input,
                "error": "Please enter a value between 1 and 500",
                "check": function() {
                    return (!(parseInt(lastNRow) > 0 && parseInt(lastNRow) < 501));
                }
            }
        ]);
        if (!isValid) {
            return false;
        }
        lastNRow = parseInt(lastNRow);

        $recentLogsGroup.addClass("xc-disabled");

        XFTSupportTools.getRecentLogs(lastNRow, filePath, fileName)
        .then(function(ret) {
            xcHelper.showSuccess(SuccessTStr.RetrieveLogs);
            appendLog(ret.logs);
        })
        .fail(function(err) {
            var msg;
            if (err) {
                // the error status is not set by
                // server, it may due to other reasons
                if (err.logs) {
                    // unexpect erro shos up
                    if (err.unexpectedError) {
                        msg = (err.logs === "error")? ErrTStr.Unknown : err.logs;
                        Alert.error(MonitorTStr.GetLogsFail, msg);
                    } else {
                        // the reason for why all the nodes are success or
                        // fail is known and defined.
                        xcHelper.showSuccess(SuccessTStr.RetrieveLogs);
                        appendLog(err.logs);
                    }
                }
            } else {
                msg = ErrTStr.Unknown;
                Alert.error(MonitorTStr.GetLogsFail, msg);
            }
        })
        .always(function() {
            $recentLogsGroup.removeClass("xc-disabled");
            $input.blur();
            xcTooltip.hideAll();
        });
    }

    function getFilePath() {
        var filePath = defaultXcalarLogPath;
        $("#configCard .formRow .paramName").each(function() {
            if ($(this).val() === "XcalarLogCompletePath") {
                filePath = $(this).closest(".formRow").find(".flexGroup .curVal").val();
                // stop loop
                return false;
            }
        });
        return filePath;
    }

    function removeSessionFiles() {
        var $inputGroup = $logCard.find(".removeSessGroup");
        var $input = $inputGroup.find(".xc-input");
        var val = $input.val().trim();
        $input.blur();

        var isValid = xcHelper.validate([
            {
                "$ele": $input // check if it"s empty
            }
        ]);

        if (!isValid) {
            return;
        }

        $inputGroup.addClass("xc-disabled");

        XFTSupportTools.removeSessionFiles(val)
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.RmSession);
        })
        .fail(function(err) {
            var msg;
            if (err.error.statusText === "error") {
                msg = ErrTStr.Unknown;
            } else {
                msg = err.error.statusText;
            }
            if (!msg) {
                msg = ErrTStr.Unknown;
            }
            Alert.error(MonitorTStr.RemoveSessionFail, msg);
        })
        .always(function() {
            $inputGroup.removeClass("xc-disabled");
        });
    }

    function startMonitorLog() {
        var $streamBtns = $logCard.find(".streamBtns");
        $("#monitorLogCard .recentLogsGroup .xc-input").prop('disabled', true);
        $streamBtns.addClass("streaming");
        var fileName = $("#monitorLogCard .recentLogsGroup .logName .xc-input")
                       .val().trim();
        var filePath = getFilePath();
        XFTSupportTools.monitorLogs(filePath, fileName, function(err) {
            var msg;
            if (err && err.logs) {
                // unexpected error showed up
                if (err.unexpectedError) {
                    msg = (err.logs === "error")? ErrTStr.Unknown : err.logs;
                    Alert.error(MonitorTStr.StartStreamFail, msg);
                } else {
                    // XXX This doesn't make sense. If they are all successful,
                    // then why are they in the errorHandler? There must be
                    // errors. If that is the case, then why we adding the
                    // streaming class?

                    // The way that this part is handled is not very clean,
                    // and rather hard to understand. Recommend redesigning

                    // the reason for why all the nodes are success or
                    // fail is known and defined.
                    appendLog(err.logs);
                }
            } else {
                msg = ErrTStr.Unknown;
                Alert.error(MonitorTStr.StartStreamFail, msg);
            }
        }, function(ret) {
            if (ret && ret.logs) {
                appendLog(ret.logs);
            }
        });
    }

    function stopMonitorLog() {
        var $streamBtns = $logCard.find(".streamBtns");
        $streamBtns.removeClass("streaming");
        $("#monitorLogCard .recentLogsGroup .xc-input").prop('disabled', false);
        XFTSupportTools.stopMonitorLogs();
        hasEmptyRecord = {};
    }

    function appendLog(msg) {
        var rowInfo = splitLogByHost(msg);
        if (rowInfo !== "") {
            var row = '<div class="msgRow"></div>';
            var $content = $logCard.find(".content");
            var scrollHeight = $content[0].scrollHeight;
            var curScrollTop = $content.scrollTop();
            var contentHeight = $content.height();
            $logCard.find(".content").append(row);
            $logCard.find(".content").find(".msgRow").last()
                    .html(rowInfo);
            if (curScrollTop + contentHeight + 30 > scrollHeight) {
                $content.scrollTop($content[0].scrollHeight);
            }
        }
    }

    function splitLogByHost(logs) {
        var colorId = 0;
        var out = "";
        var allNodes = logs.split("Host:");
        for (var i = 0; i < allNodes.length; i++) {
            if (allNodes[i] === "" ||
                allNodes[i].indexOf("for all Nodes:") !== -1) {
                continue;
            } else {
                var color = "color" + colorId;
                var secondRowStart = allNodes[i].indexOf("\n") + 1;
                var hostName = allNodes[i].substring(0, secondRowStart);
                var hostInfo = allNodes[i].substring(secondRowStart);
                var hideThisRecord = false;
                if (hostInfo.indexOf(emptyString) !== -1) {
                    // if "... is empty" shows up the more than once, neglect this record
                    if (hasEmptyRecord[hostName]) {
                        hideThisRecord = true;
                    } else {
                        hasEmptyRecord[hostName] = true;
                    }
                } else {
                    hasEmptyRecord[hostName] = false;
                    // if no new log is generated, neglect this record
                    if (hostInfo.indexOf(logsString) === -1) {
                        hideThisRecord = true;
                    }
                }

                if (!hideThisRecord) {
                    out += "<div class='" + color + " recordForOneHost'>" +
                                "<div class='hostName'>" +
                                    "Host:" + hostName +
                                "</div>" +
                                "<div class='hostInfo'>" +
                                    hostInfo +
                                "</div>" +
                            "</div>";
                }
                colorId++;
                if (colorId >= colorNum) {
                    colorId -= colorNum;
                }
            }
        }
        return out;
    }

    function clearLogs() {
        $logCard.find(".content").empty();
    }

    return (MonitorLog);
}({}, jQuery));
