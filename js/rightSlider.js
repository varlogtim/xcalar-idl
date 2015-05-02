function setupRightSideBar() {
    var clickable = true;
    var delay = 300;
    var $workSheetBar = $('#worksheetBar');
    var $sliderBtns = $workSheetBar.find('.sliderBtn');
    var $sidebar = $('#rightSideBar');

    setupUDF();

    $workSheetBar.on('click', '.sliderBtn', function() {
        if (!clickable) {
            return;
        }

        $sliderBtns.removeClass('active');

        var $sliderBtn = $(this);
        var index = $sliderBtn.index();
        var $sidebarSection = $sidebar.find('.rightBarSection')
                                      .eq(index);

        if (!$sidebar.hasClass('open')) {
            // sidebar is closed so open the correlating section
            $sidebar.addClass('open');
            $sidebarSection.addClass('active');
            $sidebar.children('.lastOpen')
                    .removeClass('lastOpen');
            if ($sidebarSection.attr('id') === 'sqlSection') {
                SQL.scrollToBottom();
            }
            $sliderBtn.addClass('active');
            // display correct section
        } else {
            // sidebar is already open, check for close or switch sections
            if ($sidebarSection.hasClass('active')) {
                // button clicked has an active section so close slider
                $sidebar.removeClass('open');
                $sidebar.children('.lastOpen')
                        .removeClass('lastOpen');
                $sidebarSection.addClass('lastOpen');
                setTimeout(function() {
                    $sidebarSection.removeClass('active');
                }, delay);
            } else {
                // close current section, open new section
                $sidebar.children('.active')
                        .removeClass('active')
                        .removeClass('lastOpen');
                $sidebarSection.addClass('active');
                if ($sidebarSection.attr('id') === 'sqlSection') {
                    SQL.scrollToBottom();
                }
                $sliderBtn.addClass('active');
            }
        }

        clickable = false;
        setTimeout(function() {
            clickable = true
        }, delay);
    });

    $('#pulloutTab').click(function() {
        if (!clickable) {
            return;
        }

        if (!$sidebar.hasClass('open')) {
            $sidebar.addClass('open');
            if ($sidebar.children('.lastOpen').length == 0) {
                $sidebar.find('.rightBarSection')
                        .eq(0)
                        .addClass('active');
                $sliderBtns.eq(0)
                           .addClass('active');
            } else {
                var $sidebarSection = $sidebar.children('.lastOpen');
                var index = $sidebarSection.index();
                $sidebarSection.removeClass('lastOpen')
                               .addClass('active');
                $sliderBtns.eq(index)
                           .addClass('active');
            }
        } else {
            $sidebar.removeClass('open');
            $sliderBtns.removeClass('active');
            setTimeout(function() {
                $sidebar.children('.active')
                        .removeClass('active')
                        .addClass('lastOpen');
            }, delay);
            
        }

        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, delay);
    });

    $sidebar.on('click', '.iconClose', function() {
        $sidebar.removeClass('open');
        $sliderBtns.removeClass('active');
        $sidebar.find('.active').addClass('lastOpen');
        setTimeout(function() {
            $sidebar.find('.rightBarSection')
                    .removeClass('active');
        }, delay);
    });

    setupHelpSection();
}

