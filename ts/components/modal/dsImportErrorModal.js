window.DSImportErrorModal = (function(DSImportErrorModal, $) {
    var $modal;     // $("#dsImportErrorModal")
    var modalHelper;
    var modalId;
    var scrollMeta = {};
    var $recordList;
    var $fileList;
    var numRecordsToFetch = 10; // num to fetch at a time when scrolling
    var numRecordsToShow = 20; // num to fetch initially on show
    var rowHeight = 44;
    var curResultSetId;
    var curDSName;
    var files = {};
    var activePath = null;
    var hasRecordErrors = false;

    DSImportErrorModal.setup = function() {
        $modal = $("#dsImportErrorModal");
        $recordList = $modal.find(".recordMessageList");
        $fileList = $modal.find(".errorFileList");
        modalHelper = new ModalHelper($modal);

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

        $modal.on('click', '.downloadErrorModal', function() {
            var errorData = [];
            XcalarFetchData(curResultSetId, 0, scrollMeta.numRecords, scrollMeta.numRecords, [], 0, 0)
            .then(function(msgs) {
                for (var row = 0; row < msgs.length; row++) {
                    var fileInfo = JSON.parse(msgs[row]);
                    for (var index = 0; index < fileInfo.errors.length; index++) {
                        errorData.push({
                            "fileName": fileInfo.fullPath,
                            "recordNumber": fileInfo.errors[index].recordNumber,
                            "error": fileInfo.errors[index].error
                        });
                    }
                }

                xcHelper.downloadAsFile(curDSName + "_err.json", JSON.stringify(errorData, null, 2));
            })
            .fail(function(err) {
                Alert.error(ErrTStr.ErrorModalDownloadFailure, err);
            });
        });
    };

    DSImportErrorModal.show = function(dsName, numErrors, isRecordError) {
        if (modalId) { // already open
            return;
        }

        curResultSetId = null;
        modalHelper.setup();
        modalId = Date.now();
        hasRecordErrors = isRecordError;
        $modal.find(".infoTotalErrors").find(".value").text("N/A");
        $modal.find(".infoTotalFiles").find(".value").text("N/A");
        if (numErrors) {
            $modal.find(".infoTotalErrors").find(".value").text(xcHelper.numToStr(numErrors));
        }

        curDSName = dsName;

        XcalarMakeResultSetFromDataset(dsName, true)
        .then(function (result) {
            curResultSetId = result.resultSetId;

            var numRowsToFetch = Math.min(result.numEntries, numRecordsToShow);

            refreshScrollBar(result.numEntries);

            fetchRows(0, numRowsToFetch)
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
            })
            .fail(function() {
                // only fails if modal has been closed or changed
            });
        });
    };

    function closeModal() {
        $fileList.find(".row").remove();
        $recordList.empty();
        $recordList.removeClass("scrolling");
        $fileList.removeClass("scrolling full");
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

    function refreshScrollBar(numRecords) {
        scrollMeta = {
            currentRowNumber: 0,
            numRecords: numRecords
        };
    }

    function setupScrollBar() {
        $fileList.scroll(function() {
            if (isScrollBarAtBottom()) {
                scrollDown();
            }
        });

        function scrollDown() {
            if ($fileList.hasClass("scrolling") || $fileList.hasClass("full")) {
                return;
            }
            if (scrollMeta.currentRowNumber < scrollMeta.numRecords) {
                numRowsToAdd = Math.min(numRecordsToFetch,
                    scrollMeta.numRecords - scrollMeta.currentRowNumber);
                fetchRows(scrollMeta.currentRowNumber, numRowsToAdd);
            }
        }

        function isScrollBarAtBottom() {
            return ($fileList[0].scrollHeight - $fileList.scrollTop() -
                       $fileList.outerHeight() <= (rowHeight * 8));
        }
    }

    function fetchRows(startIndex, numRowsToAdd) {
        var deferred = PromiseHelper.deferred();
        var curId = modalId;
        $fileList.addClass("scrolling");

        fetchHelper(curResultSetId, startIndex, numRowsToAdd)
        .always(function(msgs) {
            if (!modalId || curId !== modalId) {
                return;
            }
            var html = "";
            for (var i = 0; i < msgs.length; i++) {
                var fileInfo = msgs[i];
                files[fileInfo.fullPath] = fileInfo;
                var rowNum = i + startIndex;
                html += getFileRowHtml(fileInfo, rowNum);
            }

            $fileList.find(".tempRow").before(html);

            $fileList.removeClass("scrolling");
            if (scrollMeta.currentRowNumber >= scrollMeta.numRecords) {
                $fileList.addClass("full");
            }
            var numFiles = xcHelper.numToStr(msgs.length);
            if (scrollMeta.currentRowNumber < scrollMeta.numRecords) {
                numFiles += "+";
            }
            $modal.find(".infoTotalFiles").find(".value").text(numFiles);
            deferred.resolve(msgs);
        });

        return deferred.promise();
    }

    function fetchHelper(curResultSetId, startIndex, numRowsNeeded) {
        var deferred = PromiseHelper.deferred();
        var numRowsFound = 0;
        var allFiles = [];

        fetch(startIndex, numRowsNeeded)
        .always(function() {
            deferred.resolve(allFiles);
        });

        return deferred.promise();

        function fetch(sIndex, numRowsToAdd) {
            var innerDeferred = PromiseHelper.deferred();
            var curId = modalId;
            XcalarFetchData(curResultSetId, sIndex, numRowsToAdd,
                            scrollMeta.numRecords, [], 0, 0)
            .then(function(files) {
                if (!modalId || curId !== modalId) {
                    return PromiseHelper.reject();
                }
                for (var i = 0; i < files.length; i++) {
                    var fileInfo = JSON.parse(files[i]);
                    if (!fileInfo.numErrors) {
                        continue;
                    }

                    fileInfo.type = "record";
                    allFiles.push(fileInfo);
                    numRowsFound++;
                }
                scrollMeta.currentRowNumber += numRowsToAdd;
                var endIndex = sIndex + numRowsToAdd;
                var numMoreNeeded = numRowsNeeded - numRowsFound;
                numMoreNeeded = Math.min(numMoreNeeded,
                                         scrollMeta.numRecords - endIndex);

                if (numMoreNeeded) {
                    return fetch(endIndex, numMoreNeeded);
                } else {
                    return PromiseHelper.resolve();
                }
            })
            .then(function() {
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
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
            '<i class="icon xi-error"' + xcTooltip.Attrs +
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSImportErrorModal.__testOnly__ = {};
        DSImportErrorModal.__testOnly__fetchRows = fetchRows;
        DSImportErrorModal.__testOnly__.getScrollmeta = function() {
            return scrollMeta;
        };
    }
    /* End Of Unit Test Only */

    return DSImportErrorModal;
}({}, jQuery));
