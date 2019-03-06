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
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session)) +
                      "/true/true";
                action = "POST";
                break;
            case ("parse"):
                url = planServer + "/sqlparse";
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
                        errorMsg = SQLErrTStr.PlannerFailure + ". Failed to parse error message: " + JSON.stringify(error);
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

    /**
     * SQLUtil.Instance.getSQLStruct
     * @param sql
     */
    public getSQLStruct(sql: string): XDPromise<SQLParserStruct> {
        const deferred: XDDeferred<SQLParserStruct> = PromiseHelper.deferred();
        const struct = {
            sqlQuery: sql,
            ops: ["identifier", "sqlfunc"],
            isMulti: false
        };
        SQLUtil.Instance.sendToPlanner("", "parse", struct)
        .then((ret) => {
            try {
                let sqlStructArray = JSON.parse(ret).ret;
                let sqlStruct: SQLParserStruct = sqlStructArray[0];
                deferred.resolve(sqlStruct);
            } catch (e) {
                return PromiseHelper.reject(e);
            }
        })
        .fail((e) => {
            console.error(e);
            let error: string;
            if (e instanceof Error) {
                error = e.message;
            } else if (typeof e === "string") {
                error = e;
            } else {
                error = JSON.stringify(e);
            }
            deferred.reject(error);
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