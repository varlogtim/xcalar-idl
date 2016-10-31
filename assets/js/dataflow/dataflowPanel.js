window.DataflowPanel = (function($, DataflowPanel) {

    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.active = function() {

    };

    return (DataflowPanel);
}(jQuery, {}));
