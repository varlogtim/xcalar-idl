window.AddScheduleModal = (function($, AddScheduleModal) {
    var $modal;             // $('#addScheduleModal')
    var $scheduleListInput; // $modal.find('.scheduleListInput')

    var groupName;
    var modalHelper;

    AddScheduleModal.setup = function() {
        $modal = $('#addScheduleModal');
        $scheduleListInput = $modal.find('.scheduleListInput');

        modalHelper = new ModalHelper($modal, {
            "focusOnOpen": true,
            "center"     : {"verticalQuartile": true}
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        addModalEvents();
    };

    AddScheduleModal.show = function(curentGroup, schedule) {
        groupName = curentGroup;
        updateModalList(schedule);

        $(document).on("keypress.addScheduleModal", function(e) {
            if (e.which === keyCode.Enter) {
                if (!$modal.find('.confirm').hasClass('unavailable')) {
                    submitForm();
                }
            }
        });

        modalHelper.setup();
    };

    function updateModalList(selectedSchedule) {
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
            }

            lis += '<li>' + scheduleName + '</li>';

            if (!hasValidSchedule) {
                hasValidSchedule = true;
            }

            // this check avoids malicious trigger of AddScheduleModal.show()
            if (!hasSelectedSchedule && scheduleName === selectedSchedule) {
                hasSelectedSchedule = true;
            }
        }

        if (!hasValidSchedule) {
            $scheduleListInput.removeClass("hint")
                                .val(SchedTStr.NoScheds)
                                .attr('value', SchedTStr.NoScheds);
            lis = '<li class="hint">' + SchedTStr.NoScheds + '</li>';
            $modal.find('.confirm').addClass('unavailable');
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
            $modal.find('.confirm').removeClass('unavailable');
        }

        $modal.find('.scheduleList ul').html(lis);

        if (attachedSched == null) {
            attachedSched = "N/A";
        }
        $modal.find('.scheInfoSection .text').text(attachedSched);
    }

    function submitForm() {
        // validation
        if ($scheduleListInput.hasClass("hint")) {
            var options = {
                "offsetX": -25,
                "side"  : "right"
            };
            StatusBox.show(ErrTStr.NoEmptyList, $scheduleListInput, false, options);
            return;
        }

        var selectedSchedule = $scheduleListInput.val();
        var currentGroup = groupName;
        // close modal will set group name to null
        Scheduler.addDFG(selectedSchedule, currentGroup)
        .then(function() {
            xcHelper.showSuccess();
        })
        .fail(function(error) {
            Alert.error(SchedTStr.AddSchedFail, error);
        });

        closeModal();
    }

    function addModalEvents() {
        var schedList = new MenuHelper($modal.find('.scheduleList'), {
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
        $modal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeModal();
        });

        // click confirm button
        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("click", ".createNewSchedule", function() {
            closeModal();
            $('#schedulesButton').click();
            Scheduler.refresh(groupName);
        });

    }

    function closeModal() {
        modalHelper.clear();
        $(document).off(".addScheduleModal");
        $modal.find('.scheInfoSection .text').text("N/A");
        groupName = null;
    }

    return (AddScheduleModal);

}(jQuery, {}));
