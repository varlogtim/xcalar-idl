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
    for (var i = 0; i<datasets.numDatasets; i++) {
        // This variable should have been stored when the table is loaded.
        // Otherwise, just run this command setDsToName("gdelt", 4)
        // Commit your change by running the command commitToStorage()
        // Alternatively you can just randomly pick a static placeholder name
        var datasetName = getDsName(datasets.datasets[i].datasetId);
        // Gets the first 20 entries and stores it.
        samples[datasetName] = XcalarSample(datasets.datasets[i].datasetId, 20);

        // add the tab and the table for this dataset to shoppingcart div
        addDatasetTable(datasetName, i);
        addSelectedTableHolder(i);
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
    }
    addWorksheetListeners();
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
                    <div class="keyCheckmark">\
                        <div class="keyCheckmarkWrap">\
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

function addWorksheetListeners() {
    $('.worksheetTable .keyCheckmark').click(function() {
        var inputText = $(this).siblings('input').val();
        var index = $(this).closest('.worksheetTable').index();
        var selectedKey = $('#selectedTable'+index).
            find('td:contains('+inputText+')');
        selectedKey.find('.removeKey').click();
    });

    $('.worksheetTable th input').focus(function() {  
        var index = $(this).closest('th').index();
        var tableIndex = $(this).closest('table').index();
        var value = $(this).val();
        highlightColumn($(this));
        $('.keySelected').removeClass('keySelected');
        $('#selectedTable'+tableIndex).find('.keyWrap:contains('+value+')')
            .addClass('keySelected');
    });

    $('.worksheetTable th input').dblclick(function() {
        var input = $(this);
        window.getSelection().removeAllRanges();
        if ($(this).parent().hasClass('keyAdded')) {
            return;
        } else {
            $(this).parent().addClass('keyAdded');
            $(this).attr('readonly', 'true');
        }
        
        var index = $(this).closest('table').index();
        var tabName = $('#worksheetTab'+index+' input').val();
        var selectedTable = $('#selectedTable'+index);
        if (selectedTable.length == 0) {
            selectedTable = addSelectedTable(index, tabName);
        }
        selectedTable.find('tbody').append('\
            <tr><td><div style="font-size:14px;" class="keyWrap">'
                +"<span>"+$(this).val()+"</span>"+
                '<div class="removeKey">+</div>\
                <div class="removeCover"></div>\
            </div></td></tr>');

        $('.keySelected').removeClass('keySelected');
        selectedTable.find('.keyWrap:last').addClass('keySelected');
        selectedTable.find('.keyWrap:last').show(function() {
            $(this).css('font-size', '13px');
        });
        
        selectedTable.find('.removeKey:last').click(function() {
            removeSelectedKey($(this), input);
        });
    });
}

