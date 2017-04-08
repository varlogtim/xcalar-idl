window.DataflowPanel = (function($, DataflowPanel) {

    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.initialize = function() {
        DFCard.initialize();
    };

    DataflowPanel.active = function() {
        Scheduler.displayServerTime();
    };

    DataflowPanel.inActive = function() {
        Scheduler.clearServerTime();
    };

    return (DataflowPanel);
}(jQuery, {}));
