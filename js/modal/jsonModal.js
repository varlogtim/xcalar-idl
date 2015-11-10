window.JSONModal = (function($, JSONModal) {
    var $jsonModal = $("#jsonModal");
    var $jsonArea = $jsonModal.find(".jsonArea");
    var $modalBackground = $("#modalBackground");
    var $searchInput = $('#jsonSearch').find('input');
    var $jsonText = $jsonModal.find('.prettyJson');
    var $counter = $('#jsonSearch').find('.counter');
    var $matches;
    var numMatches = 0;
    var matchIndex;
    var isDataCol;
    var comparisonObjs = {};
    var jsonData = [];

    var minHeight = 300;
    var minWidth  = 300;
    var modalHelper = new xcHelper.Modal($jsonModal, {
        "minHeight" : minHeight,
        "minWidth"  : minWidth,
        "noTabFocus": true
    });
    var searchHelper;

    JSONModal.setup = function() {
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
            handle: '.jsonDragArea',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $jsonModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });

        $jsonArea.sortable({
            revert: 300,
            axis: "x",
            handle: ".jsonDragHandle"
            // containment: "parent"
        });

        addEventListeners();
    };

    JSONModal.show = function ($jsonTd, isArray) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }

        xcHelper.removeSelectionRange();
        var isModalOpen = $jsonModal.is(':visible');
        isDataCol = $jsonTd.hasClass('jsonElement');

        if (!isModalOpen) {
            $(".tooltip").hide();
            var tableTitle = $jsonTd.closest(".xcTableWrap")
                                .find(".xcTheadWrap .tableTitle .text")
                                .data("title");
            $(".xcTable").find(".highlightBox").remove();
            $jsonModal.find(".jsonDragArea").text(tableTitle);
            $searchInput.val("");
            centerPositionElement($jsonModal);
            jsonModalDocumentEvent($jsonTd, isArray);
            $("body").addClass("hideScroll");

        }
        
        refreshJsonModal($jsonTd, isArray, isModalOpen); // shows json modal

        if (isModalOpen) {
            updateSearchResults();
            searchText();
        }

        increaseModalSize();
    };

    function addEventListeners() {
        var $searchArea = $('#jsonSearch');
        searchHelper = new xcHelper.SearchBar($searchArea, {
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
            searchHelper.clearSearch(function() {
                var focus = true;
                clearSearch(focus);
            });
        });
        $jsonModal.find('.searchIcon').click(toggleSearch);

        $jsonArea.on({
            "click": function() {
                var $el = $(this);
                var $jsonWrap = $el.closest('.jsonWrap');
                var tableId   = $jsonWrap.data('tableid');
                var colNum    = $jsonWrap.data('colnum');
                var isArray   = $jsonWrap.data('isarray');
                var nameInfo  = createJsonSelectionExpression($el);

                var pullColOptions = {
                    "isDataTd" : isDataCol,
                    "isArray"  : isArray,
                    "noAnimate": true
                };
                ColManager.pullCol(colNum, tableId, nameInfo, pullColOptions)
                .always(function() {
                    closeJSONModal();
                });
            }
        }, ".jKey, .jArray>.jString, .jArray>.jNum");

        $jsonArea.on("click", ".checkMark", function() {
            var $checkMark = $(this);
            var $checkMarks = $jsonArea.find('.checkMark.on');
            var numCheckMarks = $checkMarks.length;
            var isSearchUpdateNeeded = true;
            var multipleComparison = false;
            var newComparisonNum;

            if ($checkMark.hasClass('on')) {// uncheck this jsonwrap
                
                $checkMark.removeClass('on first');
                $checkMark.closest('.jsonWrap')
                          .removeClass('active comparison');

                //designate any other active checkmark as the anchor
                $jsonArea.find('.checkMark.on').addClass('first');

                $jsonArea.find('.comparison').find('.prettyJson.secondary')
                                             .empty();
                $jsonArea.find('.comparison').removeClass('comparison');
                comparisonObjs = {}; // empty any saved comparisons

            } else { // check this jsonWrap
                if (numCheckMarks === 0) {
                    $checkMark.addClass('first');
                    isSearchUpdateNeeded = false;
                } else if (numCheckMarks > 1) {
                    multipleComparison = true;
                    newComparisonNum = $checkMark.closest('.jsonWrap').index();
                }
                $checkMark.addClass('on');
                $checkMark.closest('.jsonWrap').addClass('active');
            }
            
            $checkMarks = $jsonArea.find('.checkMark.on');

            // only run comparison if more than 2 checkmarks are on
            if ($checkMarks.length > 1) {
                var indices = [];
                var objs = [];

                if (multipleComparison) {
                    compare(jsonData[newComparisonNum], newComparisonNum,
                            multipleComparison);
                } else {
                    $checkMarks.each(function() {
                        var index = $(this).closest('.jsonWrap').index();
                        indices.push(index);
                        objs.push(jsonData[index]);
                    });
                    compare(objs, indices);
                }
                displayComparison(comparisonObjs);
            }

            if (isSearchUpdateNeeded && $checkMarks.length !== 0) {
                updateSearchResults();
                searchText();
            }
            
        });

        $jsonArea.on("click", ".split", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            duplicateView($jsonWrap);
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
            var numCheckMarks = $jsonArea.find('.checkMark.on').length;
            var isMainCheckmark = $jsonWrap.find('.checkMark.first')
                                           .length !== 0;
            
            $jsonWrap.find('.remove').tooltip('destroy');
            $jsonWrap.remove();
            if (isMainCheckmark) {
                $jsonArea.find('.checkMark.on').addClass('first');
            }

            var numCheckMarks = $jsonWrap.find('.checkMark.on').length;
            if (numCheckMarks === 1) {
                $jsonArea.find('.comparison').find('.prettyJson.secondary')
                                             .empty();
                $jsonArea.find('.comparison').removeClass('comparison');
            }

            var index = $jsonWrap.index();
            jsonData.splice(index, 1);
            decreaseModalSize();
            updateSearchResults();
            searchText();
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

    function duplicateView($jsonWrap) {
        var $jsonClone = $jsonWrap.clone();
        $jsonClone.data('colnum', $jsonWrap.data('colnum'));
        $jsonClone.data('rownum', $jsonWrap.data('rownum'));
        $jsonClone.data('tableid', $jsonWrap.data('tableid'));

        var index = $jsonWrap.index();
        jsonData.splice(index + 1, 0, jsonData[index]);
        $jsonWrap.after($jsonClone);
        // $jsonArea.append($jsonClone);
        $jsonClone.removeClass('active comparison');
        $jsonClone.find('.selected').removeClass('selected');
        $jsonClone.find('.checkMark').removeClass('on first');
        $jsonClone.find('.prettyJson.secondary').empty();

        var jsonWrapData = $jsonClone.data();
        var $highlightBox = $('#xcTable-' + jsonWrapData.tableid)
                                .find('.row' + jsonWrapData.rownum)
                                .find('td.col' + jsonWrapData.colnum)
                                .find('.jsonModalHighlightBox');
        $highlightBox.data().count++;

        increaseModalSize();

        // reset some search variables to include new jsonWrap
        updateSearchResults();
    }

    function increaseModalSize() {
        var numJsons = jsonData.length;
        var winWidth = $(window).width();
        var currentWidth = $jsonModal.width();
        var maxWidth = winWidth - $jsonModal.offset().left;
        
        var desiredWidth = Math.min(numJsons * 200, maxWidth);
    
        if (currentWidth < desiredWidth) {
            var newWidth = Math.min(desiredWidth, currentWidth + 200);
            $jsonModal.width(newWidth);
            centerPositionElement($jsonModal, {horizontalOnly: true});
        }
    }

    function decreaseModalSize() {
        var currentWidth = $jsonModal.width();
        var minWidth = Math.min(500, currentWidth);
        var desiredWidth = Math.max(jsonData.length * 200, minWidth);

        if (currentWidth > desiredWidth) {
            var newWidth = Math.max(desiredWidth, currentWidth - 100);
            $jsonModal.width(newWidth);
            centerPositionElement($jsonModal, {horizontalOnly: true});
        }
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

    function jsonModalDocumentEvent($jsonTd, isArray) {
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
        $targets = $jsonText.find('.text').filter(function() {
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
        $(document).off(".jsonModal");
        searchHelper.$matches = [];
        $('.modalHighlighted').removeClass('modalHighlighted');
        searchHelper.clearSearch(function() {
            clearSearch();
        });
        $('#jsonSearch').addClass('closed');
        $('.jsonModalHighlightBox').remove();
        toggleModal(null, true, 200);

        $jsonModal.hide();
        $modalBackground.hide();
        Tips.refresh();
        $jsonArea.empty();
        $jsonModal.width(500);
        $modalBackground.removeClass('light');

        jsonData = [];
        comparisonObjs = {};
        $jsonText = null;

        $('#sideBarModal').hide();
        $('#rightSideBar').removeClass('modalOpen');
        $("body").removeClass("hideScroll");
    }

    function refreshJsonModal($jsonTd, isArray, isModalOpen) {
        var text = $jsonTd.find("div").eq(0).text();
        if (isArray) {
            text = text.split(', ');
            text = JSON.stringify(text);
        }

        var jsonObj;

        try {
            jsonObj = jQuery.parseJSON(text);
        } catch (error) {
            console.error(error, text);
            closeJSONModal();
            return;
        }
        jsonData.push(jsonObj);

        if (!isModalOpen) {
            var height = Math.min(500, $(window).height());
            $jsonModal.height(height).width(500);
       
            if (gMinModeOn) {
                $('#sideBarModal').show();
                $modalBackground.show();
                $jsonModal.show();
            } else {
                toggleModal($jsonTd, false, 200);
            }
        }

        if (gMinModeOn || isModalOpen) {
            fillJsonArea(jsonObj, $jsonTd, isArray);
            if (!isModalOpen) {
                $jsonText = $jsonModal.find('.prettyJson:visible');
                searchHelper.$matches = $jsonText.find('.highlightedText');
            }
        } else {
            fillJsonArea(jsonObj, $jsonTd, isArray);
            $jsonText = $jsonModal.find('.prettyJson:visible');
            searchHelper.$matches = $jsonText.find('.highlightedText');
        }
    }

    function fillJsonArea(jsonObj, $jsonTd, isArray) {
        var prettyJson = prettifyJson(jsonObj, null, {inarray: isArray});
        prettyJson = '<div class="jObject"><span class="jArray jInfo">' +
                         prettyJson +
                         '</span></div>';
        if (isArray) {
            prettyJson = '[' + prettyJson + ']';
        } else {
            prettyJson = '{' + prettyJson + '}';
        }
        var $jsonWrap = $(getJsonWrapHtml());
        $jsonWrap.find('.prettyJson.primary').html(prettyJson);
        $jsonArea.append($jsonWrap);

        addDataToJsonWrap($jsonWrap, $jsonTd, isArray);
    }

    function compare(jsonObjs, indices, multiple) {
        if (jsonObjs.length < 2) {
            return;
        }

        jsonObjs = xcHelper.deepCopy(jsonObjs);
        var numExistingComparisons = Object.keys(comparisonObjs).length;
        var numObjs = jsonObjs.length + numExistingComparisons;
        
        if (!multiple) {
            var keys = Object.keys(jsonObjs[0]);
            var numKeys = keys.length;
            var matchedJsons = []; // when both objs have same key and values
            var unmatchedJsons = [];
            var partialMatchedJsons = []; // when both objs have the same key but different values
        
            for (var i = 0; i < numObjs; i++) {
                matchedJsons.push([]);
                unmatchedJsons.push([]);
                partialMatchedJsons.push([]);
            }
        }
        
        if (multiple) {
            var obj = Object.keys(comparisonObjs);
            var matches = comparisonObjs[obj[0]].matches;
            var partials = comparisonObjs[obj[0]].partial;
            var nonMatches = comparisonObjs[obj[0]].unmatched;
            var activeObj = {matches:[], partial: [], unmatched: []};
            var tempPartials = [];
            var numMatches = matches.length;
            var numPartials = partials.length;

            for (var i = 0; i < numMatches; i++) {
                var key = Object.keys(matches[i])[0];
                var possibleMatch = matches[i];
                var tempActiveObj = {};
                var tempObj;
                var compareResult = deepCompare(possibleMatch[key],
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
                    tempActiveObj[key] = jsonObjs[key];
                    activeObj.unmatched.push(tempActiveObj);
                    numMatches--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (var i = 0; i < numPartials; i++) {
                var key = Object.keys(partials[i])[0];
                var possiblePartial = partials[i];
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
                    activeObj.unmatched.push(tempActiveObj);
                    numPartials--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (var i = 0; i < nonMatches.length; i++) {
                var key = Object.keys(nonMatches[i])[0];
                var nonMatch = nonMatches[i];
                var tempActiveObj = {};
                tempActiveObj[key] = jsonObjs[key];
                activeObj.unmatched.push(tempActiveObj);
                delete jsonObjs[key];
            }
            activeObj.partial = activeObj.partial.concat(tempPartials);
            activeObj.unmatched = activeObj.unmatched.concat(jsonObjs);
            comparisonObjs[indices] = activeObj;
        } else {
            for (var i = 0; i < numKeys; i++) {
                for (var j = 1; j < 2; j++) {
                    var key = keys[i];
                    
                    var compareResult = deepCompare(jsonObjs[0][key],
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
                comparisonObjs[indices[i]] = { matches: matchedJsons[i],
                                               partial: partialMatchedJsons[i],
                                               unmatched: unmatchedJsons[i]
                                            };
            }
            for (var i = 2; i < numObjs; i++) {
                compare(jsonObjs[i], indices[i], true);
            }
        }
    }

    function displayComparison(jsons) {
        var matchTypes = 3;
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

    function deepCompare () {
        var leftChain;
        var rightChain;

        function compare2Objects (x, y) {

            // check if both are NaN
            if (isNaN(x) && isNaN(y) && typeof x === 'number'
                && typeof y === 'number') {
                return (true);
            }

            if (x === y) {
                return (true);
            }

            if (!(x instanceof Object && y instanceof Object)) {
                return (false);
            }

            // Check for infinitive linking loops
            if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                return (false);
            }

            // Quick checking of one object being a subset of another.
            // todo: cache the structure of arguments[0] for performance
            for (var p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return (false);
                } else if (typeof y[p] !== typeof x[p]) {
                    return (false);
                }
            }

            for (var p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return (false);
                } else if (typeof y[p] !== typeof x[p]) {
                    return (false);
                }

                switch (typeof (x[p])) {
                    case ('object'):
                    case ('function'):

                        leftChain.push(x);
                        rightChain.push(y);

                        if (!compare2Objects (x[p], y[p])) {
                            return (false);
                        }

                        leftChain.pop();
                        rightChain.pop();
                        break;
                    default:
                        if (x[p] !== y[p]) {
                            return (false);
                        }
                        break;
                }
            }

            return (true);
        }

        if (arguments.length < 1) {
            return (true);
        }
        var len = arguments.length;
        for (var i = 1; i < len; i++) {

            leftChain = []; //Todo: this can be cached
            rightChain = [];

            if (!compare2Objects(arguments[0], arguments[i])) {
                return (false);
            }
        }

        return (true);
    }

    function addDataToJsonWrap($jsonWrap, $jsonTd, isArray) {
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

    function getJsonWrapHtml() {
        var html = '<div class="jsonWrap">';
        if (isDataCol) {
            html += 
            '<div class="optionsBar">' +
                '<div class="dragHandle jsonDragHandle"></div>' +
                '<div class="vertLine"></div>' +
                '<div class="checkMark multiple" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="Click to select for comparison">' +
                '</div>' +
                '<div class="checkMark one" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="Select another data cell from a table to compare">' +
                '</div>' +
                '<div class="btn btnDeselected remove" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="Remove this column">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected split" data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="Duplicate this column">' +
                    '<div class="icon"></div>' +
                '</div>' +
                '<div class="btn btnDeselected binaryIcon" ' +
                'data-toggle="tooltip"' +
                    'data-container="body" ' +
                    'title="coming soon">' +
                    '<div class="icon"></div>' +
                '</div>' +
            '</div>' +
            '<div class="prettyJson primary"></div>' +
            '<div class="prettyJson secondary"></div>' +
            '</div>';
        } else {
            html += '<div class="prettyJson singleView primary"></div></div>';
        }

        return (html);
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

        if (isHide) { 
            var $table = $('.xcTable').removeClass('jsonModalOpen');
            var $tableWrap = $('.xcTableWrap').removeClass('jsonModalOpen');
            $table.find('.modalHighlighted')
                  .removeClass('modalHighlighted jsonModalOpen');
            $('.modalOpen').removeClass('modalOpen');
            $('.tableCover').remove();
        } else { 
            if (isDataCol) {
                var $table = $('.xcTable:visible').addClass('jsonModalOpen');
                var $tableWrap = $('.xcTableWrap:visible')
                                  .addClass('jsonModalOpen');

                $table.find('.jsonElement').addClass('modalHighlighted');
                var $tableCover = $('<div class="tableCover" ' +
                                    'style="opacity:0;"></div>');

                $tableWrap.find('.xcTbodyWrap').append($tableCover);
                $tableWrap.each(function () {
                    var tableHeight = $(this).find('.xcTbodyWrap').height();
                    $(this).find('.tableCover').height(tableHeight - 40);
                });
                
                $tableWrap.find('.tableCover').addClass('visible');
                $jsonModal.addClass('hidden').show();
                setTimeout(function() {
                    $jsonModal.removeClass('hidden');
                }, 50);
            } else {
                $('#sideBarModal').fadeIn(300);
                $('#rightSideBar').addClass('modalOpen');
                $modalBackground.addClass('light').fadeIn(300);
                setTimeout(function() {
                    $jsonModal.fadeIn(200);
                }, 200);
                
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
            key = key.replace(/\</g, "&lt;")
                     .replace(/\>/g, "&gt;");

            switch (typeof value) {
                case ('string'):
                    value = value.replace(/\</g, "&lt;")
                                 .replace(/\>/g, "&gt;");
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
                        value =
                            '[<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                prettifyJson(value, indent, options) +
                            '</span>],';
                    } else {
                        var object = prettifyJson(value,
                                        indent + '&nbsp;&nbsp;&nbsp;&nbsp;');

                        value = '{\n' + object + indent + '}';

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

            escapedKey = key;

            if (key.substr(1).indexOf('.') > -1) {
                escapedKey = key.replace(/\./g, "\\\.").substr(1);
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

    return (JSONModal);
}(jQuery, {}));
