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
        $gridView.find('.active').removeClass('active');
        $(this).addClass('active');
        $deleteFolderBtn.addClass('disabled');
        // folder now do not show anything
        if ($(this).hasClass('folder')) {
            $deleteFolderBtn.removeClass('disabled');
            return;
        }

        var datasetName = $(this).find('.label').data().dsname;
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

    $(".delete").click(function() {
        var dsName = $(this).closest("#contentViewHeader").find("h2").text();
        var $grid = $('#gridView grid-unit .label[data-dsname=' 
                        + dsName + ']').closest('grid-unit');
        $grid.addClass('inactive');
        $grid.addClass('active');   // active means it is clicked
        $grid.append('<div id="iconWaiting" class="iconWaiting"></div>');
        $('#iconWaiting').fadeIn(200);

        function cleanUpDsIcons() {
            var dsId = $grid.attr('data-dsId');
            DSObj.deleteById(dsId);
            $grid.remove();

            $(".datasetTableWrap").filter(
                function() {
                    if ($(this).attr("data-dsname") === dsName) {
                        var tableNum = parseInt($(this).attr('id')
                                       .substring(16));
                        $('#outerColMenu'+tableNum).remove();
                        $(this).remove();
                        return;
                    }
                }
            );
            var $curFolder;
            if (gDSObj.curId == gDSObj.homeId) {
                $curFolder = $gridView;
            } else {
                $curFolder = $('grid-unit[data-dsId="' + gDSObj.curId + '"]');
            }
            if ($curFolder.find('> grid-unit.ds').length > 0) {
                $curFolder.find('> grid-unit.ds:first').click();
            } else {
                $("#importDataButton").click();
            }
            updateDatasetInfoFields(dsName, true, true);
            $('#iconWaiting').remove();
        }
        XcalarDestroyDataset(dsName).done(cleanUpDsIcons);
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
            });
        } else {
            var options = {};
            options.title = 'SEND TO ACTIVE WORKSHEET';
            options.msg = 'Choose a key by clicking on a' +
                          ' selected column in your list';
            options.confirmFunc = function() {
                console.log('test');
            }
            options.isCheckBox = true;
            options.isAlert = true;
            showAlertModal(options);
        } 
    });

    $('#clearDataChart').click(function() {
        resetDataCart();
    });

    $('#selectDSCols').click(function() {
        var table = $('.datasetTableWrap').filter(function() {
            return $(this).css('display') == 'block';
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
            return $(this).css('display') == 'block';
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

function getDatasetSample(datasetName) {
    // Get datasets and names
    XcalarGetDatasets()
    .done(function(datasets) {
        var samples      = {};
        
        for (var i = 0; i < datasets.numDatasets; i++) {
            if (datasetName != datasets.datasets[i].name) {
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
                    jsons[j] =
                      jQuery.parseJSON(records.records[j].kvPairVariable.value);
                    for (var key in jsons[j]) {
                        uniqueJsonKey[key] = "";
                    }
                }
            } else {
                for (var j = 0; j < recordsSize; j++) {
                    jsons[j] =
                         jQuery.parseJSON(records.records[j].kvPairFixed.value);
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
                class="editableHead shoppingCartCol col' + i + '" value="' + key
                       +'"\
                id ="ds'+ datasetId +'cn'+ key +'" readonly="true">\
                <div class="dropdownBox"><span class="innerBox"></span></div>\
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
    var colMenu =  '<ul id="outerColMenu'+ index +'" class="colMenu">\
                    <li class="renameCol">\
                        <span>Rename Column</span>\
                        <ul class="subColMenu">\
                            <li style="text-align: center" class="clickable">\
                            <span>New Column Name</span>\
                            <input type="text" width="100px" value="' +
                            'something' +'"/>\
                            </li>\
                            <div class="subColMenuArea"></div>\
                        </ul>\
                        <div class="dropdownBox"></div>\
                    </li>\
                    <li class="changeDataType">Change Data Type</li>\
                </ul>';
    $('#datasetWrap').append(colMenu);

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

    table.find('.dropdownBox').click(function() { 
        dropdownClick($(this), true);
        updateColMenuInfo($(this));
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
        $(this).blur();
        var newName = $(this).val();
        var colNum = $(this).closest('.colMenu').data('colNum');
        var headInput = $('#dataSetTableWrap'+tableNum)
                        .find('.editableHead.col'+colNum);
        var oldid = headInput.attr("id");
        var oldColName = oldid.substring(oldid.indexOf("cn")+2);
        var dsnumber = parseInt(oldid.substring(2, oldid.indexOf("cn")));
        console.log("Renaming "+oldColName+" to "+ newName);
        XcalarEditColumn(dsnumber, oldColName, newName,
                         DfFieldTypeT.DfString);
        var newId = "ds"+dsnumber+"cn"+newName;
        console.log(newId);
        headInput.attr("id", newId).val(newName); 
        $('#selectedTable'+tableNum).find('.colName').filter(
            function() {
                return $(this).text() == oldColName;
            }
        ).text(newName);
        $('.colMenu').hide();
    });

    // table.find('.changeDataType').click(function() {
    //         //XX to implement changing data types
    // });

    table.find('.editableHead').click(function() {
        checkColumn($(this), SelectUnit.Single);
    });
}

function updateColMenuInfo(el) {
    var tableNum = parseInt(el.closest('.datasetTableWrap').attr('id')
                       .substring(16));
    var menu = $('#outerColMenu'+tableNum);
    var colNum = parseColNum(el.closest('th'));
    var colName = el.siblings('.editableHead').val();
    menu.data('colNum', colNum);
    menu.find('.renameCol input').val(colName);
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

        // add cli
        var cliOptions = {};
        cliOptions.operation = "createTable";
        cliOptions.tableName = tableName;
        cliOptions.col = [];

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

                cliOptions.col.push(colname);

                return (innerDeferred.promise());
            }).apply(this));
        });

        jQuery.when.apply(jQuery, promises)
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

            cliOptions.col.push("DATA");
            return (getDsId(datasetName));
        })
        .then(function(datasetId) {
            datasetId = parseInt(datasetId);
            var columnToIndex = $.trim($(self).find('.keySelected .colName')
                                 .text());

            cliOptions.key = columnToIndex;
            addCli("Send To Worksheet", cliOptions);
            return (XcalarIndexFromDataset(datasetId, columnToIndex,
                                           tableName));
        })
        .then(function() {
            $(document.head).append('<style id="waitCursor" type="text/css">*'+ 
                '{cursor: wait !important;}</style>');
            var keepLastTable = true;
            var additionalTableNum = false;
            return (checkStatus(tableName, gTables.length, keepLastTable, 
                        additionalTableNum));
        })
        .done(function() {
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

    function appendGrid(datasetId) {
        if (!datasetId)
            return;

        var innerPromise = jQuery.Deferred();

        getDsName(datasetId)
        .done(function(dsName) {
            DSObj.create(gDSObj.id++, dsName, gDSObj.curId, false);

            innerPromise.resolve();
        });

        return (innerPromise.promise());
    }


    //Jerene: As discussed, please get datasets from server regardless.
    XcalarGetDatasets()
    .then(function(datasets) {
        var promises = [];
        var isRestore = restoreDSObj(datasets);
        if (!isRestore) {
            console.log("Construct directly from backend");
            var numDatasets = datasets.numDatasets;

            for (var i = 0; i < numDatasets; i++) {
                promises.push(appendGrid(datasets.datasets[i].datasetId));
            };
        }
        return jQuery.when.apply(jQuery, promises);
    })
    .done(function() {
        commitDSObjToStorage(); // commit;
        DSObj.display();
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
