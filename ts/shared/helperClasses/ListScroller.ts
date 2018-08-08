/**
 * Adds scrolling functionality to lists.
 * Lists are assumed to have the following within the html:
 * <div class="scrollArea top">
 *    <i class="arrow icon xi-arrow-left"></i>
 * </div>
 * <div class="scrollArea bottom">
 *    <i class="arrow icon xi-arrow-right"></i>
 * </div>
 *
 * where xi-arrow-direction should reflect if the list scrolls vertically or 
 * horizontally.
 *
 * This is a modification of MenuHelper, diluting it only to the list scrolling
 * functionality, while adding horizontal list support.
 */
class ListScroller {

    private $list: JQuery;
    private $ul: JQuery;
    private $scrollAreas: JQuery;
    private $bounds: JQuery;
    private timer: MenuHelperTimer;
    private numScrollAreas: number;
    private bottomPadding: number;
    private isMouseInScroller: boolean;
    private verticalScroll: boolean; // true for vertical, false for horizontal
    private outerSize: number;
    private innerSize: number;

    /**
     * Constructor for the ListScroller
     * @param $list Overarching div that contains the "ul", and top and bottom icons
     * @param $ul JQuery object representing what scrolls. Oftentimes a ul, but not always.
     * @param verticalScroll True if the ul scrolls vertically, false for horizontally
     * @param options ListScrollerOptions, for bottomPadding and bounds.
     */
    public constructor($list: JQuery, $ul: JQuery, verticalScroll: boolean, options?: ListScrollerOptions) {
        options = options || {};
        this.$list = $list;
        this.$ul = $ul
        this.$scrollAreas = $list.find('.scrollArea');
        this.$bounds = options.bounds ? $(options.bounds) : $(window);
        this.timer = {
            "fadeIn": null,
            "fadeOut": null,
            "setMouseMoveFalse": null,
            "hovering": null,
            "scroll": null,
            "mouseScroll": null
        };
        this.numScrollAreas = this.$scrollAreas.length;
        this.bottomPadding = options.bottomPadding || 0;
        this.isMouseInScroller = false;
        this.verticalScroll = verticalScroll;
        this.setupListScroller();
    }

