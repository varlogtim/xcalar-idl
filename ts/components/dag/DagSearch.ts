class DagSearch {
    private static _instance: DagSearch;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _setup: boolean;
    private _searchHelper: SearchBar;

    private constructor() {
        this._setup = false;
    }

    public setup(): void {
        if (this._setup) {
            return;
        }
        this._setupSearchHelper();
        this._addEventListeners();
        this._setup = true;
    }

    public update(): void {
        const $dfArea: JQuery = DagViewManager.Instance.getActiveArea();
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
            const matches = this._getMatches(keyword);
            // find the one in view as first
            let startIndex: number = 0;
            const $container: JQuery = DagViewManager.Instance.getActiveArea();
            matches.forEach((el, index) => {
                let $match: JQuery = $(el);
                if (DagUtil.isInView($match, $container)) {
                    startIndex = index;
                    return false; // stop loop
                }
            });
            const reorderMatches = matches.slice(startIndex).concat(matches.slice(0, startIndex));
            const $matches: JQuery = $(reorderMatches);

            this._searchHelper.updateResults($matches);
            this._clearSearhHighlightInDagView(DagViewManager.Instance.getActiveArea());
            if ($matches.length !== 0) {
                let $searchToFocus: JQuery = $matches.eq(0);
                this._searchHelper.scrollMatchIntoView($searchToFocus);
                this._searchHelper.highlightSelected($searchToFocus);
            }
        }
    }

    private _getMatches(keyword: string): Element[] {
        let matches: Element[] = [];
        try {
            keyword = keyword.toLowerCase();
            let graph: DagGraph = DagViewManager.Instance.getActiveDag();
            let dagView: DagView = DagViewManager.Instance.getActiveDagView();
            let checkHint: boolean = UserSettings.getPref("dfConfigInfo");
            graph.getAllNodes().forEach((node: DagNode, nodeId: DagNodeId) => {
                let $node = dagView.getNodeElById(nodeId);
                if (node.getTitle().toLowerCase().includes(keyword)) {
                    // title
                    matches.push($node.find(".nodeTitle").get(0));
                }
                if (checkHint &&
                    node.getParamHint().fullHint.toLowerCase().includes(keyword)
                ) {
                    // hint
                    matches.push($node.find(".paramTitle").get(0));
                }
                if (node.getDisplayNodeType().toLowerCase().includes(keyword)) {
                    matches.push($node.find(".opTitle").get(0));
                }
            });
        } catch (e) {
            console.error(e);
        }
        return matches;
    }

    private _clearSearch(): void {
        this._clearSearhHighlightInDagView(DagViewManager.Instance.getActiveArea());
        this._searchHelper.clearSearch();
    }

    private _clearSearhHighlightInDagView($dfArea: JQuery): void {
        let selector: string = this._getHighlightSelector();
        $dfArea.find(selector).removeClass("highlight");
    }

    private _getSearchArea(): JQuery {
        return $("#dagSearch");
    }

    private _getHighlightSelector(): string {
        return ".paramTitle, .nodeTitle, .opTitle";
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
                this._clearSearhHighlightInDagView(DagViewManager.Instance.getActiveArea());
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
                        DagViewManager.Instance.getActiveArea().length
                    ) {
                        if ($("input:focus").length || $("textarea:focus").length ||
                            $('[contentEditable="true"]').length) {
                            // do not open if we're focused on another input, such
                            // as codemirror
                            return;
                        }
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