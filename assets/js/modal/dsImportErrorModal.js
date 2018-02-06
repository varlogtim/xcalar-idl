window.DSImportErrorModal = (function(DSImportErrorModal, $) {
    var $modal;     // $("#dsImportErrorModal")
    var modalHelper;
    var modalId;
    var errors = {
        "a/b/c/d.txt": {
            type: "record",
            records: [{recordNum: 50, msg: "Why is there a comma where a full"  +
            "stop should be? I am filling text here so it will overflow."},
            {recordNum: 51, msg: "Why is there a comma where a full"  +
            "stop should be? I am filling text here so it will overflow."}]
        },
        "a.txt": {
            type: "file",
            msg: "File Error: 0 records were succesfulling read from this file.\n" +
            "Stack Trace: xxxxxx\n" +
            "\txxxxxx\n" +
            "\txxxxxx"
        }
    }; // stores error info with path as key

    DSImportErrorModal.setup = function() {
        $modal = $("#dsImportErrorModal");
        modalHelper = new ModalHelper($modal);

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".recordMessageList .recordNum", function() {
            var $row = $(this).closest(".row");
            if ($row.hasClass("expanded")) {
                $row.removeClass("expanded").addClass("collapsed");
            } else {
                $row.addClass("expanded").removeClass("collapsed");
            }
        });

        $modal.on("click", ".errorFileList .row", function() {
            var $row = $(this);
            if ($row.hasClass("active")) {
                return;
            }
            $modal.find(".errorFileList .row").removeClass("active");
            $row.addClass("active");
            var path = $(this).data("path");
            var error = errors[path];

            $modal.find(".recordErrorSection, .fileErrorSection").addClass("xc-hidden");
            var html = "";
            if (error.type === "record") {
                for (var i = 0; i < error.records.length; i++) {
                    html += '<div class="row collapsed">' +
                                '<div class="recordNum">' +
                                    '<i class="icon xi-arrow-down arrow"></i>' +
                                    '<span class="num">' + error.records[i].recordNum + '</span>' +
                                '</div>' +
                                '<div class="errorMsg">' + error.records[i].msg + '</div>' +
                            '</div>';
                }
                $modal.find(".recordMessageList").html(html);
                $modal.find(".recordErrorSection").removeClass("xc-hidden");
            } else {
                $modal.find(".fileErrorSection").removeClass("xc-hidden").html(error.msg);
            }
        });
    };

    DSImportErrorModal.show = function(options) {
        options = options || {};

        modalHelper.setup();
        modalId = Date.now();
    };

    function closeModal() {
        modalHelper.clear();
        modalId = null;
        // XXX clear cached errors
    }

    return DSImportErrorModal;
}({}, jQuery));