function removeSelectedKey(closeBox, input) {
    input.parent().removeClass('keyAdded');
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
    var newTableCols = [];
    var startIndex = 2;
    $("#selectedDataset table tbody tr td div span").each(function() {
        var colname = $.trim($(this).text());
        var progCol = new ProgCol();
        progCol.index = startIndex;
        progCol.type = "string";
        progCol.name = colname;
        progCol.width = gNewCellWidth;
        progCol.userStr = '"'+colname+'" = pull('+colname+')';
        progCol.func.func = "pull";
        progCol.func.args = [colname];
        progCol.isDark = false;
        var datasetName = $(this).closest('table').find('th').text();
        progCol.datasetId = parseInt(getDsId(datasetName));                  
        newTableCols[startIndex-1] = progCol;
        startIndex++;
    });
    var progCol = new ProgCol();
    progCol.index = startIndex;
    progCol.type = "object";
    progCol.name = "DATA";
    progCol.width = 700;
    progCol.userStr = "DATA = raw()";
    progCol.func.func = "raw";
    progCol.func.args = [];
    progCol.isDark = false;
    newTableCols[startIndex-1] = progCol;
    $("#selectedDataset div table thead tr th").each(function() {
        // XXX: Since the backend has no way of telling me whether or not a
        // particular dataset has been indexed before, I am just going to
        // re-index it. For me to do that, I have to get the datasetid and
        // index it by the first column in the list
        var datasetId = parseInt(getDsId($(this).text()));
        console.log(datasetId);
        var columnToIndex = $(this).parent().parent().parent()
                            .children("tbody").children("tr").children("td")
                            .children("div").children("span")[0].innerHTML;
        console.log(columnToIndex);
        var rand = Math.floor(Math.random() * 100000) + 1;
        var newIndexTable = $(this).text()+rand;
        console.log(newIndexTable);
        XcalarIndexFromDataset(datasetId, columnToIndex, newIndexTable);
    });
    var worksheetName = $("#worksheetBar .tabSelected input").val();
    setIndex(worksheetName, newTableCols);
    commitToStorage();
    // window.location.href="?worksheet="+worksheetName;
    /*
    // XXX: For demo. All hacked up
    var datasets = "csv";
    var hasGdelt = false;
    var hasSP = false;
    var hasYelp = false;
    $("#selectedDataset div table thead tr th").each(function() {
        if ($(this).text().indexOf("gdelt") >= 0) {
            hasGdelt = true;
        }
        if ($(this).text().indexOf("sp500") >= 0) {
            hasSP = true;
        }
        if ($(this).text().indexOf("yelp") >= 0) {
            hasYelp = true;
        }
        if ($(this).text().indexOf("yelp") >= 0) {
            datasets = "json";
        }
    });
    console.log("hasYelp:" +hasYelp+"hasSP"+hasSP+"hasGDelt"+hasGdelt);
    if (hasGdelt && !hasSP && !hasYelp) {
        setIndex("gdelt", newTableCols);
        commitToStorage();
        window.location.href="?tablename=gdelt";
    } else if (hasSP && !hasGdelt && !hasYelp) {
        setIndex("sp500", newTableCols);
        commitToStorage();
        window.location.href="?tablename=sp500";
    } else if (hasSP && hasGdelt && !hasYelp) {
        setIndex("joined", newTableCols);
        commitToStorage();
        window.location.href="?tablename=joined";
    } else if (!hasSP && !hasGdelt && hasYelp) {
        setIndex("joined2", newTableCols);
        commitToStorage();
        window.location.href="?tablename=joined2";
    }
    */
}

function attachShoppingCartListeners() {
    $(".shoppingCartCol").keypress(function(e) {
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
    $(".shoppingCartCol").blur(function(e) {
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
    $("#createButton").click(function() {
        createWorksheet();
    });
    $("#cancelButton").click(function() {
        // $("#modalBackground").hide();
        // $("#shoppingCart").hide();
        window.location.href=""; 
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
    $(".autoGenTable td, th").each(function() {
        $(this).empty().removeClass('selectedCell');
    });

    // Display the shopping cart tabs
    $("#shoppingCart").show();
    getDatasetSamples();
    addTabFunctionality();
    $('.worksheetTable').hide();
    $('.worksheetTable:first').show();
    attachShoppingCartListeners();
    $('#builderTabBar .worksheetTab:first').mousedown();
}

function addTabFunctionality() {
    $('#builderTabBar .worksheetTab').mousedown(function() {
        var index = $(this).parent().index();
        var text = $(this).find('input').val();
        $('.selectedCell').removeClass('selectedCell');
        $('#builderTabBar .worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
        $('.selectedTable th').removeClass('orangeText');
        $('#selectedTable'+index+' th').addClass('orangeText');

        $('.worksheetTable').hide();
        $('.worksheetTable:nth-child('+(index+1)+')').show();
    });

    $('#builderTabBar .worksheetTab input').each(function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    $('#builderTabBar .worksheetTab input').on('input', function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

     $('#builderTabBar input').click(function() { 
        $(this).removeAttr('readonly');
    });

    $('#builderTabBar input').dblclick(function() {
        $(this).removeAttr('readonly');
        $(this).focus();
    }).blur(function() {
        $(this).attr('readonly', 'true');
    });

    $('#builderTabBar input').on('input', function() {
        var index = $(this).closest('.tabWrap').index();
        $('#selectedTable'+index+' th').text($(this).val());
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

