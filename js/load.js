
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

        appendTempDSToList(tableName);

        XcalarLoad(loadArgs[0], loadFormat, tableName,
                   loadArgs[1], loadArgs[2])
        .done(function(result) {
            displayNewDataset(tableName);

            // add cli
            var cliOptions = {};
            cliOptions.operation = 'loadDataSet';
            cliOptions.tableName = tableName;

            addCli('Load dataset', cliOptions);
        })
        .fail(function(result) {
            if (result == StatusT.StatusDsInvalidUrl) {
                var text = 'Could not retrieve dataset from file path: ' + 
                            loadURL;
            } else {
                var text = StatusTStr[result];
            }
            $('#tempDSIcon').remove();
            displayErrorMessage(text, $('#filePath'));
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
            case ("zi"): 
                file = "jsonGen"; 
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
        case ("jsonGen"):
            filePath = "jsonGen"; 
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

function displayNewDataset(dsName) {
    $('#tempDSIcon').remove();
    DSObj.create(gDSObj.id++, dsName, gDSObj.curId, false);
    commitDSObjToStorage();
    DSObj.display();
    var lastEleId = gDSObj.id - 1;

    $('#importDataBottomForm').find('button[type=reset]').trigger('click');
    $('#gridView grid-unit[data-dsId="' + lastEleId + '"]').trigger('click');
}

function appendTempDSToList(dsName) {
     var dsDisplay = 
        '<grid-unit id="tempDSIcon" class="ds display inactive">'+
            '<div class="gridIcon"></div>'+
            '<div class="listIcon">'+
                '<span class="icon"></span>'+
            '</div>'+
            '<div id="iconWaiting" class="iconWaiting"></div>'+
            '<div class="label">'+dsName+'</div>'+
        '</grid-unit>';
     $("#gridView").append(dsDisplay);
     if ($('#gridView').hasClass('listView')) {
        $('#iconWaiting').css({
            top: '-8px',
            left: '98px'
        });
     }
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

    $(document).mousedown({target: $target}, hideStatusBox);
    $target.keydown({target: $target}, hideStatusBox);
    $target.focus().addClass('error');
}

function hideStatusBox(event) {
    if ($(event.target).attr('id') != event.data.target.attr('id') 
        || event.type == "keydown") {
        $('#statusBox').attr('class', "");
        $(document).off('mousedown', hideStatusBox);
        event.data.target.off('keydown', hideStatusBox)
                         .removeClass('error');
    }
}