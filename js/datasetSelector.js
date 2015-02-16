function setupDSCartButtons() {
    $('#gridView').on('click','grid-unit', function() {
        $('#gridView').find('.active').removeClass('active');
        $(this).addClass('active');
        var datasetName = $(this).find('.label').text();
        var displaying = false;
        $('#datasetWrap').find('.datasetTableWrap').each(function() {
            if (datasetName == $(this).data().dsname) {
                displaying = $(this);
                return;
            }
        });
        $('#importDataView').hide();
        if (!displaying) {
            getDatasetSample(datasetName);
        } else {
            $('.datasetTableWrap').hide();
            displaying.show();
            updateDatasetInfoFields(datasetName);
        }
    });

    $(".delete").click(function() {
        var dsName = $(this).closest("#contentViewHeader").find("h2").text();
        function cleanUpDsIcons() {
            $("#gridView").find('.label').filter(
                function() {
                    if ($(this).text() === dsName) {
                        $(this).closest("grid-unit").remove();
                    }
                }
            );
            $(".datasetTableWrap").filter(
                function() {
                    if ($(this).attr("data-dsname") === dsName) {
                        $(this).remove();
                        return;
                    }
                }
            );

            if ($("#gridView").find("grid-unit").length > 0) {
                $("#gridView").find("grid-unit:first").click();
            } else {
                $("#importDataButton").click();
            }
            updateDatasetInfoFields(dsName, true, true);
        }
        XcalarDestroyDataset(dsName).done(cleanUpDsIcons());
    });

    $("#submitDSTablesBtn").click(function() {
        var keysPresent = true;
        if ($('#dataCart').find('.selectedTable').length == 0) {
            return false;
        }
        $('#dataCart .selectedTable').each(
            function() {
                if ($(this).find('.keySelected').length == 0) {
                   keysPresent = false;
                   return false;
                }
            }
        );
        if (keysPresent) {
            createWorksheet()
            .done(function() {
                resetDataCart();
                $("#workspaceTab").click();
                $('#dagWrap').addClass('hidden');
            });
        } else {
            alert('Choose a key by clicking on a selected column in your list');
        } 
    });

    $('#clearDataChart').click(function() {
        resetDataCart();
    });

    $('#selectDSCols').click(function() {
        var table = $('.datasetTableWrap').filter(function() {
            return $(this).css('display') == 'block';
        });
        table.find('thead:first .checkBox').each(function() {
            if (!$(this).parent().hasClass('colAdded')) {
                checkColumn($(this), SelectUnit.All);
            }
        });
    });
    $('#clearDsCols').click(function() {        
        var table = $('.datasetTableWrap').filter(function() {
            return $(this).css('display') == 'block';
        });

        if (table.length == 0) {
            return;
        }

        var tableNum = table.attr('id').substring(16);
        $('#selectedTable'+tableNum).remove();
        table.find('.colAdded').removeClass('colAdded');
        table.find('.selectedCol').removeClass('selectedCol');
        table.find('input').attr('readonly', false);
        dataCartOverflowShadow();
    });
}

function getDatasetSample(datasetName) {
    // Get datasets and names
    XcalarGetDatasets()
    .done(function(datasets) {
        var samples      = {};
        
        for (var i = 0; i < datasets.numDatasets; i++) {
            if (datasetName != datasets.datasets[i].name) {
                console.log( datasetName,datasets.datasets[i].name)
                continue;
            }

            // Gets the first 20 entries and stores it.
            samples[datasetName] = 
                XcalarSample(datasets.datasets[i].datasetId, 20);


            // add the tab and the table for this dataset to shoppingcart div
            addDatasetTable(datasetName, i);
           
            var records = samples[datasetName].kvPairs;

            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons
            var recordsSize = records.records.length;
            
            if (records.recordType ==
                GenericTypesRecordTypeT.GenericTypesVariableSize) {
                for (var j = 0; j < recordsSize; j++) {
                    jsons[j] = jQuery.parseJSON(records.records[j].kvPairVariable.value);
                    for (var key in jsons[j]) {
                        uniqueJsonKey[key] = "";
                    }
                }
            } else {
                for (var j = 0; j < recordsSize; j++) {
                    jsons[j] = jQuery.parseJSON(records.records[j].kvPairFixed.value);
                    for (var key in jsons[j]) {
                        uniqueJsonKey[key] = "";
                    }
                }
            }

            for (var key in uniqueJsonKey) {
                jsonKeys.push(key);
            }
            
            addDataSetHeaders(jsonKeys, datasets.datasets[i].datasetId, i);
            addDataSetRows(jsonKeys,jsons, i);
            addWorksheetListeners(i);  
            attachShoppingCartListeners(i);
            updateDatasetInfoFields(datasetName, IsActive.Active);
        } 
    });
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
    $('.datasetTableWrap').hide();
    $('#datasetWrap').prepend('\
        <div id="dataSetTableWrap'+tableNumber+'" \
        class="datasetTableWrap" \
        data-dsname="'+datasetTitle+'">\
        <div class="datasetTheadWrap"></div>\
        <div class="datasetTbodyWrap">\
            <table id="worksheetTable'+tableNumber+'" \
            class="datasetTable dataTable" \
            data-dsname="'+datasetTitle+'">\
                <thead>\
                  <tr>\
                  </tr>\
                </thead>\
            </table>\
        </div>\
        </div>');
}

