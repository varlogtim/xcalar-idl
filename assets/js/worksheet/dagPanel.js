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
                //probably too large
                saveImgError(canvas);
                deferred.reject(ErrTStr.LargeImgText);
            } else {
                var win = window.open();
                win.document.write('<img src="' + lnk + '" />');
                deferred.resolve(win);
            }
            $dagWrap.find('canvas').eq(1).remove();
        })
        .fail(deferred.reject);

        return deferred;
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

            if ($dagTable.hasClass("unexpectedNode")) {
                $menu.addClass("unexpectedNode");
            } else {
                $menu.removeClass("unexpectedNode");
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

    // for map & groupby tables, does not handle joined tables
    function isParentDropped($dagTable) {
        var id = $dagTable.data('index');
        var $dagWrap = $dagTable.closest('.dagWrap');
        var idMap = $dagWrap.data('allDagInfo').nodeIdMap;
        var node = idMap[id];
        var droppedClass = DgDagStateTStr[DgDagStateT.DgDagStateDropped];
        for (var i = 0; i < node.parents.length; i++) {
            var parentId = node.parents[i].value.dagNodeId;
            var $parentTable = $dagWrap.find('.dagTable[data-index="' +
                                                parentId + '"]');
            if ($parentTable.hasClass(droppedClass)) {
                return true;
            }
        }
        return false;
    }

    function setupDataFlowBtn() {
        $dagPanel.on('click', '.addDataFlow', function() {
            var self = this;
            var $dagWrap = $(self).closest(".dagWrap");
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
            inColumnPickerMode) {
            $menu.find('.archiveTable, .deleteTable, .dataflow').hide();
        } else {
            $menu.find('.archiveTable, .deleteTable, .dataflow').show();
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
        var nodeId = $tableIcon.data("index");
        var nodeIdMap = $tableWrap.closest(".dagWrap").data("allDagInfo")
                                                      .nodeIdMap;
        var node = nodeIdMap[nodeId];
        var parentNode = node.parents[0];
        var srcTableId = xcHelper.getTableId(parentNode.value.name);
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
                    TblManager.deleteTables(tableId, TableType.Active)
                    .then(function() {
                        XcSupport.memoryCheck(true);
                    });
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
        DagPanel.__testOnly__.generateIcvTable = generateIcvTable;
        DagPanel.__testOnly__.isComplementTableExists = isComplementTableExists;
    }

    return (DagPanel);

}(jQuery, {}));
