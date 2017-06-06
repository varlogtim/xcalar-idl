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
            $("#dfMenu .refreshBtn").click();
            $("#dfViz .retTab").removeClass("active");
            if ($("#dfParamModal").is(":visible")) {
                $("#dfParamModal .close").click();
            }
            hasChange = false;
        }
    };

    DataflowPanel.hasNewChange = function() {
        hasChange = true;
    };

    return (DataflowPanel);
}(jQuery, {}));
