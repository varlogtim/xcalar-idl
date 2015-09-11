window.Scheduler = (function(Scheduler, $) {
    var $schedulesView = $("#schedulesView");
    var $scheduleForm  = $("#scheduleForm");
    var $scheduleLists = $("#scheduleLists");

    var $timePicker = $("#scheduler-timePicker");

    // constant
    var scheduleFreq = {
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

    var schedules = [];
    var scheduleLookUpMap = {};

    var debug = true; // XXX only for debug use

    Scheduler.setup = function() {
        // click on schedule list
        $scheduleLists.on("click", ".scheduleList", function() {
            var $li = $(this);
            $scheduleLists.children(".active").removeClass("active");
            $li.addClass("active");

            var scheduleName = $li.data("name");
            listSchedule(scheduleName);
        });

        $("#addSchedule").click(function() {
            $scheduleLists.children(".active").removeClass("active");
            listSchedule();
        });

        var $timeSection = $scheduleForm.find(".timeSection");
        var $dateInput = $timeSection.find(".date");
        var $timeInput = $timeSection.find(".time");

        // minDate attr disable the date before today
        $dateInput.datepicker({
            "showOtherMonths": true,
            "dateFormat"     : "m/d/yy",
            "dayNamesMin"    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate"        : 0,
            "beforeShow"     : function() {
                var $el = $("#ui-datepicker-div");

                $el.addClass("schedulerDatePicker")
                    .appendTo($timeSection.find(".datePickerPart"));

                // not working if do not use setTimeout
                setTimeout(function() {
                    $el.css({
                        "top" : "28px",
                        "left": "0"
                    });
                }, 0);
            }
        });

        $dateInput.on("keydown", function() {
            // no input event
            return false;
        });

        $timeInput.on({
            "focus": function() {
                toggleTimePicker(true);
            },
            "keydown": function() {
                // no input event
                return false;
            }
        });

        $timePicker.on("click", ".btn", function() {
            var $btn = $(this);
            var isIncrease = $btn.hasClass("increase");
            var btnType;

            if ($btn.hasClass("hour")) {
                btnType = "hour";
            } else if ($btn.hasClass("minute")) {
                btnType = "minute";
            } else {
                btnType = "ampm";
            }

            changeTime(btnType, isIncrease);
        });

        // frequent section event
        var $freqSection = $schedulesView.find(".frequencySection");
        var $freq2 = $freqSection.find(".freq2");

        $freqSection.on("click", ".select-item", function() {
            var $option = $(this);
            var $datepickerPart = $timeSection.find(".datePickerPart");

            $freqSection.find(".radio").removeClass("checked");
            $option.find(".radio").addClass("checked");

            if ($option.data("option") === scheduleFreq.dayPerMonth) {
                $freq2.removeClass("inActive");
                $datepickerPart.addClass("inActive");
            } else {
                $freq2.addClass("inActive");
                $datepickerPart.removeClass("inActive");
            }
        });

        // dropdown list event
        xcHelper.dropdownList($freq2.find(".listSection"), {
            "onSelect": function($li) {
                var text = $li.text();
                $li.closest(".listSection").find("input").val(text);
            },
            "container": "#schedulesView"
        });

        $schedulesView.on("mousedown", function() {
            xcHelper.hideDropdowns($schedulesView);
        });

        $scheduleForm.find("> .heading").on("click", ".iconWrap, .text", function() {
            if ($scheduleForm.hasClass("new")) {
                return;
            }

            $scheduleForm.toggleClass("inActive");
            resetScheduleForm();
        });

        $("#scheduleForm-save").click(function() {
            saveScheduleForm();
        });

        $("#scheduleForm-cancel").click(function() {
            resetScheduleForm();
        });

        Scheduler.restore();
    };

    Scheduler.restore = function(oldSchedules) {
        // XXX only for debug use
        if (debug) {
            oldSchedules = [
                {
                    "name"     : "debug",
                    "startTime": 1443141062968,
                    "dateText" : "9/24/2015",
                    "timeText" : "05 : 31 PM",
                    "repeat"   : "hourly",
                    "freq"     : null,
                    "created"  : 1443141062968,
                    "modified" : 1443141062968,
                    "DFGs"     : ["a", "b", "c"]
                },
                {
                    "name"     : "debug2",
                    "startTime": 1443486662000,
                    "dateText" : "9/24/2015",
                    "timeText" : "05 : 31 PM",
                    "repeat"   : "dayPerMonth",
                    "freq"     : {
                        "radix": "Last",
                        "day"  : "Monday"
                    },
                    "created" : 1443141062968,
                    "modified": 1443141062968,
                    "DFGs"    : ["e", "f", "g"]
                }
            ];
        }

        var html = "";

        for (var i = 0, len = oldSchedules.length; i < len; i++) {
            var schedule = oldSchedules[i];

            if (schedule != null) {
                schedules.push(schedule);
                scheduleLookUpMap[schedule.name] = schedule;
                html += getScheduelListHTML(schedule.name);
            }
        }

        $scheduleLists.html(html);
    };

    Scheduler.getAllSchedules = function() {
        return (schedules);
    };

    function saveScheduleForm() {
        var $scheduleName = $scheduleForm.find(".nameSection input");
        var $scheduleDate = $scheduleForm.find(".timeSection .date");
        var $scheduleTime = $scheduleForm.find(".timeSection .time");

        // validation
        var isValid = xcHelper.validate([
            {
                "$selector": $scheduleName
            },
            {
                "$selector": $scheduleDate,
                "text"     : "Please fill out this field.",
                "check"    : function() {
                    var $div = $scheduleDate.closest(".datePickerPart");
                    if ($div.hasClass("inActive")) {
                        return false;
                    } else {
                        return ($scheduleDate.val() === "");
                    }
                },
                "callback": function() {
                    $scheduleDate.focus();
                }
            },
            {
                "$selector": $scheduleTime,
                "text"     : "Please fill out this field.",
                "callback" : function() {
                    $scheduleTime.focus();
                }
            }
        ]);

        if (!isValid) {
            return;
        }

        var srcScheduleName = $scheduleForm.data("schedule");
        var isNewSchedule = (srcScheduleName == null);
        var schedule = isNewSchedule ? null : scheduleLookUpMap[srcScheduleName];

        var name = $scheduleName.val().trim();
        var error;

        if (isNewSchedule && scheduleLookUpMap[name] != null ||
            name !== srcScheduleName && scheduleLookUpMap[name] != null)
        {
            error = "Schedule " + name + " already exists, " +
                        "please use another name";
            StatusBox.show(error, $scheduleName);
            return;
        }

        var date    = $scheduleDate.val().trim();
        var time    = $scheduleTime.val().trim();
        var timeObj = $scheduleTime.data("date");
        var repeat  = $scheduleForm.find(".frequencySection .radio.checked")
                                    .closest(".select-item").data("option");

        var isDayPerMonth = (repeat === scheduleFreq.dayPerMonth);

        var d = isDayPerMonth ? new Date() : new Date(date);
        d.setHours(timeObj.getHours(), timeObj.getMinutes(),
                    timeObj.getSeconds());

        var startTime   = d.getTime();
        var currentTime = new Date().getTime();

        if (!isDayPerMonth && startTime < currentTime) {
            error = time + " on " + date +
                        " is not a valid time, pleas choose another time";
            StatusBox.show(error, $scheduleTime);
            return;
        }

        var freq = null;
        if (isDayPerMonth) {
            var $inputs   = $scheduleForm.find(".freq2 .listSection .text");
            var radixText = $inputs.eq(0).val();
            var dayText   = $inputs.eq(1).val();

            var radix     = radixMap[radixText];
            var day       = dayMap[dayText];
            var startDate = getDayPerMonthHelper(radix, day, d);

            startTime = startDate.getTime();
            date = xcHelper.getDate("/", startDate);

            freq = {
                "radix": radixText,
                "day"  : dayText
            };
        }

        var option = {
            "name"     : name,
            "startTime": startTime,
            "dateText" : date,
            "timeText" : time,
            "repeat"   : repeat,
            "freq"     : freq,
            "modified" : currentTime
        };

        if (isNewSchedule) {
            newSchedule(option);
        } else {
            updateSchedule(schedule, option);
        }
    }

    function resetScheduleForm() {
        var schedule;
        var name = $scheduleForm.data("schedule");
        var isNew = (name == null) ? true : false;
        var text;

        if (isNew) {
            // new schedule
            schedule = {};
        } else {
            // modify schedule
            schedule = scheduleLookUpMap[name];
        }

        var $nameInput = $scheduleForm.find(".nameSection input");
        text = schedule.name || "";
        $nameInput.val(text);

        var $timeSection = $scheduleForm.find(".timeSection");
        text = schedule.dateText || "";
        $timeSection.find(".datePickerPart").removeClass("inActive")
                    .find(".date").val(text);

        if (isNew) {
            $timeSection.find(".time").val("").removeData("date");
            $timePicker.hide().removeData("date");
        } else {
            var date = new Date(schedule.startTime);

            $timeSection.find(".time").val(schedule.timeText)
                .data("date", date);
            $timePicker.hide().data("date", date);
        }

        var $freqSection = $scheduleForm.find(".frequencySection");
        $freqSection.find(".radio.checked").removeClass("checked");

        var $checkBox;
       
        if (isNew) {
            $checkBox = $freqSection.find(".select-item").eq(0);
        } else {
            $checkBox = $freqSection.find('.select-item[data-option="' +
                                            schedule.repeat + '"]');
        }

        $checkBox.click();

        var $freq2 = $freqSection.find(".freq2");
        if ($checkBox.data("option") === scheduleFreq.dayPerMonth) {
            $freq2.find(".listSection.radix .list li").filter(function() {
                return $(this).text() === schedule.freq.radix;
            }).click();

            $freq2.find(".listSection.day .list li").filter(function() {
                return $(this).text() === schedule.freq.day;
            }).click();
        } else {
            $freq2.find(".listSection").each(function() {
                var $listSection = $(this);
                var liText = $listSection.find("li:first-child").text();
                $listSection.find("input").val(liText);
            });
        }

        if (isNew) {
            $nameInput.focus();
        }
    }

    function newSchedule(option) {
        option.DFGs = [];
        option.created = option.modified;

        schedules.push(option);
        scheduleLookUpMap[option.name] = option;

        var html = getScheduelListHTML(option.name);
        var $li  = $(html);

        if (gMinModeOn) {
            $li.prependTo($scheduleLists).click();
        } else {
            $li.hide().prependTo($scheduleLists).slideDown(100, function() {
                $li.click();
            });
        }
    }

    function updateSchedule(schedule, option) {
        var srcName = schedule.name;
        schedule = $.extend(schedule, option);

        delete scheduleLookUpMap[srcName];
        scheduleLookUpMap[schedule.name] = schedule;

        var $li = $scheduleLists.find('.scheduleList[data-name="' + srcName + '"]');
        $li.attr("data-name", schedule.name)
            .data("name", schedule.name)
            .find(".scheduleName").text(schedule.name)
            .end().click();
    }

    function listSchedule(name) {
        var isNew = (name == null) ? true : false;
        var schedule;
        var text;

        if (isNew) {
            // new schedule
            schedule = {};
            $("#deleteSchedule").addClass("btnInactive");
        } else {
            schedule = scheduleLookUpMap[name];
            $("#deleteSchedule").removeClass("btnInactive");
        }

        // update schedule info section
        var $scheduleInfos = $("#scheduleInfos");
        // title
        text = schedule.name || "New Schedule";
        $scheduleInfos.find(".heading").text(text);

        text = getTime(schedule.created) || "N/A";
        $scheduleInfos.find(".created .text").text(text);

        text = getTime(schedule.modified) || "N/A";
        $scheduleInfos.find(".modified .text").text(text);

        text = schedule.repeat || "N/A";
        if (schedule.repeat === scheduleFreq.dayPerMonth) {
            text = schedule.freq.radix + " " + schedule.freq.day + " " +
                    " of every month";
        }

        $scheduleInfos.find(".frequency .text").text(text);


        // update schedule tables
        var $scheduleTable = $("#scheduleTable");
        var html = getDFGListHTML(schedule.DFGs);
        $scheduleTable.find(".mainSection").html(html);

        text = getTime(schedule.lastRun) || "N/A";
        $scheduleTable.find(".bottomSection .lastRunInfo .text").text(text);

        text = getTime(schedule.startTime) || "N/A";
        $scheduleTable.find(".bottomSection .nextRunInfo .text").text(text);

        // update schedule form
        if (isNew) {
            $scheduleForm.addClass("new")
                        .removeClass("inActive")
                        .data("schedule", null)
                        .find(".heading .text").text("NEW SCHEDULE")
                        .end();
        } else {
            $scheduleForm.removeClass("new")
                        .addClass("inActive")
                        .data("schedule", schedule.name)
                        .find(".heading .text").text("MODIFIED SCHEDULE");
        }

        resetScheduleForm();
    }

    function getTime(time) {
        if (time == null) {
            return null;
        }

        var d = new Date(time);
        var t = xcHelper.getDate("/", d) + " " + d.toLocaleTimeString();

        return t;
    }

    function getScheduelListHTML(name) {
        var html =
                '<li class="clearfix scheduleList" data-name="' + name + '">' +
                  '<div class="listBox">' +
                    '<div class="iconWrap">' +
                      '<span class="icon"></span>' +
                    '</div>' +
                    '<div class="scheduleName">' +
                      name +
                    '</div>' +
                    '<div class="checkMark"></div>' +
                  '</div>' +
               '</li>';
        return (html);
    }

    function getDFGListHTML(DFGs) {
        if (DFGs == null) {
            return "";
        }

        var html = "";

        for (var i = 0, len = DFGs.length; i < len; i++) {
            var DFGInfo;

            if (debug) {
                DFGInfo = {
                    "name"       : "debug" + i,
                    "initialTime": new Date().getTime(),
                    "status"     : "normal"
                };
            }

            html +=
                '<div class="grid-unit">' +
                    '<div class="name">' +
                        DFGInfo.name +
                    '</div>' +
                    '<div class="time">' +
                        getTime(DFGInfo.initialTime) +
                    '</div>' +
                    '<div class="status">' +
                        DFGInfo.status +
                    '</div>' +
                '</div>';
        }

        return (html);
    }

    function toggleTimePicker(display) {
        if (!display) {
            $(document).off(".timePicker");
            $timePicker.fadeOut(200);
            return;
        }

        var date = $scheduleForm.find(".timeSection .time").data("date");
        date = date || new Date();

        $timePicker.fadeIn(200);
        showTimeHelper(date);
        $(document).on("mousedown.timePicker", function() {
            var $el = $(event.target);

            if ($el.hasClass("timePickerBox") ||
                $el.closest(".timePicker").length > 0)
            {
                return;
            }

            toggleTimePicker();

        });
    }

    function changeTime(btnType, isIncrease) {
        var time = $timePicker.data("date").getTime();
        var ampm = $timePicker.find(".inputSection .ampm").text();

        if (btnType === "ampm") {
            var halfDay = 1000 * 60 * 60 * 12;

            if (ampm === "AM") {
                // toggle to PM, add 12 hours
                time += halfDay;
            } else {
                time -= halfDay;
            }
        } else {
            var timeDiff;

            if (btnType === "hour") {
                // one hour
                timeDiff = 1000 * 60 * 60;
            } else {
                // one minute
                timeDiff = 1000 * 60;
            }

            if (isIncrease) {
                time += timeDiff;
            } else {
                time -= timeDiff;
            }
        }

        var date = new Date(time);
        var timeStamp = showTimeHelper(date);

        $scheduleForm.find(".timeSection .time").val(timeStamp)
                                    .data("date", date);
    }

    function showTimeHelper(date) {
        var hours   = date.getHours();
        var minutes = date.getMinutes();
        var ampm    = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;

        var $inputSection = $timePicker.find(".inputSection");
        $inputSection.find(".hour").val(hours);
        $inputSection.find(".minute").val(minutes);
        $inputSection.find(".ampm").text(ampm);

        $timePicker.data("date", date);

        return (hours + " : " + minutes + " " + ampm);
    }

    function getDayPerMonthHelper(radix, day, srcTime) {
        var startTime = new Date(srcTime);

        // Example: next last Sunday of a Month
        if (radix === -1) {
            // go to the last day of this month
            startTime.setMonth(startTime.getMonth() + 1);
            startTime.setDate(0); // this go to the last day of previous month

            for (var i = 0; i < 7; i++) {
                if (startTime.getDay() === day) {
                    break;
                } else {
                    startTime.setDate(startTime.getDate() - 1);
                }
            }
        } else {
            // Example: next Second Sunday of a Month;
            
            // go to the first day of the month;
            startTime.setDate(1);

            // get the first (day) of the Month
            for (var i = 0; i < 7; i++) {
                if (startTime.getDay() === day) {
                    break;
                } else {
                    startTime.setDate(startTime.getDate() + 1);
                }
            }

            // get the (radix)th (day) of the month
            for (var j = 1; j < radix; j++) {
                startTime.setDate(startTime.getDate() + 7);
            }
        }

        // check if the start time is valid
        // in not, check next month
        if (startTime <= new Date().getTime()) {
            startTime.setMonth(startTime.getMonth() + 1);
            return getDayPerMonthHelper(radix, day, startTime);
        } else {
            return (startTime);
        }
    }

    return (Scheduler);
}({}, jQuery));
