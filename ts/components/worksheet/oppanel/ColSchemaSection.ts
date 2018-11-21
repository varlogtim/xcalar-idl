class ColSchemaSection {
    private _$section: JQuery;
    private _initialSchema: ColSchema[];

    public constructor($section: JQuery) {
        this._$section = $section;
        this._addEventListeners();
    }

    public render(schema: ColSchema[]): void {
        this.clear();
        if (schema.length > 0) {
            this._initialSchema = schema;
            this._populateList(schema);
        }
    }

    public clear(): void {
        this._addNoSchemaHint();
    }

    public getSchema(ingore: boolean): ColSchema[] {
        const schema: ColSchema[] = [];
        const $contentSection: JQuery = this._getContentSection();
        let valid: boolean = true;
        $contentSection.find(".part").each((_index, el) => {
            const $part: JQuery = $(el);
            const $name: JQuery = $part.find(".name input");
            const name: string = $name.val().trim();
            if (!ingore && !name) {
                StatusBox.show(ErrTStr.NoEmpty, $name);
                valid = false;
                return false; // stop loop
            }
            const colType: ColumnType = <ColumnType>$part.find(".type .text").text();
            schema.push({
                name: name,
                type: colType
            });
        });
        if (!ingore && valid && schema.length === 0) {
            valid = false;
            StatusBox.show(ErrTStr.NoEmptySchema, $contentSection);
        }
        return valid ? schema : null;
    }

    private _getContentSection(): JQuery {
        return this._$section.find(".listSection .content");
    }

    private _addNoSchemaHint(): void {
        const html: HTML =
            '<div class="hint">' +
                OpPanelTStr.DFLinkInNoSchema +
            '</div>';
        this._getContentSection().html(html);
    }

    private _populateList(schema: ColSchema[]): void {
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".hint").remove();
        const dropdownList: HTML =
        '<div class="list">' +
            '<ul></ul>' +
            '<div class="scrollArea top">' +
                '<i class="arrow icon xi-arrow-up"></i>' +
            '</div>' +
            '<div class="scrollArea bottom">' +
                '<i class="arrow icon xi-arrow-down"></i>' +
            '</div>' +
        '</div>';
        const list: JQuery[] = schema.map((col) => {
            const name: string =  col.name || "";
            const type: string = col.type || "";
            const row: HTML =
            '<div class="part">' +
                '<div class="name dropDownList">' +
                    '<i class="remove icon xi-close-no-circle xc-action fa-8"></i>' +
                    '<input value="' + name + '" spellcheck="false">' +
                    dropdownList +
                '</div>' +
                '<div class="type dropDownList">' +
                    '<div class="text">' + type + '</div>' +
                    '<div class="iconWrapper">' +
                        '<i class="icon xi-arrow-down"></i>' +
                    '</div>' +
                    dropdownList +
                '</div>' +
            '</div>';
            return $(row);
        });

        list.forEach(($row) => {
            this._addHintDropdown($row.find(".name.dropDownList"));
            this._addTypeDropdwn($row.find(".type.dropDownList"));
            $contentSection.append($row);
        });
    }

    private _getSelector(): string {
        const $panel: JQuery = this._$section.closest(".opPanel");
        const selector: string = `#${$panel.attr("id")}`;
        return selector;
    }

    private _addHintDropdown($dropdown: JQuery): void {
        const selector: string = this._getSelector();
        const hintDropdown = new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateHintDropdown($curDropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    const $name: JQuery = $li.closest(".dropDownList");
                    const $nameInput: JQuery = $name.find("input");
                    $nameInput.val($li.text());
                    const $typeText: JQuery = $name.siblings(".type").find(".text");
                    if (!$typeText.text()) {
                        $typeText.text($li.data("type"));
                    }
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        // colName hint dropdown
        let hintTimer: number;
        $dropdown.on("input", ".hintDrowpdown input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            clearTimeout(hintTimer);
            hintTimer = window.setTimeout(() => {
                this._populateHintDropdown($dropdown, $input.val().trim());
                hintDropdown.openList();
            }, 200);
        });
    }

    private _populateHintDropdown(
        $dropdown: JQuery,
        keyword: string = ""
    ): void {
        let html: HTML = "";
        if (this._initialSchema != null) {
            this._initialSchema.forEach((schema) => {
                const colName: string = schema.name;
                if (colName.includes(keyword)) {
                    html +=
                    '<li data-type="' + schema.type + '">' +
                        BaseOpPanel.craeteColumnListHTML(schema.type, colName) +
                    '</li>';
                }
            });
        }

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _addTypeDropdwn($dropdown: JQuery) {
        const selector: string = this._getSelector();
        new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateTypeDropdown($curDropdown);
            },
            onSelect: ($li) => {
                const $text: JQuery = $li.closest(".dropDownList").find(".text");
                $text.text($li.text());
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _populateTypeDropdown($dropdown: JQuery): void {
        const validTypes = [ColumnType.boolean, ColumnType.float, ColumnType.integer,
        ColumnType.string, ColumnType.timestamp, ColumnType.mixed, ColumnType.unknown];
        const html: HTML = validTypes.map((colType) => {
            const li: HTML =
                '<li>' +
                    '<i class="icon xi-' + colType + '"></i>' +
                    '<span class="name">' + colType + '</span>' +
                '</li>';
            return li;
        }).join("");
        $dropdown.find("ul").html(html);
    }

    private _addEventListeners(): void {
        const $section: JQuery = this._$section;
        $section.on("click", ".clear", () => {
            this.clear();
        });

        $section.on("click", ".addColumn", () => {
            this._populateList([{name: "", type: null}]);
        });

        $section.on("click", ".part .remove", (event) => {
            $(event.currentTarget).closest(".part").remove();
            if (this._$section.find(".part").length === 0) {
                this._addNoSchemaHint();
            }
        });
    }
}