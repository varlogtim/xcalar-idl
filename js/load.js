
function setupImportDSForm() {
    $('#importDataForm').submit(function() {
        var loadURL = $.trim($('#filePath').val());
        var tableName = $.trim($('#fileName').val());
        var loadFormat = $('#fileFormat').find('input[name=dsType]:checked')
                         .val();
        var loadArgs = loadURL.split("|");
        var dsId = XcalarLoad(loadArgs[0], loadFormat, tableName,
                              loadArgs[1], loadArgs[2]);
        console.log("This is the returned dsId "+dsId);
        appendDSToList(tableName);
        checkLoadStatus(tableName);  
        return false;
    });
}

function displayNewDataset() {
    // $('#importDataButton').trigger('click');
    $('#importDataBottomForm').find('button[type=reset]').trigger('click');
    $('#iconWaiting').remove();
    $('#gridView').find('.inactive').removeClass('inactive');
    $('#gridView').find('grid-unit:last').trigger('click');
}

function appendDSToList(dsName) {
    var dsDisplay = '<grid-unit class="inactive"><div class="icon"></div>'+
        '<div id="iconWaiting" class="iconWaiting"></div>'+
        '<div class="label">'+dsName+'</div></grid-unit>';
        $("#gridView").append(dsDisplay);
    $('#iconWaiting').fadeIn(200);
}