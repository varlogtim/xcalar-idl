class CSHelp {
    private static _instance: CSHelp;

    private constructor() {
        const lookup = csLookup;
        const helpBaseUrl = paths.helpUserContent;

        $(document).on("click", ".csHelp", function() {
            const topic = $(this).attr("data-topic");
            const url = helpBaseUrl + "ContentXDHelp/" + lookup[topic];
            window.open(url, "xcalar");
        });
    }

    public static setup(): CSHelp {
        return this._instance || (this._instance = new this());
    }
}