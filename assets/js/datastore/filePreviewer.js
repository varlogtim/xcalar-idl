window.FilePreviewer = (function(FilePreviewer, $) {
    var urlToPreview = null;
    var $fileBrowserPreview; // $("#fileBrowserPreview")
    var idCount = 0;
    var initialOffset = 0;
    var totalSize = 0;

    // constant
    var outDateError = "preview id is out of date";
    var lineHeight = 30;

    FilePreviewer.setup = function() {
        $fileBrowserPreview = $("#fileBrowserPreview");
        FilePreviewer.close();
        addEventListener();
    };

    FilePreviewer.show = function(url) {
        cleanPreviewer();
        setPreviewerId();
        $fileBrowserPreview.removeClass("xc-hidden");
        $("#fileBrowser").addClass("previewMode");
        initialPreview(url);
    };

    FilePreviewer.close = function() {
        $fileBrowserPreview.addClass("xc-hidden");
        $("#fileBrowser").removeClass("previewMode");
        cleanPreviewer();
    };

    function cleanPreviewer() {
        urlToPreview = null;
        initialOffset = 0;
        totalSize = 0;
        $fileBrowserPreview.find(".preview").empty();
        $fileBrowserPreview.removeData("id");
        $fileBrowserPreview.find(".offsetNum").text(0);
        $fileBrowserPreview.find(".skipToOffset")
        .removeClass("xc-disabled").val("");

        inPreviewMode();
    }

    function initialPreview(url) {
        urlToPreview = url;
        var offset = 0;
        previewFile(offset);
    }

    function previewFile(offset) {
        var url = urlToPreview;
        if (url == null) {
            console.error("invliad url");
            return PromiseHelper.reject("invliad url");
        }

        var deferred = jQuery.Deferred();
        var perviewerId = getPreviewerId();

        var blockSize = calculateCharsPerLine();
        var numBytesToRequest = calculateBtyesToPreview(blockSize);
        var wasHexMode = isInHexMode();
        var timer = inLoadMode();

        XcalarPreview(url, false, false, numBytesToRequest, offset)
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

    function handleError(error) {
        inErrorMode();
        $fileBrowserPreview.find(".errorSection").text(error.error);
    }

    function showPreview(base64Data, blockSize) {
        var buffer = atob(base64Data);
        var codeHtml = "";
        var normCharHtml = "";
        var dotCharHtml = "";

        for (var i = 0, len = buffer.length; i < len; i += blockSize) {
            var endIndex = Math.min(i + blockSize, buffer.length);
            var block = buffer.slice(i, endIndex);
            // use space to replace special chars
            var normalChars = block.replace(/[\x00-\x1F\x20]/g, ' ');
            var dotChars = block.replace(/[\x00-\x1F\x20]/g, '.');

            normCharHtml += getCharHtml(normalChars, blockSize, i);
            dotCharHtml += getCharHtml(dotChars, blockSize, i);
            codeHtml += getCodeHtml(block, blockSize, i);
        }

        $fileBrowserPreview.find(".preview.normal").html(normCharHtml);
        $fileBrowserPreview.find(".leftPart .hexDump").html(codeHtml);
        $fileBrowserPreview.find(".rightPart .hexDump").html(dotCharHtml);
    }

    function getCharHtml(block, blockSize, startOffest) {
        startOffest = startOffest || 0;

        var chars = block.split("").map(function(ch, index) {
            var offset = startOffest + index;
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

    function getCodeHtml(block, blockSize, startOffest) {
        var hex = "0123456789ABCDEF";
        var codes = block.split("").map(function(ch, index) {
            var offset = startOffest + index;
            var code = ch.charCodeAt(0);
            var hexCode = hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            var cell = getCell(hexCode, offset);
            return " " + cell;
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
                            xcHelper.escapeHTMlSepcialChar(ch) +
                    '</span>';
        return cell;
    }

    function getCellStyle() {
        var style = "height:" + lineHeight + "px; " +
                    "line-height:" + lineHeight + "px;";
        return style;
    }

    function inPreviewMode() {
        previewOrHexMode();
        $("#fileBrowserMain").removeClass("xc-hidden");
        $fileBrowserPreview.removeClass("hexMode");
    }

    function inHexMode() {
        previewOrHexMode();
        $("#fileBrowserMain").addClass("xc-hidden");
        $fileBrowserPreview.addClass("hexMode");
    }

    function previewOrHexMode() {
        $fileBrowserPreview.find(".toggleHex").removeClass("xc-disabled");
        $fileBrowserPreview.removeClass("loading")
                            .removeClass("error");
    }

    function isInHexMode() {
        return $fileBrowserPreview.hasClass("hexMode");
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

    function calculateCharsPerLine() {
        var $section = $fileBrowserPreview.find(".rightPart .preview:visible");
        var sectionWidth = $section.width();
        var $fakeElement = $(getCharHtml("a"));
        var charWidth;

        $fakeElement.css("font-family", "monospace");
        $section.append($fakeElement);
        charWidth = getTextWidth($fakeElement);
        $fakeElement.remove();

        var oneBlockChars = 8;
        var numOfBlock = Math.floor(sectionWidth / charWidth / oneBlockChars);
        var charsPerLine = numOfBlock * oneBlockChars;
        return charsPerLine;
    }

    function calculateBtyesToPreview(charsPerLine) {
        var $section = $fileBrowserPreview.find(".rightPart .preview:visible");
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

        $fileBrowserPreview.on("click", ".close", function() {
            FilePreviewer.close();
        });

        $fileBrowserPreview.on("click", ".cell", function() {
            var offset = $(this).data("offset");
            updateOffset(offset);
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
            return;
        }

        var normalizedOffset = normalizeOffset(offset);
        $skipToOffset.addClass("xc-disabled");

        previewFile(normalizedOffset)
        .then(function() {
            updateOffset(offset, false);
        })
        .always(function() {
            $skipToOffset.removeClass("xc-disabled");
        });
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
    }
    /* End Of Unit Test Only */

    return (FilePreviewer);
}({}, jQuery));