class DagSearch {
    private static _instance: DagSearch;
    private _modalHelper: ModalHelper;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _setup: boolean;
    private _searchHelper: SearchBar;
    private _searchModel: DagSearchModel;

    private constructor() {
        this._setup = false;
    }

    /**
     * DagSearch.Instance.setup
     */
    public setup(): void {
        if (this._setup) {
            return;
        }
        let $popUp: JQuery = this._getPopup();
        this._modalHelper = new ModalHelper($popUp, {
            noCenter: true,
            noEnter: true,
            noResize: true,
            noBackground: true,
        });
        this._setupSearch();
        this._addEventListeners();

        const $statusSection: JQuery = $popUp.find(".advanceSection.status");
        const $typeSection: JQuery = $popUp.find(".advanceSection.type");
        this._toggleAdvancedSection($statusSection, false);
        this._toggleAdvancedSection($typeSection, false);
        this._resetFilters($statusSection);
        this._resetFilters($typeSection);
        // select first radio button by default
        $popUp.find(".radioButton").removeClass("active")
        .eq(0).addClass("active");
        this._setup = true;
    }

    /**
     * DagSearch.Instance.show
     */
    public show(): void {
        if (this._getPopup().is(":visible")) {
            return;
        }
        this._modalHelper.setup();
        this._defaultPosition();
        this._getSearchInput().focus();
        this._search(); // trigger search
    }

    /**
     * DagSearch.Instance.switchTab
     */
    public switchTab(): void {
        if (!this._getPopup().is(":visible")) {
            return;
        }
        if (!this._searchModel.isGlobalSearch()) {
            this._search(); // new search when swtich tab
        }
    }

    private _close(): void {
        this._modalHelper.clear();
        this._clearSearch();
        this._getSearchInput().blur();
    }

    private _defaultPosition(): void {
        const $popUp: JQuery = this._getPopup();
        $popUp.css("top", "182px")
              .css("right", "16px")
              .css("left", "auto");
    }

    private _toggleAdvancedSection($section: JQuery, expand: boolean): void {
        let $popUp: JQuery = this._getPopup();
        const oldHeight: number = $section.outerHeight();
        if (expand) {
            $section.addClass("expand");
        } else {
            $section.removeClass("expand");
        }
        const currentHeight: number = $section.outerHeight();
        $popUp.outerHeight($popUp.outerHeight() + currentHeight - oldHeight);
    }

    private _getOptionsFromSection($section: JQuery): DagSearchBasicOption[] {
        return $section.hasClass("status")
        ? this._searchModel.statusOptions
        : this._searchModel.typeOptions;
    }

    private _resetFilters($section: JQuery): void {
        const options: DagSearchBasicOption[] = this._getOptionsFromSection($section);
        this._searchModel.reset(options);
        this._renderAdvancedSection($section);
        this._updateResetButton($section);
    }

    private _updateResetButton($section: JQuery): void {
        const options: DagSearchBasicOption[] = this._getOptionsFromSection($section);
        const hasNoChange: boolean = options.every((option) => option.default === option.checked);
        const $button: JQuery = $section.find(".reset");
        if (hasNoChange) {
            $button.addClass("xc-disabled");
        } else {
            $button.removeClass("xc-disabled");
        }
    }

    private _renderAdvancedSection($section: JQuery): void {
        const options: DagSearchBasicOption[] = this._getOptionsFromSection($section);
        const html: HTML = options.map(this._getAdvanceOptionHTML).join("");
        $section.find(".options").html(html);
    }

    private _getAdvanceOptionHTML(option: DagSearchBasicOption): HTML {
        const {key, checked} = option;
        const html =
            '<div class="checkboxSection cell ' + key + '">' +
                '<div class="checkbox' + (checked ? " checked" : "") +
                '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="text">' +
                    key +
                '</div>' +
            '</div>';
        return html;
    }

    private _checkboxEvent($cell: JQuery): void {
        const $checkbox: JQuery = $cell.find(".checkbox");
        $checkbox.toggleClass("checked");

        const $section: JQuery = $cell.closest(".advanceSection");
        const options: DagSearchBasicOption[] = this._getOptionsFromSection($section);
        const index: number = $cell.index();
        // keep data and UI in synce
        options[index].checked = $checkbox.hasClass("checked");

        this._updateResetButton($section);
        // update search
        this._search();
    }

