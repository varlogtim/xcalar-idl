/*
 * Module for dataset parser card
 */
window.DSParser = (function($, DSParser) {
    var $parserCard;
    var $formatList;
    var $dataPreview;
    var $previewContent;
    var buffers = [];
    var curArgs;
    var keys;
    var previewMetaSet; // set of previewMeta in different  format
    var previewMeta; // will have lineLengths, maxLen, tmpPath, totalLines, numChar
    var lineHeight = 18;
    var boxLineHeight = 15;
    var linesPerPage = 100;
    var paddingTop = 4;
    var paddingBottom = 10;
    var loadingMargin = 45;
    var isMouseDown = false;
    var isBoxMouseDown = false;
    var fetchId = 0; // used to detect stale requests
    var boxFetchId = 0;
    var $miniPreview;
    var $miniContent;

    // const
    var previewApp = "VisualParserFormatter";
    var xmlApp = "VisualParserXml";
    var jsonApp = "VisualParserJson";
    var notSameCardError = "current card id changed";
    var cancelError = "cancel submit";

    DSParser.setup = function() {
        $parserCard = $("#dsParser");
        $formatList = $parserCard.find(".fileFormat");
        $dataPreview = $parserCard.find('.dataPreview');
        $previewContent = $parserCard.find('.previewContent');
        $miniPreview = $("#previewModeBox").find(".innerMetaPreview");
        $miniContent = $miniPreview.find('.metaContent');

        new MenuHelper($formatList, {
            "onSelect": function($li) {
                changeFormat($li);
                refreshFormat();
            }
        }).setupListeners();

        $parserCard.on("click", ".confirm", function() {
            submitForm();
        });

        $parserCard.on("click", ".cardHeader .close", function() {
            closeCard();
        });

        $parserCard.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $parserCard.on("click", ".errorSection.suggest", function() {
            $formatList.find('li[name="text"]').trigger(fakeEvent.mouseup);
        });

        setupBoxes();
        setupMenu();
        setupRowInput();
        setupInfScroll($dataPreview);
        setupInfScroll($miniPreview);
        setupKeyBox();
    };

    DSParser.show = function(options) {
        options = options || {};
        var deferred = jQuery.Deferred();
        var $btn = $("#preview-parser");
        xcHelper.disableSubmit($btn);

        checkFileSize(options)
        .then(function() {
            DSForm.switchView(DSForm.View.Parser);
            resetView(options);
            return refreshView();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            xcHelper.enableSubmit($btn);
        });

        return deferred.promise();
    };

    function checkFileSize(options) {
        var deferred = jQuery.Deferred();

        XcalarListFiles(options)
        .then(function(res) {
            try {
                var size = res.files[0].attr.size;
                alertFileSize(size)
                .then(deferred.resolve)
                .fail(deferred.reject);

            } catch (e) {
                console.error("check size fails", e);
                // if cannot get the size, then skip it
                deferred.resolve();
            }
        })
        .fail(function(error) {
            console.error("check size fails", error);
            // if cannot get the size, then skip it
            deferred.resolve();
        });

        return deferred.promise();
    }

    function alertFileSize(size) {
        var sizeLimit = 500 * 1024 * 1024; // 500MB;
        if (size <= sizeLimit) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        Alert.show({
            "msg": DSParserTStr.FileSizeWarn,
            "hideButtons": ["cancel"],
            "isAlert": true,
            "buttons": [{
                className: "btn-cancel",
                name: DSParserTStr.Proceed,
                func: function() {
                    deferred.resolve();
                }
            }, {
                name: AlertTStr.CLOSE,
                func: function() {
                    deferred.reject();
                }
            }],
            "onCancel": function() { deferred.reject(); }
        });

        return deferred.promise();
    }

    function refreshView(noDetect) {
        var promise = previewContent(0, 1, null, noDetect);
        resetScrolling();
        return promise;
    }

    function resetView(options, isChangeFormat) {
        $previewContent.html("");
        var $fileName = $parserCard.find(".topSection .filename");
        $fileName.text(options.path);
        xcTooltip.changeText($fileName, options.path);
        if (!isChangeFormat) {
            $formatList.find("input").val("");
            previewMetaSet = {};
        }
        $miniContent.empty();
        $("#delimitersBox .boxBody ul").empty();
        buffers = [];
        totalRows = null;
        keys = [];
        previewMeta = null;
        fetchId++;
        boxFetchId++;
        curArgs = options;
        resetRowInput();
        $dataPreview.find(".sizer").height(0);
        $previewContent.parent().height("auto");
        $miniContent.parent().height("auto");
        $dataPreview.scrollTop(0);
        $dataPreview.css("margin-left", loadingMargin);
        $miniPreview.css("margin-left", loadingMargin);
        $parserCard.find(".rowNums").empty();
        $parserCard.find(".rowNumCol").scrollTop(0);
        $("#plainTextBox input").val("\\n").removeClass("nullVal");
    }

    function changeFormat($li) {
        var format = $li.attr("name");
        var text = $li.text();
        $formatList.find(".text").val(text);

        if (format === "text") {
            $parserCard.addClass("previewOnly");
        } else {
            $parserCard.removeClass("previewOnly");
        }
    }

    function refreshFormat() {
        resetView(curArgs, true);
        return refreshView(true);
    }

    // called after clicking next OR close
    function cleanupCard() {
        $dataPreview.off("mousedown.dsparser");
        $miniPreview.off("mousedown.dsparser");
        $(document).off("mouseup.dsparser");
        isMouseDown = false;
        isBoxMouseDown = false;
        $(window).off("resize.dsparser");
    }

    function resetScrolling() {
        var scrollTop;
        $dataPreview.on("mousedown.dsparser", function() {
            scrollTop = $dataPreview.scrollTop();
            isMouseDown = true;
        });

        $miniPreview.on("mousedown.dsparser", function() {
            isBoxMouseDown = true;
        });

        $(document).on("mouseup.dsparser", function() {
            if (isMouseDown) {
                if ($dataPreview.scrollTop() !== scrollTop) {
                    checkIfScrolled($dataPreview, previewMeta, false, true);
                }
                isMouseDown = false;
            } else if (isBoxMouseDown) {
                if (previewMeta) {
                    checkIfScrolled($miniPreview, previewMeta.meta, false, true);
                }
                isBoxMouseDown = false;
            }
        });
    }

    function setupBoxes() {
        var $boxes = $parserCard.find(".parserBox");
        $boxes.css("margin-right", gScrollbarWidth);

        $boxes.mousedown(function() {
            $(this).css({"z-index": 1});
            $(this).siblings(".parserBox").css({"z-index": 0});
        });

        $boxes.on("click", ".resize", function() {
            var $box = $(this).closest(".parserBox");
            $box.removeClass("minimized");
            if ($box.hasClass("maximized")) {
                $box.removeClass("maximized").css("margin-right",
                                                  gScrollbarWidth);
            } else {
                $box.addClass("maximized").css("margin-right", 0);
                if ($box.is("#previewModeBox") && previewMeta) {
                    checkIfScrolled($miniPreview, previewMeta.meta);
                }
            }
        });

        $boxes.on("click", ".boxHeader", function(event) {
            if ($(event.target).closest(".resize").length ||
                gMouseEvents.getLastMouseDownTarget().closest(".resize").length)
            {
                return;
            }
            var $box = $(this).closest(".parserBox");
            if ($box.hasClass("maximized")) {
                return;
            }
            if ($box.hasClass("minimized")) {
                $box.removeClass("minimized");
            } else {
                $box.addClass("minimized");
            }
        });

        // setUp line delimiter and field delimiter
        new MenuHelper($("#plainTextBox").find(".dropDownList"), {
            "onSelect": selectDelim,
            "container": "#plainTextBox",
            "bounds": "#plainTextBox"
        }).setupListeners();

        function selectDelim($li) {
            var name = $li.attr("name");
            var $input = $('#plainTextBox').find("input");
            if (name === "default") {
                $input.val("\\n");
                $input.removeClass("nullVal");
            } else if (name === "null") {
                $input.val("Null");
                $input.addClass("nullVal");
            }
            $("#plainTextBox").val($li.text());
        }

        $("#plainTextBox").on("input", "input", function() {
            var $input = $(this);
            $input.removeClass("nullVal");
        });
    }

    function setupMenu() {
        var $menu = $("#parserMenu");
        xcMenu.add($menu);

        var onScrollbar = false;
        $dataPreview.mousedown(function(event) {
            var x = event.offsetX;
            if (x > $dataPreview.width() - gScrollbarWidth) {
                // clicking on scrollbar
                onScrollbar = true;
                xcHelper.removeSelectionRange();
                return;
            } else {
                onScrollbar = false;
            }
        });

        $dataPreview.mouseup(function(event) {
            var x = event.offsetX;
            if ((x > ($dataPreview.width() - gScrollbarWidth)) || onScrollbar) {
                // clicking on scrollbar
                xcHelper.removeSelectionRange();
                onScrollbar = false;
                return;
            }
            onScrollbar = false;
            // timeout because deselecting may not take effect until after
            // mouse up
            setTimeout(function() {
                if (!xcHelper.hasSelection()) { // no selection made
                    return;
                }
                if ($(document.activeElement).is("input")) {
                    return;
                }

                var res = getSelectionCharOffsetsWithin($previewContent[0]);
                var $target = $(event.target);
                if ($parserCard.hasClass("previewOnly") || !res ||
                    res.tag == null) {
                    $menu.find("li").addClass("unavailable");
                    $menu.removeData("tag");
                    $menu.removeData("start");
                    $menu.removeData("end");
                    $menu.removeData("line");
                    $menu.removeData("totaloffset");
                } else {
                    $menu.find("li").removeClass("unavailable");
                    $menu.data("tag", res.tag);
                    $menu.data("start", res.start);
                    $menu.data("end", res.end);
                    $menu.data("line", res.line);
                    $menu.data("totaloffset",
                                previewMeta.lineLengths[previewMeta.startPage]);
                }

                xcHelper.dropdownOpen($target, $menu, {
                    "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                    "floating": true
                });
            });
        });

        // prevent browser's default menu if text selected
        $previewContent.contextmenu(function() {
            if (xcHelper.hasSelection()) {
                return false;
            }
        });

        $menu.on("click", "li", function() {
            var $li = $(this);
            if ($li.hasClass("unavailable")) {
                return;
            }

            var tag = $menu.data("tag");
            var type = $li.data("action");
            var bufferOffset = $menu.data("end");
            var start = $menu.data("start");
            var line = $menu.data("line");
            var totalOffset = $menu.data("totaloffset");

            populateKey(tag, type, start, bufferOffset, line, totalOffset);
        });
    }

    function setupKeyBox() {
        var $box = $("#delimitersBox");
        $box.on("click", "li", function(event) {
            focusKey($(this));
            if (!$(event.target).closest(".remove").length) {
                findKey($(this));
            }
        });

        $box.on("click", ".remove", function() {
            var $li = $(this).closest("li");
            removeKey($li);
        });
    }

    // centerFocus: boolean, whether to align line to center instead of top
    //              if line is found visible in bottom half of panel
    function submitRowInput(val, centerFocus) {
        var $input = $("#parserRowInput");
        if ($parserCard.hasClass("loading") ||
                $parserCard.hasClass("fetchingRows")) {
            return PromiseHelper.reject();
        }

        var deferred = jQuery.Deferred();

        val = Math.min(previewMeta.totalLines, val);
        val = Math.max(1, val);

        var numVisibleLines = Math.ceil($dataPreview.outerHeight() /
                                        lineHeight);

        // align to center if line is currently in bottom half of view port
        if (centerFocus) {
            var lineNum = getScrollLineNum();
            if (val < (lineNum + numVisibleLines)) {
                if (val > (lineNum + (numVisibleLines / 2))) {
                    var midLine = Math.floor(lineNum + (numVisibleLines / 2));
                    val = lineNum + (val - midLine);
                } else if (val >= lineNum) {
                    deferred.resolve();
                    return deferred.promise(); // no need to scroll
                } else {
                    val--;
                }
            } else {
                val--; // allow 1 row above to be visible
            }
        }
        val = Math.max(1, val);

        $input.data("val", val).val(val);
        val -= 1; // change 1 indexed to 0 indexed

        var page = Math.floor(val / linesPerPage);
        var padding = paddingTop;
        if (val === 1) {
            padding = 0;
        }
        var actualScrollTop = val * lineHeight + padding; // without scaling
        var newScrollTop = ((page * previewMeta.pageHeight) /
            previewMeta.scale) + ((val % linesPerPage) * lineHeight) + padding;

        var numPages = 1;

        // if the end and start of 2 different pages are visible, fetch 2 pages
        if (Math.floor((val + numVisibleLines) / linesPerPage) !== page) {
            numPages = 2;
        }

        if (checkIfNeedContent(page, numPages)) {
            previewMeta.base = actualScrollTop - (actualScrollTop / previewMeta.scale);
            if (previewMeta.scale > 1) {
                previewMeta.offset = page * previewMeta.pageHeight;
            } else {
                previewMeta.offset = 0;
            }

            previewContent(page, numPages, newScrollTop)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            $dataPreview.scrollTop(newScrollTop);
            deferred.resolve();
        }
        return deferred.promise();
    }

    function setupRowInput() {
        var $input = $("#parserRowInput");
        $input.keypress(function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }
            var prevVal = $input.data("val");
            var val = Number($input.val());
            if (isNaN(val) || val % 1 !== 0) {
                $input.val(prevVal);
                return;
            }

            submitRowInput(val);
        });

        $input.blur(function() {
            var val = $(this).data('val');
            $(this).val(val);
        });
    }

    function setupInfScroll($preview) {
        var prevScrollPos = 0;
        var scrollTop;
        var scrollTimer;
        var rowNumTimer;
        var $container;
        var isBox = false;
        var $rowNumCol;

        if ($preview.hasClass("innerMetaPreview")) {
            $container = $preview;
            $rowNumCol = $parserCard.find(".metaRowNumCol");
            isBox = true;
        } else {
            $container = $parserCard;
            $rowNumCol = $parserCard.find(".previewRowNumCol");
        }

        $preview.scroll(function() {
            scrollTop = $preview.scrollTop();
            if (!isBox) {
                updateRowInput();
            }

            $rowNumCol.scrollTop(scrollTop);

            clearTimeout(scrollTimer);
            clearTimeout(rowNumTimer);

            rowNumTimer = setTimeout(function() {
                delayedScrollCheck(true);
            }, 200);

            if (isMouseDown || isBoxMouseDown) {
                return;
            }

            // when scrolling stops, will check position and see if we need
            // to fetch rows
            scrollTimer = setTimeout(function() {
                delayedScrollCheck();
            }, 300);

            if ($container.hasClass("fetchingRows")) {
                return;
            }

            if (scrollTop !== prevScrollPos) {
                if (scrollTop > prevScrollPos) {
                    checkIfNeedFetch($preview);
                } else if (scrollTop < prevScrollPos) {
                    checkIfNeedFetch($preview, true);
                }
                prevScrollPos = scrollTop;
            } else {
                // could be scrolling horizontally
                return;
            }
        });

        function delayedScrollCheck(forRowNum) {
            if (!previewMeta) {
                return;
            }
            var meta;
            if (isBox) {
                meta = previewMeta.meta;
            } else {
                meta = previewMeta;
            }
            checkIfScrolled($preview, meta, forRowNum);
        }
    }

    // called on scroll to see if needs block appended or prepended
    function checkIfNeedFetch($preview, up) {
        if (!previewMeta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var meta;
        if ($preview.hasClass("innerMetaPreview")) {
            meta = previewMeta.meta;
        } else {
            meta = previewMeta;
        }

        var scrollTop = Math.max(0, $preview.scrollTop() - paddingTop);
        scrollTop = scrollTop + meta.offset - (meta.offset / meta.scale);

        if (up) {
            var startPage = Math.floor(scrollTop / meta.pageHeight);
            if (startPage < meta.startPage) {
                fetchRows(meta, meta.lineLengths[startPage], up);
            }
        } else {
            var scrollBottom = scrollTop + $preview[0].offsetHeight;
            var endPage = Math.floor(scrollBottom / meta.pageHeight);
            if (endPage > meta.endPage) {
                fetchRows(meta, meta.lineLengths[endPage]);
            }
        }
    }

    // called after pressing mousedown on scrollbar, scrolling and releasing
    // also called at a timeout after a scrollevent to check if new content is
    // needed
    function checkIfScrolled($preview, meta, forRowNum, mouseup) {
        if (!previewMeta || !previewMeta.meta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var scrollTop = Math.max(0, $preview.scrollTop() - paddingTop);

        if (mouseup || isMouseDown) {
            scrollTop *= meta.scale;
        } else {
            scrollTop = scrollTop + meta.offset - (meta.offset / meta.scale);
        }

        var maxPage = meta.numPages - 1;
        var topPage = Math.floor(scrollTop / meta.pageHeight);
        topPage = Math.min(maxPage, Math.max(0, topPage));

        var botPage = Math.floor((scrollTop + $preview[0].offsetHeight) /
                                 meta.pageHeight);
        botPage = Math.min(maxPage, Math.max(0, botPage));

        if (meta.startPage === topPage &&
            meta.endPage === botPage) {
            return;
        } else {
            var numPages = 1;
            if (topPage === botPage) {
                numPages = 1;
                if (meta.startPage === topPage || meta.endPage === topPage) {
                    // fetch not needed, needed page is already visible
                    return;
                }
            } else {
                numPages = 2;
            }

            if (forRowNum) {
                updateRowNumCol(topPage, numPages, meta);
            } else {
                if (mouseup) {
                    updateRowNumCol(topPage, numPages, meta);
                    // var actualScrollTop = scrollTop;
                    scrollTop /= meta.scale;
                    if (meta.scale > 1) {
                        meta.offset = topPage * meta.pageHeight;
                    } else {
                        meta.offset = 0;
                    }
                }
                if (meta.meta) {
                    previewContent(topPage, numPages, scrollTop);
                } else {
                    showPreviewMode(topPage, numPages, scrollTop);
                }
            }
        }
    }

    function checkIfNeedContent(page, numPages) {
        if (page === previewMeta.startPage &&
            ((page + numPages - 1) <= previewMeta.endPage)) {
            return false;
        } else {
            return true;
        }
    }

    function previewContent(pageNum, numPages, scrollTop, noDetect) {
        var deferred = jQuery.Deferred();
        var newContent = (previewMeta == null);

        $parserCard.removeClass("error");
        if (newContent) {
            $parserCard.addClass("loading");
            var $box = $("#previewModeBox");
            var $delimBox = $("#delimitersBox");
            var $plainTextBox = $("#plainTextBox");
            var format = getFormat();
            if (format === "PLAIN TEXT") {
                $box.addClass("xc-hidden");
                $delimBox.addClass("xc-hidden");
                $plainTextBox.removeClass("xc-hidden");
            } else {
                $box.removeClass("xc-hidden");
                $delimBox.removeClass("xc-hidden");
                $plainTextBox.addClass("xc-hidden");
            }
        } else {
            $parserCard.addClass("fetchingRows");
        }

        var args = curArgs;
        var promise = (newContent && !noDetect)
                      ? detectFormat(args)
                      : PromiseHelper.resolve();
        fetchId++;
        var curFetchId = fetchId;

        promise
        .then(function() {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }

            if (newContent) {
                return beautifier(args.path);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function(meta) {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }

            var offset;
            if (newContent) {
                setPreviewMeta(meta);
                updateTotalNumLines();
                var prom = showPreviewMode(0, 1, 0);
                xcHelper.showRefreshIcon($miniPreview, false, prom);

                offset = 0;
            } else {
                offset = previewMeta.lineLengths[pageNum];
            }
            var numBytes = calculateNumBytes(pageNum, numPages, previewMeta);

            updateRowNumCol(pageNum, numPages, previewMeta, scrollTop);

            var previewArgs = {
                targetName: args.targetName,
                path: previewMeta.parsedPath
            };
            return XcalarPreview(previewArgs, numBytes, offset);
        })
        .then(function(res) {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }
            if (!newContent) {
                previewMeta.startPage = pageNum;
                previewMeta.endPage = pageNum + numPages - 1;
            }

            showContent(res.buffer, numPages, $dataPreview, previewMeta,
                        scrollTop);
            $parserCard.removeClass("loading fetchingRows");

            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId === fetchId) {
                handleError(error);
            } else {
                $parserCard.removeClass("loading fetchingRows");
            }
            deferred.reject();
        });

        return deferred.promise();
    }


    function setPreviewMeta(meta, innerMeta) {
        var format = getFormat();
        if (!innerMeta) {
            previewMeta = meta;
            previewMetaSet[format] = previewMeta;
        }
        var isText = (format === "PLAIN TEXT");
        meta.startPage = 0; // first visible page
        meta.endPage = 0; // last visible page
        meta.numPages = meta.lineLengths.length;
        meta.parsedPath = isText
                          ? curArgs.path
                          : parseNoProtocolPath(meta.tmpPath);
        meta.lineHeight = lineHeight;
        meta.pageHeight = lineHeight * linesPerPage;
        meta.scale = 1; // in case preview height exceeds maximum div height
        meta.offset = 0; // in case preview height exceeds maximum div height

        if (meta.meta && !isText) {
            setPreviewMeta(meta.meta, true);
            meta.meta.lineHeight = boxLineHeight;
            meta.meta.pageHeight = boxLineHeight * linesPerPage;
        }
    }

    // used for scrolling and appending or prepending 1 block
    function fetchRows(meta, newOffset, up) {
        var deferred = jQuery.Deferred();

        if (newOffset >= meta.numChar || newOffset < 0) {
            return PromiseHelper.resolve();
        }

        var curFetchId;
        if (meta.meta) {
            fetchId++;
            curFetchId = fetchId;
        } else {
            boxFetchId++;
            curFetchId = boxFetchId;
        }

        var numBytes;
        var start;
        if (up) {
            numBytes = calculateNumBytes(meta.startPage - 1, 1, meta);
            start = meta.startPage - 1;
        } else {
            numBytes = calculateNumBytes(meta.endPage + 1, 1, meta);
            if (meta.startPage === meta.endPage) {
                start = meta.startPage;
            } else {
                start = meta.startPage + 1;
            }
        }

        if (meta.meta) {
            $parserCard.addClass("fetchingRows");
        } else {
            $miniPreview.addClass("fetchingRows");
        }

        updateRowNumCol(start, 2, meta);

        var args = {
            targetName: curArgs.targetName,
            path: meta.parsedPath
        };
        XcalarPreview(args, numBytes, newOffset)
        .then(function(res) {
            if (meta.meta) {
                if (curFetchId === fetchId) {
                    addContent(res.buffer, $dataPreview, meta, up);
                }
            } else {
                if (curFetchId === boxFetchId) {
                    addContent(res.buffer, $miniPreview, meta, up);
                }
            }
        })
        .fail(function() {
            if (curFetchId === fetchId) {
                if (meta.meta) {
                    $parserCard.removeClass("fetchingRows");
                } else {
                    $miniPreview.removeClass("fetchingRows");
                }
                // handleError or different error handler for scrolling errors
            }
        })
        .always(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    function showPreviewMode(pageNum, numPages, scrollTop) {
        var deferred = jQuery.Deferred();
        var promise = deferred.promise();
        var format = getFormat();
        var $box = $("#previewModeBox");
        var $delimBox = $("#delimitersBox");
        var $plainTextBox = $("#plainTextBox");
        if (!previewMeta || !previewMeta.meta) {
            console.error("error case");
            handlePreviewModeError(ErrTStr.Unknown);
            return PromiseHelper.reject(ErrTStr.Unknown);
        } else if (format === "PLAIN TEXT") {
            $box.addClass("xc-hidden");
            $delimBox.addClass("xc-hidden");
            $plainTextBox.removeClass("xc-hidden");
            return PromiseHelper.resolve();
        }

        $miniPreview.addClass("fetchingRows");
        $box.removeClass("error").removeClass("xc-hidden");
        $delimBox.removeClass("xc-hidden");
        $plainTextBox.addClass("xc-hidden");

        var parsedPath = previewMeta.meta.parsedPath;
        boxFetchId++;
        var curFetchId = boxFetchId;

        var numBytes = calculateNumBytes(pageNum, numPages, previewMeta.meta);
        var newOffset = previewMeta.meta.lineLengths[pageNum];

        updateRowNumCol(pageNum, numPages, previewMeta.meta, scrollTop);

        var args = {
            targetName: curArgs.targetName,
            path: parsedPath
        };
        XcalarPreview(args, numBytes, newOffset)
        .then(function(res) {
            if (curFetchId === boxFetchId) {
                previewMeta.meta.startPage = pageNum;
                previewMeta.meta.endPage = pageNum + numPages - 1;
                showContent(res.buffer, numPages, $miniPreview,
                            previewMeta.meta, scrollTop);
                $miniPreview.removeClass("loading fetchingRows");
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId === boxFetchId) {
                handlePreviewModeError(error);
            }
            deferred.reject(error);
        });
        return promise;
    }

    // after scroll, wipes content and replaces with new content
    function showContent(content, numPages, $preview, meta, scrollTop) {
        if (meta.meta) {
            buffers = [];
        }

        var $page;
        var $splitContent;
        var firstContent = content;
        var secondContent = ""; // in case numPages === 2
        var $content = $preview.find(".content");
        $content.empty();

        if (numPages === 2) {
            var firstPageSize = calculateNumBytes(meta.startPage, 1, meta);
            firstContent = content.substr(0, firstPageSize);
            secondContent = content.substr(firstPageSize);
            if (meta.meta) {
                buffers = [firstContent, secondContent];
            }
        } else if (meta.meta) {
            buffers = [firstContent];
        }

        $page = $(getPageHtml(meta.startPage));

        var pretty = shouldPrettyPrint(meta);
        if (pretty) {
            $splitContent = parseContent(firstContent);
            $page.append($splitContent);
        } else {
            $page.text(firstContent);
        }

        $content.append($page);

        if (secondContent.length) {
            $page = $(getPageHtml(meta.startPage + 1));
            if (pretty) {
                $splitContent = parseContent(secondContent);
                $page.append($splitContent);
            } else {
                $page.text(secondContent);
            }
            $content.append($page);
        }

        setScrollHeight($content, meta);
        adjustSizer($preview, meta);

        var padding;
        if (meta.startPage === 0) {
            padding = 0;
        } else {
            padding = paddingTop;
        }

        if (scrollTop != null) {
            $preview.scrollTop(scrollTop);
        } else {
            var top = (meta.startPage * meta.pageHeight + padding) / meta.scale;
            $preview.scrollTop(top);
        }

        if (meta.meta) {
            updateRowInput();
        }
    }

    function handlePreviewModeError(error) {
        var $box = $("#previewModeBox");
        $box.addClass("error");
        $box.find(".boxBody .content").text(xcHelper.parseError(error));
    }

    function beautifier(url) {
        var deferred = jQuery.Deferred();
        var path = url.split(/^.*:\/\//)[1];
        var format = getFormat();

        // they all point to same backend file
        // so must overwritten when switch the format between the two
        if (format === "XML") {
            previewMetaSet["JSON"] = null;
        } else if (format === "JSON") {
            previewMetaSet["XML"] = null;
        }

        if (previewMetaSet[format] != null) {
            // when has cache
            return PromiseHelper.resolve(previewMetaSet[format]);
        }

        format = format.toLowerCase();
        if (format === "plain text") {
            format = "text";
        }

        var options = {
            "format": format,
            "path": path,
            "user": XcSupport.getUser(),
            "session": WorkbookManager.getActiveWKBK()
        };
        var inputStr = JSON.stringify(options);
        XcalarAppExecute(previewApp, false, inputStr)
        .then(function(ret) {
            var parsedRet = parseAppRes(ret);
            if (parsedRet.error) {
                deferred.reject(parsedRet.error);
            } else {
                deferred.resolve(parsedRet.out);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function parseNoProtocolPath(path) {
        var protocol = FileProtocol.nfs.slice(0, FileProtocol.nfs.length - 1);
        return (protocol + path);
    }

    function parseAppRes(ret) {
        var error = parseAppResHelper(ret.errStr);
        if (error.out) {
            return {"error": error.out};
        }
        var parsed = parseAppResHelper(ret.outStr);
        if (parsed.error) {
            return {"error": parsed.error};
        }
        try {
            // parsed.out is a string, need another parse
            var parsedRet = JSON.parse(parsed.out);
            return {"out": parsedRet};
        } catch (error) {
            return {"error": error.toString()};
        }
    }

    function parseAppResHelper(appRes) {
        try {
            var out = JSON.parse(appRes)[0][0];
            return {"out": out};
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    }

    function updateTotalNumLines() {
        var inputWidth = 50;
        var numDigits = ("" + previewMeta.totalLines).length;
        inputWidth = Math.max(inputWidth, 20 + (numDigits * 9));

        $("#parserRowInput").outerWidth(inputWidth);
        var numLines = xcHelper.numToStr(previewMeta.totalLines);
        $parserCard.find(".totalRows").text("of " + numLines);
    }

    function updateRowNumCol(pageNum, numPages, meta, scrollTop) {
        var rowColHtml = "";
        var start = pageNum * linesPerPage + 1;
        var end = (pageNum + numPages) * linesPerPage + 1;
        end = Math.min(meta.totalLines + 1, end);
        for (var i = start; i < end; i++) {
            rowColHtml += i + "\n";
        }
        rowColHtml = rowColHtml.slice(0, -1);

        var $rowNumCol;
        if (meta.meta) {
            $rowNumCol = $parserCard.find(".previewRowNumCol");
        } else {
            $rowNumCol = $parserCard.find(".metaRowNumCol");
        }

        $rowNumCol.find(".rowNums").html(rowColHtml);
        var width = $rowNumCol.outerWidth();
        if (meta.meta) {
            $dataPreview.css("margin-left", width);
        } else {
            $miniPreview.css("margin-left", width);
        }
        var sizerHeight = pageNum * meta.pageHeight;

        if (isMouseDown) {
            sizerHeight /= meta.scale;
        } else {
            sizerHeight = (meta.offset / meta.scale) +
                          (sizerHeight - meta.offset);
        }

        $rowNumCol.find(".rowSizer").height(sizerHeight);

        if (scrollTop != null) {
            $rowNumCol.scrollTop(scrollTop);
        }
    }

    function getSelectionCharOffsetsWithin(element) {
        var start = 0;
        // var end = 0;
        var sel;
        var range;
        var priorRange;
        var res;

        if (typeof window.getSelection !== "undefined") {
            sel = window.getSelection();
            range = sel.getRangeAt(0);
            priorRange = range.cloneRange();
            priorRange.selectNodeContents(element);
            priorRange.setEnd(range.startContainer, range.startOffset);
            start = priorRange.toString().length;
            // end = start + range.toString().length;
        } else if (typeof document.selection !== "undefined" &&
                    document.selection.type !== "Control") {
            sel = document.selection;
            range = sel.createRange();
            priorRange = document.body.createTextRange();
            priorRange.moveToElementText(element);
            priorRange.setEndPoint("EndToStart", range);
            start = priorRange.text.length;
            // end = start + range.text.length;
        }

        // XXX need to be tested in IE
        res = getRightSelection(start);
        if (res != null && res.start > -1) {
            createSelection(res.start, res.end, element);
            // find the line number of the selection
            res.line = getLineNumOfSelection(sel, element);
            return res;
        } else {
            return null;
        }
    }

    function createSelection(start, end, element) {

        var nodes = getTextNodes(element);
        var range = document.createRange();

        var startNode = 0;
        var curLen = 0;
        var startIndex;
        var endIndex;
        var endNode;
        for (var i = 0; i < nodes.length; i++) {
            var len = nodes[i].length;
            if (curLen + len >= start) {
                startNode = i;
                startIndex = (start - curLen);
                break;
            }
            curLen += len;
        }

        for (var i = startNode; i < nodes.length; i++) {
            var len = nodes[i].length;
            if (curLen + len >= end) {
                endNode = i;
                endIndex = (end - curLen);
                break;
            }
            curLen += len;
        }
        range.setStart(nodes[startNode], startIndex);
        range.setEnd(nodes[endNode], endIndex);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function getLineNumOfSelection(sel, element) {
        // var sel = window.getSelection();
        var line;
        var parentEl = sel.getRangeAt(0).commonAncestorContainer;
        if (parentEl.nodeType !== 1) {
            var $el = $(parentEl.parentNode);
            if ($el.closest(".line").length) {
                line = $el.index();
                var page = $el.closest(".page").data("page");
                line = line + (page * linesPerPage);
            }
        }
        if (line == null) {
            var el = sel.getRangeAt(0);
            var coors = el.getBoundingClientRect();
            var parentCoors = element.getBoundingClientRect();
            line = Math.floor((coors.top - parentCoors.top) / lineHeight);
            line = line + (previewMeta.startPage * linesPerPage);
        }
        return line;
    }

    function getTextNodes(node) {
        var textNodes = [];
        if (node.nodeType === 3) {
            textNodes.push(node);
        } else {
            var children = node.childNodes;
            for (var i = 0, len = children.length; i < len; ++i) {
                textNodes.push.apply(textNodes, getTextNodes(children[i]));
            }
        }
        return textNodes;
    }

    function getRightSelection(start) {
        var format = getFormat();
        if (format === "XML") {
            return findXMLOpenTag(start);
        } else if (format === "JSON") {
            return findJSONOpenTag(start);
        } else {
            return null;
        }
    }

    function findXMLOpenTag(start) {
        var s = start;
        var len = getBufferedCharLength();

        while (s >= 0 && getCharAt(s) !== "<") {
            s--;
        }
        // start from the open < and find the matched >
        var e = s;
        while (e < len - 1 && getCharAt(e) !== ">") {
            e++;
        }

        var end = e + 1;
        return {
            "start": s,
            "end": end,
            "tag": getSubStr(s, end)
        };
    }

    function findJSONOpenTag(start) {
        var s = start;
        var cnt = 0;
        var ch = getCharAt(s);

        if (ch !== "[") {
            while (s >= 0) {
                ch = getCharAt(s);
                if (ch === "{") {
                    if (cnt === 0) {
                        break;
                    } else {
                        cnt--;
                    }
                } else if (ch === "}" && s !== start) {
                    cnt++;
                }

                s--;
            }
        }

        // check if it's a valid tag
        var tag = null;
        if (cnt === 0 && (ch === "{" || ch === "[")) {
            tag = getSubStr(s, s + 1);
        }

        return {
            "start": s,
            "end": s + 1,
            "tag": tag
        };
    }

    function populateKey(tag, type, start, bufferOffset, line, totalOffset) {
        var keyOffset = bufferOffset + totalOffset;
        for (var i = 0, len = keys.length; i < len; i++) {
            if (keys[i].offset === keyOffset && keys[i].type === type) {
                // when key alreay exists
                var $li = $("#delimitersBox").find("li").eq(i);
                focusKey($li, true);
                // XXX the delay not work, will debug later...
                xcTooltip.transient($li, {
                    "title": TooltipTStr.KeyExists
                }, 1000);
                return;
            }
        }

        // offset start with 1, cursor start with 0
        var displayKey = (getFormat() === "JSON")
                         ? getJSONPath(bufferOffset - 1)
                         : tag;
        keys.push({
            "key": tag,
            "type": type,
            "offset": keyOffset,
            "line": line,
            "start": start + totalOffset
        });
        addKeyItem(displayKey, type);
    }

    function getJSONPath(cursor) {
        var isChildOfArray = (getCharAt(cursor) === "[");
        var isFirstLevelChild = false;
        var p = cursor - 1;
        var ch;
        var jsonPath;

        // detect it's child of array or not
        while (p >= 0) {
            ch = getCharAt(p);
            if (ch === ":") {
                isChildOfArray = false;
                break;
            } else if (ch === "[" || ch === ",") {
                isChildOfArray = true;
                break;
            }
            p--;
            // other case will be the empty space
        }

        if (isChildOfArray) {
            var eleCnt = 0;
            var bracketCnt = 0;

            while (p >= 0) {
                ch = getCharAt(p);
                if (ch === "[" && bracketCnt === 0) {
                    break;
                } else if (ch === "," && bracketCnt === 0) {
                    eleCnt++;
                } else if (ch === "}") {
                    bracketCnt++;
                } else if (ch === "{") {
                    bracketCnt--;
                }
                p--;
            }

            if (previewMeta.startPage === 0 && p === 0 &&
                ch === "[" && bracketCnt === 0)
            {
                isFirstLevelChild = true;
            } else {
                // find the first colon before [
                while (p >= 0 && getCharAt(p) !== ":") {
                    p--;
                }
            }
        }
        if (isFirstLevelChild) {
            jsonPath = "...[" + eleCnt + "]";
        } else if (getCharAt(p) !== ":") {
            console.warn("cannot parse due to lack of data");
            jsonPath = "..." + getCharAt(cursor);
        } else {
            jsonPath = retrieveJSONKey(p - 1);
            if (isChildOfArray) {
                jsonPath += "[" + eleCnt + "]";
            }
        }

        return jsonPath;
    }

    function retrieveJSONKey(cursor) {
        var ch;
        var start = null;
        var end = null;

        while (cursor >= 0) {
            ch = getCharAt(cursor);
            if (ch === "\"") {
                if (cursor === 0 || getCharAt(cursor - 1) !== "\\") {
                    if (end == null) {
                        end = cursor;
                    } else {
                        start = cursor;
                        break;
                    }
                }
            }
            cursor--;
        }
        return getSubStr(start + 1, end);
    }

    function addKeyItem(displayKey, type) {
        var tag = xcHelper.escapeHTMLSpecialChar(displayKey);
        var li =
                '<li class="key">' +
                    '<div class="item">' +
                        '<span class="tag tooltipOverflow' +
                        ' textOverflowOneLine">' +
                            tag +
                        '</span>' +
                        '<span class="type">' +
                            type +
                        '</span>' +
                    '</div>' +
                    '<i class="remove icon xi-trash xc-action fa-15"></i>' +
                '</li>';
        var $li = $(li);
        // use this becuase tag may have <>, add
        // to html directly will not work
        xcTooltip.add($li.find(".tag"), {
            "title": tag
        });
        $("#delimitersBox").find(".boxBody ul").append($li);
        if (gMinModeOn) {
            focusKey($li, true);
        } else {
            $li.hide().slideDown(100, function() {
                focusKey($li, true);
            });
        }
    }

    function focusKey($li, scrollToView) {
        $li.addClass("active")
        .siblings().removeClass("active");

        if (scrollToView) {
            $("#delimitersBox").mousedown(); // triggers bring to front
            xcHelper.scrollIntoView($li, $li.closest(".boxBody"));
        }
    }

    function findKey($li) {
        var index = $li.index();
        key = keys[index];
        submitRowInput(key.line + 1, true)
        .then(function() {
            var start = key.start - previewMeta.lineLengths[previewMeta.startPage];
            var end = key.offset - previewMeta.lineLengths[previewMeta.startPage];
            createSelection(start, end, $previewContent[0]);
        });
    }

    function removeKey($li) {
        var $box = $("#delimitersBox");
        var index = $li.index();

        if (gMinModeOn) {
            $li.remove();
            keys.splice(index, 1);
        } else {
            $box.addClass("disabled");
            $li.slideUp(100, function() {
                $li.remove();
                keys.splice(index, 1);
                $box.removeClass("disabled");
            });
        }
    }

    function getBufferedCharLength() {
        // XXX later may change the implementation
        var charLen = 0;
        for (var i = 0; i < buffers.length; i++) {
            charLen += buffers[i].length;
        }
        return charLen;
    }

    function getCharAt(pos) {
        // XXX later may change the implementation
        var firstBuffLen = buffers[0].length;
        if (pos < firstBuffLen) {
            return buffers[0][pos];
        } else {
            return buffers[1][pos - firstBuffLen];
        }
    }

    function getSubStr(start, end) {
        var firstBuffLen = buffers[0].length;
        if (end < firstBuffLen) {
            return buffers[0].substring(start, end);
        } else if (start >= firstBuffLen) {
            return buffers[1].substring(start - firstBuffLen,
                                        end - firstBuffLen);
        } else {
            // between 2 buffers
            var part1 = buffers[0].substring(start);
            var part2 = buffers[1].substring(0, end - firstBuffLen);
            return part1 + part2;
        }
    }

    function calculateNumBytes(page, numPages, meta) {
        var lineLengths = meta.lineLengths;
        var numBytes  = 0;

        for (var i = 0; i < numPages; i++) {
            if (page + 1 >= lineLengths.length) {
                numBytes += (meta.numChar - lineLengths[page]);
                break;
            } else {
                numBytes += (lineLengths[page + 1] - lineLengths[page]);
                page++;
            }
        }
        return numBytes;
    }

    function handleError(error) {
        $parserCard.removeClass("loading fetchingRows").addClass("error");
        error = xcHelper.parseError(error);
        $parserCard.find(".errorSection.error").text(error);
    }

    function detectFormat(args) {
        var deferred = jQuery.Deferred();
        var numBytes = 500;
        XcalarPreview(args, numBytes, 0)
        .then(function(res) {
            var content = res.buffer.trim();
            var $li;

            if (isXML(content)) {
                $li = $formatList.find('li[name="xml"]');
            } else if (isJSON(content)) {
                $li = $formatList.find('li[name="json"]');
            } else {
                $li = $formatList.find('li[name="text"]');
            }
            changeFormat($li);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getFormat() {
        return $formatList.find("input").val();
    }

    function isXML(str) {
        if (!str.startsWith("<")) {
            return false;
        }

        var xmlMatch = str.match(/<|>/g);
        var jsonMatch = str.match(/\{|\}/g);

        if (jsonMatch == null) {
            return true;
        } else if (xmlMatch.length > jsonMatch.length) {
            return true;
        } else {
            return false;
        }
    }

    function isJSON(str) {
        if (str.startsWith("[") || str.startsWith("{")) {
            if (/{(.|[\r\n])+:(.|[\r\n])+}?,?/.test(str)) {
                return true;
            }
        }

        return false;
    }

    function submitForm() {
        if (!validateSubmit()) {
            return PromiseHelper.reject("invalid submit");
        } else if (getFormat() === "PLAIN TEXT") {
            var $lineText = $("#plainTextBox input");
            var lineDelim = xcHelper.delimiterTranslate($lineText);
            DSPreview.backFromParser(curArgs.path, {
                "delimiter": lineDelim
            });
            cleanupCard();
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var promise = deferred.promise();
        var udfName;

        alertHelper()
        .then(function() {
            $parserCard.addClass("submitting");
            xcHelper.showRefreshIcon($dataPreview, false, promise);
            return parseHelper();
        })
        .then(function(udfStr) {
            var d = new Date();
            udfName = xcHelper.getTempUDFPrefix() + "_vp_" +
                      d.getDate() + "_" + (d.getMonth() + 1) + "_" +
                      d.getFullYear() + "_" + d.getHours() + "_" +
                      d.getMinutes() + "_" + d.getSeconds();
            return XcalarUploadPython(udfName, udfStr);
        })
        .then(function() {
            return PromiseHelper.alwaysResolve(UDF.refresh());
        })
        .then(function() {
            DSPreview.backFromParser(curArgs.path, {
                "moduleName": udfName
            });
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error !== cancelError) {
                Alert.error(DSParserTStr.Fail, error.error);
            }
            if (udfName != null) {
                // has update the udf
                XcalarDeletePython(udfName);
            }

            deferred.reject(error);
        })
        .always(function() {
            $parserCard.removeClass("submitting");
            cleanupCard();
        });

        return promise;
    }

    function setScrollHeight($content, meta) {
        var numRows = meta.totalLines;
        var scrollHeight = Math.max((meta.lineHeight * numRows) +
                                    (paddingTop + paddingBottom),
                                    $content.height());
        var scale = 1;
        if (scrollHeight > gMaxDivHeight) {
            scale = scrollHeight / gMaxDivHeight;
            scrollHeight = gMaxDivHeight;
        }
        meta.scale = scale;

        $content.parent().height(scrollHeight);
        if (meta.meta) {
            $parserCard.find(".previewRowNumCol .rowContainer").height(scrollHeight);
        } else {
            $parserCard.find(".metaRowNumCol .rowContainer").height(scrollHeight);
        }
    }

    function getPageHtml(pageNum) {
        return '<span class="page" data-page="' + pageNum + '"></span>';
    }

    // called after scroll, appends or prepends and removes 1 block if needed
    function addContent(content, $preview, meta, up) {
        var pageNum;
        if (up) {
            meta.startPage--;
            pageNum = meta.startPage;
            if (meta.meta) {
                buffers.unshift(content);
            }
        } else {
            meta.endPage++;
            pageNum = meta.endPage;
            if (meta.meta) {
                buffers.push(content);
            }
        }
        var $content = $preview.find(".content");
        var cachedScrollTop = $preview.scrollTop();
        var $page = $(getPageHtml(pageNum));
        var pretty = shouldPrettyPrint(meta);

        if (pretty) {
            var $splitContent = parseContent(content);
            $page.append($splitContent);
        } else {
            $page.text(content);
        }

        if (up) {
            $content.prepend($page);
        } else {
            $content.append($page);
        }
        // no more than 2 pages visible at a time
        if (meta.endPage - meta.startPage > 1) {
            if (up) {
                $content.find(".page").last().remove();
                meta.endPage--;
                if (meta.meta) {
                    buffers.pop();
                }
            } else {
                $content.find(".page").eq(0).remove();
                meta.startPage++;
                if (meta.meta) {
                    buffers.shift();
                }
            }
        }

        adjustSizer($preview, meta, true);

        var curScrollTop = $preview.scrollTop();
        if (curScrollTop !== cachedScrollTop) {
            $preview.scrollTop(cachedScrollTop);
        }
        if (meta.meta) {
            $parserCard.removeClass("fetchingRows");
        } else {
            $preview.removeClass("fetchingRows");
        }
    }

    function parseContent(content) {
        content = xcHelper.escapeHTMLSpecialChar(content);
        var lines = content.split("\n");
        var $line;
        var $lines = $();
        var line;
        var ch;
        var specialChars = ["{", "}", "[", "]", ","];
        var linesLen = lines.length;
        // ignore the last element because if it's an empty string
        if (linesLen === 0 || lines[linesLen - 1].trim().length === 0) {
            linesLen--;
        }

        for (var i = 0; i < linesLen; i++) {
            line = lines[i];
            var inQuotes = false;
            var isEscaped = false;
            var html = "";
            var isObj = false;
            var valFound = false;
            var nonStrVal = false;
            var lineLen = line.length;
            for (var j = 0; j < lineLen; j++) {
                ch = line[j];
                if (isEscaped) {
                    html += ch;
                    isEscaped = false;
                    continue;
                }

                if (ch === "\\") {
                    isEscaped = true;
                    html += ch;
                } else if (ch === " ") {
                    html += ch;
                } else if (ch === '"') {
                    if (!inQuotes) {
                        inQuotes = true;
                        valFound = true;
                        if (isObj) {
                            html += ch + '<span class="quotes objValue">';
                        } else {
                            html += ch + '<span class="quotes">';
                        }
                    } else {
                        inQuotes = false;
                        html += '</span>' + ch;
                    }
                } else {
                    if (inQuotes) {
                        html += ch;
                    } else {
                        if (ch === ":") {
                            isObj = true;
                            html += ch;
                        } else {
                            if (nonStrVal) {
                                if (ch === ",") {
                                    html += '</span>' + ch;
                                    nonStrVal = false;
                                } else if (j === lineLen - 1) {
                                    html += ch + '</span>';
                                } else {
                                    html += ch;
                                }
                            } else {
                                if (specialChars.indexOf(ch) === -1) {
                                    html += '<span class="other">';
                                    nonStrVal = true;
                                    valFound = true;
                                }
                                html += ch;
                            }
                        }
                    }
                }
            }
            if (!isObj && valFound) {
                $line = $('<span class="line array"></span>');
            } else {
                $line = $('<span class="line"></span>');
            }
            $line.append(html + "\n");
            $lines = $lines.add($line);
        }
        return $lines;
    }

    function adjustSizer($preview, meta, keepScale) {
        var sizerHeight = meta.startPage * meta.pageHeight;
        // var cached = sizerHeight;
        if (keepScale) {
            sizerHeight = (meta.offset / meta.scale) +
                          (sizerHeight - meta.offset);
        } else {
            sizerHeight /= meta.scale;
        }

        $preview.find(".sizer").height(sizerHeight);
    }

    function validateSubmit() {
        var isValid;
        if (getFormat() === "PLAIN TEXT") {
            var $lineText = $("#plainTextBox input");
            var lineDelim = xcHelper.delimiterTranslate($lineText);

            isValid = xcHelper.validate([
                {
                    "$ele": $lineText,
                    "error": DSFormTStr.InvalidDelim,
                    "formMode": true,
                    "check": function() {
                        return (typeof lineDelim === "object");
                    }
                }
            ]);
        } else {
            isValid = xcHelper.validate([
                {
                    "$ele": $("#delimitersBox"),
                    "error": DSParserTStr.NoKey,
                    "side": "left",
                    "check": function() {
                        return (keys.length === 0);
                    }
                }
            ]);
        }

        return isValid;
    }

    function alertHelper() {
        var deferred = jQuery.Deferred();
        Alert.show({
            "title": DSParserTStr.Submit,
            "msg": DSParserTStr.SubmitMsg,
            "onConfirm": function() { deferred.resolve(); },
            "onCancel": function() { deferred.reject({"error": cancelError}); }
        });
        return deferred.promise();
    }

    function parseHelper() {
        var deferred = jQuery.Deferred();
        var format = getFormat();
        var app;

        if (format === "XML") {
            app = xmlApp;
        } else if (format === "JSON") {
            app = jsonApp;
        } else {
            return PromiseHelper.reject({"error": DSParserTStr.NotSupport});
        }

        var keysModified = [];
        for (var i = 0; i < keys.length; i++) {
            keysModified.push({
                key: keys[i].key,
                offset: keys[i].offset,
                type: keys[i].type
                // omitting keys[i].line from being sent
            });
        }

        var options = {
            "prettyPath": previewMeta.tmpPath,
            "keys": keysModified
        };
        var inputStr = JSON.stringify(options);

        XcalarAppExecute(app, false, inputStr)
        .then(function(ret) {
            var parsedRet = parseAppRes(ret);
            if (parsedRet.error) {
                deferred.reject({"error": parsedRet.error});
            } else {
                deferred.resolve(parsedRet.out.udf);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function closeCard() {
        DSForm.switchView(DSForm.View.Preview);
        resetView();
        cleanupCard();
    }

    function resetRowInput() {
        $parserCard.find(".totalRows").text("");
        $("#parserRowInput").val(0).data("val", 0);
    }

    function updateRowInput() {
        var lineNum = getScrollLineNum();
        $("#parserRowInput").val(lineNum).data("val", lineNum);
    }

    function getScrollLineNum() {
        var scale;
        // var base;
        var offset;
        if (!previewMeta) {
            scale = 1;
            offset = 0;
        } else {
            scale = previewMeta.scale;
            offset = previewMeta.offset;
        }
        var scrollTop = $dataPreview.scrollTop();
        if (isMouseDown) {
            scrollTop *= scale;
        } else {
            scrollTop += offset - (offset / scale);
        }
        var lineNum = Math.floor((scrollTop - paddingTop) / lineHeight) + 1;
        return Math.max(1, lineNum);
    }

    function shouldPrettyPrint(meta) {
        var format = getFormat();
        if (meta && meta.meta && format === "JSON") {
            return true;
        } else {
            return false;
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSParser.__testOnly__ = {};
        DSParser.__testOnly__.setBuffers = function(newBuffers) {
            buffers = newBuffers;
        };

        DSParser.__testOnly__.getBuffers = function() {
            return buffers;
        };

        DSParser.__testOnly__.setMeta = function(meta) {
            previewMeta = meta;
        };
        DSParser.__testOnly__.getMeta = function() {
            return previewMeta;
        };
        DSParser.__testOnly__.resetView = resetView;
        DSParser.__testOnly__.beautifier = beautifier;
        DSParser.__testOnly__.parseNoProtocolPath = parseNoProtocolPath;
        DSParser.__testOnly__.parseAppResHelper = parseAppResHelper;
        DSParser.__testOnly__.parseAppRes = parseAppRes;
        DSParser.__testOnly__.detectFormat = detectFormat;
        DSParser.__testOnly__.getFormat = getFormat;
        DSParser.__testOnly__.getRightSelection = getRightSelection;
        DSParser.__testOnly__.showPreviewMode = showPreviewMode;
        DSParser.__testOnly__.getJSONPath = getJSONPath;
        DSParser.__testOnly__.submitForm = submitForm;
        DSParser.__testOnly__.fetchRows = fetchRows;
        DSParser.__testOnly__.addContent = addContent;
        DSParser.__testOnly__.handleError = handleError;
    }
    /* End Of Unit Test Only */

    return (DSParser);
}(jQuery, {}));
