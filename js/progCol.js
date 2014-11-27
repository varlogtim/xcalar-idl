
function insertColAtIndex(index, obj) {
    for (var i = gTableCols.length-1; i>=index; i--) {
        gTableCols[i].index += 1;
        gTableCols[i+1] = gTableCols[i];
    }
    gTableCols[index] = obj;
}

function removeColAtIndex(index) {
    var removed = gTableCols[index];
    for (var i = index+1; i<gTableCols.length; i++) {
        gTableCols[i].index -= 1;
    }
    gTableCols.splice(index, 1);
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

function execCol(progCol, args) {
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
                startIndex, numberOfRows);
        break;
    case ("raw"):
        console.log("Raw data");
        break;
    case (undefined):
        console.log("Blank col?");
        break;
    default:
        console.log(progCol);
        console.log("No such function yet!"+progCol.func.func
                    + progCol.func.args);
        return;
    }
}

function parseCol(funcString, colId, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open = funcString.indexOf("\"");
    var close = (funcString.substring(open+1)).indexOf("\"")+open+1;
    var name = funcString.substring(open+1, close);
    var funcSt = funcString.substring(funcString.indexOf("=")+1);
    var progCol;
    if (modifyCol) {
        progCol = gTableCols[colId-2];
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
    var args = (funcString.substring(open+1, close)).split(",");
    for (var i = 0; i<args.length; i++) {
        args[i] = removeSpaces(args[i]);
    }
    return ({func: funcName, args: args});
}

function updateFunctionBar(text) {
    $('#fnBar').val(text);
}

function delCol(id, resize) {
    var colid = parseInt(id.substring(11));
    var numCol = $("#autoGenTable tr:first th").length;
    
    $("#headCol"+colid).remove();
    removeColAtIndex(colid-2);
    $("#autoGenTable tr:eq(1) #headCol"+colid).remove();
    for (var i = colid+1; i<=numCol; i++) {
        $("#headCol"+i).attr("id", "headCol"+(i-1));
        $("#closeButton"+i).attr("id", "closeButton"+(i-1));
        $("#addLCol"+i).attr("id", "addLCol"+(i-1));
        $("#addRCol"+i).attr("id", "addRCol"+(i-1));
        $("#rename"+i).attr("id", "rename"+(i-1));
        $("#renameCol"+i).attr("id", "renameCol"+(i-1));
        $('#sort'+i).attr("id", "sort"+(i-1));
        $('#revSort'+i).attr("id", "revSort"+(i-1));
        $('#filter'+i).attr("id", "filter"+(i-1));
        $("#duplicate"+i).attr("id", "duplicate"+(i-1));
        $("#autoGenTable tr:eq(1) #headCol"+i).attr("id", "headCol"+(i-1));
    }
 
    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);

    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        $("#bodyr"+i+"c"+colid).remove();
        for (var j = colid+1; j<=numCol; j++) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j-1));
        }
    }
    gRescolDelWidth(id, resize);
}

function pullCol(key, newColid, startIndex, numberOfRows) {
    if (key == "" || /\.([0-9])/.test(key)) {
        //check for dot followed by number (invalid)
        return;
    }
    var colid = $("#autoGenTable th").filter(
        function() {
            return $(this).find("input").val() == "DATA";
    }).attr("id");
    colid = colid.substring(7);
    var numRow = -1;
    var startingIndex = -1;
    if (!startIndex) {
        var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
        idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
        startingIndex = parseInt(idOfFirstRow);
        numRow = $("#autoGenTable tbody tr").length;
    } else {
        startingIndex = startIndex;
        numRow = numberOfRows||gNumEntriesPerPage;
    } 
    var nested = key.trim().replace(/\]/g, "").replace(/\[/g, ".").split(".");
    
    // store the variable type
    var jsonStr = $("#bodyr"+startingIndex+"c"+colid+ " .elementText").text(); 
    var value = jQuery.parseJSON(jsonStr);
    for (var j = 0; j<nested.length; j++) {
        if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
            value = "";
            break;
        }
        value = value[nested[j]];
    }
    gTableCols[newColid-2].type = (typeof value);
    
    for (var i =  startingIndex; i<numRow+startingIndex; i++) {
        var jsonStr = $("#bodyr"+i+"c"+colid+ " .elementText").text(); 
        var value = jQuery.parseJSON(jsonStr); 
        for (var j = 0; j<nested.length; j++) {
            if (value[nested[j]] == undefined || $.isEmptyObject(value)) {
                value = "";
                break;
            }
            value = value[nested[j]];
        }  
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
        value = '<div class="addedBarTextWrap"><div class="addedBarText">'+
                value+"</div></div>";
        $("#bodyr"+i+"c"+newColid).html(value); 
    } 
}

