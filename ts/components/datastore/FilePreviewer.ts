namespace FilePreviewer {
    let previewArgs = null;
    let $fileBrowserPreview: JQuery; // $("#fileBrowserPreview")
    let $fileInfoContainer: JQuery;
    let $fileBrowserContainer: JQuery;
    let $cardMain: JQuery;
    let idCount: number = 0;
    let initialOffset: number = 0;
    let totalSize: number = 0;

    // constant
    const outDateError: string = "preview id is out of date";
    const lineHeight: number = 30;

    /**
     * FilePreviewer.setup
     */
    export function setup(): void {
        $fileBrowserPreview = $("#fileBrowserPreview");
        $fileInfoContainer = $("#fileInfoContainer");
        $fileBrowserContainer = $("#fileBrowserContainer");
        $cardMain = $fileBrowserPreview.parent();
        FilePreviewer.close();
        addEventListener();
    }

    /**
     * FilePreviewer.show
     * @param options
     */
    export function show(options: any): XDPromise<void> {
        $fileInfoContainer.addClass("xc-hidden");
        $fileBrowserContainer.css("width", "100%");
        cleanPreviewer();
        setPreviewerId();
        $fileBrowserPreview.removeClass("xc-hidden");
        $cardMain.addClass("previewOpen");
        $("#fileBrowser").addClass("previewOpen");
        if (options.isFolder) {
            handleError(ErrTStr.NoFolderPreview);
            return PromiseHelper.resolve();
        } else {
            return initialPreview(options);
        }
    }

    /**
     * FilePreviewer.close
     */
    export function close(): void {
        $fileInfoContainer.removeClass("xc-hidden");
        $fileBrowserContainer.css("width", "calc(100% - 360px");
        $fileBrowserPreview.addClass("xc-hidden");
        $cardMain.removeClass("previewOpen full");
        $("#fileBrowser").removeClass("previewOpen");
        cleanPreviewer();
    }

    /**
     * FilePreviewer.isOpen
     */
    export function isOpen(): boolean {
        return !$fileBrowserPreview.hasClass("xc-hidden");
    }

    function cleanPreviewer(): void {
        previewArgs = null;
        initialOffset = 0;
        totalSize = 0;
        $fileBrowserPreview.find(".preview").empty();
        $fileBrowserPreview.removeData("id");
        $fileBrowserPreview.find(".errorSection").text("");
        $fileBrowserPreview.find(".offsetNum").text(0);
        $fileBrowserPreview.find(".skipToOffset")
        .removeClass("xc-disabled").val("");

        inPreviewMode();
    }

    function initialPreview(options): XDPromise<void> {
        previewArgs = options;
        return previewFile(0);
    }

    function previewFile(offset: number): XDPromise<void> {
        let args = previewArgs;
        if (args == null) {
            console.error("invliad arguments");
            return PromiseHelper.reject("invliad arguments");
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let perviewerId = getPreviewerId();

        let blockSize = calculateCharsPerLine();
        let numBytesToRequest = calculateBtyesToPreview(blockSize);
        let wasHexMode = isInHexMode();
        let timer = inLoadMode();

        args.recursive = false;
        args.fileNamePattern = "";

        XcalarPreview(args, numBytesToRequest, offset)
        .then(function(res) {
            if (!isValidId(perviewerId)) {
                return PromiseHelper.reject(outDateError);
            } else {
                initialOffset = offset;
                totalSize = res.totalDataSize;

                if (wasHexMode) {
                    inHexMode();
                } else {
                    inPreviewMode();
                }

                showPreview(res.base64Data, blockSize);
                deferred.resolve();
            }
        })
        .fail(function(error) {
            if (!isValidId(perviewerId) || error === outDateError) {
                // ingore the error
                deferred.reject(outDateError);
            } else {
                handleError(error);
                deferred.reject(error);
            }
        })
        .always(function() {
            clearTimeout(timer);
        });

        return deferred.promise();
    }

    function handleError(error: any): void {
        inErrorMode();
        if (typeof error === "object" && error.error) {
            error = error.error;
        }
        $fileBrowserPreview.find(".errorSection").text(error);
    }

    function isValidId(previewerId: number): boolean {
        let currentId = getPreviewerId();
        return (previewerId === currentId);
    }

    function getPreviewerId(): number {
        return $fileBrowserPreview.data("id");
    }

    function setPreviewerId(): void {
        $fileBrowserPreview.data("id", idCount);
        idCount++;
    }

    function inPreviewMode(): void {
        previewOrHexMode();
        $("#fileBrowserMain").removeClass("xc-hidden");
        $fileBrowserPreview.removeClass("hexMode hexModeAnim");
        $cardMain.removeClass("hexMode");

        $cardMain.addClass("noAnim");
        setTimeout(function() {
            // prevent animation when switching mode
            $cardMain.removeClass("noAnim");
        });
    }

    function isInHexMode(): boolean {
        return $fileBrowserPreview.hasClass("hexMode");
    }

    function inHexMode(): void {
        previewOrHexMode();
        $("#fileBrowserMain").addClass("xc-hidden");
        $fileBrowserPreview.addClass("hexMode");
        $cardMain.addClass("hexMode");
        // timeout so we don't animate the width
        setTimeout(function() {
            $fileBrowserPreview.addClass("hexModeAnim");
        });
    }

    function previewOrHexMode(): void {
        $fileBrowserPreview.find(".toggleHex").removeClass("xc-disabled");
        $fileBrowserPreview.removeClass("loading")
                            .removeClass("error");
    }

    function inLoadMode(): any {
        $fileBrowserPreview.find(".toggleHex").addClass("xc-disabled");

        let dealyTime = 1000;
        let timer = setTimeout(function() {
            $fileBrowserPreview.removeClass("error")
                        .addClass("loading");
        }, dealyTime);

        return timer;
    }

    function inErrorMode(): void {
        $fileBrowserPreview.find(".toggleHex").addClass("xc-disabled");
        $fileBrowserPreview.removeClass("loading hexMode")
                        .addClass("error");
    }

    function showPreview(base64Data: any, blockSize: number): void {
        // Note: hexdump is different from view the data using editor.
        // so use atob instead of Base64.decode
        let buffer = atob(base64Data);
        let codeHtml: string = "";
        let charHtml: string = "";

        for (let i = 0, len = buffer.length; i < len; i += blockSize) {
            let endIndex: number = Math.min(i + blockSize, buffer.length);
            let block = buffer.slice(i, endIndex);
            // use dot to replace special chars
            let chars = block.replace(/[\x00-\x1F\x20]/g, '.')
                                .replace(/[^\x00-\x7F]/g, '.'); // non-ascii chars

            charHtml += getCharHtml(chars, blockSize, i);
            codeHtml += getCodeHtml(block, blockSize, i);
        }

        $fileBrowserPreview.find(".preview.normal").html(charHtml);
        $fileBrowserPreview.find(".preview.hexDump").html(codeHtml);
        updateCSS();
        hoverEvent();
    }

    function getCharHtml(
        block: string,
        blockSize: number,
        startOffset: number
    ): HTML {
        startOffset = startOffset || 0;

        let chars = block.split("").map(function(ch, index) {
            let offset = startOffset + index;
            return getCell(ch, offset);
        }).join("");

        if (blockSize != null) {
            let numOfPaddings = blockSize - block.length;
            chars += '<span class="cell"> </span>'.repeat(numOfPaddings);
        }

        let style = getCellStyle();
        let html = '<div class="line" style="' + style + '">' +
                        chars +
                    '</div>';

        return html;
    }

    function getCodeHtml(
        block: string,
        blockSize: number,
        startOffset: number
    ): HTML {
        let hex: string = "0123456789ABCDEF";
        let codes = block.split("").map(function(ch, index) {
            let offset = startOffset + index;
            let code = ch.charCodeAt(0);
            let hexCode = hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            let cell = getCell(hexCode, offset);
            return "" + cell;
        }).join("");

        let numOfPaddings = blockSize - block.length;
        codes += '  <span class="cell">  </span>'.repeat(numOfPaddings);

        let style = getCellStyle();
        let html = '<div class="line" style="' + style + '">' +
                        codes +
                    '</div>';
        return html;
    }

    function getCell(ch: string, offset: number): HTML {
        offset = initialOffset + offset;
        let cell: HTML =
        '<span class="cell" data-offset="' + offset + '">' +
            xcStringHelper.escapeHTMLSpecialChar(ch) +
        '</span>';
        return cell;
    }

    function getCellStyle(): string {
        let style = "height:" + lineHeight + "px; " +
                    "line-height:" + lineHeight + "px;";
        return style;
    }

    function updateCSS(): void {
        let charWidth = calculateCharWidth();
        $fileBrowserPreview.find(".preview.normal .cell")
        .css("width", charWidth + "px");
    }

    function calculateCharWidth(): number {
        let $section = $fileBrowserPreview.find(".preview.normal");
        let $fakeElement = $(getCharHtml("a", null, null));

        $fakeElement.css("font-family", "monospace");
        $section.append($fakeElement);
        let charWidth = xcUIHelper.getTextWidth($fakeElement);
        $fakeElement.remove();
        return charWidth;
    }

    function calculateCharsPerLine(): number {
        let sectionWidth: number;
        const padding: number = 57;
        if ($cardMain.hasClass("full")) {
            sectionWidth = $cardMain.width() - padding;
        } else {
            sectionWidth = 360 - padding;
        }

        let charWidth = calculateCharWidth();
        const oneBlockChars: number = 8;
        let numOfBlock: number = Math.floor(sectionWidth / charWidth / oneBlockChars);
        let charsPerLine: number = numOfBlock * oneBlockChars;
        return charsPerLine;
    }

    function calculateBtyesToPreview(charsPerLine: number): number {
        let $section = $fileBrowserPreview.find(".preview.normal");
        let height = $section.height();
        let numLine: number = Math.floor(height / lineHeight);
        let numBytes: number = numLine * charsPerLine;
        return numBytes;
    }

    function addEventListener(): void {
        $fileBrowserPreview.on("click", ".toggleHex", function() {
            if (isInHexMode()) {
                inPreviewMode();
            } else {
                inHexMode();
            }
        });

        $("#fileBrowser").find(".closePreview").click(function() {
            FilePreviewer.close();
        });

        let $skipToOffset = $fileBrowserPreview.find(".skipToOffset");
        $skipToOffset.on("keyup", function(event) {
            if (event.which === keyCode.Enter) {
                var offset = $(this).val();
                if (offset !== "") {
                    updateOffset(Number(offset), false);
                }
            }
        });

        $fileBrowserPreview.find(".sliderPart").click(function() {
            if ($cardMain.hasClass("full")) {
                $cardMain.removeClass("full");
                initialPreview(previewArgs);

            } else {
                $cardMain.addClass("full");
                initialPreview(previewArgs);
            }

        });
    }

    function hoverEvent(): void {
        $fileBrowserPreview.find(".cell").hover(function() {
            let offset = $(this).data("offset");
            updateOffset(offset, false);
        });
    }

    // the noFetch is a prevent of potential resucsive
    function updateOffset(offset: number, noFetch: boolean): void {
        if (!Number.isInteger(offset) || offset < 0) {
            return;
        }

        $fileBrowserPreview.find(".cell.active").removeClass("active");
        let $cell = $fileBrowserPreview.find(".cell[data-offset='" + offset + "']");
        if ($cell.length > 0) {
            $fileBrowserPreview.find(".offsetNum").text(offset);
            $cell.addClass("active");
        } else if (!noFetch) {
            fetchNewPreview(offset);
        }
    }

    function fetchNewPreview(offset: number): XDPromise<void> {
        let $skipToOffset = $fileBrowserPreview.find(".skipToOffset");
        if (offset >= totalSize) {
            StatusBox.show(DSTStr.OffsetErr, $skipToOffset, false, {
                "side": "left"
            });
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let normalizedOffset = normalizeOffset(offset);
        $skipToOffset.addClass("xc-disabled");

        previewFile(normalizedOffset)
        .then(function() {
            updateOffset(offset, false);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $skipToOffset.removeClass("xc-disabled");
        });

        return deferred.promise();
    }

    function normalizeOffset(offset: number): number {
        let charsInOneLine = calculateCharsPerLine();
        return Math.floor(offset / charsInOneLine) * charsInOneLine;
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.isValidId = isValidId;
        __testOnly__.getPreviewerId = getPreviewerId;
        __testOnly__.setPreviewerId = setPreviewerId;
        __testOnly__.inPreviewMode = inPreviewMode;
        __testOnly__.isInHexMode = isInHexMode;
        __testOnly__.inHexMode = inHexMode;
        __testOnly__.inLoadMode = inLoadMode;
        __testOnly__.inErrorMode = inErrorMode;
        __testOnly__.cleanPreviewer = cleanPreviewer;
        __testOnly__.handleError = handleError;
        __testOnly__.getCharHtml = getCharHtml;
        __testOnly__.getCodeHtml = getCodeHtml;
        __testOnly__.getCell = getCell;
        __testOnly__.getCellStyle = getCellStyle;
        __testOnly__.updateOffset = updateOffset;
        __testOnly__.fetchNewPreview = fetchNewPreview;
    }
    /* End Of Unit Test Only */
}