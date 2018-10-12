window.DataflowPanel = (function($, DataflowPanel) {
    var pendingParamUpdates = [];
    DataflowPanel.setup = function() {
        DFCard.setup();
        Scheduler.setup();
        UploadDataflowCard.setup();
    };

    DataflowPanel.initialize = function() {
        DFCard.initialize();
    };

    DataflowPanel.refresh = function(updateInfo) {
        var dataflowName = updateInfo.dfName;
        var isUpdateParams = updateInfo.isUpdateParams;
        var activeDataflow = DFCard.getActiveDF();
        DFCard.refresh();
        if (activeDataflow !== dataflowName) {
            // The change is not on current dataflow
            if (isUpdateParams && refreshRetTab()) {
                Alert.show({
                    "title": DFTStr.Refresh,
                    "msg": DFTStr.RefreshMsg,
                    "isAlert": true
                });
            }
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

    DataflowPanel.showFirstTime = function() {
        var $dfList = $("#dfMenu .dfList");
        $dfList.addClass("disabled");
        DSTargetManager.refreshTargets(true);

        var promise = DF.initialize();
        xcHelper.showRefreshIcon($dfList, false, promise);

        promise
        .always(function() {
            $dfList.removeClass("disabled");
        });
    };

    DataflowPanel.show = function() {
        if (pendingParamUpdates.length) {
            DataflowPanel.showAlert({
                type: "modifiedParams",
                modifiedList: pendingParamUpdates
            });
        }
    };

    // show alert if panel is visible, otherwise store modifiedParams
    // and this will be called again when the panel becomes visible
    DataflowPanel.showAlert = function(alertInfo) {
        if (alertInfo.type === "modifiedParams") {
            var modifiedList = alertInfo.modifiedList;
            if (!$("#dataflowPanel").hasClass("active")) {
                modifiedList.forEach(function(param) {
                    var found = false;
                    for (var i = 0; i < pendingParamUpdates.length; i++) {
                        if (pendingParamUpdates[i].name === param.name) {
                            pendingParamUpdates[i].after = param.after;
                            found = true;
                        }
                    }
                    if (!found) {
                        pendingParamUpdates.push(param);
                    }
                });
                return;
            }
            var table = '<div id="conflictingParamsTable">' +
                        '<div class="row header">' +
                        '<span class="name">' + DFTStr.Name + '</span>' +
                        '<span class="prevVal">' + DFTStr.PreviousValue + '</span>' +
                        '<span class="newVal">' + DFTStr.CurrentValue + '</span>' +
                        '</div>';
            // using &nbsp; to show spacing when copying and pasting text
            modifiedList.forEach(function(param) {
            table += '<div class="row">' +
                        '<span class="name">' + param.name + '&nbsp;' +
                        '</span>' +
                        '<span class="prevVal">' + param.before + '&nbsp;</span>' +
                        '<span class="newVal">' + param.after + '</span>' +
                    '</div>';
            });
            table += '</div>';

            Alert.show({
                "title": DFTStr.ParametersModified,
                "instr": DFTStr.ParametersModifiedInstr,
                "msgTemplate": table
            });
            pendingParamUpdates = [];
        }
    }

    function refreshSchedule() {
        if ($("#scheduleDetail").is(":visible")) {
            Scheduler.hide();
            return true;
        } else {
            return false;
        }
    }

    function refreshRetTab() {
        var $retTab = $("#paramPopUp");
        if ($retTab.hasClass("active")) {
            BatchDFParamPopup.closeDagParamPopup();
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
