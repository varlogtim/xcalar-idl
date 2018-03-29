// StatusBox Modal
namespace StatusBox {
    let statusDisplayer: StatusDisplayer;

     /*
     * options:
     *      type: string, "error", "info"
     *      offsetX: int,
     *      offsetY: int,
     *      side: 'top', 'bottom', 'left', 'right' (if not provided, box will
     *      default to the right side of the $target)
     *      highZindex: boolean, if true will add class to bring statusbox
     *                  z-index above locked background z-index,
     *      html: boolean, text is html or pure text
     *      preventImmediateHide: boolean, if true, will set timeout that will
     *                          prevent closing for a split second (useful if
     *                          scroll event tries to close status box)
     *      persist: if set true, the box will not hide unless click
     *               on close button,
     *      detail: string, extra information text to display
     *      delayHide: number of milliseconds to delay ability to hide box
     */
    export interface StatusDisplayerOpions {
        type?: string;
        highZindex?: boolean;
        side?: string;
        offsetX?: number;
        offsetY?: number;
        html?: boolean;
        preventImmediateHide?: boolean;
        persist?: boolean;
        detail?: string;
        delayHide?: number;
    }

    class StatusDisplayer {
        private $statusBox: JQuery; // $("#statusBox");
        private $target: JQuery;
        private open: boolean;
        private type: string;
        private side: string;

        constructor() {
            this.$statusBox = $("#statusBox");
            this.open = false;
            this.$target = $();
            this.setupListerers();
            this.type = "error";
            this.side = "right";
        }

        public show(text: string, $target: JQuery, formMode: boolean, options: StatusDisplayerOpions = <any>{}): void {
            if (!$target.length) {
                // XXX this shouldn't happen but it has before
                return;
            }

            this.$target = $target;
            this.type = options.type || "error";
            this.side = options.side || "right";

            this.setupBasicClasses(options);
            this.setupTargetEvents(formMode, options.persist);
            this.addTitle();
            this.addText(text, options.html);
            this.addDetail(options.detail);
            this.setupPosition(options.offsetX, options.offsetY);
            this.setupHideOption(options.preventImmediateHide, options.delayHide);
        }

        public forceHide(): void {
            if (this.open) {
                this.$target.off("keydown.statusBox").removeClass(this.type);
                this.clear();
            }
        }

        private setupListerers() {
            $("#statusBox").mousedown(this._mousedownEvent.bind(this));
            $("#statusBox .detailAction").mousedown(function(event) {
                event.preventDefault();
                event.stopPropagation();
                $("#statusBox .detail").toggleClass("expand");
            });
        }

        private _mousedownEvent(event: JQueryEventObject) {
            if (this.notPersist()) {
                event.stopPropagation();
                event.preventDefault();
                this.forceHide();
            }
        }

        private setupBasicClasses(options: StatusDisplayerOpions): void {
            const $statusBox: JQuery = this.$statusBox;
            $statusBox.removeClass()
                      .addClass("active") // shows the box
                      .addClass(this.type)
                      .addClass(this.side);
            if (options.highZindex) {
                $statusBox.addClass("highZindex");
            }
        }

        private setupTargetEvents(formMode: boolean, persist: boolean): void {
            const $target: JQuery = this.$target;
            const $doc: JQuery = $(document);
            const self = this;

            // focus moves scrollbar position so focus first before we get
            // the position of the input
            $target.focus();
            if (formMode) {
                $doc.on("mousedown.statusBox", {"target": $target, "type": this.type}, function(event) {
                    self.hideStatusBox(event);
                });
                $target.on("keydown.statusBox", {"target": $target, "type": this.type}, function(event) {
                    self.hideStatusBox(event);
                });
                $target.addClass(self.type);
            } else {
                $doc.on("mousedown.statusBox", function(event) {
                    self.hideStatusBox(event);
                });
                $doc.on("keydown.statusBox", function(event) {
                    self.hideStatusBox(event);
                });
            }

            if (persist) {
                self.$statusBox.addClass("persist");
            } else {
                self.$statusBox.removeClass("persist");
                $(window).on("blur.statusBox", function(event) {
                    self.hideStatusBox(event);
                });
            }
        }

