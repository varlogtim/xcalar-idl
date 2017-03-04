window.Scheduler = (function(Scheduler, $) {
    var $dfgView;          // $("#dataflowView");
    var $scheduleDetail;   // $("#scheduleDetail");
    var $scheduleSettings; // $("#scheduleSettings");
    var $scheduleResults;  // $("#scheduleResults");
    var $modScheduleForm;  // $('#modifyScheduleForm');
    var $datePicker;
    var $timePicker;
    var $dateInput;
    var $timeInput;
    var $tabs;

    var serverTimeZone;
    var currentDataFlowName;
    var displayServerTimeCycle;

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
        $dfgView = $("#dataflowView");
        $scheduleDetail = $("#scheduleDetail");
        $scheduleSettings = $("#scheduleSettings");
        $scheduleResults = $("#scheduleResults");
        $modScheduleForm = $('#modifyScheduleForm');
        $datePicker = $("#modScheduler-datePicker");
        $timePicker = $("#modScheduler-timePicker");
        $dateInput = $modScheduleForm.find(".timeSection .date");
        $timeInput = $modScheduleForm.find(".timeSection .time");
        $tabs = $('#scheduleDetail .tabArea .tab');

        // Card
        $scheduleDetail.find('.close').on('click', function() {
            $scheduleDetail.addClass('xc-hidden');
        });

        // Simple Mode
        $dateInput.datepicker({
            "showOtherMonths": true,
            "dateFormat": "m/d/yy",
            "dayNamesMin": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate": 0,
            "beforeShow": function() {
                if ($dateInput.val() === "") {
                    $dateInput.datepicker("setDate", new Date());
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
                            return !testDate(date);
                        }
                    }
                ]);

                if (isValid) {
                    $(this).closest(".datePickerPart").removeClass("active");
                }

                if (!$("#modifyScheduleForm .simpleMode").is(":visible")) {
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
        var $freqSection = $dfgView.find(".frequencySection");
        xcHelper.optionButtonEvent($freqSection, function() {
            var $datepickerPart = $scheduleSettings.find(".datePickerPart");
            $datepickerPart.removeClass("inActive");
        });

        // advanced Mode
        $("#modScheduleForm-simulate").click(function() {
            var cronString = $('#cronScheduler').val().trim();
            var retMsg = simulateCron(cronString);
            if (retMsg.isValid) {
                setSimulationInfos(retMsg.lastRun, retMsg.nextRun, retMsg.error);
            } else {
                var errorHint = SchedTStr.simFail;
                setSimulationInfos(errorHint, errorHint, retMsg.error);
            }
        });

        // Toggling between simple/advanced Mode
        $("#scheduleSettings .simpleModeTab").click(function() {
            $("#scheduleSettings").addClass("showSimpleMode")
            .removeClass("showAdvancedMode");
            $("#scheduleDetail .icon-wrap").removeClass("active");
        });

        $("#scheduleSettings .advancedModeTab").click(function() {
            $("#scheduleSettings").addClass("showAdvancedMode")
            .removeClass("showSimpleMode");
        });

        // Card bottom
        $("#modScheduleForm-delete").click(function() {
            $(this).blur();
            Alert.show({
                'title': SchedTStr.DelSched,
                'msg': SchedTStr.DelSchedMsg,
                'onConfirm': function() {
                    DF.removeScheduleFromDataflow(currentDataFlowName);
                    Scheduler.hideScheduleDetailView();
                    newScheduleIcon(currentDataFlowName);
                }
            });
        });

        $("#modScheduleForm-save").click(function() {
            $(this).blur();
            if (saveScheduleForm(currentDataFlowName)) {
                Scheduler.showScheduleDetailView();
            }
        });

        $("#modScheduleForm-cancel").click(function() {
            $(this).blur();
            showScheduleSettings();
        });

        // schedule Tabs
        $tabs.click(function() {
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                return;
            }
            $tabs.removeClass('active');
            var index = $tab.index();
            $tab.addClass('active');

            if (index === 0) {
                showScheduleSettings();
            } else {
                showScheduleResult();
            }
            $scheduleDetail.find('.scheduleInfoSection').hide();
            $scheduleDetail.find('.scheduleInfoSection').eq(index).show();
        });

        // Get Timezone
        serverTimeZone = getServerTimezone();
    };

    Scheduler.displayServerTime = function(){
        clearInterval(displayServerTimeCycle);
        displayServerTimeCycle = setInterval(showServerTime, 500);
    };

    Scheduler.clearServerTime = function() {
        clearInterval(displayServerTimeCycle);
    };

    Scheduler.setDataFlowName = function(groupName) {
        currentDataFlowName = groupName;
    };

    function lockCard() {
        $scheduleDetail.find(".cardLocked").show();
    }

    function unlockCard() {
        $scheduleDetail.find(".cardLocked").hide();
    }

    Scheduler.showScheduleDetailView = function () {
        showScheduleSettings();
        showScheduleResult();
        $scheduleDetail.find("#scheduleHeadingWrapper .heading")
        .text(currentDataFlowName);
        $scheduleDetail.removeClass("xc-hidden");
        $modScheduleForm.removeClass("xc-hidden");
        // show schedule settings as default
        $scheduleDetail.find('.scheduleInfoSection').hide();
        $scheduleDetail.find('.scheduleInfoSection').eq(0).show();
        // show simple Mode as default
        if ((!$scheduleSettings.hasClass("showSimpleMode")) &&
        (!$scheduleSettings.hasClass("showAdvancedMode"))) {
            $scheduleSettings.addClass("showSimpleMode");
        }
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            lockCard();
        } else {
            unlockCard();
        }
    };

    Scheduler.hideScheduleDetailView = function () {
        $scheduleDetail.addClass("xc-hidden");
    };

    function showServerTime() {
        var now = new Date();
        var transferedTime = timeZoneTransfer(now, serverTimeZone);
        var serverTimeStr = getTime(transferedTime);
        $("#scheduleDetail .serverTime .text").text(serverTimeStr);
    }

    function newScheduleIcon (dataflowName) {
        $span = $("#dfgMenu span").filter(function() {
            return ($(this).text() === dataflowName);
        });
        $addScheduleIcon = $span.siblings('.addScheduleToDataflow');
        $addScheduleIcon.removeClass('xi-menu-scheduler');
        $addScheduleIcon.addClass('xi-menu-add-scheduler');
    }

    function existScheduleIcon (dataflowName) {
        $span = $("#dfgMenu span").filter(function() {
            return ($(this).text() === dataflowName);
        });
        $addScheduleIcon = $span.siblings('.addScheduleToDataflow');
        $addScheduleIcon.addClass('xi-menu-scheduler');
        $addScheduleIcon.removeClass('xi-menu-add-scheduler');
    }

    function showScheduleSettings () {
        var schedule = DF.getSchedule(currentDataFlowName);
        var $scheduleInfos = $("#scheduleInfos");
        var $timeSection = $modScheduleForm.find(".timeSection");
        var $freqSection = $modScheduleForm.find(".frequencySection");
        var text;
        var $checkBox;

        // Update the schedule detail card
        // Created
        text = (schedule && getTime(schedule.created)) ?
            getTime(schedule.created) : "N/A";
        $scheduleInfos.find(".created .text").text(text);
        // Last modified
        text = (schedule && getTime(schedule.modified)) ?
            getTime(schedule.modified) : "N/A";
        $scheduleInfos.find(".modified .text").text(text);
        // Next run
        getNextRunTime(schedule);
        text = (schedule && getTime(schedule.startTime)) ?
            getTime(schedule.startTime) : "N/A";
        $scheduleInfos.find(".nextRunInfo .text").text(text);
        // date picker input
        text = (schedule && schedule.dateText) ? schedule.dateText: "";
        $timeSection.find(".date").val(text);
        // time picker input
        text = (schedule && schedule.timeText) ? schedule.timeText: "";
        $timeSection.find(".time").val(text);
        // frequency input
        text = (schedule && schedule.repeat) ? schedule.repeat: "N/A";
        if (text === "N/A") {
            $freqSection.find(".radioButton.active").removeClass("active");
            $checkBox = $freqSection
            .find('.radioButton[data-option="minute"]');
            $checkBox.click();
        } else {
            $checkBox = $freqSection.find('.radioButton[data-option="'+
                text + '"]');
            $checkBox.click();
        }
        // cron
        text = (schedule && schedule.premadeCronString) ?
            schedule.premadeCronString : "";
        $('#modifyScheduleForm #cronScheduler').val(text);
        // title
        text = schedule ? SchedTStr.detail : "Create New Schedule";
        $("#scheduleDetail").find(".cardHeader")
        .find(".title").text(text);
        // Only support create and delete, not support update now
        // text = schedule ? SchedTStr.revert : AlertTStr.CANCEL;
        text = AlertTStr.CANCEL;
        $("#modScheduleForm-cancel").text(text);
        if (schedule) {
            $("#scheduleDetail").addClass("withSchedule")
            .removeClass("withoutSchedule");
            if (schedule.premadeCronString) {
                $("#scheduleSettings .advancedModeTab").click();
            } else {
                $("#scheduleSettings .simpleModeTab").click();
                setSimulationInfos();
            }
        } else {
            $("#scheduleDetail").removeClass("withSchedule")
            .addClass("withoutSchedule");
            setSimulationInfos();
        }
        $timeSection.find(".datePickerPart").removeClass("inActive");
    }

    function setSimulationInfos(last, next, error) {
        var lastRun = last ? last : "";
        var nextRun = next ? next : "";
        var errorInfo = error ? error : "";
        $("#modifyScheduleForm .errorInfo").text(errorInfo);
        $("#modifyScheduleForm .simulateLast .text").text(lastRun);
        $("#modifyScheduleForm .simulateNext .text").text(nextRun);
    }

    function simulateCron(cronString) {
        var str = {"startTime": timeZoneTransfer(new Date(), serverTimeZone),
            "cronString": cronString};
        var res;
        $.ajax({
            "type": "POST",
            "data": JSON.stringify(str),
            "contentType": "application/json",
            "async": false,
            "url": xcHelper.getAppUrl() + "/simulateSchedule",
            success: function(retMsg) {
                res = retMsg;
            },
            error: function(error) {
                var errMsg = {"isValid": false,
                    "lastRun": "",
                    "nextRun": "",
                    "error": error.message};
                res = errMsg;
            }
        });
        return res;
    }

    // dateStr: with the format of 3/1/2017
    // timeStr: with the format of 02 : 51 PM
    // completeTimeStr: with the format of 3/1/2017 02:51 PM
    function getDate(dateStr, timeStr) {
        var completeTimeStr = getCompleteTimeStr(dateStr, timeStr);
        return new Date(completeTimeStr);
    }
    function getCompleteTimeStr(dateStr, timeStr) {
        return dateStr + ' ' + timeStr.replace(' ', '').replace(' ', '');
    }
    // transfer time zone from the timezone of browser to the timezone of
    // target Area
    function timeZoneTransfer (date, targetTimeZone) {
        var targetAreaTimeStr = date.toLocaleString(
            'en-US',{timeZone: targetTimeZone});
        return new Date(targetAreaTimeStr).getTime();
    }
    function getServerTimezone () {
        var res;
        $.ajax({
            "type": "POST",
            "contentType": "application/json",
            "async": false,
            "url": xcHelper.getAppUrl() + "/getTimezone",
            success: function(retMsg) {
                res = retMsg;
            },
            error: function(error) {
                console.log(error);
                res = "N/A";
            }
        });
        // Default timezone
        if (res === "N/A") {
            res = "America/Los_Angeles";
        }
        return res;
    }

    function saveScheduleForm(dataflowName) {
        var isValid;
        var currentTime;
        if ($("#modifyScheduleForm .simpleMode").is(":visible")) {
            // Simple mode
            var options;

            isValid = xcHelper.validate([
                {
                    "$ele": $dateInput,
                    "text": ErrTStr.NoEmpty,
                    "check": function() {
                        var $div = $dateInput.closest(".datePickerPart");
                        if ($div.hasClass("inActive")) {
                            return false;
                        } else {
                            return ($dateInput.val() === "");
                        }
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }

            var $hourInput = $('.timePicker:visible').find('input.hour');
            var $minInput = $('.timePicker:visible').find('input.minute');
            if ($("#modScheduler-timePicker").is(":visible")) {
                if ($hourInput.val() > 12 || $hourInput.val() < 1) {
                    StatusBox.show(ErrTStr.SchedHourWrong, $hourInput, false,
                                   {"side": "left"});
                } else if ($minInput.val() > 59 || $minInput.val() < 0) {
                    StatusBox.show(ErrTStr.SchedMinWrong, $minInput, false,
                                    {"side": "right"});
                }
                return false;
            }

            var dateStr = $dateInput.val().trim();
            var timeStr = $timeInput.val().trim();
            var repeat = $modScheduleForm
                         .find(".frequencySection .radioButton.active")
                         .data("option");
            if (repeat === undefined) {
                repeat = "minute";  // default choice
            }
            var d = getDate(dateStr, timeStr);

            var startTime = d.getTime();
            // Everything should use servertime, transfer the current time
            // to server time
            currentTime = timeZoneTransfer(new Date(), serverTimeZone);

            if (startTime < currentTime) {
                StatusBox.show(ErrTStr.TimeExpire, $timeInput);
                return;
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
            setSimulationInfos();

        } else {
            // Advanced mode, is considered starting immediately
            var $cronScheduler = $('#cronScheduler');
            var cronString = $cronScheduler.val().trim();
            isValid = xcHelper.validate([
                {
                    "$ele": $cronScheduler,
                    "text": ErrTStr.NoEmpty,
                    "check": function() {
                        if ($cronScheduler.val().trim() === "") {
                            return true;
                        } else {
                            var ret = simulateCron(cronString);
                            if (!ret.isValid) {
                                $("#modifyScheduleForm .errorInfo")
                                .text(ret.error);
                                return true;
                            } else {
                                $("#modifyScheduleForm .errorInfo")
                                .text("");
                            }
                        }
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }

            currentTime = timeZoneTransfer(new Date(), serverTimeZone);
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

        DF.addScheduleToDataflow(dataflowName, options);
        xcHelper.showSuccess(SuccessTStr.Sched);
        existScheduleIcon(dataflowName);
        return true;
    }

    function showScheduleResult() {
        var runTimeStr = "";
        var parameterStr = "";
        var statusStr = "";
        var outputStr = "";
        var html = "";
        html += getOneRecordHtml(runTimeStr, parameterStr,
         statusStr, outputStr);
        $("#scheduleTable .mainSection").html(html);

        var deferred = $.Deferred();

        getOutputStr()
        .always(function(outputLocation) {
            outputStr = outputLocation;
            XcalarListSchedules(currentDataFlowName)
            .then(function(data) {
                deferred.resolve(data);
            })
            .fail(function(error) {
                deferred.reject(error);
            });
            return deferred.promise();
        });

        deferred.promise()
        .then(function(data) {
            var scheduleInfo = data[0];
            html = "";
            if (scheduleInfo) {
                var scheduleResults = scheduleInfo.scheduleResults;
                for (var i = 0; i < scheduleResults.length; i++) {
                    var currResult = scheduleResults[i];
                    runTimeStr = getTime(currResult.endTime);
                    parameterStr = getParameterStr(currResult.parameters);
                    statusStr = "Success";
                    html += getOneRecordHtml(runTimeStr, parameterStr,
                     statusStr, outputStr);
                }
            }
            runTimeStr = "Not run yet";
            parameterStr = "Not run yet";
            statusStr = "Not run yet";
            outputStr = "Not run yet";
            html += getOneRecordHtml(runTimeStr, parameterStr,
             statusStr, outputStr);
            $("#scheduleTable .mainSection").html(html);
        })
        .fail(function(error) {
            console.log(error);
            runTimeStr = "";
            parameterStr = "";
            statusStr = "";
            outputStr = "";
            html += getOneRecordHtml(runTimeStr, parameterStr,
             statusStr, outputStr);
            $("#scheduleTable .mainSection").html(html);
        });
    }

    function getOneRecordHtml(runTimeStr, timeTakenStr, statusStr, outputStr) {
        var record = '<div class="content timeContent">'
            + runTimeStr
            + '</div>'
            + '<div class="content lastContent">'
            + timeTakenStr
            + '</div>'
            + '<div class="content statusContent">'
            + statusStr
            + '</div>'
            + '<div class="content outputLocationContent">'
            + outputStr
            + '</div>';
        return record;
    }

    function getParameterStr(paramArray) {
        var str = "";
        for (var i = 0; i < paramArray.length; i++) {
            var currParam = paramArray[i];
            str += currParam.parameterName + ":"
                + currParam.parameterValue + ", ";
        }
        if (str.length === 0) {
            str = SchedTStr.noParam;
        } else {
            str = str.substring(0, str.length - 2);
        }
        return str;
    }

    function getOutputStr() {
        var deferred = $.Deferred();
        var str = "";
        XcalarListExportTargets('*','*')
        .always(function(data) {
            if (data && data.targets && data.targets[0].specificInput &&
                    data.targets[0].specificInput.sfInput &&
                    data.targets[0].specificInput.sfInput.url) {
                str = data.targets[0].specificInput.sfInput.url;
            } else {
                str = SchedTStr.unknown;
            }
            deferred.resolve(str);
        });
        return deferred.promise(str);
    }
    function getTime(time) {
        if (time == null) {
            return null;
        }

        var d = new Date(time);
        var t = xcHelper.getDate("/", d) + " " +
                d.toLocaleTimeString(navigator.language,
                                    {hour: "2-digit", minute: "2-digit"});

        return t;
    }

    function toggleTimePicker(display) {
        var $timePicker = $modScheduleForm.find('.timePicker');
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
            if ($("#modifyScheduleForm .simpleMode").is(":visible")) {
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
        var hour = date.getHours();
        var diff;

        switch (type) {
            case "ampm":
                if (ampm === "AM") {
                    // toggle to PM, add 12 hours
                    date.setHours(hour + 12);
                } else {
                    date.setHours(hour - 12);
                }
                break;
            case "minute":
                diff = isIncrease ? 1 : -1;
                date.setMinutes(date.getMinutes() + diff);
                // keep the same hour
                date.setHours(hour);
                break;
            case "hour":
                diff = isIncrease ? 1 : -1;
                if (isIncrease && (hour + diff) % 12 === 0 ||
                    !isIncrease && hour % 12 === 0) {
                    // when there is am/pm change, keep the old am/pm
                    date.setHours((hour + diff + 12) % 24);
                } else {
                    date.setHours(hour + diff);
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
        var $timePicker = $modScheduleForm.find('.timePicker');

        var date = $timePicker.data("date");

        switch (type) {
            case "minute":
                if (val < 0 || val > 59) {
                    return;
                }
                date.setMinutes(val);
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
                date.setHours(val);
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
        var date = new Date(str);
        if (date === "Invalid Date") {
            return false;
        }
        var day = date.getDate();
        var month = date.getMonth();
        var year = date.getFullYear();

        return Number(inputDay) === day && (Number(inputMonth) - 1) === month
            && Number(inputYear) === year;
    }

    function showTimeHelper(date, noHourRest, noMinReset) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
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
        $modScheduleForm.find(".timeSection .time").val(timeStr);
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