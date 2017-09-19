window.MonitorLog = (function(MonitorLog, $) {
    var $logCard;
    var defaultXcalarLogPath = "/var/log/xcalar/";
    var hosts = {};
    var hasError = {};
    var logs = {};
    var tabLength = 50;
    var hasSetup = false;

    MonitorLog.setup = function() {
        $logCard = $("#monitorLogCard");
        addListeners();
        hasSetup = true;
    };

    MonitorLog.adjustTabNumber = function() {
        if (hasSetup &&
            $logCard.is(":visible") &&
            $logCard.find(".tab").length > 0)
        {
            arrowStatusCheck();
        }
    };

    function addTabs() {
        if ($.isEmptyObject(hosts)) {
            return;
        }
        var html = "";
        var $tabArea = $logCard.find('.tabArea');
        var keys = Object.keys(hosts);
        keys.sort(function(a, b) {
            return Number(hosts[a]) - Number(hosts[b]);
        });
        for (var i = 0; i < keys.length; i++) {
            var hostName = keys[i];
            var NodeId = hosts[hostName];
            html += '<div class="tab ' + (hasError[hostName] ? "error" : "") +
                    '" id="' + NodeId + '" data-toggle="tooltip" ' +
                    'data-container="body" data-original-title="' + hostName +
                    '">' + '<div class="tabLabel">Node ' + NodeId + '</div>' +
                    '<div class="tabClose">' +
                    '<i class="icon xi-cancel fa-10"></i></div></div>';
        }
        $tabArea.html(html);
        if (keys.length !== 0) {
            $logCard.find(".tabSection").addClass("withTabs");
        }
        var $tabs = $logCard.find('.tab');
        if ($tabs.length > 0) {
            focusTab($tabs.eq(0));
        }
        arrowStatusCheck();
    }

    function focusTab($tab) {
        var $tabs = $logCard.find('.tab');
        $tabs.removeClass("focus");
        $tab.addClass("focus");
        var hostName = $tab.data('original-title');
        var $content = $logCard.find(".content");
        $content.html(logs[hostName]);
    }

    function closeTab($tab) {
        xcTooltip.hideAll();
        if ($tab.hasClass("focus")) {
            if ($tab.next().length !== 0) {
                focusTab($tab.next());
            } else if ($tab.prev().length !== 0) {
                focusTab($tab.prev());
            } else {
                clearAll();
                stopMonitorLog();
                return;
            }
        }
        deleteTab($tab);
        arrowStatusCheck();

        function deleteTab($tab) {
            var host = $tab.data("original-title");
            delete hosts[host];
            delete hasError[host];
            delete logs[host];
            $tab.remove();
        }
    }

    function clearAll() {
        hosts = {};
        hasError = {};
        logs = {};
        $logCard.find(".tabSection").removeClass("withTabs");
        $logCard.find(".tabArea").html("");
        $logCard.find(".content").html("");
    }

    function clearLogs() {
        $logCard.find(".content").empty();
        logs = {};
    }

    function scrollToRight() {
        var checkPosition = tabAreaPositionCheck();
        if (checkPosition.canRight) {
            $logCard.find(".tabArea").offset({"left": checkPosition.nextRightStart});
            arrowStatusCheck();
        }
    }

    function scrollToLeft() {
        var checkPosition = tabAreaPositionCheck();
        if (checkPosition.canLeft) {
            $logCard.find(".tabArea").offset({"left": checkPosition.nextLeftStart});
            arrowStatusCheck();
        }
    }

    function arrowStatusCheck() {
        var checkPosition = tabAreaPositionCheck();
        if (checkPosition.canLeft) {
            $logCard.find(".leftEnd").removeClass("xc-disabled");
        } else {
            $logCard.find(".leftEnd").addClass("xc-disabled");
        }

        if (checkPosition.canRight) {
            $logCard.find(".rightEnd").removeClass("xc-disabled");
        } else {
            $logCard.find(".rightEnd").addClass("xc-disabled");
        }
    }

    function tabAreaPositionCheck() {
        var res = {};
        var beginPosition = $logCard.find(".leftEnd").offset().left
                            + $logCard.find(".leftEnd").width() + 1;
        var totalLength = $logCard.find(".tab").length * tabLength;
        var visibleLength = $logCard.find(".tabArea").width();
        var pageLength = Math.floor(visibleLength / tabLength) * tabLength;
        var currentPosition = $logCard.find(".tabArea").offset().left;
        if (Math.abs(currentPosition - beginPosition) + pageLength < totalLength) {
            res.canRight = true;
            res.nextRightStart = currentPosition - pageLength;
        } else {
            res.canRight = false;
        }
        if (currentPosition !== beginPosition) {
            res.canLeft = true;
            if (currentPosition + pageLength >= beginPosition) {
                res.nextLeftStart = beginPosition;
            } else {
                res.nextLeftStart = currentPosition + pageLength;
            }
        } else {
            res.canLeft = false;
        }
        return res;
    }

    function addListeners() {
        $logCard.find(".inputSection").find(".xc-input")
        .on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                getRecentLogs();
            }
        });

        $logCard.find(".getRecentLogs").click(function() {
            getRecentLogs();
        });

        $logCard.on("click", ".streamBtns .btn", function() {
            if ($(this).parent().hasClass("xc-disabled")) {
                return;
            }
            if ($(this).hasClass("stopStream")) {
                stopMonitorLog();
            } else {
                startMonitorLog();
            }
            return false;
        });

        $logCard.find(".clear").click(function() {
            clearLogs();
        });

        $logCard.on('click', '.tab', function() {
            focusTab($(this));
            return false;
        });

        $logCard.find(".leftEnd").click(function() {
            scrollToLeft();
            return false;
        });

        $logCard.find(".rightEnd").click(function() {
            scrollToRight();
            return false;
        });

        $logCard.on('click', '.tabClose .icon', function() {
            closeTab($(this).closest('.tab'));
            return false;
        });
    }

    function getHost() {
        var deferred = jQuery.Deferred();
        var $inputSection = $logCard.find(".inputSection");
        var hostnamePattern = $inputSection.find(".hostnamePattern .xc-input")
                              .val().trim();

        XFTSupportTools.getMatchHosts(hostnamePattern)
        .then(function(ret) {
            updateHosts(ret);
            if ($.isEmptyObject(hosts)) {
                deferred.reject({"logs": MonitorTStr.GetHostsFail});
            } else {
                deferred.resolve();
            }
        })
        .fail(function(err) {
            clearAll();
            deferred.reject(err);
        });
        return deferred.promise();
    }

    function getRecentLogs() {
        var $inputSection = $logCard.find(".inputSection");
        var $input = $inputSection.find(".xc-input").eq(1);
        var lastNRow = $inputSection.find(".lastRow .xc-input").val().trim();
        var fileName = $inputSection.find(".logName .xc-input").val().trim();
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

        $inputSection.addClass("xc-disabled");
        clearAll();

        getHost()
        .then(function() {
            return XFTSupportTools.getRecentLogs(lastNRow, filePath,
                    fileName, hosts);
        })
        .then(function(ret) {
            xcHelper.showSuccess(SuccessTStr.RetrieveLogs);
            appendLog(ret.results);
        })
        .fail(function(err) {
            if (err && err.results) {
                xcHelper.showSuccess(SuccessTStr.RetrieveLogs);
                appendLog(err.results);
            } else {
                var msg = ErrTStr.Unknown;
                if (err && err.logs && err.logs !== "error") {
                    msg = err.logs;
                }
                Alert.error(MonitorTStr.GetLogsFail, msg);
            }
        })
        .always(function() {
            $inputSection.removeClass("xc-disabled");
            $input.blur();
            xcTooltip.hideAll();
        });
    }

    function getFilePath() {
        var filePath = defaultXcalarLogPath;
        $("#configCard .formRow .paramName").each(function() {
            if ($(this).val() === "XcalarLogCompletePath") {
                filePath = $(this).closest(".formRow").find(".curVal").val();
                // stop loop
                return false;
            }
        });
        return filePath;
    }

    function startMonitorLog() {
        var $streamBtns = $logCard.find(".streamBtns");
        $("#monitorLogCard .inputSection .xc-input").prop('disabled', true);
        $streamBtns.addClass("streaming");
        var fileName = $("#monitorLogCard .logName .xc-input")
                       .val().trim();
        var filePath = getFilePath();

        clearAll();
        getHost()
        .then(function() {
            XFTSupportTools.monitorLogs(filePath, fileName, hosts,
            function(err) {
                if (err && err.results) {
                    appendLog(err.results, true);
                } else {
                    var msg = ErrTStr.Unknown;
                    if (err && err.logs && err.logs !== "error") {
                        msg = err.logs;
                    }
                    Alert.error(MonitorTStr.StartStreamFail, msg);
                    stopMonitorLog();
                }
            }, function(ret) {
                if (ret && ret.results) {
                    appendLog(ret.results, true);
                }
            });
        })
        .fail(function(err) {
            console.log(err);
            var msg = MonitorTStr.GetHostsFail;
            if (err && err.logs) {
                msg = err.logs;
            }
            Alert.error(MonitorTStr.StartStreamFail, msg);
            stopMonitorLog();
        });
    }

    function stopMonitorLog() {
        var $streamBtns = $logCard.find(".streamBtns");
        $streamBtns.removeClass("streaming");
        $("#monitorLogCard .inputSection .xc-input").prop('disabled', false);
        XFTSupportTools.stopMonitorLogs();
    }

    function appendLog(results, isMonitoring) {
        saveResults(results);
        if (isMonitoring && $logCard.find(".tabSection").hasClass("withTabs")) {
            appendResultToFocusTab(results);
        } else {
            addTabs();
        }
    }

    function getTabByHostName(hostName) {
        var selector ='[data-original-title="' + hostName + '"]';
        $logCard.find(".tab").find(selector);
    }

    function saveResults(results) {
        for (var host in results) {
            if (hosts[host]) {
                var result = results[host];
                if (result.status === 200) {
                    if (result.logs) {
                        logs[host] += '<div class="msgRow">' + result.logs + '</div>';
                    }
                } else {
                    if (result.error) {
                        if ((logs[host]).indexOf(result.error) === -1) {
                            logs[host] += '<div class="msgRow error">' + result.error +
                                          '</div>';
                        }
                    } else {
                        if ((logs[host]).indexOf(MonitorTStr.GetLogsFail) === -1) {
                            logs[host] += '<div class="msgRow error">' + MonitorTStr.GetLogsFail +
                                          '</div>';
                        }
                    }
                    hasError[host] = true;
                    $tab = getTabByHostName(host);
                    if ($tab) {
                        $tab.addClass("error");
                    }
                }
            }
        }
    }

    function appendResultToFocusTab(results) {
        var host = $logCard.find(".tab.focus").data("original-title");
        var result = results[host];
        if (result.status === 200) {
            if (result.logs) {
                $logCard.find(".content")
                .append('<div class="msgRow">' + result.logs + '</div>');
            }
        } else {
            if (result.error) {
                if ((logs[host]).indexOf(result.error) === -1) {
                    $logCard.find(".content")
                    .append('<div class="msgRow error">' + result.error + '</div>');
                }
            } else {
                if ((logs[host]).indexOf(MonitorTStr.GetLogsFail) === -1) {
                    $logCard.find(".content")
                    .append('<div class="msgRow error">' + MonitorTStr.GetLogsFail + '</div>');
                }
            }
        }
    }

    function updateHosts(ret) {
        var matchHosts = ret["matchHosts"];
        var matchNodeIds = ret["matchNodeIds"];
        var duplicateHosts = false;
        for (var i = 0; i < matchHosts.length; i++) {
            var host = matchHosts[i];
            var nodeId = matchNodeIds[i];
            if (host in hosts) {
                duplicateHosts = true;
                continue;
            }
            hosts[host] = nodeId;
            logs[host] = "";
        }
        if (duplicateHosts) {
            Alert.error(MonitorTStr.GetLogsFail, MonitorTStr.GetDuplicateHost);
        }
    }
    /* Unit Test Only */
    if (window.unitTestMode) {
        MonitorLog.__testOnly__ = {};
        MonitorLog.__testOnly__.getThisHosts = function() {
            return hosts;
        };
        MonitorLog.__testOnly__.getThisLogs = function() {
            return logs;
        };
        MonitorLog.__testOnly__.getHost = getHost;
        MonitorLog.__testOnly__.getRecentLogs = getRecentLogs;
        MonitorLog.__testOnly__.appendResultToFocusTab = appendResultToFocusTab;
    }
    /* End Of Unit Test Only */

    return (MonitorLog);
}({}, jQuery));
