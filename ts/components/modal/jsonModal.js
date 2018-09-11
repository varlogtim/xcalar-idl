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
    var isSaveModeOff = false;
    var refCounts = {}; // to track clicked json tds
    var $lastKeySelected;
    var modes = {
        single: 'single',
        multiple: 'multiple'
    };
    var lastMode = modes.single;
    var selectedCols = []; // holds arrays of cols selected by user, 1 array per
                        // split json panel

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
        var minWidth = 300;

        modalHelper = new ModalHelper($jsonModal, {
            "minHeight": minHeight,
            "minWidth": minWidth,
            "noResize": true, // use it's own resize function
            "noTabFocus": true,
            "noEsc": true
        });

        $('#jsonModal .closeJsonModal').click(function() {
            if ($('#jsonModal').css('display') === 'block') {
                closeModal();
            }
        });

        $modalBg.click(function() {
            if (!isDataCol && $('#jsonModal').css('display') === 'block') {
                closeModal();
            }
        });

        var $jsonWraps;
        var modalMinWidth;
        var $tabSets;
        var small = false;

        $jsonModal.resizable({
            handles: "n, e, s, w, se",
            minHeight: minHeight,
            minWidth: minWidth,
            containment: "document",
            start: function() {
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
            axis: "x",
            handle: ".jsonDragHandle",
            start: function(event, ui) {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: function(event, ui) {
                resortJsons(initialIndex, $(ui.item).index());
                $(ui.item).css('top', 'auto');
            }
        });

        addEventListeners();
        addMenuActions();
    };

    // type is only included if not a typical array or object
    // options:
    //     type : string representing column data type
    //     saveModeOff: boolean, if true, will not save projectState
    JSONModal.show = function ($jsonTd, options) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }
        options = options || {};
        var type = options.type;
        isSaveModeOff = options.saveModeOff;

        xcHelper.removeSelectionRange();
        var isModalOpen = $jsonModal.is(':visible');
        isDataCol = $jsonTd.hasClass('jsonElement');
        if (isDataCol) {
            $jsonModal.removeClass('singleView');
        } else {
            $jsonModal.addClass('singleView');
        }

        if (!isModalOpen) {
            xcTooltip.hideAll();
            TblManager.unHighlightCells();
            $searchInput.val("");

            modalHelper.setup({
                "open": function() {
                    // json modal use its own opener
                    return PromiseHelper.resolve();
                }
            });
            jsonModalDocumentEvent();
        }

        // shows json modal
        refreshJsonModal($jsonTd, isModalOpen, type);

        if (isModalOpen) {
            updateSearchResults();
            searchText();
        }

        increaseModalSize();
    };

    JSONModal.rehighlightTds = function($table) {
        $table.find('.jsonElement').addClass('modalHighlighted');
        var tableId = xcHelper.parseTableId($table);
        $('#jsonModal').find('.jsonWrap').each(function() {
            var data = $(this).data();
            var jsonTableId = data.tableid;
            if (jsonTableId === tableId) {
                var $td = $table.find('.row' + data.rownum).find('.jsonElement');
                if ($td.length && !$td.find('.jsonModalHighlightBox').length) {
                    TblManager.highlightCell($td, jsonTableId,
                                            data.rownum, data.colnum,
                                            {jsonModal: true});
                }
            }
        });
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
            },
            "toggleSliderCallback": searchText,
            "onInput": function() {
                searchText();
            }
        });

        $jsonModal.find('.closeBox').click(function() {
            if ($searchInput.val() === "") {
                searchHelper.toggleSlider();
            } else {
                searchHelper.clearSearch(function() {
                    var focus = true;
                    clearSearch(focus);
                });
            }
        });

        $jsonArea.on({
            "click": function(event) {
                var $el = $(this);
                selectJsonKey($el, event);
            }
        }, ".jKey, .arrayEl");

        $jsonArea.on('click', '.jsonCheckbox', function(event) {
            var $checkbox = $(this);
            if (!$checkbox.hasClass('prefixCheckbox')) {
                var $key = $checkbox.siblings('.jKey, .arrayEl');
                if (!$key.length) {
                    $key = $checkbox.siblings();
                }
                if ($key.length) {
                    selectJsonKey($key, event);
                }
            }
        });

        $jsonArea.on("click", ".compareIcon", function() {
            compareIconSelect($(this));
        });

        $jsonArea.on("click", ".sort", function() {
            sortData($(this));
        });

        $jsonArea.on("click", ".pullAll", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            var rowNum = $jsonWrap.data('rownum');
            var colNum = $jsonWrap.data('colnum');
            var tableId = $jsonWrap.data('tableid');
            var rowExists = $('#xcTable-' + tableId).find('.row' + rowNum).length === 1;

            if (!rowExists) {
                // the table is scrolled past the selected row, so we just
                // take the jsonData from the first visibile row
                var rowManager = new RowManager(gTables[tableId], $("#xcTableWrap-" + tableId));
                rowNum = rowManager.getFirstVisibleRowNum() - 1;
            }

            closeModal(modes.single);
            //set timeout to allow modal to close before unnesting many cols
            setTimeout(function() {
                ColManager.unnest(tableId, colNum, rowNum);
            }, 0);
        });

        $jsonArea.on("click", ".remove", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            var jsonWrapData = $jsonWrap.data();

            // remove highlightbox if no other jsonwraps depend on it

            var id = jsonWrapData.tableid + jsonWrapData.rownum +
                     jsonWrapData.colnum;
            refCounts[id]--;
            if (refCounts[id] === 0) {
                var $highlightBox = $('#xcTable-' + jsonWrapData.tableid)
                                    .find('.row' + jsonWrapData.rownum)
                                    .find('td.col' + jsonWrapData.colnum)
                                    .find('.jsonModalHighlightBox');
                $highlightBox.closest("td").removeClass("highlightedCell");
                $highlightBox.remove();
                delete refCounts[id];
            }

            // handle removal of comparisons
            var index = $jsonWrap.index();
            $jsonWrap.find('.remove').tooltip('destroy');

            if ($jsonWrap.find('.compareIcon.selected').length) {
                $jsonWrap.find('.compareIcon').click();
            }

            $jsonWrap.remove();

            if ($jsonArea.find('.jsonWrap').length === 1) {
                var $compareIcons = $jsonArea.find('.compareIcon')
                                          .addClass('single');
                var title = JsonModalTStr.SelectOther;
                $compareIcons.each(function() {
                    xcTooltip.changeText($(this), title);
                });
            }

            jsonData.splice(index, 1);
            selectedCols.splice(index, 1);
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

        $jsonArea.on("click", ".clearAll", function() {
            clearAllSelectedCols($(this));
        });

        $jsonArea.on("click", ".selectAll", function() {
            selectAllFields($(this));
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

        $jsonArea.on("click", ".submitMultiPull", function() {
            var $jsonWrap = $(this).closest('.jsonWrap');
            var index = $jsonWrap.index();
            submitPullSome($jsonWrap, index);
        });

        $jsonArea.on("mousedown", ".tab", function() {
            selectTab($(this));
        });

        $jsonArea.on('mouseenter', '.tooltipOverflow', function() {
            xcTooltip.auto(this, $(this).find('.text')[0]);
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

            $(document).on("mouseup.dragHaFndleMouseUp", function() {
                $('#moveCursor').remove();
                $(document).off('.dragHandleMouseUp');
            });
        });
    }

    function selectTab($tab) {
        if ($tab.hasClass('active')) {
            return;
        }

        var isImmediate = $tab.hasClass('immediates');
        var isSeeAll = $tab.hasClass('seeAll');
        var $jsonWrap = $tab.closest('.jsonWrap');
        var $prefixGroups = $jsonWrap.find('.primary').find('.prefixGroup');
        $tab.closest('.tabs').find('.tab').removeClass('active');
        $tab.addClass('active');
        $jsonWrap.find(".brace").removeClass("empty");

        if ($jsonWrap.find(".compareIcon.selected").length) {
            // when switching tabs, uncompare, then recompare
            compareIconSelect($jsonWrap.find(".compareIcon"));
            compareIconSelect($jsonWrap.find(".compareIcon"));
        }

        if (isSeeAll) {
            $prefixGroups.removeClass('xc-hidden');
            $prefixGroups.find('.prefix').removeClass('xc-hidden');
            $jsonWrap.removeClass('tabFiltered');
            $jsonWrap.find('.groupType').removeClass('xc-hidden');
            $jsonWrap.find(".missingImmediatesSection").removeClass("xc-hidden");
        } else {
            $jsonWrap.addClass('tabFiltered');
            $prefixGroups.addClass('xc-hidden');
            $prefixGroups.find('.prefix').addClass('xc-hidden');
            if (isImmediate) {
                $prefixGroups.filter('.immediatesGroup').removeClass('xc-hidden');
                $jsonWrap.find('.prefixedType').addClass('xc-hidden');
                $jsonWrap.find('.immediatesType').removeClass('xc-hidden');
                $jsonWrap.find(".missingImmediatesSection").removeClass("xc-hidden");
                if (!$prefixGroups.filter('.immediatesGroup').length) {
                    $jsonWrap.find(".brace").addClass("empty");
                }
            } else {
                var prefix = $tab.data('id');
                $prefixGroups.find('.prefix').filter(function() {
                    return $(this).text() === prefix;
                }).parent().removeClass('xc-hidden');
                $jsonWrap.find('.prefixedType').removeClass('xc-hidden');
                $jsonWrap.find('.immediatesType').addClass('xc-hidden');
                $jsonWrap.find(".missingImmediatesSection").addClass("xc-hidden");
            }
        }
        searchHelper.clearSearch(function() {
            clearSearch();
        });
    }

    function compareIconSelect($compareIcon) {
        var $compareIcons = $jsonArea.find('.compareIcon.selected');
        var numComparisons = $compareIcons.length;
        var isSearchUpdateNeeded = true;
        var multipleComparison = false;
        var $jsonWrap = $compareIcon.closest(".jsonWrap");
        // var curIndex = $jsonWrap.index();

        if ($compareIcon.hasClass('selected')) {
            // uncheck this jsonwrap
            $compareIcon.removeClass('selected');
            $jsonArea.find('.comparison').find('.prettyJson.secondary')
                                         .empty();
            $compareIcon.closest('.jsonWrap').removeClass('active comparison');
            $jsonArea.find('.comparison').removeClass('comparison');
            comparisonObjs = {}; // empty any saved comparisons

        } else {
            // check this jsonWrap
            if (numComparisons === 0) {
                isSearchUpdateNeeded = false;
            } else if (numComparisons > 1) {
                multipleComparison = true;
            }
            $compareIcon.addClass('selected');
            $compareIcon.closest('.jsonWrap').addClass('active');
        }

        $compareIcons = $jsonArea.find('.compareIcon.selected');

        // only run comparison if more than 2 compareIcons are selected
        if ($compareIcons.length > 1) {
            if (multipleComparison) {
                var $jsonWrap = $compareIcon.closest('.jsonWrap');
                var index = $jsonWrap.index();
                var data = getDataObj($jsonWrap, index);
                compare(data, index, multipleComparison);
            } else {
                var indices = [];
                var objs = [];
                $compareIcons.each(function() {
                    var $curJsonWrap = $(this).closest('.jsonWrap');
                    var index = $curJsonWrap.index();
                    indices.push(index);
                    var data = getDataObj($curJsonWrap, index);
                    objs.push(data);
                });

                compare(objs, indices);
            }
            displayComparison(comparisonObjs);
        }

        if (isSearchUpdateNeeded && $compareIcons.length) {
            updateSearchResults();
            searchText();
        }
    }

    function getDataObj($jsonWrap, index) {
        var $activeTab = $jsonWrap.find(".tab.active");
        var data;
        if ($activeTab.hasClass("seeAll")) {
            data = jsonData[index].full;
        } else if ($activeTab.hasClass('immediates')) {
            data = jsonData[index].immediates;
        } else {
            var prefix = $activeTab.data("id");
            data = jsonData[index].prefixed[prefix];
        }
        return data;
    }

    function selectAllFields($btn) {
        var $jsonWrap = $btn.closest('.jsonWrap');
        var index = $jsonWrap.index();
        $jsonWrap.find(".jInfo").each(function() {
            if ($(this).hasClass("pulled")) {
                return true;
            }
            var $checkbox = $(this).children(".jsonCheckbox");
            var wasNotChecked = false;
            if (!$checkbox.hasClass("checked")) {
                wasNotChecked = true;
                $checkbox.addClass("checked");
            }

            var $key = $checkbox.siblings('.jKey, .arrayEl');
            if (!$key.length) {
                $key = $checkbox.siblings();
            }

            $key.addClass("keySelected");
            if (wasNotChecked) {
                var nameInfo = createJsonSelectionExpression($key);
                var colName = nameInfo.escapedName;
                selectedCols[index].push(colName);
            }
        });

        $jsonWrap.find('.submitMultiPull').removeClass('disabled');
        $jsonWrap.find('.clearAll').removeClass('disabled');
        updateNumPullColsSelected($jsonWrap);
        $lastKeySelected = null;
    }

    function clearAllSelectedCols($btn) {
        var $jsonWrap = $btn.closest('.jsonWrap');
        $jsonWrap.find('.keySelected').removeClass('keySelected');
        $jsonWrap.find('.jsonCheckbox').removeClass('checked');
        $jsonWrap.find('.submitMultiPull').addClass('disabled');
        $jsonWrap.find('.clearAll').addClass('disabled');
        $jsonWrap.find('.selectAll').removeClass('disabled');
        $lastKeySelected = null;
        var numTotalFields = $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                                 .data('numTotalFields');
        $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                 .text('0/' + numTotalFields + ' ' + JsonModalTStr.FieldsPull);
        if (numTotalFields === 0) {
            $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                        .text(JsonModalTStr.AllFieldsPulled);
        }
        selectedCols[$jsonWrap.index()] = [];
    }

    function updateNumPullColsSelected($jsonWrap) {
        var numSelected = $jsonWrap.find('.keySelected').length;
        var numTotalFields = $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                                 .data('numTotalFields');
        $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                 .text(numSelected + '/' + numTotalFields +
                                            ' ' + JsonModalTStr.FieldsPull);
        if (numTotalFields === 0) {
            $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                        .text(JsonModalTStr.AllFieldsPulled);
        }
        if (numSelected === 0) {
            $jsonWrap.find('.submitMultiPull').addClass('disabled');
            $jsonWrap.find('.clearAll').addClass('disabled');
            $jsonWrap.find('.selectAll').removeClass('disabled');
        } else if (numSelected === numTotalFields) {
            $jsonWrap.find('.selectAll').addClass('disabled');
        } else {
            $jsonWrap.find('.selectAll').removeClass('disabled');
        }
    }

    function selectJsonKey($el, event) {
        var $jsonWrap = $el.closest('.jsonWrap');

        if ($jsonWrap.hasClass('multiSelectMode')) {
            var index = $jsonWrap.index();

            var toSelect = false;
            if (!$el.hasClass('keySelected')) {
                toSelect = true;
            }

            if (event.shiftKey && $lastKeySelected) {
                var $cboxes = $jsonWrap.find('.jsonCheckbox');
                var $els = $();
                $cboxes.each(function() {
                    var $checkbox = $(this);
                    if ($checkbox.parent().hasClass("pulled")) {
                        return true;
                    }
                    var $key = $checkbox.siblings('.jKey, .arrayEl');
                    if (!$key.length) {
                        $key = $checkbox.siblings();
                    }
                    if ($key.length === 1) {
                        // exclude prefix checkbox
                        $els = $els.add($key);
                    }
                });

                var lastIndex = $els.index($lastKeySelected);
                var curIndex = $els.index($el);
                var start = Math.min(lastIndex, curIndex);
                var end = Math.max(lastIndex, curIndex);

                // select in the correct order
                if (curIndex > lastIndex) {
                    for (var i = start; i <= end; i++) {
                        if (toSelect) {
                            selectField($els.eq(i), $jsonWrap, index);
                        } else {
                            deselectField($els.eq(i), $jsonWrap, index);
                        }
                    }
                } else {
                    for (var i = end - 1; i >= start; i--) {
                        if (toSelect) {
                            selectField($els.eq(i), $jsonWrap, index);
                        } else {
                            deselectField($els.eq(i), $jsonWrap, index);
                        }
                    }
                }
            }

            if (toSelect) {
                selectField($el, $jsonWrap, index);
            } else {
                deselectField($el, $jsonWrap, index);
            }

            $lastKeySelected = $el;

            if ($jsonWrap.hasClass('multiSelectMode')) {
                updateNumPullColsSelected($jsonWrap);
            }
        } else {
            var tableId = $jsonWrap.data('tableid');
            var table = gTables[tableId];
            var colNum = $jsonWrap.data('colnum');
            var isArray = $jsonWrap.data('isarray');

            var nameInfo = createJsonSelectionExpression($el);
            var animation = !gMinModeOn;
            var backColName;

            if (isDataCol) {
                backColName = nameInfo.escapedName;
                colNum = $("#xcTable-" + tableId).find('th.dataCol').index();
            } else {
                var symbol = isArray ? "" : ".";
                var colName = table.getCol(colNum).getBackColName();
                backColName = colName + symbol + nameInfo.escapedName;
                nameInfo.name = colName.replace(/\\\./g, ".") + symbol +
                                nameInfo.name;
            }

            var checkedColNum = table.getColNumByBackName(backColName);
            if (checkedColNum >= 0) {
                // if the column already exists
                closeModal(modes.single);
                xcHelper.centerFocusedColumn(tableId, checkedColNum, animation);
                return;
            }

            var options = {
                "direction": isDataCol ? ColDir.Left : ColDir.Right,
                "fullName": nameInfo.name,
                "escapedName": backColName
            };

            ColManager.pullCol(colNum, tableId, options)
            .always(function(newColNum) {
                closeModal(modes.single);
                xcHelper.centerFocusedColumn(tableId, newColNum, animation);
            });
        }
    }

    function selectField($el, $jsonWrap, index) {
        if ($el.hasClass("keySelected")) {
            return;
        }

        $el.addClass('keySelected');
        $el.siblings('.jsonCheckbox').addClass('checked');
        $jsonWrap.find('.submitMultiPull').removeClass('disabled');
        $jsonWrap.find('.clearAll').removeClass('disabled');

        var nameInfo = createJsonSelectionExpression($el);
        var colName = nameInfo.escapedName;
        selectedCols[index].push(colName);
    }

    function deselectField($el, $jsonWrap, index) {
        if (!$el.hasClass("keySelected")) {
            return;
        }
        $el.removeClass('keySelected');
        $el.siblings('.jsonCheckbox').removeClass('checked');
        if ($jsonWrap.find('.keySelected').length === 0) {
            $jsonWrap.find('.submitMultiPull').addClass('disabled');
            $jsonWrap.find('.clearAll').addClass('disabled');
        }
        var nameInfo = createJsonSelectionExpression($el);
        var colName = nameInfo.escapedName;
        selectedCols[index].splice(selectedCols[index].indexOf(colName), 1);
    }

    function sortData($icon) {
        var order;
        var tooltipText;
        if ($icon.hasClass('desc')) {
            $icon.removeClass('desc');
            tooltipText = JsonModalTStr.SortAsc;
            order = ColumnSortOrder.descending;
        } else {
            $icon.addClass('desc');
            tooltipText = JsonModalTStr.SortDesc;
            order = ColumnSortOrder.ascending;
        }
        xcTooltip.changeText($icon, tooltipText);
        xcTooltip.refresh($icon);

        var $jsonWrap = $icon.closest('.jsonWrap');
        var $groups;
        if (isDataCol) {
            $groups = $jsonWrap.find('.prefixedType .prefixGroup');
            $groups.sort(sortGroups).appendTo($jsonWrap.find('.prefixedType'));

            $groups = $groups.add($jsonWrap.find('.immediatesGroup'));
        } else {
            $groups = $jsonModal.find('.prettyJson');
        }

        $groups.each(function() {
            var $group = $(this);
            $group.find('.mainKey').sort(sortList).prependTo(
                                                $group.children('.jObject'));
        });

        searchHelper.$matches = [];
        searchHelper.clearSearch(function() {
            clearSearch();
        });

        function sortGroups(a, b) {
            return xcHelper.sortVals($(a).children('.prefix').text(),
                                     $(b).children('.prefix').text(), order);
        }
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
                closeModal();
                return false;
            }
        });
    }

    function searchText() {
        $jsonText.find('.highlightedText').contents().unwrap();
        var text = $searchInput.val().toLowerCase();

        if (text === "") {
            searchHelper.clearSearch();
            return;
        }
        var $targets = $jsonText.find('.text').filter(function() {
            return ($(this).is(':visible') &&
                    $(this).text().toLowerCase().indexOf(text) !== -1);
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

        if (searchHelper.numMatches !== 0) {
            scrollMatchIntoView(searchHelper.$matches.eq(0));
        }
    }

    function clearSearch(focus) {
        if ($jsonText) {
            $jsonText.find('.highlightedText').contents().unwrap();
        }

        if (focus) {
            $searchInput.focus();
        }
        $searchInput.val("");
    }

    function scrollMatchIntoView($match) {
        var $modalWindow = $match.closest('.prettyJson');
        var modalHeight = $modalWindow.outerHeight();
        var scrollTop = $modalWindow.scrollTop();
        var modalWindowTop = $modalWindow.offset().top;
        var matchOffset = $match.offset().top - modalWindowTop;

        if (matchOffset > modalHeight - 15 || matchOffset < 0) {
            $modalWindow.scrollTop(scrollTop + matchOffset - (modalHeight / 2));
        }
    }

    function closeModal(mode) {
        modalHelper.clear({"close": function() {
            // json modal use its own closer
            if (!$("#container").hasClass("columnPicker")) {
                $('.modalHighlighted').removeClass('modalHighlighted');
            } else {
                $(".jsonElement").removeClass("modalHighlighted");
            }

            $('.jsonModalHighlightBox').remove();
            $(".highlightedCell").removeClass("highlightedCell");
            refCounts = {};
            toggleModal(null, true, 200);

            $modalBg.removeClass('light');
            if ($('.modalContainer:visible:not(#aboutModal)').length < 2) {
                $modalBg.hide();
            }
            $jsonModal.hide().width(500);
            $(".xcTable").find(".jsonModalOpen").removeClass("jsonModalOpen");
            $('#bottomMenu').removeClass('jsonModalOpen');
            $('#mainMenu').removeClass('jsonModalOpen');
            xcTooltip.hideAll();
        }});

        if (!isSaveModeOff) {
            saveLastMode(mode);
        }
        isSaveModeOff = false;

        $(document).off(".jsonModal");
        searchHelper.clearSearch(function() {
            clearSearch();
        });
        $('#jsonSearch').addClass('closed');
        $jsonArea.empty();

        jsonData = [];
        comparisonObjs = {};
        $jsonText = null;
        $lastKeySelected = null;
        selectedCols = [];
    }

    // if mode isn't provided, will default to single "select mode" if a single
    // jsonWrap without multiSelect mode is found
    function saveLastMode(mode) {
        if (mode) {
            lastMode = mode;
            return lastMode;
        }

        $jsonArea.find('.jsonWrap').each(function() {
            var $wrap = $(this);
            if ($wrap.hasClass("multiSelectMode")) {
                lastMode = modes.multiple;
            } else {
                lastMode = modes.single;
                return false;
            }
        });

        return lastMode;
    }

    function refreshJsonModal($jsonTd, isModalOpen, type) {
        var text = $jsonTd.find('.originalData').text();
        var jsonObj;
        var allMultiMode = false;

        if (type &&
            (type !== ColumnType.array && type !== ColumnType.object &&
             type !== ColumnType.mixed)) {
            jsonObj = text;
            $jsonModal.addClass('truncatedText');
        } else {
            $jsonModal.removeClass('truncatedText');

            try {
                jsonObj = JSON.parse(text);
            } catch (error) {
                var rowNum = xcHelper.parseRowNum($jsonTd.closest('tr')) + 1;
                var msg = xcHelper.replaceMsg(JsonModalTStr.SyntaxErrorDesc, {
                    row: rowNum
                });
                var err = {error: msg, log: "Data: " + text};
                console.error(error, text);
                closeModal();
                Alert.error(JsonModalTStr.SyntaxErrorTitle, err);
                return;
            }
            if (type === ColumnType.mixed) {
                if (jsonObj instanceof Array) {
                    type = ColumnType.array;
                } else {
                    type = ColumnType.object;
                }
            }
        }

        if (type === ColumnType.array) {
            $jsonModal.addClass('isArray');
        } else {
            $jsonModal.removeClass('isArray');
        }

        var dataObj = {
            full: jsonObj,
            immediates: {},
            prefixed: {},
            missingImmediates: {}
        };
        if (isDataCol) {
            var tableId = xcHelper.parseTableId($jsonTd.closest('table'));
            var groups = splitJsonIntoGroups(jsonObj, tableId);
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].prefix === gPrefixSign) {
                    dataObj.immediates = groups[i].objs;
                } else if (groups[i].prefix === gPrefixSign + "-") {
                    dataObj.missingImmediates = groups[i].objs;
                } else {
                    dataObj.prefixed[groups[i].prefix] = groups[i].objs;
                }
            }
        }

        jsonData.push(dataObj);
        selectedCols.push([]);

        if (!isModalOpen) {
            var height = Math.min(500, $(window).height());
            $jsonModal.height(height).width(500);

            if (gMinModeOn) {
                $modalBg.show();
                $jsonModal.show();
                toggleModal($jsonTd, false, 0);
            } else {
                toggleModal($jsonTd, false, 200);
            }
        } else if ($jsonArea.find('.jsonWrap.multiSelectMode').length &&
                    ($jsonArea.find('.jsonWrap').length ===
                    $jsonArea.find('.jsonWrap.multiSelectMode').length)) {
            allMultiMode = true;
        }

        fillJsonArea(jsonObj, $jsonTd, type);

        if (gMinModeOn || isModalOpen) {
            if (!isModalOpen) {
                $jsonText = $jsonModal.find('.prettyJson:visible');
                searchHelper.$matches = $jsonText.find('.highlightedText');
            }
        } else {
            // wait for jsonModal to become visible
            setTimeout(function() {
                $jsonText = $jsonModal.find('.prettyJson:visible');
                searchHelper.$matches = $jsonText.find('.highlightedText');
            }, 250);
        }

        var $jsonWrap = $jsonArea.find('.jsonWrap').last();

        if (isModalOpen) {
            var $compareIcons = $jsonArea.find('.compareIcon')
                                      .removeClass('single');
            $compareIcons.each(function() {
                xcTooltip.changeText($(this), JsonModalTStr.Compare);
            });
            if (allMultiMode) {
                $jsonWrap.addClass('multiSelectMode');
            }
        } else if (lastMode === modes.multiple &&
            (isDataCol || type === ColumnType.object)) {
            $jsonWrap.addClass('multiSelectMode');
        }
    }

    function fillJsonArea(jsonObj, $jsonTd, type) {
        var rowNum = xcHelper.parseRowNum($jsonTd.closest('tr')) + 1;
        var tableId = xcHelper.parseTableId($jsonTd.closest('table'));
        var prettyJson = "";
        var isArray = (type === ColumnType.array);

        if (type && (type !== ColumnType.object && type !== ColumnType.array)) {
            var typeClass = "";
            switch (type) {
                case (ColumnType.string):
                    typeClass = "jString";
                    break;
                case (ColumnType.integer):
                    typeClass = "jNum";
                    break;
                case (ColumnType.float):
                    typeClass = "jNum";
                    break;
                case (ColumnType.boolean):
                    typeClass = "jBool";
                    break;
                case (ColumnType.timestamp):
                    typeClass ="jTimestamp";
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
        } else {
            var groups;

            if (isArray) {
                prettyJson = '<div class="brace">[</div>';
            } else {
                prettyJson = '<div class="brace">{</div>';
            }

            if (isDataCol) {
                groups = splitJsonIntoGroups(jsonObj, tableId);
                prettyJson += getJsonHtmlForDataCol(groups);
            } else {
                prettyJson += getJsonHtmlForNonDataCol(jsonObj, isArray);
            }

            if (isArray) {
                prettyJson += '<div class="brace">]</div>';
            } else {
                prettyJson += '<div class="brace">}</div>';;
            }
        }
        if (isDataCol && Object.keys(groups[groups.length - 1].objs).length &&
            groups[groups.length - 1].prefix === gPrefixSign + "-") {
            prettyJson += getMissingImmediatesHtml(groups[groups.length - 1].objs);
        }

        var location;
        if (isDataCol) {
            location = gTables[tableId].getName();
        } else {
            var colNum = xcHelper.parseColNum($jsonTd);
            location = gTables[tableId].getCol(colNum).getBackColName();
        }

        $jsonArea.append(getJsonWrapHtml(prettyJson, location, rowNum));
        if (isDataCol) {
            setPrefixTabs(groups);
        }

        markPulledCols($jsonTd, $jsonArea, isArray, isDataCol, location);
        addDataToJsonWrap($jsonTd, isArray);
    }

    function getJsonHtmlForDataCol(groups) {
        var checkboxes = true;
        var isArray = false;
        var prettyJson = '<div class="groupWrap">';

        var prefixFound;
        var immediatesGroup = "";
        var prefixedGroup =
            '<div class="groupType prefixedType">' +
                '<h3 class="prefixGroupTitle">' +
                   '<div class="checkbox jsonCheckbox prefixCheckbox">' +
                    '<i class="icon xi-ckbox-empty fa-11"></i>' +
                    '<i class="icon xi-ckbox-selected fa-11"></i>' +
                  '</div>' +
                  JsonModalTStr.PrefixedField +
                '</h3>';
        for (var i = 0; i < groups.length - 1; i++) {
            var tempJson = xcHelper.prettifyJson(groups[i].objs, null,
            checkboxes, {
                "inArray": isArray,
                "checkboxes": true
            });
            tempJson = '<div class="jObject">' +
                        tempJson +
                     '</div>';

            if (groups[i].prefix === gPrefixSign) {
                immediatesGroup =
                    '<div class="groupType immediatesType">' +
                        '<h3 class="prefixGroupTitle">' +
                            CommonTxtTstr.ImmediatesPlural +
                        '</h3>' +
                        '<div class="prefixGroup immediatesGroup">' +
                            tempJson +
                        '</div>' +
                    '</div>';
            } else {
                prefixFound = true;
                prefixedGroup += '<div class="prefixGroup">' +
                            '<div class="prefix">' +
                            groups[i].prefix +
                         '</div>' +
                         tempJson +
                         '</div>';
            }
        }

        prettyJson += immediatesGroup;
        if (prefixFound) {
            prettyJson += prefixedGroup + '</div>';
        }
        prettyJson += '</div>';

        return (prettyJson);
    }

    function getJsonHtmlForNonDataCol(jsonObj, isArray) {
        var prettyJson = xcHelper.prettifyJson(jsonObj, null, true, {
            inArray: isArray,
            checkboxes: true
        }, isArray);
        prettyJson = '<div class="jObject">' + prettyJson + '</div>';
        return prettyJson;
    }

    function getMissingImmediatesHtml(immediates) {
        var html = '<div class="missingImmediatesSection">' +
                    '<div class="subHeading">' +
                        JsonModalTStr.ImmediatesNotPresent +
                    '</div>' +
                    '<div class="jObject">' +
                    xcHelper.prettifyJson(immediates, 0, true,
                                            {noQuotes: true, checkboxes: true}) +
                    '</div>' +
                '</div>';

        return html;
    }

    // splits json into array, grouped by prefix
    function splitJsonIntoGroups(jsonObj, tableId) {
        var groups = {};
        var table = gTables[tableId];
        var knownImmediatesArray = table.getImmediates();
        var knownImmediates = {};
        knownImmediatesArray.forEach(function(imm) {
            knownImmediates[imm.name] = xcHelper.getDFFieldTypeToString(imm.type);
        });

        var splitName;
        for (var key in jsonObj) {
            splitName = xcHelper.parsePrefixColName(key);
            if (!splitName.prefix) {
                if (!groups[gPrefixSign]) {
                    groups[gPrefixSign] = {};
                    // use :: for immediates since it's not allowed and
                    //          can't be taken
                }
                groups[gPrefixSign][splitName.name] = jsonObj[key];
                delete knownImmediates[splitName.name];
            } else {
                if (!groups[splitName.prefix]) {
                    groups[splitName.prefix] = {};
                }
                groups[splitName.prefix][splitName.name] = jsonObj[key];
            }
        }

        var groupsArray = [];
        var groupObj;
        for (var i in groups) {
            if (i !== gPrefixSign) {
                groupObj = {prefix: i};
                groupObj.objs = groups[i];
                groupsArray.push(groupObj);
            }
        }
        groupsArray.sort(function(a, b) {
            return a.prefix > b.prefix;
        });
        if (groups[gPrefixSign]) {
            groupObj = {prefix: gPrefixSign, objs: groups[gPrefixSign]};
            groupsArray.unshift(groupObj);
        }

        groupsArray.push({
            prefix: gPrefixSign + "-",
            objs: knownImmediates
        });

        return (groupsArray);
    }

    function setPrefixTabs(groups) {
        var $jsonWrap = $jsonArea.find('.jsonWrap').last();
        var $tabWrap = $jsonWrap.find('.tabBar .tabs');
        var html = "";
        var prefix;
        var classNames;
        var immediatesFound = false;
        for (var i = 0; i < groups.length; i++) {
            classNames = "";
            prefix = groups[i].prefix;
            prefixText = prefix;
            if (prefix === gPrefixSign + "-" &&
                !Object.keys(groups[i].objs).length) {
                continue;
            }
            if (prefix === gPrefixSign || prefix === gPrefixSign + "-") {
                if (immediatesFound) {
                    continue;
                } else {
                    immediatesFound = true;
                }
                prefix = "Derived";
                prefixText = JsonModalTStr.Derived;
                classNames += " immediates";
            }
            html += '<div class="tab tooltipOverflow' + classNames + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-original-title="' + prefix + '" ' +
                        'data-id="' + prefix + '" >' +
                        '<span class="text">' + prefixText +
                        '</span>' +
                    '</div>';
        }
        $tabWrap.append(html);
    }

    function compare(jsonObjs, indices, multiple) {
        if (!multiple && jsonObjs.length < 2) {
            return;
        }

        jsonObjs = xcHelper.deepCopy(jsonObjs);
        var numExistingComparisons = Object.keys(comparisonObjs).length;
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
                var possibleMatch = matches[i];
                var tempActiveObj = {};
                var tempObj;
                var key = Object.keys(matches[i])[0];

                var compareResult = xcHelper.deepCompare(possibleMatch[key],
                                                          jsonObjs[key]);
                if (compareResult) {
                    activeObj.matches.push(possibleMatch);
                } else if (jsonObjs.hasOwnProperty(key)) {
                    for (var j in comparisonObjs) {
                        tempObj = comparisonObjs[j].matches.splice(i, 1)[0];
                        comparisonObjs[j].partial.push(tempObj);
                    }
                    tempActiveObj[key] = jsonObjs[key];
                    tempPartials.push(tempActiveObj);

                    numMatches--;
                    i--;
                } else {
                    for (var j in comparisonObjs) {
                        tempObj = comparisonObjs[j].matches.splice(i, 1)[0];
                        comparisonObjs[j].unmatched.push(tempObj);
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
                    for (var j in comparisonObjs) {
                        tempObj = comparisonObjs[j].partial.splice(i, 1)[0];
                        comparisonObjs[j].unmatched.push(tempObj);
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
            var numObjs = jsonObjs.length + numExistingComparisons;
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
                var key = keys[i];
                var compareResult = xcHelper.deepCompare(jsonObjs[0][key],
                                                        jsonObjs[1][key]);

                var obj = {};
                var obj2 = {};
                obj[key] = jsonObjs[0][key];
                obj2[key] = jsonObjs[1][key];

                if (compareResult) { // perfect match
                    matchedJsons[0].push(obj);
                    matchedJsons[1].push(obj2);
                    delete jsonObjs[1][key];
                } else if (jsonObjs[1].hasOwnProperty(key)) {
                    // keys match but values do not
                    partialMatchedJsons[0].push(obj);
                    partialMatchedJsons[1].push(obj2);
                    delete jsonObjs[1][key];
                } else {
                    // no match
                    unmatchedJsons[0].push(obj);
                }
            }

            for (var key in jsonObjs[1]) {
                var obj = {};
                obj[key] = jsonObjs[1][key];
                unmatchedJsons[1].push(obj);
            }

            for (var i = 0; i < indices.length; i++) {
                comparisonObjs[indices[i]] = {
                    matches: matchedJsons[i],
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
                    html += xcHelper.prettifyJson(jsons[obj][matchType][k], 0, null,
                                         {comparison: true});
                }
                html += '</div>';
            }
            html = html.replace(/,([^,]*)$/, '$1');// remove last comma

            html = '{<div class="jObject">' + html + '</div>}';
            var $missingImmediates = $jsonArea.find('.jsonWrap').eq(obj).find(".missingImmediatesSection");
            if ($missingImmediates.length) {
                html += $missingImmediates[0].outerHTML;
            }

            $jsonArea.find('.jsonWrap').eq(obj)
                                       .addClass('comparison')
                                       .find('.prettyJson.secondary')
                                       .html(html);
        }
    }

    function addDataToJsonWrap($jsonTd, isArray) {
        var $jsonWrap = $jsonArea.find('.jsonWrap:last');
        var rowNum = xcHelper.parseRowNum($jsonTd.closest('tr'));
        var colNum = xcHelper.parseColNum($jsonTd);
        var tableId = xcHelper.parseTableId($jsonTd.closest('table'));

        $jsonWrap.data('rownum', rowNum);
        $jsonWrap.data('colnum', colNum);
        $jsonWrap.data('tableid', tableId);
        $jsonWrap.data('isarray', isArray);

        if (isDataCol) {
            TblManager.highlightCell($jsonTd, tableId, rowNum, colNum, {
                jsonModal: true
            });
            var id = tableId + rowNum + colNum;
            if (refCounts[id] == null) {
                refCounts[id] = 1;
            } else {
                refCounts[id]++;
            }
        }

        var numTotalFields = $jsonWrap.find('.primary').find('.jInfo').length;
        numTotalFields -= $jsonWrap.find(".pulled").length;

        $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                 .data('numTotalFields', numTotalFields)
                 .text('0/' + numTotalFields + ' ' + JsonModalTStr.FieldsPull);
        if (numTotalFields === 0) {
            $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                        .text(JsonModalTStr.AllFieldsPulled);
        }
    }

    function markPulledCols($jsonTd, $jsonArea, isArray, isDATACol, colName) {
        var $jsonWrap = $jsonArea.find('.jsonWrap:last');
        var tableId = xcHelper.parseTableId($jsonTd.closest('table'));
        var table =  gTables[tableId];
        var cols = table.getAllCols(true);
        $jsonWrap.find(".jsonCheckbox").each(function() {
            var $checkbox = $(this);
            if ($checkbox.hasClass('prefixCheckbox')) {
                return true;
            } else {
                var $key = $checkbox.siblings('.jKey, .arrayEl');
                if (!$key.length) {
                    $key = $checkbox.siblings();
                }
                if ($key.length) {
                    var backName = createJsonSelectionExpression($key).escapedName;
                    backName = xcHelper.escapeDblQuoteForHTML(backName);
                    if (!isDataCol) {
                        backName = parseUnnestTd(backName, colName, isArray);
                    }
                    $checkbox.closest(".jsonBlock").attr("data-backname", backName);
                }
            }
        });

        cols.forEach(function(progCol) {
            var backName = progCol.getBackColName();
            backName = xcHelper.escapeDblQuoteForHTML(backName);
            backName = xcHelper.escapeColName(backName);
            var $checkbox = $jsonWrap.find('.jsonBlock[data-backname="' +
                                        backName + '"]').addClass("pulled")
                                     .children(".jsonCheckbox");
            var left = parseInt($checkbox.css("left")) + 5;
            $checkbox.after('<i class="icon xi-tick" style="left:' + left +
                            'px;"></i>');
        });
    }

    function parseUnnestTd(name, colName, isArray) {
        var openSymbol = "";

        if (!isArray) {
            openSymbol = ".";
        }

        var escapedColName = colName + openSymbol + name;

        return escapedColName;
    }

    // location  is either a tablename if datacol, or column name
    function getJsonWrapHtml(prettyJson, location, rowNum) {
        var locationText = isDataCol ? "Table" : "Column";

        var html = '<div class="jsonWrap">'+
             '<div class="optionsBar bar">' +
                '<div class="dragHandle jsonDragHandle" data-toggle="tooltip" ' +
                'data-container="body" data-original-title="' +
                CommonTxtTstr.HoldToDrag + '">' +
                    '<i class="icon xi-drag-handle"></i>' +
                '</div>' +
                '<div class="btn btn-small remove" data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.RemoveCol + '">' +
                    '<i class="icon xi-close"></i>' +
                '</div>' +
                '<div class="vertLine"></div>' +
                '<div class="compareIcon single checkbox" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SelectOther + '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="btn btn-small sort single" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SortAsc + '">' +
                    '<i class="icon xi-sort"></i>' +
                '</div>' +
                '<div class="btn btn-small pullAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.PullAll + '">' +
                    '<i class="icon xi-pull-all-field"></i>' +
                '</div>' +
                '<div class="btn btn-small clearAll disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.DeselectAll + '">' +
                    '<i class="icon xi-select-none"></i>' +
                '</div>' +
                '<div class="btn btn-small selectAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SelectAll + '">' +
                    '<i class="icon xi-select-all"></i>' +
                '</div>' +
                '<div class="btn btn-small submitMultiPull disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SubmitPull + '">' +
                    '<i class="icon xi-back-to-worksheet"></i>' +
                    '<i class="icon xi-pull-all-field"></i>' +
                '</div>' +
                '<div class="flexArea">' +
                    '<div class="infoArea">' +
                        '<div class="tableName" data-toggle="tooltip" ' +
                            'data-container="body" data-placement="top"' +
                            'title="' + location + '">' + locationText + ':' +
                            '<span class="text">' + location + '</span>' +
                        '</div>' +
                        '<div class="rowNum">Row:' +
                            '<span class="text">' +
                                xcHelper.numToStr(rowNum) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="dropdownBox btn btn-small" ' +
                ' data-toggle="tooltip" data-container="body" ' +
                'data-original-title="' + JsonModalTStr.ToggleMode + '">' +
                    '<i class="icon xi-down"></i>' +
                '</div>' +
            '</div>' +
            '<div class="multiSelectModeBar bar">' +
                '<div class="text numColsSelected">' +
                '</div>' +
            '</div>';
        if (isDataCol) {
            html +=
            '<div class="tabBar bar">' +
                '<div class="tabs">' +
                    '<div class="tab seeAll active" ' +
                    'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.ViewAllTip + '">' +
                        '<span class="text">' + JsonModalTStr.ViewAll +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="prettyJson primary">' +
                prettyJson +
            '</div>' +
            '<div class="prettyJson secondary"></div>';
        } else {
            html += '<div class="prettyJson primary">' +
                prettyJson +
            '</div>';
        }
        html += '<ul class="jsonModalMenu menu">' +
                '<li class="selectionOpt" data-action="selectMode">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">' + JsonModalTStr.SelectionMode +
                    '</span>' +
                '</li>' +
                '<li class="multiSelectionOpt" data-action="multiSelectMode">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">' + JsonModalTStr.MultiSelectMode +
                    '</span>' +
                '</li>'
            '</ul>' +
            '</div>';

        return (html);
    }

    // adjusting positions after drag and drop
    function resortJsons(initialIndex, newIndex) {
        var json = jsonData.splice(initialIndex, 1)[0];
        jsonData.splice(newIndex, 0, json);

        var cols = selectedCols.splice(initialIndex, 1)[0];
        selectedCols.splice(newIndex, 0, cols);

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
            modalHelper.toggleBG("all", false, {"time": time});
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
            if (!$("#container").hasClass("columnPicker")) {
                $table.find('.modalHighlighted')
                  .removeClass('modalHighlighted jsonModalOpen');
            } else {
                $(".jsonElement").removeClass("modalHighlighted");
            }
            $('.modalOpen').removeClass('modalOpen');
            $('.tableCover.jsonCover').remove();
            $tableWrap.find('.xcTbodyWrap').off('scroll.preventScrolling');
        } else {
            $('#bottomMenu').addClass('jsonModalOpen');
            $('#mainMenu').addClass('jsonModalOpen');

            if (isDataCol) {
                $tableWrap = $('.xcTableWrap:visible:not(.tableLocked)')
                                  .addClass('jsonModalOpen');
                $table = $tableWrap.find('.xcTable').addClass('jsonModalOpen');

                $table.find('.jsonElement').addClass('modalHighlighted');
                var $tableCover = $('<div class="tableCover jsonCover" ' +
                                    'style="opacity:0;"></div>');

                $tableWrap.find('.xcTbodyWrap').append($tableCover);
                $tableWrap.each(function() {
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

                $modalBg.addClass('light').fadeIn(longTimer);
                setTimeout(function() {
                    $jsonModal.fadeIn(shortTimer);
                }, shortTimer);

                $jsonTd.addClass('modalHighlighted');
                setTimeout(function() {
                    $jsonTd.addClass('jsonModalOpen');
                });

                // prevent vertical scrolling on the table
                $jsonTd.closest('.xcTbodyWrap').each(function() {
                    var $tbody = $(this);
                    var scrollTop = $tbody.scrollTop();
                    $tbody.on('scroll.preventScrolling', function() {
                        $tbody.scrollTop(scrollTop);
                    });
                });
            }
        }
    }

    function createJsonSelectionExpression($el) {
        var name = "";
        var escapedName = "";

        // .parents() is different with .closest()
        $el.parents(".jInfo").each(function(){
            var $jInfo = $(this);
            var key = "";
            var escapedKey = "";
            // var modifiedKey = "";
            var needsBrackets = false;
            var needsDot = false;

            if ($jInfo.hasClass('arrayVal')) {
                key = $jInfo.data('key');
                needsBrackets = true;

            } else {
                key = $jInfo.data('key');
                needsDot = true;
            }
            key += "";
            escapedKey = xcHelper.escapeColName(key);

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

        var $prefixType = $el.closest('.prefixedType');
        if ($prefixType.length) {
            var $prefixGroup = $el.closest('.prefixGroup');
            var $prefix = $prefixGroup.find('.prefix');
            name = $prefix.text() + gPrefixSign + name;
            escapedName = $prefix.text() + gPrefixSign + escapedName;
        }

        return {
            "name": name,
            "escapedName": escapedName
        };
    }


    function submitPullSome($jsonWrap, index) {
        var rowNum = $jsonWrap.data('rownum');
        var tableId = $jsonWrap.data('tableid');
        var colNum = $jsonWrap.data('colnum');
        var rowExists = $('#xcTable-' + tableId).find('.row' + rowNum).length === 1;

        if (!rowExists) {
            // the table is scrolled past the selected row, so we just
            // take the jsonData from the first visibile row
            var rowManager = new RowManager(gTables[tableId], $("#xcTableWrap-" + tableId));
            rowNum = rowManager.getFirstVisibleRowNum() - 1;
        }
        var colNames = [];
        for (var i = 0; i < selectedCols[index].length; i++) {
            colNames.push(selectedCols[index][i]);
        }

        closeModal(modes.multiple);
        //set timeout to allow modal to close before unnesting many cols
        setTimeout(function() {
            ColManager.unnest(tableId, colNum, rowNum, colNames);
        }, 0);
    }

    function getSelectedCols($jsonWrap) {
        var colNames = [];
        $jsonWrap.find('.keySelected').each(function() {
            var $el = $(this);
            var nameInfo = createJsonSelectionExpression($el);
            var colName = nameInfo.escapedName;
            colNames.push(colName);
        });
        return (colNames);
    }

    function addMenuActions() {
        var $li;
        var $menu;
        var $jsonWrap;
        $jsonArea.on("mouseup", ".menu li", function(event) {
            if (event.which !== 1) {
                return;
            }
            $li = $(this);
            if ($li.hasClass('selected')) {
                return;
            }
            $jsonArea.find('.menu li').removeClass('liSelected');
            $li.addClass('liSelected');

            $menu = $li.closest('.menu');
            $jsonWrap = $menu.closest('.jsonWrap');
            $jsonWrap.removeClass('multiSelectMode');
            clearAllSelectedCols($jsonWrap.find('.clearAll'));

            if ($li.hasClass('multiSelectionOpt')) {
                $jsonWrap.addClass('multiSelectMode');
                selectTab($jsonWrap.find('.seeAll'));
                xcTooltip.changeText($jsonWrap.find('.submitMultiPull'),
                                     JsonModalTStr.SubmitPull);
                if ($jsonWrap.find('.compareIcon.selected').length) {
                    compareIconSelect($jsonWrap.find('.compareIcon'));
                }
            }
            $menu.hide();
        });
        $jsonArea.on("mouseenter", ".menu li", function() {
            $(this).addClass("hover");
        });
        $jsonArea.on("mouseleave", ".menu li", function() {
            $(this).removeClass("hover");
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        JSONModal.__testOnly__ = {};
        JSONModal.__testOnly__.closeJSONModal = closeModal;
        JSONModal.__testOnly__.compareIconSelect = compareIconSelect;
        JSONModal.__testOnly__.selectTab = selectTab;
        JSONModal.__testOnly__.saveLastMode = saveLastMode;
        JSONModal.__testOnly__.resortJsons = resortJsons;
        JSONModal.__testOnly__.getMissingImmediatesHtml = getMissingImmediatesHtml;
        JSONModal.__testOnly__.getJsons = function() {
            return jsonData;
        }
    }
    /* End Of Unit Test Only */

    return (JSONModal);
}(jQuery, {}));
