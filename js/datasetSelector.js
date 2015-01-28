function setupDSCartButtons() {
    $('#gridView').on('click','grid-unit', function() {
        $('#gridView').find('.active').removeClass('active');
        $(this).addClass('active');
        var datasetName = $(this).find('.label').text();
        var displaying = false;
        $('#datasetWrap').find('.datasetTable').each(function() {
            if (datasetName == $(this).data().dsname) {
                displaying = $(this);
                return;
            }
        });
        $('#importDataView').hide();
        if (!displaying) {
            getDatasetSample(datasetName);
        } else {
            $('.datasetTable').hide();
            displaying.show();
            updateDatasetInfoFields(datasetName);

        }
        
    });

    $("#submitDSTablesBtn").click(function() {
        var keysPresent = true;
        $('#dataCart .selectedTable').not('.deselectedTable').each(
            function() {
                if ($(this).find('.keySelected').length == 0) {
                   keysPresent = false;
                   return false;
                }
            }
        );
        if (keysPresent) {
            createWorksheet();
            resetDataCart();
            $("#workspaceTab").click();
        } else {
            alert('Choose a key by clicking on a selected column in your list');
        } 
    });

    $('#clearDataChart').click(function() {
        resetDataCart();
    });
}

function getDatasetSample(datasetName) {
    // Get datasets and names
    var datasets = XcalarGetDatasets();
    var samples = {};

    for (var i = 0; i<datasets.numDatasets; i++) {
        if (datasetName != datasets.datasets[i].name) {
            console.log( datasetName,datasets.datasets[i].name)
            continue;
        }

        // var datasetName = getDsName(datasets.datasets[i].datasetId);
       // addSelectedTableHolder(i);


        // Gets the first 20 entries and stores it.
        samples[datasetName] = 
            XcalarSample(datasets.datasets[i].datasetId, 20);


        // add the tab and the table for this dataset to shoppingcart div
        addDatasetTable(datasetName, i);
       
        var records = samples[datasetName].kvPairs;

        if (records.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) {
            var json = $.parseJSON(records.records[0].kvPairVariable.value);
        } else {
            var json = $.parseJSON(records.records[0].kvPairFixed.value);
        }
        addDataSetHeaders(json, datasets.datasets[i].datasetId, i);
        addDataSetRows(records, i);
        addWorksheetListeners(i);
        // addTabFunctionality(i);   
        attachShoppingCartListeners(i);
        updateDatasetInfoFields(datasetName, IsActive.Active);
    } 
}

function addSelectedTable(index, tableName, dsName) {
    html =  '<div data-dsname="'+dsName+'" class="selectedTable" '+
            'id="selectedTable'+index+'">'+
            '<h3>'+tableName+'</h3>'+
            '<ul>'+
            '</ul>'+
            '</div>';
    $('#dataCart').prepend(html);
    selectedTable = $('#selectedTable'+index);
    $('.selectedTable th').removeClass('orangeText');
    selectedTable.find('th').addClass('orangeText');
    return (selectedTable);
}

function addDatasetTable(datasetTitle, tableNumber) { 
    //append the table tabs


    //append the table to datasetbrowser div
    // $('#datasetWrap').empty();
    $('.datasetTable').hide();
    $('#datasetWrap').prepend('\
        <table id="worksheetTable'+tableNumber+'"\
        class="datasetTable dataTable" \
        data-dsname="'+datasetTitle+'"> \
            <thead>\
              <tr>\
              </tr>\
            </thead>\
        </table>');
}

function addDataSetHeaders(json, datasetId, index) {
    var th = "";
    var i = 0;
    for (key in json) {
        th +=  '<th class="table_title_bg col'+i+'">\
                <div class="header">\
                <input spellcheck="false" \
                class="editableHead shoppingCartCol col'+i+'" value="'+key+'"\
                id ="ds'+datasetId+'cn'+key+'">\
                <div class="checkBox"><span class="icon"></span></div>\
                </div>\
            </th>';
        i++;
    }
    $('#worksheetTable'+index+' tr:first').append(th);
}

