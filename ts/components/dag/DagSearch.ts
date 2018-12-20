class DagSearch {
    private static _instance: DagSearch;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _searchHelper: SearchBar;

    private constructor() {}

    public setup(): void {
        this._setupSearchHelper();
        this._addEventListeners();
    }

    public update(): void {
        const $dfArea: JQuery = DagView.getActiveArea();
        this.switchTab($dfArea);
    }

    public switchTab($oldAfArea: JQuery): void {
        const $searchArea: JQuery = this._getSearchArea();
        if (!$searchArea.is(":visible")) {
            return;
        }
        this._clearSearhHighlightInDagView($oldAfArea);
        const keyword: string = $searchArea.find("input").val();
        this._search(keyword);
    }

    private _search(keyword: string): void {
        keyword = keyword.trim();
        if (keyword === "") {
            this._clearSearch();
        } else {
            keyword = keyword.toLowerCase();
            // search tite and hint
            let selector: string = ".nodeTitle";
            if (UserSettings.getPref("dfConfigInfo")) {
                selector += ", .paramTitle";
            }
            const $searchableFields: JQuery = DagView.getActiveArea().find(selector);
            const matches: Element[] = $searchableFields.filter((_index, el) => {
                return $(el).text().toLowerCase().includes(keyword);
            }).toArray();

            // find the one in view as first
            let startIndex: number = 0;
            const $viewWrap: JQuery = DagView.getActiveArea();
            matches.forEach((el, index) => {
                const $match: JQuery = $(el);
                if (this._isInView($match, $viewWrap, false)) {
                    startIndex = index;
                    return false; // stop loop
                }
            });
            const reorderMatches = matches.slice(startIndex).concat(matches.slice(0, startIndex));
            const $matches: JQuery = $(reorderMatches);

            this._searchHelper.updateResults($matches);
            this._clearSearhHighlightInDagView(DagView.getActiveArea());
            if ($matches.length !== 0) {
                let $searchToFocus: JQuery = $matches.eq(0);
                this._searchHelper.scrollMatchIntoView($searchToFocus);
                this._searchHelper.highlightSelected($searchToFocus);
            }
        }
    }

    private _clearSearch(): void {
        this._clearSearhHighlightInDagView(DagView.getActiveArea());
        this._searchHelper.clearSearch();
    }

    private _clearSearhHighlightInDagView($dfArea: JQuery): void {
        const selector: string = ".paramTitle.highlight, .nodeTitle.highlight";
        $dfArea.find(selector).removeClass("highlight");
    }

    private _getSearchArea(): JQuery {
        return $("#dagSearch");
    }

    private _showSearchBar(): void {
        const $searchArea: JQuery = this._getSearchArea();
        $searchArea.removeClass("xc-hidden");
        $searchArea.find("input").focus();
    }

    private _closeSearchBar(): void {
        const $searchArea: JQuery = this._getSearchArea();
        $searchArea.addClass("xc-hidden");
        $searchArea.find("input").blur();
        this._clearSearch();
    }

    // XXX TODO: combine with the scrollMatchIntoView function in DagTabSearchBar
    private _isInView(
        $match: JQuery,
        $viewWrap: JQuery,
        toScroll: boolean
    ): boolean {
        try {
            const matchOffsetLeft: number = $match.offset().left;
            const bound: ClientRect = $viewWrap[0].getBoundingClientRect();
            const leftBoundaray: number = bound.left;
            const rightBoundary: number = bound.right;
            const matchWidth: number = $match.width();
            const matchDiff: number = matchOffsetLeft - (rightBoundary - matchWidth);

            if (matchDiff > 0 || matchOffsetLeft < leftBoundaray) {
                if (toScroll) {
                    const scrollLeft: number = $viewWrap.scrollLeft();
                    const viewWidth: number = $viewWrap.width();
                    $viewWrap.scrollLeft(scrollLeft + matchDiff +
                                            ((viewWidth - matchWidth) / 2));
                }
                return false;
            } else {
                return true;
            }
        } catch (e) {
            return false;
        }
    }

    private _setupSearchHelper(): void {
        const $searchArea: JQuery = this._getSearchArea();
        this._searchHelper = new SearchBar($searchArea, {
            removeSelected: () => {
                this._clearSearhHighlightInDagView(DagView.getActiveArea());
            },
            highlightSelected: ($match) => {
                $match.addClass("highlight");
            },
            scrollMatchIntoView: ($match: JQuery) => {
                const $viewWrap: JQuery = $match.closest(".dataflowArea");
                this._isInView($match, $viewWrap, true);
            },
            $input: $searchArea.find("input"),
            arrowsPreventDefault: true
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
                        DagView.getActiveArea().length
                    ) {
                        this._showSearchBar();
                        event.preventDefault();
                    }
                }
        });

        const $searchArea: JQuery = this._getSearchArea();
        $searchArea.find(".close").click(() => {
            this._closeSearchBar();
        });

        $searchArea.find("input").on("input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            this._search($input.val());
        });
    } 
}