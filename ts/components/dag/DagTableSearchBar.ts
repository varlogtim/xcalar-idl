class DagTableSearchBar {
    private _container: string;
    private _searchHelper: SearchBar;

    public constructor(container: string) {
        this._container = container;
        this._toggleSearchOptions(true); // hide options by default
        this._setupSearchHelper();
        this._addEventListeners();
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getSearchArea(): JQuery {
        return this._getContainer().find(".searchbarArea");
    }

    private _toggleSearchOptions(toHide: boolean) {
        const $searchArea: JQuery = this._getSearchArea();
        const $options: JQuery = $searchArea.find(".position, .counter, .arrows");
        if (toHide) {
            $options.addClass("xc-hidden");
        } else {
            $options.removeClass("xc-hidden");
        }
    }

    private _clearnHightInCell(): void {
        $(".xcTable:visible").find(".selectedCell").removeClass("selectedCell");
    }

    private _clearSearch(): void {
        this._toggleSearchOptions(true);
        this._clearnHightInCell();
        this._searchHelper.clearSearch();
    }

    private _searchColNames(keyword: string): void {
        keyword = keyword.trim().toLowerCase();
        if (keyword === "") {
            this._clearSearch();
        } else {
            this._toggleSearchOptions(false);
            // search column headers
            const $searchableFields: JQuery = $(".xcTableWrap:visible").find(".editableHead");
            const $matchedInputs: JQuery = $searchableFields.filter((_index, el) => {
                return $(el).val().toLowerCase().indexOf(keyword) !== -1;
            });
            const $matches: JQuery = $matchedInputs.closest('th');
            this._searchHelper.updateResults($matches);
            this._clearnHightInCell();
            if ($matches.length !== 0) {
                this._searchHelper.scrollMatchIntoView($matches.eq(0));
                this._searchHelper.highlightSelected($matches.eq(0));
            }
        }
    }

    private _setupSearchHelper(): void {
        const $searchArea: JQuery = this._getSearchArea();
        this._searchHelper = new SearchBar($searchArea, {
            removeSelected: () => {
                $('.xcTable').find('.selectedCell')
                             .removeClass('selectedCell');
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                             .removeClass('modalHighlighted');
                }
            },
            highlightSelected: ($match) => {
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                                 .removeClass('modalHighlighted');
                }

                TblManager.highlightColumn($match, false);
                TableComponent.empty();
            },
            scrollMatchIntoView: ($match: JQuery) => {
                const $container: JQuery = this._getContainer();
                const $viewWrap = $container.find(".viewWrap");
                try {
                    const matchOffsetLeft: number = $match.offset().left;
                    const bound: ClientRect = $viewWrap[0].getBoundingClientRect();
                    const leftBoundaray: number = bound.left;
                    const rightBoundary: number = bound.right;
                    const matchWidth: number = $match.width();
                    const matchDiff: number = matchOffsetLeft - (rightBoundary - matchWidth);

                    if (matchDiff > 0 || matchOffsetLeft < leftBoundaray) {
                        const scrollLeft: number = $viewWrap.scrollLeft();
                        const viewWidth: number = $viewWrap.width();
                        $viewWrap.scrollLeft(scrollLeft + matchDiff +
                                            ((viewWidth - matchWidth) / 2));
                    }
                } catch (e) {
                    console.error(e);
                }
            },
            $input: $searchArea.find("input"),
            arrowsPreventDefault: true
        });
    }

    private _addEventListeners(): void {
        const $searchArea: JQuery = this._getSearchArea();
        const $input: JQuery = $searchArea.find("input");
        $input.on("input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            this._searchColNames($input.val());
        });

        $input.on("focusout", () => {
            this._clearSearch();
        });
    }
}