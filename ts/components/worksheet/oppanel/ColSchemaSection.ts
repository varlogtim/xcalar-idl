class ColSchemaSection {
    private _$section: JQuery;

    public constructor($section: JQuery) {
        this._$section = $section;
        this._addEventListeners();
    }

    public render(schema: ColSchema[]): void {
        this.clear();
        if (schema.length > 0) {
            this._populateList(schema);
        }
    }

    public clear(): void {
        this._addHint();
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
        return valid ? schema : null;
    }

    private _getContentSection(): JQuery {
        return this._$section.find(".listSection .content");
    }

    private _addHint(): void {
        const html: HTML =
            '<div class="hint">' +
                OpPanelTStr.DFLinkInNoSchema +
            '</div>';
        this._getContentSection().html(html);
    }

    private _addTypeDropdwn($dropdown: JQuery) {
        const $panel: JQuery = this._$section.closest(".opPanel");
        const selector: string = `#${$panel.attr("id")}`;
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

    private _populateList(schema: ColSchema[]): void {
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".hint").remove();

        const list: JQuery[] = schema.map((col) => {
            const name: string =  col.name || "";
            const type: string = col.type || "";
            const row: HTML =
            '<div class="part">' +
                '<div class="name">' +
                    '<i class="remove icon xi-close-no-circle xc-action fa-8"></i>' +
                    '<input value="' + name + '">' +
                '</div>' +
                '<div class="type dropDownList">' +
                    '<div class="text">' + type + '</div>' +
                    '<div class="iconWrapper">' +
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
                    '</div>' +
                '</div>' +
            '</div>';
            return $(row);
        });

        list.forEach(($row) => {
            this._addTypeDropdwn($row.find(".type.dropDownList"));
            $contentSection.append($row);
        });
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
                this._addHint();
            }
        });
    }
}