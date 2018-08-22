class SetOpPanel extends BaseOpPanel {
    private readonly validTypes: ColumnType[] = [];
    private setOpData: SetOpPanelModel;
    public static d;

    public constructor() {
        super();
        this._setup();
    }
    /**
     *
     * @param dagNode {DagNodeSet} show the view based on the set type node
     */
    public show(dagNode: DagNodeSet): void {
        this._reset();
        this._initialize(dagNode);
        this._formHelper.showView(null);
        this._formHelper.setup({});
        this._render();

        if (gMinModeOn) {
            this._autoResizeView(false);
        } else {
            setTimeout(() => {
                this._autoResizeView(false);
            }, 1);
        }
    }

    /**
     * Close the view
     */
    public close(): void {
        if (!this._formHelper.isOpen()) {
            return;
        }

        this._formHelper.hideView();
        this._formHelper.clear({});
        StatusBox.forceHide(); // hides any error boxes;
        xcTooltip.hideAll();
        this._autoResizeView(true);
    }

    private _setup(): void {
        [ColumnType.string, ColumnType.integer, ColumnType.float,
            ColumnType.boolean, ColumnType.mixed].forEach((type) => {
                this.validTypes.push(type);
            });
        super.setup($("#setOpPanel"));
        this._addEventListeners();
    }

    protected _reset(): void {
        super._reset();
        const $panel = this._getPanel();
        $panel.find(".listSection").empty();
        $panel.find(".searchArea input").val("");
        $panel.find(".highlight").removeClass("highlight");
    }

    private _initialize(dagNode: DagNodeSet): void {
        const event: Function = () => { this._render() };
        this.setOpData = new SetOpPanelModel(dagNode, event);
        const model = this.setOpData.getModel();
        this._selectDedup(model.dedup);
        this._selectType(model.unionType);
    }

    private _getDedupSection(): JQuery {
        return this._getPanel().find(".dedupSection");
    }

    private _addEventListeners(): void {
        const $panel = this._getPanel();
        $panel.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".confirm", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        const $modeList: JQuery = $panel.find(".modeList");
        const id: string = "#" + $panel.attr("id");
        new MenuHelper($modeList, {
            onSelect: ($li) => {
                const mode: string = $li.text();
                $modeList.find(".text").text(mode);
                this.setOpData.setType($li.attr("name"));
            },
            container: id,
            bounds: id
        }).setupListeners();

        // change dedup option
        xcHelper.optionButtonEvent(this._getDedupSection(), (option) => {
            const dedup: boolean = (option === "no") ? true : false;
            this.setOpData.setDedup(dedup);
        });

        $panel.on("click", ".candidateSection .inputCol", (event) => {
            const $col: JQuery = $(event.target).closest(".inputCol");
            const listIndex: number = this._getListIndex($col);
            const colIndex: number = this._getColIndex($col);
            this.setOpData.addColumn(listIndex, colIndex);
            xcTooltip.hideAll();
        });

        $panel.on("click", ".removeColInRow", (event) => {
            const $col: JQuery = $(event.target).closest(".resultCol");
            const colIndex: number = this._getColIndex($col);
            this.setOpData.removeColumnForAll(colIndex);
        });

        $panel.on("input", ".searchArea input", (event) => {
            const $input: JQuery = $(event.target);
            const keyword: string = $input.val();
            const listIndex: number = this._getListIndex($input);
            this._searchColumn(keyword, listIndex);
        });

        $panel.on("input", ".resultInput", (event) => {
            const $input: JQuery = $(event.target);
            const colIndex = this._getColIndex($input.closest(".resultCol"));
            this.setOpData.setResult(colIndex, $input.val().trim(), null);
        });
    }

    private _selectDedup(dedup): void {
        // it's asking include dedup rows or not
        const option: string = dedup? "no" : "yes";
        this._getDedupSection().find(".radioButton." + option).click();
    }

    private _selectType(unionType: UnionType): void {
        const type: string = unionType.toLocaleLowerCase();
        this._getPanel().find(".modeList").find('li[name="' + type + '"]')
        .trigger(fakeEvent.mouseup);
    }

    private _autoResizeView(reset: boolean) {
        const $mainMenu: JQuery = $("#mainMenu");
        const $panel: JQuery = this._getPanel();
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = parseFloat($mainMenu.css("min-width"));
        if (reset) {
            $mainMenu.width(minWidth);
        } else {
            const numList: number = this.setOpData.getNumList();
            let width: number = minWidth + Math.max(0, numList - 1) * sectionW;
            width = Math.min(width, $("#workspacePanel").width() * 0.5);
            $mainMenu.width(width);
        }
    }

    private _getListIndex($ele: JQuery): number {
        const index: string = $ele.closest(".lists").data("index");
        return Number(index);
    }

    private _getColIndex($el: JQuery): number {
        return Number($el.data("index"));
    }

    private _render(): void {
        const $panel: JQuery = this._getPanel();
        const $nodeList: JQuery = $panel.find(".tableSection .listSection");
        const $result: JQuery = $panel.find(".resultSection .listSection");
        const $candidate: JQuery = $panel.find(".candidateSection .listSection");
        const model = this.setOpData.getModel();

        let nodeListHTML: string = '<div class="lists newTable"></div>';
        let resultHTML: string = this._getResultList(model.result);
        let candidateHTML: string = '<div class="lists newTable">' +
                                UnionTStr.CandidateHint2 +
                            '</div>';

        model.selected.forEach((selectedCols, index) => {
            nodeListHTML += this._getNodeList(index);
            resultHTML += this._getSelectedList(selectedCols, index);
            candidateHTML += this._getCandidateList(model.candidate[index], index);
        });

        $nodeList.html(nodeListHTML);
        $result.html(resultHTML);
        $candidate.html(candidateHTML);
        this._setupDrodownList();

        model.result.forEach((col, index) => {
            if (col.type != null) {
                this._showCast(index);
            }
        });
    }

    private _getNodeList(index: number): string {
        return ('<div class="lists">' +
                    "Node" + (index + 1) +
                '</div>');
    }

    private _getResultList(resultCols: ProgCol[]): string {
        let resultColHTML: string = "";

        resultCols.forEach((resultCol, listIndex) => {
            let colName: string = resultCol.getBackColName();
            colName = xcHelper.escapeHTMLSpecialChar(colName);
            const cast: string = resultCol.type || "";
            resultColHTML +=
                '<div class="resultCol"' +
                ' data-index="' + listIndex + '">' +
                    '<input class="resultInput" type="text"' +
                    ' value="' + colName + '"' +
                    ' placeholder="' + UnionTStr.NewColName + '">' +
                    '<i class="removeColInRow icon xi-close-no-circle' +
                    ' xc-action fa-10"></i>' +
                    '<div class="dropDownList typeList">' +
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
                                colName +
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
        const lists: string = candidateCols.map((col, index) => {
            const colName: string = xcHelper.escapeHTMLSpecialChar(col.getBackColName());
            return '<div class="inputCol" data-index="' + index + '">' +
                        '<i class="addCol icon xi-plus"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + UnionTStr.AddCol + '"' +
                        '></i>' +
                        '<div class="colName text textOverflowOneLine tooltipOverflow"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + xcHelper.escapeHTMLSpecialChar(colName) + '">' +
                            colName +
                        '</div>' +
                    '</div>';
        }).join("");

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    private _setupDrodownList(): void {
        const $panel: JQuery = this._getPanel();
        const self = this;
        const container: string = `#${$panel.attr("id")} .middleSection`;
        $panel.find(".columnList").each(function() {
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
                        self.setOpData.removeColumn(listIndex, colIndex);
                    } else {
                        const indexToSelect = Number($li.data("index"));
                        self.setOpData.selectColumn(listIndex, colIndex, indexToSelect);
                    }
                    xcTooltip.hideAll();
                },
                container: container,
                bounds: container
            }).setupListeners();
        });

        $panel.find(".typeList").each(function() {
            const $dropDownList: JQuery = $(this);
            new MenuHelper($dropDownList, {
                onSelect: function($li) {
                    const type: ColumnType = $li.text();
                    const colIndex: number = self._getColIndex($dropDownList.closest(".resultCol"));
                    $dropDownList.find(".text").val(type);
                    self.setOpData.setResult(colIndex, null, type);
                    xcTooltip.hideAll();
                },
                container: container,
                bounds: container
            }).setupListeners();
        });
    }

    private _getCandidateDropdownList($dropDownList: JQuery): void {
        const listIndex: number = this._getListIndex($dropDownList);
        const model = this.setOpData.getModel();
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
            return '<li class="type-' + col.getType() + ' ' + extraClass + '"' +
                    ' data-index="' + index + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-title="' + xcHelper.escapeHTMLSpecialChar(title) + '"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    '>' +
                        '<span class="colName">' +
                            xcHelper.escapeHTMLSpecialChar(colName) +
                        '</span>' +
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
        const $inputs: JQuery = this._getPanel().find('.lists[data-index="' + index + '"]')
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
        const $panel: JQuery = this._getPanel();
        $panel.find('.resultCol[data-index="' + colIndex + '"]').addClass("cast");
        $panel.find('.columnList[data-index="' + colIndex + '"]').addClass("cast");
    }

    // function suggestSelectedCols(tableInfo, tableIndex) {
    //     var suggestCols = [];
    //     if (tableIndex === 0) {
    //         // not suggest first table
    //         return suggestCols;
    //     }
    //     var firstCols = tableInfoLists[0].selectedCols;
    //     var candidateCols = getCandidateCols(tableInfo, true);
    //     var candidateColInfos = candidateCols.map(function(col) {
    //         var parsedName = xcHelper.parsePrefixColName(col.name).name;
    //         return {
    //             col: col,
    //             parsedName: parsedName
    //         };
    //     });
    //     suggestCols = firstCols.map(function(col) {
    //         if (col == null) {
    //             return null;
    //         }
    //         var colName = xcHelper.parsePrefixColName(col.name).name;
    //         for (var i = 0; i < candidateColInfos.length; i++) {
    //             if (colName === candidateColInfos[i].parsedName) {
    //                 return candidateColInfos[i].col;
    //             }
    //         }
    //         return null;
    //     });
    //     return suggestCols;
    // }

    private _submitForm(): void {
        if (!this._validate()) {
            return;
        }

        this.setOpData.submit();
        this.close();
    }

    private _validate(): boolean {
        const $panel: JQuery = this._getPanel();
        if (this._isAdvancedMode()) {
            const advancedErr: {error: string} = this.setOpData.validateAdvancedMode(this._editor.getValue());
            if (advancedErr != null) {
                StatusBox.show(advancedErr.error, $panel.find(".advancedEditor"));
                return false;
            } else {
                return true;
            }
        }
        // validate more than one parent nodes
        const numNodeErr: {error: string} = this.setOpData.validateNodes();
        if (numNodeErr != null) {
            StatusBox.show(numNodeErr.error, $panel.find(".tableSection"));
            return false;
        }

        // validate result column
        const $resultInputs = $panel.find(".resultInput");
        const resultErr: {index: number, error: string} = this.setOpData.validateResult();
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, $panel.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }

        // validate type selection
        const typeValids: any[] = [];
        $panel.find(".resultCol.cast .typeList .text").each(function() {
            typeValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(typeValids)) {
            return false;
        }

        // validate type cast
        const castValid: {index: number, error: string} = this.setOpData.validateCast();
        if (castValid != null) {
            const index: number = castValid.index;
            const $resultCol: JQuery = $panel.find('.resultCol[data-index="' + index + '"]');
            this._showCast(index);
            StatusBox.show(UnionTStr.Cast, $resultCol.find(".typeList"));
            return false;
        }

        return true;
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.setOpData.switchMode(toAdvancedMode, this._editor);
    }
}