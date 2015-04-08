function setupDSCartButtons() {
    var $gridView = $('#gridView');
    var $deleteFolderBtn = $('#deleteFolderBtn');

    $('#gridViewWrapper').on('click', function() {
        // this hanlder is called before the following one
        $gridView.find('.active').removeClass('active');
        $deleteFolderBtn.addClass('disabled');
    });

    $gridView.on('click','grid-unit', function(event) {
        event.stopPropagation(); // stop event bubbling
        var $grid = $(this);

        $gridView.find('.active').removeClass('active');
        $grid.addClass('active');
        $deleteFolderBtn.addClass('disabled');
        // folder now do not show anything
        if ($grid.hasClass('folder')) {
            $deleteFolderBtn.removeClass('disabled');
            return;
        }

        var dsObj = DSObj.getById($grid.data().dsid);
        var datasetName = dsObj.name;
        var format = dsObj.attrs.format;
        var $displayedTable = undefined;
        var $tableWraps = $('#datasetWrap').find('.datasetTableWrap');
        $tableWraps.each(function(index, ele) {
            if ($displayedTable != undefined) {
                return;
            }
            var $table = $(ele);
            if (datasetName == $table.data().dsname) {
                $displayedTable = $table;
                return;
            }
        });
        $('#importDataView').hide();
        if ($displayedTable == undefined) {
            getDatasetSample(datasetName, format);
        } else {
            XcalarSetFree(gDatasetBrowserResultSetId)
            .then(function() {
                $tableWraps.hide();
                $displayedTable.show();
                updateDatasetInfoFields(datasetName, format);
            });
        }
    });

    // press enter to remove focue from folder label
    $gridView.on('keypress', 'grid-unit.folder div.label', function(event) {
        if (event.which === keyCode.Enter) {
            event.preventDefault();
            $(this).blur();
        }
    })

    $gridView.on('focus', 'grid-unit.folder div.label', function(event) {
        // select all on focus 
        // Jerene: may need another way to inplement(jquery)
        var div = $(this).get(0);
        window.setTimeout(function() {
            var sel, range;
            if (window.getSelection && document.createRange) {
                range = document.createRange();
                range.selectNodeContents(div);
                sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(div);
                range.select();
            }
        }, 1);
    })

    $gridView.on('blur', 'grid-unit.folder div.label', function(event) {
        var $div = $(event.target);
        DSObj.rename($div);
        this.scrollLeft = 0;    //scroll to the start of text;

    })

    // dbclick grid view folder
    $gridView.on('dblclick', '.folder > .gridIcon, .folder > .dsCount', 
        function(event) {
            var $grid = $(event.target).closest('grid-unit.folder');
            $gridView.find('.active').removeClass('active');
            $deleteFolderBtn.addClass('disabled');
            if ($gridView.hasClass('gridView')) {
                DSObj.changeDir($grid.attr("data-dsId"));
        }
    });

    // click list view folder
    $gridView.on('click', '.folder > .listIcon, .folder > .dsCount',
    function(event) {
        var $grid = $(event.target).closest('grid-unit.folder');

        if ($gridView.hasClass('listView')) {
            $grid.toggleClass("collapse");
        }
    });

    // delete dataset
    $("#dsDelete").click(function() {
        var dsName = $(this).closest("#contentViewHeader").find("h2").text();
        var alertOptions = {};

        // add alert
        alertOptions.title = "DELETE DATASET";
        alertOptions.msg = "Are you sure you want to delete dataset "
                      + dsName + "?";
        alertOptions.isCheckBox = true;
        alertOptions.confirm = function() {
            XcalarSetFree(gDatasetBrowserResultSetId)
            .then(function() {
                deleteDataset(dsName);
            });
        }
        Alert.show(alertOptions);
    });

    $("#submitDSTablesBtn").click(function() {
        var keysPresent = true;
        if ($('#dataCart').find('.selectedTable').length == 0) {
            return false;
        }
        // $('#dataCart .selectedTable').each(
        //     function() {
        //         if ($(this).find('.keySelected').length == 0) {
        //            keysPresent = false;
        //            return false;
        //         }
        //     }
        // );
        if (keysPresent) {
            createWorksheet()
            .always(function() {
                resetDataCart();
            });
        } else {
            var alertOptions = {};
            // add alert
            alertOptions.title = 'SEND TO ACTIVE WORKSHEET';
            alertOptions.msg = 'Choose a key by clicking on a' +
                                ' selected column in your list';
            alertOptions.isCheckBox = true;
            alertOptions.isAlert = true;
            Alert.show(alertOptions);
        } 
    });

    $('#clearDataChart').click(function() {
        resetDataCart();
    });

    $('#selectDSCols').click(function() {
        var table = $('.datasetTableWrap').filter(function() {
            return $(this).css('display') == 'inline-block';
        });
        table.find('thead:first .editableHead').each(function() {
            if (!$(this).parent().hasClass('colAdded')) {
                checkColumn($(this), SelectUnit.All);
                // checkColumn has been modified
            }
        });
    });
    $('#clearDsCols').click(function() {        
        var table = $('.datasetTableWrap').filter(function() {
            return $(this).css('display') == 'inline-block';
        });

        if (table.length == 0) {
            return;
        }

        var tableNum = table.attr('id').substring(16);
        $('#selectedTable'+tableNum).remove();
        table.find('.colAdded').removeClass('colAdded');
        table.find('.selectedCol').removeClass('selectedCol');
        dataCartOverflowShadow();
    });
}

