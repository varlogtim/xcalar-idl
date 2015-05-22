window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        GridView.setup();
        DatastoreForm.setup()
        DataSampleTable.setup();
        DataCart.setup();
    }

    DataStore.updateInfo = function(numDatasets) {
        $("#worksheetInfo").find(".numDataStores").text(numDatasets);
        $("#datasetExplore").find(".numDataStores").text(numDatasets);
    }

    DataStore.updateNumDatasets = function() {
        XcalarGetDatasets()
        .then(function(datasets) {
            DataStore.updateInfo(datasets.numDatasets);
        })
        .fail(function(result) {
            console.error("Fail to update ds nums");
        });
    }

    return (DataStore);

}(jQuery, {}));

window.DatastoreForm = (function($, DatastoreForm) {
    var $filePath        = $("#filePath");
    var $fileName        = $("#fileName");

    var $formatSection   = $("#fileFormatList");
    var $formatText      = $formatSection.find(".text");
    var $formatDropdown  = $("#fileFormatMenu");

    var $csvDelim        = $("#csvDelim");
    var $fieldDelim      = $("#fieldDelim");

    var $udfArgs         = $("#udfArgs");
    // constants
    var formatTranslater = {
        "JSON"  : "JSON",
        "CSV"   : "CSV",
        "Random": "rand",
        "Raw"   : "raw"
    };

    DatastoreForm.setup = function() {
        $("#importDataView").click(function(event){
            event.stopPropagation();
            hideDropdownMenu();
        });

        xcHelper.dropdownList($formatSection, {
            "onSelect" : formatSectionHandler,
            "container": "#importDataView"
        });

        xcHelper.dropdownList($csvDelim.find(".listSection"), {
            "onSelect": function($li) {
                var $input = $li.closest(".listSection").find(".text");
                switch ($li.attr("name")) {
                    case "default":
                        if ($input.attr("id") === "fieldText") {
                            $input.val("\\t");
                        } else {
                            $input.val("\\n");
                        }
                        $input.removeClass("nullVal");
                        return false;
                    case "null":
                        $input.val("Null");
                        $input.addClass("nullVal");
                        return false;
                    default:
                    // keep list open
                        return true;
                }
            },
            "container": "#importDataView"
        });

        // input other delimiters
        $csvDelim.on("keyup", ".delimVal", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var val    = $input.val();

                event.stopPropagation();

                if (val != "") {
                    $input.closest(".listSection").find(".text").val(val)
                                                .removeClass("nullVal");
                    $input.val("");
                    $input.blur();
                    hideDropdownMenu();
                }
            }
        });

        // prevent form to be submitted
        $csvDelim.on("keypress", ".delimVal", function(event) {
            if (event.which === keyCode.Enter) {
                return false;
            }
        });

        // reset form
        $("#importDataReset").click(function() {
            $(this).blur();
            $formatText.val("Select Format");
            $formatText.addClass("hint");
            // visbility 0 csvDelim and hide udfArgs
            $csvDelim.show();
            $csvDelim.addClass("hidden");
            $udfArgs.addClass("hidden");
        });
        // open file browser
        $("#fileBrowserBtn").click(function() {
            $(this).blur();
            FileBrowser.show();
        });
        // submit the form
        $("#importDataForm").submit(function(event) {
            event.preventDefault();
            $(this).blur();

            var dsName   = jQuery.trim($fileName.val());
            var dsFormat = formatTranslater[$formatText.val()];
            // check name conflict
            var isValid  = xcHelper.validate([
                {
                    "$selector": $fileName,
                    "check"    : DS.has,
                    "text"     : "Dataset with the name " +  dsName +
                                 " already exits. Please choose another name.",
                    "formMode" : true
                },
                {
                    "$selector": $formatText,
                    "check"    : function() {
                        return (dsFormat == null);
                    },
                    "text"     : "No file format is selected," +
                                 " please choose a file format!"
                }
            ]);

            if (!isValid) {
                return false;
            }

            var loadURL    = jQuery.trim($filePath.val());
            var fieldDelim = delimiterTranslate($("#fieldText"));
            var lineDelim  = delimiterTranslate($("#lineText"));

            var msg        = StatusMessageTStr.LoadingDataset + ": " + dsName;

            StatusMessage.show(msg);

            DS.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim)
            .then(function() {
                DataStore.updateNumDatasets();
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

                return false;
            });
        });

        // XXX This should be removed in production
        $filePath.keyup(function() {
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

            $filePath.val('file:///var/tmp/' + filePath);

            $fileName.val(file);

            if (file == "sp500" || file == "gdelt") {
                $formatDropdown.find('li[name="CSV"]').click();
            } else {
                $formatDropdown.find('li[name="JSON"]').click();
            }

            $fileName.focus();
        }
    }

    function delimiterTranslate($input) {
        if ($input.hasClass("nullVal")) {
            return "";
        }

        var delimiter = $input.val();
        switch (delimiter) {
            case "\\t":
                return "\t";
            case "\\n":
                return "\n";
            default:
                return delimiter;
        }
    }

    function formatSectionHandler($li) {
        var text = $li.text();

        if ($li.hasClass("hint") || $formatText.val() === text) {
            return;
        }

        $formatText.removeClass("hint");
        $formatText.val(text);

        $csvDelim.show();
        $udfArgs.addClass("hidden");
        switch (text.toLowerCase()) {
            case "csv":
                resetDelimiter();
                $fieldDelim.show();
                $csvDelim.removeClass("hidden");
                break;
            case "raw":
                resetDelimiter();
                $fieldDelim.hide();
                $csvDelim.removeClass("hidden");
                break;
            case "udf":
                resetDelimiter();
                $csvDelim.hide();
                $udfArgs.removeClass("hidden");
            default:
                $csvDelim.addClass("hidden");
                break;
        }
    }

    function hideDropdownMenu() {
        var $sections = $("#importDataView").find(".listSection");

        $sections.find(".list").hide();
        $sections.removeClass("open");

        $("#csvDelim").find(".delimVal").val("");
    }

    function resetDelimiter() {
        // XXX to show \t, \ should be escaped
        $("#fieldText").val("\\t").removeClass("nullVal");
        $("#lineText").val("\\n").removeClass("nullVal");
    }

    return (DatastoreForm);
}(jQuery, {}));

