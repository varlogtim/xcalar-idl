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
                $('#cliSection').find('textarea').focus();
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
            $('#archivedTableList').find('.btnLarge').removeClass('btnInactive');
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

        if ($tablesSelected.length == gHiddenTables.length) {
            $buttons.hide();
        }

        var promises = [];
        $tablesSelected.each(function() {
            promises.push( (function() {
                var innerDeferred = jQuery.Deferred();

                var $li = $(this).closest('li');
                var index = $li.index();
                //xx these selected tables are ordered in reverse
                
                if (action == "add") {
                    var activeTable =gHiddenTables.splice((
                                 gHiddenTables.length-index-1), 1)[0];
                    gTableIndicesLookup[activeTable.frontTableName].active = true;
                    
                     // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'addTable';
                    cliOptions.tableName = activeTable.frontTableName;


                    addTable(activeTable.frontTableName, gTables.length, 
                        AfterStartup.After)
                    .done(function() {
                        addCli('Send To WorkSheet', cliOptions);
                        $li.remove();

                        innerDeferred.resolve();
                    });
                } else {
                    var tableNum = gHiddenTables.length-index-1;
                    // add cli
                    var cliOptions = {};
                    cliOptions.operation = 'deleteTable';
                    cliOptions.tableName = gHiddenTables[tableNum].frontTableName;

                    deleteTable(tableNum, DeleteTable.Delete)
                    .done(function() {
                        addCli('Delete Table', cliOptions);
                        $li.remove();

                        innerDeferred.resolve();
                    });
                }
                
                return (innerDeferred.promise());
            }).apply(this) );
        });

        jQuery.when.apply(jQuery, promises)
        .done(function() {
            if (action == "add") {
                $mainFrame = $('#mainFrame');
                $('#workspaceTab').trigger('click');
                var leftPos = $('#xcTableWrap'+(gTables.length-1)).position().left +
                                $mainFrame.scrollLeft();
                $mainFrame.animate({scrollLeft: leftPos});
            }
        }); 
    }
}

function addMenuBarTables(tables, active, tableNum) {
    //xx tables is an array or metaTables;
    var tableDisplay = generateMenuBarTableHTML(tables, active);
    if (tableNum > -1) {
        $('#activeTableList').children()
    }
    if (active) {
        $('#activeTablesList').append(tableDisplay);
    } else if (tableDisplay) {
        $('#inactiveTablesList').prepend(tableDisplay);
         $('#archivedTableList').find('.btnLarge').show();
    }
}

function generateMenuBarTableHTML(tables, active) {
    var numTables = tables.length;
    var html = "";
    var numCols;
    var D = new Date();
    var minutes = D.getMinutes();
    var seconds = D.getSeconds();
    if (minutes < 10) {
        minutes = '0'+minutes;
    }
    if (seconds < 10) {
        seconds = '0'+seconds;
    }
    var date = (D.getMonth()+1) + '-' + D.getDate() + '-' + D.getFullYear();
    var time = D.getHours() + ':' + minutes + ':' + seconds;

    var firstHtml = '<li class="clearfix"><div class="timeStampWrap">'+
                    '<div class="timeStamp"><span>'+date+'</span>'+
                    '<span>'+time+'</span></div></div>'+
                    '<div class="tableListBox">'+
                    '<div class="iconWrap"><span class="icon">'+
                    '</div></span>'+
                    '<span class="tableName">';
    if (active) {
        for (var i = 0; i<numTables; i++) {
            html += firstHtml;
            html += tables[i].frontTableName+
                    '</span><span class="addArchivedBtn"></span>';
                            
            numCols = tables[i].tableCols.length-1;
            html += '<span class="numCols">'+numCols+'</span>';
            html += '</div><ol>';
            for (var j = 0; j <= numCols; j++) {
                if (tables[i].tableCols[j].name != 'DATA') {
                    html += '<li>'+tables[i].tableCols[j].name+'</li>'
                }
            }
            html += '</ol></li>';    
        }
    } else {
        for (var i = (numTables-1); i >= 0; i--) {
            html += firstHtml;
            html += tables[i].frontTableName+
                    '</span><span class="addArchivedBtn"></span>';
                                
            numCols = tables[i].tableCols.length-1;
            html += '<span class="numCols">'+numCols+'</span>';
            html += '</div><ol>';
            for (var j = 0; j <= numCols; j++) {
                if (tables[i].tableCols[j].name != 'DATA') {
                    html += '<li>'+tables[i].tableCols[j].name+'</li>'
                }
            }
            html += '</ol></li>'; 
        }   
    }
    return (html);
}

function moveMenuBarTable(table) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').prependTo('#inactiveTablesList')
    .find('.tableListBox').removeClass('active')
    .next().slideUp(0).removeClass('open');
    $('#archivedTableList').find('.btnLarge').show();
}

function updateMenuBarTable(table, tableNum) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').remove();
    addMenuBarTables([table], IsActive.Active, tableNum);
}