function getDatasetSample(datasetName, format) {
    // Get datasets and names
    XcalarGetDatasets()
    .then(function(datasets) {
        var samples = {};
        
        for (var i = 0; i < datasets.numDatasets; i++) {
            if (datasetName != datasets.datasets[i].name) {
                continue;
            }

            // the reason for this one is, inside XcalarSample.then()
            // variable i is used, since it's async
            // the i is already increased when it's actually being used
            // one way to resolve this is to pass the current i into a closure
            // which keeps the current i value.            
            (function(i) {
                // XcalarSample sets gDatasetBrowserResultSetId
                XcalarSample(datasets.datasets[i].name, 20)
                .then(function(result) {
                    samples[datasetName] = result;

                    // add the tab and the table 
                    // for this dataset to shoppingcart div
                    addDatasetTable(datasetName, i);
                   
                    var records = samples[datasetName].kvPairs;

                    var uniqueJsonKey = {}; // store unique Json key
                    var jsonKeys = [];
                    var jsons = [];  // store all jsons
                    var recordsSize = records.records.length;

                    if (records.recordType ==
                        GenericTypesRecordTypeT.GenericTypesVariableSize) {
                        for (var j = 0; j < recordsSize; j++) {
                            jsons[j] =
                            jQuery.parseJSON(records.records[j].kvPairVariable
                                             .value);
                            for (var key in jsons[j]) {
                                uniqueJsonKey[key] = "";
                            }
                        }
                    } else {
                        for (var j = 0; j < recordsSize; j++) {
                            jsons[j] =
                            jQuery.parseJSON(records.records[j].kvPairFixed
                                             .value);
                            for (var key in jsons[j]) {
                                uniqueJsonKey[key] = "";
                            }
                        }
                    }

                    for (var key in uniqueJsonKey) {
                        jsonKeys.push(key);
                    }
                    
                    addDataSetHeaders(jsonKeys, i);
                    addDataSetRows(jsonKeys,jsons, i);
                    addWorksheetListeners(i);  
                    updateDatasetInfoFields(datasetName, format, IsActive.Active);
                });
            })(i);
        } 
    })
    .fail(function(error) {
        Alert.error("getDatasetSample fails", error);
    });
}

