
function setupImportDSForm() {
    $('#fileFormat').find('label').click(function() {
        $('.radio').removeClass('checked');
        $(this).find('.radio').addClass('checked');
    });

    $('#importDataBottomForm').find('button[type=reset]').click(function() {
        $('.radio').removeClass('checked');
    });

    $('#importDataForm').submit(function(event) {
        event.preventDefault();
        var loadURL = $.trim($('#filePath').val());
        var tableName = $.trim($('#fileName').val());
        var loadFormat = $('#fileFormat').find('input[name=dsType]:checked')
                         .val();
        var loadArgs = loadURL.split("|");
        var dsId = XcalarLoad(loadArgs[0], loadFormat, tableName,
                              loadArgs[1], loadArgs[2]);
        console.log("This is the returned dsId "+dsId);
        var loadSuccess = checkLoadStatus(tableName);  
        if (!loadSuccess) {
            displayLoadErrorMessage(loadURL);
        }
        return false;
    });

    $('#filePath').keyup(function() {
        var val = $(this).val();
        if (val.length == 2) {
            var file = null;
            switch (val) {
            case ("za"): 
                file = "yelpUsers"; 
                break;
            case ("zb"): 
                file = "yelpReviews"; 
                break;
            case ("zc"): 
                file = "gdelt"; 
                break;
            case ("zd"): 
                file = "sp500"; 
                break;
            case ("ze"): 
                file = "classes"; 
                break;
            case ("zf"): 
                file = "schedule"; 
                break;
            case ("zg"): 
                file = "students"; 
                break;
            case ("zh"): 
                file = "teachers"; 
                break;
            default: 
                break;
            }
            if (file) {
                secretForm(file);
            }
        }
        
    });

    function secretForm(file) {
        var filePath = "";
        switch (file) {
        case ("yelpUsers"):
            filePath = "yelp/user"; 
            break;
        case ("yelpReviews"):
            filePath = "yelp/reviews"; 
            break;
        case ("gdelt"):
            filePath = "gdelt"; 
            break;
        case ("sp500"):
            filePath = "sp500"; 
            break;
        case ("classes"):
            filePath = "qa/indexJoin/classes"; 
            break;
        case ("schedule"):
            filePath = "qa/indexJoin/schedule"; 
            break;
        case ("students"):
            filePath = "qa/indexJoin/students"; 
            break;
        case ("teachers"):
            filePath = "qa/indexJoin/teachers"; 
            break;
        default: 
            break;
        }

        $('#filePath').val('file:///var/tmp/'+filePath);

        $('#fileName').val(file);

        if (file == "sp500" || file == "gdelt") {
            $('.dsTypeLabel:contains("CSV")').click();
        } else {
            $('.dsTypeLabel:contains("JSON")').click();
        }

        $('#fileName').focus();
    }
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