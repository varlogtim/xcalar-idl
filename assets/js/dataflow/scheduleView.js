window.Scheduler = (function(Scheduler, $) {
    var $scheduleDetail;   // $("#scheduleDetail");
    var $scheduleSettings; // $("#scheduleSettings");
    var $modScheduleForm;  // $('#modifyScheduleForm');
    var $timePicker;
    var $dateInput;
    var $timeInput;

    var serverTimeZoneOffset;
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
            var $btn = $(this);
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

        // schedule Tabs
        $scheduleDetail.on("click", ".tabArea .tab", function() {
            var $tab = $(this);
            if ($tab.hasClass("active")) {
                return;
            }
            switchTab($tab.index());
        });
        getServerTimezoneOffset();
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
    };

    Scheduler.hide = function() {
        currentDataFlowName = null;
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
        if (serverTimeZoneOffset == null) {
            $serverTime.addClass("fail").text(SchedTStr.failServerTime);
        } else {
            var now = new Date();
            var serverTimeStr = getTime(now.getTime(), now.getTimezoneOffset());
            $serverTime.removeClass("fail").text(serverTimeStr);
        }
    }

    function displayServerTimeInterval() {
        var time = 1000 * 60; // 1 minute
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
        var $addSched = $list.find(".addScheduleToDataflow");

        xcHelper.disableSubmit($addSched);
        $scheduleDetail.addClass("locked");

        DF.removeScheduleFromDataflow(dataflowName)
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.RmSched);
            $addSched.removeClass("xi-menu-scheduler")
                     .addClass("xi-menu-add-scheduler");

            if (dataflowName === currentDataFlowName) {
                Scheduler.hide();
            }

            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.showFail(FailTStr.RmSched);
            if (dataflowName === currentDataFlowName) {
                $scheduleDetail.removeClass("locked");
            }
            deferred.reject(error);
        })
        .always(function() {
            xcHelper.enableSubmit($addSched);
        });

        return deferred.promise();
    }

    function existScheduleIcon(dataflowName) {
        var $list = DFCard.getDFList(dataflowName);
        $list.find(".addScheduleToDataflow")
             .addClass("xi-menu-scheduler")
             .removeClass("xi-menu-add-scheduler");
    }

    function showScheduleSettings() {
        var schedule = DF.getSchedule(currentDataFlowName);
        var tmpSchedObj = schedule || {};

        var $timeSection = $modScheduleForm.find(".timeSection");
        var $freqSection = $modScheduleForm.find(".frequencySection");

        // Update the schedule detail card
        // Created
        var created = getTime(tmpSchedObj.created, serverTimeZoneOffset) || "N/A";
        $scheduleSettings.find(".created .text").text(created);

        // Last modified
        var modified = getTime(tmpSchedObj.modified, serverTimeZoneOffset) || "N/A";
        $scheduleSettings.find(".modified .text").text(modified);

        // Next run (update use schedule, not scheObj)
        getNextRunTime(schedule);
        var startTime = getTime(tmpSchedObj.startTime, serverTimeZoneOffset) || "N/A";
        $scheduleSettings.find(".nextRunInfo .text").text(startTime);

        // date picker input
        var dateText = tmpSchedObj.dateText || "";
        $timeSection.find(".date").val(dateText);

        // time picker input
        var timeText = tmpSchedObj.timeText || "";
        $timeSection.find(".time").val(timeText);

        // frequency
        if (tmpSchedObj.repeat) {
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
        if (serverTimeZoneOffset == null) {
            return {
                "isValid": false,
                "lastRun": SchedTStr.simFail,
                "nextRun": SchedTStr.simFail,
                "error": SchedTStr.failServerTime
            };
        }

        var options = {
            "currentDate": new Date().getTime()
        };
        var res;
        try {
            var interval = CronParser.parseExpression(cronString, options);
            var next1 = interval.next();
            var lastRun = getTime(next1.getTime(), new Date().getTimezoneOffset());
            var next2 = interval.next();
            var nextRun = getTime(next2.getTime(), new Date().getTimezoneOffset());
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
        var completeTimeStr = dateStr + " " + timeStr.replace(" ", "") + " UTC";
        return new Date(completeTimeStr);
    }

    // display the time
    // without timezoneOffset
    function getTime(time, timezoneOffSet) {
        if (time == null) {
            return null;
        }
        if (timezoneOffSet !== undefined) {
            time = time + timezoneOffSet * 60000;
        }

        var d = new Date(time);
        var t = xcHelper.getDate("/", d) + " " +
                d.toLocaleTimeString(navigator.language, {
                    "hour": "2-digit",
                    "minute": "2-digit"
                }) + " UTC";

        return t;
    }

    function getTimeToSecond(time, timezoneOffSet) {
        if (time == null) {
            return null;
        }
        if (timezoneOffSet !== undefined) {
            time = time + timezoneOffSet * 60000;
        }

        var d = new Date(time);
        var t = xcHelper.getDate("/", d) + " " +
                d.toLocaleTimeString(navigator.language, {
                    "hour": "2-digit",
                    "minute": "2-digit",
                    "second": "2-digit"
                }) + " UTC";

        return t;
    }

    // From local date to server time
    function timeZoneTransfer(localDate, timeZoneOffSet) {
        // UTC time == localTime + localTimezoneOffset * 60000
        //          == serverTime + timeZoneOffSet * 60000
        var localTime = localDate.getTime();
        var localTimezoneOffset = new Date().getTimezoneOffset();
        var serverTime = localTime +
                         (localTimezoneOffset - timeZoneOffSet) * 60000;
        return serverTime;
    }
    // Keep, in case needed in future
    function timeTransfer(time, timezoneOffset, targetTimezoneOffset) {
        return time + (timezoneOffset - targetTimezoneOffset) * 60000;
    }
    function toUTC0(time, timezoneOffset) {
        return timeTransfer(time, timezoneOffset, 0);
    }

    function getServerTimezoneOffset() {
        $.ajax({
            "type": "POST",
            "contentType": "application/json",
            "async": false,
            "url": xcHelper.getAppUrl() + "/getTimezoneOffset",
            success: function(retMsg) {
                var res;
                if (typeof retMsg === "object" && retMsg.offset != null) {
                    res = Number(retMsg.offset);
                } else {
                    // XXX a temp fix if cannot get offset
                    res = 420;
                }
                serverTimeZoneOffset = res;
            },
            error: function(error) {
                console.log(error);
                // everytime is based on server time, res should not have
                // default value, this is a bug
                serverTimeZoneOffset = 420;
            }
        });
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
            var startTime = timeZoneTransfer(getDate(dateStr, timeStr), serverTimeZoneOffset);
            // Everything should use servertime, transfer the current time
            // to server time
            if (serverTimeZoneOffset == null) {
                StatusBox.show(SchedTStr.failServerTime, $timeInput);
                return PromiseHelper.reject();
            }

            currentTime = timeZoneTransfer(new Date(), serverTimeZoneOffset);

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
                "premadeCronString": ""
            };
        } else {
            // Advanced mode, is considered starting immediately
            var cronString = validateCron(true);
            if (cronString == null) {
                // invalid case
                return PromiseHelper.reject();
            }

            if (serverTimeZoneOffset == null) {
                StatusBox.show(SchedTStr.failServerTime, $("#cronScheduler"));
                return PromiseHelper.reject();
            }

            currentTime = timeZoneTransfer(new Date(), serverTimeZoneOffset);
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
                "premadeCronString": cronString
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
        var exportInfo = dfObj.retinaNodes[0].input.exportInput;
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
        var $section = $("#scheduleTable .mainSection");
        var $refreshBtn = $("#modScheduleForm-refresh");
        var outputStr = "";
        var html = getOneRecordHtml("", "", "", "");

        $section.html(html);

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
            html = "";

            if (scheduleInfo && scheduleInfo.scheduleResults.length) {
                scheduleInfo.scheduleResults.forEach(function(res) {
                    var startTime = "Start Time: " +
                        getTimeToSecond(res.startTime, serverTimeZoneOffset);
                    var endTime = "End Time: " +
                        getTimeToSecond(res.endTime, serverTimeZoneOffset);
                    var runTimeStr = startTime + "<br>" + endTime;
                    var parameterStr = getParameterStr(res.parameters);
                    var statusStr = StatusTStr[res.status];
                    html += getOneRecordHtml(runTimeStr, parameterStr,
                                             statusStr, outputStr);
                });
            } else {
                html = getOneRecordHtml(SchedTStr.Notrun, SchedTStr.Notrun,
                                        SchedTStr.Notrun, SchedTStr.Notrun);
            }

            $section.html(html);
            deferred.resolve();
        })
        .fail(function(error) {
            if (dataflowName !== currentDataFlowName) {
                return;
            }

            html = getOneRecordHtml("", "", "", "");
            $section.html(html);
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

    function getOneRecordHtml(runTimeStr, parameterStr, statusStr, outputStr) {
        var record ='<div class="row' +
                    ((runTimeStr === SchedTStr.Notrun || runTimeStr === "") ?
                    ' noRun' : '')+ '">' +
                    '<div class="content timeContent">' +
                        runTimeStr +
                    '</div>' +
                    '<div class="content lastContent">' +
                        parameterStr +
                    '</div>' +
                    '<div class="content statusContent">' +
                        statusStr +
                    '</div>' +
                    '<div class="content outputLocationContent">' +
                        outputStr +
                    '</div>'+
                    '</div>';
        return record;
    }

    function getParameterStr(paramArray) {
        var str = "";
        for (var i = 0; i < paramArray.length; i++) {
            var currParam = paramArray[i];
            if (i !== 0) {
                str += "<span>" + ", " + "</span>";
            }
            str += '<span class="' +
                    (systemParams.hasOwnProperty(currParam.parameterName) ?
                    "systemParams" : "currParams") +
                    '">' + currParam.parameterName + "</span>" +
                    "<span>" + ":" + "</span>" +
                    "<span>" + currParam.parameterValue + "</span>";
        }
        if (str.length === 0) {
            str = SchedTStr.noParam;
        }
        return str;
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
        var date = new Date(str + " UTC");
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
        var hours = date.getUTCHours();
        var minutes = date.getUTCMinutes();
        var ampm = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;

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
    }
    /* End Of Unit Test Only */

    return (Scheduler);
}({}, jQuery));