function addDataSetRows(records, tableNum) {
    var html = "";
    // loop through each row
    for (var i = 0; i<records.numRecords; i++) {
        if (records.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) {
            var key = records.records[i].kvPairVariable.key;
            var jsonValue = records.records[i].kvPairVariable.value;
        } else {
            var key = records.records[i].kvPairFixed.key;
            var jsonValue = records.records[i].kvPairFixed.value;
        }

        var json = $.parseJSON(jsonValue);
        //append the row 
        html += '<tr>';

        // loop through each td, parse object, and add cell content
        var j = 0;
        for (key in json) {
            var value = parseJsonValue(json[key]);
            html += '<td class="col'+j+'">\
                        <div class="addedBarTextWrap">\
                            <div class="addedBarText">'
                            +value+
                            '</div>\
                        </div>\
                    </td>';
            j++;
        }
        html += '</tr>';
    }
    $('#worksheetTable'+tableNum).append(html);
}

function addWorksheetListeners(tableNum) {
    var table = $('#worksheetTable'+tableNum);

    table.find('th input').focus(function() {  
        var index = $(this).closest('th').index();
        var tableIndex = parseInt($(this).closest('.datasetTable')
                .attr('id').substring(14));
        var value = $(this).val();
        $('.colSelected').removeClass('colSelected');
        $('#selectedTable'+tableIndex).find('.colWrap:contains('+value+')')
            .addClass('colSelected');
    });

    table.find('.checkBox').click(function() { 
        var input = $(this).prev();

        if ($(this).parent().hasClass('colAdded')) {
            console.log('already added')
            var index = parseInt($(this).closest('.datasetTable')
                .attr('id').substring(14));
            var inputText = input.val();
            var selectedCol = $('#selectedTable'+index).
                find('.colName:contains('+inputText+')');
            selectedCol.next().trigger('click');
            highlightDatasetColumn(input, IsActive.Active);
            return;
        } else {
            $(this).parent().addClass('colAdded');
            input.attr('readonly', 'true');
            highlightDatasetColumn(input);
        }
        
        var index = parseInt($(this).closest('.datasetTable')
                .attr('id').substring(14));
        var selectedTable = $('#selectedTable'+index);
        if (selectedTable.length == 0) {
            var tabName = $('#worksheetTable'+index+' ').data('dsname');
            var dsName = $('#worksheetTable'+index+' ').data('dsname');

            if ($('.selectedTable h3:contains('+tabName+')').length > 0) {
                tabName += "1";
                //XXX add possibility of multiple similar names
                // recursive?
            }
            
            selectedTable = addSelectedTable(index, tabName, dsName);
        }

       

        var li = '<li style="font-size:14px;" class="colWrap">'+
                '<span class="colName">'+input.val()+'</span>'+
                '<div class="removeCol">'+
                    '<span class="closeIcon"></span>'+
                '</div>'+
                '</li>';
        selectedTable.find('ul').append(li);

        $('.colSelected').removeClass('colSelected');
        selectedTable.find('.colWrap:last').addClass('colSelected');
        selectedTable.find('.colWrap:last').show(function() {
            $(this).css('font-size', '13px');
        });

        selectedTable.find('.colWrap:last').click(function() {     
            $(this).closest('.selectedTable').find('.keySelected')
                .removeClass('keySelected');
            $(this).closest('.selectedTable').find('.colSelected')
                .removeClass('colSelected');
            $(this).addClass('keySelected');
        });
        selectedTable.find('.removeCol:last').click(function() {
            removeSelectedKey($(this), input);
        });
    });
}

