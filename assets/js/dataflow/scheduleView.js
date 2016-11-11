window.Scheduler = (function(Scheduler, $) {
    var $dfgView;          // $("#dataflowView");
    var $newScheduleForm;  // $("#newScheduleForm");
    var $modScheduleForm;  // $('#modifyScheduleForm');
    var $scheduleDetail;   // $("#scheduleDetail");
    var $newTimePicker;    // $("#newScheduler-timePicker");
    var $modTimePicker;    // $("#modScheduler-timePicker");

    // constant
    var scheduleFreq = {
        "minute"     : "minute",
        "hourly"     : "hourly",
        "daily"      : "daily",
        "weekly"     : "weekly",
        "biweekly"   : "biweekly",
        "monthly"    : "monthly",
        "dayPerMonth": "dayPerMonth"
    };

    var radixMap = {
        "First" : 1,
        "Second": 2,
        "Third" : 3,
        "Fourth": 4,
        "Last"  : -1
    };

    var dayMap = {
        "Sunday"   : 0,
        "Monday"   : 1,
        "Tuesday"  : 2,
        "Wednesday": 3,
        "Thursday" : 4,
        "Friday"   : 5,
        "Saturday" : 6
    };

    var currentDataFlowName;

    Scheduler.setup = function() {
        $dfgView = $("#dataflowView");
        $scheduleDetail = $("#scheduleDetail");
        $newScheduleForm = $("#newScheduleForm");
        $modScheduleForm = $('#modifyScheduleForm');
        $newTimePicker = $("#newScheduler-timePicker");
        $modTimePicker = $("#modScheduler-timePicker");

        $newScheduleForm.find('.close').on('click', function() {
            $newScheduleForm.addClass('xc-hidden');
        });

        $scheduleDetail.find('.close').on('click', function() {
            $scheduleDetail.addClass('xc-hidden');
        });

        var $newTimeSection = $newScheduleForm.find(".timeSection");
        var $newDateInput = $newTimeSection.find(".date");
        var $newTimeInput = $newTimeSection.find(".time");
        var $modTimeSection = $modScheduleForm.find(".timeSection");
        var $modDateInput = $modTimeSection.find(".date");
        var $modTimeInput = $modTimeSection.find(".time");
        var $dateInputs = $newDateInput.add($modDateInput);
        var $timePickers = $newTimePicker.add($modTimePicker);


        // minDate attr disable the date before today
        $newDateInput.datepicker({
            "showOtherMonths": true,
            "dateFormat"     : "m/d/yy",
            "dayNamesMin"    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate"        : 0,
            "beforeShow"     : function() {
                if ($newDateInput.val() === "") {
                    $newDateInput.datepicker("setDate", new Date());
                }
                var $el = $("#ui-datepicker-div");
                $el.addClass("schedulerDatePicker")
                    .appendTo($newTimeSection.find(".datePickerPart"));
            }
        });
        $modDateInput.datepicker({
            "showOtherMonths": true,
            "dateFormat"     : "m/d/yy",
            "dayNamesMin"    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate"        : 0,
            "beforeShow"     : function() {
                if ($modDateInput.val() === "") {
                    $modDateInput.datepicker("setDate", new Date());
                }
                var $el = $("#ui-datepicker-div");
                $el.addClass("schedulerDatePicker")
                    .appendTo($modTimeSection.find(".datePickerPart"));
            }
        });


        $dateInputs.on("keydown", function() {
            // no input event
            return false;
        });

        $newTimeInput.on({
            "focus": function() {
                toggleTimePicker($newScheduleForm, true);
            },
            "keydown": function() {
                // no input event
                return false;
            }
        });

        $modTimeInput.on({
            "focus": function() {
                toggleTimePicker($modScheduleForm, true);
            },
            "keydown": function() {
                // no input event
                return false;
            }
        });

        $timePickers.on("click", ".btn", function() {
            var $btn = $(this);
            var isIncrease = $btn.hasClass("increase");
            var type;
            var $form = $btn.closest('.scheduleForm');
            if ($btn.hasClass("hour")) {
                type = "hour";
            } else if ($btn.hasClass("minute")) {
                type = "minute";
            } else {
                type = "ampm";
            }

            changeTime(type, isIncrease, $form);
        });

        $timePickers.on("input", "input", function() {
            var $input = $(this);
            var type;
            var $form = $input.closest('.scheduleForm');
            if ($input.hasClass("hour")) {
                type = "hour";
            } else if ($input.hasClass("minute")) {
                type = "minute";
            } else {
                // invalid case
                return;
            }
            inputTime(type, $input.val(), $form);
        });

        // frequent section event
        var $freqSection = $dfgView.find(".frequencySection");
        xcHelper.optionButtonEvent($freqSection, function(option) {
            var $datepickerPart = $newTimeSection.find(".datePickerPart");
            $datepickerPart.removeClass("inActive");
        });

        $("#modScheduleForm-delete").on("click", function() {
            $(this).blur();
            Alert.show({
                'title'    : SchedTStr.DelSched,
                'msg'      : SchedTStr.DelSchedMsg,
                'onConfirm': function() {
                    DF.removeScheduleFromDataflow(currentDataFlowName);
                    Scheduler.hideScheduleDetailView();
                    newScheduleIcon(currentDataFlowName);
                },

            });
        });

        $("#newScheduleForm-save").click(function() {
            $(this).blur();
            if (saveScheduleForm($newScheduleForm, currentDataFlowName)) {
                Scheduler.hideNewScheduleFormView();
                Scheduler.showScheduleDetailView();
            }
        });

        $("#modScheduleForm-save").click(function() {
            $(this).blur();
            if (saveScheduleForm($modScheduleForm, currentDataFlowName)) {
                Scheduler.showScheduleDetailView();
            }
        });

        $("#newScheduleForm-cancel").click(function() {
            $(this).blur();
            // resetScheduleForm($newScheduleForm);
            resetCreateNewScheduleForm();
            Scheduler.hideScheduleDetailView();
        });
        $("#modScheduleForm-cancel").click(function() {
            $(this).blur();
            var schedule = DF.getSchedule(currentDataFlowName);
            resetModifiedScheduleForm(schedule);
        });

        schedDetailTabs();
    };

    Scheduler.setDataFlowName = function(groupName) {
        currentDataFlowName = groupName;
    };

    Scheduler.showNewScheduleFormView = function () {
        resetCreateNewScheduleForm();
        $newScheduleForm.removeClass("xc-hidden");
    };

    Scheduler.showScheduleDetailView = function () {
        var schedule = DF.getSchedule(currentDataFlowName);
        if (!schedule) {
            return;
        }
        fillInScheduleDetail(schedule);
        resetModifiedScheduleForm(schedule);
        $scheduleDetail.removeClass("xc-hidden");
        $modScheduleForm.removeClass("xc-hidden");
    };

    Scheduler.hideScheduleDetailView = function () {
        $scheduleDetail.addClass("xc-hidden");
    };

    Scheduler.hideNewScheduleFormView = function () {
        $newScheduleForm.addClass("xc-hidden");
    };

    function newScheduleIcon (dataflowName) {
        $span = $("span").filter(function() { return ($(this).text() === dataflowName);});
        $addScheduleIcon = $span.siblings('.addScheduleToDataflow');
        $addScheduleIcon.removeClass('xi-menu-scheduler');
        $addScheduleIcon.addClass('xi-menu-add-scheduler');
    }

    function existScheduleIcon (dataflowName) {
        $span = $("span").filter(function() { return ($(this).text() === dataflowName);});
        $addScheduleIcon = $span.siblings('.addScheduleToDataflow');
        $addScheduleIcon.addClass('xi-menu-scheduler');
        $addScheduleIcon.removeClass('xi-menu-add-scheduler');
    }

    function resetCreateNewScheduleForm () {
        var $timeSection = $newScheduleForm.find(".timeSection");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $checkBox = $newScheduleForm.find(".radioButton").eq(0);
        var $recurInput = $newScheduleForm.find(".recurSection input");

        $timeSection.find(".datePickerPart").removeClass("inActive")
                    .find(".date").val("");
        $timeSection.find(".time").val("").removeData("date");
        $newTimePicker.hide().removeData("date");
        $freqSection.find(".radioButton.active").removeClass("active");
        $checkBox.click();
        $recurInput.val("");
    }

    function resetModifiedScheduleForm (schedule) {
        var $timeSection = $modScheduleForm.find(".timeSection");
        var $freqSection = $modScheduleForm.find(".frequencySection");
        var $checkBox = $freqSection.find('.radioButton[data-option="' +
                                            schedule.repeat + '"]');
        var $recurInput = $modScheduleForm.find(".recurSection input");

        $timeSection.find(".datePickerPart").removeClass("inActive")
                    .find(".date").val(schedule.dateText);
        var date = new Date(schedule.startTime);
        $timeSection.find(".time").val(schedule.timeText)
                    .data("date", date);
        $freqSection.find(".radioButton.active").removeClass("active");
        $checkBox.click();
        $recurInput.val(schedule.recur);
    }

// Control the Tabs at the column of schedule Detail


    function saveScheduleForm($form, dataflowName) {
        var $scheduleDate  = $form.find(".timeSection .date");
        var $scheduleTime  = $form.find(".timeSection .time");
        var $scheduleRecur = $form.find(".recurSection input");
        // validation
        var isValid;

        isValid = xcHelper.validate([
            {
                "$ele" : $scheduleDate,
                "text" : ErrTStr.NoEmpty,
                "check": function() {
                    var $div = $scheduleDate.closest(".datePickerPart");
                    if ($div.hasClass("inActive")) {
                        return false;
                    } else {
                        return ($scheduleDate.val() === "");
                    }
                }
            },
            {
                "$ele": $scheduleTime
            }
        ]);

        if (!isValid) {
            return false;
        }

        isValid = xcHelper.validate([
            {
                "$ele" : $scheduleRecur,
                "text" : ErrTStr.PositiveInteger,
                "check": function() {
                    var num = $scheduleRecur.val();
                    if (isNaN(num)) {
                        return true;
                    } else {
                        if (Number.isInteger(Number(num)) && Number(num) > 0) {
                            return false;
                        }
                        return true;
                    }
                }
            },
        ]);

        if (!isValid) {
            return false;
        }

        var recur   = Number($scheduleRecur.val().trim());
        var date    = $scheduleDate.val().trim();
        var time    = $scheduleTime.val().trim();
        var timeObj = $scheduleTime.data("date");
        var repeat  = $form.find(".frequencySection .radioButton.active")
                                    .data("option");

        var isDayPerMonth = (repeat === scheduleFreq.dayPerMonth);

        var d = isDayPerMonth ? new Date() : new Date(date);
        d.setHours(timeObj.getHours(), timeObj.getMinutes(),
                    timeObj.getSeconds());

        var startTime   = d.getTime();
        var currentTime = new Date().getTime();

        if (!isDayPerMonth && startTime < currentTime) {
            StatusBox.show(ErrTStr.TimeExpire, $scheduleTime);
            return;
        }

        var freq = null;
        var options = {
            // "name"     : name,
            "startTime": startTime,
            "dateText" : date,
            "timeText" : time,
            "repeat"   : repeat,
            "freq"     : freq,
            "modified" : currentTime,
            "recur"    : recur
        };

        DF.addScheduleToDataflow(dataflowName, options);
        xcHelper.showSuccess();

        existScheduleIcon(dataflowName);
        return true;
    }


    function fillInScheduleDetail (schedule) {

        var $scheduleInfos = $("#scheduleInfos");
        var text;

        // Update the schedule detail card
        // Created
        text = getTime(schedule.created) || "N/A";
        $scheduleInfos.find(".created .text").text(text);
        // Last modified
        text = getTime(schedule.modified) || "N/A";
        $scheduleInfos.find(".modified .text").text(text);
        // Frequency
        text = schedule.repeat || "N/A";
        $scheduleInfos.find(".frequency .text").text(text);
        // Repeat Time
        text = schedule.recur || "N/A";
        $scheduleInfos.find(".recur .text").text(text);
        // Last run
        text = getTime(schedule.lastRun) || "N/A";
        $scheduleInfos.find(".lastRunInfo .text").text(text);
        // Next run
        text = getTime(schedule.startTime) || "N/A";
        $scheduleInfos.find(".nextRunInfo .text").text(text);
    }

    function schedDetailTabs() {
        var $scheduleInfos = $('#scheduleInfos');
        var $tabs = $scheduleInfos.find('.tab');
        $tabs.click(function() {
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                return;
            }
            $tabs.removeClass('active');
            var index = $tab.index();
            $tab.addClass('active');
            $scheduleInfos.find('.scheduleInfoSection').addClass('xc-hidden');
            $scheduleInfos.find('.scheduleInfoSection').eq(index)
                                                .removeClass('xc-hidden');
            if (index === 0) {
                $modScheduleForm.removeClass('xc-hidden');
                $scheduleInfos.height("160px");
            } else {
                $scheduleInfos.height($scheduleDetail.height());
                $modScheduleForm.addClass('xc-hidden');
            }
        });
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

    function toggleTimePicker($form, display) {
        var $timePicker = $form.find('.timePicker');
        if (!display) {
            $(document).off(".timePicker");
            $timePicker.fadeOut(200);
            return;
        }

        var date = $form.find(".timeSection .time").data("date");
        if (date == null) {
            // new date is one minute faster than current time
            // which is a valid time
            date = new Date();
            date.setMinutes(date.getMinutes() + 1);
        }

        $timePicker.fadeIn(200);
        showTimeHelper(date, false, false, $form);

        $(document).on("mousedown.timePicker", function(event) {
            var $el = $(event.target);

            if ($el.hasClass("timePickerBox") ||
                $el.closest(".timePicker").length > 0)
            {
                return;
            }

            toggleTimePicker($timePicker.closest('.scheduleForm'));

        });
    }

    function changeTime(type, isIncrease, $form) {
        var ampm = $form.find(".inputSection .ampm").text();
        var date = $form.find('.timePicker').data("date");
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
        showTimeHelper(date, false, false, $form);
    }

    function inputTime(type, val, $form) {
        if (val === "") {
            return;
        }
        val = Number(val);
        if (isNaN(val) || !Number.isInteger(val)) {
            return;
        }
        var $timePicker = $form.find('.timePicker');

        var date = $timePicker.data("date");

        switch (type) {
            case "minute":
                if (val < 0 || val > 59) {
                    return;
                }
                date.setMinutes(val);
                showTimeHelper(date, false, true, $form);
                break;
            case "hour":
                if (val < 1 || val > 12) {
                    return;
                }

                var ampm = $form.find(".inputSection .ampm").text();

                if (val === 12 && ampm === "AM") {
                    val = 0;
                } else if (ampm === "PM" && val !== 12) {
                    val += 12;
                }
                date.setHours(val);
                showTimeHelper(date, true, false, $form);
                break;
            default:
                // error case
                break;
        }
    }

    function showTimeHelper(date, noHourRest, noMinReset, $form) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        var $timePicker = $form.find('.timePicker');
        var $inputSection = $timePicker.find(".inputSection");

        if (!noHourRest) {
            $inputSection.find(".hour").val(hours);
        }
        if (!noMinReset) {
            $inputSection.find(".minute").val(minutes);
        }
        $inputSection.find(".ampm").text(ampm);

        $timePicker.data("date", date);

        var timeStamp = hours + " : " + minutes + " " + ampm;
        $form.find(".timeSection .time").val(timeStamp)
                                    .data("date", date);
    }

    function getRepeatPeriod(schedule) {
        var oneHour = 3600; // 1 hour = 3600s

        switch (schedule.repeat) {
            case scheduleFreq.minute:
                return 60; // 60s
            case scheduleFreq.hourly:
                return oneHour;
            case scheduleFreq.daily:
                return 24 * oneHour; // one day
            case scheduleFreq.weekly:
                return 7 * 24 * oneHour; // one week
            case scheduleFreq.biweekly:
                return 14 * 24 * oneHour; // two weeks
            case scheduleFreq.monthly:
                throw "Not support yet!";
            default:
                throw "Invalid option!";
        }
    }

    function getNextRunTime(schedule) {
        var d = new Date();
        var time = new Date(schedule.startTime);

        if (time >= d) {
            // the start time has not passed
            return;
        }

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

    /* Unit Test Only */
    if (window.unitTestMode) {
        Scheduler.__testOnly__ = {};
        Scheduler.__testOnly__.getNextRunTime = getNextRunTime;
        Scheduler.__testOnly__.getRepeatPeriod = getRepeatPeriod;
        Scheduler.__testOnly__.showTimeHelper = showTimeHelper;
        Scheduler.__testOnly__.inputTime = inputTime;
        Scheduler.__testOnly__.changeTime = changeTime;
        Scheduler.__testOnly__.resetCreateNewScheduleForm = resetCreateNewScheduleForm;
        Scheduler.__testOnly__.resetModifiedScheduleForm = resetModifiedScheduleForm;
        Scheduler.__testOnly__.saveScheduleForm = saveScheduleForm;
        Scheduler.__testOnly__.fillInScheduleDetail = fillInScheduleDetail;
        Scheduler.__testOnly__.schedDetailTabs = schedDetailTabs;
    }
    /* End Of Unit Test Only */

    return (Scheduler);
}({}, jQuery));