    private _search(): void {
        try {
            const keyword: string = this._getSearchInput().val().trim();
            if (keyword === "" && !this._searchModel.hasStatusFilter()) {
                // when no status filer options checked and empty serach
                this._clearSearch();
            } else {
                this._clearSearhHighlight();
                const $matches: JQuery = this._searchModel.search(keyword);
                this._searchHelper.updateResults($matches);
                if ($matches.length !== 0) {
                    let $searchToFocus: JQuery = $matches.eq(0);
                    this._searchHelper.scrollMatchIntoView($searchToFocus);
                    this._searchHelper.highlightSelected($searchToFocus);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _getMatchedEl(index: number, switchTab: boolean): JQuery {
        const match: DagSearchEntry = this._searchModel.getMatchedEntry(index);
        if (!match) {
            return $(); // invalid case
        }

        if (switchTab && match.tabId !== DagViewManager.Instance.getActiveTab().getId()) {
            DagTabManager.Instance.switchTab(match.tabId);
        }

        return match.getMatchElement();
    }

    private _clearSearch(): void {
        this._clearSearhHighlight();
        this._searchHelper.clearSearch(undefined, {keepVal: true});
        this._searchModel.clearMatches();
    }

    private _clearSearhHighlight(searchIndex?: number): void {
        this._toggleHighlight(false, searchIndex);
    }

    private _toggleHighlight(highlight: boolean, searchIndex?: number): void {
        if (searchIndex == null) {
            searchIndex = this._searchHelper.getSearchIndex();
        }
        const switchTab: boolean = highlight ? true : false;
        const $match: JQuery = this._getMatchedEl(searchIndex, switchTab);
        if ($match.is("textarea")) {
            // when it's commment box
            if (highlight) {
                $match.addClass("searchHighLight");
            } else {
                $match.removeClass("searchHighLight");
            }
        } else {
            // when it's node
            const isSvgText = $match.is("text");
            const $node = $match.hasClass(".operator")
            ? $match
            : $match.closest(".operator");

            if (highlight) {
                if (isSvgText) {
                    this._drawhHighlightBox($match, "searchHighLight");
                }
                DagView.addSelection($node, "searchHighLightSelection");
            } else {
                if (isSvgText) {
                    $match.siblings("rect.searchHighLight").remove();
                }
                $node.find(".searchHighLightSelection").remove();
            }
        }
    }

    private _drawhHighlightBox($text: JQuery, className: string): void {
        try {
            const text = d3.select(<any>$text[0]);
            const parent = text.select(function() { return this.parentNode; });
            const bbox = text.node().getBBox();

            parent.insert("rect", "text")
            .classed(className, true)
            .attr("x", bbox.x - 8)
            .attr("y", bbox.y)
            .attr("width", bbox.width + 16)
            .attr("height", bbox.height)
            .attr("transform", text.attr("transform"));
        } catch (e) {
            console.error(e);
        }
    }

    private _srcollToMatch(): void {
        const index: number = this._searchHelper.getSearchIndex();
        const $match: JQuery = this._getMatchedEl(index, true);
        const $container: JQuery = $match.closest(".dataflowArea");
        DagUtil.scrollIntoView($match, $container);
    }

    private _getPopup(): JQuery {
        return $("#dagSearch");
    }

    private _getSearchArea(): JQuery {
        return this._getPopup().find(".searchArea");
    }

    private _getSearchInput(): JQuery {
        return this._getSearchArea().find("input");
    }

    private _getStatusOptions(): DagSearchStatusOption[] {
        return [{
            key: "Unconfigured",
            default: false,
            checked: false,
            filter: (node: DagNode) => node.getState() === DagNodeState.Unused
        }, {
            key: DagNodeState.Configured,
            default: false,
            checked: false,
            filter: (node: DagNode) => node.getState() === DagNodeState.Configured
        }, {
            key: DagNodeState.Complete,
            default: false,
            checked: false,
            filter: (node: DagNode) => node.getState() === DagNodeState.Complete
        }, {
            key: DagNodeState.Error,
            default: false,
            checked: false,
            filter: (node: DagNode) => node.getState() === DagNodeState.Error
        }];
    }

    private _getTypeOptions(): DagSearchTypeOption[] {
        return [{
            key: "Configuration",
            default: true,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                if (node.getParamHint().fullHint.toLowerCase().includes(keyword)) {
                    return ($node) => $node.find(".paramTitle");
                } else {
                    return null;
                }
            }
        }, {
            key: "Node Lables",
            default: true,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                if (node.getTitle().toLowerCase().includes(keyword)) {
                    return ($node) => $node.find(".nodeTitle");
                } else {
                    return null;
                }
            }
        }, {
            key: "Node Type",
            default: true,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                if (node.getDisplayNodeType().toLowerCase().includes(keyword)) {
                    return ($node) => $node.find(".opTitle");
                } else {
                    return null;
                }
            }
        }, {
            key: "Description",
            default: false,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                if (node.getDescription().toLowerCase().includes(keyword)
                ) {
                    return ($node) => $node;
                } else {
                    return null;
                }
            }
        }, {
            key: "Parameters",
            default: false,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                const parameters = node.getParameters();
                for (let param of parameters) {
                    if (param.toLowerCase().includes(keyword)) {
                        return ($node) => $node;
                    }
                }
                return null;
            }
        }, {
            key: "Table Name",
            default: false,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                const table: string = node.getTable();
                if (table && table.toLowerCase().includes(keyword)) {
                    return ($node) => $node;
                }
                return null;
        }, {
            key: "Aggregates",
            default: false,
            checked: false,
            selector: (keyword: string, node: DagNode) => {
                const aggregates = node.getAggregates();
                for (let aggragate of aggregates) {
                    if (aggragate.toLowerCase().includes(keyword)) {
                        return ($node) => $node;
                    }
                }
                return null;
            }
        }];
    }

    private _setupSearch(): void {
        const $searchArea: JQuery = this._getSearchArea();
        this._searchHelper = new SearchBar($searchArea, {
            removeSelected: (searchIndex) => {
                this._clearSearhHighlight(searchIndex);
            },
            highlightSelected: () => {
                this._toggleHighlight(true);
            },
            scrollMatchIntoView: () => this._srcollToMatch(),
            $input: $searchArea.find("input"),
            arrowsPreventDefault: true
        });
        this._searchModel = new DagSearchModel({
            statusOptions: this._getStatusOptions(),
            typeOptions: this._getTypeOptions()
        });
    }

    private _addEventListeners(): void {
        $(document).on("keydown.dagSearch", (event) => {
            if ((isSystemMac && event.metaKey) ||
                (!isSystemMac && event.ctrlKey)) {
                    if (letterCode[event.which] !== "f") {
                        return;
                    }

                    if ($("#dagView").is(":visible") &&
                        DagViewManager.Instance.getActiveArea().length
                    ) {
                        if ($("input:focus").length ||
                            $("textarea:focus").length ||
                            $('[contentEditable="true"]').length ||
                            $(".modalBackground:visiable").length
                        ) {
                            // do not open if we're focused on another input, such
                            // as codemirror
                            return;
                        }
                        this.show();
                        event.preventDefault();
                    }
                }
        });

        const $popUp: JQuery = this._getPopup();
        $popUp.find(".close").click(() => {
            this._close();
        });

        $popUp.find(".sectionToggle").click((e) => {
            const $section: JQuery = $(e.currentTarget).closest(".advanceSection");
            const shouldExpand: boolean = !$section.hasClass("expand");
            this._toggleAdvancedSection($section, shouldExpand);
        });

        $popUp.on("click", ".checkboxSection", (event) => {
            const $cell = $(event.currentTarget);
            this._checkboxEvent($cell);
        });

        $popUp.on("click", ".reset", (e) => {
            const $section: JQuery = $(e.currentTarget).closest(".advanceSection");
            this._resetFilters($section);
            this._search(); // update search
        });

        xcUIHelper.optionButtonEvent($popUp.find(".scope .radioButtonGroup"), (option) => {
            this._searchModel.setScope(option);
            this._search(); // update search;
        });

        this._getSearchInput().on("input", () => {
            this._search();
        });
    }
}