function addCol(id, name, options) {
    var numCol = $("#autoGenTable tr:first th").length;
    var colid = parseInt(id.substring(7));
    var newColid = colid;
    var options = options || {};
    var width = options.width || gNewCellWidth;
    var resize = options.resize || false;
    var isDark = options.isDark || false;
    var select = options.select || false;
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
        insertColAtIndex(newColid-2, newProgCol);
    }
    for (var i = numCol; i>=newColid; i--) {
        $("#headCol"+i).attr("id", "headCol"+(i+1));
        $("#closeButton"+i).attr("id", "closeButton"+(i+1));
        $("#addRCol"+i).attr("id", "addRCol"+(i+1));
        $("#addLCol"+i).attr("id", "addLCol"+(i+1));
        $("#rename"+i).attr("id", "rename"+(i+1));
        $("#renameCol"+i).attr("id", "renameCol"+(i+1));
        $("#sort"+i).attr("id", "sort"+(i+1));
        $("#revSort"+i).attr("id", "revSort"+(i+1));
        $("#filter"+i).attr("id", "filter"+(i+1));
        $("#duplicate"+i).attr("id", "duplicate"+(i+1));
        $("#autoGenTable tr:eq(1) #headCol"+i).attr("id", "headCol"+(i+1));
    } 
    
    var columnHeadTd = '<th class="table_title_bg '+color+' editableCol'+
        '" id="headCol'+
        newColid+
        '" style="width:'+width+'px;">'+
        '<div class="header">'+
        '<div class="dragArea"></div>'+
        '<div class="dropdownBox"></div>'+
        '<span><input autocomplete="on" type="text" id="rename'+newColid+'" '+
        'class="editableHead" '+
        'value="'+name+'" size="15" placeholder=""/></span>'+
        '</div>'+
        '</th>';
    $("#headCol"+(newColid-1)).after(columnHeadTd); 
    $("#autoGenTable tr:eq(1) #headCol"+(newColid-1)).after(columnHeadTd); 

    var dropDownHTML = '<ul class="colMenu">'+
            '<li>'+
                'Add a column'+
                '<ul class="subColMenu">'+
                    '<li class="addColumns" id="addLCol'+
                    newColid+'">On the left</li>'+
                    '<li class="addColumns" id="addRCol'+
                    newColid+'">On the right</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>'+
            '<li class="deleteColumn" onclick="delCol(this.id);" '+
            'id="closeButton'+newColid+'">Delete column</li>'+
            '<li id="duplicate'+newColid+'">Duplicate column</li>'+
            '<li id="renameCol'+newColid+'">Rename column</li>'+
            '<li class="sort">Sort'+
                '<ul class="subColMenu">'+
                    '<li id="sort'+newColid+'">A-Z</li>'+
                    '<li id="revSort'+newColid+'">Z-A</li>'+
                    '<div class="subColMenuArea"></div>'+
                '</ul>'+ 
                '<div class="rightArrow"></div>'+
            '</li>';
    // XXX: HACK: I removed the check for the main col. Also, I should check for
    // whether the type is a string or a int
    if (true) {
        dropDownHTML += '<li class="filterWrap" id="filter'+newColid+'">Filter'+
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
                        '<li id="join">'+'Join'+
                            '<div class="rightArrow"></div>'+
                            '<ul class="subColMenu">';
        } else {
        dropDownHTML += '<li class="filterWrap" id="filter'+newColid+'">Filter'+
                        '<ul class="subColMenu">'+
                            '<li class="filter">Regex'+
                                '<ul class="subColMenu">'+
                                    '<li><input type="text" value="*"/></li>'+
                                '</ul>'+
                                '<div class="rightArrow"></div>'+
                            '</li>'+
                        '</ul>'+
                        '<div class="rightArrow"></div>'+
                        '</li>'+
                        '<li id="join">'+'Join'+
                            '<div class="rightArrow"></div>'+
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
                        '</li>';
    dropDownHTML += '</ul>';
    $('#headCol'+newColid+' .header').append(dropDownHTML);

    addColListeners(newColid);

    var numRow = $("#autoGenTable tbody tr").length;
    var idOfFirstRow = $("#autoGenTable tbody td:first").attr("id").
                       substring(5);
    idOfFirstRow = idOfFirstRow.substring(0, idOfFirstRow.indexOf("c"));
    var startingIndex = parseInt(idOfFirstRow);
    for (var i = startingIndex; i<startingIndex+numRow; i++) {
        for (var j = numCol; j>=newColid; j--) {
            $("#bodyr"+i+"c"+j).attr("id", "bodyr"+i+"c"+(j+1));
            // every column after the new column gets id shifted +1;
        }
        var newCellHTML = '<td '+
            'class="'+color+'" id="bodyr'+i+"c"+(newColid)+
            '">&nbsp;</td>';
            $("#bodyr"+i+"c"+(newColid-1)).after(newCellHTML);
    }

    $("#rename"+newColid).keyup(function(e) {
         updateFunctionBar($(this).val());
        if (e.which==13) {
            var index = parseInt($(this).attr('id').substring(6));
            var progCol = parseCol($(this).val(), index, true);
            execCol(progCol);
            if (progCol.name.length > 0) {
                console.log(progCol.name, 'name')
                $(this).val(progCol.name);
            } else {
                console.log($(this).val(), 'else');
            }
            $(this).blur();
            $(this).closest('th').removeClass('unusedCell');
            $('#autoGenTable td:nth-child('+index+')').removeClass('unusedCell');
        }
    });

    // XXX on.input updates fnbar faster than keyup or keypress
    // keypress/keyup doesn't detect if you're holding down backspace
    // but on.input doesn't detect e.which
    $("#rename"+newColid).on('input', function(e) {
        updateFunctionBar($(this).val());
    });

    if (select) {
        // $('#rename'+newColid).select().focus();
        $('#rename'+newColid).focus();
    }
    resizableColumns();
    matchHeaderSizes();
}
