window.DataflowPanel = (function($, DataflowPanel) {
    var hasChange = false;

    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.initialize = function() {
        DFCard.initialize();
    };

    DataflowPanel.refresh = function() {
        if ($("#dataflowPanel").hasClass("active") && hasChange) {
            $("#scheduleDetail .close").click();
            $("#dfgMenu .refreshBtn").click();
            $("#dfgViz .retTab").removeClass("active");
            $("#dfgParameterModal .close").click();
            hasChange = false;
        }
    };

    DataflowPanel.hasNewChange = function() {
        hasChange = true;
    };

    return (DataflowPanel);
}(jQuery, {}));
