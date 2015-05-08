function insertColAtIndex(index, tableNum, obj) {
    // tableCols is an array of obj
    var tableCols = gTables[tableNum].tableCols;

    for (var i = tableCols.length - 1; i >= index; i--) {
        tableCols[i].index += 1;
        tableCols[i + 1] = tableCols[i];
    }

    tableCols[index] = obj;
}

function removeColAtIndex(index, tableNum) {
    var tableCols = gTables[tableNum].tableCols;
    var removed   = tableCols[index];

    for (var i = index + 1; i < tableCols.length; i++) {
        tableCols[i].index -= 1;
    }

    tableCols.splice(index, 1);

    return (removed);
}

function parsePullColArgs(progCol) {
    if (progCol.func.func != "pull") {
        console.log("Wrong function!");
        return (false);
    }
    if (progCol.func.args.length != 1) {
        console.log("Wrong number of arguments!");
        return (false);
    }
    return (true);
}

function execCol(progCol, tableNum, args) {
    var deferred = jQuery.Deferred();

    switch(progCol.func.func) {
    case ("pull"):
        if (!parsePullColArgs(progCol)) {
            console.log("Arg parsing failed");
        }
        var startIndex;
        var numberOfRows;
        if (args) {
            if (args.index) {
                progCol.index = args.index;
            }
            if (args.startIndex) {
                startIndex = args.startIndex;
            }
            if (args.numberOfRows) {
                numberOfRows = args.numberOfRows;
            }
        }
        if (progCol.isDark) {
            progCol.isDark = false;
        }
        pullCol(progCol.func.args[0], progCol.index,
                tableNum, startIndex, numberOfRows);

        deferred.resolve();
        break;
    case ("raw"):
        console.log("Raw data");
        deferred.resolve();
        break;
    case ("map"):
        var mapString = progCol.userStr.substring(progCol.userStr.indexOf("map",
                                                  progCol.userStr.indexOf("="))
                                                  +4, progCol.userStr.length-1);
        var fieldName = progCol.userStr.substring(0,
                                                 progCol.userStr.indexOf("="));
        mapString = jQuery.trim(mapString);
        fieldName = jQuery.trim(fieldName);
        fieldName = fieldName.replace(/\"/g, "");
        fieldName = jQuery.trim(fieldName);
        progCol.func.func = "pull";
        progCol.func.args[0] = fieldName;
        progCol.func.args.splice(1, progCol.func.args.length-1);
        progCol.isDark = false;
        // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
        //                   fieldName + ")";
        
        xcFunction.map(progCol.index, tableNum, fieldName, mapString)
        .then(deferred.resolve)
        .fail(function(error) {
            console.log("execCol fails!");
            deferred.reject(error);
        });
        
        break;
    case (undefined):
        // console.log("Blank col?");
        deferred.resolve();
        break;
    default:
        console.log(progCol);
        console.log("No such function yet!"+progCol.func.func
                    + progCol.func.args);
        deferred.resolve();
        break;
    }

    return (deferred.promise());
}

function checkSorted(tableNum, index) {
    var deferred = jQuery.Deferred();
    var tableName = gTables[tableNum].backTableName;
    if (gTables[tableNum].isTable) {
        deferred.resolve(tableName);
    } else {
        var datasetName = gTableIndicesLookup[tableName].datasetName;
        var resultSetId = gTables[tableNum].resultSetId;

        XcalarSetFree(resultSetId)
        .then(function() {
            // XXX maybe later we shall change it to delete and refresh
            gTableIndicesLookup[tableName].datasetName = undefined;
            gTableIndicesLookup[tableName].isTable = true;
            return (XcalarIndexFromDataset(datasetName, "recordNum", tableName));
        })
        .then(function() {
            gTables[tableNum].isTable = true;

            return (getResultSet(true, tableName));
        })
        .then(function(resultSet) {
            gTables[tableNum].resultSetId = resultSet.resultSetId;
            
            deferred.resolve(tableName);
        });
    }
    return (deferred.promise());
}

function parseCol(funcString, colId, tableNum, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open   = funcString.indexOf("\"");
    var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
    var name   = funcString.substring(open + 1, close);
    var funcSt = funcString.substring(funcString.indexOf("=") + 1);
    var progCol;

    if (modifyCol) {
        progCol = gTables[tableNum].tableCols[colId-1];
    } else {
        progCol = new ProgCol();
    }
    // console.log(progCol)
    progCol.userStr = funcString;
    progCol.name    = name;
    progCol.func    = cleanseFunc(funcSt);
    progCol.index   = colId;

    return (progCol);
}

function cleanseFunc(funcString) {
    // funcString should be: function(args)
    var open     = funcString.indexOf("(");
    var close    = funcString.lastIndexOf(")");
    var funcName = jQuery.trim(funcString.substring(0, open));
    var args     = (funcString.substring(open+1, close)).split(",");

    for (var i = 0; i < args.length; i++) {
        args[i] = jQuery.trim(args[i]);
    }

    return ({func: funcName, args: args});
}

function checkDuplicateColNames($inputs, $input) {
    // $inputs are the inputs to check names against, $input is the target input
    var name        = jQuery.trim($input.val());
    var isDuplicate = false;
    var title       = "Name already exists, please use another name";

    $inputs.each(function() {
        if (isDuplicate) {
            return;
        }

        var $checkedInput = $(this);

        if (name === $checkedInput.val() && 
            $checkedInput[0] != $input[0]) {
            isDuplicate = true;
        }
    });

    $(".tooltip").hide();
    // temporarily use, will be removed when backend allow name with space
    if (/ +/.test(name) === true) {
        title = "Invalid name, cannot contain spaces between letters"
        isDuplicate = true;
    }

    if (isDuplicate) {
        var container      = $input.closest('.mainPanel').attr('id');
        var $toolTipTarget = $input.parent();

        $toolTipTarget.tooltip({
            "title"    : title,
            "placement": "top",
            "trigger"  : "manual",
            "container": "#" + container,
            "template" : '<div class="tooltip error" role="tooltip">' + 
                            '<div class="tooltip-arrow"></div>' + 
                            '<div class="tooltip-inner"></div>' + 
                         '</div>'
        });

        $toolTipTarget.tooltip('show');
        $input.click(hideTooltip);

        var timeout = setTimeout(function() {
            hideTooltip();
        }, 5000);
    }

    function hideTooltip() {
        $toolTipTarget.tooltip('destroy');
        $input.off('click', hideTooltip);
        clearTimeout(timeout);
    }

    return (isDuplicate);
}

function delCol(colNum, tableNum) {
    var table      = gTables[tableNum];
    var numCols    = table.tableCols.length;
    var $tableWrap = $("#xcTableWrap" + tableNum);

    $tableWrap.find(".col" + colNum).remove();

    removeColAtIndex(colNum - 1, tableNum);

    updateTableHeader(tableNum);
    RightSideBar.updateTableInfo(table);

    for (var i = colNum + 1; i <= numCols; i++) {
        $tableWrap.find(".col" + i)
                  .removeClass("col" + i)
                  .addClass("col" + (i - 1));
    }

    gRescolDelWidth(colNum, tableNum);
}

function delDuplicateCols(index, tableNum, forwardCheck) {
    var index   = index - 1;
    var columns = gTables[tableNum].tableCols;
    var numCols = columns.length;
    var args    = columns[index].func.args;
    var operation;
    var start   = 0;

    if (args) {
        operation = args[0];
    }

    if (forwardCheck) {
        start = index;
    }

    for (var i = start; i < numCols; i++) {
        if (i == index) {
            continue;
        }
        if (columns[i].func.args) {
            if (columns[i].func.args[0] == args
                && columns[i].func.func != "raw") {
                
                delColandAdjustLoop();
            }
        } else if (operation == undefined) {
            delColandAdjustLoop();
        }
    }

    function delColandAdjustLoop() {
        delCol((i+1), tableNum);
        if (i < index) {
            index--;
        }
        numCols--;
        i--;
    }
}

function pullCol(key, newColid, tableNum, startIndex, numberOfRows) {
    if (key == "" || key == undefined || /\.([0-9])/.test(key)) {
        //check for dot followed by number (invalid)
        return;
    }
    
    var $table   = $("#xcTable" + tableNum);
    var $dataCol = $table.find("tr:first th").filter(function() {
            return $(this).find("input").val() == "DATA";
    });

    var colid         = parseColNum($dataCol);
    var numRow        = -1;
    var startingIndex = -1;

    if (!startIndex) {
        startingIndex = parseInt($table.find("tbody tr:first")
                                       .attr('class').substring(3)); 
        numRow = $table.find("tbody tr").length;
    } else {
        startingIndex = startIndex;
        numRow = numberOfRows || gNumEntriesPerPage;
    }

    var nested = key.trim()
                    .replace(/\]/g, "")
                    .replace(/\[/g, ".")
                    .match(/([^\\.]|\\.)+/g);

   // track column type
    var columnType = undefined;

    for (var i = 0; i<nested.length; i++) {
        nested[i] = nested[i].replace(/\\./g, "\.");
    }

    var childOfArray = false;

    for (var i = startingIndex; i < numRow + startingIndex; i++) {
        var jsonStr = $table.find('.row'+i+' .col'+colid+' .elementText').text();
        var value;

        if (jsonStr == "") {
            console.log("Error: pullCol() jsonStr is empty");
            value = "";
        } else {
            try {
                value = jQuery.parseJSON(jsonStr);
            } catch (err) {
                // XXX may need extra handlers to handle the error
                console.error(err, jsonStr);
                value = "";
            }
        }

        for (var j = 0; j < nested.length; j++) {
            if (jQuery.isEmptyObject(value) || value[nested[j]] == undefined) {
                value = "";
                break;
            }
            value = value[nested[j]];

            if (j < nested.length - 1 && !childOfArray) {
                if (typeof value == "object" && (value instanceof Array)) {
                    childOfArray = true;
                }
            }
        }  
        //define type of the column
        if (value !== "" && columnType !== "mixed") {

            var type = typeof value;
            if (type == "object" && (value instanceof Array)) {
                type = "array";
            }
            if (columnType == undefined) {
                columnType = type;
            } else if (columnType !== type) {
                columnType = "mixed";
            }
        }
        value = parseJsonValue(value);
        value = '<div class="addedBarTextWrap">' + 
                    '<div class="addedBarText">' + value + '</div>' + 
                '</div>';
        $table.find('.row'+i+' .col'+newColid).html(value);
    }
    if (columnType == undefined) {
        gTables[tableNum].tableCols[newColid - 1].type = "undefined";
    } else {
        gTables[tableNum].tableCols[newColid - 1].type = columnType;
    }

    // add class to th
    var $header = $table.find('th.col' + newColid + ' div.header');

    $header.removeClass("type-mixed")
           .removeClass("type-string")
           .removeClass("type-number")
           .removeClass("type-object")
           .removeClass("type-array")
           .removeClass("type-boolean")
           .removeClass("type-undefined")
           .removeClass("recordNum")
           .removeClass("childOfArray")
           .addClass('type-' + columnType);
    if (key == "recordNum") {
        $header.addClass('recordNum');
    }
    if (childOfArray) {
        $header.addClass('childOfArray');
    }
    $table.find('th.col' + newColid).removeClass('newColumn');
}

function pullAllCols(startIndex, jsonData, dataIndex, tableNum, direction) {
    var table          = gTables[tableNum];
    var tableCols      = table.tableCols;
    var indexedColNum  = null;
    var numCols        = tableCols.length;
    var numRows        = jsonData.length;
    var nestedVals     = [];
    var tBodyHTML      = "";
    var startIndex     = startIndex || 0;
    var columnTypes    = [];
    var childArrayVals = [];

    for (var i = 0; i < numCols; i++) {
        if ((i != dataIndex) && 
            tableCols[i].func.args && 
            tableCols[i].func.args!= "") 
        {
            var nested = tableCols[i].func.args[0]
                            .replace(/\]/g, "")
                            .replace(/\[/g, ".")
                            .match(/([^\\.]|\\.)+/g);

            for (var j = 0; j < nested.length; j++) {
                nested[j] = nested[j].replace(/\\./g, "\.");
            }

            nestedVals.push(nested);
            // get the column number of the column the table was indexed on
            if (tableCols[i].name == table.keyName) {
                indexedColNum = i;
            }
        } else { // this is the data Column
            nestedVals.push([""]);
        }
        // track column type
        columnTypes.push(undefined);
        childArrayVals.push(false);
    }
    // loop through table tr and start building html
    for (var row = 0; row < numRows; row++) {
        var dataValue;

        if (jsonData[row] == "") {
            console.log('No DATA found in this row??');
            dataValue = "";
        } else {
            try {
                dataValue = jQuery.parseJSON(jsonData[row]);
            } catch(err) {
                // XXX may add extra handlers to handle the error
                console.error(err, jsonData[row]);
                dataValue = "";
            }
        }

        var rowNum = row + startIndex;
        tBodyHTML += '<tr class="row' + (rowNum) + '">';

        if (gTables[tableNum].bookmarks.indexOf(rowNum) > -1) {
            tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
        } else {
            tBodyHTML += '<td align="center" class="col0">';
        }

        tBodyHTML += '<div class="idWrap">'+
                        '<span class="idSpan" '+
                            'data-toggle="tooltip" '+
                            'data-placement="bottom" '+
                            'data-container="body" '+
                            'title="click to add bookmark">'+
                                (rowNum + 1) +
                        '</span>'+
                        '<div class="rowGrab"></div>'+
                      '</div></td>';

        // loop through table tr's tds
        for (var col = 0; col < numCols; col++) { 
            var nested       = nestedVals[col];
            var tdValue      = dataValue;
            var childOfArray = childArrayVals[col];

            if (col != dataIndex) {
                if (nested == undefined) {
                    console.log('Error this value should not be empty');
                }

                var nestedLength = nested.length;
                for (var i = 0; i < nestedLength; i++) {
                    if (jQuery.isEmptyObject(tdValue) || 
                        tdValue[nested[i]] == undefined) 
                    {
                        tdValue = "";
                        break;
                    }
                    
                    tdValue = tdValue[nested[i]];

                    if (i < nestedLength - 1 && !childOfArray) {
                        if (typeof tdValue == "object" && 
                            (tdValue instanceof Array)) 
                        {
                            childArrayVals[col] = true;
                        }
                    }
                }  
                
                // XXX giving classes to table cells may actually be done later
                var indexedColumnClass = "";
                if (col == indexedColNum) {
                    indexedColumnClass = " indexedColumn";
                }

                var textAlignment = "";
                if (tableCols[col].textAlign == "Left") {
                    textAlignment = "textAlignLeft";
                } else if (tableCols[col].textAlign == "Right") {
                    textAlignment = "textAlignRight";
                }

                tBodyHTML += '<td class="' + indexedColumnClass + ' ' + 
                                textAlignment + ' col' + (col + 1) + '">' + 
                                '<div class="addedBarTextWrap">' +
                                    '<div class="addedBarText">';
            } else {
                // make data td;
                tdValue = jsonData[row];
                tBodyHTML += '<td class="col' + (col + 1) + ' jsonElement">' + 
                                '<div data-toggle="tooltip" ' + 
                                    'data-placement="bottom" ' + 
                                    'data-container="body" ' + 
                                    'title="double-click to view" ' + 
                                    'class="elementTextWrap">' + 
                                    '<div class="elementText">';
            }

            //define type of the column
            if (tdValue !== "" && columnTypes[col] !== "mixed") {
                var type = typeof tdValue;
                if (type == "object" && (tdValue instanceof Array)) {
                    type = "array";
                }

                if (columnTypes[col] == undefined) {
                    columnTypes[col] = type;
                } else if (columnTypes[col] !== type) {
                    columnTypes[col] = "mixed";
                }
            }

            tdValue = parseJsonValue(tdValue);
            tBodyHTML += tdValue + '</div></div></td>';
        }
        tBodyHTML += '</tr>';
    }

    var $tBody = $(tBodyHTML);

    if (direction == 1) {
        $('#xcTable' + tableNum).find('tbody').prepend($tBody);
    } else {
        $('#xcTable' + tableNum).find('tbody').append($tBody);
    }

    // assign column type class to header menus
    var $table = $('#xcTable' + tableNum);
    for (var i = 0; i < numCols; i++) {
        var $currentTh = $table.find('th.col' + (i + 1));
        var $header = $currentTh.find('> .header');
        var type = columnTypes[i];
        if (type == undefined) {
            type = "undefined";
        }
        // XXX Fix me if DATA column should not be type object
        if (gTables[tableNum].tableCols[i].name === "DATA") {
            type = "object";
        }
        $header.removeClass("type-mixed")
                .removeClass("type-string")
                .removeClass("type-number")
                .removeClass("type-object")
                .removeClass("type-array")
                .removeClass("type-undefined")
                .removeClass("type-boolean")
                .removeClass("recordNum")
                .removeClass("childOfArray")
                .addClass('type-' + type);
        gTables[tableNum].tableCols[i].type = type;
        if (tableCols[i].name == "recordNum") {
            $header.addClass('recordNum');
        }
        if ($currentTh.hasClass('selectedCell')) {
            highlightColumn($currentTh);
        }
        if (childArrayVals[i]) {
            $header.addClass('childOfArray');
        }
    }

    return ($tBody);
}

function addCol(colId, tableId, name, options) {
    console.log('addCol');
    // colId will be the column class ex. col2
    // tableId will be the table name  ex. xcTable0
    var tableNum    = parseInt(tableId.substring(7));
    var $table      = $('#' + tableId);
    var $tableWrap  = $("#xcTableWrap" + tableNum);
    var table       = gTables[tableNum];
    var numCols     = table.tableCols.length;
    var colIndex    = parseInt(colId.substring(3));
    var newColid    = colIndex;

    var options     = options || {};
    var width       = options.width || gNewCellWidth;
    var resize      = options.resize || false;
    var isDark      = options.isDark || false;
    var select      = options.select || false;
    var inFocus     = options.inFocus || false;
    var newProgCol  = options.progCol || new ProgCol();

    var columnClass;
    var color;

    if (options.direction != "L") {
        newColid += 1;
    }

    if (name == null) {
        name = "";
        select = true;
        columnClass = " newColumn";
    } else if (name == table.keyName) {
        columnClass = " indexedColumn";
    } else {
        columnClass = "";
    }

    if (select) {
        color = " selectedCell";
        $('.selectedCell').removeClass('selectedCell');
    } else if (isDark) {
        color = " unusedCell";
    } else {
        color = "";
    }

    if (!options.progCol) {
        name = name || "newCol";

        newProgCol.name    = name;
        newProgCol.userStr = '"' + name + '" = ';
        newProgCol.index   = newColid;
        newProgCol.width   = width;
        newProgCol.isDark  = isDark;

        insertColAtIndex(newColid - 1, tableNum, newProgCol);
    }
    // change table class before insert a new column
    for (var i = numCols; i >= newColid; i--) {
        $tableWrap.find('.col' + i)
                  .removeClass('col' + i)
                  .addClass('col' + (i + 1));
    }
    // insert new th column
    var columnHeadHTML = generateColumnHeadHTML(columnClass, color,
                                                newColid, newProgCol);
    $tableWrap.find('.th.col' + (newColid - 1)).after(columnHeadHTML);

    // get the first row in UI and start to add td to each row
    var numRow        = $table.find("tbody tr").length;
    var idOfFirstRow  = $table.find("tbody tr:first").attr("class");
    var startingIndex = idOfFirstRow ? parseInt(idOfFirstRow.substring(3)) : 1;

    if (columnClass != " indexedColumn") {
        columnClass = ""; // we don't need to add class to td otherwise
    }

    var newCellHTML = '<td '+ 'class="' + color + ' ' + columnClass + 
                      ' col' + newColid + '">' + 
                        '&nbsp;' + 
                      '</td>';

    for (var i = startingIndex; i < startingIndex + numRow; i++) {
        $table.find(".row" + i + " .col" + (newColid - 1)).after(newCellHTML);
    }

    if (inFocus) {
        $table.find('tr:first .editableHead.col' + newColid).focus();
    }

    updateTableHeader(tableNum);
    RightSideBar.updateTableInfo(table);
    adjustColGrabHeight(tableNum);
    matchHeaderSizes(newColid, $table);
}

function generateColumnHeadHTML(columnClass, color, newColid, option) {
    var columnName = option.name || "newCol";
    var width      = option.width || 0;

    var columnHeadTd = 
        '<th class="th' + color + columnClass +
        ' col' + newColid + '" style="width:' + width + 'px;">' + 
            '<div class="header">' + 
                '<div class="dragArea"></div>' + 
                '<div class="colGrab" ' + 
                     'title="Double click to auto resize" ' + 
                     'data-toggle="tooltip" ' + 
                     'data-placement="top" ' + 
                     'data-container="body">' + 
                '</div>' + 
                '<div class="flexContainer flexRow">' + 
                    '<div class="flexWrap flex-left">' + 
                        '<div class="iconHidden"></div>' + 
                        '<span class="type icon"></span>' + 
                    '</div>' + 
                    '<div class="flexWrap flex-mid">' + 
                        '<input autocomplete="on" spellcheck="false" ' + 
                            'type="text" class="editableHead col' + newColid + 
                            '" data-toggle="tooltip" data-placement="bottom" ' +
                            'title="click to edit" value=' + columnName + 
                            ' size="15" placeholder=""/>' + 
                    '</div>' + 
                    '<div class="flexWrap flex-right">' + 
                        '<div class="dropdownBox" ' + 
                            'data-toggle="tooltip" ' + 
                            'data-placement="bottom" ' + 
                            'data-container="body" '+ 
                            'title="view column options">' + 
                            '<div class="innerBox"></div>' + 
                        '</div>'
                    '</div>' + 
                '</div>' + 
            '</div>' + 
        '</th>';

    return (columnHeadTd);
}

function generateColDropDown(tableNum) {
    var dropDownHTML = 
        '<ul id="colMenu'+tableNum+'" class="colMenu">'+
            '<li>'+
                'Add a column'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns addColLeft">'+
                    'On the left</li>'+
                    '<li class="addColumns">On the right</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="dropdownBox"></div>'+
            '</li>'+
            '<li class="deleteColumn">Delete column</li>'+ 
            '<li class="duplicate">Duplicate column</li>'+
            '<li class="deleteDuplicates">Delete duplicate columns</li>'+ 
            '<li class="renameCol">Rename column</li>'+
            '<li class="hide">Hide column</li>'+ 
            '<li class="unhide">Unhide column</li>'+
            '<li>Text align'+
                '<ul class="subColMenu">'+
                    '<li class="textAlign leftAlign">Left Align</li>'+
                    '<li class="textAlign centerAlign">Center Align</li>'+
                    '<li class="textAlign rightAlign">Right Align</li>'+
                '</ul>'+
                '<div class="dropdownBox"></div>'+
            '</li>';

    // XXX: HACK: I removed the check for the main col. Also, I should check for
    // whether the type is a string or a int
    if (true) { // This check is here so that you don't have to indent in the
                // in the future. O:D
        dropDownHTML += 
            '<li class="joinList">'+'Join</li>'+
            '<li class="operations">'+'Functions</li>'; 
                            // '<ul class="subColMenu" id="joinTables">';
    }
    // dropDownHTML += '</ul><div class="dropdownBox"></div>'+
    //                 '<div class="subColMenuArea"></div></li>';
    dropDownHTML += '</ul>';
    $('#xcTableWrap'+tableNum).append(dropDownHTML);

    return (dropDownHTML);
}

function hideCol(colid, tableid) {
    $("#xcTable"+tableid+" .th.col"+colid).width(10);
    // data column should have more padding and class for tbody is different
    if($("#xcTable"+tableid+" input.col"+colid).hasClass("dataCol")) {
        // the padding pixel may be chosen again
        $("#xcTable"+tableid+" input.col"+colid).css("padding-left", "10px");
        $("#xcTable"+tableid+" .col"+colid+" .elementText").css("padding-left",
    "15px");
    } else {
        $("#xcTable"+tableid+" input.col"+colid).css("padding-left", "6px");
        $("#xcTable"+tableid+" .col"+colid+" .addedBarText").css("padding-left",
    "10px");
    }

    $("#xcTable"+tableid+" td.col"+colid).width(10);
    $("#xcTable"+tableid+" .col"+colid+" .dropdownBox").css("right", "-6px");
    matchHeaderSizes(colid, $('#xcTable'+tableid));
}

function unhideCol(colid, tableid, options) {
    if (options && options.autoResize) {
        autosizeCol($("#xcTable"+tableid+" th.col"+colid),
                    {resizeFirstRow: true, includeHeader: true});
    }

    if($("#xcTable"+tableid+" input.col"+colid).hasClass("dataCol"))  {
        $("#xcTable"+tableid+" .col"+colid+" .elementText").css("padding-left",
    "0px");
    } else {
        $("#xcTable"+tableid+" .col"+colid+" .addedBarText").css("padding-left",
    "0px");
    }

    $("#xcTable"+tableid+" input.col"+colid).css("padding-left", "4px");
    $("#xcTable"+tableid+" .col"+colid+" .dropdownBox").css("right", "-3px");

}

function textAlign(colid, tableid, alignment) {
    if (alignment.indexOf("leftAlign") > -1) {
        alignment = "Left";
    } else if (alignment.indexOf("rightAlign") > -1) {
        alignment = "Right";
    } else {
        alignment = "Center";
    }
    gTables[tableid].tableCols[colid-1].textAlign = alignment;

    $("#xcTable"+tableid).find('td.col'+colid).removeClass('textAlignLeft')
                                              .removeClass('textAlignRight')
                                              .removeClass('textAlignCenter')
                                              .addClass('textAlign'+alignment);
}

function parseColNum($el) {
    var classNames = $el.attr('class');
    var index      = classNames.indexOf('col');
    var substring  = classNames.substring(index + 'col'.length);
    return (parseInt(substring));
}

function parseTableNum($table) {
    // assumes we are passing in a table with an ID 
    // that contains the string 'Table' ex. #xcTable2 or #worksheetTable2
    var tableId  = $table.attr('id');
    var numIndex = tableId.indexOf('Table') + 5; // where tableNum is located
    var tableNum = parseInt(tableId.substring(numIndex));
    return (tableNum);
}

function parseJsonValue(value) {
    if (value == undefined) {
        value = '<span class="undefined">'+value+'</span>';
    } else {
        switch (value.constructor) {
        case (Object):
            if ($.isEmptyObject(value)) {
                value = "";
            } else {
                value = JSON.stringify(value).replace(/,/g, ", ");
            }
            break;
        case (Array):
            value = value.join(', ');
            break;
        default: // leave value as is;
        }
    }
    return (value);
}
