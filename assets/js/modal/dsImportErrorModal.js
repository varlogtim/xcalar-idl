window.DSImportErrorModal = (function(DSImportErrorModal, $) {
    var $modal;     // $("#dsImportErrorModal")
    var modalHelper;
    var modalId;
    var scrollMeta = {};
    var $recordList;
    var $fileList;
    var numRecordsToFetch = 10;
    var numRecordsToShow = 20;
    var rowHeight = 44;
    var curResultSetId;
    var dsName;
    var modalOpen = false;
    var files = {};
    var activePath = null;
    var hasRecordErrors = false;

    DSImportErrorModal.setup = function() {
        $modal = $("#dsImportErrorModal");
        $recordList = $modal.find(".recordMessageList");
        $fileList = $modal.find(".errorFileList");
        modalHelper = new ModalHelper($modal, {
            afterResize: function() {
                setSizerHeight();
                alignScrollBarWithList();
            }
        });

        setupScrollBar();

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
            setSizerHeight();
            alignScrollBarWithList();
        });

        $modal.on("click", ".errorFileList .row", function() {
            var $row = $(this);
            if ($row.hasClass("active")) {
                return;
            }
            $modal.find(".errorFileList .row").removeClass("active");
            $row.addClass("active");
            var path = $(this).data("path");
            activePath = path;
            var file = files[path];

            $modal.find(".recordErrorSection, .fileErrorSection").addClass("xc-hidden");
            var html = "";
            if (file.type === "record") {
                for (var i = 0; i < file.errors.length; i++) {
                    html += '<div class="row collapsed row' + i + '">' +
                                '<div class="recordNum">' +
                                    '<i class="icon xi-arrow-down arrow"></i>' +
                                    '<span class="num">' + file.errors[i].recordNumber + '</span>' +
                                '</div>' +
                                '<div class="errorMsg">' + file.errors[i].error + '</div>' +
                            '</div>';
                }
                $recordList.html(html);
                $modal.find(".recordErrorSection").removeClass("xc-hidden");
            } else {
                $modal.find(".fileErrorSection").removeClass("xc-hidden").html(file.msg);
            }
        });
    };

    DSImportErrorModal.show = function(dsName, numErrors, isRecordError) {
        if (modalId) { // already open
            return;
        }

        modalOpen = true;
        curResultSetId = null;
        modalHelper.setup();
        modalId = Date.now();
        hasRecordErrors = isRecordError;
        if (numErrors) {
            $modal.find(".infoTotalErrors").find(".value").text(xcHelper.numToStr(numErrors));
        }

        XcalarMakeResultSetFromDataset(dsName, true)
        .then(function (result) {
            curResultSetId = result.resultSetId;
            $modal.find(".infoTotalFiles").find(".value").text(result.numEntries);
            var numTotalErrors;
            var numRowsToFetch = Math.min(result.numEntries, numRecordsToShow);

            refreshScrollBar(result.numEntries, numRowsToFetch);

            fetchRows(0, numRowsToFetch, "bottom", {bulk: true})
            .then(function(ret) {
                if (!numErrors) {
                    var numTotalErrors = 0;
                    for (var i = 0; i < ret.length; i++) {
                        numTotalErrors += ret[i].errors.length;
                    }
                    numTotalErrors = xcHelper.numToStr(numTotalErrors);
                    if (result.numEntries > numRecordsToShow) {
                        numTotalErrors += "+";
                    }

                    $modal.find(".infoTotalErrors").find(".value").text(numTotalErrors);
                }

                $modal.find(".errorFileList .row").eq(0).removeClass("active").click();
            });
        });
    };

    function closeModal() {
        $fileList.empty();
        $recordList.empty();
        $recordList.removeClass("scrolling");
        $fileList.removeClass("scrolling");
        scrollMeta = {};
        $modal.find(".fileListSection").find(".scrollBar").scrollTop(0);
        activePath = null;

        modalHelper.clear();
        if (curResultSetId) {
            XcalarSetFree(curResultSetId);
        }
        files = {};
        curResultSetId = null;
        modalId = null;

    }

    function refreshScrollBar(numRecords, curRowNumber) {
        scrollMeta = {
            base: 0,
            isListScrolling: false,
            isBarScrolling: false,
            currentRowNumber: curRowNumber
        };

        scrollMeta.numRecords = numRecords;
        scrollMeta.numVisibleRows = Math.min(scrollMeta.numRecords, numRecordsToShow);
        setSizerHeight();
    }

    function setupScrollBar() {
        var isMouseDown = false;
        var $scrollBar = $modal.find(".fileListSection").find(".scrollBar");
        $scrollBar.width(gScrollbarWidth + 1);

        $scrollBar.scroll(function() {
            if (isMouseDown) {
                return;
            }
            if (scrollMeta.isListScrolling) {
                scrollMeta.isListScrolling = false;
            } else {
                scrollMeta.isBarScrolling = true;
                var top = $scrollBar.scrollTop() + scrollMeta.base;
                var numRowsAbove = scrollMeta.currentRowNumber - scrollMeta.numVisibleRows;
                var rowsAboveHeight = getRowsAboveHeight(numRowsAbove);
                top -= rowsAboveHeight;
                $fileList.scrollTop(top);
            }
        });

        $scrollBar.on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            isMouseDown = true;
            $(document).on("mouseup.tableScrollBar", function() {
                isMouseDown = false;
                $(document).off("mouseup.tableScrollBar");

                if ($fileList.hasClass("scrolling")) {
                    return;
                }

                var top = $scrollBar.scrollTop() * scrollMeta.scale;

                // if scrollbar is all the way at the bottom
                if (scrollMeta.scale > 1 && ($scrollBar[0].scrollHeight -
                    $scrollBar.scrollTop() - $scrollBar.outerHeight() <= 1)) {
                    top += $scrollBar.outerHeight() * scrollMeta.scale;
                }

                var rowNum = Math.ceil(top / rowHeight);
                var origRowNum = Math.min(scrollMeta.numRecords - 1,
                                        Math.floor(rowNum));
                rowNum = Math.min(origRowNum,
                            scrollMeta.numRecords - scrollMeta.numVisibleRows);

                var info = {
                    bulk: true,
                    // targetRow: targetRow
                };
                $scrollBar.addClass("bulkFetch");
                goTo(rowNum, scrollMeta.numVisibleRows, "bottom", info)
                .then(function() {
                    positionScrollBar(origRowNum);
                    $scrollBar.removeClass("bulkFetch");
                });
                scrollMeta.base = top - (top / scrollMeta.scale);
            });
        });

        $fileList.scroll(function() {
            var scrollTop = $fileList.scrollTop();
            if (scrollMeta.isBarScrolling) {
                scrollMeta.isBarScrolling = false;
            } else {
                scrollMeta.isListScrolling = true;
                alignScrollBarWithList();
            }
            var info;
            if ($fileList.hasClass("scrolling")) {
                return;
            } else if (scrollTop === 0) {
                var topRow = scrollMeta.currentRowNumber -
                             scrollMeta.numVisibleRows;
                if (topRow > 0) {
                    var numRowsToAdd = Math.min(numRecordsToFetch, topRow,
                                                scrollMeta.numRecords);
                    var rowNumber = topRow - numRowsToAdd;
                    info = {
                    };

                    goTo(rowNumber, numRowsToAdd, "top", info);
                }
            } else if (isScrollBarAtBottom()) {
                if (scrollMeta.currentRowNumber < scrollMeta.numRecords) {
                    numRowsToAdd = Math.min(numRecordsToFetch,
                        scrollMeta.numRecords - scrollMeta.currentRowNumber);
                    info  = {
                        targetRow: scrollMeta.currentRowNumber + numRowsToAdd,
                        lastRowToDisplay: scrollMeta.currentRowNumber + numRowsToAdd,
                        // currentFirstRow:
                    }
                    goTo(scrollMeta.currentRowNumber, numRowsToAdd, "bottom", info);
                }
            }
        });

        function isScrollBarAtBottom() {
            return ($fileList[0].scrollHeight - $fileList.scrollTop() -
                       $fileList.outerHeight() <= 1);
        }
    }

    function goTo(startIndex, numRowsToAdd, direction, info) {
        var deferred = jQuery.Deferred();
        $fileList.addClass("scrolling");
        if (info.bulk) {
            scrollMeta.currentRowNumber = startIndex + numRowsToAdd;
            $fileList.find(".row").addClass("toRemove");
        } else {
            if (direction === "bottom") {
                scrollMeta.currentRowNumber += numRowsToAdd;
            } else {
                scrollMeta.currentRowNumber -= numRowsToAdd;
            }

            addTempRows(startIndex, numRowsToAdd, direction);
            removeRows(info, numRowsToAdd, direction);

        }

        var curId = modalId;
        fetchRows(startIndex, numRowsToAdd, direction, info)
        .then(function() {
            if (!modalId || curId !== modalId) {
                return;
            }
            if (info.bulk) {
                $fileList.find(".toRemove").remove();
                info.targetRow;

            } else {

            }
        })
        .fail(function() {
            if (!modalId || curId !== modalId) {
                return;
            }
            $fileList.find(".toRemove").removeClass("toRemove");
        })
        .always(function() {
            if (!modalId || curId !== modalId) {
                return;
            }
            var scrollTop = $fileList.scrollTop();
            if (scrollTop < 2) {
                // leave some space for scrolling up
                scrollTop = 2;
                $fileList.scrollTop(scrollTop);
            } else if ($fileList[0].scrollHeight - scrollTop - $fileList.outerHeight() <= 1) {
                // leave some space for scrolling down
                scrollTop -= 2;
                $fileList.scrollTop(scrollTop);
            }

            if (!info.bulk) {
                var onlyIfUnequal = true;
                alignScrollBarWithList(onlyIfUnequal);
            }

            $fileList.removeClass("scrolling");
            deferred.resolve();
        });

        return deferred.promise();
    }

    function fetchRows(startIndex, numRowsToAdd, direction, info) {


        var deferred = jQuery.Deferred();
        var curId = modalId;

        XcalarFetchData(curResultSetId, startIndex, numRowsToAdd,
                        scrollMeta.numRecords, [], 0, 0)
        .then(function(msgs) {
            var html = "";
            var fileInfos = [];
            for (var row = 0; row < msgs.length; row++) {
                var fileInfo = JSON.parse(msgs[row]);
                fileInfos.push(fileInfo);
                fileInfo.type = "record";
                files[fileInfo.fullPath] = fileInfo;
                var rowNum = row + startIndex;
                html += getFileRowHtml(fileInfo, rowNum);
            }

            if (direction === "bottom") {
                if (!modalId || modalId !== curId) {
                    return;
                }
                if (info.bulk) {
                    $fileList.prepend(html);
                } else {
                    $fileList.append(html);
                    $fileList.find(".tempRow").remove();
                }
            } else {
                $fileList.prepend(html);
                $fileList.find(".tempRow").remove();
            }
            deferred.resolve(fileInfos);
        })
        .fail(function() {
            // XXX implement
        });

        return deferred.promise();
    }

    function getFileRowHtml(fileInfo, rowNum) {
        var activeClass = "";
        if (activePath && fileInfo.fullPath === activePath) {
            activeClass += " active";
        }
        var type;
        var tooltip;
        if (hasRecordErrors) {
            type = "record";
            tooltip = DSTStr.RecordError;
        } else {
            type = "file";
            tooltip = DSTStr.FileError;
        }
        var html = '<div class="row type-' + type +
            ' row' + rowNum + activeClass +
            '" data-path="' + fileInfo.fullPath + '">' +
            '<i class="icon xi-error"'  + xcTooltip.Attrs +
            ' data-original-title="' + tooltip + '"></i>' +
            '<span class="filePath" data-toggle="tooltip" ' +
                'data-placement="top" data-container="body" ' +
                'data-original-title="' + fileInfo.fullPath + '">' +
                '<span class="hiddenChar">a</span>' +
                fileInfo.fullPath +
            '</span>' +
          '</div>';
        return html;
    }

    function getRecordRowHtml(rowNum, msg) {
        html = '<div class="row collapsed row' + rowNum + '">' +
                '<div class="recordNum">' +
                    '<i class="icon xi-arrow-down arrow"></i>' +
                    '<span class="num">' + rowNum + '</span>' +
                '</div>' +
                '<div class="errorMsg">' + msg + '</div>' +
            '</div>';
        return html;
    }


    function addTempRows(startIndex, numRowsToAdd, direction) {
        var html = "";
        for (var row = 0; row < numRowsToAdd; row++) {
            var rowNum = row + startIndex;
            html += '<div class="row collapsed tempRow row' + rowNum + '">' +
                    '</div>';
        }
        if (direction === "bottom") {
            $fileList.append(html);
        } else {
            $fileList.prepend(html);
            var heightAdded = numRowsToAdd * rowHeight;
            $fileList.scrollTop(heightAdded);
        }
    }

    function removeRows(info, numRowsToRemove, direction) {
        if (direction === "bottom") {
            $fileList.find(".row").slice(0, numRowsToRemove).remove();
        } else {
            $fileList.find(".row").slice(numRecordsToShow).remove();
        }
    }

    function setSizerHeight() {
        var sizerHeight = getSizerHeight();
        var scale = 1;
        if (sizerHeight > gMaxDivHeight) {
            scale = sizerHeight / gMaxDivHeight;
            sizerHeight = gMaxDivHeight;
        }
        scrollMeta.scale = scale;
        $modal.find(".fileListSection").find(".sizer").height(sizerHeight);
    };

    function getSizerHeight() {
        var sizerHeight = scrollMeta.numRecords * rowHeight;
        $fileList.find(".row.expanded").each(function() {
            sizerHeight += $(this).outerHeight() - rowHeight;
        });
        return sizerHeight;
    }

    function getRowsAboveHeight(numRowsAbove) {
        return numRowsAbove * rowHeight;
    }

    function positionScrollBar(row) {
        $fileList.addClass("scrolling");
        var $row = $fileList.find('.row' + row);
        var scrollPos = $row[0].offsetTop;
        $fileList.scrollTop(scrollPos);
        $fileList.removeClass("scrolling");
    }

    function alignScrollBarWithList(onlyIfUnequal) {
        var scrollTop = $fileList.scrollTop()
        var numRowsAbove = scrollMeta.currentRowNumber -
                           scrollMeta.numVisibleRows;
        var rowsAboveHeight = getRowsAboveHeight(numRowsAbove);
        var scrollBarTop = scrollTop + rowsAboveHeight;
        scrollBarTop -= scrollMeta.base;
        if (!onlyIfUnequal || scrollTop !== scrollBarTop) {
            scrollMeta.isListScrolling = true;
            $modal.find(".fileListSection").find(".scrollBar")
                                           .scrollTop(scrollBarTop);
        }
    }

    function setAbsolute(resultSetId, rowPosition, retry) {
        var deferred = jQuery.Deferred();
        var resultSetId = curResultSetId;
        var curId = modalId;
        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(deferred.resolve)
        .fail(function(error) {
            if (!modalId || curId !== modalId) {
                deferred.reject({});
                return;
            }
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                XcalarMakeResultSetFromDataset(dsName, true)
                .then(function(result) {
                    curResultSetId = result.resultSetId;
                    return setAbsolute(curResultSetId, rowPosition, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                Alert.error(ErrTStr.NotDisplayRows, error);
            }
        });

        return (deferred.promise());
    }

    return DSImportErrorModal;
}({}, jQuery));