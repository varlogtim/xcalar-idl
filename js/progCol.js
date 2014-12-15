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
        break;
    case ("raw"):
        console.log("Raw data");
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
    var numCol = $("#autoGenTable"+tableNum+" tr:first th").length;
    var table = $("#autoGenTable"+tableNum);
    table.find('th.col'+colNum+' ,td.col'+colNum).remove();
    removeColAtIndex(colNum-1, tableNum);
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
    var table = $("#autoGenTable"+tableNum);
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
    //id will be the column class ex. col2
    //tableId will be the table name  ex. autoGenTable0
    var tableNum = parseInt(tableId.substring(12));
    var numCol = $("#"+tableId+" tr:first th").length;
    var colIndex = parseInt(colId.substring(3));
    var newColid = colIndex;
    var options = options || {};
    var width = options.width || gNewCellWidth;
    var resize = options.resize || false;
    var isDark = options.isDark || false;
    var select = options.select || false;
    var inFocus = options.inFocus || false;
    var newProgCol = options.progCol || new ProgCol();
    if (options.direction != "L") {
        newColid += 1;
    }
    if (name == null) {
        name = "";
        var select = true;
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
        $('#'+tableId+' .col'+i).removeClass('col'+i).addClass('col'+(i+1));
    }  
     var columnHeadTd = '<th class="table_title_bg '+color+
        ' col'+newColid+'" style="width:'+width+'px;" label="click to edit">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox" title="view column options"></div>'+
            '<input autocomplete="on" input spellcheck="false"'+
            'type="text" class="editableHead col'+newColid+'" '+
            'title="click to edit" value="'+name+'" size="15" placeholder=""/>'+
        '</div>'+
        '</th>';
    $('#'+tableId+' .table_title_bg.col'+(newColid-1)).after(columnHeadTd); 

    var dropDownHTML = '<ul class="colMenu">'+
            '<li>'+
                'Add a column'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns addColLeft col'+newColid+'">'+
                    'On the left</li>'+
                    '<li class="addColumns col'+newColid+'">On the right</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>'+
            '<li class="deleteColumn col'+newColid+'">Delete column</li>'+
            '<li class="duplicate col'+newColid+'">Duplicate column</li>'+
            '<li class="renameCol col'+newColid+'">Rename column</li>'+
            '<li class="sort">Sort'+
                '<ul class="subColMenu">'+
                    '<li class="sort col'+newColid+'">A-Z</li>'+
                    '<li class="revSort col'+newColid+'">Z-A</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>';
    // XXX: HACK: I removed the check for the main col. Also, I should check for
    // whether the type is a string or a int
    if (true) {
        dropDownHTML += '<li class="filterWrap col'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Greater Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Greater Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Equals'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Less Than Equal To'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="0"/></li>'+
                                    '<div class="subColMenuArea"></div>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<li class="filter">Regex'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="*"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                            '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="rightArrow"></div>'+
                        '</li>'+
                        '<li class="joinList col'+newColid+'">'+'Join'+
                            '<ul class="subColMenu">';
        }
        var tables = XcalarGetTables();
        var numTables = tables.numTables;
        for (var i = 0; i<numTables; i++) {
            var t = tables.tables[i];
            dropDownHTML += '<li class="join">'+t.tableName+'</li>';
        }
        dropDownHTML +=     '<div class="subColMenuArea"></div>'+
                            '</ul>'+ 
                            '<div class="rightArrow"></div>'+ 
                        '</li>';
    dropDownHTML += '</ul>';
    $('#'+tableId+' .table_title_bg.col'+newColid+' .header')
        .append(dropDownHTML);

    addColListeners(newColid, tableId);

    var numRow = $("#"+tableId+" tbody tr").length;
    var idOfFirstRow = $("#"+tableId+" tbody tr:first").attr("class");
    if (idOfFirstRow) {
        var startingIndex = parseInt(idOfFirstRow.substring(3));
    } else {
        var startingIndex = 1;
    }

    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        var newCellHTML = '<td '+
            'class="'+color+' col'+newColid+'">&nbsp;</td>';
            $("#"+tableId+" .row"+i+" .col"+(newColid-1)).after(newCellHTML);
    }

    if (inFocus) {
        $('#'+tableId+' tr:first .editableHead.col'+newColid).focus();
    }
    matchHeaderSizes(tableNum);
    checkForScrollBar(tableNum);
}

function parseColNum(el) {
    var classNames = el.attr('class');
    var index = classNames.indexOf('col');
    var substring = classNames.substring(index+'col'.length);
    return (parseInt(substring));
}
