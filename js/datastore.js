window.DataStore = (function($) {
    var self = {};

    self.setup = function() {
        GridView.setup();
        setupImportDSForm()
        DataSampleTable.setup();
        DataCart.setup();
    }

    self.updateInfo = function(numDatasets) {
        console.log("Updating to:", numDatasets);
        $("#worksheetInfo").find(".numDataStores").text(numDatasets);
        $("#datasetExplore").find(".numDataStores").text(numDatasets);
    }

    function setupImportDSForm() {
        var $formatSection = $("#fileFormat");
        // disable delim input in default
        $("#fieldDelim").prop("disabled", true);
        $("#lineDelim").prop("disabled", true);
        // select on data format
        $formatSection.on("click", "label", function() {
            var $label = $(this);
            var $input = $label.find("input");
            $formatSection.find(".radio").removeClass("checked");
            $formatSection.find("input").prop("checked", false);
            $label.find(".radio").addClass("checked");
            $input.prop("checked", true);

            if ($input.attr("id").indexOf("CSV") >= 0) {
                $("#fieldDelim").prop("disabled", false);
                $("#lineDelim").prop("disabled", false);
            } else {
                $("#fieldDelim").prop("disabled", true);
                $("#lineDelim").prop("disabled", true);
            }
        });
        // reset form
        $("#importDataReset").click(function() {
            $formatSection.find(".radio").removeClass('checked');
        });
        // open file browser
        $("#fileBrowserBtn").click(function() {
            FileBrowser.show();
        });
        // submit the form
        $("#importDataForm").submit(function(event) {
            event.preventDefault();
            var $filePath = $("#filePath");
            var $fileName = $("#fileName");
            var loadURL = jQuery.trim($filePath.val());
            var dsName = jQuery.trim($fileName.val());
            var dsFormat = $("#fileFormat input[name=dsType]:checked").val();
            var fieldDelim = $("#fieldDelim").val();
            var lineDelim = $("#lineDelim").val();
            // check name conflict
            if (DSObj.isDataSetNameConflict(dsName)) {
                var text = "Dataset with the name " +  dsName + 
                            " already exits. Please choose another name.";
                StatusBox.show(text, $fileName, true);
                return false;
            }

            var msg = StatusMessageTStr.LoadingDataset+": "+dsName
            StatusMessage.show(msg);

            DSObj.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim)
            .then(function() {
                $("#importDataReset").click();
                StatusMessage.success(msg);
            })
            .fail(function(result) {
                var text;
                if (result.statusCode === StatusT.StatusDsInvalidUrl) {
                    text = "Could not retrieve dataset from file path: " 
                            + loadURL;
                } else {
                    text = result.error;
                }
                StatusBox.show(text, $filePath, true);
                StatusMessage.fail(StatusMessageTStr.LoadFailed, msg);
            });
        });
        // XXX This should be removed in production
        $("#filePath").keyup(function() {
            var val = $(this).val();
            if (val.length == 2) {
                var file = null;
                switch (val) {
                    case ("za"):
                        file = "yelpUsers";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        break;
                    case ("zd"):
                        file = "sp500";
                        break;
                    case ("ze"):
                        file = "classes";
                        break;
                    case ("zf"):
                        file = "schedule";
                        break;
                    case ("zg"):
                        file = "students";
                        break;
                    case ("zh"):
                        file = "teachers";
                        break;
                    case ("zi"):
                        file = "jsonGen";
                        break;
                    default:
                        break;
                }
                if (file) {
                    secretForm(file);
                }
            }
        });

        function secretForm(file) {
            var filePath = "";
            switch (file) {
                case ("yelpUsers"):
                    filePath = "yelp/user";
                    break;
                case ("yelpReviews"):
                    filePath = "yelp/reviews";
                    break;
                case ("gdelt"):
                    filePath = "gdelt";
                    break;
                case ("sp500"):
                    filePath = "sp500";
                    break;
                case ("classes"):
                    filePath = "qa/indexJoin/classes";
                    break;
                case ("schedule"):
                    filePath = "qa/indexJoin/schedule";
                    break;
                case ("students"):
                    filePath = "qa/indexJoin/students";
                    break;
                case ("teachers"):
                    filePath = "qa/indexJoin/teachers";
                    break;
                case ("jsonGen"):
                    filePath = "jsonGen";
                    break;
                default:
                    break;
            }

            $('#filePath').val('file:///var/tmp/'+filePath);

            $('#fileName').val(file);

            if (file == "sp500" || file == "gdelt") {
                $('.dsTypeLabel:contains("CSV")').parent().trigger('click');
            } else {
                $('.dsTypeLabel:contains("JSON")').parent().trigger('click');
            }

            $('#fileName').focus();
        }
    }

    return (self);
}(jQuery));

