class FileManagerPanel {
    private static _instance = null;

    public static get Instance(): FileManagerPanel {
        return this._instance || (this._instance = new this());
    }

    private $panel: JQuery;
    private curFileType: string;
    private managers: Map<string, BaseFileManager>;
    private rootPathNode: FileManagerPathNode;
    private viewPathNode: FileManagerPathNode;
    private selectedPathNodes: Set<FileManagerPathNode>;
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
        this.curFileType = "UDF";
        this.managers = new Map();
        this.managers.set("UDF", UDFFileManager.Instance);
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

        this.udfBuildPathTree();
        this.dataflowBuildPathTree();

        this.viewPathNode = this.rootPathNode.children.get(this.curFileType);
        this.selectedPathNodes = new Set();
        this.curHistoryNode = {
            path: this._nodeToPath(this.viewPathNode),
            prev: null,
            next: null
        };
        this.savedPathNodes = new Map();
        this.savedHistoryNodes = new Map();

        this._addFileTypeAreaEvents();
        this._addNavigationAreaEvents();
        this._addAddressAreaEvents();
        this._addSearchBarEvents();
        this._addTitleSectionEvents();
        this._addActionAreaEvents();
        this._addMainSectionEvents();
    }

    /**
     * Build UDF path trie.
     * @returns void
     */
    public udfBuildPathTree(clean?: boolean): void {
        if (!this.rootPathNode.children.has("UDF")) {
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
        }

        const udfRootPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "UDF"
        );
        const storedUDF: Map<
        string,
        string
        > = UDFFileManager.Instance.getUDFs();

        for (let [key] of storedUDF) {
            key = UDFFileManager.Instance.nsNameToDisplayName(key);
            const pathSplit: string[] = key.split("/");
            let curPathNode: FileManagerPathNode = udfRootPathNode;

            for (const path of pathSplit) {
                if (path === "") {
                    continue;
                }

                if (curPathNode.children.has(path)) {
                    curPathNode = curPathNode.children.get(path);
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
            curPathNode.isDir = false;
        }

        if (clean) {
            this._udfCleanPaths();
        }
    }

    /**
     * Build dataflow path trie.
     * @returns void
     */
    public dataflowBuildPathTree(): void {
        if (!this.rootPathNode.children.has("Dataflow")) {
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
        }
    }

    /**
     * Update the file list view in file manager.
     * @returns void
     */
    public updateList(): void {
        let html: string = "";
        this.selectedPathNodes.clear();

        if (!this.viewPathNode.isSorted) {
            this._sortList(this.viewPathNode);
        }

        for (const [childPath, childPathNode] of this.viewPathNode.children) {
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
                '  <div class="field nameField">' +
                '    <i class="icon ' +
                folderIcon +
                '"></i>' +
                '    <span class="label">' +
                childPath +
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

    /**
     * @returns void
     */
    public udfCreateWorkbookFolder(): void {
        let folderPath = UDFFileManager.Instance.nsNameToDisplayName(
            UDFFileManager.Instance.getCurrWorkbookPath()
        );
        folderPath = folderPath.substring(0, folderPath.length - 3);
        const paths: string[] = folderPath.split("/");
        let curPathNode = this.rootPathNode.children.get("UDF");

        paths.forEach((path: string) => {
            if (path === "") {
                return;
            }

            if (curPathNode.children.has(path)) {
                curPathNode = curPathNode.children.get(path);
                return;
            } else {
                curPathNode.children.set(path, {
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
                });
                curPathNode = curPathNode.children.get(path);
            }
        });
    }

    /**
     * @param  {string} fileType
     */
    public switchType(fileType: string) {
        this._eventSwitchType(fileType);
    }

    /**
     * @param  {string} path
     * @returns void
     */
    public switchPath(path: string): void {
        this._eventSwitchPath(path);
    }

    /**
     * @param  {string} path
     */
    public removeSearchResultNode(path: string) {
        if (!this.rootPathNode.children.get("Search")) {
            return;
        }
        this.rootPathNode.children.get("Search").children.delete(path);
    }

    private _udfCleanPaths(): void {
        const storedUDF: Map<
        string,
        string
        > = UDFFileManager.Instance.getUDFs();
        const storedUDFSet: Set<string> = new Set(
            Array.from(storedUDF.keys()).map((value: string) => {
                return UDFFileManager.Instance.nsNameToDisplayName(value);
            })
        );
        const curPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "UDF"
        );
        const sortRes: FileManagerPathNode[] = [];
        const visited: Set<FileManagerPathNode> = new Set();

        this._udfSortPaths(curPathNode, visited, sortRes);
        sortRes.pop();

        for (const sortedPathNode of sortRes) {
            if (
                (!sortedPathNode.isDir &&
                    !storedUDFSet.has(this._nodeToPath(sortedPathNode))) ||
                (sortedPathNode.isDir &&
                    sortedPathNode.children.size === 0 &&
                    this._nodeToPath(sortedPathNode) !==
                        UDFFileManager.Instance.getCurrWorkbookDisplayPath())
            ) {
                sortedPathNode.parent.children.delete(sortedPathNode.pathName);
            }
        }

        this._refreshNodeReference();
    }

    private _udfSortPaths(
        curPathNode: FileManagerPathNode,
        visited: Set<FileManagerPathNode>,
        sortRes: FileManagerPathNode[]
    ): void {
        if (visited.has(curPathNode)) {
            return;
        }

        visited.add(curPathNode);

        for (const childPathNode of curPathNode.children.values()) {
            this._udfSortPaths(childPathNode, visited, sortRes);
        }

        sortRes.push(curPathNode);
    }

    private get manager(): BaseFileManager {
        return this.managers.get(this.curFileType);
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
                .html()
                .replace(/(^\n)|(,\n)/g, "");

                this._eventSwitchType(fileType);
                $fileTypeMenu
                .siblings()
                .children(".fileTypeContent")
                .html(fileType);
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
                    this._eventNavigatePath(true);
                } else if ($navigationIcon.hasClass("xi-next2")) {
                    this._eventNavigatePath(false);
                } else if ($navigationIcon.hasClass("xi-refresh")) {
                    // TODO: should update from backend.
                    this.udfBuildPathTree(true);
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
                    this._eventSwitchPath(newPath);
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
                .html()
                .replace(/(^\n)|(,\n)/g, "");

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
            const action: string = $(elem)
            .children(".label")
            .html()
            .replace(/(^\n)|(,\n)/g, "");

            if (!this._isValidAction(action as FileManagerAction)) {
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
                    if (
                        selectedPathNode.isDir ||
                        !this.manager.isWritable(
                            this._nodeToPath(selectedPathNode)
                        )
                    ) {
                        return false;
                    }
                }
                return this.selectedPathNodes.size > 0;
            default:
                return false;
        }
    }

    private _addSearchBarEvents(): void {
        const $searchInput: JQuery = this.$panel.find(
            ".searchBox .searchInput"
        );

        $searchInput.on({
            keydown: (event: JQueryEventObject) => {
                if (event.which !== keyCode.Enter) {
                    return;
                }

                const keyword: string = $searchInput.val();
                this._eventSearch(keyword);
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
                .html()
                .replace(/(^\n)|(,\n)/g, "");

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

                const newPath: string =
                    this.viewPathNode ===
                    this.rootPathNode.children.get("Search")
                        ? childPath
                        : this._getViewPath() + childPath + "/";
                this._eventSwitchPath(newPath);
            }
        );
    }

    private _eventSwitchType(fileType: string): void {
        if (fileType === this.curFileType) {
            return;
        }

        this.savedHistoryNodes.set(this.curFileType, this.curHistoryNode);
        this.savedPathNodes.set(this.curFileType, this.viewPathNode);

        this.viewPathNode =
            this.savedPathNodes.get(fileType) ||
            this.rootPathNode.children.get(fileType);
        this.curHistoryNode = this.savedHistoryNodes.get(fileType) || {
            path: this._nodeToPath(this.viewPathNode),
            prev: null,
            next: null
        };

        this.curFileType = fileType;
        this.updateList();
    }

    private _eventNavigatePath(back: boolean): void {
        let futureHistoryNode: FileManagerHistoryNode = null;
        if (back) {
            futureHistoryNode = this.curHistoryNode.prev;
        } else {
            futureHistoryNode = this.curHistoryNode.next;
        }

        if (!futureHistoryNode) {
            return;
        }

        this.curHistoryNode = futureHistoryNode;
        this.viewPathNode =
            this.curHistoryNode.path === "Search"
                ? this.rootPathNode.children.get("Search")
                : this._pathToNode(this.curHistoryNode.path);
        this.updateList();
    }

    private _eventSwitchPath(newPath: string): void {
        let newNode: FileManagerPathNode = this._pathToNode(newPath, true);
        if (!newNode) {
            // TODO: warn user.
            return;
        }

        if (!newNode.isDir) {
            this.manager.open(newPath);
            newNode = newNode.parent;
            newPath = this._nodeToPath(newNode);

            if (
                this.viewPathNode === this.rootPathNode.children.get("Search")
            ) {
                return;
            }
        }

        if (newPath !== this.curHistoryNode.path) {
            this.curHistoryNode.next = {
                path: newPath,
                prev: this.curHistoryNode,
                next: null
            };
            this.curHistoryNode = this.curHistoryNode.next;
        }

        this.viewPathNode = newNode;
        this.updateList();
    }

    private _updateAddress(): void {
        const address: string =
            this.viewPathNode === this.rootPathNode.children.get("Search")
                ? "Search results"
                : this._getViewPath();

        this.$panel.find(".addressArea .addressContent").val(address);
    }

    private _eventSearch(keyword: string): void {
        if (!this.rootPathNode.children.has("Search")) {
            this.rootPathNode.children.set("Search", {
                pathName: "Search",
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
        }

        this.rootPathNode.children.get("Search").children = new Map();
        this.rootPathNode.children.get("Search").isSorted = false;
        const rootTypePathNode: FileManagerPathNode = this.rootPathNode.children.get(
            this.curFileType
        );
        const rootSearchPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "Search"
        );
        const searchQueue: FileManagerPathNode[] = [];
        searchQueue.push(rootTypePathNode);

        while (searchQueue.length !== 0) {
            const curPathNode: FileManagerPathNode = searchQueue.shift();

            if (curPathNode.pathName.includes(keyword)) {
                rootSearchPathNode.children.set(
                    this._nodeToPath(curPathNode),
                    curPathNode
                );
            }

            for (const childPathNode of curPathNode.children.values()) {
                searchQueue.push(childPathNode);
            }
        }

        if (this.curHistoryNode.path !== "Search") {
            this.curHistoryNode.next = {
                path: "Search",
                prev: this.curHistoryNode,
                next: null
            };
            this.curHistoryNode = this.curHistoryNode.next;
        }

        this.viewPathNode = rootSearchPathNode;
        this.updateList();
    }

    private _eventSelectAll(): void {
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
        this.viewPathNode.isSorted = false;
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
                        compare = a[0] < b[0] ? -1 : 1;
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
            const sortBy: string = $(elem)
            .siblings(".label")
            .html()
            .replace(/(^\n)|(,\n)/g, "");

            if (sortBy === this.viewPathNode.sortBy) {
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

    private _nodeToPath(curPathNode: FileManagerPathNode): string {
        let res: string = curPathNode.isDir ? "/" : "";
        while (curPathNode.parent !== this.rootPathNode) {
            res = "/" + curPathNode.pathName + res;
            curPathNode = curPathNode.parent;
        }
        return res;
    }

    private _pathToNode(
        path: string,
        returnNull?: boolean
    ): FileManagerPathNode {
        let curPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            this.curFileType
        );
        const paths: string[] = path.split("/");

        for (const curPath of paths) {
            if (curPath === "") {
                continue;
            }

            if (curPathNode.children.has(curPath)) {
                curPathNode = curPathNode.children.get(curPath);
            } else {
                return returnNull ? null : curPathNode;
            }
        }

        return curPathNode;
    }

    private _refreshNodeReference(): void {
        if (this.viewPathNode === this.rootPathNode.children.get("Search")) {
            return;
        }

        this.viewPathNode = this._pathToNode(
            this._nodeToPath(this.viewPathNode)
        );
    }
}
