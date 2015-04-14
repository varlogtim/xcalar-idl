
function setupImportDSForm() {
    $('#fileFormat').find('label').click(function() {
        $('.radio').removeClass('checked');
        $(this).find('.radio').addClass('checked');
    });

    $("#fileFormat input[type=radio]").click(function() {
        if ($(this).attr("id").indexOf("CSV") > -1) {
            $("#fieldDelim").prop("disabled", false);
            $("#lineDelim").prop("disabled", false);
        } else {
            $("#fieldDelim").prop("disabled", true);
            $("#lineDelim").prop("disabled", true);
        }
    });
    $("#fileFormat .dsTypeLabel").click(function() {
        if ($(this).text() == "CSV") {
            $("#fieldDelim").prop("disabled", false);
            $("#lineDelim").prop("disabled", false);
        } else {
            $("#fieldDelim").prop("disabled", true);
            $("#lineDelim").prop("disabled", true);
        }
    });

    $('#importDataBottomForm').find('button[type=reset]').click(function() {
        $('.radio').removeClass('checked');
    });

    $('#importDataForm').on('click', '#fileBrowserBtn', function(event) {
        event.preventDefault();
        event.stopPropagation();
        FileBrowser.show();
    });

    $('#importDataForm').submit(function(event) {
        event.preventDefault();
        var loadURL = jQuery.trim($('#filePath').val());
        var tableName = jQuery.trim($('#fileName').val());
        var loadFormat = $('#fileFormat').find('input[name=dsType]:checked')
                         .val();
        var fieldDelim = $("#fieldDelim").val();
        var lineDelim = $("#lineDelim").val();
       
        console.log(tableName, loadFormat, fieldDelim, lineDelim); 
        if (DSObj.isDataSetNameConflict(tableName)) {
            var text = 'Dataset with the name ' +  tableName + 
                        ' already exits. Please choose another name.';
            StatusBox.show(text, $('#fileName'), true);
            return;
        }
        appendTempDSToList(tableName);

        var msg = StatusMessageTStr.LoadingDataset+": "+tableName
        StatusMessage.show(msg);
        
        XcalarLoad(loadURL, loadFormat, tableName,
                   fieldDelim, lineDelim)
        .then(function(result) {
            displayNewDataset(tableName, loadFormat);

            // add cli
            var cliOptions = {};
            cliOptions.operation = 'loadDataSet';
            cliOptions.dsName = tableName;
            cliOptions.dsFormat = loadFormat;
            Cli.add('Load dataset', cliOptions);
            StatusMessage.success(msg);
        })
        .fail(function(result) {
            var text;
            if (result == StatusT.StatusDsInvalidUrl) {
                text = 'Could not retrieve dataset from file path: ' + loadURL;
            } else {
                text = StatusTStr[result];
            }
            $('#tempDSIcon').remove();
            StatusBox.show(text, $('#filePath'), true);
            StatusMessage.fail(StatusMessageTStr.LoadFailed, msg);
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

function displayNewDataset(dsName, dsFormat) {
    $('#tempDSIcon').remove();
    var attrs = {};
    attrs.format = dsFormat;
    DSObj.create(gDSObj.id++, dsName, gDSObj.curId, false, attrs);
    // commitToStorage();
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
            '<div id="waitingIcon" class="waitingIcon"></div>'+
            '<div class="label">'+dsName+'</div>'+
        '</grid-unit>';
     $("#gridView").append(dsDisplay);
     $('#waitingIcon').fadeIn(200);
}

// StatuxBox Modal
StatusBox = (function(){

    StatusBoxBuilder = function () {};

    var $statusBox = $('#statusBox');
    var self = new StatusBoxBuilder();

    StatusBoxBuilder.prototype.show = function(text, $target, isFormMode) {
        // position error message
        var top = $target[0].getBoundingClientRect().top - 30;
        var right = $(window).width() - 
                    $target[0].getBoundingClientRect().right- 200;
        $statusBox.css({top: top, right: right});

        $statusBox.addClass('error');
        $statusBox.find('.titleText').text('Error');
        $statusBox.find('.message').text(text);

        if (isFormMode) {
            $(document).mousedown({target: $target}, hideStatusBox);
            $target.keydown({target: $target}, hideStatusBox);
            $target.focus().addClass('error');
        } else {
            $(document).mousedown(hideStatusBox);
            $(document).keydown(hideStatusBox);
        }
    }

    function hideStatusBox(event) {
        if (event.data && event.data.target) {
            var id = $(event.target).attr('id');

            if (id === "statusBoxClose" ||
                id != event.data.target.attr('id') || 
                event.type == "keydown") 
            {
                $(document).off('mousedown', hideStatusBox);
                event.data.target.off('keydown', hideStatusBox)
                                 .removeClass('error');
                clear();
            }

        } else {
            $(document).off('mousedown', hideStatusBox);
            $(document).off('keydown', hideStatusBox);
            clear();
        }
    }

    function clear() {
        $statusBox.removeClass();
        $statusBox.find('.titleText').text('');
        $statusBox.find('.message').text('');
    }

    return (self);
})();