window.GridView = (function($) {
    var self = {};
    var $deleteFolderBtn = $("#deleteFolderBtn");
    var $gridView = $("#gridView");

    self.setup = function() {
        // initial gDSObj
        gDSInitialization();
        setupGridViewButton();
        setupGridViewIcons();
    }

    function setupGridViewButton() {
        // $("#searchButton").parent().on("click", function() {
        //     $("#exploreButton").parent().removeAttr("active");
        //     $("#searchButton").parent().attr("active", "active");

        //     $("#searchView").show();
        //     $("#exploreView").hide();
        // });
        // $("#exploreButton").parent().on("click", function() {
        //     $("#searchButton").parent().removeAttr("active");
        //     $("#exploreButton").parent().attr("active", "active");

        //     $("#exploreView").show();
        //     $("#searchView").hide();
        // });

        $("#importDataButton").click(function() {
            var $importForm = $("#importDataView");
            $("#filePath").focus();
            if ($importForm.css('display') != "block") {
                $importForm.show();
                $("#filePath").focus();
                $gridView.find("grid-unit.active").removeClass("active");
                $("#dataSetTableWrap").empty();
                $(".dbText h2").text("");
            }
        });

        $("grid-unit .label").each(function() {
            $(this).dotdotdot({ellipsis: "..."});
        });

        $(".dataViewBtn").click(function() {
            var $btn = $(this);
            $(".dataViewBtn").removeClass("selected").addClass("btnDeselected");
            $btn.addClass("selected").removeClass("btnDeselected");
            if ($btn.attr("id") == "dataListView") {
                $gridView.removeClass("gridView").addClass("listView");
            } else {
                $gridView.removeClass("listView").addClass("gridView");
            }
        });

         // click "Add New Folder" button to add new folder
        $("#addFolderBtn").click(function() {
            DSObj.create(gDSObj.id++, "New Folder", gDSObj.curId, true);
            // commitToStorage();
        });

        // click "Back Up" button to go back to parent folder
        $("#backFolderBtn").click(function() {
            if (!$(this).hasClass("disabled")) {
                 DSObj.upDir();
            }
        });

        // click "Delete Folder" button to delete folder
        $deleteFolderBtn.click(function() {
            if ($(this).hasClass("disabled")) {
                 return;
            }
            var $grid = $("grid-unit.active");
            if ($grid.hasClass("ds")) {
                // delete a ds
                var dsName = $grid.attr("id").split("dataset-")[1];
                // add alert
                Alert.show({
                    "title": "DELETE DATASET",
                    "msg": "Are you sure you want to delete dataset " 
                            + dsName + "?",
                    "isCheckBox": true,
                    "confirm": function() {
                        DSObj.destroy(dsName)
                        .then(function() {
                            //clear data cart
                            $("#selectedTable-" + dsName).remove();
                            // clear data table
                            $tableWrap.empty();

                            DSObj.focusOnFirst();

                            XcalarGetDatasets()
                            .then(function(datasets) {
                                DataStore.updateInfo(datasets.numDatasets);
                            })
                            .fail(function(result) {
                                console.error("Fail to update ds nums");
                            });
                        })
                        .fail(function(error) {
                            Alert.error("Delete Dataset Fails", error);
                        });
                    }
                });
            } else {
                // delete a folder
                var folderId = $grid.data("dsid");
                if (DSObj.deleteById(folderId) === true) {
                    $grid.remove();
                }
            }
        });
    }

    function setupGridViewIcons() {
        // click empty area on gridView
        $("#gridViewWrapper").on("click", function() {
            // this hanlder is called before the following one
            $gridView.find(".active").removeClass("active");
            $deleteFolderBtn.addClass("disabled");
        });

        $gridView.on("click", "grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);

            $gridView.find(".active").removeClass("active");
            $grid.addClass("active");
            $deleteFolderBtn.removeClass("disabled");

            // folder do not show anything
            if ($grid.hasClass("folder")) {
                return;
            }

            $("#importDataView").hide();
            if (gDatasetBrowserResultSetId == 0) {
                DSObj.getSample($grid)
                .then(function() {
                    if (event.scrollToColumn) {
                        DataCart.scrollToDatasetColumn();
                    }
                });
            } else {
                XcalarSetFree(gDatasetBrowserResultSetId)
                .then(function() {
                    gDatasetBrowserResultSetId = 0;
                    return (DSObj.getSample($grid));
                })
                .then(function() {
                    if (event.scrollToColumn) {
                        DataCart.scrollToDatasetColumn();
                    }
                });
            }
        });

        $gridView.on({
            // press enter to remove focus from folder label
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    $(this).blur();
                }
            },
            // select all on focus
            "focus": function() {
            // Jerene: may need another way to inplement(jquery)
                var div = $(this).get(0);
                window.setTimeout(function() {
                    var sel, range;
                    if (window.getSelection && document.createRange) {
                        range = document.createRange();
                        range.selectNodeContents(div);
                        sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else if (document.body.createTextRange) {
                        range = document.body.createTextRange();
                        range.moveToElementText(div);
                        range.select();
                    }
                }, 1);
            },
            "blur": function() {
                var $grid = $(this);
                DSObj.rename($grid);
                this.scrollLeft = 0;    //scroll to the start of text;
            }
        }, ".folder .label");

        // dbclick grid view folder
        $gridView.on("dblclick", ".folder > .gridIcon, .folder > .dsCount", 
            function(event) {
                var $grid = $(this).closest(".folder");
                $gridView.find(".active").removeClass("active");
                $deleteFolderBtn.addClass("disabled");
                if ($gridView.hasClass("gridView")) {
                    DSObj.changeDir($grid.data("dsid"));
            }
        });

        // click list view folder
        $gridView.on("click", ".folder > .listIcon, .folder > .dsCount",
            function(event) {
                var $grid = $(this).closest(".folder");
                if ($gridView.hasClass("listView")) {
                    $grid.toggleClass("collapse");
                }
        });
    }

    return (self);
}(jQuery));

