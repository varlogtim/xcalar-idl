window.DagPanel = (function($, DagPanel) {
    var $dagPanel = $('#dagPanel');
    var $dagArea = $dagPanel.find('.dagArea');

    DagPanel.setup = function() {
        setupDagPanelSliding();
        setupDagTableDropdown();
        setupRightClickDropdown();
        setupDataFlowBtn();
    };

    DagPanel.clear = function() {
        $(".closeDag").click();
        $(".dagWrap").remove();
    };

    var dagTopPct = 0; // open up dag to 100% by default;
    var clickDisabled = false;
    // opening and closing of dag is temporarily disabled during animation

    function setupDagPanelSliding() {
        $("#worksheetTabs").on("click", ".dagTab", function(event) {
            if (clickDisabled) {
                return;
            }
            var $compSwitch = $("#worksheetTabs .dagTab");
            var $workspacePanel = $('#workspacePanel');
            event.stopPropagation();

            var wasOnWorksheetPanel = true;
            if (!$workspacePanel.hasClass('active')) {
                wasOnWorksheetPanel = false;
            }

            if ($dagPanel.hasClass('hidden')) {
                // open dag panel
                $dagPanel.removeClass('invisible');
                $compSwitch.attr('data-original-title', TooltipTStr.CloseQG);
                $('.tooltip').hide();

                // without set timeout, animation would not work because
                // we're setting dagpanel from display none to display block
                setTimeout(function() {
                    $dagPanel.removeClass('hidden');
                    setDagTranslate(dagTopPct);
                    $dagArea.css('height', (100 - dagTopPct) + '%');
                    $compSwitch.addClass('active');


                    Dag.focusDagForActiveTable();
                    clickDisabled = true;
                    setTimeout(function() {
                        var px = 38 * (dagTopPct / 100);
                        $('#mainFrame').height('calc(' + dagTopPct + '% - ' +
                                               px + 'px)');
                        $dagPanel.addClass('noTransform');
                        $dagPanel.css('top', dagTopPct + '%');
                        clickDisabled = false;
                    }, 350);
                }, 0);

            } else if (wasOnWorksheetPanel) {
                // hide dag panel
                closePanel($compSwitch);
            }

            if (!wasOnWorksheetPanel) {
                $('#workspaceTab').trigger('click');
                $compSwitch.attr('data-original-title', TooltipTStr.CloseQG);
                $('.tooltip').hide();
            }

            $('.columnOriginInfo').remove();
            Tips.refresh();
        });

        $('#closeDag').click(function() {
            // only triiger the first dagTab is enough
            $('.dagTab').eq(0).trigger('click');
        });

        $('#maximizeDag').click(function() {
            if ($(this).hasClass('unavailable')) {
                return;
            }
            $dagPanel.removeClass('noTransform');
            $('#mainFrame').height('calc(100% - 38px)');
            $dagArea.css('height', '100%');
            if (dagTopPct === undefined) {
                setDagTranslate(0);
            } else {
                setDagTranslate(-dagTopPct);
            }
            $(this).addClass('unavailable');
            clickDisabled = true;
            setTimeout(function() {
                $dagPanel.addClass('noTransform');
                $dagPanel.css('top', 0);
                dagTopPct = 0;
                clickDisabled = false;
            }, 400);
        });

        var dagPanelTop = 0;
        $dagPanel.on('mousedown', '.ui-resizable-n', function() {
            dagPanelTop = $dagPanel.position().top;
        });

        $dagPanel.resizable({
            handles    : "n",
            containment: 'parent',
            start      : function(event, ui) {
                $dagPanel.addClass('noTransform');
                $dagPanel.css('top', dagPanelTop);
                ui.originalPosition.top = dagPanelTop;
                ui.position.top = dagPanelTop;
                $('#mainFrame').height('calc(100% - 38px)');
                $dagArea.css('height', '100%');
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
                    closePanel($('#worksheetTabs').find('.dagTab.active'));
                    return;
                }
                dagTopPct = 100 * (dagPanelTop / containerHeight);

                var px = 38 * (dagTopPct / 100);
                $dagPanel.css('top', dagTopPct + '%');
                $('#mainFrame').height('calc(' + dagTopPct + '% - ' + px + 'px)');
                $dagArea.css('height', (100 - dagTopPct) + '%');
            }
        });
    }

    function closePanel($compSwitch) {
        $compSwitch.removeClass('active');
        $compSwitch.attr('data-original-title', TooltipTStr.OpenQG);
        $('.tooltip').hide();
        $dagPanel.removeClass('noTransform');
        $('#mainFrame').height('calc(100% - 38px)');
        $dagArea.css('height', (100 - dagTopPct) + '%');
        $dagPanel.addClass('hidden');
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
            $dagPanel.addClass('invisible');
        }, 400);
    }

    function setDagTranslate(pct) {
        $dagPanel.css({
            '-webkit-transform': 'translate3d(0, ' + pct + '%, 0)',
            '-moz-transform'   : 'translate3d(0, ' + pct + '%, 0)',
            '-ms-transform'    : 'translate3d(0, ' + pct + '%, 0)',
            '-o-transform'     : 'translate3d(0, ' + pct + '%, 0)',
            'transform'        : 'translate3d(0, ' + pct + '%, 0)'
        });
    }

    function setupDagTableDropdown() {
        $dagPanel.append(getDagTableDropDownHTML());
        var $menu = $dagPanel.find('.dagTableDropDown');
        addMenuBehaviors($menu);
        dagTableDropDownActions($menu);

        var selection = '.dagTable:not(.dataStore) .dagTableIcon,' +
                        '.dagTable:not(.dataStore) .icon,' +
                        '.dagTable:not(.dataStore) .tableTitle';

        $dagPanel.on('click', selection, function(event) {
            $('.menu').hide().removeClass('leftColMenu');
            removeMenuKeyboardNavigation();
            $('#dagSchema').hide();
            var $dagTable = $(this).closest('.dagTable');
            if (!$dagTable.hasClass(DgDagStateTStr[5])) {
                // if dag does not have ready state, don't show dropdown
                return;
            }

            var tableName = $.trim($dagTable.find('.tableTitle').text());
            var tableId = $dagTable.data('id');
            $menu.data('tablename', tableName);
            $menu.data('tableId', tableId);
            $menu.data('tableelement', $dagTable);
            var activeFound = false;
            var tableWSId;

            // if active table, hide "addTable" and show "focusTable"
            $('#activeTablesList').find('.tableInfo').each(function() {
                var $li = $(this);
                if ($li.data('id') === tableId) {
                    $menu.find('.addTable, .revertTable').addClass('hidden');
                    $menu.find('.focusTable').removeClass('hidden');
                    activeFound = true;
                    tableWSId = WSManager.getWSFromTable(tableId);
                    $menu.data('ws', tableWSId);
                    return (false);
                }
            });

            if (activeFound) {
                $menu.find('.addTable, .revertTable').addClass('hidden');
            } else {
                $menu.find('.addTable, .revertTable').removeClass('hidden');
                $menu.find('.focusTable').addClass('hidden');
            }

            if ($dagTable.hasClass('locked')) {
                $menu.find('li').hide();
                $menu.find('.unlockTable').show();
            } else {
                $menu.find('li').show();
                $menu.find('.unlockTable').hide();
            }

            positionAndShowDagTableDropdown($dagTable, $menu, $(event.target));
            addMenuKeyboardNavigation($menu);
            $('body').addClass('noSelection');
        });
    }

    function setupRightClickDropdown() {
        $dagPanel.append(getRightClickDropDownHTML());
        var $menu = $dagPanel.find('.rightClickDropDown');
        addMenuBehaviors($menu);
        addRightClickActions($menu);

        $dagPanel[0].oncontextmenu = function(e) {
            var $target = $(e.target);
            var $dagWrap = $target.closest('.dagWrap');

            $target = $(e.target).closest('.dagTable:not(.dataStore) .dagTableIcon');
            var $secondTarget = $(e.target).closest('.dagTable:not(.dataStore) .icon');
            var $thirdTarget = $(e.target).closest('.dagTable:not(.dataStore)' +
                                                    ' .tableTitle');
            if ($target.length) {
                $target.trigger('click');
                return false;
            } else if ($secondTarget.length) {
                $secondTarget.trigger('click');
                return false;
            } else if ($thirdTarget.length) {
                $thirdTarget.trigger('click');
                return false;
            } else if ($dagWrap.length !== 0) {
                $('.menu').hide().removeClass('leftColMenu');
                $('#dagSchema').hide();
                $menu.data('dagid', $dagWrap.attr('id'));
                positionAndShowRightClickDropdown(e, $menu);
                addMenuKeyboardNavigation($menu);
                $('body').addClass('noSelection');
                return false;
            }
        };

        $dagPanel.find('.dagArea').scroll(function() {
            if ($('.menu').is(':visible')) {
                $('.menu').hide();
                removeMenuKeyboardNavigation();
            }
        });
    }

    function setupDataFlowBtn() {
        $dagPanel.on('click', '.addDataFlow', function() {
            DataFlowModal.show($(this).closest('.dagWrap'));
        });
    }

    function addRightClickActions($menu) {
        $menu.find('.saveImage').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var dagId = $menu.data('dagid');
            var $dagWrap = $('#' + dagId);
            var tableName = $dagWrap.find('.tableTitleArea .tableName').text();
            var canvas = $dagWrap.find('canvas').eq(1)[0];
            if ($('html').hasClass('microsoft')) { // for IE
                var blob = canvas.msToBlob();
                window.navigator.msSaveBlob(blob, tableName + '.png');
            } else {
                downloadImage(canvas, tableName);
            }
        });

        $menu.find('.newTabImage').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var dagId = $menu.data('dagid');
            var $dagWrap = $('#' + dagId);
            var canvas = $dagWrap.find('canvas').eq(1)[0];

            window.open(canvas.toDataURL("image/png"));
        });

        $menu[0].oncontextmenu = function() {
            return false;
        };
    }

    function downloadImage(canvas, filename) {

        /// create an "off-screen" anchor tag
        var lnk = document.createElement('a');
        var e;

        /// the key here is to set the download attribute of the a tag
        lnk.download = filename;

        /// convert canvas content to data-uri for link. When download
        /// attribute is set the content pointed to by link will be
        /// pushed as "download" in HTML5 capable browsers
        lnk.href = canvas.toDataURL();

        /// create a "fake" click-event to trigger the download
        if (document.createEvent) {

            e = document.createEvent("MouseEvents");
            e.initMouseEvent("click", true, true, window,
                             0, 0, 0, 0, 0, false, false, false,
                             false, 0, null);

            lnk.dispatchEvent(e);
        } else if (lnk.fireEvent) {

            lnk.fireEvent("onclick");
        }
    }

    function positionAndShowRightClickDropdown(e, $menu) {
        var topMargin = 3;
        var leftMargin = 7;

        var top = e.pageY + topMargin;
        var left = e.pageX + leftMargin;

        // if dagpanel is open halfway we have to change the top position
        // of colmenu
        if ($('#dagPanel').hasClass('midway')) {
            top -= $('#dagPanel').offset().top;
        }
        $menu.removeClass('leftColMenu');
        $menu.find('.selected').removeClass('selected');

        $menu.css({'top': top, 'left': left});
        $menu.show();

        var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect()
                                                .left;

        if ($menu[0].getBoundingClientRect().right > leftBoundary) {
            left = leftBoundary - $menu.width() - 10;
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
        var leftMargin = 0;
        var top = $dagTable[0].getBoundingClientRect().bottom + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left + leftMargin;
        if ($target.is('.tableTitle')) {
            top = $target[0].getBoundingClientRect().bottom + topMargin;
        }

        // if dagpanel is open halfway we have to change the top position
        // of colmenu
        if ($('#dagPanel').hasClass('midway')) {
            top -= $('#dagPanel').offset().top;
        }
        $menu.removeClass('leftColMenu');
        $menu.find('.selected').removeClass('selected');
        $menu.css({'top': top, 'left': left});
        $menu.show();

        var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect()
                                                .left;

        if ($menu[0].getBoundingClientRect().right > leftBoundary) {
            left = $dagTable[0].getBoundingClientRect().right - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $menu[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $menu.css('top', '-=' + ($menu.height() + 35));
        }
        $('.tooltip').hide();
    }

    function getDagTableDropDownHTML() {
        var html =
        '<ul class="menu dagTableDropDown">' +
            '<li class="addTable">' +
                'Add Table To Worksheet' +
            '</li>' +
            '<li class="revertTable">' +
                'Revert To This Table' +
            '</li>' +
            '<li class="focusTable">' +
                'Find Table In Worksheet' +
            '</li>' +
            '<li class="lockTable" title="Prevents table from being deleted">' +
                'Lock Table' +
            '</li>' +
            '<li class="unlockTable" ' +
                'title="Allow table to be deleted">' +
                'Unlock Table' +
            '</li>' +
            '<li class="deleteTable">' +
                'Delete Table' +
            '</li>' +
            '<li class="deleteTableDescendants unavailable" data-toggle="tooltip" ' +
                'data-placement="bottom" data-container="body" ' +
                'title="' + TooltipTStr.ComingSoon + '">' +
                'Delete Table & Descendants' +
            '</li>' +
        '</ul>';
        return (html);
    }

    function getRightClickDropDownHTML() {
        var html =
        '<ul class="menu rightClickDropDown">' +
            '<li class="saveImage">' +
                'Save Image' +
            '</li>' +
            '<li class="newTabImage">' +
                'Open Image In New Tab' +
            '</li>' +
        '</ul>';
        return (html);
    }

    function dagTableDropDownActions($menu) {
        $menu.find('.addTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var wsId = WSManager.getActiveWS();
            var tableType;

            if (WSManager.getWSFromTable(tableId) == null) {
                tableType = TableType.Orphan;
            } else if (gTables[tableId].status === TableType.Orphan) {
                tableType = TableType.Orphan;
            } else {
                 tableType = TableType.Archived;
            }

            WSManager.moveInactiveTable(tableId, wsId, tableType);
        });

        $menu.find('.revertTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var wsId;
            var worksheet;
            if (WSManager.getWSFromTable(tableId) == null) {
                tableType = "noSheet";
                wsId = WSManager.getActiveWS();
                worksheet = wsId;
            } else if (gTables[tableId] && gTables[tableId].status ===
                        TableType.Orphan) {
                tableType = TableType.Orphan;
                wsId = null;
                worksheet = WSManager.getWSFromTable(tableId);
            } else {
                tableType = TableType.Archived;
                wsId = null;
                worksheet = WSManager.getWSFromTable(tableId);
            }

            var newTableName = $menu.data('tablename');
            var $tableIcon = $menu.data('tableelement');
            var $dagWrap = $tableIcon.closest('.dagWrap');
            var oldTableName = $dagWrap.find('.tableName').text();

            TblManager.refreshTable([newTableName], null, [oldTableName], wsId)
            .then(function() {
                var tableId = xcHelper.getTableId(newTableName);
                // if (tableType === "noSheet") {
                //     tableType = TableType.Orphan;
                // }
                // TableList.removeTable(tableId, tableType);

                var $tableWrap = $('#xcTableWrap-' + tableId).mousedown();
                Dag.focusDagForActiveTable();
                xcHelper.centerFocusedTable($tableWrap, true);

                SQL.add("Revert Table", {
                    "operation": SQLOps.RevertTable,
                    "tableName": newTableName,
                    "oldTableName": oldTableName,
                    "tableId"  : tableId,
                    "tableType": tableType,
                    "worksheet": worksheet,
                    "htmlExclude": ["tableType", "oldTableName", "worksheet"]
                });
            });
        });

        $menu.find('.focusTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var wsId    = $menu.data('ws');
            $('#worksheetTab-' + wsId).click();

            if ($dagPanel.hasClass('full')) {
                $('#dagPulloutTab').click();
            }
            var $tableWrap = $('#xcTableWrap-' + tableId);
            xcHelper.centerFocusedTable($tableWrap);

            $tableWrap.mousedown();
            moveFirstColumn();
        });

        $menu.find('.lockTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var $tableIcon = $menu.data('tableelement');
            var lockHTML = '<div class="lockIcon"></div>';
            $tableIcon.addClass('locked').append(lockHTML);
        });

        $menu.find('.unlockTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var $tableIcon = $menu.data('tableelement');
            $tableIcon.removeClass('locked')
                      .find('.lockIcon').remove();
        });

        $menu.find('.deleteTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var tableName = $menu.data('tablename');
            var table = gTables[tableId];
            if (table && table.isLocked) {
                return;
            }
            var $table = $('#xcTableWrap-' + tableId);

            // check if table visibile, else check if its in the inactivelist,
            // else check if its in the orphan list, else just delete the table
            if ($table.length !== 0 && !$table.hasClass('locked')) {
                var msg = xcHelper.replaceMsg(TblTStr.DelMsg,
                                                {"table": tableName});
                Alert.show({
                    "title"  : TblTStr.Del,
                    "msg"    : msg,
                    "confirm": function() {
                        TblManager.deleteTables(tableId, TableType.Active);
                    }
                });
            } else if (table) {
                if (table.status === TableType.Orphan) {
                    TableList.refreshOrphanList().
                    then(function() {
                        $('#orphanedTablesList').find('.tableInfo').each(function() {
                            var $li = $(this);
                            if ($li.data('tablename') === tableName) {
                                $li.find('.addTableBtn').click();
                                $('#deleteOrphanedTablesBtn').click();
                                return (false);
                            }
                        });
                    });
                } else {
                    $('#inactiveTablesList').find('.tableInfo').each(function() {
                        var $li = $(this);
                        if ($li.data('id') === tableId) {
                            $li.find('.addTableBtn').click();
                            $('#deleteTablesBtn').click();
                            return (false);
                        }
                    });
                }
            } else {
                var orphanFound = false;
                $('#orphanedTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('tablename') === tableName) {
                        $li.find('.addTableBtn').click();
                        $('#deleteOrphanedTablesBtn').click();
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
                    "sql"      : sql
                });

                XcalarDeleteTable(tableName, txId)
                .then(function() {
                    Dag.makeInactive(tableName, true);
                    // delete table will change meta, so should commit
                    Transaction.done(txId);
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "failMsg": StatusMessageTStr.DeleteTableFailed,
                        "error"  : error
                    });
                });
            }
        });
    }

    return (DagPanel);

}(jQuery, {}));


