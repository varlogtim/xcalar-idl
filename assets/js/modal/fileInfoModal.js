window.FileInfoModal = (function($, FileInfoModal) {
    var $modal;  // $("#fileInfoModal");
    var modalHelper;

    FileInfoModal.setup = function() {
        $modal = $("#fileInfoModal");
        modalHelper = new ModalHelper($modal, {
            "noResize": true,
            "noBackground": true,
            "center": {"verticalQuartile": true}
        });

        $modal.resizable({
            "handles": "e, w",
            "minWidth": 400,
            "containment": "document",
        });

        $modal.on("click", ".close", closeModal);
    };

    FileInfoModal.show = function(options) {
        options = options || {};
        var isFolder = options.isFolder;
        var path = options.path;

        if (isCurrentPath(path)) {
            // get info of the same folder/ds
            return;
        }

        modalHelper.setup();
        autoResizeLabel();

        $modal.data("path", options.path);
        if (isFolder) {
            $modal.addClass("folder").removeClass("ds");
        } else {
            $modal.addClass("ds").removeClass("folder");
        }

        setBasicInfo(options);
        getFolderCount(path, isFolder);
    };

    function setBasicInfo(options) {
        var attrs = ["name", "path", "size", "modified"];
        attrs.forEach(function(attr) {
            var val = options[attr] || "--";
            $modal.find("." + attr + " .text").text(val);
        });
    }

    function getFolderCount(path, isFolder) {
        if (!isFolder) {
            $modal.find(".count .text").text("--");
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        $modal.addClass("loading");

        XcalarListFiles(path)
        .then(function(res) {
            if (isCurrentPath(path)) {
                $modal.find(".count .text").text(res.numFiles);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("list file failed", error);
            if (isCurrentPath(path)) {
                $modal.find(".count .text").text("--");
            }
            deferred.reject(error);
        })
        .always(function() {
            if (isCurrentPath(path)) {
                $modal.removeClass("loading");
            }
        });

        return deferred.promise();
    }

    function isCurrentPath(path) {
        return path != null && path === $modal.data("path");
    }

    function autoResizeLabel() {
        // use js to resize because different language has differ label width
        var $labels = $modal.find(".infoSection .label");
        var width = 55; // minumim width
        $labels.each(function() {
            var w = $(this).width() + 2; // padding 2px
            width = Math.max(width, w);
        });

        $labels.each(function() {
            $(this).width(width);
        });
    }

    function closeModal() {
        modalHelper.clear();
        $modal.removeData("path");
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FileInfoModal.__testOnly__ = {};
        FileInfoModal.__testOnly__.isCurrentPath = isCurrentPath;
    }
    /* End Of Unit Test Only */

    return (FileInfoModal);
}(jQuery, {}));
