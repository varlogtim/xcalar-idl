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

    // constant
    var minHeight = 300;
    var minWidth  = 300;
    var jsonAreaMinWidth = 340;
    window.gProjectOff = true;

    JSONModal.setup = function() {
        $jsonModal = $("#jsonModal");
        $jsonArea = $jsonModal.find(".jsonArea");
        $modalBg = $("#modalBackground");
        $searchInput = $('#jsonSearch').find('input');
        $jsonText = $jsonModal.find('.prettyJson');
        $counter = $('#jsonSearch').find('.counter');

        modalHelper = new ModalHelper($jsonModal, {
            "minHeight" : minHeight,
            "minWidth"  : minWidth,
            "noTabFocus": true,
            "noEsc"     : true
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

        $jsonModal.draggable({
            handle     : '.jsonDragArea',
            cursor     : '-webkit-grabbing',
            containment: "window"
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
            }
            // containment: "parent"
        });

        addEventListeners();
        addMenuActions();
    };

    // type is only included if not a typical array or object
    JSONModal.show = function ($jsonTd, isArray, type) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }

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

        $jsonArea.on("click", ".compareIcon", function() {
            compareIconSelect($(this));
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
        $jsonWrap.find('.submitProject').addClass('disabled');
        $jsonWrap.find('.clearAll').addClass('disabled');
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
                if ($jsonWrap.find('.projectSelected').length === 0) {
                    $jsonWrap.find('.submitProject').addClass('disabled');
                    $jsonWrap.find('.clearAll').addClass('disabled');
                }
            } else {
                if ($el.parent('.jArray').length === 0) {
                    $el.addClass('projectSelected');
                    $jsonWrap.find('.submitProject').removeClass('disabled');
                    $jsonWrap.find('.clearAll').removeClass('disabled');
                }
            }
        } else {
            var nameInfo = createJsonSelectionExpression($el);
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
                    var animation = gMinModeOn ? false : true;
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
                var animation = gMinModeOn ? false : true;
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
                centerPositionElement($jsonModal, {horizontalOnly: true});
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
                centerPositionElement($jsonModal, {horizontalOnly: true});
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
        searchHelper.$matches = $jsonText.find('.highlightedText');
        searchHelper.numMatches = searchHelper.$matches.length;
        matchIndex = 0;
        var position = Math.min(1, searchHelper.numMatches);
        $counter.find('.position').text(position);
        $counter.find('.total').text('of ' + searchHelper.numMatches);
        $searchInput.css("padding-right", $counter.width() + 25);

        searchHelper.$matches.eq(0).addClass('selected');
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
            $('#rightSideBar').removeClass('modalOpen');
            $("body").removeClass("hideScroll");
            $('.tooltip').hide();

            return PromiseHelper.resolve();
        }});

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
            var title = "Click to select for comparison";
            $compareIcons.each(function() {
                $compareIcon = $(this);
                if ($compareIcon.attr('title')) {
                    $compareIcon.attr('title', title);
                } else {
                    $compareIcon.attr('data-original-title', title);
                }
            });
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
            prettyJson = prettifyJson(jsonObj, null, {inarray: isArray});
            prettyJson = '<div class="jObject"><span class="jArray jInfo">' +
                         prettyJson +
                         '</span></div>';
            if (isArray) {
                prettyJson = '[' + prettyJson + ']';
            } else {
                prettyJson = '{' + prettyJson + '}';
            }
        }

        $jsonArea.append(getJsonWrapHtml(prettyJson));

        if (window.gProjectOff) {
            $jsonModal.find('.dropdownBox').hide();
        }

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
                    html += prettifyJson(jsons[obj][matchType][k], null,
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
        }

    }

    function getJsonWrapHtml(prettyJson) {
        var html = '<div class="jsonWrap">';
        if (isDataCol) {
            html +=
            '<div class="optionsBar">' +
                '<div class="dragHandle jsonDragHandle"></div>' +
                '<div class="vertLine"></div>' +
                '<div class="btn btnDeselected compareIcon single" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.SelectOther + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected remove" data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.RemoveCol + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected split" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.Duplicate + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected binaryIcon" ' +
                'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + TooltipTStr.ComingSoon + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected pullAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.PullAll + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected clearAll disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + 'deselect all columns' + '">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected submitProject disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + 'submit projection' + '">' +
                    '<div class="icon"></div>' +
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
                '<div class="dropdownBox">' +
                    '<div class="icon"></div>' +
                '</div>' +
            '</div>' +
            '<div class="prettyJson primary">' +
                prettyJson +
            '</div>' +
            '<div class="prettyJson secondary"></div>' +
            '<ul class="jsonModalMenu menu">' +
                '<li class="selectionOpt">' +
                    '<span class="check"></span>' +
                    '<span class="text">Selection Mode</span></li>' +
                '<li class="projectionOpt">' +
                    '<span class="check"></span>' +
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
        // return;
        if (isDataCol && !isHide) {
            // setTimeout(function() {
            xcHelper.toggleModal("all", isHide, {
                "fadeOutTime": time
            });
            // }, 0);
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
                $tableWrap.each(function () {
                    var tableHeight = $(this).find('.xcTable').height();
                    $(this).find('.tableCover.jsonCover')
                           .height(tableHeight - 36);
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
                $('#rightSideBar').addClass('modalOpen');
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

    function prettifyJson(obj, indent, options) {
        if (typeof obj != "object") {
            return (JSON.stringify(obj));
        }

        var result = "";
        indent = indent || "";
        options = options || {};

        options.inarray = options.inarray || 0;

        for (var key in obj) {
            var value = obj[key];
            key = xcHelper.escapeHTMlSepcialChar(key);

            switch (typeof value) {
                case ('string'):
                    value = xcHelper.escapeHTMlSepcialChar(value);
                    value = '"<span class="jString text">' + value + '</span>"';

                    if (options.inarray) {
                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                value +
                            '</span>, ';
                    }

                    break;
                case ('number'):
                    value = '<span class="jNum text">' + value + '</span>';

                    if (options.inarray) {
                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
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
                            'data-key="' + key + '">' +
                            prettifyJson(value, indent, options) +
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
                                'data-key="' + key + '">' +
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
                    '<div class="jsonBlock jInfo" data-key="' + key + '">' +
                        indent +
                        '"<span class="jKey text">' + key + '</span>": ' +
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

            if ($jInfo.parent().hasClass('jArray') &&
                !$jInfo.hasClass('jsonBlock')) {
                key = '[' + $jInfo.data('key') + ']';
            } else if (!$jInfo.hasClass('jArray')) {
                key = '.' + $jInfo.data('key');
            }

            escapedKey = xcHelper.escapeColName(key).substr(1);

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
        var tableName;
        var tableId;
        var dstTableName;
        var worksheet;
        var $jsonWrap = $('.jsonWrap').eq(index);
        $jsonWrap.find('.projectSelected').each(function() {
            colNames.push($(this).text());
        });

        if (colNames.length) {
            // XX This code should probably go inside xcFunctions

            tableId = $jsonWrap.data('tableid');
            tableName = gTables[tableId].tableName;

            dstTableName = tableName.split("#")[0] + Authentication.getHashId();
            worksheet = WSManager.getWSFromTable(tableId);
            var txId = Transaction.start({
                "msg"      : StatusMessageTStr.Project,
                "operation": SQLOps.Project
            });
            xcHelper.lockTable(tableId);

            closeJSONModal();

            var startTime = Date.now();
            var focusOnTable = false;
            var startScrollPosition = $('#mainFrame').scrollLeft();

            XcalarProject(colNames, tableName, dstTableName, txId)
            .then(function() {
                var timeAllowed = 1000;
                var endTime = Date.now();
                var elapsedTime = endTime - startTime;
                var timeSinceLastClick = endTime -
                                         gMouseEvents.getLastMouseDownTime();
                // we'll focus on table if its been less than timeAllowed OR
                // if the user hasn't clicked or scrolled
                if (elapsedTime < timeAllowed ||
                    (timeSinceLastClick >= elapsedTime &&
                        ($('#mainFrame').scrollLeft() === startScrollPosition))) {
                    focusOnTable = true;
                }
                var options = {"focusWorkspace": focusOnTable};

                // var $dataCol = $("#xcTable-" + tableId).find('th.dataCol');
                // var dataColNum = xcHelper.parseColNum($dataCol) - 1;
                var tableCols = gTables[tableId].tableCols;
                tableCols = xcHelper.deepCopy(tableCols);
                var finalTableCols = [];
                for (var i = 0; i < tableCols.length; i++) {
                    if (colNames.indexOf(tableCols[i].backName) > -1) {
                        finalTableCols.push(tableCols[i]);
                    } else if (tableCols[i].backName === "DATA") {
                        var dataCol = ColManager.newDATACol();
                        finalTableCols.push(dataCol);
                    }
                }

                // var dataCol = gTables[tableId].tableCols[dataColNum];
                // var tableCols = [xcHelper.deepCopy(dataCol)];

                return TblManager.refreshTable([dstTableName], finalTableCols,
                                                null, worksheet, options);
            })
            .then(function() {
                xcHelper.unlockTable(tableId);
                var sql = {
                    "operation"   : SQLOps.Project,
                    "tableName"   : tableName,
                    "tableId"     : tableId,
                    "colNames"    : colNames,
                    "newTableName": dstTableName
                };

                var finalTableId = xcHelper.getTableId(dstTableName);

                Transaction.done(txId, {
                    "msgTable"      : finalTableId,
                    "sql"           : sql,
                    "noNotification": focusOnTable
                });
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ProjectFailed,
                    "error"  : error
                });
            });
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
