class FileManagerPanel {
    public rootPathNode: FileManagerPathNode;
    private $panel: JQuery;
    private curFileType: string;
    private managers: Map<string, BaseFileManager>;
    private viewPathNode: FileManagerPathNode;
    private selectedPathNodes: Set<FileManagerPathNode>;
    private curHistoryNode: FileManagerHistoryNode;
    private savedPathNodes: Map<string, FileManagerPathNode>;
    private savedHistoryNodes: Map<string, FileManagerHistoryNode>;
    private locked: boolean;

    /**
     * Setup FileManager.
     * @param  {JQuery} $panel
     * @returns void
     */
    public constructor($panel: JQuery) {
        this.$panel = $panel;
        this.managers = new Map();
        this.managers.set("UDF", UDFFileManager.Instance);
        this.curFileType = "UDF";
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

        for (const [fileType, manager] of this.managers.entries()) {
            this.rootPathNode.children.set(fileType, {
                pathName: fileType,
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
            manager.registerPanel(this);
        }

        this.viewPathNode = this.rootPathNode.children.get(this.curFileType);
        this.selectedPathNodes = new Set();
        this.curHistoryNode = {
            path: this.getViewPath(),
            prev: null,
            next: null
        };
        this.savedPathNodes = new Map();
        this.savedHistoryNodes = new Map();
        this.locked = false;

        this._addFileTypeAreaEvents();
        this._addNavigationAreaEvents();
        this._addAddressAreaEvents();
        this._addUploadEvents();
        this._addSearchBarEvents();
        this._addTitleSectionEvents();
        this._addActionAreaEvents();
        this._addMainSectionEvents();
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
                : this.manager.fileIcon();

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
                '  <div class="field dateField">' +
                '    <span class="label">' +
                childPathNode.timestamp +
                "</span>" +
                "  </div>" +
                '  <div class="field typeField">' +
                '    <span class="label">' +
                childPathNode.size +
                "</span>" +
                "  </div>" +
                "</div>";
        }

        this.$panel.find(".mainSection").html(html);
        this._updateAddress();
        this._updateUploadArea();
        this._updateSelectAllButton();
        this._updateSortIcon();
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
     * @param  {boolean} clear?
     * @returns void
     */
    public switchPathByStep(path: string, clear?: boolean): void {
        if (clear) {
            this.curHistoryNode = {
                path: "/",
                prev: null,
                next: null
            };
        }

        // When workbook is not activated, curWorkbookDisplayPath is null.
        if (!path) {
            path = "";
        }

        const pathSplit: string[] = path.split("/");
        let curPath: string = pathSplit.shift();
        while (pathSplit.length !== 0) {
            const nextPath = pathSplit.shift();
            if (nextPath === "") {
                continue;
            }
            curPath += nextPath + "/";
            this.switchPath(curPath);
        }
    }

    /**
     * @param  {string} paths
     */
    public removeSearchResultNodes(paths: string[]) {
        if (!this.rootPathNode.children.get("Search")) {
            return;
        }
        paths.forEach((path: string) => {
            this.rootPathNode.children.get("Search").children.delete(path);
        });
    }

    /**
     * @param  {FileManagerPathNode} curPathNode
     * @returns string
     */
    public nodeToPath(curPathNode: FileManagerPathNode): string {
        const rootSearchPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "Search"
        );
        if (curPathNode === rootSearchPathNode) {
            return "Search results";
        }

        let res: string = curPathNode.isDir ? "/" : "";
        while (curPathNode.parent !== this.rootPathNode) {
            res = "/" + curPathNode.pathName + res;
            curPathNode = curPathNode.parent;
        }
        return res;
    }

    /**
     * @returns void
     */
    public refreshNodeReference(): void {
        if (this.viewPathNode === this.rootPathNode.children.get("Search")) {
            return;
        }

        this.viewPathNode = this._pathToNode(this.getViewPath());
    }

    /**
     * @param  {string} path
     * @returns void
     */
    public isDir(path: string): boolean {
        if (!path.startsWith("/")) {
            path = this.getViewPath() + path;
        }
        return this._pathToNode(path).isDir;
    }

    /**
     * @returns void
     */
    public lock(): void {
        this.locked = true;
    }

    /**
     * @returns void
     */
    public unlock(): void {
        this.locked = false;
    }

    /**
     * @returns FileManagerPathNode
     */
    public getViewNode(): FileManagerPathNode {
        return this.viewPathNode;
    }

    /**
     * @returns string
     */
    public getViewPath(): string {
        return this.nodeToPath(this.viewPathNode);
    }

    /**
     * @param  {string} displayPath
     * @param  {JQuery} $inputSection?
     * @param  {JQuery} $actionButton?
     * @param  {string} side?
     * @returns boolean
     */
    public canAdd(
        displayPath: string,
        $inputSection?: JQuery,
        $actionButton?: JQuery,
        side?: string
    ): boolean {
        return this.manager.canAdd(
            displayPath,
            $inputSection,
            $actionButton,
            side
        );
    }

    /**
     * @returns string
     */
    public fileExtension(): string {
        return this.manager.fileExtension();
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
                event.stopPropagation();

                $fileTypeMenu.toggle();
            },
            click: (event: JQueryEventObject) => {
                event.stopPropagation();
            }
        });

        $fileTypeMenuSection.on({
            mouseup: (event: JQueryEventObject) => {
                const fileType: string = $(event.currentTarget)
                .children(".label")
                .html()
                .replace(/(^\n)|(\n$)/g, "");

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
                event.stopPropagation();
                const $navigationIcon: JQuery = $(
                    event.currentTarget
                ).children(".icon");

                if ($navigationIcon.hasClass("xi-previous2")) {
                    this._eventNavigatePath(true);
                } else if ($navigationIcon.hasClass("xi-next2")) {
                    this._eventNavigatePath(false);
                } else if ($navigationIcon.hasClass("xi-refresh")) {
                    this.manager.refresh(true, true);
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

                // For example, the saveAsModal is also listening to this event.
                event.stopPropagation();

                let newPath: string = $addressBox
                .children(".addressContent")
                .val();

                if (!newPath.endsWith("/")) {
                    newPath += "/";
                }

                if (newPath !== this.getViewPath()) {
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
                const action: string = $(event.currentTarget)
                .children(".label")
                .html()
                .replace(/(^\n)|(\n$)/g, "");

                switch (action) {
                    case FileManagerAction.Open:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.open(
                            this.nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                    case FileManagerAction.Download:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.download(
                            this.nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                    case FileManagerAction.Delete:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const deleteFiles = () =>
                            this.manager.delete(
                                [...this.selectedPathNodes.entries()].map(
                                    (
                                        value: [
                                        FileManagerPathNode,
                                        FileManagerPathNode
                                        ]
                                    ) => {
                                        return this.nodeToPath(value[0]);
                                    }
                                )
                            );
                        Alert.show({
                            title: FileManagerTStr.DelTitle,
                            msg:
                                this.selectedPathNodes.size > 1
                                    ? FileManagerTStr.DelMsgs
                                    : FileManagerTStr.DelMsg,
                            onConfirm: () => {
                                deleteFiles();
                            }
                        });

                        break;
                    case FileManagerAction.Duplicate: {
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const oldPath: string = this.nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        );
                        const newPath: string = this._getDuplicateFileName(
                            oldPath
                        );
                        this.manager.copy(oldPath, newPath).fail((error) => {
                            Alert.error(FileManagerTStr.DuplicateFail, error);
                        });
                        break;
                    }
                    case FileManagerAction.CopyTo: {
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const oldPathNode: FileManagerPathNode = [
                            ...this.selectedPathNodes.entries()
                        ][0][0];
                        const oldPath: string = this.nodeToPath(oldPathNode);
                        const options = {
                            onSave: (newPath: string) => {
                                this.manager
                                .copy(oldPath, newPath)
                                .fail((error) => {
                                    Alert.error(
                                        FileManagerTStr.DuplicateFail,
                                        error
                                    );
                                });
                            }
                        };
                        FileManagerSaveAsModal.Instance.show(
                            FileManagerTStr.COPYTO,
                            oldPath.split("/").pop(),
                            // Should not use getViewPath, otherwise won't work
                            // in search results.
                            this.nodeToPath(oldPathNode.parent),
                            options
                        );
                        break;
                    }
                    case FileManagerAction.Share:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.share(
                            this.nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                }
            }
        });
    }

    private _getDuplicateFileName(path: string): string {
        const curPathNode: FileManagerPathNode = this._pathToNode(path, true);
        if (!curPathNode) {
            return null;
        }

        const fileName: string = curPathNode.pathName.substring(
            0,
            curPathNode.pathName.lastIndexOf(".")
        );
        const fileNameSet: Set<string> = new Set(
            [...curPathNode.parent.children.values()]
            .filter((value: FileManagerPathNode) => {
                return !value.isDir;
            })
            .map((value: FileManagerPathNode) => {
                return value.pathName.substring(
                    0,
                    value.pathName.lastIndexOf(".")
                );
            })
        );

        let i: number = 1;
        while (fileNameSet.has(fileName + "_" + i++));
        --i;

        return (
            this.nodeToPath(curPathNode.parent) +
            fileName +
            "_" +
            i +
            this.manager.fileExtension()
        );
    }

    private _updateActionArea(): void {
        const $actionMenuSection: JQuery = this.$panel.find(
            ".actionMenu .actionMenuSection"
        );

        $actionMenuSection.each((_index: number, elem: Element) => {
            const action: string = $(elem)
            .children(".label")
            .html()
            .replace(/(^\n)|(\n$)/g, "");

            if (!this._isValidAction(action as FileManagerAction)) {
                $(elem).addClass("disabled");
            } else {
                $(elem).removeClass("disabled");
            }
        });
    }

    private _isValidAction(action: FileManagerAction) {
        if (this.locked) {
            return false;
        }
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
                        !this.manager.canDelete(
                            this.nodeToPath(selectedPathNode)
                        )
                    ) {
                        return false;
                    }
                }
                return this.selectedPathNodes.size > 0;
            case FileManagerAction.Duplicate:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir &&
                    this.manager.canDuplicate(
                        this.nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        )
                    )
                );
            case FileManagerAction.CopyTo:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir
                );
            case FileManagerAction.Share:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir &&
                    this.manager.canShare(
                        this.nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        )
                    )
                );
            default:
                return false;
        }
    }

    private _addUploadEvents(): void {
        const $operationAreaUpload: JQuery = this.$panel.find(
            ".operationArea"
        );
        $operationAreaUpload.children(".operationContent").on({
            mouseup: () => {
                this._eventClickUpload();
            }
        });

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        $uploadButton.change((event: JQueryEventObject) => {
            this._eventUpload($(event.currentTarget).val());
        });
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
            },
            input: (_event: JQueryEventObject) => {
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
                .replace(/(^\n)|(\n$)/g, "");

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
                        : this.getViewPath() + childPath + "/";
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
            path: this.getViewPath(),
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
            const options: {side: string; offsetY: number} = {
                side: "bottom",
                offsetY: 0
            };
            StatusBox.show(
                FileManagerTStr.InvalidPath,
                this.$panel.find(".addressArea .addressContent"),
                true,
                options
            );
            return;
        }

        if (!newNode.isDir) {
            newPath = newPath.replace(/\/$/, "");
            if (!this.locked) {
                this.manager.open(newPath);
            }
            newNode = newNode.parent;
            newPath = this.nodeToPath(newNode);

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
        const address: string = this.getViewPath();
        this.$panel.find(".addressArea .addressContent").val(address);
    }

    private _eventClickUpload(): void {
        if (
            !this.manager.canDelete(
                this.getViewPath() + this.manager.fileExtension()
            )
        ) {
            return;
        }

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        $uploadButton.val("");
        $uploadButton.click();
    }

    private _eventUpload(path: string): void {
        if (path.trim() === "") {
            return;
        }

        path =
            this.getViewPath() +
            path
            .replace(/C:\\fakepath\\/i, "")
            .toLowerCase()
            .replace(/ /g, "");

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        const $uploadVisibleButton: JQuery = this.$panel.find(
            ".operationAreaUpload .operationContent"
        );
        const file: File = ($uploadButton[0] as HTMLInputElement).files[0];

        const reader: FileReader = new FileReader();
        reader.onload = (readerEvent: any) => {
            const entireString = readerEvent.target.result;
            if (
                this.manager.canAdd(path, $uploadVisibleButton, null, "left")
            ) {
                this.manager.add(path, entireString);
            }
        };
        reader.readAsText(file);
    }

    private _updateUploadArea(): void {
        const $uploadArea: JQuery = this.$panel.find(".operationAreaUpload");
        $uploadArea
        .children(".operationContent")
        .toggleClass(
            "disabled",
            !this.manager.canAdd(
                this.getViewPath() + "a" + this.manager.fileExtension(),
                null,
                null,
                "left"
            )
        );
    }

    private _eventSearch(keyword: string): void {
        keyword = xcHelper
        .escapeRegExp(keyword)
        .replace(/\\\*/g, ".*")
        .replace(/\\\?/g, ".");
        keyword = xcHelper.containRegExKey(keyword);
        const keywordReg: RegExp = new RegExp(keyword, "i");

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

            if (keywordReg.test(curPathNode.pathName)) {
                rootSearchPathNode.children.set(
                    this.nodeToPath(curPathNode),
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
            .replace(/(^\n)|(\n$)/g, "");

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
}
