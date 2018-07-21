
// some general class
class XcMap {
    private map: {};
    private constructor() {
        this.map = {};
    }

    public entries(): object {
        return this.map;
    }

    public set(id: string | number, item: any): void {
        this.map[id] = item;
    }

    public get(id: string | number): any {
        return this.map[id];
    }

    public has(id: string | number): boolean {
        return this.map.hasOwnProperty(id);
    }

    public delete(id: string | number): void {
        delete this.map[id];
    }

    public clear(): void {
        this.map = {};
    }
}

class Mutex {
    public key: string;
    public scope: number;

    public constructor(key: string, scope: number) {
        if (!key || !(typeof(key) === "string")) {
            console.log("No/Illegal mutex key, generating a random one.");
            key = xcHelper.randName("mutex", 5);
        }
        this.key = key;
        if (!scope) {
            scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
        }
        this.scope = scope;
    }
}

// global MouseEvents
// useful to keep track of mousedown so when a blur happens, we know what
// element was clicked on to cause the blur
class MouseEvents {
    private $lastMouseDownTarget: JQuery;
    private $lastClickTarget: JQuery;
    private lastTime: number;
    // will store last 3 mousedowns (needed for undo)
    private lastMouseDownTargets: JQuery[];
    private $lastMDParents: JQuery;

    public constructor() {
        this.$lastMouseDownTarget = $(document);
        this.$lastClickTarget = this.$lastMouseDownTarget;
        this.lastTime = (new Date()).getTime();
        // will store last 3 mousedowns (needed for undo)
        this.lastMouseDownTargets = [this.$lastMouseDownTarget];
        this.$lastMDParents = this.$lastMouseDownTarget;
    }

    public setMouseDownTarget($element: JQuery): void {
        if (!$element) {
            this.$lastMouseDownTarget = $();
        } else {
            this.$lastMouseDownTarget = $element;
        }

        this.$lastMDParents = this.$lastMouseDownTarget.parents();

        this.lastTime = (new Date()).getTime();

        // store up to last 3 mousedowns
        if (this.lastMouseDownTargets.length === 3) {
            this.lastMouseDownTargets.splice(2, 1);
        }
        this.lastMouseDownTargets.unshift($element);
    };

    public setClickTarget($element): void {
        this.$lastClickTarget = $element;
    };

    public getLastMouseDownTarget(): JQuery {
        return this.$lastMouseDownTarget;
    };
    public getLastMouseDownParents(): JQuery {
        return this.$lastMDParents;
    };
    public getLastMouseDownTargets(): JQuery[] {
        return this.lastMouseDownTargets;
    };

    public getLastClickTarget(): JQuery {
        return this.$lastClickTarget;
    };

    public getLastMouseDownTime(): number {
        return this.lastTime;
    };
}

/* Corrector */
class Corrector {
    // traing texts
    // words = ["pull", "sort", "join", "filter", "aggreagte", "map"];

    private model: {[key: string]: number};
    private modelMap: {[key: string]: string};

    public constructor(words: string[]) {
        const self = this;
        self.modelMap = {};
        self.model = transformAndTrain(words);
         // convert words to lowercase and train the word
        function transformAndTrain(features): {[key: string]: number} {
            const res: {[key: string]: number} = {};
            let word: string;

            for (let i = 0, len = features.length; i < len; i++) {
                word = features[i].toLowerCase();
                if (word in res) {
                    res[word] += 1;
                } else {
                    res[word] = 2; // start with 2
                    self.modelMap[word] = features[i];
                }
            }
            return (res);
        }
    }

