// for the udf manager UX, singleton class
class UDFManager {
    private static _instance: UDFManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _currentWKBKUDFs: string[];
    private _defaultUDFs: string[];
    private _otherWKBKUDFs: string[];
    private _otherUDFs: string[];
    private _dfUDFs: string[];

    private constructor() {
        this._currentWKBKUDFs = null;
        this._defaultUDFs = null;
        this._otherWKBKUDFs = null;
        this._otherUDFs = null;
        this._dfUDFs = null;
    }

    private _getUDFMangerEle(): JQuery {
        return $("#udf-manager");
    }

    private _getModuleName(el: HTMLElement): string {
        return $(el).closest(".udf").find(".text")
        .attr("data-udf-path");
    }

    private _toggleExpandList(el: HTMLElement): void {
        const $expandList: JQuery = $(el).closest(".xc-expand-list");
        $expandList.toggleClass("active");
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
        expand: boolean
    ): string {
        const html: string =
            '<div class="listWrap xc-expand-list' + (expand? ' active' : '') + '">' +
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

    private _getGeneralUDFHTML(
        title: string,
        moduleNames: string[],
        getSubHeading: Function
    ): string {
        // split modules by subHeading
        const subHeadingMaps: object = {};
        const subHeadingList: string[] = [];
        moduleNames.forEach((moduelName) => {
            const subHeading: string = getSubHeading(moduelName);
            if (!subHeadingMaps.hasOwnProperty(subHeading)) {
                subHeadingMaps[subHeading] = [];
                subHeadingList.push(subHeading);
            }
            subHeadingMaps[subHeading].push(moduelName);
        });

        let content: string = '';
        subHeadingList.forEach((subHeading) => {
            const moduleNames: string[] = subHeadingMaps[subHeading];
            let list: string = '';
            moduleNames.forEach((moduleName) => {
                list += this._getListHTML(moduleName, false);
            });

            content +=
                '<div class="listWrap xc-expand-list active">' +
                    '<div class="udfManagerSubHeader listInfo no-selection">' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down fa-9"></i>' +
                        '</span>' +
                        '<span class="text">' +
                            subHeading +
                        '</span>' +
                    '</div>' +
                    list +
                '</div>';
        });
        return this._getSectionHTML(title, content, false);
    }

    private _getCurrentWKBKUDFsHTML(): string {
        let content: string = '';
        this._currentWKBKUDFs.forEach((moduleName) => {
            content += this._getListHTML(moduleName, true);
        });

        this._defaultUDFs.forEach((moduleName) => {
            content += this._getListHTML(moduleName, false);
        });

        return this._getSectionHTML(UDFTStr.MyUDFS, content, true);
    }

    private _getOtherWKBKUDFsHTML(): string {
        const getSubHeading: Function = function(moduleName: string): string {
            return moduleName.split("/")[3];
        };
        return this._getGeneralUDFHTML(UDFTStr.MYOTHERUDFS,
            this._otherWKBKUDFs, getSubHeading);
    }

    private _getOtherUsersUDFSHTML(): string {
        const getSubHeading: Function = function(moduleName: string): string {
            const moduleSplits: string[] = moduleName.split("/");
            return moduleSplits[2] + " / " + moduleSplits[3];
        };
        return this._getGeneralUDFHTML(UDFTStr.OtherUDFS,
            this._otherUDFs, getSubHeading);
    }

    private _getDFUDFsHTML(): string {
        const getSubHeading: Function = function(moduleName: string): string {
            return moduleName.split("/")[2];
        };
        return this._getGeneralUDFHTML(UDFTStr.DFUDFS, this._dfUDFs,
            getSubHeading);
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
            $(this).find(".xi-arrow-down").toggleClass("hidden");
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
    }
}