window.CSHelp = (function($, CSHelp) {

    // To be kept in sync with latest documentation
    var csLookup = {
        pointToDataSource: "A_GettingStarted/D_DetailedStepsForPointing.htm#Creating2",
        manageDatasetRef: "B_CommonTasks/A_ManageDatasetRef.htm#manageDatasetRef",
        filterMultiple: "B_CommonTasks/G_FilterValue.htm#filterMultiple",
        joinTables: "B_CommonTasks/I_JoinTables.htm#joinTables",
        tablesList: "B_CommonTasks/N_ChangeTableStatus.htm#tablesList",
        worksheetsList: "B_CommonTasks/O_ManageWorksheet.htm#worksheetsList",
        dataflowGraph: "C_AdvancedTasks/E_CreateBatchDataflow.htm#dataflowGraph",
        createBatchDataflow: "C_AdvancedTasks/E_CreateBatchDataflow.htm#Creating",
        dropTablesModal: "C_AdvancedTasks/I_UnderstandMemoryUse.htm#dropTablesModal",
        dataBrowserContents: "D_Reference/D_DataBrowser.htm#dataBrowserContents",
        mapFunctions: "D_Reference/I_MapFunctions.htm#mapFunctions",
    };

    var helpBaseUrl = paths.helpUserContent;

    CSHelp.setup = function() {
        if (xcLocalStorage.getItem("admin") === "true") {
            helpBaseUrl = paths.helpAdminContent;
        }
        $(document).on("click", ".csHelp", function() {
            var topic = $(this).attr("data-topic");
            var url = helpBaseUrl + csLookup[topic];
            window.open(url, "xcalar");
        });
    };

    return (CSHelp);
}(jQuery, {}));