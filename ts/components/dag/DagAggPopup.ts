// XXX TODO: resuse ParamPopup
class DagAggPopup {
    protected $panel: JQuery;
    private $retLists: JQuery;
    private $aggManagerPopup: JQuery;
    private $btn: JQuery;

    private aggRowLen: number = 5;
    private aggRowTemplate: HTML = '<div class="row unfilled">' +
        '<div class="cell aggNameWrap textOverflowOneLine">' +
            '<div class="aggName textOverflowOneLine"></div>' +
        '</div>' +
        '<div class="cell aggValWrap textOverflowOneLine">' +
            '<div class="aggVal" spellcheck="false"/>' +
        '</div>' +
        '<div class="cell aggNoValueWrap">' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-15"></i>' +
                '<i class="icon xi-ckbox-selected fa-15"></i>' +
            '</div>' +
        '</div>' +
        '<div class="cell aggActionWrap">' +
            '<i class="aggDelete icon xi-close fa-15 xc-action xc-hidden">' +
            '</i>' +
        '</div>' +
    '</div>';

    constructor($panel: JQuery, $btn: JQuery) {
        this.$panel = $panel;
        this.$aggManagerPopup = $("#aggManagerPopup");
        this.$retLists = this.$aggManagerPopup.find(".aggList");
        this.$btn = $btn;
        this._setupListeners();
    }

    private _setupListeners(): void {
        const self = this;

         // toggle open retina pop up
        this.$btn.click(() => {
            this.aggBtnClick();
        });

        const $aggManagerPopup = $("#aggManagerPopup");
        // delete retina para
        $aggManagerPopup.on("click", ".aggDelete",  function (event) {
            event.stopPropagation();
            var $row: JQuery = $(this).closest(".row");
            self.deleteAgg($row);
        });

        $aggManagerPopup.on("mouseup", ".aggNameWrap", function() {
            if ($(this).closest($aggManagerPopup).length) {
                xcHelper.copyToClipboard("<" + $(this).text() + ">");
            }
        });

        $("#dagViewBar").find(".parameters").click(() => {
            this.closePopup();
        });

        this.$aggManagerPopup.resizable({
            "handles": "w, s, sw",
            "minWidth": 558,
            "minHeight": 210
        });
    }

    private aggBtnClick(): void {
        const self = this;
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            xcTooltip.add($(this), {"title": TooltipTStr.OnlyInOpMode});
            xcTooltip.refresh($(this));
        }

        xcMenu.close();
        StatusBox.forceHide();

        if (!this.$aggManagerPopup.hasClass("active")) {
            this.initializeList();
            this.$aggManagerPopup.addClass("active");
            $("#container").on("mousedown.aggPopup", (event) => {
                const $target: JQuery = $(event.target);
                if (this.$aggManagerPopup.hasClass("active") &&
                    !$target.closest(".tabWrap").length &&
                    !$target.closest(".retTab").length &&
                    !$target.closest(this.$aggManagerPopup).length) {
                    this.closePopup();
                    return false;
                }
            });

            let resizeTimer;
            $(window).on("resize.dagParamPopup", function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    let width = self.$aggManagerPopup.outerWidth();
                    let winWidth = $(window).width();
                    self.$aggManagerPopup.css("left", winWidth - width);
                }, 300);
            });
        } else {
            this.closePopup();
        }
    }

    private initializeList(): void {
        const aggs: {[key: string]: AggregateInfo} = DagAggManager.Instance.getAggMap();
        let html: string = "";
        for (let i = 0; i < this.aggRowLen; i++) {
            html += this.aggRowTemplate;
        }
        this.$retLists.html(html);
        let aggArray: any[] = [];

        for (let i in aggs) {
            aggArray.push({
                name: i,
                value: aggs[i].value,
                notRun: !aggs[i].value
            });
        }
        aggArray = aggArray.sort(sortAggs);
        for (let i = 0; i < aggArray.length; i++) {
            this.addAggToList(aggArray[i].name,
                                aggArray[i].value,
                                aggArray[i].notRun);
        }

        function sortAggs(a, b) {
            return xcHelper.sortVals(a.name, b.name);
        }
    }

    private addAggToList(
        name: string,
        val: number | string,
        isEmpty: boolean
    ): void {
        let $row: JQuery = this.$retLists.find(".unfilled:first");

        if (!$row.length) {
            $row = $(this.aggRowTemplate);
            this.$retLists.append($row);
            xcHelper.scrollToBottom(this.$retLists.closest(".tableContainer"));
        }

        $row.find(".aggName").text(name);
        $row.find(".aggName").append('<i class="icon xi-copy-clipboard"></i>');
        if (val != null) {
            $row.find(".aggVal").val(val);
            $row.find(".aggVal").text(val);
        } else if (isEmpty) {
            $row.find(".aggNoValueWrap .checkbox").addClass("checked");
        }

        $row.removeClass("unfilled");

        if (val == null) { // empty
            $row.find(".aggNoValueWrap .checkbox").removeClass("xc-disabled");
        } else {
            $row.find(".aggNoValueWrap .checkbox").removeClass("checked")
                                                    .addClass("xc-disabled");
        }

        $row.find(".aggActionWrap .aggDelete").removeClass("xc-hidden");
    }

    private closePopup(): void {
        this.$aggManagerPopup.removeClass("active");
        StatusBox.forceHide();
        $("#container").off("mousedown.aggPopup");
        $(window).off(".aggPopup");
    }

    private deleteAgg($row: JQuery): void {
        var self = this;
        const $aggName: JQuery = $row.find(".aggName");
        const aggName: string = $aggName.text();
        this.$aggManagerPopup.find(".aggDelete").addClass("xc-disabled");

        DagAggManager.Instance.removeAgg([aggName])
        .then(() => {
            this.$aggManagerPopup.find(".aggDelete").removeClass("xc-disabled");

            $row.remove();
            if (self.$retLists.find(".row").length < this.aggRowLen) {
                self.$retLists.append(this.aggRowTemplate);
            }
        })
        .fail((err) => {
            console.log(err);
            this.$aggManagerPopup.find(".aggDelete").removeClass("xc-disabled");
        });
    }

}