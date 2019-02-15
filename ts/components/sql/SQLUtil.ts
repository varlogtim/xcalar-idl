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
                              // it wrongly returns error when no schema to drop
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                let errorMsg;
                if (error && error.responseText) {
                    try {
                        errorMsg = JSON.parse(error.responseText).exceptionMsg;
                    } catch (e) {
                        errorMsg = SQLErrTStr.PlannerFailure + ". Failed to parse error message";
                    }
                } else if (error && error.status === 0) {
                    errorMsg = SQLErrTStr.FailToConnectPlanner;
                } else if (error) {
                    errorMsg = JSON.stringify(error);
                } else {
                    errorMsg = SQLErrTStr.PlannerFailure;
                }
                deferred.reject(errorMsg);
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

    public lockProgress(): void {
        $("#sqlOpPanel").find(".btn-submit").addClass("btn-disabled");
        $("#sqlSnippetsList").addClass("xc-disabled");
    }

    public resetProgress(): void {
        $("#sqlOpPanel").find(".btn-submit").removeClass("btn-disabled");
        $("#sqlSnippetsList").removeClass("xc-disabled");
    };
}