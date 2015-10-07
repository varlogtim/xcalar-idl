window.RightSideBar = (function($, RightSideBar) {
    var editor;
    var storedPython = {};
    
    RightSideBar.setup = function() {
        setupButtons();
        setuptableListSection();
        setupUDF();
        setupHelpSection();
        setupSQL();
        CLIBox.setup();
    };

    RightSideBar.clear = function() {
        $("#activeTablesList").empty();
        $("#submitTablesBtn").addClass('btnInactive');
        $("#deleteTablesBtn").addClass('btnInactive');
        $('#archivedTableList .secondButtonWrap').hide();
        $('#inactiveTablesList').empty();
        $("#aggTablesList").empty();
        $("#aggregateTableList").find('.clearAll, .selectAll').hide();
        $("#orphanedTablesList").empty();
        $("#orphanedTableList").find('.clearAll, .selectAll').hide();

        // clear CodeMirror
        editor.setValue("");
        editor.clearHistory();
        storedPython = {};
        $('#udf-fnMenu').empty().append('<li name="blank">Blank Function</li>');
    };

    RightSideBar.initialize = function() {
        var activeTables = [];
        var hiddenTables = [];

        for (var tableId in gTables) {
            var table = gTables[tableId];
            if (table.active) {
                activeTables.push(table);
            } else {
                hiddenTables.push(table);
            }
        }

        RightSideBar.addTables(activeTables, IsActive.Active);
        RightSideBar.addTables(hiddenTables, IsActive.Inactive);

        generateOrphanList(gOrphanTables);
        RightSideBar.refreshAggTables();
        setLastRightSidePanel();
        setupUDFList();
    };

    RightSideBar.addTables = function(tables, active) {
        // tables is an array of metaTables;
        generateTableLists(tables, active);

        if (!active) {
            $('#archivedTableList').find('.btnLarge').show();
        }
    };

    RightSideBar.refreshAggTables = function() {
        var aggInfo = WSManager.getAggInfos();
        var tables = [];

        for (var key in aggInfo) {
            // extract tableId, colName, and aggOps from key
            var keySplits = key.split("#");
            var tableId = keySplits[0];
            var aggStr  = generateAggregateString(keySplits[1], keySplits[2]);

            tables.push({
                "key"      : key,
                "tableName": gTables[tableId].tableName,
                "aggStr"   : aggStr,
                "value"    : aggInfo[key]
            });
        }

        // sort by table Name
        tables.sort(function(a, b) {
            var compareRes = a.tableName.localeCompare(b.tableName);
            if (compareRes === 0) {
                // if table name is the same, compare aggStr
                return (a.aggStr.localeCompare(b.aggStr));
            } else {
                return compareRes;
            }
        });

        generateAggTableList(tables);
    };

    RightSideBar.removeAggTable = function(tableId) {
        var $list = $('#aggTablesList .tableInfo[data-id="' + tableId + '"]');
        if ($list.length > 0) {
            var key = $list.data("key");
            WSManager.removeAggInfo(key);
            $list.remove();
        }
    };

    // move table to inactive list
    RightSideBar.moveTable = function(tableId) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        var $timeLine = $tableList.closest(".timeLine");
        var table = xcHelper.getTableFromId(tableId);

        RightSideBar.addTables([table], IsActive.Inactive);

        $tableList.find(".tableListBox")
                  .removeClass('active')
                  .next()
                  .slideUp(0)
                  .removeClass('open');

        $tableList.remove();

        // clear time line
        if ($timeLine.find(".tableInfo").length === 0) {
            $timeLine.remove();
        }
    };

    RightSideBar.renameTable = function(tableId, newTableName) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');
        $tableList.find(".tableName").text(newTableName);

        // refresh agg list
        RightSideBar.refreshAggTables();
    };

    RightSideBar.updateTableInfo = function(tableId) {
        var $tableList = $('#activeTablesList .tableInfo[data-id="' +
                            tableId + '"]');

        $tableList.remove();

        var table = gTables[tableId];
        RightSideBar.addTables([table], IsActive.Active);
    };

    RightSideBar.tableBulkAction = function(action, tableType) {
        var deferred    = jQuery.Deferred();
        var validAction = ["add", "delete"];

        // validation check
        if (validAction.indexOf(action) < 0) {
            deferred.reject("Invalid action!");
            return (deferred.promise());
        }
        var $tableList;

        if (tableType === TableType.InActive) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.Orphan) {
            $tableList = $('#orphanedTableList');
        } else if (tableType === TableType.Agg) {
            $tableList = $("#aggregateTableList");
        }

        var $tablesSelected = $tableList.find(".addTableBtn.selected")
                                        .closest(".tableInfo");
        var $buttons = $tableList.find('.btnLarge');
        var promises = [];
        var failures = [];

        $buttons.addClass('btnInactive');

        $tablesSelected.each(function(index, ele) {
            promises.push((function() {
                var innerDeferred = jQuery.Deferred();

                var $li     = $(ele);
                var tableId = $li.data("id");
                var table   = gTables[tableId];
                var tableName;

                if (tableType === TableType.Orphan ||
                    tableType === TableType.Agg)
                {
                    tableName = $li.data("tablename");
                } else {
                    if (table == null) {
                        innerDeferred.reject("Error: do not find the table");
                        return (innerDeferred.promise());
                    }

                    tableName = table.tableName;
                }

                if (action === "add") {
                    if (tableType === TableType.Orphan) {
                        renameOrphanIfNeeded(tableName)
                        .then(function(newTableName) {
                            tableName = newTableName;
                            tableId = xcHelper.getTableId(tableName);
                            WSManager.addTable(tableId);
                            return (prepareOrphanForActive(tableName));
                        })
                        .then(function() {
                            return (addTable(tableName, null,
                                    AfterStartup.After, null));
                        })
                        .then(function(){
                            doneHandler($li, tableName);
                            var tableIndex = gOrphanTables.indexOf(tableName);
                            gOrphanTables.splice(tableIndex, 1);
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            WSManager.removeTable(tableId);
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    } else if (tableType === TableType.Agg) {
                        var key = $li.data("key");
                        WSManager.addTable(tableId);

                        prepareOrphanForActive(tableName)
                        .then(function() {
                            return (addTable(tableName, null,
                                            AfterStartup.After, null));
                        })
                        .then(function(){
                            WSManager.activeAggInfo(key, tableId);
                            // RightSideBar.refreshAggTables() is called after
                            // all promises done
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            WSManager.removeTable(tableId);
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    } else {
                        var lookupTable = gTables[tableId];
                        lookupTable.active = true;
                        lookupTable.timeStamp = xcHelper.getTimeInMS();

                        // should release the old resultSetId and than add

                        XcalarSetFree(table.resultSetId)
                        .then(function() {
                            table.resultSetId = -1;
                            return (setTableMeta(tableName));
                        })
                        .then(function() {
                            return (addTable(tableName, null,
                                             AfterStartup.After, null));
                        })
                        .then(function() {
                            doneHandler($li, tableName);
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            failHandler($li, tableName, error);
                            innerDeferred.resolve(error);
                        });
                    }
                } else if (action === "delete") {
                    var tableIdOrName;

                    if (tableType === TableType.Orphan) {
                        tableIdOrName = tableName;
                    } else {
                        tableIdOrName = tableId;
                    }

                    deleteTable(tableIdOrName, tableType)
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
        })
        .always(function() {
            // update
            RightSideBar.refreshAggTables();
        });

        return (deferred.promise());

        function doneHandler($li, tableName) {
            var $timeLine = $li.closest(".timeLine");

            if (gMinModeOn) {
                handlerCallback();
            } else {
                $li.addClass("transition").slideUp(150, function() {
                    handlerCallback();
                });
            }

            // Should add table id/tableName!
            SQL.add("RightSideBar Table Actions", {
                "operation": SQLOps.TableBulkActions,
                "action"   : action,
                "tableName": tableName,
                "tableType": tableType
            });

            function handlerCallback() {
                $li.remove();
                if ($timeLine.find('.tableInfo').length === 0) {
                    $timeLine.remove();
                    if ($tableList.find('.tableInfo').length === 0 ) {
                        if ($tableList.closest('#orphanedTableList').length !== 0) {
                            $tableList.find('.selectAll, .clearAll').hide();
                        } else {
                            $tableList.find('.secondButtonWrap').hide();
                        }
                    }
                }
            }
        }

        function failHandler($li, tableName, error) {
            $li.find(".addTableBtn.selected")
                    .removeClass("selected");
            failures.push(tableName + ": {" + error.error + "}");
        }
    };

    function renameOrphanIfNeeded(tableName) {
        var deferred = jQuery.Deferred();
        tableId = xcHelper.getTableId(tableName);
        var newTableName;
        if (!tableId) {
            newTableName = tableName + Authentication.getHashId();
            var sqlOptions = {
                "operation": SQLOps.RenameOrphanTable,
                "oldName"  : tableName,
                "newName"  : newTableName
            };
            XcalarRenameTable(tableName, newTableName, sqlOptions)
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(function(error) {
                deferred.reject(error);
            });
        } else {
            deferred.resolve(tableName);
        }

        return (deferred.promise());
    }
    

    function prepareOrphanForActive(tableName) {
        var deferred = jQuery.Deferred();

        XcalarMakeResultSetFromTable(tableName)
        .then(function(result) {
            var newTableCols = [];
            var colName = result.keyAttrHeader.name;
            var index = 1;
            if (colName !== 'recordNum') {
                var progCol = ColManager.newCol({
                            "index"   : 1,
                            "name"    : colName,
                            "width"   : gNewCellWidth,
                            "isNewCol": false,
                            "userStr" : '"' + colName + '" = pull(' +
                                        colName + ')',
                            "func": {
                                "func": "pull",
                                "args": [colName]
                            }
                        });

                newTableCols.push(progCol);
                index++;
            }
            // new "DATA" column
            newTableCols.push(ColManager.newDATACol(index));
            return (setgTable(tableName, newTableCols));
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.error(error);
            deferred.reject(error);
        });
        return (deferred.promise());
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

                $rightBarSections.removeClass("active");
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
                if ($section.attr("id") === "cliSection") {
                    CLIBox.realignNl();
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

        $rightSideBar.on("click", ".copySQL", function() {
            var $hiddenInput = $("<input>");
            $("body").append($hiddenInput);
            $hiddenInput.val(JSON.stringify(SQL.getHistory())).select();
            document.execCommand("copy");
            $hiddenInput.remove();
        });

        $rightSideBar.draggable({
            handle     : '.heading.draggable',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });

        $rightSideBar.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : 500,
            minWidth   : 264,
            containment: "document"
        });

        $rightSideBar.on("resize", function() {
            CLIBox.realignNl();
        });

        $("#pulloutTab").click(function() {
            if (!clickable) {
                return;
            }

            var $section = $rightSideBar.children(".lastOpen");
            var index    = 0;

            if (!$rightSideBar.hasClass("open")) {
                if ($section.length === 0) {
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
        var $selectBtns        = $('#archivedTableList .secondButtonWrap,' +
                                   '#orphanedTableList .secondButtonWrap,' +
                                   '#aggregateTableList .secondButtonWrap');

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
                if ($ol.children().length === 0) {
                    return;
                }
                $box.addClass("active");
                $ol.slideDown(200).addClass("open");
            }
        });

        $selectBtns.find('.selectAll').click(function() {
            var $tableListSection = $(this).closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');
            $listBtns.removeClass('btnInactive');
            $tableListSection.find('.addTableBtn').addClass("selected");
        });

        $selectBtns.find('.clearAll').click(function() {
            var $tableListSection = $(this).closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');
            $listBtns.addClass('btnInactive');
            $tableListSection.find('.addTableBtn').removeClass("selected");
        });

        $selectBtns.find('.refresh').click(function() {
            refreshOrphanList();
        });

        $("#inactiveTablesList, #orphanedTablesList, #aggregateTableList")
        .on("click", ".addTableBtn", function() {
            var $btn = $(this);

            $btn.toggleClass("selected");
            var $tableListSection = $btn.closest('.tableListSection');
            var $listBtns = $tableListSection.find('.buttonWrap')
                                             .find('.btnLarge');

            if ($tableListSection.find(".addTableBtn.selected").length === 0) {
                $listBtns.addClass('btnInactive');
            } else {
                $listBtns.removeClass('btnInactive');
            }
            // stop propogation
            return false;
        });

        $('#tableListSections').find(".tableListSection").on("mouseenter",
                                                       ".tableName", function(){
            var $this = $(this);
            if (this.offsetWidth < this.scrollWidth){
                $this.attr({
                    'data-container': 'body',
                    'data-toggle'   : 'tooltip'
                });
            } else {
                $this.removeAttr('title data-container data-toggle');
            }
        });

        $("#submitTablesBtn").click(function() {
            addBulkTableHelper(TableType.InActive);
        });

        $('#submitOrphanedTablesBtn').click(function() {
            addBulkTable(TableType.Orphan);
        });

        $("#submitAggTablesBtn").click(function() {
            addBulkTableHelper(TableType.Agg);
        });

        $("#deleteTablesBtn, #deleteOrphanedTablesBtn").click(function() {
            var tableType;
            if ($(this).is('#deleteTablesBtn')) {
                tableType = TableType.InActive;
            } else {
                tableType = TableType.Orphan;
            }
            Alert.show({
                "title": "DELETE " + tableType + " TABLES",
                "msg"  : "Are you sure you want to delete the " +
                         "selected tables?",
                "isCheckBox": true,
                "confirm"   : function() {
                    RightSideBar.tableBulkAction("delete", tableType)
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
    RightSideBar.getEditor = function() {
        return (editor);
    };

    function setupUDF() {
        var textArea = document.getElementById("udf-codeArea");

        editor = CodeMirror.fromTextArea(textArea, {
            "mode": {
                "name"                  : "python",
                "version"               : 3,
                "singleLineStringErrors": false
            },
            "lineNumbers"  : true,
            "indentUnit"   : 4,
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
            var val  = $filePath.val().trim();
            var file = $inputFile[0].files[0];
            var path;
            if (typeof file !== "object") {
                path = "";
            } else {
                path = file.name;
            }
            
            var moduleName = path.substring(0, path.indexOf("."));
            var $submitBtn = $(this);
            if (val === "") {
                var text = "File Path is empty," +
                           " please choose a file you want to upload";

                StatusBox.show(text, $filePath, true, 190);
            } else if (path === "") {
                var text = "File Path is invalid," +
                           " please choose a file you want to upload";

                StatusBox.show(text, $filePath, true, 190);
            } else {
                var reader = new FileReader();
                reader.onload = function(event) {
                    xcHelper.disableSubmit($submitBtn);
                    // XXX: Change cursor, handle failure
                    var entireString = event.target.result;

                    uploadPython(moduleName, entireString)
                    .always(function() {
                        xcHelper.enableSubmit($submitBtn);
                    });
                };

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
            var val = $li.text();
            event.stopPropagation();

            $listSection.removeClass('open');
            $listDropdown.hide();

            $template.val(val);

            if ($li.attr("name") === "blank") {
                $downloadBtn.addClass("hidden");
                editor.setValue("");
            } else {
                $downloadBtn.removeClass("hidden");
                editor.setValue(storedPython[val]);
            }
        });
        /* end of function input section */

        /* upload written function section */
        var $fnName = $("#udf-fnName");

        $("#udf-fnUpload").click(function() {
            var fileName = $fnName.val();
            var text;

            if (fileName === "") {
                text = "Module name is empty, please input a module name!";
                StatusBox.show(text, $fnName, true, 50);
                return;
            }

            // Get code written and call thrift call to upload
            var entireString = editor.getValue();
            if (entireString.trim() === "") {
                text = "Function field is empty, please input a function.";
                StatusBox.show(text, $('.CodeMirror'), false, 30,
                                { "side": "left" });
                return;
            }

            var moduleName;
            if (fileName.indexOf(".") >= 0) {
                moduleName = fileName.substring(0, fileName.indexOf("."));
            } else {
                moduleName = fileName;
            }

            uploadPython(moduleName, entireString, true);
        });
        /* end of upload written function section */

        multiJoinUDFUpload();

        function uploadPython(moduleName, entireString, isFnInputSection) {
            var deferred = jQuery.Deferred();

            if (storedPython.hasOwnProperty(moduleName)) {
                var msg = "Python module " + moduleName + " already exists," +
                            " do you want to replcae it with this module?"
                Alert.show({
                        "title"     : "Duplicate Module",
                        "msg"       : msg,
                        "isCheckBox": false,
                        "confirm"   : function() { uploadHelper(); },
                        "cancel"    : function() { deferred.resolve(); }
                });
            } else {
                uploadHelper();
            }

            function uploadHelper() {
                // XXX: Change cursor, handle failure
                XcalarUploadPython(moduleName, entireString)
                .then(function() {
                    storePython(moduleName, entireString);
                    commitToStorage();
                    uploadSuccess();

                    // clearance
                    if (isFnInputSection) {
                        $fnName.val("");
                        $template.val("");
                        $downloadBtn.addClass("hidden");
                    } else {
                        $inputFile.val("");
                        $filePath.val("");
                    }

                    deferred.resolve();
                })
                .fail(function(error) {
                    var title = "Upload Error";
                    if (error.status === StatusT.StatusPyExecFailedToCompile) {
                        // XX might not actually be a syntax error
                        title = "Syntax Error";
                    }

                    Alert.error(title, error);
                    deferred.reject(error);
                });
            }

            return (deferred.promise());
        }
    }

    function storePython(moduleName, entireString) {
        var $listDropdown = $("#udf-fnMenu");

        if (storedPython.hasOwnProperty(moduleName)) {
            // the case of overwrite a module
            $listDropdown.children().filter(function() {
                return $(this).text() === moduleName;
            }).remove();
        }

        var $blankFunc = $listDropdown.children('li[name=blank]');
        var li = '<li>' + moduleName + '</li>';
        $blankFunc.after(li);
        storedPython[moduleName] = entireString;
    }

    function setupUDFList() {
        var $listDropdown = $("#udf-fnMenu");
        var li;
        var $blankFunc = $listDropdown.find('li[name=blank]');
        for (var udf in storedPython) {
            li = '<li>' + udf + '</li>';
            $blankFunc.after(li);
        }
    }

    RightSideBar.getUDFs = function() {
        return (storedPython);
    };

    RightSideBar.restoreUDFs = function(udfs) {
        storedPython = udfs;
    };

    function multiJoinUDFUpload() {
        var moduleName = "multiJoinModule";
        var entireString =
            'def multiJoin(*arg):\n' +
                '\tstri = ""\n' +
                '\tfor a in arg:\n' +
                    '\t\tstri = stri + str(a) + ".Xc."\n' +
                '\treturn stri\n';
        XcalarUploadPython(moduleName, entireString);
    }

    function uploadSuccess() {
        Alert.show({
            "title"     : "UPLOAD SUCCESS",
            "msg"       : "Your python script has been successfully uploaded!",
            "isCheckBox": false,
            "confirm"   : function() {
                $("#udfBtn").parent().click();
            }
        });
    }

    function setupSQL() {
        $("#rightBarMachineTextArea").hide();
    }

    // XXX Current it works as a reset button
    function setupHelpSection() {
        // XXX !!! landmine section to restart node
        $("#helpSubmit").click(function() {
            console.info('Reset Fired!');
            commitToStorage()
            .then(function() {
                console.info("Shut Down Successfully!");
                return (XcalarStartNodes(2));
            }, function(error) {
                console.error("Failed to write! Commencing shutdown", error);
                return (XcalarStartNodes(2));
            })
            .then(function() {
                console.info("Restart Successfully!");
                // refresh page
                location.reload();
            });
        });

        // Toggleing helper tooltips
        $('#helpOnOff').click(function() {
            toggleRefresh($(this));
        });

        Intro.setOptions({
            onComplete: function() {
                $('.intro-emptybox').remove();
                $('#demoScreen [data-introstep]').removeClass('hover');
                $('#demoScreen').remove();
                $('#container').show();
            },
            onNextStep: function(el) {
                $('#demoScreen [data-introstep]').removeClass('hover');
                el.addClass('hover');
            }
        });

        $('#workbookWT').click(function() {
            introHelper('workbookDemo', w1_en);
        });

        $('#datastoreWT1').click(function() {
            var options = {
                onStart: function() {
                    var emptyBox = '<div class="intro-emptybox" style="' +
                                        'position:absolute;height: 40px;' +
                                        'margin-top:-5px; margin-left: 15px;' +
                                        'width: 100px;' +
                                    '" data-introstep="6"></div>';
                    $('#demoScreen #fileNameSelector').append(emptyBox);
                }
            };

            introHelper('datastoreDemo1', w2_en, options);
        });

        $('#datastoreWT2').click(function() {
            introHelper('datastoreDemo2', w3_en);
        });

        function toggleRefresh($target) {
            if ($target.hasClass('off')) {
                $('#helpOnOff').removeClass('off');
                Tips.display();
            } else {
                $('#helpOnOff').addClass('off');
                Tips.destroy();
            }
        }
    }

    function introHelper(demoType, textArray, options) {
        var userOptions = {popoverText: textArray};
        if (options && typeof options === "object") {
            $.extend(userOptions, options);
        }

        Intro.setOptions(userOptions);

        $('body').append('<div id="demoScreen"></div>');

        $('#demoScreen').load(paths[demoType],
            function(response, status) {
                if (status === 'success') {
                    $('#container:not(.demoContainer)').hide();
                    Intro.start();
                } else {
                    Alert.error("Error", "Walkthrough Unavailable");
                }
            }
        );
    }

    function addBulkTableHelper(tableType) {
        var $tableList;

        if (tableType === TableType.InActive) {
            $tableList = $('#archivedTableList');
        } else if (tableType === TableType.Agg) {
            $tableList = $("#aggregateTableList");
        }

        var $tables = $tableList.find(".addTableBtn.selected")
                                .closest(".tableInfo");

        var $noSheetTables = $tables.filter(function() {
            return $(this).find(".worksheetInfo").hasClass("inactive");
        });

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
                    "list" : WSManager.getWSLists(true)
                },
                "confirm": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#rightSideBar.faux").remove();

                    var wsName  = Alert.getOptionVal();
                    var wsIndex = WSManager.getWSByName(wsName);

                    if (wsIndex == null) {
                        Alert.error("Invalid worksheet name",
                                    "please input a valid name!");
                    } else {
                        var tableIds = [];
                        $noSheetTables.each(function() {
                            var tableId = $(this).data("id");
                            tableIds.push(tableId);
                        });

                        WSManager.addNoSheetTables(tableIds, wsIndex);

                        addBulkTable(tableType);
                    }
                },
                "cancel": function() {
                    $noSheetTables.removeClass("highlight");
                    $("#rightSideBar.faux").remove();
                }
            });

        } else {
            addBulkTable(tableType);
        }
    }

    function addBulkTable(tableType) {
        RightSideBar.tableBulkAction("add", tableType)
        .then(function() {
            if (!$("#workspaceTab").hasClass("active")) {
                $("#workspaceTab").click();
            }
            WSManager.focusOnLastTable();
            commitToStorage();
        })
        .fail(function(error) {
            var type;
            if (tableType === TableType.InActive) {
                type = 'Archived';
            } else if (tableType === TableType.Orphan) {
                type = 'Orphaned';
            }
            Alert.error("Error In Adding " + type + " Table", error);
        });
    }

    function generateTableLists(tables, active) {
        var sortedTables = sortTableByTime(tables); // from oldest to newest
        var dates = xcHelper.getTwoWeeksDate();
        var p     = dates.length - 1;    // the length should be 8
        var days  = ["Sunday", "Monday", "Tuesday", "Wednesday",
                     "Thursday", "Friday", "Saturday"];

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
                var d;

                switch (dateIndex) {
                    case 0:
                        d = dates[dateIndex];
                        date = "Today " + xcHelper.getDate("/", d);
                        break;
                    case 1:
                        d = dates[dateIndex];
                        date = "Yesterday " + xcHelper.getDate("/", d);
                        break;
                    // Other days in the week
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        d = dates[dateIndex];
                        date = days[d.getDay()] + " " +
                               xcHelper.getDate("/", d);
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

                var timeLineHTML =
                    '<li class="clearfix timeLine date' + p + '">' +
                        '<div class="timeStamp">' + date + '</div>' +
                        '<ul class="tableList"></ul>' +
                    '</li>';
                $tableList.prepend(timeLineHTML);
            }

            var $dateDivider = $tableList.find(".date" + p + " .tableList");
            var numCols;
            if (table.tableCols) {
                numCols = table.tableCols.length;
            } else {
                numCols = 0;
            }
            var time;

            if (dateIndex >= 7) {
                time = xcHelper.getDate("-", null, timeStamp);
            } else {
                time = xcHelper.getTime(null, timeStamp);
            }

            var tableName = table.tableName;
            var tableId   = table.tableId;
            var wsIndex   = WSManager.getWSFromTable(tableId);
            var wsInfo;

            if (wsIndex == null) {
                wsInfo = '<div class="worksheetInfo inactive">No sheet</div>';
            } else {
                wsInfo =
                    '<div class="worksheetInfo worksheet-' + wsIndex + '">' +
                        WSManager.getWSName(wsIndex) +
                    '</div>';
            }

            var html =
                '<li class="clearfix tableInfo" ' +
                    'data-id="' + tableId + '">' +
                    '<div class="timeStampWrap">' +
                        '<div class="timeStamp">' +
                            '<span class="time">' + time + '</span>' +
                        '</div>' +
                        wsInfo +
                    '</div>' +
                    '<div class="tableListBox">' +
                        '<div class="iconWrap">' +
                            '<span class="icon"></span>' +
                        '</div>' +
                        '<span class="tableName textOverflow" draggable="true"' +
                            ' ondragstart="xcDrag(event)" title="' +
                            tableName + '">' + tableName +
                        '</span>' +
                        '<span class="numCols" data-toggle="tooltip" ' +
                            'data-container="body" title="number of columns">' +
                             numCols + '</span>' +
                        '<span class="addTableBtn" title="select table">' +
                        '</span>' +
                    '</div>' +
                    '<ol>';

            for (var j = 0; j < numCols; j++) {
                // if (table.tableCols[j].name != 'DATA') {
                html +=
                    '<li draggable="true" ondragstart="xcDrag(event)">' +
                        table.tableCols[j].name +
                    '</li>';
                // }
            }

            html += '</ol></li>';

         

            if (gMinModeOn) {
                $dateDivider.prepend(html);
            } else {
                var $li = $(html).hide();
                $li.addClass("transition").prependTo($dateDivider)
                    .slideDown(150, function() {
                        $li.removeClass("transition");
                    });
            }
           

            if ($('#archivedTableList').find('.tableInfo').length !== 0) {
                $('#archivedTableList .secondButtonWrap').show();
            }
        }
    }

    function generateAggTableList(tables) {
        var numTables = tables.length;
        var html = "";

        for (var i = 0; i < numTables; i++) {
            var table      = tables[i];
            var tableName  = table.tableName;
            var aggStr     = table.aggStr;
            var aggVal     = table.value.value;
            var isActive   = table.value.isActive;
            var dstTable   = table.value.dagName;
            var dstTableId = xcHelper.getTableId(dstTable);
            var wsInfo;
            var addTableBtn;

            if (isActive) {
                var wsIndex = WSManager.getWSFromTable(dstTableId);

                if (wsIndex == null) {
                    // case that worksheet is deleted
                    wsInfo =
                        '<div class="worksheetInfo" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + dstTable + '">' +
                            'No sheet' +
                        '</div>';
                } else {
                    wsInfo =
                        '<div class="worksheetInfo worksheet-' + wsIndex +
                        '" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + dstTable + '">' +
                            WSManager.getWSName(wsIndex) +
                        '</div>';
                }

                addTableBtn = "";
            } else {
                wsInfo = '<div class="worksheetInfo inactive"></div>';
                addTableBtn = '<span class="addTableBtn"></span>';
                // XXX temporary disable it
                addTableBtn = '';
            }

            html += '<li class="clearfix tableInfo" ' +
                     'data-id="' + dstTableId + '"' +
                     'data-tablename="' + dstTable + '"' +
                     'data-key="' + table.key + '">' +
                        '<span class="tableNameWrap textOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + tableName + '">' +
                            tableName +
                        '</span>' +
                        '<span class="aggStrWrap textOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body" ' +
                        'title="' + aggStr + '">' +
                            aggStr +
                        '</span>' +
                        '<div class="tableListBox">' +
                            '<span class="aggVal">' + aggVal + '</span>' +
                            wsInfo +
                            addTableBtn +
                        '</div>' +
                     '</li>';
        }

        var $aggregateTableList = $('#aggregateTableList');
        $('#aggTablesList').html(html);

        if (numTables > 0) {
            $aggregateTableList.find('.btnLarge').show();
            $aggregateTableList.find('.selectAll, .clearAll').show();
        }
        $aggregateTableList.find('.secondButtonWrap').show();
    }

    function generateOrphanList(tables) {
        var numTables = tables.length;
        var html = "";
        for (var i = 0; i < numTables; i++) {
            var tableName = tables[i];
            var tableId   = xcHelper.getTableId(tableName);
            html += '<li class="clearfix tableInfo" ' +
                     'data-id="' + tableId + '"' +
                     'data-tablename="' + tableName + '">' +
                        '<div class="tableListBox">' +
                            '<div class="iconWrap">' +
                                '<span class="icon"></span>' +
                            '</div>' +
                            '<span class="tableName textOverflow">' +
                                tableName +
                            '</span>' +
                            '<span class="addTableBtn"></span>' +
                        '</div>' +
                     '</li>';
        }
        var $orphanedTableList = $('#orphanedTableList');
        $('#orphanedTablesList').html(html);
        if (numTables > 0) {
            $orphanedTableList.find('.btnLarge').show();
            $orphanedTableList.find('.selectAll, .clearAll').show();
        }
        $orphanedTableList.find('.secondButtonWrap').show();
    }

    function refreshOrphanList() {
        XcalarGetTables()
        .then(function(backEndTables) {
            var backTables = backEndTables.nodeInfo;
            var numBackTables = backEndTables.numNodes;
            var tableMap = {};
            for (var i = 0; i < numBackTables; i++) {
                tableMap[backTables[i].name] = backTables[i].name;
            }
            for (var tId in gTables) {
                var tableName = gTables[tId].tableName;
                if (tableMap[tableName]) {
                    delete tableMap[tableName];
                }
            }
            setupOrphanedList(tableMap);
            setTimeout(function() {
                generateOrphanList(gOrphanTables);
            }, 400);
            
            var $waitingIcon = $('<div class="waitingIcon" ' +
                              'style="top:50%; width:100%; display:block;' +
                              'background-position-x: 50%"></div>');
            $('#orphanedTableList').append($waitingIcon);
            setTimeout(function(){
                $waitingIcon.fadeOut(100, function() {
                    $waitingIcon.remove();
                });
            }, 1400);
        });
    }

    function sortTableByTime(tables) {
        var sortedTables = [];

        tables.forEach(function(table) {
            var tableId = table.tableId;
            var timeStamp;
            if (gTables[tableId]) {
                timeStamp = gTables[tableId].timeStamp;
            }
            if (timeStamp == null) {
                console.error("Time Stamp undefined");
                timeStamp = xcHelper.getTimeInMS(null, "2014-02-14");
                timeStamp = "";
            }

            sortedTables.push([table, timeStamp]);
        });

        // sort by time, from the oldest to newset
        sortedTables.sort(function(a, b) {
            return (a[1] - b[1]);
        });

        return (sortedTables);
    }

    function popOutModal($rightSideBar) {
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
        CLIBox.realignNl();
    }

    function setLastRightSidePanel() {
        var settings = UserSettings.getSettings();
        if (settings.lastRightSideBar) {
            $('#' + settings.lastRightSideBar).addClass('lastOpen');
        }
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
    };

    return (HelpController);

}(jQuery, {}));