window.DataCart = (function($) {
    var self = {};
    var $cartArea = $("#dataCart");

    self.setup = function() {
        $("#submitDSTablesBtn").click(function() {
            if ($cartArea.find(".selectedTable").length === 0) {
                return (false);
            }
            createWorksheet()
            .always(emptyAllCarts);
        });

        $("#clearDataCart").click(function() {
            emptyAllCarts();
        });

        $cartArea.on("click", ".colName", function() {
            var $li = $(this).parent();
            $cartArea.find(".colSelected").removeClass("colSelected");
            $li.addClass("colSelected");
            triggerScrollToDatasetColumn($li);
        });

        // remove selected key
        $cartArea.on("click", ".removeCol", function() {
            var $closeBox = $(this);
            var $li = $closeBox.closest(".colWrap");
            var $cart = $li.closest(".selectedTable");
            var dsname = $cart.attr("id").split("selectedTable-")[1];
            var colNum = $li.data("colnum");
            var $table = $("#worksheetTable");
            // if the table is displayed
            if ($table.data("dsname") === dsname) {
                $table.find("th.col" + colNum + " .header")
                            .removeClass('colAdded');
                $table.find(".col" + colNum).removeClass('selectedCol');
            }

            if ($li.siblings().length === 0) {
                $cart.remove();
            } else {
                $li.remove();
            }

            overflowShadow();
        });
    }
    // add column to cart
    self.addItem = function(dsName, $colInput) {
        var colNum = parseColNum($colInput);
        var $cart = $("#selectedTable-" + dsName);
        // this ds's cart not exists yet
        if ($cart.length == 0) {
            $cart =  $('<div id="selectedTable-' + dsName + '" \
                            class="selectedTable">\
                            <h3>' + dsName + '</h3>\
                            <ul></ul>\
                        </div>');
            $cartArea.prepend($cart);
        }

        var $li = $('<li style="font-size:13px;" class="colWrap" \
                        data-colnum="' + colNum + '">\
                        <span class="colName">' +  $colInput.val() + '</span>\
                        <div class="removeCol">\
                            <span class="closeIcon"></span>\
                        </div>\
                    </li>');

        $cart.find("ul").append($li);
        $cartArea.find(".colSelected").removeClass("colSelected");
        $li.addClass("colSelected");// focus on this li
        overflowShadow();
    }
    // remove one column from cart
    self.removeItem = function (dsName, $colInput) {
        var colNum = parseColNum($colInput);
        var $cart = $("#selectedTable-" + dsName);
        $cart.find("li[data-colnum=" + colNum + "] .removeCol")
                .click();
    }
    // remove one cart
    self.removeCart = function(dsName) {
        $("#selectedTable-" + dsName).remove();
        overflowShadow();
    }

    self.scrollToDatasetColumn = function() {
        var $table = $("#worksheetTable");
        var $datasetWrap = $('#datasetWrap');
        var colNum = $cartArea.find(".colSelected").data("colnum");
        var $column = $table.find("th.col" + colNum )
        var position = $column.position().left;
        var columnWidth = $column.width();
        var dataWrapWidth = $datasetWrap.width();

        $datasetWrap.scrollLeft(position-(dataWrapWidth/2)+(columnWidth/2));

        // $datasetWrap.animate(
        //     {scrollLeft : position-(dataWrapWidth/2)+(columnWidth/2)}
        // );
    }

    function triggerScrollToDatasetColumn($li) {
        var datasetName = $li.closest('ul').siblings('h3').text();
        var $datasetIcon = $('#dataset-'+datasetName);
        if($datasetIcon.hasClass('active')) {
            DataCart.scrollToDatasetColumn();
        } else {
            var clickEvent = $.Event('click');
            clickEvent['scrollToColumn'] = true;
            $datasetIcon.trigger(clickEvent);
        }
    }

    function emptyAllCarts() {
        var $table = $("#worksheetTable");
        $cartArea.empty();
        $table.find('.colAdded').removeClass("colAdded");
        $table.find('.selectedCol').removeClass("selectedCol");
        overflowShadow();
    }

    function overflowShadow() {
        if ($cartArea.height() > $('#dataCartWrap').height()) {
            $('#contentViewRight').find('.buttonArea').addClass('cartOverflow');
        } else {
            $('#contentViewRight').find('.buttonArea').removeClass('cartOverflow');
        }
    }

    function createWorksheet() {
        var deferred = jQuery.Deferred();
        var promises = [];

        $cartArea.find(".selectedTable").each(function() {
            promises.push((function() {
                var $cart = $(this);
                var innerDeferred = jQuery.Deferred();
                // store columns in localstorage using setIndex()
                var newTableCols = [];
                var startIndex = 0;
                var datasetName = $cart.attr("id").split("selectedTable-")[1];

                var rand = Math.floor((Math.random() * 100000) + 1);
                var tableName = datasetName + "-" + rand;
                // add cli
                var cliOptions = {
                    "operation": "createTable",
                    "tableName": tableName,
                    "col": []
                };
                // add status message
                var msg = StatusMessageTStr.CreatingTable+': '+tableName;
                StatusMessage.show(msg);

                $cart.find('.colName').each(function() {
                    var colname = $.trim($(this).text());
                    var progCol = new ProgCol();
                    var escapedName = colname;

                    if (colname.indexOf('.') > -1) {
                        escapedName = colname.replace(/\./g, "\\\.");
                    }

                    progCol.index = ++startIndex;
                    progCol.name = colname;
                    progCol.width = gNewCellWidth;
                    progCol.userStr = '"'+colname+'" = pull('+escapedName+')';
                    progCol.func.func = "pull";
                    progCol.func.args = [escapedName];
                    progCol.isDark = false;

                    var currentIndex = startIndex - 1;
                    newTableCols[currentIndex] = progCol;
                    cliOptions.col.push(colname);
                });

                var progCol = new ProgCol();
                progCol.index = startIndex + 1;
                progCol.type = "object";
                progCol.name = "DATA";
                progCol.width = 500;
                progCol.userStr = "DATA = raw()";
                progCol.func.func = "raw";
                progCol.func.args = [];
                progCol.isDark = false;
                newTableCols[startIndex] = progCol;

                cliOptions.col.push("DATA");

                var tableProperties = {bookmarks:[], rowHeights:{}};
                setIndex(tableName, newTableCols, datasetName, tableProperties);
                
                refreshTable(tableName, gTables.length, true, false)
                .then(function() {
                    commitToStorage();
                    Cli.add("Send To Worksheet", cliOptions);
                    StatusMessage.success(msg);
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    StatusMessage.fail(StatusMessageTStr.TableCreationFailed, msg);
                    innerDeferred.reject(error);
                });
                return (innerDeferred.promise());
            }).bind(this));
        });

        showWaitCursor();

        chain(promises)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error){
            Alert.error("Create work sheet fails", error);
            deferred.reject(error);
        })
        .always(function() {
            removeWaitCursor();
        });

        return (deferred.promise());
    }

    return (self);
}(jQuery));

