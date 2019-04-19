class ExtensionPanel {
    private static _instance: ExtensionPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * ExtensionPanel.imageError
     */
    public static imageError = function(ele) {
        let imgSrc = paths.XCExt;
        ele.src = imgSrc;
        let ext = ExtensionPanel.Instance.getExtensionFromEle($(ele).closest(".item"));
        ext.setImage(imgSrc);
    }

    private extSet: ExtCategorySet;
    private isFirstTouch: boolean = true;
    private extInInstall: string = null;
    private enabledHTMLStr: string = "";
    private _extensionUploadCard: ExtensionUploadCard;

    private constructor() {
        this.extSet = new ExtCategorySet();
        this._addEventListeners();
        this._setupExtLists();
        this._extensionUploadCard = new ExtensionUploadCard("extension-upload");
    }

    /**
     * ExtensionPanel.Instance.active
     */
    public active(): void {
        if (this.isFirstTouch) {
            this.isFirstTouch = false;

            this._getEnabledExtList(false)
            .then(() => {
                let prommise = this._generateInstalledExtList();
                return PromiseHelper.alwaysResolve(prommise);
            })
            .then(() => {
                this._fetchData();
            });
        }
    }

    /**
     * ExtensionPanel.Instance.getEnabledList
     */
    public getEnabledList(): XDPromise<string> {
        return this._getEnabledExtList(false);
    }

    /**
     * ExtensionPanel.Instance.request
     * @param json
     */
    public request(json: object): XDPromise<any> {
        var deferred = PromiseHelper.deferred();
        HTTPService.Instance.ajax(json)
        .then((...args) => {
            try {
                let res = args[0];
                if (res.status === Status.Error) {
                    deferred.reject(res.error);
                } else {
                    deferred.resolve(...args);
                }
            } catch (e) {
                console.error(e);
                deferred.resolve(...args);
            }
        })
        .fail((error) => {
            deferred.reject(JSON.stringify(error));
        });

        return deferred.promise();
    }

    /**
     * ExtensionPanel.Instance.getExtensionFromEle
     * @param $ext
     */
    public getExtensionFromEle($ext: JQuery): ExtItem | null {
        let extName: string = $ext.find(".extensionName").data("name");
        let category: string = $ext.closest(".category").data("category");
        let ext = this.extSet.getExtension(category, extName);
        return ext;
    }

    private _getPanel(): JQuery {
        return $("#extensionInstallPanel");
    }

    private _getList(): JQuery {
        return $("#extension-lists");
    }

    private _addEventListeners(): void {
        $("#uploadExtension").click(() => {
            this._extensionUploadCard.show();
            $("#monitorPanel").find(".mainContent").scrollTop(0);
        });

        $("#refreshExt").click(() => {
            this._refreshExtensionAsync();
        });

        let $panel = this._getPanel();
        $panel.on("click", ".item .more", function() {
            $(this).closest(".item").toggleClass("fullSize");
        });

        $panel.on("click", ".item .install", (event) => {
            let $el = $(event.currentTarget);
            let ext = this.getExtensionFromEle($el.closest(".item"));
            this._installExtension(ext, $el);
        });

        $panel.on("click", ".item .website", function() {
            let url: string = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:") && !url.startsWith("https:")) {
                    url = "http://" + url;
                }
                if (typeof window !== "undefined") {
                    window.open(url);
                }
                
            }
        });

        $("#extension-search").on("input", "input", (event) => {
            let searchKey: string = $(event.currentTarget).val().trim();
            this._refreshExtension(searchKey);
        });
    }

    private _setupExtLists(): void {
        let $extLists = this._getList();
        let $panel = this._getPanel();

        if (Admin.isAdmin()) {
            $extLists.addClass("admin");
            $panel.addClass("admin");
        }

        $extLists.on("click", ".listInfo .expand", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $extLists.on("click", ".switch", (event) => {
            this._toggleExtension($(event.currentTarget));
        });

        $extLists.on("click", ".delete", (event) => {
            let $ext = $(event.currentTarget).closest(".item");
            this._removeExtension($ext);
        });

        $extLists.on("mousedown", ".item", (event) => {
            if (event.which !== 1) {
                return;
            }

            let $item = $(event.currentTarget);
            let $target = $(event.target);
            // scroll to extension in right card if found
            if (!$target.closest(".delete, .switch").length) {
                let name = this._getExtNameFromList($item);
                let $cardItem = $panel.find(".item .extensionName[data-name='" +
                                            name + "']").closest(".item");
                if ($cardItem.length) {
                    let $container = $("#monitorPanel").find(".mainContent");
                    let cardTop = $container.offset().top +
                                  $panel.find(".cardHeader").height();
                    let itemTop = $container.scrollTop() +
                                   $cardItem.position().top - cardTop;
                    $container.animate({scrollTop: itemTop}, 300);
                }
            }

            if ($item.hasClass("active")) {
                return;
            }

            $extLists.find(".item.active").removeClass("active");
            $item.addClass("active");
        });
    }

    private _fetchData(): void {
        let $panel = this._getPanel();
        $panel.addClass("wait");
        let url: string = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/listPackage"
        })
        .then((data) => {
            $panel.removeClass("wait");
            try {
                this._initializeExtCategory(data);
            } catch (error) {
                this._handleError(error);
            }
        })
        .fail((error) => {
            this._handleError(error);
        });
    }

    private _handleError(error: any): void {
        console.error("get extension error", error);
        this._getPanel()
        .removeClass("wait")
        .removeClass("hint")
        .addClass("error");
    }

    private _initializeExtCategory(extensions: object[]): void {
        extensions = extensions || [];

        for (let i = 0, len = extensions.length; i < len; i++) {
            this.extSet.addExtension(extensions[i]);
        }

        this._refreshExtension();
    }

    private _refreshExtension(searchKey?: string): void {
        let categoryList = this.extSet.getList();
        this._generateExtView(categoryList, searchKey);
    }

    private _refreshExtensionAsync(): void {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $extLists = this._getList();
        $extLists.addClass("refreshing");

        xcUIHelper.showRefreshIcon($extLists, true, deferred.promise());

        this._getEnabledExtList(true)
        .then(() => {
            return ExtensionManager.install();
        })
        .then(() => {
            return this._generateInstalledExtList();
        })
        .always(() => {
            $("#extension-search").val("");
            this._refreshExtension();
            $extLists.removeClass("refreshing");
            deferred.resolve();
        });
    }

    private _installExtension(ext: ExtItem, $submitBtn: JQuery): void {
        if (ext == null) {
            Alert.error(ErrTStr.ExtDownloadFailure, ErrTStr.Unknown);
            return;
        }
        let url = xcHelper.getAppUrl();
        xcUIHelper.toggleBtnInProgress($submitBtn, false);

        this.extInInstall = ext.getName();
        this.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/download",
            "data": {name: ext.getName(), version: ext.getVersion()},
        })
        .then(() =>{
            // Now we need to enable after installing
            // console.log(data);
            return this._enableExtension(ext.getName());
        })
        .then(() => {
            // need to toggle back progress then can the text be changed
            xcUIHelper.toggleBtnInProgress($submitBtn, false);
            if (this.extInInstall === ext.getName()) {
                this._refreshExtensionAsync();
                xcUIHelper.showSuccess(SuccessTStr.ExtDownload);
            } else {
                $submitBtn.addClass("installed").text(ExtTStr.Installed);
            }
        })
        .fail((error) => {
            xcUIHelper.toggleBtnInProgress($submitBtn, false);
            Alert.error(ErrTStr.ExtDownloadFailure, error);
        });
    }

    private _removeExtension($ext: JQuery): void {
        let url = xcHelper.getAppUrl();
        let extName = this._getExtNameFromList($ext);
        $ext.addClass("xc-disabled");

        this.request({
            "type": "DELETE",
            "dataType": "JSON",
            "url": url + "/extension/remove",
            "data": {"name": extName}
        })
        .then(() => {
            xcUIHelper.showSuccess(SuccessTStr.ExtRemove);
            $ext.remove();
            this._refreshExtensionAsync();
        })
        .fail((error) => {
            Alert.error(ErrTStr.ExtRemovalFailure, error);
            $ext.removeClass("xc-disabled");
        });
    }

    private _toggleExtension($slider: JQuery): void {
        if ($slider.hasClass("unavailable")) {
            return;
        }

        let promise: XDPromise<void>;
        let $ext = $slider.closest(".item");
        let extName = this._getExtNameFromList($ext);
        let enable: boolean;

        if ($slider.hasClass("on")) {
            enable = false;
            promise = this._disableExtension(extName);
        } else {
            enable = true;
            promise = this._enableExtension(extName);
        }

        $ext.addClass("xc-disabled");
        promise
        .then(() => {
            if (enable) {
                $slider.addClass("on");
                $ext.addClass("enabled");
            } else {
                $slider.removeClass("on");
                $ext.removeClass("enabled");
            }
            let msg = enable ? SuccessTStr.ExtEnable : SuccessTStr.ExtDisable;
            xcUIHelper.showSuccess(msg);
            this._refreshExtensionAsync();
        })
        .fail((error) => {
            let title = enable ? ErrTStr.ExtEnableFailure :
                                 ErrTStr.ExtDisableFailure;
            Alert.error(title, error);
        })
        .always(() => {
            $ext.removeClass("xc-disabled");
        });
    }

    private _enableExtension(extName: string): XDPromise<void> {
        let url = xcHelper.getAppUrl();
        return this.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/enable",
            "data": {name: extName}
        });
    }

    private _disableExtension(extName: string): XDPromise<void> {
        let url = xcHelper.getAppUrl();
        return this.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/disable",
            "data": {name: extName}
        });
    }

    private _getExtNameFromList($el: JQuery): string {
        return $el.find(".name").text();
    }

    private _generateInstalledExtList(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let url = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/getAvailable"
        })
        .then((data) => {
            // {status: Status.Ok, extensionsAvailable: ["bizRules", "dev"]}
            try {
                this._getInstalledExtListHTML(data.extensionsAvailable);
                deferred.resolve();
            } catch (error) {
                console.error(error);
                this._handleExtListError();
                deferred.reject(error);
            }
        })
        .fail((error) => {
            console.error(error);
            this._handleExtListError();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _getEnabledExtList(reset: boolean): XDPromise<string> {
        if (!reset && this.enabledHTMLStr) {
            return PromiseHelper.resolve(this.enabledHTMLStr);
        }

        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        let url = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/getEnabled",
        })
        .then((data) => {
            if (data.status === Status.Ok) {
                this.enabledHTMLStr = data.data;
                deferred.resolve(this.enabledHTMLStr);
            } else {
                console.error("Failed to get enabled extension");
                this.enabledHTMLStr = "";
                deferred.reject();
            }
        })
        .fail((error) => {
            this.enabledHTMLStr = "";
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _isExtensionEnabled(extName: string): boolean {
        let name: string = extName + ".ext.js";
        return this.enabledHTMLStr.includes(name);
    }

    private _handleExtListError(): void {
        let $extLists = this._getList();
        $extLists.html('<div class="error">' + ExtTStr.extListFail + '</div>');
    }

    private _generateExtView(
        categoryList: ExtCategory[],
        searchKey: string
    ): void {
        let html: HTML = "";

        for (let i = 0, len = categoryList.length; i < len; i++) {
            html += this._getExtViewHTML(categoryList[i], searchKey);
        }

        let $panel = this._getPanel();
        if (html === "") {
            $panel.addClass("hint");
        } else {
            $panel.removeClass("hint").find(".category").remove()
                .end()
                .append(html);
        }
    }

    private _getInstalledExtListHTML(extensions): void {
        let extLen = extensions.length;
        // XXX this is a hack, which assume we only have 1 category
        let html = '<div class="listWrap xc-expand-list active">' +
                        '<div class="listInfo no-selection">' +
                            '<span class="expand">' +
                                '<i class="icon xi-down fa-13"></i>' +
                            '</span>' +
                            '<span class="text">' +
                              ExtTStr.XcCategory +
                              " (" + extLen + ")" +
                            '</span>' +
                        '</div>' +
                        '<ul class="itemList">';

        for (let i = 0, len = extLen; i < len; i++) {
            let enabled = "";
            let status = "";
            let extName = extensions[i];
            let icon = '<i class="icon xi-menu-extension fa-15"></i>';
            if (this._isExtensionEnabled(extName)) {
                enabled = "enabled";
                status = "on";
                // only when has active workbook does the ExtensioManger setup
                if (WorkbookManager.getActiveWKBK() != null &&
                    !ExtensionManager.isInstalled(extName)
                ) {
                    let error = ExtensionManager.getInstallError(extName);
                    icon = '<i class="icon xi-critical fa-15 hasError"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="right"' +
                            ' data-title="' + error + '"></i>';
                }
            }

            html += '<li class="item no-selection ' + enabled + '">' +
                        icon +
                        '<span class="name textOverflowOneLine">' +
                            extName +
                        '</span>' +
                        '<i class="adminOnly delete icon xi-trash fa-15 ' +
                        'xc-action"></i>' +
                        '<div class="adminOnly xc-switch switch ' + status +
                        '">' +
                            '<div class="slider"></div>' +
                        '</div>';
        }

        html += '</ul></div>';
        let $extLists = this._getList();
        $extLists.html(html);
    }

    private _getExtViewHTML(
        category: ExtCategory,
        searchKey: string
    ): HTML {
        let extensions = category.getExtensionList(searchKey);
        let extLen = extensions.length;
        if (extLen === 0) {
            // no qualified category
            return "";
        }
        let categoryName = category.getName();
        let html = '<div class="category cardContainer" data-category="' + categoryName + '">' +
                    '<header class="cardHeader">' +
                        '<div class="title textOverflowOneLine categoryName">' +
                            "Category: " + categoryName +
                        '</div>' +
                    '</header>' +
                    '<div class="cardMain items">';
        let imgEvent = 'onerror="ExtensionPanel.imageError(this)"';

        for (let i = 0; i < extLen; i++) {
            let ext = extensions[i];
            let btnText: string;
            let btnClass: string;
            let website = ext.getWebsite();
            let websiteEle: HTML = "";

            if (ext.isInstalled()) {
                btnClass = "installed";
                btnText = ExtTStr.Installed;
            } else {
                btnClass = "btn-submit";
                btnText = ExtTStr.Install;
            }

            if (website) {
                websiteEle = '<a class="website url" ' +
                            'data-url="' + website + '">' +
                                ExtTStr.Website +
                            '</a>';
            } else {
                websiteEle = "";
            }

            let image = ext.getImage();
            html += '<div class="item">' +
                        '<section class="mainSection">' +
                        '<div class="leftPart">' +
                            '<div class="logoArea">' +
                                '<img src="data:image/png;base64,' +
                                image + '" ' + imgEvent + '>' +
                            '</div>' +
                            '<div class="instruction">' +
                                '<div class="extensionName textOverflowOneLine"' +
                                ' data-name="' + ext.getName() + '">' +
                                    ext.getMainName() +
                                '</div>' +
                                '<div class="author textOverflowOneLine">' +
                                    'By ' + ext.getAuthor() +
                                '</div>' +
                                '<div class="detail textOverflow">' +
                                    ext.getDescription() +
                                '</div>' +
                            '</div>' +
                        '</div>'+
                        '<div class="rightPart">' +
                            '<div class="buttonArea">' +
                                '<button class="btn install ' + btnClass + '">' +
                                    btnText +
                                '</button>' +
                                '<button class="btn btn-next more">' +
                                    '<span class="moreText">' +
                                        ExtTStr.More +
                                    '</span>' +
                                    '<span class="lessText">' +
                                        ExtTStr.Less +
                                    '</span>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '</section>' +
                        '<section class="bottomSection clearfix">' +
                            '<div class="leftPart">' +
                                '<div class="detail">' +
                                    ext.getDescription() +
                                '</div>' +
                                '<div class="basicInfo">' +
                                    ExtTStr.Version + ': ' + ext.getVersion() +
                                    ' | ' + ExtTStr.extName + ': ' + ext.getName() +
                                    ' | ' + ExtTStr.Author + ': ' + ext.getAuthor() +
                                '</div>' +
                            '</div>' +
                            '<div class="rightPart">' +
                                websiteEle +
                                '<a class="url" ' +
                                'onclick="window.open(\'mailto:customerportal@xcalar.com\')" ' +
                                'target="_top">' +
                                    ExtTStr.Report +
                                '</a>' +
                            '</div>' +
                        '</section>' +
                    '</div>';
        }

        html += '</div></div>';

        return html;
    }
}
