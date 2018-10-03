class FileManagerPanel {
    private static _instance = null;

    public static get Instance(): FileManagerPanel {
        return this._instance || (this._instance = new this());
    }

    private $panel: JQuery;
    private rootPathNode: FileManagerPathNode;
    private viewPathNode: FileManagerPathNode;
    private selectedPathNodes: Set<FileManagerPathNode>;
    private curHistoryNode: FileManagerHistoryNode;
    private savedPathNodes: Map<string, FileManagerPathNode>;
    private savedHistoryNodes: Map<string, FileManagerHistoryNode>;
    private managers: Map<string, BaseFileManager>;

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
            isSorted: false,
            parent: null,
            children: new Map()
        };
        this.rootPathNode.children.set("UDF", {
            pathName: "UDF",
            isDir: true,
            timestamp: null,
            size: null,
            isSelected: false,
            sortBy: FileManagerField.Name,
            sortDescending: false,
            isSorted: false,
            parent: this.rootPathNode,
            children: new Map()
        });
        this.rootPathNode.children.set("Dataflow", {
            pathName: "Dataflow",
            isDir: true,
            timestamp: null,
            size: null,
            isSelected: false,
            sortBy: FileManagerField.Name,
            sortDescending: false,
            isSorted: false,
            parent: this.rootPathNode,
            children: new Map()
        });
        this.viewPathNode = this.rootPathNode.children.get("UDF");
        this.selectedPathNodes = new Set();
        this.curHistoryNode = {
            pathNode: this.viewPathNode,
            prev: null,
            next: null
        };
        this.savedPathNodes = new Map();
        this.savedHistoryNodes = new Map();
        this.managers = new Map();
        this.managers.set("UDF", UDFFileManager.Instance);

        this._addFileTypeAreaEvents();
        this._addNavigationAreaEvents();
        this._addAddressAreaEvents();
        this._addTitleSectionEvents();
        this._addActionAreaEvents();
        this._addMainSectionEvents();
    }

    /**
     * Build UDF path trie.
     * @returns void
     */
    // TODO: this is called every time with an update.
    // nice to have a partial tree update function and algorithm for performance.
    public udfBuildPathTree(hard?: boolean): void {
        const udfRootPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "UDF"
        );
        // TODO: many hacks here. Api is going to change.
        const storedUDF: Map<
        string,
        string
        > = UDFFileManager.Instance.getUDFs();

        for (const [key] of storedUDF) {
            const pathSplit: string[] = key.split("/");
            let curPathNode: FileManagerPathNode = udfRootPathNode;
            for (const path of pathSplit) {
                if (path === "") {
                    continue;
                }

                if (hard) {
                    curPathNode.children = new Map();
                }

                if (curPathNode.children.has(path)) {
                    curPathNode = curPathNode.children.get(path);
                    // TODO: hack due to pending api.
                } else if (curPathNode.children.has(path + ".py")) {
                    curPathNode = curPathNode.children.get(path + ".py");
                } else {
                    curPathNode.isSorted = false;
                    const childPathNode: FileManagerPathNode = {
                        pathName: path,
                        isDir: true,
                        // TODO: no info from api.
                        timestamp: Math.floor(Math.random() * 101),
                        size: Math.floor(Math.random() * 101),
                        isSelected: false,
                        sortBy: FileManagerField.Name,
                        sortDescending: false,
                        isSorted: false,
                        parent: curPathNode,
                        children: new Map()
                    };
                    curPathNode.children.set(path, childPathNode);
                    curPathNode = childPathNode;
                }
            }
            // TODO: this is a hack. It could be an empty folder.
            curPathNode.isDir = false;

            curPathNode.parent.children.delete(curPathNode.pathName);
            // TODO: hack due to pending api.
            if (!curPathNode.pathName.endsWith(".py")) {
                curPathNode.pathName += ".py";
            }
            curPathNode.parent.children.set(curPathNode.pathName, curPathNode);
        }

        if (hard) {
            this._refreshNodeReference();
        }
    }

    /**
     * Update the file list view in file manager.
     * @returns void
     */
    public updateList(): void {
        let html: string = "";
        this.selectedPathNodes.clear();

        if (!this.viewPathNode) {
            this.$panel.find(".mainSection").html("");
            this._updateSelectAllButton();
            return;
        }

        if (!this.viewPathNode.isSorted) {
            this._sortList(this.viewPathNode);
        }

        for (const [, childPathNode] of this.viewPathNode.children) {
            if (childPathNode.isSelected) {
                this.selectedPathNodes.add(childPathNode);
            }
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

    private get manager(): BaseFileManager {
        return this.managers.get(this._getCurType());
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
                    // TODO: should update from backend.
                    this.udfBuildPathTree();
                    this.updateList();
                }
            }
        });
    }

    private _addAddressAreaEvents(): void {
        const $addressBox: JQuery = this.$panel.find(
            ".addressArea .addressBox"
        );

        $addressBox.on({
            keydown: (event: JQueryEventObject) => {
                if (event.which !== keyCode.Enter) {
                    return;
                }

                let newPath: string = $addressBox
                .children(".addressContent")
                .val();

                if (!newPath.endsWith("/")) {
                    newPath += "/";
                }

                if (newPath !== this._getViewPath()) {
                    this._eventSwitchList(newPath);
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

                this._updateActionArea();
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

                const action: string = $(event.currentTarget)
                .children(".label")
                .html();

                switch (action) {
                    case FileManagerAction.Open:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.open(
                            this._nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                    case FileManagerAction.Download:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.download(
                            this._nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                    case FileManagerAction.Delete:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.delete(
                            [...this.selectedPathNodes.entries()].map(
                                (
                                    value: [
                                    FileManagerPathNode,
                                    FileManagerPathNode
                                    ]
                                ) => {
                                    return this._nodeToPath(value[0]);
                                }
                            )
                        );
                }
            }
        });
    }

    private _updateActionArea(): void {
        const $actionMenuSection: JQuery = this.$panel.find(
            ".actionMenu .actionMenuSection"
        );

        $actionMenuSection.each((_index: number, elem: Element) => {
            if (
                !this._isValidAction($(elem)
                .children(".label")
                .html() as FileManagerAction)
            ) {
                $(elem).addClass("disabled");
            } else {
                $(elem).removeClass("disabled");
            }
        });
    }

    private _isValidAction(action: FileManagerAction) {
        switch (action) {
            case FileManagerAction.Open:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir
                );
            case FileManagerAction.Download:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir
                );
            case FileManagerAction.Delete:
                for (const selectedPathNode of this.selectedPathNodes) {
                    if (selectedPathNode.isDir) {
                        return false;
                    }
                }
                return this.selectedPathNodes.size > 0;
            default:
                return false;
        }
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
        this.savedPathNodes.set(this._getCurType(), this.viewPathNode);

        this.viewPathNode =
            this.savedPathNodes.get(fileType) ||
            this.rootPathNode.children.get(fileType);
        this.curHistoryNode = this.savedHistoryNodes.get(fileType) || {
            pathNode: this.viewPathNode,
            prev: null,
            next: null
        };

        this.updateList();
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
        this.updateList();
    }

    private _eventSwitchList(newPath: string): void {
        let newNode: FileManagerPathNode = this._pathToNode(newPath);
        if (newNode === null) {
            // TODO: warn user.
            return;
        }

        if (!newNode.isDir) {
            this.manager.open(newPath);
            newNode = newNode.parent;
        }

        if (newNode !== this.curHistoryNode.pathNode) {
            this.curHistoryNode.next = {
                pathNode: newNode,
                prev: this.curHistoryNode,
                next: null
            };
            this.curHistoryNode = this.curHistoryNode.next;
        }

        this.viewPathNode = newNode;
        this.updateList();
    }

    private _updateAddress(): void {
        this.$panel
        .find(".addressArea .addressContent")
        .val(this._getViewPath());
    }

    private _eventSelectAll(): void {
        if (!this.viewPathNode) {
            return;
        }

        const toSelectAll: boolean = this.selectedPathNodes.size === 0;

        for (const [childPath, childPathNode] of this.viewPathNode.children) {
            childPathNode.isSelected = toSelectAll;
            if (childPathNode.isSelected) {
                this.selectedPathNodes.add(childPathNode);
            } else {
                this.selectedPathNodes.delete(childPathNode);
            }
            const $selectedPathLabel: JQuery = this.$panel.find(
                ".mainSection .field .label:contains('" + childPath + "')"
            );
            this._updateSelectRowButton($selectedPathLabel);
        }

        this.selectedPathNodes = toSelectAll
            ? new Set(this.viewPathNode.children.values())
            : new Set();

        this._updateSelectAllButton();
    }

    private _updateSelectAllButton(): void {
        let html: string = "";
        if (this.selectedPathNodes.size === 0) {
            html = '<i class="icon xi-ckbox-empty"></i>';
        } else if (
            this.selectedPathNodes.size === this.viewPathNode.children.size
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
        if (selectedPathNode.isSelected) {
            this.selectedPathNodes.add(selectedPathNode);
        } else {
            this.selectedPathNodes.delete(selectedPathNode);
        }

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
        this.updateList();
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
        curPathNode.isSorted = true;
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

    private _refreshNodeReference(): void {
        this.viewPathNode = this._pathToNode(
            this._nodeToPath(this.viewPathNode)
        );

        let tmpHistoryNode: FileManagerHistoryNode = this.curHistoryNode;
        tmpHistoryNode.pathNode = this._pathToNode(
            this._nodeToPath(tmpHistoryNode.pathNode)
        );

        while (tmpHistoryNode.prev) {
            tmpHistoryNode = tmpHistoryNode.prev;
            tmpHistoryNode.pathNode = this._pathToNode(
                this._nodeToPath(tmpHistoryNode.pathNode)
            );
        }

        tmpHistoryNode = this.curHistoryNode;
        while (tmpHistoryNode.next) {
            tmpHistoryNode = tmpHistoryNode.next;
            tmpHistoryNode.pathNode = this._pathToNode(
                this._nodeToPath(tmpHistoryNode.pathNode)
            );
        }
    }
}
