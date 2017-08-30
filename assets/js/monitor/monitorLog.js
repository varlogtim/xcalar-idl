window.MonitorLog = (function(MonitorLog, $) {
    var $logCard;
    var defaultXcalarLogPath = "/var/log/xcalar/";
    var hosts = {};
    var hasError = {};
    var logs = {};
    var tabLength = 50;

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


    function addTabs() {
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
        if ($tab.hasClass("focus")) {
            if ($tab.next().length !== 0) {
                focusTab($tab.next());
            } else if ($tab.prev().length !== 0) {
                focusTab($tab.prev());
            } else {
                clearAll();
                return;
            }
        }
        deleteTab($tab);

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
        // 1 is the left border width
        var beginPosition = $logCard.find(".leftEnd").offset().left
                            + $logCard.find(".leftEnd").width() + 1;
        var totalLength = $logCard.find(".tab").length * tabLength;
        var visibleLength = $logCard.find(".tabArea").width();
        var pageLength = Math.floor(visibleLength / tabLength) * tabLength;
        var currentPosition = $logCard.find(".tabArea").offset().left;
        // 1 is the right border width
        if (Math.abs(currentPosition - beginPosition) + pageLength < totalLength) {
            $logCard.find(".tabArea").offset({"left": currentPosition - pageLength});
        }
    }

    function scrollToLeft() {
        var beginPosition = $logCard.find(".leftEnd").offset().left
                            + $logCard.find(".leftEnd").width() + 1;
        var visibleLength = $logCard.find(".tabArea").width();
        var pageLength = Math.floor(visibleLength / tabLength) * tabLength;
        var leftMost = beginPosition;
        var currentPosition = $logCard.find(".tabArea").offset().left;
        if (currentPosition + pageLength > leftMost) {
            $logCard.find(".tabArea").offset({"left": leftMost});
        } else {
            $logCard.find(".tabArea").offset({"left": currentPosition + pageLength});
        }
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

        // $logCard.find(".removeSessGroup").find(".xc-input")
        // .on("keydown", function(event) {
        //     if (event.which === keyCode.Enter) {
        //         removeSessionFiles();
        //     }
        // });
        // $logCard.find(".removeSessionFiles").click(function() {
        //     removeSessionFiles();
        // });

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

    // function removeSessionFiles() {
    //     var $inputGroup = $logCard.find(".removeSessGroup");
    //     var $input = $inputGroup.find(".xc-input");
    //     var val = $input.val().trim();
    //     $input.blur();

    //     var isValid = xcHelper.validate([
    //         {
    //             "$ele": $input // check if it"s empty
    //         }
    //     ]);

    //     if (!isValid) {
    //         return;
    //     }

    //     $inputGroup.addClass("xc-disabled");

    //     XFTSupportTools.removeSessionFiles(val)
    //     .then(function() {
    //         xcHelper.showSuccess(SuccessTStr.RmSession);
    //     })
    //     .fail(function(err) {
    //         var msg;
    //         if (err.error.statusText === "error") {
    //             msg = ErrTStr.Unknown;
    //         } else {
    //             msg = err.error.statusText;
    //         }
    //         if (!msg) {
    //             msg = ErrTStr.Unknown;
    //         }
    //         Alert.error(MonitorTStr.RemoveSessionFail, msg);
    //     })
    //     .always(function() {
    //         $inputGroup.removeClass("xc-disabled");
    //     });
    // }

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
                    logs[host] += '<div class="msgRow">' + result.logs + '</div>';
                } else {
                    if ((logs[host]).indexOf(result.error) === -1) {
                        logs[host] += '<div class="msgRow error">' + result.error +
                                      '</div>';
                        hasError[host] = true;
                    }
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
            $logCard.find(".content")
            .append('<div class="msgRow">' + result.logs + '</div>');
        } else {
            if ((logs[host]).indexOf(result.error) === -1) {
                $logCard.find(".content")
                .append('<div class="msgRow error">' + result.error + '</div>');
            }
        }
    }

    function updateHosts(ret) {
        var matchHosts = ret["matchHosts"];
        var matchNodeIds = ret["matchNodeIds"];
        for (var i = 0; i < matchHosts.length; i++) {
            var host = matchHosts[i];
            var nodeId = matchNodeIds[i];
            hosts[host] = nodeId;
            logs[host] = "";
        }
    }

    return (MonitorLog);
}({}, jQuery));
