class ColAssignmentView {
    private readonly validTypes: ColumnType[] = [];
    private modelData: ColAssignmentModel;
    private _panelSelector;
    private options;

    public constructor(panelSelector, options?) {
        this._panelSelector = panelSelector;
        this.options = options || {};
        this._setup();
    }

    private _getView() {
        return $(this._panelSelector);
    }
    /**
     *
     * @param dagNode {DagNodeSet} show the view based on the set type node
     */
    public show(
        allColSets: ProgCol[][],
        selectedColSets: {
            sourceColumn: string,
            destColumn: string,
            columnType: ColumnType,
            cast: boolean
        }[][]
    ): ColAssignmentModel {
        this._reset();
        const event: Function = () => { this._render() };
        this.modelData = new ColAssignmentModel(allColSets, selectedColSets,
            event, this.options);
        this._render();
        return this.modelData;
    }

    public setNewModel(allColSets?: ProgCol[][],
        selectedColSets?: {
            sourceColumn: string,
            destColumn: string,
            columnType: ColumnType,
            cast: boolean
        }[][]
    ) {
        const event: Function = () => { this._render() };
        this.modelData = new ColAssignmentModel(allColSets, selectedColSets, event);
        return this.modelData;
    }

    public getModel() {
        return this.modelData.getModel();
    }

    public getParam(): {columns: {
        sourceColumn: string,
        destColumn: string,
        columnType: ColumnType,
        cast: boolean
    }[][]} {
        return this.modelData.getParam();
    }

    private _setup(): void {
        [ColumnType.string, ColumnType.integer, ColumnType.float,
            ColumnType.boolean, ColumnType.mixed].forEach((type) => {
                this.validTypes.push(type);
            });
        this._addEventListeners();
    }

    protected _reset(): void {
        const $view = this._getView();
        $view.find(".listSection").empty();
        $view.find(".searchArea input").val("");
        $view.find(".highlight").removeClass("highlight");
    }


    private _addEventListeners(): void {
        const $section = this._getView();

        $section.on("click.candidateSection", ".candidateSection .inputCol", (event) => {
            const $col: JQuery = $(event.target).closest(".inputCol");
            const listIndex: number = this._getListIndex($col);
            const colIndex: number = this._getColIndex($col);
            this.modelData.addColumn(listIndex, colIndex);
            xcTooltip.hideAll();
        });

        $section.on("click", ".removeColInRow", (event) => {
            const $col: JQuery = $(event.target).closest(".resultCol");
            const colIndex: number = this._getColIndex($col);
            this.modelData.removeColumnForAll(colIndex);
        });

        $section.on("input", ".searchArea input", (event) => {
            const $input: JQuery = $(event.target);
            const keyword: string = $input.val();
            const listIndex: number = this._getListIndex($input);
            this._searchColumn(keyword, listIndex);
        });

        $section.on("input", ".resultInput", (event) => {
            const $input: JQuery = $(event.target);
            const colIndex = this._getColIndex($input.closest(".resultCol"));
            this.modelData.setResult(colIndex, $input.val().trim(), null);
        });
    }

    private _getListIndex($ele: JQuery): number {
        const index: string = $ele.closest(".lists").data("index");
        return Number(index);
    }

    private _getColIndex($el: JQuery): number {
        return Number($el.data("index"));
    }

    private _render(): void {
        const $view: JQuery = this._getView();
        const $nodeList: JQuery = $view.find(".tableSection .listSection");
        const $result: JQuery = $view.find(".resultSection .listSection");
        const $candidate: JQuery = $view.find(".candidateSection .listSection");
        const candidateHint = this.options.candidateText || UnionTStr.CandidateHint;
        const model = this.modelData.getModel();
        let result = model.result;
        let selected = model.selected;
        let candidates = model.candidate;

        let nodeListHTML: string = "";
        let resultHTML: string = "";
        let candidateHTML: string = "";
        let nodeListHeader: string = '<div class="lists newTable"></div>';
        let resultCol: string = this._getResultList(result, selected);
        let candidateTextCol: string = '<div class="lists newTable">' +
                                            candidateHint +
                                        '</div>';

        // model.selected.forEach((selectedCols, index) => {
        selected.forEach((selectedCols, index) => {
            nodeListHTML += this._getNodeList(index);
            resultHTML += this._getSelectedList(selectedCols, index);
            candidateHTML += this._getCandidateList(candidates[index], index);
        });

        if (this.options.resultColPosition === -1) {
            nodeListHTML += nodeListHeader;
            resultHTML += resultCol;
            candidateHTML += candidateTextCol;
        } else {
            nodeListHTML = nodeListHeader + nodeListHTML;
            resultHTML = resultCol + resultHTML;
            candidateHTML = candidateTextCol + candidateHTML;
        }

        $nodeList.html(nodeListHTML);
        $result.html(resultHTML);
        $candidate.html(candidateHTML);
        this._setupDropdownList();

        result.forEach((col, index) => {
            if (this.options.showCast || col.type != null) {
                this._showCast(index);
            }
        });
    }

