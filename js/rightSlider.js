function setupRightSideBar() {
    var clickable = true;
    var delay = 300;
    $('#worksheetBar').find('.sliderBtn').click(function() {
        if (!clickable) {
            return;
        }
        var sidebar = $('#rightSideBar');
        var index = $(this).index();
        var sidebarSection = sidebar.find('.rightBarSection').eq(index);
        if (!sidebar.hasClass('open')) {
            //sidebar is closed so open the correlating section
            sidebar.addClass('open');
            sidebarSection.addClass('active');
            if (sidebarSection.attr('id') === 'cliSection') {
                cliScrollDown($('#rightBarTextArea'));
            }
            sidebar.children('.lastOpen').removeClass('lastOpen');
            //display correct section
        } else {
            // sidebar is already open, check for close or switch sections
            if (sidebarSection.hasClass('active')) {
                // button clicked has an active section so close slider
                sidebar.removeClass('open');
                setTimeout(function() {
                    sidebarSection.removeClass('active');
                }, delay);
            } else {
                // close current section, open new section
                sidebar.children('.active').removeClass('active');
                sidebarSection.addClass('active');
                if (sidebarSection.attr('id') === 'cliSection') {
                    cliScrollDown($('#rightBarTextArea'));
                }
                // $('#cliSection').find('textarea').focus();
            }
        }

        clickable = false;
        setTimeout(function() {
            clickable = true
        }, delay);
    });

    $('#pulloutTab').click(function() {
        if (!clickable) {
            return;
        }
        var sidebar = $('#rightSideBar');
        if (!sidebar.hasClass('open')) {
            sidebar.addClass('open');
            if (sidebar.children('.lastOpen').length == 0) {
                sidebar.find('.rightBarSection').eq(0).addClass('active');
            } else {
                sidebar.children('.lastOpen').removeClass('lastOpen')
                       .addClass('active');
            }
        } else {
            sidebar.removeClass('open');
            setTimeout(function() {
                sidebar.children('.active').removeClass('active')
                       .addClass('lastOpen');
            }, delay);
            
        }

        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, delay);
    });

    $('#rightSideBar').find('.iconClose').click(function() {
        $('#rightSideBar').removeClass('open');
        setTimeout(function() {
            $('#rightSideBar').find('.rightBarSection').removeClass('active');
        }, delay);
    });
}

function setuptableListSection() {
    $('.tableListSectionTab').click(function() {
        $('.tableListSectionTab.active').removeClass('active');
        $(this).addClass('active');
        var index = $(this).index();
        $('.tableListSection').hide();
        $('.tableListSection').eq(index).show();
    });

    addMenuBarTables(gTables, IsActive.Active);
    addMenuBarTables(gHiddenTables, IsActive.Inactive);

    $('#tableListSections').on('click','.tableListBox', function(event) {
        var ol = $(this).next();
        // console.log($(event.target))
        if ($(event.target).hasClass('addArchivedBtn')) {
            return;
        }
        if (ol.hasClass('open') && $(this).hasClass('active')) {
            $(this).removeClass('active');
            ol.slideUp(200).removeClass('open');
        } else {
            $(this).addClass('active');
            ol.slideDown(200).addClass('open');
        }
    });

    $('#inactiveTablesList').on('click','.addArchivedBtn', function() {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        } else {
            $(this).addClass('selected');
        }
        if ($('.addArchivedBtn.selected').length == 0) {
            $('#archivedTableList').find('.btnLarge').addClass('btnInactive');
        } else {
            $('#archivedTableList').find('.btnLarge')
                                   .removeClass('btnInactive');
        }
    });

    $('#submitTablesBtn').click(function() {
        archiveButtonClick('add');
    });

    $('#deleteTablesBtn').click(function() {
        archiveButtonClick('delete');
    });

    function archiveButtonClick(action) {
        var $tablesSelected = $('#inactiveTablesList').
                            find('.addArchivedBtn.selected').prev();
        var $buttons = $('#archivedTableList').find('.btnLarge');
        $buttons.addClass('btnInactive');

        var promises = [];
        $tablesSelected.each(function() {
            promises.push((function() {
                var innerDeferred = jQuery.Deferred();

                var $li = $(this).closest('li.tableInfo');
                var $timeLine = $li.parent().parent();
                var index = $li.index();
                // XXX these selected tables are ordered in reverse
               
                if (action == "add") {
                    var activeTable = gHiddenTables.splice((
                                 gHiddenTables.length-index-1), 1)[0];
                    gTableIndicesLookup[activeTable.frontTableName].active =
                                                                           true;
                    gTableIndicesLookup[activeTable.frontTableName].timeStamp 
                                                      = (new Date()).getTime();
                    // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'addTable';
                    cliOptions.tableName = activeTable.frontTableName;

                    addTable(activeTable.frontTableName, gTables.length, 
                        AfterStartup.After)
                    .done(function() {
                        addCli('Send To WorkSheet', cliOptions);
                        $li.remove();
                        if ($timeLine.find('.tableInfo').length === 0) {
                            $timeLine.remove();
                        }
                        if (gHiddenTables.length === 0) {
                            $buttons.hide();
                        }
                        innerDeferred.resolve();
                    });
                } else {
                    var tableNum = gHiddenTables.length-index-1;
                    // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'deleteTable';
                    cliOptions.tableName = gHiddenTables[tableNum]
                                           .frontTableName;

                    deleteTable(tableNum, DeleteTable.Delete)
                    .done(function() {
                        addCli('Delete Table', cliOptions);
                        $li.remove();
                        if ($timeLine.find('.tableInfo').length === 0) {
                            $timeLine.remove();
                        }
                        if (gHiddenTables.length === 0) {
                            $buttons.hide();
                        }
                        innerDeferred.resolve();
                    });
                }
                
                return (innerDeferred.promise());
            }).apply(this));
        });

        jQuery.when.apply(jQuery, promises)
        .done(function() {
            if (action == "add") {
                $mainFrame = $('#mainFrame');
                $('#workspaceTab').trigger('click');
                var leftPos = $('#xcTableWrap'+(gTables.length-1)).position()
                                .left +
                                $mainFrame.scrollLeft();
                $mainFrame.animate({scrollLeft: leftPos});
            }
        }); 
    }
}

