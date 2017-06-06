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
        setupRightClickDropdown();
        Dag.setupDagSchema();
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
        if ($dagPanel.hasClass('hidden')) {
            // open df by triggering panelSwitch click
            // set dagTopPct to 50 so it opens half way
            dagTopPct = 50;
            $panelSwitch.click();
            $('#maximizeDag').removeClass('unavailable');
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

        var animateDelay = noAnimateDelay ? 0 : 100;
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

        var dagPanelTop = 0;
        $dagPanel.on('mousedown', '.ui-resizable-n', function() {
            dagPanelTop = $dagPanel.position().top;
        });

        var resizeTimer;
        var $xcTables;

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
            },
            resize: function() {
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
                // Refocus on table
                Dag.focusDagForActiveTable(undefined, true);

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
            $('#dagSchema').hide();
            var $dagTable = $(this).closest('.dagTable');
            if (!$dagTable.hasClass(DgDagStateTStr[5])) {
                // if dag does not have ready state, don't show dropdown
                return;
            }

            var tableName = $dagTable.find('.tableTitle').text().trim();
            var tableId = $dagTable.data('id');
            var table = gTables[tableId];
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

            // if active table, hide "addTable" and show "focusTable"
            $('#activeTablesList').find('.tableInfo').each(function() {
                var $li = $(this);
                if ($li.data('id')=== tableId) {
                    $menu.find('.addTable, .revertTable').addClass('hidden');
                    $menu.find('.focusTable, .archiveTable')
                         .removeClass('hidden');
                    if (!tableLocked && !inColumnPickerMode) {
                        $menu.find('.archiveTable, .deleteTable')
                             .removeClass('hidden');
                    } else {
                        $menu.find('.archiveTable, .deleteTable')
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
                            '.archiveTable, .addNoDelete').addClass('hidden');
            } else if (activeFound) {
                // already in WS, cannot add or revert to worksheet
                $menu.find('.addTable, .revertTable').addClass('hidden');
            } else {
                // not in WS, allow adding and reverting, disallow archiving
                $menu.find('.addTable, .revertTable').removeClass('hidden');
                $menu.find('.focusTable, .archiveTable').addClass('hidden');
            }

            var $dagWrap = $dagTable.closest('.dagWrap');
            if ($dagWrap.hasClass('locked')) {
                $menu.find('.revertTable').addClass('unavailable');
            } else {
                $menu.find('.revertTable').removeClass('unavailable');
            }

            var $genIcvLi = $menu.find('.generateIcv');
            if ($dagTable.find(".dagTableIcon").hasClass("icv")) {
                xcHelper.disableMenuItem($genIcvLi, {
                    "title": TooltipTStr.AlreadyIcv
                });
            } else {
                if ($dagTable.hasClass("generatingIcv")) {

                    xcHelper.disableMenuItem($genIcvLi, {
                        "title": TooltipTStr.IcvGenerating
                    });
                } else if (!$dagTable.hasClass("icv") &&
                    (operator === 'map' || operator === 'groupBy')) {
                    if (isParentDropped($dagTable)) {
                        xcHelper.disableMenuItem($genIcvLi, {
                            "title": TooltipTStr.IcvSourceDropped
                        });
                    } else {
                        xcHelper.enableMenuItem($genIcvLi);
                    }
                } else {
                    xcHelper.disableMenuItem($genIcvLi, {
                        "title": TooltipTStr.IcvRestriction
                    });
                }
            }

            var $complimentLi = $menu.find('.complementTable');
            if (operator === "filter") {
                if ($dagTable.hasClass("generatingComplement")) {
                    xcHelper.disableMenuItem($complimentLi, {
                        "title": TooltipTStr.generatingComplement
                    });
                } else if (isParentDropped($dagTable)) {
                    xcHelper.disableMenuItem($complimentLi, {
                        "title": TooltipTStr.ComplementSourceDropped
                    });
                } else {
                    xcHelper.enableMenuItem($complimentLi);
                }
            } else {
                xcHelper.disableMenuItem($complimentLi, {
                    "title": TooltipTStr.ComplementRestriction
                });
            }

            if (tableNoDelete) {
                $menu.find('.removeNoDelete').removeClass("hidden");
                $menu.find('.addNoDelete').addClass("hidden");
                $menu.find("li.deleteTable").addClass("unavailable");
            } else {
                // $lis get unavailable class removed at the top of function
                $menu.find('.removeNoDelete').addClass("hidden");
                $menu.find('.addNoDelete').removeClass("hidden");
            }

            positionAndShowDagTableDropdown($dagTable, $menu, $(event.target));
            xcMenu.addKeyboardNavigation($menu);
        });
    }

    function setupRightClickDropdown() {
        var $menu = $dagPanel.find('.rightClickDropDown');
        xcMenu.add($menu);
        addRightClickActions($menu);

        $dagPanel[0].oncontextmenu = function(e) {
            var $target = $(e.target);
            var $dagWrap = $target.closest('.dagWrap');

            $target = $(e.target).closest('.dagTable');
            if ($target.length) {
                $target.trigger('click');
                return false;
            } else if ($dagWrap.length !== 0) {
                $('.menu').hide().removeClass('leftColMenu');
                $('#dagSchema').hide();
                $menu.data('dagid', $dagWrap.data('id'));
                var tableName = $dagWrap.find('.dagTable[data-index="0"]')
                                        .data('tablename');
                $menu.data('tableName', tableName);
                positionAndShowRightClickDropdown(e, $menu);
                xcMenu.addKeyboardNavigation($menu);
                return false;
            }
        };
    }

    function addDataFlowAction($dagWrap) {
        if ($dagWrap.hasClass('fromRetina')) {
            return;
        }

        var formBusy = $('#workspaceMenu').children().filter(function() {
            return !$(this).hasClass('xc-hidden') &&
                    !$(this).hasClass('menuSection');
        }).length > 0;

        if (!formBusy) {
            var tableId = $dagWrap.data('id');
            DagFunction.focusTable(tableId);
            if (!gTables[tableId].hasLock() &&
                !$dagWrap.hasClass('fromRetina')) {
                DFCreateView.show($dagWrap);
            }
        }
    }

    DagPanel.saveImageAction = function($dagWrap, tableName) {
        var deferred = PromiseHelper.deferred();
        Dag.createSavableCanvas($dagWrap, tableName)
        .then(function() {
            var success = false;
            var canvas = $dagWrap.find('canvas').eq(1)[0];
            if ($('html').hasClass('microsoft')) { // for IE
                var blob = canvas.msToBlob();
                var name = tableName + '.png';
                success = window.navigator.msSaveBlob(blob, name);
                deferred.resolve();
            } else {
                success = downloadImage(canvas, tableName);
            }
            $dagWrap.find('canvas').eq(1).remove();
            if (success) {
                deferred.resolve();
            }
            deferred.reject();
        })
        .fail(deferred.reject);
        return deferred;
    };

    DagPanel.newTabImageAction = function($dagWrap) {
        var deferred = PromiseHelper.deferred();
        Dag.createSavableCanvas($dagWrap)
        .then(function() {
            var canvas = $dagWrap.find('canvas').eq(1)[0];
            var lnk = canvas.toDataURL("image/png");
            if (lnk.length < 8) {
                // was not able to make url because image is
                //probably too large
                Alert.show({
                    "title": ErrTStr.LargeImgTab,
                    "msg": ErrTStr.LargeImgText,
                    "isAlert": true
                });
                $dagWrap.addClass('unsavable');
                deferred.reject(ErrTStr.LargeImgText);
            } else {
                var newTab = window.open(lnk);
                deferred.resolve(newTab);
            }
            $dagWrap.find('canvas').eq(1).remove();
        })
        .fail(deferred.reject);

        return deferred;
    };

    // for map & groupby tables, does not handle joined tables
    function isParentDropped($dagTable) {
        var index = $dagTable.data('index');
        var $dagWrap = $dagTable.closest('.dagWrap');
        var nodes = $dagWrap.data('allDagInfo').nodes;
        var parentIdx = nodes[index].parents[0];
        var $parentTable = $dagWrap.find('.dagTable[data-index="' + parentIdx +
                                         '"]');
        var droppedClass = DgDagStateTStr[DgDagStateT.DgDagStateDropped];
        return $parentTable.hasClass(droppedClass);
    }

    function setupDataFlowBtn() {
        $dagPanel.on('click', '.addDataFlow', function() {
            var self = this;
            var $dagWrap = $(self).closest(".dagWrap");
            addDataFlowAction($dagWrap);
        });

        $dagPanel.on('click', '.saveImageBtn', function() {
            var $dagWrap = $(this).closest('.dagWrap');
            var tableName = $dagWrap.find('.dagTable[data-index="0"]')
                                        .data('tablename');
            DagPanel.saveImageAction($dagWrap, tableName);
        });

        $dagPanel.on('click', '.newTabImageBtn', function() {
            var $dagWrap = $(this).closest('.dagWrap');
            DagPanel.newTabImageAction($dagWrap);
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
            filename = filename += ".png";
        }
        /// create an "off-screen" anchor tag
        var lnk = document.createElement('a');
        var e;

        /// the key here is to set the download attribute of the a tag
        lnk.download = filename;

        /// convert canvas content to data-uri for link. When download
        /// attribute is set the content pointed to by link will be
        /// pushed as "download" in HTML5 capable browsers
        lnk.href = canvas.toDataURL();
        if (lnk.href.length < 8) {
            // was not able to make url because image is probably too large
            Alert.show({
                "title": ErrTStr.LargeImgSave,
                "msg": ErrTStr.LargeImgText,
                "isAlert": true
            });
            $(canvas).closest('.dagWrap').addClass('unsavable');
            return false;
        }

        /// create a "fake" click-event to trigger the download
        if (document.createEvent) {

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
        // Event fired, not sure if successful
        return true;
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
        if ($dagWrap.hasClass('unsavable') || $dagWrap.hasClass("tooLarge")) {
            $menu.find('.saveImage, .newTabImage').hide();
            $menu.find('.unsavable').show();
        } else {
            $menu.find('.saveImage, .newTabImage').show();
            $menu.find('.unsavable').hide();
        }

        DagPanel.toggleExpCollapseAllLi($dagWrap, $menu);

        var inColumnPickerMode = $('#container').hasClass('columnPicker');

        if ((gTables[dagId] && gTables[dagId].hasLock()) ||
            inColumnPickerMode) {
            $menu.find('.archiveTable, .deleteTable, .dataflow').hide();
        } else {
            $menu.find('.archiveTable, .deleteTable, .dataflow').show();
        }
        if ($dagWrap.hasClass('fromRetina')) {
            $menu.find('.dataflow').addClass('unavailable');
            xcTooltip.changeText($menu.find('.dataflow'),
                                DFTStr.CannotCreateMsg);
        } else {
            $menu.find('.dataflow').removeClass('unavailable');
            xcTooltip.changeText($menu.find('.dataflow'), "");
        }

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
        $menu.show();
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

        $menu.find('.archiveTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var table = gTables[tableId];
            if (table && table.hasLock()) {
                return;
            }
            TblManager.archiveTables([tableId]);
        });

        $menu.find('.deleteTable').mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var tableId = $menu.data('tableId');
            var tableName = $menu.data('tablename');
            deleteTable(tableId, tableName);
        });

        $menu.find('.showSchema').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            Dag.showSchema($menu.data('tableelement'));
        });

        $menu.find(".generateIcv").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }
            var $tableIcon = $menu.data('tableelement');
            var $dagWrap = $tableIcon.closest('.dagWrap');
            generateIcvTable($dagWrap.find('.tableName').text(),
                             $menu.data('tablename'), $tableIcon);
        });

        $menu.find(".complementTable").mouseup(function(event) {
            if (event.which !== 1 || $(this).hasClass("unavailable")) {
                return;
            }

            var $tableIcon = $menu.data('tableelement');
            // var $dagWrap = $tableIcon.closest('.dagWrap');
            generateComplementTable($menu.data('tablename'), $tableIcon);
        });

    }

    // return hasFoundIcvTable or not
    function isIcvTableExists(origTableId) {
        if (gTables.hasOwnProperty(origTableId)) {
            var icvTableName = gTables[origTableId].icv;
            if (icvTableName) {
                var icvTableId = xcHelper.getTableId(icvTableName);
                if (gTables.hasOwnProperty(icvTableId)) {
                    // Find out whether it's already active. If so, focus on it
                    // Else add it to worksheet
                    if (TableList.checkTableInList(icvTableId)) {
                        // Table is in active list. Simply focus
                        DagFunction.focusTable(icvTableId);
                        return true;
                    } else if (gTables[icvTableId].getType() === TableType.Undone) {
                        // Going to revert to it
                        gTables[origTableId].icv = "";
                        return false;
                    } else {
                        // Going to revert to it
                        DagFunction.addTable(icvTableId);
                        return true;
                    }
                } else {
                    // The table has been deleted. We are cleaning up lazily
                    // so here's the cleanup
                    gTables[origTableId].icv = "";
                }
            }
        }
        return false;
    }

    function getDagInfoForIcvTable(dagTableName, mapTableName) {
        var dagTree = DagFunction.get(xcHelper.getTableId(dagTableName));
        if (!dagTree) {
            // Error handling!
            // This should never ever happen. If this does though, we can always
            // re-get the DAG graph and then get the following
            console.error("Unrecoverable error. Cannot generate.");
            return null;
        }

        var treeNodes = dagTree.orderedPrintArray;
        var xcalarInput;
        var op = -1;
        for (var i = 0; i < treeNodes.length; i++) {
            var treeNode = treeNodes[i];
            if (treeNode.value.api !== XcalarApisT.XcalarApiMap &&
                treeNode.value.api !== XcalarApisT.XcalarApiGroupBy) {
                continue;
            }
            if (treeNode.value.struct.dstTable.tableName === mapTableName) {
                // Found it!
                xcalarInput = DagFunction.cloneDagNode(treeNode.value.inputName,
                                                       treeNode.value.struct);
                op = treeNode.value.api;
                break;
            }
        }

        if (!xcalarInput) {
            Alert.error(AlertTStr.Error, ErrTStr.IcvAlt);
            console.error("Failed. Check GetDag");
            return null;
        }

        return {
            "xcalarInput": xcalarInput,
            "op": op
        };
    }

    function generateComplementTable(dagTableName, $tableIcon) {
        var origTableId = xcHelper.getTableId(dagTableName);
        // Check whether this table already exists. If it does, then just add
        // or focus on that table
        if (isComplementTableExists(origTableId)) {
            return PromiseHelper.reject();
        }
        var $tableWrap = $tableIcon.closest(".dagTableWrap");
        var evalStr = $tableWrap.find(".actionType").data("info");
        // remove or add not() for complement
        if (evalStr.indexOf("not(") === 0 &&
            evalStr[evalStr.length - 1] === ")") {
            evalStr = evalStr.slice(4, -1);
        } else {
            evalStr = "not(" + evalStr + ")";
        }

        var fltOption = {
            filterString: evalStr,
            complement: true
        };
        var srcTableId = $tableWrap.prev().find(".dagTable").data("id");
        $tableIcon.addClass("generatingComplement");

        xcFunction.filter(1, srcTableId, fltOption)
        .then(function(newTableName) {
            if (gTables[origTableId]) {
                gTables[origTableId].complement = newTableName;

                var newId = xcHelper.getTableId(newTableName);
                if (gTables[newId]) {
                    gTables[newId].complement = dagTableName;
                }
            }
        })
        .always(function() {
            $tableIcon.removeClass("generatingComplement");
        });
    }

    function isComplementTableExists(origTableId) {
        if (gTables[origTableId]) {
            var complementTableName = gTables[origTableId].complement;
            if (!complementTableName) {
                return false;
            }

            var complementTableId = xcHelper.getTableId(complementTableName);
            if (gTables[complementTableId]) {
                // Find out whether it's already active. If so, focus on it
                // Else add it to worksheet
                if (TableList.checkTableInList(complementTableId)) {
                    // Table is in active list. Simply focus
                    DagFunction.focusTable(complementTableId);
                    return true;
                } else if (gTables[complementTableId].getType() ===
                            TableType.Undone) {
                    // Going to revert to it
                    gTables[origTableId].complement = "";
                } else {
                    // Going to revert to it
                    DagFunction.addTable(complementTableId);
                    return true;
                }
            } else {
                // The table has been deleted. We are cleaning up lazily
                // so here's the cleanup
                gTables[origTableId].complement = "";
            }

        }
        return false;
    }

    function generateIcvTable(dagTableName, mapTableName, $tableIcon) {
        var origTableId = xcHelper.getTableId(mapTableName);
        // Check whether this table already exists. If it does, then just add
        // or focus on that table
        if (isIcvTableExists(origTableId)) {
            return PromiseHelper.reject();
        }

        var icvDagInfo = getDagInfoForIcvTable(dagTableName, mapTableName);
        if (icvDagInfo == null) {
            // error case, should already handled
            return PromiseHelper.reject();
        }
        var deferred = jQuery.Deferred();
        var xcalarInput = icvDagInfo.xcalarInput;
        var op = icvDagInfo.op;

        var origTableName = xcalarInput.dstTable.tableName;
        var tableRoot = xcHelper.getTableName(origTableName);
        var newTableId = Authentication.getHashId();
        var newTableName = tableRoot + "_er" + newTableId;

        xcalarInput.dstTable.tableName = newTableName;
        xcalarInput.icvMode = true;  // Turn on icv
        var origColName = xcalarInput.newFieldName;
        xcalarInput.newFieldName = origColName + "_er";
        // We want to skip all the checks, including all the indexes and stuff
        var $errMsgTarget = $tableIcon;
        var options;
        var sql;
        var txId;
        var idx;
        var scrollChecker = new ScollTableChecker();

        switch (op) {
            case (XcalarApisT.XcalarApiMap):
                options = {"replaceColumn": true, "createNewTable": true};
                sql = {
                    "operation": SQLOps.Map,
                    "tableName": origTableName,
                    "tableId": origTableId,
                    "fieldName": xcalarInput.newFieldName,
                    "mapString": xcalarInput.evalStr,
                    "mapOptions": options
                };
                txId = Transaction.start({
                    "msg": StatusMessageTStr.Map + " erroneous rows",
                    "operation": SQLOps.Map,
                    "sql": sql,
                    "steps": 1
                });

                idx = -1;
                $tableIcon.addClass("generatingIcv");

                XcalarMapWithInput(txId, xcalarInput)
                .then(function() {
                    return postOperation(txId);
                })
                .then(function() {
                    if (gTables[origTableId]) {
                        gTables[origTableId].icv = newTableName;
                    }

                    Profile.copy(origTableId, newTableId);
                    sql.newTableName = newTableName;
                    if (idx > -1) {
                        sql.colNum = idx;
                    } else {
                        sql.colNum = 1;
                    }
                    Transaction.done(txId, {
                        "msgTable": newTableId,
                        "sql": sql
                    });
                    deferred.resolve();
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.MapFailed,
                        "error": error,
                        "sql": sql
                    });
                    StatusBox.show(ErrTStr.IcvFailed, $errMsgTarget);
                    deferred.reject();
                })
                .always(function() {
                    $tableIcon.removeClass("generatingIcv");
                });
                break;
            case (XcalarApisT.XcalarApiGroupBy):
                options = {"replaceColumn": true};
                // XXX This is going to screw up replay
                sql = {
                    "operation": SQLOps.GroupBy,
                    "tableName": origTableName,
                    "tableId": origTableId,
                    "newColName": xcalarInput.newFieldName,
                    "newTableName": newTableName,
                };
                txId = Transaction.start({
                    "msg": StatusMessageTStr.GroupBy + " ICV mode",
                    "operation": SQLOps.GroupBy,
                    "sql": sql,
                    "steps": 1
                });

                idx = -1;
                $tableIcon.addClass("generatingIcv");

                XcalarGroupByWithInput(txId, xcalarInput)
                .then(function() {
                    return postOperation(txId);
                })
                .then(function() {
                    if (gTables[origTableId]) {
                        gTables[origTableId].icv = newTableName;
                    }
                    sql.newTableName = newTableName;
                    if (idx > -1) {
                        sql.colNum = idx;
                    } else {
                        sql.colNum = 1;
                    }
                    Transaction.done(txId, {
                        "msgTable": newTableId,
                        "sql": sql
                    });
                    deferred.resolve();
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.GroupByFailed,
                        "error": error,
                        "sql": sql
                    });
                    StatusBox.show(ErrTStr.IcvFailed, $errMsgTarget);
                    deferred.reject();
                })
                .always(function() {
                    $tableIcon.removeClass("generatingIcv");
                });
                break;
            default:
                console.error("Shouldn't get here");
                deferred.reject();
                break;
        }

        return deferred.promise();

        function postOperation(txId) {
            var newCols = [];
            if (origTableId in gTables) {
                idx = gTables[origTableId].getColNumByBackName(origColName);
                if (idx > -1) {
                    newCols = xcHelper.mapColGenerate(idx,
                                             xcalarInput.newFieldName,
                                             xcalarInput.evalStr,
                                             gTables[origTableId].tableCols,
                                             options);
                } else {
                    newCols = xcHelper.mapColGenerate(1,
                                             xcalarInput.newFieldName,
                                             xcalarInput.evalStr,
                                             gTables[origTableId].tableCols,
                                             {});
                }
            } else {
                // Just leave the tableCols empty and let the user pull it
            }

            if (idx > -1) {
                options = {"selectCol": idx};
            } else {
                options = {};
            }

            options.focusWorkspace = scrollChecker.checkScroll();
            var worksheet = WSManager.getWSFromTable(origTableId);
            if (!worksheet) {
                worksheet = WSManager.getActiveWS();
            }

            return TblManager.refreshTable([newTableName], newCols, [],
                                           worksheet, txId, options);
        }
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
                    TblManager.deleteTables(tableId, TableType.Active);
                }
            });
        } else if (table) {
            if (table.getType() === TableType.Orphan) {
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
                $('#inactiveTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('id') === tableId) {
                        $li.find('.addTableBtn').click();
                        $('#archivedTableListSection .submit.delete').click();
                        return (false);
                    }
                });
            }
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
                    Transaction.done(txId);
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
        DagPanel.__testOnly__.generateIcvTable = generateIcvTable;
        DagPanel.__testOnly__.isComplementTableExists = isComplementTableExists;
    }

    return (DagPanel);

}(jQuery, {}));

