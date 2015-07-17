// this module support column related functions
window.ColManager = (function($, ColManager) {
    // new ProgCol obj
    ColManager.newCol = function(options) {
        var progCol = new ProgCol();

        for (var key in options) {
            progCol[key] = options[key];
        }

        return (progCol);

        // constructor
        function ProgCol() {
            this.index = -1;
            this.name = "New heading";
            this.type = "undefined";
            this.func = {};
            this.width = 0;
            this.userStr = "";
            this.isNewCol = true;
            this.textAlign = "Center";

            return (this);
        }
    };

    // special case, specifically for DATA col
    ColManager.newDATACol = function(index) {
        var progCol = ColManager.newCol({
            "index"  : index,
            "name"   : "DATA",
            "type"   : "object",
            "width"  : 500,    // copy from CSS
            "userStr": "DATA = raw()",
            "func"   : {
                "func": "raw",
                "args": []
            },
            "isNewCol": false
        });

        return (progCol);
    };

    ColManager.setupProgCols = function(tableNum) {
        var keyName = gTables[tableNum].keyName;
        // We cannot rely on addCol to create a new progCol object because
        // add col relies on gTableCol entry to determine whether or not to add
        // the menus specific to the main key
        var newProgCol = ColManager.newCol({
            "index"  : 1,
            "name"   : keyName,
            "width"  : gNewCellWidth,
            "userStr": '"' + keyName + '" = pull(' + keyName + ')',
            "func"   : {
                "func": "pull",
                "args": [keyName]
            },
            "isNewCol": false
        });

        insertColHelper(0, tableNum, newProgCol);
        // is this where we add the indexed column??
        insertColHelper(1, tableNum, ColManager.newDATACol(2));
    };

    ColManager.addCol = function(colId, tableId, name, options) {
        // colId will be the column class ex. col2
        // tableId will be the table name  ex. xcTable0
        var tableNum    = parseInt(tableId.substring(7));
        var $table      = $('#' + tableId);
        var $tableWrap  = $("#xcTableWrap" + tableNum);
        var table       = gTables[tableNum];
        var numCols     = table.tableCols.length;
        var colIndex    = parseInt(colId.substring(3));
        var newColid    = colIndex;

        // options
        options = options || {};
        var width       = options.width || gNewCellWidth;
        // var resize      = options.resize || false;
        var isNewCol    = options.isNewCol || false;
        var select      = options.select || false;
        var inFocus     = options.inFocus || false;
        var newProgCol  = options.progCol;

        var columnClass;
        var color;

        if (options.direction !== "L") {
            newColid += 1;
        }

        if (name == null) {
            name = "";
            select = true;
            columnClass = " newColumn";
        } else if (name === table.keyName) {
            columnClass = " indexedColumn";
        } else {
            columnClass = "";
        }

        if (select) {
            color = " selectedCell";
            $('.selectedCell').removeClass('selectedCell');
        } else if (isNewCol) {
            color = " unusedCell";
        } else {
            color = "";
        }

        if (!newProgCol) {
            name = name || "newCol";

            newProgCol = ColManager.newCol({
                "index"   : newColid,
                "name"    : name,
                "width"   : width,
                "userStr" : '"' + name + '" = ',
                "isNewCol": isNewCol
            });

            insertColHelper(newColid - 1, tableNum, newProgCol);
        }
        // change table class before insert a new column
        for (var i = numCols; i >= newColid; i--) {
            $tableWrap.find('.col' + i)
                      .removeClass('col' + i)
                      .addClass('col' + (i + 1));
        }
        // insert new th column
        options = {"name" : name,
                   "width": width};
        var columnHeadHTML = generateColumnHeadHTML(columnClass, color,
                                                    newColid, options);
        $tableWrap.find('.th.col' + (newColid - 1)).after(columnHeadHTML);

        // get the first row in UI and start to add td to each row
        // var numRow = $table.find("tbody tr").length;
        var idOfFirstRow  = $table.find("tbody tr:first").attr("class");
        var idOfLastRow  = $table.find("tbody tr:last").attr("class");
        var startingIndex = idOfFirstRow ?
                                parseInt(idOfFirstRow.substring(3)) : 1;
        var endingIndex = parseInt(idOfLastRow.substring(3));

        if (columnClass !== " indexedColumn") {
            columnClass = ""; // we don't need to add class to td otherwise
        }

        var newCellHTML = '<td ' + 'class="' + color + ' ' + columnClass +
                          ' col' + newColid + '">' +
                            '&nbsp;' +
                          '</td>';

        var i = startingIndex;
        while (i <= endingIndex) {
            $table.find(".row" + i + " .col" + (newColid - 1))
                  .after(newCellHTML);
            i++;
        }

        if (inFocus) {
            $table.find('tr:first .editableHead.col' + newColid).focus();
        }

        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(table);
        matchHeaderSizes(newColid, $table);
    };

    ColManager.delCol = function(colNum, tableNum) {
        var table     = gTables[tableNum];
        var tableName = table.tableName;
        var colName   = table.tableCols[colNum - 1].name;

        delColHelper(colNum, tableNum);
        // add SQL
        SQL.add("Delete Column", {
            "operation": "delCol",
            "tableName": tableName,
            "colName"  : colName,
            "colIndex" : colNum
        });
    };

    ColManager.reorderCol = function(tableNum, oldIndex, newIndex) {
        var progCol  = removeColHelper(oldIndex, tableNum);

        insertColHelper(newIndex, tableNum, progCol);
        progCol.index = newIndex + 1;
    };

    ColManager.execCol = function(progCol, tableNum, args) {
        var deferred = jQuery.Deferred();
        var userStr;
        var regex;
        var matches;
        var fieldName;

        switch (progCol.func.func) {
            case ("pull"):
                if (!parsePullColArgs(progCol)) {
                    console.error("Arg parsing failed");
                    deferred.reject("Arg parsing failed");
                    break;
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
                if (progCol.isNewCol) {
                    progCol.isNewCol = false;
                }

                pullColHelper(progCol.func.args[0], progCol.index,
                              tableNum, startIndex, numberOfRows);

                deferred.resolve();
                break;
            case ("raw"):
                console.log("Raw data");
                deferred.resolve();
                break;
            case ("map"):
                userStr = progCol.userStr;
                regex = new RegExp(' *" *(.*) *" *= *map *[(] *(.*) *[)]',
                                       "g");
                matches = regex.exec(userStr);
                var mapString = matches[2];
                fieldName = matches[1];

                progCol.func.func = "pull";
                progCol.func.args[0] = fieldName;
                progCol.func.args.splice(1, progCol.func.args.length - 1);
                progCol.isNewCol = false;
                // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
                //                   fieldName + ")";
                var options = {replaceColumn: true};
                xcFunction.map(progCol.index, tableNum, fieldName, mapString,
                               options)
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;
            case ("filter"):
                userStr = progCol.userStr;
                regex = new RegExp(' *" *(.*) *" *= *filter *[(] *(.*) *[)]'
                                       , "g");
                matches = regex.exec(userStr);
                var fltString = matches[2];
                fieldName = matches[1];

                progCol.func.func = "pull";
                progCol.func.args[0] = fieldName;
                progCol.func.args.splice(1, progCol.func.args.length - 1);
                progCol.isNewCol = false;
                // progCol.userStr = '"' + progCol.name + '"' + " = pull(" +
                //                   fieldName + ")";
                xcFunction.filter(progCol.index, tableNum, {"filterString":
                                  fltString})
                .then(deferred.resolve)
                .fail(function(error) {
                    console.error("execCol fails!", error);
                    deferred.reject(error);
                });
                break;

            case (undefined):
                console.warn("Blank col?");
                deferred.resolve();
                break;
            default:
                console.warn("No such function yet!", progCol);
                deferred.resolve();
                break;
        }

        return (deferred.promise());
    };

    ColManager.checkColDup = function ($input, $inputs, tableNum, parseCol) {
        // $inputs checks the names of $inputs, tableNum is used to check
        // back column names. You do not need both
        var name        = $input.val().trim();
        var isDuplicate = false;
        var title       = "Name already exists, please use another name.";
        
        if (parseCol) {
            name = name.replace(/^\$/, '');
        }

        $(".tooltip").hide();
        // temporarily use, will be removed when backend allow name with space
        if (/ +/.test(name) === true) {
            title = "Invalid name, cannot contain spaces between characters.";
            isDuplicate = true;
        } else if (name === 'DATA') {
            title = "The name \'DATA\' is reserved.";
            isDuplicate = true;
        }

        if (!isDuplicate && $inputs) {
            $inputs.each(function() {
                var $checkedInput = $(this);
                if (name === $checkedInput.val() &&
                    $checkedInput[0] !== $input[0])
                {
                    isDuplicate = true;
                    return (false);
                }
            });
        }

        if (!isDuplicate && tableNum > -1) {
            var tableCols   = gTables[tableNum].tableCols;
            var numCols = tableCols.length;
            for (var i = 0; i < numCols; i++) {
                if (tableCols[i].func.args) {
                    var backName = tableCols[i].func.args[0];
                    if (name === backName) {
                        title = "A column is already using this name, " +
                                "please use another name.";
                        isDuplicate = true;
                        break;
                    }
                }   
            }
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
    };

    ColManager.delDupCols = function(index, tableNum, forwardCheck) {
        index = index - 1;
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var args    = columns[index].func.args;
        var start   = forwardCheck ? index : 0;
        var operation;

        if (args) {
            operation = args[0];
        }

        for (var i = start; i < numCols; i++) {
            if (i === index) {
                continue;
            }
            if (columns[i].func.args) {
                if (columns[i].func.args[0] === operation &&
                    columns[i].func.func !== "raw")
                {
                    delColandAdjustLoop();
                }
            } else if (operation == null) {
                delColandAdjustLoop();
            }
        }

        function delColandAdjustLoop() {
            delColHelper((i + 1), tableNum);
            if (i < index) {
                index--;
            }
            numCols--;
            i--;
        }
    };

    ColManager.hideCol = function(colNum, tableNum) {
        var $table   = $("#xcTable" + tableNum);
        var $th      = $table.find(".th.col" + colNum);
        var $thInput = $th.find("input");
        var $cols    = $table.find(".col" + colNum);

        $th.width(10);
        // data column should have more padding
        // and class for tbody is different
        if ($thInput.hasClass("dataCol")) {
            // the padding pixel may be chosen again
            $thInput.css("padding-left", "10px");
            $cols.find(".elementText").css("padding-left", "15px");
        } else {
            $thInput.css("padding-left", "6px");
            $cols.find(".addedBarText").css("padding-left", "10px");
        }

        $table.find("td.col" + colNum).width(10);
        gTables[tableNum].tableCols[colNum - 1].isHidden = true;

        matchHeaderSizes(colNum, $table);
    };

    ColManager.unhideCol = function(colNum, tableNum, options) {
        var $table   = $("#xcTable" + tableNum);
        var $th      = $table.find(".th.col" + colNum);
        var $thInput = $th.find("input");
        var $cols    = $table.find(".col" + colNum);

        if (options && options.autoResize) {
            autosizeCol($th, {
                "resizeFirstRow": true,
                "includeHeader" : true
            });
        }

        if ($thInput.hasClass("dataCol")) {
            $cols.find(".elementText").css("padding-left", "0px");
        } else {
            $cols.find(".addedBarText").css("padding-left", "0px");
        }

        $thInput.css("padding-left", "4px");
        gTables[tableNum].tableCols[colNum - 1].isHidden = false;

    };

    ColManager.textAlign = function(colNum, tableNum, alignment) {
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = "Left";
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = "Right";
        } else {
            alignment = "Center";
        }

        gTables[tableNum].tableCols[colNum - 1].textAlign = alignment;

        $("#xcTable" + tableNum).find('td.col' + colNum)
                                .removeClass('textAlignLeft')
                                .removeClass('textAlignRight')
                                .removeClass('textAlignCenter')
                                .addClass('textAlign' + alignment);
    };

    ColManager.pullAllCols = function(startIndex, jsonObj, dataIndex,
                                      tableNum, direction, rowToPrependTo)
    {
        var table     = gTables[tableNum];
        var tableName = table.tableName;
        var tableCols = table.tableCols;
        var numCols   = tableCols.length;
        // jsonData based on if it's indexed on array or not
        var secondPull = gTableIndicesLookup[tableName].isSortedArray || false;
        var jsonData   = secondPull ? jsonObj.withKey : jsonObj.normal;
        var numRows    = jsonData.length;

        var indexedColNums = [];
        var nestedVals     = [];
        var columnTypes    = []; // track column type
        var childArrayVals = [];

        var $table     = $('#xcTable' + tableNum);
        var tBodyHTML  = "";

        startIndex = startIndex || 0;

        for (var i = 0; i < numCols; i++) {
            if ((i !== dataIndex) &&
                tableCols[i].func.args &&
                tableCols[i].func.args !== "")
            {
                var nested = parseColFuncArgs(tableCols[i].func.args[0]);
                if (tableCols[i].func.args[0] !== "" &&
                    tableCols[i].func.args[0] != null)
                {
                    if (/\\.([0-9])/.test(tableCols[i].func.args[0])) {
                        // slash followed by dot followed by number is ok
                        // fall through
                    } else if (/\.([0-9])/.test(tableCols[i].func.args[0])) {
                        // dot followed by number is invalid
                        nested = [""];
                    }
                }

                nestedVals.push(nested);
                // get the column number of the column the table was indexed on
                if (tableCols[i].func.args &&
                    (tableCols[i].func.args[0] === table.keyName)) {
                    indexedColNums.push(i);
                }
            } else { // this is the data Column
                nestedVals.push([""]);
            }

            childArrayVals.push(false);
        }

        // loop through table tr and start building html
        for (var row = 0; row < numRows; row++) {
            var dataValue = parseRowJSON(jsonData[row]);
            var rowNum    = row + startIndex;

            tBodyHTML += '<tr class="row' + rowNum + '">';

            // add bookmark
            if (table.bookmarks.indexOf(rowNum) > -1) {
                tBodyHTML += '<td align="center" class="col0 rowBookmarked">';
            } else {
                tBodyHTML += '<td align="center" class="col0">';
            }

            // Line Marker Column
            tBodyHTML += '<div class="idWrap">' +
                            '<span class="idSpan" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="click to add bookmark">' +
                                    (rowNum + 1) +
                            '</span>' +
                            '<div class="rowGrab"></div>' +
                          '</div></td>';

            // loop through table tr's tds
            for (var col = 0; col < numCols; col++) {
                var nested       = nestedVals[col];
                var tdValue      = dataValue;
                var childOfArray = childArrayVals[col];
                var parsedVal;

                if (col !== dataIndex) {
                    if (nested == null) {
                        console.error('Error this value should not be empty');
                    }

                    var nestedLength = nested.length;
                    for (var i = 0; i < nestedLength; i++) {
                        if (jQuery.isEmptyObject(tdValue) ||
                            tdValue[nested[i]] == null)
                        {
                            tdValue = "";
                            break;
                        }

                        tdValue = tdValue[nested[i]];

                        if (!childOfArray && i < nestedLength - 1 &&
                            xcHelper.isArray(tdValue))
                        {
                            childArrayVals[col] = true;
                        }
                    }

                    // if it's the index array field, pull indexed one instead
                    if (secondPull && tableCols[col].isSortedArray) {
                        var $input  = $table.find('th.col' + (col + 1) +
                                          '> .header input');
                        var key = table.keyName + "_indexed";
                        $input.val(key);
                        tdValue = dataValue[key];
                    }

                    // XXX giving classes to table cells may
                    // actually be done later
                    var tdClass = "col" + (col + 1);
                    // class for indexed col
                    if (indexedColNums.indexOf(col) > -1) {
                        tdClass += " indexedColumn";
                    }
                    // class for textAlign
                    if (tableCols[col].textAlign === "Left") {
                        tdClass += " textAlignLeft";
                    } else if (tableCols[col].textAlign === "Right") {
                        tdClass += " textAlignRight";
                    }

                    parsedVal = xcHelper.parseJsonValue(tdValue);
                    tBodyHTML += '<td class="' + tdClass + ' clickable">' +
                                    getTableCellHtml(parsedVal) +
                                '</td>';
                } else {
                    // make data td;
                    tdValue = jsonData[row];
                    parsedVal = xcHelper.parseJsonValue(tdValue);
                    tBodyHTML +=
                        '<td class="col' + (col + 1) + ' jsonElement">' +
                            '<div data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="double-click to view" ' +
                                'class="elementTextWrap">' +
                                '<div class="elementText">' +
                                    parsedVal +
                                '</div>' +
                            '</div>' +
                        '</td>';
                }

                //define type of the column
                columnTypes[col] = xcHelper.parseColType(tdValue,
                                                         columnTypes[col]);
                // XXX This part try to detect edge case of decimal, doese not
                // need it right now
                // if (columnTypes[col] === "integer" || 
                //     columnTypes[col] === "decimal") 
                // {
                //     var str = '"' + tableCols[col].name + '":' + tdValue;
                //     var index = jsonData[row].indexOf(str) + str.length;
                //     var next = jsonData[row].charAt(index);
                //     // if it's like 123.000, find it and output the right format
                //     if (next === ".") {
                //         var end = jsonData[row].indexOf(",", index);
                //         tdValue += jsonData[row].substring(index, end);
                //         columnTypes[col] = "decimal";
                //     }
                // }
            }
            // end of loop through table tr's tds
            tBodyHTML += '</tr>';
        }
        // end of loop through table tr and start building html

        // assign column type class to header menus

        // This only run once,  check if it's a indexed array, mark on gTables
        // and redo the pull column thing
        if (!secondPull && columnTypes[indexedColNums[0]] === "array") {
            gTableIndicesLookup[tableName].isSortedArray = true;

            for (var i = 0; i < indexedColNums.length; i++) {
                tableCols[indexedColNums[i]].isSortedArray = true;
            }
            return ColManager.pullAllCols(startIndex, jsonObj,
                                          dataIndex, tableNum, direction);
        }

        var $tBody = $(tBodyHTML);
        if (direction === 1) {
            if (rowToPrependTo > -1) {
                $table.find('.row' + rowToPrependTo).before($tBody);
            } else {
                $table.find('tbody').prepend($tBody);
            }
        } else {
            $table.find('tbody').append($tBody);
        }

        for (var i = 0; i < numCols; i++) {
            var $currentTh = $table.find('th.col' + (i + 1));
            var $header    = $currentTh.find('> .header');
            var columnType = columnTypes[i] || "undefined";

            // XXX Fix me if DATA column should not be type object
            if (tableCols[i].name === "DATA") {
                columnType = "object";
            }
            tableCols[i].type = columnType;

            $header.removeClass("type-mixed")
                    .removeClass("type-string")
                    .removeClass("type-integer")
                    .removeClass("type-decimal")
                    .removeClass("type-object")
                    .removeClass("type-array")
                    .removeClass("type-undefined")
                    .removeClass("type-boolean")
                    .removeClass("recordNum")
                    .removeClass("childOfArray");

            $header.addClass('type-' + columnType);
            $header.find('.iconHelper').attr('title', columnType);

            // these type should not have td dropdown
            if (columnType !== "string" &&
                columnType !== "decimal" &&
                columnType !== "integer")
            {
                $tBody.find("td.col" + (i + 1)).removeClass("clickable")
                      .find(".addedBarTextWrap")
                      .removeClass("clickable");
            }

            if (tableCols[i].name === "recordNum") {
                $header.addClass('recordNum');
            }
            if (childArrayVals[i]) {
                $header.addClass('childOfArray');
            }
            if ($currentTh.hasClass('selectedCell')) {
                highlightColumn($currentTh);
            }
        }

        return ($tBody);
    };

    function pullColHelper(key, newColid, tableNum, startIndex, numberOfRows) {
        if (key !== "" & key != null) {
            if (/\\.([0-9])/.test(key)) {
                // slash followed by dot followed by number is ok
            } else if (/\.([0-9])/.test(key)) {
                // dot followed by number is invalid
                return;
            }
        }

        var $table   = $("#xcTable" + tableNum);
        var $dataCol = $table.find("tr:first th").filter(function() {
            return $(this).find("input").val() === "DATA";
        });

        var colid = xcHelper.parseColNum($dataCol);

        var numRow        = -1;
        var startingIndex = -1;
        var endingIndex   = -1;

        if (!startIndex) {
            startingIndex = parseInt($table.find("tbody tr:first")
                                           .attr('class').substring(3));
            numRow = $table.find("tbody tr").length;
            endingIndex = parseInt($table.find("tbody tr:last")
                                           .attr('class').substring(3)) + 1;
        } else {
            startingIndex = startIndex;
            numRow = numberOfRows || gNumEntriesPerPage;
            endingIndex = startIndex + numRow;
        }

        var nested       = parseColFuncArgs(key);
        var childOfArray = false;
        var columnType;  // track column type, initial is undefined

        for (var i = startingIndex; i < endingIndex; i++) {
            var jsonStr = $table.find('.row' + i + ' .col' +
                                     colid + ' .elementText').text();
            var value = parseRowJSON(jsonStr);

            for (var j = 0; j < nested.length; j++) {
                if (jQuery.isEmptyObject(value) ||
                    value[nested[j]] == null)
                {
                    value = "";
                    break;
                }
                value = value[nested[j]];

                if (!childOfArray && j < nested.length - 1 &&
                    xcHelper.isArray(value)) {
                    childOfArray = true;
                }
            }

            //define type of the column
            columnType = xcHelper.parseColType(value, columnType);
            // if (columnType === "integer" || columnType === "decimal") {
            //     var str = '"' + gTables[tableNum].tableCols[newColid - 1].name
            //                 + '":' + value;
            //     var index = jsonStr.indexOf(str) + str.length;
            //     var next = jsonStr.charAt(index);
            //     // if it's like 123.000, find it and output the right format
            //     if (next === ".") {
            //         var end = jsonStr.indexOf(",", index);
            //         value += jsonStr.substring(index, end);
            //         columnType = "decimal";
            //     }
            // }

            value = xcHelper.parseJsonValue(value);

            $table.find('.row' + i + ' .col' + newColid)
                    .html(getTableCellHtml(value))
                    .addClass('clickable');
        }

        if (columnType === undefined) {
            columnType = "undefined";
        }

        gTables[tableNum].tableCols[newColid - 1].type = columnType;

        // add class to th
        var $header = $table.find('th.col' + newColid + ' div.header');

        $header.removeClass("type-mixed")
               .removeClass("type-string")
               .removeClass("type-integer")
               .removeClass("type-decimal")
               .removeClass("type-object")
               .removeClass("type-array")
               .removeClass("type-boolean")
               .removeClass("type-undefined")
               .removeClass("recordNum")
               .removeClass("childOfArray");

        $header.addClass('type-' + columnType);
        $header.find('.iconHelper').attr('title', columnType);

        if (columnType !== "string" &&
            columnType !== "decimal" &&
            columnType !== "integer")
        {
            $table.find("tbody td.col" + newColid)
                    .removeClass("clickable").find('.addedBarTextWrap')
                    .removeClass("clickable");
        }

        if (key === "recordNum") {
            $header.addClass('recordNum');
        }
        if (childOfArray) {
            $header.addClass('childOfArray');
        }

        $table.find('th.col' + newColid).removeClass('newColumn');
    }

    // Help Functon for pullAllCols and pullCOlHelper
    // parse tableCol.func.args
    function parseColFuncArgs(key) {
        var nested = key.replace(/\]/g, "")
                        .replace(/\[/g, ".")
                        .match(/([^\\.]|\\.)+/g);

        for (var i = 0; i < nested.length; i++) {
            nested[i] = nested[i].replace(/\\./g, "\.");
        }

        return (nested);
    }
    // parse json string of a table row
    function parseRowJSON(jsonStr) {
        var value;

        if (jsonStr === "") {
            // console.error("Error in pullCol, jsonStr is empty");
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

        return (value);
    }
    // End Of Help Functon for pullAllCols and pullCOlHelper

    function insertColHelper(index, tableNum, progCol) {
         // tableCols is an array of ProgCol obj
        var tableCols = gTables[tableNum].tableCols;

        for (var i = tableCols.length - 1; i >= index; i--) {
            tableCols[i].index += 1;
            tableCols[i + 1] = tableCols[i];
        }

        tableCols[index] = progCol;
    }

    function removeColHelper(index, tableNum) {
        var tableCols = gTables[tableNum].tableCols;
        var removed   = tableCols[index];

        for (var i = index + 1; i < tableCols.length; i++) {
            tableCols[i].index -= 1;
        }

        tableCols.splice(index, 1);

        return (removed);
    }

    function delColHelper(colNum, tableNum) {
        var table      = gTables[tableNum];
        var numCols    = table.tableCols.length;
        var $tableWrap = $("#xcTableWrap" + tableNum);

        $tableWrap.find(".col" + colNum).remove();

        removeColHelper(colNum - 1, tableNum);

        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(table);

        for (var i = colNum + 1; i <= numCols; i++) {
            $tableWrap.find(".col" + i)
                      .removeClass("col" + i)
                      .addClass("col" + (i - 1));
        }

        gRescolDelWidth(colNum, tableNum);
    }

    function parsePullColArgs(progCol) {
        if (progCol.func.func !== "pull") {
            console.warn("Wrong function!");
            return (false);
        }

        if (progCol.func.args.length !== 1) {
            console.warn("Wrong number of arguments!");
            return (false);
        }
        return (true);
    }

    function getTableCellHtml(value) {
        var html =
            '<div class="addedBarTextWrap clickable">' +
                value +   
            '</div>';
        return (html);
    }

    return (ColManager);
}(jQuery, {}));
