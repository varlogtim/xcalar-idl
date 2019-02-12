class SQLUtil {
    private static _instance: SQLUtil;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public sendToPlanner(
        sessionPrefix: string,
        type: string,
        struct?: any
    ): XDPromise<any> {
        const session = WorkbookManager.getActiveWKBK();
        let url;
        let action;
        switch (type) {
            case ("update"):
                url = planServer + "/schemasupdate/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session));
                action = "PUT";
                break;
            case ("dropAll"):
                url = planServer + "/schemadrop/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session));
                action = "DELETE";
                break;
            case ("query"):
                url = planServer + "/sqlquery/" +
                    encodeURIComponent(encodeURIComponent(sessionPrefix + session))
                    + "/true/true";
                action = "POST";
                break;
            default:
                return PromiseHelper.reject("Invalid type for updatePlanServer");
        }
        const deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: action,
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: url,
            dataType: "text", // XXX remove this when the planner bug is fixed
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }
    
    public throwError(errStr) {
        this.resetProgress();
        Alert.show({
            title: "Compilation Error",
            msg: "Error details: " + errStr,
            isAlert: true
        });
    };

    public resetProgress(): void {
        $("#sqlSnippetsList").removeClass("xc-disabled");
    };
}