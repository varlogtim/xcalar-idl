interface MenuHelperOptions {
    $subMenu?: JQuery;
    bounds?: string;
    bottomPadding?: number;
    exclude?: boolean;
    container?: string;
    onlyClickIcon?: boolean;
    beforeOpenAsync?: Function;
    onSelect?: Function;
    onOpen?: Function;
    onClose?: Function;
}

interface MenuHelperTimer {
    fadeIn: number,
    fadeOut: number,
    setMouseMoveFalse: number,
    hovering: number,
    scroll: number,
    mouseScroll: number
}

/*
* options include:
    onlyClickIcon: if set true, only toggle dropdown menu when click
                     dropdown icon, otherwise, toggle also on click
                     input section
    onSelect: callback to trigger when select an item on list, $li will
              be passed into the callback
    onOpen: callback to trigger when list opens/shows
    beforeOpenAsync: async callback to trigger when list opens/shows
    container: will hide all other list in the container when focus on
               this one. Default is $dropDownList.parent()
    bounds: restrain the dropdown list size to this element
    bottomPadding: integer for number of pixels of spacing between
                   bottom of list and $bounds,
    exclude: selector for an element to exclude from default click
             behavior
 *
    $menu needs to have the following structure for scrolling:
        <div class="menu/list">
            <ul></ul>
            <div class="scrollArea top">
              <i class="arrow icon xi-arrow-up"></i>
            </div>
            <div class="scrollArea bottom">
              <i class="arrow icon xi-arrow-down"></i>
            </div>
        </div>
    where the outer div has the same height as the ul

*/
class MenuHelper {
    private options: MenuHelperOptions;
    private $list: JQuery;
    private $dropDownList: JQuery;
    private $ul: JQuery;
    private $scrollAreas: JQuery;
    private numScrollAreas: number;
    private $subMenu: JQuery;
    private $bounds: JQuery;
    private bottomPadding: number;
    private exclude: boolean;
    private isMouseInScroller: boolean;
    private id: number;
    private $container: JQuery;
    private timer: MenuHelperTimer;
    private $iconWrapper: JQuery;

    public constructor($dropDownList: JQuery, options?: MenuHelperOptions) {
        options = options || {};
        this.options = options;

        this.$container = options.container ? $(options.container) :
                                            $dropDownList.parent();
        let $list: JQuery;
        if ($dropDownList.is('.list,.menu')) {
            $list = $dropDownList;
        } else {
            $list = $dropDownList.find('.list, .menu');
        }

        this.$list = $list;
        this.$dropDownList = $dropDownList;
        this.$ul = $list.children('ul');
        this.$scrollAreas = $list.find('.scrollArea');
        this.numScrollAreas = this.$scrollAreas.length;
        this.$subMenu = options.$subMenu;
        this.$bounds = options.bounds ? $(options.bounds) : $(window);
        this.bottomPadding = options.bottomPadding || 0;
        this.exclude = options.exclude ? options.exclude : false;
        this.isMouseInScroller = false;
        this.id = MenuHelper.counter;

        this.timer = {
            "fadeIn": null,
            "fadeOut": null,
            "setMouseMoveFalse": null,
            "hovering": null,
            "scroll": null,
            "mouseScroll": null
        };

        this.setupListScroller();
        MenuHelper.counter++;
    }

    public static counter = 0;// used to give each menu a unique id

