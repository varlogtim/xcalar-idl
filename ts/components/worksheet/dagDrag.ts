interface DragHelperOptions {
    $container: JQuery,
    $dropTarget: JQuery,
    $element: JQuery,
    $elements?: JQuery,
    onDragEnd: Function,
    onDragFail: Function,
    copy?: boolean,
    move?: boolean,
    event: JQueryEventObject
    offset?: DragHelperCoor
}

interface DragHelperDragCoor {
    left: number,
    top: number,
    height: number,
    width: number
}

interface DragHelperCoor {
    x: number,
    y: number
}

class DragHelper {
    protected $container: JQuery;
    protected $dropTarget: JQuery;
    protected onDragEndCallback: Function;
    protected onDragFailCallback: Function;
    protected $el: JQuery;
    protected $els: JQuery;
    protected $draggingEl: JQuery;
    protected $draggingEls: JQuery;
    protected mouseDownCoors: DragHelperCoor;
    protected isDragging: boolean;
    protected targetRect: ClientRect;
    protected isOffScreen: boolean;
    protected offset: DragHelperCoor;
    protected copying: boolean;
    protected origPositions: DragHelperCoor[];
    protected currentDragCoor: DragHelperDragCoor;
    protected customOffset: DragHelperCoor;

    public constructor(options: DragHelperOptions) {
        this.$container = options.$container;
        this.$dropTarget = options.$dropTarget;
        this.$el = options.$element;
        if (options.$elements) {
            this.$els = options.$elements;
        } else {
            this.$els = this.$el;
        }
        this.onDragEndCallback = options.onDragEnd;
        this.onDragFailCallback = options.onDragFail;
        this.copying = options.copy || false;
        this.$draggingEl = null;
        this.mouseDownCoors = {x: 0, y: 0};
        this.targetRect = new DOMRect();
        this.isOffScreen = false;
        this.origPositions = [];
        this.currentDragCoor = {left: 0, top: 0, height: 0, width: 0};
        this.isDragging = false;
        this.customOffset = options.offset || {x: 0, y: 0};

        const self = this;
        this.mouseDownCoors = {
            x: options.event.pageX,
            y: options.event.pageY
        };

        const cursorStyle = '<div id="moveCursor"></div>';
        $("body").addClass("tooltipOff").append(cursorStyle);

        $(document).on("mousemove.checkDrag", function(event) {
            self.checkDrag(event);
        });

        $(document).on("mouseup.endDrag", function(event) {
            self.endDrag(event);
        });
    }

    private checkDrag(event: JQueryEventObject) {
        if (Math.abs(this.mouseDownCoors.x - event.pageX) < 2 &&
            Math.abs(this.mouseDownCoors.y - event.pageY) < 2) {
                return;
        }
        this.isDragging = true;
        $(document).off("mousemove.checkDrag");
        this.onDragStart(event);
    }

    private onDragStart(event: JQueryEventObject): void {
        const self = this;

        this.$els.each(function() {
            const elRect = this.getBoundingClientRect();
            self.origPositions.push({
                x: elRect.left,
                y: elRect.top
            });
        });


        this.targetRect = this.$dropTarget.parent()[0].getBoundingClientRect();

        this.createClone();
        this.positionDraggingEl(event);
        this.adjustScrollBar();

        $(document).on("mousemove.onDrag", function(event) {
            self.onDrag(event);
        });
    }

    private onDrag(event: JQueryEventObject): void {
        this.positionDraggingEl(event);
    }