function setupUDF() {
    // switch tabs section
    var $mainSections = $("#udfSection .mainSection");
    var $radios = $("#udf-tabs .select-item .radio");

    $("#udf-tabs .select-item").on("click", function() {
        var $option = $(this);
        var $radio = $option.find(".radio");
        var tabId = $option.data("tab");

        $radios.removeClass("checked");
        $radio.addClass("checked");

        $mainSections.addClass("hidden");
        $("#" + tabId).removeClass("hidden");
    });

    // upload file section
    var $inputFile = $("#udf-fileBrowser");
    var $filePath = $("#udf-filePath");

    $("#udf-browseBtn").click(function() {
        $inputFile.click();
        return false;
    });
    // display the chosen file's path
    $inputFile.change(function() {
        $filePath.val($(this).val());
    });

    $("#udf-clearPath").click(function() {
        $inputFile.val("");
        $filePath.val("");
        $filePath.focus();
    });
    // upload file
    $("#udf-fileUpload").click(function() {
        var path = $filePath.val();
        var file = $inputFile[0].files[0];

        console.log(file);

        if (path == "") {
            var text = "File Path is empty," + 
                       " please choose a file you want to upload";

            StatusBox.show(text, $filePath, true, 150);
            return;
        }
        // clearance
        $inputFile.val("");
        $filePath.val("");
    });

    // function input section
    var $listSection = $("#udf-fnList");
    var $listDropdown = $("#udf-fnMenu");
    var $templateInput = $("#udf-fnTemplate");
    var $downloadBtn = $("#udf-fnDownload");

    $("#udfSection .rightBarContent").click(function(event) {
        event.stopPropagation();

        $listSection.removeClass('open');
        $listDropdown.hide();
    });
    // open drowdown menu
    $listSection.on("click", function(event) {
        event.stopPropagation();

        $listSection.toggleClass("open");
        $listSection.find(".list").toggle();
    });
    // select one option
    $listSection.on("click", ".list li", function(event) {
        var $li = $(this);

        event.stopPropagation();

        $listSection.removeClass('open');
        $listDropdown.hide();

        $templateInput.val($li.text());

        if ($li.attr("name") == "blank") {
            $downloadBtn.addClass("hidden");
        } else {
            $downloadBtn.removeClass("hidden");
        }
    });
    // upload written function
    var $fnName = $("#udf-fnName");

    $("#udf-fnUpload").click(function() {
        var fileName = $fnName.val();

        if (fileName == "") {
            var text = "File name is empty," + 
                       " please input a function name";

            StatusBox.show(text, $fnName, true, 50);
            return;
        }
        // clearance
        $fnName.val("");
        $templateInput.val("");
        $downloadBtn.addClass("hidden");
        LineMarker.clear();
    });

    LineMarker.setup();
}

window.LineMarker = (function($, LineMarker) {
    var lineCounter = 1;
    // constants
    var lineMarkerOffsetTop = 3;  // hasing padding 3 in CSS

    var $textarea = $("#udf-codeArea");
    var $lineMarker = $("#udf-lineMarker");

    LineMarker.setup = function() {
        markLineNumber(lineCounter);

        // python editor listener
        $textarea.on({
            "scroll": function() {
                positoinLineMarker();
            },
            "mousedown": function() {
                positoinLineMarker();
            },
            "focus": function() {
                positoinLineMarker();
            },
            "blur": function() {
                positoinLineMarker();
            },
            "keydown": function(event) {
                positoinLineMarker();

                switch (event.which) {
                    case keyCode.Enter:
                        addLineMarker();
                        break;

                    case keyCode.Tab:
                        event.preventDefault();
                        insertTab($(this));
                        break;

                    case keyCode.Backspace:
                    case keyCode.Delete:
                        updateLineMarkerInKeydown();

                    default:
                        break;
                }
            },
            "keyup": function(event) {

                switch (event.which) {
                    case keyCode.Backspace:
                    case keyCode.Delete:
                        lineMarkerCheck();

                    default:
                        break;
                }
            },
            "paste": function() {
                // XXX may have better approach
                setTimeout(lineMarkerCheck, 50);
            },
            "cut": function() {
                setTimeout(lineMarkerCheck, 50);
            }
        });
    }

    LineMarker.clear = function() {
        lineCounter = 1;
        $textarea.val("");
        markLineNumber(lineCounter);
    }

    function positoinLineMarker() {
        var newTop = (-1 * $textarea.scrollTop() + lineMarkerOffsetTop) + "px";

        $lineMarker.css("top", newTop);
    }

    function markLineNumber(lineCount) {
        var string = "";

        for (var i = 1; i <= lineCounter; i ++) {
            if (i > 1) {
                string += "<br>";
            }
            string += i;
        }

        $lineMarker.html(string);
    }

    function addLineMarker() {
        markLineNumber(++lineCounter);
    }

    function updateLineMarkerInKeydown() {
        var contents = $textarea.val().split('\n');
        var len = contents.length;

        if (contents[len - 1] == "") {
            lineCounter = len - 1;
        } else {
            lineCounter = len;
        }

        if (lineCounter <= 1) {
            lineCounter = 1;
        }

        markLineNumber(lineCounter);
    }

    function lineMarkerCheck() {
        var len = $textarea.val().split('\n').length;

        if (lineCounter != len) {
            lineCounter = len;
            markLineNumber(lineCounter);
        }

    }

    function insertTab($div) {
        var div = $div.get(0);
        var val = $div.val();
        var start = div.selectionStart;
        var end = div.selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        $div.val(val.substring(0, start)
                 + "\t"
                 + val.substring(end));

        // put caret at right position again
        div.selectionStart = div.selectionEnd = start + 1;
    }

    return (LineMarker);
}(jQuery, {}));

