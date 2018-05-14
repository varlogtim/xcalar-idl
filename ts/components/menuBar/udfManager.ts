// for the udf manager UX, singleton class
class UDFManager {
    private static _instance: UDFManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _id: number;
    private _currentWKBKUDFs: string[];
    private _defaultUDFs: string[];
    private _otherWKBKUDFs: string[];
    private _otherUDFs: string[];
    private _dfUDFs: string[];
    private _usersMap: Map<string, Map<string, string>>;

    private constructor() {
        this._reset();
    }

    private _reset(): void {
        this._currentWKBKUDFs = null;
        this._defaultUDFs = null;
        this._otherWKBKUDFs = null;
        this._otherUDFs = null;
        this._dfUDFs = null;
        this._usersMap = new Map();
        this._id = new Date().getTime();
    }

    private _isValidId(id: number): boolean {
        return id === this._id;
    }

    private _getUDFMangerEle(): JQuery {
        return $("#udf-manager");
    }

    private _getModuleName(el: HTMLElement): string {
        return $(el).closest(".udf").find(".text")
        .attr("data-udf-path");
    }

    private _getUSessionIdToNameMap(userName: string): XDPromise<Map<string, string>> {
        const deferred: XDDeferred<Map<string, string>> = PromiseHelper.deferred();
        const map: Map<string, Map<string, string>> = this._usersMap;
        if (map.has(userName)) {
            deferred.resolve(map.get(userName));
        } else {
            const currentUser: string = XcSupport.getUser();
            XcSupport.setUser(userName);

            XcalarListWorkbooks("*")
            .then((sessionRes) => {
                const sessIdMap: Map<string, string> = new Map();
                try {
                    sessionRes.sessions.forEach((sessionInfo) => {
                        sessIdMap.set(sessionInfo.sessionId, sessionInfo.name);
                    });
                    map.set(userName, sessIdMap);
                } catch (e) {
                    console.error(e);
                }
                deferred.resolve(sessIdMap);
            })
            .fail(deferred.reject);
            // reset user
            XcSupport.setUser(currentUser);
        }


        return deferred.promise();
    }

    private _replaceSessionIdToName(
        $section: JQuery,
        sessionIdMap: Map<string, string>
    ): void {
        $section.find("> .listWrap > .listInfo").each((_index, el) => {
            const $workbokkName: JQuery = $(el).find(".text");
            const sessionId = $workbokkName.text();
            if (sessionIdMap.has(sessionId)) {
                $workbokkName.text(sessionIdMap.get(sessionId));
            }
        });
    }

    private _updateMyOthereWKBKUDFs($header: JQuery): void {
        const workbooks = WorkbookManager.getWorkbooks();
        const sessionIdMap: Map<string, string> = new Map();
        for (let wkbkId in workbooks) {
            const wkbk: WKBK = workbooks[wkbkId];
            sessionIdMap.set(wkbk.sessionId, wkbk.name);
        }

        const $expandList: JQuery = $header.closest(".xc-expand-list");
        this._replaceSessionIdToName($expandList, sessionIdMap);
        $header.removeClass("firstTouch");
    }

    private _updateOtherUserUDFs($header: JQuery): void {
        const $loadSection = $('<div class="loading">' + StatusMessageTStr.Loading + '...</div>');
        const $expandList: JQuery = $header.closest(".xc-expand-list");
        $expandList.addClass("loading");
        const timer: number = window.setTimeout(() => {
            $expandList.append($loadSection);
        }, 600);

        const userName: string = $header.find(".text").text();
        const id: number = this._id;

        this._getUSessionIdToNameMap(userName)
        .then((sessionIdMap) => {
            if (!this._isValidId(id)) {
                return;
            }
            this._replaceSessionIdToName($expandList, sessionIdMap);
        })
        .always(() => {
            if (!this._isValidId(id)) {
                return;
            }
            clearTimeout(timer);
            $loadSection.remove();
            $header.removeClass("firstTouch");
            $expandList.removeClass("loading");
        });
    }