window.Dag = (function($, Dag) {
    $dagPanel = $('#dagPanel');
    var scrollPosition = -1;
    var dagAdded = false;

    Dag.construct = function(tableId, tablesToRemove) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.tableName;

        XcalarGetDag(tableName)
        .then(function(dagObj) {
            if (tablesToRemove) {
                for (var i = 0, len = tablesToRemove.length; i < len; i++) {
                    var tblId = tablesToRemove[i];
                    $('#dagWrap-' + tblId).remove();
                }
            }
            var isWorkspacePanelVisible = $('#workspacePanel')
                                            .hasClass('active');
            var isDagPanelVisible = !$('#dagPanel').hasClass('invisible');
            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').addClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').removeClass('invisible');
            }

            if (tablesToRemove) {
                var tblId;
                for (var i = 0, len = tablesToRemove.length; i < len; i++) {
                    tblId = tablesToRemove[i];
                    $('#dagWrap-' + tblId).remove();
                }
            }

            var outerDag =
                '<div class="dagWrap clearfix" id="dagWrap-' +
                    tableId + '" data-id="' + tableId + '">' +
                '<div class="header clearfix">' +
                    '<div class="btn btnSmall infoIcon">' +
                        '<div class="icon"></div>' +
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
                        'data-placement="top" title="Add Data Flow" ' +
                        'class="btn btnSmall addDataFlow">' +
                            '<span class="icon"></span>' +
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
            Dag.createDagImage(dagObj.node, $dagWrap, {savable: true});

            Dag.focusDagForActiveTable(tableId);

            if ($('#xcTableWrap-' + tableId).find('.tblTitleSelected').length) {
                $('.dagWrap.selected').removeClass('selected')
                                      .addClass('notSelected');
                $('#dagWrap-' + tableId).removeClass('notSelected')
                                        .addClass('selected');
            }

            addDagEventListeners($dagWrap);
            if (!dagAdded) {
                preventUnintendedScrolling();
            }

            dagAdded = true;
            var activeWS = WSManager.getActiveWS();
            var tableWS = WSManager.getWSFromTable(tableId);
            if (activeWS !== tableWS) {
                $dagWrap.addClass('inActive');
            }
            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').removeClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').addClass('invisible');
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error('dag failed', error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    Dag.createDagImage = function(nodeArray, $container, options) {
        options = options || {};
        var prop = {
            x          : 0,
            y          : 0,
            parentCount: 0
        };
        var index = 0;
        var node = nodeArray[index];
        var children = "";
        var parentChildMap = Dag.getParentChildDagMap(nodeArray);

        var x = "";
        for (var i = 0; i < nodeArray.length; i++) {
            x += nodeArray[i].name.name + " ";
        }

        var dagImageHtml = drawDagNode(node, prop, nodeArray, index,
                                       parentChildMap, children);
        dagImageHtml = '<div class="dagImageWrap"><div class="dagImage">' +
                            dagImageHtml + '</div></div>';
        $container.append(dagImageHtml);

        var $dagImage = $container.find('.dagImage');
        var canvasClone = createCanvas($container);
        var ctxClone = canvasClone.getContext('2d');
        ctxClone.strokeStyle = '#999999';

        $dagImage.find('.joinWrap').eq(0).find('.dagTableWrap')
                .each(function() {
                    var el = $(this);
                    drawDagLines(el, ctxClone);
                });

        if (options.savable) {
            var fullCanvas = true;
            var canvas = createCanvas($container, fullCanvas);
            var ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#999999';
            drawSavableCanvasBackground(canvas, ctx, $container, canvasClone);
        }

        $dagImage.find('.dagTable').each(function() {
            var $dagTable = $(this);
            var top = Math.floor($dagTable.position().top);
            var left = Math.floor($dagTable.position().left);
            var $clone = $dagTable.clone();
            $dagImage.append($clone);
            $clone.css({top: top, left: left, position: 'absolute'});
            if (options.savable) {
                drawDagTableToCanvas($dagTable, ctx, top, left);
            }
        });

        $dagImage.find('.actionType').each(function() {
            var $actionType = $(this);
            var top = Math.floor($actionType.position().top) + 4;
            var left = Math.floor($actionType.position().left);
            var $clone = $actionType.clone();
            $dagImage.append($clone);
            $clone.css({top: top, left: left, position: 'absolute'});
            if (options.savable) {
                drawDagActionTypeToCanvas($actionType, ctx, top, left);
            }
        });

        $dagImage.height($dagImage.height() + 40);
        $dagImage.width($dagImage.width());
        $container.find('.joinWrap').eq(0).remove();
    };

    Dag.renameAllOccurrences = function(oldTableName, newTableName) {
        var $dagPanel = $('#dagPanel');

        $dagPanel.find('.tableName').filter(function() {
            return ($(this).text() === oldTableName);
        }).text(newTableName);

        var $dagTableTitles = $dagPanel.find('.tableTitle').filter(function() {
            return ($(this).text() === oldTableName);
        });
        $dagTableTitles.text(newTableName)
                       .attr('data-original-title', newTableName)
                       .attr('title', newTableName);

        $dagTableTitles.parent().data('tablename', newTableName);
        var $dagParentsTitles = $dagPanel.find('.parentsTitle')
                                          .filter(function() {
                                    return ($(this).text() === oldTableName);
                                });

        $dagParentsTitles.text(newTableName);
        var $actionTypes = $dagParentsTitles.closest('.actionType');
        $actionTypes.each(function() {
            var tooltipText = $(this).attr('data-original-title');
            var newText;
            if (tooltipText) {
                newText = tooltipText.replace(oldTableName, newTableName);
                $(this).attr('data-original-title', newText);
            }
            var title = $(this).attr('title');
            if (title) {
                newText = title.replace(oldTableName, newTableName);
                $(this).attr('title', newText);
            }
        });
    };

    Dag.makeInactive = function(tableId, nameProvided) {
        var tableName;
        var $dags;
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
        $dags.find('.icon').attr({
            "data-toggle"        : "tooltip",
            "data-placement"     : "top",
            "data-container"     : "body",
            "data-original-title": "Table '" + tableName + "' has been dropped"
        });
    };

    Dag.focusDagForActiveTable = function(tableId, tableFocused) {
        // tableId given only when initial dag is created
        var activeTableId;
        var $dagWrap;
        var $dag;
        if (tableId) {
            activeTableId = tableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');
            var isDagVisible = checkIfDagWrapVisible($dagWrap);
            if (!isDagVisible) {
                $dag.scrollLeft($dag.width());
            }
        } else {
            activeTableId = gActiveTableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');
            if (!$dag.length) {
                return;
            }
            if (tableFocused) {
                if (checkIfDagWrapVisible($dagWrap)) {
                    return;
                }
            }

            $dag.scrollLeft($dag.width());

            var scrollTop = $dagPanel.find('.dagArea').scrollTop();
            var dagTop = $dagWrap.position().top;

            if (dagTop - 95 + $dagPanel.scrollTop() === 0) {
                $dagPanel.scrollTop(0);
            } else {
                $dagPanel.find('.dagArea').scrollTop(scrollTop + dagTop - 16);
            }
        }
    };

    Dag.getParentChildDagMap = function(nodeArray) {
        var map = {}; // holds a map of nodes & array indices of parents
        var parentIndex = 0;
        var numParents;
        for (var i = 0; i < nodeArray.length; i++) {
            numParents = getDagnumParents(nodeArray[i]);
            map[i] = [];
            for (var j = 0; j < numParents; j++) {
                map[i].push(++parentIndex);
            }
        }
        return (map);
    };

    Dag.getDagSourceNames = function(parentChildMap, index, dagArray) {
        var parentNames = [];
        for (var i = 0; i < parentChildMap[index].length; i++) {
            var parentIndex = parentChildMap[index][i];
            var parentName = dagArray[parentIndex].name.name;
            parentNames.push(parentName);
        }
        return (parentNames);
    };

    function drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone) {
        var img = new Image();
        img.src = paths.dagBackground;
        img.onload = function() {
            var ptrn = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasClone, 0, 50);
            ctx.save();
            var tableTitleText = $dagWrap.find('.tableTitleArea')
                                         .text();
            ctx.font = '600 15px Open Sans';
            ctx.fillStyle = '#555555';
            ctx.fillText(tableTitleText, 30, 22);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(20, 33);
            ctx.lineTo(canvas.width - 40, 33);
            ctx.strokeStyle = '#A5A5A5';
            ctx.stroke();
        };
    }

    function drawDagTableToCanvas($dagTable, ctx, top, left) {
        left += 40;
        top += 50;
        var iconLeft = left;
        var iconTop = top + 6;

        var tableImage = new Image();

        if ($dagTable.hasClass('dataStore')) {
            // tableImage = dataStoreImage;
            tableImage.src = paths.dbDiamond;
            iconLeft -= 2;
            iconTop -= 4;
        } else {
            // tableImage = tableIconImage;
            tableImage.src = paths.dTable;
        }

        tableImage.onload = function() {
            ctx.drawImage(tableImage, iconLeft, iconTop);

            var maxWidth = 130;
            var lineHeight = 12;
            var x = left - 45;
            var y = top + 38;
            var text = $dagTable.find('.tableTitle').text();

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, 130, 26);
            ctx.clip();
            ctx.font = 'bold 10px Open Sans';
            ctx.fillStyle = '#6e6e6e';
            ctx.textAlign = 'center';

            wrapText(ctx, text, x + 65, y + 10, maxWidth, lineHeight);
        };
    }

    function drawDagActionTypeToCanvas($actionType, ctx, top, left) {
        left += 40;
        top += 50;
        var $dagIcon = $actionType.find('.dagIcon');
        var iconSource = $dagIcon.find('.icon').css('background-image');
        iconSource = iconSource.replace('url(', '').replace(')', '')
                               .replace(/"/g, '');
        var rectImage = new Image();
        rectImage.src = paths.roundedRect;

        rectImage.onload = function() {
            ctx.drawImage(rectImage, left + 20, top);

            var dagIcon = new Image();
            var iconLeft = left + 23;
            var iconTop = top + 7;
            dagIcon.src = iconSource;

            dagIcon.onload = function() {
                ctx.drawImage(dagIcon, iconLeft, iconTop);
            };

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
            ctx.fillStyle = '#4D4D4D';

            wrapText(ctx, text, x, y, maxWidth, lineHeight);

            // text regarding table origin / parents
            y = top + 19;
            text = $actionType.find('.parentsTitle').text();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 20);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = '#4D4D4D';

            wrapText(ctx, text, x, y, maxWidth, lineHeight);
        };
    }

    function checkIfDagWrapVisible($dagWrap) {
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

        if (dagTop - 30 > dagAreaHeight || dagTop + dagHeight < 50) {
            return (false);
        }
        return (true);
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var words = text.split(/-| /);
        var line = '';

        for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = ctx.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
        ctx.restore();
    }

    function addDagEventListeners($dagWrap) {

        $dagWrap.on('mouseenter', '.dagTable.Ready', function() {
            var $dagTable = $(this);
            var timer = setTimeout(function(){
                            var $dropdown = $('.menu:visible');
                            if ($dropdown.length !== 0 &&
                                $dropdown.data('tableelement') &&
                                $dropdown.data('tableelement').is($dagTable))
                            {
                                return;
                            } else {
                                showDagSchema($dagTable);
                                scrollPosition = $('.dagArea').scrollTop();
                            }

                        }, 100);
            $dagTable.data('hover', timer);
        });

        $dagWrap.on('mouseleave', '.dagTable', function() {
            var $dagTable = $(this);
            var timer = $dagTable.data('hover');
            if (timer) {
                clearTimeout(timer);
            }
            $('#dagSchema').remove();
            scrollPosition = -1;
        });

    }

    function showDagSchema($dagTable) {
        $('#dagSchema').remove();
        var tableId = $dagTable.data('id');
        var table = gTables[tableId];
        var $dagWrap = $dagTable.closest('.dagWrap');
        var tableName;
        var numCols;
        if (!table) {
            tableName = $dagTable.find('.tableTitle').text();
            numCols = 1;
        } else {
            tableName = table.tableName;
            numCols = table.tableCols.length;
        }

        var html = '<div id="dagSchema">' +
                    '<div class="title">' +
                        '<span class="tableName">' +
                            tableName +
                        '</span>' +
                        '<span class="numCols" title="' + CommonTxtTstr.NumCol + '">' +
                            '[' + (numCols - 1) + ']' +
                        '</span>' +
                    '</div>' +
                    '<span class="background"></span>' +
                    '<div class="heading">' +
                        '<div class="type">type</div>' +
                        '<div class="field">field</div>' +
                        '<div class="sample"></div>' +
                    '</div>';
        html += '<ul>';

        for (var i = 0; i < numCols; i++) {
            if (numCols === 1 || table.tableCols[i].name === 'DATA') {
                continue;
            }
            var type = table.tableCols[i].type;
            var name = table.tableCols[i].name;
            html += '<li>' +
                        '<div>' +
                        '<span class="iconWrap">' +
                            '<span class="typeIcon ' +
                            'typeIcon-' + type + '"></span>' +
                        '</span>' +
                        '<span class="text">' + type + '</span>' +
                        '</div>' +
                        '<div title="' + name + '" class="name">' +
                            name + '</div>' +
                        '<div>' +
                        // XX SAMPLE DATA GOES HERE
                        '</div>' +
                    '</li>';
        }
        if (numCols === 1) {
            html += '<span class="noFields">No fields present</span>';

        }
        html += '</ul></div>';
        var $schema = $(html);
        $dagTable.append($schema);
        var height = $schema.height();
        var top = $dagTable[0].getBoundingClientRect().top - height;
        top = Math.max(2, top);
        if ($('#dagPanel').hasClass('midway')) {
            top -= $('#dagPanel').offset().top;
        }
        var tableLeft = $dagTable[0].getBoundingClientRect().left + 10;
        var schemaLeft;
        if ($('#rightSideBar').hasClass('poppedOut')) {
            schemaLeft = $(window).width() - $schema.width() - 5;
        } else {
            schemaLeft = $('#rightSideBar').offset().left - $schema.width() - 5;
        }

        var left;
        if (tableLeft > schemaLeft) {
            left = schemaLeft;
            $schema.addClass('shiftLeft');
        } else {
            left = tableLeft;
        }
        $schema.css('top', top);
        $schema.css('left', left);

        if (numCols === 1) {
            $schema.addClass('empty');
        }

        $('#dagSchema').on('click', 'li', function() {
            var $name = $(this).find('.name');
            $('#dagSchema').find('li.selected').removeClass('selected');
            $(this).addClass('selected');
            var cols = gTables[tableId].tableCols;
            var name = $name.text();
            var func;
            var backName;
            var colNum = $(this).index();
            var numCols = $('#dagSchema').find('.numCols').text().substr(1);
            numCols = parseInt(numCols);

            for (var i = colNum; i <= numCols; i++) {
                if (cols[i].name === name) {
                    func = cols[i].func;
                    backName = cols[i].getBackColName();
                    if (backName == null) {
                        backName = name;
                    }
                    break;
                }
            }

            var sourceColNames = getSourceColNames(func);

            $('.columnOriginInfo').remove();
            $dagPanel.find('.highlighted').removeClass('highlighted');
            var parents = $dagTable.data('parents').split(',');
            addRenameColumnInfo(name, backName, $dagTable, $dagWrap);
            highlightColumnSource(tableId, $dagWrap, name);
            findColumnSource(name, sourceColNames, tableId, parents, $dagWrap,
                             backName);
            removeDuplicatedHighlightedDataStores($dagTable);
            $(document).mousedown(closeDagHighlight);
        });
    }

    function getSourceColNames(func) {
        var names = [];
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
        getNames(func.args);

        return (names);
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
        }

        $('.columnOriginInfo').remove();
        $dagPanel.find('.highlighted').removeClass('highlighted');
        $(document).off('mousedown', closeDagHighlight);
    }

    function addRenameColumnInfo(name, backName, $dagTable, $dagWrap) {
        if (name !== backName) {
            var msg = 'renamed ' + backName + ' to ' + name;
            $dagWrap.find(".columnOriginInfo[data-rename='" + msg + "']")
                    .remove();

            var rect = $dagTable[0].getBoundingClientRect();
            var top = rect.top - 35;
            var left = rect.left;
            if ($('#dagPanel').hasClass('midway')) {
                top -= $('#dagPanel').offset().top + 15;
            }
            $dagWrap.append('<div class="columnOriginInfo " ' +
                'data-rename="' + msg + '" ' +
                'style="top: ' + top + 'px;left: ' + left + 'px">' + msg +
                '</div>');
        }
    }

    // currently we highlight all source tables even if they're not in the
    // currect branch. This function unhiglights those that are in a diff branch
    function removeDuplicatedHighlightedDataStores($dagTable) {
        if ($('.dagTable.highlighted').length > 1) {
            var id = parseInt($dagTable.data('index'));
            $('.dagTable.highlighted').each(function() {
                var children = $(this).data('children');
                if (typeof children === "string") {
                    children = children.split(",");
                } else {
                    children = [children];
                }
                for (var i = 0; i < children.length; i++) {
                    children[i] = parseInt(children[i]);
                }
                if (children.indexOf(id) === -1) {
                    $(this).removeClass('highlighted');
                }
            });
        }
    }

    function findColumnSource(name, sourceColNames, child, parentTables,
                              $dagWrap, prevName) {
        var tableId;
        var parentTable;
        for (var i = 0; i < parentTables.length; i++) {
            var table;
            var parentTable = parentTables[i];
            var parentIsDataSet = false;
            if (parentTable.indexOf('.XcalarDS.') === 0) {
                table = false;
                parentIsDataSet = true;
            } else {
                tableId = xcHelper.getTableId(parentTable);
                table = gTables[tableId];
            }

            var $dagTable;
            var parents;
            if (table) {
                var cols = table.tableCols;
                var numCols = cols.length;
                var numSourceCols = sourceColNames.length;
                var colsFound = 0;

                for (var j = 0; j < numCols; j++) {
                    // skip DATA COL
                    if (cols[j].isDATACol()) {
                        continue;
                    }

                    for (var k = 0; k < numSourceCols; k++) {
                        var colName = sourceColNames[k];
                        var backColName = cols[j].getBackColName();
                        //XX backColName could be blank
                        if (colName === backColName) {
                            highlightColumnHelper(tableId, $dagWrap, cols[j],
                                                  sourceColNames);
                            colsFound++;
                            break;
                        } else {
                            var colArgs = getSourceColNames(cols[j].func);
                            var found = false;
                            for (var l = 0; l < colArgs.length; l++) {
                                if (colName === colArgs[l]) {
                                    highlightColumnHelper(tableId,
                                                          $dagWrap,
                                                          cols[j],
                                                          sourceColNames);
                                    colsFound++;
                                    found = true;
                                    break;
                                }
                                if (found) {
                                    break;
                                }
                            }
                        }
                    }
                    if (colsFound === numSourceCols) {
                        break;
                    }
                }
            } else if (!parentIsDataSet) {
                $dagTable = $dagWrap
                        .find('.dagTable[data-tablename="' + parentTable + '"]');
                if ($dagTable.length !== 0 && $dagTable.hasClass('Dropped')) {
                    parents = $dagTable.data('parents').split(',');
                    findColumnSource(name, sourceColNames, tableId, parents, $dagWrap);
                } else {
                    // table has no data, could be orphaned
                }

             // XX check if userstr === newcolS
            } else if (parentIsDataSet) {
                var datasetName = parentTable.substr(10);
                highlightColumnSource(datasetName, $dagWrap, prevName, true);
            }
        }
    }

    function highlightColumnHelper(tableId, $dagWrap, col, sourceColNames) {
        var currentName = col.name;
        var $dagTable = $dagWrap.find('.dagTable[data-id="' + tableId + '"]');
        var parents = $dagTable.data('parents').split(',');
        var srcColNames = getSourceColNames(col.func);

        highlightColumnSource(tableId, $dagWrap, currentName);
        var previousName = col.getBackColName();
        addRenameColumnInfo(currentName, previousName, $dagTable, $dagWrap);
        findColumnSource(name, srcColNames, tableId, parents, $dagWrap,
                         previousName);
    }

    function highlightColumnSource(sourceId, $dagWrap, name, isDataset) {
        var $dagTable;
        if (isDataset) {
            $dagTable = $dagWrap.find('.dagTable[data-tablename="' +
                                        sourceId + '"]');
        } else {
            $dagTable = $dagWrap.find('.dagTable[data-id="' +
                                        sourceId + '"]');
        }
        $dagTable.addClass('highlighted');
        var id = $dagTable.data('id');

        var rect = $dagTable[0].getBoundingClientRect();
        if ($dagWrap.find('.columnOriginInfo[data-id="' + id + '"]')
                    .length === 0) {
            var top = rect.top - 15;
            var left = rect.left;
            if ($('#dagPanel').hasClass('midway')) {
                top -= $('#dagPanel').offset().top;
            }
            $dagWrap.append('<div class="columnOriginInfo " data-id="' + id +
                '" style="top: ' + top + 'px;left: ' + left + 'px">' +
                name + '</div>');
        }
    }

    function getInputType(api) {
        var val = api.substr('XcalarApi'.length);
        var inputVal = "";
        switch (val) {
            case ('BulkLoad'):
                inputVal = 'load';
                break;
            case ('GetStat'):
                inputVal = 'stat';
                break;
            case ('GetStatByGroupId'):
                inputVal = 'statByGroupId';
                break;
            default:
                inputVal = val[0].toLowerCase() + val.substr(1);
                break;
        }
        inputVal += 'Input';
        return (inputVal);
    }

    function drawDagNode(dagNode, prop, dagArray, index, parentChildMap,
                         children) {
        var properties = {};
        properties.x = prop.x + 1;
        var numParents = parentChildMap[index].length;
        var accumulatedDrawings = "";
        children += "," + index;
        if (children[0] === ",") {
            children = children.substr(1);
        }

        for (var i = 0; i < numParents; i++) {
            var parentIndex = parentChildMap[index][i];
            properties.y = i * 2 + 1 - numParents + prop.y;

            accumulatedDrawings += drawDagNode(dagArray[parentIndex],
                                                properties, dagArray,
                                                parentIndex, parentChildMap,
                                                children);

        }
        var oneTable = drawDagTable(dagNode, dagArray, parentChildMap, index,
                                    children);
        var newHtml;
        if (accumulatedDrawings) {
            newHtml = "<div class='joinWrap'><div class='parentContainer'>" +
                      accumulatedDrawings + "</div>" + oneTable + "</div>";
        }

        if (newHtml) {
            return (newHtml);
        } else {
            return (accumulatedDrawings + oneTable);
        }
    }

    function drawDagTable(dagNode, dagArray, parentChildMap, index, children) {
        var dagOrigin = drawDagOperation(dagNode, dagArray, parentChildMap,
                                         index);
        var dagTable = '<div class="dagTableWrap clearfix">' +
                        dagOrigin;
        var key = getInputType(XcalarApisTStr[dagNode.api]);
        var parents = Dag.getDagSourceNames(parentChildMap, index, dagArray);
        var dagInfo = getDagNodeInfo(dagNode, key, parents);
        var state = dagInfo.state;
        var tableName = getDagName(dagNode);
        if (dagOrigin === "") {
            var url = dagInfo.url;
            var id = dagInfo.id;
            var originalTableName = tableName;
            if (tableName.indexOf('.XcalarDS.') === 0) {
                tableName = tableName.substr('.XcalarDS.'.length);
            }

            dagTable += '<div class="dagTable dataStore" ' +
                        'data-tablename="' + tableName + '" ' +
                        'data-table="' + originalTableName + '" ' +
                        'data-index="' + index + '" ' +
                        'data-children="' + children + '" ' +
                        'data-type="dataStore" ' +
                        'data-id="' + id + '" ' +
                        'data-url="' + url + '">' +
                            '<div class="dataStoreIcon"></div>' +
                            '<div class="icon"></div>' +
                            '<span class="tableTitle" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'title="' + tableName + '">' +
                            'Dataset ' +
                                tableName +
                            '</span>';
        } else {
            var tableId = xcHelper.getTableId(tableName);
            dagTable += '<div class="dagTable ' + state + '" ' +
                            'data-tablename="' + tableName + '" ' +
                            'data-children="' + children + '" ' +
                            'data-index="' + index + '" ' +
                            'data-id="' + tableId + '" ' +
                            'data-parents="' + parents + '">' +
                            '<div class="dagTableIcon"></div>';
            var dagDroppedState = DgDagStateT.DgDagStateDropped;
            if (dagInfo.state === DgDagStateTStr[dagDroppedState]) {
                dagTable += '<div class="icon" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body" ' +
                            'title="Table \'' + tableName +
                            '\' has been dropped"></div>';
            } else {
                dagTable += '<div class="icon"></div>';
            }
            dagTable += '<span class="tableTitle" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'title="' + tableName + '">' +
                            tableName +
                        '</span>';
        }
        dagTable += '</div></div>';
        return (dagTable);
    }

    function drawDagOperation(dagNode, dagArray, parentChildMap, index) {
        var originHTML = "";
        var numParents = getDagnumParents(dagNode);

        if (numParents > 0) {
            var parents = Dag.getDagSourceNames(parentChildMap, index, dagArray);
            var additionalInfo = "";
            var firstParent = parents[0];
            if (numParents === 2) {
                additionalInfo += " & " + parents[1];
            }
            var key = getInputType(XcalarApisTStr[dagNode.api]);
            var operation = key.substring(0, key.length - 5);
            var info = getDagNodeInfo(dagNode, key, parents);
            var resultTableName = getDagName(dagNode);
            if (info.type === "sort") {
                operation = "sort";
            } else if (info.type === "createTable") {
                operation = "Create Table";
            }

            originHTML += '<div class="actionType dropdownBox ' + operation +
                        '" style="top:' + 0 + 'px; right:' + 0 + 'px;" ' +
                        'data-type="' + operation + '" ' +
                        'data-info="' + info.text.replace(/"/g, "'") + '" ' +
                        'data-column="' + info.column.replace(/"/g, "'") +
                                        '" ' +
                        'data-table="' + resultTableName + '"' +
                        'data-id="' + info.id + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + info.tooltip.replace(/"/g, "'") + '">' +
                            '<div class="actionTypeWrap" >' +
                                '<div class="dagIcon ' + operation + ' ' +
                                    info.type + '">' +
                                    '<div class="icon"></div>';
            if (operation === 'groupBy') {
                originHTML += '<div class="icon icon2 ' + info.type + '">' +
                              '</div>';
            }
            if (firstParent.indexOf('.XcalarDS.') === 0) {
                firstParent = info.column;
            }
            if (operation !== 'join') {
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

    function getDagnumParents(dagNode) {
        var numParents = 0;
        if (dagNode.api === XcalarApisT.XcalarApiJoin) {
            numParents = 2;
        } else if (dagNode.api !== XcalarApisT.XcalarApiBulkLoad) {
            numParents = 1;
        }
        return (numParents);
    }

    function getDagName(dagNode) {
        return (dagNode.name.name);
    }

    function getDagNodeInfo(dagNode, key, parents) {
        var parenIndex;
        var filterType;
        var evalStr;
        var value = dagNode.input[key];
        var info = {};
        info.type = "unknown";
        info.text = "";
        info.tooltip = "";
        info.column = "unknown";
        info.id = dagNode.dagNodeId;
        info.state = DgDagStateTStr[dagNode.state];

        switch (key) {
            case ('loadInput'):
                info.url = value.dataset.url;
                break;
            case ('filterInput'):
                var filterStr = value.filterStr;
                parenIndex = filterStr.indexOf("(");
                var abbrFilterType = filterStr.slice(0, parenIndex);

                info.type = "filter" + abbrFilterType;
                info.text = filterStr;
                filterType = "";
                var filterTypeMap = {
                    "gt"   : "greater than",
                    "ge"   : "reater than or equal to",
                    "eq"   : "equal to",
                    "lt"   : "less than",
                    "le"   : "less than or equal to",
                    "regex": "regex",
                    "like" : "like",
                    "not"  : "not"
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
                        info.column = filteredOn;
                        info.tooltip = "Filtered table &quot;" + parents[0] +
                                       "&quot; excluding " + filterValue +
                                       " from " + filteredOn + ".";
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
                var parentTableId = xcHelper.getTableId(value.srcTable.tableName);
                var groupedOn;
                var sampleStr = "";
                if (parentTableId in gTables) {
                    groupedOn = gTables[parentTableId].keyName;
                } else {
                    // Created with backend. Tskie
                    groupedOn = "(See previous table index)";
                }
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
                    } else if (value.ordering ===
                               XcalarOrderingT.XcalarOrderingDescending) {
                        order = "(descending) ";
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
            case ('exportInput'):
                info.type = "export";
                try {
                    info.url = value.meta.specificInput.sfInput.fileName;
                } catch (err) {
                    console.error('Could not find export filename');
                }

                break;
            default:
                console.error('Dag type not recognized');
                break;
        }
        return (info);
    }

    /* Generation of dag elements and canvas lines */
    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage > div').width();
        var dagHeight = $dagWrap.find('.dagImage > div').height();
        var className = "";
        if (full) {
            dagHeight += 50;
            className = " full";
        }
        var canvasHTML = $('<canvas class="canvas' + className +
                            '" width="' + (dagWidth + 80) +
                            '" height="' + (dagHeight + 40) + '"></canvas>');
        $dagWrap.find('.dagImage').append(canvasHTML);
        return (canvasHTML[0]);
    }

    // this function draws all the lines going into a blue table icon and its
    // corresponding gray origin rectangle
    function drawDagLines(dagTable, ctx) {
        if (dagTable.prev().children().length !== 2 ) { // exclude joins
            if (dagTable.children('.dataStore').length === 0) {
                //exclude datasets
                drawStraightDagConnectionLine(dagTable, ctx);
            }
        } else { // draw lines for joins

            var origin1 = dagTable.prev().children().eq(0)
                          .children().eq(1).find('.dagTable');
            var origin2 = dagTable.prev().children().eq(1)
                          .children().eq(1).find('.dagTable');

            var desiredY = (origin1.position().top + origin2.position().top) / 2;
            var currentY = dagTable.find('.dagTable').position().top;
            var yAdjustment = (desiredY - currentY) * 2;
            dagTable.css({'margin-top': yAdjustment});

            var tableX = dagTable.find('.dagTable').position().left + 40;
            var tableY = dagTable.find('.dagTable').position().top +
                         dagTable.height() / 2;
            drawLine(ctx, tableX, tableY); // line entering table

            curvedLineCoor = {
                x1: origin1.position().left + origin1.width() + 40,
                y1: origin1.position().top + origin1.height() / 2,
                x2: Math.floor(dagTable.find('.actionTypeWrap')
                                        .position().left + 12 + 40),
                y2: Math.floor(dagTable.find('.actionTypeWrap').position().top)
            };
            drawCurve(ctx, curvedLineCoor);
        }
    }

    // draw the lines corresponding to tables not resulting from joins
    function drawStraightDagConnectionLine(dagTable, ctx) {
        var tableX = dagTable.find('.dagTable').position().left + 40;
        var farLeftX = dagTable.position().left + 40;
        var currentY = dagTable.offset().top;
        var desiredY;

        if (dagTable.prev().children().children('.dagTableWrap').length > 0) {
            desiredY = dagTable.prev().children()
                                        .children('.dagTableWrap')
                                        .offset().top;
        } else {
            desiredY = dagTable.prev().children('.dagTableWrap').offset().top;
        }
        var yAdjustment = (desiredY - currentY) * 2;
        dagTable.css({'margin-top': yAdjustment});
        var tableCenterY = dagTable.find('.dagTable').position().top +
                     dagTable.height() / 2;
        drawLine(ctx, tableX, tableCenterY, (tableX - farLeftX + 20));
    }

    function drawCurve(ctx, coor) {
        var x1 = coor.x1;
        var y1 = coor.y1;
        var x2 = coor.x2;
        var y2 = coor.y2;
        var vertDist = y2 - y1;

        var xoffset = 0;
        if (vertDist < 60) {
            xoffset = 1000 / vertDist;
        }

        ctx.beginPath();
        ctx.moveTo(x1 + xoffset, y1);
        ctx.bezierCurveTo( x2 + 50, y1,
                            x2 + 50, y1 + (vertDist + 16) * 2,
                            x1 + xoffset, y1 + (vertDist + 16) * 2 + 1);
        ctx.moveTo(x1 - 10, y1);
        ctx.lineTo(x1 + xoffset, y1);
        ctx.moveTo(x1 - 10, y1 + (vertDist + 17) * 2);
        ctx.lineTo(x1 + xoffset, y1 + (vertDist + 16) * 2 + 1);
        ctx.stroke();
    }


    function drawLine(ctx, x, y, length) {
        // draw a horizontal line
        var dist = 30;
        if (length != null) {
            dist = length;
        }
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dist, y);
        ctx.stroke();
    }

    // function drawDot(x, y) {
    //     var html = '<div style="font-size: 8px; width:3px;height:3px;' +
    //                'background-color:green;position:absolute; left:' + x +
    //                'px;top:' + y + 'px;">' + x + ',' + y + '</div>';
    //     $('.dagImage').append(html);
    // }

    function preventUnintendedScrolling() {
        $('.dagArea').scroll(function() {
            if ($('#dagSchema').is(':visible') && scrollPosition > -1) {
                $(this).scrollTop(scrollPosition);
            }
        });
    }

    return (Dag);

}(jQuery, {}));
