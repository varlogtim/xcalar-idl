window.RightSideBar = (function($, RightSideBar) {
    var UDFLookup = []; // Temporary array to store UDF

    RightSideBar.setup = function() {
        setupButtons();
        setuptableListSection();
        setupUDF();
        setupHelpSection();
        setupSQL();
    }

    RightSideBar.initialize = function() {
        RightSideBar.addTables(gTables, IsActive.Active);
        RightSideBar.addTables(gHiddenTables, IsActive.Inactive);
    }

    RightSideBar.addTables = function(tables, active) {
        // XXX tables is an array of metaTables;
        generateTableLists(tables, active);

        if (!active) {
            $('#archivedTableList').find('.btnLarge').show();
        }
    }

    // move table to inactive list
    RightSideBar.moveTable = function(table) {
        var tableName  = table.frontTableName;
        var $tableList = $('#activeTablesList .tableInfo[data-tablename="' + 
                            tableName + '"]');
        var $timeLine  = $tableList.closest(".timeLine");

        RightSideBar.addTables([table], IsActive.Inactive);

        $tableList.find(".tableListBox")
                  .removeClass('active')
                  .next()
                  .slideUp(0)
                  .removeClass('open');

        $tableList.remove();

        // clear time line
        if ($timeLine.find(".tableInfo").length == 0) {
            $timeLine.remove();
        }
    }

    RightSideBar.updateTableInfo = function(table) {
        var tableName  = table.frontTableName;
        var $tableList = $('#activeTablesList .tableInfo[data-tablename="' + 
                            tableName + '"]');

        $tableList.remove();
        RightSideBar.addTables([table], IsActive.Active);
    }

    RightSideBar.tableBulkAction = function(action) {
        var deferred    = jQuery.Deferred();
        var validAtcion = ["add", "delete"];

        // validation check
        if (validAtcion.indexOf(action) < 0) {
            console.error("Invalid action!");
            deferred.reject("Invalid action!");
            return (deferred.promise());
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
                var tableNum = xcHelper.getTableIndexFromName(tableName, true);

                if (tableNum == undefined) {
                    console.error("Error: do not find the table");
                    innerDeferred.reject();
                    return (innerDeferred.promise());
                }

                if (action === "add") {
                    var backTableName = gHiddenTables[tableNum].backTableName;
                    var table         = gTableIndicesLookup[tableName];
                    // update gTableIndicesLookup
                    table.active = true;
                    table.timeStamp = xcHelper.getTimeInMS();

                    addTable(backTableName, gTables.length, AfterStartup.After, 
                             null, tableName)
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

    // setup buttons to open right side bar
    function setupButtons() {
        var delay             = 300;
        var clickable         = true;
        var $btnArea          = $("#rightSideBarBtns");
        var $sliderBtns       = $btnArea.find(".sliderBtn");
        var $rightSideBar     = $("#rightSideBar");
        var $rightBarSections = $rightSideBar.find(".rightBarSection");

        $btnArea.on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }

            var $sliderBtn = $(this);
            var index      = $sliderBtn.index();
            var $section   = $rightSideBar.find('.rightBarSection').eq(index);

            if (!$rightSideBar.hasClass("open") ||
                !$section.hasClass("active")) 
            {
                // right side bar is closed or
                // switch to this section
                $sliderBtns.removeClass("active");
                $sliderBtn.addClass("active");

                $rightBarSections.removeClass("active")
                $rightBarSections.removeClass("lastOpen");
                // mark the section and open the right side bar
                $section.addClass("active");
                $section.addClass("lastOpen");

                $rightSideBar.addClass("open");

                if ($section.attr("id") === "sqlSection") {
                    SQL.scrollToBottom($('#rightBarTextArea'));
                    $("#sqlButtonWrap").show();
                } else {
                    $("#sqlButtonWrap").hide();
                }
            } else {
                // section is active, close right side bar
                if (!$rightSideBar.hasClass('poppedOut')) {
                    // disable closing if popped out
                    closeRightSidebar();
                }
                
            }

            delayClick();
        });

        $rightSideBar.on("click", ".iconClose", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                setTimeout(function() {
                    closeRightSidebar();
                }, 100);
            } else {
                closeRightSidebar();
            }
            popInModal($rightSideBar);
        });

        $rightSideBar.on("click", ".popOut", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                popInModal($rightSideBar);
            } else {
                popOutModal($rightSideBar);
            }
            
        });

        $rightSideBar.on("click", ".machineSQL", function() {
            $(this).removeClass("machineSQL");
            $(this).addClass("humanSQL");
            $("#rightBarMachineTextArea").hide();
            $("#rightBarTextArea").show();
        });

        $rightSideBar.on("click", ".humanSQL", function() {
            $(this).removeClass("humanSQL");
            $(this).addClass("machineSQL");
            $("#rightBarMachineTextArea").show();
            $("#rightBarTextArea").hide();
        });

        $rightSideBar.draggable({
            handle: '.heading',
            containment: 'window',
            cursor: '-webkit-grabbing'
        });

        $rightSideBar.resizable({
            handles: "n, e, s, w, se",
            minHeight: 500,
            minWidth: 264,
            containment: "document"
        });

        $("#pulloutTab").click(function() {
            if (!clickable) {
                return;
            }

            var $section = $rightSideBar.children(".lastOpen");
            var index    = 0;

            if (!$rightSideBar.hasClass("open")) {
                if ($section.length == 0) {
                     // first time open right side bar
                    $section = $rightBarSections.eq(0);
                } else {
                    // open last opened section
                    index = $section.index();
                }

                $section.addClass("active")
                        .addClass("lastOpen");

                $sliderBtns.eq(index).addClass("active");

                $rightSideBar.addClass("open");
            } else {
                closeRightSidebar();
            }

            delayClick();
        });

        function delayClick() {
            clickable = false;

            setTimeout(function() {
                clickable = true;
            }, delay);
        }

        function closeRightSidebar() {
            $rightSideBar.removeClass("open");
            $sliderBtns.removeClass("active");
            // since close right side bar has slider animition,
            // delay the close of section
            setTimeout(function() {
                $rightBarSections.removeClass("active");
            }, delay);
        }
    }

    // setup table list section
    function setuptableListSection() {
        var $tabsSection       = $("#tableListSectionTabs");
        var $tableListSections = $("#tableListSections .tableListSection");
        var $listBtns          = $("#archivedTableList .buttonWrap .btnLarge");

        $tabsSection.on("click", ".tableListSectionTab", function() {
            var $tab  = $(this);
            var index = $(this).index();

            $tabsSection.find(".active").removeClass("active");
            $tab.addClass('active');

            $tableListSections.hide();
            $tableListSections.eq(index).show();
        });

        // toggle table list box
        $("#tableListSections").on("click", ".tableListBox", function() {
            var $box = $(this);
            var $ol  = $box.next();

            if ($ol.hasClass("open") && $box.hasClass("active")) {
                $box.removeClass("active");
                $ol.slideUp(200).removeClass("open");
            } else {
                $box.addClass("active");
                $ol.slideDown(200).addClass("open");
            }
        });

        $("#inactiveTablesList").on("click", ".addArchivedBtn", function() {
            var $btn = $(this);

            $btn.toggleClass("selected");

            if ($("#archivedTableList .addArchivedBtn.selected").length === 0) {
                $listBtns.addClass('btnInactive');
            } else {
                $listBtns.removeClass('btnInactive');
            }
            // stop propogation
            return false;
        });

        $("#submitTablesBtn").click(function() {
            addBulkTableHelper();
        });

        $("#deleteTablesBtn").click(function() {
            Alert.show({
                "title": "DELETE ARCHIEVED TABLES",
                "msg": "Are you sure you want to delete selected tables?",
                "isCheckBox": true,
                "confirm": function() {
                    RightSideBar.tableBulkAction("delete")
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

    // setup UDF section
    function setupUDF() {
        
        var textArea = document.getElementById("udf-codeArea");
        var editor   = CodeMirror.fromTextArea(textArea, {
            "mode": {
                "name": "python",
                "version": 3,
                "singleLineStringErrors": false
            },
            "lineNumbers": true,
            "indentUnit": 4,
            "matchBrackets": true
        });

        /* switch between UDF sections */
        var $sections = $("#udfSection .mainSection");
        var $radios   = $("#udf-tabs .select-item .radio");

        $("#udf-tabs").on("click", ".select-item", function() {
            var $option = $(this);
            var tabId = $option.data("tab");

            $radios.removeClass("checked");
            $option.find(".radio").addClass("checked");

            $sections.addClass("hidden");
            $("#" + tabId).removeClass("hidden");

            if (tabId === "udf-fnSection") {
                editor.refresh();
            }
        });
        /* end of switch between UDF sections */

        /* upload file section */
        var $inputFile = $("#udf-fileBrowser");
        var $filePath  = $("#udf-filePath");
        // browser file
        $("#udf-browseBtn").click(function() {
            $inputFile.click();
            return false;
        });
        // display the chosen file's path
        $inputFile.change(function() {
            $filePath.val($(this).val().replace(/C:\\fakepath\\/i, ''));
        });
        // clear file path
        $("#udf-clearPath").click(function() {
            $inputFile.val("");
            $filePath.val("");
            $filePath.focus();
        });
        // upload file
        $("#udf-fileUpload").click(function() {
            var file = $inputFile[0].files[0];
            var path = file.name;
            console.log(path, file);
            var moduleName = path.substring(0, path.indexOf("."));
            var functionName = moduleName;
            if (path == "") {
                var text = "File Path is empty," + 
                           " please choose a file you want to upload";

                StatusBox.show(text, $filePath, true, 150);
            } else {
                var reader = new FileReader();
                reader.onload = function(event) {
                    console.log(event.target.result);
                    // XXX: Change cursor, handle failure
                    XcalarUploadPython(moduleName, functionName,
                                       event.target.result)
                    .then(function() {
                        // clearance
                        $inputFile.val("");
                        $filePath.val("");
                        uploadSuccess();
                    });
                }
                reader.readAsText(file);
            }
        });
        /* end of upload file section */

        /* function input section */
        var $listSection   = $("#udf-fnList");
        var $listDropdown  = $("#udf-fnMenu");
        var $template      = $("#udf-fnTemplate");
        var $downloadBtn   = $("#udf-fnDownload");

        $("#udfSection .rightBarContent").click(function(event) {
            event.stopPropagation();

            $listSection.removeClass('open');
            $listDropdown.hide();
        });
        // open drowdown menu
        $listSection.on("click", function(event) {
            event.stopPropagation();

            $listSection.toggleClass("open");
            $listDropdown.toggle();
        });
        // select one option
        $listSection.on("click", ".list li", function(event) {
            var $li = $(this);

            event.stopPropagation();

            $listSection.removeClass('open');
            $listDropdown.hide();

            $template.val($li.text());

            if ($li.attr("name") === "blank") {
                $downloadBtn.addClass("hidden");
            } else {
                $downloadBtn.removeClass("hidden");
            }
        });
        /* end of function input section */

        /* upload written function section */
        var $fnName = $("#udf-fnName");

        $("#udf-fnUpload").click(function() {
            var fileName = $fnName.val();

            if (fileName == "") {
                var text = "File name is empty, please input a function name!";

                StatusBox.show(text, $fnName, true, 50);
                return;
            }
            
            // Get code written and call thrift call to upload
            var entireString = editor.getValue();
            // XXX: Set these properly
            var moduleName;
            if (fileName.indexOf(".") >= 0) {
                moduleName = fileName.substring(0,fileName.indexOf("."));
            } else {
                moduleName = fileName;
            }
            var functionName = moduleName;

            // XXX: Change cursor, handle failure

            XcalarUploadPython(moduleName, functionName, entireString)
            .then(function() {
                UDFLookup.push({"moduleName": moduleName,
                                "functionName": functionName});
                // clearance
                $fnName.val("");
                $template.val("");
                $downloadBtn.addClass("hidden");
                uploadSuccess();
            });
        });
        /* end of upload written function section */
    }

    function uploadSuccess() {
        var alertOptions = {};
        alertOptions.title = "UPLOAD SUCCESS";
        alertOptions.msg = "Your python script has been successfully uploaded!";
        alertOptions.isCheckBox = false;
        alertOptions.confirm = function() {
            $("#udfBtn").parent().click();
        }
        Alert.show(alertOptions);
    }

    RightSideBar.storeUDFLookup = function() {
        return (JSON.stringify(UDFLookup));
    }
    
    RightSideBar.reinstateUDFLookup = function(str) {
        UDFLookup = jQuery.parseJSON(str);
    }

    function setupSQL() {
        $("#rightBarMachineTextArea").hide();
    }

    // XXX Current it works as a reset button
    function setupHelpSection() {
        // XXX !!! landmine section to restart node
        $("#helpSubmit").click(function() {
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
                // refresh page
                location.reload();
            });
        });

        // Toggleing helper tooltips
        $('#helpOnOff').click(function() {
            toggleRefresh($(this));
        });

        function toggleRefresh($target) {
            if ($target.hasClass('off')) {
                $('#helpOnOff').removeClass('off');
                Tips.display();
                // HelpController.tooltipOn();
            } else {
                $('#helpOnOff').addClass('off');
                Tips.destroy();
                // HelpController.tooltipOff();
            }
        }

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
                "title"  : "SEND TO WORKSHEET",
                "instr"  : instr,
                "optList": {
                    "label": "Worksheet to send:",
                    "list" : WSManager.getWorksheetLists(true),
                },
                "confirm": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#rightSideBar.faux").remove();

                    var wsName  = Alert.getOptionVal();
                    var wsIndex = WSManager.getWorksheetByName(wsName);

                    if (wsIndex == undefined) {
                        Alert.error("Invalid worksheet name", 
                                    "please input a valid name!");
                    } else {
                        $noSheetTables.each(function() {
                            var tableName = $(this).data("tablename");
                            WSManager.addTable(tableName, wsIndex);
                        });

                        addBulkTable();
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
            RightSideBar.tableBulkAction("add")
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

    function generateTableLists(tables, active) {
        var sortedTables = sortTableByTime(tables); // from oldest to newest

        var dates = xcHelper.getTwoWeeksDate();
        var p     = dates.length - 1;    // the length should be 8
        var days  = ["Sunday",    "Monday",  "Tuesday", "Wednesday", 
                     "Thursday",  "Friday",  "Saturday"];

        var $tableList = (active === true) ? $("#activeTablesList") : 
                                             $("#inactiveTablesList");

        for (var i = 0; i < sortedTables.length; i++) {
            var table     = sortedTables[i][0];
            var timeStamp = sortedTables[i][1];

            // pointer to a day after at 0:00 am
            while (p >= 0 && (timeStamp >= dates[p].getTime())) {
                --p;
            }

            var dateIndex = p + 1;

            // when no such date exists
            if ($tableList.find("> li.date" + p).length === 0) {
                var date = "";

                switch (dateIndex) {
                    case 0:
                        var d = dates[dateIndex];
                        date = "Today " + xcHelper.getDate("/", d);
                        break;
                    case 1:
                        var d = dates[dateIndex];
                        date = "Yesterday " + xcHelper.getDate("/", d);
                        break;
                    // Other days in the week
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        var d = dates[dateIndex];
                        date = days[d.getDay()] + " " 
                                                + xcHelper.getDate("/", d);
                        break;
                    case 7:
                        date = "Last week";
                        break;
                    case 8:
                        date = "Older";
                        break;
                    default:
                        break;
                }

                var html = 
                    '<li class="clearfix timeLine date' + p + '">' +
                        '<div class="timeStamp">' + date + '</div>' + 
                        '<ul class="tableList"></ul>'
                    '</li>';

                $tableList.prepend(html);
            }

            var $dateDivider = $tableList.find(".date" + p + " .tableList");
            var numCols      = table.tableCols.length;
            var time;

            if (dateIndex >= 7) {
                time = xcHelper.getDate("-", null, timeStamp);
            } else {
                time = xcHelper.getTime(null, timeStamp);
            }

            var tableName = table.frontTableName;
            var wsIndex   = WSManager.getWorksheetIndex(tableName);
            var wsInfo;

            if (wsIndex == undefined) {
                wsInfo = '<div class="worksheetInfo inactive">No sheet</div>';
            } else {
                wsInfo = 
                    '<div class="worksheetInfo worksheet-' + wsIndex + '">' + 
                        WSManager.getWorksheetName(wsIndex) + 
                    '</div>';
            }

            var html = 
                '<li class="clearfix tableInfo" ' + 
                    'data-tablename="' + tableName + '">' +
                    '<div class="timeStampWrap">' +
                        '<div class="timeStamp">' + 
                            '<span class="time">' + time + '</span>' +
                        '</div>' + 
                        wsInfo + 
                    '</div>' +
                    '<div class="tableListBox">' +
                        '<div class="iconWrap">' + 
                            '<span class="icon"></span>'+
                        '</div>'+
                        '<span class="tableName">' + tableName + '</span>' + 
                        '<span class="addArchivedBtn"></span>' + 
                        '<span class="numCols">' + numCols + '</span>' + 
                    '</div>' + 
                    '<ol>';

            for (var j = 0; j < numCols; j++) {
                // if (table.tableCols[j].name != 'DATA') {
                html += '<li>' + table.tableCols[j].name + '</li>'
                // }
            }

            html += '</ol></li>';

            $dateDivider.prepend(html);
        }

        function sortTableByTime(tables) {
            var sortedTables = [];

            tables.forEach(function(table) {
                var tableName = table.frontTableName;
                var timeStamp = gTableIndicesLookup[tableName].timeStamp;

                if (timeStamp === undefined) {
                    console.error("Time Stamp undefined");
                    timeStamp = xcHelper.getTimeInMS(null, "2014-02-14");
                }

                sortedTables.push([table, timeStamp]);
            });

            // sort by time, from the oldest to newset
            sortedTables.sort(function(a, b) {return a[1] - b[1]});

            return (sortedTables);
        }

    }

    function popOutModal($rightSideBar) {
        console.log('popping out');
        $rightSideBar.addClass('poppedOut');
        $('#rightSideBarBtns').appendTo($rightSideBar);
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', 'pop back in');
        $('.tooltip').hide();

    }

    function popInModal($rightSideBar) {
        $rightSideBar.removeClass('poppedOut');
        $('#rightSideBarBtns').appendTo('#worksheetBar');
        $rightSideBar.attr('style', "");
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', 'pop out');
        $('.tooltip').hide();
    }

    return (RightSideBar);
}(jQuery, {}));

window.HelpController = (function($, HelpController){

    HelpController.tooltipOff = function() {
        $('body').addClass('tooltipOff');
        $('#helpOnOff').addClass('off');
    };

    HelpController.tooltipOn = function() {
        $('body').removeClass('tooltipOff');
        $('#helpOnOff').removeClass('off');
    };

    HelpController.isOff = function() {
        return ($('body').hasClass('tooltipOff'));
    }

    return (HelpController);

}(jQuery, {}));