function attachShoppingCartListeners(tableNum) {
    var table = $('#worksheetTable'+tableNum);
    table.find(".shoppingCartCol").keypress(function(e) {
        if (e.which === keyCode.Enter) {
            $(this).blur();
        }
    });

    table.find(".shoppingCartCol").change(function() {
        var oldid = $(this).attr("id");
        var oldColName = oldid.substring(oldid.indexOf("cn")+2);
        var dsnumber = parseInt(oldid.substring(2, oldid.indexOf("cn")));
        console.log("Renaming "+oldColName+" to "+$(this).val());
        XcalarEditColumn(dsnumber, oldColName, $(this).val(),
                         DfFieldTypeT.DfString);
        var newId = "ds"+dsnumber+"cn"+$(this).val();
        console.log(newId);
        $(this).attr("id", newId); 
    });
}

function removeSelectedKey(closeBox, input) {
    input.parent().removeClass('colAdded');
    input.removeAttr('readonly');
    if (closeBox.closest('li').siblings().length == 0) {
        closeBox.closest('.selectedTable').remove();
         
    } else {
        closeBox.closest('li').remove();
    }
}

function createWorksheet() {
    $("#dataCart .selectedTable").not('.deselectedTable').each(
    function() {
        // store columns in localstorage using setIndex()
        var newTableCols = [];
        var startIndex = 0;
        var datasetName = $(this).data('dsname');
        var tableName = $(this).find('h3').text();
        var tables = XcalarGetTables();
        var numTables = tables.numTables;
        // check if another table with same name exists so we have to rename
        for (var i = 0; i<numTables; i++) {
            var tName = tables.tables[i].tableName;
            if (tName == tableName) {
                var rand = Math.floor((Math.random() * 100000) + 1);
                tableName += "-"+rand;
            }
        }

        $(this).find('.colName').each(function() {
            var colname = $.trim($(this).text());
            var progCol = new ProgCol();
            progCol.index = startIndex+1;
            progCol.type = "string";
            progCol.name = colname;
            progCol.width = gNewCellWidth;
            progCol.userStr = '"'+colname+'" = pull('+colname+')';
            progCol.func.func = "pull";
            progCol.func.args = [colname];
            progCol.isDark = false;
            progCol.datasetId = parseInt(getDsId(datasetName));                  
            newTableCols[startIndex] = progCol;
            startIndex++;
        });

        var progCol = new ProgCol();
        progCol.index = startIndex+1;
        progCol.type = "object";
        progCol.name = "DATA";
        progCol.width = 500;
        progCol.userStr = "DATA = raw()";
        progCol.func.func = "raw";
        progCol.func.args = [];
        progCol.isDark = false;
        newTableCols[startIndex] = progCol;

        setIndex(tableName, newTableCols);
        commitToStorage();

        var datasetId = parseInt(getDsId(datasetName));
        var columnToIndex = $.trim($(this).find('.keySelected .colName').text());
        XcalarIndexFromDataset(datasetId, columnToIndex, tableName);
        $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
       '{cursor: wait !important;}</style>');
        var keepLastTable = true;
        var additionalTableNum = false;
        checkStatus(tableName, gTables.length, keepLastTable, 
                    additionalTableNum);
    });
    
    if (gWorksheetName.length == 0) {
        // addWorksheetTab
        var name = $('#worksheetBar .worksheetTab input').val();
        setWorksheetName(0, name);
    }
}

function resetDataCart() {
    $('.selectedTable').remove();
    $('.worksheetTable input').not('.idField').attr('readonly', false);
    $('.colAdded').removeClass('colAdded');
    $('.selectedCol').removeClass('selectedCol');
}

function setupDatasetList() {
    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    var i;

    for (i = 0; i<numDatasets; i++) {
        var datasetId = datasets.datasets[i].datasetId;
        var dsName = getDsName(datasetId);
        var dsDisplay = '<grid-unit><div class="icon"></div>'+
        '<div class="label">'+dsName+'</div></grid-unit>';
        $("#gridView").append(dsDisplay);
    };
}

function updateDatasetInfoFields(dsName, active) {
    $('#schemaTitle').text(dsName);
    $('#contentViewHeader').find('h2').text(dsName);
    if (active) {
        var numDatasets = XcalarGetDatasets().numDatasets;
        $('#worksheetInfo').find('.numDataStores').text(numDatasets);
    }
}
