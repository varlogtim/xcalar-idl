class DeleteTableModal {
    private static _instance: DeleteTableModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _tableList: {tableId: string, name: string, size: number}[];
    private _sortKeyList: string;
    private _reverseSort: boolean;
    // constant
    private readonly _unknown: string = "--";

    private constructor() {
        this._reset();
        const $modal = this._getModal();
        this._modalHelper = new ModalHelper($modal);
        this._addEventListeners();
    }

    public show(): XDPromise<void> {
        let $modal = this._getModal(); 
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._modalHelper.setup({
            "open": () => {
                // instead of show modalBg, add locked class
                // so it can overlap upon other modals
                // and close without any problem
                let $modalBg = this._getModalBg();
                $modalBg.addClass("locked");

                if (gMinModeOn) {
                    $modal.show();
                } else {
                    $modal.fadeIn();
                }
            }
        });

        // if it's too slow, show timer
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        PromiseHelper.alwaysResolve(this._populateTableList())
        .then(() => {
            $modal.removeClass("load");
            deferred.resolve();
        });

        return deferred.promise();
    }

    private _getModal(): JQuery {
        return $("#deleteTableModal");
    }

    private _getModalBg(): JQuery {
        return $("#modalBackground");
    }

    private _getListEl(): JQuery {
        return $("#deleteTableModal-list");
    }

    private _reset(): void {
        this._tableList = [];
        this._sortKeyList = null;
        this._reverseSort = false;
        const $modal = this._getModal();
        $modal.find(".title.active").removeClass("active");
        $modal.find('.grid-unit.failed').removeClass('failed');
    }

    private _close(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._modalHelper.clear({
            close: () => {
                const $modalBg = this._getModalBg();
                const $modal = this._getModal();
                $modalBg.removeClass("locked");
                if (gMinModeOn) {
                    $modal.hide();
                    deferred.resolve();
                } else {
                    $modal.fadeOut(180, () => {
                        deferred.resolve();
                    });
                }
            }
        });
        this._reset();
        return deferred.promise();
    }

    private _hasCheckedTables(): boolean {
        const $modal = this._getModal();
        return $modal.find('.grid-unit .checkbox.checked').length > 0;
    }

    private _deleteTableHelper(): XDPromise<void> {
        const $container: JQuery = this._getListEl();
        let deletedTable: boolean = false;
        let list = this._tableList;
        $container.find(".grid-unit").each((index, el) => {
            let $grid: JQuery = $(el);
            if ($grid.find(".checkbox").hasClass("checked")) {
                let tableName: string = list[index].name;
                DagTblManager.Instance.deleteTable(tableName, false, false);
                deletedTable = true;
            }
        });
        if (!deletedTable) {
            return PromiseHelper.resolve();
        }
        return DagTblManager.Instance.forceDeleteSweep();
    }

    private _populateTableList(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._tableList = [];

        XcalarGetTables("*")
        .then((result) => {
            let numNodes = result.numNodes;
            let nodeInfo = result.nodeInfo;
            for (let i = 0; i < numNodes; i++) {
                let node = nodeInfo[i];
                this._tableList.push({
                    "tableId": node.dagNodeId,
                    "name": node.name,
                    "size": node.size
                });
            }
            this._sortTableList(this._tableList, this._sortKeyList);
            let $modal = this._getModal();
            $modal.find('.modalMain').find('.checkbox').removeClass('checked');
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _sortTableList(
        tableList: {tableId: string, name: string, size: number}[],
        sortKey: string
    ): void {
        if (sortKey == null) {
            // first time to sort, default sort by name
            sortKey = "name";
            this._reverseSort = false;
        } else if (this._sortKeyList === sortKey) {
            // when it's reverse sort
            this._reverseSort = !this._reverseSort;
        } else {
            // when change sort key, default is asc sort
            this._reverseSort = false;
        }

        // cache the new sortKey
        this._sortKeyList = sortKey;

        // sort by name first, no matter what case
        tableList.sort((a, b) =>  a.name.localeCompare(b.name));

        // temoprarily not support sort on size
        if (sortKey === "size") {
            tableList.sort((a, b) => {
                let sizeA = a.size;
                let sizeB = b.size;
                if (<any>sizeA === this._unknown) {
                    sizeA = null;
                }

                if (<any>sizeB === this._unknown) {
                    sizeB = null;
                }

                if (sizeA == null && sizeB == null) {
                    return 0;
                } else if (sizeA == null) {
                    return -1;
                } else if (sizeB == null) {
                    return 1;
                } else if (sizeA === sizeB) {
                    return 0;
                } else if (sizeA > sizeB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else if (sortKey === "date") {
            tableList.sort((a, b) => {
                let tA = DagTblManager.Instance.getTimeStamp(a.name);
                let tB = DagTblManager.Instance.getTimeStamp(b.name);
                if (<any>tA === this._unknown) {
                    tA = null;
                }

                if (<any>tB === this._unknown) {
                    tB = null;
                }

                if (tA == null && tB == null) {
                    return 0;
                } else if (tA == null) {
                    return -1;
                } else if (tB == null) {
                    return 1;
                } else if (tA === tB) {
                    return 0;
                } else if (tA > tB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }

        if (this._reverseSort) {
            tableList.reverse();
        }

        this._getTableList(tableList);
    }

    private _getTableList(tables: {tableId: string, name: string, size: number}[]): void {
        let html = this._getTableListHTML(tables);
        let $container = this._getListEl();
        $container.find(".listSection").html(html);
    }

    private _getTableListHTML(tables: {tableId: string, name: string, size: number}[]): HTML {
        let html: HTML = "";
        for (let i = 0, len = tables.length; i < len; i++) {
            let table = tables[i];
            let date = DagTblManager.Instance.getTimeStamp(table.name);
            let tableName: string = table.name;
            let dateTip: string = "";
            let time;
            if (<any>date !== this._unknown) {
                time = moment(date);
                dateTip = xcTimeHelper.getDateTip(time, {container:
                                                        "#deleteTableModal"});
                date = time.calendar();
            }
            let size: string = <string>xcHelper.sizeTranslator(table.size);
            let checkbox: HTML;
            if (DagTblManager.Instance.hasLock(table.name)) {
                checkbox = '<i class="lockIcon icon xi-lockwithkeyhole" ' +
                            'data-toggle="tooltip" ' +
                            'data-container="#deleteTableModal" ' +
                            'data-placement="top" ' +
                            'data-title="' + TooltipTStr.LockedTable + '" ' +
                            '></i>';
            } else {
                checkbox = '<div class="checkboxSection">' +
                                '<div class="checkbox">' +
                                    '<i class="icon xi-ckbox-empty"></i>' +
                                    '<i class="icon xi-ckbox-selected"></i>' +
                                '</div>' +
                            '</div>';
            }

            html += '<div class="grid-unit">' +
                        checkbox +
                        '<div class="name tooltipOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-container="#deleteTableModal" ' +
                        'data-placement="top" ' +
                        'data-title="' + tableName + '">' +
                            tableName +
                        '</div>' +
                        '<div>' + size + '</div>' +
                        '<div ' + dateTip + '>' + date + '</div>' +
                    '</div>';
        }

        return html;
    }

    private _submitForm(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let timer = setTimeout(() => {
            // if delete takes too long, show the loading section
            let $modal = this._getModal();
            $modal.addClass("load");
            $modal.find(".loadingSection .text").text(StatusMessageTStr.DeleteResultSets);
        }, 500);

        this._modalHelper.disableSubmit();

        let error: any = [];
        let $modal = this._getModal();
        this._deleteTableHelper()
        .then((...res) => {
            error = res;
            xcHelper.showRefreshIcon($modal, false, null);
        })
        .fail((...err) => {
            error = err;
            console.error(error);
        })
        .always(() => {
            clearTimeout(timer);
            $modal.removeClass("load");
            if (this._reverseSort != null) {
                // because in sortTableList it will turn over
                // so should change first to keep the sort same
                this._reverseSort = !this._reverseSort;
            }
            PromiseHelper.alwaysResolve(this._populateTableList())
            .then(() => {
                this._failHandler(error);
                this._modalHelper.enableSubmit();
                // should re-dected memory usage
                MemoryAlert.Instance.check();
                deferred.resolve()
            });
        });

        return deferred.promise();
    }

    private _failHandler(args: any[]): void {
        let $container = this._getListEl();
        let errorMsg: string = "";
        let hasSuccess: boolean = false;
        let failedTables: string[] = [];
        let failedMsg: string = "";
        let failFound: boolean = false;
        let noDelete: boolean = false;
        for (let i = 0; i < args.length; i++) {
            if (args[i] && args[i].fails) {
                failFound = true;
                if (args[i].hasSuccess) {
                    hasSuccess = true;
                }
                for (let j = 0; j < args[i].fails.length; j++) {
                    let tableName: string = args[i].fails[j].tables;
                    failedTables.push(tableName);
                    let error: string = args[i].fails[j].error;
                    if (!failedMsg && error !== ErrTStr.CannotDropLocked) {
                        failedMsg = error;
                    } else if (error === ErrTStr.CannotDropLocked) {
                        noDelete = true;
                    }

                    let $gridUnit = $container.find('.grid-unit').filter((_i, el) => {
                        let $grid = $(el);
                        return ($grid.find('.name').text() === tableName);
                    });
                    $gridUnit.addClass('failed');
                }
            } else if (args[i] && args[i].length) {
                hasSuccess = true;
            }
        }
        if (!failFound) {
            return;
        }

        if (!failedMsg && noDelete) {
            // only show cannot dropped message if ther are no other
            // fail messages
            failedMsg = ErrTStr.CannotDropLocked;
        }

        if (hasSuccess) {
            if (failedTables.length === 1) {
                errorMsg = failedMsg + ". " +
                xcHelper.replaceMsg(ErrWRepTStr.ResultSetNotDeleted, {
                    "name": failedTables[0]
                });
            } else {
                errorMsg = failedMsg + ". " +
                           StatusMessageTStr.PartialDeleteResultSetFail + ".";
            }
        } else {
            errorMsg = failedMsg + ". " + ErrTStr.NoResultSetDeleted;
        }
        let $firstGrid = $container.find('.grid-unit.failed').eq(0);
        StatusBox.show(errorMsg, $firstGrid, false, {
            "side": "left",
            "highZindex": true
        });
    }

    private _cacheCheckedTables(): string[] {
        let list = this._tableList;
        let $container = this._getListEl();
        let tables: string[] = [];

        $container.find(".grid-unit").each((index, el) => {
            let $grid = $(el);
            if ($grid.find(".checkbox").hasClass("checked")) {
                const tableName: string = list[index].name;
                tables.push(tableName);
            }
        });

        return tables;
    }

    private _restoreCheckedTables(tables: string[]): void {
        let list = this._tableList;
        let $container = this._getListEl();
        let nameMap: {[key: string]: boolean} = {};

        tables.forEach((tableName) => {
            nameMap[tableName] = true;
        });

        $container.find(".grid-unit").each((index, el) => {
            let $grid: JQuery = $(el);
            let tableName: string = list[index].name;
            if (nameMap.hasOwnProperty(tableName)) {
                $grid.find(".checkbox").addClass("checked");
            }
        });
    }

    private _addEventListeners(): void {
        const $modal = this._getModal();

        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".confirm", (event) => {
            $(event.currentTarget).blur();
            if (!this._hasCheckedTables()) {
                return;
            }
            const $modal = this._getModal();
            const $modalBg = this._getModalBg();
            $modal.addClass('lowZindex');
            Alert.show({
                "title": ResultSetTStr.Del,
                "msg": ResultSetTStr.DelMsg,
                "highZindex": true,
                "onCancel": () => {
                    $modal.removeClass('lowZindex');
                    $modalBg.hide();
                    // by default background won't hide because modalHelper
                    // detects more than 1 modal open
                },
                "onConfirm": () => {
                    $modal.removeClass('lowZindex');
                    $modalBg.hide();
                    this._submitForm();
                }
            });
        });

        // click checkbox
        $modal.on("click", ".listSection .grid-unit", (event) => {
            $(event.currentTarget).find(".checkbox").toggleClass("checked");
        });

        // click checkbox on title
        $modal.on("click", ".titleSection .checkboxSection", (event) => {
            let $checkboxSection = $(event.currentTarget);
            if ($checkboxSection.find(".checkbox").hasClass("checked")) {
                // uncheck
                $checkboxSection.closest(".section")
                                .find(".checkbox").removeClass("checked");
            } else {
                $checkboxSection.closest(".section")
                                .find(".checkbox").addClass("checked");
            }
        });

        // click title to sort
        $modal.on("click", ".title .label, .title .xi-sort", (event) => {
            let $title = $(event.currentTarget).closest(".title");
            let sortKey: string = $title.data("sortkey");
            let $section = $title.closest(".section");
            $section.find(".title.active").removeClass("active");
            $title.addClass("active");

            const cachedTables: string[] = this._cacheCheckedTables();
            this._sortTableList(this._tableList, sortKey);
            this._restoreCheckedTables(cachedTables);
        });

        $modal.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });
    }
}
