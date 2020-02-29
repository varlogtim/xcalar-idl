class ParamPopup {
    protected $panel: JQuery;
    private $retLists: JQuery;
    private hasChange: boolean;
    private $paramPopup: JQuery;
    private $btn: JQuery;
    private static currentInstance: ParamPopup;
    private static _setup: boolean = false;
    private modalHelper: ModalHelper;

    private static paramRowLen: number = 5;
    private static paramRowTemplate: HTML = '<div class="row unfilled">' +
        '<div class="cell paramNameWrap textOverflowOneLine">' +
            '<div class="paramName textOverflowOneLine"></div>' +
        '</div>' +
        '<div class="cell paramValWrap textOverflowOneLine">' +
            '<input class="paramVal" spellcheck="false"/>' +
        '</div>' +
        '<div class="cell paramNoValueWrap">' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-15"></i>' +
                '<i class="icon xi-ckbox-selected fa-15"></i>' +
            '</div>' +
        '</div>' +
        '<div class="cell paramActionWrap">' +
            '<i class="paramDelete icon xi-close fa-15 xc-action">' +
            '</i>' +
        '</div>' +
    '</div>';

    public static setup() {
        if (this._setup) {
            return;
        }
        this._setup = true;
        ParamPopup.setupGeneralListeners();
    }

    constructor($panel: JQuery, $btn: JQuery) {
        this.$panel = $panel;
        this.$paramPopup = $("#paramPopUp");
        this.$retLists = this.$paramPopup.find(".paramList");
        this.$btn = $btn;
        this.hasChange = false;
        this.setupListeners();
        this.modalHelper = new ModalHelper(this.$paramPopup, {
            noBackground: true
        });
    }

    private setupListeners() {
         // toggle open retina pop up
        this.$btn.click(() => {
            ParamPopup.currentInstance = this;
            this.show();
        });

        // XXX buggy
        // this.$paramPopup.resizable({
        //     "handles": "w, s, sw",
        //     "minWidth": 558,
        //     "minHeight": 240
        // });
    }

    private static setupGeneralListeners() {
        const $paramPopup = $("#paramPopUp");

        $paramPopup.on("click", ".close", () => {
            ParamPopup.currentInstance.closePopup();
        });
        // delete retina para
        $paramPopup.on("click", ".paramDelete", function(event) {
            event.stopPropagation();
            var $row: JQuery = $(this).closest(".row");
            ParamPopup.currentInstance.deleteParam($row);
        });

        $paramPopup.on("keypress", ".newParam", function(event) {
            if (event.which === keyCode.Enter) {
                ParamPopup.currentInstance.submitNewParam();
            }
        });

        $paramPopup.on("click", ".submitNewParam", function() {
            ParamPopup.currentInstance.submitNewParam();
        });

        $paramPopup.on("keypress", ".paramVal", function(event) {
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $paramPopup.on("input", ".paramVal", function() {
            if ($(this).val().trim() !== "") {
                $(this).closest(".row").find(".paramNoValueWrap .checkbox")
                                        .removeClass("checked")
                                        .addClass("xc-disabled");
            } else { // empty
                $(this).closest(".row").find(".paramNoValueWrap .checkbox")
                                        .removeClass("xc-disabled");
            }
            ParamPopup.currentInstance.hasChange = true;
        });

        $paramPopup.on("click", ".checkbox", function() {
            $(this).toggleClass("checked");
        });

        $paramPopup.on("mouseup", ".paramNameWrap", function() {
            if ($(this).closest($paramPopup).length) {
                xcUIHelper.copyToClipboard("<" + $(this).text() + ">");
            }
        });
    }

    private show() {
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            xcTooltip.add($(this), {"title": TooltipTStr.OnlyInOpMode});
            xcTooltip.refresh($(this));
        }

        xcMenu.close();
        StatusBox.forceHide();
        if (this.checkIsDisabled()) {
            this.closePopup(true);
            return;
        }

        if (!this.$paramPopup.hasClass("active")) {
            this.$paramPopup.find(".newParam").val("");
            this.initializeList();
            this.$paramPopup.addClass("active");
            $("#container").on("mousedown.retTab", (event) => {
                const $target: JQuery = $(event.target);
                if (this.$paramPopup.hasClass("active") &&
                    !$target.closest(".tabWrap").length &&
                    !$target.closest(".retTab").length &&
                    !$target.closest(this.$paramPopup).length) {
                    this.closePopup();
                    return false;
                }
            });

            this.modalHelper.setup();
        } else {
            this.closePopup();
        }
    }

    private initializeList(): void {
        const params = this.getParams();
        let html: string = "";
        for (let i = 0; i < ParamPopup.paramRowLen; i++) {
            html += ParamPopup.paramRowTemplate;
        }
        this.$retLists.html(html);
        let paramArray: any[] = [];

        for (let i in params) {
            paramArray.push({
                name: i,
                value: params[i].value,
                isEmpty: params[i].isEmpty || !params[i].value
            });
        }
        paramArray = paramArray.sort(sortParams);
        for (let i = 0; i < paramArray.length; i++) {
            this.addParamToList(paramArray[i].name,
                                paramArray[i].value,
                                paramArray[i].isEmpty,
                                false);
        }

        function sortParams(a, b) {
            return xcHelper.sortVals(a.name, b.name);
        }
    }

    private submitNewParam(): void {
        let $input: JQuery = this.$paramPopup.find(".newParam");
        let val: string = $input.val().trim();
        if (!this.validateParamName($input, val)) {
            return;
        }

        $input.val("");
        this.addParamToList(val, "", true, false);
        this.hasChange = true;
    }

    private validateParamName($ele: JQuery, paramName: string): boolean {
        var self = this;
        return xcHelper.validate([
            {
                "$ele": $ele
            },
        {
            "$ele": $ele,
            "error": ErrTStr.NoSpecialCharOrSpace,
            "check": function() {
                return !xcHelper.checkNamePattern(PatternCategory.Param,
                    PatternAction.Check, paramName);
            }
        },
        self.validateReservedName($ele, paramName),
        {
            "$ele": $ele,
            "error": xcStringHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                "name": paramName
            }),
            "check": function() {
                return self.getParamsFromList().hasOwnProperty(paramName);
            }
        }]);
    }

    private validateParamValue(val: string, $input: JQuery): boolean {
        if (!val.length &&
            !$input.closest(".row").find(".paramNoValueWrap .checkbox")
                    .hasClass("checked")) {
            StatusBox.show("Please enter a value or select 'No Value'", $input, true,
                            {preventImmediateHide: true});
            return false;
        }
        return true;
    }

    private closePopup(force?) {
        var self = this;
        let invalidFound: boolean = false;
        this.$retLists.find(".row:not(.unfilled)").each(function() {
            let $row: JQuery = $(this);
            let val: string = $row.find(".paramVal").val();
            if (!self.validateParamValue(val, $row.find(".paramVal"))) {
                invalidFound = true;
                return false;
            }
        });

        if (force || !invalidFound) {
            this.$paramPopup.removeClass("active");
            StatusBox.forceHide();
            $("#container").off("mousedown.retTab");
            $(window).off(".dagParamPopup");
            this.modalHelper.clear();
        }

        if (!invalidFound && this.hasChange && !force) {
            this.hasChange = false;
            this.updateParams();
        }
    }

    private addParamToList(
        name: string,
        val: string,
        isEmpty: boolean,
        isInUse: boolean
    ) {
        let $row: JQuery = this.$retLists.find(".unfilled:first");

        if (!$row.length) {
            $row = $(ParamPopup.paramRowTemplate);
            this.$retLists.append($row);
            xcUIHelper.scrollToBottom(this.$retLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(name);
        $row.find(".paramName").append('<i class="icon xi-copy-clipboard"></i>');
        if (val != null) {
            $row.find(".paramVal").val(val);
            if (val.trim() === "" && isEmpty) {
                $row.find(".paramNoValueWrap .checkbox").addClass("checked");
            }
        } else if (isEmpty) {
            $row.find(".paramNoValueWrap .checkbox").addClass("checked");
        }
        if (isInUse) {
            const $paramAction: JQuery = $row.find(".paramActionWrap");
            $paramAction.addClass("unavailable");
            xcTooltip.add($paramAction, {title: ErrTStr.InUsedNoDelete});
        }

        $row.removeClass("unfilled");

        if (val == null || val.trim() === "") { // empty
            $row.find(".paramNoValueWrap .checkbox").removeClass("xc-disabled");
        } else {
            $row.find(".paramNoValueWrap .checkbox").removeClass("checked")
                                                    .addClass("xc-disabled");
        }
    }

    protected getParamsFromList(): object {
        let params: object = {};
        this.$retLists.find(".row:not(.unfilled)").each(function() {
            let $row = $(this);
            params[$row.find(".paramName").text()] =
                {
                    "value": $row.find(".paramVal").val(),
                    "isEmpty": $row.find(".paramNoValueWrap .checkbox")
                                    .hasClass("checked")
                };
        });
        return params;
    }

    private deleteParam($row: JQuery) {
        var self = this;
        const $paramName: JQuery = $row.find(".paramName");
        const paramName: string = $paramName.text();
        if (!this.validateDelete($paramName, paramName)) {
            return;
        }

        $row.remove();
        if (self.$retLists.find(".row").length < ParamPopup.paramRowLen) {
            self.$retLists.append(ParamPopup.paramRowTemplate);
        }
        this.hasChange = true;
    }

    // to be overwritten
    protected getParams() {
        return null;
    }

    // to be overwritten
    protected checkIsDisabled(): boolean {
        return false;
    }

    // to be overwritten
    protected validateDelete(_$paramName: JQuery, _paramName: string) {
        return true;
    }

    // to be overwritten
    protected validateReservedName($ele: JQuery, paramName: string) {
        return {
            "$ele": $ele,
            "error": xcStringHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
                "name": paramName
            }),
            "check": function() {
                return (systemParams.hasOwnProperty(paramName) && isNaN(Number(paramName)));
            }
        }
    }

    // to be overwritten
    protected updateParams() {}
}