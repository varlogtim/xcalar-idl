interface ModalHelperOptions {
    defaultWidth?: number,
    defaultHeight?: number,
    beforeResize?: JQueryUI.ResizableEvent,
    minWidth?: number,
    minHeight?: number,
    resizeCallback?: JQueryUI.ResizableEvent,
    afterResize?: JQueryUI.ResizableEvent,
    sizeToDefault?: boolean,
    noTabFocus?: boolean,
    noCenter?: boolean,
    noEsc?: boolean,
    noEnter?: boolean,
    noBackground?: boolean,
    center?: ModalHelperCenterOptions,
    keepFnBar?: boolean,
    open?: Function,
    close?: Function,
    noResize?: boolean
}

interface ModalHelperCenterOptions {
    horizontalOnly?: boolean; // if true, only horizontal cenater
    verticalQuartile?: boolean; // if true, vertical top will be 1/4
    maxTop?: number; // max top it could be
    noLimitTop?: boolean //  if true, it will always center
                    // with equal space on top and bottom,
                    // if false, top will be minimum 0 and bottom will overfolw
                    // when modal height is larger then window height
}

// options:
// time - fade out or fade in time in ms
// opSection - if operations section is opening
interface ModalHelperBGOptions {
    time?: number;
    opSection?: boolean;
}
/* Modal Helper */
// an object used for global Modal Actions
class ModalHelper {
    private $modal: JQuery;
    private options: ModalHelperOptions;
    private id: string;
    private defaultWidth: number;
    private defaultHeight: number;
    private minWidth: number;
    private minHeight: number;

      /* options include:
     * noResize: if set true, will not reszie the modal
     * sizeToDefault: if set true, will set to initial width and height when open
     * defaultWidth: integer, optional
     * defaultHeight: integer, optional
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noEnter: if set true, no event listener on key enter,
     * noBackground: if set true, no darkened modal background
     * beforeResize: funciton called before modal resizing
     * resizeCallback: function called during modal resizing
     * afterResize: funciton called after modal resizing
     */
    public constructor($modal: JQuery, options?: ModalHelperOptions) {
        options = options || {};
        this.$modal = $modal;
        this.options = options;
        this.id = $modal.attr("id");
        this.defaultWidth = options.defaultWidth || $modal.width();
        this.defaultHeight = options.defaultHeight || $modal.height();
        this.minWidth = options.minWidth ||
                        parseFloat($modal.css("min-width")) ||
                        this.defaultWidth;
        this.minHeight = options.minHeight ||
                         parseFloat($modal.css("min-height")) ||
                         this.defaultHeight;
        this.__init();
    }