function addDataSetHeaders(jsonKeys, datasetId, index) {
    var th = "";
    var key;
    for (var i = 0; i < jsonKeys.length; i++) {
        key = jsonKeys[i];
        th +=  '<th class="table_title_bg col'+ i +'">\
                <div class="header">\
                <input spellcheck="false" \
                class="editableHead shoppingCartCol col'+ i +'" value="'+ key +'"\
                id ="ds'+ datasetId +'cn'+ key +'">\
                <div class="checkBox"><span class="icon"></span></div>\
                </div>\
            </th>';
    }
    var table = $('#worksheetTable'+index); 
    var tableWidth = table.width();
    table.find('tr:first').append(th);
    var fixedHead = table.find('thead');
    fixedHead.addClass('fixedThead dataTable datasetTable');
    var cloneThead = '<thead class="clonedThead" style="width:'+
                     tableWidth+'px;">' +th+'</thead>';
    fixedHead.after(cloneThead);
    table.parent().siblings('.datasetTheadWrap').append(fixedHead);
}

function addDataSetRows(jsonKeys,jsons, tableNum) {
    var html = "";
    var key;
    var value;
    // loop through each row
    for (var i = 0; i < jsons.length; i++) {
        var json = jsons[i];
        //append the row 
        html += '<tr>';

        // loop through each td, parse object, and add cell content
        for (var j = 0; j < jsonKeys.length; j++) {
            key = jsonKeys[j];
            if (json[key] != undefined) {
                value = parseJsonValue(json[key]);
            } else {
                value = "";
            }

            html += '<td class="col'+ j +'">\
                        <div class="addedBarTextWrap">\
                            <div class="addedBarText">'
                            + value +
                            '</div>\
                        </div>\
                    </td>';
        }
        html += '</tr>';
    }
    $('#worksheetTable'+tableNum).append(html);
}

function addWorksheetListeners(tableNum) {
    var table = $('#dataSetTableWrap'+tableNum);

    table.find('th input').focus(function() {  
        var index = $(this).closest('th').index();
        var tableIndex = parseInt($(this).closest('.datasetTableWrap')
                .attr('id').substring(16));
        var value = $(this).val();
        $('.colSelected').removeClass('colSelected');
        $('#selectedTable'+tableIndex).find('.colWrap').filter(function () {
            return $(this).text() == value;
        }).addClass('colSelected');
    });

    table.find('.checkBox').click(function() { 
        checkColumn($(this), SelectUnit.Single);
    });
}

function checkColumn(column, selectAll) {
    var input = column.prev();

    if (column.parent().hasClass('colAdded') && !selectAll) {
        var index = parseInt(column.closest('.datasetTableWrap')
            .attr('id').substring(16));
        var inputText = input.val();
        var selectedCol = $('#selectedTable'+index).find('.colName')
            .filter(function () {
                return $(this).text() == inputText;
            });
        selectedCol.next().trigger('click');
        highlightDatasetColumn(input, IsActive.Active);
        return;
    } else {
        column.parent().addClass('colAdded');
        input.attr('readonly', 'true');
        highlightDatasetColumn(input);
    }
    
    var index = parseInt(column.closest('.datasetTableWrap')
            .attr('id').substring(16));
    var selectedTable = $('#selectedTable'+index);
    if (selectedTable.length == 0) {
        var tabName = $('#worksheetTable'+index+' ').data('dsname');
        var dsName = $('#worksheetTable'+index+' ').data('dsname');

        if ($('.selectedTable h3').filter(function() {
                return $(this).text() == tabName;
            }).length > 0) {
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
        $(this).addClass('keySelected').addClass('colSelected');
    });
    selectedTable.find('.removeCol:last').click(function() {
        removeSelectedKey($(this), input);
    });
    dataCartOverflowShadow();
}

function attachShoppingCartListeners(tableNum) {
    var table = $('#dataSetTableWrap'+tableNum);
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
    input.parent().removeClass('colAdded').parent().removeClass('selectedCol');
    var index = parseColNum(input);
    input.closest('.datasetTableWrap').find('.col'+index).removeClass('selectedCol');
    input.removeAttr('readonly');
    if (closeBox.closest('li').siblings().length == 0) {
        closeBox.closest('.selectedTable').remove();
         
    } else {
        closeBox.closest('li').remove();
    }
    dataCartOverflowShadow();
}

