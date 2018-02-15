window.DSImportErrorModal = (function(DSImportErrorModal, $) {
    var $modal;     // $("#dsImportErrorModal")
    var modalHelper;
    var modalId;
    var scrollMeta = {};
    var $recordList;
    var numRecordsToFetch = 20;
    var numRecordsToShow = 40;
    var rowHeight = 54;
    var errors = {
        "a/b/c/d.txt": {
            type: "record",
            records: [{recordNum: 1, msg: "Why is there a comma where a full"  +
            "stop should be? I am filling text here so it will overflow."},
            {recordNum: 2, msg: "Why is there a comma where a full"  +
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

    for (var i = 2; i < 40; i++) {
    	errors["a/b/c/d.txt"].records.push({
    		recordNum: i,
    		msg: "test " + i
    	});
    }


    DSImportErrorModal.setup = function() {
        $modal = $("#dsImportErrorModal");
        $recordList = $modal.find(".recordMessageList");
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
            var error = errors[path];

            $modal.find(".recordErrorSection, .fileErrorSection").addClass("xc-hidden");
            var html = "";
            if (error.type === "record") {
                for (var i = 0; i < error.records.length; i++) {
                    html += '<div class="row collapsed row' + i + '">' +
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
        $modal.find(".errorFileList .row").eq(0).removeClass("active").click();
        refreshScrollBar();
    };

    function closeModal() {
        modalHelper.clear();
        modalId = null;
        $recordList.removeClass("scrolling");
        // XXX clear cached errors
    }

    function refreshScrollBar() {
    	scrollMeta = {
    		base: 0,
    		isListScrolling: false,
    		isBarScrolling: false,
    		currentRowNumber: 40
    	};

    	scrollMeta.numRecords = 200;
    	scrollMeta.numVisibleRows = Math.min(scrollMeta.numRecords, numRecordsToShow);
    	setSizerHeight();
    }

    function setupScrollBar() {
    	var isMouseDown = false;
    	var $scrollBar = $modal.find(".errorMsgSection").find(".scrollBar");
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
                $recordList.scrollTop(top);
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

                if ($recordList.hasClass("scrolling")) {
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
                						Math.round(rowNum));
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

        $recordList.scroll(function() {
    		var scrollTop = $recordList.scrollTop();
    		if (scrollMeta.isBarScrolling) {
    			scrollMeta.isBarScrolling = false;
    		} else {
    			scrollMeta.isListScrolling = true;
    			alignScrollBarWithList();
    		}
    		var info;
    		if ($recordList.hasClass("scrolling")) {
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
            return ($recordList[0].scrollHeight - $recordList.scrollTop() -
                       $recordList.outerHeight() <= 1);
        }
    }

    function goTo(startIndex, numRowsToAdd, direction, info) {
    	var deferred = jQuery.Deferred();
    	$recordList.addClass("scrolling");
    	if (info.bulk) {
    		scrollMeta.currentRowNumber = startIndex + numRowsToAdd;
    		$recordList.find(".row").addClass("toRemove");
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
    		if (curId !== modalId) {
    			return;
    		}
			if (info.bulk) {
				$recordList.find(".toRemove").remove();
				info.targetRow;

    		} else {

    		}
    	})
    	.fail(function() {
    		if (curId !== modalId) {
    			return;
    		}
    		$recordList.find(".toRemove").removeClass("toRemove");
    	})
    	.always(function() {
    		if (curId !== modalId) {
    			return;
    		}
    		var scrollTop = $recordList.scrollTop();
    		if (scrollTop < 2) {
    			// leave some space for scrolling up
    			scrollTop = 2;
    			$recordList.scrollTop(scrollTop);
    		} else if ($recordList[0].scrollHeight - scrollTop - $recordList.outerHeight() <= 1) {
    			// leave some space for scrolling down
    			scrollTop -= 2;
    			$recordList.scrollTop(scrollTop);
    		}

    		if (!info.bulk) {
    			var onlyIfUnequal = true;
    			alignScrollBarWithList(onlyIfUnequal);
    		}

    		$recordList.removeClass("scrolling");
    		deferred.resolve();
    	});

    	return deferred.promise();
    }

    function fetchRows(startIndex, numRowsToAdd, direction, info) {
    	var deferred = jQuery.Deferred();
    	var curId = modalId;

    	var html = "";
    	for (var row = 0; row < numRowsToAdd; row++) {
    		var rowNum = row + startIndex;
    		html += '<div class="row collapsed row' + rowNum + '">' +
                '<div class="recordNum">' +
                    '<i class="icon xi-arrow-down arrow"></i>' +
                    '<span class="num">' + rowNum + '</span>' +
                '</div>' +
                '<div class="errorMsg">' + "text ".repeat(100) + '</div>' +
            '</div>';
    	}

    	if (direction === "bottom") {

	    	setTimeout(function() {
	    		if (modalId !== curId) {
	    			return;
	    		}
	    		if (info.bulk) {
	    			$recordList.prepend(html);
	    		} else {
	    			$recordList.append(html);
    				$recordList.find(".tempRow").remove();
	    		}

	    		deferred.resolve();
	    	}, 1000);
    	} else {
    		$recordList.prepend(html);
    		$recordList.find(".tempRow").remove();
    		deferred.resolve();
    	}

    	return deferred.promise();
    }

    function addTempRows(startIndex, numRowsToAdd, direction) {
    	var html = "";
    	for (var row = 0; row < numRowsToAdd; row++) {
    		var rowNum = row + startIndex;
    		html += '<div class="row collapsed tempRow row' + rowNum + '">' +
            		'</div>';
    	}
    	if (direction === "bottom") {
    		$recordList.append(html);
    	} else {
    		$recordList.prepend(html);
    		var heightAdded = numRowsToAdd * rowHeight;
    		$recordList.scrollTop(heightAdded);
    	}
    }

    function removeRows(info, numRowsToRemove, direction) {
    	if (direction === "bottom") {
    		$recordList.find(".row").slice(0, numRowsToRemove).remove();
    	} else {
    		$recordList.find(".row").slice(numRecordsToShow).remove();
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
        $modal.find(".errorMsgSection").find(".sizer").height(sizerHeight);
    };

    function getSizerHeight() {
        var sizerHeight = scrollMeta.numRecords * rowHeight;
        $recordList.find(".row.expanded").each(function() {
        	sizerHeight += $(this).outerHeight() - rowHeight;
        });
        return sizerHeight;
    }

    function getRowsAboveHeight(numRowsAbove) {
    	return numRowsAbove * rowHeight;
    }

    function positionScrollBar(row) {
    	$recordList.addClass("scrolling");
    	var $row = $recordList.find('.row' + row);
        var scrollPos = $row[0].offsetTop;
        $recordList.scrollTop(scrollPos);
        $recordList.removeClass("scrolling");
    }

    function alignScrollBarWithList(onlyIfUnequal) {
    	var scrollTop = $recordList.scrollTop()
        var numRowsAbove = scrollMeta.currentRowNumber -
        				   scrollMeta.numVisibleRows;
		var rowsAboveHeight = getRowsAboveHeight(numRowsAbove);
		var scrollBarTop = scrollTop + rowsAboveHeight;
		scrollBarTop -= scrollMeta.base;
		if (!onlyIfUnequal || scrollTop !== scrollBarTop) {
			scrollMeta.isListScrolling = true;
			$modal.find(".errorMsgSection").find(".scrollBar")
									   	   .scrollTop(scrollBarTop);
		}
    }

    return DSImportErrorModal;
}({}, jQuery));