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
