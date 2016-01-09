window.ExportModal = (function($, ExportModal) {
    var $exportModal     = $("#exportModal");

    var $exportName = $("#exportName");
    var $exportPath = $("#exportPath");
    var $exportColumns = $('#exportColumns');

    var $selectableThs;
    var exportTableName;
    var tableId;
    var focusedHeader;

    var minHeight = 296;
    var minWidth  = 296;
    var modalHelper = new xcHelper.Modal($exportModal, {
        "minHeight": minHeight,
        "minWidth" : minWidth
    });

    ExportModal.setup = function() {
        $exportModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $exportModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            maxHeight  : minWidth,
            minWidth   : 400,
            containment: "document"
        });

        // click cancel or close button
        $exportModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeExportModal();
        });

        // click confirm button
        $exportModal.on("click", ".confirm", function() {
            
            submitForm()
            .fail(function(error) {
                console.error(error);
                // being handled in xcfunction.export
            });
        });

        xcHelper.dropdownList($("#exportLists"), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                $exportPath.val($li.text());
            }
        });

        $exportColumns.keyup(function(event) {
            if (event.which === keyCode.Comma) {
                selectColumnsOnKeyPress();
            }
        });
        $exportColumns.on('change', function() {
            selectColumnsOnKeyPress();
        });

        $exportColumns.keydown(function(event) {
            if (event.which === keyCode.Backspace ||
                event.which === keyCode.Delete) {
                deselectColumnsOnKeyPress(event);
            }
        });
        $exportColumns.on('cut', function(e) {
            deselectColumnsOnKeyPress(e);
        });
        $exportColumns.on('paste', function() {
            setTimeout(function(){
                selectColumnsOnKeyPress();
            });
        });

        $exportModal.find('.selectAll').click(selectAllCols);
        $exportModal.find('.clearInput').click(clearAllCols);

    };

    ExportModal.show = function(tablId) {
        tableId = tablId;

        var animationTime = gMinModeOn ? 0 : 300;
        xcHelper.toggleModal(tableId, false, {time: animationTime});
        var $table = $('#xcTableWrap-' + tableId);
        $table.addClass('exportModalOpen');
        setTimeout(function() {
            Tips.refresh();
        }, 300);

        XcalarListExportTargets("*", "*")
        .then(function(targs) {
           
            restoreExportPaths(targs);
            modalHelper.setup();
            
            if (gMinModeOn) {
                $exportModal.show();
            } else {
                $exportModal.fadeIn(400);
            }

            $selectableThs.addClass('modalHighlighted');
            var allColNames = "";
            $selectableThs.each(function() {
                var colNum = xcHelper.parseColNum($(this));
                $table.find('td.col' + colNum).addClass('modalHighlighted');
                allColNames += $(this).find('.editableHead').val() + ", ";
            });

            $exportColumns.val(allColNames.substr(0, allColNames.length - 2));
        })
        .fail(function(error) {
            console.error(error);
        });

        var tableName = gTables[tableId].tableName;
        exportTableName = tableName;
        $exportName.val(tableName.split('#')[0].replace(/[\W_]+/g, "")).focus();
        $exportName[0].select();

        addColumnSelectListeners();

        $(document).on("mousedown.exportModal", function() {
            xcHelper.hideDropdowns($exportModal);
        });
        $(document).on("keypress.exportModal", function(e) {
            if (e.which === keyCode.Enter) {
                $exportModal.find(".confirm").trigger("click");
            }
        });
        
    };

    function submitForm() {
        var deferred = jQuery.Deferred();

        var exportName = $exportName.val().trim();
        var columnsVal = $exportColumns.val().replace(/\s/g, "");
         //remove commas at either ends
        if (columnsVal.indexOf(",") === 0) {
            columnsVal = columnsVal.substring(1, columnsVal.length);
        }
        if (columnsVal.lastIndexOf(",") === (columnsVal.length - 1)) {
            columnsVal = columnsVal.substring(0, columnsVal.length - 1);
        }

        var isValid = xcHelper.validate([
            {
                "$selector": $exportName
            },
            {
                "$selector": $exportName,
                "text"     : ErrorTextTStr.NoSpecialChar,
                "check"    : function() {
                    return xcHelper.hasSpecialChar(exportName);
                }
            },
            {
                "$selector": $exportColumns
            },
            {
                "$selector": $exportColumns,
                "text"     : ErrorTextTStr.InvalidColName,
                "check"    : function() {
                    if (gExportNoCheck) {
                        return (columnsVal.length === 0);
                    } else {
                        return (columnsVal.length === 0 ||
                            columnsVal.indexOf('.') !== -1 ||
                            columnsVal.indexOf('[') !== -1);
                    }
                }
            }
        ]);

        if (!isValid) {
            deferred.reject({error: 'invalid input'});
            return (deferred.promise());
        }
        
        var columnNames = columnsVal.split(",");
        columnNames = convertFrontColNamesToBack(columnNames);

        var closeModal = true;

        xcFunction.exportTable(exportTableName, exportName, $exportPath.val(),
                                columnNames.length, columnNames)
        .then(function() {
            closeModal = false;
            closeExportModal();
            deferred.resolve();
        })
        .fail(function(error) {
            closeModal = false;
            deferred.reject(error);
        });

        setTimeout(function() {
            if (closeModal) {
                closeExportModal();
            }
        }, 200);

        return (deferred.promise());
    }

    function convertFrontColNamesToBack(frontColNames) {
        var backCols = [];
        var tableCols = gTables[tableId].tableCols;
        var numTableCols = tableCols.length;
        var colsArray = [];
        var foundColsArray = [];
        var numColsFound = 0;
        var numFrontColNames = frontColNames.length;
        var i;

        for (i = 0; i < numTableCols; i++) {
            if (tableCols[i].name !== "DATA") {
                colsArray.push(tableCols[i]);
            }
        }
        numTableCols--; // DATA col was removed

        for (i = 0; i < numFrontColNames; i++) {
            var colFound = false;
            var tableCol;
            var j;

            for (j = 0; j < numTableCols; j++) {
                tableCol = colsArray[j];
                if (frontColNames[i] === tableCol.name) {
                    if (tableCol.func.args) {
                        backCols.push(tableCol.func.args[0]);
                    }
                    var foundCol = colsArray.splice(j, 1)[0];
                    foundColsArray.push(foundCol);
                    j--;
                    numTableCols--;
                    colFound = true;
                    numColsFound++;
                    break;
                }
            }

            if (!colFound) {
                for (j = 0; j < numTableCols; j++) {
                    tableCol = colsArray[j];
                    if (frontColNames[i] === tableCol.name) {
                        backCols.push(tableCol.func.args[0]);
                        break;
                    }
                }
            }
        }
        return (backCols);
    }

    function selectColumnsOnKeyPress() {
        var colNames = $exportColumns.val().replace(/\s/g, "").split(",");
        var numColNames = colNames.length;
        var $table = $("#xcTable-" + tableId);

        $('.modalHighlighted').removeClass('modalHighlighted');
        for (var i = 0; i < numColNames; i++) {
            var $colInput = $selectableThs.find('.editableHead')
                                          .filter(function() {
                return ($(this).val() === colNames[i]);
            });
            if ($colInput.length !== 0) {
                var $th = $colInput.closest('th');
                $th.addClass('modalHighlighted');
                var colNum = xcHelper.parseColNum($th);
                var $tds = $table.find('td.col' + colNum);
                $tds.addClass('modalHighlighted');
            }
        }
    }

    function deselectColumnsOnKeyPress(e) {
        var $table = $("#xcTable-" + tableId);
        var value = $exportColumns.val();
        var originalStart = $exportColumns[0].selectionStart;
        var originalEnd = $exportColumns[0].selectionEnd;
        var selectLen = originalEnd - originalStart;
        var start = originalStart;
        var end = originalEnd;
        // var end;

        if (originalEnd === 0) {
            return;
        }

        if (value[originalStart - 1] === " ") {
            var endText = value.slice(originalStart - 1).trim();
            if (endText.length === 0) {
                return;
            }
        }

        e.preventDefault();

        if (value[originalStart] === "," && selectLen === 1) {
            // only the comma is selected, just return
            return;
        }

        if (value[originalStart] === "," && selectLen > 0) {
            // shift the start up by one so we don't delete the string to the left
            originalStart++;
            start++;
        }

        var selectStart = 0;
        var selectEnd = value.length;
        if (originalStart === originalEnd && value[originalStart - 1] === ",") {
            start--;
        }
        for (var i = start - 1; i > -1; i--) {
            if (value[i] === ",") {
                selectStart = i;
                break;
            }
        }

        if (value[originalEnd - 1] === ",") {
            selectEnd = originalEnd - 1;
        } else {
            for (var i = end; i < value.length; i++) {
                if (value[i] === ",") {
                    selectEnd = i;
                    break;
                }
            }
        }

        var substring = value.substring(selectStart, selectEnd);
        var colNames = substring.replace(/\s/g, "").split(",");

        for (var i = 0; i < colNames.length; i++) {
            var $colInput = $selectableThs.find('.editableHead')
                                          .filter(function() {
                return ($(this).val() === colNames[i]);
            });
            if ($colInput.length !== 0) {
                var $th = $colInput.closest('th');
                $th.removeClass('modalHighlighted');
                var colNum = xcHelper.parseColNum($th);
                var $tds = $table.find('td.col' + colNum);
                $tds.removeClass('modalHighlighted');
            }
        }
        var newValue = value.slice(0, selectStart) + value.slice(selectEnd);

        // slice off any spaces or commas in the front
        for (var i = 0; i < value.length; i++) {
            if (newValue[i] !== "," && newValue[i] !== " ") {
                newValue = newValue.slice(i);
                if (i > 0) {
                    selectStart--;
                }
                break;
            }
        }
        
        $exportColumns.val(newValue);
        $exportColumns[0].setSelectionRange(selectStart + 1, selectStart + 1);
    }

    function restoreExportPaths(targs) {
        var targets = targs.targets;
        var numTargets = targs.numTargets;
        var $exportList = $('#exportLists').find('ul');
        var lis = '<li class="hint">Choose a target</li>';
        for (var i = 0; i < numTargets; i++) {
            lis += "<li>" + targets[i].hdr.name + "</li>";
        }
        $exportList.html(lis);
        var $defaultLi = $exportList.find('li').filter(function() {
            return ($(this).text().indexOf('Default') === 0);
        });
       
        $exportPath.val($defaultLi.text()).attr('value', $defaultLi.text());
    }

    function addColumnSelectListeners() {
        var $table = $('#xcTable-' + tableId);
        var tableCols = gTables[tableId].tableCols;

        // select ths that are not arrays or objects
        var $ths = $table.find('.header').filter(function() {
            var $header = $(this);
            var $th = $header.parent();
            var colNum = xcHelper.parseColNum($th) - 1;
            if (colNum === -1) {
                return false;
            }
            
            if (gExportNoCheck) {
                if (tableCols[colNum].isNewCol ||
                    tableCols[colNum].name === "DATA") {
                    return false;
                }
                return true;
            }

            var isObj;
            if (tableCols[colNum].args &&
                tableCols[colNum].args[0].indexOf(".") > -1) {
                isObj = true;
            }
            return (!isObj &&
                    ($header.hasClass('type-string') ||
                    $header.hasClass('type-integer') ||
                    $header.hasClass('type-float')));

        }).parent();

        $selectableThs = $ths;

        $ths.find('input').css('pointer-events', 'none');
        $ths.addClass('exportable');

        $ths.on('mousedown.addColToExport', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });

        $ths.on('click.addColToExport', function(event) {
            if ($(event.target).hasClass('colGrab')) {
                return;
            }
            var $th = $(this);
            if (focusedHeader) {
                var focusedThColNum = xcHelper.parseColNum(focusedHeader);
            }

            var colNum = xcHelper.parseColNum($th);
            var $tds = $table.find('td.col' + colNum);
            var $cells = $th.add($tds);

            var start;
            var end;
            var $currCells;

            if ($th.hasClass('modalHighlighted')) {
                if (event.shiftKey && focusedHeader) {
                    start = Math.min(focusedThColNum, colNum);
                    end = Math.max(focusedThColNum, colNum) + 1;

                    for (var i = start; i < end; i++) {
                        $currCells = $table.find('th.col' + i + ', td.col' + i);
                        if ($currCells.hasClass('modalHighlighted')) {
                            deselectColumn($currCells, i);
                        }                      
                    }
                } else {
                    deselectColumn($cells, colNum);
                }
            } else {
                if (event.shiftKey && focusedHeader) {
                    start = Math.min(focusedThColNum, colNum);
                    end = Math.max(focusedThColNum, colNum) + 1;

                    for (var i = start; i < end; i++) {
                        $currCells = $table.find('th.col' + i + ', td.col' + i);
                        if (!$currCells.hasClass('modalHighlighted') &&
                            !$currCells.hasClass('dataCol')) {
                            selectColumn($currCells, i);
                        }
                    }
                } else {
                    selectColumn($cells, colNum);
                }
            }
            focusedHeader = $th;
        });
    }

    function selectColumn($cells, colNum) {
        var colType = gTables[tableId].tableCols[colNum - 1].type;
        var validTypes = ['string', 'integer', 'float'];
        if (validTypes.indexOf(colType) === -1) {
            return;
        }
        var currColName = gTables[tableId].tableCols[colNum - 1].name;
        $cells.addClass('modalHighlighted');
        xcHelper.insertText($exportColumns, currColName);
    }

    function deselectColumn($cells, colNum) {
        $cells.removeClass('modalHighlighted');
        var currColName = gTables[tableId].tableCols[colNum - 1].name;
        var colNameLength = currColName.length;
        var colLength = currColName.length;
        var inputVal = $exportColumns.val();
        var inputValLength = inputVal.length;
        var colNameIndex = -1;
        var delimiters = [" ", ",", undefined];
        // find index of colname by looking for match and checking previous
        // and next character are delimiters
        for (var i = 0; i < inputValLength; i++) {
            if (inputVal.substr(i, colNameLength) === currColName) {
                if (delimiters.indexOf(inputVal[i + colNameLength]) !== -1 &&
                    delimiters.indexOf(inputVal[i - 1]) !== -1) {
                    colNameIndex = i;
                    break;
                }
            }
        }

        var beginIndex = 0;

        // find comma prefix and set beginIndex to that location
        for (var i = (colNameIndex - 1); i > -1; i--) {
            if (inputVal[i] === ",") {
                beginIndex = i;
                break;
            } else if (inputVal[i] !== " ") {
                beginIndex = colNameIndex;
                break;
            }
        }

        var colNameEndIndex = colNameIndex + colLength;
        var endIndex = colNameEndIndex;

        if (beginIndex === 0) {
            for (var i = (colNameEndIndex); i < inputVal.length; i++) {
                if (inputVal[i] !== " " && inputVal[i] !== ",") {
                    endIndex = i;
                    break;
                }
            }
        }
        var newVal = inputVal.slice(0, beginIndex) + inputVal.substr(endIndex);
        $exportColumns.val(newVal);
    }

    
    function restoreColumns() {
        // removes listeners and classes
        var $table = $('#xcTable-' + tableId);
        var $ths = $table.find('th:not(.dataCol):not(:first-child)');
        $ths.off('click.addColToExport');
        $ths.off('mousedown.addColToExport');
        $ths.removeClass('modalHighlighted');
        $table.find('td:not(.jsonElement):not(:first-child)')
              .removeClass('modalHighlighted');
        
        // $ths.find('input').removeAttr('disabled');
        $ths.find('input').css('pointer-events', 'initial');
        focusedHeader = null;
    }

    function selectAllCols() {
        $('#xcTable-' + tableId).find('th:not(.dataCol), td:not(.jsonElement)')
                                .addClass('modalHighlighted');

        var $dataTh = $('#xcTable-' + tableId).find('th.dataCol');
        var dataColNum = xcHelper.parseColNum($dataTh) - 1;
        columnsToExport = [];
        var cols = gTables[tableId].tableCols;
        var numCols = cols.length;
        for (var i = 0; i < numCols; i++) {
            if (i === dataColNum) {
                continue;
            }
            if (!cols[i].isNewCol) {
                columnsToExport.push(cols[i].func.args[0]);
                // we're allowing garbage columns as well
            }
        }
        $exportModal.find('.columnsSelected')
                    .html(JSON.stringify(columnsToExport));
    }

    function clearAllCols() {
        columnsToExport = [];
        $exportModal.find('.columnsSelected')
                        .html(JSON.stringify(columnsToExport));
        $exportColumns.val("");
        $('#xcTable-' + tableId)
                    .find('th.modalHighlighted, td.modalHighlighted')
                    .removeClass('modalHighlighted');
    }

    function closeExportModal() {
        exportTableName = null;
        $exportPath.val("Local Filesystem");
        $exportColumns.val("");
        $('.exportable').removeClass('exportable');
        $selectableThs = null;
        $(document).off(".exportModal");
        modalHelper.clear();

        restoreColumns();
        var hide = true;
        var animationTime = gMinModeOn ? 0 : 300;

        $exportModal.hide();
        xcHelper.toggleModal(tableId, hide, {time: animationTime});

        $('#xcTableWrap-' + tableId).removeClass('exportModalOpen');
        setTimeout(function() {
            Tips.refresh();
        }, 200);
    }

    return (ExportModal);
}(jQuery, {}));