    private _toggleExpandList(el: HTMLElement): void {
        const $el: JQuery = $(el);
        const $expandList: JQuery = $el.closest(".xc-expand-list");
        $expandList.toggleClass("active");

        if ($el.hasClass("firstTouch")) {
            if ($el.closest(".otherUser").length > 0) {
                 // when it's other users, need to fetch session id to name map
                this._updateOtherUserUDFs($el);
            } else if ($el.closest(".myOtherWKBK").length > 0) {
                this._updateMyOthereWKBKUDFs($el);
            }
        }
    }

    private _getTotalUDFs(): number {
        const len = this._currentWKBKUDFs.length + this._defaultUDFs.length +
        this._otherWKBKUDFs.length + this._otherUDFs.length + this._dfUDFs.length;
        return len;
    }

    private _getListHTML(moduleName: string, isEditable: boolean): string {
        const moduleSplits: string[] = moduleName.split("/");
        let udfClass: string = "udf";
        let icon: string = "";

        if (isEditable) {
            icon = '<i class="edit icon xi-edit xc-action fa-14" ' +
            'title="' + UDFTStr.Edit + '" data-toggle="tooltip" ' +
            'data-container="body"></i>';
        } else {
            udfClass += " uneditable";
            icon = '<i class="edit icon xi-show xc-action fa-14" ' +
            'title="' + UDFTStr.View + '" data-toggle="tooltip" ' +
            'data-container="body"></i>';
        }

        const html: string =
                '<div class="' + udfClass + '">' +
                    '<div class="iconWrap udfIcon">' +
                        '<i class="icon xi-module center fa-15"></i>' +
                    '</div>' +
                    '<div class="text tooltipOverflow"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    ' data-title="' + moduleName +
                    '" data-udf-path="' + moduleName + '">' +
                        moduleSplits[moduleSplits.length - 1] +
                    '</div>' +
                    '<div class="actions">' +
                        icon +
                        '<i class="download icon xi-download xc-action fa-14" ' +
                        'title="' + UDFTStr.Download + '" data-toggle="tooltip" ' +
                        'data-container="body"></i>' +
                        '<i class="delete icon xi-trash xc-action fa-14" ' +
                        'title="' + UDFTStr.Del + '" data-toggle="tooltip" ' +
                        'data-container="body"></i>' +
                    '</div>' +
                '</div>';
        return html;
    }

    private _getSectionHTML(
        title: string,
        content: string,
        extraClasses: string
    ): string {
        const classes = 'listWrap xc-expand-list ' + extraClasses;
        const html: string =
            '<div class="' + classes + '">' +
                '<div class="udfManagerHeader listInfo no-selection">' +
                    '<span class="expand">' +
                        '<i class="icon xi-arrow-down fa-9"></i>' +
                    '</span>' +
                    '<span class="text">' +
                        title +
                    '</span>' +
                '</div>' +
                content +
            '</div>';
        return html;
    }

    /**
     * A recursion function to get UDF content HTML
     * @param moduleNames
     * @param categories
     * @param level
     */
    private _getUDFContentHTML(
        moduleNames: string[],
        categories: string[][],
        level: number
    ): string {
        if (level === categories[0].length) {
            // when it's the last level, end recursion and return module lists
            let list: string = '';
            moduleNames.forEach((moduleName) => {
                list += this._getListHTML(moduleName, false);
            });
            return list;
        }

        // split modules by subHeading
        const subHeadingMaps: object = {};
        const subHeadingList: string[] = [];
        moduleNames.forEach((moduelName, index) => {
            const subHeading: string = categories[index][level];
            if (!subHeadingMaps.hasOwnProperty(subHeading)) {
                subHeadingMaps[subHeading] = [];
                subHeadingList.push(subHeading);
            }
            subHeadingMaps[subHeading].push(moduelName);
        });

        let content: string = '';
        subHeadingList.forEach((subHeading) => {
            content +=
                '<div class="listWrap xc-expand-list active">' +
                    '<div class="udfManagerSubHeader listInfo no-selection' +
                    ' level-' + level + '">' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down fa-9"></i>' +
                        '</span>' +
                        '<span class="text">' +
                            subHeading +
                        '</span>' +
                    '</div>' +
                    this._getUDFContentHTML(moduleNames, categories, level + 1) +
                '</div>';
        });
        return content;
    }

