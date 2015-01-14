function menuAreaClose() {
    $("#menuArea").hide();
}

function menuBarArt() {
    var clickTarget = null;
    var clickTooFast = false;
    menuAreaClose();
    $("#menuBar div").on("click", function(event) {
        if (clickTooFast) {
            return;
        }
        clickTooFast = true;
        setTimeout(function() {clickTooFast = false}, 300);
        if (clickTarget == $(event.target).text()) {
            //if clicking on an already open menu, close it
            $(".menuSelected").removeClass("menuSelected");
            $('#mainFrame').height('calc(100% - 148px)');
            $("#menuArea").height(0);
            clickTarget = null;
            setTimeout(function() {
                //XXX not sure if I need to adjust height of colGrab
                // $('#xcTable'+gActiveTableNum+' .colGrab')
                //     .height($('#xcTable'+gActiveTableNum).height());
                generateFirstLastVisibleRowNum();
            },300);
            return;
        }
        clickTarget = $(event.target).text();

        setTimeout(function() {
            // $('#xcTable'+gActiveTableNum+' .colGrab')
            //         .height($('#xcTable'+gActiveTableNum).height());
            generateFirstLastVisibleRowNum();
        },300);

        $(".menuSelected").removeClass("menuSelected");
        $(this).addClass("menuSelected");
        $("#menuArea").show().height(66);
        $('#mainFrame').height('calc(100% - 214px)');
        
        switch ($(this).text()) {
        case ("datastore"):
            $("#datastorePanel").show();
            $("#datastorePanel").siblings().hide();
            break;
        case ("monitor"):
            resetLoadArea();
            $("#monitorPanel").show();
            $("#monitorPanel").siblings().hide();
            break;
        default:
            console.log($(this.text()+" is not implemented!"));
            break;
        }
    });
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
