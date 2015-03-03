function insertColAtIndex(index, tableNum, obj) {
    for (var i = gTables[tableNum].tableCols.length-1; i>=index; i--) {
        gTables[tableNum].tableCols[i].index += 1;
        gTables[tableNum].tableCols[i+1] = gTables[tableNum].tableCols[i];
    }
    gTables[tableNum].tableCols[index] = obj;
}

function removeColAtIndex(index, tableNum) {
    var removed = gTables[tableNum].tableCols[index];
    for (var i = index+1; i<gTables[tableNum].tableCols.length; i++) {
        gTables[tableNum].tableCols[i].index -= 1;
    }
    gTables[tableNum].tableCols.splice(index, 1);
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
        // addMenuBarTables([gTables[tableNum]], IsActive.Active);
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
        mapColumn(fieldName, mapString, tableNum)
        .done(function() {
            deferred.resolve();
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

function parseCol(funcString, colId, tableNum, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open = funcString.indexOf("\"");
    var close = (funcString.substring(open+1)).indexOf("\"")+open+1;
    var name = funcString.substring(open+1, close);
    var funcSt = funcString.substring(funcString.indexOf("=")+1);
    var progCol;
    if (modifyCol) {
        progCol = gTables[tableNum].tableCols[colId-1];
    } else {
        progCol = new ProgCol();
    }
    // console.log(progCol)
    progCol.userStr = funcString;
    progCol.name = name;
    progCol.func = cleanseFunc(funcSt);
    progCol.index = colId;
    return (progCol);
}

function removeSpaces(str) {
    var start = -1;
    var end = -1;
    for (var i = 0; i<str.length; i++) {
        if (str[i] != " ") {
            start = i;
            break;
        }
    }
    for (var i = str.length-1; i>=0; i--) {
        if (str[i] != " ") {
            end = i;
            break;
        }
    }
    return (str.substring(start, end+1));
}

function cleanseFunc(funcString) {
    var open = funcString.indexOf("(");
    var close = -1;
    for (var i = funcString.length-1; i>open; i--) {
       if (funcString[i] == ")") {
           close = i;
           break;
       }
    }
    var funcName = funcString.substring(0, open);
    funcName = removeSpaces(funcName);
    //XXX $.trim() does the same as removeSpaces, can we use 
    // it in place of removeSpaces?
    var args = (funcString.substring(open+1, close)).split(",");
    for (var i = 0; i<args.length; i++) {
        args[i] = removeSpaces(args[i]);
    }
    return ({func: funcName, args: args});
}

function updateFunctionBar(text) {
    $('#fnBar').val(text);
}

function delCol(colNum, tableNum, resize) {
    var numCol = $("#xcTable"+tableNum+" tr:first th").length;
    var tableWrap = $("#xcTableWrap"+tableNum);
    tableWrap.find('th.col'+colNum+' ,td.col'+colNum).remove();
    removeColAtIndex(colNum-1, tableNum);
    updateMenuBarTable(gTables[tableNum], tableNum);
    for (var i = colNum+1; i<=numCol; i++) {
        tableWrap.find('.col'+i).removeClass('col'+i).addClass('col'+(i-1));
    }
    gRescolDelWidth(colNum, tableNum, resize);
}

function pullCol(key, newColid, tableNum, startIndex, numberOfRows) {
    if (key == "" || key == undefined || /\.([0-9])/.test(key)) {
        //check for dot followed by number (invalid)
        return;
    }
    var table = $("#xcTable"+tableNum);
    var dataCol = table.find("tr:first th").filter(
        function() {
            return $(this).find("input").val() == "DATA";
    });
    colid = parseColNum(dataCol);
    var numRow = -1;
    var startingIndex = -1;

    if (!startIndex) {
        startingIndex = parseInt(table.find("tbody tr:first")
            .attr('class').substring(3)); 
        numRow = table.find("tbody tr").length;
    } else {
        startingIndex = startIndex;
        numRow = numberOfRows||gNumEntriesPerPage;
    } 
    var nested = key.trim().replace(/\]/g, "").replace(/\[/g, ".").split(".");

   // track column type
    var columnType = undefined;
    for (var i =  startingIndex; i<numRow+startingIndex; i++) {
        var jsonStr = table.find('.row'+i+' .col'+colid+' .elementText').text();
        if (jsonStr == "") {
            console.log("Error: pullCol() jsonStr is empty");
            var value = "";
        } else {
            var value = jQuery.parseJSON(jsonStr);
        }
        for (var j = 0; j<nested.length; j++) {
            if ($.isEmptyObject(value) || value[nested[j]] == undefined) {
                value = "";
                break;
            }
            value = value[nested[j]];
        }  
        //define type of the column
        if(value !== "" && columnType !== "mixed") {
            var type = typeof value;
            if (type == "object" && (value instanceof Array)) {
                type = "array";
            }
            if(columnType == undefined) {
                columnType = type;
            }else if(columnType !== type) {
                columnType = "mixed";
            }
        }
        value = parseJsonValue(value);
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+
                value+"</div></div>";
        table.find('.row'+i+' .col'+newColid).html(value);
    }
    if(columnType == undefined) {
        gTables[tableNum].tableCols[newColid - 1].type = "mixed";
    } else {
        gTables[tableNum].tableCols[newColid - 1].type = columnType;
    }

    // add class to both static th and real th
    $('#xcTheadWrap' + tableNum + ' th.col' + newColid +
      ' div.header ul.colMenu')
         .removeClass("mixed")
         .removeClass("string")
         .removeClass("number")
         .removeClass("object")
         .removeClass("array")
         .addClass(columnType);
    table.find('th.col' + newColid + ' div.header ul.colMenu')
         .removeClass("mixed")
         .removeClass("string")
         .removeClass("number")
         .removeClass("object")
         .removeClass("array")
         .addClass(columnType);
}

function pullAllCols(startIndex, jsonData, dataIndex, tableNum, direction) {
    var table = gTables[tableNum];
    var tableCols = table.tableCols;
    var indexedColNum = null;
    var numCols = tableCols.length;
    var numRows = jsonData.length;
    var nestedVals = [];
    var tBodyHTML = "";
    var startIndex = startIndex || 0;
    var columnTypes = [];
   
    for (var i = 0; i < numCols; i++) {
        if ((i != dataIndex) && tableCols[i].func.args) {
            var nested = tableCols[i].func.args[0]
                         .replace(/\]/g, "")
                         .replace(/\[/g, ".")
                         .split(".");
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
    }
    // loop through table tr and start building html
    for (var row = 0; row < numRows; row++) {
        if (jsonData[row] == "") {
            console.log('No DATA found in this row??');
            var dataValue = "";
        } else {
            var dataValue = $.parseJSON(jsonData[row]);
        }

        var rowNum = row+startIndex;
        tBodyHTML += '<tr class="row'+(rowNum)+'">';
        if (gTables[tableNum].bookmarks.indexOf(rowNum) > -1) {
            tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
        } else {
            tBodyHTML += '<td align="center" class="col0">';
        }
        tBodyHTML += '<div class="idWrap">'+
                     '<span class="idSpan" '+
                     'data-toggle="tooltip" data-placement="bottom" '+
                     'title="click to add bookmark">'+
                      (rowNum+1)+'</span>'+
                      '<div class="rowGrab"></div>'+
                      '</div></td>';

        // loop through table tr's tds
        for (var col = 0; col < numCols; col++) { 
            var nested = nestedVals[col];
            var tdValue = dataValue;
            if (col != dataIndex) {
                if (nested == undefined) {
                    console.log('Error this value should not be empty');
                }
                var nestedLength = nested.length;
                for (var i = 0; i<nestedLength; i++) {
                    if ($.isEmptyObject(tdValue) || 
                        tdValue[nested[i]] == undefined) {
                        tdValue = "";
                        break;
                    }
                    tdValue = tdValue[nested[i]];
                }  
                
                // XXX giving classes to table cells may actually be done later
                var indexedColumnClass = "";
                if (col == indexedColNum) {
                    indexedColumnClass = " indexedColumn";
                }
                tBodyHTML += '<td class="'+indexedColumnClass+
                             ' col'+(col+1)+'">'+
                             '<div class="addedBarTextWrap">'+
                             '<div class="addedBarText">';
            } else {
                // make data td;
                tdValue = jsonData[row];
                tBodyHTML += '<td class="col'+(col+1)+' jsonElement">'+
                             '<div data-toggle="tooltip" '+
                             'data-placement="bottom" '+
                             'title="double-click to view" '+
                             'class="elementTextWrap">'+
                             '<div class="elementText">';
            }

            //define type of the column
            if (tdValue !== "" && columnTypes[col] !== "mixed") {
                var type = typeof tdValue;
                if (type == "object" && (tdValue instanceof Array)) {
                    type = "array";
                }
                if(columnTypes[col] == undefined) {
                    columnTypes[col] = type;
                }else if(columnTypes[col] !== type) {
                    columnTypes[col] = "mixed";
                }
            }

            tdValue = parseJsonValue(tdValue);
            tBodyHTML += tdValue+'</div></div></td>';
        }
        tBodyHTML += '</tr>';
    }
    tBodyHTML = $(tBodyHTML);

    if (direction == 1) {
        $('#xcTable'+tableNum).find('tbody').prepend(tBodyHTML);
    } else {
        $('#xcTable'+tableNum).find('tbody').append(tBodyHTML);
    }

    // assign column type class to header menus
    var $table = $('#xcTable'+tableNum);
    var $theadWrap = $('#xcTheadWrap'+tableNum);
    for (var i = 0; i < numCols; i++) {
        $theadWrap.find('th.col' + (i+1) + ' ul.colMenu')
            .removeClass("mixed")
            .removeClass("string")
            .removeClass("number")
            .removeClass("object")
            .removeClass("array")
            .addClass(columnTypes[i]);
        $table.find('th.col' + (i+1) + ' ul.colMenu')
            .removeClass("mixed")
            .removeClass("string")
            .removeClass("number")
            .removeClass("object")
            .removeClass("array")
            .addClass(columnTypes[i]);
    }
    return tBodyHTML;
}

function addCol(colId, tableId, name, options) {
    console.log('addCol')
    //colId will be the column class ex. col2
    //tableId will be the table name  ex. xcTable0
    var tableNum = parseInt(tableId.substring(7));
    var table = $('#'+tableId);
    var tables = $('#'+tableId+', #xcTheadWrap'+tableNum);
    var numCol = table.find("tr:first th").length;
    var colIndex = parseInt(colId.substring(3));
    var newColid = colIndex;
    var options = options || {};
    var width = options.width || gNewCellWidth;
    var resize = options.resize || false;
    var isDark = options.isDark || false;
    var select = options.select || false;
    var inFocus = options.inFocus || false;
    var newProgCol = options.progCol || new ProgCol();
    var indexedColumnClass = "";
    if (options.direction != "L") {
        newColid += 1;
    }
    if (name == null) {
        name = "";
        select = true;
    } else if (name == gTables[tableNum].keyName) {
        indexedColumnClass = " indexedColumn";
    }
    if (select) {
        var color = " selectedCell";
        $('.selectedCell').removeClass('selectedCell');
    } else if (isDark) {
        var color = " unusedCell";
    } else {
        var color = "";
    }

    if (!options.progCol) {
        newProgCol.name = name;
        newProgCol.index = newColid;
        newProgCol.width = width;
        newProgCol.isDark = isDark;
        insertColAtIndex(newColid-1, tableNum, newProgCol);
    }
    for (var i = numCol; i>=newColid; i--) {
        tables.find('.col'+i).removeClass('col'+i).addClass('col'+(i+1));
    }  
    var columnHeadHTML = generateColumnHeadHTML(indexedColumnClass, color,
                       newColid, name, width);
    
    tables.find('.table_title_bg.col'+(newColid-1)).after(columnHeadHTML); 

    addColListeners(newColid, table);

    var numRow = table.find("tbody tr").length;
    var idOfFirstRow = table.find("tbody tr:first").attr("class");
    if (idOfFirstRow) {
        var startingIndex = parseInt(idOfFirstRow.substring(3));
    } else {
        var startingIndex = 1;
    }

    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        var newCellHTML = '<td '+
            'class="'+color+' '+indexedColumnClass+' col'+newColid+'">&nbsp;</td>';
            table.find(".row"+i+" .col"+(newColid-1)).after(newCellHTML);
    }

    if (inFocus) {
        table.find('tr:first .editableHead.col'+newColid).focus();
    }
    matchHeaderSizes(newColid, table);
    checkForScrollBar(tableNum);
}

function generateColumnHeadHTML(indexedColClass, color, newColid, name, width) {
    var columnHeadTd = '<th class="table_title_bg'+color+indexedColClass+
       ' col'+newColid+'" style="width:'+width+'px;">'+
       '<div class="header">'+
       '<div class="dragArea"></div>'+
       '<div class="dropdownBox" data-toggle="tooltip" data-placement="bottom"'+
       'title="view column options">'+
        '<div class="innerBox"></div></div>'+
           '<input autocomplete="on" input spellcheck="false"'+
           'type="text" class="editableHead col'+newColid+'" '+
           'data-toggle="tooltip" data-placement="bottom"'+
           'title="click to edit" value=\'';
    if (!name) {
        columnHeadTd += '"newCol"=map(add(col1, col2))';
    } else {
        columnHeadTd += name;
    }
    columnHeadTd += '\' size="15" placeholder=""/>';
    columnHeadTd += generateColDropDownHTML(newColid);
    columnHeadTd += '</div>'+
       '</th>';
    return (columnHeadTd);
}

function generateColDropDownHTML(newColid) {
    var dropDownHTML = 
        '<ul class="colMenu">'+
            '<li>'+
                'Add a column'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns addColLeft col'+newColid+'">'+
                    'On the left</li>'+
                    '<li class="addColumns col'+newColid+'">On the right</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="dropdownBox"></div>'+
            '</li>'+
            '<li class="deleteColumn col'+newColid+'">Delete column</li>'+
            '<li class="duplicate col'+newColid+'">Duplicate column</li>'+
            '<li class="renameCol col'+newColid+'">Rename column</li>'+
            '<li class="hide col'+newColid+'">Hide column</li>'+
            '<li class="unhide col'+newColid+'">Unhide column</li>'+
            '<li class="sort">Sort'+
                '<ul class="subColMenu">'+
                    '<li class="sort col'+newColid+'">A-Z'+
                    '<span class="sortUp"></span></li>'+
                    '<li class="revSort col'+newColid+'">Z-A'+
                    '<span class="sortDown"></span></li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="dropdownBox"></div>'+
            '</li>'+
            '<li class="aggregate">Aggregate'+
                '<ul class="subColMenu">'+
                    '<li class="aggrOp col'+newColid+'">Max'+
                    '<span class="maxIcon"></span></li>'+
                    '<li class="aggrOp col'+newColid+'">Min'+
                    '<span class="minIcon"></li>'+
                    '<li class="aggrOp col'+newColid+'">Avg'+
                    '<span class="avgIcon"></li>'+
                    '<li class="aggrOp col'+newColid+'">Count'+
                    '<span class="countIcon"></li>'+
                    '<li class="aggrOp col'+newColid+'">Sum'+
                    '<span class="sumIcon"></li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="dropdownBox"></div>'+
            '</li>'+
            '<li class="groupBy col'+newColid+'">Group By'+
                '<ul class="subColMenu">'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="countIcon"></span>Count</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            '<span>New Column Name</span>'+
                            '<input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="avgIcon"></span>Average</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            '<span>New Column Name</span>'+
                            '<input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="sumIcon"></span>Sum</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            '<span>New Column Name</span>'+
                            '<input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="maxIcon"></span>Max</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            '<span>New Column Name</span>'+
                            '<input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="minIcon"></span>Min</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            '<span>New Column Name</span>'+
                            '<input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+

                    '<div class="subColMenuArea"></div>'+
                '</ul>'+
                '<div class="dropdownBox"></div>'+
            '</li>';

    // XXX: HACK: I removed the check for the main col. Also, I should check for
    // whether the type is a string or a int
    if (true) { // This check is here so that you don't have to indent in the
                // in the future. O:D
        dropDownHTML += 
            '<li class="filterWrap col'+newColid+'">Filter'+
                '<ul class="subColMenu">'+
                    '<li class="filter numFilter">Greater Than'+
                        '<span class="greaterThan"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="0"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter numFilter">'+
                        '<span class="greaterEqual"></span>'+
                        'Greater Than Equal To'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="0"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter numFilter">Equals'+
                        '<span class="equal"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="0"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter numFilter">Less Than'+
                        '<span class="lessThan"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="0"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter numFilter">Less Than Equal To'+
                        '<span class="lessEqual"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="0"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter strFilter">Like'+
                        '<span class="like"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter strFilter">Regex'+
                        '<span class="regex"></span>'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value="*"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="filter mixedFilter">Others'+
                        '<ul class="subColMenu">'+
                            '<li><input type="text" value=""/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+
                '<div class="dropdownBox"></div>'+
                '</li>'+
                '<li class="joinList col'+newColid+'">'+'Join';
                            // '<ul class="subColMenu" id="joinTables">';
    }
    // dropDownHTML += '</ul><div class="dropdownBox"></div>'+
    //                 '<div class="subColMenuArea"></div></li>';
    dropDownHTML += '</li>';
    return (dropDownHTML);
}

function hideCol(colid, tableid) {
    $("#xcTable"+tableid+" .table_title_bg.col"+colid).width(10);
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

    $("#xcTable"+tableid+" td .col"+colid).width(10);
    $("#xcTable"+tableid+" .col"+colid+" .dropdownBox").css("right", "0px");
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
    $("#xcTable"+tableid+" .col"+colid+" .dropdownBox").css("right", "3px");

}

function parseColNum(el) {
    var classNames = el.attr('class');
    var index = classNames.indexOf('col');
    var substring = classNames.substring(index+'col'.length);
    return (parseInt(substring));
}
