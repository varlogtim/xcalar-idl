window.DagPanel = (function($, DagPanel) {
    var $dagPanel = $('#dagPanel');

    DagPanel.setup = function() {
        setupDagPanelSliding();
        DagModal.setup();
        setupRetina();
        setupDagTableDropdown();
        setupRightClickDropdown();
    };

    DagPanel.clear = function() {
        $(".closeDag").click();
        $(".dagWrap").remove();
    };

    function setupDagPanelSliding() {
        $("#worksheetTabs").on("click", ".dagTab", function(event) {
            var $compSwitch = $("#worksheetTabs .dagTab");
            var $workspacePanel = $('#workspacePanel');
            
            event.stopPropagation();

            if ($dagPanel.hasClass('hidden')) {
                // open dag panel
                $dagPanel.removeClass('hidden');
                $compSwitch.addClass('active');
                if ($dagPanel.hasClass('midway')) {
                    $('#mainFrame').addClass('midway');
                }
                MonitorGraph.clear();
            } else if ($workspacePanel.hasClass('active')) {
                // hide dag panel
                $dagPanel.addClass('hidden');
                $compSwitch.removeClass('active');
                $('#mainFrame').removeClass('midway');
                
                setTimeout(function() {WSManager.focusOnWorksheet();
                    var mainFrameHeight = $('#mainFrame').height();
                    $('.tableLocked:visible').each(function() {
                        var $tableWrap = $(this);
                        var tableWrapHeight = $tableWrap.find('.xcTbodyWrap')
                                                        .height();
                        var topPos = 100 *
                                    ((tableWrapHeight / mainFrameHeight) / 2);
                        topPos = Math.min(topPos, 40);
                        $tableWrap.find('.lockedIcon').css('top', topPos + '%');
                    });
                }, 300);
            }

            $('.mainPanel').removeClass('active');
            $('.mainMenuTab').removeClass('active');
            $workspacePanel.addClass('active');
            $('#workspaceTab').addClass('active');
            $('.xcTheadWrap').css('z-index', 9);
            $('.columnOriginInfo').remove();
            StatusMessage.updateLocation();
            Tips.refresh();
        });

        $('#dagPulloutTab').click(function() {
            if ($dagPanel.hasClass('midway')) {
                // make dag panel full screen
                $dagPanel.removeClass('midway').addClass('full');
            } else {
                // make dag panel midway
                $dagPanel.removeClass('full').addClass('midway');
                $('#mainFrame').addClass('midway');
                WSManager.focusOnWorksheet();
            }
            $('.xcTheadWrap').css('z-index', 9);
        });

        $('#closeDag').click(function() {
            // only triiger the first dagTab is enough
            $('#compSwitch').trigger('click');
        });
    }

    function setupRetina() {
        // Remove focus when click other places other than retinaArea
        $dagPanel.on('click', function(){
            $dagPanel.find('.retTab.active').removeClass('active');
        });
        $dagPanel.on('click', '.retinaArea', function(event){
            event.stopPropagation();
        });
        // add new retina
        $dagPanel.on('click', '.addRet', function(event) {
            event.stopPropagation();
            var $addBtn = $(this);
            $dagPanel.find('.retTab.active').removeClass('active');
            var $retTabSection = $addBtn.closest('.retinaArea')
                                        .find('.retTabSection');
            Dag.createRetina($retTabSection);
        });
        
        // Press Enter on retina title to confirm the input
        $dagPanel.on('keyup', '.retTitle', function(event) {
            event.preventDefault();
            if (event.which !== keyCode.Enter) {
                return;
            }
            var $input = $(this);
            var $retTab = $input.closest('.retTab');
            var $retTabSection = $retTab.closest('.retTabSection');
            if (!$retTab.hasClass('unconfirmed')) {
                return;
            }
            var retName = jQuery.trim($input.val());
            if (retName === "") {
                retName = $retTab.data('retname');
            }

            // Check name conflict
            var isNameConflict = false;
            $retTab.siblings(':not(.unconfirmed)').each(function(index, sibl) {
                if (isNameConflict === true) {
                    return;
                }
                var $sibl = $(sibl);
                var name = $sibl.find('.tabWrap input').val();
                if (retName === name) {
                    isNameConflict = true;
                }
            });

            if (isNameConflict === true) {
                var text = "Retina " + retName + " already exists!";
                StatusBox.show(text, $input, true);
                return;
            }

            var tableId = $input.closest('.retinaArea').data('tableid');
            var tableName = gTables[tableId].tableName;

            XcalarMakeRetina(retName, tableName)
            .then(function() {
                // console.log('Create New Retina', retName, 'for', tableName);
                $retTab.data('retname', retName);
                $retTab.removeClass('unconfirmed');
                $input.blur();
                $input.val(retName);
                if ($retTabSection.find('.retTitle[disabled="disabled"]')
                                  .length === 0) {
                    $input.attr('disabled', 'disabled');
                }
            })
            .fail(function(error) {
                Alert.error("Make Retina fails", error);
            });
        });

        // toggle open retina pop up
        $dagPanel.on('click', '.tabWrap', function(event) {
            event.stopPropagation();
            var $tab = $(this).closest('.retTab');
            if ($tab.hasClass('unconfirmed')) {
                return;
            }
            // the tab is open, close it
            if ($tab.hasClass('active')) {
                $tab.removeClass('active');
            } else {
                $dagPanel.find('.retTab.active').removeClass('active');
                $tab.addClass('active');
            }
        });

        $dagPanel.on('keyup', '.newParam', function(event){
            event.preventDefault();
            if (event.which !== keyCode.Enter) {
                return;
            }
            var $btn = $(this).siblings('.addParam');
            $btn.click();
        });

        // create new parameters to retina
        $dagPanel.on('click', '.addParam', function(event) {
            event.stopPropagation();
            var $btn = $(this);
            var $input = $btn.prev('.newParam');
            var paramName = jQuery.trim($input.val());
            var text;

            // empty input
            if (paramName === "") {
                text = "Please input a valid parameter name!";
                StatusBox.show(text, $input, true);
                $input.val("");
                return;
            }

            var $retPopUp = $btn.closest('.retPopUp');
            var $tbody = $retPopUp.find('tbody');

            // var retName = $retPopUp.closest('.retTab').data('retname');
            // console.log('New Parameter in retina:', retName,
            //             'parameter name:',paramName);

            // Check name conflict
            var isNameConflict = false;
            $tbody.find('tr:not(.unfilled)').each(function(index, tr) {
                if (isNameConflict === true) {
                    return;
                }
                var $tr = $(tr);
                var name = $tr.find('.paramName').html();
                if (paramName === name) {
                    isNameConflict = true;
                }
            });
            if (isNameConflict === true) {
                text = "Parameter " + paramName + " already exists!";
                StatusBox.show(text, $input, true);
                return;
            }

            $input.val("");
            Dag.addParamToRetina($tbody, paramName);

            // XXX currently, it is useless code
            // else {
            //     var html = '<tr>' +
            //                     '<td class="paramName">' +
            //                             paramName +
            //                     '</td>' +
            //                     '<td>' +
            //                         '<div class="paramVal"></div>' +
            //                         '<div class="delete paramDelete">' +
            //                             '<span class="icon"></span>' +
            //                         '</div>' +
            //                     '</td>' +
            //                '</tr>';
            //     $tbody.append(html);
            // }
        });

        // delete retina para
        $dagPanel.on('click', '.paramDelete', function(event) {
            event.stopPropagation();
            var $delBtn = $(this);
            var $tr = $delBtn.closest('tr');
            var $tbody = $tr.parent();
            var paramName = $tr.find('.paramName').text();
            var options = {};
            options.title = 'DELETE RETINA PARAMETER';
            options.msg = 'Are you sure you want to delete parameter ' +
                           paramName + '?';
            options.isCheckBox = true;
            options.confirm = function() {
                $tr.find('.paramName').empty();
                $tr.find('.paramVal').empty();
                $tr.addClass('unfilled');
                $tbody.append($tr);
            };

            Alert.show(options);
        });
    }

    function setupDagTableDropdown() {
        $dagPanel.append(getDagTableDropDownHTML());
        var $menu = $dagPanel.find('.dagTableDropDown');
        addColMenuBehaviors($menu);
        dagTableDropDownActions($menu);
        
        var selection = '.dagTable:not(.dataStore) .dagTableIcon,' +
                        '.dagTable:not(.dataStore) .icon';
        $dagPanel.on('click', selection, function() {
            $('.colMenu').hide().removeClass('leftColMenu');
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
            var tableWSIndex;

            // if active table, hide "addTable" and show "focusTable"
            $('#activeTablesList').find('.tableInfo').each(function() {
                var $li = $(this);
                if ($li.data('id') === tableId) {
                    $menu.find('.addTable').addClass('hidden');
                    $menu.find('.focusTable').removeClass('hidden');
                    activeFound = true;
                    tableWSIndex = WSManager.getWSFromTable(tableId);
                    $menu.data('wsindex', tableWSIndex);
                    return (false);
                }
            });

            if (activeFound) {
                $menu.find('.addTable').addClass('hidden');
            } else {
                $('#inactiveTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('id') === tableId) {
                        $menu.find('.addTable').removeClass('hidden');
                        $menu.find('.focusTable').addClass('hidden');
                        return (false);
                    }
                });
            }

            if ($dagTable.hasClass('locked')) {
                $menu.find('.lockTable').hide();
                $menu.find('.unlockTable').show();
                $menu.find('.deleteTable').hide();
            } else {
                $menu.find('.lockTable').show();
                $menu.find('.unlockTable').hide();
                $menu.find('.deleteTable').show();
            }

            positionAndShowDagTableDropdown($dagTable, $menu);
            
            $('body').addClass('noSelection');
        });
    }

    function setupRightClickDropdown() {
        $dagPanel.append(getRightClickDropDownHTML());
        var $menu = $dagPanel.find('.rightClickDropDown');
        addColMenuBehaviors($menu);
        addRightClickActions($menu);
        
        // var selection = '.dagTable:not(.dataStore) .dagTableIcon,' +
        //                 '.dagTable:not(.dataStore) .icon';

        $dagPanel[0].oncontextmenu = function(e) {
            var $target = $(e.target);
            var $dagWrap = $target.closest('.dagWrap');

            if ($dagWrap.length !== 0) {
                $('.colMenu').hide().removeClass('leftColMenu');
                $('#dagSchema').hide();
                $menu.data('dagid', $dagWrap.attr('id'));
                positionAndShowRightClickDropdown(e, $menu);
                $('body').addClass('noSelection');
                return false;
            }
        };
    }

    function addRightClickActions($menu) {
        $menu.find('.saveImage').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var dagId = $menu.data('dagid');
            var $dagWrap = $('#' + dagId);
            var tableName = $dagWrap.find('.tableTitleArea .tableName').text();
            var canvas = $dagWrap.find('canvas')[0];
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
            var canvas = $dagWrap.find('canvas')[0];

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

    function positionAndShowDagTableDropdown($dagTable, $menu) {
        var topMargin = -3;
        var leftMargin = 0;
        var top = $dagTable[0].getBoundingClientRect().bottom + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left + leftMargin;

        // if dagpanel is open halfway we have to change the top position
        // of colmenu
        if ($('#dagPanel').hasClass('midway')) {
            top -= $('#dagPanel').offset().top;
        }
        $menu.removeClass('leftColMenu');

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
    }

    function getDagTableDropDownHTML() {
        var html =
        '<ul class="colMenu dagTableDropDown">' +
            '<li class="addTable">' +
                'Add Table To Worksheet' +
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
            // '<li class="deleteTable">' +
            //     'Delete Table' +
            // '</li>' +
            // XXX temporarily hiding delete table
            '<li class="deleteTableDescendants unavailable" data-toggle="tooltip" ' +
                'data-placement="bottom" data-container="body" ' +
                'title="Coming Soon">' +
                'Delete Table & Descendants' +
            '</li>' +
        '</ul>';
        return (html);
    }

    function getRightClickDropDownHTML() {
        var html =
        '<ul class="colMenu rightClickDropDown">' +
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
            WSManager.moveInactiveTable(tableId, WSManager.getActiveWS());
            $('#inactiveTablesList').find('.tableInfo').each(function() {
                var $li = $(this);
                if ($li.data('id') === tableId) {
                    $li.find('.addTableBtn').click();
                    $('#submitTablesBtn').click();
                    return (false);
                }
            });
        });

        $menu.find('.focusTable').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var tableId = $menu.data('tableId');
            var wsIndex = $menu.data('wsindex');
            $('#worksheetTab-' + wsIndex).click();
            
            if ($dagPanel.hasClass('full')) {
                $('#dagPulloutTab').click();
            }
            $table = $('#xcTableWrap-' + tableId);
            centerFocusedTable($table);
           
            $table.mousedown();
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
                var mouseup = {type: "mouseup", which: 1};
                $('#tableMenu-' + tableId).find('.deleteTable')
                                          .trigger(mouseup);
            } else if (table) {
                $('#inactiveTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('id') === tableId) {
                        $li.find('.addTableBtn').click();
                        $('#deleteTablesBtn').click();
                        return (false);
                    }
                });
            } else if (gOrphanTables.indexOf(tableName) !== -1) {
                $('#orphanedTablesList').find('.tableInfo').each(function() {
                    var $li = $(this);
                    if ($li.data('tablename') === tableName) {
                        $li.find('.addTableBtn').click();
                        $('#deleteOrphanedTablesBtn').click();
                        return (false);
                    }
                });
            } else {
                // this is the case when user pull out a backend table A, then
                // delete another table in the dag node of A but that table is
                // not in orphaned list
                var sqlOptions = {
                    "operation": "deleteTable",
                    "tableName": tableName,
                    "tableType": TableType.Unknown
                };
                XcalarDeleteTable(tableName, sqlOptions)
                .then(function() {
                    Dag.makeInactive(tableName, true);
                })
                .fail(function(error) {
                    Alert.error("Table Deletion Failed", error);
                });
            }
        });
    }

    function centerFocusedTable($table) {
        var windowWidth = $(window).width();
        var tableWidth = $table.width();
        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var tableOffset = $table.offset().left;
        var leftPosition = currentScrollPosition + tableOffset;
        var scrollPosition = leftPosition - ((windowWidth - tableWidth) / 2);
        $('#mainFrame').scrollLeft(scrollPosition);
    }
             
    return (DagPanel);

}(jQuery, {}));

