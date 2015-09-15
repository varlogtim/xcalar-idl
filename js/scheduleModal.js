window.Scheduler = (function(Scheduler, $) {
    var $modalBackground = $("#modalBackground");
    var $scheduleModal   = $("#scheduleModal");

    var $timePicker  = $("#scheduler-timePicker");
    var $timeSection = $scheduleModal.find(".timeSection");

    // constant
    var scheduleFreq = {
        "daily"       : "daily",
        "weekly"      : "weekly",
        "biweekly"    : "biweekly",
        "monthly"     : "monthly",
        "weekPerMonth": "weekPerMonth"
    };

    Scheduler.setup = function() {
        $scheduleModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $scheduleModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeScheduleModal();
        });

        var $dateInput = $timeSection.find(".date");
        var $timeInput = $timeSection.find(".time");

        // minDate disable the past date
        $dateInput.datepicker({
            "showOtherMonths": true,
            "dayNamesMin"    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "minDate"        : 0,
            "beforeShow"     : function() {
                var $el = $("#ui-datepicker-div");

                $el.addClass("schedulerDatePicker")
                    .appendTo($timeSection);

                // not working if do not use setTimeout
                setTimeout(function() {
                    $el.css({
                        "top" : "41px",
                        "left": "104px"
                    });
                }, 0);
            }
        });

        $dateInput.on("keydown", function() {
            // no input event
            return false;
        });

        $timeInput.on({
            "click": function() {
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
        var $freqSection = $scheduleModal.find(".frequencySection");
        var $freq2 = $freqSection.find(".freq2");

        $freqSection.on("click", ".select-item", function() {
            var $option = $(this);

            $freqSection.find(".radio").removeClass("checked");
            $option.find(".radio").addClass("checked");

            if ($option.data("option") === scheduleFreq.weekPerMonth) {
                $freq2.removeClass("inActive");
                $timeSection.addClass("inActive");
            } else {
                $freq2.addClass("inActive");
                $timeSection.removeClass("inActive");
            }
        });

        xcHelper.dropdownList($freq2.find(".listSection"), {
            "onSelect": function($li) {
                var text = $li.text();
                $li.closest(".listSection").find("input").val(text);
            },
            "container": "#scheduleModal"
        });
    };

    Scheduler.show = function() {
        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        centerPositionElement($scheduleModal);
        resetScheduleModal();

        $scheduleModal.show();

        $(document).on("mousedown.schedule", function() {
            xcHelper.hideDropdowns($scheduleModal);

            var $el = $(event.target);

            if ($el.hasClass("timePickerBox") ||
                $el.closest(".timePicker").length > 0)
            {
                return;
            } else {
                toggleTimePicker();
            }
        });
    };

    function closeScheduleModal() {
        $(document).off(".schedule");

        $scheduleModal.hide();
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
        });
    }

    function resetScheduleModal() {
        $timeSection.removeClass("inActive")
                    .find(".date").val("")
                    .end()
                    .find(".time").val("").removeData("date");

        $timePicker.hide().removeData("date");

        var $freqSection = $scheduleModal.find(".frequencySection");
        $freqSection.find(".radio.checked").removeClass("checked")
                    .end()
                    .find(".radio").eq(0).addClass("checked");

        $freqSection.find(".freq2").addClass("inActive")
                    .find(".listSection").each(function() {
                        var $listSection = $(this);
                        var text = $listSection.find("li:first-child").text();
                        $listSection.find("input").val(text);
                    });

    }

    function toggleTimePicker(display) {
        if (!display) {
            $timePicker.fadeOut(200);
            return;
        }

        var date = $timeSection.find(".time").data("date");
        date = date || new Date();

        $timePicker.fadeIn(200);
        showTimeHelper(date);
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

        $timeSection.find(".time").val(timeStamp)
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

    return (Scheduler);
}({}, jQuery));
