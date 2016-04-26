window.ExtensionModal = (function(ExtensionModal, $) {
    var $extModal; // $("#extensionModal");
    var modalHelper;

    // constant
    var minHeight = 400;
    var minWidth = 700;
    var curExt;

    ExtensionModal.setup = function() {
        $extModal = $("#extensionModal");

        modalHelper = new ModalHelper($extModal, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        $extModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $extModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $extModal.on("click", ".close, .cancel", function() {
            closeExtModal();
        });

        $extModal.on("click", ".confirm", function() {
            ExtensionPanel.install(curExt);
            closeExtModal();
        });

        $("#extModal-website").click(function() {
            var url = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:")) {
                    url = "http://" + url;
                }
                window.open(url);
            }
        });

        $("#extensionModal-logo").on("error", function() {
            var imgSrc = $("#extensionView").hasClass("custom") ?
                            paths.CustomExt : paths.XCExt;
            this.src = imgSrc;
        });
    };

    ExtensionModal.show = function(ext) {
        curExt = ext;

        if (ext.isInstalled()) {
            $extModal.find(".confirm").addClass("disabled");
        } else {
            $extModal.find(".confirm").removeClass("disabled");
        }

        updateDetail(ext);
        modalHelper.setup();
    };

    function closeExtModal() {
        modalHelper.clear();
        curExt = null;
        $("#extModal-website").removeData("url");
    }

    function updateDetail(ext) {
        $("#extensionModal-logo").attr("src", ext.getImage());

        var $infoArea = $extModal.find(".infoArea");
        $infoArea.find(".version .text").text(ext.getVersion());
        $("#extModal-website").data("url", ext.getWebsite());

        var $detailArea = $extModal.find(".detailInfos");
        $detailArea.find(".name .text").text(ext.getName());
        $detailArea.find(".category .text").text(ext.getCategory());
        $detailArea.find(".description .text").text(ext.getDesription());
    }

    return (ExtensionModal);
}({}, jQuery));
