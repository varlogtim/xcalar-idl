window.SchedulerPanel = (function($, SchedulerPanel) {

    SchedulerPanel.setup = function() {
        setupViewToggling();
        DFGCard.setup();
        Scheduler.setup();
        AddScheduleCard.setup();
    };

    SchedulerPanel.active = function() {

    };

    function setupViewToggling() {
        var $schedulesView = $('#schedulesView');
        var $dfgView = $('#dataflowView');
        // main menu
        $('#schedulerTab').find('.subTab').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }

            if ($button.attr('id') === "schedulesButton") {
                $dfgView.hide();
                $schedulesView.show();
                Scheduler.refresh();
            } else {
                $dfgView.show();
                $schedulesView.hide();
                if ($dfgView.find('.listBox.selected').length === 0) {
                    $dfgView.find('.listBox').eq(0).trigger('click',
                                                            {show: true});
                }
            }
             // button switch styling handled in mainMenu.js
        });
    }

    return (SchedulerPanel);
}(jQuery, {}));