function deleteDataset(dsName) {
    var $grid = $('#gridView grid-unit .label[data-dsname="' + dsName + '"]')
                    .closest('grid-unit');

    $grid.removeClass('active');
    $grid.addClass('inactive');
    $grid.append('<div id="waitingIcon" class="waitingIcon"></div>');

    $('#waitingIcon').fadeIn(200);

    XcalarDestroyDataset(dsName)
    .then(function() {
        // add cli
        var cliOptions = {};
        cliOptions.operation = 'destroyDataSet';
        cliOptions.dsName = dsName;

        Cli.add('Delete DateSet', cliOptions);

        cleanUpDsIcons();
    })
    .fail(function(error) {
        $('#waitingIcon').remove();
        $grid.removeClass('inactive');
        Alert.error("Delete Dataset Fails", error);
    });

    function cleanUpDsIcons() {
        var dsId = $grid.data("dsid");
        DSObj.deleteById(dsId);
        $grid.remove();

        //clear data cart
        $('#dataCart').find('[data-dsname=' + dsName + ']').remove();
        // clear data table
        $(".datasetTableWrap").filter(
            function() {
                var $table = $(this);
                if ($table.data("dsname") === dsName) {
                    var tableNum = parseInt($table.attr('id')
                                   .substring(16));
                    $('#outerColMenu' + tableNum).remove();
                    $table.remove();
                    return;
                }
            }
        );
        var $curFolder;
        if (gDSObj.curId == gDSObj.homeId) {
            $curFolder = $('#gridView');
        } else {
            $curFolder = $('grid-unit[data-dsId="' + gDSObj.curId + '"]');
        }
        if ($curFolder.find('> grid-unit.ds').length > 0) {
            $curFolder.find('> grid-unit.ds:first').click();
        } else {
            $("#importDataButton").click();
        }
        updateDatasetInfoFields(null, null, true, true);
        $('#waitingIcon').remove();
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
    $('.datasetTableWrap').hide();
    var html = '<div id="dataSetTableWrap' + tableNumber + '"\
                    class="datasetTableWrap"\
                    data-dsname="' + datasetTitle + '">\
                    <div class="datasetTbodyWrap">\
                        <table id="worksheetTable' + tableNumber + '"\
                            class="datasetTable dataTable" \
                            data-dsname="' + datasetTitle + '">\
                            <thead>\
                                <tr></tr>\
                            </thead>\
                        </table>\
                    </div>\
                </div>';
    $('#datasetWrap').prepend(html);
}

function addDataSetHeaders(jsonKeys, index) {
    var th = "";
    var key;
    for (var i = 0; i < jsonKeys.length; i++) {
        key = jsonKeys[i];
        th +=  '<th title="' + key + '" class="th col' + i + '">\
                    <div class="header">\
                        <div class="colGrab" \
                            title="Double click to auto resize" \
                            data-toggle="tooltip" \
                            data-placement="top" \
                            data-container="body">\
                        </div>\
                        <div class="flexContainer flexRow">\
                            <div class="flexWrap flex-left">\
                                <span class="type icon"></span>\
                            </div>\
                            <div class="flexWrap flex-mid">\
                                <input spellcheck="false"\
                                    class="editableHead shoppingCartCol col' + i +
                                    '" value="' + key + '" \
                                    readonly="true">\
                            </div>\
                            <div class="flexWrap flex-right">\
                                <span class="tick icon"></span>\
                                <div class="dropdownBox">\
                                    <span class="innerBox"></span>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                </th>';
    }
    var table = $('#worksheetTable' + index);
    var tableWidth = table.width();
    table.find('tr:first').append(th);

    var colMenu = '<ul id="outerColMenu' + index + '" class="colMenu">\
                    <li class="renameCol">\
                        <span>Rename Column</span>\
                        <ul class="subColMenu">\
                            <li style="text-align: center" class="clickable">\
                                <span>New Column Name</span>\
                                <input type="text" width="100px" \
                                   spellcheck="false" />\
                            </li>\
                            <div class="subColMenuArea"></div>\
                        </ul>\
                        <div class="dropdownBox"></div>\
                    </li>\
                    <li class="changeDataType">\
                        <span>Change Data Type</span>\
                        <ul class="subColMenu">';

    // XXX Now Array, Object and Unknown are invalid type to change
    var types = ['Boolean', 'Number', 'String', 'Mixed'];

    for (var i = 0; i < types.length; i ++) {
        var type = types[i];
        colMenu += '<li class="flexContainer flexRow typeList type-' 
                        + type.toLowerCase() + '">\
                        <div class="flexWrap flex-left">\
                            <span class="type icon"></span>\
                        </div>\
                        <div class="flexWrap flex-right">\
                            <span class="label">' + type + '</span>\
                        </div>\
                    </li>';
    }

    colMenu +=  '</ul>\
                <div class="dropdownBox"></div>\
                </ul>';
    $('#datasetWrap').append(colMenu);
}

function addDataSetRows(jsonKeys, jsons, tableNum) {
    var html = "";
    var key;
    var value;

    // track column type
    var columnsType = [];
    for (var i = 0; i < jsonKeys.length; i++) {
        columnsType[i] = "undefined";
    }

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

            if (value !== "" && columnsType[j] !== "mixed") {
                var type = typeof json[key];
                if (type == "object" && (json[key] instanceof Array)) {
                    type = "array";
                }
                if (columnsType[j] == "undefined") {
                    columnsType[j] = type;
                } else if (columnsType[j] !== type) {
                    columnsType[j] = "mixed";
                }
            }

            html += '<td class="col' + j + '">\
                        <div class="addedBarTextWrap">\
                            <div class="addedBarText">'+ 
                                value +
                            '</div>\
                        </div>\
                    </td>';
        }

        html += '</tr>';
    }

    var $worksheetTable = $('#worksheetTable' + tableNum);

    $worksheetTable.find('.header').each(function(index) {
        var $tableHeader = $(this);
        var type = columnsType[index];
        $tableHeader.addClass('type-' + type);
        $tableHeader.data('type', type);
    });

    $worksheetTable.append(html);
    var tableHeight = $worksheetTable.height();
    $worksheetTable.find('.colGrab').height(tableHeight);
}