window.GridView = (function($, GridView) {
    var $deleteFolderBtn = $("#deleteFolderBtn");
    var $gridView = $("#gridView");

    GridView.setup = function() {
        // initial gDSObj
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
            DS.create({
                "name": "New Folder",
                "isFolder": true
            })
            // commitToStorage();
        });

        // click "Back Up" button to go back to parent folder
        $("#backFolderBtn").click(function() {
            if (!$(this).hasClass("disabled")) {
                 DS.upDir();
            }
        });

        // click "Delete Folder" button to delete folder
        $deleteFolderBtn.click(function() {
            if ($(this).hasClass("disabled")) {
                 return;
            }

            DS.remove($("grid-unit.active"));
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

            releaseDatasetPointer()
            .then(function() {
                var dsId = $grid.data("dsid");
                return (DataSampleTable.getTableFromDS(dsId));
            })
            .then(function() {
                if (event.scrollToColumn) {
                    DataCart.scrollToDatasetColumn();
                }
                Tips.refresh();
            })
            .fail(function(error) {
                var errorHTML = "<div class='loadError'>"+
                                "Loading dataset failed: "+error.error+"</div>";
                console.log(error)
                $('#dataSetTableWrap').html(errorHTML);
                // Alert.error("Load Dataset fails", error);
            });

            function releaseDatasetPointer() {
                var deferred = jQuery.Deferred();

                if (gDatasetBrowserResultSetId == 0) {
                    deferred.resolve();
                } else {
                    XcalarSetFree(gDatasetBrowserResultSetId)
                    .then(function() {
                        gDatasetBrowserResultSetId = 0;
                        deferred.resolve();
                    })
                    .fail(deferred.reject);
                }

                return (deferred.promise());
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
                var $label = $(this);
                DS.rename($label);
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
                    DS.goToDir($grid.data("dsid"));
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

    return (GridView);
}(jQuery, {}));

window.DataCart = (function($, DataCart) {
    var innerCarts = [];
    var $cartArea = $("#dataCart");

    DataCart.setup = function() {
        $("#submitDSTablesBtn").click(function() {
            $(this).blur();

            if ($cartArea.find(".selectedTable").length === 0) {
                return false;
            }
            createWorksheet()
            .then(function() {
                emptyAllCarts();
                commitToStorage();
            })
            .fail(function(error) {
                emptyAllCarts();
                Alert.error("Create work sheet fails", error);
            });
        });

        $("#clearDataCart").click(function() {
            $(this).blur();
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
            var $li = $(this).closest(".colWrap");
            var dsname = $li.closest(".selectedTable").attr("id")
                            .split("selectedTable-")[1];

            removeCartItem(dsname, $li);
        });
    }
    // add column to cart
    DataCart.addItem = function(dsName, $colInput) {
        var colNum = xcHelper.parseColNum($colInput);
        var val    = $colInput.val();
        var $li    = appendCartItem(dsName, colNum, val);

        $cartArea.find(".colSelected").removeClass("colSelected");
        $li.addClass("colSelected"); // focus on this li

        var cart = filterCarts(dsName);

        cart.items.push({"colNum": colNum, "value": val});
    }
    // remove one column from cart
    DataCart.removeItem = function (dsName, $colInput) {
        var colNum = xcHelper.parseColNum($colInput);
        var $li    = $("#selectedTable-" + dsName)
                        .find("li[data-colnum=" + colNum + "]");

        removeCartItem(dsName, $li);
    }
    // remove one cart
    DataCart.removeCart = function(dsName) {
        $("#selectedTable-" + dsName).remove();
        overflowShadow();
        // remove the cart
        for (var i = 0; i < innerCarts.length; i ++) {
            if (innerCarts[i].name === dsName) {
                innerCarts.splice(i, 1);
                break;
            }
        }
    }

    DataCart.getCarts = function() {
        return (innerCarts);
    }

    DataCart.restore = function(carts) {
        innerCarts = carts;
        innerCarts.forEach(function(cart) {
            var dsName = cart.name;
            var items = cart.items;
            items.forEach(function(item) {
                appendCartItem(dsName, item.colNum, item.value);
            });
        });
    }

    DataCart.clear = function() {
        emptyAllCarts();
    }

    DataCart.scrollToDatasetColumn = function() {
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

    function appendCartItem(dsName, colNum, val) {
        var $cart = $("#selectedTable-" + dsName);
        // this ds's cart not exists yet
        if ($cart.length === 0) {
            $cart =  $('<div id="selectedTable-' + dsName + '" \
                            class="selectedTable">\
                            <h3>' + dsName + '</h3>\
                            <ul></ul>\
                        </div>');
            $cartArea.prepend($cart);
        }

        var $li = $('<li style="font-size:13px;" class="colWrap" \
                        data-colnum="' + colNum + '">\
                        <span class="colName">' +  val + '</span>\
                        <div class="removeCol">\
                            <span class="closeIcon"></span>\
                        </div>\
                    </li>');

        $cart.find("ul").append($li);
        overflowShadow();

        return ($li);
    }

    function removeCartItem(dsname, $li) {
        var colNum = $li.data("colnum");
        var $table = $("#worksheetTable");
        // if the table is displayed
        if ($table.data("dsname") === dsname) {
            $table.find("th.col" + colNum + " .header")
                        .removeClass('colAdded');
            $table.find(".col" + colNum).removeClass('selectedCol');
        }

        if ($li.siblings().length === 0) {
            $li.closest(".selectedTable").remove();
        } else {
            $li.remove();
        }

        overflowShadow();

        var items = filterCarts(dsname).items;
        for (var i = 0; i < items.length; i ++) {
            if (items[i].colNum === colNum) {
                items.splice(i, 1);
                break;
            }
        }
    }

    function emptyAllCarts() {
        var $table = $("#worksheetTable");

        $cartArea.empty();
        $table.find('.colAdded').removeClass("colAdded");
        $table.find('.selectedCol').removeClass("selectedCol");
        overflowShadow();

        innerCarts = [];
    }

    function filterCarts(dsName) {
        var cart;
        var res = innerCarts.filter(function(curCart) {
            return curCart.name === dsName;
        });

        if (res.length === 0) {
            cart = {"name": dsName};
            cart.items = [];
            innerCarts.push(cart);
        } else {
            cart = res[0];
        }

        return (cart);
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

    function overflowShadow() {
        if ($cartArea.height() > $('#dataCartWrap').height()) {
            $('#contentViewRight').find('.buttonArea')
                                .addClass('cartOverflow');
        } else {
            $('#contentViewRight').find('.buttonArea')
                                .removeClass('cartOverflow');
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

                var tableName = xcHelper.randName(datasetName + "-");

                // add sql
                var sqlOptions = {
                    "operation": "createTable",
                    "tableName": tableName,
                    "col": []
                };
                // add status message
                var msg = StatusMessageTStr.CreatingTable+': '+tableName;
                StatusMessage.show(msg);

                $cart.find('.colName').each(function() {
                    var colname = $.trim($(this).text());
                    var escapedName = colname;

                    if (colname.indexOf('.') > -1) {
                        escapedName = colname.replace(/\./g, "\\\.");
                    }

                    var progCol = ColManager.newCol({
                        "index"   : ++startIndex,
                        "name"    : colname,
                        "width"   : gNewCellWidth,
                        "isNewCol"  : false,
                        "userStr" : '"'+colname+'" = pull('+escapedName+')',
                        "func"    : {
                            "func": "pull",
                            "args": [escapedName]
                        }
                    });

                    var currentIndex = startIndex - 1;

                    newTableCols[currentIndex] = progCol;
                    sqlOptions.col.push(colname);
                });
                // new "DATA" column
                newTableCols[startIndex] = ColManager.newDATACol(startIndex+1);

                sqlOptions.col.push("DATA");

                var tableProperties = {bookmarks:[], rowHeights:{}};
                setIndex(tableName, newTableCols, datasetName, tableProperties);
                
                refreshTable(tableName, gTables.length, true, false)
                .then(function() {
                    SQL.add("Send To Worksheet", sqlOptions);
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
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    return (DataCart);
}(jQuery, {}));

window.DataSampleTable = (function($, DataSampleTable) {
    var $tableWrap = $("#dataSetTableWrap");
    var $menu = $("#datasetTableMenu");
    var currentRow = 0;
    var totalRows = 0;

    DataSampleTable.setup = function() {
        $menu.append(getDropdownMenuHTML());
        setupSampleTable();
        setupColumnDropdownMenu();
    }

    DataSampleTable.getTableFromDS = function(dsId) {
        var deferred = jQuery.Deferred();

        var dsObj = DS.getDSObj(dsId);
        var datasetName = dsObj.name;
        var format = dsObj.attrs.format;
        // XcalarSample sets gDatasetBrowserResultSetId
        XcalarSample(datasetName, 20)
        .then(function(result, totalEntries) {
            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons
            var kvPairs = result.kvPairs;
            var records = kvPairs.records;
            var isVariable = kvPairs.recordType ==
                                GenericTypesRecordTypeT.GenericTypesVariableSize;

            updateTableInfo(datasetName, format, totalEntries);

            try {
                for (var i = 0; i < records.length; i ++) {
                    var record = records[i];
                    var value = isVariable ? record.kvPairVariable.value :
                                            record.kvPairFixed.value;
                    var json = jQuery.parseJSON(value);

                    jsons.push(json);
                    // get unique keys
                    for (var key in json) {
                        uniqueJsonKey[key] = "";
                    }
                }

                for (var key in uniqueJsonKey) {
                    jsonKeys.push(key);
                }

                getSampleTable(datasetName, jsonKeys, jsons);
                deferred.resolve();
             } catch(err) {
                console.log(err, value);
                getSampleTable(datasetName);
                deferred.reject({"error": "Cannot parse the dataset."});
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

   function getSampleTable(dsName, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsName, jsonKeys, jsons);
        $tableWrap.empty().append(html);
        $(".datasetTbodyWrap").scroll(function(event) {
            dataStoreTableScroll($(this), event)
        });
        var $table = $("#worksheetTable");
        var tableHeight = $table.height();
        $table.find(".colGrab").height(tableHeight);
        restoreSelectedColumns();
    }

    function updateTableInfo(dsName, dsFormat, totalEntries) {
        $("#schema-title").text(dsName);
        $("#dsInfo-title").text(dsName);
        $("#dsInfo-createDate").text(xcHelper.getDate());
        $("#dsInfo-updateDate").text(xcHelper.getDate());
        $("#dsInfo-records").text(Number(totalEntries).toLocaleString('en'));
        if (dsFormat) {
            $("#schema-format").text(dsFormat);
        }
        totalRows = parseInt($('#dsInfo-records').text().replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrap, event) {
        var numRowsToFetch = 20;
        if (currentRow + 20 >= totalRows) {
            return;
        }
        if ($tableWrap[0].scrollHeight - $tableWrap.scrollTop() -
                   $tableWrap.outerHeight() <= 1) {

            XcalarSetAbsolute(gDatasetBrowserResultSetId, 
                                currentRow += numRowsToFetch)
            .then(function() {
                return (XcalarGetNextPage(gDatasetBrowserResultSetId, 
                        numRowsToFetch));
            })
            .then(function(result) {
                var uniqueJsonKey = {}; // store unique Json key
                var jsonKeys = [];
                var jsons = [];  // store all jsons
                var kvPairs = result.kvPairs;
                var records = kvPairs.records;
                var isVariable = kvPairs.recordType ==
                            GenericTypesRecordTypeT.GenericTypesVariableSize;

                try {
                    for (var i = 0; i < records.length; i ++) {
                        var record = records[i];
                        var value = isVariable ? record.kvPairVariable.value :
                                                record.kvPairFixed.value;
                        var json = jQuery.parseJSON(value);

                        jsons.push(json);
                        // get unique keys
                        for (var key in json) {
                            uniqueJsonKey[key] = "";
                        }
                    }

                    for (var key in uniqueJsonKey) {
                        jsonKeys.push(key);
                    }

                    var selectedCols = {};

                    $('#worksheetTable').find('th.selectedCol').each(
                        function() {
                            selectedCols[$(this).index()] = true;
                        }
                    );

                    var tr = getTableRowsHTML(jsonKeys, jsons, false, 
                                              selectedCols);
                    $('#worksheetTable').append(tr);

                } catch(err) {
                    console.log(err, value);
                }
                
            });
        }   
    }

    function setupSampleTable() {
        // delete dataset
        $("#dsDelete").click(function() {
            var dsName = $("#worksheetTable").data("dsname") 
                        || $("#dsInfo-title").text();

            DS.remove($("#dataset-" + dsName));
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
        var $th     = $dropDownBox.closest("th");
        var colNum  = xcHelper.parseColNum($th);
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
        var dsName  = $("#worksheetTable").data("dsname");
        var $cart   = $("#selectedTable-" + dsName);
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
        var colNum  = xcHelper.parseColNum($input);
        var $table  = $input.closest(".datasetTable");
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
        var isValid    = xcHelper.validate({  // check validation
            "$selector": $input,
            "formMode" : true
        })

        if (!isValid) {
            return;
        }

        var colNum     = $input.closest(".colMenu").data("colnum");
        var $table     = $("#worksheetTable");
        var $th        = $table.find("th.col" + colNum);
        var $headInput = $th.find(".editableHead");
        var oldColName = $headInput.val();
        var dsName     = $table.data("dsname");
        var type       = $th.find(".header").data('type');
        var typeId      = getTypeId(type);

        $input.blur();
        // in this case, no need to have thrift call
        if (newColName === oldColName) {
            $menu.hide();
            return;
        }
        // check name conflict
        isValid = xcHelper.validate({
            "$selector": $input,
            "check"    : function() {
                var $headers = $table.find(".editableHead");
                return (ColManager.checkColDup($headers, $input));
            },
            "noWarn"   : true
        });

        if (!isValid) {
            return;
        }

        console.log("Renaming", oldColName, "to", newColName);

        $menu.hide();
        XcalarEditColumn(dsName, oldColName, newColName, typeId)
        .then(function() {
            // update column name
            $headInput.val(newColName);
            $th.attr("title", newColName);
            $("#selectedTable-" + dsName)
                .find("li[data-colnum=" + colNum + "] .colName")
                .text(newColName);

            // add sql
            SQL.add("Rename dataset column", {
                "operation" : "renameDatasetCol",
                "dsName"    : dsName,
                "colNum"    : colNum + 1,
                "oldColName": oldColName,
                "newColName": newColName }
            );
        })
        .fail(function(error){
            Alert.error(error);
        });
    }
    // change col type
    function changeColumnType($typeList) {
        var newType      = $typeList.find(".label").text().toLowerCase();
        var colNum       = $typeList.closest(".colMenu").data("colnum");

        var $table       = $("#worksheetTable");
        var $tableHeader = $table.find(" .col" + colNum + " .header");

        var $headInput   = $tableHeader.find(".editableHead");
        var dsName       = $table.data("dsname");
        var colName      = $headInput.val();
        var oldType      = $tableHeader.data('type');
        var typeId       = getTypeId(newType);

        $menu.hide();

        // if (newType === oldType || typeId < 0) {
        //     return;
        // }
        // XXX Change this because JS may treat 1.00 as 1 so the type is
        // integer, while in backend the type is decimal
        if (typeId < 0) {
            return;
        }

        console.log("Change Type from " + oldType + " to " + newType);

        XcalarEditColumn(dsName, colName, colName, typeId)
        .then(function() {
            // add sql
            SQL.add("Change dataset data type", {
                "operation": "changeDataType",
                "dsName"   : dsName,
                "colName"  : colName,
                "oldType"  : oldType,
                "newType"  : newType
            });
            // update the sample table
            DS.getGridFromName(dsName).click();
        });
    }

    function getTypeId(type) {
        switch (type) {
            case "undefined":
                return DfFieldTypeT.DfUnknown;
            case "string":
                return DfFieldTypeT.DfString;
            case "integer":
                return DfFieldTypeT.DfInt64;
            case "decimal":
                return DfFieldTypeT.DfFloat64;
            case "boolean":
                return DfFieldTypeT.DfBoolean;
            case "mixed":
                return DfFieldTypeT.DfMixed;
            default:
                return -1; // Invalid type
        }
    };
    // table menu html
    function getDropdownMenuHTML() {
        // XXX Now Array, Object and Unknown are invalid type to change
        var types = ['Boolean', 'Integer', 'Decimal', 'String', 'Mixed'];
        var html  = 
        '<li class="renameCol">' + 
            '<span>Rename Column</span>' + 
            '<ul class="subColMenu">' + 
                '<li style="text-align: center" class="clickable">' + 
                    '<span>New Column Name</span>' + 
                    '<input type="text" width="100px" spellcheck="false" />' + 
                '</li>' + 
                '<div class="subColMenuArea"></div>' + 
            '</ul>' + 
            '<div class="dropdownBox"></div>' + 
        '</li>' + 
        '<li class="changeDataType">' + 
            '<span>Change Data Type</span>' + 
            '<ul class="subColMenu">';

        types.forEach(function(type) {
            html += 
                '<li class="flexContainer flexRow typeList type-' 
                    + type.toLowerCase() + '">' + 
                    '<div class="flexWrap flex-left">' +  
                        '<span class="type icon"></span>' + 
                    '</div>' + 
                    '<div class="flexWrap flex-right">' + 
                        '<span class="label">' + type + '</span>' + 
                    '</div>' + 
                '</li>';
        });

        html +=  '</ul><div class="dropdownBox"></div>';
        return (html);
    }
    // sample table html
    function getSampleTableHTML(dsName, jsonKeys, jsons) {
        // validation check
        if (!dsName || !jsonKeys || !jsons) {
            return "";
        }

        var html        = "";
        var tr          = "";
        var th          = "";
        var columnsType = [];  // track column type

        currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = getTableRowsHTML(jsonKeys, jsons, columnsType);
        if (jsonKeys.length > 0) {
            th += '<th><div class="header"></th>';
        }
        
        // table header
        for (var i = 0; i < jsonKeys.length; i++) {
            var key     = jsonKeys[i];
            var thClass = "th col" + (i+1);
            var type    = columnsType[i];
            th += 
                '<th title="' + key + '" class="' + thClass + '">' + 
                    '<div class="header type-' + type + '" ' + 
                         'data-type=' + type + '>' + 
                        '<div class="colGrab" ' + 
                            'title="Double click to auto resize" ' + 
                            'data-toggle="tooltip" ' + 
                            'data-placement="top" ' + 
                            'data-container="body">' + 
                        '</div>' + 
                        '<div class="flexContainer flexRow">' + 
                            '<div class="flexWrap flex-left">' + 
                                '<span class="iconHidden"></span>' +
                                '<span class="type icon"></span>' + 
                            '</div>' + 
                            '<div class="flexWrap flex-mid">' + 
                                '<input spellcheck="false"' + 
                                    'class="editableHead shoppingCartCol ' + 
                                    thClass + '" value="' + key + '" ' + 
                                    'readonly="true">' + 
                            '</div>' + 
                            '<div class="flexWrap flex-right">' + 
                                '<span class="tick icon"></span>' + 
                                '<div class="dropdownBox">' + 
                                    '<span class="innerBox"></span>' + 
                                '</div>' + 
                            '</div>' + 
                        '</div>' + 
                    '</div>' + 
                '</th>';
        }

        var html = 
            '<div class="datasetTbodyWrap">' + 
                '<table id="worksheetTable" class="datasetTable dataTable" ' + 
                        'data-dsname="' + dsName + '">' + 
                    '<thead>' + 
                        '<tr>' + th + '</tr>' + 
                    '</thead>' + 
                    '<tbody>' + tr + '</tbody>' + 
                '</table>' + 
            '</div>';

        return (html);
    }

    function getTableRowsHTML(jsonKeys, jsons, columnsType, selectedCols) {
        var tr = "";
        var i = 0;
        jsons.forEach(function(json) {
            tr += '<tr>';
            tr += '<td>'+(currentRow + i+ 1)+'</td>';
            // loop through each td, parse object, and add to table cell
            for (var j = 0; j < jsonKeys.length; j++) {
                var key       = jsonKeys[j];
                var val       = json[key];
                var parsedVal = (val == undefined) ? 
                                    "" : xcHelper.parseJsonValue(val);
                var selected  = "";

                if (selectedCols && selectedCols[j+1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j+1) + selected + '">' + 
                        '<div class="addedBarTextWrap">' + 
                            '<div class="addedBarText">' + 
                                parsedVal + 
                            '</div>' + 
                        '</div>' + 
                      '</td>';

                if (!columnsType) {
                    continue;
                }   

                // Check type
                columnsType[j] = xcHelper.parseColType(parsedVal, 
                                                       columnsType[j]);
            }

            tr += '</tr>';
            i++;
        });

        return (tr);
    }

    return (DataSampleTable);
}(jQuery, {}));
