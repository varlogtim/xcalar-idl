window.AddScheduleModal = (function($, AddScheduleModal) {
    var $modal   = $('#addScheduleModal');
    var $modalBg = $("#modalBackground");

    var modalHelper = new xcHelper.Modal($modal, {"focusOnOpen": true});
    var $list = $modal.find('.scheduleList');
    var $scheduleListInput = $modal.find('.scheduleListInput');
    var $shceduleInfo = $modal.find('.scheInfoSection .text');
    var groupName;

    AddScheduleModal.setup = function() {    
        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        addModalEvents();
    };

    AddScheduleModal.show = function(curentGroup, schedule) {
        groupName = curentGroup;
        modalHelper.setup();

        updateModalList(schedule);

        if (gMinModeOn) {
            $modalBg.show();
            $modal.show();
            Tips.refresh();
        } else {
            $modalBg.fadeIn(300, function() {
                $modal.fadeIn(180);
                Tips.refresh();
            });
        }

        $(document).on("keypress.addScheduleModal", function(e) {
            if (e.which === keyCode.Enter) {
                if (!$modal.find('.confirm').hasClass('unavailable')) {
                    submitForm();
                }
            }
        });
    };

    function updateModalList(selectedSchedule) {
        var schedules = Scheduler.getAllSchedules();
        var hasValidSchedule = false;
        var hasSelectedSchedule = false;

        var attachedSched = null;
        var hintText = "Select a schedule";
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
                                .val('No available schedules')
                                .attr('value', 'No available schedules');
            lis = '<li class="hint">No available schedules</li>';
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
            StatusBox.show(ErrorTextTStr.NoEmptyList, $scheduleListInput,
                            false, -25, {"side": "right"});
            return;
        }

        var selectedSchedule = $scheduleListInput.val();
        closeModal();

        Scheduler.addDFG(selectedSchedule, groupName)
        .then(function() {
            xcHelper.showSuccess();
        })
        .fail(function(error) {
            Alert.error("Add schedule fails", error);
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
        $(document).off(".addScheduleModal");
        modalHelper.clear();


        var fadeOutTime = gMinModeOn ? 0 : 300;

        $modal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });

        $shceduleInfo.text("N/A");
    }

    return (AddScheduleModal);

}(jQuery, {}));
