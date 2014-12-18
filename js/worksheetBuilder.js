function getWorksheetNames() {
    for (var i = 0; i<gWorksheetName.length; i++) {
        addWorksheetTab(gWorksheetName[i]);
    }
    $("#worksheetBar .worksheetTab:first").click();
}

function setWorksheetNames() {
    for (var i = 0; i<gWorksheetName.length; i++) {
        addWorksheetTab(gWorksheetName[i]);
    }
    $("#worksheetBar .worksheetTab:first").click();
}

function getDatasetSamples() {
    // Get datasets and names
    var datasets = XcalarGetDatasets();
    var samples = {};
    var openedTabs = [];
    var selectedTables = [];
    $('#builderTabBar').find('input').each(function() {
        openedTabs.push($(this).val());
    });
    $('#selectedDataset').find('th').each(function() {
        selectedTables.push($(this).text());
    });
    for (var i = 0; i<datasets.numDatasets; i++) {
        var datasetName = getDsName(datasets.datasets[i].datasetId);

        addSelectedTableHolder(i);

        if (openedTabs.indexOf(datasetName) > -1) {
            // will skip if datasetname has already been added to page
            continue;
        } 
        // Gets the first 20 entries and stores it.
        samples[datasetName] = 
            XcalarSample(datasets.datasets[i].datasetId, 20);

        // add the tab and the table for this dataset to shoppingcart div
        addDatasetTable(datasetName, i);
       
        var records = samples[datasetName].kvPairs;

        if (records.recordType ==
            GenericTypesRecordTypeT.GenericTypesVariableSize) {
            console.log(records.records[0]);
            var json = $.parseJSON(records.records[0].kvPairVariable.value);
        } else {
            var json = $.parseJSON(records.records[0].kvPairFixed.value);
        }
        addDataSetHeaders(json, datasets.datasets[i].datasetId, i);
        addDataSetRows(records, i);
        addWorksheetListeners(i);
        addTabFunctionality(i);   
        attachShoppingCartListeners(i);
    } 
}

function addSelectedTable(index, tabName) {
    $('#selectedTableWrap'+index).append('\
            <table class="dataTable selectedTable" \
            id="selectedTable'+index+'" \
            style="width:0px;">\
                <thead><tr>\
                <th>'+tabName+'</th>\
                </tr></thead>\
                <tbody></tbody>\
            </table>').css('margin-left', '5px');
    selectedTable = $('#selectedTable'+index);
    $('.selectedTable th').removeClass('orangeText');
    selectedTable.find('th').addClass('orangeText');
    selectedTable.width(175);
    return (selectedTable);
}

