window.FilePreviewer = (function(FilePreviewer, $) {
    var urlToPreview = null;
    var $fileBrowserPreview; // $("#fileBrowserPreview")
    var idCount = 0;

    // constant
    var outDateError = "preview id is out of date";
    var charPerLine = 40;
    var lineHeight = 30;

    FilePreviewer.setup = function() {
        $fileBrowserPreview = $("#fileBrowserPreview");
    };

    FilePreviewer.show = function(url) {
        cleanPreviewer();
        setPreviewerId();
        initialPreview(url);
    };

    function closePreviewer() {
        cleanPreviewer();
    }

    function cleanPreviewer() {
        urlToPreview = null;
        $fileBrowserPreview.find(".previewer").empty();
        $fileBrowserPreview.removeData("id");
        inPreviewMode();
    }

    function initialPreview(url) {
        urlToPreview = url;
        var offset = 0;

        previewFile(offset)
        .then(function(res) {
            inPreviewMode();
            showPreview(res.base64Data);
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
        var numBytesToRequest = calculateBtyesToPreview();
        var dealyTime = 1000;
        var timer = setTimeout(function() {
            inLoadMode();
        }, dealyTime);

        XcalarPreview(url, false, false, numBytesToRequest, offset)
        .then(function(res) {
            if (!isValidId(perviewerId)) {
                return PromiseHelper.reject(outDateError);
            } else {
                deferred.resolve(res);
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

    function showPreview(base64Data) {
        var data = atob(base64Data);
        var len = data.length;
        var html = "";

        for (var i = 0; i < len; i+= charPerLine) {
            var endIndex = Math.min(len, i + charPerLine);
            var strInLine = data.slice(i, endIndex);
            html += getLineHtml(strInLine);
        }

        $fileBrowserPreview.find(".previewer").html(html);
    }

    function getLineHtml(str) {
        var style = "height:" + lineHeight + "px; " +
                    "line-height:" + lineHeight + "px;";
        var html = '<div class="line" style="' + style + '">' +
                        xcHelper.escapeHTMlSepcialChar(str) +
                    '</div>';
        return html;
    }

    function handleError(error) {
        inErrorMode();
        $fileBrowserPreview.find(".errorSection").text(error.error);
    }

    function inPreviewMode() {
        $fileBrowserPreview.removeClass("loading")
                            .removeClass("error");
    }

    function inLoadMode() {
        $fileBrowserPreview.removeClass("error")
                        .addClass("loading");
    }

    function inErrorMode() {
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

    function calculateBtyesToPreview() {
        var height = $fileBrowserPreview.find(".previewer").height();
        var numLine = Math.floor(height / lineHeight);
        var numBytes = numLine * charPerLine;
        return numBytes;
    }

    function hexdump(buffer, blockSize) {
        blockSize = blockSize || 16;
        var lines = [];
        var hex = "0123456789ABCDEF";
        for (var i = 0; i < buffer.length; i += blockSize) {
            var block = buffer.slice(i, Math.min(i + blockSize, buffer.length));
            var addr = ("0000" + i.toString(16)).slice(-4);
            var codes = block.split('').map(function(ch) {
                var code = ch.charCodeAt(0);
                return " " + hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            }).join("");
            codes += "   ".repeat(blockSize - block.length);
            var chars = block.replace(/[\x00-\x1F\x20]/g, '.');
            chars += " ".repeat(blockSize - block.length);
            lines.push(addr + " " + codes + "  " + chars);
        }

        return lines.join("\n");
    }


    return (FilePreviewer);
}({}, jQuery));