function addMenuBarTables(tables, active, tableNum) {
    // XXX tables is an array of metaTables;
    generateMenuBarTableHTML(tables, active);
    
    if (!active) {
        $('#archivedTableList').find('.btnLarge').show();
    }
}

function generateMenuBarTableHTML(tables, active) {
    var sortedTables = sortTableByTime(tables); // from oldest to newest
    var numTables = sortedTables.length;

    var dates = getDateTimeForTwoWeeks();
    var p = dates.length - 1;    // the length should be 8
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday'];

    var $tableList;
    if (active == true) {
        $tableList = $('#activeTablesList');
    }  else {
        $tableList = $('#inactiveTablesList');
    }

    for (var i = 0; i < numTables; i++) {
        var table = sortedTables[i][0];
        var timeStamp = sortedTables[i][1];

        // pointer to a day after at 0:00 am
        while (p >= 0 && timeStamp >= dates[p].getTime()) {
            p--;
        }

        var dateIndex = p + 1;
        if ($tableList.find('> li.date' + p).length == 0) {
            var dateText = '';
            switch (dateIndex) {
                case 0:
                    var d = dates[dateIndex];
                    dateText = 'Today ' + d.toLocaleDateString();
                    break;
                case 1:
                    var d = dates[dateIndex];
                    dateText = 'Yesterday ' + d.toLocaleDateString();
                    break;
                // Other days in the week
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    var d = dates[dateIndex];
                    dateText = days[d.getDay()] + ' ' + d.toLocaleDateString();
                    break;
                case 7:
                    dateText = 'Last week';
                    break;
                case 8:
                    dateText = 'Older';
                    break;
                default:
                    break;
            }
            var html = '<li class="clearfix timeLine date' + p + '">' +
                            '<div class="timeStamp">' + 
                                dateText + 
                            '</div>' + 
                            '<ul class="tableList"></ul>'
                        '</li>';
            $tableList.prepend(html);
        }

        var $dateDivider = $tableList.find('> li.date' + p + ' .tableList');
        var numCols = table.tableCols.length - 1;
        var time;
        if (dateIndex >= 7) {
            time = (new Date(timeStamp)).toLocaleDateString();
        } else {
            time = (new Date(timeStamp)).toLocaleTimeString();
        }

        var html = '<li class="clearfix tableInfo">' +
                        '<div class="timeStampWrap">' +
                            '<div class="timeStamp">' + 
                                '<span class="time">' + 
                                    time + 
                                '</span>' +
                            '</div>' + 
                        '</div>' +
                        '<div class="tableListBox">' +
                            '<div class="iconWrap">' + 
                                '<span class="icon"></span>'+
                            '</div>'+
                            '<span class="tableName">' +
                                table.frontTableName +
                            '</span>' + 
                            '<span class="addArchivedBtn"></span>' + 
                            '<span class="numCols">' + 
                                numCols + 
                            '</span>' + 
                        '</div>' + 
                        '<ol>';
        for (var j = 0; j <= numCols; j++) {
            if (table.tableCols[j].name != 'DATA') {
                html += '<li>' + table.tableCols[j].name + '</li>'
            }
        }
        html += '</ol></li>';
        $dateDivider.prepend(html);
    }

    function sortTableByTime(tables) {
        var sortedTables = [];
        var numTables = tables.length;
        for (var i = 0; i < numTables; i ++) {
            var tableName = tables[i].frontTableName;
            var timeStamp = gTableIndicesLookup[tableName].timeStamp;

            if (timeStamp === undefined) {
                console.log('Time Stamp undefined');
                timeStamp = (new Date('2014-02-14')).getTime();
            }

            sortedTables.push([tables[i], timeStamp]);
        }

        // sort by time, from the oldest to newset
        sortedTables.sort(function(a, b) {return a[1] - b[1]});

        return (sortedTables);
    }

    function getDateTimeForTwoWeeks() {
        var dates = [];
        var d = new Date()
        d.setHours(0, 0, 0, 0);
        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i ++) {
            var date = new Date(d)
            date.setDate(d.getDate() - i);
            dates.push(date);
        }
        // older than one week
        var older = new Date(d)
        older.setDate(d.getDate() - 13);
        dates.push(older);
        return (dates);
    }
}

function moveMenuBarTable(table) {
    var $tableList = $('#activeTablesList').find('.tableName').filter(
                        function() {
                            return $(this).text() == table.frontTableName;
                        }
                      ).closest('li');
    var timeStamp = gTableIndicesLookup[table.frontTableName].timeStamp;
    var time = (new Date(timeStamp)).toLocaleTimeString();

    $timeLine = $tableList.parent().parent();
    addMenuBarTables([table], IsActive.Inactive);
    $tableList.find('.tableListBox')
              .removeClass('active')
              .next()
              .slideUp(0)
              .removeClass('open')
    $tableList.remove();

    if ($timeLine.find('.tableInfo').length == 0) {
        $timeLine.remove();
    }

}

function updateMenuBarTable(table, tableNum) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').remove();
    addMenuBarTables([table], IsActive.Active, tableNum);
}
