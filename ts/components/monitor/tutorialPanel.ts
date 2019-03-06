class TutorialPanel {
    private static _instance: TutorialPanel;
    private _$panel: JQuery;    // $("#tutorialDownloadPanel");
    private _tutSet: ExtCategorySet;
    private _isFirstTouch: boolean = true;

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): void {
        this._tutSet = new ExtCategorySet();
        this._$panel = $("#tutorialDownloadPanel");
        const self = this;

        this._$panel.on("click", ".item .more", function() {
            $(this).closest(".item").toggleClass("fullSize");
        });

        this._$panel.on("click", ".item .download", function() {
            let tut: ExtItem = self._getTutorialFromEle($(this).closest(".item"));
            self._downloadTutorial(tut, $(this));
        });

        this._$panel.on("click", ".item .website", function() {
            let url = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:") && !url.startsWith("https:")) {
                    url = "http://" + url;
                }
                window.open(url);
            }
        });

        $("#tutorial-search").on("input", "input", function() {
            let searchKey = $(this).val().trim();
            self._refreshTutorial(searchKey);
        });

    };

    public active(): XDPromise<any> {
        if (this._isFirstTouch) {
            this._isFirstTouch = false;
            return this._fetchData();
        }
    };

    public request(json: {}): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        HTTPService.Instance.ajax(json)
        .then(function(res) {
            try {
                if (res.status === Status.Error) {
                    deferred.reject(res.error);
                } else {
                    deferred.resolve.apply(this, arguments);
                }
            } catch (e) {
                console.error(e);
                deferred.resolve.apply(this, arguments);
            }
        })
        .fail(function(error) {
            deferred.reject(JSON.stringify(error));
        });

        return deferred.promise();
    };


    public imageError(ele): void {
        let imgSrc: string = paths.XDExt;
        ele.src = imgSrc;
        let tut: ExtItem = this._getTutorialFromEle($(ele).closest(".item"));
        tut.setImage(imgSrc);
    };

    private _fetchData(): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._$panel.addClass("wait");
        const self = this;
        let url = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/tutorial/listPackage"
        })
        .then(function(data) {
            self._$panel.removeClass("wait");
            try {
                let d = data;
                self._initializeTutCategory(d);
            } catch (error) {
                self._handleError(error);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            self._handleError(error);
            return deferred.reject();
        });
        return deferred.promise();
    }

    private _handleError(error): void {
        console.error("get tutorial error", error);
        this._$panel.removeClass("wait").removeClass("hint").addClass("error");
    }

    private _initializeTutCategory(tutorials): void {
        tutorials = tutorials || [];

        for (let i = 0, len = tutorials.length; i < len; i++) {
            this._tutSet.addExtension(tutorials[i]);
        }

        this._refreshTutorial();
    }

    private _refreshTutorial(searchKey?: string): void {
        let categoryList: ExtCategory[] = this._tutSet.getList();
        this._generateTutView(categoryList, searchKey);
    }

    private _downloadTutorial(tut: ExtItem, $submitBtn: JQuery): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let url: string = xcHelper.getAppUrl();
        xcHelper.toggleBtnInProgress($submitBtn, true);
        let name: string = WorkbookPanel.wbDuplicateName(tut.getName(),
            WorkbookManager.getWorkbooks(), 0);
        this.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/tutorial/download",
            "data": {name: tut.getName(), version: tut.getVersion()},
        })
        .then((res) => {
            return WorkbookPanel.createNewWorkbook(name, null, null, atob(res.data));
        })
        .then(() => {
            return WorkbookManager.switchWKBK(WorkbookManager.getIDfromName(name), false);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            xcHelper.toggleBtnInProgress($submitBtn, true);
            Alert.error(ErrTStr.TutDownloadFailure, error);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _getTutorialFromEle($tut: JQuery): ExtItem {
        let tutName: string = $tut.find(".tutorialName").data("name");
        let category: string = $tut.closest(".category").find(".categoryName").text();
        category = category.split("Category: ")[1];
        let tut: ExtItem = this._tutSet.getExtension(category, tutName);
        return tut;
    }

    private _generateTutView(categoryList: ExtCategory[], searchKey?: string): void {
        let html: string = "";

        for (let i = 0, len = categoryList.length; i < len; i++) {
            html += this._getTutViewHTML(categoryList[i], searchKey);
        }

        if (html === "") {
            this._$panel.addClass("hint");
        } else {
            this._$panel.removeClass("hint").find(".category").remove()
                .end()
                .append(html);
        }
    }

    private _getTutViewHTML(category: ExtCategory, searchKey?: string): string {
        let tutorials = category.getExtensionList(searchKey);
        let tutLen = tutorials.length;
        if (tutLen === 0) {
            // no qualified category
            return "";
        }

        let html = '<div class="category cardContainer">' +
                    '<header class="cardHeader">' +
                        '<div class="title textOverflowOneLine categoryName">' +
                            "Category: " + category.getName() +
                        '</div>' +
                    '</header>' +
                    '<div class="cardMain items">';
        let imgEvent = 'onerror="TutorialPanel.Instance.imageError(this)"';

        for (let i = 0; i < tutLen; i++) {
            let tut = tutorials[i];
            let btnText = "Download";
            let website = tut.getWebsite();
            let websiteEle = "";
            let btnClass: string = "download";

            if (website) {
                websiteEle = '<a class="website url" ' +
                            'data-url="' + website + '">' +
                                ExtTStr.Website +
                            '</a>';
            } else {
                websiteEle = "";
            }

            let image = tut.getImage();
            html += '<div class="item">' +
                        '<section class="mainSection">' +
                        '<div class="leftPart">' +
                            '<div class="logoArea">' +
                                '<img src="data:image/png;base64,' +
                                image + '" ' + imgEvent + '>' +
                            '</div>' +
                            '<div class="instruction">' +
                                '<div class="tutorialName textOverflowOneLine"' +
                                ' data-name="' + tut.getName() + '">' +
                                    tut.getMainName() +
                                '</div>' +
                                '<div class="author textOverflowOneLine">' +
                                    'By ' + tut.getAuthor() +
                                '</div>' +
                                '<div class="detail textOverflow">' +
                                    tut.getDescription() +
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
                                    tut.getDescription() +
                                '</div>' +
                                '<div class="basicInfo">' +
                                    ExtTStr.Version + ': ' + tut.getVersion() +
                                    ' | ' + ExtTStr.extName + ': ' + tut.getName() +
                                    ' | ' + ExtTStr.Author + ': ' + tut.getAuthor() +
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
