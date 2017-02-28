window.PreviewFileModal = (function(PreviewFileModal, $) {
    var $modal;     // $("#previewFileModal")
    var modalHelper;
    var modalId;

    PreviewFileModal.setup = function() {
        $modal = $("#previewFileModal");

        var minWidth = 680;
        var minHeight = 400;

        modalHelper = new ModalHelper($modal, {
            "minWidth": minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        xcHelper.optionButtonEvent($modal.find(".radioButtonGroup"));
    };

    PreviewFileModal.show = function(url, options) {
        modalHelper.setup();
        $modal.removeClass("error").addClass("loading");
        modalId = xcHelper.randName("previewFile");

        options = options || {};
        var pattern = options.pattern;
        var currentId = modalId;

        setupMode(options.isParseMode);
        setupInstruction(url, pattern);

        XcalarListFilesWithPattern(url, options.isRecur, pattern)
        .then(function(res) {
            if (currentId === modalId) {
                $modal.removeClass("loading");
                loadFiles(url, res.files, options.previewFile);
            }
        })
        .fail(function(error) {
            if (currentId === modalId) {
                handleError(error);
            }
        });
    };

    function setupMode(isParseMode) {
        if (isParseMode) {
            $modal.addClass("parseMode");
        } else {
            $modal.removeClass("parseMode");
        }
    }

    function setupInstruction(url, pattern) {
        var $instruct = $modal.find(".modalInstruction");
        $instruct.find(".url b").text(url);

        if (pattern) {
            $instruct.find(".pattern").removeClass("xc-hidden")
                     .find("b").text(pattern);
        } else {
            $instruct.find(".pattern").addClass("xc-hidden");
        }
    }

    function loadFiles(url, files, activeFilePath) {
        var htmls = ["", "", ""];
        var paths = [];
        var $section = $modal.find(".contentSection");
        if (files.length === 1 && url.endsWith(files[0].name)) {
            // when it's a single file
            paths[0] = url;
        } else {
            files.forEach(function(file) {
                // XXX temporary skip folder, later may enable it
                if (!file.attr.isDirectory) {
                    var path = url + file.name;
                    paths.push(path);
                }
            });

            paths.sort();
        }

        for (var i = 0, len = paths.length; i < len; i++) {
            var path = paths[i];
            var classes = (path === activeFilePath) ? " active" : "";

            htmls[i % 3] +=
                '<div class="radioButton' + classes + '">' +
                    '<div class="radio">' +
                        '<i class="icon xi-radio-selected"></i>' +
                        '<i class="icon xi-radio-empty"></i>' +
                    '</div>' +
                    '<div class="label tooltipOverflow"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    ' title="' + path + '">' +
                        path +
                    '</div>' +
                '</div>';
        }

        $section.find(".part").each(function(idx, ele) {
            $(ele).html(htmls[idx]);
        });

        var $activeRadio = $section.find(".radioButton.active");
        if ($activeRadio.length) {
            $activeRadio.get(0).scrollIntoView();
        }
    }

    function handleError(error) {
        $modal.removeClass("loading").addClass("error");
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }
        $modal.find(".errorSection").text(error);
    }

    function submitForm() {
        var path = $modal.find(".radioButton.active").text();
        if ($modal.hasClass("parseMode")) {
            // parse mode
            DSParser.show(path);
        } else {
            // preview mode
            DSPreview.changePreviewFile(path);
        }

        closeModal();
    }

    function closeModal() {
        modalHelper.clear();
        modalId = null;
    }

    return PreviewFileModal;
}({}, jQuery));