window.Dag = (function($, Dag) {
    var $dagPanel;
    var scrollPosition = -1;
    var dagAdded = false;
    var dagPanelLeft;

    // constants
    var dagTableHeight = 40;
    var dagTableOuterHeight = dagTableHeight + 25;
    var dagTableWidth = 214; // includes the blue table and gray operation icon
    var dataStoreWidth = 64;
    var groupOutlineOffset = 20;
    var condenseLimit = 15; // number of tables wide before we allow condensing
    var canvasLimit = 32767;
    var canvasAreaLimit = 268435456;
    // colors needed for drawing and saving canvas
    var lineColor = '#848484';
    var tableTitleColor = "#555555";
    var titleBorderColor = '#A5A5A5';
    var tableFontColor = '#6E6E6E';
    var operationFontColor = '#4D4D4D';
    var strokeWidth = 2; // 2px. make sure this is an even number. Or you have
                         // to start your path on a 0.5px thingy

    Dag.construct = function(tableId, tablesToRemove) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.tableName;
        $dagPanel = $('#dagPanel');

        XcalarGetDag(tableName)
        .then(function(dagObj) {
            DagFunction.construct(dagObj, tableId);
            if (tablesToRemove) {
                for (var i = 0, len = tablesToRemove.length; i < len; i++) {
                    $('#dagWrap-' + tablesToRemove[i]).remove();
                }
            }
            var isWorkspacePanelVisible = $('#workspacePanel')
                                            .hasClass('active');
            var isDagPanelVisible = !$('#dagPanel').hasClass('xc-hidden');
            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').addClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').removeClass('xc-hidden');
            }
            var isFromRetina = checkNodeArrayForRetina(dagObj.node);
            var addDFTooltip;
            if (isFromRetina) {
                addDFTooltip = DFTStr.CannotCreateMsg;
            } else {
                addDFTooltip = TooltipTStr.AddDataflow;
            }

            var outerDag =
                '<div class="dagWrap clearfix" id="dagWrap-' +
                    tableId + '" data-id="' + tableId + '">' +
                '<div class="header clearfix">' +
                    '<div class="btn infoIcon">' +
                        '<i class="icon xi-info-rectangle"></i>' +
                    '</div>' +
                    '<div class="tableTitleArea">' +
                        '<span>Table: </span>' +
                        '<span class="tableName">' +
                            tableName +
                        '</span>' +
                    '</div>' +
                    '<div class="retinaArea" data-tableid="' +
                        tableId + '">' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" data-original-title="' +
                            addDFTooltip + '" ' +
                        'class="btn btn-small addDataFlow">' +
                            '<i class="icon xi-add-dataflow"></i>' +
                        '</div>' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" title="' +
                            TooltipTStr.NewTabQG + '" ' +
                        'class="btn btn-small newTabImageBtn">' +
                            '<i class="icon xi-open-img-newtab"></i>' +
                        '</div>' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" title="' +
                            TooltipTStr.SaveQG + '" ' +
                        'class="btn btn-small saveImageBtn">' +
                            '<i class="icon xi-save_img"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '</div>';
            var position = WSManager.getTablePosition(tableId);

            if (position === 0) {
                $('.dagArea').find('.legendArea').after(outerDag);
            } else {
                $prevDag = $dagPanel.find('.dagWrap:not(.dagWrapToRemove)')
                                    .eq(position - 1);
                if ($prevDag.length !== 0) {
                    $prevDag.after(outerDag);
                } else {
                    $('.dagArea').append(outerDag);
                }
            }

            var $dagWrap = $('#dagWrap-' + tableId);
            if (isFromRetina) {
                $dagWrap.addClass('fromRetina');
            }
            Dag.createDagImage(dagObj.node, $dagWrap, {savable: true});

            Dag.focusDagForActiveTable(tableId);

            // add lock icon to tables that should be locked or not dropped
            applyLockIfNeeded($dagWrap);

            if ($('#xcTableWrap-' + tableId).find('.tblTitleSelected').length) {
                $('.dagWrap.selected').removeClass('selected')
                                      .addClass('notSelected');
                $dagWrap.removeClass('notSelected')
                                        .addClass('selected');
            }

            Dag.addDagEventListeners($dagWrap);
            if (!dagAdded) {
                preventUnintendedScrolling();
            }

            dagAdded = true;

            if (!WSManager.isTableInActiveWS(tableId)) {
                $dagWrap.addClass('inActive');
            }
            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').removeClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').addClass('xc-hidden');
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error('dag failed', error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    Dag.destruct = function(tableId) {
        $('#dagWrap-' + tableId).remove();
        DagFunction.destruct(tableId);
    };

    // options: {savable: boolean}
    Dag.createDagImage = function(nodeArray, $container, options) {
        options = options || {};
        var storedInfo = {
            x: 0,
            y: 0,
            height: 0,
            width: 0,
            condensedWidth: 0,
            groups: {},
            datasets: {}
        };

        var numNodes = nodeArray.length;
        var index = 0;
        var node = nodeArray[index];
        var depth = 0;
        var condensedDepth = 0;

        var dagInfo = Dag.getParentChildDagMap(nodeArray);
        var dagDepth = getDagDepth(dagInfo);

        var condensed = dagDepth > condenseLimit;
        var dagOptions = {condensed: condensed};
        var isPrevHidden = false; // is parent node in a collapsed state
        var group = [];

        var dagImageHtml = drawDagNode(node, storedInfo, nodeArray, index,
                                       dagInfo, depth, condensedDepth,
                                       isPrevHidden, group, dagOptions).html;

        var height = storedInfo.height * dagTableOuterHeight + 30;
        var width = storedInfo.condensedWidth * dagTableWidth - 150;

        if (height > canvasLimit || width > canvasLimit ||
            (height * width > canvasAreaLimit)) {
            dagImageHtml = '<div class="largeMsg">' + DFTStr.TooLarge + '</div>';
            $container.addClass('tooLarge');
        } else {
            dagImageHtml = '<div class="dagImageWrap"><div class="dagImage" ' +
                        'style="height: ' + height + 'px;width: ' + width +
                        'px;">' + dagImageHtml + '</div></div>';
        }

        $container.append(dagImageHtml);

        if (!$container.hasClass('tooLarge')) {
            drawAllLines($container, dagInfo, numNodes, width, options);
        }

        var allDagInfo = {
            nodes: dagInfo,
            depth: dagDepth,
            groups: storedInfo.groups,
            condensedWidth: width,
            datasets: storedInfo.datasets
        };
        $container.data('allDagInfo', allDagInfo);
    };

    Dag.renameAllOccurrences = function(oldTableName, newTableName) {
        var $dagPanel = $('#dagPanel');

        $dagPanel.find('.tableName').filter(function() {
            return ($(this).text() === oldTableName);
        }).text(newTableName);

        var $dagTableTitles = $dagPanel.find('.tableTitle').filter(function() {
            return ($(this).text() === oldTableName);
        });
        $dagTableTitles.text(newTableName);
        xcTooltip.changeText($dagTableTitles, newTableName);
        $dagTableTitles.parent().data('tablename', newTableName);
        var $dagParentsTitles = $dagPanel.find('.parentsTitle').filter(function() {
            return ($(this).text().indexOf(oldTableName) > -1);
        });

        $dagParentsTitles.text(newTableName);
        var $actionTypes = $dagParentsTitles.closest('.actionType');
        $actionTypes.each(function() {
            var tooltipText = $(this).attr('data-original-title');
            var newText;
            if (tooltipText) {
                var re = new RegExp(oldTableName, "g");
                newText = tooltipText.replace(re, newTableName);
                xcTooltip.changeText($(this), newText);
            }
            var title = $(this).attr('title');
            if (title) {
                newText = title.replace(oldTableName, newTableName);
                $(this).attr('title', newText);
            }
        });
    };

    // nameProvided: boolean, if true, tableId arg is actually a tablename
    Dag.makeInactive = function(tableId, nameProvided) {
        var tableName;
        var $dags;
        $dagPanel = $('#dagPanel');
        if (nameProvided) {
            tableName = tableId;
            $dags = $dagPanel.find('.dagTable[data-tableName="' +
                                   tableName + '"]');
        } else {
            tableName = gTables[tableId].tableName;
            $dags = $dagPanel.find('.dagTable[data-id="' + tableId + '"]');
        }

        $dags.removeClass('Ready')
             .addClass('Dropped');
        var text = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                                        {"tablename": tableName});
        $dags.find(".dagTableIcon, .dataStoreIcon").each(function() {
            xcTooltip.changeText($(this), text);
        });
    };

    Dag.focusDagForActiveTable = function(tableId, tableFocused) {
        // tableId given only when initial dag is created
        var activeTableId;
        var $dagWrap;
        var $dag;
        $dagPanel = $('#dagPanel');
        if (tableId) {
            activeTableId = tableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');
            $dag.scrollLeft($dag.find('.dagImage').width());
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        } else {
            activeTableId = gActiveTableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');

            if (!$dag.length) {
                DagPanel.setScrollBarId($(window).height());
                DagPanel.adjustScrollBarPositionAndSize();
                return;
            }
            if (tableFocused) {
                if (checkIfDagWrapVisible($dagWrap)) {
                    DagPanel.setScrollBarId($(window).height());
                    DagPanel.adjustScrollBarPositionAndSize();
                    return;
                }
            }

            $dag.scrollLeft($dag.find('.dagImage').width());

            var scrollTop = $dagPanel.find('.dagArea').scrollTop();
            var dagTop = $dagWrap.position().top;

            if (dagTop - 95 + $dagPanel.scrollTop() === 0) {
                $dagPanel.scrollTop(0);
            } else {
                $dagPanel.find('.dagArea').scrollTop(scrollTop + dagTop - 16);
            }
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        }
    };

    Dag.getParentChildDagMap = function(nodeArray) {
        var map = {}; // holds a map of nodes & array indices of parents and child
        var parentIndex = 0;
        var numParents;
        for (var i = 0; i < nodeArray.length; i++) {
            numParents = getDagnumParents(nodeArray[i]);

            if (!map[i]) {
                map[i] = {};
                map[i].child = -1;
                map[i].multiParent = false;
            }
            map[i].parents = [];

            for (var j = 0; j < numParents; j++) {
                // save parents indices for current node
                map[i].parents.push(++parentIndex);

                // go to node's parents and save child index
                if (!map[parentIndex]) {
                    map[parentIndex] = {};
                }
                map[parentIndex].child = i;

                if (numParents > 1) {
                    map[parentIndex].multiParent = true;
                } else {
                    map[parentIndex].multiParent = false;
                }
            }

            map[i].numParents = numParents;
        }

        return (map);
    };

    Dag.getDagSourceNames = function(parentChildMap, index, dagArray) {
        var parentNames = [];
        for (var i = 0; i < parentChildMap[index].parents.length; i++) {
            var parentIndex = parentChildMap[index].parents[i];
            var parentName = dagArray[parentIndex].name.name;
            parentNames.push(parentName);
        }
        return (parentNames);
    };

    Dag.createSavableCanvas = function($dagWrap) {
        var deferred = jQuery.Deferred();
        var promises = [];
        var fullCanvas = true;
        var canvasClone = $dagWrap.find('canvas')[0];
        var canvas = createCanvas($dagWrap, fullCanvas);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone)
        .then(function() {

            var tableImage = new Image();
            var tableGrayImage = new Image();
            var tableICVImage = new Image();
            var dbImage = new Image();
            var expandImage = new Image();
            var eTableImage = new Image();
            tableImage.src = paths.dTable;
            eTableImage.src = paths.eTable;
            tableGrayImage.src = paths.dTableGray;
            tableICVImage.src = paths.dTableICV;
            dbImage.src = paths.dbDiamond;
            expandImage.src = paths.expandIcon;

            PromiseHelper.when.apply(window, [loadImage(tableImage),
                                    loadImage(tableGrayImage),
                                    loadImage(tableICVImage),
                                    loadImage(dbImage), loadImage(expandImage),
                                    loadImage(eTableImage)])
            .then(function() {
                $dagWrap.find('.dagTable').each(function() {
                    var $dagTable = $(this);
                    if (!$dagTable.parent().hasClass('hidden')) {
                        var top = Math.floor($dagTable.parent().position().top);
                        var left = Math.floor($dagTable.parent().position().left +
                                          $dagTable.position().left);
                        drawDagTableToCanvas($dagTable, ctx, top, left,
                                             tableImage, tableGrayImage,
                                             tableICVImage,
                                             dbImage, eTableImage);
                    }
                });

                $dagWrap.find('.actionType').each(function() {
                    var $actionType = $(this);
                    if (!$actionType.parent().hasClass('hidden')) {
                        var top = Math.floor($actionType.parent().position().top) + 4;
                        var left = Math.floor($actionType.parent().position().left);
                        promises.push(drawDagActionTypeToCanvas(
                                            $actionType, ctx, top, left));
                    }
                });

                $dagWrap.find('.expandWrap:not(.expanded)').each(function() {
                    var $expandIcon = $(this);
                    var top = Math.floor($expandIcon.position().top);
                    var left = Math.floor($expandIcon.position().left);
                    drawExpandIconToCanvas($expandIcon, ctx, top, left, expandImage);
                });

                PromiseHelper.when.apply(window, promises)
                .then(function() {
                    $(canvas).hide();
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject("Image loading error");
                });
            });
        });

        return (deferred.promise());
    };

    Dag.expandAll = function($dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.nodes;
        var groups = allDagInfo.groups;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var depth;
        var size;
        var right;
        var node;
        var groupWidth;
        var $groupOutline;
        var $expandWrap;

        for (var i in nodes) {
            node = nodes[i];
            node.isHidden = false;
            node.depth = node.expandedDepth;
            if (node.x !== node.expandedX) {
                node.x = node.expandedX;
                $dagImage.find('.dagTable[data-index="' + i + '"]').parent()
                         .css('right', node.expandedX).removeClass('hidden');
            }
        }
        for (var i in groups) {
            groups[i].collapsed = false;
            depth = nodes[i].depth + 1;
            right = nodes[groups[i].group[0]].x + 190;
            $expandWrap = $dagImage.find('.expandWrap[data-index="' + i + '"]');
            $expandWrap.css('right', right).data('depth', depth)
                                           .addClass('expanded');
            xcTooltip.changeText($expandWrap, TooltipTStr.ClickCollapse);
            size = $expandWrap.data('size');
            $groupOutline = $expandWrap.next();
            groupWidth = size * dagTableWidth + 11;
            $groupOutline.css('right', (right + 15) - groupWidth)
                         .addClass('expanded');

        }

        depth = allDagInfo.depth;
        var newWidth = (depth - 1) * dagTableWidth + dataStoreWidth;
        $dagImage.outerWidth(newWidth);

        var collapse = false;
        var all = true;
        updateCanvasAfterWidthChange($dagWrap, nodes, newWidth, collapse, all);

        $dagImage.parent().scrollLeft(prevScrollLeft + (newWidth -
                                      dagImageWidth));
    };

    Dag.checkCanExpandAll = function($dagWrap) {
        var currentCanvasHeight = $dagWrap.find('canvas').height();
        var allDagInfo = $dagWrap.data('allDagInfo');
        var depth = allDagInfo.depth;
        var expectedWidth = (depth - 1) * dagTableWidth + dataStoreWidth + 100;

        if (expectedWidth > canvasLimit ||
            (expectedWidth * currentCanvasHeight) > canvasAreaLimit) {
            return (false);
        } else {
            return (true);
        }
    };

    Dag.collapseAll = function($dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.nodes;
        var groups = allDagInfo.groups;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var depth;
        var size;
        var right;
        var node;
        var $groupOutline;
        var $expandWrap;
        var group;
        var index;
        var $dagTableWrap;
        var tooltip;

        for (var i in nodes) {
            node = nodes[i];
            // node.isHidden = true;
            node.depth = node.condensedDepth;
            if (node.x !== node.condensedX) {
                node.x = node.condensedX;
                $dagTableWrap = $dagImage.find('.dagTable[data-index="' + i + '"]')
                                             .parent();

                $dagTableWrap.css('right', node.condensedX);
            }
        }

        $dagImage.find('.dagTable.dataStore').parent().removeClass('hidden');

        for (var i in groups) {
            groups[i].collapsed = true;
            depth = nodes[i].depth + 1;
            group = groups[i].group;
            right = nodes[group[0]].x - dataStoreWidth;
            $expandWrap = $dagImage.find('.expandWrap[data-index="' + i + '"]');
            $expandWrap.css('right', right).data('depth', depth)
                                           .removeClass('expanded');

            size = $expandWrap.data('size');

            if (size === 1) {
                tooltip = TooltipTStr.CollapsedTable;
            } else {
                tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables, {
                    number: size + ""
                });
            }
            xcTooltip.changeText($expandWrap, tooltip);

            $groupOutline = $expandWrap.next();
            $groupOutline.css('right', (right - groupOutlineOffset))
                         .addClass('expanded');
            for (var j = 0; j < group.length; j++) {
                index = group[j];
                nodes[index].isHidden = true;
                $dagTableWrap = $dagImage.find('.dagTable[data-index="' + index + '"]')
                                             .parent();
                $dagTableWrap.addClass('hidden');
            }
        }

        $dagImage.outerWidth(allDagInfo.condensedWidth);

        var collapse = true;
        var all = true;
        updateCanvasAfterWidthChange($dagWrap, nodes, allDagInfo.condensedWidth,
                                     collapse, all);
        $dagImage.parent().scrollLeft(prevScrollLeft +
                                    (allDagInfo.condensedWidth - dagImageWidth));
    };

    Dag.setupDagSchema = function() {
        var $dagSchema = $("#dagSchema");
        $dagSchema.on("mouseup", ".content li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var $name = $li.find('.name');
            $dagSchema.find('li.selected').removeClass('selected');
            $li.addClass('selected');
            var tableId   = $dagSchema.data('tableid');
            var $dagTable = $dagSchema.data('$dagTable');
            var index     = parseInt($dagTable.data('index'));
            var $dagWrap  = $dagTable.closest('.dagWrap');
            var nodes     = $dagWrap.data('allDagInfo').nodes;
            var name      = $name.text();
            var progCol = gTables[tableId].getColByFrontName(name);
            var backName  = $name.data('backname');
            if (!backName) {
                backName = name;
            }

            var sourceColNames = getSourceColNames(progCol.func);
            $('.columnOriginInfo').remove();
            $dagPanel.find('.highlighted').removeClass('highlighted');
            addRenameColumnInfo(progCol, index, $dagWrap);
            highlightColumnSource($dagWrap, index);
            findColumnSource(sourceColNames, $dagWrap, index, nodes, backName,
                            progCol.isEmptyCol());
            $(document).mousedown(closeDagHighlight);
        });

        $dagSchema.on("click", '.sort', function() {
            var tableId = $dagSchema.data("tableid");
            var table = gTables[tableId];
            var sortByNode = false;
            var reversed = false;
            var $btn = $(this);
            if ($btn.parent().hasClass("text")) {
                sortByNode = true;
            }
            $dagSchema.find(".subHeader").children().removeClass("active");
            $btn.parent().addClass("active");
            $btn.parent().toggleClass("reversed");
            if ($btn.parent().hasClass("reversed")) {
                reversed = true;
            }

            getSchemaNodeInfo($dagSchema, table, sortByNode, reversed);
        });

        $dagSchema.find(".close").click(function() {
            hideSchema();
        });

        dagPanelLeft = $('#dagPanelContainer').offset().left || 65;

        $dagSchema.draggable({
            handle: '#dagSchemaTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $dagSchema.resizable({
            handles: "n, e, s, w, se",
            minHeight: 300,
            minWidth: 300,
            containment: "document"
        });
    };

    Dag.showDataStoreInfo = function($dagTable) {
        var $schema = $('#dagSchema');
        $schema.addClass("loadInfo");
        var tableName = $dagTable.data("tablename");
        var schemaId = Math.floor(Math.random() * 100000);
        $schema.data("id", schemaId);

        $schema.find('.tableName').text(tableName);
        $schema.find('.numCols').text("");
        var datasets = $dagTable.closest(".dagWrap").data().allDagInfo.datasets;
        var loadInfo = datasets[tableName].loadInfo;
        if (loadInfo.format !== "csv") {
            delete loadInfo.loadArgs.csv;
        }
        if (loadInfo.loadArgs && loadInfo.loadArgs.csv) {
            loadInfo.loadArgs.csv.recordDelim =
                    loadInfo.loadArgs.csv.recordDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
            loadInfo.loadArgs.csv.quoteDelim =
                    loadInfo.loadArgs.csv.quoteDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
            loadInfo.loadArgs.csv.fieldDelim =
                    loadInfo.loadArgs.csv.fieldDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
        }

        loadInfo.name = tableName;

        if (loadInfo.numEntries == null || loadInfo.size == null) {
            var dsObj = DS.getDSObj(tableName);
            loadInfo.numEntries = dsObj.getNumEntries();
            loadInfo.size = dsObj.getSize();
        }
        if (loadInfo.numEntries == null || loadInfo.size == null) {
            // XXX todo, this may be cached in DSOBj, and if not we can
            // cache it here
            XcalarGetDatasetMeta(tableName)
            .then(function(res) {
                // check if current schema
                if ($schema.data("id") !== schemaId) {
                    return;
                }
                if (res != null && res.metas != null) {
                    var metas = res.metas;
                    var size = 0;
                    var numRows = 0;
                    // sum up size from all nodes
                    for (var i = 0, len = metas.length; i < len; i++) {
                        size += metas[i].size;
                        numRows += metas[i].numRows;
                    }

                    loadInfo.numEntries = numRows;
                    loadInfo.size = xcHelper.sizeTranslator(size);
                    var html = prettify(loadInfo);
                    $schema.find(".content").html(html);
                }
            });
        }

        var html = prettify(loadInfo);

        $schema.find(".content").addClass("prettyJson").html(html);
        $schema.show();
        xcTooltip.hideAll();

        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchema').length === 0 &&
                $(event.target).closest('#dagScrollBarWrap').length === 0) {
                hideSchema();
            }
        });

        positionSchemaPopup($dagTable);
    };

    function prettify(loadInfo) {
        var html = xcHelper.prettifyJson(loadInfo);
        html = "{\n" + html + "}";
        return html;
    }

    Dag.showSchema = function($dagTable) {
        var tableId = $dagTable.data('id');
        var table = gTables[tableId];
        var $schema = $('#dagSchema');
        $schema.removeClass("loadInfo");
        var tableName;
        var numCols;
        var numRows = CommonTxtTstr.Unknown;
        $schema.data('tableid', tableId);
        $schema.data('$dagTable', $dagTable);
        var schemaId = Math.floor(Math.random() * 100000);
        $schema.data("id", schemaId);
        $schema.find(".content").removeClass("prettyJson");
        if (!table) {
            tableName = $dagTable.find('.tableTitle').text();
            numCols = 1;
        } else {
            tableName = table.tableName;
            numCols = table.tableCols.length;
        }

        if (table) {
            var $sortedOn = $schema.find(".subHeader").children(".active");
            var sortByNode = false;
            var reversed = false;
            if ($sortedOn.hasClass("text")) {
                sortByNode = true;
            }
            if ($sortedOn.hasClass("reversed")) {
                reversed = true;
            }
            getSchemaNodeInfo($schema, table, sortByNode, reversed);
            if (table.resultSetCount > -1) {
                numRows = table.resultSetCount;
                numRows = xcHelper.numToStr(numRows);
            } else {
                numRows = "...";
                getSchemaNumRows($schema, schemaId, tableName, table);
            }
        } else {
            $schema.find(".nodeInfo").addClass("xc-hidden");
            numRows = "...";
            getSchemaNumRows($schema, schemaId, tableName);
        }
        $schema.find('.tableName').text(tableName);
        $schema.find('.numCols').attr('title', CommonTxtTstr.NumCol)
                                   .text('[' + (numCols - 1) + ']');
        $schema.find('.rowCount .value').text(numRows);

        var html = "<ul>";

        for (var i = 0; i < numCols; i++) {
            if (numCols === 1) {
                continue;
            }
            var progCol = table.tableCols[i];
            if (progCol.isDATACol()) {
                continue;
            }
            var type = progCol.getType();
            var name = progCol.getFrontColName(true);
            var backName = progCol.getBackColName();
            html += '<li>' +
                        '<div>' +
                            '<span class="iconWrap">' +
                                '<i class="icon fa-13 xi-' + type + '"></i>' +
                            '</span>' +
                            '<span class="text">' + type + '</span>' +
                        '</div>' +
                        '<div title="' + name + '" class="name" ' +
                        'data-backname="' + backName + '">' +
                            name +
                        '</div>' +
                        // '<div>' +
                        // // XX SAMPLE DATA GOES HERE
                        // '</div>' +
                    '</li>';
        }
        if (numCols === 1) {
            html += '<span class="noFields">' + DFTStr.NoFields + '</span>';
        }
        html += "</ul>";

        $schema.find(".content").html(html);
        $schema.show();
        xcTooltip.hideAll();

        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchema').length === 0 &&
                $(event.target).closest('#dagScrollBarWrap').length === 0) {
                hideSchema();
            }
        });

        positionSchemaPopup($dagTable);
    };

    function getSchemaNodeInfo($schema, table, sortByNode, sortReverse) {
        if (!table.backTableMeta) {
            $schema.find(".nodeInfo").addClass("xc-hidden");
            return;
        }
        $schema.find(".nodeInfo").removeClass("xc-hidden");
        var meta = table.backTableMeta;
        var html = "<ul>";
        var totalRows = table.resultSetCount;
        var infos = [];
        for (var i = 0; i < meta.numMetas; i++) {
            infos.push({
                index: i,
                numRows: meta.metas[i].numRows
            });
        }

        if (sortByNode) {
            if (sortReverse) {
                infos = infos.sort(function(a, b) {
                    return b.index - a.index;
                });
            }
        } else {
            if (sortReverse) {
                infos = infos.sort(function(a, b) {
                    return b.numRows - a.numRows;
                });
            } else {
                infos = infos.sort(function(a, b) {
                    return a.numRows - b.numRows;
                });
            }
        }

        for (var i = 0; i < meta.numMetas; i++) {
            var numRows = infos[i].numRows;
            var pct = (100 * (numRows / totalRows)).toFixed(1);
            if (pct[pct.length - 1] === "0") {
                pct = pct.slice(0, -2);
            }
            pct += "%";
            if (totalRows === 0) {
                pct = CommonTxtTstr.NA;
            }
            numRows = xcHelper.numToStr(numRows);
            html += '<li>' +
                        '<div>' +
                            infos[i].index +
                        '</div>' +
                        '<div>' +
                            numRows + " (" + pct + ")" +
                        '</div>' +
                    '</li>';
        }
        html += "</ul>";
        $schema.find(".nodeInfoContent").html(html);
    }

    function getSchemaNumRows($schema, schemaId, tableName, table) {
        var deferred = jQuery.Deferred();
        XcalarGetTableMeta(tableName)
        .then(function(meta) {
            if ($schema.data("id") !== schemaId) {
                return;
            }

            if (meta != null && meta.metas != null) {
                var metas = meta.metas;
                var numRows = 0;
                // sum up size from all nodes
                for (var i = 0, len = metas.length; i < len; i++) {
                    numRows += metas[i].numRows;
                }
                if (table) {
                    table.resultSetCount = numRows;
                }
                numRows = xcHelper.numToStr(numRows);
                $schema.find('.rowCount .value').text(numRows);
            }

        })
        .fail(function() {
            $schema.find('.rowCount .value').text(CommonTxtTstr.Unknown);
        })
        .always(deferred.resolve);
        return deferred.promise();
    }

    function positionSchemaPopup($dagTable) {
        var $schema = $('#dagSchema');

        var topMargin = 3;
        var top = $dagTable[0].getBoundingClientRect().top + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - 30;
        var menuWidth = 0;
        if (MainMenu.isMenuOpen()) {
            menuWidth = 285;
        }
        var defaultWidth = 300;
        var defaultHeight = 266;
        if ($schema.hasClass("loadInfo")) {
            defaultWidth = 500;
            defaultHeight = 530;
        } else {
            defaultHeight += $schema.find(".nodeInfo").outerHeight();
        }

        $schema.css("width", "auto");
        var width = $schema.outerWidth();
        $schema.width(Math.min(defaultWidth, width));

        $schema.css("height", "auto");
        var height = $schema.outerHeight();

        left = Math.max(2, left);
        top = Math.max(2, top - height); // at least 2px from the top

        $schema.css({'top': top, 'left': left});

        var rightBoundary = $(window).width() - 5;

        if ($schema[0].getBoundingClientRect().right > rightBoundary) {
            if (isBrowserMicrosoft) {
                left = rightBoundary - $schema.width();
            } else {
                left = rightBoundary - (menuWidth + dagPanelLeft +
                                        $schema.width());
            }
            $schema.css('left', left);
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $schema[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $schema.css('top', '-=' + ($schema.height() + 35));
        }
    }

    Dag.makeTableNoDelete = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var $dagTables = $("#dagPanel").find('.dagTable[data-id="' +
                                        tableId + '"]');
        $dagTables.addClass("noDelete");
        if (!$dagTables.hasClass("locked")) {
            var lockHTML = '<div class="lockIcon"></div>';
            $dagTables.append(lockHTML);
        }
    };

    Dag.removeNoDelete = function(tableId) {
        var $dagTables = $("#dagPanel").find('.dagTable[data-id="' +
                                        tableId + '"]');
        $dagTables.removeClass('noDelete');
        if (!$dagTables.hasClass("locked")) {
            $dagTables.find('.lockIcon').remove();
        }
    };

    function hideSchema() {
        $('#dagSchema').hide();
        $(document).off('.hideDagSchema');
    }

    function applyLockIfNeeded($dagWrap) {
        var $table;
        var tId;
        var table;
        var isLocked;
        var noDelete;
        var needsIcon;
        var lockHTML = '<div class="lockIcon"></div>';
        $dagWrap.find(".dagTable").each(function() {
            $table = $(this);
            tId = $table.data('id');
            table = gTables[tId];
            if (!table) {
                return;
            }

            isLocked = table.hasLock();
            noDelete = table.isNoDelete();
            needsIcon = isLocked || noDelete;
            if (needsIcon) {
                $table.append(lockHTML);
                if (isLocked) {
                    $table.addClass("locked");
                }
                if (noDelete) {
                    $table.addClass("noDelete");
                }
            }
        });
    }

    function checkNodeArrayForRetina(nodeArray) {
        var len = nodeArray.length;
        for (var i = 0; i < len; i++) {
            if (nodeArray[i].api === XcalarApisT.XcalarApiExecuteRetina) {
                return true;
            }
        }
        return false;
    }

    function loadImage(img) {
        var deferred = jQuery.Deferred();
        img.onload = function() {
            deferred.resolve();
        };
        return (deferred.promise());
    }

    function expandGroup(groupInfo, $dagWrap, $expandIcon) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.nodes;
        var group = groupInfo.group;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var numGroupNodes = group.length;
        var storedInfo = {
            width: dagImageWidth,
            groupLen: numGroupNodes
        };
        var horzShift = -(dagTableWidth * 0.3);
        var $collapsedTables = $();
        for (var i = 0; i < numGroupNodes; i++) {
            $collapsedTables = $collapsedTables.add(
                        $dagImage.find('.dagTable[data-index=' + group[i] + ']')
                        .parent());
        }

        groupInfo.collapsed = false;
        var groupCopy = xcHelper.deepCopy(group);

        expandGroupHelper(nodes, groupCopy, group[numGroupNodes - 1], $dagWrap,
                          horzShift, storedInfo);

        var newWidth = storedInfo.width;

        $dagImage.outerWidth(newWidth);
        $dagImage.parent().scrollLeft(prevScrollLeft);
        // $dagImage.parent().scrollLeft(prevScrollLeft + (newWidth - dagImageWidth));

        var collapse = false;
        var all = false;
        updateCanvasAfterWidthChange($dagWrap, nodes, newWidth, collapse,
                                          all);

        var glowTimeout = setTimeout(function() {
            $collapsedTables.removeClass('glowing');
        }, 2000);
        var discoverTimeout = setTimeout(function() {
            $collapsedTables.removeClass('discovered');
        }, 6000);
        clearTimeout($expandIcon.data('glowTimeout'));
        clearTimeout($expandIcon.data('discoverTimeout'));
        $expandIcon.data('glowTimeout', glowTimeout);
        $expandIcon.data('discoverTimeout', discoverTimeout);
    }

    function expandGroupHelper(nodes, group, index, $dagWrap, horzShift,
                               storedInfo) {

        var nodeInfo = nodes[index];
        var groupIndex = group.indexOf(index);
        var nodeX = nodeInfo.x;
        var $dagTable = $dagWrap.find('.dagTable[data-index=' + index + ']');
        if (groupIndex > -1) {
            $dagTable.parent().removeClass('hidden').addClass('discovered glowing');
            horzShift += dagTableWidth;
            nodeInfo.isHidden = false;
            nodeX += (horzShift - dagTableWidth);
            if (storedInfo.groupLen !== group.length) {
                nodeInfo.depth += (storedInfo.groupLen - group.length - 0.3);
            }
            group.splice(groupIndex, 1);
        } else {
            nodeX += horzShift;
            if (nodeInfo.isParentHidden) {
                var $expandIcon = $dagWrap.find('.expandWrap[data-index=' + index + ']');
                var expandIconRight = parseFloat($expandIcon.css('right'));
                $expandIcon.css('right', (expandIconRight + horzShift));
                $expandIcon.data('depth', $expandIcon.data('depth') +
                                          (storedInfo.groupLen - 0.3));
                var $groupOutline = $expandIcon.next();
                var groupRight = parseFloat($groupOutline.css('right'));
                $groupOutline.css('right', (groupRight + horzShift));
            }
            nodeInfo.depth += (storedInfo.groupLen - 0.3);
        }
        nodeInfo.x = nodeX;
        $dagTable.parent().css('right', nodeX);
        storedInfo.width = Math.max(storedInfo.width, nodeX + dataStoreWidth);

        var numParents = nodeInfo.numParents;
        for (var i = 0; i < numParents; i++) {
            var parentIndex = nodeInfo.parents[i];
            expandGroupHelper(nodes, group, parentIndex, $dagWrap,
                               horzShift, storedInfo);
        }
    }

    function collapseGroup(groupInfo, $dagWrap) {
        groupInfo.collapsed = true;
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.nodes;
        var group = groupInfo.group;
        var $dagImage = $dagWrap.find('.dagImage');
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var numGroupNodes = group.length;
        var storedInfo = {
            "width": 0,
            "groupLen": numGroupNodes
        };
        var horzShift = (dagTableWidth * 0.3);
        var groupCopy = xcHelper.deepCopy(group);

        collapseGroupHelper(nodes, groupCopy, group[numGroupNodes - 1], $dagWrap,
                          horzShift, storedInfo);

        var newWidth = 0;
        $dagWrap.find('.dagTable.dataStore').each(function() {
            var right = parseFloat($(this).parent().css('right'));
            newWidth = Math.max(newWidth, right + dataStoreWidth);
        });

        $dagImage.outerWidth(newWidth);
        // $dagImage.parent().scrollLeft(prevScrollLeft + (newWidth - dagImageWidth));
        $dagImage.parent().scrollLeft(prevScrollLeft);
        var collapse = true;
        var all = false;
        updateCanvasAfterWidthChange($dagWrap, nodes, newWidth, collapse, all);
    }

    function collapseGroupHelper(nodes, group, index, $dagWrap,
                          horzShift, storedInfo) {
        var nodeInfo = nodes[index];
        var groupIndex = group.indexOf(index);
        var nodeX = nodeInfo.x;
        var $dagTable = $dagWrap.find('.dagTable[data-index=' + index + ']');
        // node is part of the collapsing group
        if (groupIndex > -1) {
            $dagTable.parent().addClass('hidden');
            nodeInfo.isHidden = true;
            horzShift -= dagTableWidth;
            nodeX += (horzShift + dagTableWidth);

            if (group.length !== (storedInfo.groupLen)) {
                nodeInfo.depth -= ((storedInfo.groupLen - group.length) - 0.3);
            }

            group.splice(groupIndex, 1);

        } else {
            nodeX += horzShift;
            if (nodeInfo.isParentHidden) {
                var $expandIcon = $dagWrap.find('.expandWrap[data-index=' + index + ']');
                var expandIconRight = parseFloat($expandIcon.css('right'));
                $expandIcon.css('right', (expandIconRight + horzShift));
                $expandIcon.data('depth', $expandIcon.data('depth') -
                                          (storedInfo.groupLen - 0.3));
                var $groupOutline = $dagWrap.find('.groupOutline[data-index=' + index + ']');
                var groupRight = parseFloat($groupOutline.css('right'));
                $groupOutline.css('right', (groupRight + horzShift));

            }
            nodeInfo.depth -= (storedInfo.groupLen - 0.3);
        }

        nodeInfo.x = nodeX;
        $dagTable.parent().css('right', nodeX);

        var numParents = nodeInfo.numParents;
        for (var i = 0; i < numParents; i++) {
            var parentIndex = nodeInfo.parents[i];
            collapseGroupHelper(nodes, group, parentIndex, $dagWrap,
                               horzShift, storedInfo);
        }
    }

    function updateCanvasAfterWidthChange($dagWrap, nodes, newWidth, collapse,
                                          all) {
        var $dagImage = $dagWrap.find('.dagImage');
        $dagWrap.find('canvas').eq(0).remove();
        xcTooltip.hideAll();
        DagPanel.adjustScrollBarPositionAndSize();

        var canvas = createCanvas($dagWrap);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.beginPath();

        if (collapse) {
            for (var node in nodes) {
                if (!nodes[node].isHidden) {
                    drawDagLines($dagImage, ctx, nodes, node, newWidth);
                }
            }
            // do not draw lines if not collapsing all and group is already
            // expanded
            $dagImage.find('.expandWrap').each(function() {
                if (all || !$(this).hasClass('expanded')) {
                    drawExpandLines($(this), ctx, newWidth);
                }
            });
        } else { // expanding
            for (var node in nodes) {
                // do not draw lines if not expanding all and node is hidden
                if (all || !nodes[node].isHidden) {
                    drawDagLines($dagImage, ctx, nodes, node, newWidth);
                }
            }
            if (!all) {
                $dagImage.find('.expandWrap').each(function() {
                    if (!$(this).hasClass('expanded')) {
                        drawExpandLines($(this), ctx, newWidth);
                    }
                });
            }
        }

        ctx.stroke();
    }

    function getDagDepth(nodes) {
        var maxDepth = 0;
        getDepthHelper(0, 0);
        return (maxDepth);

        function getDepthHelper(index, depth) {
            depth++;
            maxDepth = Math.max(maxDepth, depth);
            for (var i = 0; i < nodes[index].numParents; i++) {
                var parentIndex = nodes[index].parents[i];
                getDepthHelper(parentIndex, depth);
            }
        }
    }

    function drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone) {
        var deferred = jQuery.Deferred();
        var img = new Image();
        img.src = paths.dagBackground;
        img.onload = function() {
            var ptrn = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasClone, -10, 50);
            ctx.save();
            var tableTitleText = $dagWrap.find('.tableTitleArea')
                                         .text();
            ctx.font = '600 15px Open Sans';
            ctx.fillStyle = tableTitleColor;
            ctx.fillText(tableTitleText, 30, 22);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(20, 33);
            ctx.lineTo(canvas.width - 40, 33);
            ctx.strokeStyle = titleBorderColor;
            ctx.stroke();
            deferred.resolve();
        };

        return (deferred.promise());
    }

    function drawDagTableToCanvas($dagTable, ctx, top, left, tImage, tGrayImage,
                                  tICVImage, dImage, eImage) {
        left += 35;
        top += 50;
        var iconLeft = left;
        var iconTop = top + 6;
        var maxWidth = 200;
        var tableImage;
        var x;

        if ($dagTable.hasClass('dataStore')) {
            tableImage = dImage;
            iconLeft -= 2;
            iconTop -= 4;
            maxWidth = 120;
            x = left - 42;
        } else {
            if ($dagTable.find(".icv").length) {
                tableImage = tICVImage;
            } else if (gShowDroppedTablesImage && $dagTable.hasClass('Dropped')) {
                tableImage = tGrayImage;
            } else if ($dagTable.hasClass("export") &&
                $dagTable.attr("data-advancedopts") === "default") {
                tableImage = eImage;
            } else {
                tableImage = tImage;
            }
            x = left - 89;
        }

        ctx.drawImage(tableImage, iconLeft, iconTop);

        var lineHeight = 12;

        var y = top + 38;
        var text = $dagTable.find('.tableTitle:visible').text();

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, maxWidth, 26);
        ctx.clip();
        ctx.font = 'bold 10px Open Sans';
        ctx.fillStyle = tableFontColor;
        ctx.textAlign = 'center';

        wrapText(ctx, text, x + (maxWidth / 2), y + 10, maxWidth, lineHeight);
    }

    function drawDagActionTypeToCanvas($actionType, ctx, top, left) {
        var deferred = jQuery.Deferred();
        left += 35;
        top += 50;
        var $dagIcon = $actionType.find('.dagIcon');
        var iconSource = $dagIcon.find('.icon').attr('class');
        var iconSourceSplit = iconSource.split(" ");
        var iconFound = false;

        for (var i = 0; i < iconSourceSplit.length; i++) {
            if (iconSourceSplit[i].indexOf('xi-') === 0) {
                iconSource = iconSourceSplit[i] + ".png";
                iconFound = true;
                break;
            }
        }

        if (!iconFound) {
            iconSource = "xi-unknown.png";
        }

        iconSource = paths.dfIcons + iconSource;

        var rectImage = new Image();
        rectImage.src = paths.roundedRect;

        rectImage.onload = function() {
            ctx.drawImage(rectImage, left + 20, top);

            if (iconSource !== "none") {
                var dagIcon = new Image();
                var iconLeft = left + 23;
                var iconTop = top + 7;
                dagIcon.src = iconSource;

                dagIcon.onload = function() {
                    ctx.drawImage(dagIcon, iconLeft, iconTop);
                    deferred.resolve();
                };
            }

            // first line text
            var maxWidth = 78;
            var lineHeight = 10;
            var x = left + 43;
            var y = top + 9;
            var text = $actionType.find('.typeTitle').text();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 10);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);

            // text regarding table origin / parents
            y = top + 19;
            text = $actionType.find('.parentsTitle').text();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 20);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);
            if (iconSource === "none") {
                deferred.resolve();
            }
        };
        return (deferred.promise());
    }

    function drawExpandIconToCanvas($expandIcon, ctx, top, left, img) {
        ctx.drawImage(img, left + 35, top + 53);
        ctx.beginPath();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    }

    function checkIfDagWrapVisible($dagWrap) {
        $dagPanel = $('#dagPanel');
        if (!$dagWrap.is(':visible')) {
            return (false);
        }
        if ($dagPanel.hasClass('hidden')) {
            return (false);
        }
        var $dagArea = $dagPanel.find('.dagArea');
        var dagHeight = $dagWrap.height();
        var dagAreaHeight = $dagArea.height();
        var dagTop = $dagWrap.position().top;

        if (dagTop + 30 > dagAreaHeight || dagTop + dagHeight < 50) {
            return (false);
        }
        return (true);
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var words = text.split(/-| |\./);
        var line = '';
        var minLen = 20; // minimum text length needed for overflow;

        if (words.length === 1) {
            var width = ctx.measureText(words[0]).width;
            if (width > maxWidth) {
                var textLen = xcHelper.getMaxTextLen(ctx, text, maxWidth - 7,
                                                     minLen, text.length);
                line = text.slice(0, textLen) + "...";
            } else {
                line = text;
            }
        } else {
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var width = ctx.measureText(testLine).width;
                if (width > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
        }

        ctx.fillText(line, x, y);
        ctx.restore();
    }

    Dag.addDagEventListeners = function($dagWrap) {
        $dagWrap.on('click', '.expandWrap', function() {
            var $expandIcon = $(this);
            var data = $expandIcon.data();
            var depth = data.depth;
            var index = data.index;
            var $dagWrap = $expandIcon.closest('.dagWrap');
            var groupInfo = $dagWrap.data('allDagInfo').groups[index];
            var group = groupInfo.group;
            var $groupOutline = $expandIcon.next();

            if (!$expandIcon.hasClass('expanded')) {
                var canExpand = checkCanExpand(group, depth, index, $dagWrap);
                if (!canExpand) {
                    $dagWrap.addClass('unsavable');
                    xcTooltip.hideAll();
                    StatusBox.show(ErrTStr.DFNoExpand, $expandIcon, false, {
                        type: "info"
                    }) ;
                } else {
                    $expandIcon.addClass('expanded');
                    $groupOutline.addClass('expanded');
                    var expandIconRight = parseFloat($expandIcon.css('right'));
                    var newRight = expandIconRight +
                                             (group.length * dagTableWidth) - 24;
                    $expandIcon.css('right', newRight);
                    expandGroup(groupInfo, $dagWrap, $expandIcon);
                    xcTooltip.changeText($expandIcon, TooltipTStr.ClickCollapse);
                }
            } else {
                $expandIcon.removeClass('expanded');
                $groupOutline.removeClass('expanded');
                var expandIconRight = parseFloat($expandIcon.css('right'));
                var newRight = expandIconRight -
                                             (group.length * dagTableWidth) +
                                             Math.round(0.11 * dagTableWidth);
                $expandIcon.css('right', newRight);

                $groupOutline = $expandIcon.next();
                $groupOutline.removeClass('visible').hide();
                var size = $expandIcon.data('size');
                var tooltip;
                if (size === 1) {
                    tooltip = TooltipTStr.CollapsedTable;
                } else {
                    tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables, {
                        number: size + ""
                    });
                }
                xcTooltip.changeText($expandIcon, tooltip);
                collapseGroup(groupInfo, $dagWrap);
            }
        });

        var groupOutlineTimeout;
        var $groupOutline = $();

        $dagWrap.on('mouseenter', '.expandWrap.expanded', function() {
            $groupOutline.hide();
            clearTimeout(groupOutlineTimeout);
            $groupOutline = $(this).next();
            $groupOutline.show();
            setTimeout(function() {
                $groupOutline.addClass('visible');
            });
        });
        $dagWrap.on('mouseleave', '.expandWrap.expanded', function() {
            $groupOutline = $(this).next();
            $groupOutline.removeClass('visible');
            groupOutlineTimeout = setTimeout(function() {
                $groupOutline.hide();
            }, 300);
        });

        dagScrollListeners($dagWrap.find('.dagImageWrap'));
    };

    function checkCanExpand(group, depth, index, $dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.nodes;
        var currentCanvasWidth = $dagWrap.find('canvas').width();
        var currentCanvasHeight = $dagWrap.find('canvas').height();
        var savedInfo = {depth: depth};
        checkExpandHelper(index, nodes, savedInfo);
        var expectedWidth = (group.length + savedInfo.depth) * dagTableWidth +
                            100;
        expectedWidth = Math.max(currentCanvasWidth, expectedWidth);
        if (expectedWidth > canvasLimit ||
            (expectedWidth * currentCanvasHeight) > canvasAreaLimit) {
            return (false);
        } else {
            return (true);
        }
    }

    function checkExpandHelper(index, nodes, savedInfo) {
        var node = nodes[index];
        if (node.numParents === 0) {
            savedInfo.depth = Math.max(node.depth, savedInfo.depth);
        } else {
            for (var i = 0; i < node.numParents; i++) {
                var parentIndex = node.parents[i];
                checkExpandHelper(parentIndex, nodes, savedInfo);
            }
        }
    }

    function preventUnintendedScrolling() {
        var winHeight;
        var vertScrolling = false;
        var vertScrollingTimeout;
        $('.dagArea').scroll(function() {
            if (!vertScrolling) {
                if ($('#dagSchema').is(':visible') && scrollPosition > -1) {
                    $(this).scrollTop(scrollPosition);
                    return;
                }
                if ($('.menu').is(':visible')) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                }
                vertScrolling = true;
                winHeight = $(window).height();
            }
            clearInterval(vertScrollingTimeout);
            vertScrollingTimeout = setTimeout(function() {
                vertScrolling = false;
            }, 300);

            DagPanel.setScrollBarId(winHeight);
            DagPanel.adjustScrollBarPositionAndSize();
        });
    }

    function dagScrollListeners($dagImageWrap) {
        var winHeight;
        var horzScrolling = false;
        var horzScrollingTimeout;

        $dagImageWrap.scroll(function() {
            if (gMouseEvents.getLastMouseDownTarget().attr('id') ===
                "dagScrollBarWrap") {
                return;
            }
            if (!horzScrolling) {
                horzScrolling = true;
                winHeight = $(window).height();
                DagPanel.setScrollBarId(winHeight);
                if ($('.menu').is(':visible')) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                }
            }
            clearInterval(horzScrollingTimeout);
            horzScrollingTimeout = setTimeout(function() {
                horzScrolling = false;
            }, 300);

            DagPanel.adjustScrollBarPositionAndSize();
        });

        var wheeling = false;
        var wheelTimeout;
        $dagImageWrap.on('mousewheel', function() {
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

    function getSourceColNames(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1) {
                        names.push(args[i]);
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    function getRenamedColName(colName, node) {
        if (node.renameMap && node.renameMap.length) {
            var renameMap = node.renameMap;
            parsedName = xcHelper.parsePrefixColName(colName);

            for (var i = 0; i < renameMap.length; i++) {
                if (renameMap[i].type === DfFieldTypeT.DfFatptr) {
                    if (parsedName.prefix &&
                        renameMap[i].newName === parsedName.prefix) {
                        return xcHelper.getPrefixColName(renameMap[i].oldName,
                                                         parsedName.name);
                    }
                } else if (renameMap[i].newName === colName) {
                    return renameMap[i].oldName;
                }
            }
        }
        return colName;
    }

    function closeDagHighlight(event) {
        var $target = $(event.target);
        if ($target.hasClass('dagImageWrap')) {
            var bottom = $target[0].getBoundingClientRect().bottom;
            if (event.pageY > (bottom - 20)) {
                // click is occuring on the scrollbar
                return;
            }
        } else if ($target.closest('#dagSchema').length) {
            return;
        } else if ($target.closest('#dagScrollBarWrap').length) {
            return;
        }

        $('.columnOriginInfo').remove();
        $dagPanel.find('.highlighted').removeClass('highlighted');
        $(document).off('mousedown', closeDagHighlight);
    }

    function addRenameColumnInfo(col, index, $dagWrap) {
        var name = col.name;
        var backName = col.getBackColName();
        if (name !== backName) {
            var msg = 'renamed ' + backName + ' to ' + name;
            $dagWrap.find(".columnOriginInfo[data-rename='" + msg + "']")
                    .remove();

            var $dagTable = $dagWrap.find('.dagTable[data-index="' + index +
                                            '"]');
            var rect = $dagTable[0].getBoundingClientRect();
            var top = rect.top - 35;
            var left = rect.left;
            top -= $('#dagPanel').offset().top + 15;
            $dagWrap.append('<div class="columnOriginInfo " ' +
                'data-rename="' + msg + '" ' +
                'style="top: ' + top + 'px;left: ' + left + 'px">' + msg +
                '</div>');
        }
    }

    // sourceColNames is an array of the names we're searching for lineage
    // index is the table's dataflow graph data-index
    // nodes is an array of all the tables. nodes[index] gets the table info
    //          with nodes[0] being the most recent table on the far right
    function findColumnSource(sourceColNames, $dagWrap, index, nodes,
                              curColName, isEmptyCol) {
        var tables = getSourceTables(curColName, nodes[index], nodes);
        curColName = getRenamedColName(curColName, nodes[index]);
        var tableIndex;
        var tableNode;
        var tableName;
        // look through the parent tables
        for (var i = 0; i < tables.length; i++) {
            tableIndex = tables[i];
            tableNode = nodes[tableIndex];
            tableName = tableNode.name;

            var table;
            if (tableNode.numParents > 0) {
                table = gTables[xcHelper.getTableId(tableName)];
            }

            if (table) {
                var cols = table.tableCols;
                var foundSameColName = false; // if found column with same
                // backName as curColName
                var colCreatedHere = false; // if this is the first place
                // where descendent column has no value

                // make a copy so we have original for every table iteration
                var sourceColNamesCopy = xcHelper.deepCopy(sourceColNames);
                for (var j = 0; j < cols.length; j++) {
                    // skip DATA COL
                    if (cols[j].isDATACol()) {
                        continue;
                    }
                    var srcNames;
                    var backColName = cols[j].getBackColName() ||
                                      cols[j].getFrontColName();
                    //XX backColName could be blank

                    // check if table has column of the same name
                    if (!foundSameColName && backColName === curColName) {
                        foundSameColName = true;
                        srcNames = getSourceColNames(cols[j].func);
                        highlightColumnHelper($dagWrap, cols[j], srcNames,
                                                    tableIndex, nodes,
                                                    backColName);
                        colCreatedHere = cols[j].isEmptyCol() && !isEmptyCol;
                        if (colCreatedHere) {
                            // this table is where the column became non-empty,
                             // continue and look through sourceColNames for
                             // the origin column
                        } else {
                            break;
                        }
                    } else {
                        // table doesn't have column of that name but check if
                        // table has column that matches target column's
                        // derivatives
                        var colNameIndex = sourceColNamesCopy.indexOf(backColName);
                        if (colNameIndex > -1) {
                            srcNames = getSourceColNames(cols[j].func);

                            sourceColNamesCopy.splice(colNameIndex, 1);
                            highlightColumnHelper($dagWrap, cols[j], srcNames,
                                                        tableIndex, nodes,
                                                        backColName);
                        }
                    }

                    if (sourceColNamesCopy.length === 0 && colCreatedHere) {
                        break;
                    }
                }
            } else if (tableNode.numParents) {
                // gTable doesn't exist so we move on to its parent
                var $dagTable = $dagWrap
                        .find('.dagTable[data-index="' + tableIndex + '"]');
                if ($dagTable.hasClass('Dropped')) {
                    findColumnSource(sourceColNamesCopy, $dagWrap, tableIndex,
                                     nodes, curColName);
                } else {
                    // table has no data, could be orphaned
                }
            } else if (!isEmptyCol) {
                highlightColumnSource($dagWrap, tableIndex);
            }
        }
    }

    function getSourceTables(colName, node, nodes) {
        if (node.renameMap && node.renameMap.length) {
            var renameMap = node.renameMap;
            parsedName = xcHelper.parsePrefixColName(colName);
            var parents = node.parents;
            if (nodes[parents[0]].name === nodes[parents[1]].name) {
                return parents;
            }
            for (var i = 0; i < renameMap.length; i++) {
                if (renameMap[i].type === DfFieldTypeT.DfFatptr) {
                    if (parsedName.prefix) {
                        if (renameMap[i].newName === parsedName.prefix) {
                            if (i >= node.numLeftColumns) {
                                return [parents[1]];
                            } else {
                                return [parents[0]];
                            }
                        } else if (renameMap[i].oldName === parsedName.prefix) {
                            if (i >= node.numLeftColumns) {
                                return [parents[0]];
                            } else {
                                return [parents[1]];
                            }
                        }
                    }
                } else if (renameMap[i].newName === colName) {
                    if (i >= node.numLeftColumns) {
                        return [node.parents[1]];
                    } else {
                        return [node.parents[0]];
                    }
                } else if (renameMap[i].oldName === colName) {
                    if (i >= node.numLeftColumns) {
                        return [node.parents[0]];
                    } else {
                        return [node.parents[1]];
                    }
                }
            }
        }
        return node.parents;
    }

    function highlightColumnHelper($dagWrap, col, srcColNames, index, nodes,
                                    curColName) {
        var isEmpty = col.isEmptyCol();
        highlightColumnSource($dagWrap, index);
        addRenameColumnInfo(col, index, $dagWrap);
        findColumnSource(srcColNames, $dagWrap, index, nodes, curColName,
                        isEmpty);
    }

    function highlightColumnSource($dagWrap, index) {
        var $dagTable = $dagWrap.find('.dagTable[data-index="' + index + '"]');
        $dagTable.addClass('highlighted');

        // XX showing column name on each table is disabled

        // var id = $dagTable.data('id');

        // var rect = $dagTable[0].getBoundingClientRect();
        // if ($dagWrap.find('.columnOriginInfo[data-id="' + id + '"]')
        //             .length === 0) {
        //     var top = rect.top - 15;
        //     var left = rect.left;
        //     top -= $('#dagPanel').offset().top;
        //     $dagWrap.append('<div class="columnOriginInfo " data-id="' + id +
        //         '" style="top: ' + top + 'px;left: ' + left + 'px">' +
        //         name + '</div>');
        // }
    }

    function drawDagNode(dagNode, storedInfo, dagArray, index,
                         parentChildMap, depth, condensedDepth,
                         isPrevHidden, group, options) {
        var coor = {};
        var lower; // upper branch y-coordinate
        var upper; // lower branch y-coordinate
        var nodeInfo = parentChildMap[index];
        var numParents = nodeInfo.parents.length;
        var accumulatedDrawings = "";

        var isHidden = false;
        var newCondensedDepth = condensedDepth;
        // condense if not a join, not a leaf, and not the root
        if (options.condensed && !nodeInfo.multiParent &&
            numParents === 1 && nodeInfo.child !== -1) {
            isHidden = true;
            nodeInfo.isHidden = true;
            if (!isPrevHidden) {
                newCondensedDepth = condensedDepth + 0.3;
                parentChildMap[nodeInfo.child].isParentHidden = true;
            }
        } else {
            newCondensedDepth = condensedDepth + 1;
            nodeInfo.isHidden = false;
        }
        var newDepth = depth + 1;
        storedInfo.width = Math.max(storedInfo.width, newDepth);
        storedInfo.condensedWidth = Math.max(storedInfo.condensedWidth,
                                             newCondensedDepth);

        var drawRet;

        // recursive call of drawdagnode on node's parents
        for (var i = 0; i < numParents; i++) {
            var parentIndex = nodeInfo.parents[i];

            drawRet = drawDagNode(dagArray[parentIndex], storedInfo,
                                  dagArray, parentIndex, parentChildMap,
                                  newDepth, newCondensedDepth,
                                  isHidden, group, options);

            accumulatedDrawings += drawRet.html;

            if (i === 0) {
                lower = drawRet.yPos;
            } else {
                upper = drawRet.yPos;
            }
        }

        var yPos;
        if (numParents === 0) {
            // leaf
            coor.y = storedInfo.height;
            yPos = storedInfo.height;
            storedInfo.lower = storedInfo.height;
            storedInfo.upper = storedInfo.height;
            storedInfo.height++;
        } else if (numParents === 1) {
            // set coordinates to draw table
            coor.y = lower;
            yPos = lower;
        } else {
            // a joined table, y coordinate is average of
            coor.y = (lower + upper) / 2;
            yPos = ((lower + upper) / 2);
        }

        coor.x = depth;
        coor.condensedX = condensedDepth;

        var oneTable = drawDagTable(dagNode, dagArray, parentChildMap, index,
                                    coor, isHidden, isPrevHidden,
                                    group, storedInfo, options);

        var newHtml = accumulatedDrawings + oneTable;

        return ({
            html: newHtml,
            yPos: yPos
        });
    }

    function drawDagTable(dagNode, dagArray, parentChildMap, index, coor,
                          isHidden, isPrevHidden, group, storedInfo, options) {
        var dagOrigin = drawDagOperation(dagNode, dagArray, parentChildMap,
                                         index);

        var icon;
        var top = Math.round(coor.y * dagTableOuterHeight);
        var right = Math.round(coor.x * dagTableWidth);
        var condensedRight = Math.round(coor.condensedX * dagTableWidth);
        var tableWrapRight = right;
        var nodeInfo = parentChildMap[index];
        nodeInfo.expandedX = right;
        nodeInfo.condensedX = condensedRight;
        nodeInfo.x = condensedRight;
        nodeInfo.y = top;
        nodeInfo.depth = coor.condensedX;
        nodeInfo.expandedDepth = coor.x;
        nodeInfo.condensedDepth = coor.condensedX;
        var html = "";
        var hiddenClass = "";
        if (options.condensed && isHidden) {
            hiddenClass = " hidden";
            group.push(index);
            if (!isPrevHidden) {
                nodeInfo.x += (0.3 * dagTableWidth);
                nodeInfo.condensedX = nodeInfo.x;
            }
        }
        if (options.condensed) {
            tableWrapRight = condensedRight;
        }

        html += '<div class="dagTableWrap clearfix' + hiddenClass + '" ' +
                        'style="top:' + top + 'px;right: ' +
                        tableWrapRight + 'px;">' + dagOrigin;

        var key = DagFunction.getInputType(XcalarApisTStr[dagNode.api]);

        var parentNames = Dag.getDagSourceNames(parentChildMap, index,
                                                dagArray);
        var dagInfo = getDagNodeInfo(dagNode, key, parentNames, index,
                                     parentChildMap, dagArray);
        var state = dagInfo.state;
        var tableName = getDagName(dagNode);
        setRenames(key, dagNode, nodeInfo);
        nodeInfo.name = tableName;
        var tooltipTxt;
        if (state === DgDagStateTStr[DgDagStateT.DgDagStateDropped]) {
            tooltipTxt = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                        {"tablename": tableName});
        } else {
            tooltipTxt = CommonTxtTstr.ClickToOpts;
        }
        // check for data store
        if (dagOrigin === "") {
            var url = dagInfo.url;
            var pattern = "";
            var id = dagInfo.id;
            var originalTableName = tableName;
            var dsText;
            var outerClassNames = "";
            if (tableName.indexOf(gDSPrefix) === 0) {
                tableName = tableName.substr(gDSPrefix.length);
            }
            if (dagNode.api === XcalarApisT.XcalarApiExecuteRetina) {
                dsText = "";
                outerClassNames = " retina";
                icon = '<i class="icon xi-table-2"></i>';
                id = xcHelper.getTableId(tableName);
            } else {
                dsText = "Dataset ";
                icon = '<i class="icon xi_data"></i>';
                storedInfo.datasets[tableName] = dagInfo;
                pattern = dagInfo.loadInfo.loadArgs.fileNamePattern;
            }

            html += '<div class="dagTable dataStore ' + state +
                        outerClassNames + '" ' +
                        'data-tablename="' + tableName + '" ' +
                        'data-table="' + originalTableName + '" ' +
                        'data-index="' + index + '" ' +
                        'data-type="dataStore" ' +
                        'data-id="' + id + '" ' +
                        'data-url="' + encodeURI(url) + '" ' +
                        'data-pattern="' + encodeURI(pattern) + '">' +
                            '<div class="dataStoreIcon" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body" ' +
                            'title="' + tooltipTxt + '"></div>' +
                            icon +
                            '<span class="tableTitle" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'data-original-title="' + tableName + '">' +
                            dsText + tableName +
                            '</span>';
        } else {

            var icv = "";
            if (dagNode.input.mapInput.icvMode ||
                dagNode.input.groupByInput.icvMode) {
                icv = "icv";
                icon = "xi-table-error2";
            } else {
                icon = "xi-table-2";
            }

            var tableId = xcHelper.getTableId(tableName);

            if (dagNode.api === XcalarApisT.XcalarApiExport) {
                html += '<div class="dagTable typeTable ' + state + '" ' +
                        'data-tablename="' + tableName + '" ' +
                        'data-index="' + index + '" ' +
                        'data-id="' + tableId + '">' +
                            '<div class="dagTableIcon ' + icv + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body" ' +
                            'title="' + tooltipTxt + '"' +
                            '></div>' +
                            '<i class="icon xi-generate-sub"></i>'+
                            '<i class="icon xi-table-2"></i>'+
                            '<span class="tableTitle exportFileName" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + tableName + '">' +
                                tableName +
                            '</span>' +
                            '<span class="tableTitle exportTableName" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + tableName + '">' +
                                tableName +
                            '</span>';
            } else {

                html += '<div class="dagTable typeTable ' + state + '" ' +
                            'data-tablename="' + tableName + '" ' +
                            'data-index="' + index + '" ' +
                            'data-id="' + tableId + '">' +
                                '<div class="dagTableIcon ' + icv + '" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'title="' + tooltipTxt + '"' +
                                '></div>' +
                                '<i class="icon ' + icon + '"></i>'+
                                '<span class="tableTitle exportFileName" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-placement="bottom" ' +
                                    'data-container="body" ' +
                                    'title="' + tableName + '">' +
                                    tableName +
                                '</span>';
            }

        }
        html += '</div></div>';

        if (isHidden && !isPrevHidden) {
            var tooltip;
            var groupLength = group.length;
            if (groupLength === 1) {
                tooltip = TooltipTStr.CollapsedTable;
            } else {
                tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables,
                            {number: groupLength + ""});
            }
            var condensedId = parentChildMap[group[groupLength - 1]].child;
            var groupWidth = group.length * dagTableWidth + 11;
            // condensedId comes from the index of the child of rightmost
            // hidden table
            html += '<div class="expandWrap horz" ' +
                            'style="top:' + (top + 5) + 'px;right:' +
                                tableWrapRight + 'px;" ' +
                            'data-depth="' + coor.condensedX + '" ' +
                            'data-index="' + condensedId + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body" ' +
                            'data-size=' + groupLength + ' ' +
                            'title="' + tooltip + '">...</div>';
            html += '<div class="groupOutline" ' +
                            'style="top:' + top + 'px;right:' +
                                (tableWrapRight - groupOutlineOffset) +
                                'px;width:' + groupWidth + 'px;" ' +
                            'data-index="' + condensedId + '"></div>';
            var groupCopy = [];
            for (var i = 0; i < groupLength; i++) {
                groupCopy.push(group[i]);
            }
            storedInfo.groups[condensedId] = {
                "collapsed": true,
                "group": groupCopy
            };
            group.length = 0;
        }
        return (html);
    }

    function drawDagOperation(dagNode, dagArray, parentChildMap, index) {
        var originHTML = "";
        var numParents = getDagnumParents(dagNode);

        if (numParents > 0) {
            var parentNames = Dag.getDagSourceNames(parentChildMap, index,
                                                dagArray);
            var additionalInfo = "";
            var firstParent = parentNames[0];
            if (numParents > 1) {
                for (var i = 1; i < numParents; i++) {
                    additionalInfo += ", " + parentNames[i];
                }
            }
            var key = DagFunction.getInputType(XcalarApisTStr[dagNode.api]);
            var operation = key.substring(0, key.length - 5);

            var info = getDagNodeInfo(dagNode, key, parentNames, index,
                                     parentChildMap, dagArray);
            var resultTableName = getDagName(dagNode);
            if (info.type === "sort") {
                operation = "sort";
            } else if (info.type === "createTable") {
                operation = "Create Table";
            }

            originHTML += '<div class="actionType dropdownBox ' + operation +
                        '" style="top:' + 0 + 'px;" ' +
                        'data-type="' + operation + '" ' +
                        'data-info="' + info.text.replace(/"/g, "&quot;") + '" ' +
                        'data-column="' + info.column.replace(/"/g, "&quot;") +
                                        '" ' +
                        'data-table="' + resultTableName + '"' +
                        'data-id="' + info.id + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + info.tooltip.replace(/"/g, "&quot;") + '">' +
                            '<div class="actionTypeWrap" >' +
                                '<div class="dagIcon ' + operation + ' ' +
                                    info.type + '">' +
                                    getIconHtml(operation, info);
                                    // '<div class="icon"></div>';
            if (operation === 'groupBy') {
                originHTML += '<div class="icon icon2 ' + info.type + '">' +
                              '</div>';
            }
            if (firstParent.indexOf(gDSPrefix) === 0) {
                firstParent = info.column;
            }
            if (numParents < 2) {
                firstParent = info.column;
            }
            operation = operation[0].toUpperCase() + operation.slice(1);
            originHTML +=
                        '</div>' +
                            '<span class="typeTitle">' + operation + '</span>' +
                            '<span class="parentsTitle">' +
                                firstParent + additionalInfo +
                            '</span>' +
                        '</div>' +
                        '</div>';
        }

        return (originHTML);
    }

    function getIconHtml(operation, info) {
        var type = info.type;
        var iconClass = "";
        switch (operation) {
            case ("map"):
                iconClass = "data-update";
                break;
            case ("filter"):
                iconClass = getFilterIconClass(type);
                break;
            case ("groupBy"):
                iconClass = "groupby";
                break;
            case ("aggregate"):
                iconClass = "aggregate";
                break;
            case ("Create Table"):
                iconClass = "index";
                break;
            case ("index"):
                iconClass = "index";
                break;
            case ("join"):
                iconClass = getJoinIconClass(type);
                break;
            case ("project"):
                iconClass = "delete-column";
                break;
            case ("sort"):
                if (info.order === "ascending") {
                    iconClass = "arrowtail-up";
                } else {
                    iconClass = "arrowtail-down";
                }
                break;
            case ("export"):
                iconClass="pull-all-field";
                break;
            default:
                iconClass = "unknown";
                break;
        }

        return '<i class="icon xi-' + iconClass + '"></i>';
    }

    /*
    icons we need

    gt, ge, lt, le
    regex
    not equal
    index should be like old icon
     */

    function getFilterIconClass(type) {
        var iconClass = "filter";
        switch (type) {
            case ("filtergt"):
                iconClass += "-greaterthan";
                break;
            case ("filterge"):
                iconClass += "-greaterthan-equalto";
                break;
            case ("filtereq"):
                iconClass += "-equal";
                break;
            case ("filterlt"):
                iconClass += "-lessthan";
                break;
            case ("filterle"):
                iconClass += "-lessthan-equalto";
                break;
            case ("filternot"):
                iconClass += "-not-equal";
                break;
            case ("filterregex"):
            case ("filterlike"):
            case ("filterothers"):
                iconClass = "oldIcon";
                break;
            default:
                iconClass = "oldIcon";
                break;
        }
        return iconClass;
    }

    function getJoinIconClass(type) {
        var iconClass = "";
        switch (type) {
            case ("inner"):
                iconClass = "join-inner";
                break;
            case ("fullOuter"):
                iconClass = "join-outer";
                break;
            case ("left"):
                iconClass = "oin-leftouter"; // icon name has mispelling
                break;
            case ("right"):
                iconClass = "join-rightouter";
                break;
            default:
                iconClass = "join-inner";
                break;
        }
        return iconClass;
    }

    function setRenames(key, dagNode, nodeInfo) {
        if (key.indexOf("join") === 0) {
            nodeInfo.renameMap = dagNode.input[key].renameMap;
            nodeInfo.numLeftColumns = dagNode.input[key].numLeftColumns;
            nodeInfo.numRightColumns = dagNode.input[key].numRightColumns;
        }
    }

    function getDagnumParents(dagNode) {
        return (dagNode.numParent);
    }

    function getDagName(dagNode) {
        return (dagNode.name.name);
    }

    function getDagNodeInfo(dagNode, key, parents, index, parentChildMap,
                            dagArray) {
        var parenIndex;
        var filterType;
        var evalStr;
        var value = dagNode.input[key];
        var info = {};
        info.type = "unknown";
        info.text = "";
        info.tooltip = "";
        info.column = "";
        info.id = dagNode.dagNodeId;
        info.state = DgDagStateTStr[dagNode.state];

        switch (key) {
            case ('aggregateInput'):
                evalStr = value.evalStr;
                info.type = "aggregate" + evalStr.slice(0, evalStr.indexOf('('));
                info.text = evalStr;
                info.tooltip = "Aggregate: " + evalStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.lastIndexOf(')'));
                break;
            case ('loadInput'):
                info.url = value.dataset.url;
                var loadInfo = value;
                info.loadInfo = loadInfo;
                loadInfo.url = value.dataset.url;
                loadInfo.format = DfFormatTypeTStr[value.dataset.formatType];
                loadInfo.name = value.dataset.name;
                if (loadInfo.loadArgs) {
                    loadInfo.loadArgs.udf = value.loadArgs.udfLoadArgs
                                                    .fullyQualifiedFnName;
                    delete loadInfo.loadArgs.udfLoadArgs;
                }

                delete loadInfo.dataset;
                delete loadInfo.dagNodeId;
                break;
            case ('filterInput'):
                var filterStr = value.filterStr;
                parenIndex = filterStr.indexOf("(");
                var abbrFilterType = filterStr.slice(0, parenIndex);

                info.type = "filter" + abbrFilterType;
                info.text = filterStr;
                filterType = "";
                var filterTypeMap = {
                    "gt": "greater than",
                    "ge": "reater than or equal to",
                    "eq": "equal to",
                    "lt": "less than",
                    "le": "less than or equal to",
                    "regex": "regex",
                    "like": "like",
                    "not": "not"
                };

                if (filterTypeMap[abbrFilterType]) {
                    var filteredOn = filterStr.slice(parenIndex + 1,
                                                     filterStr.indexOf(','));
                    filterType = filterTypeMap[abbrFilterType];
                    var filterValue = filterStr.slice(filterStr.indexOf(',') + 2,
                                                      filterStr.lastIndexOf(')'));

                    info.column = filteredOn;
                    if (filterType === "regex") {
                        info.tooltip = "Filtered table &quot;" + parents[0] +
                                       "&quot; using regex: &quot;" +
                                       filterValue + "&quot; " + "on " +
                                       filteredOn + ".";
                    } else if (filterType === "not") {
                        filteredOn = filteredOn.slice(filteredOn.indexOf("(") + 1);
                        filterValue = filterValue
                                        .slice(0, filterValue.lastIndexOf(')'));
                        info.column = filteredOn;
                        if (filteredOn.indexOf(")") > -1) {
                            info.tooltip = "Filtered table &quot;" + parents[0] +
                                       "&quot; where " + filteredOn +
                                       " is " + filterType + " " +
                                       filterValue + ".";
                        } else {
                            var commaIndex = filterStr.indexOf(',');
                            if (commaIndex !== -1) {
                                info.column = filterStr
                                              .slice(parenIndex + 1, commaIndex)
                                              .trim();
                            } else {
                                info.column = filterStr
                                              .slice(parenIndex + 1,
                                                     filterStr.lastIndexOf(')'))
                                              .trim();
                            }
                            info.tooltip = "Filtered table &quot;" + parents[0] +
                                            "&quot;: " + filterStr;
                        }

                    } else {
                        info.tooltip = "Filtered table &quot;" + parents[0] +
                                       "&quot; where " + filteredOn +
                                       " is " + filterType + " " +
                                       filterValue + ".";
                    }

                } else {
                    var commaIndex = filterStr.indexOf(',');
                    if (commaIndex !== -1) {
                        info.column = filterStr
                                      .slice(parenIndex + 1, commaIndex)
                                      .trim();
                    } else {
                        info.column = filterStr
                                      .slice(parenIndex + 1,
                                             filterStr.lastIndexOf(')'))
                                      .trim();
                    }
                    info.tooltip = "Filtered table &quot;" + parents[0] +
                                    "&quot;: " + filterStr;
                }
                break;
            case ('groupByInput'):
                var sampleStr = "";
                var groupedOn = getGroupedOnText(index, parentChildMap,
                                                 dagArray);
                if (value.includeSrcTableSample) {
                    sampleStr = " (Sample included)";
                } else {
                    sampleStr = " (Sample not included)";
                }
                evalStr = value.evalStr;
                parenIndex = evalStr.indexOf("(");
                var type = evalStr.substr(0, parenIndex);
                info.type = "groupBy" + type;
                info.text = evalStr;
                info.tooltip = evalStr + " Grouped by " + groupedOn + sampleStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.lastIndexOf(')'));
                break;
            case ('indexInput'):
                info.type = "sort";
                info.column = value.keyName;
                if (value.ordering !== XcalarOrderingT.XcalarOrderingUnordered) {
                    var order = "";
                    if (value.ordering ===
                        XcalarOrderingT.XcalarOrderingAscending) {
                        order = "(ascending) ";
                        info.order = "ascending";
                    } else if (value.ordering ===
                               XcalarOrderingT.XcalarOrderingDescending) {
                        order = "(descending) ";
                        info.order = "descending";
                    }
                    if (value.source.isTable) {
                        info.tooltip = "Sorted " + order + "by " +
                                       value.keyName;
                    } else {
                        info.tooltip = "Sorted " + order + "on " +
                                       value.keyName;
                    }
                    info.text = "sorted " + order + "on " + value.keyName;
                } else {

                    if (value.source.isTable) {
                        info.tooltip = "Indexed by " + value.keyName;
                        info.type = "index";
                    } else {
                        info.tooltip = "Created Table";
                        info.type = "createTable";
                        info.column = "";
                    }
                    info.text = "indexed on " + value.keyName;
                }

                break;
            case ('joinInput'):
                info.text = JoinOperatorTStr[value.joinType];

                var joinType = info.text.slice(0, info.text.indexOf("Join"));
                info.type = joinType;
                var joinText = "";
                if (joinType.indexOf("Outer") > -1) {
                    var firstPart = joinType.slice(0, joinType.indexOf("Outer"));
                    firstPart = firstPart[0].toUpperCase() + firstPart.slice(1);
                    joinText = firstPart + " Outer";
                } else {
                    joinText = joinType[0].toUpperCase() + joinType.slice(1);
                }

                info.tooltip = joinText + " Join between table &quot;" +
                               parents[0] + "&quot; and table &quot;" +
                               parents[1] + "&quot;";
                info.column = parents[0] + ", " + parents[1];
                break;
            case ('mapInput'):
                //XX there is a "newFieldName" property that stores the name of
                // the new column. Currently, we are not using or displaying
                // the name of this new column anywhere.
                evalStr = value.evalStr;
                info.type = "map" + evalStr.slice(0, evalStr.indexOf('('));
                info.text = evalStr;
                info.tooltip = "Map: " + evalStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.lastIndexOf(')'));
                break;
            case ('projectInput'):
                for (var i = 0; i < value.numColumns; i++) {
                    info.column += value.columnNames[i] + ", ";
                }
                info.column = info.column.slice(0, info.column.length - 2);
                if (info.column.length > 80) {
                    info.column = info.column.slice(0, 80) + "...";
                }
                info.tooltip = "Projected columns: " + info.column;
                info.text = info.tooltip;
                info.type = "project";
                break;
            case ('exportInput'):
                info.type = "export";
                try {
                    info.url = value.meta.specificInput.sfInput.fileName;
                } catch (err) {
                    console.error('Could not find export filename');
                }

                break;
            default:
                var name;
                if (key.slice(key.length - 5) === "Input") {
                    name = key.slice(0, key.length - 5);
                } else {
                    name = key;
                }
                info.type = name;
                info.text = name;
                info.tooltip = name[0].toUpperCase() + name.slice(1);
                break;
        }
        return (info);
    }

    function getGroupedOnText(index, parentChildMap, dagArray) {
        var text = "";
        var numParents = parentChildMap[index].numParents;
        var parentIndex = parentChildMap[index].parents[0];
        if (numParents === 1 &&
            dagArray[parentIndex].api === XcalarApisT.XcalarApiIndex) {
            var keyName = dagArray[parentIndex].input.indexInput.keyName;

            // if indexed on a column named "multiGroupBy" then this may
            // have been xcalar-generated sort, so check this table's
            // parent to find the source columns
            if (keyName.indexOf("multiGroupBy") === 0) {
                var grandParentIndex = parentChildMap[parentIndex].parents[0];
                var cols = parseConcatCols(dagArray[grandParentIndex]);
                if (cols.length) {
                    text = "(";
                    for (var i = 0; i < cols.length; i++) {
                        text += cols[i] + ", ";
                    }
                    text = text.slice(0, -2);
                    text += ")";
                }
            }
            if (!text) {
                text = "(" + keyName + ")";
            }
        } else {
            text = "(See previous table index)";
        }
        return text;
    }

    // used only for parsing concated col names used for multi group by
    function parseConcatCols(dagNode) {
        var cols = [];
        if (dagNode.api === XcalarApisT.XcalarApiMap) {
            var evalStr = dagNode.input.mapInput.evalStr;
            if (evalStr.indexOf("\".Xc.\"") > -1 &&
                evalStr.indexOf('concat') === 0) {
                var func = {args: []};
                ColManager.parseFuncString(evalStr, func);
                func = func.args[0];
                cols = getSourceColNames(func);
            }
        }
        return cols;
    }

    /* Generation of dag elements and canvas lines */
    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage').width() + 130;
        var dagHeight = $dagWrap.find('.dagImage').height();
        var className = "";
        if (full) {
            dagHeight += 50;
            className = " full";
        }
        var canvasHTML = $('<canvas class="canvas' + className +
                            '" width="' + dagWidth +
                            '" height="' + (dagHeight) + '"></canvas>');
        $dagWrap.find('.dagImage').append(canvasHTML);
        return (canvasHTML[0]);
    }

    // options: {savable: boolean}
    function drawAllLines($container, dagInfo, numNodes, width, options) {
        var $dagImage = $container.find('.dagImage');
        var canvas = createCanvas($container);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();

        for (var node in dagInfo) {
            if (!dagInfo[node].isHidden) {
                drawDagLines($dagImage, ctx, dagInfo, node, width);
            }
        }
        $dagImage.find('.expandWrap').each(function() {
            drawExpandLines($(this), ctx);
        });

        ctx.stroke();


        if (options.savable) {
            // if more than 1000 nodes, do not make savable, too much lag
            // also canvas limit is 32,767 pixels height  or width
            var canvasWidth = $(canvas).width();
            var canvasHeight = $(canvas).height();

            if (numNodes > 1000 || canvasWidth > canvasLimit ||
                canvasHeight > canvasLimit || (canvasWidth * canvasHeight) >
                canvasAreaLimit) {
                $dagImage.closest(".dagWrap").addClass('unsavable');
            }
        }
    }

    // this function draws all the lines going into a blue table icon and its
    // corresponding gray operation rectangle
    function drawDagLines($dagImage, ctx, parentChildMap, index, canvasWidth) {
        var nodeInfo = parentChildMap[index];
        var parents = nodeInfo.parents;
        if (!parents) {
            // Should not draw for starting nodes with no parents
            // i.e. load nodes
            return;
        }
        var numParents = parents.length;

        if (numParents < 2) { // exclude joins
            if (numParents) { //exclude datasets
                drawStraightDagConnectionLine(ctx, nodeInfo, canvasWidth);
            }
        } else { // draw lines for joins
            var tableX = canvasWidth - nodeInfo.x;
            var tableY = nodeInfo.y + dagTableHeight / 2;

            var parent = parentChildMap[parents[0]]; // top-most parent
            var parentX = canvasWidth - parent.x + 26;
            var parentY = Math.round(parent.y) + dagTableHeight / 2;

            drawLine(ctx, tableX, tableY); // line entering table

            var curvedLineCoor = {
                x1: parentX,
                y1: parentY,
                x2: tableX - 82, // shift left
                y2: tableY
            };
            drawCurve(ctx, curvedLineCoor);

            // draw any additional curves if more than 2 parents
            if (parents.length > 2) {
                drawExtraCurves(parents, parentChildMap, tableX - 109, tableY,
                                ctx);
            }
        }
    }

    function drawExpandLines($expandIcon, ctx) {
        // NOTE: Cannot do .position() when the pane that you are trying to
        // paint on is not visible.
        var x = parseInt($expandIcon.parent().width()) -
                parseInt($expandIcon.css("right")) + 43 +
                parseInt($expandIcon.width());
        var y = parseInt($expandIcon.css("top")) + 15;
        var length = 80;
        drawLine(ctx, x, y, length);
    }

    // draw the lines corresponding to tables not resulting from joins
    function drawStraightDagConnectionLine(ctx, nodeInfo, canvasWidth) {
        var farLeftX = canvasWidth - (nodeInfo.x + dagTableWidth) + 40;
        var tableX = farLeftX + 180;
        var tableCenterY = nodeInfo.y + dagTableHeight / 2;
        var length = tableX - farLeftX + 20;
        drawLine(ctx, tableX, tableCenterY, length);
    }

    function drawCurve(ctx, coor) {
        var x1 = coor.x1; // upper table x
        var y1 = coor.y1; // upper table y
        var x2 = coor.x2; // child table x
        var y2 = coor.y2; // child table y
        var y3 = y1 + (y2 - y1) * 2; // lower table y
        var vertDist = (y2 - y1) * 2; // distance from upper parent table to
        // lower parent table

        var xoffset = 0;
        if (vertDist < 160) {
            xoffset = 4000 / vertDist; // makes small curves rounder
        }

        // Drawing the two curved lines
        ctx.moveTo(x1 + xoffset, y1);
        ctx.bezierCurveTo(x2, y1,
                          x2, y3,
                          x1 + xoffset, y3);

        // Draw upper horizontal line
        ctx.moveTo(x1 - 10, y1);
        ctx.lineTo(x1 + xoffset, y1);

        // Draw lower horizontal line
        ctx.moveTo(x1 - 10, y3);
        ctx.lineTo(x1 + xoffset, y3);
    }

    // draws any additional curves if more than 2 parents
    function drawExtraCurves(parents, parentChildMap, tableX, tableY, ctx) {
        var parentNode;
        var xOffset = tableX - 77;
        var yOffset;
        var origX;
        for (var i = 1; i < parents.length - 1; i++) {
            parentNode = parentChildMap[parents[i]];
            yOffset = parentNode.y + dagTableHeight / 2;
            origX = tableX;
            if (Math.abs(tableY - yOffset) < 40) {
                origX += 6; // rounder curve if y diff is small
            }
            ctx.moveTo(origX, tableY); // start at node coors
            ctx.bezierCurveTo(origX, tableY,
                              origX, yOffset,
                              xOffset, yOffset);
        }
    }

    function drawLine(ctx, x, y, length) {
        // draw a horizontal line
        var dist;
        if (length != null) {
            dist = length;
        } else {
            dist = 50;
        }
        ctx.moveTo(x, y);
        ctx.lineTo(x - dist, y);
    }

    // used for testing
    // function drawDot($dagImage, x, y, text) {
    //     text = text || "";
    //     var html = '<div style="font-size: 10px; width:4px;height:4px;' +
    //                'background-color:green;position:absolute; left:' + x +
    //                'px;top:' + y + 'px;">' + text + x + ',' + y + '</div>';
    //     $dagImage.append(html);
    // }

    if (window.unitTestMode) {
        Dag.__testOnly__ = {};
        Dag.__testOnly__.getSchemaNumRows = getSchemaNumRows;
        Dag.__testOnly__.findColumnSource = findColumnSource;
        Dag.__testOnly__.getIconHtml = getIconHtml;
        Dag.__testOnly__.getJoinIconClass = getJoinIconClass;
        Dag.__testOnly__.getDagNodeInfo = getDagNodeInfo;
        Dag.__testOnly__.getSourceTables = getSourceTables;
        Dag.__testOnly__.getRenamedColName = getRenamedColName;
    }

    return (Dag);

}(jQuery, {}));