    private __init(): void {
        const self = this;
        const $modal: JQuery = self.$modal;
        const options: ModalHelperOptions = self.options;

        // full screen and exit full screen buttons
        const $fullScreenBtn: JQuery = $modal.find(".fullScreen");
        const $exitFullScreenBtn: JQuery = $modal.find(".exitFullScreen");
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize(null, null);
                }
                const winWidth: number = $(window).width();
                const winHeight: number = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top": 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
                self.__resizeCallback();
            });

        }
        if ($exitFullScreenBtn.length) {
            $exitFullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize(null, null);
                }
                const minWidth: number  = options.minWidth || 0;
                const minHeight: number = options.minHeight || 0;
                $modal.width(minWidth);
                $modal.height(minHeight);
                self.center();
                self.__resizeCallback();
            });
        }

        // draggable
        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });


        if (!options.noResize) {
            const resizeOptions: JQueryUI.ResizableOptions = {
                "handles": "n, e, s, w, se",
                "minHeight": self.minHeight,
                "minWidth": self.minWidth,
                "containment": "document",
                "start": options.beforeResize || null,
                "resize": options.resizeCallback || null,
                "stop": options.afterResize || null,

            };
            $modal.resizable(resizeOptions);
        }
    }

    private __resizeCallback(): void {
        const self: ModalHelper = this;
        const $modal: JQuery = self.$modal;
        const options: ModalHelperOptions = self.options;
        if (options.resizeCallback) {
            const resizeInfo: JQueryUI.ResizableUIParams = {
                size: {width: $modal.width(), height: $modal.height()},
                element: null,
                helper: null,
                originalElement: null,
                originalPosition: null,
                originalSize: null,
                position: null
            }
            options.resizeCallback(null, resizeInfo);
        }
        if (options.afterResize) {
            options.afterResize(null, null);
        }
    }

    public setup(extraOptions?: ModalHelperOptions): XDPromise<any> {
        const self = this;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const $modal: JQuery = this.$modal;
        const options: ModalHelperOptions = $.extend(this.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the modal
        xcTooltip.hideAll();

        if (!options.keepFnBar && window.FnBar) {
            FnBar.clear();
            $(".selectedCell").removeClass("selectedCell");
        }

        // resize modal
        if (options.sizeToDefault) {
            self.__resizeToDefault();
        } else {
            self.__resizeToFitScreen();
        }

        // center modal
        if (!options.noCenter) {
            const centerOptions: ModalHelperCenterOptions = options.center || {};
            this.center(centerOptions);
        }

        // Note: to find the visiable btn, must show the modal first
        if (!options.noTabFocus) {
            this.refreshTabbing();
        }

        $(document).on("keydown.xcModal" + this.id, function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                $modal.find(".modalHeader .close").click();
                return false;
            } else if (event.which === keyCode.Enter) {
                if (options.noEnter || ($(":focus").hasClass('btn') &&
                    $(":focus").closest('#' + self.id).length)) {
                    // let default behavior take over
                    return true;
                }
                const $btn: JQuery = $modal.find('.modalBottom .btn:visible')
                                .filter(function() {
                                    return (!$(this).hasClass('cancel') &&
                                            !$(this).hasClass('close'));
                                });
                if ($btn.length === 0) {
                    // no confirm button so treat as close
                    if (!$modal.hasClass('locked')) {
                        $modal.find(".modalHeader .close").click();
                    }
                } else if ($btn.length === 1) {
                    // trigger confirm
                    $btn.click();
                } else {
                    // multiple confirm buttons
                    StatusBox.show(ErrTStr.SelectOption,
                                    $modal.find('.modalBottom'), false, {
                                        "type": "info",
                                        "highZindex": true,
                                        "offsetY": 12
                                    });
                }
                return false;
            }
        });

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else if (!options.noBackground) {
            const $modalBg: JQuery = $("#modalBackground");

            if (window.gMinModeOn) {
                $modalBg.show();
                $modal.show();
                deferred.resolve();
            } else {
                $modal.fadeIn(180);
                $modalBg.fadeIn(300, function() {
                    deferred.resolve();
                    $modalBg.css('display', 'block'); // when alert modal opens
                    // and drop table modal is open
                });
            }
        } else {
            $modal.addClass("noBackground").show();
            deferred.resolve();
        }

        return deferred.promise();
    }

    // resize modal back to it's default width and height
    private __resizeToDefault(): void {
        const $modal: JQuery = this.$modal;
        $modal.width(this.defaultWidth);
        $modal.height(this.defaultHeight);
    }

    private __resizeToFitScreen(): void {
        const $modal: JQuery = this.$modal;
        const winWidth: number = $(window).width();
        const winHeight: number = $(window).height();
        const minWidth: number = this.minWidth;
        const minHeight: number = this.minHeight;
        let width: number = $modal.width();
        let height: number = $modal.height();

        if (width > winWidth - 10) {
            width = Math.max(winWidth - 40, minWidth);
        }

        if (height > winHeight - 10) {
            height = Math.max(winHeight - 40, minHeight);
        }

        $modal.width(width).height(height);
        $modal.css({
            "minHeight": minHeight,
            "minWidth": minWidth
        });
    }

    // This function prevents the user from clicking the submit button multiple
    // times
    public disableSubmit(): void {
        xcHelper.disableSubmit(this.$modal.find(".confirm"));
    }

    // This function reenables the submit button after the checks are done
    public enableSubmit(): void {
        xcHelper.enableSubmit(this.$modal.find(".confirm"));
    }

    public clear(extraOptions?: ModalHelperOptions): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const options: ModalHelperOptions = $.extend(this.options, extraOptions) || {};
        const $modal: JQuery = this.$modal;
        const numModalsOpen: number = $('.modalContainer:visible:not(#aboutModal):not(#liveHelpModal)').length;
        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.removeClass("noBackground");
        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");
        this.enableSubmit();
        if (numModalsOpen < 2) {
            $("body").removeClass("no-selection");
        }
        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            const $modalBg: JQuery = $("#modalBackground");
            const fadeOutTime: number = gMinModeOn ? 0 : 300;
            $modal.hide();
            if (options.noBackground) {
                deferred.resolve();
            } else {
                if (numModalsOpen < 2) {
                    $modalBg.fadeOut(fadeOutTime, function() {
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
            }
        }

        return deferred.promise();
    }

    public center(options?: ModalHelperCenterOptions): void {
        /*
         * to position modal in the center of the window
        */
        options = options || {};

        const $window: JQuery = $(window);
        const $modal: JQuery = this.$modal;
        const winWidth: number = $window.width();
        const modalWidth: number = $modal.width();
        const left: number = (winWidth - modalWidth) / 2;

        if (options.horizontalOnly) {
            $modal.css({"left": left});
            return;
        }

        const winHeight: number = $window.height();
        const modalHeight: number = $modal.height();
        let top: number;

        if (options.verticalQuartile) {
            top = (winHeight - modalHeight) / 4;
        } else {
            top = (winHeight - modalHeight) / 2;
        }

        if (options.maxTop && top < options.maxTop) {
            top = options.maxTop;
            const bottom: number = top + modalHeight;
            if (bottom > winHeight) {
                top -= (bottom - winHeight);
            }
        }

        if (!options.noLimitTop) {
            top = Math.max(top, 0);
        }

        $modal.css({
            "left": left,
            "top": top
        });
    }

    public toggleBG(
        tableId: TableId | string,
        isHide?: boolean,
        options?: ModalHelperBGOptions
    ): void {
        const $modalBg: JQuery = $("#modalBackground");
        const $mainFrame: JQuery = $("#mainFrame");
        let $tableWrap: JQuery;

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
        }

        options = options || {};

        if (isHide) {
            let fadeOutTime: number;
            if (options.time == null) {
                fadeOutTime = 150;
            } else {
                fadeOutTime = options.time;
            }

            // when close the modal
            if (gMinModeOn) {
                $modalBg.hide();
                $modalBg.removeClass('light');
                $mainFrame.removeClass('modalOpen');
            } else {
                $modalBg.fadeOut(fadeOutTime, function() {
                    $modalBg.removeClass('light');
                    $mainFrame.removeClass('modalOpen');
                });
            }

            if (tableId != null) {
                $tableWrap.removeClass('modalOpen');
            }
        } else {
            // when open the modal
            if (tableId != null) {
                $tableWrap.addClass('modalOpen');
            }

            $mainFrame.addClass('modalOpen');
            let fadeInTime: number;
            if (options.time === null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
            if (gMinModeOn) {
                $modalBg.addClass('light');
                $modalBg.show();
            } else {
                $modalBg.addClass('light').fadeIn(fadeInTime);
            }
        }
    }

    public addWaitingBG(): void {
        const $modal: JQuery = this.$modal;
        const waitingBg: HTML = '<div id="modalWaitingBG">' +
                                    '<div class="waitingIcon"></div>' +
                                '</div>';
        $modal.append(waitingBg);
        const $waitingBg: JQuery =  $('#modalWaitingBG');
        const modalHeaderHeight: number = $modal.find('.modalHeader').height();
        const modalHeight: number = $modal.height();

        $waitingBg.height(modalHeight - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        if (gMinModeOn) {
            $waitingBg.find(".waitingIcon").show();
        } else {
            setTimeout(function() {
                $waitingBg.find('.waitingIcon').fadeIn();
            }, 200);
        }
    }

    public removeWaitingBG(): void {
        if (gMinModeOn) {
            $('#modalWaitingBG').remove();
        } else {
            $('#modalWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    }

    public refreshTabbing(): void {
        const $modal: JQuery = this.$modal;

        $(document).off("keydown.xcModalTabbing" + this.id);

        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");

        const eleLists: JQuery[] = [
            $modal.find(".btn"),     // buttons
            $modal.find("input")     // input
        ];

        let focusIndex: number = 0;
        const $focusables: JQuery[] = [];

        // make an array for all focusable element
        eleLists.forEach(function($eles) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });
        let len: number = $focusables.length;
        for (let i = 0; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        $(document).on("keydown.xcModalTabbing" + this.id, function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        function addFocusEvent($focusable: JQuery, index: number): void {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcModal", function() {
                const $ele: JQuery = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            // the current ele is not active, should no by focused
            if (!isActive($focusables[focusIndex])) {
                const start: number  = focusIndex;
                focusIndex = (focusIndex + 1) % len;

                while (focusIndex !== start &&
                        !isActive($focusables[focusIndex]))
                {
                    focusIndex = (focusIndex + 1) % len;
                }
                // not find any active ele that could be focused
                if (focusIndex === start) {
                    focusIndex = -1;
                }
            }

            if (focusIndex >= 0) {
                $focusables[focusIndex].focus();
            } else {
                focusIndex = 0; // reset
            }
        }

        function focusOn(index: number):  void {
            focusIndex = index;
            // go to next index
            focusIndex = (focusIndex + 1) % len;
        }

        function isActive($ele: JQuery): boolean {
            if ($ele == null) {
                console.error("undefined element!");
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden");
        }
    }
}
/* End modalHelper */

/* Export Helper */
class ExportHelper {
    private $view: JQuery;

    public constructor($view: JQuery) {
        this.$view = $view;
    }

    public static getTableCols(
        tableId: TableId,
        validTypes: string []
    ): HTML {
         // each li has data-colnum that will link it to the corresponding
        // xcTable header
        let html: HTML = "";
        const numBlanks: number = 10; // to take up flexbox space
        const allCols: ProgCol[] = gTables[tableId].getAllCols();

        allCols.forEach(function(progCol: ProgCol, index: number) {
            if (validTypes.indexOf(progCol.getType()) > -1) {
                const colName: string = xcHelper.escapeHTMLSpecialChar(
                                    progCol.getFrontColName(true));
                const colNum: number = (index + 1);
                html +=
                    '<li class="checked" data-colnum="' + colNum + '">' +
                        '<span class="text tooltipOverflow" ' +
                        'data-original-title="' +
                            xcHelper.escapeDblQuoteForHTML(
                                xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                            colName +
                        '</span>' +
                        '<div class="checkbox checked">' +
                            '<i class="icon xi-ckbox-empty fa-13"></i>' +
                            '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
                    '</li>';
            }
        });

        for (let i = 0; i < numBlanks; i++) {
            html += '<div class="flexSpace"></div>';
        }
        return (html);
    }

    public setup(): void {
        const self: ExportHelper = this;
        self.$view.on("click", ".renameSection .renameIcon", function() {
            self._smartRename($(this).closest(".rename"));
        });
    }

    public showHelper(): void {
        $('.xcTableWrap').addClass('exportMode');
    }

    public clear(): void {
        this.$view.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
        $('.xcTableWrap').removeClass('exportMode');
    }

    public clearRename($group: JQuery): void {
        let $target: JQuery;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = this.$view;
        }
        $target.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
    }

    public getExportColumns($group: JQuery): string[] {
        const self: ExportHelper = this;
        let $target: JQuery;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = self.$view;
        }

        let colsToExport: string[] = [];
        const $colsToExport: JQuery = $target.find('.columnsToExport');

        $colsToExport.find('.cols li.checked').each(function() {
            colsToExport.push($(this).text().trim());
        });

        return colsToExport;
    }

    public checkColumnNames(columnNames: string[], $group: JQuery): string[] {
        if (columnNames == null) {
            return null;
        }

        const self: ExportHelper = this;
        let $target: JQuery;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = this.$view;
        }
        if ($target.find(".renameSection").hasClass("xc-hidden")) {
            // when need check name conflict
            return self._checkNameConflict(columnNames, $target);
        } else {
            // when in rename step
            return self._checkRename(columnNames, $target);
        }
    }

    private _checkNameConflict(columnNames: string[], $target: JQuery): string[] {
        const self: ExportHelper = this;
        let takenName: object = {};
        let invalidNames: string[] = [];
        let colNamesAfterCheck: string[] = [];

        columnNames.forEach(function(colName: string) {
            const parsedName = xcHelper.parsePrefixColName(colName).name;
            if (takenName.hasOwnProperty(parsedName)) {
                const nameWithConfilct: string = takenName[parsedName];
                // also need to include the name with conflict in rename
                if (!invalidNames.includes(nameWithConfilct)) {
                    invalidNames.push(nameWithConfilct);
                }
                invalidNames.push(colName);
            } else {
                takenName[parsedName] = colName;
                colNamesAfterCheck.push(parsedName);
            }
        });

        if (invalidNames.length > 0) {
            // when has name conflict
            self._addRenameRows(invalidNames, $target);
            return null;
        } else {
            return colNamesAfterCheck;
        }
    }

    private _checkRename(columnNames: string[], $target: JQuery): string[] {
        let takenName: object = {};
        let renameMap: object = {};
        let invalid: boolean = false;

        // put all names first
        // use parsed name because takenNames that do not get renamed will be
        // parsed
        columnNames.forEach(function(colName: string) {
            takenName[xcHelper.parsePrefixColName(colName).name] = true;
        });

        const $renameSection: JQuery = $target.find(".renameSection");
        $renameSection.find(".rename").each(function() {
            const $row: JQuery = $(this);
            const newName: string = $row.find(".newName").val();
            if (!newName) {
                $renameSection.closest(".group.minimized").removeClass("minimized");
                FormHelper.scrollToElement($renameSection);
                StatusBox.show(ErrTStr.NoEmpty, $row);
                invalid = true;
                return false;
            }
            const origName: string = $row.find(".origName").val();

            if (takenName.hasOwnProperty(newName) && origName !== newName) {
                $renameSection.closest(".group.minimized").removeClass("minimized");
                FormHelper.scrollToElement($renameSection);
                StatusBox.show(ErrTStr.NameInUse, $row);
                invalid = true;
                return false;
            }

            renameMap[origName] = newName;
            takenName[newName] = true;
        });

        if (invalid) {
            return null;
        }

        let colNamesAfterCheck: string[] = [];
        columnNames.forEach(function(colName: string) {
            if (renameMap.hasOwnProperty(colName)) {
                colNamesAfterCheck.push(renameMap[colName]);
            } else {
                const parsedName: string = xcHelper.parsePrefixColName(colName).name;
                colNamesAfterCheck.push(parsedName);
            }
        });

        return colNamesAfterCheck;
    }

    private _addRenameRows(columnsToRename: string[], $target: JQuery): void {
        const $renameSection: JQuery = $target.find(".renameSection");
        const $renamePart: JQuery = $renameSection.find(".renamePart");

        $renamePart.empty();

        for (let i = 0, len = columnsToRename.length; i < len; i++) {
            const $row: JQuery = $(FormHelper.Template.rename);
            $row.find(".origName").val(columnsToRename[i]);
            $renamePart.append($row);
        }

        $renameSection.removeClass("xc-hidden");
        $renameSection.closest(".group.minimized").removeClass("minimized");
    }

    private _smartRename($colToRename: JQuery): void {
        const self: ExportHelper = this;
        const origName: string = $colToRename.find(".origName").val();
        const currentColumNames: string[] = self.getExportColumns($colToRename.closest(".group"));
        let nameMap: object = {};

        // collect all existing names
        currentColumNames.forEach(function(columnName: string) {
            if (columnName !== origName) {
                nameMap[columnName] = true;
            }
        });

        $colToRename.siblings(".rename").each(function() {
            if ($(this).find(".origName").is($colToRename.find(".origName"))) {
                return true;
            }
            const columnName: string = $(this).find(".newName").val();
            if (columnName) {
                nameMap[columnName] = true;
            }
        });

        const parsedResult: PrefixColInfo = xcHelper.parsePrefixColName(origName);
        let newName: string;
        if (parsedResult.prefix) {
            newName = parsedResult.prefix + "-" + parsedResult.name;
        } else {
            newName = parsedResult.name;
        }
        const validName:string = xcHelper.autoName(newName, nameMap);
        $colToRename.find(".newName").val(validName);
    }
}