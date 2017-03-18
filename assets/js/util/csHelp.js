window.CSHelp = (function($, CSHelp) {

    var lookup;
    var helpBaseUrl = paths.helpUserContent;

    CSHelp.setup = function() {
        lookup = csLookup;
        if (xcLocalStorage.getItem("admin") === "true") {
            lookup = adminCsLookup;
            helpBaseUrl = paths.helpAdminContent;
        }
        $(document).on("click", ".csHelp", function() {
            var topic = $(this).attr("data-topic");
            var url = helpBaseUrl + lookup[topic];
            window.open(url, "xcalar");
        });
    };

    return (CSHelp);
}(jQuery, {}));