window.AddScheduleCard = (function($, AddScheduleCard) {
    var $card;             // $('#addScheduleCard')
    var $scheduleListInput; // $card.find('.scheduleListInput')

    var groupName;

    AddScheduleCard.setup = function() {
        $card = $('#addScheduleCard');
        $scheduleListInput = $card.find('.scheduleListInput');
        addCardEvents();
    };

    AddScheduleCard.show = function(curentGroup, schedule) {
        groupName = curentGroup;
        $card.show();
        updateScheduleList(schedule); 
    };

    AddScheduleCard.update = function(currentGroup) {
        if (!$card.is(":visible")) {
            // update function will get called when not visible, just return
            return;
        }
        groupName = currentGroup;
        updateScheduleList();  
    };

    function updateScheduleList(selectedSchedule) {
        var schedules = Scheduler.getAllSchedules();
        var hasValidSchedule = false;
        var hasSelectedSchedule = false;

        var attachedSched = null;
        var hintText = SchedTStr.SelectSched;
        var lis = '<li class="hint">' + hintText + '</li>';

        // latests schedule is at top
        for (var i = schedules.length - 1; i >= 0; i--) {
            var scheduleName = schedules[i].name;

            if (Scheduler.hasDFG(scheduleName, groupName)) {
                if (attachedSched == null) {
                    attachedSched = scheduleName;
                } else {
                    attachedSched += ", " + scheduleName;
                }
                continue;
            } else {
                hasValidSchedule = true;
            }

            lis += '<li>' + scheduleName + '</li>';

            

            // this check avoids malicious trigger of AddScheduleCard.show()
            if (!hasSelectedSchedule && scheduleName === selectedSchedule) {
                hasSelectedSchedule = true;
            }
        }

        if (!hasValidSchedule) {
            $scheduleListInput.removeClass("hint")
                                .val(SchedTStr.NoScheds)
                                .attr('value', SchedTStr.NoScheds);
            lis = '<li class="hint">' + SchedTStr.NoScheds + '</li>';
            $card.find('.confirm').addClass('unavailable');
        } else {
            if (hasSelectedSchedule) {
                $scheduleListInput.removeClass("hint")
                                .val(selectedSchedule)
                                .attr('value', selectedSchedule);
            } else {
                $scheduleListInput.addClass("hint")
                                    .val(hintText)
                                    .attr('value', hintText);
            }
            $card.find('.confirm').removeClass('unavailable');
        }

        $card.find('.scheduleList ul').html(lis);

        if (attachedSched == null) {
            attachedSched = "N/A";
        }
        $card.find('.scheInfoSection .text').text(attachedSched);
    }

    function submitForm() {
        // validation
        if ($scheduleListInput.hasClass("hint")) {
            var options = {
                "offsetX": -25,
                "side"   : "right"
            };
            StatusBox.show(ErrTStr.NoEmptyList, $scheduleListInput, false, options);
            return;
        }

        var selectedSchedule = $scheduleListInput.val();
        var currentGroup = groupName;
        // close card will set group name to null
        Scheduler.addDFG(selectedSchedule, currentGroup)
        .then(function() {
            xcHelper.showSuccess();
        })
        .fail(function(error) {
            Alert.error(SchedTStr.AddSchedFail, error);
        });

        closeCard();
    }

    function addCardEvents() {
        var schedList = new MenuHelper($card.find('.scheduleList'), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $scheduleListInput.val($li.text()).removeClass("hint");
            }
        });
        schedList.setupListeners();

        // click cancel or close button
        $card.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeCard();
        });

        // click confirm button
        $card.on("click", ".confirm", function() {
            submitForm();
        });

        $card.on("click", ".createNewSchedule", function() {
            closeCard();
            $('#schedulesButton').click();
            Scheduler.refresh(groupName);
        });

    }

    function closeCard() {
        $card.find('.scheInfoSection .text').text("N/A");
        groupName = null;
        $card.hide();
    }

    return (AddScheduleCard);

}(jQuery, {}));
