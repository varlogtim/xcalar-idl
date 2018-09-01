class RowInput {
    private $rowInputSection: JQuery;
    private rowManager: RowManager;

    public constructor(rowManager: RowManager) {
        this.rowManager = rowManager;
        this.$rowInputSection = $(this._genHTML());
        this._addEventListerners();
    }

    /**
     * Clear Row Input
     */
    public clear(): void {
        this.$rowInputSection.remove();
    }

    /**
     * Render Row Input
     * @param $container
     */
    public render($container: JQuery): void {
        $container.empty().append(this.$rowInputSection);
    }

    /**
     * Skip to a row
     * @param rowNum
     */
    public skipTo(rowNum: number): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.val(rowNum);
        $rowInput.trigger(fakeEvent.enter, true);
    }

    /**
     * Set row num
     */
    public setRowNum(val: number): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.val(val).data("val", val);
    }

    /**
     * Update the row number
     */
    public genFirstVisibleRowNum(): void {
        const firstRowNum: number = this.rowManager.getFirstVisibleRowNum();
        if (firstRowNum !== null) {
            this.setRowNum(firstRowNum);
        }
    }

    /**
     * Update the row input element size
     * @param totalRows
     */
    public updateTotalRows(totalRows: number): void {
        this.$rowInputSection.find(".totalRows").text(xcHelper.numToStr(totalRows));
        let inputWidth: number = 50;
        const numDigits: number = ("" + totalRows).length;
        inputWidth = Math.max(inputWidth, 10 + (numDigits * 8));
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.width(inputWidth);
        if (totalRows > Number($rowInput.attr('size'))) {
            $rowInput.attr({
                'maxLength': totalRows,
                'size': totalRows
            });
        }
    }

    // XXX TODO, remove the id numPages after sql test get fixed
    private _genHTML(): string {
        const html: string = 
            '<label>Skip to rows</label>' +
            '<input type="number" min="0"  step="1" spellcheck="false">' +
            '<label id="numPages">of <span class="totalRows"></span></label>';
        return html;
    }

    private _getRowInput(): JQuery {
        return this.$rowInputSection.filter("input");
    }

    private _addEventListerners(): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.blur(() => {
            $rowInput.val($rowInput.data("val"));
        });

        $rowInput.keypress((event, noScrollBar) => {
            if (event.which !== keyCode.Enter) {
                return;
            }

            const rowManager: RowManager = this.rowManager;
            if (!rowManager.canScroll()) {
                return;
            }

            const curRow: number = this._getRowNum();
            let targetRow: number = Number($rowInput.val());
            const backRow: number = targetRow;
            let canScroll: boolean;
            [targetRow, canScroll] = rowManager.normalizeRowNum(targetRow);
            if (!canScroll) {
                this.setRowNum(targetRow == null ? curRow : targetRow);
                return;
            } else {
                this.setRowNum(targetRow);
                const rowOnScreen: number = rowManager.getLastVisibleRowNum() - curRow + 1;
                rowManager.skipToRow(backRow, targetRow, rowOnScreen, noScrollBar)
                .always(() => {
                    this.genFirstVisibleRowNum();
                });
            }
        });
    }

    private _getRowNum(): number {
        const $rowInput: JQuery = this._getRowInput();
        return Number($rowInput.data("val"));
    }
}