window.CSHelp = (function($, CSHelp) {

    // To be kept in sync with latest documentation
    var csLookup = {
        filterAndOr: "B_CommonTasks/G_FilterValue.htm#filterMultiple"
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