    public setupListScroller(): void {
        if (this.numScrollAreas === 0) {
            return;
        }
        const self: ListScroller = this;
        const $list: JQuery = self.$list;
        const $ul: JQuery = this.$ul;
        const $scrollAreas: JQuery = this.$scrollAreas;
        const timer: MenuHelperTimer = this.timer;
        let isMouseMoving: boolean = false;
        $list.mouseleave(function() {
            clearTimeout(timer.fadeIn);
            $scrollAreas.removeClass('active');
        });

        $list.mouseenter(function() {
            if (self.verticalScroll) {
                self.outerSize = $list.height();
                self.innerSize = $ul[0].scrollHeight;
            } else {
                self.outerSize = $list.width();
                self.innerSize = $ul[0].scrollWidth;
            }
            isMouseMoving = true;
            fadeIn();
        });

        $list.mousemove(function() {
            clearTimeout(timer.fadeOut);
            clearTimeout(timer.setMouseMoveFalse);
            isMouseMoving = true;

            timer.fadeIn = window.setTimeout(fadeIn, 200);

            timer.fadeOut = window.setTimeout(fadeOut, 800);

            timer.setMouseMoveFalse = window.setTimeout(setMouseMoveFalse, 100);
        });

        $scrollAreas.mouseenter(function() {
            self.isMouseInScroller = true;
            $(this).addClass('mouseover');

            const scrollUp: boolean = $(this).hasClass('top');
            scrollList(scrollUp);
        });

        $scrollAreas.mouseleave(function() {
            self.isMouseInScroller = false;
            clearTimeout(timer.scroll);

            const scrollUp: boolean = $(this).hasClass('top');

            if (scrollUp) {
                $scrollAreas.eq(1).removeClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
            }

            timer.hovering = window.setTimeout(hovering, 200);
        });

        $ul.scroll(function() {
            clearTimeout(timer.mouseScroll);
            timer.mouseScroll = window.setTimeout(mouseScroll, 300);
        });


        function fadeIn(): void {
            if (isMouseMoving) {
                $scrollAreas.addClass('active');
            }
        }

        function fadeOut(): void {
            if (!isMouseMoving) {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            }
        }

        function scrollList(scrollUp: boolean): void {
            let top: number;
            let scrollTop: number;
            if (self.verticalScroll) {
                scrollTop = $ul.scrollTop();
            } else {
                scrollTop = $ul.scrollLeft();
            }

            if (scrollUp) { // scroll "upwards"
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = window.setTimeout(function() {
                    top = scrollTop - 15;
                    if (self.verticalScroll) {
                        $ul.scrollTop(top);
                    } else {
                        $ul.scrollLeft(top);
                    }
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (self.outerSize + scrollTop >= self.innerSize) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }
                timer.scroll = window.setTimeout(function() {
                    top = scrollTop + 15;
                    if (self.verticalScroll) {
                        $ul.scrollTop(top);
                    } else {
                        $ul.scrollLeft(top);
                    }
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function mouseScroll(): void {
            let scrollTop: number;
            if (self.verticalScroll) {
                scrollTop = $ul.scrollTop();
            } else {
                scrollTop = $ul.scrollLeft();
            }
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (self.outerSize + scrollTop >= self.innerSize) {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).addClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            }
        }

        function setMouseMoveFalse(): void {
            isMouseMoving = false;
        }

        function hovering(): void {
            if (!self.isMouseInScroller) {
                $scrollAreas.removeClass('mouseover');
            }
        }
    }

    /**
     * Determines if scrollers should be shown or hidden
     * @param $newUl optional parameter for the new UL, if it changed
     */
    public showOrHideScrollers($newUl?: JQuery): void {
        if (this.numScrollAreas === 0) {
            return;
        }
        const $list: JQuery = this.$list;
        const $bounds: JQuery = this.$bounds;
        const bottomPadding: number = this.bottomPadding;
        if ($newUl) {
            this.$ul = $newUl;
        }
        const $ul: JQuery = this.$ul;

        const offset: JQueryCoordinates = $bounds.offset();
        if (this.verticalScroll) {
            let offsetTop: number;
            if (offset) {
                offsetTop = offset.top;
            } else {
                offsetTop = 0;
            }

            let listHeight: number = offsetTop + $bounds.outerHeight() -
                                    $list.offset().top - bottomPadding;
            listHeight = Math.min($(window).height() - $list.offset().top,
                                listHeight);
            listHeight = Math.max(listHeight - 1, 40);
            $list.css('max-height', listHeight);
            $ul.css('max-height', listHeight).scrollTop(0);

            const ulHeight: number = $ul[0].scrollHeight - 1;

            if (ulHeight > $list.height()) {
                $ul.css('max-height', listHeight);
                $list.find('.scrollArea').show();
                $list.find('.scrollArea.bottom').addClass('active');
            } else {
                $ul.css('max-height', 'auto');
                $list.find('.scrollArea').hide();
            }
            // set scrollArea states
            $list.find('.scrollArea.top').addClass('stopped');
            $list.find('.scrollArea.bottom').removeClass('stopped');
            this.outerSize = $list.height();
            this.innerSize = $ul[0].scrollHeight;
        } else {
            let offsetLeft: number;
            if (offset) {
                offsetLeft = offset.left;
            } else {
                offsetLeft = 0;
            }

            let listWidth: number = offsetLeft + $bounds.outerWidth() -
                                    $list.offset().left - bottomPadding;
            listWidth = Math.min($(window).width() - $list.offset().left,
                                listWidth);
            listWidth = Math.max(listWidth - 1, 40);
            $list.css('max-width', listWidth);
            $ul.css('max-width', listWidth).scrollLeft(0);

            const ulWidth: number = $ul[0].scrollWidth - 1;

            if (ulWidth > $list.width()) {
                $ul.css('max-width', listWidth);
                $list.find('.scrollArea').show();
                $list.find('.scrollArea.bottom').addClass('active');
            } else {
                $ul.css('max-width', 'auto');
                $list.find('.scrollArea').hide();
            }
            // set scrollArea states
            $list.find('.scrollArea.top').addClass('stopped');
            $list.find('.scrollArea.bottom').removeClass('stopped');
            this.outerSize = $list.width();
            this.innerSize = $ul[0].scrollWidth;
        }
    }
}

interface ListScrollerOptions {
    bounds?: string;
    bottomPadding?: number;
}