    private adjustScrollBar() {
        if (!this.isDragging) {
            return;
        }
        const self = this;

        if (this.currentDragCoor.left < this.targetRect.left) {
            const curScrollLeft = this.$dropTarget.parent().scrollLeft();
            this.$dropTarget.parent().scrollLeft(curScrollLeft - 20);
            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if (this.currentDragCoor.top < this.targetRect.top) {
            const curScrollTop = this.$dropTarget.parent().scrollTop();
            this.$dropTarget.parent().scrollTop(curScrollTop - 20);
            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if ((this.currentDragCoor.top + this.currentDragCoor.height) > this.targetRect.bottom) {

            const curScrollTop = this.$dropTarget.parent().scrollTop();
            if (this.$dropTarget.parent()[0].scrollHeight - curScrollTop -
            this.$dropTarget.parent().outerHeight() <= 1) {
                this.$dropTarget.height("+=4");
            }
            this.$dropTarget.parent().scrollTop(curScrollTop + 20);

        } else if ((this.currentDragCoor.left + this.currentDragCoor.width) > this.targetRect.right) {
            const curScrollLeft = this.$dropTarget.parent().scrollLeft();
            if (this.$dropTarget.parent()[0].scrollWidth - curScrollLeft -
            this.$dropTarget.parent().outerWidth() <= 1) {
                this.$dropTarget.find(".sizer").width("+=4");
            }
            this.$dropTarget.parent().scrollLeft(curScrollLeft + 20);

        } else if (this.isOffScreen) {
            this.isOffScreen = false;
            this.$draggingEl.removeClass("isOffScreen");
        }

        setTimeout(function() {
            self.adjustScrollBar();
        }, 40);
    }

    private createClone(): void {
        const self = this;
        let minX = this.targetRect.right;
        let maxX = 0;
        let minY = this.targetRect.bottom;
        let maxY = 0;

        // find the left most element, right most, top-most, bottom-most
        // so we can create a div that's sized to encapsulate all dragging elements
        // and append these to the div
        this.$els.each(function() {
            let rect = this.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            maxX = Math.max(maxX, rect.right);
            minY = Math.min(minY, rect.top);
            maxY = Math.max(maxY, rect.bottom);
        });
        let width = maxX - minX;
        let height = maxY - minY;
        const left = minX;
        const top = minY;

        this.offset = {
            x: left - this.mouseDownCoors.x + this.customOffset.x,
            y: top - this.mouseDownCoors.y + this.customOffset.y
        };

        this.$draggingEl = $('<div class="dragContainer" style="width:' +
                            width + 'px;height:' + height + 'px;left:' + left +
                            'px;top:' + top + 'px;"></div>');
        this.currentDragCoor = {
            left: left,
            top: top,
            width: width,
            height: height
        };

        const $clones = this.$els.clone();
        this.$draggingEl.append($clones);

        $clones.each(function(i) {
            $(this).css({
                left: self.origPositions[i].x - left,
                top: self.origPositions[i].y - top
            });
        });
        this.$container.append(this.$draggingEl);

        if (this.copying) {
            this.$draggingEls = $clones;
            this.$draggingEl.addClass("clone");
        } else {
            this.$draggingEls = this.$els;
            this.$draggingEls.addClass("xc-hidden");
        }
    }

    private positionDraggingEl(event) {
        this.currentDragCoor.left = event.pageX + this.offset.x,
        this.currentDragCoor.top = event.pageY + this.offset.y

        this.$draggingEl.css({
            left: this.currentDragCoor.left,
            top: this.currentDragCoor.top
        });
    }

    protected endDrag(event: JQueryEventObject): void {
        const self = this;
        $("body").removeClass("tooltipOff");
        $("#moveCursor").remove();
        $(document).off("mousemove.checkDrag");
        $(document).off("mousemove.onDrag");
        $(document).off("mouseup.endDrag");
        if (!this.isDragging) {
            this.isDragging = false;
            this.onDragFailCallback();
            return;
        }
        this.isDragging = false;
        this.$draggingEl.removeClass("dragging clone");

        let deltaX;
        let deltaY;
        if (this.copying) {
            deltaX = event.pageX + this.offset.x - this.targetRect.left + this.$dropTarget.parent().scrollLeft()
            deltaY = event.pageY + this.offset.y - this.targetRect.top + this.$dropTarget.parent().scrollTop();
        } else {
            deltaX = event.pageX - this.mouseDownCoors.x - this.targetRect.left + this.$dropTarget.parent().scrollLeft();
            deltaY = event.pageY - this.mouseDownCoors.y - this.targetRect.top + this.$dropTarget.parent().scrollTop();
        }
        if ((this.currentDragCoor.left - this.targetRect.left + this.$dropTarget.parent().scrollLeft() > 0) &&
        (this.currentDragCoor.top - this.targetRect.top + this.$dropTarget.parent().scrollTop() > 0)) {
            if (this.copying) {
                this.$draggingEls.css({
                    left: deltaX,
                    top: deltaY
                });
                this.$draggingEls.appendTo(this.$dropTarget);
            } else {
                this.$draggingEls.each(function(i) {
                    $(this).css({
                        left: self.origPositions[i].x + deltaX,
                        top: self.origPositions[i].y + deltaY
                    });
                });
            }
            this.onDragEndCallback(this.$draggingEls, event);

        }
        this.$draggingEls.removeClass("xc-hidden");
        this.$draggingEl.remove();
    }
}

class DragLineHelper extends DragHelper {
    public constructor(options) {
        super(options);
        $("#moveCursor").addClass("arrowOnly");

    }

    protected endDrag(event: JQueryEventObject): void {
        const self = this;
        $("body").removeClass("tooltipOff");
        $("#moveCursor").remove();
        $(document).off("mousemove.checkDrag");
        $(document).off("mousemove.onDrag");
        $(document).off("mouseup.endDrag");
        if (!this.isDragging) {
            this.isDragging = false;
            this.onDragFailCallback();
            return;
        }
        this.isDragging = false;
        this.$draggingEl.removeClass("dragging clone");

        let deltaX = event.pageX - this.mouseDownCoors.x - this.targetRect.left + this.$dropTarget.parent().scrollLeft();
        let deltaY = event.pageY - this.mouseDownCoors.y - this.targetRect.top + this.$dropTarget.parent().scrollTop();


        if ((this.currentDragCoor.left - this.targetRect.left + this.$dropTarget.parent().scrollLeft() > 0) &&
        (this.currentDragCoor.top - this.targetRect.top + this.$dropTarget.parent().scrollTop() > 0)) {

            this.$draggingEls.css({
                left: self.origPositions[0].x + deltaX,
                top: self.origPositions[0].y + deltaY
            });
            this.onDragEndCallback(this.$draggingEls, event);
        }
        this.$draggingEls.removeClass("xc-hidden");
        this.$draggingEl.remove();
    }
}

// XXX move this to another file
$(document).ready(function() {
    $("#dagView").on("mousedown", ".operatorBar .operator .main", function(event) {
        new DragHelper({
            event: event,
            $element: $(this).closest(".operator"),
            $container: $("#dagView"),
            $dropTarget: $("#dagView").find(".dataflowWrap"),
            onDragEnd: function(_$el, _event) {

            },
            onDragFail: function() {

            },
            copy: true
        });
    });

    $("#dagView").on("mousedown", ".dataflowWrap .operator .main", function(event) {
        const self = this;
        new DragHelper({
            event: event,
            $element: $(this).closest(".operator"),
            $elements: $(this).closest(".operator").add($("#dagView").find(".dataflowWrap .operator.selected")),
            $container: $("#dagView"),
            $dropTarget: $("#dagView").find(".dataflowWrap"),
            onDragEnd: function(_$el, _event) {

            },
            onDragFail: function() {
                $(self).closest(".operator").toggleClass("selected");
            },
            move: true
        });
    });


    $("#dagView").on("mousedown", ".dataflowWrap .operator .connector.out", function() {
        var $operator = $(this).closest(".operator");
        new DragLineHelper({
            event: event,
            $element: $(this),
            $container: $("#dagView"),
            $dropTarget: $("#dagView").find(".dataflowWrap"),
            offset: {
                x: 0,
                y: -2
            },
            onDragEnd: function(_$el, event) {
                let $inConnector;
                $("#dagView").find(".dataflowWrap .operator").not($operator).each(function() {
                    const rect = this.getBoundingClientRect();
                    const left = rect.left;
                    const right = rect.right;
                    const top = rect.top;
                    const bottom = rect.bottom;
                    if (event.pageX > left && event.pageX < right &&
                    event.pageY > top && event.pageY < bottom) {
                        $inConnector = $(this);
                        return false;
                    }
                });

                if ($inConnector) {
                    xcHelper.showSuccess("connection found");
                } else {
                    xcHelper.showFail("no connection found");
                }
            },
            onDragFail: function() {

            },
            copy: true
        });
    });
});