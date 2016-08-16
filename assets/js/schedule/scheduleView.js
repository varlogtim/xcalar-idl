window.Scheduler = (function(Scheduler, $) {
    var $schedulesView; // $("#schedulesView");
    var $newScheduleForm;  // $("#newScheduleForm");
    var $modScheduleForm; // $('#modifyScheduleForm');
    var $scheduleLists; // $("#scheduleLists");
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

    var schedules = [];
    var scheduleLookUpMap = {};

    Scheduler.setup = function() {
        $schedulesView = $("#schedulesView");
        $newScheduleForm = $("#newScheduleForm");
        $modScheduleForm = $('#modifyScheduleForm');
        $scheduleLists = $("#scheduleLists");
        $newTimePicker = $("#newScheduler-timePicker");
        $modTimePicker = $("#modScheduler-timePicker");
        // click on schedule list
        $scheduleLists.on("click", ".scheduleList", function() {
            var $li = $(this);
            $scheduleLists.children(".active").removeClass("active");
            $li.addClass("active");

            var scheduleName = $li.data("name");
            listSchedule(scheduleName);
        });

        $("#addSchedule").click(function() {
            newScheduleForm();
        });

        $newScheduleForm.find('.close').on('click', function() {
            $newScheduleForm.addClass('xc-hidden');
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
        var $freqSection = $schedulesView.find(".frequencySection");
        var $freq2 = $freqSection.find(".freq2");
        xcHelper.optionButtonEvent($freqSection, function(option) {
            var $datepickerPart = $newTimeSection.find(".datePickerPart");

            if (option === scheduleFreq.dayPerMonth) {
                $freq2.removeClass("inActive");
                $datepickerPart.addClass("inActive");
            } else {
                $freq2.addClass("inActive");
                $datepickerPart.removeClass("inActive");
            }
        });

        // // dropdown list event
        // var freqList = new MenuHelper($freq2.find(".dropDownList"), {
        //     "onSelect": function($li) {
        //         var text = $li.text();
        //         $li.closest(".dropDownList").find("input").val(text);
        //     },
        //     "container": "#schedulesView"
        // });
        // freqList.setupListeners();

        $("#modScheduleForm-edit").on("click", function() {
            $(this).blur();


            $modScheduleForm.toggleClass("inActive");
            if (!$modScheduleForm.hasClass('inActive')) {
                $modScheduleForm.find('.btn.confirm').focus();
            }
            resetScheduleForm($modScheduleForm);
        });

        $("#newScheduleForm-save").click(function() {
            $(this).blur();
            if (saveScheduleForm($newScheduleForm)) {
                $newScheduleForm.addClass('xc-hidden');
            }
        });

        $("#modScheduleForm-save").click(function() {
            $(this).blur();
            saveScheduleForm($modScheduleForm);
        });

        $("#newScheduleForm-cancel").click(function() {
            $(this).blur();
            resetScheduleForm($newScheduleForm);
        });
        $("#modScheduleForm-cancel").click(function() {
            $(this).blur();
            $modScheduleForm.addClass("inActive");
            resetScheduleForm($modScheduleForm);
        });

        schedDetailTabs();
    };

    Scheduler.restore = function(oldSchedules) {
        oldSchedules = oldSchedules || {};
        var html = "";

        for (var i = 0, len = oldSchedules.length; i < len; i++) {
            var oldSchedule = oldSchedules[i];

            if (oldSchedule != null) {
                var schedule = new SchedObj(oldSchedule);
                schedules.push(schedule);
                scheduleLookUpMap[schedule.name] = schedule;

                // lastest schedule should at top
                html = getScheduleListHTML(schedule.name) + html;
            }
        }

        $scheduleLists.html(html);
        updateScheduleInfo();
    };

    Scheduler.getAllSchedules = function() {
        return schedules;
    };

    Scheduler.refresh = function(dfgName) {
        if (dfgName != null) {
            // trigger from addScheduleModal
            $newScheduleForm.data("dfg", dfgName);
            newScheduleForm();
            return;
        }

        $newScheduleForm.removeData("dfg");
        var $lis = $scheduleLists.children();
        if ($lis.length > 0) {
            $lis.eq(0).click();
        } else {
            newScheduleForm();
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

            DFGCard.listSchedulesInHeader(dfgName);
            // XXX TODO add sql
            KVStore.commit();
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
            } else {
                $modScheduleForm.addClass('xc-hidden');
            }
        });
    }

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

    function newScheduleForm() {
        // $("#scheduleTable").hide();
        // $("#scheduleInfos").addClass('xc-hidden');
        $scheduleLists.children(".active").removeClass("active");
        listSchedule();
    }

    function saveScheduleForm($form) {
        var isNewSchedule = $form.attr("id") === "newScheduleForm";

        var $scheduleName  = $form.find(".nameSection input");
        var $scheduleDate  = $form.find(".timeSection .date");
        var $scheduleTime  = $form.find(".timeSection .time");
        var $scheduleRecur = $form.find(".recurSection input");
        var name;
        // validation
        var isValid;
        if (isNewSchedule) {
            name = $scheduleName.val().trim();

            isValid = xcHelper.validate([
                {
                    "$selector": $scheduleName,
                },
                {
                    "$selector": $scheduleName,
                    "text"     : ErrTStr.ScheduleConflict,
                    "check"    : function() {
                        return (scheduleLookUpMap[name] != null);
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }
        } else {
            name = $form.data("schedule");
        }

        isValid = xcHelper.validate([
            {
                "$selector": $scheduleDate,
                "text"     : ErrTStr.NoEmpty,
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
        if (isDayPerMonth) {
            var $inputs   = $form.find(".freq2 .dropDownList .text");
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
            var dfg = $newScheduleForm.data("dfg");
            if (dfg != null) {
                $newScheduleForm.removeData("dfg");
                triggerAddScheModal(dfg, name);
            }
        } else {
            var schedule = scheduleLookUpMap[name];
            updateSchedule(schedule, options);
        }
        xcHelper.showSuccess();
        return true;
    }

    function resetScheduleForm($form) {
        var name = $form.data("schedule");
        var isNew = $form.attr('id') === "newScheduleForm";
        var schedule = isNew ? {} : scheduleLookUpMap[name];
        $form.removeClass('xc-hidden');

        var text;
        var $nameInput = $form.find(".nameSection input");
        text = schedule.name || "";
        $nameInput.val(text);

        var $timeSection = $form.find(".timeSection");
        text = schedule.dateText || "";
        $timeSection.find(".datePickerPart").removeClass("inActive")
                    .find(".date").val(text);

        if (isNew) {
            $timeSection.find(".time").val("").removeData("date");
            $newTimePicker.hide().removeData("date");
        } else {
            var date = new Date(schedule.startTime);

            $timeSection.find(".time").val(schedule.timeText)
                .data("date", date);
            $modTimePicker.hide().data("date", date);
        }

        var $freqSection = $form.find(".frequencySection");
        $freqSection.find(".radioButton.active").removeClass("active");

        var $checkBox;

        if (isNew) {
            $checkBox = $freqSection.find(".radioButton").eq(0);
        } else {
            $checkBox = $freqSection.find('.radioButton[data-option="' +
                                            schedule.repeat + '"]');
        }

        $checkBox.click();

        // var $freq2 = $freqSection.find(".freq2");
        // if ($checkBox.data("option") === scheduleFreq.dayPerMonth) {
        //     $freq2.find(".dropDownList.radix .list li").filter(function() {
        //         return $(this).text() === schedule.freq.radix;
        //     }).click();

        //     $freq2.find(".dropDownList.day .list li").filter(function() {
        //         return $(this).text() === schedule.freq.day;
        //     }).click();
        // } else {
        //     $freq2.find(".dropDownList").each(function() {
        //         var $dropDownList = $(this);
        //         var liText = $dropDownList.find("li:first-child").text();
        //         $dropDownList.find("input").val(liText);
        //     });
        // }

        var $recurInput = $form.find(".recurSection input");
        text = schedule.recur || "";
        $recurInput.val(text);

        if (isNew) {
            $nameInput.focus();
        }
    }

    function triggerAddScheModal(dfgName, scheduleName) {
        $("#dataflowButton").click();
        $("#dfgMenu .dfgList .listBox").filter(function() {
            return $(this).find(".label").text() === dfgName;
        }).click();
        AddScheduleCard.show(dfgName, scheduleName);
    }

    function updateScheduleInfo() {
        $('#dfgMenu').find('.schedulesMenu .num').text(schedules.length);
    }

    function newSchedule(options) {
        var schedule = new SchedObj(options);
        schedules.push(schedule);
        scheduleLookUpMap[schedule.name] = schedule;

        var html = getScheduleListHTML(schedule.name);
        var $li  = $(html);

        if (gMinModeOn) {
            $li.prependTo($scheduleLists).click();
        } else {
            $li.hide().prependTo($scheduleLists).slideDown(100, function() {
                $li.click();
            });
        }

        updateScheduleInfo();
        KVStore.commit();
    }

    function updateSchedule(schedule, options) {
        var scheduleName = schedule.name;
        var oldSchedule = schedule;

        schedule.update(options);

        scheduleLookUpMap[scheduleName] = schedule;

        var promises = [];
        schedule.DFGs.forEach(function(scheduleDFG) {
            var dfgName = scheduleDFG.name;
            promises.push(Scheduler.updateDFG.bind(this, scheduleName, dfgName));
        });

        PromiseHelper.chain(promises)
        .then(function() {
            // update info on this schedule
            listSchedule(scheduleName);
            KVStore.commit();
        })
        .fail(function(error) {
            Alert.error(SchedTStr.UpdateFail, error);
            scheduleLookUpMap[scheduleName] = oldSchedule;
        });
    }

    function listSchedule(name) {
        var isNew = (name == null);
        var schedule;
        var text;
        var $scheduleInfos = $("#scheduleInfos");

        if (isNew) {
            // new schedule
            schedule = {};
            // $("#scheduleTable").hide();
            // $scheduleInfos.addClass('xc-hidden');
            
        } else {
            // $("#scheduleTable").show();
            // $scheduleInfos.removeClass('xc-hidden');
            $('#scheduleDetail').removeClass('xc-hidden');
            schedule = scheduleLookUpMap[name];
            // update schedule
            getNextRunTime(schedule);
        }

        // update schedule info section
        
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
        $scheduleInfos.find(".lastRunInfo .text").text(text);
        // next run
        text = getTime(schedule.startTime) || "N/A";
        $scheduleInfos.find(".nextRunInfo .text").text(text);

        // update schedule form
        var $form;
        if (isNew) {
            $form = $newScheduleForm;
            $form.data("schedule", null);
        } else {
            $form = $modScheduleForm;
            $form.addClass("inActive").data("schedule", schedule.name);
        }

        resetScheduleForm($form);
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

    function getScheduleListHTML(name) {
        var html =
                '<li class="clearfix scheduleList" data-name="' + name + '">' +
                    '<div class="iconWrap">' +
                      '<i class="icon xi-schedules"></i>' +
                    '</div>' +
                    '<span class="scheduleName">' +
                      name +
                    '</span>' +
                    '<i title="coming soon" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'class="icon deleteSchedule xi-trash">' +
                    '</i>' +
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
                '<div class="grid-unit clearfix">' +
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
