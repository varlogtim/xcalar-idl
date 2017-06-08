window.DataflowPanel = (function($, DataflowPanel) {
    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.initialize = function() {
        DFCard.initialize();
    };

    DataflowPanel.refresh = function(dataflowName) {
        var activeDataflow = DFCard.getActiveDF();
        $("#dfMenu .refreshBtn").click();
        if (activeDataflow !== dataflowName) {
            // change is not on current dataflow
            return;
        }

        var hasRefreshSchedule = refreshSchedule();
        var hasRefreshRetTab = refreshRetTab();
        var hasRefreshParamModal = refreshParamModal();
        if (hasRefreshSchedule || hasRefreshRetTab || hasRefreshParamModal) {
            Alert.show({
                "title": DFTStr.Refresh,
                "msg": DFTStr.RefreshMsg,
                "isAlert": true
            });
        }
    };

    function refreshSchedule() {
        if ($("#scheduleDetail").is(":visible")) {
            Scheduler.hide();
            return true;
        } else {
            return false;
        }
    }

    function refreshRetTab() {
        var $retTab = $("#dfViz .retTab");
        if ($retTab.hasClass("active")) {
            $retTab.removeClass("active");
            return true;
        } else {
            return false;
        }
    }

    function refreshParamModal() {
        var $modal = $("#dfParamModal");
        if ($modal.is(":visible")) {
            $modal.find(".close").click();
            return true;
        } else {
            return false;
        }
    }

    return (DataflowPanel);
}(jQuery, {}));