    public correct(word: string, isEdits2: boolean): string {
        word = word.toLowerCase();
        const model: object = this.model;

        const edits1Res = edits1(word);
        let candidate: object;

        if (isEdits2) {
            candidate = known({word: true}) || known(edits1Res) ||
                        knownEdits2(edits1Res) || {word: true};
        } else {
            candidate = known({word: true}) || known(edits1Res) || {word: true};
        }

        let max: number = 0;
        let result: string;

        for (const key in candidate) {
            const count: number = getWordCount(key);

            if (count > max) {
                max = count;
                result = key;
            }
        }

        return (result);

        function getWordCount(w): number {
            // smooth for no-exist word, model[word_not_here] = 1
            return (model[w] || 1);
        }

        function known(words: object): object {
            const res: object = {};

            for (const w in words) {
                if (w in model) {
                    res[w] = true;
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }

        // edit distabnce of word;
        function edits1(w: string): object {
            const splits: object = {};
            let part1: string;
            let part2: string;
            let wrongWord: string;

            for (let i = 0, len = w.length; i <= len; i++) {
                part1 = w.slice(0, i);
                part2 = w.slice(i, len);
                splits[part1] = part2;
            }

            const deletes: object    = {};
            const transposes: object = {};
            const replaces: object   = {};
            const inserts: object    = {};
            const alphabets: string[]  = "abcdefghijklmnopqrstuvwxyz".split("");

            for (part1 in splits) {
                part2 = splits[part1];

                if (part2) {
                    wrongWord = part1 + part2.substring(1);
                    deletes[wrongWord] = true;
                }

                if (part2.length > 1) {
                    wrongWord = part1 + part2.charAt(1) + part2.charAt(0) +
                                part2.substring(2);
                    transposes[wrongWord] = true;
                }

                for (let i = 0, len = alphabets.length; i < len; i++) {
                    if (part2) {
                        wrongWord = part1 + alphabets[i] + part2.substring(1);
                        replaces[wrongWord] = true;
                    }

                    wrongWord = part1 + alphabets[i] + part2;
                    inserts[wrongWord] = true;
                }
            }

            return $.extend({}, splits, deletes,
                            transposes, replaces, inserts);
        }

        function knownEdits2(e1Sets: object): object {
            const res: object = {};

            for (const e1 in e1Sets) {
                const e2Sets: object = edits1(e1);
                for (let e2 in e2Sets) {
                    if (e2 in model) {
                        res[e2] = true;
                    }
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }
    }

    // returns only 1 value
    public suggest(word: string, isEdits2: boolean) {
        word = word.toLowerCase();

        let startStrCandidate: string[] = [];
        let subStrCandidate: string[]   = [];

        for (const w in this.model) {
            if (w.startsWith(word)) {
                startStrCandidate.push(w);
            } else if (w.indexOf(word) > -1) {
                subStrCandidate.push(w);
            }
        }

        if (startStrCandidate.length >= 1) {
            // suggest the only candidate that start with word
            if (startStrCandidate.length === 1) {
                return (this.modelMap[startStrCandidate[0]]);
            }
        } else if (subStrCandidate.length === 1) {
            // no candidate start with word
            // but has only one substring with word
            return (this.modelMap[subStrCandidate[0]]);
        }

        const res = this.correct(word, isEdits2);
        return (this.modelMap[res]);
    }
}

/* End of Corrector */

/* SearchBar */
/*
 * options:
 * ignore: string or number, if ignore value is present in input, searching
 *         will not occur
 * removeSelected: function, callback for removing highlighted text
 * highlightSelected: function, callback for highlighted text
 * scrollMatchIntoView: function, callback for scrolling to a highlighted match
 * onInput: function, callback for input event
 * onEnter: function, callback for enter event
 * removeHighlight: boolean, if true, will unwrap $list contents and remove
 *                 highlighted class
 * arrowsPreventDefault: boolean, if true, preventDefault & stopPropagation will
                         be applied to the search arrows
 * codeMirror: codeMirror object
 * $input: jquery input, will search for 'input' in $searchArea by default
 * $list: container (typically a ul) for search contents
 *
 */

 interface SearchBarOptions {
    $list?: JQuery; // typically a ul element
    $input?: JQuery;
    codeMirror?: CodeMirror.Editor;
    toggleSliderCallback?: Function;
    ignore?: string,
    removeSelected?: Function,
    hideSelected?: Function,
    highlightSelected?: Function,
    onEnter?: Function,
    onInput?: Function,
    scrollMatchIntoView?: Function,
    removeHighlight?: boolean,
    arrowsPreventDefault?: boolean,
    $searchInput?: JQuery,
}

interface SearchBarClearOptions {
    keepVal?: boolean
}

class SearchBar {
    private $searchArea: JQuery;
    private $counter: JQuery;
    private $position: JQuery;
    private $total: JQuery;
    private $arrows: JQuery;
    private $upArrow: JQuery;
    private $downArrow: JQuery;
    private options: SearchBarOptions;
    private matchIndex: number = null;
    private numMatches: number;
    private $matches: JQuery;
    private $list: JQuery;
    private $searchInput: JQuery;
    private codeMirror: CodeMirror.Editor;
    private isSlider: boolean;
    private toggleSliderCallback: Function

    public constructor($searchArea: JQuery, options?: SearchBarOptions) {
        options = options || {};
        this.$searchArea = $searchArea;
        this.$counter = $searchArea.find('.counter');
        this.$position = this.$counter.find('.position');
        this.$total = this.$counter.find('.total');
        this.$arrows = $searchArea.find('.arrows');
        this.$upArrow = $searchArea.find('.upArrow');
        this.$downArrow = $searchArea.find('.downArrow');
        this.options = options || {};
        this.matchIndex = null;
        this.numMatches = 0;
        this.$matches = $();
        this.$list = options.$list; // typically a ul element

        if (options.codeMirror) {
            this.$searchInput = options.$input;
            this.codeMirror = options.codeMirror;
        } else {
            this.$searchInput = $searchArea.find('input');
        }

        if (this.$searchArea.parent().hasClass("slidingSearchWrap")) {
            this.isSlider = true;
        }

        if (typeof options.toggleSliderCallback === "function") {
            this.toggleSliderCallback = options.toggleSliderCallback;
        }

        this._setup();
    }

    private _setup(): void {
        const searchBar: SearchBar = this;
        const options: SearchBarOptions = searchBar.options || {};

        // keydown event for up, down, enter keys
        // secondaryEvent is the event passed in by codemirror
        function handleKeyDownEvent(event: JQueryEventObject | CodeMirror.Editor, secondaryEvent: JQueryEventObject): void {
            if (searchBar.numMatches === 0) {
                return;
            }
            let e: JQueryEventObject;
            if (searchBar.codeMirror) {
                e = secondaryEvent;
            } else {
                e = <JQueryEventObject> event;
            }

            if (e.which === keyCode.Up ||
                e.which === keyCode.Down ||
                e.which === keyCode.Enter) {
                let val: string;
                if (searchBar.codeMirror) {
                    val = searchBar.codeMirror.getValue();
                } else {
                    val = searchBar.$searchInput.val();
                }
                val = val.trim();
                // if ignore value exists in the input, do not search
                if (options.ignore && val.indexOf(options.ignore) !== -1) {
                    return;
                }

                if (e.preventDefault) {
                    e.preventDefault();
                }
                const $matches: JQuery = searchBar.$matches;

                if (e.which === keyCode.Up) {
                    searchBar.matchIndex--;
                    if (searchBar.matchIndex < 0) {
                        searchBar.matchIndex = searchBar.numMatches - 1;
                    }

                } else if (e.which === keyCode.Down ||
                           e.which === keyCode.Enter) {
                    searchBar.matchIndex++;
                    if (searchBar.matchIndex >= searchBar.numMatches) {
                        searchBar.matchIndex = 0;
                    }
                }
                if (options.removeSelected) {
                    options.removeSelected();
                }
                const $selectedMatch: JQuery = $matches.eq(searchBar.matchIndex);
                if (options.highlightSelected) {
                    options.highlightSelected($selectedMatch);
                }
                $selectedMatch.addClass('selected');
                searchBar.$position.html(searchBar.matchIndex + 1 + "");
                searchBar.scrollMatchIntoView($selectedMatch);
                if (e.which === keyCode.Enter &&
                    typeof options.onEnter === "function") {
                    options.onEnter();
                }
            }
        }
        // secondaryEvent is the event passed in by codemirror
        if (searchBar.codeMirror) {
            searchBar.codeMirror.on("keydown",
            function (instance: CodeMirror.Editor, secondaryEvent: JQueryEventObject) {
                handleKeyDownEvent(instance, secondaryEvent);
                return false;
            });
        } else {
            searchBar.$searchInput.on("keydown",
            function (event: JQueryEventObject, secondaryEvent: JQueryEventObject) {
                handleKeyDownEvent(event, secondaryEvent);
            });
        }

        searchBar.$downArrow.click(function() {
            const evt = $.Event("keydown", {which: keyCode.Down});
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                searchBar.$searchInput.trigger(evt);
            }
        });

        searchBar.$upArrow.click(function() {
            const evt = $.Event("keydown", {which: keyCode.Up});
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                searchBar.$searchInput.trigger(evt);
            }
        });

        if (options.arrowsPreventDefault) {
            searchBar.$arrows.mousedown(function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // click listener on search icon for searchbar sliding
        if (searchBar.isSlider) {
            searchBar.$searchArea.find(".searchIcon").click(function() {
                searchBar.toggleSlider();
            });
        }

        if (typeof options.onInput === "function") {
            searchBar.$searchInput.on("input", function(event) {
                const val: string = $(this).val();
                options.onInput(val, event);
            });
        }
    }
    public highlightSelected($match: JQuery): any {
        if (this.options.highlightSelected) {
            return (this.options.highlightSelected($match));
        } else {
            return (undefined);
        }
    }
    public scrollMatchIntoView($match: JQuery): any {
        if (this.options.scrollMatchIntoView) {
            return (this.options.scrollMatchIntoView($match));
        } else {
            return (this._scrollMatchIntoView($match));
        }
    }
    private _scrollMatchIntoView($match: JQuery): void {
        const $list: JQuery = this.$list;
        if (!$list || $list.length === 0) {
            return;
        }
        xcHelper.scrollIntoView($match, $list);
    }
    public updateResults($matches: JQuery): void {
        const searchBar: SearchBar = this;
        searchBar.$matches = $matches;
        searchBar.numMatches = $matches.length;
        searchBar.$matches.eq(0).addClass('selected');
        const position: number = Math.min(1, searchBar.numMatches);
        searchBar.matchIndex = position - 1;
        searchBar.$position.text(position);
        searchBar.$total.text("of " + searchBar.numMatches);
        if (searchBar.isSlider) {
            searchBar.$searchInput.css("padding-right",
                                        searchBar.$counter.width() + 25);
        }
    }
    public clearSearch(callback?: Function, options?: SearchBarClearOptions): void {
        const searchBar: SearchBar = this;
        searchBar.$position.html("");
        searchBar.$total.html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = $();
        searchBar.numMatches = 0;
        if (!options || !options.keepVal) {
            if (searchBar.codeMirror) {
                searchBar.codeMirror.setValue("");
            } else {
                searchBar.$searchInput.val("");
            }
        }
        if (searchBar.options.removeHighlight && searchBar.$list) {
            searchBar.$list.find(".highlightedText").contents().unwrap();
        }
        if (searchBar.isSlider) {
            searchBar.$searchInput.css("padding-right", 25);
        }

        if (typeof callback === "function") {
            callback();
        }
    }
    public toggleSlider(): void {
        const searchBar: SearchBar = this;
        if (!searchBar.isSlider) {
            return;
        }
        const $searchBar: JQuery = searchBar.$searchArea;
        if ($searchBar.hasClass('closed')) {
            $searchBar.removeClass('closed');
            setTimeout(function() {
                searchBar.$searchInput.focus();
            }, 310);

        } else {
            $searchBar.addClass('closed');
            searchBar.$searchInput.val("");

            if (searchBar.toggleSliderCallback) {
                searchBar.toggleSliderCallback();
            } else {
                searchBar.clearSearch();
            }
        }
    }
}

/* End of SearchBar */

interface FormHelperScrollOptions {
    paddingTop?: number;
}

interface FormHelperOptions {
    focusOnOpen?: Function;
    noTabFocus?: boolean;
    noEsc?: boolean;
    columnPicker?: ColumnPickerOptions,
    allowAllColPicker?: boolean;
    open?: Function;
    close?: Function;
}

interface ColumnPickerOptions {
    state?: string;
    mainMenuState?: string;
    noEvent?: boolean;
    colCallback?: Function;
    headCallback?: Function;
    dagCallback?: Function;
    validTypeException?: Function;
    validColTypes?: ColumnType[];
}

interface FormHelperBGOptions {
    heightAdjust?:  number;
    transparent?: boolean;
}

/* Form Helper */
// an object used for global Form Actions
class FormHelper {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open form
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * columnPicker: a object with column picker options, has attrs:
     *      state: the column picker's state
     *      mainMenuState: main menu's state before open the view
     *      noEvent: if set true, no picker event handler
     *      colCallback: called when click on column
     *      headCallback: called when click on table head
     *      dagCallback: called when click on dagtable icon
     *      validColTypes: (optional) array of valid column types
     */

    private $form: JQuery;
    private options: FormHelperOptions;
    private id: string;
    private state: string;
    private mainMenuState: object;
    private openTime: number;
    private isFormOpen: boolean;

    public constructor($form: JQuery, options?: FormHelperOptions) {
        this.$form = $form;
        this.options = options || {};
        this.id = $form.attr("id");
        this.state = null;
        this.mainMenuState = null;
        this.openTime = null;
        this.isFormOpen = false;

        this.__init();
    }

    public static Template: {[key: string]: HTML} = {
        "rename": '<div class="rename">' +
                    '<input class="columnName origName arg" type="text" ' +
                    'spellcheck="false" disabled/>' +
                    '<div class="middleIcon renameIcon">' +
                        '<div class="iconWrapper">' +
                            '<i class="icon xi-play-circle fa-14"></i>' +
                        '</div>' +
                    '</div>' +
                    '<input class="columnName newName arg" type="text" ' +
                      'spellcheck="false"/>' +
                '</div>'
    }

    public static updateColumns(tableId: TableId): void {
        DFCreateView.updateTables(tableId, true);
        ProjectView.updateColumns();
        OperationsView.updateColumns();
        JoinView.updateColumns();
        ExportView.updateColumns();
        SmartCastView.updateColumns(tableId);
        UnionView.updateColumns(tableId);
        SortView.updateColumns(tableId);
        // extensions view doesn't cache columns
    }

    // used for forms in the left panel
    // options: paddingTop: integer, pixels from the top to position
    public static scrollToElement($el: JQuery, options?: FormHelperScrollOptions): void {
        options = options || {};
        const paddingTop: number = options.paddingTop || 0;
        const $container: JQuery = $el.closest(".mainContent");
        const containerTop: number = $container.offset().top;
        const elTop: number = $el.offset().top;
        // only scrolls if top of $el is not visible
        if (elTop > containerTop + $container.height() ||
            elTop < containerTop) {
            const newScrollTop: number = elTop + $container.scrollTop() - containerTop;
            $container.scrollTop(newScrollTop - paddingTop);
        }
    }

     // called only once per form upon creation
    private __init(): void {
        // tooltip overflow setup
        this.$form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }

    // called everytime the form opens
    public setup(extraOptions: FormHelperOptions): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const self: FormHelper = this;
        const $form: JQuery = self.$form;
        const options: FormHelperOptions = $.extend(self.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the form
        xcTooltip.hideAll();
        $(".selectedCell").removeClass("selectedCell");
        FnBar.clear();

        // Note: to find the visiable btn, must show the form first
        if (!options.noTabFocus) {
            self.refreshTabbing();
        }

        $(document).on("keydown.xcForm", function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                if (!$form.is(":visible")) {
                    return true;
                }
                $form.find(".close").click();
                return false;
            }
        });

        // setup columnPicker
        const columnPicker: ColumnPickerOptions = options.columnPicker || {};
        self.state = "columnPicker";
        if (columnPicker.state != null) {
            self.state += " " + columnPicker.state;
            $("#container").addClass(self.state);
        }

        // see table.less of the class
        // it stop some default events
        $(".xcTableWrap").addClass('columnPicker');

        // add noColumnPicker class to array and object columns
        if (!options.allowAllColPicker) {
            const $headers: JQuery = $(".xcTable").find(".header");
            const $arrayHeaders: JQuery = $headers.filter(function() {
                return $(this).hasClass("type-array");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");
            const $objHeaders: JQuery = $headers.filter(function() {
                return $(this).hasClass("type-object");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($arrayHeaders, {
                title: ColTStr.NoOperateArray,
                container: "body",
                placement: "bottom"
            });

            xcTooltip.add($objHeaders, {
                title: ColTStr.NoOperateObject,
                container: "body",
                placement: "bottom"
            });
        }

        if (columnPicker.validColTypes) {
            const validTypes: ColumnType[] = columnPicker.validColTypes;
            let $otherHeaders: JQuery = $();

            $(".xcTable").each(function() {
                const $table: JQuery = $(this);
                const table: TableMeta = gTables[xcHelper.parseTableId($table)];
                const $invalidHeaders: JQuery = $table.find(".header").filter(function() {
                    const $header: JQuery = $(this);
                    if ($header.hasClass("noColumnPicker")) {
                        return false;
                    }
                    const colNum: number = xcHelper.parseColNum($header.parent());
                    if (colNum > 0) {
                        const type: ColumnType = table.getCol(colNum).getType();
                        return (validTypes.indexOf(type) === -1);
                    } else {
                        return false;
                    }
                });
                $otherHeaders = $otherHeaders.add($invalidHeaders);
            });

            $otherHeaders.addClass("noColumnPicker");
            $otherHeaders.attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($otherHeaders, {
                title: ColTStr.NoOperateGeneral,
                container: "body",
                placement: "bottom"
            });
        }

        if (!columnPicker.noEvent) {
            const colSelector: string = ".xcTable .header, .xcTable td.clickable";
            $("#mainFrame").on("click.columnPicker", colSelector, function(event: JQueryEventObject) {
                const callback: Function = columnPicker.colCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                const $target: JQuery = $(event.target);
                if ($target.closest('.dataCol').length ||
                    $target.closest('.jsonElement').length ||
                    $target.closest('.dropdownBox').length) {
                    return;
                }

                // check to see if cell has a valid type
                const $td: JQuery = $target.closest('td');
                let $header: JQuery;
                if ($td.length) {
                    const colNum: number = xcHelper.parseColNum($td);
                    $header = $td.closest('.xcTable').find('th.col' + colNum)
                                                     .find('.header');
                } else {
                    $header = $(this);
                }

                if ($header.hasClass('noColumnPicker')) {
                    if (!columnPicker.validTypeException ||
                        !columnPicker.validTypeException()) {
                        return;
                    }
                }

                callback($target, event);
            });

            $("#mainFrame").on("click.columnPicker", ".xcTheadWrap", function(event: JQueryEventObject) {
                const callback: Function = columnPicker.headCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                const $eventTarget: JQuery = $(event.target);
                if ($eventTarget.closest('.dropdownBox').length) {
                    return;
                }
                const $target: JQuery = $eventTarget.closest('.xcTheadWrap');
                if ($target.length === 0) {
                    // error case
                    console.error("no header");
                    return;
                }
                callback($target);
            });

            $("#dagPanel").on("mousedown.columnPicker", ".dagTable", function() {
                const callback: Function = columnPicker.dagCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                callback($(this));
            });
        }

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            $form.show();
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormOpen();
        }

        return deferred.promise();
    }

    public showView(formName: string): boolean {
        this.isFormOpen = true;
        this.openTime = Date.now();
        this.mainMenuState = MainMenu.getState();
        $("#workspaceMenu").find(".menuSection").addClass("xc-hidden");
        this.$form.removeClass("xc-hidden");

        let wasMenuOpen: boolean = false;
        if (MainMenu.isMenuOpen("mainMenu")) {
            BottomMenu.close(true);
            wasMenuOpen = true;
        } else {
            MainMenu.open();
        }
        $("#container").addClass("formOpen");

        let name: string = formName || this.id;
        name = name.toLowerCase();
        const viewIndex: number = name.indexOf("view");
        if (viewIndex > -1) {
            name = name.slice(0, viewIndex);
        }
        name = $.trim(name);
        DagPanel.updateExitMenu(name);
        TblMenu.updateExitOptions("#tableMenu", name);
        TblMenu.updateExitOptions("#colMenu", name);
        return wasMenuOpen;
    }

    public hideView(): void {
        this.isFormOpen = false;
        let ignoreClose: boolean = false;
        if (!this.$form.is(":visible")) {
            // do not close the left panel if we've navigated away
            ignoreClose = true;
        }

        this.$form.addClass('xc-hidden');
        $("#container").removeClass("formOpen");
        DagEdit.exitForm();
        DagPanel.updateExitMenu();
        TblMenu.updateExitOptions("#tableMenu");
        TblMenu.updateExitOptions("#colMenu");
        if (this.mainMenuState != null) {
            MainMenu.restoreState(this.mainMenuState, ignoreClose);
            if (!this.mainMenuState["isTopOpen"]) {
                BottomMenu.unsetMenuCache();
            }
            this.mainMenuState = null;
        }

        StatusBox.forceHide();
        xcTooltip.hideAll();
    }

    public checkBtnFocus(): boolean {
        // check if any button is on focus
        return (this.$form.find(".btn:focus").length > 0);
    }

    // This function prevents the user from clicking the submit button multiple
    // times
    public disableSubmit(): void {
        xcHelper.disableSubmit(this.$form.find(".confirm"));
    }

    // This function reenables the submit button after the checks are done
    public enableSubmit(): void {
        xcHelper.enableSubmit(this.$form.find(".confirm"));
    }

    public clear(extraOptions: FormHelperOptions): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const self: FormHelper = this;
        const options: FormHelperOptions = $.extend(self.options, extraOptions) || {};
        const $form: JQuery = self.$form;

        $(document).off("keydown.xcForm");
        $(document).off("keydown.xcFormTabbing");
        $form.find(".focusable").off(".xcForm")
                                  .removeClass("focusable");
        $(".xcTableWrap").removeClass("columnPicker");

        DagEdit.exitForm();
        const $noColPickers: JQuery = $(".xcTable").find('.noColumnPicker')
                                         .removeClass('noColumnPicker')
                                         .removeAttr("data-tipClasses");
        xcTooltip.remove($noColPickers);
        $("#mainFrame").off("click.columnPicker");
        $("#dagPanel").off("mousedown.columnPicker");
        $("#container").removeClass(self.state);
        self.state = null;
        self.enableSubmit();

        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormClose();
        }

        return deferred.promise();
    }

    public addWaitingBG(options: FormHelperBGOptions): void {
        options = options || {};
        const heightAdjust: number = options.heightAdjust || 0;
        const transparent: boolean = options.transparent || false;
        const $form: JQuery = this.$form;
        const waitingBg: HTML = '<div id="formWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $form.append(waitingBg);
        const $waitingBg: JQuery =  $('#formWaitingBG');
        if (transparent) {
            $waitingBg.addClass('transparent');
        } else {
            $waitingBg.removeClass('transparent');
        }
        const modalHeaderHeight: number = $form.children('header').height() || 0;
        const modalHeight: number = $form.height();

        $waitingBg.height(modalHeight + heightAdjust - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    }

    public removeWaitingBG(): void {
        if (gMinModeOn) {
            $('#formWaitingBG').remove();
        } else {
            $('#formWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    }

    public refreshTabbing(): void {
        const $form: JQuery = this.$form;

        $(document).off("keydown.xcFormTabbing");

        $form.find(".focusable").off(".xcForm")
                                 .removeClass("focusable");

        let eleLists: JQuery[] = [
            $form.find("button.btn, input:visible")
        ];

        let $focusables: JQuery[] = [];
        // make an array for all focusable element
        eleLists.forEach(function($eles: JQuery) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });

        // check if element already has focus and set focusIndex;
        let focusIndex: number;
        if (eleLists[0].index($(':focus')) > -1) {
            focusIndex = eleLists[0].index($(':focus')) + 1;
        } else {
            focusIndex = 0;
        }

        let len: number = $focusables.length
        for (let i = 0; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        // focus on the right most button
        if (this.options.focusOnOpen) {
            getEleToFocus();
        }

        $(document).on("keydown.xcFormTabbing", function(event: JQueryEventObject) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        function addFocusEvent($focusable, index) {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcForm", function() {
                const $ele: JQuery = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus(): void {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            // the current ele is not active, should no by focused
            if (!isActive($focusables[focusIndex])) {
                const start: number = focusIndex;
                focusIndex = (focusIndex + 1) % len;

                while (focusIndex !== start &&
                        !isActive($focusables[focusIndex]))
                {
                    focusIndex = (focusIndex + 1) % len;
                }
                // not find any active ele that could be focused
                if (focusIndex === start) {
                    focusIndex = -1;
                }
            }

            if (focusIndex >= 0) {
                $focusables[focusIndex].focus();
            } else {
                focusIndex = 0; // reset
            }
        }

        function focusOn(index: number) {
            focusIndex = index;
            // go to next index
            focusIndex = (focusIndex + 1) % len;
        }

        function isActive($ele: JQuery): boolean {
            if ($ele == null) {
                console.error("undefined element!");
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden" &&
                    window.getComputedStyle($ele[0])
                    .getPropertyValue("pointer-events") !== "none");
        }
    }

    public listHighlight(
        $input: JQuery,
        event: JQueryEventObject,
        isArgInput: boolean
    ): boolean {
        return xcHelper.listHighlight($input, event, isArgInput);
    }

    public getOpenTime(): number {
        return this.openTime;
    }

    public isOpen(): boolean {
        return this.isFormOpen;
    }

    public focusOnColumn(
        tableId: TableId,
        colNum: number,
        noSelect: boolean
    ): void {
        if (tableId == null || colNum == null) {
            // error case
            return;
        }

        const ws: string = WSManager.getWSFromTable(tableId);
        if (ws !== WSManager.getActiveWS()) {
            WSManager.focusOnWorksheet(ws, true);
        }

        xcHelper.centerFocusedColumn(tableId, colNum, true, noSelect);

        const $th: JQuery = $("#xcTable-" + tableId).find("th.col" + colNum);
        xcTooltip.transient($th, {
            "title": TooltipTStr.FocusColumn,
            "container": "#container",
        }, 1000);
    }
}
/* End of FormHelper */

interface RangeSliderOptions {
    minVal?: number;
    maxVal?: number;
    minWidth?: number;
    maxWidth?: number;
    onChangeEnd?: Function;
}

class RangeSlider {
    private minVal: number;
    private maxVal: number;
    private halfSliderWidth: number;
    private minWidth: number;
    private maxWidth: number;
    private valRange: number;
    private widthRange: number;
    private $rangeSliderWrap: JQuery;
    private $rangeInput: JQuery;
    private prefName: string;
    private options: RangeSliderOptions;

    public constructor($rangeSliderWrap, prefName, options?: RangeSliderOptions) {
        options = options || {};
        const self: RangeSlider = this;
        this.minVal = options.minVal || 0;
        this.maxVal = options.maxVal || 0;
        this.halfSliderWidth = Math.round($rangeSliderWrap.find('.slider').width() / 2);
        this.minWidth = options.minWidth || this.halfSliderWidth;
        this.maxWidth = options.maxWidth || $rangeSliderWrap.find('.rangeSlider').width();
        this.valRange = this.maxVal - this.minVal;
        this.widthRange = this.maxWidth - this.minWidth;
        this.$rangeSliderWrap = $rangeSliderWrap;
        this.$rangeInput = $rangeSliderWrap.find('input');
        this.prefName = prefName;
        this.options = options;

        $rangeSliderWrap.find('.leftArea').resizable({
            "handles": "e",
            "minWidth": self.minWidth,
            "maxWidth": self.maxWidth,
            "stop": function(_event, ui) {
                const val: number = self.updateInput(ui.size.width);
                UserSettings.setPref(prefName, val, true);
                if (options.onChangeEnd) {
                    options.onChangeEnd(val);
                }
            },
            "resize": function(_event, ui) {
                self.updateInput(ui.size.width);
            }
        });


        $rangeSliderWrap.find('.leftArea').on('mousedown', function(event: JQueryEventObject) {
            if (!$(event.target).hasClass('leftArea')) {
                // we don't want to respond to slider button being clicked
                return;
            }
            self.handleClick(event);
        });

        $rangeSliderWrap.find('.rightArea').on('mousedown', function(event: JQueryEventObject) {
            self.handleClick(event);
        });

        $rangeSliderWrap.find('input').on('input', function() {
            let val: number = parseFloat($(this).val());
            val = Math.min(self.maxVal, Math.max(val, self.minVal));
            self.updateSlider(val);
        });

        $rangeSliderWrap.find('input').on('change', function() {
            let val: number = parseFloat($(this).val());
            val = Math.min(self.maxVal, Math.max(val, self.minVal));
            $(this).val(val);
            UserSettings.setPref(self.prefName, val, true);
            if (options.onChangeEnd) {
                options.onChangeEnd(val);
            }
        });

        $rangeSliderWrap.find('input').on('keydown', function(event: JQueryEventObject) {
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });
    }

    public updateInput(uiWidth: number): number {
        const width: number = uiWidth - this.minWidth;
        let val: number = (width / this.widthRange) * this.valRange + this.minVal;
        val = Math.round(val);
        this.$rangeInput.val(val);
        return val;
    }

    public updateSlider(val: number): void {
        let width: number = ((val - this.minVal) / this.valRange) * this.widthRange +
                    this.minWidth;

        width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
        this.$rangeSliderWrap.find('.leftArea').width(width);
    }

    public handleClick(event: JQueryEventObject): void {
        if (event.which !== 1) {
            return;
        }
        const self: RangeSlider = this;
        const $rangeSlider: JQuery = $(event.target).closest('.rangeSlider');
        let mouseX: number = event.pageX - $rangeSlider.offset().left +
                     self.halfSliderWidth;
        mouseX = Math.min(self.maxWidth, Math.max(self.minWidth, mouseX));
        const val: number = self.updateInput(mouseX);
        self.updateSlider(val);
        UserSettings.setPref(self.prefName, val, true);
        if (self.options.onChangeEnd) {
            self.options.onChangeEnd(val);
        }
    }

    public setSliderValue(val: number): void {
        this.updateSlider(val);
        this.$rangeInput.val(val);
    }
}

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
            $dropDownList.addClass('yesclickable');

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

interface InputSuggestOptions {
    onClick?: Function;
    $container?: JQuery;
}

class InputSuggest {
    private $container: JQuery;
    private onClick: Function;

    public constructor(options?: InputSuggestOptions) {
        options = options || {};
        this.$container = options.$container;
        this.onClick = options.onClick;

        const self: InputSuggest = this;
        // when click the hint list
        this.$container.on("click", ".hint li", function() {
            if (typeof self.onClick === "function") {
                self.onClick($(this));
            }
        });
    }

    public listHighlight (event: JQueryEventObject): void {
        const $input: JQuery = $(event.currentTarget);
        const $list: JQuery = $input.siblings('.openList');
        if ($list.length && (event.which === keyCode.Up ||
            event.which === keyCode.Down))
        {
            xcHelper.listHighlight($input, event, true);
            // bold the similar text
            $list.find("li").each(function() {
                var $suggestion = $(this);
                xcHelper.boldSuggestedText($suggestion, $input.val());
            });
        }
    }
}

interface InputDropdownHintOptions {
    menuHelper?: MenuHelper,
    preventClearOnBlur?: Function
    onEnter?: Function,
    order?: boolean
}
// options:
// menuHelper: (required) instance of MenuHelper
// preventClearOnBlur: boolean, if true will not reset the input on blur
// order: boolean, if true will place "starts with" matches first
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
                xcHelper.listHighlight($input, event, false);
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
                $lis = $lis.sort(xcHelper.sortHTML);
                $lis.prependTo($list);
            }
            $list.scrollTop(0);
            this.options.menuHelper.showOrHideScrollers();
            return;
        }

        searchKey = searchKey.toLowerCase();

        let count: number = 0;
        $lis.each(function() {
            let $li: JQuery = $(this);
            if ($li.text().toLowerCase().includes(searchKey)) {
                $li.removeClass("xc-hidden");
                xcHelper.boldSuggestedText($li, searchKey);
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

/* Storage */
// Here the use of factory is to hide the salt in the scope
// so outside can not see it
(function createXcStorage(): void {
    const salt: string = "All rights to use the secret key is reserved to Xcalar Inc";

    class XcStorage {
        private storage: LocalStorage;

        public constructor(storage) {
            this.storage = storage;
        }

        public setItem(key, value): boolean {
            try {
                const encodedVal: string = this._encode(value);
                this.storage.setItem(key, encodedVal);
            } catch (error) {
                console.error(error);
                return false;
            }
            return true;
        }

        public getItem(key: string): string {
            const encodedVal: string = this.storage.getItem(key);
            if (encodedVal == null) {
                return null;
            }
            return this._decode(encodedVal);
        }

        public removeItem(key: string): string {
            return this.storage.removeItem(key);
        }

        private _encode(str: string): string {
            // null will be "null", that's how local/session storage handle it
            str = String(str);
            return CryptoJS.AES.encrypt(str, salt).toString();
        }

        private _decode(encodedStr: string): string {
            const encode: CryptoJS.Encoder = CryptoJS.enc.Utf8;
            return CryptoJS.AES.decrypt(encodedStr, salt).toString(encode);
        }
    }

    window.xcLocalStorage = new XcStorage(localStorage);
    window.xcSessionStorage = new XcStorage(sessionStorage);
}());
/* End of Storage */


/* Progress circle for locked tables */
// options:
//  steps: number,
interface ProgressCircleOptions {
    steps?: number;
}

class ProgressCircle  {
    private txId: string | number;
    private iconNum: number;
    private options: ProgressCircleOptions;
    private status: string;
    public progress: number;
    private hasText: boolean;
    private prevPct: number;
    private step: number;
    private svg: d3;
    private arc: Function;
    private pie: Function;

    public constructor(
        txId: number | string,
        iconNum: number,
        hasText?: boolean,
        options?: object) {
        this.txId = txId;
        this.iconNum = iconNum;
        this.options = options || {};
        this.__reset();
        this.status = "inProgress";
        this.progress = 0;
        this.hasText = hasText;
    }

    public update(pctOrStep: number, duration?: number): void {
        if (this.status === "done") {
            return;
        }
        let pct: number;
        let step: number;
        if (this.options.steps) {
            step = pctOrStep;
            pct =  pct = Math.floor(100 * step / this.options.steps);
        } else {
            pct = pctOrStep;
            if (isNaN(pct)) {
                pct = 0;
            }
        }
        pct = Math.max(Math.min(pct, 100), 0);
        const prevPct: number = this.prevPct;
        this.prevPct = pct;
        this.step = step;

        if (prevPct > pct) {
            this.__reset();
        } else if (prevPct === pct) {
            // let the animation continue/finish
            return;
        }

        const svg: d3 = this.svg;
        const pie: Function = this.pie;
        const arc: Function = this.arc;
        const paths = svg.selectAll("path").data(pie([pct, 100 - pct]));

        if (duration == null) {
            duration = 2000;
        }

        paths.transition()
            .ease("linear")
            .duration(duration)
            .attrTween("d", arcTween);

        function arcTween(a) {
            const i = d3.interpolate(this._current, a);
            this._current = i(0);
            return (function(t) {
                return (arc(i(t)));
            });
        }

        if (!this.hasText) {
            return;
        }

        if (this.options.steps) {
            d3.select('.lockedTableIcon[data-txid="' + this.txId +
                    '"] .stepText .currentStep')
            .transition()
            .duration(duration)
            .ease("linear")
            .tween("text", function() {
                const num: number = this.textContent || 0;
                const i: Function = d3.interpolateNumber(num, step);
                return (function(t) {
                    this.textContent = Math.ceil(i(t));
                });
            });
        } else {
                d3.select('.lockedTableIcon[data-txid="' + this.txId +
                    '"] .pctText .num')
            .transition()
            .duration(duration)
            .ease("linear")
            .tween("text", function() {
                const num: number = this.textContent || 0;
                const i: Function = d3.interpolateNumber(num, pct);
                return (function(t) {
                    this.textContent = Math.ceil(i(t));
                });
            });
        }
    }

    private __reset(): void {
        const radius: number = 32;
        const diam: number = radius * 2;
        const thick: number = 7;
        $('.progressCircle[data-txid="' + this.txId + '"][data-iconnum="' +
            this.iconNum + '"] .progress').empty();
        const arc: Function = d3.svg.arc()
                    .innerRadius(radius - thick)
                    .outerRadius(radius);
        const pie: Function = d3.layout.pie().sort(null);
        const svg: d3 = d3.select('.progressCircle[data-txid="' + this.txId +
                            '"][data-iconnum="' + this.iconNum + '"] .progress')
                    .append("svg")
                    .attr({"width": diam, "height": diam})
                    .append("g")
                    .attr("transform", "translate(" + radius + ", " +
                            radius + ")");
        svg.selectAll("path")
            .data(pie([0, 100]))
            .enter()
            .append("path")
            .attr("d", arc)
            .each(function(d) {
                this._current = d;
            });

        if (this.options.steps) {
            this.step = 0;
            $('.progressCircle[data-txid="' + this.txId + '"][data-iconnum="' +
            this.iconNum + '"]').find(".totalSteps").text(this.options.steps);
        }

        this.svg = svg;
        this.pie = pie;
        this.arc = arc;
        this.prevPct = 0;
    }

    public increment(): void {
        this.update(++this.step);
    }

    public done(): void {
        this.status = "completing";
        this.update(100, 500);
        this.status = "done";
    }
};

/*
 * options:
    id: id of the rect element
    $container: container
    onStart: trigger when start move
    onDraw: trigger when drawing
    onEnd: trigger when mouse up
 */

interface RectSelectionOptions {
    id?: string;
    $container?: JQuery;
    onStart?: Function;
    onDraw?: Function;
    onEnd?: Function;
    onMouseup?: Function;
}

class RectSelction {
    private x: number;
    private y: number;
    private id: string;
    private $container: JQuery;
    private bound: ClientRect;
    private onStart: Function;
    private onDraw: Function;
    private onEnd: Function;
    private onMouseup: Function;

    public constructor(x: number, y: number, options?: RectSelectionOptions) {
        options = options || {};
        const self: RectSelction = this;
        // move it 1px so that the filterSelection
        // not stop the click event to toggle percertageLabel
        // to be trigger
        self.x = x + 1;
        self.y = y;
        self.id = options.id;
        self.$container = options.$container;
        self.bound = self.$container.get(0).getBoundingClientRect();
        self.onStart = options.onStart;
        self.onDraw = options.onDraw;
        self.onEnd = options.onEnd;
        self.onMouseup = options.onMouseup;
        const bound: ClientRect = self.bound;
        const left: number = self.x - bound.left;
        const top: number = self.y - bound.top;

        const html: HTML = '<div id="' + self.id + '" class="rectSelection" style="' +
                    'pointer-events: none; left:' + left +
                    'px; top:' + top + 'px; width:0; height:0;"></div>';
        self.__getRect().remove();
        self.$container.append(html);
        self.__addSelectRectEvent();
    }

    public __addSelectRectEvent() {
        const self: RectSelction = this;
        $(document).on("mousemove.checkMovement", function(event) {
            // check for mousemovement before actually calling draw
            self.checkMovement(event.pageX, event.pageY);
        });

        $(document).on("mouseup.selectRect", function() {
            self.end();
            $(document).off(".selectRect");
            $(document).off("mousemove.checkMovement");
            if (typeof self.onMouseup === "function") {
                self.onMouseup();
            }
        });
    }

    public __getRect(): JQuery {
        return $("#" + this.id);
    }

    public checkMovement(x: number, y: number): void {
        const self: RectSelction = this;
        if (Math.abs(x - self.x) > 0 || Math.abs(y - self.y) > 0) {
            if (typeof self.onStart === "function") {
                self.onStart();
            }

            $(document).off('mousemove.checkMovement');
            $(document).on("mousemove.selectRect", function(event) {
                self.draw(event.pageX, event.pageY);
            });
        }
    }

    public draw(x: number, y: number): void {
        const self: RectSelction = this;
        const bound: ClientRect = self.bound;
        // x should be within bound.left and bound.right
        x = Math.max(bound.left, Math.min(bound.right, x));
        // y should be within boud.top and bound.bottom
        y = Math.max(bound.top, Math.min(bound.bottom, y));

        // update rect's position
        let left: number;
        let top: number;
        let w: number = x - self.x;
        let h: number = y - self.y;
        const $rect: JQuery = self.__getRect();

        if (w >= 0) {
            left = self.x - bound.left;
        } else {
            left = x - bound.left;
            w = -w;
        }

        if (h >= 0) {
            top = self.y - bound.top;
        } else {
            top = y - bound.top;
            h = -h;
        }

        const bottom: number = top + h;
        const right: number = left + w;
        // the $rect is absolute to the $container
        // so if $container has scrollTop, the top need to consider it
        $rect.css("left", left)
            .css("top", top + self.$container.scrollTop())
            .width(w)
            .height(h);

        if (typeof self.onDraw === "function") {
            self.onDraw(bound, top, right, bottom, left);
        }
    }

    public end(): void {
        const self: RectSelction = this;
        self.__getRect().remove();
        if (typeof self.onEnd === "function") {
            self.onEnd();
        }
    }
}

interface InfListOptions {
    numToFetch?: number;
    numInitial?: number;
}

class InfList {
    private $list: JQuery;
    private numToFetch: number;
    private numInitial: number;

    public constructor($list: JQuery, options?: InfListOptions) {
        options = options || {};
        const self: InfList = this;
        self.$list = $list;
        self.numToFetch = options.numToFetch || 20;
        self.numInitial = options.numInitial || 40;
        self.__init();
    }

    private __init(): void {
        const self: InfList = this;
        const $list: JQuery = self.$list;
        let isMousedown: boolean = false;
        let lastPosition: number = 0;

        $list.on("mousedown", function() {
            isMousedown = true;
            lastPosition = $list.scrollTop();
            $(document).on("mouseup.listScroll", function() {
                isMousedown = false;
                $(document).off("mouseup.listScroll");
                const curPosition: number = $list.scrollTop();
                const height: number = $list[0].scrollHeight;
                const curTopPct: number = curPosition / height;
                // scroll up if near top 2% of textarea
                if (curPosition === 0 ||
                    (curTopPct < 0.02 && curPosition < lastPosition)) {
                    scrollup();
                }
            });
        });

        $list.scroll(function() {
            if ($list.scrollTop() === 0) {
                if (isMousedown) {
                    return;
                }
                scrollup();
            }
        });

        function scrollup(): void {
            const $hidden: JQuery = $list.find(".infListHidden");
            const prevHeight: number = $list[0].scrollHeight;
            $hidden.slice(-self.numToFetch).removeClass("infListHidden");
            const top: number = $list[0].scrollHeight - prevHeight;
            $list.scrollTop(top);
        }
    }

    public restore(selector: string): void {
        const $list: JQuery = this.$list;
        const $items: JQuery = $list.find(selector);
        const limit: number = $items.length - this.numInitial;
        if (limit > 0) {
            $items.filter(":lt(" + limit + ")").addClass("infListHidden");
        }
    }
}