function createWorksheet() {
    var deferred     = jQuery.Deferred();
    var promiseChain = [];

    $("#dataCart .selectedTable").not('.deselectedTable').each(function() {
        var chainDeferred = jQuery.Deferred();
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

        var promises = [];
        var self     = this;
        $(self).find('.colName').each(function() {
            promises.push((function() {
                var innerDeferred = jQuery.Deferred();

                var colname = $.trim($(this).text());
                var progCol = new ProgCol();
                progCol.index = ++startIndex;
                progCol.type = "string";
                progCol.name = colname;
                progCol.width = gNewCellWidth;
                progCol.userStr = '"'+colname+'" = pull('+colname+')';
                progCol.func.func = "pull";
                progCol.func.args = [colname];
                progCol.isDark = false;

                var currentIndex = startIndex - 1;
                getDsId(datasetName)
                .done(function(id) {
                    progCol.datasetId = parseInt(id);                  
                    newTableCols[currentIndex] = progCol;

                    innerDeferred.resolve();
                });

                return innerDeferred.promise();
            }).apply(this));
        });

        chain(promises)
        .then(function() {
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

            return getDsId(datasetName);
        })
        .then(function(datasetId) {
            datasetId = parseInt(datasetId);
            var columnToIndex = $.trim($(self).find('.keySelected .colName').text());
            XcalarIndexFromDataset(datasetId, columnToIndex, tableName);
            $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
           '{cursor: wait !important;}</style>');
            var keepLastTable = true;
            var additionalTableNum = false;
            checkStatus(tableName, gTables.length, keepLastTable, 
                        additionalTableNum);
            
            chainDeferred.resolve();
        });

        promiseChain.push(chainDeferred.promise());
    });

    chain(promiseChain)
    .then(function() {
        deferred.resolve();
    });

    return (deferred.promise());
}

function resetDataCart() {
    $('.selectedTable').remove();
    $('.datasetTableWrap input').attr('readonly', false);
    $('.colAdded').removeClass('colAdded');
    $('.selectedCol').removeClass('selectedCol');

    dataCartOverflowShadow();
}

function setupDatasetList() {
    var deferred = jQuery.Deferred();

    function appendGrid(datasetId) {
        if (!datasetId)
            return;

        var innerPromise = jQuery.Deferred();

        getDsName(datasetId)
        .done(function(dsName) {
            var dsDisplay = '<grid-unit><div class="gridIcon"></div>'+
            '<div class="listIcon"><span class="icon"></span></div>'+
            '<div class="label">'+dsName+'</div></grid-unit>';
            $("#gridView").append(dsDisplay);

            innerPromise.resolve();
        });

        return (innerPromise.promise());
    }

    XcalarGetDatasets()
    .then(function(datasets) {
        var numDatasets = datasets.numDatasets;
        var i;
        var promises = [];

        for (i = 0; i<numDatasets; i++) {
            promises.push(appendGrid(datasets.datasets[i].datasetId));
        };

        return jQuery.when.apply(jQuery, promises);
    })
    .done(function() {
        deferred.resolve();
    });

    return (deferred.promise());
}

function updateDatasetInfoFields(dsName, active, dontUpdateName) {
    var deferred = jQuery.Deferred();

    function updateNumDatasets(datasets) {
        var numDatasets = datasets.numDatasets;
        console.log("Updating to: "+numDatasets);
        $('#worksheetInfo').find('.numDataStores').text(numDatasets);
        $('#datasetExplore').find('.numDataStores').text(numDatasets);

        deferred.resolve();
    }

    if (!dontUpdateName) {
        $('#schemaTitle').text(dsName);
        $('#contentViewHeader').find('h2').text(dsName);
    }
    if (active) {
        XcalarGetDatasets().done(updateNumDatasets);
    }

    return (deferred.promise());
}

function dataCartOverflowShadow() {
    if ($('#dataCart').height() > $('#dataCartWrap').height()) {
        $('#contentViewRight').find('.buttonArea').addClass('cartOverflow');
    } else {
        $('#contentViewRight').find('.buttonArea').removeClass('cartOverflow');
    }
}

function highlightDatasetColumn(el, active) {
    var index = parseColNum(el);
    var table = el.closest('.datasetTableWrap');
    if (active) {
        table.find('th.col'+index).removeClass('selectedCol');
        table.find('td.col'+index).removeClass('selectedCol');
    } else {
        table.find('th.col'+index).addClass('selectedCol');
        table.find('td.col'+index).addClass('selectedCol');
    }
}