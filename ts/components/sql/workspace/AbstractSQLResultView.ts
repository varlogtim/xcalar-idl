abstract class AbstractSQLResultView {
    protected _container: string;

    public constructor(container: string) {
        this._container = container;
    }

    protected _getContainer(): JQuery {
        return $("#" + this._container);
    }

    protected _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    protected _getMainSection(): JQuery {
        return this._getContainer().find(".mainSection");
    }

    protected _getMainContent(): JQuery {
        return this._getMainSection().find(".content");
    }

    protected _getSearchInput(): JQuery {
        return this._getTopSection().find(".searchbarArea input");
    }

    protected _filterTables(): void {
        const $input = this._getSearchInput();
        const $rows = this._getMainContent().find(".row");
        let keyword: string = $input.val().trim();
        if (!keyword) {
            $rows.removeClass("xc-hidden");
            return;
        }

        keyword = keyword.toLowerCase();
        $rows.each((_index, el) => {
            const $row = $(el);
            if ($row.find(".name").text().toLowerCase().includes(keyword)) {
                $row.removeClass("xc-hidden");
            } else {
                $row.addClass("xc-hidden");
            }
        });
    }

    protected _addEventListeners(): void {
        const $topSection = this._getTopSection();
        $topSection.find(".searchbarArea input").on("input", () => {
            this._filterTables();
        });
    }

    protected _addResizeEvent($section: JQuery): void {
        // resizable left part of a column
        let $prev: JQuery = null;
        const minWidth: number = 80;
        let lastLeft: number = 0;
        let colW: number = 0;
        let preColW: number = 0;

        $section.resizable({
            handles: "w",
            minWidth: minWidth,
            alsoResize: $prev,
            start: (_event, ui) => {
                $prev = $section.prev();
                lastLeft = ui.position.left;
                colW = $section.outerWidth();
                preColW = $prev.outerWidth();
                this._getMainSection().addClass("resizing");
            },
            resize: (_event, ui) => {
                let left: number = ui.position.left;
                let delta: number = left - lastLeft;
                let sectionW: number = colW - delta;
                let prevWidth: number = preColW + delta;
                if (sectionW <= minWidth) {
                    sectionW = minWidth;
                    prevWidth = colW + preColW - sectionW;
                } else if (prevWidth <= minWidth) {
                    prevWidth = minWidth;
                    sectionW = colW + preColW - prevWidth;
                }

                $prev.outerWidth(prevWidth);
                $section.outerWidth(sectionW);
                $section.css("left", 0);

                let rowWidth: number[] = this._getColumnsWidth($section.closest(".row"));
                this._resizeColums(rowWidth, false);
            },
            stop: () => {
                this._getMainSection().removeClass("resizing");
                let rowWidth: number[] = this._getColumnsWidth($section.closest(".row"));
                this._resizeColums(rowWidth, true);
            }
        });
    }

    protected _getColumnsWidth($row: JQuery): number[] | null {
        let $columns: JQuery = $row.find("> div");
        if ($columns.length === 0) {
            return null;
        }
        let rowWidth: number[] = [];
        $columns.each((_index, el) => {
            rowWidth.push($(el).outerWidth());
        });
        return rowWidth;
    }

    protected _resizeColums(rowWidth: number[] | null, percentage: boolean): void {
        if (rowWidth == null) {
            return;
        }
        let $section = this._getMainSection();
        let total: number = rowWidth.reduce((total, width) => total + width, 0);
        $section.find(".row").each((_inex, el) => {
            let $row = $(el);
            $row.find("> div").each((index, el) => {
                let width = percentage
                ? rowWidth[index] / total * 100 + "%"
                : rowWidth[index];
                $(el).outerWidth(width);
            });
        });
    }
}