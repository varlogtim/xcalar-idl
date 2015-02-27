
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
        var loadURL = jQuery.trim($('#filePath').val());
        var tableName = jQuery.trim($('#fileName').val());
        var loadFormat = $('#fileFormat').find('input[name=dsType]:checked')
                         .val();
        var loadArgs = loadURL.split("|");
        if (DSObj.isDataSetNameConflict(tableName)) {
            var text = 'Dataset with the name ' +  tableName + 
                        ' already exits. Please choose another name.';
            displayErrorMessage(text, $('#fileName'));
            return;
        }
        XcalarLoad(loadArgs[0], loadFormat, tableName,
                              loadArgs[1], loadArgs[2])
        .then(function(result) {
            var dsId = result.datasetId;
            console.log("This is the returned dsId "+dsId);
            return checkLoadStatus(tableName);
        })
        .done(function(loadSuccess) {
            if (!loadSuccess) {
                var text = 'Could not retrieve dataset from file path: ' + 
                            loadURL;
                displayErrorMessage(text, $('#filePath'));
            }

            // add cli
            var cliOptions = {};
            cliOptions.operation = 'loadDataSet';
            cliOptions.tableName = tableName;

            addCli('Load dataset', cliOptions);

            //Could this line be removed?
            return (false);
        })
        .fail(function(reason) {
            console.log("error", reason);
        });
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
    var lastEleId = gDSObj.id - 1;
    $('#gridView grid-unit[data-dsId="' + lastEleId + '"]').trigger('click');
}

function appendDSToList(dsName) {
    DSObj.create(gDSObj.id++, dsName, gDSObj.curId, false);
    commitDSObjToStorage();
    DSObj.display();

    var lastEleId = gDSObj.id - 1;
    var $grid = $('#gridView grid-unit[data-dsId="' + lastEleId + '"]');
    $grid.addClass('inactive')
    $grid.append('<div id="iconWaiting" class="iconWaiting"></div>');
    $('#iconWaiting').fadeIn(200);
}

function displayErrorMessage(text, $target) {
    var statusBox = $('#statusBox');
    statusBox.addClass('error');
    statusBox.find('.titleText').text('Error');
    statusBox.find('.message').text(text);

    // position error message
    var top = $target[0].getBoundingClientRect().top - 30;
    var right = $(window).width() - 
                $target[0].getBoundingClientRect().right- 200;
    statusBox.css({top: top, right: right});

    // set when status box closes
    $(document).mousedown(hideStatusBox);
    $target.keydown(hideStatusBox);
    $target.focus().addClass('error');
}

function hideStatusBox(event) {
    if ($(event.target).attr('id') != "filePath" || event.type == "keydown") {
        $('#statusBox').attr('class', "");
        $(document).off('mousedown', hideStatusBox);
        $('#filePath').off('blur', hideStatusBox);
        $('#filePath').removeClass('error');
    }
}
