interface InputDropdownHintOptions {
    menuHelper?: MenuHelper,
    preventClearOnBlur?: boolean,
    onEnter?: Function,
    order?: boolean,
    noBold?: boolean
}
// options:
// menuHelper: (required) instance of MenuHelper
// preventClearOnBlur: boolean, if true will not reset the input on blur
// order: boolean, if true will place "starts with" matches first
// noBold: boolean, if true will not have bold text for searching
class InputDropdownHint {
    private options: InputDropdownHintOptions;
    private $dropdown: JQuery;

    public constructor($dropdown: JQuery, options?: InputDropdownHintOptions) {
        this.$dropdown = $dropdown;
        this.options = options || {};
        this.__init();
    }

    private __init(): void {
        const self: InputDropdownHint = this;
        const $dropdown: JQuery = self.$dropdown;
        const options: InputDropdownHintOptions = self.options;
        const menuHelper: MenuHelper = options.menuHelper;

        menuHelper.setupListeners();

        const $input: JQuery = $dropdown.find("> input");
        const $lists: JQuery = $dropdown.find("> .list");
        // this is to prevent the trigger of blur on mosuedown of li
        $lists.on("mousedown", "li", function(e) {
            if ($(e.target).is("li input, li .icon, li[name='addNew']")) {
                gMouseEvents.setMouseDownTarget($(e.target));
                return;
            }
            return false;
        });

        $dropdown.on("click", ".iconWrapper", function() {
            // when it's goint to open
            if (!$dropdown.hasClass("open")) {
                $input.focus();
            }
        });

        $input.on("input", function() {
            if (!$input.is(":visible")) return; // ENG-8642
            const text: string = $input.val().trim();
            self.__filterInput(text);
            if (!$dropdown.hasClass("open")) {
                // show the list
                menuHelper.toggleList($dropdown);
            }
        });

        $input.on("blur", function() {
            if (gMouseEvents.getLastMouseDownTarget().is("li input, li .icon, li[name='addNew']")) {
                return;
            }
            const text: string = $input.val().trim();
            const oldVal: string = $input.data("val");
            if (!options.preventClearOnBlur && oldVal !== text) {
                $input.val(oldVal);
            }
            // reset
            self.__filterInput();
            // when the dropdown is closed
            if ($dropdown.hasClass("open")) {
                // close it
                menuHelper.toggleList($dropdown);
            }
        });

        $input.on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                const val: string = $input.val().trim();
                if (typeof options.onEnter === "function") {
                    const stopEvent: string = options.onEnter(val, $input);
                    if (stopEvent) {
                        event.stopPropagation();
                    }
                }
                menuHelper.hideDropdowns();
            } else if (event.which === keyCode.Up ||
                       event.which === keyCode.Down) {
                $lists.find("li.hover").removeClass("hover");
                xcUIHelper.listHighlight($input, event, false);
            }
        });
    }

    private __filterInput(searchKey?: string): void {
        const $dropdown: JQuery = this.$dropdown;
        $dropdown.find(".noResultHint").remove();

        let $lis: JQuery = $dropdown.find("li");
        const $list: JQuery = $lis.parent();
        if (!searchKey) {
            $lis.removeClass("xc-hidden");
            if (this.options.order) {
                $lis = $lis.sort(xcUIHelper.sortHTML);
                $lis.prependTo($list);
            }
            $list.scrollTop(0);
            this.options.menuHelper.showOrHideScrollers();
            return;
        }

        searchKey = searchKey.toLowerCase();

        let count: number = 0;
        const noBold = this.options.noBold;
        $lis.each(function() {
            let $li: JQuery = $(this);
            if (!noBold) {
                xcUIHelper.boldSuggestedText($li, searchKey);
            }
            if ($li.text().toLowerCase().includes(searchKey)) {
                $li.removeClass("xc-hidden");
                count++;
            } else {
                $li.addClass("xc-hidden");
            }
        });

        // put the li that starts with value at first,
        // in asec order
        if (this.options.order) {
            $lis = $lis.filter(function() {
                return !$(this).hasClass("xc-hidden");
            });
            for (let i = $lis.length - 1; i >= 0; i--) {
                const $li: JQuery = $lis.eq(i);
                if ($li.text().toLowerCase().startsWith(searchKey)) {
                    $list.prepend($li);
                }
            }
        }

        if (count === 0) {
            const li: HTML = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        CommonTxtTstr.NoResult +
                    '</li>';
            $dropdown.find("ul").append(li);
        }

        $list.scrollTop(0);
        this.options.menuHelper.showOrHideScrollers();
    }

    public setInput(val: string): void {
        const $input: JQuery = this.$dropdown.find("> input");
        $input.val(val).data("val", val);
    }

    public clearInput(): void {
        const $input: JQuery = this.$dropdown.find("> input");
        $input.val("").removeData("val");
    }
}
