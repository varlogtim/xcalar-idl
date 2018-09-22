class FileManager {
    private static _instance = null;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $panel: JQuery;
    private rootPathNode: FileManagerPathNode;
    private viewPathNode: FileManagerPathNode;
    private curHistoryNode: FileManagerHistoryNode;
    private savedPathNodes: Map<string, FileManagerPathNode>;
    private savedHistoryNodes: Map<string, FileManagerHistoryNode>;

    /**
     * Setup FileManager.
     * Currently FileManager is a singleton since there is only one under
     * monitor panel. In the future, we can have multiple FileManagers,
     * each is identified by panel html id.
     * @param  {JQuery} $panel
     * @returns void
     */
    public setup($panel: JQuery): void {
        this.$panel = $panel;
        this.rootPathNode = {
            pathName: null,
            isDir: null,
            timestamp: null,
            size: null,
            isSelected: null,
            sortBy: null,
            sortDescending: null,
            parent: null,
            children: new Map(),
            childrenSelectedCount: 0
        };
        this.rootPathNode.children.set("UDF", {
            pathName: "UDF",
            isDir: true,
            timestamp: null,
            size: null,
            isSelected: false,
            sortBy: FileManagerField.Name,
            sortDescending: false,
            parent: this.rootPathNode,
            children: new Map(),
            childrenSelectedCount: 0
        });
        this.rootPathNode.children.set("Dataflow", {
            pathName: "Dataflow",
            isDir: true,
            timestamp: null,
            size: null,
            isSelected: false,
            sortBy: FileManagerField.Name,
            sortDescending: false,
            parent: this.rootPathNode,
            children: new Map(),
            childrenSelectedCount: 0
        });
        this.viewPathNode = this.rootPathNode.children.get("UDF");
        this.curHistoryNode = {
            pathNode: this.viewPathNode,
            prev: null,
            next: null
        };
        this.savedPathNodes = new Map();
        this.savedHistoryNodes = new Map();

        // todo: this is not working because this is called before UDFManager
        // gets its UDF list. Todo when apis are finalized.
        this._buildPathTree(this.rootPathNode.children.get("UDF"));
        this._updateList();

        this._addFileTypeAreaEvents();
        this._addNavigationAreaEvents();
        this._addTitleSectionEvents();
        this._addActionAreaEvents();
        this._addMainSectionEvents();
    }

    private _addFileTypeAreaEvents(): void {
        const $fileTypeMenu: JQuery = this.$panel.find(".fileTypeMenu");
        const $fileTypeIcon: JQuery = this.$panel.find(".fileTypeIcon");
        const $fileTypeMenuSection: JQuery = $fileTypeMenu.find(
            ".fileTypeMenuSection"
        );

        xcMenu.add($fileTypeMenu);

        $fileTypeIcon.on({
            mouseup: (event: JQueryEventObject) => {
                if (event.which !== 1) {
                    return;
                }

                event.stopPropagation();

                $fileTypeMenu.toggle();
            },
            click: (event: JQueryEventObject) => {
                event.stopPropagation();
            }
        });

        $fileTypeMenuSection.on({
            mouseup: (event: JQueryEventObject) => {
                if (event.which !== 1) {
                    return;
                }

                const fileType: string = $(event.currentTarget)
                .children(".label")
                .html();
                if (fileType === this._getCurType()) {
                    return;
                }
                this._eventSwitchType(fileType);
                $fileTypeMenu.siblings(".fileTypeContent").html(fileType);
            }
        });
    }

    private _addNavigationAreaEvents(): void {
        const $navigationButton: JQuery = this.$panel.find(
            ".navigationArea .navigationButton"
        );

        $navigationButton.on({
            mouseup: (event: JQueryEventObject) => {
                if (event.which !== 1) {
                    return;
                }

                event.stopPropagation();
                const $navigationIcon: JQuery = $(
                    event.currentTarget
                ).children(".icon");

                if ($navigationIcon.hasClass("xi-previous2")) {
                    this._eventNavigateList(true);
                } else if ($navigationIcon.hasClass("xi-next2")) {
                    this._eventNavigateList(false);
                } else if ($navigationIcon.hasClass("xi-refresh")) {
                    this._buildPathTree(this.rootPathNode.children.get("UDF"));
                    this._updateList();
                }
            }
        });
    }

    private _addActionAreaEvents(): void {
        const $actionMenu: JQuery = this.$panel.find(".actionMenu");
        const $actionIcon: JQuery = this.$panel.find(".actionIcon");
        const $actionMenuSection: JQuery = $actionMenu.find(
            ".actionMenuSection"
        );

        xcMenu.add($actionMenu);

        $actionIcon.on({
            mouseup: (event: JQueryEventObject) => {
                if (event.which !== 1) {
                    return;
                }

                event.stopPropagation();

                $actionMenu.toggle();
            },
            click: (event: JQueryEventObject) => {
                event.stopPropagation();
            }
        });

        $actionMenuSection.on({
            mouseup: (event: JQueryEventObject) => {
                if (event.which !== 1) {
                    return;
                }

                $actionMenu
                .siblings(".actionContent")
                .html($(event.currentTarget).html());
            }
        });
    }

    private _addTitleSectionEvents(): void {
        this.$panel.on(
            "mouseup",
            ".titleSection .field",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                const sortBy: string = $(event.currentTarget)
                .children(".label")
                .html();

                this._eventSort(sortBy);
            }
        );

        this.$panel.on(
            "mouseup",
            ".titleSection .checkBox",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                this._eventSelectAll();
            }
        );
    }

    private _addMainSectionEvents(): void {
        this.$panel.on(
            "mouseup",
            ".mainSection .checkBox",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                const $selectedPathLabel: JQuery = $(event.currentTarget)
                .next()
                .find(".label");

                this._eventSelectRow($selectedPathLabel);
            }
        );

        this.$panel.on(
            "mousedown",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const $row: JQuery = $(event.currentTarget).parent();
                $row.toggleClass("pressed");
                $row.siblings().removeClass("pressed");
            }
        );

        this.$panel.on(
            "dblclick",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const childPath: string = $(event.currentTarget)
                .parent(".row")
                .children(".field")
                .children(".label")
                .html();

                const newPath: string = this._getViewPath() + childPath + "/";
                this._eventSwitchList(newPath);
            }
        );
    }

    private _eventSwitchType(fileType: string): void {
        this.savedHistoryNodes.set(this._getCurType(), this.curHistoryNode);
        this.curHistoryNode = this.savedHistoryNodes.get(fileType) || {
            pathNode: this.viewPathNode,
            prev: null,
            next: null
        };

        this.savedPathNodes.set(this._getCurType(), this.viewPathNode);
        this.viewPathNode =
            this.savedPathNodes.get(fileType) ||
            this.rootPathNode.children.get(fileType);

        this._updateList();
    }

    private _eventNavigateList(back: boolean): void {
        let futureHistoryNode: FileManagerHistoryNode = null;
        if (back) {
            futureHistoryNode = this.curHistoryNode.prev;
        } else {
            futureHistoryNode = this.curHistoryNode.next;
        }
        if (futureHistoryNode === null) {
            return;
        }

        this.curHistoryNode = futureHistoryNode;
        this.viewPathNode = this.curHistoryNode.pathNode;
        this._updateList();
    }

    private _eventSwitchList(newPath: string): void {
        const newNode: FileManagerPathNode = this._pathToNode(newPath);
        if (newNode === null) {
            // todo: warn user.
            return;
        }

        this.curHistoryNode.next = {
            pathNode: newNode,
            prev: this.curHistoryNode,
            next: null
        };
        this.curHistoryNode = this.curHistoryNode.next;
        this.viewPathNode = newNode;
        this._updateList();
    }

    private _updateAddress(): void {
        this.$panel
        .find(".addressArea .addressContent")
        .html(this._getViewPath());
    }

    private _eventSelectAll(): void {
        const toSelectAll: boolean =
            this.viewPathNode.childrenSelectedCount === 0;

        for (const [childPath, childPathNode] of this.viewPathNode.children) {
            childPathNode.isSelected = toSelectAll;
            const $selectedPathLabel: JQuery = this.$panel.find(
                ".mainSection .field .label:contains('" + childPath + "')"
            );
            this._updateSelectRowButton($selectedPathLabel);
        }

        this.viewPathNode.childrenSelectedCount = toSelectAll
            ? this.viewPathNode.children.size
            : 0;
        this._updateSelectAllButton();
    }

    private _updateSelectAllButton(): void {
        let html: string = "";
        if (this.viewPathNode.childrenSelectedCount === 0) {
            html = '<i class="icon xi-ckbox-empty"></i>';
        } else if (
            this.viewPathNode.childrenSelectedCount ===
            this.viewPathNode.children.size
        ) {
            html = '<i class="icon xi-ckbox-selected"></i>';
        } else {
            html = '<i class="icon xi-checkbox-select"></i>';
        }
        this.$panel.find(".titleSection .checkBox").html(html);
    }

    private _eventSelectRow($selectedPathLabel: JQuery): void {
        const selectedPath: string = $selectedPathLabel.html();
        const selectedPathNode: FileManagerPathNode = this.viewPathNode.children.get(
            selectedPath
        );
        selectedPathNode.isSelected = !selectedPathNode.isSelected;
        this.viewPathNode.childrenSelectedCount += selectedPathNode.isSelected
            ? 1
            : -1;

        this._updateSelectRowButton($selectedPathLabel);
        this._updateSelectAllButton();
    }

    private _updateSelectRowButton($selectedPathLabel: JQuery): void {
        const selectedPath: string = $selectedPathLabel.html();
        const selectedPathNode: FileManagerPathNode = this.viewPathNode.children.get(
            selectedPath
        );
        const icon: string = selectedPathNode.isSelected
            ? "xi-ckbox-selected"
            : "xi-ckbox-empty";
        const html: string = '<i class="icon ' + icon + '"></i>';
        $selectedPathLabel
        .parent()
        .siblings(".checkBox")
        .html(html);
    }

    private _buildPathTree(curRootPathNode: FileManagerPathNode): void {
        // todo: Api is going to change.
        const storedUDF: Map<string, string> = UDF.getUDFs();

        for (const [key] of storedUDF) {
            const pathSplit: string[] = key.split("/");
            let curPathNode: FileManagerPathNode = curRootPathNode;
            for (const path of pathSplit) {
                if (path === "") {
                    continue;
                }

                if (curPathNode.children.has(path)) {
                    curPathNode = curPathNode.children.get(path);
                } else {
                    const childPathNode: FileManagerPathNode = {
                        pathName: path,
                        isDir: true,
                        timestamp: Math.floor(Math.random() * 101),
                        size: Math.floor(Math.random() * 101),
                        isSelected: false,
                        sortBy: FileManagerField.Name,
                        sortDescending: false,
                        parent: curPathNode,
                        children: new Map(),
                        childrenSelectedCount: 0
                    };
                    curPathNode.children.set(path, childPathNode);
                    curPathNode = childPathNode;
                }
            }
        }
    }

    private _eventSort(sortBy: string): void {
        this.viewPathNode.sortDescending =
            sortBy === this.viewPathNode.sortBy
                ? !this.viewPathNode.sortDescending
                : false;

        switch (sortBy) {
            case "Name":
                this.viewPathNode.sortBy = FileManagerField.Name;
                break;
            case "Date":
                this.viewPathNode.sortBy = FileManagerField.Date;
                break;
            case "Size":
                this.viewPathNode.sortBy = FileManagerField.Size;
                break;
            default:
                this.viewPathNode.sortBy = FileManagerField.Name;
        }

        this._updateSortIcon();
        this._sortList(this.viewPathNode);
        this._updateList();
    }

    private _sortList(curPathNode: FileManagerPathNode): void {
        const childPathEntryList: [string, FileManagerPathNode][] = [
            ...curPathNode.children.entries()
        ].sort(
            (
                a: [string, FileManagerPathNode],
                b: [string, FileManagerPathNode]
            ) => {
                let compare: number = 0;
                switch (curPathNode.sortBy) {
                    case FileManagerField.Name:
                        compare = a[1].pathName < b[1].pathName ? -1 : 1;
                        break;
                    case FileManagerField.Date:
                        compare = a[1].timestamp - b[1].timestamp;
                        break;
                    case FileManagerField.Size:
                        compare = a[1].size - b[1].size;
                        break;
                }
                return curPathNode.sortDescending ? -compare : compare;
            }
        );
        curPathNode.children = new Map(childPathEntryList);
    }

    private _updateSortIcon(): void {
        this.$panel
        .find(".titleSection .field .icon")
        .each((_index: number, elem: Element) => {
            if (
                $(elem)
                .siblings(".label")
                .html() === this.viewPathNode.sortBy
            ) {
                $(elem).removeClass("xi-sort");
                $(elem).removeClass("xi-arrow-up");
                $(elem).removeClass("xi-arrow-down");
                const newClass: string = this.viewPathNode.sortDescending
                    ? "xi-arrow-down"
                    : "xi-arrow-up";
                $(elem).addClass(newClass);
            } else {
                $(elem).removeClass("xi-arrow-up");
                $(elem).removeClass("xi-arrow-down");
                $(elem).addClass("xi-sort");
            }
        });
    }

    private _updateList(): void {
        let html: string = "";
        for (const [, childPathNode] of this.viewPathNode.children) {
            const selectIcon: string = childPathNode.isSelected
                ? "xi-ckbox-selected"
                : "xi-ckbox-empty";
            const folderIcon: string = childPathNode.isDir
                ? "xi-folder"
                : "xi-menu-udf";

            html +=
                '<div class="row">' +
                '  <div class="checkBox">' +
                '    <i class="icon ' +
                selectIcon +
                '"></i>' +
                "  </div>" +
                '  <div class="field">' +
                '    <i class="icon ' +
                folderIcon +
                '"></i>' +
                '    <span class="label">' +
                childPathNode.pathName +
                "</span>" +
                "  </div>" +
                '  <div class="field">' +
                '    <span class="label">' +
                childPathNode.timestamp +
                "</span>" +
                "  </div>" +
                '  <div class="field">' +
                '    <span class="label">' +
                childPathNode.size +
                "</span>" +
                "  </div>" +
                "</div>";
        }

        this.$panel.find(".mainSection").html(html);
        this._updateAddress();
        this._updateSelectAllButton();
        this._updateSortIcon();
    }

    private _getViewPath(): string {
        return this._nodeToPath(this.viewPathNode);
    }

    private _getCurType(): string {
        let curPathNode: FileManagerPathNode = this.viewPathNode;
        while (curPathNode.parent !== this.rootPathNode) {
            curPathNode = curPathNode.parent;
        }
        return curPathNode.pathName;
    }

    private _nodeToPath(curPathNode: FileManagerPathNode): string {
        let res: string = "/";
        while (curPathNode.parent !== this.rootPathNode) {
            res = "/" + curPathNode.pathName + res;
            curPathNode = curPathNode.parent;
        }
        return res;
    }

    private _pathToNode(path: string): FileManagerPathNode {
        let curPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "UDF"
        );
        const paths: string[] = path.split("/");

        for (const curPath of paths) {
            if (curPath === "") {
                continue;
            }

            if (curPathNode.children.has(curPath)) {
                curPathNode = curPathNode.children.get(curPath);
            } else {
                return null;
            }
        }

        return curPathNode;
    }
}