window.DataSampleTable = (function($) {
    var self = {};
    var $tableWrap = $("#dataSetTableWrap");
    var $menu = $("#datasetTableMenu");

    self.setup = function() {
        $menu.append(getDropdownMenuHTML());
        setupSampleTable();
        setupColumnDropdownMenu();
    }

    self.getSampleTable = function(dsName, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsName, jsonKeys, jsons);
        $tableWrap.empty().append(html);
        var $table = $("#worksheetTable");
        var tableHeight = $table.height();
        $table.find(".colGrab").height(tableHeight);
        restoreSelectedColumns();
    }

    self.updateTableInfo = function(dsName, dsFormat, totalEntries) {
        var d = new Date();
        var date = (d.getMonth() + 1) + "-" + d.getDate() + "-" 
                    + d.getFullYear();
        $("#schema-title").text(dsName);
        $("#dsInfo-title").text(dsName);
        $("#dsInfo-createDate").text(date);
        $("#dsInfo-updateDate").text(date);
        $("#dsInfo-records").text(Number(totalEntries).toLocaleString('en'));
        if (dsFormat) {
            $("#schema-format").text(dsFormat);
        }
    }

    function setupSampleTable() {
        // delete dataset
        $("#dsDelete").click(function() {
            var dsName = $("#worksheetTable").data("dsname");
            // add alert
            Alert.show({
                "title": "DELETE DATASET",
                "msg": "Are you sure you want to delete dataset " 
                        + dsName + "?",
                "isCheckBox": true,
                "confirm": function() {
                    DSObj.destroy(dsName)
                    .then(function() {
                        //clear data cart
                        $("#selectedTable-" + dsName).remove();
                        // clear data table
                        $tableWrap.empty();

                        DSObj.focusOnFirst();

                        XcalarGetDatasets()
                        .then(function(datasets) {
                            DataStore.updateInfo(datasets.numDatasets);
                        })
                        .fail(function(result) {
                            console.error("Fail to update ds nums");
                        });
                    })
                    .fail(function(error) {
                        Alert.error("Delete Dataset Fails", error);
                    });
                }
            });
        });
        // select all columns
        $("#selectDSCols").click(function() {
            $("#worksheetTable .editableHead").each(function() {
                var $input = $(this);
                if (!$input.closest(".header").hasClass("colAdded")) {
                    selectColumn($input, SelectUnit.All);
                }
            });
        });
        // clear all columns
        $("#clearDsCols").click(function() {
            var $table = $("#worksheetTable");
            var dsName = $table.data("dsname");
            $table.find(".colAdded").removeClass("colAdded");
            $table.find(".selectedCol").removeClass("selectedCol");
            DataCart.removeCart(dsName);
        });
        // click on dropdown icon to open menu
        $tableWrap.on("click", ".datasetTable .dropdownBox", function() {
            var $dropDownBox = $(this);
            dropdownClick($dropDownBox, true);
            updateDropdownMenu($dropDownBox);
        });
        // click to select a column
        $tableWrap.on("click", ".editableHead", function(event) {
            var $input = $(this);
            var $table = $("#worksheetTable");

            if (event.shiftKey && 
                gLastClickTarget.closest(".datasetTable")[0] == $table[0]) {

                var startIndex = gLastClickTarget.closest("th").index();
                var endIndex = $input.closest('th').index();
                if (startIndex > endIndex) {
                    var temp = endIndex;
                    endIndex = startIndex;
                    startIndex = temp;
                }

                var $ths = $table.find('th');
                for (var i = startIndex; i <= endIndex; i++) {
                    var $th = $ths.eq(i);
                    if ($th[0] != gLastClickTarget.closest('th')[0]) {
                        selectColumn($th.find(".editableHead"), 
                                        SelectUnit.Single);
                    }
                }
            } else {
                selectColumn($input, SelectUnit.Single);
            }
        });

        $tableWrap.on("click", ".tick, .type", function(){
            $(this).closest(".header").find(".editableHead").click();
        });
        // resize
        $tableWrap.on("mousedown", ".colGrab", function(event) {
            if (event.which != 1) {
                return;
            }
            gRescolMouseDown($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25});
        });
    }

    function setupColumnDropdownMenu() {
        // enter and leave the menu
        $menu.on({
            "mouseenter": function() {
                var $li = $(this);
                $li.children("ul").addClass("visible");
                $li.addClass("selected");
                if (!$li.hasClass("inputSelected")) {
                    $menu.find(".inputSelected").removeClass("inputSelected");
                }
            },
            "mouseleave": function() {
                var $li = $(this);
                $li.children('ul').removeClass('visible');
                $li.removeClass('selected');
                $('.tooltip').remove();
            }
        }, "li");
        // input on menu
        $menu.find("input").on({
            "focus": function() {
                $(this).parents('li').addClass('inputSelected')
                        .parents('.subColMenu').addClass('inputSelected');
            },
            "keyup": function(event) {
                var $input = $(this);

                $input.parents('li').addClass('inputSelected')
                        .parents('.subColMenu').addClass('inputSelected');

                if (event.which == keyCode.Enter) {
                     renameColumn($input);
                }
            },
            "blur": function() {
                $(this).parents('li').removeClass('inputSelected')
                    .parents('.subColMenu').removeClass('inputSelected');
            }

        });
        // mouse down on subColMenuArea to hide menu
        $menu.find(".subColMenuArea").mousedown(function() {
            $menu.hide();
        });
        // change Data Type
        $menu.find(".changeDataType").on("click", ".typeList", function() {
            changeColumnType($(this));
        });
    }
    // update column menu
    function updateDropdownMenu($dropDownBox) {
        var $th = $dropDownBox.closest("th");
        var colNum = parseColNum($th);
        var colName = $th.find(".editableHead").val();
        $menu.data("colnum", colNum);
        $menu.find(".renameCol input").val(colName);

        // XXX Just for temporary use, will change the functionality in the future
        var type = $dropDownBox.closest(".header").data("type");
        if (type === "undefined" || type === "array" || type === "object") {
            $menu.find(".changeDataType").hide();
        } else {
            $menu.find(".changeDataType").show();
        }
    }
    // select a column
    function selectColumn($input, selectAll) {
        var dsName = $("#worksheetTable").data("dsname");
        var $cart = $("#selectedTable-" + dsName);
        var $header = $input.closest(".header");
        // unselect the column
        if ($header.hasClass("colAdded") && !selectAll) {
            highlightColumn($input, IsActive.Active);
            DataCart.removeItem(dsName, $input);
        } else {
            highlightColumn($input);
            DataCart.addItem(dsName, $input);
        }
    }
    // re-selecte columns that are in data carts
    function restoreSelectedColumns() {
        var $table = $("#worksheetTable");
        var dsName = $table.data("dsname");

        $("#selectedTable-" + dsName).find("li").each(function() {
            var $li = $(this);
            var colNum = $li.data("colnum");
            var $input = $table.find(".editableHead.col" + colNum);
            highlightColumn($input);
        });
    }
    // hightligt the column
    function highlightColumn($input, active) {
        var colNum = parseColNum($input);
        var $table = $input.closest(".datasetTable");
        var $header = $input.closest(".header");
        if (active) {
            $header.removeClass("colAdded");
            $table.find(".col" + colNum).removeClass("selectedCol");
        } else {
            $header.addClass("colAdded");
            $table.find(".col" + colNum).addClass("selectedCol");
        }
    }
    // rename column
    function renameColumn($input) {
        var newColName = $.trim($input.val());
        var colNum = $input.closest(".colMenu").data("colnum");
        var $table = $("#worksheetTable");
        var $th = $table.find("th.col" + colNum);
        var $headInput = $th.find(".editableHead");
        var oldColName = $headInput.val();
        var dsName = $table.data("dsname");

        $input.blur();

        if (newColName === oldColName) {
            $menu.hide();
            return;
        }

        if (!checkDuplicateColNames($table.find(".editableHead"), $input)) {
            console.log("Renaming", oldColName, "to", newColName);

            $menu.hide();
            XcalarEditColumn(dsName, oldColName, newColName, DfFieldTypeT.DfString)
            .then(function() {
                // update column name
                $headInput.val(newColName);
                $th.attr("title", newColName);
                $("#selectedTable-" + dsName)
                    .find("li[data-colnum=" + colNum + "] .colName")
                    .text(newColName);

                // add cli
                Cli.add("Rename dataset column", {
                    "operation": "renameDatasetCol",
                    "dsName": dsName,
                    "colNum": colNum + 1,
                    "oldColName": oldColName,
                    "newColName": newColName }
                );
            })
            .fail(function(error){
                Alert.error(error);
            });
        }
    }
    // change col type
    function changeColumnType($typeList) {
        var newType = $typeList.find(".label").text().toLowerCase();
        var colNum = $typeList.closest(".colMenu").data("colnum");

        var $table = $("#worksheetTable");
        var $tableHeader = $table.find(" .col" + colNum + " .header");

        var $headInput = $tableHeader.find(".editableHead");
        var dsName = $table.data("dsname");
        var colName = $headInput.val();
        var oldType = $tableHeader.data('type');
        var typeId = (function getTypeId(type) {
            switch (type) {
                case "undefined":
                    return DfFieldTypeT.DfUnknown;
                case "string":
                    return DfFieldTypeT.DfString;
                case "number":
                    return DfFieldTypeT.DfFloat64;
                case "boolean":
                    return DfFieldTypeT.DfBoolean;
                case "mixed":
                    return DfFieldTypeT.DfMixed;
                default:
                    return -1; // Invalid type
            }
        })(newType);

        $menu.hide();

        if (newType === oldType || typeId < 0) {
            return;
        }

        console.log("Change Type from " + oldType + " to " + newType);

        XcalarEditColumn(dsName, colName, colName, typeId)
        .then(function() {
            $tableHeader.data("type", newType);
            $tableHeader.removeClass("type-" + oldType)
                        .addClass("type-" + newType);

            Cli.add("Change dataset data type", {
                "operation": "changeDataType",
                "dsName": dsName,
                "colNum": colNum + 1,
                "oldType": oldType,
                "newType": newType
            });
        });
    }
    // table menu html
    function getDropdownMenuHTML() {
        // XXX Now Array, Object and Unknown are invalid type to change
        var types = ['Boolean', 'Number', 'String', 'Mixed'];
        var html = 
            '<li class="renameCol">\
                <span>Rename Column</span>\
                <ul class="subColMenu">\
                    <li style="text-align: center" class="clickable">\
                        <span>New Column Name</span>\
                        <input type="text" width="100px" \
                           spellcheck="false" />\
                    </li>\
                    <div class="subColMenuArea"></div>\
                </ul>\
                <div class="dropdownBox"></div>\
            </li>\
            <li class="changeDataType">\
                <span>Change Data Type</span>\
                <ul class="subColMenu">';

        types.forEach(function(type) {
            html += 
                '<li class="flexContainer flexRow typeList type-' 
                    + type.toLowerCase() + '">\
                    <div class="flexWrap flex-left">\
                        <span class="type icon"></span>\
                    </div>\
                    <div class="flexWrap flex-right">\
                        <span class="label">' + type + '</span>\
                    </div>\
                </li>';
        });

        html +=  '</ul>\
                  <div class="dropdownBox"></div>';
        return (html);
    }
    // sample table html
    function getSampleTableHTML(dsName, jsonKeys, jsons) {
        var html = "";
        var tr = "";
        var th = "";
        var columnsType = [];  // track column type

        jsonKeys.forEach(function() {
            columnsType.push("undefined");
        })

        // table rows
        jsons.forEach(function(json) {
            tr += '<tr>';
            // loop through each td, parse object, and add to table cell
            for (var j = 0; j < jsonKeys.length; j++) {
                var key = jsonKeys[j];
                var val = json[key];
                var parsedVal = val == undefined ? "" : parseJsonValue(val);
                // Check type
                if (parsedVal !== "" && columnsType[j] !== "mixed") {
                    var type = typeof val;
                    if (type == "object" && (val instanceof Array)) {
                        type = "array";
                    }
                    if (columnsType[j] == "undefined") {
                        columnsType[j] = type;
                    } else if (columnsType[j] !== type) {
                        columnsType[j] = "mixed";
                    }
                }

                tr += '<td class="col' + j + '">\
                        <div class="addedBarTextWrap">\
                            <div class="addedBarText">' + parsedVal + '</div>\
                        </div>\
                      </td>';
            }

            tr += '</tr>';
        });

        // table header
        for (var i = 0; i < jsonKeys.length; i++) {
            var key = jsonKeys[i];
            var thClass = "th col" + i;
            var type = columnsType[i];
            th += 
                '<th title="' + key + '" class="' + thClass + '">\
                    <div class="header type-' + type + '" \
                         data-type=' + type + '>\
                        <div class="colGrab" \
                            title="Double click to auto resize" \
                            data-toggle="tooltip" \
                            data-placement="top" \
                            data-container="body">\
                        </div>\
                        <div class="flexContainer flexRow">\
                            <div class="flexWrap flex-left">\
                                <span class="type icon"></span>\
                            </div>\
                            <div class="flexWrap flex-mid">\
                                <input spellcheck="false"\
                                    class="editableHead shoppingCartCol ' + 
                                    thClass + '" value="' + key + '" \
                                    readonly="true">\
                            </div>\
                            <div class="flexWrap flex-right">\
                                <span class="tick icon"></span>\
                                <div class="dropdownBox">\
                                    <span class="innerBox"></span>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                </th>';
        }

        var html = 
            '<div class="datasetTbodyWrap">\
                <table id="worksheetTable" class="datasetTable dataTable" \
                        data-dsname="' + dsName + '">\
                    <thead>\
                        <tr>' + th + '</tr>\
                    </thead>\
                    <tbody>' + tr + '</tbody>\
                </table>\
            </div>';

        return (html);
    }

    return (self);
}(jQuery));
