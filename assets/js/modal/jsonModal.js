window.JSONModal = (function($, JSONModal) {
    var $jsonModal;   // $("#jsonModal")
    var $jsonArea;    // $jsonModal.find(".jsonArea")
    var $modalBg;     // $("#modalBackground")
    var $searchInput; // $('#jsonSearch').find('input')
    var $jsonText;    // $jsonModal.find('.prettyJson')
    var $counter;     // $('#jsonSearch').find('.counter')
    var matchIndex;
    var isDataCol;
    var comparisonObjs = {};
    var jsonData = [];
    var modalHelper;
    var searchHelper;
    var notObject = false; // true if in preview mode due to truncated text
    var lastModeIsProject = false; // saves project mode state when closing modal
    var isSaveModeOff = false;

    // constant
    var jsonAreaMinWidth = 340;

    JSONModal.setup = function() {
        $jsonModal = $("#jsonModal");
        $jsonArea = $jsonModal.find(".jsonArea");
        $modalBg = $("#modalBackground");
        $searchInput = $('#jsonSearch').find('input');
        $jsonText = $jsonModal.find('.prettyJson');
        $counter = $('#jsonSearch').find('.counter');

        var minHeight = 300;
        var minWidth  = 300;

        modalHelper = new ModalHelper($jsonModal, {
            "minHeight" : minHeight,
            "minWidth"  : minWidth,
            "noTabFocus": true,
            "noEsc"     : true
        });

        $jsonModal.draggable({
            handle     : '.jsonDragArea',
            cursor     : '-webkit-grabbing',
            containment: "window"
        });

        $('#jsonModal .closeJsonModal').click(function() {
            if ($('#jsonModal').css('display') === 'block') {
                closeJSONModal();
            }
        });

        $('#modalBackground').click(function() {
            if (!isDataCol && $('#jsonModal').css('display') === 'block') {
                closeJSONModal();
            }
        });

        var $jsonWraps;
        var modalMinWidth;
        var $tabSets;
        var small = false;

        $jsonModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document",
            start      : function() {
                $jsonWraps = $jsonModal.find('.jsonWrap');
                $tabSets = $jsonWraps.find('.tabs');
                modalMinWidth = $jsonWraps.length * jsonAreaMinWidth;
            },
            resize: function(event, ui) {
                if (!small && ui.size.width < modalMinWidth) {
                    $tabSets.addClass('small');
                    small = true;
                } else if (small && ui.size.width > modalMinWidth) {
                    $tabSets.removeClass('small');
                    small = false;
                }
            }
        });

        var initialIndex;
        $jsonArea.sortable({
            revert: 300,
            axis  : "x",
            handle: ".jsonDragHandle",
            start : function(event, ui) {
                initialIndex = $(ui.item).index();
            },
            stop: function(event, ui) {
                resortJsons(initialIndex, $(ui.item).index());
                $(ui.item).css('top', 'auto');
            }
            // containment: "parent"
        });

        addEventListeners();
        addMenuActions();
    };

    // type is only included if not a typical array or object
    // options:
    //      type : string representing column data type
    //      saveModeOff: boolean, if true, will not save projectState
    JSONModal.show = function ($jsonTd, isArray, options) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }
        options = options || {};
        var type = options.type;
        isSaveModeOff = options.saveModeOff;

        xcHelper.removeSelectionRange();
        var isModalOpen = $jsonModal.is(':visible');
        isDataCol = $jsonTd.hasClass('jsonElement');

        if (!isModalOpen) {
            $(".tooltip").hide();
            $(".xcTable").find(".highlightBox").remove();
            $searchInput.val("");
            modalHelper.setup({"open": function() {
                // json modal use its own opener
                return PromiseHelper.resolve();
            }});
            jsonModalDocumentEvent();
            $("body").addClass("hideScroll");
        }

        // shows json modal
        refreshJsonModal($jsonTd, isArray, isModalOpen, type);

        if (isModalOpen) {
            updateSearchResults();
            searchText();
        }

        increaseModalSize();
    };

    function addEventListeners() {
        var $searchArea = $('#jsonSearch');
        searchHelper = new SearchBar($searchArea, {
            "removeSelected": function() {
                $jsonText.find('.selected').removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass('selected');
            },
            "scrollMatchIntoView": function($match) {
                scrollMatchIntoView($match);
            }
        });

        searchHelper.setup();

        $searchInput.on('input', function() {
            searchText();
        });
        $jsonModal.find('.closeBox').click(function() {
            if ($searchInput.val() === "") {
                toggleSearch();
            } else {
                searchHelper.clearSearch(function() {
                    var focus = true;
                    clearSearch(focus);
                });
            }
        });
        $jsonModal.find('.searchIcon').click(toggleSearch);

        $jsonArea.on({
            "click": function() {
                var $el = $(this);
                selectJsonKey($el);
            }
        }, ".jKey, .jArray>.jString, .jArray>.jNum");

        $jsonArea.on('click', '.jsonCheckbox', function() {
            var $key = $(this).siblings('.jKey');
            selectJsonKey($key);
        });

        $jsonArea.on("click", ".compareIcon", function() {
            compareIconSelect($(this));
        });

        $jsonArea.on("click", ".sort", function() {
            sortData($(this));
        });

        $jsonArea.on("click", ".split", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            duplicateView($jsonWrap);
        });

        $jsonArea.on("click", ".pullAll", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            var rowNum = $jsonWrap.data('rownum');
            var colNum = $jsonWrap.data('colnum');
            var tableId =  $jsonWrap.data('tableid');
            // var $table = $("#xcTable-" + tableId);
            // var $td = $table.find(".row" + rowNum + " .col" + colNum);

            closeJSONModal();
            //set timeout to allow modal to close before unnesting many cols
            setTimeout(function() {
                ColManager.unnest(tableId, colNum, rowNum, false, {isDataTd: true});
            }, 0);
        });

        $jsonArea.on("click", ".remove", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            var jsonWrapData = $jsonWrap.data();

            // remove highlightbox if no other jsonwraps depend on it
            var $highlightBox = $('#xcTable-' + jsonWrapData.tableid)
                                    .find('.row' + jsonWrapData.rownum)
                                    .find('td.col' + jsonWrapData.colnum)
                                    .find('.jsonModalHighlightBox');
            $highlightBox.data().count--;
            if ($highlightBox.data().count === 0) {
                $highlightBox.remove();
            }

            // handle removal of comparisons
            var index = $jsonWrap.index();
            $jsonWrap.find('.remove').tooltip('destroy');

            if ($jsonWrap.find('.compareIcon.on').length) {
                $jsonWrap.find('.compareIcon').click();
            }

            $jsonWrap.remove();

            if ($jsonArea.find('.jsonWrap').length === 1) {
                var $compareIcons = $jsonArea.find('.compareIcon')
                                          .addClass('single');
                var title = "Select another data cell from a table to compare";
                var $compareIcon;

                $compareIcons.each(function() {
                    $compareIcon = $(this);
                    if ($compareIcon.attr('title')) {
                        $compareIcon.attr('title', title);
                    } else {
                        $compareIcon.attr('data-original-title', title);
                    }
                });
            }

            jsonData.splice(index, 1);
            delete comparisonObjs[index];

            var numJsons = jsonData.length;
            for (var i = index; i <= numJsons; i++) {
                if (comparisonObjs[i]) {
                    comparisonObjs[i - 1] = comparisonObjs[i];
                    delete comparisonObjs[i];
                }
            }
            if (comparisonObjs[numJsons]) {
                delete comparisonObjs[numJsons];
            }

            decreaseModalSize();
            updateSearchResults();
            searchText();
        });

        $jsonArea.on("click", ".projectWrap", function() {
            var $projectWrap = $(this);
            var $checkbox = $projectWrap.find('.checkbox');
            var $jsonWrap = $projectWrap.closest('.jsonWrap');
            var $selectBtns = $jsonWrap.find('.selectBtn');
            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $jsonWrap.removeClass('projectMode');
                $selectBtns.addClass('hidden');
                // XX don't select all submits
                $('.submitProject').addClass('hidden');
            } else {
                $checkbox.addClass('checked');
                $jsonWrap.addClass('projectMode');
                $selectBtns.removeClass('hidden');
                // XX don't select all submits
                $('.submitProject').removeClass('hidden');
            }
        });

        $jsonArea.on("click", ".clearAll", function() {
            clearAllProjectedCols($(this));
        });

        $jsonArea.on("click", ".dropdownBox", function() {
            var $icon = $(this);
            var $menu = $icon.closest('.jsonWrap').find('.menu');
            var isVisible = $menu.is(":visible");
            $jsonArea.find('.menu').hide();
            if (isVisible) {
                $menu.hide();
            } else {
                $menu.show();
            }
        });

        $jsonArea.on("click", ".submitProject", function() {
            var index = $(this).closest('.jsonWrap').index();
            submitProject(index);
        });

        $jsonArea.on("mousedown", ".tab", function() {
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                return;
            }
            $tab.closest('.tabs').find('.tab').removeClass('active');
            $tab.addClass('active');
        });

        $jsonArea.on("mousedown", ".jsonDragHandle", function() {
            var cursorStyle =
                '<style id="moveCursor" type="text/css">*' +
                    '{cursor:move !important; ' +
                    'cursor: -webkit-grabbing !important;' +
                    'cursor: -moz-grabbing !important;}' +
                    '.tooltip{display: none !important;}' +
                '</style>';
            $(document.head).append(cursorStyle);

            $(document).on("mouseup.dragHandleMouseUp", function() {
                $('#moveCursor').remove();
                $(document).off('.dragHandleMouseUp');
            });
        });
    }

    function compareIconSelect($compareIcon) {
        var $compareIcons = $jsonArea.find('.compareIcon.on');
        var numComparisons = $compareIcons.length;
        var isSearchUpdateNeeded = true;
        var multipleComparison = false;
        var newComparisonNum;

        if ($compareIcon.hasClass('on')) {// uncheck this jsonwrap

            $compareIcon.removeClass('on first');
            $compareIcon.closest('.jsonWrap')
                      .removeClass('active comparison');

            //designate any other active compareIcon as the anchor
            $jsonArea.find('.compareIcon.on').eq(0).addClass('first');

            $jsonArea.find('.comparison').find('.prettyJson.secondary')
                                         .empty();
            $jsonArea.find('.comparison').removeClass('comparison');
            comparisonObjs = {}; // empty any saved comparisons

        } else { // check this jsonWrap
            if (numComparisons === 0) {
                $compareIcon.addClass('first');
                isSearchUpdateNeeded = false;
            } else if (numComparisons > 1) {
                multipleComparison = true;
                newComparisonNum = $compareIcon.closest('.jsonWrap').index();
            }
            $compareIcon.addClass('on');
            $compareIcon.closest('.jsonWrap').addClass('active');
        }

        $compareIcons = $jsonArea.find('.compareIcon.on');

        // only run comparison if more than 2 compareIcons are on
        if ($compareIcons.length > 1) {
            var indices = [];
            var objs = [];
            if (multipleComparison) {
                compare(jsonData[newComparisonNum], newComparisonNum,
                        multipleComparison);
            } else {
                $compareIcons.each(function() {
                    var index = $(this).closest('.jsonWrap').index();
                    indices.push(index);
                    objs.push(jsonData[index]);
                });

                compare(objs, indices);
            }
            displayComparison(comparisonObjs);
        }

        if (isSearchUpdateNeeded && $compareIcons.length !== 0) {
            updateSearchResults();
            searchText();
        }
    }

    function clearAllProjectedCols($btn) {
        var $jsonWrap = $btn.closest('.jsonWrap');
        $jsonWrap.find('.jObject').children().children().children('.jKey')
                 .removeClass('projectSelected');
        $jsonWrap.find('.jsonCheckbox').removeClass('checked');
        $jsonWrap.find('.submitProject').addClass('disabled');
        $jsonWrap.find('.clearAll').addClass('disabled');
        var totalCols = $jsonWrap.find('.colsSelected').data('totalcols');
        $jsonWrap.find('.colsSelected').text('0/' + totalCols + ' selected');
    }

    function selectJsonKey($el) {
        var $jsonWrap = $el.closest('.jsonWrap');
        var tableId   = $jsonWrap.data('tableid');
        var table     = gTables[tableId];
        var cols      = table.tableCols;
        var colNum    = $jsonWrap.data('colnum');
        var isArray   = $jsonWrap.data('isarray');
        var nameInfo;
        var numCols   = cols.length;
        var colName;

        if ($jsonWrap.hasClass('projectMode')) {
            // $el.closest('.jInfo').data('key');
            if ($el.hasClass('projectSelected')) {
                $el.removeClass('projectSelected');
                $el.siblings('.jsonCheckbox').removeClass('checked');
                if ($jsonWrap.find('.projectSelected').length === 0) {
                    $jsonWrap.find('.submitProject').addClass('disabled');
                    $jsonWrap.find('.clearAll').addClass('disabled');
                }
            } else {
                if ($el.parent('.jArray').length === 0) {
                    $el.addClass('projectSelected');
                    $el.siblings('.jsonCheckbox').addClass('checked');
                    $jsonWrap.find('.submitProject').removeClass('disabled');
                    $jsonWrap.find('.clearAll').removeClass('disabled');
                }
            }
            var numSelected = $jsonWrap.find('.projectSelected').length;
            var totalCols = $jsonWrap.find('.colsSelected').data('totalcols');

            $jsonWrap.find('.colsSelected').text(numSelected + '/' + totalCols +
                                                 ' selected');
        } else {
            var nameInfo = createJsonSelectionExpression($el);
            var animation = gMinModeOn ? false : true;

            if (isDataCol) {
                colName = nameInfo.escapedName;
            } else {
                var symbol = "";
                if (!isArray) {
                    symbol = ".";
                }

                colName = cols[colNum - 1].getBackColName() + symbol +
                          nameInfo.escapedName;
            }
            // check if the column already exists
            for (var i = 0; i < numCols; i++) {
                // skip DATA col and new col
                if (cols[i].isDATACol() || cols[i].isNewCol) {
                    continue;
                }

                if (cols[i].getBackColName() === colName) {
                    closeJSONModal();
                    xcHelper.centerFocusedColumn(tableId, i, animation);
                    return;
                }
            }

            var pullColOptions = {
                "isDataTd" : isDataCol,
                "isArray"  : isArray,
                "noAnimate": true
            };

            ColManager.pullCol(colNum, tableId, nameInfo, pullColOptions)
            .always(function() {
                closeJSONModal();
                if (isDataCol) {
                    colNum--; // column appended to left, so colNum - 1
                }
                xcHelper.centerFocusedColumn(tableId, colNum, animation);
            });
        }
    }

    function duplicateView($jsonWrap) {
        var $jsonClone = $jsonWrap.clone();
        $jsonClone.data('colnum', $jsonWrap.data('colnum'));
        $jsonClone.data('rownum', $jsonWrap.data('rownum'));
        $jsonClone.data('tableid', $jsonWrap.data('tableid'));

        var index = $jsonWrap.index();
        jsonData.splice(index + 1, 0, jsonData[index]);
        $jsonWrap.after($jsonClone);
        $jsonClone.removeClass('active comparison');
        $jsonClone.find('.selected').removeClass('selected');
        $jsonClone.find('.compareIcon').removeClass('on first');
        $jsonClone.find('.prettyJson.secondary').empty();

        if (!$jsonWrap.hasClass('comparison')) {
            var scrollTop = $jsonWrap.find('.prettyJson.primary').scrollTop();
            $jsonClone.find('.prettyJson.primary').scrollTop(scrollTop);
        }

        var jsonWrapData = $jsonClone.data();
        var $highlightBox = $('#xcTable-' + jsonWrapData.tableid)
                                .find('.row' + jsonWrapData.rownum)
                                .find('td.col' + jsonWrapData.colnum)
                                .find('.jsonModalHighlightBox');
        $highlightBox.data().count++;

        var $compareIcons = $jsonArea.find('.compareIcon').removeClass('single');
        var title = "Click to select for comparison";
        var $compareIcon;

        $compareIcons.each(function() {
            $compareIcon = $(this);
            if ($compareIcon.attr('title')) {
                $compareIcon.attr('title', title);
            } else {
                $compareIcon.attr('data-original-title', title);
            }
        });


        var numData = jsonData.length;
        for (var i = numData - 1; i > index; i--) {
            if (comparisonObjs[i]) {
                comparisonObjs[i + 1] = comparisonObjs[i];
                delete comparisonObjs[i];
            }
        }

        increaseModalSize();

        // reset some search variables to include new jsonWrap
        updateSearchResults();
    }

    function sortData($icon) {
        var order;
        if ($icon.hasClass('desc')) {
            $icon.removeClass('desc');
            $icon.attr('data-original-title', JsonModalTStr.SortAsc);
            order = 1;
        } else {
            $icon.addClass('desc');
            $icon.attr('data-original-title', JsonModalTStr.SortDesc);
            order = -1;
        }
        $icon.attr('title', "");
        $('.tooltip').hide();
        var $jsonWrap = $icon.closest('.jsonWrap');
        var $list = $jsonWrap.find('.primary').children().children().children();
        $list.sort(sortList).prependTo($jsonWrap.find('.primary').children().children());

        searchHelper.$matches = [];
        searchHelper.clearSearch(function() {
            clearSearch();
        });

        function sortList(a, b) {
            return xcHelper.sortVals($(a).data('key'), $(b).data('key'), order);
        }
    }

    function increaseModalSize() {
        var numJsons = jsonData.length;
        var winWidth = $(window).width();
        var currentWidth = $jsonModal.width();
        var offsetLeft = $jsonModal.offset().left;
        var maxWidth = winWidth - offsetLeft;

        var desiredWidth = Math.min(numJsons * 200, maxWidth);

        if (currentWidth < desiredWidth) {
            var newWidth = Math.min(desiredWidth, currentWidth + 200);
            $jsonModal.width(newWidth);

            // center modal only if already somewhat centered
            if ((winWidth - currentWidth) / 2 + 100 > offsetLeft &&
                (winWidth - currentWidth) / 2 - 100 < offsetLeft) {
                modalHelper.center({"horizontalOnly": true});
            }
        }
        checkTabSizes();
    }

    function checkTabSizes() {
        var $jsonWraps = $jsonModal.find('.jsonWrap');
        var $tabSets = $jsonWraps.find('.tabs');
        var modalMinWidth = $jsonWraps.length * jsonAreaMinWidth;
        var currentModalWidth = $jsonModal.width();

        if (currentModalWidth < modalMinWidth) {
            $tabSets.addClass('small');
        } else if (currentModalWidth > modalMinWidth) {
            $tabSets.removeClass('small');
        }
    }

    function decreaseModalSize() {
        var currentWidth = $jsonModal.width();
        var minW = Math.min(500, currentWidth);
        var desiredWidth = Math.max(jsonData.length * 200, minW);
        var winWidth = $(window).width();
        var offsetLeft = $jsonModal.offset().left;

        if (currentWidth > desiredWidth) {
            var newWidth = Math.max(desiredWidth, currentWidth - 100);
            $jsonModal.width(newWidth);
            if ((winWidth - currentWidth) / 2 + 100 > offsetLeft &&
                (winWidth - currentWidth) / 2 - 100 < offsetLeft) {
                modalHelper.center({"horizontalOnly": true});
            }
        }
        checkTabSizes();
    }

    // updates search after split or remove jsonWrap
    function updateSearchResults() {
        $jsonText = $jsonModal.find('.prettyJson:visible');
        searchHelper.$matches = $jsonText.find('.highlightedText');
        searchHelper.numMatches = searchHelper.$matches.length;

        //XXX this isn't complete, not handling case of middle json being removed
        if (matchIndex > searchHelper.numMatches) {
            matchIndex = 0;
        }

        if ($searchInput.val().length !== 0) {

            $counter.find('.total').text("of " + searchHelper.numMatches);

            if (searchHelper.numMatches > 0) {
                $counter.find('.position').text(matchIndex + 1);
            } else {
                $counter.find('.position').text(0);
            }
        }
    }

    function jsonModalDocumentEvent() {
        $(document).on("keydown.jsonModal", function(event) {
            if (event.which === keyCode.Escape) {
                closeJSONModal();
                return false;
            }
        });
    }

    function searchText() {
        $jsonText.find('.highlightedText').contents().unwrap();
        var text = $searchInput.val().toLowerCase();

        if (text === "") {
            $counter.find('.position, .total').html('');
            searchHelper.numMatches = 0;
            $searchInput.css("padding-right", 25);
            return;
        }
        var $targets = $jsonText.find('.text').filter(function() {
            return ($(this).text().toLowerCase().indexOf(text) !== -1);
        });

        text = xcHelper.escapeRegExp(text);
        var regex = new RegExp(text, "gi");

        $targets.each(function() {
            var foundText = $(this).text();
            foundText = foundText.replace(regex, function (match) {
                return ('<span class="highlightedText">' + match +
                        '</span>');
            });
            $(this).html(foundText);
        });
        searchHelper.updateResults($jsonText.find('.highlightedText'));
        matchIndex = 0;
        $searchInput.css("padding-right", $counter.width() + 25);

        if (searchHelper.numMatches !== 0) {
            scrollMatchIntoView(searchHelper.$matches.eq(0));
        }
    }

    function clearSearch(focus) {
        $jsonText.find('.highlightedText').contents().unwrap();
        if (focus) {
            $searchInput.focus();
        }
        $searchInput.css("padding-right", 25).val("");
    }

    function scrollMatchIntoView($match) {
        var $modalWindow = $match.closest('.prettyJson');
        var modalHeight = $modalWindow.height();
        var scrollTop = $modalWindow.scrollTop();
        var matchOffsetTop = $match.position().top;
        if (matchOffsetTop > (scrollTop + modalHeight - 35)) {
            $modalWindow.scrollTop(matchOffsetTop + 40 - (modalHeight / 2));
        } else if (matchOffsetTop < (scrollTop - 25)) {
            $modalWindow.scrollTop(matchOffsetTop + 30 - (modalHeight / 2));
        }
    }

    function toggleSearch() {
        var $searchBar = $('#jsonSearch');
        if ($searchBar.hasClass('closed')) {
            $searchBar.removeClass('closed');
            setTimeout(function() {
                $searchBar.find('input').focus();
            }, 310);

        } else {
            $searchBar.addClass('closed');
            $searchInput.val("");
            searchText();
        }
    }

    function closeJSONModal() {
        modalHelper.clear({"close": function() {
            // json modal use its own closer
            $('.modalHighlighted').removeClass('modalHighlighted');
            $('.jsonModalHighlightBox').remove();
            toggleModal(null, true, 200);
            $jsonModal.hide().width(500);
            $modalBg.hide().removeClass('light');

            $('#sideBarModal').hide();
            $('#bottomMenu').removeClass('modalOpen');
            $("body").removeClass("hideScroll");
            $('.tooltip').hide();
        }});

        if (!isSaveModeOff) {
            lastModeIsProject = true;

            $jsonArea.find('.jsonWrap').each(function() {
                if (!$(this).hasClass('projectMode')) {
                    lastModeIsProject = false;
                    return false;
                }
            });
        }
        isSaveModeOff = false;

        $(document).off(".jsonModal");
        searchHelper.$matches = [];
        searchHelper.clearSearch(function() {
            clearSearch();
        });
        $('#jsonSearch').addClass('closed');
        $jsonArea.empty();

        jsonData = [];
        comparisonObjs = {};
        $jsonText = null;
        notObject = false;
    }

    function refreshJsonModal($jsonTd, isArray, isModalOpen, type) {
        var text = $jsonTd.find('.originalData').text();
        var jsonObj;
        var allProjectMode = false; // used to see if new json column will
        // come out in project mode

        if (type && (type !== "array" && type !== "object")) {
            jsonObj = text;
        } else {
            try {
                jsonObj = JSON.parse(text);
            } catch (error) {
                console.error(error, text);
                closeJSONModal();
                return;
            }
        }

        jsonData.push(jsonObj);

        if (!isModalOpen) {
            var height = Math.min(500, $(window).height());
            $jsonModal.height(height).width(500);

            if (gMinModeOn) {
                $('#sideBarModal').show();
                $modalBg.show();
                $jsonModal.show();
                toggleModal($jsonTd, false, 0);
            } else {
                toggleModal($jsonTd, false, 200);
            }
        } else {
            if ($jsonArea.find('.jsonWrap.projectMode').length > 1 &&
                ($jsonArea.find('.jsonWrap').length ===
                $jsonArea.find('.jsonWrap.projectMode').length)) {
                allProjectMode = true;
            }
        }

        if (gMinModeOn || isModalOpen) {
            fillJsonArea(jsonObj, $jsonTd, isArray, type);
            if (!isModalOpen) {
                $jsonText = $jsonModal.find('.prettyJson:visible');
                searchHelper.$matches = $jsonText.find('.highlightedText');
            }
        } else {
            fillJsonArea(jsonObj, $jsonTd, isArray, type);
            // wait for jsonModal to become visible
            setTimeout(function() {
                $jsonText = $jsonModal.find('.prettyJson:visible');
                searchHelper.$matches = $jsonText.find('.highlightedText');
            }, 250);
        }

        if (isModalOpen) {
            var $compareIcons = $jsonArea.find('.compareIcon')
                                      .removeClass('single');
            var $compareIcon;
            var title = JsonModalTStr.Compare;
            $compareIcons.each(function() {
                $compareIcon = $(this);
                if ($compareIcon.attr('title')) {
                    $compareIcon.attr('title', title);
                } else {
                    $compareIcon.attr('data-original-title', title);
                }
            });
            if (allProjectMode) {
                $jsonArea.find('.jsonWrap').last().addClass('projectMode');
            }
        } else if (lastModeIsProject) {
            $jsonArea.find('.jsonWrap').last().addClass('projectMode');
        }
    }

    function fillJsonArea(jsonObj, $jsonTd, isArray, type) {
        var prettyJson;
        if (type && (type !== "object" && type !== "array")) {
            var typeClass = "";
            switch (type) {
                case ('string'):
                    typeClass = "jString";
                    break;
                case ('integer'):
                    typeClass = "jNum";
                    break;
                case ('float'):
                    typeClass = "jNum";
                    break;
                case ('boolean'):
                    typeClass = "jBool";
                    break;
                default:
                    typeClass = "jUndf";
                    break;
            }
            prettyJson = '<span class="previewText text ' + typeClass + '">' +
                            jsonObj + '</span>';
            if (type === "string") {
                prettyJson = '"' + prettyJson + '"';
            }
            notObject = true;
        } else {
            var checkboxes = true;
            prettyJson = prettifyJson(jsonObj, null, checkboxes,
                                      {inarray: isArray});
            prettyJson = '<div class="jObject"><span class="jArray jInfo">' +
                         prettyJson +
                         '</span></div>';
            if (isArray) {
                prettyJson = '[' + prettyJson + ']';
            } else {
                prettyJson = '{' + prettyJson + '}';
            }
        }

        // var $jsonWrap = $jsonArea.find('.jsonWrap:last');
        var rowNum = xcHelper.parseRowNum($jsonTd.closest('tr')) + 1;
        var tableId = xcHelper.parseTableId($jsonTd.closest('table'));
        var tableName = gTables[tableId].tableName;

        $jsonArea.append(getJsonWrapHtml(prettyJson, tableName, rowNum));

        addDataToJsonWrap($jsonArea, $jsonTd, isArray);
    }

    function compare(jsonObjs, indices, multiple) {
        if (jsonObjs.length < 2) {
            return;
        }

        jsonObjs = xcHelper.deepCopy(jsonObjs);
        var numExistingComparisons = Object.keys(comparisonObjs).length;
        var numObjs = jsonObjs.length + numExistingComparisons;
        var numKeys;
        var keys;

        if (multiple) {
            var obj = Object.keys(comparisonObjs);
            var matches = comparisonObjs[obj[0]].matches;
            var partials = comparisonObjs[obj[0]].partial;
            var nonMatches = comparisonObjs[obj[0]].unmatched;
            var activeObj = {matches: [], partial: [], unmatched: []};
            var tempPartials = [];
            var numMatches = matches.length;
            var numPartials = partials.length;

            for (var i = 0; i < numMatches; i++) {
                var key = Object.keys(matches[i])[0];
                var possibleMatch = matches[i];
                var tempActiveObj = {};
                var tempObj;
                var compareResult = xcHelper.deepCompare(possibleMatch[key],
                                                          jsonObjs[key]);
                if (compareResult) {
                    activeObj.matches.push(possibleMatch);
                } else if (jsonObjs.hasOwnProperty(key)) {
                    for (var k in comparisonObjs) {
                        tempObj = comparisonObjs[k].matches.splice(i, 1)[0];
                        comparisonObjs[k].partial.push(tempObj);
                    }
                    tempActiveObj[key] = jsonObjs[key];
                    tempPartials.push(tempActiveObj);

                    numMatches--;
                    i--;
                } else {
                    for (var k in comparisonObjs) {
                        tempObj = comparisonObjs[k].matches.splice(i, 1)[0];
                        comparisonObjs[k].unmatched.push(tempObj);
                    }
                    numMatches--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (var i = 0; i < numPartials; i++) {
                var key = Object.keys(partials[i])[0];
                var tempActiveObj = {};
                var tempObj;
                if (jsonObjs.hasOwnProperty(key)) {
                    tempActiveObj[key] = jsonObjs[key];
                    activeObj.partial.push(tempActiveObj);
                } else {
                    for (var k in comparisonObjs) {
                        tempObj = comparisonObjs[k].partial.splice(i, 1)[0];
                        comparisonObjs[k].unmatched.push(tempObj);
                    }
                    tempActiveObj[key] = jsonObjs[key];
                    numPartials--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (var i = 0; i < nonMatches.length; i++) {
                var key = Object.keys(nonMatches[i])[0];
                var tempActiveObj = {};
                if (jsonObjs.hasOwnProperty(key)) {
                    tempActiveObj[key] = jsonObjs[key];
                    activeObj.unmatched.push(tempActiveObj);
                    delete jsonObjs[key];
                }
            }
            activeObj.partial = activeObj.partial.concat(tempPartials);
            activeObj.unmatched = activeObj.unmatched.concat(jsonObjs);
            comparisonObjs[indices] = activeObj;
        } else {
            keys = Object.keys(jsonObjs[0]);
            numKeys = keys.length;
            var matchedJsons = []; // when both objs have same key and values
            var unmatchedJsons = [];
            var partialMatchedJsons = []; // when both objs have the same key but different values

            for (var i = 0; i < numObjs; i++) {
                matchedJsons.push([]);
                unmatchedJsons.push([]);
                partialMatchedJsons.push([]);
            }
            for (var i = 0; i < numKeys; i++) {
                for (var j = 1; j < 2; j++) {
                    var key = keys[i];

                    var compareResult = xcHelper.deepCompare(jsonObjs[0][key],
                                                            jsonObjs[j][key]);

                    var obj = {};
                    obj[key] = jsonObjs[0][key];

                    if (compareResult) {
                        matchedJsons[0].push(obj);
                        matchedJsons[j].push(obj);
                        delete jsonObjs[j][key];
                    } else if (jsonObjs[j].hasOwnProperty(key)) {

                        partialMatchedJsons[0].push(obj);
                        var secondObj = {};
                        secondObj[key] = jsonObjs[j][key];
                        partialMatchedJsons[j].push(secondObj);

                        delete jsonObjs[j][key];
                    } else {
                        unmatchedJsons[0].push(obj);
                    }
                }
            }

            for (var i = 1; i < 2; i++) {
                for (var key in jsonObjs[i]) {
                    var obj = {};
                    obj[key] = jsonObjs[i][key];
                    unmatchedJsons[i].push(obj);
                }
            }

            for (var i = 0; i < indices.length; i++) {
                comparisonObjs[indices[i]] = {
                    matches  : matchedJsons[i],
                    partial  : partialMatchedJsons[i],
                    unmatched: unmatchedJsons[i]
                };
            }
            for (var i = 2; i < numObjs; i++) {
                compare(jsonObjs[i], indices[i], true);
            }
        }
    }

    function displayComparison(jsons) {
        for (var obj in jsons) {
            var html = "";
            for (var matchType in jsons[obj]) {
                var arrLen = jsons[obj][matchType].length;
                if (matchType === 'matches') {
                    html += '<div class="matched">';
                } else if (matchType === 'partial') {
                    html += '<div class="partial">';
                } else if (matchType === 'unmatched') {
                    html += '<div class="unmatched">';
                }
                for (var k = 0; k < arrLen; k++) {
                    html += prettifyJson(jsons[obj][matchType][k], null, null,
                                         {comparison: true});
                }
                html += '</div>';
            }
            html = html.replace(/,([^,]*)$/, '$1');// remove last comma

            html = '{<div class="jObject">' +
                        '<span class="jArray jInfo">' + html +
                        '</span>' +
                    '</div>}';
            $jsonArea.find('.jsonWrap').eq(obj)
                                       .addClass('comparison')
                                       .find('.prettyJson.secondary')
                                       .html(html);
        }
    }

    function addDataToJsonWrap($jsonArea, $jsonTd, isArray) {
        var $jsonWrap = $jsonArea.find('.jsonWrap:last');
        var rowNum = xcHelper.parseRowNum($jsonTd.closest('tr'));
        var colNum = xcHelper.parseColNum($jsonTd);
        var tableId = xcHelper.parseTableId($jsonTd.closest('table'));

        $jsonWrap.data('rownum', rowNum);
        $jsonWrap.data('colnum', colNum);
        $jsonWrap.data('tableid', tableId);
        $jsonWrap.data('isarray', isArray);

        if (isDataCol) {
            highlightCell($jsonTd, tableId, rowNum, colNum, false,
                            {jsonModal: true});
            var numFields = $jsonWrap.find('.primary').children().children()
                                                      .children().length;
            $jsonWrap.find('.colsSelected').data('totalcols', numFields)
                                           .text('0/' + numFields + ' selected');
        }

    }

    function getJsonWrapHtml(prettyJson, tableName, rowNum) {
        var html = '<div class="jsonWrap">';
        if (isDataCol) {
            html +=
            '<div class="optionsBar bar">' +
                '<div class="dragHandle jsonDragHandle">' +
                    '<i class="icon xi-drag-handle"></i>' +
                '</div>' +
                '<div class="compareIcon single checkbox" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.SelectOther + '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="vertLine"></div>' +
                '<div class="btn btn-small btn-secondary sort single" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.SortAsc + '">' +
                    // '<i class="icon xi-arrow-down"></i>' +
                    '<i class="icon xi-arrowtail-down"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary remove" data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.RemoveCol + '">' +
                    '<i class="icon xi-close"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary split" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.Duplicate + '">' +
                    '<i class="icon xi_split"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary binaryIcon" ' +
                'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + TooltipTStr.ComingSoon + '">' +
                    '<i class="icon"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary pullAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.PullAll + '">' +
                    '<i class="icon xi-pull-all-field"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary clearAll disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + 'deselect all columns' + '">' +
                    '<i class="icon xi-select-none"></i>' +
                '</div>' +
                '<div class="btn btn-small btn-secondary submitProject disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + 'submit projection' + '">' +
                    '<i class="icon xi-back-to-worksheet"></i>' +
                '</div>' +
                '<div class="text colsSelected disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + 'Number of fields selected to project' + '">' +
                '</div>' +
                '<div class="tabWrap">' +
                    '<div class="tabs">' +
                        '<div class="tab seeAll active" ' +
                        'data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'title="' + JsonModalTStr.SeeAllTip + '">' +
                            '<span class="icon"></span>' +
                            '<span class="text">' + JsonModalTStr.SeeAll +
                            '</span>' +
                        '</div>' +
                        '<div class="tab original" data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'title="' + JsonModalTStr.OriginalTip + '">' +
                            '<span class="icon"></span>' +
                            '<span class="text">' + JsonModalTStr.Original +
                            '</span>' +
                        '</div>' +
                        '<div class="tab xcOriginated" data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'title="' + JsonModalTStr.XcOriginatedTip + '">' +
                            '<span class="icon"></span>' +
                            '<span class="text">' + JsonModalTStr.XcOriginated +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                // '<div class="projectWrap">' +
                //      '<div class="checkbox">' +
                //         '<span class="icon"></span>' +
                //       '</div>' +
                //       '<div class="text">Project</div>' +
                //       '<div class="hint qMark" data-container="body" ' +
                //       'data-toggle="tooltip" ' +
                //       'title="Allow selection of columns to project"></div>' +
                // '</div>' +
                // '<div class="selectBtn selectAll hidden">' +
                //     "Select All" +
                // '</div>' +
                // '<div class="selectBtn clearAll hidden">' +
                //     "Clear All" +
                // '</div>' +
                // '<div class="submitProject hidden">' +
                //     "Submit" +
                // '</div>' +
                '<div class="dropdownBox btn btn-small btn-secondary">' +
                    '<i class="icon xi-down"></i>' +
                '</div>' +
            '</div>' +
            '<div class="infoBar bar">' +
                '<div class="tableName" ' +
                        'data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-placement="bottom" ' +
                        'title="' + tableName + '">Table:&nbsp;&nbsp;' +
                    '<span class="text">' + tableName + '</span>' +
                '</div>' +
                '<div class="rowNum">Row:&nbsp;&nbsp;' +
                    '<span class="text">' + rowNum.toLocaleString("en") + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="prettyJson primary">' +
                prettyJson +
            '</div>' +
            '<div class="prettyJson secondary"></div>' +
            '<ul class="jsonModalMenu menu">' +
                '<li class="selectionOpt">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">Selection Mode</span></li>' +
                '<li class="projectionOpt">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">Projection Mode</span>' +
                '</li>' +
            '</ul>' +
            '</div>';
        } else {
            html += '<div class="prettyJson singleView primary">' +
                prettyJson +
            '</div></div>';
        }

        return (html);
    }

    function resortJsons(initialIndex, newIndex) {
        var json = jsonData.splice(initialIndex, 1)[0];
        jsonData.splice(newIndex, 0, json);

        // var min = Math.min(initialIndex, newIndex);
        // var max = Math.max(initialIndex, newIndex);
        // var keys = Object.keys(comparisonObjs);
        if (initialIndex === newIndex) {
            return;
        }

        var tempObj = comparisonObjs[initialIndex];
        delete comparisonObjs[initialIndex];

        if (initialIndex > newIndex) {
            for (var i = initialIndex - 1; i >= newIndex; i--) {
                if (comparisonObjs[i]) {
                    comparisonObjs[i + 1] = comparisonObjs[i];
                    delete comparisonObjs[i];
                }
            }
        } else if (initialIndex < newIndex) {
            for (var i = initialIndex + 1; i <= newIndex; i++) {
                if (comparisonObjs[i]) {
                    comparisonObjs[i - 1] = comparisonObjs[i];
                    delete comparisonObjs[i];
                }
            }
        }
        if (tempObj) {
            comparisonObjs[newIndex] = tempObj;
        }
    }

    function toggleModal($jsonTd, isHide, time) {
        if (isDataCol && !isHide) {
            modalHelper.toggleBG("all", isHide, {"time": time});
        }
        var noTimer = false;
        if (time === 0) {
            noTimer = true;
        }

        var $table;
        var $tableWrap;
        if (isHide) {
            $table = $('.xcTable').removeClass('jsonModalOpen');
            $tableWrap = $('.xcTableWrap').removeClass('jsonModalOpen');

            $table.find('.modalHighlighted')
                  .removeClass('modalHighlighted jsonModalOpen');
            $('.modalOpen').removeClass('modalOpen');
            $('.tableCover.jsonCover').remove();
        } else {
            if (isDataCol) {
                $tableWrap = $('.xcTableWrap:visible:not(.tableLocked)')
                                  .addClass('jsonModalOpen');
                $table = $tableWrap.find('.xcTable').addClass('jsonModalOpen');

                $table.find('.jsonElement').addClass('modalHighlighted');
                var $tableCover = $('<div class="tableCover jsonCover" ' +
                                    'style="opacity:0;"></div>');

                $tableWrap.find('.xcTbodyWrap').append($tableCover);
                $tableWrap.each(function() {
                    // var tableHeight = $(this).find('.xcTable').height();
                    var tbodyHeight = $(this).find('.xcTable tbody').height();
                    $(this).find('.tableCover.jsonCover')
                           .height(tbodyHeight + 1);
                });

                $tableWrap.find('.tableCover.jsonCover').addClass('visible');
                $jsonModal.addClass('hidden').show();
                var hiddenClassTimer = 50;
                if (noTimer) {
                    hiddenClassTimer = 0;
                }
                setTimeout(function() {
                    $jsonModal.removeClass('hidden');
                }, hiddenClassTimer);
            } else {
                var shortTimer = 200;
                var longTimer = 300;
                if (noTimer) {
                    shortTimer = 0;
                    longTimer = 0;
                }
                $('#sideBarModal').fadeIn(longTimer);
                $('#bottomMenu').addClass('modalOpen');
                $modalBg.addClass('light').fadeIn(longTimer);
                setTimeout(function() {
                    $jsonModal.fadeIn(shortTimer);
                }, shortTimer);

                $jsonTd.addClass('modalHighlighted');
                setTimeout(function() {
                    $jsonTd.addClass('jsonModalOpen');
                });
            }
        }
    }

    function prettifyJson(obj, indent, checkboxes, options) {
        if (typeof obj !== "object") {
            return (JSON.stringify(obj));
        }

        var result = "";
        indent = indent || "";
        options = options || {};

        options.inarray = options.inarray || 0;

        for (var key in obj) {
            var value = obj[key];
            key = xcHelper.escapeHTMlSepcialChar(key);
            var dataKey = key.replace(/\"/g, "&quot;"); // replace " with &quot;
            switch (typeof value) {
                case ('string'):
                    value = xcHelper.escapeHTMlSepcialChar(value);
                    value = '"<span class="jString text">' + value + '</span>"';

                    if (options.inarray) {
                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + dataKey + '">' +
                                value +
                            '</span>, ';
                    }

                    break;
                case ('number'):
                    value = '<span class="jNum text">' + value + '</span>';

                    if (options.inarray) {

                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + dataKey + '">' +
                                value +
                            '</span>,';
                    }

                    break;
                case ('boolean'):
                    value = '<span class="jBool text">' + value + '</span>';

                    if (options.inarray) {
                        value += ',';
                    }

                    break;
                case ('object'):
                    if (value == null) {
                        value = '<span class="jNull text">' + value + '</span>';
                        if (options.inarray) {
                            value += ',';
                        }
                    } else if (value.constructor === Array) {
                        ++options.inarray;
                        var emptyArray = "";
                        if (value.length === 0) {
                            emptyArray = " emptyArray";
                        }
                        value =
                        '[<span class="jArray jInfo ' + emptyArray + '" ' +
                            'data-key="' + dataKey + '">' +
                            prettifyJson(value, indent, null, options) +
                        '</span>],';
                    } else {
                        var object = prettifyJson(value,
                                        indent + '&nbsp;&nbsp;&nbsp;&nbsp;');
                        if (object === "") {
                            value = '{<span class="emptyObj">\n' +
                                    object + indent + '</span>}';
                        } else {
                            value = '{\n' + object + indent + '}';
                        }

                        if (options.inarray) {
                            value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + dataKey + '">' +
                                value +
                            '</span>,';
                        }
                    }

                    break;
                default:
                    value = '<span class="jUndf text">' + value + '</span>';
                    if (options.inarray) {
                        value += ',';
                    }

                    break;
            }

            if (options.inarray) {
                result += value;
            } else {
                value = value.replace(/,$/, "");
                result +=
                    '<div class="jsonBlock jInfo" data-key="' + dataKey + '">';
                if (checkboxes) {
                    result += '<div class="checkbox jsonCheckbox">' +
                                '<i class="icon xi-ckbox-empty fa-11"></i>' +
                                '<i class="icon xi-ckbox-selected fa-11"></i>' +
                              '</div>';
                }
                result += indent +
                        '"<span class="jKey text">' + dataKey + '</span>": ' +
                        value + ',' +
                    '</div>';
            }
        }

        --options.inarray;

        if (options.comparison) {
            // removes last comma unless inside div
            return (result.replace(/\, $/, "").replace(/\,$/, ""));
        } else {
            // .replace used to remove comma if last value in object
            return (result.replace(/\,<\/div>$/, "</div>").replace(/\, $/, "")
                                                          .replace(/\,$/, ""));

        }
    }

    function createJsonSelectionExpression($el) {
        var name        = "";
        var escapedName = "";

        // .parents() is different with .closest()
        $el.parents(".jInfo").each(function(){
            var $jInfo     = $(this);
            var key        = "";
            var escapedKey = "";
            // var modifiedKey = "";
            var needsBrackets = false;
            var needsDot = false;

            if ($jInfo.parent().hasClass('jArray') &&
                !$jInfo.hasClass('jsonBlock')) {
                key = $jInfo.data('key');
                needsBrackets = true;

            } else if (!$jInfo.hasClass('jArray')) {
                key = $jInfo.data('key');
                needsDot = true;
            }
            key += "";
            // escapedKey = xcHelper.escapeColName(key);
            escapedKey = key;

            if (needsBrackets) {
                key = "[" + key + "]";
                escapedKey = "[" + escapedKey + "]";
            } else if (needsDot) {
                key = "." + key;
                escapedKey = "." + escapedKey;
            }

            name = key + name;
            escapedName = escapedKey + escapedName;
        });

        if (name.charAt(0) === '.') {
            name = name.substr(1);
            escapedName = escapedName.substr(1);
        }

        return ({"name"       : name,
                 "escapedName": escapedName});
    }

    function submitProject(index) {
        var colNames = [];
        var $jsonWrap = $('.jsonWrap').eq(index);
        $jsonWrap.find('.projectSelected').each(function() {
            colNames.push($(this).text());
        });

        if (colNames.length) {
            var tableId = $jsonWrap.data('tableid');
            xcFunction.project(colNames, tableId);
            closeJSONModal();
        } else {
            // shouldn't have been able to submit anyways
            console.warn('no columns selected');
        }
    }

    function addMenuActions() {
        var $li;
        var $menu;
        var $jsonWrap;
        $jsonArea.on("click", ".menu li", function() {
            $li = $(this);
            $menu = $li.closest('.menu');
            $jsonWrap = $menu.closest('.jsonWrap');
            if ($li.hasClass('projectionOpt')) {
                $jsonWrap.addClass('projectMode');
                if ($jsonWrap.find('.compareIcon.on').length) {
                    compareIconSelect($jsonWrap.find('.compareIcon'));
                }
            } else if ($li.hasClass('selectionOpt')) {
                $jsonWrap.removeClass('projectMode');
                clearAllProjectedCols($jsonWrap.find('.clearAll'));
            }
            $menu.hide();
        });
    }

    return (JSONModal);
}(jQuery, {}));
