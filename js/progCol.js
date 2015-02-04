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
        break;
    case ("raw"):
        console.log("Raw data");
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
        mapColumn(fieldName, mapString, tableNum);
        break;
    case (undefined):
        // console.log("Blank col?");
        break;
    default:
        console.log(progCol);
        console.log("No such function yet!"+progCol.func.func
                    + progCol.func.args);
        return;
    }
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
    console.log(progCol)
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
    var table = $("#xcTable"+tableNum);
    table.find('th.col'+colNum+' ,td.col'+colNum).remove();
    removeColAtIndex(colNum-1, tableNum);
    updateMenuBarTable(gTables[tableNum], tableNum);
    for (var i = colNum+1; i<=numCol; i++) {
        table.find('.col'+i).removeClass('col'+i).addClass('col'+(i-1));
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
    
    // store the variable type
    var jsonStr = table.find('.row'+startingIndex+' .col'+colid+' .elementText')
                  .text();
    if (jsonStr == "") {
        console.log("Error: pullCol() jsonStr is empty");
        return;
    }
    var value = jQuery.parseJSON(jsonStr);
    for (var j = 0; j<nested.length; j++) {
        if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
            value = "";
            break;
        }
        value = value[nested[j]];
    }
    gTables[tableNum].tableCols[newColid-1].type = (typeof value);
    for (var i =  startingIndex; i<numRow+startingIndex; i++) {
        var jsonStr = table.find('.row'+i+' .col'+colid+' .elementText').text();
        if (jsonStr == "") {
            console.log("Error: pullCol() jsonStr is empty");
        }
        var value = jQuery.parseJSON(jsonStr);
        for (var j = 0; j<nested.length; j++) {
            if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
                value = "";
                break;
            }
            value = value[nested[j]];
        }  

        value = parseJsonValue(value);
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+
                value+"</div></div>";
        table.find('.row'+i+' .col'+newColid).html(value);
    } 
}

function addCol(colId, tableId, name, options) {
    //colId will be the column class ex. col2
    //tableId will be the table name  ex. xcTable0
    var table = $('#'+tableId);
    var tableNum = parseInt(tableId.substring(7));
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
        var select = true;
    } else if (name == gTables[tableNum].keyName) {
        indexedColumnClass = "indexedColumn";
    }
    if (select) {
        var color = "selectedCell";
        $('.selectedCell').removeClass('selectedCell');
    } else if (isDark) {
        var color = "unusedCell";
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
        table.find('.col'+i).removeClass('col'+i).addClass('col'+(i+1));
    }  
     var columnHeadTd = '<th class="table_title_bg '+color+' '+indexedColumnClass+
        ' col'+newColid+'" style="width:'+width+'px;" label="click to edit">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox" title="view column options"></div>'+
            '<input autocomplete="on" input spellcheck="false"'+
            'type="text" class="editableHead col'+newColid+'" '+
            'title="click to edit" value="'+name+'" size="15" placeholder=""/>'+
        '</div>'+
        '</th>';
    table.find('.table_title_bg.col'+(newColid-1)).after(columnHeadTd); 

    var dropDownHTML = '<ul class="colMenu">'+
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
                            'New Column Name</li>'+
                            '<li><input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="avgIcon"></span>Average</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            'New Column Name</li>'+
                            '<li><input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="sumIcon"></span>Sum</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            'New Column Name</li>'+
                            '<li><input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="maxIcon"></span>Max</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            'New Column Name</li>'+
                            '<li><input type="text" width="100px" '+
                                'value="groupBy"/></li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                    '</li>'+
                    '<li class="gb col'+newColid+'"><span>'+
                    '<span class="minIcon"></span>Min</span>'+
                        '<ul class="subColMenu">'+
                            '<li style="text-align: center" class="clickable">'+
                            'New Column Name</li>'+
                            '<li><input type="text" width="100px" '+
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
        dropDownHTML += '<li class="filterWrap col'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Greater Than'+
                                '<span class="greaterThan"></span>'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">'+
                                '<span class="greaterEqual"></span>'+
                                'Greater Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">Equals'+
                                '<span class="equal"></span>'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than'+
                                '<span class="lessThan"></span>'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than Equal To'+
                                '<span class="lessEqual"></span>'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">Regex'+
                                '<span class="regex"></span>'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="*"/></li>'+
                                '</ul>'+
                                '<div class="dropdownBox"></div>'+
                            '</li>'+
                            '<li class="filter">Others'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value=""/></li>'+
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
    table.find('.table_title_bg.col'+newColid+' .header').append(dropDownHTML);

    addColListeners(newColid, tableId);

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
    matchHeaderSizes(tableNum);
    checkForScrollBar(tableNum);
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
    matchHeaderSizes(tableid);
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
