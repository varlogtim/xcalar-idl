window.FilePreviewer = (function(FilePreviewer, $) {
    var previewArgs = null;
    var $fileBrowserPreview; // $("#fileBrowserPreview")
    var $fileInfoContainer;
    var $fileBrowserContainer;
    var $cardMain;
    var idCount = 0;
    var initialOffset = 0;
    var totalSize = 0;

    // constant
    var outDateError = "preview id is out of date";
    var lineHeight = 30;

    FilePreviewer.setup = function() {
        $fileBrowserPreview = $("#fileBrowserPreview");
        $fileInfoContainer = $("#fileInfoContainer");
        $fileBrowserContainer = $("#fileBrowserContainer");
        $cardMain = $fileBrowserPreview.parent();
        FilePreviewer.close();
        addEventListener();
    };

    FilePreviewer.show = function(options) {
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
    };

    FilePreviewer.close = function() {
        $fileInfoContainer.removeClass("xc-hidden");
        $fileBrowserContainer.css("width", "calc(100% - 360px");
        $fileBrowserPreview.addClass("xc-hidden");
        $cardMain.removeClass("previewOpen full");
        $("#fileBrowser").removeClass("previewOpen");
        cleanPreviewer();
    };

    FilePreviewer.isOpen = function() {
        return !$fileBrowserPreview.hasClass("xc-hidden");
    };

    function cleanPreviewer() {
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

    function initialPreview(options) {
        previewArgs = options;
        var offset = 0;
        return previewFile(offset);
    }

    function previewFile(offset) {
        var args = previewArgs;
        if (args == null) {
            console.error("invliad arguments");
            return PromiseHelper.reject("invliad arguments");
        }

        var deferred = PromiseHelper.deferred();
        var perviewerId = getPreviewerId();

        var blockSize = calculateCharsPerLine();
        var numBytesToRequest = calculateBtyesToPreview(blockSize);
        var wasHexMode = isInHexMode();
        var timer = inLoadMode();

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

    function handleError(error) {
        inErrorMode();
        if (typeof error === "object" && error.error) {
            error = error.error;
        }
        $fileBrowserPreview.find(".errorSection").text(error);
    }

    function isValidId(previewerId) {
        var currentId = getPreviewerId();
        return (previewerId === currentId);
    }

    function getPreviewerId() {
        return $fileBrowserPreview.data("id");
    }

    function setPreviewerId() {
        $fileBrowserPreview.data("id", idCount);
        idCount++;
    }

    function inPreviewMode() {
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

    function isInHexMode() {
        return $fileBrowserPreview.hasClass("hexMode");
    }

    function inHexMode() {
        previewOrHexMode();
        $("#fileBrowserMain").addClass("xc-hidden");
        $fileBrowserPreview.addClass("hexMode");
        $cardMain.addClass("hexMode");
        // timeout so we don't animate the width
        setTimeout(function() {
            $fileBrowserPreview.addClass("hexModeAnim");
        });
    }

    function previewOrHexMode() {
        $fileBrowserPreview.find(".toggleHex").removeClass("xc-disabled");
        $fileBrowserPreview.removeClass("loading")
                            .removeClass("error");
    }

    function inLoadMode() {
        $fileBrowserPreview.find(".toggleHex").addClass("xc-disabled");

        var dealyTime = 1000;
        var timer = setTimeout(function() {
            $fileBrowserPreview.removeClass("error")
                        .addClass("loading");
        }, dealyTime);

        return timer;
    }

    function inErrorMode() {
        $fileBrowserPreview.find(".toggleHex").addClass("xc-disabled");
        $fileBrowserPreview.removeClass("loading hexMode")
                        .addClass("error");
    }

    function showPreview(base64Data, blockSize) {
        // Note: hexdump is different from view the data using editor.
        // so use atob instead of Base64.decode
        var buffer = atob(base64Data);
        var codeHtml = "";
        var charHtml = "";

        for (var i = 0, len = buffer.length; i < len; i += blockSize) {
            var endIndex = Math.min(i + blockSize, buffer.length);
            var block = buffer.slice(i, endIndex);
            // use dot to replace special chars
            var chars = block.replace(/[\x00-\x1F\x20]/g, '.')
                                .replace(/[^\x00-\x7F]/g, '.'); // non-ascii chars

            charHtml += getCharHtml(chars, blockSize, i);
            codeHtml += getCodeHtml(block, blockSize, i);
        }

        $fileBrowserPreview.find(".preview.normal").html(charHtml);
        $fileBrowserPreview.find(".preview.hexDump").html(codeHtml);
        updateCSS();
        hoverEvent();
    }

    function getCharHtml(block, blockSize, startOffset) {
        startOffset = startOffset || 0;

        var chars = block.split("").map(function(ch, index) {
            var offset = startOffset + index;
            return getCell(ch, offset);
        }).join("");

        if (blockSize != null) {
            var numOfPaddings = blockSize - block.length;
            chars += '<span class="cell"> </span>'.repeat(numOfPaddings);
        }

        var style = getCellStyle();
        var html = '<div class="line" style="' + style + '">' +
                        chars +
                    '</div>';

        return html;
    }

    function getCodeHtml(block, blockSize, startOffset) {
        var hex = "0123456789ABCDEF";
        var codes = block.split("").map(function(ch, index) {
            var offset = startOffset + index;
            var code = ch.charCodeAt(0);
            var hexCode = hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            var cell = getCell(hexCode, offset);
            return "" + cell;
        }).join("");

        var numOfPaddings = blockSize - block.length;
        codes += '  <span class="cell">  </span>'.repeat(numOfPaddings);

        var style = getCellStyle();
        var html = '<div class="line" style="' + style + '">' +
                        codes +
                    '</div>';
        return html;
    }

    function getCell(ch, offset) {
        offset = initialOffset + offset;
        var cell = '<span class="cell" data-offset="' + offset + '">' +
                            xcHelper.escapeHTMLSpecialChar(ch) +
                    '</span>';
        return cell;
    }

    function getCellStyle() {
        var style = "height:" + lineHeight + "px; " +
                    "line-height:" + lineHeight + "px;";
        return style;
    }

    function updateCSS() {
        var charWidth = calculateCharWidth();
        $fileBrowserPreview.find(".preview.normal .cell")
        .css("width", charWidth + "px");
    }

    function calculateCharWidth() {
        var $section = $fileBrowserPreview.find(".preview.normal");
        var $fakeElement = $(getCharHtml("a"));

        $fakeElement.css("font-family", "monospace");
        $section.append($fakeElement);
        var charWidth = xcHelper.getTextWidth($fakeElement);
        $fakeElement.remove();
        return charWidth;
    }

    function calculateCharsPerLine() {
        var sectionWidth;
        var padding = 57;
        if ($cardMain.hasClass("full")) {
            sectionWidth = $cardMain.width() - padding;
        } else {
            sectionWidth = 360 - padding;
        }

        var charWidth = calculateCharWidth();

        var oneBlockChars = 8;
        var numOfBlock = Math.floor(sectionWidth / charWidth / oneBlockChars);
        var charsPerLine = numOfBlock * oneBlockChars;
        return charsPerLine;
    }

    function calculateBtyesToPreview(charsPerLine) {
        var $section = $fileBrowserPreview.find(".preview.normal");
        var height = $section.height();
        var numLine = Math.floor(height / lineHeight);
        var numBytes = numLine * charsPerLine;
        return numBytes;
    }

    function addEventListener() {
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

        var $skipToOffset = $fileBrowserPreview.find(".skipToOffset");
        $skipToOffset.on("keyup", function(event) {
            if (event.which === keyCode.Enter) {
                var offset = $(this).val();
                if (offset !== "") {
                    updateOffset(Number(offset));
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

    function hoverEvent() {
        $fileBrowserPreview.find(".cell").hover(function() {
            var offset = $(this).data("offset");
            updateOffset(offset);
        });
    }

    // the noFetch is a prevent of potential resucsive
    function updateOffset(offset, noFetch) {
        if (!Number.isInteger(offset) || offset < 0) {
            return;
        }

        $fileBrowserPreview.find(".cell.active").removeClass("active");
        var $cell = $fileBrowserPreview.find(".cell[data-offset='" + offset + "']");
        if ($cell.length > 0) {
            $fileBrowserPreview.find(".offsetNum").text(offset);
            $cell.addClass("active");
        } else if (!noFetch) {
            fetchNewPreview(offset);
        }
    }

    function fetchNewPreview(offset) {
        var $skipToOffset = $fileBrowserPreview.find(".skipToOffset");
        if (offset >= totalSize) {
            StatusBox.show(DSTStr.OffsetErr, $skipToOffset, false, {
                "side": "left"
            });
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var normalizedOffset = normalizeOffset(offset);
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

    function normalizeOffset(offset) {
        var charsInOneLine = calculateCharsPerLine();
        offset = Math.floor(offset / charsInOneLine) * charsInOneLine;
        return offset;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FilePreviewer.__testOnly__ = {};
        FilePreviewer.__testOnly__.isValidId = isValidId;
        FilePreviewer.__testOnly__.getPreviewerId = getPreviewerId;
        FilePreviewer.__testOnly__.setPreviewerId = setPreviewerId;
        FilePreviewer.__testOnly__.inPreviewMode = inPreviewMode;
        FilePreviewer.__testOnly__.isInHexMode = isInHexMode;
        FilePreviewer.__testOnly__.inHexMode = inHexMode;
        FilePreviewer.__testOnly__.inLoadMode = inLoadMode;
        FilePreviewer.__testOnly__.inErrorMode = inErrorMode;
        FilePreviewer.__testOnly__.cleanPreviewer = cleanPreviewer;
        FilePreviewer.__testOnly__.handleError = handleError;
        FilePreviewer.__testOnly__.getCharHtml = getCharHtml;
        FilePreviewer.__testOnly__.getCodeHtml = getCodeHtml;
        FilePreviewer.__testOnly__.getCell = getCell;
        FilePreviewer.__testOnly__.getCellStyle = getCellStyle;
        FilePreviewer.__testOnly__.updateOffset = updateOffset;
        FilePreviewer.__testOnly__.fetchNewPreview = fetchNewPreview;
    }
    /* End Of Unit Test Only */

    return (FilePreviewer);
}({}, jQuery));