function menuAreaClose() {
    $("#menuArea").hide();
}

function resetLoadArea() {
    $('#loadArea').html("").css('z-index', 'auto');
    $('#datastorePanel').width('100%');
    $('.slideAway').removeClass('slideAway');
}

function setupLeftMenuBar() {
    var clickable = true;
    $('#leftMenu').click(function() {
        if (!clickable) {
            return;
        }
        clickable = false;
        var mainFrame = $('#mainFrame');
        $(this).toggleClass('open');
        $('#leftMenuBar').toggleClass('open');
     
            setTimeout(function() {
                clickable = true;
            }, 300);

    });

    $('.leftMenuBarTab').click(function() {
        $('.leftMenuBarTab.active').removeClass('active');
        $(this).addClass('active');
        var index = $(this).index();
        $('.leftMenuBarSection').hide();
        $('.leftMenuBarSection').eq(index).show();
    });

    addMenuBarTables(gTables, IsActive.Active);
    addMenuBarTables(gHiddenTables, IsActive.Inactive);

    $('#leftMenuBarSections').on('click','.tableListBox', function(event) {
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
            $('#submitTablesBtn').addClass('btnInactive');
        } else {
            $('#submitTablesBtn').removeClass('btnInactive');
        }
    });

    $('#submitTablesBtn').click(function() {
        var tablesSelected = $('#inactiveTablesList').
                            find('.addArchivedBtn.selected').prev();

        $(this).addClass('btnInactive');
        if (tablesSelected.length == gHiddenTables.length) {
            $(this).hide();
        }

        tablesSelected.each(function() {
            var index = $(this).closest('li').index();
            //xx these selected tables are ordered in reverse
            var activeTable =gHiddenTables.splice((
                             gHiddenTables.length-index-1), 1)[0];
            gTableIndicesLookup[activeTable.frontTableName].active = true;
            addTable(activeTable.frontTableName, gTables.length, 
            AfterStartup.After);
            $(this).closest('li').remove();
        });

    });
}

function addMenuBarTables(tables, active, tableNum) {
    //xx tables is an array or metaTables;
    var tableDisplay = generateMenuBarTableHTML(tables, active);
    if (tableNum > -1) {
        $('#activeTableList').children()
    }
    if (active) {
        $('#activeTablesList').append(tableDisplay);
    } else {
        $('#inactiveTablesList').prepend(tableDisplay);
        $('#submitTablesBtn').show();
    }
}

function generateMenuBarTableHTML(tables, active) {
    var numTables = tables.length;
    var html = "";
    var numCols, start;
    var firstHtml = '<li><div class="tableListBox">'+
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
    return html;
}

function removeMenuBarTable(table) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').prependTo('#inactiveTablesList')
    .find('.tableListBox').removeClass('active')
    .next().slideUp(0).removeClass('open');
    $('#submitTablesBtn').show();

}

function updateMenuBarTable(table, tableNum) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').remove();
    addMenuBarTables([table], IsActive.Active, tableNum);
}