function addWorksheetListeners(tableNum) {
    var table = $('#dataSetTableWrap'+tableNum);

    table.find('.dropdownBox').click(function() {
        var $dropDownBox = $(this);
        dropdownClick($dropDownBox, true);
        updateColMenuInfo($dropDownBox);
    });
    
    $('#outerColMenu'+tableNum+' li').mouseenter(function() {
            $(this).children('ul').addClass('visible');
            $(this).addClass('selected');
            if (!$(this).hasClass('inputSelected')) {
                $('.inputSelected').removeClass('inputSelected');
            }
        }).mouseleave(function(event) {
            $(this).children('ul').removeClass('visible');
            $(this).removeClass('selected');
    });

    $('#outerColMenu'+tableNum).find('input')
        .focus(function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }).keyup(function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }).blur(function() {
            $(this).parents('li').removeClass('inputSelected')
            .parents('.subColMenu').removeClass('inputSelected');
    });

    $('#outerColMenu'+tableNum).find('.subColMenuArea').mousedown(function() {
        $('.colMenu').hide();
    });

    $('#outerColMenu'+tableNum).find('input').keyup(function(e) {
        if (e.which != keyCode.Enter) {
            return;
        }
        var $input = $(this);
        $input.blur();
        var newName = $input.val();
        var colNum = $input.closest('.colMenu').data('colNum');
        var $tableWrap = $('#dataSetTableWrap' + tableNum);
        var $headInput = $tableWrap.find('.editableHead.col'+colNum);
        var oldColName = $headInput.val();
        var dsName = $(".dbText h2").text();
        console.log("Renaming "+oldColName+" to "+ newName);
        $('.colMenu').hide();

        if (newName !== oldColName) {
            XcalarEditColumn(dsName, oldColName, newName, DfFieldTypeT.DfString)
            .then(function() {
                $headInput.val(newName);
                $headInput.closest('th').attr('title', newName);
                $('#selectedTable'+tableNum).find('.colName').filter(
                    function() {
                        return $(this).text() == oldColName;
                    }
                ).text(newName);

                // add cli
                var dsName = $tableWrap.find('table').data('dsname');
                var cliOptions = {};
                cliOptions.operation = 'renameDatasetCol';
                cliOptions.dsName = dsName;
                cliOptions.colNum = colNum + 1;
                cliOptions.oldColName = oldColName;
                cliOptions.newColName = newName;
                Cli.add('Rename dataset column', cliOptions);
            });
        }
    });

    // Change Data Type
    $('#outerColMenu' + tableNum).children('.changeDataType')
                                 .on('click', '.typeList', function() {
        var $typeList = $(this);
        var newType = $typeList.find('.label')
                               .text()
                               .toLowerCase();
        var colNum = $typeList.closest('.colMenu')
                              .data('colNum');

        var $tableWrap = $('#dataSetTableWrap' + tableNum);
        var $tableHeader = $tableWrap.find(' .col' + colNum + ' .header');

        var $headInput = $tableHeader.find('.editableHead');
        var dsName = $(".dbText h2").text();
        var colName = $headInput.val();
        var oldType = $tableHeader.data('type');
        $('.colMenu').hide();

        var typeId = (function getTypeId(type) {
            switch (type) {
                case 'undefined':
                    return DfFieldTypeT.DfUnknown;
                case 'string':
                    return DfFieldTypeT.DfString;
                case 'number':
                    return DfFieldTypeT.DfFloat64;
                case 'boolean':
                    return DfFieldTypeT.DfBoolean;
                case 'mixed':
                    return DfFieldTypeT.DfMixed;
                default:
                    return -1; // Invalid type
            }
        })(newType);

        if (newType != oldType && typeId >= 0) {
            console.log("Change Type from " + oldType + " to " + newType);
            XcalarEditColumn(dsName, colName, colName,
                             typeId)
            .then(function() {
                $tableHeader.data('type', newType);
                $tableHeader.removeClass('type-' + oldType)
                            .addClass('type-' + newType);

                 // add cli
                var dsName = $tableWrap.find('table').data('dsname');
                var cliOptions = {};
                cliOptions.operation = 'changeDataType';
                cliOptions.dsName = dsName;
                cliOptions.colNum = colNum + 1;
                cliOptions.oldType = oldType;
                cliOptions.newType = newType;
                Cli.add('Change dataset data type', cliOptions);
            });
        }

    });

    table.on('click', '.editableHead', function(event) {
        if (event.shiftKey
            && gLastClickTarget.closest('.datasetTableWrap')[0] == table[0]) {
            
            var startIndex = gLastClickTarget.closest('th').index();
            var endIndex = $(this).closest('th').index();  
            var reverse = false;   
            if (startIndex > endIndex) {
                var temp = endIndex;
                endIndex = startIndex;
                startIndex = temp;
                reverse == true;
            }

            for (var i = startIndex; i <= endIndex; i++) {
                if (table.find('th').eq(i)[0] != 
                    gLastClickTarget.closest('th')[0]) {

                    checkColumn(table.find('th').eq(i).find('.editableHead'), 
                            SelectUnit.Single);
                }
            }
        } else {
            checkColumn($(this), SelectUnit.Single);
        }   
    });

    table.on('click', '.tick, .type', function(event){
        $(this).closest('.flexContainer').find('.editableHead').click();
    });

    table.on('mousedown', '.colGrab', function(event) {
        if (event.which != 1) {
            return;
        }
        gRescolMouseDown($(this), event, {target: 'datastore'});
        dblClickResize($(this), {minWidth: 25});
    });
}

