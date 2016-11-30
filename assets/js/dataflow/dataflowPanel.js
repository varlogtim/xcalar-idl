window.DataflowPanel = (function($, DataflowPanel) {

    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.initialize = function() {
    	DFCard.initialize();
    	DF.initialize();
    };

    DataflowPanel.active = function() {

    };

    return (DataflowPanel);
}(jQuery, {}));
