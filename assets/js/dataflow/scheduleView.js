window.Scheduler = (function(Scheduler, $) {
    var $scheduleDetail;   // $("#scheduleDetail");
    var $scheduleSettings; // $("#scheduleSettings");
    var $modScheduleForm;  // $('#modifyScheduleForm');
    var $timePicker;
    var $dateInput;
    var $timeInput;
    var $historySection;
    var $detailsSection;

    var currentDataFlowName;
    var displayServerTimeCycle;
    var outputLocation;

    // constant
    var scheduleFreq = {
        "minute": "minute",
        "hourly": "hourly",
        "daily": "daily",
        "weekly": "weekly",
        "biweekly": "biweekly",
        "monthly": "monthly",
        "dayPerMonth": "dayPerMonth"
    };

    Scheduler.setup = function() {
        $scheduleDetail = $("#scheduleDetail");
        $scheduleSettings = $("#scheduleSettings");
        $scheduleResults = $("#scheduleResults");
        $modScheduleForm = $('#modifyScheduleForm');
        $timePicker = $("#modScheduler-timePicker");
        $dateInput = $modScheduleForm.find(".timeSection .date");
        $timeInput = $modScheduleForm.find(".timeSection .time");
        $historySection = $("#scheduleTable .historySection");
        $detailsSection = $("#scheduleTable .detailsSection");

        // Card
        $scheduleDetail.find(".close").on("click", function() {
            Scheduler.hide();
        });

        // Simple Mode
        $dateInput.datepicker({
            "showOtherMonths": true,
            "dateFormat": "m/d/yy",
            "dayNamesMin": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate": 0,
            "timezone": "utc",
            "beforeShow": function() {
                if ($dateInput.val() === "") {
                    var date = new Date();
                    var str = (date.getUTCMonth() + 1) + "/" + date.getUTCDate()
                              + "/" + date.getUTCFullYear();
                    $dateInput.datepicker("setDate", str);
                }
                var $el = $("#ui-datepicker-div");
                $el.addClass("schedulerDatePicker")
                   .appendTo($scheduleSettings.find(".datePickerPart"));
            }
        });

        $dateInput.on({
            "focus": function() {
                $(this).closest(".datePickerPart").addClass("active");
            },
            "focusout": function() {
                var date = $(this).val();
                isValid = xcHelper.validate([
                    {
                        "$ele": $(this),
                        "text": ErrTStr.NoEmpty,
                        "check": function() {
                            if (date !== "") {
                                return !testDate(date);
                            } else {
                                return false;
                            }
                        }
                    }
                ]);

                if (isValid) {
                    $(this).closest(".datePickerPart").removeClass("active");
                }

                if (!isSimpleMode()) {
                    if (!isValid) {
                        showScheduleSettings();
                        $scheduleSettings.find(".datePickerPart")
                        .removeClass("active");
                        $scheduleSettings.find(".timePickerPart")
                        .removeClass("active");
                        StatusBox.forceHide();
                    }
                }
            }
        });

        $timeInput.on({
            "focus": function() {
                toggleTimePicker($modScheduleForm, true);
                $(this).closest(".timePickerPart").addClass("active");
            },
            "focusout": function() {
                $(this).closest(".timePickerPart").removeClass("active");
            },
            "keydown": function() {
                // no input event
                return false;
            }
        });

        $timePicker.on("click", ".btn", function() {
            var $btn = $(this).blur();
            var isIncrease = $btn.hasClass("increase");
            var type;
            if ($btn.hasClass("hour")) {
                type = "hour";
            } else if ($btn.hasClass("minute")) {
                type = "minute";
            } else {
                type = "ampm";
            }
            changeTime(type, isIncrease);
        });

        $timePicker.on("input", "input", function() {
            var $input = $(this);
            var type;
            if ($input.hasClass("hour")) {
                type = "hour";
            } else if ($input.hasClass("minute")) {
                type = "minute";
            } else {
                // invalid case
                return;
            }
            inputTime(type, $input.val());
        });

        // frequent section event
        var $freqSection = $modScheduleForm.find(".frequencySection");
        xcHelper.optionButtonEvent($freqSection);

        // advanced Mode
        $("#modScheduleForm-simulate").click(function() {
            $(this).blur();
            validateCron();
        });

        // Toggling between simple/advanced Mode
        $scheduleSettings.on("click", ".simpleModeTab", function() {
            $scheduleSettings.addClass("showSimpleMode")
                             .removeClass("showAdvancedMode");
            // $("#scheduleDetail .icon-wrap").removeClass("active");
        });

        $scheduleSettings.on("click", ".advancedModeTab", function() {
            $scheduleSettings.addClass("showAdvancedMode")
                             .removeClass("showSimpleMode");
        });

        // Card bottom
        $("#modScheduleForm-delete").click(function() {
            $(this).blur();
            Alert.show({
                "title": SchedTStr.DelSched,
                "msg": SchedTStr.DelSchedMsg,
                "onConfirm": function() {
                    removeSchedule(currentDataFlowName);
                }
            });
        });

        $("#modScheduleForm-save").click(function() {
            $(this).blur();
            saveScheduleForm(currentDataFlowName)
            .then(function() {
                Scheduler.show(currentDataFlowName);
            })
            .fail(function() {
                // declined to proceed with save or invalid schedule, handled
            });
        });

        $("#modScheduleForm-cancel").click(function() {
            $(this).blur();
            showScheduleSettings();
        });

        $("#modScheduleForm-refresh").click(function() {
            $(this).blur();
            showScheduleResult();
        });

        $("#modScheduleForm-pause").click(function() {
            var $btn = $(this).blur();
            xcHelper.disableSubmit($btn);

            pauseSchedule(currentDataFlowName)
            .always(function() {
                xcHelper.enableSubmit($btn);
            });
        });

        $("#modScheduleForm-resume").click(function() {
            var $btn = $(this).blur();
            xcHelper.disableSubmit($btn);

            resumeSchedule(currentDataFlowName)
            .always(function() {
                xcHelper.enableSubmit($btn);
            });
        });

        // schedule Tabs
        $scheduleDetail.on("click", ".tabArea .tab", function() {
            var $tab = $(this);
            if ($tab.hasClass("active")) {
                return;
            }
            switchTab($tab.index());
        });

        $historySection.on("click", ".row", function() {
            var $row = $(this);
            var index = $historySection.find(".row").index(this);
            $historySection.find(".row").removeClass("chosen");
            $detailsSection.find(".record").removeClass("chosen");
            $row.addClass("chosen");
            var $record = $detailsSection.find(".record").eq(index);
            $record.addClass("chosen");
        });
    };

    Scheduler.show = function(dataflowName) {
        currentDataFlowName = dataflowName;

        $scheduleDetail.removeClass("xc-hidden")
                       .removeClass("locked");
        $scheduleDetail.find(".scheduleHeading .heading").text(dataflowName);
        // show schedule settings as default
        switchTab(0);
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            lockCard();
        } else {
            unlockCard();
        }
        displayServerTimeInterval();
        var top = $scheduleDetail.position().top -
                  $scheduleDetail.parent().position().top;
        $("#dataflowPanel").find(".mainContent").scrollTop(top);
    };

    Scheduler.hide = function() {
        currentDataFlowName = null;
        $('#modifyScheduleForm .timePickerPart').removeClass("active");
        $('#modifyScheduleForm .datePickerPart').removeClass("active");
        StatusBox.forceHide();
        $scheduleDetail.addClass("xc-hidden");
        clearServerTimeInterval();
    };

    function lockCard() {
        $scheduleDetail.find(".cardLocked").show();
    }

    function unlockCard() {
        $scheduleDetail.find(".cardLocked").hide();
    }

    function switchTab(index) {
        var $tabs = $scheduleDetail.find(".tabArea .tab");
        $tabs.removeClass("active");
        $tabs.eq(index).addClass("active");
        if (index === 0) {
            $scheduleDetail.removeClass("detail");
            showScheduleSettings();
        } else {
            $scheduleDetail.addClass("detail");
            showScheduleResult();
        }
    }

    function showServerTime() {
        var $serverTime = $scheduleDetail.find(".serverTime .text");
        var serverTimeStr = getUTCStr(new Date(), false, true);
        $serverTime.text(serverTimeStr);
    }

    function displayServerTimeInterval() {
        var time = 1000 * 30; // 0.5 minute
        clearServerTimeInterval();
        showServerTime();
        displayServerTimeCycle = setInterval(showServerTime, time);
    }

    function clearServerTimeInterval() {
        clearInterval(displayServerTimeCycle);
        displayServerTimeCycle = null;
    }

    function removeSchedule(dataflowName) {
        var deferred = jQuery.Deferred();
        var $list = DFCard.getDFList(dataflowName);
        var $icon = $list.find(".addScheduleToDataflow");

        $scheduleDetail.addClass("locked");
        DF.removeScheduleFromDataflow(dataflowName)
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.RmSched);
            $icon.remove();
            if (dataflowName === currentDataFlowName) {
                Scheduler.hide();
                $("#dfViz").removeClass("withSchedule");
            }
            DF.commitAndBroadCast(dataflowName);
            deferred.resolve();
        })
        .fail(function(error) {
            if (dataflowName === currentDataFlowName) {
                $scheduleDetail.removeClass("locked");
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function updateSchedule() {
        var deferred = jQuery.Deferred();
        var schedule = DF.getSchedule(currentDataFlowName);
        XcalarListSchedules(currentDataFlowName)
        .then(function(data) {
            if (data) {
                scheduleObj = data[0].scheduleMain;
                schedule.isPaused = scheduleObj["options"]["isPaused"];
                schedule.startTime = scheduleObj["timingInfo"]["startTime"];
                deferred.resolve();
            } else {
                deferred.reject();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function pauseSchedule(dataflowName) {
        var deferred = jQuery.Deferred();

        XcalarPauseSched(dataflowName)
        .then(function() {
            return updateSchedule();
        })
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.PauseSched);
            $scheduleDetail.addClass("pauseState");
            showScheduleSettings();
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("pause schedule failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function resumeSchedule(dataflowName) {
        var deferred = jQuery.Deferred();

        XcalarResumeSched(dataflowName)
        .then(function() {
            return updateSchedule();
        })
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.ResumeSched);
            $scheduleDetail.removeClass("pauseState");
            showScheduleSettings();
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("resume schedule failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function existScheduleIcon(dataflowName) {
        if (dataflowName === currentDataFlowName) {
            $("#dfViz").addClass("withSchedule");
        }
        var html = '<i class="icon xi-menu-scheduler addScheduleToDataflow" ' +
                        'title="' + DFTStr.Scheduled + '" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                    '</i>';
        var $list = DFCard.getDFList(dataflowName);
        $list.find(".iconWrap")
             .html(html);
    }

    function showScheduleSettings() {
        var schedule = DF.getSchedule(currentDataFlowName);
        var tmpSchedObj = schedule || {};

        var $timeSection = $modScheduleForm.find(".timeSection");
        var $freqSection = $modScheduleForm.find(".frequencySection");

        // Update the schedule detail card
        // Created
        var created = getUTCStr(tmpSchedObj.created, false, true) || "N/A";
        $scheduleSettings.find(".created .text").text(created);

        // Last modified
        var modified = getUTCStr(tmpSchedObj.modified, false, true) || "N/A";
        $scheduleSettings.find(".modified .text").text(modified);

        // Next run (update use schedule, not scheObj)
        getNextRunTime(schedule);
        if (!tmpSchedObj.isPaused) {
            var startTime = getUTCStr(tmpSchedObj.startTime, false, true) || "N/A";
        } else {
            startTime = "The schedule is Paused";
        }
        $scheduleSettings.find(".nextRunInfo .text").text(startTime);

        // date picker input
        var dateText = tmpSchedObj.dateText || "";
        $timeSection.find(".date").val(dateText);

        // time picker input
        var timeText = tmpSchedObj.timeText || "";
        $timeSection.find(".time").val(timeText);

        // frequency
        if (!tmpSchedObj.repeat) {
            $freqSection.find(".radioButton.active").removeClass("active");
            $freqSection.find('.radioButton[data-option="minute"]').click();
        } else {
            $freqSection.find('.radioButton[data-option="' +
                             tmpSchedObj.repeat + '"]').click();
        }

        // cron
        var cronString = tmpSchedObj.premadeCronString || "";
        $("#cronScheduler").val(cronString);

        // title
        var title = schedule ? SchedTStr.detail : SchedTStr.NewSched;
        $scheduleDetail.find(".cardHeader .title").text(title);

        // button
        if (!jQuery.isEmptyObject(tmpSchedObj)) {
            if (tmpSchedObj.isPaused) {
                $("#scheduleDetail").addClass("pauseState");
            } else {
                $("#scheduleDetail").removeClass("pauseState");
            }
        }

        if (schedule) {
            $scheduleDetail.addClass("withSchedule")
                           .removeClass("withoutSchedule");
            if (schedule.premadeCronString) {
                switchMode(true);
            } else {
                switchMode();
                setSimulationInfos();
            }
        } else {
            $scheduleDetail.removeClass("withSchedule")
                           .addClass("withoutSchedule");
            switchMode();
            setSimulationInfos();
        }
    }

    function switchMode(toAdvanceMode) {
        if (toAdvanceMode) {
            $scheduleSettings.find(".advancedModeTab").click();
        } else {
            $scheduleSettings.find(".simpleModeTab").click();
        }
    }

    function setSimulationInfos(options) {
        options = options || {};
        var lastRun = options.lastRun || "";
        var nextRun = options.nextRun || "";
        var error = options.error || "";
        $modScheduleForm.find(".errorInfo").text(error);
        $modScheduleForm.find(".simulateLast .text").text(lastRun);
        $modScheduleForm.find(".simulateNext .text").text(nextRun);
    }

    function validateCron(showErrBox) {
        var $cronScheduler = $("#cronScheduler");
        var cronString = $cronScheduler.val().trim();

        if (!cronString) {
            setSimulationInfos();
            StatusBox.show(ErrTStr.NoEmpty, $cronScheduler);
            return null;
        }

        var res = simulateCron(cronString);
        setSimulationInfos(res);
        if (res.isValid) {
            return cronString;
        } else {
            if (showErrBox) {
                StatusBox.show(ErrTStr.InvalidField, $cronScheduler);
            }
            return null;
        }
    }

    function simulateCron(cronString) {
        var options = {
            "currentDate": new Date().getTime()
        };
        var res;
        try {
            var interval = CronParser.parseExpression(cronString, options);
            var next1 = interval.next();
            var lastRun = getUTCStr(next1.getTime(), false, true);
            var next2 = interval.next();
            var nextRun = getUTCStr(next2.getTime(), false, true);
            res = {
                "isValid": true,
                "lastRun": lastRun,
                "nextRun": nextRun,
                "cronString": cronString
            };
        } catch (err) {
            res = {
                "isValid": false,
                "lastRun": SchedTStr.simFail,
                "nextRun": SchedTStr.simFail,
                "error": err.message
            };
        }
        return res;
    }

    // dateStr: with the format of 3/1/2017
    // timeStr: with the format of 02 : 51 PM
    // completeTimeStr: with the format of 3/1/2017 02:51 PM UTC+0
    function getDate(dateStr, timeStr) {
        var completeTimeStr = dateStr + " " + timeStr.replace(" ", "") + " utc";
        return new Date(completeTimeStr);
    }

    function getUTCStr(input, isShowSecond, withUTCSuffix) {
        var date;
        if (typeof input === "number") {
            date = new Date(input);
        } else if (input instanceof Date) {
            date = input;
        } else {
            return null;
        }
        return (date.getUTCMonth() + 1) + "/" +
                date.getUTCDate() + "/" +
                date.getUTCFullYear() + " " +
                getHourIndex(date.getUTCHours()) + ":" +
                addPrefixZero(date.getUTCMinutes()) +
                (isShowSecond ? (":" + addPrefixZero(date.getUTCSeconds())) : "") +
                " " + getAMPM(date.getUTCHours()) +
                (withUTCSuffix ? " UTC" : "");
    }

    function getHourIndex(hour) {
        if (hour > 12) {
            hour = hour - 12;
        }
        if (hour === 0) {
            hour = 12;
        }
        return hour;
    }

    function getAMPM(hour) {
        if (hour >= 12) {
            return "PM";
        }
        return "AM";
    }

    function addPrefixZero(input) {
        if (input < 10) {
            return "0" + input;
        }
        return input;
    }
    function isSimpleMode() {
        return $scheduleSettings.hasClass("showSimpleMode");
    }

    function saveScheduleForm(dataflowName) {
        var deferred = jQuery.Deferred();
        var isValid;
        var currentTime;
        var options;

        if (isSimpleMode()) {
            // Simple mode

            isValid = xcHelper.validate([{
                "$ele": $dateInput,
                "text": ErrTStr.NoEmpty,
                "check": function() {
                    var date = $dateInput.val();
                    if (date !== "") {
                        return !testDate(date);
                    } else {
                        return true;
                    }
                }
            }]);

            if (!isValid) {
                return PromiseHelper.reject();
            }

            var $hourInput = $('#modifyScheduleForm .timePicker:visible')
            .find('input.hour');
            var $minInput = $('#modifyScheduleForm .timePicker:visible')
            .find('input.minute');
            if ($("#modScheduler-timePicker").is(":visible")) {
                if ($hourInput.val() > 12 || $hourInput.val() < 1) {
                    StatusBox.show(ErrTStr.SchedHourWrong, $hourInput, false, {
                        "side": "left"
                    });
                } else if ($minInput.val() > 59 || $minInput.val() < 0) {
                    StatusBox.show(ErrTStr.SchedMinWrong, $minInput, false, {
                        "side": "right"
                    });
                }
                return PromiseHelper.reject();
            }

            var dateStr = $dateInput.val().trim();
            var timeStr = $timeInput.val().trim();
            var repeat = $modScheduleForm
                         .find(".frequencySection .radioButton.active")
                         .data("option");
            if (repeat === undefined) {
                repeat = "minute";  // default choice
            }
            startTime = getDate(dateStr, timeStr).getTime();
            // Everything should use servertime, transfer the current time
            // to server time
            currentTime = new Date().getTime();
            if (startTime < currentTime) {
                StatusBox.show(ErrTStr.TimeExpire, $timeInput);
                return PromiseHelper.reject();
            }

            options = {
                "startTime": startTime, // In milliseconds
                "dateText": dateStr,       // String
                "timeText": timeStr,       // String
                "repeat": repeat,       // element in scheduleFreq in Scheduler
                "modified": currentTime,// In milliseconds
                "created": currentTime,
                "activeSession": false,
                "newTableName": "",
                "usePremadeCronString": false,
                "premadeCronString": "",
                "isPaused": false
            };
        } else {
            // Advanced mode, is considered starting immediately
            var cronString = validateCron(true);
            if (cronString == null) {
                // invalid case
                return PromiseHelper.reject();
            }
            currentTime = new Date().getTime();
            options = {
                "startTime": currentTime,  // In milliseconds
                "dateText": "", // String
                "timeText": "", // String
                "repeat": "N/A",
                "modified": currentTime,
                "created": currentTime,
                "activeSession": false,
                "newTableName": "",
                "usePremadeCronString": true,
                "premadeCronString": cronString,
                "isPaused": false
            };
        }

        checkExportFileName(currentDataFlowName)
        .then(function() {
            if (isSimpleMode()) {
                setSimulationInfos();
            }

            DF.addScheduleToDataflow(dataflowName, options);
            xcHelper.showSuccess(SuccessTStr.Sched);
            existScheduleIcon(dataflowName);

            deferred.resolve();
        })
        .fail(deferred.reject);


        return deferred.promise();
    }


    // alert if export name does not contain system parameter
    function checkExportFileName(dataflowName) {
        var deferred = jQuery.Deferred();
        var dfObj = DF.getDataflow(dataflowName);
        var exportNodes = dfObj.retinaNodes.filter(function(a) {
            return XcalarApisT.XcalarApiExport === a.api;
        });
        var notFound = false;
        for (var i = 0; i < exportNodes.length; i++) {
            var exportInfo = exportNodes[0].input.exportInput;
            var fileName = exportInfo.meta.specificInput.sfInput.fileName;
            var sysParamFound = false;
            for (var paramName in systemParams) {
                var sysParam = "<" + paramName + ">";
                if (fileName.indexOf(sysParam) > -1) {
                    sysParamFound = true;
                    break;
                }
            }

            if (!sysParamFound) {
                notFound = true;
                break;
            }
        }

        if (notFound) {
            Alert.show({
                title: AlertTStr.Title,
                msg: SchedTStr.NoExportParam,
                onConfirm: function() {
                    deferred.resolve();
                },
                onCancel: function() {
                    deferred.reject();
                }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function showScheduleResult() {
        if ($scheduleResults.hasClass("loading") &&
            $scheduleResults.data("df") === currentDataFlowName) {
            console.info("still loading old schedule info");
            return PromiseHelper.resolve();
        }
        // other case, will restart and ingore old fetching result

        var deferred = jQuery.Deferred();
        var $refreshBtn = $("#modScheduleForm-refresh");
        var outputStr = "";
        $historySection.html("");
        $detailsSection.html("");
        $refreshBtn.addClass("xc-disabled");

        var dataflowName = currentDataFlowName;
        $scheduleResults.addClass("loading").data("df", dataflowName);

        getOutputLocation()
        .then(function(res) {
            outputStr = res;
            return XcalarListSchedules(currentDataFlowName);
        })
        .then(function(data) {
            if (dataflowName !== currentDataFlowName) {
                return;
            }

            var scheduleInfo = data[0];
            histories = "";
            infos = "";
            if (scheduleInfo && scheduleInfo.scheduleResults.length) {
                scheduleInfo.scheduleResults.forEach(function(res, index) {
                    var record = getOneRecordHtml(res, outputStr, index);
                    histories = record.history + histories;
                    infos = record.info + infos;
                });
            } else {
                histories = '<div class="row noRun">' + SchedTStr.Notrun +
                            '</div>';
                infos = "";
            }

            $historySection.html(histories);
            $detailsSection.html(infos);
            $historySection.find(".row:first-child").addClass("chosen");
            $detailsSection.find(".record:first-child").addClass("chosen");
            deferred.resolve();
        })
        .fail(function(error) {
            if (dataflowName !== currentDataFlowName) {
                return;
            }
            histories = '<div class="row noRun">' + SchedTStr.ListSchedFail +
                        '</div>';
            infos = "";
            $historySection.html(histories);
            $detailsSection.html(infos);
            deferred.reject(error);
        })
        .always(function() {
            $refreshBtn.removeClass("xc-disabled");
            $scheduleResults.removeClass("loading");

            if (dataflowName === currentDataFlowName) {
                $scheduleResults.removeData("df");
            }
        });

        return deferred.promise();
    }

    function getOneRecordHtml (res, outputStr, index) {
        var result = {};
        var startTimeStr = getUTCStr(res.startTime, true);
        var endTimeStr = (res.endTime ? getUTCStr(res.endTime, true) : "-");
        var parameters = getParameterStr(res.parameters);
        var systemParameterStr = parameters.systemParameterStr;
        var customizedParameterStr = parameters.customizedParameterStr;
        // console.log("systemParameterStr", systemParameterStr)
        // console.log("customizedParameterStr", customizedParameterStr)
        var statusStr = (res.endTime ? StatusTStr[res.status]: "Running");
        var statusClass;
        if (statusStr === "Running") {
            statusClass = "processing";
        } else if (statusStr === "Success" ||
                   statusStr === "Export file already exists") {
            statusClass = "success";
        } else {
            statusClass = "fail";
        }

        var info  =  '<div class="record">' +
                    '<div class="row startTime">' +
                        '<div Class="item">Start Time (UTC):</div>' +
                        '<div Class="content">' + startTimeStr + '</div>' +
                    '</div>' +
                    '<div class="row endTime">' +
                        '<div Class="item">End Time (UTC):</div>' +
                        '<div Class="content">' + endTimeStr + '</div>' +
                    '</div>' +
                    '<div class="row parameters systemParameters">' +
                        '<div Class="item">System Parameters:</div>' +
                        '<div Class="content">' + systemParameterStr + '</div>' +
                    '</div>' +
                    '<div class="row parameters customizedParameters">' +
                        '<div Class="item">Customized Parameters:</div>' +
                        '<div Class="content">' + customizedParameterStr + '</div>' +
                    '</div>' +
                    '<div class="row status">' +
                        '<div Class="item">Status:</div>' +
                        '<div Class="content">' + statusStr + '</div>' +
                    '</div>' +
                    '<div class="row outputLocationContent">' +
                        '<div Class="item">Output Location:</div>' +
                        '<div Class="content">' + outputStr + '</div>' +
                    '</div>'+
                    '</div>';

        var history  = '<div class="row">' +
                        '<div class="info ' + statusClass + '">' +
                            '<div class="hint">' +
                            '</div>' +
                        '</div>' +
                        '<div class="order">' +
                            (index + 1) +
                        '</div>' +
                        '<div class="time">' +
                            startTimeStr +
                        '</div>' +
                    '</div>';
        result.history = history;
        result.info = info;
        return result;
    }

    function getParameterStr(paramArray) {
        var systemParameterStr = "";
        var customizedParameterStr = "";
        var hasSys = false;
        var hasCus = false;
        var res = {};
        if (paramArray != null) {
            for (var i = 0; i < paramArray.length; i++) {
                var currParam = paramArray[i];
                if (systemParams.hasOwnProperty(currParam.parameterName)) {
                    systemParameterStr = systemParameterStr +
                                         (hasSys ? "</div>":"") +
                                         '<div class="paramRow">' +
                                         "<span>" + currParam.parameterName +
                                         "</span>" +
                                         "<span>: </span>" +
                                         "<span>" + currParam.parameterValue +
                                         "</span>";
                    hasSys = true;
                } else {
                    customizedParameterStr = customizedParameterStr +
                                            (hasCus ? "</div>":"")+
                                            '<div class="paramRow">' +
                                            "<span>" + currParam.parameterName +
                                            "</span>" +
                                            "<span>: </span>" +
                                            "<span>" + currParam.parameterValue +
                                            "</span>";
                    hasCus = true;
                }
            }
        }
        res.systemParameterStr = systemParameterStr.length === 0 ?
                                 SchedTStr.noParam : systemParameterStr + '</div>';
        res.customizedParameterStr = customizedParameterStr.length === 0 ?
                                 SchedTStr.noParam : (customizedParameterStr
                                 +'</div>');
        return res;
    }

    function getOutputLocation() {
        if (outputLocation != null) {
            return PromiseHelper.resolve(outputLocation);
        }

        var deferred = jQuery.Deferred();
        DSExport.getDefaultPath()
        .then(function(res) {
            if (res) {
                outputLocation = res;
                deferred.resolve(res);
            } else {
                deferred.reject(SchedTStr.unknown);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function toggleTimePicker(display) {
        if (!display) {
            $(document).off(".timePicker");
            $timePicker.fadeOut(200);
            return;
        }

        date = new Date();
        date.setMinutes(date.getMinutes() + 1);

        $timePicker.fadeIn(200);
        showTimeHelper(date, false, false);

        // mouse down outside the timePicker, and the input is legal,
        // hide time picker
        $(document).on("mousedown", function(event) {
            var $el = $(event.target);
            if ($el.hasClass("timePickerBox") ||
                $el.closest(".timePicker").length > 0)
            {
                return;
            }
            var $hourInput = $('.timePicker:visible').find('input.hour');
            var $minInput = $('.timePicker:visible').find('input.minute');
            if ($hourInput.val() <= 12 && $hourInput.val() >= 1
                && $minInput.val() <= 59 && $minInput.val() >= 0) {
                toggleTimePicker(false);
            }
        });

        // focus out from inside he timePicker
        $("#modScheduler-timePicker .inputSection input")
        .on("focusout", function() {
            var $hourInput = $('.timePicker:visible').find('input.hour');
            var $minInput = $('.timePicker:visible').find('input.minute');
            if (isSimpleMode()) {
                if ($hourInput.val() > 12 || $hourInput.val() < 1) {
                    StatusBox.show(ErrTStr.SchedHourWrong, $hourInput, false,
                                   {"side": "left"});
                } else if ($minInput.val() > 59 || $minInput.val() < 0) {
                    StatusBox.show(ErrTStr.SchedMinWrong, $minInput, false,
                                    {"side": "right"});
                }
            } else {
                showScheduleSettings();
                StatusBox.forceHide();
                toggleTimePicker(false);
            }
        });
    }

    function changeTime(type, isIncrease) {
        var ampm = $modScheduleForm.find(".inputSection .ampm").text();
        var date = $modScheduleForm.find('.timePicker').data("date");
        // var hour = date.getHours();
        var hour = date.getUTCHours();
        var diff;

        switch (type) {
            case "ampm":
                if (ampm === "AM") {
                    // toggle to PM, add 12 hours
                    date.setUTCHours(hour + 12);
                } else {
                    date.setUTCHours(hour - 12);
                }
                break;
            case "minute":
                diff = isIncrease ? 1 : -1;
                date.setUTCMinutes(date.getUTCMinutes() + diff);
                // keep the same hour
                date.setUTCHours(hour);
                break;
            case "hour":
                diff = isIncrease ? 1 : -1;
                if (isIncrease && (hour + diff) % 12 === 0 ||
                    !isIncrease && hour % 12 === 0) {
                    // when there is am/pm change, keep the old am/pm
                    date.setUTCHours((hour + diff + 12) % 24);
                } else {
                    date.setUTCHours(hour + diff);
                }
                break;
            default:
                // error case
                break;
        }
        showTimeHelper(date, false, false);
    }

    function inputTime(type, val) {
        if (val === "") {
            return;
        }
        val = Number(val);
        if (isNaN(val) || !Number.isInteger(val)) {
            return;
        }

        var date = $timePicker.data("date");
        switch (type) {
            case "minute":
                if (val < 0 || val > 59) {
                    return;
                }
                date.setUTCMinutes(val);
                showTimeHelper(date, false, true);
                break;
            case "hour":
                if (val < 1 || val > 12) {
                    return;
                }

                var ampm = $modScheduleForm.find(".inputSection .ampm").text();

                if (val === 12 && ampm === "AM") {
                    val = 0;
                } else if (ampm === "PM" && val !== 12) {
                    val += 12;
                }
                date.setUTCHours(val);
                showTimeHelper(date, true, false);
                break;
            default:
                // error case
                break;
        }
    }

    function testDate(str){
        var template = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (template === null) {
            return false;
        }
        var inputDay = template[2];
        var inputMonth = template[1];
        var inputYear = template[3];
        var date = new Date(str + " utc");
        if (date === "Invalid Date") {
            return false;
        }
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var year = date.getUTCFullYear();

        return Number(inputDay) === day &&
               (Number(inputMonth) - 1) === month &&
               Number(inputYear) === year;
    }

    function showTimeHelper(date, noHourRest, noMinReset) {
        var hours = addPrefixZero(getHourIndex(date.getUTCHours()));
        var minutes = addPrefixZero(date.getUTCMinutes());
        var ampm = getAMPM(date.getUTCHours());

        if (!noHourRest) {
            $timePicker.find(".inputSection .hour").val(hours);
        }
        if (!noMinReset) {
            $timePicker.find(".inputSection .minute").val(minutes);
        }
        $timePicker.find(".inputSection .ampm").text(ampm);
        $timePicker.data("date", date);

        var timeStr = hours + " : " + minutes + " " + ampm;
        $timeInput.val(timeStr);
    }

    function getNextRunTime(schedule) {
        if (!schedule) {
            return;
        }
        var d = new Date();
        var time = new Date(schedule.startTime);

        if (time >= d) {
            // the start time has not passed
            return;
        }
        if (schedule.premadeCronString) {
            var retMsg = simulateCron(schedule.premadeCronString);
            if (retMsg.isValid) {
                schedule.startTime = new Date(retMsg.lastRun).getTime();
            } else {
                // if fail, start time is the current time
                schedule.startTime = time.getTime();
            }
        } else {
            var repeat = schedule.repeat;
            while (time < d) {
                switch (repeat) {
                    case scheduleFreq.minute:
                        time.setMinutes(time.getMinutes() + 1);
                        break;
                    case scheduleFreq.hourly:
                        time.setHours(time.getHours() + 1);
                        break;
                    case scheduleFreq.daily:
                        time.setDate(time.getDate() + 1);
                        break;
                    case scheduleFreq.weekly:
                        time.setDate(time.getDate() + 7);
                        break;
                    case scheduleFreq.biweekly:
                        time.setDate(time.getDate() + 14);
                        break;
                    case scheduleFreq.monthly:
                        time.setMonth(time.getMonth() + 1);
                        break;
                    default:
                        console.error("Invalid option!");
                        return;
                }
            }
            schedule.startTime = time.getTime();
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        Scheduler.__testOnly__ = {};
        Scheduler.__testOnly__.getNextRunTime = getNextRunTime;
        Scheduler.__testOnly__.showTimeHelper = showTimeHelper;
        Scheduler.__testOnly__.inputTime = inputTime;
        Scheduler.__testOnly__.changeTime = changeTime;
        Scheduler.__testOnly__.showScheduleSettings = showScheduleSettings;
        Scheduler.__testOnly__.saveScheduleForm = saveScheduleForm;
        Scheduler.__testOnly__.getParameterStr = getParameterStr;
        Scheduler.__testOnly__.removeSchedule = removeSchedule;
        Scheduler.__testOnly__.testDate = testDate;
        Scheduler.__testOnly__.simulateCron = simulateCron;
        Scheduler.__testOnly__.getUTCStr = getUTCStr;
        Scheduler.__testOnly__.validateCron = validateCron;
        Scheduler.__testOnly__.updateSchedule = updateSchedule;
        Scheduler.__testOnly__.showScheduleResult = showScheduleResult;
    }
    /* End Of Unit Test Only */

    return (Scheduler);
}({}, jQuery));