    private _getGeneralUDFHTML(
        title: string,
        moduleNames: string[],
        categories: string[][],
        extraClasses: string = ''
    ): string {
        const content = moduleNames.length ?
            this._getUDFContentHTML(moduleNames, categories, 0) : '';
        return this._getSectionHTML(title, content, extraClasses);
    }

    private _getCurrentWKBKUDFsHTML(): string {
        let content: string = '';
        this._currentWKBKUDFs.forEach((moduleName) => {
            content += this._getListHTML(moduleName, true);
        });

        this._defaultUDFs.forEach((moduleName) => {
            content += this._getListHTML(moduleName, false);
        });

        return this._getSectionHTML(UDFTStr.MyUDFS, content, 'active');
    }

    private _getOtherWKBKUDFsHTML(): string {
        const moduleNames: string[] = this._otherWKBKUDFs;
        const categories: string[][] = moduleNames.map((moduleName) => {
            const moduleSplits: string[] = moduleName.split("/");
            return [moduleSplits[3]];
        });
        return this._getGeneralUDFHTML(UDFTStr.MYOTHERUDFS,
            moduleNames, categories, "myOtherWKBK");
    }

    private _getOtherUsersUDFSHTML(): string {
        const moduleNames: string[] = this._otherUDFs;
        const categories: string[][] = moduleNames.map((moduleName) => {
            const moduleSplits: string[] = moduleName.split("/");
            return [moduleSplits[2], moduleSplits[3]];
        });
        return this._getGeneralUDFHTML(UDFTStr.OtherUDFS,
            moduleNames, categories, 'otherUser');
    }

    private _getDFUDFsHTML(): string {
        const moduleNames: string[] = this._dfUDFs;
        const categories: string[][] = moduleNames.map((moduleName) => {
            const moduleSplits: string[] = moduleName.split("/");
            return [moduleSplits[2]];
        });
        return this._getGeneralUDFHTML(UDFTStr.DFUDFS, moduleNames,
            categories);
    }

    public addEvents(): void {
        const self = this;
        const $udfManager: JQuery = self._getUDFMangerEle();
        // edit udf
        $udfManager.on("click", ".udf .edit", function() {
            const modulePath: string = self._getModuleName(this);
            UDF.edit(modulePath);
        });

        $udfManager.on("click", ".udfManagerHeader", function() {
            self._toggleExpandList(this);
        });

        $udfManager.on("click", ".udfManagerSubHeader", function() {
            self._toggleExpandList(this);
            const $subHeader: JQuery = $(this);
            $subHeader.find(".xi-arrow-down").toggleClass("hidden");
        });

        // download udf
        $udfManager.on("click", ".udf .download", function() {
            const moduleName: string = self._getModuleName(this);
            UDF.download(moduleName);
        });

        // delete udf
        $udfManager.on("click", ".udf .delete", function() {
            const moduleName: string = self._getModuleName(this);
            Alert.show({
                title: UDFTStr.DelTitle,
                msg: UDFTStr.DelMsg,
                onConfirm: () => {
                    UDF.del(moduleName);
                }
            });
        });

        $udfManager.on("click", ".refresh", function() {
            self._reset();
            UDF.refresh();
        });
    }

    public setCurrentWKBKUDFs(udfs) {
        this._currentWKBKUDFs = udfs;
    }

    public setDefaultUDFs(udfs) {
        this._defaultUDFs = udfs;
    }

    public setOtherWKBKUDFs(udfs) {
        this._otherWKBKUDFs = udfs;
    }

    public setOtherUDFs(udfs) {
        this._otherUDFs = udfs;
    }

    public setDFUDFs = function(udfs) {
        this._dfUDFs = udfs;
    }

    public update(): void {
        const $udfManager: JQuery = this._getUDFMangerEle();
        const len: number = this._getTotalUDFs();
        const html: string = this._getCurrentWKBKUDFsHTML() +
            this._getOtherWKBKUDFsHTML() +
            this._getOtherUsersUDFSHTML() +
            this._getDFUDFsHTML();

        $udfManager.find(".numUDF").text(len)
            .end()
            .find(".udfListSection").html(html);
        // close the otherUser section
        $udfManager.find(".otherUser .level-0").click().addClass("firstTouch");
        $udfManager.find(".myOtherWKBK .udfManagerHeader").addClass("firstTouch");
    }
}