    public setupListeners(): MenuHelper {
        const self: MenuHelper = this;
        const options: MenuHelperOptions = self.options;
        const $dropDownList: JQuery = self.$dropDownList;
        // toggle list section
        if (options.onlyClickIcon) {
            self.$iconWrapper = $dropDownList.find('.iconWrapper');
            $dropDownList.on("click", ".iconWrapper", function() {
                const $list: JQuery = $(this).closest(".dropDownList");
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        } else {
            $dropDownList.on("click", function(event) {
                const $list: JQuery = $(this);
                if ($(event.target).closest('.list').length) {
                    return;
                }
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        }
        // on click a list
        $dropDownList.on({
            "mouseup": function(event) {
                if (event.which !== 1) {
                    return;
                }
                const $li: JQuery = $(this);

                // remove selected class from siblings and if able,
                // add selected class to current li
                const $lastSelected: JQuery = $(this).siblings(".selected");
                if (!$li.hasClass("hint") && !$li.hasClass("unavailable") &&
                    !$li.hasClass("inUse")) {
                    $lastSelected.removeClass("selected");
                    $li.addClass("selected");
                }

                let keepOpen: boolean = false;
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($li, $lastSelected, event);
                }
                // keep Open may return weird tings, so check for true boolean
                if (!keepOpen) {
                    self.hideDropdowns();
                }
            },
            "mouseenter": function() {
                $(this).addClass("hover");
            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");

        return this;
    }

    public hideDropdowns(): void {
        const self: MenuHelper = this;
        const $sections: JQuery = self.$container;
        const $dropdown: JQuery = $sections.hasClass("dropDownList")
                        ? $sections
                        : $sections.find(".dropDownList");
        $dropdown.find(".list").hide().removeClass("openList");
        $dropdown.removeClass("open");

        $(document).off("mousedown.closeDropDown" + self.id);
        $(document).off("keydown.closeDropDown" + self.id);
        $(document).off('keydown.listNavigation' + self.id);
        if (self.options.onClose) {
            self.options.onClose();
        }
    }

    public openList(): void {
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        $list.addClass("openList").show();
        $list.closest(".dropDownList").addClass("open");
        self.showOrHideScrollers();
    }

    public toggleList($curlDropDownList: JQuery, openUpwards?: boolean): void {
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        if ($curlDropDownList.hasClass("open")) {    // close dropdown
            self.hideDropdowns();
        } else {
            // hide all other dropdowns that are open on the page
            let $currentList: JQuery;
            if ($list.length === 1) {
                $currentList = $list;
            } else {
                // this is triggered when $list contains more that one .list
                // such as the xcHelper.dropdownlist in mulitiCastModal.js
                $currentList = $curlDropDownList.find(".list");
            }

            if (!$list.parents('.list, .menu').length) {
                $('.list, .menu').not($currentList)
                                .hide()
                                .removeClass('openList')
                                .parent('.dropDownList')
                                .removeClass('open');
            }

            // open dropdown
            const $lists: JQuery = $curlDropDownList.find(".list");
            if ($lists.children().length === 0) {
                return;
            }
            $curlDropDownList.addClass("open");
            $lists.show().addClass("openList");

            if (openUpwards) {
                // Count number of children and shift up by num * 30
                const shift: number = $curlDropDownList.find("li").length * (-30);
                $curlDropDownList.find(".list").css("top", shift);
            }

            $(document).on('mousedown.closeDropDown' + self.id, function(event) {
                const $target = $(event.target);
                if (self.options.onlyClickIcon) {
                    // do not trigger close if clicking on icon dropdown
                    if ($target.closest('.iconWrapper').is(self.$iconWrapper)) {
                        return;
                    }
                    // do close if not clicking on the list, such as the input
                    if (!$target.closest('.list').length) {
                        self.hideDropdowns();
                        return;
                    }
                }

                // close if not clicking anywhere on the dropdownlist
                if (!$target.closest('.dropDownList').is(self.$dropDownList)) {
                    self.hideDropdowns();
                }
            });

            $(document).on("keydown.closeDropDown" + self.id, function(event) {
                if (event.which === keyCode.Tab ||
                    event.which === keyCode.Escape) {
                    self.hideDropdowns();
                }
            });

            if (typeof self.options.onOpen === "function") {
                self.options.onOpen($curlDropDownList);
            }
            self.showOrHideScrollers();
            $('.selectedCell').removeClass('selectedCell');
            FnBar.clear();
            self._addKeyboardNavigation($lists);
        }
        xcTooltip.hideAll();
    }

    private _addKeyboardNavigation($menu: JQuery) {
        var self = this;
        const $lis: JQuery = $menu.find('li:visible:not(.unavailable)');
        if (!$lis.length) {
            return;
        }
        var $ul = $menu.find("ul");
        if (!$ul.length) {
            return;
        }

        const liHeight = $lis.eq(0).outerHeight();
        const ulHeight: number = $ul.height();
        const ulScrollHeight: number = $ul[0].scrollHeight;
        if (ulScrollHeight <= ulHeight) {
            return;
        }
        $(document).on('keydown.listNavigation' + self.id, listNavigation);

        function listNavigation(event: JQueryEventObject): void {
            let keyCodeNum: number = event.which;
            let scrollTop: number = $ul.scrollTop();
            if ($(event.target).is("input")) {
                return;
            }
            if (keyCodeNum === keyCode.Up) {
                if (scrollTop > 0) {
                    $ul.scrollTop(scrollTop - liHeight);
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (keyCodeNum === keyCode.Down) {
                if (scrollTop + ulHeight < ulScrollHeight) {
                    $ul.scrollTop(scrollTop + liHeight);
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }
    };

    public setupListScroller(): void {
        if (this.numScrollAreas === 0) {
            return;
        }
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        const $ul: JQuery = this.$ul;
        const $scrollAreas: JQuery = this.$scrollAreas;
        const timer: MenuHelperTimer = this.timer;
        let isMouseMoving: boolean = false;
        const $subMenu: JQuery = this.$subMenu;
        let outerHeight: number;
        let innerHeight: number;
        $list.mouseleave(function() {
            clearTimeout(timer.fadeIn);
            $scrollAreas.removeClass('active');
        });

        $list.mouseenter(function() {
            outerHeight = $list.height();
            innerHeight = $ul[0].scrollHeight;
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

            if ($subMenu) {
                $subMenu.hide();
            }
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
            const scrollTop: number = $ul.scrollTop();

            if (scrollUp) { // scroll upwards
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = window.setTimeout(function() {
                    top = scrollTop - 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }

                timer.scroll = window.setTimeout(function() {
                    top = scrollTop + 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function mouseScroll(): void {
            const scrollTop: number = $ul.scrollTop();
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (outerHeight + scrollTop >= innerHeight) {
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
    }
}