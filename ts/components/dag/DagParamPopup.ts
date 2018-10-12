class DagParamPopup extends ParamPopup {
    constructor($panel, $btnContainer) {
        super($panel, $btnContainer);
    }

    protected appendPopup() {
        $("#paramPopUp").appendTo($("#modelingDagPanel"));
    }

    protected hidePopup() {
        ParamPopup.restorePopup();
    }

    protected getParams() {
        const params = DagParamManager.Instance.getParamMap();
        const paramStructs = {};
        for (var i in params) {
            paramStructs[i] = {
                value: params[i]
            };
        }
        return paramStructs;
    }

    protected checkIsDisabled(): boolean {
        return false;
    }

    protected validateDelete($paramName: JQuery, paramName: string) {
        if (DagParamManager.Instance.checkParamInUse(paramName)) {
            StatusBox.show(ErrTStr.ParamInUse, $paramName, false);
            return false;
        }
        return true;
    }

    protected validateReservedName($ele: JQuery, _paramName: string) {
        return {
            "$ele": $ele,
            "error": "",
            "check": function() {
                return false;
            }
        }
    }

    protected updateParams() {
        const paramsList = this.getParamsFromList();
        const params = {};
        for (var i in paramsList) {
            params[i] = paramsList[i].value || "";
        }
        DagParamManager.Instance.updateParamMap(params);
    }
}