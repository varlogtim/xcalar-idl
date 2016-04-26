window.AddScheduleModal = (function($, AddScheduleModal) {
    var $modal;             // $('#addScheduleModal')
    var $list;              // $modal.find('.scheduleList')
    var $scheduleListInput; // $modal.find('.scheduleListInput')
    var $shceduleInfo;      // $modal.find('.scheInfoSection .text')

    var groupName;
    var modalHelper;

    AddScheduleModal.setup = function() {
        $modal = $('#addScheduleModal');
        $list = $modal.find('.scheduleList');
        $scheduleListInput = $modal.find('.scheduleListInput');
        $shceduleInfo = $modal.find('.scheInfoSection .text');

        modalHelper = new ModalHelper($modal, {
            "focusOnOpen": true,
            "noCenter"   : true
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

        // Note that the modal's center position
        // is different from other modal, need this handle
        var $window = $(window);
        var winHeight = $window.height();
        var winWidth = $window.width();
        var modalWidth  = $modal.width();
        var modalHeight = $modal.height();

        var left = ((winWidth - modalWidth) / 2);
        var top = ((winHeight - modalHeight) / 4);

        $modal.css({
            "left": left,
            "top" : top
        });

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

        $list.find('ul').html(lis);

        if (attachedSched == null) {
            attachedSched = "N/A";
        }
        $shceduleInfo.text(attachedSched);
    }

    function submitForm() {
        // validation
        if ($scheduleListInput.hasClass("hint")) {
            var options = {
                "offset": -25,
                "side"  : "right"
            };
            StatusBox.show(ErrTStr.NoEmptyList, $scheduleListInput, false, options);
            return;
        }

        var selectedSchedule = $scheduleListInput.val();
        closeModal();

        Scheduler.addDFG(selectedSchedule, groupName)
        .then(function() {
            xcHelper.showSuccess();
        })
        .fail(function(error) {
            Alert.error(SchedTStr.AddSchedFail, error);
        });
    }

    function addModalEvents() {
        xcHelper.dropdownList($list, {
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
        $shceduleInfo.text("N/A");
    }

    return (AddScheduleModal);

}(jQuery, {}));
