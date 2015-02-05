
function setupImportDSForm() {
    $('#fileFormat').find('label').click(function() {
        $('.radio').removeClass('checked');
        $(this).find('.radio').addClass('checked');
    });

    $('#importDataBottomForm').find('button[type=reset]').click(function() {
        $('.radio').removeClass('checked');
    });

    $('#importDataForm').submit(function() {
        var loadURL = $.trim($('#filePath').val());
        var tableName = $.trim($('#fileName').val());
        var loadFormat = $('#fileFormat').find('input[name=dsType]:checked')
                         .val();
        var loadArgs = loadURL.split("|");
        var dsId = XcalarLoad(loadArgs[0], loadFormat, tableName,
                              loadArgs[1], loadArgs[2]);
        console.log("This is the returned dsId "+dsId);
        var loadSuccess = checkLoadStatus(tableName);  
        if (loadSuccess) {
            appendDSToList(tableName);
        } else {
            displayLoadErrorMessage(loadURL);
        }
        return false;
    });
}

function displayNewDataset() {
    $('#importDataBottomForm').find('button[type=reset]').trigger('click');
    $('#iconWaiting').remove();
    $('#gridView').find('.inactive').removeClass('inactive');
    $('#gridView').find('grid-unit:last').trigger('click');
}

function appendDSToList(dsName) {
    var dsDisplay = '<grid-unit class="inactive"><div class="gridIcon"></div>'+
        '<div class="listIcon"><span class="icon"></span></div>'+
        '<div id="iconWaiting" class="iconWaiting"></div>'+
        '<div class="label">'+dsName+'</div></grid-unit>';
        $("#gridView").append(dsDisplay);
    $('#iconWaiting').fadeIn(200);
}

function displayLoadErrorMessage(loadURL) {
    var statusBox = $('#statusBox');
    var text = "Could not retrieve dataset from file path: "+loadURL;
    statusBox.addClass('error');
    statusBox.find('.titleText').text('Error');
    statusBox.find('.message').text(text);

    // position error message
    var top = $('#filePath')[0].getBoundingClientRect().top - 30;
    var right = $(window).width() - 
                $('#filePath')[0].getBoundingClientRect().right- 200;
    statusBox.css({top: top, right: right});

    // set when status box closes
    $(document).mousedown(hideStatusBox);
    $('#filePath').keydown(hideStatusBox);
    $('#filePath').focus().addClass('error');
}

function hideStatusBox(event) {
    if ($(event.target).attr('id') != "filePath" || event.type == "keydown") {
        $('#statusBox').attr('class', "");
        $(document).off('mousedown', hideStatusBox);
        $('#filePath').off('blur', hideStatusBox);
        $('#filePath').removeClass('error');
    }
}