// Current it works as a rest button
function setupHelpSection() {
    function refreshPage() {
        location.reload();
    }

    $('#helpSubmit').click(function() {
        console.log('Reset Fired!');
        emptyAllStorage()
        .then(function() {
            console.log("Shut Down Successfully!");
            return (XcalarStartNodes(2));
        }, function(error) {
            console.log("Failed to write! Commencing shutdown");
            return (XcalarStartNodes(2));
        })
        .then(function() {
            console.log("Restart Successfully!");
            refreshPage();
            // clearAll();
        });

        function clearAll() {
            $("#gridView").empty();
            $("#datasetWrap").empty();
            $("#importDataButton").click();
            $('#worksheetInfo').find('.numDataStores').text(0);
            $('#datasetExplore').find('.numDataStores').text(0);
        }
    });
}

function setuptableListSection() {
    $("#tableListSection").on("click", ".tableListSectionTab", function() {
        $('.tableListSectionTab.active').removeClass('active');
        $(this).addClass('active');
        var index = $(this).index();
        $('.tableListSection').hide();
        $('.tableListSection').eq(index).show();
    });

    addMenuBarTables(gTables, IsActive.Active);
    addMenuBarTables(gHiddenTables, IsActive.Inactive);

    $('#tableListSections').on('click','.tableListBox', function(event) {
        var ol = $(this).next();
        // console.log($(event.target))
        if ($(event.target).hasClass('addArchivedBtn')) {
            return;
        }
        if (ol.hasClass('open') && $(this).hasClass('active')) {
            $(this).removeClass('active');
            ol.slideUp(200).removeClass('open');
        } else {
            $(this).addClass('active');
            ol.slideDown(200).addClass('open');
        }
    });

    $('#inactiveTablesList').on('click','.addArchivedBtn', function() {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        } else {
            $(this).addClass('selected');
        }
        if ($('.addArchivedBtn.selected').length == 0) {
            $('#archivedTableList').find('.btnLarge').addClass('btnInactive');
        } else {
            $('#archivedTableList').find('.btnLarge')
                                   .removeClass('btnInactive');
        }
    });

    $('#submitTablesBtn').click(function() {
        addBulkTableHelper();
    });

    $('#deleteTablesBtn').click(function() {
        Alert.show({
            "title": "DELETE ARCHIEVED TABLES",
            "msg": "Are you sure you want to delete selected tables?",
            "isCheckBox": true,
            "confirm": function() {
                tableBulkAction("delete")
                .then(function() {
                    commitToStorage();
                })
                .fail(function(error) {
                    Alert.error("Delete Table Fails", error);
                });
            }
        });
    });
}

function addBulkTableHelper() {
    var $tables = $("#inactiveTablesList").find(".addArchivedBtn.selected")
                                          .closest(".tableInfo");
    var $noSheetTables = $tables.filter(function() {
        return $(this).find(".worksheetInfo").hasClass("inactive");
    })

    if ($noSheetTables.length > 0) {
        var instr = "You have tables that are not in any worksheet," + 
                    " please choose a worksheet to send for those tables!";

        $noSheetTables.addClass("highlight");
        // must get highlight class  from source
        var $clone = $("#rightSideBar").clone();

        $clone.addClass("faux");
        $("#modalBackground").after($clone);

        $clone.css({"z-index": "initial"});

        Alert.show({
            "title": "SEND TO WORKSHEET",
            "instr": instr,
            "optList": {
                "option": WSManager.getWorksheetLists(true),
                "label": "Worksheet to send: "
            },
            "confirm": function() {
                $noSheetTables.removeClass("highlight");
                $("#rightSideBar.faux").remove();

                var wsName = Alert.getOptionVal();
                var wsIndex = WSManager.getWorksheetByName(wsName);

                if (wsIndex == undefined) {
                    Alert.error("Invalid worksheet name", 
                                "please input a valid name!");
                } else {
                    $noSheetTables.each(function() {
                        var tableName = $(this).data("tablename");

                        WSManager.addTable(tableName, wsIndex);

                        addBulkTable();
                    });
                }
            },
            "cancel": function() {
                $noSheetTables.removeClass("highlight");
                $("#rightSideBar.faux").remove();
            }
        });

    } else {
        addBulkTable();
    }

    function addBulkTable() {
        tableBulkAction("add")
        .then(function() {
            if (!$("#workspaceTab").hasClass("active")) {
                $("#workspaceTab").click();
            }
            WSManager.focusOnLastTable();
            commitToStorage();
        })
        .fail(function(error) {
            Alert.error("Error In Adding Archieved Table", error);
        });
    }
}

