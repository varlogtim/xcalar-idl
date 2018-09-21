class XcTableInWSViewer extends XcTableViewer {
    private $container: JQuery;
    private tableToReplace: string;
    private options: {
        wsId?: string,
        atStartUp?: boolean,
        position?: number, 
        selectCol?: number[] | number // column to be highlighted when table is ready
    };

    public constructor(
        table: TableMeta,
        tableToReplace: string,
        options: {
            wsId?: string,
            atStartUp?: boolean
            position?: number
            selectCol?: number[] | number
        } = {}
    ) {
        super(table);
        this.tableToReplace = tableToReplace;
        this.options = options;
        this.$container = $('<div class="fakeContainer"></div>');
        this._setTableMode(false);
    }

    public getRowInput(): RowInput {
        return this.rowInput;
    }


    public getSkew(): TableSkew {
        return this.skew;
    }

    public render(): XDPromise<void> {
        return super.render(this.$container)
                .always(() => {
                    TblManager.removeWaitingCursor(this.table.getId());
                });
    }

    protected _afterGenerateTableShell(): void {
        const oldTableId: TableId = xcHelper.getTableId(this.tableToReplace);
        let isTableInActiveWS: boolean = false;
        let targetWS: string;
        if (this.options.wsId) {
            targetWS = this.options.wsId;
        } else if (oldTableId != null) {
            targetWS = WSManager.getWSFromTable(oldTableId);
        } else {
            targetWS = WSManager.getActiveWS();
        }

        if (WSManager.getActiveWS() === targetWS) {
            isTableInActiveWS = true;
        }

        let tableClasses: string = isTableInActiveWS ? "" : "inActive";
        tableClasses += " worksheet-" + targetWS;

        const $view: JQuery = this.getView();
        $view.addClass(tableClasses);

        // creates a new table, completed thead, and empty tbody
        if (this.options.atStartUp) {
            $("#mainFrame").append($view);
        } else if (oldTableId != null) {
            var $oldTable =  $("#xcTableWrap-" + oldTableId);
            $oldTable.after($view);
        } else {
            const position: number = xcHelper.getTableIndex(targetWS,
                                                    this.options.position,
                                                    ".xcTableWrap");
            if (position === 0) {
                $("#mainFrame").prepend($view);
            } else {
                const $prevTable: JQuery = $(".xcTableWrap:not(.building)")
                                                .eq(position - 1);
                if ($prevTable.length) {
                    $prevTable.after($view);
                } else {
                    $("#mainFrame").append($view); // shouldn't happen
                }
            }
        }
        this.$container.empty();
    }

    protected _afterBuildInitialTable(tableId: TableId): void {
        this._createTableHeader(tableId);

        const activeWS: string = WSManager.getActiveWS();
        const tableWS: string = WSManager.getWSFromTable(tableId);
        if ((activeWS === tableWS) &&
            $('.xcTableWrap.worksheet-' + activeWS).length &&
            $('.xcTableWrap.worksheet-' + activeWS).find('.tblTitleSelected')
                                                   .length === 0) {
            // if active worksheet and no other table is selected;
            TblFunc.focusTable(tableId, true);
        }

        // highlights new cell if no other cell is selected
        if (this.options.selectCol != null) {
            if ($('.xcTable th.selectedCell').length === 0) {
                const $table: JQuery = $("#xcTable-" + tableId);
                this._selecCol($table, true);
            }
        }
    }

    protected _addTableListeners(tableId: TableId): void {
        super._addTableListeners(tableId);
        const $xcTableWrap: JQuery = $("#xcTableWrap-" + tableId);
        const oldId: TableId = gActiveTableId;

        $xcTableWrap.mousedown(function() {
            if (gActiveTableId === tableId ||
                $xcTableWrap.hasClass("tableLocked")) {
                return;
            } else {
                let focusDag: boolean;
                if (oldId !== tableId) {
                    focusDag = true;
                }
                TblFunc.focusTable(tableId, focusDag);
            }
        });
    }

    protected _afterBuild(): void {
        super._afterBuild();
        const table: TableMeta = this.table;
        const $table: JQuery = $('#xcTable-' + table.getId());
        if (this.options.selectCol != null &&
            $('.xcTableWrap:not(.tableToRemove) th.selectedCell').length === 0
        ) {

            this._selecCol($table, false);
        }

        // position sticky row column on visible tables
        TblFunc.matchHeaderSizes($table);
    }

    private _selecCol($table: JQuery, bypassModal: boolean): void {
        const mousedown = xcHelper.deepCopy(fakeEvent.mousedown);
        if (bypassModal) {
            mousedown.bypassModal = true;
        }
        if (this.options.selectCol instanceof Array) {
            $table.find('th.col' + this.options.selectCol[0] +
                    ' .flexContainer').trigger(mousedown);
            const cols: number[] = <number[]>this.options.selectCol;
            for (let i = 0; i < cols.length; i++) {
                const $th: JQuery = $table.find('th.col' + this.options.selectCol[i]);
                TblManager.highlightColumn($th, true);
            }
        } else {
            $table.find('th.col' + (this.options.selectCol) +
                    ' .flexContainer').trigger(mousedown);
        }
    }

    private _createTableHeader(tableId: TableId): void {
        const $xcTheadWrap: JQuery = $('<div id="xcTheadWrap-' + tableId +
                                        '" class="xcTheadWrap dataTable" ' +
                                        'data-id="' + tableId + '" ' +
                                        'style="top:0px;"></div>');
        let lockIcon: string = "";
        if (gTables[tableId].isNoDelete()) {
            lockIcon = '<i class="lockIcon icon xi-lockwithkeyhole">' +
                        '</i>';
        }

        $("#xcTableWrap-" + tableId).prepend($xcTheadWrap);
        let tableTitleClass: string = "";
        if (!$(".xcTable:visible").length) {
            tableTitleClass = " tblTitleSelected";
            $(".dagWrap.selected").removeClass("selected")
                                .addClass("notSelected");
            $("#dagWrap-" + tableId).removeClass("notSelected")
                                    .addClass("selected");
        }

        const html: string = 
            '<div class="tableTitle ' + tableTitleClass + '">' +
                '<div class="tableGrab"></div>' +
                '<div class="labelWrap">' +
                    '<label class="text" ></label>' +
                '</div>' +
                '<div class="dropdownBox" ' +
                    'data-toggle="tooltip" ' +
                    'data-placement="bottom" ' +
                    'data-container="body" ' +
                    'title="' + TooltipTStr.ViewTableOptions +
                    '" >' +
                    '<span class="innerBox"></span>' +
                '</div>' +
                lockIcon +
            '</div>';

        $xcTheadWrap.prepend(html);

        // title's Format is tablename  [cols]
        TblManager.updateTableHeader(tableId);

        // Event Listener for table title
        $xcTheadWrap.on({
            // must use keypress to prevent contenteditable behavior
            "keypress": (event) => {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    event.stopPropagation();
                    this._renameTableHelper($(event.currentTarget));
                }
            },
            "keydown": (event) => {
                if (event.which === keyCode.Space) {
                    // XXX temporary do not allow space
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, ".tableTitle .text");

        $xcTheadWrap.on({
            "focus": function() {
                const $tableName: JQuery = $(this);
                TblManager.updateTableNameWidth($tableName);
                TblFunc.moveTableTitles(null);
            },
            "blur": function() {
                const tableId: TableId = $xcTheadWrap.data("id");
                TblManager.updateTableHeader(tableId);
                TblFunc.moveTableTitles(null);
            },
            "input": function() {
                const $tableName: JQuery = $(this);
                TblManager.updateTableNameWidth($tableName);
                TblFunc.moveTableTitles($tableName.closest('.xcTableWrap'));
            }
        }, ".tableTitle .tableName");

        // trigger open table menu on .dropdownBox click
        $xcTheadWrap.on('click', '.dropdownBox', function(event: any) {
            let classes: string = "tableMenu";
            const $dropdown: JQuery = $(this);
            const $tableWrap: JQuery = $dropdown.closest('.xcTableWrap');

            if ($tableWrap.hasClass('tableLocked')) {
                classes += " locked";
            }

            if ($tableWrap.hasClass('tableHidden')) {
                classes += " tableHidden";
            }

            const options: xcHelper.DropdownOptions = {classes: classes};

            if (event.rightClick) {
                options.mouseCoors = {
                    "x": event.pageX,
                    "y": $tableWrap.offset().top + 30
                };
            }

            xcHelper.dropdownOpen($dropdown, $('#tableMenu'), options);
        });

        // trigger open table menu on .dropdownBox right-click
        $xcTheadWrap.on('contextmenu', '.dropdownBox', function(event) {
            $(event.target).trigger('click');
            event.preventDefault(); // prevent default browser's rightclick menu
        });

        $xcTheadWrap.on("click", ".lockIcon", function() {
            Dag.removeNoDelete(tableId);
            TblManager.removeTableNoDelete(tableId);
            xcTooltip.hideAll();
        });

        // trigger open table menu on .tableGrab click
        $xcTheadWrap.on('click', '.tableGrab', function(event) {
            const $target: JQuery = $(this);
            // .noDropdown gets added during table drag
            if (!$target.hasClass('noDropdown') &&
                !$target.closest('.columnPicker').length) {
                const click: any = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.siblings('.dropdownBox').trigger(click);
                event.preventDefault();
            }
        });

        // trigger open table menu on .tableGrab right-click
        $xcTheadWrap.on('contextmenu', '.tableGrab, label.text, .lockIcon', function(event) {
            const click: any = $.Event("click");
            click.rightClick = true;
            click.pageX = event.pageX;
            $xcTheadWrap.find(".dropdownBox").trigger(click);
            event.preventDefault();
        });

        // Change from $xcTheadWrap.find('.tableGrab').mousedown...
        $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
            // Not Mouse down
            if (event.which !== 1) {
                return;
            }
            TblAnim.startTableDrag($(this).parent(), event);
        });

        const $table: JQuery = $('#xcTable-' + tableId);
        $table.width(0);
    }

    private _renameTableHelper($div: JQuery): void {
        const $tableName: JQuery = $div.find(".tableName");
        const newName: string = $tableName.val().trim();
        const $th: JQuery = $div.closest('.xcTheadWrap');
        const tableId: TableId = xcHelper.parseTableId($th);
        const newTableName: string = newName + "#" + tableId;
        const oldTableName: string = gTables[tableId].getName();

        if (newTableName === oldTableName) {
            $div.blur();
            return;
        }

        const isValid: boolean = xcHelper.tableNameInputChecker($tableName);
        if (isValid) {
            xcFunction.rename(tableId, newTableName)
            .then(function() {
                $div.blur();
            })
            .fail(function(error) {
                StatusBox.show(error, $div, false);
            });
        }
    }
}