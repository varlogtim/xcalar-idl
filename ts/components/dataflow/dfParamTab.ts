namespace DFParamTab {
    let paramTab: ParamTab;

    class ParamTab {
        private $retTabSection: JQuery;
        private $dfCard: JQuery;
        private $retLists: JQuery;
        private hasChange: boolean;
        private retinaTr: string;
        private retinaTrLen: number;

        constructor() {
            this.$dfCard = $("#dfViz");
            this.$retTabSection = this.$dfCard.find(".retTabSection");
            this.$retLists = $("#retLists");
            this.hasChange = false;
            this.retinaTrLen = 5;
            this.retinaTr = '<div class="row unfilled">' +
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

            this.setupListeners();
        }

        private setupListeners() {
            const self = this;
            // Remove focus when click other places other than retinaArea
            // add new retina
            self.$retTabSection.on("click", ".retPopUp", function(event) {
                event.stopPropagation();
            });

            // toggle open retina pop up
            self.$retTabSection.on("click", ".retTab", function() {
                if (XVM.getLicenseMode() === XcalarMode.Mod) {
                    xcTooltip.add($(this), {"title": TooltipTStr.OnlyInOpMode});
                    xcTooltip.refresh($(this));
                }

                xcMenu.close();
                StatusBox.forceHide();
                const $dagWrap: JQuery = self.$dfCard.find('.cardMain').find(".dagWrap:visible");
                if (!$dagWrap.length || $dagWrap.hasClass("deleting")) {
                    return;
                }
                const $tab: JQuery = $(this);

                if (!$tab.hasClass("active")) {
                    self.initializeList();
                    $tab.addClass("active");
                    $("#container").on("mousedown.retTab", function(event) {
                        const $target: JQuery = $(event.target);
                        if (self.$retTabSection.find(".retTab").hasClass("active") &&
                            !$target.closest(".retTab").length) {
                            self.closeRetTab();
                            return false;
                        }
                    });
                } else {
                    self.closeRetTab();// open tab
                }
                return false;
            });

            // delete retina para
            self.$retTabSection.on("click", ".paramDelete", function(event) {
                event.stopPropagation();
                var $row: JQuery = $(this).closest(".row");
                var name: string = $row.find(".paramName").text();
                var df = DF.getDataflow(DFCard.getCurrentDF());
                if (df.paramMapInUsed[name]) {
                    StatusBox.show(ErrTStr.InUsedNoDelete,
                        $row.find(".paramActionWrap"), false, {'side': 'left'});
                    return false;
                }
                self.deleteParamFromRetina($row);
            });

            self.$retTabSection.on("keypress", ".newParam", function(event) {
                if (event.which === keyCode.Enter) {
                    self.submitNewParam();
                }
            });

            self.$retTabSection.on("click", ".submitNewParam", function() {
                self.submitNewParam();
            });

            self.$retTabSection.on("keypress", ".paramVal", function(event) {
                if (event.which === keyCode.Enter) {
                    $(this).blur();
                }
            });

            self.$retTabSection.on("input", ".paramVal", function() {
                if ($(this).val().trim() !== "") {
                    $(this).closest(".row").find(".paramNoValueWrap .checkbox")
                                           .removeClass("checked")
                                           .addClass("xc-disabled");
                } else { // empty
                    $(this).closest(".row").find(".paramNoValueWrap .checkbox")
                                           .removeClass("xc-disabled");
                }
                self.hasChange = true;
            });

            self.$retTabSection.on("click", ".checkbox", function() {
                $(this).toggleClass("checked");
            });

        }

        private initializeList(): void {
            const self = this;
            const params = DF.getParamMap();
            let html: string = "";
            for (let i = 0; i < self.retinaTrLen; i++) {
                html += self.retinaTr;
            }
            self.$retLists.html(html);

            for (var i in params) {
                self.addParamToList(i, params[i].value, params[i].isEmpty, false);
            }
        }

        private submitNewParam(): void {
            let $input: JQuery = this.$retTabSection.find(".newParam");
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
            {
                "$ele": $ele,
                "error": xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
                    "name": paramName
                }),
                "check": function() {
                    return (systemParams.hasOwnProperty(paramName) && isNaN(Number(paramName)));
                }
            },
            {
                "$ele": $ele,
                "error": xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
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

        private closeRetTab() {
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

            if (invalidFound) {
                return;
            }

            if (this.hasChange) {
                this.hasChange = false;
                DF.updateParamMap(this.getParamsFromList());
            }

            this.$retTabSection.find(".retTab").removeClass("active");
            StatusBox.forceHide();
            $("#container").off("mousedown.retTab");
        }

        private addParamToList(
            name: string,
            val: string,
            isEmpty: boolean,
            isInUse: boolean
        ) {
            let $row: JQuery = this.$retLists.find(".unfilled:first");

            if (!$row.length) {
                $row = $(this.retinaTr);
                this.$retLists.append($row);
                xcHelper.scrollToBottom(this.$retLists.closest(".tableContainer"));
            }

            $row.find(".paramName").text(name);
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

        private getParamsFromList(): object {
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

        private deleteParamFromRetina($row: JQuery) {
            var self = this;
            const $paramName: JQuery = $row.find(".paramName");
            const paramName: string = $paramName.text();
            const df = DF.getDataflow(DFCard.getCurrentDF());

            if (df.checkParamInUse(paramName)) {
                StatusBox.show(ErrTStr.ParamInUse, $paramName, false);
                return;
            }

            $row.remove();
            if (self.$retLists.find(".row").length < self.retinaTrLen) {
                self.$retLists.append(self.retinaTr);
            }
            this.hasChange = true;
        }
    }
    /**
     * DFParamTab.setup
     */
    export function setup(): void {
        paramTab = new ParamTab();
    }

}