function tableBulkAction(action) {
    var deferred = jQuery.Deferred();
    // validation check
    var validAtcion = ["add", "delete"];
    if (validAtcion.indexOf(action) < 0) {
        console.log("Invalid action!");
        return;
    }

    var $tablesSelected = $("#inactiveTablesList")
                            .find(".addArchivedBtn.selected")
                            .closest(".tableInfo");
    var $buttons = $('#archivedTableList').find('.btnLarge');
    var promises = [];
    var failures = [];

    $buttons.addClass('btnInactive');

    $tablesSelected.each(function(index, ele) {

        promises.push((function() {

            var innerDeferred = jQuery.Deferred();
            var $li = $(ele);
            var tableName = $li.data("tablename");
            var tableNum = getTablNum(tableName);

            if (tableNum == undefined) {
                console.error("Error: do not find the table");
                innerDeferred.reject();
                return (innerDeferred.promise());
            }

            if (action === "add") {
                // update gTableIndicesLookup
                gTableIndicesLookup[tableName].active = true;
                gTableIndicesLookup[tableName].timeStamp = (new Date())
                                                            .getTime();

                addTable(tableName, gTables.length, AfterStartup.After)
                .then(function() {
                    // already add the table
                    var activeTable = gHiddenTables.splice(tableNum, 1)[0];
                    doneHandler($li, tableName);
                    return (XcalarSetFree(activeTable.resultSetId));
                })
                .then(function() {
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    failHandler($li, tableName, error);
                    innerDeferred.resolve(error);
                });
            } else if (action === "delete") {
                deleteTable(tableNum, DeleteTable.Delete)
                .then(function() {
                    doneHandler($li, tableName);
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    failHandler($li, tableName, error);
                    innerDeferred.resolve(error);
                });
            }

            return (innerDeferred.promise());

        }).bind(this));
    });

    chain(promises)
    .then(function() {
        // anything faile to alert
        if (failures.length > 0) {
            deferred.reject(failures.join("\n"));
        } else {
            deferred.resolve();
        }
    });

    return (deferred.promise());

    function getTablNum(tableName) {
        for (var i = 0; i < gHiddenTables.length; i ++) {
            if (tableName === gHiddenTables[i].frontTableName) {
                return i;
            }
        }
        return undefined;
    }

    function doneHandler($li, tableName) {
        var $timeLine = $li.closest(".timeLine");
        $li.remove();
        if ($timeLine.find('.tableInfo').length === 0) {
            $timeLine.remove();
        }
        // add sql
        if (action == "add") {
            SQL.add('Send To WorkSheet', {
                "operation": "addTable",
                "tableName": tableName
            });
        } else {
            SQL.add("Delete Table", {
                "operation": "deleteTable",
                "tableName": tableName
            });
        }
    }

    function failHandler($li, tableName, error) {
        $li.find(".addArchivedBtn.selected")
                        .removeClass("selected");
        failures.push(tableName + ": {" + error.error + "}");
    }
}

function addMenuBarTables(tables, active, tableNum) {
    // XXX tables is an array of metaTables;
    generateMenuBarTableHTML(tables, active);
    
    if (!active) {
        $('#archivedTableList').find('.btnLarge').show();
    }
}

