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

            var $title = $('#schedulerTopBar').find(".title");
            if ($button.attr('id') === "dataflowButton") {
                $dfgView.show();
                $schedulesView.hide();
                if ($dfgView.find('.listBox.selected').length === 0) {
                    $dfgView.find('.listBox').eq(0).trigger('click',
                                                            {show: true});
                }
                $title.text(DFGTStr.DFGTitle);
                $("#dfgMenu").find(".schedulesMenu")
                            .addClass("xc-hidden")
                            .prev()
                            .removeClass("xc-hidden");
            } else {
                $dfgView.hide();
                $schedulesView.show();
                Scheduler.refresh();
                $title.text(SchedTStr.SchedTitle);
                $("#dfgMenu").find(".dfgList")
                            .addClass("xc-hidden")
                            .next()
                            .removeClass("xc-hidden");
            }
             // button switch styling handled in mainMenu.js
        });
    }

    return (SchedulerPanel);
}(jQuery, {}));
