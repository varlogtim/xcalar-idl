function menuAreaClose() {
    $("#menuArea").hide();
}

function resetLoadArea() {
    $('#loadArea').html("").css('z-index', 'auto');
    $('#datastorePanel').width('100%');
    $('.slideAway').removeClass('slideAway');
}

function getTablesAndDatasets() {
    $(".datasetWrap").empty(); // Otherwise multiple calls will append the
    // same DS over and over again.
    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    var i;

    for (i = 0; i<numDatasets; i++) {
        var datasetId = datasets.datasets[i].datasetId;
        var dsName = getDsName(datasetId);
        var tableDisplay = '<div class="menuAreaItem">'+
                                '<span class="menuAreaLabel monitorSmall">'+
                                    'DATA<br>SET</span>'+
                                '<span class="menuAreaValue">'+
                                    dsName+
                                '</span>'+
                            '</div>';
        $(".datasetWrap").append(tableDisplay);
    };

    var tables = XcalarGetTables();
    var numTables = tables.numTables;
    
    for (i = 0; i<numTables; i++) {

        var tableDisplay = '<div class="menuAreaItem">'+
                               '<span class="menuAreaLabel monitorSmall">'+
                               'DATA<br>SET</span>'+
                               '<span class="menuAreaValue">'+
                                    tables.tables[i].frontTableName+
                               '</span>'+
                            '</div>';

        $("#tablestorePanel div:last").after(tableDisplay);
    }
}

function addMenuBarListeners() {
    var clickable = true;
    $('#leftMenu').click(function() {
        if (!clickable) {
            return;
        }
        clickable = false;
        var mainFrame = $('#mainFrame');
        $(this).toggleClass('open');
        $('#leftSideBar').toggleClass('open');
        
        //XX dumb adjustment to make dragdrop work normally
        if ($(this).hasClass('open')) {
            mainFrame.addClass('shiftedRight');
            setTimeout(function() {
                mainFrame.addClass('staticMainFrame');
                mainFrame.removeClass('shiftedRight');
                clickable = true;
            }, 500);
        } else { 
            mainFrame.addClass('shiftedLeft');
            setTimeout(function() {
                mainFrame.removeClass('shiftedLeft');
                mainFrame.removeClass('staticMainFrame');
                clickable = true;
            }, 550);
        }
    });
}