function updateColMenuInfo($dropDownBox) {
    var tableNum = parseInt($dropDownBox.closest('.datasetTableWrap')
                                        .attr('id')
                                        .substring(16));
    var $menu = $('#outerColMenu' + tableNum);
    var $th = $dropDownBox.closest('th');
    var colNum = parseColNum($th);
    var colName = $th.find('.editableHead').val();
    $menu.data('colNum', colNum);
    $menu.find('.renameCol input').val(colName);

    // XXX Just for temporary use, will change the functionality in the future
    var type = $dropDownBox.closest('.header')
                           .attr('data-type');
    if (type === 'undefined' || type === 'array' || type === 'object') {
        $menu.find('.changeDataType')
             .css('display','none');
    } else {
        $menu.find('.changeDataType')
             .css('display','block');
    }
}

function checkColumn(input, selectAll) {
    if (input.parent().hasClass('colAdded') && !selectAll) {
        var index = parseInt(input.closest('.datasetTableWrap')
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
        input.parent().addClass('colAdded');
        highlightDatasetColumn(input);
    }
    
    var index = parseInt(input.closest('.datasetTableWrap')
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

function removeSelectedKey(closeBox, input) {
    input.parent().removeClass('colAdded').parent().removeClass('selectedCol');
    var index = parseColNum(input);
    input.closest('.datasetTableWrap').find('.col'+index)
         .removeClass('selectedCol');
    if (closeBox.closest('li').siblings().length == 0) {
        closeBox.closest('.selectedTable').remove();
         
    } else {
        closeBox.closest('li').remove();
    }
    dataCartOverflowShadow();
}

function createWorksheet() {
    var deferred = jQuery.Deferred();
    var promiseChain = [];

    $("#dataCart").find(".selectedTable").each(function() {
        promiseChain.push((function() {
            var chainDeferred = jQuery.Deferred();
            // store columns in localstorage using setIndex()
            var newTableCols = [];
            var startIndex = 0;
            var datasetName = $(this).data('dsname');
            var tableName = $(this).find('h3').text();
            var self = this;
            var msg = StatusMessageTStr.CreatingTable+': '+tableName;
            StatusMessage.show(msg);
            var rand = Math.floor((Math.random() * 100000) + 1);
            tableName += "-"+rand;

            // add cli
            var cliOptions = {};
            cliOptions.operation = "createTable";
            cliOptions.tableName = tableName;
            cliOptions.col = [];

            $(self).find('.colName').each(function() {
                var colname = $.trim($(this).text());
                var progCol = new ProgCol();
                progCol.index = ++startIndex;
                progCol.name = colname;
                progCol.width = gNewCellWidth;
                progCol.userStr = '"'+colname+'" = pull('+colname+')';
                progCol.func.func = "pull";
                progCol.func.args = [colname];
                progCol.isDark = false;

                var currentIndex = startIndex - 1;
                newTableCols[currentIndex] = progCol;
                cliOptions.col.push(colname);
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

            cliOptions.col.push("DATA");
            
            var columnToIndex = 
                $.trim($(self).find('.keySelected .colName').text());

            cliOptions.key = columnToIndex;
            

            XcalarMakeResultSetFromDataset(datasetName)
            .then(function(result) {
                gMetaTable[tableName] = {};
                gMetaTable[tableName].resultSetId = result.resultSetId;
                gMetaTable[tableName].numEntries = result.numEntries;
                gMetaTable[tableName].datasetName = datasetName;
                gMetaTable[tableName].isTable = false;

                setIndex(tableName, newTableCols);
                return (refreshTable(tableName, gTables.length, true,
                                     false));
            })
            .then(function() {
                commitToStorage();
                Cli.add("Send To Worksheet", cliOptions);
                StatusMessage.success(msg);
                chainDeferred.resolve();
            })
            .fail(function(error) {
                StatusMessage.fail(StatusMessageTStr.TableCreationFailed, msg);
                chainDeferred.reject(error);
            });
            return (chainDeferred.promise());
        }).bind(this));
    });

    showWaitCursor();

    chain(promiseChain)
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error){
        Alert.error("Create work sheet fails", error);
        deferred.reject(error);
    })
    .always(function() {
        removeWaitCursor();
    });

    return (deferred.promise());
}

function resetDataCart() {
    $('.selectedTable').remove();
    $('.colAdded').removeClass('colAdded');
    $('.selectedCol').removeClass('selectedCol');

    dataCartOverflowShadow();
}

function setupDatasetList() {
    var deferred = jQuery.Deferred();
    var $gridView = $("#gridView");
    $gridView.addClass("gridView"); // default open gridView
    
    dsBtnInitizlize($('#gridViewButtonArea'));
    gDSInitialization();

    // Jerene: As discussed, please get datasets from server regardless.
    XcalarGetDatasets()
    .then(function(datasets) {
        var isRestore = restoreDSObj(datasets);
        if (!isRestore) {
            console.log("Construct directly from backend");
            var numDatasets = datasets.numDatasets;

            for (var i = 0; i < numDatasets; i++) {
                var dataset =  datasets.datasets[i];
                var attrs = {};
                attrs.format = DfFormatTypeTStr[dataset.formatType]
                                .toUpperCase();
                DSObj.create(gDSObj.id++, datasets.datasets[i].name,
                             gDSObj.curId, false, attrs);
            }
        }
        // commitToStorage(AfterStartup.After);
        DSObj.display();
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("setupDatasetList fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function updateDatasetInfoFields(dsName, dsFormat, active, dontUpdate) {
    var deferred = jQuery.Deferred();

    function updateNumDatasets(datasets) {
        var numDatasets = datasets.numDatasets;
        console.log("Updating to:", numDatasets);
        $('#worksheetInfo').find('.numDataStores').text(numDatasets);
        $('#datasetExplore').find('.numDataStores').text(numDatasets);
    }

    if (!dontUpdate) {
        $('#schemaTitle').text(dsName);
        $('#contentViewHeader').find('h2').text(dsName);
        if (dsFormat) {
            $('#schemaFormat').text(dsFormat);
        }
    }
    if (active) {
        XcalarGetDatasets()
        .then(function(datasets) {
            updateNumDatasets(datasets);
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("updateDatasetInfoFields fails!");
            deferred.reject(error);
        });
    } else {
        deferred.resolve();
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
