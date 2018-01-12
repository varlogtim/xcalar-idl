window.DagPanel = (function($, DagPanel) {
    var $dagPanel; // $('#dagPanel');
    var $dagArea;  // $dagPanel.find('.dagArea');
    var $scrollBarWrap; // $('#dagScrollBarWrap');
    var $panelSwitch; // $('#dfPanelSwitch');
    var dagPanelLeft; // $('#dagPanelContainer').offset().left;
    var dagTopPct = 0; // open up dag to 100% by default;
    var clickDisabled = false;

    DagPanel.setup = function() {
        $dagPanel = $('#dagPanel');
        $dagArea = $dagPanel.find('.dagArea');
        $scrollBarWrap = $('#dagScrollBarWrap');
        $panelSwitch = $('#dfPanelSwitch');
        dagPanelLeft = $('#dagPanelContainer').offset().left || 65;
        // dagPanelLeft shouldn't be zero but will result in false zero if not visible

        setupDagPanelSliding();
        setupDagTableDropdown();
        setupDagOpDropdown();
        setupRightClickDropdown();
        Dag.setupDagSchema();
        DagEdit.setupMapPreForm();
        setupDataFlowBtn();
        setupScrollBar();
    };

    DagPanel.setScrollBarId = function(winHeight) {
        // #moveCursor from TblAnim.startColDrag may be covering the screen
        // so temporarily remove it before we check if a dataflow is visible
        var $moveCursor = $("#moveCursor");
        if ($moveCursor.length) {
            $moveCursor.hide();
        }

        // 34 or 47 depends on if scrollbar is showing
        var el = document.elementFromPoint(400, winHeight - 47);
        if ($moveCursor.length) {
            $moveCursor.show();
        }
        var $dagImageWrap = $(el).closest('.dagImageWrap');
        if ($dagImageWrap.length) {
            var dagImageWrapHeight = $dagImageWrap.height();
            var offsetTop = $dagImageWrap.offset().top;
            if ((winHeight - 34) < offsetTop + dagImageWrapHeight) {
                var id = $dagImageWrap.closest('.dagWrap').data('id');
                $scrollBarWrap.data('id', id);
            } else {
                $scrollBarWrap.data('id', 'none');
            }
        } else {
            $scrollBarWrap.data('id', 'none');
        }
    };

    DagPanel.adjustScrollBarPositionAndSize = function() {
        var id = $scrollBarWrap.data('id');

        if (id && id !== "none") {
            var $dagWrap = $('#dagWrap-' + id);
            if (!$dagWrap.length) {
                $scrollBarWrap.data('id', 'none');
                $scrollBarWrap.hide();
                return;
            }

            var $dagImageWrap = $dagWrap.find('.dagImageWrap');
            var dagImageWidth = $dagImageWrap.outerWidth();
            var scrollWidth = $dagImageWrap[0].scrollWidth;
            if (scrollWidth > dagImageWidth) {
                var scrollLeft = $dagImageWrap.scrollLeft();
                $scrollBarWrap.show().find('.sizer').width(scrollWidth);
                $scrollBarWrap.scrollLeft(scrollLeft);
            } else {
                $scrollBarWrap.hide();
            }
        } else {
            $scrollBarWrap.hide();
        }
    };

    DagPanel.focusOnWorksheet = function(wsId) {
        var $dags = $dagPanel.find(".dagWrap");
        $dags.addClass("inActive");
        $dags.filter(".worksheet-" + wsId).removeClass("inActive");
    };

    // high tolerance - will only move panel only if almost completely covering
    DagPanel.heightForTableReveal = function(noAnimateDelay, onlyIfNeeded,
                                        highTolerance) {
        var animateDelay = noAnimateDelay ? 0 : 100;
        if ($dagPanel.hasClass('hidden')) {
            // open df by triggering panelSwitch click
            // set dagTopPct to 50 so it opens half way
            dagTopPct = 50;
            setTimeout(function() {
                $panelSwitch.click();
                $('#maximizeDag').removeClass('unavailable');
            }, animateDelay);

            return;
        }
        // new height is in percent
        var newHeight = 50;
        if (onlyIfNeeded) {
            var pct = dagTopPct || 0;
            if (Math.abs(pct - 50) < 25) {
                return;
            }
        }
        if (highTolerance) {
            if (dagTopPct > 10) {
                return;
            }
        }

        setTimeout(function () {
            $dagPanel.removeClass('noTransform');
            if (dagTopPct > newHeight) {
                $dagArea.css('height', newHeight + '%');
            } else {
                $('#mainFrame').height(newHeight + '%');
            }

            if (dagTopPct === undefined) {
                setDagTranslate(0);
            } else {
                setDagTranslate(newHeight - dagTopPct);
            }

            $('#dagScrollBarWrap').hide();
            clickDisabled = true;
            setTimeout(function() {
                $dagPanel.addClass('noTransform');
                $dagPanel.css('top', newHeight + '%');
                $dagArea.css('height', newHeight + '%');
                $('#mainFrame').height(newHeight + '%');
                dagTopPct = newHeight;
                clickDisabled = false;
                $('#maximizeDag').removeClass('unavailable');
                var winHeight = $(window).height();
                DagPanel.setScrollBarId(winHeight);
                DagPanel.adjustScrollBarPositionAndSize();

                if (window.isBrowserMicrosoft) {
                    // hack because rows become invisible in IE/EDGE
                    $('.xcTable').each(function() {
                        var $tr = $(this).find('tr').last();
                        var originalHeight = $tr.height();
                        $tr.hide().show().height(originalHeight + 1);
                        setTimeout(function() {
                            $tr.hide().show().height(originalHeight);
                        }, 0);
                    });
                }
            }, 300);
        }, animateDelay);
    };

    DagPanel.toggleExpCollapseAllLi = function ($dagWrap, $menu) {
        if ($dagWrap.find('.expandWrap:not(.expanded)').length) {
            if (Dag.checkCanExpandAll($dagWrap)) {
                $menu.find('.expandAll').show();
                $menu.find('.cannotExpand').hide();
            } else {
                $menu.find('.expandAll').hide();
                $menu.find('.cannotExpand').show();
            }
        } else {
            $menu.find('.expandAll, .cannotExpand').hide();
        }

        if ($dagWrap.find('.expandWrap.expanded').length) {
            $menu.find('.collapseAll').show();
        } else {
            $menu.find('.collapseAll').hide();
        }
    };

    DagPanel.saveImageAction = function($dagWrap, tableName) {
        var deferred = PromiseHelper.deferred();
        DagDraw.createSavableCanvas($dagWrap, tableName)
        .then(function() {
            var success = false;
            var canvas = $dagWrap.find('canvas').eq(1)[0];
            if ($('html').hasClass('microsoft')) { // for IE
                var blob = canvas.msToBlob();
                var name = tableName + '.png';
                success = window.navigator.msSaveBlob(blob, name);
                deferred.resolve(success);
            } else {
                downloadImage(canvas, tableName);
                deferred.resolve(success);
            }
            $dagWrap.find('canvas').eq(1).remove();
        })
        .fail(deferred.reject);
        return deferred;
    };

    DagPanel.newTabImageAction = function($dagWrap) {
        var deferred = PromiseHelper.deferred();
        DagDraw.createSavableCanvas($dagWrap)
        .then(function() {
            var canvas = $dagWrap.find('canvas').eq(1)[0];
            var lnk = canvas.toDataURL("image/png");

            if (lnk.length < 8) {
                // was not able to make url because image is
                // probably too large
                saveImgError(canvas);
                deferred.reject(ErrTStr.LargeImgText);
            } else {
                var win = window.open();
                if (!win) {
                    Alert.error("Image Error", "Image could not be opened. " +
                        "Make sure to deactive any pop-up blockers you may have on your browser.");
                    deferred.reject("Image Error");
                } else {
                    win.document.write('<img src="' + lnk + '" />');
                    deferred.resolve(win);
                }

            }
            $dagWrap.find('canvas').eq(1).remove();
        })
        .fail(deferred.reject);

        return deferred;
    };

    // this function is called when an operation form opens. It will update
    // the dagpanel dropdowns and add an exit option for that form
    // name is optional, if not provided then will remove li
    DagPanel.updateExitMenu = function(name) {
        var $menu = $dagPanel.find('.dagOperationDropDown');
        $menu.find(".exitFormOption").remove();
        if (!name) {
            return;
        }
        var nameUpper = xcHelper.capitalize(name);
        $menu.prepend('<li class="exitFormOption" ' +
            'data-action="exitFormOption" data-formname="' + name +
            '">Exit ' + nameUpper + '</li>');
    }

    // opening and closing of dag is temporarily disabled during animation
    function setupDagPanelSliding() {
        $panelSwitch.click(function(event) {
            if (clickDisabled) {
                return;
            }
            var $workspacePanel = $('#workspacePanel');
            event.stopPropagation();

            var wasOnWorksheetPanel = true;
            if (!$workspacePanel.hasClass('active')) {
                wasOnWorksheetPanel = false;
            }

            if ($dagPanel.hasClass('hidden')) {
                // open dag panel
                $dagPanel.removeClass('xc-hidden');
                xcTooltip.changeText($panelSwitch, TooltipTStr.CloseQG);
                xcTooltip.hideAll();

                // without set timeout, animation would not work because
                // we're setting dagpanel from display none to display block
                setTimeout(function() {
                    $dagPanel.removeClass('hidden');
                    setDagTranslate(dagTopPct);
                    // $dagArea.css('height', (100 - dagTopPct) + '%');
                    $dagArea.css('height', 'calc(' + (100 - dagTopPct) + '% - 5px)');
                    $panelSwitch.addClass('active');

                    Dag.focusDagForActiveTable();
                    clickDisabled = true;
                    setTimeout(function() {
                        $('#mainFrame').height(dagTopPct + '%');
                        $dagPanel.addClass('noTransform');
                        $dagPanel.css('top', dagTopPct + '%');
                        clickDisabled = false;
                        var winHeight = $(window).height();
                        DagPanel.setScrollBarId(winHeight);
                        DagPanel.adjustScrollBarPositionAndSize();

                    }, 350);
                }, 0);

            } else if (wasOnWorksheetPanel) {
                // hide dag panel
                closePanel();
            }

            if (!wasOnWorksheetPanel) {
                $('#workspaceTab').trigger('click');
                xcTooltip.changeText($panelSwitch, TooltipTStr.CloseQG);
                xcTooltip.hideAll();
            }

            $('.columnOriginInfo').remove();
        });

        $('#closeDag').click(function() {
            // only triiger the first dagTab is enough
            $panelSwitch.trigger('click');
        });

        $('#maximizeDag').click(function() {
            if ($(this).hasClass('unavailable')) {
                return;
            }
            $dagPanel.removeClass('noTransform');
            $('#mainFrame').height('100%');
            $dagArea.css('height', '100%');
            if (dagTopPct === undefined) {
                setDagTranslate(0);
            } else {
                setDagTranslate(-dagTopPct);
            }
            $(this).addClass('unavailable');
            $('#dagScrollBarWrap').hide();
            clickDisabled = true;

            setTimeout(function() {
                $dagPanel.addClass('noTransform');
                $dagPanel.css('top', 0);
                dagTopPct = 0;
                clickDisabled = false;
                var winHeight = $(window).height();
                DagPanel.setScrollBarId(winHeight);
                DagPanel.adjustScrollBarPositionAndSize();
            }, 400);
        });

        $("#exitDagEdit").click(function() {
            DagEdit.off();
        });

        var dagPanelTop = 0;
        var scrollTop = 0;
        $dagPanel.on('mousedown', '.ui-resizable-n', function() {
            dagPanelTop = $dagPanel.position().top;
            scrollTop = $dagPanel.find(".dagArea").scrollTop();
        });

        var resizeTimer;
        var $xcTables;
        var resizeStart;

        $dagPanel.resizable({
            handles: "n",
            containment: 'parent',
            start: function(event, ui) {
                $dagPanel.addClass('noTransform');
                $dagPanel.css('top', dagPanelTop);
                ui.originalPosition.top = dagPanelTop;
                ui.position.top = dagPanelTop;
                $('#mainFrame').height('100%');
                $dagArea.css('height', '100%');
                if (window.isBrowserMicrosoft) {
                    $xcTables = $('.xcTable');
                }
                resizeStart = true;
            },
            resize: function() {
                if (resizeStart) {
                    $dagPanel.find(".dagArea").scrollTop(scrollTop);
                    resizeStart = false;
                }
                // hack still needed as of 9/12/2016
                if (window.isBrowserMicrosoft) {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function() {
                        // hack because rows become invisible in IE/EDGE
                        $xcTables.each(function() {
                            var $tr = $(this).find('tr').last();
                            var originalHeight = $tr.height();
                            $tr.hide().show().height(originalHeight + 1);
                            setTimeout(function() {
                                $tr.hide().show().height(originalHeight);
                            }, 0);
                        });
                    }, 200);
                } else {
                    var winHeight = $(window).height();
                    DagPanel.setScrollBarId(winHeight);
                    DagPanel.adjustScrollBarPositionAndSize();
                }
            },
            stop: function() {
                var containerHeight = $('#dagPanelContainer').height();
                dagPanelTop = $dagPanel.position().top;
                $dagPanel.attr('style', function(i, style) {
                    if (!style) {
                        return;
                    }
                    return (style.replace(/height[^;]+;?/g, ''));
                });

                if (dagPanelTop < 30) {
                    dagPanelTop = 0;
                    $('#maximizeDag').addClass('unavailable');
                } else {
                    $('#maximizeDag').removeClass('unavailable');
                }
                if (dagPanelTop + 30 > containerHeight) {
                    // close the dag panel
                    closePanel();
                    return;
                }
                dagTopPct = 100 * (dagPanelTop / containerHeight);

                $dagPanel.css('top', dagTopPct + '%');
                $('#mainFrame').height(dagTopPct + '%');
                $dagArea.css('height', 'calc(' + (100 - dagTopPct) + '% - 5px)');

                if (window.isBrowserMicrosoft) {
                    // hack because rows become invisible in IE/EDGE
                    $('.xcTable').each(function() {
                        var $tr = $(this).find('tr').last();
                        var originalHeight = $tr.height();
                        $tr.hide().show().height(originalHeight + 1);
                        setTimeout(function() {
                            $tr.hide().show().height(originalHeight);
                        }, 0);
                    });
                }
            }
        });
    }

    function closePanel() {
        $panelSwitch.removeClass('active');
        xcTooltip.changeText($panelSwitch, TooltipTStr.OpenQG);
        xcTooltip.hideAll();
        $dagPanel.removeClass('noTransform');
        $('#mainFrame').height('100%');
        // $dagArea.css('height', (100 - dagTopPct) + '%');
        $dagArea.css('height', 'calc(' + (100 - dagTopPct) + '% - 5px)');
        $dagPanel.addClass('hidden');
        $('#dagScrollBarWrap').hide();
        clickDisabled = true;

        setTimeout(function() {
            setDagTranslate(100);

            $dagPanel.attr('style', function(i, style) {
                if (!style) {
                    return;
                }
                return (style.replace(/top[^;]+;?/g, ''));
            });

            clickDisabled = false;
            $dagPanel.addClass('xc-hidden');

            if (window.isBrowserMicrosoft) {
                // hack because rows become invisible in IE/EDGE
                $('.xcTable').each(function() {
                    var $tr = $(this).find('tr').last();
                    var originalHeight = $tr.height();
                    $tr.hide().show().height(originalHeight + 1);
                    setTimeout(function() {
                        $tr.hide().show().height(originalHeight);
                    }, 0);
                });
            }
        }, 400);
    }

    function setDagTranslate(pct) {
        $dagPanel.css({
            '-webkit-transform': 'translate3d(0, ' + pct + '%, 0)',
            '-moz-transform': 'translate3d(0, ' + pct + '%, 0)',
            '-ms-transform': 'translate3d(0, ' + pct + '%, 0)',
            '-o-transform': 'translate3d(0, ' + pct + '%, 0)',
            'transform': 'translate3d(0, ' + pct + '%, 0)'
        });
    }

    function setupDagTableDropdown() {
        var $menu = $dagPanel.find('.dagTableDropDown');
        xcMenu.add($menu);
        dagTableDropDownActions($menu);

        $dagPanel.on('click', '.dagTable', function(event) {
            $('.menu').hide().removeClass('leftColMenu');
            xcMenu.removeKeyboardNavigation();
            $('#dagSchema').removeClass("active");
            var $dagTable = $(this).closest('.dagTable');
            var tableName = $dagTable.find('.tableTitle').text().trim();
            var tableId = $dagTable.data('id');
            var table = gTables[tableId];
            var isDropped = false;
            if (!$dagTable.hasClass(DgDagStateTStr[DgDagStateT
                                                    .DgDagStateReady])) {
                // if dag does not have ready state, don't show dropdown
                table = gDroppedTables[tableId];
                if (!table) {
                    return;
                } else {
                    isDropped = true;
                }
            }
            if ($("#container").hasClass("dataflowState") &&
                event.which === 1) {
                return;
            }

            var tableLocked = false;
            var tableNoDelete = false;
            if (table) {
                if (table.hasLock()) {
                    tableLocked = true;
                }
                if (table.isNoDelete()) {
                    tableNoDelete = true;
                }
            }

            $menu.data('tablename', tableName);
            $menu.data('tableId', tableId);
            $menu.data('tableelement', $dagTable);
            var activeFound = false;
            var tableWSId;
            var inColumnPickerMode = $('#container').hasClass('columnPicker');

            $menu.find('.deleteTable').removeClass('hidden');
            $menu.find("li.unavailable").removeClass("unavailable");
            $menu.find(".deleteTableDescendants").addClass("unavailable");

            if ($dagTable.hasClass("dataStore") &&
                !$dagTable.hasClass("retina")) {
                $menu.addClass("dataStoreMode");
            } else {
                $menu.removeClass("dataStoreMode");
            }

            if ($dagTable.hasClass("unexpectedNode")) {
                $menu.addClass("unexpectedNode");
            } else {
                $menu.removeClass("unexpectedNode");
            }

            // if active table, hide "addTable" and show "focusTable"
            $('#activeTablesList').find('.tableInfo').each(function() {
                var $li = $(this);
                if ($li.data('id') === tableId) {
                    $menu.find('.addTable, .revertTable').addClass('hidden');
                    $menu.find('.focusTable, .makeTempTable')
                         .removeClass('hidden');
                    if (!tableLocked && !inColumnPickerMode) {
                        $menu.find('.deleteTable')
                             .removeClass('hidden');
                    } else {
                        $menu.find('.deleteTable')
                             .addClass('hidden');
                    }
                    activeFound = true;
                    tableWSId = WSManager.getWSFromTable(tableId);
                    $menu.data('ws', tableWSId);
                    return (false);
                }
            });

            // to check if aggregate table, in which case we disallow
            // many options
            var operator = $dagTable.siblings('.actionType').data('type');
            if (operator === "aggregate") {
                $menu.find('.addTable, .revertTable, .focusTable, ' +
                            '.addNoDelete, .makeTempTable').addClass('hidden');
            } else if (activeFound) {
                // already in WS, cannot add or revert to worksheet
                $menu.find('.addTable, .revertTable').addClass('hidden');
                $menu.find(".makeTempTable").removeClass("hidden");
            } else {
                // not in WS, allow adding and reverting, disallow archiving
                $menu.find('.addTable, .revertTable').removeClass('hidden');
                $menu.find('.focusTable, .makeTempTable').addClass('hidden');
            }

            var $dagWrap = $dagTable.closest('.dagWrap');
            if ($dagWrap.hasClass('locked')) {
                $menu.find('.revertTable').addClass('unavailable');
            } else {
                $menu.find('.revertTable').removeClass('unavailable');
            }

            xcHelper.enableMenuItem($menu.find("li"));
            TblMenu.showDagAndTableOptions($menu, null, $dagTable);

            if (tableNoDelete) {
                $menu.find('.removeNoDelete').removeClass("hidden");
                $menu.find('.addNoDelete').addClass("hidden");
                $menu.find("li.deleteTable").addClass("unavailable");
            } else {
                // $lis get unavailable class removed at the top of function
                $menu.find('.removeNoDelete').addClass("hidden");
                $menu.find('.addNoDelete').removeClass("hidden");
            }

            if (isDropped) {
                var $unavailableLis = $menu.find("li:not(.showSchema)");
                $unavailableLis.addClass("unavailable");
                xcTooltip.add($unavailableLis, {
                    title: "Cannot operate on dropped tables"
                });
            }

            if ($("#container").hasClass("dfEditState")) {
                $menu.find(".exitEdit").removeClass("hidden");
            } else {
                $menu.find(".exitEdit").addClass("hidden");
            }

            positionAndShowDagTableDropdown($dagTable, $menu, $(event.target));
            xcMenu.addKeyboardNavigation($menu);
            $dagTable.addClass("selected");
        });
    }

    function setupDagOpDropdown() {
        var $menu = $dagPanel.find('.dagOperationDropDown');
        xcMenu.add($menu);
        dagOpDropDownActions($menu);

        $dagPanel.on('click', '.actionTypeWrap', function(event) {
            $('.menu').hide().removeClass('leftColMenu');
            xcMenu.removeKeyboardNavigation();
            $('#dagSchema').removeClass("active");
            var $dagWrap = $(this).closest(".dagWrap");

            var $opIcon = $(this);
            var $opWrap = $opIcon.closest(".actionType");

            var $dagTable = $opIcon.closest(".dagTableWrap").find(".dagTable");
            var tableName = $opWrap.data("table");
            var tableId = xcHelper.getTableId(tableName);

            $menu.find(".expandTag, .collapseTag, .undoEdit, .exitEdit, " +
                        ".commentOp, .editOp")
                 .addClass("xc-hidden");

            if (!$("#container").hasClass("formOpen")) {
                $menu.find(".editOp").removeClass("xc-hidden");
            }

            if ($opWrap.hasClass("tagHeader")) {
                if ($opWrap.hasClass("expanded")) {
                    $menu.find(".collapseTag").removeClass("xc-hidden");
                } else {
                    $menu.find(".expandTag").removeClass("xc-hidden");
                }
            }
            if ($opWrap.hasClass("index")) {
                $menu.find(".editOp").addClass("unavailable");
                xcTooltip.add($menu.find(".editOp"), {
                    title: DFTStr.NoEditIndex
                });
            } else if (!$opWrap.hasClass("groupBy") && !$opWrap.hasClass("map") &&
                !$opWrap.hasClass("filter") && !$opWrap.hasClass("join") &&
                !$opWrap.hasClass("aggregate") && !$opWrap.hasClass("project") &&
                !$opWrap.hasClass("union")) {
                // XXX need  check for extension operation
                $menu.find(".editOp").addClass("unavailable");
                xcTooltip.add($menu.find(".editOp"), {
                    title: DFTStr.NoEditSupported
                });
            } else {
                var hasDroppedParentNoMeta = false;
                if ($opWrap.hasClass("project")) {
                    hasDroppedParentNoMeta = Dag.hasDroppedParentAndNoMeta($dagTable);
                }

                if (hasDroppedParentNoMeta) {
                    xcHelper.disableMenuItem($menu.find(".editOp"), {
                        "title": DFTStr.NoEditDropped
                    });
                } else {
                    xcTooltip.remove($menu.find(".editOp"));

                    if ($opWrap.hasClass("collapsed") && !$opWrap.hasClass("union")) {
                        $menu.find(".editOp").addClass("unavailable");
                        xcTooltip.add($menu.find(".editOp"), {
                            title: DFTStr.ExpandToEdit
                        });
                    } else {
                        var hideEdit = false;
                        if ($opWrap.parent().hasClass("tagged")) {
                            var allDagInfo = $dagWrap.data("allDagInfo");
                            var nodeId = $opWrap.data("id") + "";
                            var node = allDagInfo.nodeIdMap[nodeId];
                            for (var i = 0; i < node.value.tags.length; i++) {
                                if (node.value.tags[i].indexOf(SQLOps.Union) === 0) {
                                    var tagId = xcHelper.getTableId(node.value.tags[i]);
                                    if (allDagInfo.tagGroups[tagId] &&
                                        allDagInfo.tagGroups[tagId].group.indexOf(nodeId) > -1) {
                                        hideEdit = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (hideEdit) {
                            $menu.find(".editOp").addClass("unavailable");
                                xcTooltip.add($menu.find(".editOp"), {
                                title: "Please edit the Union operation directly"
                            });
                        } else {
                            $menu.find(".editOp").removeClass("unavailable");
                        }
                    }

                    if ($opWrap.closest(".dagTableWrap.hasEdit").length) {
                        $menu.find(".undoEdit").removeClass("xc-hidden");
                    }
                }
            }

            if ($dagTable.hasClass(DgDagStateTStr[DgDagStateT.DgDagStateDropped])) {
                xcHelper.disableMenuItem($menu.find(".commentOp"), {
                    "title": DFTStr.NoCommentDropped
                });
            } else {
                $menu.find(".commentOp").removeClass("unavailable");
                xcTooltip.remove($menu.find(".commentOp"));
                if ($opWrap.hasClass("hasComment")) {
                    $menu.find(".commentOp").text(DFTStr.EditComment);
                } else {
                    $menu.find(".commentOp").text(DFTStr.NewComment);
                }
            }

            if (DagEdit.isEditMode()) {
                $menu.find(".exitEdit").removeClass("xc-hidden");
                if ($opWrap.hasClass("union")) {
                    $menu.find(".expandTag").addClass("xc-hidden");
                }
            } else if (!$("#container").hasClass("formOpen")) {
                $menu.find(".commentOp").removeClass("xc-hidden");
            }

            positionAndShowDagTableDropdown($opIcon, $menu, $(event.target));
            xcMenu.addKeyboardNavigation($menu);
            $menu.data('tablename', tableName);
            $menu.data('tableId', tableId);
            $menu.data('nodeId', $opWrap.data("id"));
            $menu.data('opIcon', $opWrap);
            // $dagTable.addClass("selected");
        });
    }

    function setupRightClickDropdown() {
        var $menu = $dagPanel.find('.rightClickDropDown');
        xcMenu.add($menu);
        addRightClickActions($menu);

        $dagPanel[0].oncontextmenu = function(e) {
            var $target = $(e.target);
            var $dagWrap = $target.closest('.dagWrap');
            if ($dagWrap.hasClass("invalid") || $dagWrap.hasClass("error")) {
                return;
            }

            $target = $target.closest('.dagTable');
            if ($target.length) {
                $target.trigger('click');
                return false;
            } else if ($(e.target).closest(".actionTypeWrap").length) {
                $(e.target).closest(".actionTypeWrap").trigger("click");
                return false;
            } else if ($dagWrap.length !== 0) {
                $('.menu').hide().removeClass('leftColMenu');
                $('#dagSchema').removeClass("active");
                $menu.data('dagid', $dagWrap.data('id'));
                var tree = $dagWrap.data("allDagInfo").tree;
                var tableName = tree.value.name;
                $menu.data('tableName', tableName);
                positionAndShowRightClickDropdown(e, $menu);
                xcMenu.addKeyboardNavigation($menu);
                return false;
            }
        };
    }

    function addDataFlowAction($dagWrap) {
        var formBusy = $('#workspaceMenu').children().filter(function() {
            return !$(this).hasClass('xc-hidden') &&
                    !$(this).hasClass('menuSection');
        }).length > 0;

        if (!formBusy) {
            var tableId = $dagWrap.data('id');
            DagFunction.focusTable(tableId);
            if (!gTables[tableId].hasLock()) {
                DFCreateView.show($dagWrap);
            }
        }
    }

    function setupDataFlowBtn() {
        $dagPanel.on('click', '.addDataFlow', function() {
            var $dagWrap = $(this).closest(".dagWrap");
            addDataFlowAction($dagWrap);
        });

        $dagPanel.on('click', '.saveImageBtn', function() {
            var $dagWrap = $(this).closest('.dagWrap');
            var tree  = $dagWrap.data("allDagInfo").tree;
            var tableName = tree.value.name;
            DagPanel.saveImageAction($dagWrap, tableName);
        });

        $dagPanel.on('click', '.newTabImageBtn', function() {
            var $dagWrap = $(this).closest('.dagWrap');
            DagPanel.newTabImageAction($dagWrap);
        });

        $dagPanel.on('click', '.editBtn', function() {
            var $dagWrap = $(this).closest('.dagWrap');
            if ($dagWrap.hasClass("editMode")) {
                DagEdit.off();
            } else {
                DagEdit.on($dagWrap.data("allDagInfo").tree);
            }
        });

        $dagPanel.on("click", ".runBtn", function() {
            var $dagWrap = $(this).closest(".dagWrap");
            var tableId = $dagWrap.data("id");
            var tableName = gTables[tableId].getName();
            var edits = DagEdit.getInfo();

            if (!Object.keys(edits.structs).length &&
                !Object.keys(edits.newNodes).length) {
                return;
            } else {
                Alert.show({
                    "title": AlertTStr.RunEdit,
                    "msg": AlertTStr.RunEditConfirm,
                    "onConfirm": function() {
                        DagEdit.off(null, true, true);
                        TblFunc.focusTable(tableId);
                        DagFunction.runProcedureWithParams(tableName, edits.structs, edits.newNodes, edits.insertNodes);
                    }
                });
            }
        });
    }

    function addRightClickActions($menu) {
        $menu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data('action');
            if (!action) {
                return;
            }

            var tableName = $menu.data('tableName');
            var dagId = $menu.data('dagid');
            var $dagWrap = $('#dagWrap-' + dagId);

            switch (action) {
                case ('saveImage'):
                    DagPanel.saveImageAction($dagWrap, tableName);
                    break;
                case ('newTabImage'):
                    DagPanel.newTabImageAction($dagWrap);
                    break;
                case ('expandAll'):
                    Dag.expandAll($dagWrap);
                    break;
                case ('collapseAll'):
                    Dag.collapseAll($dagWrap);
                    break;
                case ('dataflow'):
                    // Note: this refactor adds formbusy check to right click
                    // and is retina check to button setting.
                    // ***Remove this comment in final patch set after review***
                    addDataFlowAction($dagWrap);
                    break;
                case ('none'):
                    // do nothing;
                    break;
                default:
                    console.warn('menu action not recognized: ' + action);
                    break;
            }
        });

        $menu[0].oncontextmenu = function() {
            return false;
        };
    }

    function downloadImage(canvas, filename) {
        if (filename.split(".").pop().toLowerCase !== "png") {
            filename += ".png";
        }
        // create an "off-screen" anchor tag
        var lnk = document.createElement('a');
        var e;

        // the key here is to set the download attribute of the a tag
        lnk.download = filename;

        canvas.toBlob(function(blob) {
            var newImg = document.createElement('img');
            var url = URL.createObjectURL(blob);
            newImg.onload = function() {
                lnk.href = url;
                if (lnk.href.length < 8) {
                    // was not able to make url because image is probably too large
                    saveImgError(canvas);
                } else if (document.createEvent) {
                    e = document.createEvent("MouseEvents");
                    e.initMouseEvent("click", true, true, window,
                                     0, 0, 0, 0, 0, false, false, false,
                                     false, 0, null);
                    // dispatchEvent return value not related to success
                    lnk.dispatchEvent(e);
                } else if (lnk.fireEvent) {
                    // fireevent has no return value
                    lnk.fireEvent("onclick");
                } else {
                    // No event fired.
                    return false;
                }

                URL.revokeObjectURL(url);
            };

            newImg.onerror = function() {
                saveImgError(canvas);
            };

            newImg.src = url;
        });
    }

    function saveImgError(canvas) {
        Alert.show({
            "title": ErrTStr.LargeImgSave,
            "msg": ErrTStr.LargeImgText,
            "isAlert": true
        });
        $(canvas).closest('.dagWrap').addClass('unsavable');
    }

    function positionAndShowRightClickDropdown(e, $menu) {
        var topMargin = 3;
        var leftMargin = dagPanelLeft - 7;
        var menuWidth = 0;
        var left;
        var top;
        if (MainMenu.isMenuOpen()) {
            menuWidth = 285;
        }

        if (window.isBrowserIE) {
            left = e.pageX;
        } else {
            leftMargin += menuWidth;
            left = e.pageX - leftMargin;
        }

        top = e.pageY + topMargin;


        // hack needed as of 9/26/2016
        if (!window.isBrowserIE) {
            // if dagpanel is open halfway we have to change the top position
            // of colmenu
            top -= $('#dagPanel').offset().top;
        }

        var dagId = $menu.data('dagid');
        var $dagWrap = $('#dagWrap-' + dagId);
        if ($dagWrap.hasClass('unsavable') || $dagWrap.hasClass("error")) {
            $menu.find('.saveImage, .newTabImage').hide();
            $menu.find('.unsavable').show();
        } else {
            $menu.find('.saveImage, .newTabImage').show();
            $menu.find('.unsavable').hide();
        }

        DagPanel.toggleExpCollapseAllLi($dagWrap, $menu);

        var inColumnPickerMode = $('#container').hasClass('columnPicker');

        if ((gTables[dagId] && gTables[dagId].hasLock()) ||
            inColumnPickerMode || $("#container").hasClass("dfEditState")) {
            $menu.find('.deleteTable, .dataflow').hide();
        } else {
            $menu.find('.deleteTable, .dataflow').show();
        }

        $menu.find('.dataflow').removeClass('unavailable');
        xcTooltip.changeText($menu.find('.dataflow'), "");

        $menu.removeClass('leftColMenu');
        $menu.find('.selected').removeClass('selected');
        $menu.css({'top': top, 'left': left});
        $menu.show();

        var rightBoundary = $(window).width() - 5;

        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            if (isBrowserMicrosoft) {
                left = rightBoundary - $menu.width();
            } else {
                left = rightBoundary - (menuWidth + dagPanelLeft +
                                        $menu.width());
            }
            $menu.css('left', left).addClass('leftColMenu');
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $menu[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $menu.css('top', '-=' + $menu.height());
        }
    }

    function positionAndShowDagTableDropdown($dagTable, $menu, $target) {
        var topMargin = -3;
        var leftMargin = dagPanelLeft;
        var top = $dagTable[0].getBoundingClientRect().bottom + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - leftMargin;
        var menuWidth = 0;
        if (MainMenu.isMenuOpen()) {
            menuWidth = 285;
        }
        if (window.isBrowserIE) {
            left += leftMargin;
        } else {
            left -= menuWidth;
        }

        left = Math.max(2, left);
        if ($target.is('.tableTitle')) {
            top = $target[0].getBoundingClientRect().bottom + topMargin;
        }

        // hack needed as of 9/26/2016
        if (!window.isBrowserIE) {
            // if dagpanel is open halfway we have to change the top position
            // of colmenu
            top -= $('#dagPanel').offset().top;
        }

        $menu.removeClass('leftColMenu');
        $menu.find('.selected').removeClass('selected');
        $menu.css({'top': top, 'left': left});
        xcMenu.show($menu, function() {
            $dagTable.removeClass("selected");
        });
        var rightBoundary = $(window).width() - 5;

        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            if (window.isBrowserIE) {
                left = rightBoundary - $menu.width();
            } else {
                left = rightBoundary - (menuWidth + dagPanelLeft +
                                        $menu.width());
            }

            $menu.css('left', left).addClass('leftColMenu');
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $menu[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $menu.css('top', '-=' + ($menu.height() + 35));
        }
        xcTooltip.hideAll();
    }

    function dagTableDropDownActions($menu) {
        $menu.find('.dataStoreInfo').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            Dag.showDataStoreInfo($menu.data('tableelement'));
        });

        $menu.find('.addTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagFunction.addTable($menu.data('tableId'));
        });

        $menu.find('.revertTable').mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var oldTableName = $menu.data('tableelement').closest('.dagWrap')
                                    .find('.tableName').text();
            DagFunction.revertTable($menu.data('tableId'),
                                    $menu.data('tablename'), oldTableName);
        });

        $menu.find('.focusTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            DagFunction.focusTable(tableId);
            DagPanel.heightForTableReveal(null, true, true);
        });

        $menu.find('.addNoDelete').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableName = $menu.data("tablename");
            Dag.makeTableNoDelete(tableName);
            TblManager.makeTableNoDelete(tableName);
        });

        $menu.find('.removeNoDelete').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }

            var tableId = $menu.data("tableId");
            Dag.removeNoDelete(tableId);
            TblManager.removeTableNoDelete(tableId);
        });

        $menu.find('.deleteTable').mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $menu.data('tableId');
            var tableName = $menu.data('tablename');
            deleteTable(tableId, tableName);
        });

        $menu.find(".makeTempTable").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $menu.data('tableId');
            TblManager.sendTableToTempList(tableId);
        });

        $menu.find('.showSchema').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            Dag.showSchema($menu.data('tableelement'));
        });

        $menu.find(".exitEdit").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagEdit.off();
        });

        $menu.find(".generateIcv").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var $tableIcon = $menu.data('tableelement');
            var $dagWrap = $tableIcon.closest('.dagWrap');
            var headerTableId = $dagWrap.data("id");
            Dag.generateIcvTable(headerTableId,
                                $menu.data('tablename'), $tableIcon);
        });

        $menu.find(".complementTable").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            Dag.generateComplementTable($menu.data('tablename'));
        });
    }

    function dagOpDropDownActions($menu) {
        $menu.on('mouseup', 'li', function(event) {
            var $li = $(this);
            if (event.which !== 1 || $li.hasClass("unavailable")) {
                return;
            }
            var action = $li.data('action');
            if (!action) {
                return;
            }

            var nodeId = $menu.data("nodeId");
            var $dagWrap = $menu.data("opIcon").closest(".dagWrap");
            var allDagInfo;
            var node;

            switch (action) {
                case ("editOp"):
                    allDagInfo = $dagWrap.data("allDagInfo");
                    node = allDagInfo.nodeIdMap[nodeId];

                    if (!$dagWrap.hasClass("editMode")) {
                        $dagWrap.find(".startEdit").click();
                    }
                    DagEdit.editOp(node);
                    break;
                case ("undoEdit"):
                    allDagInfo = $dagWrap.data("allDagInfo");
                    node = allDagInfo.nodeIdMap[nodeId];
                    DagEdit.undoEdit(node);
                    break;
                case ("exitEdit"):
                    DagEdit.off();
                    break;
                case ("commentOp"):
                    DFCommentModal.show($menu.data("opIcon"), nodeId);
                    break;
                case ("expandTag"):
                case ("collapseTag"):
                    Dag.toggleTaggedGroup($dagWrap, $menu.data("opIcon"));
                    break;
                case ("exitFormOption"):
                    MainMenu.closeForms();
                    break;
                case ("none"):
                    // do nothing;
                    break;
                default:
                    console.warn('menu action not recognized: ' + action);
                    break;
            }
        });

        $menu.on("mouseenter", ".collapseTag", function() {
            var $opIcon = $menu.data("opIcon");
            var $icon = $opIcon.find(".groupTagIcon");
            var $dagWrap = $opIcon.closest(".dagWrap");
            var tagId = $icon.data("tagid");
            var dagInfo = $icon.closest(".dagWrap").data("allDagInfo");
            var tagGroup = dagInfo.tagGroups[tagId].group;
            for (var i = 0; i < tagGroup.length; i++) {
                var nodeId = tagGroup[i];
                var $dagTable = Dag.getTableIcon($dagWrap, nodeId);
                $dagTable.closest(".dagTableWrap").addClass("tagHighlighted");
            }
        });

        $menu.on("mouseleave", ".collapseTag", function() {
            var $opIcon = $menu.data("opIcon");
            var $dagWrap = $opIcon.closest(".dagWrap");
            $dagWrap.find(".tagHighlighted").removeClass("tagHighlighted");
        });
    }

    function deleteTable(tableId, tableName) {
        var table = gTables[tableId];
        if (table && table.hasLock()) {
            return;
        }
        var $table = $('#xcTableWrap-' + tableId);

        // check if table visibile, else check if its in the inactivelist,
        // else check if its in the orphan list, else just delete the table
        if ($table.length !== 0 && !$table.hasClass('locked') &&
            !$table.hasClass("noDelete")) {
            var msg = xcHelper.replaceMsg(TblTStr.DelMsg, {
                "table": tableName
            });
            Alert.show({
                "title": TblTStr.Del,
                "msg": msg,
                "onConfirm": function() {
                    TblManager.deleteTables(tableId, TableType.Active)
                    .then(function() {
                        XcSupport.memoryCheck(true);
                    });
                }
            });
        } else if (table) {
            TableList.refreshOrphanList()
            .then(function() {
                $('#orphanedTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('tablename') === tableName) {
                        $li.find('.addTableBtn').click();
                        $('#orphanedTableListSection .submit.delete').click();
                        return (false);
                    }
                });
            });
        } else {
            // check if aggregate
            if (Aggregates.getAggs()[tableName]) {
                Aggregates.deleteAggs([tableName])
                .then(function() {
                    TableList.removeTable(tableName, TableType.Aggregate);
                });
                // fail case is being handled in
                // Aggregates.deleteAggs transaction
            } else {
                var orphanFound = false;
                $('#orphanedTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('tablename') === tableName) {
                        $li.find('.addTableBtn').click();
                        $('#orphanedTableListSection .submit.delete').click();
                        orphanFound = true;
                        return (false);
                    }
                });
                if (orphanFound) {
                    return;
                }
                // this is the case when user pull out a backend table A, then
                // delete another table in the dag node of A but that table is
                // not in orphaned list
                var sql = {
                    "operation": SQLOps.DeleteTable,
                    "tableName": tableName,
                    "tableType": TableType.Unknown
                };
                var txId = Transaction.start({
                    "operation": SQLOps.DeleteTable,
                    "sql": sql,
                    "steps": 1
                });

                XIApi.deleteTable(txId, tableName)
                .then(function() {
                    Dag.makeInactive(tableName, true);
                    // delete table will change meta, so should commit
                    Transaction.done(txId, {
                        "title": TblTStr.Del
                    });
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.DeleteTableFailed,
                        "error": error
                    });
                });
            }
        }
    }

    function setupScrollBar() {
        var $scrollBarWrap = $('#dagScrollBarWrap');
        $scrollBarWrap.scroll(function() {
            if (gMouseEvents.getLastMouseDownTarget().attr('id') ===
                "dagScrollBarWrap") {
                var scrollLeft = $(this).scrollLeft();
                var id = $(this).data('id');
                $('#dagWrap-' + id).find('.dagImageWrap')
                                   .scrollLeft(scrollLeft);
            }
        });

        var wheeling = false;
        var wheelTimeout;
        $scrollBarWrap.on('mousewheel', function() {
            if (!wheeling) {
                wheeling = true;
                gMouseEvents.setMouseDownTarget($(this));
            }
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(function() {
                wheeling = false;
            }, 100);
        });
    }



    if (window.unitTestMode) {
        DagPanel.__testOnly__ = {};
        DagPanel.__testOnly__.addDataFlowAction = addDataFlowAction;
    }

    return (DagPanel);

}(jQuery, {}));
