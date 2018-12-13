// used for filter, aggregate, map, group by
class GeneralOpPanel extends BaseOpPanel {
    protected _panelContentSelector: string;
    protected _$panel: JQuery;
    protected _$genFunctionsMenu: JQuery;   // $('.genFunctionsMenu')
    protected _$functionsUl: JQuery;
    protected _isNewCol: boolean;
    protected _operatorName: string = ""; // group by, map, filter, aggregate, etc..
    protected _operatorsMap = {};
    protected _categoryNames: string[] = [];

    protected _$lastInputFocused: JQuery;
    protected _quotesNeeded: boolean[] = [];
    protected _aggNames: string[] = [];
    protected _suggestLists: MenuHelper[][] = [[]]; // groups of arguments
    protected _allowInputChange: boolean = true;
    protected _functionsListScrollers: MenuHelper[] = [];
    protected _formHelper: FormHelper;
    protected _listMax: number = 200; // max length for hint list
    protected _table;
    // protected _dagNode: DagNodeGroupBy | DagNodeAggregate | DagNodeMap | DagNodeFilter;
    protected _dagNode: DagNode;
    protected model;
    protected _opCategories: number[];

     // shows valid cast types
    protected static castMap = {
        "string": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.timestamp],
        "integer": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string, ColumnType.timestamp],
        "float": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                  ColumnType.string, ColumnType.timestamp],
        "number": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string, ColumnType.timestamp],
        "boolean": [ColumnType.integer, ColumnType.float, ColumnType.string],
        "timestamp": [ColumnType.integer, ColumnType.float, ColumnType.string],
        "mixed": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string, ColumnType.timestamp],
        // no valid cast options for: undefined, array, objects
    };
    protected static firstArgExceptions = {
        'conditional functions': ['not'],
        'conditional': ['not']
    };

    public constructor() {
        super();
    }

    public setupPanel(panelSelector: string): void {
        const self = this;
        this._$panel = $(panelSelector);
        this._panelContentSelector = panelSelector + " .opSection";
        super.setup(this._$panel, {"noEsc": true});

        this._$genFunctionsMenu = this._$panel.find('.genFunctionsMenu');
        this._$functionsUl = this._$genFunctionsMenu.find('ul');

        this._addGeneralEventListeners();

        this._$panel.on('click', '.minGroup', function() {
            self._minimizeGroups($(this).closest('.group'));
        });

        this._$lastInputFocused = this._$panel.find('.arg:first');

        this._$panel.on('focus', '.arg', function() {
            self._$lastInputFocused = $(this);
            if ($(this).closest(".mapGroup").length) {
                self._minimizeGroups();
            }
            $(this).closest('.group').removeClass('minimized fnInputEmpty');

        });

        this._$panel.on('mouseup', '.group', function() {
            $(this).removeClass('minimized fnInputEmpty');
        });

        // for all lists (including hint li in argument table)
        this._$panel.on({
            'mouseenter': function() {
                if ($(this).closest('.list').hasClass('disableMouseEnter')) {
                    $(this).closest('.list').removeClass('disableMouseEnter');
                    return;
                }
                self._$panel.find('li.highlighted')
                                .removeClass('highlighted');
                $(this).addClass('highlighted');
                $(this).closest('.list').addClass('hovering');
            },
            'mouseleave': function() {
                if ($(this).closest('.list').hasClass('disableMouseEnter')) {
                    return;
                }
                $(this).removeClass('highlighted');
                $(this).closest('.list').removeClass('hovering');
            }
        }, '.list li');

        // all inputs except functions input will either submit the form or
        // select a highlighted list element
        this._$panel.on("keypress", "input", function(event) {
            const $input: JQuery = $(this);
            if (event.which !== keyCode.Enter ||
                $input.hasClass("functionsInput")) {
                // ignore function inputs
                return;
            }

            const $hintli = $input.siblings('.hint').find('li.highlighted');
            if ($hintli.length && $hintli.is(":visible")) {
                $hintli.click();
                return;
            }
            $(this).blur();
            self._submitForm();
        });

        // INPUT AND DROPDOWN LISTENERS
        this._$panel.on("keydown", ".arg", function(event) {
            const $input = $(this);
            const $list = $input.siblings('.openList');
            if ($list.length && (event.which === keyCode.Up ||
                event.which === keyCode.Down))
            {
                self._formHelper.listHighlight($input, event, true);
            }
        });

        let argumentTimer;
        // .arg (argument input)
        this._$panel.on("input", ".arg", function(_event, options) {
            // Suggest column name
            const $input = $(this);
            if ($input.closest(".dropDownList")
                        .hasClass("colNameSection")) {
                // for new column name, do not suggest anything
                return;
            }

            if ($input.val() !== "" &&
                $input.closest('.inputWrap').siblings('.inputWrap')
                                            .length === 0) {
                // hide empty options if input is dirty, but only if
                // there are no sibling inputs from extra arguments
                self._hideEmptyOptions($input);
            }

            clearTimeout(argumentTimer);
            argumentTimer = setTimeout(function() {
                if (options && options.insertText) {
                    return;
                }

                self._argSuggest($input);
                self._checkIfStringReplaceNeeded();
            }, 200);

            self._updateStrPreview();
            if (options && options.insertText) {
                self._checkIfStringReplaceNeeded();
            }
        });

        this._$panel.on("focus", ".arg", function() {
            self._hideDropdowns();
        });

        this._$panel.on("change", ".arg", function() {
            self._onArgChange($(this));
        });

        this._$panel.on('dblclick', 'input', function() {
            $(this).select();
        });

        this._$panel.on("click", ".colNameMenuIcon", function() {
            self._argSuggest($(this).siblings(".arg"), true);
        });

        // click on the hint list
        this._$panel.on('click', '.hint li', function() {
            const $li: JQuery = $(this);
            if ($li.hasClass("unavailable")) {
                return;
            }
            let val: string = $li.text();
            if (val[0] !== gAggVarPrefix) {
                val = gColPrefix + val;
            }

            self._applyArgSuggest($li, val);
        });

        this._addCastDropDownListener();

        this._$panel.on("click", ".boolArgWrap", function() {
            const $checkbox: JQuery = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
            const $input: JQuery = $checkbox.closest(".row").find(".arg");
            let val: string = "";
            if ($checkbox.hasClass("checked")) {
                val = "true";
            }
            $input.val(val);
            const $group = $input.closest(".group")
            const groupIndex = self._$panel.find(".group").index($group);
            const argIndex = $group.find(".argsSection").last().find(".arg").index($input);
            self.model.updateArg(val, groupIndex, argIndex, {
                boolean: true,
                typeid: $input.data("typeid")
            });
            self._updateStrPreview(true);
        });

        // empty options checkboxes
        // current types include "None", "Empty String", and empty
        this._$panel.on('click', '.emptyOptions .checkboxWrap', function() {
            const $checkboxWrap: JQuery = $(this);
            const $checkbox: JQuery = $checkboxWrap.find('.checkbox');
            const $emptyOptsWrap: JQuery = $checkboxWrap.parent();
            const isEmptyArgsBox: boolean = $checkboxWrap.closest(".skipField").length > 0;

            const $arg: JQuery = $emptyOptsWrap.closest(".row").find(".arg");
            const $group: JQuery = $checkbox.closest(".group");
            const groupIndex = self._$panel.find(".group").index($group);
            const index: number = $group.find(".arg").index($arg);

            $arg.val("");
            const $inputWrap = $emptyOptsWrap.siblings('.inputWrap');
            $checkbox.toggleClass("checked");
            const isChecked = $checkbox.hasClass('checked');
            if (!isChecked) {
                $inputWrap.removeClass('semiHidden');
                $emptyOptsWrap.siblings('.cast').removeClass('semiHidden');
            } else {
                if ($inputWrap.length === 1) {
                    $inputWrap.addClass('semiHidden').find('.arg').val("");
                    $emptyOptsWrap.siblings('.cast').addClass('semiHidden');
                }

                // noArg and empty str toggling
                $checkbox.closest('.checkboxWrap').siblings()
                        .find('.checkbox').removeClass('checked');
                if (isEmptyArgsBox) {
                    const $sibArgs: JQuery = $group.find(".arg:gt(" + index + ")")
                                    .filter(function() {
                        return !$(this).closest(".resultantColNameRow").length;
                    });
                    self._showEmptyOptions($sibArgs);
                    $sibArgs.val("");
                    const $inputWraps: JQuery = $checkbox.closest(".row").find(".inputWrap");
                    $inputWraps.addClass("semiHidden");
                    $inputWraps.siblings(".cast").addClass("semiHidden");
                    $inputWraps.siblings(".emptyOptions")
                                .find(".noArgWrap .checkbox").addClass("checked");
                    $inputWraps.siblings(".emptyOptions")
                                .find(".emptyStrWrap .checkbox")
                                .removeClass("checked");
                }
            }

            self.model.updateArg($arg.val(), groupIndex, index, {
                isEmptyArg: isChecked && isEmptyArgsBox,
                isNone: isChecked && !isEmptyArgsBox && $checkbox.hasClass("noArg"),
                isEmptyString: isChecked && $checkbox.hasClass("emptyStr")
            });
            self._checkIfStringReplaceNeeded();
        });

        // UDFs should not rely on this.
        this._operatorsMap = XDFManager.Instance.getOperatorsMap();
    }

    public show(node: DagNode, options?): boolean {
        const self = this;
        this._dagNode = node;
        if (this._formHelper.isOpen()) {
            return false;
        }

        this._operatorName = this._dagNode.getType().toLowerCase().trim();

        super.showPanel(this._operatorName, options);

        this._resetForm();
        this._operationsViewShowListeners();

        // used for css class
        const opNameNoSpace: string = this._operatorName.replace(/ /g, "");
        const columnPickerOptions: ColumnPickerOptions = {
            "state": opNameNoSpace + "State",
            "colCallback": function($target) {
                self.columnPickerCallback($target);
            }
        };
        this._formHelper.setup({"columnPicker": columnPickerOptions});

        this._toggleOpPanelDisplay(false);
        return true;
    }

    public close(isSubmit?: boolean): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        // highlighted column sticks out if we don't close it early
        this._toggleOpPanelDisplay(true);
        $(".xcTable").find('.modalHighlighted').removeClass('modalHighlighted');
        super.hidePanel(isSubmit);
        $(document).off('click.OpSection');
        $(document).off("keydown.OpSection");
    }

    public refreshColumns(): void {
        this.allColumns = this.model.refreshColumns();
    }

    private _addGeneralEventListeners(): void {
        const self = this;
        let scrolling: boolean = false;
        let scrollTimeout: number;
        const scrollTime: number = 300;
        this._$panel.find('.opSection').scroll(function() {
            if (!scrolling) {
                StatusBox.forceHide();// hides any error boxes;
                xcTooltip.hideAll();
                scrolling = true;
            }
            clearTimeout(scrollTimeout);
            scrollTimeout = <any>window.setTimeout(function() {
                scrolling = false;
            }, scrollTime);
        });

        this._$panel.find('.cancel, .close').on('click', function() {
            self.close();
        });

        this._$panel.find('.submit').on('click', self._submitForm.bind(this));
    }

    protected _panelShowHelper(dataModel): void {
        this.model = dataModel;
        const aggs = DagAggManager.Instance.getAggMap();
        this._aggNames = [];
        for (const i in aggs) {
            this._aggNames.push(aggs[i].aggName);
        }
        this.refreshColumns();
        this._populateInitialCategoryField();
        this._fillInputPlaceholder();
        this._$panel.find('.list').removeClass('hovering');
        this._$panel.find('.group').find(".argsSection").last().empty();
    }

    // listeners added whenever operation view opens
    protected _operationsViewShowListeners() {
        const self = this;
        $("#dagViewTableArea").on("mousedown.keepInputFocused", ".xcTable .header, " +
                        ".xcTable td.clickable", self._keepInputFocused.bind(self));

        $(document).on('click.OpSection', function() {
            const $mousedownTarget: JQuery = gMouseEvents.getLastMouseDownTarget();
            // close if user clicks somewhere on the op modal, unless
            // they're clicking on a dropdownlist
            // if dropdown had a higlighted li, trigger a fnListMouseup and thus
            // select it for the functions dropdown list
            if ($mousedownTarget.closest('.dropDownList').length === 0) {
                let dropdownHidden: boolean = false;
                self._$panel.find('.genFunctionsMenu:visible')
                .each(function() {
                    const $selectedLi: JQuery = $(this).find('.highlighted');
                    if ($selectedLi.length > 0) {
                        const e: JQueryEventObject = $.Event("mouseup");
                        self._fnListMouseup(e, $selectedLi, true);
                        dropdownHidden = true;
                        return false; // exit loop
                    }
                });
                if (!dropdownHidden) {
                    self._hideDropdowns();
                }
            }
            self._allowInputChange = true;
        });

        $(document).on("keydown.OpSection", function(event: JQueryEventObject) {
            if (event.which === keyCode.Escape) {
                if (self._$panel.find(".hint.list:visible").length) {
                    self._hideDropdowns();
                } else if (!self._$panel.find(".list:visible").length) {
                    self.close();
                }
            }
        });
    }

    protected _onArgChange($input) {
        const val = $input.val();
        const $group = $input.closest(".group")
        const groupIndex = this._$panel.find(".group").index($group);
        const argIndex = $group.find(".arg").index($input);
        this.model.updateArg(val, groupIndex, argIndex);
    }

    protected _scrollToGroup (
        groupIndex: number,
        isFocusArgs?: boolean
    ): void {
        const animSpeed: number = 500;
        const opSectionTop = this._$panel.find(".opSection")[0].getBoundingClientRect().top;
        const $group = this._$panel.find(".group").eq(groupIndex);
        const $target = isFocusArgs ? $group.find(".descriptionText") : $group;
        const scrollTop = this._$panel.find(".opSection").scrollTop() +
                          $target[0].getBoundingClientRect().top -
                          opSectionTop;
        this._$panel.find(".opSection").stop()
                    .animate({scrollTop: scrollTop}, animSpeed);
    }

    // for functions dropdown list
    // forceUpdate is a boolean, if true, we trigger an update even if
    // input's val didn't change
    protected _fnListMouseup(
        event: JQueryEventObject,
        $li: JQuery,
        forceUpdate?: boolean
    ): void {
        this._allowInputChange = true;
        event.stopPropagation();
        const value: string = $li.text();
        const $input: JQuery = $li.closest('.list').siblings('.autocomplete');
        const fnInputNum: number = $input.data('fninputnum');
        const originalInputValue: string = $input.data("value");
        this._hideDropdowns();

        // value didn't change && argSection is inactive (not showing)
        if (!forceUpdate && originalInputValue === value &&
            this._$panel.find('.group').eq(fnInputNum)
                            .find('.argsSection.inactive').length === 0) {
            $input.val(value);
            return;
        }

        $input.val(value);

        if (value === this._$genFunctionsMenu.data('category')) {
            return;
        }

        $input.data("value", value.trim());
        this._enterFunctionsInput(fnInputNum);
    }

    protected _toggleOpPanelDisplay(isHide: boolean): void {
        const $tableWrap: JQuery = $('.xcTableWrap');
        if (isHide) {
            $("#dagViewTableArea").off('mousedown.keepInputFocused');
            $('body').off('keydown', this._listHighlightListener.bind(this));
            $tableWrap.removeClass('modalOpen');
        } else {
            $('body').on('keydown', this._listHighlightListener.bind(this));
        }
    }

    protected _keepInputFocused(event: JQueryEventObject): void {
        xcMenu.close($('#colMenu'));
        event.preventDefault();
        event.stopPropagation();
    }

    protected _addCastDropDownListener(): void {
        const self = this;
        const $lists: JQuery = this._$panel.find(".cast.new .dropDownList");
        $lists.closest('.cast.new').removeClass('new');
        const castList: MenuHelper = new MenuHelper($lists, {
            "onOpen": function() {
                StatusBox.forceHide();
            },
            "onSelect": function($li) {
                const $list: JQuery = $li.closest(".list");
                const $input: JQuery = $list.siblings(".text");
                const type: string = $li.text();
                let casted: boolean;

                $input.val(type);
                casted = (type === "default");

                $input.attr("data-casted", <any>casted);
                $input.closest('.row').find('.arg')
                                        .data('casted', casted)
                                        .data('casttype', type);
                StatusBox.forceHide();
                self._updateStrPreview();

                const $group = $input.closest(".group");
                const groupIndex = self._$panel.find(".group").index($group);
                const $argInput = $input.closest(".row").find(".arg");
                const argIndex = $group.find(".argsSection").last().find(".arg").index($argInput);

                let castType: string = type;
                if (castType === "default") {
                    castType = null;
                }
                self.model.updateCast(castType, groupIndex, argIndex);
            },
            "container": self._panelContentSelector
        });
        castList.setupListeners();
    }

    protected _sortHTML(a, b): number {
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    protected _getArgSuggestMenu($list: JQuery): MenuHelper {
        const $allGroups: JQuery = this._$panel.find(".group");
        const $group: JQuery = $list.closest(".group");
        const groupIndex: number = $allGroups.index($group);
        const argIndex: number = $group.find(".list.hint").index($list);
        // this should always exists, just taking precaution
        if (this._suggestLists[groupIndex] && this._suggestLists[groupIndex][argIndex]) {
            return this._suggestLists[groupIndex][argIndex];
        } else {
            console.error("cannot find menu");
            return null;
        }
    }

    protected _getArgSuggestLists(input: string): HTML {
        let listLis: HTML = "";
        // ignore if there are multiple cols
        if (input.includes(",")) {
            return listLis;
        }

        let aggNameMatches: string[] = [];
        if (!this.codeMirrorNoAggs) {
            aggNameMatches = this._getMatchingAggNames(input);
        }

        const colNameMatches: string[] = this._getMatchingColNames(input);
        const allMatches: string[] = aggNameMatches.concat(colNameMatches);

        for (let i = 0; i < allMatches.length; i++) {
            if (i >= this._listMax) {
                listLis += "<li class='unavailable'>(limited to first " + this._listMax + " results)</li>";
                break;
            }
            listLis += "<li>" +
                            allMatches[i] +
                        "</li>";
        }
        return listLis;
    }

    protected _argSuggest($input: JQuery, showAll?: boolean): void {
        const $list: JQuery = $input.siblings(".list");
        const menu: MenuHelper = this._getArgSuggestMenu($list);
        if (menu == null) {
            return;
        }
        let input: string;
        if (showAll) {
            input = gColPrefix;
        } else {
            input = $input.val().trim();
        }
        if (input.length === 1 && !isNaN(<any>input)) {
            // if it's a single number don't suggest
            return;
        }
        const listLis: HTML = this._getArgSuggestLists(input);

        $list.find("ul").html(listLis);
        // should not suggest if the input val is already a column name
        if (listLis.length) {
            menu.openList();
            this._positionDropdown($list);
            $list.find("li").eq(0).addClass("highlighted");
        } else {
            menu.hideDropdowns();
        }
    }

    protected _applyArgSuggest($li: JQuery, val: string): void {
        const $list: JQuery = $li.closest(".list");
        const menu: MenuHelper = this._getArgSuggestMenu($list);
        if (menu != null) {
            menu.hideDropdowns();
        }
        const $input = $list.siblings(".arg")
        $input.val(val);
        this._checkIfStringReplaceNeeded();
        const $group = $input.closest(".group")
        const groupIndex = this._$panel.find(".group").index($group);
        const argIndex = $group.find(".argsSection").last().find(".arg").index($input);
        this.model.updateArg(val, groupIndex, argIndex);
    }

    protected _getMatchingAggNames(val: string): string[] {
        const list: string[] = [];
        const originalVal: string = val;
        val = val.toLowerCase();
        if (val.length) {
            for (let i = 0; i < this._aggNames.length; i++) {
                if (this._aggNames[i].toLowerCase().indexOf(val) > -1 ) {
                    list.push(this._aggNames[i]);
                }
            }
        }

        if (list.length === 1 && list[0] === originalVal) {
            // do not populate if exact match
            return [];
        }

        list.sort();
        return list.map((list) => {
            return xcHelper.escapeHTMLSpecialChar(list);
        });
    }

    protected _getMatchingColNames(val: string): string[] {
        const cols: ProgCol[] = this.model.getColumns();
        let list: string[] = [];
        const seen = {};
        const originalVal: string = val;
        let showingAll = false;

        if (val[0] === gColPrefix) {
            val = val.slice(1);
        }
        val = val.toLowerCase();
        const colsCache: {[key: string]: ColumnType} = {};
        cols.forEach((col) => {
            colsCache[col.getBackColName()] = col.getType();
        });
        const beginningMatches  =[];
        if (val.length) {
            for (const name in colsCache) {
                const nameLower = name.toLowerCase();
                const matchIndex = nameLower.indexOf(val);
                if (matchIndex !== -1 && !seen.hasOwnProperty(name)) {
                    seen[name] = true;
                    if (matchIndex === 0) {
                        beginningMatches.push(name);
                    } else {
                        list.push(name);
                    }
                }
            }
        } else {
            showingAll = true;
            for (const name in colsCache) {
                if (!seen.hasOwnProperty(name)) {
                    seen[name] = true;
                    list.push(name);
                }
            }
        }

        if (list.length === 1 && (gColPrefix + list[0] === originalVal)) {
            // do not populate if exact match
            return [];
        }
        let sortFn;
        if (showingAll) {
            sortFn = xcHelper.sortVals;
        } else {
            sortFn = (a, b) => {
                return a.length - b.length;
            };
        }
        beginningMatches.sort(sortFn);
        list.sort(sortFn);
        // puts matches that start with the same letters first
        list = beginningMatches.concat(list);

        return list.map((colName) => {
            const colNameTemplate: HTML = xcHelper.escapeHTMLSpecialChar(colName);
            return BaseOpPanel.craeteColumnListHTML(colsCache[colName], colNameTemplate);
        });
    }

    protected _positionDropdown($ul: JQuery): void {
        const $input: JQuery = $ul.siblings('input');
        const rect: ClientRect = $input[0].getBoundingClientRect();
        $ul.css({top: rect.top, left: rect.left});
    }

    protected _hideDropdowns(): void {
        this._$panel.find('.list').filter(function() {
            return ($(this).closest('.tableList').length === 0);
        }).hide();
        this._$panel.find('.list li').hide();
        this._$panel.find('.cast .list li').show();
        this._$panel.find('.tableList .list li').show();
    }

    // index is the argument group numbers
    protected _enterFunctionsInput(_index: number, _onChange?: boolean): void {}

    protected _focusNextInput(groupIndex: number):void {
        let $nextInput: JQuery;
        let $inputs: JQuery = this._$panel.find('.group').eq(groupIndex)
                                      .find('.arg');

        $inputs.each(function() {
            if ($(this).val().trim().length === 0) {
                $nextInput = $(this);
                return false;
            }
        });

        if (!$nextInput) {
            $nextInput = $inputs.last();
        }

        $nextInput.focus().select();
    }

    // scrolls to target before showing statusbox
    // delayhide is milliseconds to delay allow hiding, optional
    protected _statusBoxShowHelper(
        text: string,
        $input: JQuery,
        delayHide?: number
    ): void {
        // scroll into view if not in view
        let $row: JQuery = $input.closest(".row");
        if (!$row.length) {
            $row = $input.parent();
        }
        const inputTop: number = $row.offset().top;
        const $mainContent: JQuery = this._$panel.find(".opSection");
        const sectionTop: number = $mainContent.offset().top;
        const scrollTop: number = $mainContent.scrollTop();
        if (inputTop < sectionTop) { // above view
            $mainContent.scrollTop(scrollTop - (sectionTop - inputTop));
        } else if (inputTop + $input.closest(".row").height() >
            (sectionTop + $mainContent.height())) { // below view
            const diff: number = (inputTop + $input.closest(".row").height()) -
                        (sectionTop + $mainContent.height());
            $mainContent.scrollTop(scrollTop + diff + 40);
        }

        xcTooltip.hideAll();
        StatusBox.show(text, $input, false, {preventImmediateHide: true,
            delayHide: delayHide});
    }

    protected _findStringDiff(oldText: string, newText: string): any {

        // Find the index at which the change began
        let start: number = 0;
        while (start < oldText.length && start < newText.length &&
                oldText[start] === newText[start]) {
            start++;
        }

        // Find the index at which the change ended
        // (relative to the end of the string)
        let end: number = 0;
        while (end < oldText.length &&
            end < newText.length &&
            oldText.length - end > start &&
            newText.length - end > start &&
            oldText[oldText.length - 1 - end] === newText[newText.length - 1 -
            end])
        {
            end++;
        }

        // The change end of the new string (newEnd) and old string (oldEnd)
        const newEnd: number = newText.length - end;
        const oldEnd: number = oldText.length - end;

        // The number of chars removed and added
        const removed: number = oldEnd - start;
        const added: number = newEnd - start;

        let type: string;
        switch (true) {
            case (removed === 0 && added > 0):
                type = 'add';
                break;
            case (removed > 0 && added === 0):
                type = 'remove';
                break;
            case (removed > 0 && added > 0):
                type = 'replace';
                break;
            default:
                type = 'none';
                start = 0;
        }

        return {
            type: type,
            start: start,
            removed: removed,
            added: added
        };
    }

    // noHighlight: boolean; if true, will not highlight new changes
    protected _checkIfStringReplaceNeeded(noHighlight?: boolean): void {
        const self = this;
        this._quotesNeeded = [];

        this._$panel.find('.group').each(function(i) {
            // const typeIds = [];
            const $inputs: JQuery = $(this).find('.arg');
            const existingTypes: any = self._getExistingTypes(i);

            $inputs.each(function() {
                const $input: JQuery = $(this);
                const $row: JQuery = $input.closest('.row');
                const arg: string = $input.val().trim();
                let typeId: number;
                let parsedType: any[];
                if (!$input.closest(".dropDownList").hasClass("colNameSection"))
                {
                    typeId = $input.data("typeid");
                }
                parsedType = self._parseType(typeId);
                const emptyStrChecked: boolean = $row.find('.emptyStr.checked').length > 0;
                if (emptyStrChecked && arg === "") {
                    self._quotesNeeded.push(true);
                } else if (self._isNoneInInput($input)) {
                    self._quotesNeeded.push(false);
                } else if (!$input.closest(".dropDownList")
                            .hasClass("colNameSection") &&
                            !xcHelper.hasValidColPrefix(arg) &&
                            arg[0] !== gAggVarPrefix &&
                            parsedType.indexOf("string") > -1 &&
                            ($input.data("nofunc") || !self._hasFuncFormat(arg))) {
                    // one of the valid types is string


                    if (parsedType.length === 1) {
                        // if input only accepts strings
                        self._quotesNeeded.push(true);
                    } else if (existingTypes.hasOwnProperty("string")) {
                        self._quotesNeeded.push(true);
                    } else {
                        if (self._formatArgumentInput(arg, typeId, {}).isString) {
                            if (self._isNumberInQuotes(arg) || self._isBoolInQuotes(arg)) {
                                self._quotesNeeded.push(false);
                            } else {
                                self._quotesNeeded.push(true);
                            }
                        } else {
                            self._quotesNeeded.push(false);
                        }
                    }
                } else {
                    self._quotesNeeded.push(false);
                }
            });
        });

        this._updateStrPreview(noHighlight);
    }

    // returns true of the noArg box is selected, not skipping fields
    protected _isNoneInInput($input: JQuery): boolean {
        const $row: JQuery = $input.closest(".row");
        return ($row.find(".noArg.checked").length &&
                !$row.find(".skipField").length);
    }

    protected _updateStrPreview(
        _noHighlight?: boolean,
        _andOrSwitch?: boolean
    ): void {}

    protected _wrapText(text: string): HTML {
        let res = "";
        for (let i = 0; i < text.length; i++) {
            res += '<span class="char">' +
                        text[i] +
                    '</span>';
        }
        return res;
    }

    protected _modifyAndOrDescText(
        newText: string,
        andOrIndices: number[],
        $spanWrap: JQuery
    ): void {
        let descText: HTML = "";
        let spanClass: string;
        let andOrLen: number = 2;
        if (this._$panel.find(".switch").hasClass("on")) {
            andOrLen = 3;
        }
        for (let i = 0; i < newText.length; i++) {
            if (andOrIndices.indexOf(i) > -1) {
                for (let j = 0; j < andOrLen; j++) {
                    descText += '<span class="char visible">' + newText[i] +
                        '</span>';
                    i++;
                }
                i--; // inner for loop increments i 1 too many times
            } else {
                if (newText[i] === " ") {
                    spanClass = "space";
                } else {
                    spanClass = "";
                }
                descText += '<span class="char ' + spanClass + '">' +
                            newText[i] + '</span>';
            }
        }
        $spanWrap.html(descText);
        setTimeout(function() {
            $spanWrap.find('.visible').removeClass('visible');
        });
    }

    protected _modifyDescText(
        oldText: string,
        newText: string,
        $spanWrap: JQuery,
        $spans: JQuery
    ): void {
        const diff: any = this._findStringDiff(oldText, newText);
        if (diff.type !== "none") {
            const type: string = diff.type;
            let position: number;
            let tempText: string;
            let i: number;

            switch (type) {
                case ('remove'):
                // do nothing
                    position = diff.start;
                    for (i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }

                    break;
                case ('add'):
                    tempText = newText;
                    newText = "";
                    for (i = diff.start; i < diff.start + diff.added; i++) {
                        if (tempText[i] === " ") {
                            newText += "<span class='char visible space'>" +
                                    tempText[i] + "</span>";
                        } else {
                            newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";
                        }
                    }
                    if (diff.start === 0) {
                        $spanWrap.prepend(newText);
                    } else {
                        $spans.eq(diff.start - 1).after(newText);
                    }
                    break;
                case ('replace'):
                    tempText = newText;
                    position = diff.start;
                    newText = "";
                    for (i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }
                    for (i = diff.start; i < diff.start + diff.added; i++) {
                        if (tempText[i] === " ") {
                            newText += "<span class='char visible space'>" +
                                    tempText[i] + "</span>";
                        } else {
                            newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";
                        }

                    }
                    if (diff.start === 0) {
                        $spanWrap.prepend(newText);
                    } else {
                        $spans.eq(diff.start - 1).after(newText);
                    }

                    break;
                default:
                //nothing;
                    break;
            }

            // delay hiding the diff or else it won't have transition
            setTimeout(function() {
                $spanWrap.find('.visible').removeClass('visible');
            });

        } else {
            return;
        }
    }

    protected _getExistingTypes(_groupNum: number): any {
        return {};
    }

    // used in cases where arg could be type string and number
    protected _isNumberInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1);
                const parsedVal: number = parseFloat(arg);
                if (!isNaN(parsedVal) && String(parsedVal) === arg) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    // used in cases where arg could be type string and bool
    protected _isBoolInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1).toLowerCase();
                if (arg === "true" || arg === "false") {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    protected _submitForm() {
        if (!this._validate()) {
            return false;
        }

        this.model.submit();
        this.close(true);
        return true;
    }

    protected _validate(): boolean {
        return true;
    }

    protected _isOperationValid(groupNum): boolean {
        const groups = this.model.getModel().groups;
        const operator = groups[groupNum].operator;
        return this._getOperatorObj(operator) != null;
    }

    protected _getOperatorObj(operatorName: string): any {
        for (let i = 0; i < this._opCategories.length; i++) {
            let ops = XDFManager.Instance.getOperatorsMap()[this._opCategories[i]];
            const op = ops[operatorName];
            if (op) {
                return op;
            }
        }
        return null;
    }

    // protected _isOperationValid(index: number): boolean {
    //     const func: string = $.trim(this._$panel.find('.group').eq(index)
    //                                     .find('.functionsInput').val());

    //     const $matches: JQuery = this._$functionsUl.find('li').filter(function() {
    //         return ($(this).text() === func);
    //     });

    //     return ($matches.length > 0);
    // }

    // returns an array of objects that include the new type and argument number
    protected _getCastInfo(args: string[], groupNum: number): any {
        const self = this;
        const colTypeInfos = [];

        // set up colTypeInfos, filter out any that shouldn't be casted
        const $group: JQuery = this._$panel.find('.group').eq(groupNum);
        $group.find('.arg').each(function(i) {
            const $input: JQuery = $(this);
            const hasEmpty: boolean = $input.closest('.row')
                                    .find('.emptyOptions .checked').length > 0;
            const isCasting: boolean = $input.data('casted') && !hasEmpty;
            if (isCasting) {
                const cols: string[] = args[i].split(",");
                let casting: boolean = false;
                for (let j = 0; j < cols.length; j++) {
                    const progCol: ProgCol = self.model.getColumnByName(cols[j]);
                    if (progCol != null) {
                        const castType: string = $input.data('casttype');
                        if (castType !== progCol.getType() && !casting) {
                            casting = true;
                            colTypeInfos.push({
                                "type": castType,
                                "argNum": i
                            });
                        }
                    } else {
                        console.error("Cannot find col", args[i]);
                    }
                }

            }
        });

        return colTypeInfos;
    }

    protected _handleInvalidArgs(
        isInvalidColType: boolean,
        $errorInput: JQuery,
        errorText: string,
        groupNum?: number,
        allColTypes?: string[],
        inputsToCast?: number[]
    ): void {
        const self = this;
        if (isInvalidColType) {
            const castIsVisible: boolean = this._$panel.find('.group').eq(groupNum)
                                                .find('.cast')
                                                .hasClass('showing');
            this._showCastRow(allColTypes, groupNum, inputsToCast)
            .then(function() {
                if (!castIsVisible) {
                    const $castDropdown: JQuery = $errorInput.closest('.inputWrap')
                                        .siblings('.cast')
                                        .find('.dropDownList:visible');
                    if ($castDropdown.length) {
                        $errorInput = $castDropdown.find('input');
                    }
                    self._statusBoxShowHelper(errorText, $errorInput, 500);
                }
            });
            if (castIsVisible) {
                const $cast: JQuery = $errorInput.closest(".inputWrap").siblings(".cast");
                $cast.addClass("noAnim");
                const $castDropdown: JQuery = $cast.find('.dropDownList:visible');
                if ($castDropdown.length) {
                    $errorInput = $castDropdown.find('input');
                }
                self._statusBoxShowHelper(errorText, $errorInput, 500);
            }
        } else {
            self._resetCastOptions($errorInput);
            self._updateStrPreview();
            self._statusBoxShowHelper(errorText, $errorInput);
        }
    }

    protected _showCastRow(
        allColTypes: string[],
        groupNum: number,
        inputsToCast: number[]
    ): XDPromise<any> {
        const self = this;
        const deferred = PromiseHelper.deferred();
        this._getProperCastOptions(allColTypes);

        const isCastAvailable: boolean = this._displayCastOptions(allColTypes, groupNum, inputsToCast);
        this._$panel.find('.cast .list li').show();

        if (isCastAvailable) {
            const $castable: JQuery = this._$panel
                            .find('.cast .dropDownList:not(.hidden)').parent();
            $castable.addClass('showing');
            this._$panel.find('.group').eq(groupNum)
                            .find('.cast .dropDownList:not(.colNameSection)')
                            .removeClass('hidden');

            setTimeout(function() {
                if (self._$panel.find('.cast.showing').length) {
                    $castable.addClass('overflowVisible');
                }

                deferred.resolve();
            }, 250);
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    protected _getProperCastOptions(allColTypes: string[]): void {
        let inputColTypes;
        let requiredTypes: string[];
        let inputNum: number;
        let castTypes: string[];
        for (let i = 0; i < allColTypes.length; i++) {
            inputColTypes = allColTypes[i];
            inputNum = inputColTypes.inputNum;
            if (inputNum === undefined) {
                return;
            }
            // this wil hold the valid column types that the current input can
            // be casted to
            inputColTypes.filteredTypes = [];
            requiredTypes = inputColTypes.requiredTypes;

            // check if each valid column type can be applied to the current
            // column type that is in the input
            for (let j = 0; j < requiredTypes.length; j++) {
                let isValid = true;
                for (let k = 0; k < inputColTypes.inputTypes.length; k++) {
                    castTypes = GeneralOpPanel.castMap[inputColTypes.inputTypes[k]];
                    if (!castTypes ||
                        castTypes.indexOf(requiredTypes[j]) === -1) {
                        isValid = false;
                        break;
                    }
                }

                if (isValid) {
                    inputColTypes.filteredTypes.push(requiredTypes[j]);
                }
            }
        }
    }

    protected _displayCastOptions(
        allColTypes,
        groupNum: number,
        inputsToCast: number[]
    ): boolean {
        const $castWrap: JQuery = this._$panel.find('.group').eq(groupNum)
                                                        .find('.cast');
        const $castDropdowns: JQuery = $castWrap.find('.dropDownList');
        $castDropdowns.addClass('hidden');
        let lis: HTML;
        let castAvailable: boolean = false;
        let inputNum: number;
        for (let i = 0; i < allColTypes.length; i++) {
            if (allColTypes[i].filteredTypes &&
                allColTypes[i].filteredTypes.length &&
                inputsToCast.indexOf(allColTypes[i].inputNum) > -1) {
                castAvailable = true;
                lis = "<li class='default'>default</li>";
                inputNum = allColTypes[i].inputNum;
                $castDropdowns.eq(inputNum).removeClass('hidden');
                for (let j = 0; j < allColTypes[i].filteredTypes.length; j++) {
                    lis += "<li>" + allColTypes[i].filteredTypes[j] + "</li>";
                }
                $castDropdowns.eq(inputNum).find('ul').html(lis);
            }
        }
        return (castAvailable);
    }

    // $input is an $argInput
    protected _resetCastOptions($input: JQuery): void {
        $input.closest('.inputWrap').next().find('input').val('default')
                                                .attr("data-casted", <any>false);
        $input.data('casted', false);
        $input.data('casttype', null);
    }

    protected _hideCastColumn(groupIndex?: number): void {
        let $target: JQuery;
        if (groupIndex != null) {
            $target = this._$panel.find('.group').eq(groupIndex)
                                  .find(".argsSection").last();
        } else {
            $target = this._$panel;
        }
        $target.find('.cast').removeClass('showing overflowVisible');
    }

    protected _checkIfBlanksAreValid(invalidInputs: JQuery[]): boolean {
        let hasValidBlanks: boolean = true;
        this._$panel.find('.arg').each(function() {
            const $input: JQuery = $(this);
            let val: string = $input.val().trim();
            let untrimmedVal: string = $input.val();
            if (val === gColPrefix || val === gAggVarPrefix) {
                // the prefix only without escaping is invalid,
                // handle it as empty val
                val = "";
                untrimmedVal = "";
            }

            if (val !== "") {
                // not blank so no need to check. move on to next input.
                return;
            }
            const $row: JQuery = $input.closest('.row');
            const noArgsChecked: boolean = $row.find('.noArg.checked').length > 0 ||
                                ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
            const emptyStrChecked: boolean = $row.find('.emptyStr.checked').length > 0;
            const hasEmptyStrCheckedOption: boolean = $row.find('.emptyStr').length > 0;

            if (noArgsChecked || emptyStrChecked) {
                // blanks are ok
            } else if (untrimmedVal.length === 0 || !hasEmptyStrCheckedOption) {
                hasValidBlanks = false;
                invalidInputs.push($input);
                // stop iteration
                return false;
            }
        });

        return (hasValidBlanks);
    }

    protected _handleInvalidBlanks(invalidInputs: JQuery[]): void {
        const $input: JQuery = invalidInputs[0];
        const hasEmptyOption: boolean | number = !$input.closest('.colNameSection').length &&
                            (!$input.closest(".required").length ||
                                $input.closest(".row").find(".emptyStr").length);
        let errorMsg: string;
        if (hasEmptyOption) {
            this._showEmptyOptions($input);
            errorMsg = ErrTStr.NoEmptyOrCheck;
        } else {
            errorMsg = ErrTStr.NoEmpty;
        }
        this._statusBoxShowHelper(errorMsg, $input);
    }


    // looks for columnNames and figures out column type
    protected _getColumnTypeFromArg(value: string): string {
        // if value = "col1, col2", it only check col1
        value = value.split(",")[0];
        const valSpacesRemoved: string = jQuery.trim(value);
        if (valSpacesRemoved.length > 0) {
            value = valSpacesRemoved;
        }
        let colType: string = null;
        const progCol: ProgCol = this.model.getColumnByName(value);
        if (progCol != null) {
            colType = progCol.getType();
            if (colType === ColumnType.integer && !progCol.isKnownType()) {
                // for fat potiner, we cannot tell float or integer
                // so for integer, we mark it
                colType = ColumnType.number;
            }
        }

        return colType;
    }

    protected _getAllColumnTypesFromArg(argValue): string[] {
        const self = this;
        const values: string[] = argValue.split(",");
        const types: string[] = [];

        values.forEach(function(value: string) {
            const trimmedVal: string = value.trim();
            if (trimmedVal.length > 0) {
                value = trimmedVal;
            }

            const progCol: ProgCol = self.model.getColumnByName(value);
            if (progCol == null) {
                console.error("cannot find col", value);
                return;
            }

            // const backName = progCol.getBackColName();
            let colType: string = progCol.getType();
            if (colType === ColumnType.integer && !progCol.isKnownType()) {
                // for fat potiner, we cannot tell float or integer
                // so for integer, we mark it
                colType = ColumnType.number;
            }

            types.push(colType);
        });

        return types;
    }

    // used for args with column names provided like $col1, and not "hey" or 3
    protected _validateColInputType(
        requiredTypes: string[],
        inputType: string,
        $input: JQuery
    ): string {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            return null;
        } else if (requiredTypes.includes(inputType)) {
            return null;
        } else if (inputType === ColumnType.number &&
                    (requiredTypes.includes(ColumnType.float) ||
                        requiredTypes.includes(ColumnType.integer))) {
            return null;
        } else if (inputType === ColumnType.string &&
                    this._hasUnescapedParens($input.val())) {
            // function-like string found but invalid format
            return ErrTStr.InvalidFunction;
        } else {
            return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                "type1": requiredTypes.join("/"),
                "type2": inputType
            });
        }
    }

    // used for non column name args such as "hey" or 3, not $col1
    // returning null means no problem found
    // returning an object means there was a type mismatch
    protected _checkArgTypes(arg: string, typeid: number) {
        const types: string[] = this._parseType(typeid);
        let argType: string = "string";

        if (types.indexOf(ColumnType.string) > -1 ||
            types.indexOf(ColumnType.mixed) > -1)
        {
            // if it accepts string/mixed, any input should be valid
            return null;
        }

        let tmpArg: string | number = arg.toLowerCase();
        const isNumber: boolean = !isNaN(Number(arg));
        let canBeBooleanOrNumber: boolean = false;

        // boolean is a subclass of number
        if (tmpArg === "true" || tmpArg === "false" ||
            tmpArg === "t" || tmpArg === "f" || isNumber)
        {
            canBeBooleanOrNumber = true;
            argType = "string/boolean/integer/float";
        }

        if (types.indexOf(ColumnType.boolean) > -1) {
            // if arg doesn't accept strings but accepts booleans,
            // then the provided value needs to be a booleanOrNumber
            if (canBeBooleanOrNumber) {
                return null;
            } else {
                return {
                    "validType": types,
                    "currentType": argType
                };
            }
        }

        // the remaining case is float and integer, both is number
        tmpArg = Number(arg);

        if (!isNumber) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        if (types.indexOf(ColumnType.float) > -1) {
            // if arg is integer, it could be a float
            return null;
        }

        if (types.indexOf(ColumnType.integer) > -1) {
            if (tmpArg % 1 !== 0) {
                return {
                    "validType": types,
                    "currentType": ColumnType.float
                };
            } else {
                return null;
            }
        }

        if (types.length === 1 && types[0] === ColumnType.undefined) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        return null; // no known cases for this
    }

    protected _showEmptyOptions($input: JQuery): void {
        $input.closest('.row').find('.noArgWrap, .emptyStrWrap').removeClass('xc-hidden');
    }

    protected _hideEmptyOptions($input: JQuery): void {
        $input.closest('.row').find('.checkboxWrap').addClass('xc-hidden')
                                .find('.checkbox').removeClass('checked');
    }

    protected _addBoolCheckbox($input: JQuery): void {
        $input.closest(".row").addClass("boolOption").find(".inputWrap")
                                                        .addClass("semiHidden");
        const html: HTML = '<div class="checkboxWrap boolArgWrap">' +
                        '<span class="checkbox boolArg" >'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                    '</div>';
        $input.closest(".row").append(html);
    }

    protected _formatArgumentInput(
        value: string,
        typeid: number,
        existingTypes: object
    ) {
        const strShift: number = 1 << DfFieldTypeT.DfString;
        const numberShift: number =
                        (1 << DfFieldTypeT.DfInt32) |
                        (1 << DfFieldTypeT.DfUInt32) |
                        (1 << DfFieldTypeT.DfInt64) |
                        (1 << DfFieldTypeT.DfUInt64) |
                        (1 << DfFieldTypeT.DfFloat32) |
                        (1 << DfFieldTypeT.DfFloat64);
        const boolShift: number = 1 << DfFieldTypeT.DfBoolean;

        // when field accept
        let shouldBeString: boolean = (typeid & strShift) > 0;
        const shouldBeNumber: boolean = (typeid & numberShift) > 0;
        const shouldBeBoolean: boolean = (typeid & boolShift) > 0;
        let isNumberAsString: boolean;
        let isBoolAsString: boolean;

        if (shouldBeString) {
            // handle edge case
            const parsedVal: number = parseFloat(value);
            if (!isNaN(parsedVal) &&
                parsedVal === Number(value) &&
                shouldBeNumber)
            {
                // the case that the field accepts both string and number and
                // it fills in a number, should depends on the existingTypes

                // XXX potential bug is that existingTypes
                // has both string and number
                shouldBeString = existingTypes.hasOwnProperty(ColumnType.string);
                if (!shouldBeString) {
                    // when its number
                    value = <any>parsedVal;
                }
            } else if (this._isNumberInQuotes(value)) {
                if (shouldBeNumber) {
                    isNumberAsString = true;
                }
                // keep value as is
            } else if (this._isBoolInQuotes(value)) {
                if (shouldBeBoolean) {
                    isBoolAsString = true;
                }
            } else if (shouldBeBoolean) {
                const valLower = ("" + value).toLowerCase();
                if (valLower === "true" || valLower === "false") {
                    shouldBeString = false;
                }
            }
        }

        value = this._parseAggPrefixes(value);
        value = this._parseColPrefixes(value);
        if (shouldBeString) {
            if (!isNumberAsString && !isBoolAsString) {
                // add quote if the field support string
                value = "\"" + value + "\"";
                // stringify puts in too many slashes
            }
        } else if (shouldBeNumber) {
            const tempValue = "" + value; // Force string to provide indexOf
            if (tempValue.indexOf(".") === 0) {
                value = "0" + value;
            }
        } else {
            if (typeof value === ColumnType.string) {
                value = value.trim();
            }
        }

        return ({value: value, isString: shouldBeString});
    }

    protected _parseType(typeId: number): ColumnType[] {
        const types: ColumnType[] = [];
        let typeShift: number;

        // string
        typeShift = 1 << DfFieldTypeT.DfString;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.string);
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.integer);
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.float);
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.boolean);
        }

        // timestamp
        typeShift = 1 << DfFieldTypeT.DfTimespec;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.timestamp);
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.mixed);
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.undefined);
        }

        return (types);
    }

    protected _fillInputPlaceholder(): void {
        const $inputs: JQuery = this._$panel.find('.autocomplete');
        $inputs.each(function() {
            const placeholderText: string = $(this).siblings('.list').find('li')
                                            .eq(0).text();
            $(this).attr('placeholder', placeholderText);
        });
    }

    protected _listHighlightListener(event: JQueryEventObject): void {
        const $list: JQuery = this._$panel.find('.functionsList')
                                  .find('.list:visible');
        if ($list.length !== 0) {
            const $input: JQuery = $list.siblings('input');
            switch (event.which) {
                case (keyCode.Down):
                case (keyCode.Up):
                    this._formHelper.listHighlight($input, event);
                    break;
                case (keyCode.Right):
                    $input.trigger(fakeEvent.enter);
                    break;
                case (keyCode.Enter):
                    if (!$input.is(':focus')) {
                        event.stopPropagation();
                        event.preventDefault();
                        $input.trigger(fakeEvent.enter);
                    }
                    break;
                case (keyCode.Tab):
                    this._hideDropdowns();
                    break;
                default:
                    break;
            }
        } else {
            if (event.which === keyCode.Tab) {
                this._hideDropdowns();
            }
        }
    }

    protected _hasFuncFormat(val: string): boolean {
        if (typeof val !== ColumnType.string) {
            return false;
        }
        val = val.trim();
        const valLen: number = val.length;

        if (valLen < 3) { // must be at least this long: a()
            return false;
        }

        //check if has opening and closing parens
        if (val.indexOf("(") > -1 && val.indexOf(")") > -1) {
            // check that val doesnt start with parens and that it does end
            // with parens
            if (val.indexOf("(") !== 0 &&
                val.lastIndexOf(")") === (valLen - 1)) {
                return (xcHelper.checkMatchingBrackets(val).index === -1);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // checks to see if value has at least one parentheses that's not escaped
    // or inside quotes
    protected _hasUnescapedParens(val: string): boolean {
        let inQuotes: boolean = false;
        for (let i = 0; i < val.length; i++) {
            if (inQuotes) {
                if (val[i] === '"') {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === "(" || val[i] === ")") {
                return (true);
            }
        }
        return (false);
    }

    protected _parseColPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gColPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                } else if (this._isActualPrefix(str, i)) {
                    str = str.slice(0, i) + str.slice(i + 1);
                }
            }
        }
        return (str);
    }

    protected _parseAggPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gAggVarPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                }
            }
        }
        return (str);
    }

    // returns true if previous character, not including spaces, is either
    // a comma, a (, or the very beginning
    protected _isActualPrefix(str: string, index: number): boolean {
        for (let i = index - 1; i >= 0; i--) {
            if (str[i] === ",") {
                return (true);
            } else if (str[i] === "(") {
                return (true);
            } else if (str[i] !== " ") {
                return (false);
            }
        }
        return (true);
    }

    protected _resetForm(): void {
        // clear function list input
        this._$panel.find('.functionsInput').attr('placeholder', "")
                                                .data("value", "")
                                                .val("");
        // clear functions list menu
        this._$panel.find('.genFunctionsMenu').data('category', 'null');

            // clear function description text
        this._$panel.find('.descriptionText').empty();

        // hide cast dropdownlists
        // this._$panel.find('.cast').find('.dropDownList')
        //                                 .addClass('hidden');
        // this._hideCastColumn();

        this._$panel.find('.argsSection').last().addClass('inactive');
        // empty all checkboxes except keeptable checkbox
        this._$panel.find(".checkbox").filter(function() {
            return !$(this).parent().hasClass("keepTable");
        }).removeClass("checked");


        this._$panel.find('.arg').val("");

        // remove "additional arguments" inputs
        this._$panel.find('.extraArg').remove();

        // for filter, unminimize first argument box
        this._$panel.find('.group').removeClass('minimized fnInputEmpty');

        // clear string preview
        this._$panel.find('.strPreview').empty();

        // empty list scrollers and associated suggest lists
        this._suggestLists = [[]];
        const numFnScrollers: number = this._functionsListScrollers.length;
        this._functionsListScrollers.splice(1, numFnScrollers - 1);
        this._allowInputChange = true;
    }

    protected _getArgHtml(): HTML {
        const html =
            '<div class="row clearfix">' +
                '<div class="description"></div>' +
                '<div class="inputWrap">' +
                    '<div class="dropDownList">' +
                        '<input class="arg" type="text" tabindex="10" ' +
                        'spellcheck="false" data-typeid="-1" ' +
                        'data-casted="false" data-casttype="null">' +
                        '<i class="icon xi-arrow-down colNameMenuIcon"></i>' +
                        '<div class="list hint new">' +
                            '<ul></ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="cast new">' +
                    '<span class="label">Cast: </span>' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list"></ul>' +
                    '</div>' +
                '</div>' +
                '<div class="emptyOptions">' +
                    '<div class="checkboxWrap xc-hidden noArgWrap" ' +
                        'data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        OpModalTStr.NoneHint + '">' +
                        '<span class="checkbox noArg" >'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                        '<span class="checkboxText">' +
                        OpModalTStr.NoneArg +
                        '</span>' +
                    '</div>' +
                    '<div class="checkboxWrap xc-hidden emptyStrWrap" ' +
                        'data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        OpModalTStr.EmptyStringHint + '">' +
                        '<span class="checkbox emptyStr">'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                        OpModalTStr.EmptyString +
                    '</div>' +
                '</div>' +
            '</div>';
        return (html);
    }

    // $group is optional, will minimize all groups if not passed in
    protected _minimizeGroups($group?: JQuery): void {
        if (!$group) {
            this._$panel.find('.group').each(function () {
                const $group: JQuery = $(this);
                if ($group.hasClass('minimized')) {
                    return;
                }
                const numArgs: number = $group.find('.arg').length;
                $group.attr('data-numargs', numArgs);
                $group.addClass('minimized');
                if ($group.find('.functionsInput').val().trim() === "") {
                    $group.addClass('fnInputEmpty');
                }
            });
        } else {
            const numArgs: number = $group.find('.arg').length;
            $group.attr('data-numargs', numArgs);
            $group.addClass('minimized');
            if ($group.find('.functionsInput').val().trim() === "") {
                $group.addClass('fnInputEmpty');
            }
        }
    }

    protected _removeGroup($group: JQuery, all?: boolean): void {
        const index: number = this._$panel.find('.group').index($group);
        $group.remove();
        if (!all) {
            this._$panel.find('.group').each(function(i){
                const $group = $(this);
                $group.find('.functionsList').data('fnlistnum', i);
                $group.find('.functionsInput').data('fninputnum', i);
                $group.find('.genFunctionsMenu ul').data('fnmenunum', i);
            });
        }
        this._functionsListScrollers.splice(index, 1);
        this._suggestLists.splice(index, 1);
        this._$panel.find(".aggColStrWrap").last().remove();
    }

    protected _isArgAColumn(arg: string) {
        return (isNaN(<any>arg) &&
                arg.indexOf("(") === -1 &&
                arg !== "true" && arg !== "false" &&
                arg !== "t" && arg !== "f");
    }

    protected _populateInitialCategoryField(): void {}

    protected _render(): void {}

    protected _getOperatorsLists(): any[][] {
        const self = this;
        const opLists: any[][] = [];
        this._opCategories.forEach(categoryNum => {
            const ops = self._operatorsMap[categoryNum];
            const opsArray = [];
            for (let i in ops) {
                opsArray.push(ops[i]);
            }

            opsArray.sort(sortFn);
            opLists.push(opsArray);
        });
        function sortFn(a, b){
            return (a.displayName) > (b.displayName) ? 1 : -1;
        }
        return opLists;
    }

    protected columnPickerCallback($tableCell: JQuery) {
        const options: any = {};
        const $focusedEl: JQuery = $(document.activeElement);
        if (($focusedEl.is("input") &&
            !$focusedEl.is(this._$lastInputFocused)) ||
            this._$lastInputFocused.closest(".semiHidden").length) {
            return;
        }
        if (this._$lastInputFocused.closest(".row")
                                .siblings(".addArgWrap").length
            || this._$lastInputFocused.hasClass("variableArgs")) {
            options.append = true;
        }
        if (xcHelper.fillInputFromCell($tableCell, this._$lastInputFocused,
                                    gColPrefix, options)) {
            this._onArgChange(this._$lastInputFocused);
        }
    }

    protected _restoreBasicModeParams() {
        return this.model.restoreBasicModeParams(this._editor);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.model.switchMode(toAdvancedMode, this._editor);
    }

    protected _checkPanelOpeningError() {
        if (this.model.modelError) {
            this._startInAdvancedMode();
            MainMenu.checkMenuAnimFinish()
            .then(() => {
                StatusBox.show(this.model.modelError,
                            this._$panel.find(".advancedEditor"),
                            false, {'side': 'right'});
            });

            this._dagNode.beErrorState(this.model.modelError);
        }
    }

    // currently used when opening model with invalid args
    protected _startInAdvancedMode() {
        this._updateMode(true);
        const paramStr = JSON.stringify(this._dagNode.getParam(), null, 4);
        this._editor.setValue(paramStr);
    }
}