function generateMenuBarTableHTML(tables, active) {
    var sortedTables = sortTableByTime(tables); // from oldest to newest
    var numTables = sortedTables.length;

    var dates = getDateTimeForTwoWeeks();
    var p = dates.length - 1;    // the length should be 8
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday'];

    var $tableList;
    if (active == true) {
        $tableList = $('#activeTablesList');
    }  else {
        $tableList = $('#inactiveTablesList');
    }

    for (var i = 0; i < numTables; i++) {
        var table = sortedTables[i][0];
        var timeStamp = sortedTables[i][1];

        // pointer to a day after at 0:00 am
        while (p >= 0 && timeStamp >= dates[p].getTime()) {
            p--;
        }

        var dateIndex = p + 1;
        if ($tableList.find('> li.date' + p).length == 0) {
            var dateText = '';
            switch (dateIndex) {
                case 0:
                    var d = dates[dateIndex];
                    dateText = 'Today ' + d.toLocaleDateString();
                    break;
                case 1:
                    var d = dates[dateIndex];
                    dateText = 'Yesterday ' + d.toLocaleDateString();
                    break;
                // Other days in the week
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    var d = dates[dateIndex];
                    dateText = days[d.getDay()] + ' ' + d.toLocaleDateString();
                    break;
                case 7:
                    dateText = 'Last week';
                    break;
                case 8:
                    dateText = 'Older';
                    break;
                default:
                    break;
            }
            var html = '<li class="clearfix timeLine date' + p + '">' +
                            '<div class="timeStamp">' + 
                                dateText + 
                            '</div>' + 
                            '<ul class="tableList"></ul>'
                        '</li>';
            $tableList.prepend(html);
        }

        var $dateDivider = $tableList.find('> li.date' + p + ' .tableList');
        var numCols = table.tableCols.length - 1;
        var time;
        if (dateIndex >= 7) {
            time = (new Date(timeStamp)).toLocaleDateString();
        } else {
            time = (new Date(timeStamp)).toLocaleTimeString();
        }

        var tableName = table.frontTableName;
        var wsIndex = WSManager.getWorksheetIndex(tableName);

        var wsInfo;

        if (wsIndex == undefined) {
            wsInfo = '<div class="worksheetInfo inactive">No sheet</div>';
        } else {
            wsInfo = '<div class="worksheetInfo worksheet-' + wsIndex + '">' + 
                        WSManager.getWorksheetName(wsIndex) + 
                    '</div>';
        }

        var html = 
            '<li class="clearfix tableInfo"' + 
                'data-tablename="' + tableName + '">' +
                '<div class="timeStampWrap">' +
                    '<div class="timeStamp">' + 
                        '<span class="time">' + 
                            time + 
                        '</span>' +
                    '</div>' + 
                    wsInfo + 
                '</div>' +
                '<div class="tableListBox">' +
                    '<div class="iconWrap">' + 
                        '<span class="icon"></span>'+
                    '</div>'+
                    '<span class="tableName">' +
                        tableName +
                    '</span>' + 
                    '<span class="addArchivedBtn"></span>' + 
                    '<span class="numCols">' + 
                        numCols + 
                    '</span>' + 
                '</div>' + 
                '<ol>';
        for (var j = 0; j <= numCols; j++) {
            if (table.tableCols[j].name != 'DATA') {
                html += '<li>' + table.tableCols[j].name + '</li>'
            }
        }
        html += '</ol></li>';
        $dateDivider.prepend(html);
    }

    function sortTableByTime(tables) {
        var sortedTables = [];
        var numTables = tables.length;
        for (var i = 0; i < numTables; i ++) {
            var tableName = tables[i].frontTableName;
            var timeStamp = gTableIndicesLookup[tableName].timeStamp;

            if (timeStamp === undefined) {
                console.log('Time Stamp undefined');
                timeStamp = (new Date('2014-02-14')).getTime();
            }

            sortedTables.push([tables[i], timeStamp]);
        }

        // sort by time, from the oldest to newset
        sortedTables.sort(function(a, b) {return a[1] - b[1]});

        return (sortedTables);
    }

    function getDateTimeForTwoWeeks() {
        var dates = [];
        var d = new Date()
        d.setHours(0, 0, 0, 0);
        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i ++) {
            var date = new Date(d)
            date.setDate(d.getDate() - i);
            dates.push(date);
        }
        // older than one week
        var older = new Date(d)
        older.setDate(d.getDate() - 13);
        dates.push(older);
        return (dates);
    }
}

function moveMenuBarTable(table) {
    var $tableList = $('#activeTablesList').find('.tableName').filter(
                        function() {
                            return $(this).text() == table.frontTableName;
                        }
                      ).closest('li');
    var timeStamp = gTableIndicesLookup[table.frontTableName].timeStamp;
    var time = (new Date(timeStamp)).toLocaleTimeString();

    $timeLine = $tableList.parent().parent();
    addMenuBarTables([table], IsActive.Inactive);
    $tableList.find('.tableListBox')
              .removeClass('active')
              .next()
              .slideUp(0)
              .removeClass('open')
    $tableList.remove();

    if ($timeLine.find('.tableInfo').length == 0) {
        $timeLine.remove();
    }

}

function updateMenuBarTable(table, tableNum) {
    $('#activeTablesList').find('.tableName').filter(
        function() {
            return $(this).text() == table.frontTableName;
        }
    ).closest('li').remove();
    addMenuBarTables([table], IsActive.Active, tableNum);
}