window.Dag = (function($, Dag) {
    $dagPanel = $('#dagPanel');
    var scrollPosition = -1;
    var dagAdded = false;

    Dag.construct = function(tableId) {
        var deferred = jQuery.Deferred();
        var table = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        drawDag(tableName)
        .then(function(dagDrawing) {
            var activeWS = WSManager.getActiveWS();
            var tableWS = WSManager.getWSFromTable(tableId);
            // var activeClass = "";
           
            var outerDag =
                '<div class="dagWrap clearfix" id="dagWrap-' +
                    tableId + '" data-id="' + tableId + '">' +
                '<div class="header clearfix">' +
                    '<div class="btn btnSmall infoIcon">' +
                        '<div class="icon"></div>' +
                    '</div>' +
                    '<div class="tableTitleArea">' +
                        '<span>Table: </span>' +
                        '<span class="tableName" draggable="true"' +
                        ' ondragstart="xcDrag(event)">' +
                            tableName +
                        '</span>' +
                    '</div>' +
                    '<div class="retinaArea" data-tableid="' +
                        tableId + '">' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" title="Create New Retina" ' +
                        'class="btn addRet">' +
                            '<span class="icon"></span>' +
                        '</div>' +
                        '<div class="retTabSection"></div>' +
                    '</div>' +
                '</div>' +
                '</div>';

            var innerDag = '<div class="dagImageWrap"><div class="dagImage">' +
                            dagDrawing + '</div></div>';

            var position = WSManager.getTablePosition(tableId);

            if (position === 0) {
                $('.dagArea').find('.legendArea').after(outerDag);
            } else {
                $prevDag = $dagPanel.find('.dagWrap:not(.dagWrapToRemove)')
                                    .eq(position - 1);
                if ($prevDag.length !== 0) {
                    $prevDag.after(outerDag);
                } else {
                    console.error('dag order is incorrect! This is a bug!');
                    $('.dagArea').append(outerDag);
                }
            }

            var $dagWrap = $('#dagWrap-' + tableId);
            $dagWrap.append(innerDag);
            var $dagImage = $dagWrap.find('.dagImage');
            

            var fullCanvas = true;
            var canvas = createCanvas($dagWrap, fullCanvas);
            var ctx = canvas.getContext('2d');
            var canvasClone = createCanvas($dagWrap);
            var ctxClone = canvasClone.getContext('2d');
            
            ctx.strokeStyle = '#999999';
            ctxClone.strokeStyle = '#999999';

            $dagImage.find('.joinWrap').eq(0).find('.dagTableWrap')
                    .each(function() {
                        var el = $(this);
                        drawDagLines(el, ctxClone);
                    });
            ctx.save();
            
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

            $dagImage.find('.dagTable').each(function() {
                var $dagTable = $(this);
                var top = $dagTable.position().top;
                var left = $dagTable.position().left;
                var $clone = $dagTable.clone();
                $dagImage.append($clone);
                $clone.css({top: top, left: left, position: 'absolute'});

                left += 40;
                top += 50;
                var iconLeft = left;
                var iconTop = top + 6;
                var tableImage = new Image();
                if ($(this).hasClass('dataStore')) {
                    tableImage.src = paths.dbDiamond;
                    iconLeft -= 2;
                    iconTop -= 4;
                } else {
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
            });

            $dagImage.find('.actionType').each(function() {
                var $actionType = $(this);
                var top = $actionType.position().top + 4;
                var left = $actionType.position().left;
                var $clone = $actionType.clone();
                $dagImage.append($clone);
                $clone.css({top: top, left: left, position: 'absolute'});

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

            });

            $dagImage.height($dagImage.height() + 40);
            $dagImage.width($dagImage.width());
            $dagWrap.find('.joinWrap').eq(0).remove();

            var dropdown = getDagDropDownHTML();
            $dagWrap.append(dropdown);
            addDagEventListeners($dagWrap);
            appendRetinas();
            if (!dagAdded) {
                preventUnintendedScrolling();
            }
            
            dagAdded = true;
            if (activeWS !== tableWS) {
                $dagWrap.addClass('inActive');
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error('dag failed', error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    Dag.createRetina = function($retTabSection, retName) {
        var deferred = jQuery.Deferred();
        var retClass = "retTab";
        // var inputVal = "";
        var isNewRetina = false;
        if (retName == null) {
            var len = $retTabSection.children().length;
            retName = 'Retina ' + (len + 1);
            retClass += " unconfirmed";
            isNewRetina = true;
            intputHTML = '<input type="text" class="retTitle textOverflow"' +
                         '" placeholder="' + retName + '">';
        } else {
            intputHTML = '<input type="text" class="retTitle">';
        }

        var html =
            '<div class="' + retClass + '">' +
                '<div class="tabWrap">' +
                    intputHTML +
                    '<div class="caret">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="retPopUp">' +
                    '<div class="divider"></div>' +
                    '<div class="inputSection">' +
                        '<input class="newParam" type="text"' +
                        ' placeholder="Input New Parameter">' +
                        '<div class="btn addParam">' +
                            '<span class="icon"></span>' +
                            '<span class="label">' +
                                'CREATE NEW PARAMETER' +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="tableContainer">' +
                        '<div class="tableWrapper">' +
                            '<table>' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Current Parameter' +
                                            '</div>' +
                                        '</th>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Default Value' +
                                            '</div>' +
                                        '</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody>';
        for (var t = 0; t < 7; t++) {
            html += '<tr class="unfilled">' +
                        '<td class="paramName"></td>' +
                        '<td>' +
                            '<div class="paramVal"></div>' +
                            '<div class="delete paramDelete">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                        '</td>' +
                   '</tr>';
        }

        html += '</tbody></table></div></div></div></div>';

        var $retTab = $(html);
        $retTab.data('retname', retName);
        $retTabSection.append($retTab);

        if (isNewRetina) {
            $retTab.find('.retTitle').focus();
            deferred.resolve();
        } else {
            var $input = $retTab.find('.retTitle');
            $input.val(retName);
            if ($retTabSection.find('.retTitle[disabled="disabled"]')
                              .length === 0) {
                $input.attr('disabled', 'disabled');
            }
            var $tbody = $retTab.find('tbody');
            // Only disable the first retina
            XcalarListParametersInRetina(retName)
            .then(function(output) {
                var num = output.numParameters;
                var params = output.parameters;
                for (var i = 0; i < num; i++) {
                    var param = params[i];
                    var paramName = param.parameterName;
                    var paramVal = param.parameterValue;
                    Dag.addParamToRetina($tbody, paramName, paramVal);
                }
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("list retina parameters fails!");
                deferred.reject(error);
            });
        }
        return (deferred.promise());
    };

    Dag.addParamToRetina = function($tbody, name, val) {
        var $trs = $tbody.find('.unfilled');
        // Now only allow to add 7 parameters
        if ($trs.length > 0) {
            var $tr = $trs.eq(0);
            $tr.find('.paramName').html(name);
            if (val) {
                $tr.find('.paramVal').html(val);
            }
            $tr.removeClass('unfilled');
        }
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
            $dags = $('.dagTable[data-tableName=' + tableName + ']');
        } else {
            tableName = gTables[tableId].tableName;
            $dags = $('.dagTable[data-id=' + tableId + ']');
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
        var $currentIcon;
        var $menu = $dagWrap.find('.dagDropDown');
        
        $dagWrap.on('click', '.dagTable.dataStore, .actionType', function() {
            $('.colMenu').hide();
            $('.leftColMenu').removeClass('leftColMenu');
            $currentIcon = $(this);
            var el = $(this);
            //position colMenu
            var topMargin = 0;
            var leftMargin = 0;
            var top = el[0].getBoundingClientRect().bottom + topMargin;
            var left = el[0].getBoundingClientRect().left + leftMargin;
            // var offsetTop = $('#workspaceBar')[0].getBoundingClientRect()
            //                                      .bottom;
            if ($('#dagPanel').hasClass('midway')) {
                top -= $('#dagPanel').offset().top;
            }       
            $menu.css({'top': top, 'left': left});
            $menu.show();

            //positioning if dropdown menu is on the right side of screen
            var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect()
                                                    .left;
            if ($menu[0].getBoundingClientRect().right > leftBoundary) {
                left = el[0].getBoundingClientRect().right - $menu.width();
                $menu.css('left', left).addClass('leftColMenu');
            }
            $menu.find('.subColMenu').each(function() {
                if ($(this)[0].getBoundingClientRect().right > leftBoundary) {
                    $menu.find('.subColMenu').addClass('leftColMenu');
                }
            });
            $('body').addClass('noSelection');
        });

        $dagWrap.on('mouseenter', '.dagTable.Ready', function() {
            var $dagTable = $(this);
            var timer = setTimeout(function(){
                            var $dropdown = $('.colMenu:visible');
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

        addColMenuBehaviors($menu);

        $menu.find('.createParamQuery').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagModal.show($currentIcon);
        });

        //XX both dropdown options will do the same thing
        $menu.find('.modifyParams').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DagModal.show($currentIcon);
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
                   '<div class="title"><span class="tableName">' + tableName +
                   '</span><span class="numCols" title="number of columns">[' +
                   (numCols - 1) + ']</span></div>' +
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

        $('#dagSchema').on('click', '.name', function() {
            $('#dagSchema').find('li.selected').removeClass('selected');
            $(this).closest('li').addClass('selected');
            var cols = gTables[tableId].tableCols;
            var name = $(this).text();
            var userStr;
            var backName;
            var colNum = $(this).closest('li').index();
            var numCols = $('#dagSchema').find('.numCols').text().substr(1);
            numCols = parseInt(numCols);
            for (var i = colNum; i <= numCols; i++) {
                if (cols[i].name === name) {
                    userStr = cols[i].userStr;
                    if (cols[i].func.args) {
                        backName = cols[i].func.args[0];
                    } else {
                        backName = name;
                    }
                    break;
                }
            }
            var parents = $dagTable.data('parents').split(',');
            addRenameColumnInfo(name, backName, $dagTable, $dagWrap);
            highlightColumnSource(tableId, $dagWrap, name);
            findColumnSource(name, userStr, tableId, parents,
                             $dagWrap, backName);
            removeDuplicatedHighlightedDataStores($dagTable);
            $(document).mousedown(closeDagHighlight);
        });
    }

    function closeDagHighlight(event) {
        var $target = $(event.target);
        if ($target.hasClass('dagImageWrap')) {
            var bottom = $target[0].getBoundingClientRect().bottom;
            if (event.pageY > (bottom - 20)) {
                // click is occuring on the scrollbar
                return;
            }
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

    function findColumnSource(name, userStr, child, tables, $dagWrap,
                              prevName) {
        for (var i = 0; i < tables.length; i++) {
            var table;
            if (tables[i].indexOf('.XcalarDS.') === 0) {
                table = false;
            } else {
                var tableId = xcHelper.getTableId(tables[i]);
                table = gTables[tableId];
            }
            
            var $dagTable;
            var parents;
            if (table) {
                var cols = table.tableCols;
                var numCols = cols.length;
                var firstParenIndex = userStr.lastIndexOf('(') + 1;
                var lastParenIndex = userStr.indexOf(')');
                var args = userStr.substring(firstParenIndex, lastParenIndex);
                args = args.split(",");

                for (var j = 0; j < numCols; j++) {
                    for (var k = 0; k < args.length; k++) {
                        var arg = args[k].trim();
                        
                        if (cols[j].func.args) {
                            if (arg === cols[j].func.args[0] ||
                                userStr === cols[j].userStr) {
                                highlightColumnHelper(tableId, $dagWrap,
                                                      cols[j], userStr);
                                break;
                            }
                        } else if (userStr === cols[j].userStr) {
                            $dagTable = $dagWrap
                                    .find('.dagTable[data-id=' + tableId + ']');
                            parents = $dagTable.data('parents').split(',');
                            var currentName = cols[j].name;
                            highlightColumnSource(tableId, $dagWrap,
                                                  currentName);
                            findColumnSource(currentName, userStr, tableId,
                                             parents, $dagWrap, prevName);
                            break;
                        }
                    }
                }
            } else if (tables[i].indexOf('.XcalarDS.') !== 0) {
                $dagTable = $dagWrap
                        .find('.dagTable[data-tablename=' + tables[i] + ']');
                if ($dagTable.length !== 0 && $dagTable.hasClass('Dropped')) {
                    parents = $dagTable.data('parents').split(',');
                    findColumnSource(name, userStr, tableId, parents, $dagWrap);
                } else {
                    // table has no data, could be orphaned
                }
            } else if (tables[i].indexOf('.XcalarDS.') === 0 &&
                        userStr !== '\"newCol\" = ') {
                var datasetName = tables[i].substr(10);
                highlightColumnSource(datasetName, $dagWrap, prevName, true);
            }
        }
    }

    function highlightColumnHelper(tableId, $dagWrap, col, userStr) {
        var currentName = col.name;
        var $dagTable = $dagWrap.find('.dagTable[data-id=' + tableId + ']');
        var parents = $dagTable.data('parents').split(',');

        highlightColumnSource(tableId, $dagWrap, currentName);
        var previousName = col.func.args[0];
        addRenameColumnInfo(currentName, previousName, $dagTable, $dagWrap);

        findColumnSource(name, userStr, tableId, parents, $dagWrap,
                         previousName);
    }

    function highlightColumnSource(sourceId, $dagWrap, name, isDataset) {
        var $dagTable;
        if (isDataset) {
            $dagTable = $dagWrap.find('.dagTable[data-tablename=' +
                                        sourceId + ']');
        } else {
            $dagTable = $dagWrap.find('.dagTable[data-id=' +
                                        sourceId + ']');
        }
        $dagTable.addClass('highlighted');
        var id = $dagTable.data('id');

        var rect = $dagTable[0].getBoundingClientRect();
        if ($dagWrap.find('.columnOriginInfo[data-id=' + id + ']')
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

    function appendRetinas() {
        var $dagWrap = $('#dagPanel').find('.dagWrap');
        if ($dagWrap.length > 1) {
            return;
        }
        var $retTabSection = $dagWrap.find('.retTabSection');
        // List All Retinas and now append to first table
        XcalarListRetinas()
        .then(function(listRetinasOutput) {
            // console.log(listRetinasOutput);
            var len =  listRetinasOutput.numRetinas;
            var retinas = listRetinasOutput.retinaDescs;
            var promises = [];
            for (var i = 0; i < len; i++) {
                var name = retinas[i].retinaName;
                promises.push(Dag.createRetina
                                 .bind(this, $retTabSection, name));
            }
            return (chain(promises));
        })
        .fail(function(error) {
            console.error("appendRetinas fails!", error);
        });
    }

    function getDagDropDownHTML() {
        var html =
        '<ul class="colMenu dagDropDown">' +
            '<li class="createParamQuery">Create Parameterized Query</li>' +
            '<li class="modifyParams">Modify Existing Parameters</li>' +
            // '<li class="listParams">List of ? Parameters</li>' +
        '</ul>';
        return (html);
    }

    function drawDagNode(dagNode, prop, dagArray, html, index, parentChildMap,
                         children) {
        var properties = {};
        properties.x = prop.x + 1;
        properties.width = prop.width;
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
                                                properties, dagArray, html,
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
        var dagOrigin = drawDagOrigin(dagNode, dagArray, parentChildMap, index);
        var dagTable = '<div class="dagTableWrap clearfix">' +
                        dagOrigin;
        var key = getInputType(XcalarApisTStr[dagNode.api]);
        var parents = getDagParentsNames(parentChildMap, index, dagArray);
        var dagInfo = getDagNodeInfo(dagNode, key, parents);
        var state = dagInfo.state;
        var tableName = getDagName(dagNode);
        if (dagOrigin === "") {
            var url = dagInfo.url;
            var id = dagInfo.id;
            if (tableName.indexOf('.XcalarDS.') === 0) {
                tableName = tableName.substr('.XcalarDS.'.length);
            }
            
            dagTable += '<div class="dagTable dataStore" ' +
                        'data-tablename="' + tableName + '" ' +
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

    function drawDagOrigin(dagNode, dagArray, parentChildMap, index) {
        var originHTML = "";
        var numParents = getDagnumParents(dagNode);

        if (numParents > 0) {
            var parents = getDagParentsNames(parentChildMap, index, dagArray);
            var additionalInfo = "";
            var firstParent = parents[0];
            if (numParents === 2) {
                additionalInfo += " & " + parents[1];
            }
            var key = getInputType(XcalarApisTStr[dagNode.api]);
            var operation = key.substring(0, key.length - 5);
            var info = getDagNodeInfo(dagNode, key, parents);

            if (info.type === "sort") {
                operation = "sort";
            }

            originHTML += '<div class="actionType dropdownBox ' + operation +
                        '" style="top:' + 0 + 'px; right:' + 0 + 'px;" ' +
                        'data-type="' + operation + '" ' +
                        'data-info="' + info.text.replace(/"/g, "'") + '" ' +
                        'data-column="' + info.column.replace(/"/g, "'")
                                        + '" ' +
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

    function drawDag(tableName) {
        var deferred = jQuery.Deferred();
        XcalarGetDag(tableName)
        .then(function(dagObj) {
            return (drawDagHelper(dagObj));
        })
        .fail(function(error) {
            console.error("drawDag fail!");
            deferred.reject(error);
        });
        
        function drawDagHelper(dagObj) {
            var prop = {
                x          : 0,
                y          : 0,
                parentCount: 0
            };
    
            var index = 0;
            var dagArray = dagObj.node;
            var children = "";
            //XX TEMPORARY
            // tempModifyDagArray(dagArray);
            var parentChildMap = getParentChildDagMap(dagObj);
            // console.log(dagObj);
            deferred.resolve(drawDagNode(dagArray[index], prop, dagArray, "",
                             index, parentChildMap, children));
        }
        return (deferred.promise());
    }

    function getParentChildDagMap(dagObj) {
        var dagArray = dagObj.node;
        var numNodes = dagObj.numNodes;
        var map = {}; // holds a map of nodes & array indices of parents
        var parentIndex = 0;
        for (var i = 0; i < numNodes; i++) {
            var dagNode = dagArray[i];
            var numParents = getDagnumParents(dagNode);
            map[i] = [];
            for (var j = 0; j < numParents; j++) {
                map[i].push(++parentIndex);
            }
        }
        return (map);
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

    function getDagParentsNames(parentChildMap, index, dagArray) {
        var parentNames = [];
        for (var i = 0; i < parentChildMap[index].length; i++) {
            var parentIndex = parentChildMap[index][i];
            var parentName = dagArray[parentIndex].name.name;
            parentNames.push(parentName);
        }
        return (parentNames);
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
        info.type = "";
        info.text = "";
        info.tooltip = "";
        info.column = "";
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
                                                      filterStr.indexOf(')'));
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
                    info.tooltip = "Filtered table &quot;" + parents[0] +
                                    "&quot;: " + filterStr;
                }
                break;
            case ('groupByInput'):
                evalStr = value.evalStr;
                parenIndex = evalStr.indexOf("(");
                var type = evalStr.substr(0, parenIndex);
                info.type = "groupBy" + type;
                info.text = evalStr;
                info.tooltip = "Grouped by " + evalStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.indexOf(')'));
                break;
            case ('indexInput'):
                info.type = "sort";
                if (value.preserveOrder) {
                    if (value.source.isTable) {
                        info.tooltip = "Sorted by " + value.keyName;
                    } else {
                        info.tooltip = "Sorted on " + value.keyName;
                    }
                    info.text = "sorted on " + value.keyName;
                } else {
                    if (value.source.isTable) {
                        info.tooltip = "Indexed by " + value.keyName;
                    } else {
                        info.tooltip = "Indexed on " + value.keyName;
                    }
                    info.text = "indexed on " + value.keyName;
                }

                info.column = value.keyName;
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
                                            evalStr.indexOf(')'));
                break;
            default: // do nothing
                break;
        }
        return (info);
    }

    /* Generation of dag elements and canvas lines */

    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage > div').width();
        var dagHeight = $dagWrap.find('.dagImage > div').height();
        if (full) {
            dagHeight += 50;
        }
        var canvasHTML = $('<canvas class="canvas" width="' + (dagWidth + 80) +
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


window.DagModal = (function($, DagModal){
    var $dagModal = $('#dagParameterModal');

    DagModal.setup = function() {
        $dagModal.find('.cancel, .close').click(function() {
            closeDagParamModal($dagModal);
        });

        $dagModal.find('.confirm').click(function() {
            //XX need to check if all default inputs are filled
            var retName = $(".retTitle:disabled").val();
            var dagNum = $dagModal.data('dagNum');
            var dagNodeId = $dagModal.data('id');

            (function storeUserFields() {
                gRetinaObj[dagNodeId] = {};
                gRetinaObj[dagNodeId].paramQuery = [];
                gRetinaObj[dagNodeId].params = [];
                $dagModal.find('.editableParamDiv').each(function() {
                    var html = $(this).html();
                    gRetinaObj[dagNodeId].paramQuery.push(html);
                });

                $dagModal.find(".tableWrapper tbody tr")
                    .not(".unfilled").each(function() {
                        var name = $(this).find(".paramName").text();       
                        var val = $(this).find(".paramVal").val();
                        gRetinaObj[dagNodeId].params
                                             .push({name: name, val: val});
                        $('.dagWrap').eq(dagNum).find('.retTabSection tbody')
                            .find('tr:not(".unfilled")').filter(function() {
                                return ($(this).find(".paramName")
                                               .text() === name);
                            }).find(".paramVal").text(val);
                    });
            })();
            
            function bindParams() {
                // First, for each param we have to issue a create param call
                var promises = [];

                $("#dagParameterModal .tableWrapper tbody tr")
                    .not(".unfilled").each(function() {
                        var name = $(this).find(".paramName").text();       
                        var val = $(this).find(".paramVal").val();

                        promises.push(XcalarAddParameterToRetina
                                            .bind(this, retName, name, val));
                    });

                return (chain(promises));
            }
            bindParams()
            .then(function() {
                var $table = $("#dagParameterModal .editableTable");
                var paramInput = new XcalarApiParamInputT();
                // XXX: HACK!!!
                var dagId = $dagModal.data('id');
                // console.log(dagId);
                if (retName === "") {
                    // XXX: Insert hack in case demo fail
                }
                var str;
                switch ($table.find("td:first").text()) {
                    case ("filter"):
                        var $editableDivs = $table.find('.editableParamDiv');
                        var filterText = $editableDivs.eq(1).text();
                        filterText = jQuery.trim(filterText);
                        var str1 = $editableDivs.eq(0).text()
                                                      .replace(/\+/g, "");
                        str1 = jQuery.trim(str1);
                        var str2 = $editableDivs.eq(2).text()
                                                      .replace(/\+/g, "");
                        str2 = jQuery.trim(str2);
                        var filter;
                        // Only support these filter now
                        switch (filterText) {
                            case (">"):
                                filter = "gt";
                                break;
                            case ("<"):
                                filter = "lt";
                                break;
                            case (">="):
                                filter = "ge";
                                break;
                            case ("<="):
                                filter = "le";
                                break;
                            case ("="):
                                filter = "eq";
                                break;
                            default:
                                console.warn("currently not supported filter");
                                return (promiseWrapper(null));
                        }
                        str = filter + "(" + str1 + "," + str2 + ")";
                        // console.log("Filter String:", str);
                        paramInput.paramFilter = new XcalarApiParamFilterT();
                        paramInput.paramFilter.filterStr = str;
                        return (XcalarUpdateRetina(retName,
                                                   dagId,
                                                   XcalarApisT.XcalarApiFilter,
                                                   paramInput));
                    case ("Load"):
                        str = $(".editableParamDiv").text();
                        str = str.replace(/\+/g, "");
                        // console.log(str);
                        paramInput.paramLoad = new XcalarApiParamLoadT();
                        paramInput.paramLoad.datasetUrl = str;
                        return (XcalarUpdateRetina(retName,
                                                   dagId,
                                                   XcalarApisT.XcalarApiBulkLoad,
                                                   paramInput));
                    default:
                        console.warn("currently not supported");
                        break;
                }
            })
            .then(function() {
                closeDagParamModal($dagModal);
                // show success message??
            })
            .fail(function(error) {
                Alert.error("Update Params fails", error);
            });
        });

        $dagModal.on('click', '.draggableDiv .close', function() {
            var value = $(this).siblings('.value').text();
            $(this).parent().remove();

            var duplicates = $dagModal.find('.editableRow .value')
                                    .filter(function() {
                                        return ($(this).text() === value);
                                    });

            if (duplicates.length > 0) {
                return;
            }

            $('.defaultListSection').find('.paramName').filter(function() {
                return ($(this).text() === value);
            }).closest('tr').remove();

            var newRow = '<tr class="unfilled">' +
                            '<td class="paramName"></td>' +
                            '<td>' +
                                '<input class="paramVal" />' +
                                '<div class="options">' +
                                     '<div class="option paramEdit">' +
                                        '<span class="icon"></span>' +
                                    '</div>' +
                                '</div>' +
                            '</td>' +
                       '</tr>';
            $('.defaultListSection').find('tr:last').after(newRow);
        });

        $('#addNewParameterizedQuery').click(function() {
            $(this).addClass('btnInactive');
            showEditableParamQuery();
        });

        $dagModal.on('focus', '.paramVal', function() {
            $(this).next().find('.paramEdit').addClass('selected');
        });

        $dagModal.on('blur', '.paramVal', function() {
            $(this).next().find('.paramEdit').removeClass('selected');
        });

        $dagModal.on('keypress', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dagModal.draggable({
            handle     : '.modalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });
    };

    DagModal.show = function($currentIcon) {
        $dagModal.show();
        centerPositionElement($dagModal);

        $('#modalBackground').fadeIn(200);
        var type = $currentIcon.data('type');
        var id = $currentIcon.data('id');
        var dagNum = $currentIcon.closest('.dagWrap').index();
        $dagModal.data({'id': id, 'dagNum': dagNum});
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized Query:
        if ($currentIcon.hasClass('dataStore')) {
            defaultText += '<td>Load</td>';
            defaultText += '<td><div class="boxed large">' +
                            $currentIcon.data('url') +
                            '</div></td>';
            editableText += "<td class='static'>Load</td>";
            editableText += '<td>' +
                                '<div class="editableParamDiv boxed ' +
                                'large load" ' +
                                'ondragover="DagModal.allowParamDrop(event)"' +
                                'ondrop="DagModal.paramDrop(event)" ' +
                                'data-target="0" ' +
                                'contenteditable="true" ' +
                                'spellcheck="false"></div>' +
                            '</td>';
        } else { // not a datastore but a table
            defaultText += "<td>" + type + "</td>";
            defaultText += "<td><div class='boxed medium'>" +
                            $currentIcon.data('column') +
                            "</div></td>";
            editableText += "<td class='static'>" + type + "</td>";
        }
        
        if (type === "filter") {
            var filterInfo = $currentIcon.data('info') + " ";
            var parenIndex = filterInfo.indexOf("(");
            var abbrFilterType = filterInfo.slice(0, parenIndex);
            var filterValue = filterInfo.slice(filterInfo.indexOf(',') + 2,
                                                  filterInfo.indexOf(')'));
            var filterTypeMap = {
                "gt"   : ">",
                "ge"   : "&ge;",
                "eq"   : "=",
                "lt"   : "<",
                "le"   : "&le;",
                "regex": "regex",
                "like" : "like",
                "not"  : "not"
            };
            
            defaultText += "<td class='static'>by</td>";
            defaultText += "<td><div class='boxed small'>" +
                            filterTypeMap[abbrFilterType] + "</div></td>";
            defaultText += "<td><div class='boxed medium'>" +
                            filterValue + "</div></td>";
           
            editableText += getParameterInputHTML(0) +
                            '<td class="static">by</td>' +
                            getParameterInputHTML(1) +
                            getParameterInputHTML(2);
            
        } else if ($currentIcon.hasClass('dataStore')) {
            // do nothing
        } else { // index, sort, map etc to be added in later
            defaultText += "<td>by</td>";
        }
        $dagModal.find('.template').html(defaultText);
        $dagModal.find('.editableRow').html(editableText);
        var $dagWrap = $currentIcon.closest('.dagWrap');
        var draggableInputs = generateDraggableParams($dagWrap);
        $dagModal.find('.draggableParams').append(draggableInputs);
        if ($('.draggableDiv').length === 0) {
            $dagModal.addClass('minimized');
        } else {
            $dagModal.removeClass('minimized');
        }

        generateParameterDefaultList();
        populateSavedFields();
    };

    DagModal.paramDragStart = function(event) {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        event.dataTransfer.setData("text", event.target.id);
        event.stopPropagation();
        var origin;
        if ($(event.target).parent().hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $(event.target).parent().data('target');
        }

        $('.editableRow').data('origin', origin);
    };

    DagModal.paramDragEnd = function (event) {
        event.stopPropagation();
        $('.editableRow').data('copying', false);
    };

    DagModal.paramDrop = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var paramId = event.dataTransfer.getData("text");
        if (!$dropTarget.hasClass('editableParamDiv')) {
            return; // only allow dropping into the appropriate boxes
        }
        
        var $draggableParam = $('#' + paramId).clone();
        if ($('.editableRow').data('origin') !== 'home') {
            // the drag origin is from another box, therefore we're moving the
            // div so we have to remove it from its old location
            $('.editableRow .editableParamDiv').filter(function() {
                return ($(this).data('target') ===
                        $('.editableRow').data('origin'));
            }).find('#' + paramId + ':first').remove();
            // we remove the dragging div from its source
        }

        $dropTarget.append($draggableParam);
        var value = $draggableParam.find('.value').text();

        var paramRow = $('.defaultListSection').find('.paramName')
                        .filter(function() {
                            return ($(this).text() === value);
                        });
        if (paramRow.length === 0) {
            var $row = $('.defaultListSection').find('.unfilled:first');
            $row.find('.paramName').text(value);
            $row.removeClass('unfilled');
        }
    };

    DagModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function getParameterInputHTML(inputNum) {
        var td = '<td>' +
                    '<div class="editableParamDiv boxed medium" ' +
                    'ondragover="DagModal.allowParamDrop(event)"' +
                    'ondrop="DagModal.paramDrop(event)" ' +
                    'data-target="' + inputNum + '" ' +
                    'contenteditable="true" ' +
                    'spellcheck="false"></div>' +
                '</td>';

        return (td);
    }

    function populateSavedFields() {
        var id = $dagModal.data('id');

        if (!gRetinaObj[id]) {
            return;
        }

        var i;
        var paramQueryLen = gRetinaObj[id].paramQuery.length;
        for (i = 0; i < paramQueryLen; i++) {
            $dagModal.find('.editableParamDiv').eq(i)
                .html(gRetinaObj[id].paramQuery[i]);
        }

        var $tbody = $dagModal.find(".tableWrapper tbody");
        var paramListLen = gRetinaObj[id].params.length;
        for (i = 0; i < paramListLen; i++) {
            $tbody.find(".unfilled:first")
                .removeClass("unfilled")
                .find(".paramName").text(gRetinaObj[id].params[i].name)
                .next().find(".paramVal")
                .val(gRetinaObj[id].params[i].val);
        }

        $('#addNewParameterizedQuery').trigger("click");
    }

    function generateParameterDefaultList() {
        var html = '<div class="tableContainer">' +
                        '<div class="tableWrapper">' +
                            '<table>' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Parameter' +
                                            '</div>' +
                                        '</th>' +
                                        '<th>' +
                                            '<div class="thWrap">' +
                                                'Default' +
                                            '</div>' +
                                        '</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody>';
        for (var i = 0; i < 6; i++) {
            html += '<tr class="unfilled">' +
                        '<td class="paramName"></td>' +
                        '<td>' +
                            '<input class="paramVal" />' +
                            '<div class="options">' +
                                 '<div class="option paramEdit">' +
                                    '<span class="icon"></span>' +
                                '</div>' +
                            '</div>' +
                        '</td>' +
                   '</tr>';
        }
        html += '</tbody></table></div></div>';

        $dagModal = $('#dagParameterModal');
        $dagModal.find('.defaultListSection').append(html);

        $('.paramEdit').click(function() {
            $(this).parent().prev().focus();
        });
    }

    function generateDraggableParams($dagWrap) {
        var html = "";
        //XX use id to get current parameters to loop and create draggable divs
        $dagWrap.find('.retTabSection tbody')
                .find('tr:not(".unfilled")').each(function() {
                    var value = $(this).find('.paramName').text();
                    html += '<div id="draggableParam' + value +
                        '" class="draggableDiv" ' +
                        'draggable="true" ' +
                        'ondragstart="DagModal.paramDragStart(event)" ' +
                        'ondragend="DagModal.paramDragEnd(event)" ' +
                        'ondrop="return false" ' +
                        'title="click and hold to drag" ' +
                        'contenteditable="false">' +
                            '<div class="icon"></div>' +
                            '<span class="delim"><</span>' +
                            '<span class="value">' + value + '</span>' +
                            '<span class="delim">></span>' +
                            '<div class="close"><span>+</span></div>' +
                        '</div>';
                });
        return (html);
    }

    function closeDagParamModal($modal) {
        $modal.hide();
        $dagModal.find('.editableRow').empty();
        $dagModal.find('.editableParamQuery').hide();
        $dagModal.find('.draggableParams').empty();
        $dagModal.find('.defaultListSection').empty().hide();
        $dagModal.find('.currentParameterList').next().hide();
        $dagModal.removeClass('enlarged minimized');
        $('#addNewParameterizedQuery').removeClass('btnInactive');
        $('#modalBackground').fadeOut(200);
    }

    function showEditableParamQuery() {
        $dagModal = $('#dagParameterModal');
        $dagModal.find('.currentParameterList').next().show();
        $dagModal.find('.editableParamQuery').show();
        $dagModal.find('.defaultListSection').show();
        $dagModal.removeClass('minimized').addClass('enlarged');
    }

    return (DagModal);

}(jQuery, {}));
