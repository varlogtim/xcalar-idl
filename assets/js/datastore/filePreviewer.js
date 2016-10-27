window.FilePreviewer = (function(FilePreviewer, $) {
    var urlToPreview = null;
    var $fileBrowserPreview; // $("#fileBrowserPreview")
    var idCount = 0;

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
        $fileBrowserPreview.find(".preview").empty();
        $fileBrowserPreview.removeData("id");
        inPreviewMode();
    }

    function initialPreview(url) {
        urlToPreview = url;
        var offset = 0;

        previewFile(offset)
        .then(function(res, blockSize) {
            inPreviewMode();
            showPreview(res.base64Data, blockSize);
        })
        .fail(function(error) {
            // don't need to handle outDateError
            if (error !== outDateError) {
                handleError(error);
            }
        });
    }

    function previewFile(offset) {
        var url = urlToPreview;
        if (url == null) {
            console.error("invliad url");
            return PromiseHelper.reject("invliad url");
        }

        var deferred = jQuery.Deferred();
        var perviewerId = getPreviewerId();

        var charsPerLine = calculateCharsPerLine();
        var numBytesToRequest = calculateBtyesToPreview(charsPerLine);
        var timer = inLoadMode();

        XcalarPreview(url, false, false, numBytesToRequest, offset)
        .then(function(res) {
            if (!isValidId(perviewerId)) {
                return PromiseHelper.reject(outDateError);
            } else {
                deferred.resolve(res, charsPerLine);
            }
        })
        .fail(function(error) {
            if (!isValidId(perviewerId)) {
                // ingore the error
                deferred.reject(outDateError);
            } else {
                deferred.reject(error);
            }
        })
        .always(function() {
            clearTimeout(timer);
        });

        return deferred.promise();
    }

    function showPreview(base64Data, blockSize) {
        var buffer = atob(base64Data);
        getNormalView(buffer, blockSize);
        getHexDumpView(buffer, blockSize);
    }

    function getNormalView(buffer, blockSize) {
        var len = buffer.length;
        var html = "";
        for (var i = 0; i < len; i+= blockSize) {
            var endIndex = Math.min(len, i + blockSize);
            var block = buffer.slice(i, endIndex);
            // tab and line split has a display issue, so use space to replace
            // as in gui you cannot tell
            block = block.replace(/[\n\t]/g, " ");
            html += getLineHtml(block);
        }

        $fileBrowserPreview.find(".preview.normal").html(html);
    }

    function getHexDumpView(buffer, blockSize) {
        var len = buffer.length;
        var hex = "0123456789ABCDEF";
        var codeHtml = "";
        var charHtml = "";

        for (var i = 0; i < len; i += blockSize) {
            var endIndex = Math.min(i + blockSize, buffer.length);
            var block = buffer.slice(i, endIndex);
            var codes = block.split('').map(function(ch) {
                var code = ch.charCodeAt(0);
                return " " + hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            }).join("");
            codes += "   ".repeat(blockSize - block.length);
            var chars = block.replace(/[\x00-\x1F\x20]/g, '.');
            chars += " ".repeat(blockSize - block.length);
            codeHtml += getLineHtml(codes);
            charHtml += getLineHtml(chars);
        }

        $fileBrowserPreview.find(".leftPart .hexDump").html(codeHtml);
        $fileBrowserPreview.find(".rightPart .hexDump").html(charHtml);
    }

    function getLineHtml(str) {
        str = xcHelper.escapeHTMlSepcialChar(str);

        var style = "height:" + lineHeight + "px; " +
                    "line-height:" + lineHeight + "px;";
        var html = '<div class="line" style="' + style + '">';

        str.split("").forEach(function(c) {
            html += '<span class="cell">' + c + '</span>';
        });
        html += '</div>';
        return html;
    }

    function handleError(error) {
        inErrorMode();
        $fileBrowserPreview.find(".errorSection").text(error.error);
    }

    function inPreviewMode() {
        $fileBrowserPreview.find(".toggleHex").removeClass("xc-disabled");
        $("#fileBrowserMain").removeClass("xc-hidden");
        $fileBrowserPreview.removeClass("loading")
                            .removeClass("error")
                            .removeClass("hexMode");
    }

    function inHexMode() {
        $fileBrowserPreview.addClass("hexMode");
        $("#fileBrowserMain").addClass("xc-hidden");
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
        $fileBrowserPreview.removeClass("loading")
                        .addClass("error");
    }

    function getPreviewerId() {
        return $fileBrowserPreview.data("id");
    }

    function setPreviewerId() {
        $fileBrowserPreview.data("id", idCount);
        idCount++;
    }

    function isValidId(previewerId) {
        var currentId = getPreviewerId();
        return (previewerId === currentId);
    }


    function calculateCharsPerLine() {
        var $section = $fileBrowserPreview.find(".preview.normal");
        var sectionWidth = $section.width();
        var $fakeElement = $(getLineHtml("a"));
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
        var height = $fileBrowserPreview.find(".preview.normal").height();
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
    }

    return (FilePreviewer);
}({}, jQuery));