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
            const matches = $searchableFields.filter((_index, el) => {
                return $(el).text().toLowerCase().includes(keyword);
            }).toArray();

            // find the one in view as first
            let startIndex: number = 0;
            const $container: JQuery = DagView.getActiveArea();
            matches.forEach((el, index) => {
                const $match: JQuery = $(el);
                if (DagUtil.isInView($match, $container)) {
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
                const $container: JQuery = $match.closest(".dataflowArea");
                DagUtil.scrollIntoView($match, $container);
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