        private addTitle(): void {
            // add more title if type is extended
            const title: string = (this.type === "info") ? "Information" : "Error";
            this.$statusBox.find(".titleText").text(title);
        }

        private addText(text: string, html: boolean): void {
            if (html) {
                this.$statusBox.find(".message").html(text);
            } else {
                this.$statusBox.find(".message").text(text);
            }
        }

        private addDetail(detail: string): void {
            if (detail) {
                this.$statusBox.addClass("hasDetail");
                this.$statusBox.find(".detailContent").text(detail);
            }
        }

        // position the message
        private setupPosition(offsetX: number = 0, offsetY: number = 0): void {
            const $target: JQuery = this.$target;
            const $statusBox: JQuery = this.$statusBox;
            const bound: ClientRect = $target[0].getBoundingClientRect();
            const winWidth: number = <number>$(window).width();
            const statusBoxWidth: number = <number>$statusBox.width();
            let top: number = bound.top - 30;
            let right: number = winWidth - bound.right - statusBoxWidth - 12;
            let left: number = bound.left - statusBoxWidth - 12;

            if (this.side === "right") {
                right += offsetX;
            } else {
                left += offsetX;
            }

            top += offsetY;

            if (this.side === "top") {
                left = (bound.left + (<number>$target.outerWidth() / 2) -
                        (statusBoxWidth / 2)) + offsetX;
                left = Math.min(left, winWidth - statusBoxWidth);
                top = bound.top - <number>$statusBox.height() - 15 + offsetY;
            } else if (this.side === "bottom") {
                left = (bound.left + (<number>$target.outerWidth() / 2) -
                        (statusBoxWidth / 2)) + offsetX;
                top = bound.bottom + offsetY;
            }

            // prevent too far left
            left = Math.min(left, winWidth - statusBoxWidth - 10);
            // prevent too far right
            right = Math.max(right, 5);
            // prevent too far top
            top = Math.max(top, 0);

            if (this.side === "right") {
                $statusBox.css({top: top, right: right, left: "auto"});
            } else {
                $statusBox.css({top: top, left: left, right: "auto"});
            }
        }

        private setupHideOption(preventImmediateHide: boolean, delayHide: number = 0): void {
            let self  = this;
            if (preventImmediateHide) {
                setTimeout(function() {
                    self.open = true;
                }, delayHide);
            } else {
                self.open = true;
            }
        }

        private hideStatusBox(event: any): void {
            var id = $(event.target).attr('id');
            if (event.data && event.data.target) {
                if (id === "statusBoxClose" ||
                    !$(event.target).is(event.data.target) ||
                    this.notPersist() && event.type === "keydown")
                {
                    event.data.target.off("keydown.statusBox")
                                     .removeClass(event.data.type);
                    this.clear();
                }

            } else if (id === "statusBoxClose" || this.notPersist()) {
                this.clear();
            }
        }

        private notPersist(): boolean {
            return !this.$statusBox.hasClass("persist");
        }

        private clear(): void {
            const $statusBox = this.$statusBox;
            const $doc = $(document);
            this.open = false;
            $doc.off("mousedown.statusBox");
            $doc.off("keydown.statusBox");
            $(window).off("blur.statusBox");
            $statusBox.removeClass();
            $statusBox.find(".titleText").text("");
            $statusBox.find(".message").text("");
            $statusBox.find(".detail").removeClass("expand")
                      .find(".detailContent").text("");
        }
    }

    export function setup(): void {
        statusDisplayer = new StatusDisplayer();
    }

    export function show(text: string, $target: JQuery, isFormMode: boolean, options: StatusDisplayerOpions): void {
       statusDisplayer.show(text, $target, isFormMode, options);
    };

    export function forceHide(): void {
        statusDisplayer.forceHide();
    }
}