function addDatasetTable(datasetTitle, tableNumber) { 
    //append the table tabs
    $('#builderTabWrap').append('\
            <div class="tabWrap">\
                <div class="worksheetTab" \
                id="worksheetTab'+tableNumber+'">\
                    <input size="10" type="text" value="'+datasetTitle+'"\
                    readonly>\
                </div>\
            </div>');

    //append the table to datasetbrowser div
     $('#datasetBrowser').append('\
        <table id="worksheetTable'+tableNumber+'"\
        class="worksheetTable dataTable">\
            <thead>\
              <tr>\
                <th style="width:40px;" class="table_title_bg">\
                  <div class="header">\
                    <input value="ID" readonly>\
                  </div>\
                </th>\
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
                    <div class="colCheckmark">\
                        <div class="colCheckmarkWrap">\
                            <span>&#x2713;</span>\
                            <span>+</span>\
                        </div>\
                    </div>\
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
        //append the id cell
        html += '<tr><td>'+(key+1)+'</td>';

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
    table.find('.colCheckmark').click(function() {
        var index = parseInt($(this).closest('.worksheetTable')
                .attr('id').substring(14));
        var inputText = $(this).siblings('input').val();
        var selectedCol = $('#selectedTable'+index).
            find('td:contains('+inputText+')');
        selectedKey.find('.removeCol').click();
    });

    table.find('th input').focus(function() {  
        var index = $(this).closest('th').index();
        var tableIndex = parseInt($(this).closest('.worksheetTable')
                .attr('id').substring(14));
        var value = $(this).val();
        highlightColumn($(this));
        $('.colSelected').removeClass('colSelected');
        $('#selectedTable'+tableIndex).find('.colWrap:contains('+value+')')
            .addClass('colSelected');
    });

    table.find('input').dblclick(function() {
        var input = $(this);
        window.getSelection().removeAllRanges();
        if ($(this).parent().hasClass('colAdded')) {
            return;
        } else {
            $(this).parent().addClass('colAdded');
            $(this).attr('readonly', 'true');
        }
        
        var index = parseInt($(this).closest('.worksheetTable')
                .attr('id').substring(14));
        var selectedTable = $('#selectedTable'+index);
        if (selectedTable.length == 0) {
            var tabName = $('#worksheetTab'+index+' input').val();

            if ($('.selectedTable th:contains('+tabName+')').length > 0) {
                tabName += "1";
                //XXX add possibility of multiple similar names
                // recursive?
            }
            
            selectedTable = addSelectedTable(index, tabName);
        }
        selectedTable.find('tbody').append('\
            <tr><td><div style="font-size:14px;" class="colWrap">'
                +"<span>"+$(this).val()+"</span>"+
                '<div class="removeCol">+</div>\
                <div class="removeCover"></div>\
            </div></td></tr>');

        $('.colSelected').removeClass('colSelected');
        selectedTable.find('.colWrap:last').addClass('colSelected');
        selectedTable.find('.colWrap:last').show(function() {
            $(this).css('font-size', '13px');
        });
        selectedTable.find('.colWrap:last span').click(function() {
            $(this).closest('.selectedTable').find('.keySelected')
                .removeClass('.keySelected');
            $(this).parent().addClass('keySelected');
        });
        selectedTable.find('.removeCol:last').click(function() {
            removeSelectedKey($(this), input);
        });


    });
}

function removeSelectedKey(closeBox, input) {
    input.parent().removeClass('colAdded');
    input.removeAttr('readonly');
    console.log(closeBox.closest('tr').siblings().length);
    if (closeBox.closest('tr').siblings().length == 0) {
        closeBox.closest('.selectedTableWrap')
            .css('margin-left', '0px');
        closeBox.closest('table').width(0);
        setTimeout(function() {
            closeBox.closest('table').remove();
        }, 500);
    } else {
        closeBox.closest('tr').remove();
    }
}

function createWorksheet() {
    $("#selectedDataset .selectedTable").not('.deSelectedTable').each(
    function() {
        // store columns in localstorage using setIndex()
        var newTableCols = [];
        var startIndex = 0;
        var datasetName = $(this).find('th').text();

        $(this).find('tbody span').each(function() {
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
        progCol.width = 700;
        progCol.userStr = "DATA = raw()";
        progCol.func.func = "raw";
        progCol.func.args = [];
        progCol.isDark = false;
        newTableCols[startIndex] = progCol;

        setIndex(datasetName, newTableCols);
        commitToStorage();

        var datasetId = parseInt(getDsId(datasetName));
        var columnToIndex = $(this).find('.keySelected span').html();
        XcalarIndexFromDataset(datasetId, columnToIndex, datasetName);
        $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
       '{cursor: wait !important;}</style>');
        var keepLastTable = true;
        var additionalTableNum = false;
        checkStatus(datasetName, gTables.length, keepLastTable, 
                    additionalTableNum);
    });
    
    $("#modalBackground").hide();
    $("#shoppingCart").hide();
    resetWorksheet();
}

function attachShoppingCartListeners(tableNum) {
    var table = $('#worksheetTable'+tableNum);
    table.find(".shoppingCartCol").keypress(function(e) {
        if (e.which === keyCode.Enter) {
            var oldid = $(this).attr("id");
            var oldColName = oldid.substring(oldid.indexOf("cn")+2);
            var dsnumber = parseInt(oldid.substring(2, oldid.indexOf("cn")));
            console.log("Renaming "+oldColName+" to "+$(this).val());
            XcalarEditColumn(dsnumber, oldColName, $(this).val(),
                             DfFieldTypeT.DfString);
            var newId = "ds"+dsnumber+"cn"+$(this).val();
            console.log(newId);
            $(this).attr("id", newId); 
            $(this).blur();
        }
    });
    table.find(".shoppingCartCol").blur(function(e) {
        if (e.which === keyCode.Enter) {
            var oldid = $(this).attr("id");
            var oldColName = oldid.substring(oldid.indexOf("cn")+2);
            var dsnumber = parseInt(oldid.substring(2, oldid.indexOf("cn")));
            console.log("Renaming "+oldColName+" to "+$(this).val());
            XcalarEditColumn(dsnumber, oldColName, $(this).val(),
                             DfFieldTypeT.DfString);
            var newId = "ds"+dsnumber+"cn"+$(this).val();
            console.log(newId);
            $(this).attr("id", newId); 
            $(this).blur();
        }
    });
}

function addSelectedTableHolder(tableNumber) {
    $('#selectedDataset').append('\
        <div class="selectedTableWrap" \
        id="selectedTableWrap'+tableNumber+'">\
        </div>');
}

function shoppingCart() {
    // Cleanup current table
    // $(".autoGenTable td, th").each(function() {
    //     $(this).empty().removeClass('selectedCell');
    // });

    // Display the shopping cart tabs
    $("#shoppingCart").show();
    updateSelectedTables();
    getDatasetSamples();
    $('.worksheetTable').hide();
    $('.worksheetTable:first').show();
    $('#builderTabBar .worksheetTab:first').mousedown();
}

function updateSelectedTables() {
    for (var i = 0; i < gTables.length; i++) {
        var tableName = gTables.frontTableName;
        addSelectedTableHolder(i);
        var selectedTable = addSelectedTable(i, tableName);
        selectedTable.find('th').removeClass('orangeText');
        selectedTable.removeAttr('id');
        selectedTable.parent().removeAttr('id').addClass('deselectedTable');
        for (var j = 0; j < gTables[i].tableCols.length; j++) {
            if (gTables[i].tableCols[j].name == "DATA") {
                continue;
            }
            selectedTable.find('tbody').append('\
            <tr><td><div style="font-size:13px;" class="colWrap">'
                +'<span>'+gTables[i].tableCols[j].name+'</span>\
            </div></td></tr>');
        }
    }
}

function addTabFunctionality(tableNum) {
    var tabs =  $('#builderTabBar');
    var tab = $('#worksheetTab'+tableNum);
    tab.mousedown(function() {
        var index = parseInt($(this).attr('id').substring(12));
        var text = $(this).find('input').val();
        $('.selectedCell').removeClass('selectedCell');
        $('#builderTabBar .worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
        $('.selectedTable th').removeClass('orangeText');
        $('#selectedTable'+index+' th').addClass('orangeText');

        $('.worksheetTable').hide();
        $('#worksheetTable'+index).show();
    });

    tab.find('input').each(function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    tab.find('input').on('input', function() {
        console.log('hi')
        var size = $(this).val().length;
        var index = parseInt($(this).parent().attr('id').substring(12));
        $(this).attr('size', size);
        $('#selectedTable'+index+' th').text($(this).val());
    });

    tab.find('input').click(function() { 
        $(this).removeAttr('readonly');
    });

    tab.find('input').dblclick(function() {
        $(this).removeAttr('readonly');
        $(this).focus();
    }).blur(function() {
        $(this).attr('readonly', 'true');
    });
}

function addWorksheetTab(value) {
    var tabCount = $('#worksheetBar .worksheetTab').length;
    var text = value || "worksheet "+(tabCount+1);
    if (tabCount > 3) {
        var width = ((1/(tabCount+1)))*65+'%';
        $('.worksheetTab').width(((1/(tabCount+1)))*65+'%');
    } else {
        var width = $('.worksheetTab').width();
    }
    if (value) {
        var marginTop = '0px';
    } else {
        var marginTop = '-26px';
    }
    
    $('#worksheetBar').append('<div class="worksheetTab" '+
                        'style="width:'+width+';'+
                        'margin-top:'+marginTop+';">'+
                            '<input spellcheck="false" type="text" '+
                            'value="'+text+'" '+
                            'size="'+(text.length+1)+'">'+
                            '<div class="deleteWorksheet">+</div>'+
                        '</div>');

    var newTab = $('#worksheetBar .worksheetTab:last');
    var newInput = newTab.find('input');
    var size = getTextWidth(newTab.find('input'));

    newInput.width(size);

    newTab.css('margin-top','0px')
   
    newTab.click(function() {
        $('.worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
    });

    newInput.on('input', function() {
        var width = getTextWidth($(this));
        $(this).width(width);
    });

    newTab.click();
   
    newInput.change(function() {
        var index = $('#worksheetBar .worksheetTab input').index($(this));
        // cool I didn't know you could use .index() like that
        setWorksheetName(index, $(this).val());
        console.log("Changing stored worksheet name");
        commitToStorage();
    });

    newInput.keypress(function(e) {
        if (e.which == keyCode.Enter) {
            $(this).blur();
        }
    });

    newTab.find('.deleteWorksheet').click(function() {
        var tab = $(this).closest('.worksheetTab');
        removeWorksheetName(tab.index());
        tab.remove();
        //XX need to remove all data corresponding to this worksheet
    });

    // $('#modalBackground').show();
    $('body').addClass('hideScroll');
    // shoppingCart();
}

function resetWorksheet() {
    var selectedSets = $('#selectedDataset');
    selectedSets.find('.selectedTable th').removeClass('orangeText');
    selectedSets.find('.selectedTable').each(function() {
        $(this).removeAttr('id');
        $(this).parent().removeAttr('id').addClass('deselectedTable');
        $(this).find('.keySelected').removeClass('.keySelected');
    });
    selectedSets.find('.selectedTableWrap').each(function() {
        if ($(this).children().length == 0) {
            $(this).remove();
        }
    });

    //consider just removing all the elements from above ^ ^ ^ 

    $('.worksheetTable input').attr('readonly', false);
    $('.colAdded').removeClass('colAdded');
}

