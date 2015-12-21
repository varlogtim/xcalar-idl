window.Scheduler = (function(Scheduler, $) {
    var $schedulesView = $("#schedulesView");
    var $scheduleForm  = $("#scheduleForm");
    var $scheduleLists = $("#scheduleLists");

    var $timePicker = $("#scheduler-timePicker");

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

    var schedules = [];
    var scheduleLookUpMap = {};

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
            newSchduleForm();
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
                if ($scheduleForm.hasClass("new")) {
                    $dateInput.datepicker("setDate", new Date());
                }

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

        $freqSection.on("click", ".radioWrap", function() {
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
        xcHelper.dropdownList($freq2.find(".dropDownList"), {
            "onSelect": function($li) {
                var text = $li.text();
                $li.closest(".dropDownList").find("input").val(text);
            },
            "container": "#schedulesView"
        });

        $schedulesView.on("mousedown", function() {
            xcHelper.hideDropdowns($schedulesView);
        });

        $("#scheduleForm-edit").on("click", function() {
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
            if (!$scheduleForm.hasClass("new")) {
                $scheduleForm.addClass("inActive");
            }
            resetScheduleForm();
        });

        // focus on the scheduler tab
        $("#schedulesButton").click();
    };

    Scheduler.getAllSchedules = function() {
        return schedules;
    };

    Scheduler.restore = function(oldSchedules) {
        if (oldSchedules == null) {
            return;
        }

        var html = "";

        for (var i = 0, len = oldSchedules.length; i < len; i++) {
            var oldSchedule = oldSchedules[i];

            if (oldSchedule != null) {
                var schedule = new SchedObj(oldSchedule);
                schedules.push(schedule);
                scheduleLookUpMap[schedule.name] = schedule;

                // lastest schedule should at top
                html = getScheduelListHTML(schedule.name) + html;
            }
        }

        $scheduleLists.html(html);
        updateScheduleInfo();
    };

    Scheduler.refresh = function(dfgName) {
        if (dfgName != null) {
            // trigger from addScheduleModal
            $scheduleForm.data("dfg", dfgName);
            newSchduleForm();
            return;
        }

        $scheduleForm.removeData("dfg");
        var $lis = $scheduleLists.children();
        if ($lis.length > 0) {
            $lis.eq(0).click();
        } else {
            newSchduleForm();
        }
    };

    Scheduler.addDFG = function(scheduleName, dfgName) {
        var deferred = jQuery.Deferred();
        var schedule = scheduleLookUpMap[scheduleName];
        var dfg = DFG.getGroup(dfgName);

        // validation check
        if (schedule.hasDFG(dfgName)) {
            deferred.reject("Duplicated DFGName");
            return (deferred.promise());
        }

        var args = getScheduleArgs(schedule, dfg);
        console.log(args);
        /**
        console.log(args[5]);
        XcalarExecuteRetina(args[5].retinaName, args[5].parameters)
        .then(function(ret) {
            console.log("done executing retina");
            console.log(ret);
        });

        deferred.resolve();
        */
        XcalarCreateSched.apply(window, args)
        .then(function() {
            // add dfg to schedule
            schedule.addDFG({
                "name"         : dfgName,
                "initialTime"  : schedule.startTime,
                "backSchedName": args[0]
            });
            // add schedule to dfg
            dfg.addSchedule(scheduleName);

            DFGPanel.listSchedulesInHeader(dfgName);
            // XXX TODO add sql
            commitToStorage();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    Scheduler.updateDFG = function(scheduleName, dfgName) {
        var deferred = jQuery.Deferred();
        var schedule = scheduleLookUpMap[scheduleName];
        var dfg = DFG.getGroup(dfgName);
        var dfgInfo = schedule.getDFG(dfgName);

        xcHelper.assert((dfgInfo != null), "Invalid dfg in schedule");

        var args;
        var backSchedName = dfgInfo.backSchedName;

        XcalarDeleteSched(backSchedName)
        .then(function() {
            args = getScheduleArgs(schedule, dfg);
            console.log(args);

            return XcalarCreateSched.apply(window, args);
        })
        .then(function() {
            // add dfg to schedule
            schedule.updateDFG(dfgName, {
                "initialTime"  : schedule.startTime,
                "status"       : "normal",
                "backSchedName": args[0]
            });
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    Scheduler.removeDFG = function(scheduleName, dfgName) {
        var deferred = jQuery.Deferred();
        var schedule = scheduleLookUpMap[scheduleName];
        var dfg = DFG.getGroup(dfgName);
        var dfgInfo = schedule.getDFG(dfgName);

        // validation check
        xcHelper.assert((dfgInfo != null), "Invalid dfg in schedule");
        xcHelper.assert(dfg.hasSchedule(scheduleName), "Invalid schedule in dfg");

        var backSchedName = dfgInfo.backSchedName;

        XcalarDeleteSched(backSchedName)
        .then(function() {
            // delete dfg in schedule
            schedule.removeDFG(dfgName);
            // delete schedule in dfg
            dfg.removeSchedule(scheduleName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    Scheduler.hasDFG = function(scheduleName, dfgName) {
        var schedule = scheduleLookUpMap[scheduleName];
        return schedule.hasDFG(dfgName);
    };

    function getScheduleArgs(schedule, dfg) {
        getNextRunTime(schedule);

        var backSchedName = schedule.name + "-" + dfg.name;
        var schedInSec = (schedule.startTime - new Date().getTime()) / 1000;
        schedInSec = Math.max(Math.round(schedInSec, 0));

        var period = getRepeatPeriod(schedule);
        var recurCount = schedule.recur;
        var parameters = dfg.getAllParameters();
        var type = SchedTaskTypeT.StQuery;
        var arg = new XcalarApiSchedArgTypeT();
        arg.executeRetinaInput = new XcalarApiExecuteRetinaInputT();
        arg.executeRetinaInput.retinaName = dfg.name;
        arg.executeRetinaInput.numParameters = parameters.length;
        arg.executeRetinaInput.parameters = parameters;

        return [backSchedName, schedInSec, period, recurCount, type, arg];
    }

    function newSchduleForm() {
        $("#scheduleTable").hide();
        $("#scheduleInfos").hide();
        $scheduleLists.children(".active").removeClass("active");
        listSchedule();
    }

    function saveScheduleForm() {
        var $scheduleName  = $scheduleForm.find(".nameSection input");
        var $scheduleDate  = $scheduleForm.find(".timeSection .date");
        var $scheduleTime  = $scheduleForm.find(".timeSection .time");
        var $scheduleRecur = $scheduleForm.find(".recurSection input");
        // validation
        var isValid = xcHelper.validate([
            {
                "$selector": $scheduleName
            },
            {
                "$selector": $scheduleDate,
                "text"     : ErrorTextTStr.NoEmpty,
                "check"    : function() {
                    var $div = $scheduleDate.closest(".datePickerPart");
                    if ($div.hasClass("inActive")) {
                        return false;
                    } else {
                        return ($scheduleDate.val() === "");
                    }
                }
            },
            {
                "$selector": $scheduleTime
            },
            {
                "$selector": $scheduleRecur
            }
        ]);

        if (!isValid) {
            return;
        }

        var srcScheduleName = $scheduleForm.data("schedule");
        var isNewSchedule = (srcScheduleName == null);
        var schedule = isNewSchedule ? null : scheduleLookUpMap[srcScheduleName];

        var name = $scheduleName.val().trim();

        if (isNewSchedule && scheduleLookUpMap[name] != null ||
            name !== srcScheduleName && scheduleLookUpMap[name] != null)
        {
            StatusBox.show(ErrorTextTStr.ScheduleConflict, $scheduleName);
            return;
        }

        var recur   = Number($scheduleRecur.val().trim());
        var date    = $scheduleDate.val().trim();
        var time    = $scheduleTime.val().trim();
        var timeObj = $scheduleTime.data("date");
        var repeat  = $scheduleForm.find(".frequencySection .radio.checked")
                                    .closest(".radioWrap").data("option");

        var isDayPerMonth = (repeat === scheduleFreq.dayPerMonth);

        var d = isDayPerMonth ? new Date() : new Date(date);
        d.setHours(timeObj.getHours(), timeObj.getMinutes(),
                    timeObj.getSeconds());

        var startTime   = d.getTime();
        var currentTime = new Date().getTime();

        if (!isDayPerMonth && startTime < currentTime) {
            StatusBox.show(ErrorTextTStr.TimeExpire, $scheduleTime);
            return;
        }

        var freq = null;
        if (isDayPerMonth) {
            var $inputs   = $scheduleForm.find(".freq2 .dropDownList .text");
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

        var options = {
            "name"     : name,
            "startTime": startTime,
            "dateText" : date,
            "timeText" : time,
            "repeat"   : repeat,
            "freq"     : freq,
            "modified" : currentTime,
            "recur"    : recur
        };

        if (isNewSchedule) {
            newSchedule(options);
            // jump back to addScheduleModal if it's triggered from that
            var dfg = $scheduleForm.data("dfg");
            if (dfg != null) {
                $scheduleForm.removeData("dfg");
                triggerAddScheModal(dfg, name);
            }
        } else {
            updateSchedule(schedule, options);
        }
        xcHelper.showSuccess();
    }

    function resetScheduleForm() {
        var name = $scheduleForm.data("schedule");
        var isNew = (name == null) ? true : false;
        var schedule = isNew ? {} : scheduleLookUpMap[name];

        var text;
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
            $checkBox = $freqSection.find(".radioWrap").eq(0);
        } else {
            $checkBox = $freqSection.find('.radioWrap[data-option="' +
                                            schedule.repeat + '"]');
        }

        $checkBox.click();

        var $freq2 = $freqSection.find(".freq2");
        if ($checkBox.data("option") === scheduleFreq.dayPerMonth) {
            $freq2.find(".dropDownList.radix .list li").filter(function() {
                return $(this).text() === schedule.freq.radix;
            }).click();

            $freq2.find(".dropDownList.day .list li").filter(function() {
                return $(this).text() === schedule.freq.day;
            }).click();
        } else {
            $freq2.find(".dropDownList").each(function() {
                var $dropDownList = $(this);
                var liText = $dropDownList.find("li:first-child").text();
                $dropDownList.find("input").val(liText);
            });
        }

        var $recurInput = $scheduleForm.find(".recurSection input");
        text = schedule.recur || "";
        $recurInput.val(text);

        if (isNew) {
            $nameInput.focus();
        }
    }

    function triggerAddScheModal(dfgName, scheduleName) {
        $("#dataflowButton").click();
        $("#dataflowView .listSection .listBox").filter(function() {
            return $(this).find(".label").text() === dfgName;
        }).click();
        AddScheduleModal.show(dfgName, scheduleName);
    }

    function updateScheduleInfo() {
        $schedulesView.find(".headingArea .num").text(schedules.length);
    }

    function newSchedule(options) {
        var schedule = new SchedObj(options);
        schedules.push(schedule);
        scheduleLookUpMap[schedule.name] = schedule;

        var html = getScheduelListHTML(schedule.name);
        var $li  = $(html);

        if (gMinModeOn) {
            $li.prependTo($scheduleLists).click();
        } else {
            $li.hide().prependTo($scheduleLists).slideDown(100, function() {
                $li.click();
            });
        }

        updateScheduleInfo();
        commitToStorage();
    }

    function updateSchedule(schedule, options) {
        // XXX TODO: remove the code to fetch scheduleName when update
        var scheduleName = schedule.name;
        var oldSchedule = schedule;

        schedule.update(options);

        scheduleLookUpMap[scheduleName] = schedule;

        var promises = [];
        schedule.DFGs.forEach(function(scheduleDFG) {
            var dfgName = scheduleDFG.name;
            promises.push(Scheduler.updateDFG.bind(this, scheduleName, dfgName));
        });

        chain(promises)
        .then(function() {
            // var $li = $scheduleLists.find('.scheduleList[data-name="' + srcName + '"]');
            // $li.attr("data-name", schedule.name)
            //     .data("name", schedule.name)
            //     .find(".scheduleName").text(schedule.name);
            // update info on this schedule
            listSchedule(scheduleName);
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Update Schedule Fails", error);
            scheduleLookUpMap[scheduleName] = oldSchedule;
        });
    }

    function listSchedule(name) {
        var isNew = (name == null) ? true : false;
        var schedule;
        var text;

        if (isNew) {
            // new schedule
            schedule = {};
            $("#scheduleTable").hide();
            $("#scheduleInfos").hide();
        } else {
            $("#scheduleTable").show();
            $("#scheduleInfos").show();
            schedule = scheduleLookUpMap[name];
            // update schedule
            getNextRunTime(schedule);
        }

        // update schedule info section
        var $scheduleInfos = $("#scheduleInfos");
        // title
        text = schedule.name || "New Schedule";
        $scheduleInfos.find(".heading").text(text);
        // create
        text = getTime(schedule.created) || "N/A";
        $scheduleInfos.find(".created .text").text(text);
        // last modified
        text = getTime(schedule.modified) || "N/A";
        $scheduleInfos.find(".modified .text").text(text);
        // frequency
        text = schedule.repeat || "N/A";
        if (schedule.repeat === scheduleFreq.dayPerMonth) {
            text = schedule.freq.radix + " " + schedule.freq.day + " " +
                    " of every month";
        }
        $scheduleInfos.find(".frequency .text").text(text);
        // recur
        text = schedule.recur || "N/A";
        $scheduleInfos.find(".recur .text").text(text);

        // update schedule tables
        var $scheduleTable = $("#scheduleTable");
        // dfg list
        var html = getDFGListHTML(schedule.DFGs);
        $scheduleTable.find(".mainSection").html(html);
        // last run
        text = getTime(schedule.lastRun) || "N/A";
        $scheduleTable.find(".bottomSection .lastRunInfo .text").text(text);
        // next run
        text = getTime(schedule.startTime) || "N/A";
        $scheduleTable.find(".bottomSection .nextRunInfo .text").text(text);

        // update schedule form
        if (isNew) {
            $scheduleForm.addClass("new")
                        .removeClass("inActive")
                        .data("schedule", null)
                        .find(".heading .text").text("NEW SCHEDULE");
            $("#scheduleForm-edit").removeClass("btn");
        } else {
            $scheduleForm.removeClass("new")
                        .addClass("inActive")
                        .data("schedule", schedule.name)
                        .find(".heading .text").text("MODIFY SCHEDULE");
            $("#scheduleForm-edit").addClass("btn");
        }

        resetScheduleForm();
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
                    '<div title="coming soon" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'class="icon deleteSchedule">' +
                    '</div>' +
                  '</div>' +
               '</li>';
        return html;
    }

    function getDFGListHTML(DFGs) {
        if (DFGs == null) {
            return "";
        }

        var html = "";

        for (var i = 0, len = DFGs.length; i < len; i++) {
            var DFG = DFGs[i];

            html +=
                '<div class="grid-unit">' +
                    '<div class="name">' +
                        DFG.name +
                    '</div>' +
                    '<div class="time">' +
                        getTime(DFG.initialTime) +
                    '</div>' +
                    '<div class="status">' +
                        DFG.status +
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
        if (date == null) {
            // new date is one minute faster than current time
            // which is a valid time
            date = new Date();
            date.setMinutes(date.getMinutes() + 1);
        }

        $timePicker.fadeIn(200);
        var timeStamp = showTimeHelper(date);
        $scheduleForm.find(".timeSection .time").val(timeStamp)
                     .data("date", date);
        showTimeHelper(date);
        $(document).on("mousedown.timePicker", function(event) {
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

    function getRepeatPeriod(schedule) {
        var oneHour = 3600; // 1 hour = 3600s

        switch (schedule.repeat) {
            case scheduleFreq.dayPerMonth:
                throw "repeat certain day per moth not support";
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

        if (repeat === scheduleFreq.dayPerMonth) {
            var freq  = schedule.freq;
            var radix = radixMap[freq.radix];
            var day   = dayMap[freq.day];

            time = getDayPerMonthHelper(radix, day, d.getTime());
            schedule.startTime = time.getTime();
            schedules.dateText = xcHelper.getDate("/", time);
        } else {
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
