function setupRightSideBar() {
    var clickable = true;
    var delay = 300;
    var $workSheetBar = $('#worksheetBar');
    var $sliderBtns = $workSheetBar.find('.sliderBtn');
    var $sidebar = $('#rightSideBar');

    $workSheetBar.on('click', '.sliderBtn', function() {
        if (!clickable) {
            return;
        }

        $sliderBtns.removeClass('active');

        var $sliderBtn = $(this);
        var index = $sliderBtn.index();
        var $sidebarSection = $sidebar.find('.rightBarSection')
                                      .eq(index);

        if (!$sidebar.hasClass('open')) {
            // sidebar is closed so open the correlating section
            $sidebar.addClass('open');
            $sidebarSection.addClass('active');
            if ($sidebarSection.attr('id') === 'cliSection') {
                Cli.scrollDown();
            }
            $sliderBtn.addClass('active');
            // display correct section
        } else {
            // sidebar is already open, check for close or switch sections
            if ($sidebarSection.hasClass('active')) {
                // button clicked has an active section so close slider
                $sidebar.removeClass('open');
                $sidebar.children('.lastOpen')
                        .removeClass('lastOpen');
                $sidebarSection.addClass('.lastOpen');
                setTimeout(function() {
                    $sidebarSection.removeClass('active');
                }, delay);
            } else {
                // close current section, open new section
                $sidebar.children('.active')
                        .removeClass('active');
                $sidebarSection.addClass('active');
                if ($sidebarSection.attr('id') === 'cliSection') {
                    Cli.scrollDown();
                }
                $sliderBtn.addClass('active');
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

        if (!$sidebar.hasClass('open')) {
            $sidebar.addClass('open');
            if ($sidebar.children('.lastOpen').length == 0) {
                $sidebar.find('.rightBarSection')
                        .eq(0)
                        .addClass('active');
                $sliderBtns.eq(0)
                           .addClass('active');
            } else {
                var $sidebarSection = $sidebar.children('.lastOpen');
                var index = $sidebarSection.index();
                $sidebarSection.removeClass('lastOpen')
                               .addClass('active');
                $sliderBtns.eq(index)
                           .addClass('active');
            }
        } else {
            $sidebar.removeClass('open');
            $sliderBtns.removeClass('active');
            setTimeout(function() {
                $sidebar.children('.active')
                        .removeClass('active')
                        .addClass('lastOpen');
            }, delay);
            
        }

        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, delay);
    });

    $sidebar.on('click', '.iconClose', function() {
        $sidebar.removeClass('open');
        $sliderBtns.removeClass('active');
        setTimeout(function() {
            $sidebar.find('.rightBarSection')
                    .removeClass('active');
        }, delay);
    });

    setupHelpSection();
}

// Current it works as a rest button
function setupHelpSection() {
    $('#helpSubmit').click(function() {
        console.log('Reset Fired!');
        var promises = [];
        // delete All Hidden Tables
        for (var i = gHiddenTables.length - 1; i >= 0; i --) {
            promises.push(deleteTable.bind(this, i, DeleteTable.Delete));
        }
        // delete All Table
        for (var i = gTables.length - 1; i >= 0; i --) {
            promises.push(deleteTable.bind(this, i));
        }

        chain(promises)
        .then(function() {
            console.log('Table Deleted');

            // Clear archived Table List
            $('#inactiveTablesList').html('');
            $('#archivedTableList').find('.btnLarge').hide();
            return (DSObj.reset());
        })
        .done(function() {
           emptyStorage();
           console.log("Clear Up Succeed!")
        }).fail(function() {
            console.log("Fail to empty all!");
            emptyStorage();
        })

        function emptyStorage() {
            emptyAllStorage();
            gTableIndicesLookup = {};
            gTableDirectionLookup = {};
            gWorksheetName = [];
            gTableOrderLookup = [];
            gDSObjFolder = {};
            commitToStorage();
            Cli.clear();

            $('#worksheetInfo').find('.numDataStores').text(0);
            $('#datasetExplore').find('.numDataStores').text(0);
        }
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
        var $tablesSelected = $('#inactiveTablesList')
                                .find('.addArchivedBtn.selected').prev();
        var $buttons = $('#archivedTableList').find('.btnLarge');
        var numTables = gTables.length;
        var numHiddenTables = gHiddenTables.length;
        var promises = [];

        $buttons.addClass('btnInactive');
        $tablesSelected.each(function(index, ele) {
            promises.push((function() {
                var innerDeferred = jQuery.Deferred();

                var $li = $(ele).closest('li.tableInfo');
                var $timeLine = $li.parent().parent();
                var index = $li.index();
                $li.remove();
                numHiddenTables--;
                // XXX these selected tables are ordered in reverse
               
                if (action == "add") {
                    var activeTable = gHiddenTables.splice((
                                 numHiddenTables-index), 1)[0];
                    
                    gTableIndicesLookup[activeTable.frontTableName].active =
                                                                           true;
                    gTableIndicesLookup[activeTable.frontTableName].timeStamp 
                                                      = (new Date()).getTime();
                    
                    // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'addTable';
                    cliOptions.tableName = activeTable.frontTableName;

                    addTable(activeTable.frontTableName, numTables++, 
                             AfterStartup.After)
                    .then(function() {
                        return (XcalarSetFree(activeTable.resultSetId));
                    })
                    .done(function() {
                        Cli.add('Send To WorkSheet', cliOptions);
                        if ($timeLine.find('.tableInfo').length === 0) {
                            $timeLine.remove();
                        }
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        // XXX actually there are lot of issues 
                        // in UI when failed
                        innerDeferred.reject(error);
                    });
                } else {
                    var tableNum = numHiddenTables-index;
                    // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'deleteTable';
                    cliOptions.tableName = gHiddenTables[tableNum]
                                           .frontTableName;

                    deleteTable(tableNum, DeleteTable.Delete)
                    .done(function() {

                        Cli.add('Delete Table', cliOptions);
                        if ($timeLine.find('.tableInfo').length === 0) {
                            $timeLine.remove();
                        }
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        innerDeferred.reject(error);
                    });
                }
                
                return (innerDeferred.promise());
            }).bind(this));
        });


        chain(promises)
        .then(function() {
            if (action == "add") {
                var $mainFrame = $('#mainFrame');
                $('#workspaceTab').trigger('click');
                var leftPos = $('#xcTableWrap'+(numTables-1)).position()
                                .left +
                                $mainFrame.scrollLeft();
                $mainFrame.animate({scrollLeft: leftPos});
                focusTable(numTables-1);
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