    private _getNodeList(index: number): string {
        let label;
        if (this.options.labels && this.options.labels[index] != null) {
            label = this.options.labels[index];
        } else {
            label = "Node" + (index + 1);
        }
        return ('<div class="lists">' +
                    label +
                '</div>');
    }

    private _getResultList(resultCols: ProgCol[], selectedCols): string {
        let resultColHTML: string = "";

        resultCols.forEach((resultCol, listIndex) => {
            let colName: string = resultCol.getBackColName();
            colName = xcHelper.escapeHTMLSpecialChar(colName);
            const cast: string = resultCol.type || "";
            const selectedCol = selectedCols[0][listIndex];
            let listClasses = "";
            if (selectedCol && selectedCol.getType() === resultCol.type) {
                listClasses += " originalType";
            }
            resultColHTML +=
                '<div class="resultCol"' +
                ' data-index="' + listIndex + '">' +
                    '<input class="resultInput" type="text"' +
                    ' value="' + colName + '"' +
                    ' placeholder="' + UnionTStr.NewColName + '" spellcheck="false">' +
                    '<i class="removeColInRow icon xi-close-no-circle' +
                    ' xc-action fa-10"></i>' +
                    '<div class="dropDownList typeList' + listClasses + '">' +
                        '<input class="text" value="' + cast + '"' +
                        ' placeholder="' + UnionTStr.ChooseType + '" disabled>' +
                        '<div class="iconWrapper">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul>' +
                                '<li>' + ColumnType.boolean + '</li>' +
                                '<li>' + ColumnType.float + '</li>' +
                                '<li>' + ColumnType.integer + '</li>' +
                                '<li>' + ColumnType.string + '</li>' +
                            '</ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });

        return '<div class="lists newTable">' +
                    '<div class="searchArea placeholder"></div>' +
                    resultColHTML +
                '</div>';
    }

    private _getSelectedList(selectedCols: ProgCol[], index: number): string {
        let lists: string = '<div class="searchArea">' +
                                '<input type="text" spellcheck="false"' +
                                'placeholder="' + UnionTStr.SearchCol + '">' +
                                '<i class="icon xi-search fa-13" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-original-title="' + TooltipTStr.UnionSearch +
                                '"></i>' +
                            '</div>';

        selectedCols.forEach(function(selectedCol, colIndex) {
            let innerHTML: string = "";
            if (selectedCol != null) {
                const colName: string = xcHelper.escapeHTMLSpecialChar(selectedCol.getBackColName());
                innerHTML = '<div class="text textOverflowOneLine' +
                            ' tooltipOverflow"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="top"' +
                            ' data-title="' + xcHelper.escapeHTMLSpecialChar(colName) +
                            '">' +
                                BaseOpPanel.craeteColumnListHTML(selectedCol.getType(), colName) +
                            '</div>';
            } else {
                innerHTML = '<div class="text"></div>';
            }
            // add dropdown list
            innerHTML += '<div class="iconWrapper down xc-action">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul></ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>';

            lists += '<div class="inputCol dropDownList columnList" ' +
                     'data-index="' + colIndex + '">' +
                        innerHTML +
                    '</div>';
        });

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    private _getCandidateList(
        candidateCols: ProgCol[],
        index: number
    ): string {
        candidateCols = candidateCols || [];
        const lists: string = candidateCols.map((col, index) => {
            const colName: string = xcHelper.escapeHTMLSpecialChar(col.getBackColName());
            const colNameTempelate: string =
            '<div class="colName text textOverflowOneLine tooltipOverflow"' +
            ' data-toggle="tooltip" data-container="body"' +
            ' data-placement="top"' +
            ' data-title="' + xcHelper.escapeHTMLSpecialChar(colName) + '">' +
                colName +
            '</div>';
            return '<div class="inputCol" data-index="' + index + '">' +
                        '<i class="addCol icon xi-plus"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + UnionTStr.AddCol + '"' +
                        '></i>' +
                        BaseOpPanel.craeteColumnListHTML(col.getType(), colNameTempelate) +
                    '</div>';
        }).join("");

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    private _setupDropdownList(): void {
        const $section: JQuery = this._getView();
        const self = this;
        const container: string = this._panelSelector;

        $section.find(".columnList").each(function() {
            const $dropDownList: JQuery = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    self._getCandidateDropdownList($dropDownList);
                },
                onSelect: function($li) {
                    const colName: string = $li.find(".colName").text();
                    const text: string = $dropDownList.find(".text").text();
                    const isRemove: boolean = $li.hasClass("removeCol");
                    if (colName === text || !text && isRemove) {
                        return;
                    }
                    const listIndex: number = self._getListIndex($dropDownList);
                    const colIndex: number = self._getColIndex($dropDownList);
                    if (isRemove) {
                        self.modelData.removeColumn(listIndex, colIndex);
                    } else {
                        const indexToSelect = Number($li.data("index"));
                        self.modelData.selectColumn(listIndex, colIndex, indexToSelect);
                    }
                    xcTooltip.hideAll();
                },
                container: container,
                bounds: container
            }).setupListeners();
        });

        $section.find(".typeList").each(function() {
            const $dropDownList: JQuery = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    const colIndex: number = self._getColIndex($dropDownList.closest(".resultCol"));
                    const selectedCol = self.modelData.getModel().selected[0][colIndex];
                    $dropDownList.find("li").removeClass("originalType");
                    if (selectedCol && selectedCol.getType()) {
                        const colType = selectedCol.getType();
                        $dropDownList.find("li").filter(function() {
                            return $(this).text() === colType;
                        }).addClass("originalType");
                    }
                },
                onSelect: function($li) {
                    const type: ColumnType = $li.text();
                    const colIndex: number = self._getColIndex($dropDownList.closest(".resultCol"));
                    $dropDownList.find(".text").val(type);
                    self.modelData.setResult(colIndex, null, type);
                    xcTooltip.hideAll();
                    const selectedCol = self.modelData.getModel().selected[0][colIndex];

                    if (selectedCol && selectedCol.getType() === type) {
                        $dropDownList.addClass("originalType");
                    } else {
                        $dropDownList.removeClass("originalType");
                    }
                },
                container: container,
                bounds: container
            }).setupListeners();
        });
    }

    private _getCandidateDropdownList($dropDownList: JQuery): void {
        const listIndex: number = this._getListIndex($dropDownList);
        const model = this.modelData.getModel();
        const selectedCols: ProgCol[] = model.selected[listIndex];
        const resultCols: ProgCol[] = model.result;
        const allCols: ProgCol[] = model.all[listIndex];

        const map: Map<string, number> = new Map();
        selectedCols.forEach((col, colIndex) => {
            if (col != null) {
                map.set(col.getBackColName(), colIndex);
            }
        });

        let list: string = allCols.map(function(col, index) {
            const colName: string = col.getBackColName();
            const isUsed: boolean = map.has(colName);
            let extraClass: string;
            let title: string;
            if (isUsed) {
                let colIndex: number = map.get(colName);
                extraClass = "used";
                title = xcHelper.replaceMsg(UnionTStr.UsedFor, {
                    col: resultCols[colIndex].getBackColName()
                });
            } else {
                extraClass = "tooltipOverflow";
                title = colName;
            }
            const colType: ColumnType = col.getType();
            const colNameTempelate: HTML =
                '<span class="colName">' +
                    xcHelper.escapeHTMLSpecialChar(colName) +
                '</span>';
            return '<li class="type-' + colType + ' ' + extraClass + '"' +
                    ' data-index="' + index + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-title="' + xcHelper.escapeHTMLSpecialChar(title) + '"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    '>' +
                        BaseOpPanel.craeteColumnListHTML(colType, colNameTempelate) +
                    '</li>';
        }).join("");

        if (allCols.length === 0) {
            list = '<div class="hint">' +
                        UnionTStr.EmptyList +
                    '</div>';
        } else {
            list = '<li class="removeCol">' +
                        UnionTStr.NoMatch +
                    '</li>' +
                    list;
        }
        $dropDownList.find("ul").html(list);
    }

    private _searchColumn(keyword: string, index: number): void {
        const $inputs: JQuery = this._getView().find('.lists[data-index="' + index + '"]')
                                        .find(".inputCol .text");
        $inputs.removeClass("highlight");
        if (!keyword) {
            return;
        }
        $inputs.filter(function() {
            return $(this).text().includes(keyword);
        }).addClass("highlight");
    }

    private _showCast(colIndex: number) {
        const $view: JQuery = this._getView();
        $view.find('.resultCol[data-index="' + colIndex + '"]').addClass("cast");
        $view.find('.columnList[data-index="' + colIndex + '"]').addClass("cast");
    }
}