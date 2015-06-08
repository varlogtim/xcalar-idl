window.DataStore = (function($, DataStore) {
    DataStore.setup = function() {
        DS.setup();
        GridView.setup();
        DatastoreForm.setup();
        DataSampleTable.setup();
        DataCart.setup();
    };

    DataStore.updateInfo = function(numDatasets) {
        $("#worksheetInfo").find(".numDataStores").text(numDatasets);
        $("#datasetExplore").find(".numDataStores").text(numDatasets);
    };

    DataStore.updateNumDatasets = function() {
        XcalarGetDatasets()
        .then(function(datasets) {
            DataStore.updateInfo(datasets.numDatasets);
        })
        .fail(function(error) {
            console.error("Fail to update ds nums", error);
        });
    };

    return (DataStore);

}(jQuery, {}));

window.DatastoreForm = (function($, DatastoreForm) {
    var $filePath = $("#filePath");
    var $fileName = $("#fileName");

    var $formatSection  = $("#fileFormatList");
    var $formatText     = $formatSection.find(".text");
    var $formatDropdown = $("#fileFormatMenu");

    var $csvDelim   = $("#csvDelim");
    var $fieldDelim = $("#fieldDelim");

    var $udfArgs     = $("#udfArgs");
    var $udfCheckbox = $("#udfCheckbox");
    // constants
    var formatTranslater = {
        "JSON"  : "JSON",
        "CSV"   : "CSV",
        "Random": "rand",
        "Raw"   : "raw",
        "UDF"   : "UDF"
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
                    case "comma":
                        $input.val(",");
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

                if (val !== "") {
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

        // udf checkbox
        $udfCheckbox.click(function() {
            var $checkbox = $(this).find(".checkbox");

            if ($udfArgs.hasClass("hidden")) {
                $checkbox.addClass("checked");
                $udfArgs.removeClass("hidden").slideDown(200);
                // trigger it event click to make it in update
                UDF.getDropdownList($("#udfArgs-moduleList"),
                                $("#udfArgs-funcList"));
            } else {
                $checkbox.removeClass("checked");
                $udfArgs.addClass("hidden").slideUp(200);
            }
        });

        // reset form
        $("#importDataReset").click(function() {
            $(this).blur();
            $formatText.val("Format");
            $formatText.addClass("hint");
            // visbility 0 csvDelim and hide udfArgs
            $csvDelim.show();
            $csvDelim.addClass("hidden");
            $udfArgs.addClass("hidden");
            $udfCheckbox.addClass("hidden");
            $udfCheckbox.find(".checkbox").removeClass("checked");
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
                    "formMode" : true,
                    "text"     : "Dataset with the name " + dsName +
                                 " already exits. Please choose another name."
                },
                {
                    "$selector": $formatText,
                    "check"    : function() {
                        return (dsFormat == null);
                    },
                    "text": "No file format is selected," +
                            " please choose a file format!"
                }
            ]);

            if (!isValid) {
                return false;
            }

            var loadURL    = jQuery.trim($filePath.val());
            var fieldDelim = delimiterTranslate($("#fieldText"));
            var lineDelim  = delimiterTranslate($("#lineText"));

            var moduleName = $("#udfArgs-moduleList input").val();
            var funcName   = $("#udfArgs-funcList input").val();
            var msg        = StatusMessageTStr.LoadingDataset + ": " + dsName;

            StatusMessage.show(msg);

            DS.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                    moduleName, funcName)
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
            if (val.length === 2) {
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

            if (file === "sp500" || file === "gdelt") {
                $formatDropdown.find('li[name="CSV"]').click();
            } else {
                $formatDropdown.find('li[name="JSON"]').click();
            }

            $fileName.focus();
        }

        UDF.dropdownEvent($("#udfArgs-moduleList"), $("#udfArgs-funcList"),
                          "#importDataView");
    };

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
                return (delimiter);
        }
    }

    function formatSectionHandler($li) {
        var text = $li.text();

        if ($li.hasClass("hint")) {
            $udfCheckbox.addClass("hidden");
            return;
        } else if ($formatText.val() === text) {
            return;
        }

        $formatText.removeClass("hint");
        $formatText.val(text);
        $udfCheckbox.removeClass("hidden");

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
    };

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
            if ($importForm.css('display') !== "block") {
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
            if ($btn.attr("id") === "dataListView") {
                $gridView.removeClass("gridView").addClass("listView");
            } else {
                $gridView.removeClass("listView").addClass("gridView");
            }
        });

         // click "Add New Folder" button to add new folder
        $("#addFolderBtn").click(function() {
            DS.create({
                "name"    : "New Folder",
                "isFolder": true
            });
            commitToStorage();
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
                var errorHTML = "<div class='loadError'>" +
                                    "Loading dataset failed: " + error.error +
                                "</div>";
                console.error(error);
                $('#dataSetTableWrap').html(errorHTML);
            });

            function releaseDatasetPointer() {
                var deferred = jQuery.Deferred();

                if (gDatasetBrowserResultSetId === 0) {
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
            function() {
                var $grid = $(this).closest(".folder");
                $gridView.find(".active").removeClass("active");
                $deleteFolderBtn.addClass("disabled");
                if ($gridView.hasClass("gridView")) {
                    DS.goToDir($grid.data("dsid"));
                }
            }
        );

        // click list view folder
        $gridView.on("click", ".folder > .listIcon, .folder > .dsCount",
            function() {
                var $grid = $(this).closest(".folder");
                if ($gridView.hasClass("listView")) {
                    $grid.toggleClass("collapse");
                }
            }
        );
    }

    return (GridView);
}(jQuery, {}));

window.DataCart = (function($, DataCart) {
    var innerCarts = [];
    var $cartArea = $("#dataCart");

    DataCart.innershow = function() {
        return innerCarts;
    };

    DataCart.setup = function() {
        $("#submitDSTablesBtn").click(function() {
            $(this).blur();

            if ($cartArea.find(".selectedTable").length === 0) {
                return (false);
            }
            
            var datasetsList;
            var datasetNamesArray = [];
            var tableNamesArray = [];
            var nameIsValid = true;
            var errorMsg = "";
            var $input;
            var numGTables = gTables.length;
            var numGHiddenTables = gHiddenTables.length;

            $cartArea.find(".selectedTable").each(function() {
                var $cart = $(this);
                $input = $cart.find('.tableNameEdit');
                var tableName = $.trim($input.val());
                for (var i = 0; i < numGTables; i++) {
                    if (tableName === gTables[i].backTableName) {
                        errorMsg = 'A table with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                        nameIsValid = false;
                        return (false);
                    }
                }
                for (var i = 0; i < numGHiddenTables; i++) {
                    if (tableName === gHiddenTables[i].backTableName) {
                        errorMsg = 'A table with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                        nameIsValid = false;
                        return (false);
                    }
                }
            });

            if (!nameIsValid) {
                scrollToTableName($input);
                StatusBox.show(errorMsg, $input, true, 0, {side: 'left'});
                return (false);
            }
            
            XcalarGetDatasets()
            .then(function(datasets) {
                datasetsList = datasets;
            })
            .then(XcalarGetTables)
            .then(function(tables) {
                for (var i = 0; i < datasetsList.numDatasets; i++) {
                    datasetNamesArray.push(datasetsList.datasets[i].name);
                }
                for (var i = 0; i < tables.numTables; i++) {
                    tableNamesArray.push(tables.tables[i].tableName);
                }
                
                $cartArea.find(".selectedTable").each(function(){
                    var $cart = $(this);
                    $input = $cart.find('.tableNameEdit');
                    var tableName = $.trim($input.val());
                    if (tableName === "") {
                        errorMsg = 'Please give your new table a name.';
                        nameIsValid = false;
                        return (false);
                    } else if (datasetNamesArray.indexOf(tableName) !== -1) {
                        errorMsg = 'A dataset with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                        nameIsValid = false;
                        return (false);
                    } else if (tableNamesArray.indexOf(tableName) !== -1) {
                        errorMsg = 'A table with the name "' + tableName +
                                '" already exists. Please use a unique name.';
                        nameIsValid = false;
                        return (false);
                    }
                });

                if (nameIsValid) {
                    createWorksheet()
                    .then(function() {
                        emptyAllCarts();
                        commitToStorage();
                    })
                    .fail(function(error) {
                        emptyAllCarts();
                        Alert.error("Create work sheet fails", error);
                    });
                } else {
                    scrollToTableName($input);
                    StatusBox.show(errorMsg, $input, true, 0, {side: 'left'});
                    return (false);
                }
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

        $cartArea.on("keypress", ".tableNameEdit", function(event) {
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $cartArea.on("change", ".tableNameEdit", function() {
            var tableName = $.trim($(this).val());
            var dsName = $(this).closest(".selectedTable").attr("id")
                            .split("selectedTable-")[1];
            var cart = filterCarts(dsName, tableName);
            cart.tableName = tableName;
        });
    };

    // add column to cart
    DataCart.addItem = function(dsName, $colInput) {
        var colNum = xcHelper.parseColNum($colInput);
        var val    = $colInput.val();
        var $li    = appendCartItem(dsName, dsName, colNum, val);

        $cartArea.find(".colSelected").removeClass("colSelected");
        $li.addClass("colSelected"); // focus on this li

        var cart = filterCarts(dsName);

        cart.items.push({"colNum": colNum, "value": val});
    };

    // remove one column from cart
    DataCart.removeItem = function (dsName, $colInput) {
        var colNum = xcHelper.parseColNum($colInput);
        var $li    = $("#selectedTable-" + dsName)
                        .find("li[data-colnum=" + colNum + "]");

        removeCartItem(dsName, $li);
    };

    // remove one cart
    DataCart.removeCart = function(dsName) {
        $("#selectedTable-" + dsName).remove();
        overflowShadow();
        // remove the cart
        for (var i = 0; i < innerCarts.length; i++) {
            if (innerCarts[i].dsName === dsName) {
                innerCarts.splice(i, 1);
                break;
            }
        }
    };

    DataCart.getCarts = function() {
        return (innerCarts);
    };

    DataCart.restore = function(carts) {
        innerCarts = carts;
        innerCarts.forEach(function(cart) {
            var dsName = cart.dsName;
            var tableName = cart.tableName;
            var items = cart.items;
            items.forEach(function(item) {
                appendCartItem(dsName, tableName, item.colNum, item.value);
            });
        });
    };

    DataCart.clear = function() {
        emptyAllCarts();
    };

    DataCart.scrollToDatasetColumn = function() {
        var $table = $("#worksheetTable");
        var $datasetWrap = $('#datasetWrap');
        var colNum = $cartArea.find(".colSelected").data("colnum");
        var $column = $table.find("th.col" + colNum);
        var position = $column.position().left;
        var columnWidth = $column.width();
        var dataWrapWidth = $datasetWrap.width();

        $datasetWrap.scrollLeft(position - (dataWrapWidth / 2) +
                                (columnWidth / 2));
    };

    function appendCartItem(dsName, tableName, colNum, val) {

        var $cart = $("#selectedTable-" + dsName);
        // this ds's cart not exists yet
        if ($cart.length === 0) {
            $cart = $('<div id="selectedTable-' + dsName + '"' +
                            'class="selectedTable">' +
                            '<input class="tableNameEdit" ' +
                                'type="text" value="' + tableName + 'Table">' +
                            '<ul></ul>' +
                        '</div>');
            $cartArea.prepend($cart);
            $cart.find('.tableNameEdit').focus().select();
        }

        var $li = $('<li style="font-size:13px;" class="colWrap" ' +
                        'data-colnum="' + colNum + '">' +
                        '<span class="colName">' + val + '</span>' +
                        '<div class="removeCol">' +
                            '<span class="closeIcon"></span>' +
                        '</div>' +
                    '</li>');

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
        for (var i = 0; i < items.length; i++) {
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

    function filterCarts(dsName, tableName) {
        var cart;
        var res = innerCarts.filter(function(curCart) {
            return curCart.dsName === dsName;
        });

        if (res.length === 0) {
            cart = {"dsName": dsName, "tableName": dsName};
            cart.items = [];
            innerCarts.push(cart);
        } else {
            cart = res[0];
            if (tableName) {
                cart.tableName = tableName;
            }    
        }

        return (cart);
    }

    function scrollToTableName($input) {
        var cartRect = $('#dataCartWrap')[0].getBoundingClientRect();
        var cartBottom = cartRect.bottom;
        var cartTop = cartRect.top;
        var inputTop = $input.offset().top;
        var inputHeight = $input.height();
        var hiddenDistance = (inputTop + inputHeight) - cartBottom;
        var distFromTop = inputTop - cartTop;
        var scrollTop;

        if (hiddenDistance > -10) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $('#dataCartWrap').scrollTop(scrollTop +
                                         hiddenDistance + 10);
        } else if (distFromTop < 0) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $('#dataCartWrap').scrollTop(scrollTop + distFromTop - 10);
        }
    }

    function triggerScrollToDatasetColumn($li) {
        var tableName = $li.closest('.selectedTable').attr('id').split("-")[1];
        var $datasetIcon = $('#dataset-' + tableName);

        if ($datasetIcon.hasClass('active')) {
            DataCart.scrollToDatasetColumn();
        } else {
            var clickEvent = $.Event('click');
            clickEvent.scrollToColumn = true;
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

                // var tableName = xcHelper.randName(datasetName + "-");
                var tableName = $.trim($cart.find('.tableNameEdit').val());

                // add sql
                var sqlOptions = {
                    "operation": "createTable",
                    "tableName": tableName,
                    "col"      : []
                };
                // add status message
                var msg = StatusMessageTStr.CreatingTable + ': ' + tableName;
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
                        "isNewCol": false,
                        "userStr" : '"' + colname + '" = pull(' +
                                    escapedName + ')',
                        "func": {
                            "func": "pull",
                            "args": [escapedName]
                        }
                    });

                    var currentIndex = startIndex - 1;

                    newTableCols[currentIndex] = progCol;
                    sqlOptions.col.push(colname);
                });
                // new "DATA" column
                newTableCols[startIndex] = ColManager.newDATACol(startIndex + 1);

                sqlOptions.col.push("DATA");

                var tableProperties = {bookmarks: [], rowHeights: {}};
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
    };

    DataSampleTable.getTableFromDS = function(dsId) {
        var deferred = jQuery.Deferred();

        var dsObj = DS.getDSObj(dsId);
        var datasetName = dsObj.name;
        var format = dsObj.attrs.format;
        var fileSize = dsObj.attrs.fileSize || 'N/A';
        // XcalarSample sets gDatasetBrowserResultSetId
        XcalarSample(datasetName, 40)
        .then(function(result, totalEntries) {
            var kvPairs    = result.kvPair;
            var numKvPairs = result.numKvPairs;

            updateTableInfo(datasetName, format, totalEntries, fileSize);

            var value;
            var json;
            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons

            try {
                for (var i = 0; i < numKvPairs; i++) {
                    value = kvPairs[i].value;
                    json = jQuery.parseJSON(value);

                    jsons.push(json);
                    // get unique keys
                    for (var key in json) {
                        uniqueJsonKey[key] = "";
                    }
                }

                for (var uniquekey in uniqueJsonKey) {
                    jsonKeys.push(uniquekey);
                }

                getSampleTable(datasetName, jsonKeys, jsons);
                deferred.resolve();
            } catch(err) {
                console.error(err, value);
                getSampleTable(datasetName);
                deferred.reject({"error": "Cannot parse the dataset."});
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    function getSampleTable(dsName, jsonKeys, jsons) {
        var html = getSampleTableHTML(dsName, jsonKeys, jsons);
        $tableWrap.empty().append(html);

        $(".datasetTbodyWrap").scroll(function() {
            dataStoreTableScroll($(this));
        });
        var $table = $("#worksheetTable");
        var tableHeight = $table.height();
        $table.find(".colGrab").height(tableHeight);
        restoreSelectedColumns();
    }

    function updateTableInfo(dsName, dsFormat, totalEntries, fileSize) {
        $("#schema-title").text(dsName);
        $("#dsInfo-title").text(dsName);
        // XXX these info should be changed after better backend support
        $("#dsInfo-author").text(WKBKManager.getUser());
        $("#dsInfo-createDate").text(xcHelper.getDate());
        $("#dsInfo-updateDate").text(xcHelper.getDate());
        $("#dsInfo-records").text(Number(totalEntries).toLocaleString('en'));
        $("#dsInfo-size").text(fileSize);
        if (dsFormat) {
            $("#schema-format").text(dsFormat);
        }
        totalRows = parseInt($('#dsInfo-records').text().replace(/\,/g, ""));
    }

    function dataStoreTableScroll($tableWrap) {
        var numRowsToFetch = 20;
        if (currentRow + 20 >= totalRows) {
            return;
        }
        if ($tableWrap[0].scrollHeight - $tableWrap.scrollTop() -
                   $tableWrap.outerHeight() <= 1) {
            if (currentRow === 0) {
                currentRow += 40;
            } else {
                currentRow += numRowsToFetch;
            }
            XcalarSetAbsolute(gDatasetBrowserResultSetId, currentRow)
            .then(function() {
                return (XcalarGetNextPage(gDatasetBrowserResultSetId,
                        numRowsToFetch));
            })
            .then(function(result) {
                var kvPairs    = result.kvPair;
                var numKvPairs = result.numKvPairs;

                var value;
                var json;
                var uniqueJsonKey = {}; // store unique Json key
                var jsonKeys = [];
                var jsons = [];  // store all jsons

                try {
                    for (var i = 0; i < numKvPairs; i++) {
                        value = kvPairs[i].value;
                        json = jQuery.parseJSON(value);
                        jsons.push(json);
                        // get unique keys
                        for (var key in json) {
                            uniqueJsonKey[key] = true;
                        }
                    }

                    for (var uniquekey in uniqueJsonKey) {
                        jsonKeys.push(uniquekey);
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
                gLastClickTarget.closest(".datasetTable")[0] === $table[0]) {

                var startIndex = gLastClickTarget.closest("th").index();
                var highlight = gLastClickTarget.closest("th")
                                .hasClass('selectedCol');

                var endIndex = $input.closest('th').index();
                if (startIndex > endIndex) {
                    var temp = endIndex;
                    endIndex = startIndex;
                    startIndex = temp;
                }

                var $ths = $table.find('th');
                for (var i = startIndex; i <= endIndex; i++) {
                    var $th = $ths.eq(i);
                    if ($th[0] !== gLastClickTarget.closest('th')[0]) {
                        if ($th.hasClass('selectedCol') !== highlight) {
                            selectColumn($th.find(".editableHead"),
                                            SelectUnit.Single);
                        }
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
            if (event.which !== 1) {
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

                if (event.which === keyCode.Enter) {
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
        // var $cart   = $("#selectedTable-" + dsName);
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
        });

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
        var typeId     = getTypeId(type);

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
                return (ColManager.checkColDup($input, $headers));
            },
            "noWarn": true
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
            DS.getGridByName(dsName).click();
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
    }

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
                '<li class="flexContainer flexRow typeList type-' +
                    type.toLowerCase() + '">' +
                    '<div class="flexWrap flex-left">' +
                        '<span class="type icon"></span>' +
                    '</div>' +
                    '<div class="flexWrap flex-right">' +
                        '<span class="label">' + type + '</span>' +
                    '</div>' +
                '</li>';
        });

        html += '</ul><div class="dropdownBox"></div>';
        return (html);
    }
    // sample table html
    function getSampleTableHTML(dsName, jsonKeys, jsons) {
        // validation check
        if (!dsName || !jsonKeys || !jsons) {
            return "";
        }

        var tr   = "";
        var th   = "";

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
            var thClass = "th col" + (i + 1);
            var type    = columnsType[i];
            th +=
                '<th title="' + key + '" class="' + thClass + '">' +
                    '<div class="header type-' + type + '" ' +
                         'data-type=' + type + '>' +
                        '<div class="colGrab" ' +
                            'title="Double click to auto resize" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="left">' +
                        '</div>' +
                        '<div class="flexContainer flexRow">' +
                            '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'title="' + type + '">' +
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
        var i  = 0;

        jsons.forEach(function(json) {
            tr += '<tr>';
            tr += '<td>' + (currentRow + i + 1) + '</td>';
            // loop through each td, parse object, and add to table cell
            for (var j = 0; j < jsonKeys.length; j++) {
                var key = jsonKeys[j];
                var val = json[key];
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                var selected  = "";
                var parsedVal = (val == null) ?
                                    "" : xcHelper.parseJsonValue(val);
                if (selectedCols && selectedCols[j + 1]) {
                    selected = " selectedCol";
                }

                tr += '<td class="col' + (j + 1) + selected + '">' +
                        '<div class="addedBarTextWrap">' +
                            '<div class="addedBarText">' +
                                parsedVal +
                            '</div>' +
                        '</div>' +
                      '</td>';
            }

            tr += '</tr>';
            i++;
        });

        return (tr);
    }

    return (DataSampleTable);
}(jQuery, {}));

window.DS = (function ($, DS) {
    /**
    * private property
    *
    * @property {number} homeDirId, home folder id, always be 0
    * @property {number} curDirId, current folder id
    * @property {number} dsObjId, dsid that assigns to DSObj
    * @property {Object} dsLookUpTable, look up DSObj via dsid
    * @property {DSObj} homeFolder, home folder
    * @property {jQuery} dragDS, dragged dataset or folder element
    * @property {jQuery} $dropTarget, target element for drop
    */

    var homeDirId = 0;  // constant

    var curDirId;
    var dsObjId;
    var dsLookUpTable;
    var homeFolder;
    // for DS drag n drop
    var $dragDS;
    var $dropTarget;

    /**
     * Initialization DS module
     */
    DS.setup = function () {
        curDirId = homeDirId;
        dsObjId = 0;
        dsLookUpTable = {};

        homeFolder = new DSObj(dsObjId++, "", -1, true);
        dsLookUpTable[homeFolder.id] = homeFolder;
    };

    /**
     * Get dsObj by dsId
     * @param {number} dsId The dsObj's id
     * @return {DSObj} dsObj The dsObj object
     */
    DS.getDSObj = function (dsId) {
        return (dsLookUpTable[dsId]);
    };

    /**
     * Get grid element(folder/datasets) by dsId
     * @param {number} dsId  The ds id
     * @return {JQuery} gridEl The grid element
    */
    DS.getGrid = function (dsId) {
        if (dsId === homeDirId) {
            return ($("#gridView"));
        } else {
            return ($('grid-unit[data-dsId="' + dsId + '"]'));
        }
    };

    /**
     * Get datasets element by dsName
     * @param {string} dsName The ds name
     * @return {JQuery/undefined} dsEl The ds element
     */
    DS.getGridByName = function (dsName) {
        if (!dsName) {
            return (null);
        }

        var $ds = $("#dataset-" + dsName);
        if ($ds.length > 0) {
            return ($("#dataset-" + dsName));
        } else {
            return (null);
        }
    };

    /**
     * Create datasets or folder
     * @param options
     * @param {number} options.id The dsId of dsObj
     * @param {string} options.name The name of dsObj
     * @param {number} options.parendId Parent directory's dsId
     * @param {boolean} options.isFolder If dsObj is a folder
     * @param {Object} options.attrs Attributes to be stored in dsObj
     * @return {DSObj} ds The dsObj object
     */
    DS.create = function (options) {
        // validation check
        if (!options || !options.name) {
            return (null);
        }

        var id       = options.id || (dsObjId++);
        var name     = jQuery.trim(options.name);
        var parentId = options.parentId || curDirId;
        var isFolder = options.isFolder ? true : false;
        var attrs    = options.attrs || {};

        var parent  = DS.getDSObj(parentId);
        var $parent = DS.getGrid(parentId);

        // XXX the way to rename could be imporved
        var i         = 1;
        var validName = name;
        // only check folder name as ds name cannot confilct
        while (isFolder && parent.checkNameConflict(id, validName, isFolder)) {
            validName = name + ' (' + i + ')';
            ++i;
        }

        var ds = new DSObj(id, validName, parentId, isFolder, attrs);

        $parent.append(getDSHTML(ds));
        dsLookUpTable[ds.id] = ds;  // cached in lookup table

        if (isFolder) {
            // forcus on folder's label for renaming
            DS.getGrid(id).click()
                          .find('.label').focus();
        }

        return (ds);
    };

    /**
     * Load dataset
     * @param {string} dsName The dataset name
     * @param {string} dsFormat The dataset format
     * @param {string} loadURL The load path
     * @param {string} fieldDelim The field delimiter
     * @param {string} lineDelim The line delimiter
     * @param {string} moduleName The python module name
     * @param {string} funcName  The python function name
     * @return {Promise} deferred
     */
    DS.load = function (dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                        moduleName, funcName) {
        var deferred = jQuery.Deferred();

        console.log(dsName, dsFormat, loadURL,
                    fieldDelim, lineDelim,
                    moduleName, funcName);

        $("#gridView").append(getTempDSHTML(dsName));
        $("#waitingIcon").fadeIn(200);

        XcalarLoad(loadURL, dsFormat, dsName,
                   fieldDelim, lineDelim,
                   moduleName, funcName)
        .then(function() {
            $("#tempDSIcon").remove();
            // add sql
            SQL.add("Load dataset", {
                "operation" : "loadDataSet",
                "dsPath"    : loadURL,
                "dsName"    : dsName,
                "dsFormat"  : dsFormat,
                "fieldDelim": fieldDelim || "Null",
                "lineDelim" : lineDelim || "Null",
                "moduleName": moduleName || null,
                "funcName"  : funcName || null
            });
        })
        .then(function() {
            var urlLen = loadURL.length;
            console.log(loadURL[urlLen - 1], loadURL);

            var slashIndex = loadURL.lastIndexOf('/');
            var dotIndex   = loadURL.lastIndexOf('.');

            if (dotIndex > slashIndex) {
                loadURL = loadURL.substr(0, slashIndex + 1);
            }
            return (XcalarListFiles(loadURL));
        })
        .then(function(files) {
            // display new dataset
            console.log('files', files);
            var fileSize = getFileSize(files);
            DS.create({
                "name"    : dsName,
                "isFolder": false,
                "attrs"   : {
                    "format"  : dsFormat,
                    "fileSize": fileSize
                }
            });
            DS.refresh();
            DS.getGridByName(dsName).click(); // lodat this dataset

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            $('#tempDSIcon').remove();
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    /**
     * Get home folder
     */
    DS.getHomeDir = function () {
        return (homeFolder);
    };

    /**
     * Restore dsObj from KVStore
     * @param {obj} oldHomFolder The stored home folder
     * @param {object[]} datasets The datasets in backend
     */
    DS.restore = function (oldHomeFolder, datasets) {
        var isRestore = restoreDSObjHelper(oldHomeFolder, datasets);

        if (!isRestore) {
            var numDatasets = datasets.numDatasets;

            console.log("Construct directly from backend");

            for (var i = 0; i < numDatasets; i++) {
                var dataset = datasets.datasets[i];
                var format  = DfFormatTypeTStr[dataset.formatType]
                                    .toUpperCase();
                DS.create({
                    "name"    : dataset.name,
                    "isFolder": false,
                    "attrs"   : {"format": format}
                });
            }
        }
        DS.refresh();
    };

    /**
     * Rename dsObj
     * @param {JQuery} $label label emelent which has new name
     */
    DS.rename = function ($label) {
        // now only for folders (later also rename datasets?)
        var newName = jQuery.trim($label.text());
        var dsId    = $label.closest("grid-unit").data("dsid");
        var ds      = DS.getDSObj(dsId).rename(newName);

        $label.text(ds.name);
        commitToStorage();
    };

    /**
     * Check if ds with dsName already exists
     * @param {string} dsName The dataset name to be checked
     * return {boolen} true/false Whether dsName already exists
     */
    DS.has = function (dsName) {
        // now only check dataset name conflict
        if (DS.getGridByName(dsName) != null) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * Remove datasset/folder
     * @param {JQuery} $grid The element to be removed
     */
    DS.remove = function ($grid) {
        if ($grid == null || $grid.length === 0) {
            return;
        }

        if ($grid.hasClass("ds")) {
            // delete a ds
            var dsName = $grid.attr("id").split("dataset-")[1];
            var msg    = "Are you sure you want to delete dataset " +
                          dsName + "?";
            // add alert
            Alert.show({
                "title"     : "DELETE DATASET",
                "msg"       : msg,
                "isCheckBox": true,
                "confirm"   : function () {
                    delDSHelper($grid, dsName);
                }
            });
        } else if (rmDSObjHelper($grid.data("dsid")) === true) {
            // delete a folder
            $grid.remove();
        }
    };

    /**
     * Change directory to parent folder
     */
    DS.upDir = function () {
        var parentId = DS.getDSObj(curDirId).parentId;
        DS.goToDir(parentId);
    };

    /**
     * Change directory to another folder
     * @param {number} folder The folder to go
     */
    DS.goToDir = function (folderId) {
        curDirId = folderId;

        if (curDirId === homeDirId) {
            $('#backFolderBtn').addClass("disabled");
        } else {
            $('#backFolderBtn').removeClass('disabled');
        }

        DS.refresh();
    };

    /**
     * Refresh dataset/folder display in gridView area
     */
    DS.refresh = function () {
        $("#gridView grid-unit").removeClass("display").addClass("hidden");
        $('#gridView grid-unit[data-dsParentId="' + curDirId + '"]')
            .removeClass("hidden").addClass("display");
    };

    /**
     * Clear dataset/folder in gridView area
     */
    DS.clear = function () {
        $("#gridView grid-unit").remove();
        DS.setup();
    };

    /* Drag and Drop API */

    /**
     * Get current dataset/folder in drag
     */
    DS.getDragDS = function () {
        return ($dragDS);
    };

    /**
     * Set current dataset/folder in drag
     * @param {JQuery} $ds dragged element
     */
    DS.setDragDS = function($ds) {
        $dragDS = $ds;
    };

    /**
     * Reset drag dataset/folder
     */
    DS.resetDragDS = function () {
        $dragDS = undefined;
    };

    /**
     * Get drop target
     */
    DS.getDropTarget = function () {
        return ($dropTarget);
    };

    /**
     * Set drap target
     * @param {JQuery} $target drop target
     */
    DS.setDropTraget = function ($target) {
        $dropTarget = $target;
    };

    /**
     * Reset drop target
     */
    DS.resetDropTarget = function () {
        $dropTarget = undefined;
    };

    /* End of Drag and Drop API */



    function getFileSize(files) {
        var size = 'N/A';
        var numFiles = 0;
        for (var i = 0; i < files.numFiles; i++) {
            var file = files.files[i];
            if (!file.attr.isDirectory) {
                numFiles++;
                if (numFiles > 1) {
                    size = 'N/A';
                    break;
                } else {
                    size = xcHelper.sizeTranslater(file.attr.size);
                }
            }
        }
        return (size);
    }
    /**
     * Helper function for DS.remove()
     * @param {JQuery} $grid The element to be removed
     * @param {string} dsName The dataset's name
     */
    function delDSHelper ($grid, dsName) {
        $grid.removeClass("active");
        $grid.addClass("inactive");
        $grid.append('<div id="waitingIcon" class="waitingIcon"></div>');

        $("#waitingIcon").fadeIn(200);

        XcalarSetFree(gDatasetBrowserResultSetId)
        .then(function() {
            gDatasetBrowserResultSetId = 0;
            return (XcalarDestroyDataset(dsName));
        })
        .then(function() {
            //clear data cart
            $("#selectedTable-" + dsName).remove();
            // clear data table
            $("#dataSetTableWrap").empty();
            // remove ds obj
            rmDSObjHelper($grid.data("dsid"));
            $grid.remove();

            // add sql
            SQL.add("Delete DateSet", {
                "operation": "destroyDataSet",
                "dsName"   : dsName
            });

            $("#waitingIcon").remove();

            DataStore.updateNumDatasets();
            focusOnFirstDS();
            commitToStorage();
        })
        .fail(function(error) {
            $("#waitingIcon").remove();
            $grid.removeClass("inactive");
            Alert.error("Delete Dataset Fails", error);
        });
    }

    /**
     * Helper function to remove dsObj
     * @param {number} dsId The dsObj's id
     * return {boolean} true/false
     */
    function rmDSObjHelper (dsId) {
        var ds = DS.getDSObj(dsId);

        if (ds.isFolder && ds.eles.length > 0) {
            var instr = "Please remove all the datasets in the folder first.";
            var msg  =
                "Unable to delete non-empty folders. Please ensure\r\n" +
                " that all datasets have been removed from folders prior" +
                " to deletion.";
            // add alert
            Alert.show({
                "title"     : "DELETE FOLDER",
                "instr"     : instr,
                "msg"       : msg,
                "isCheckBox": true,
                "isAlert"   : true
            });

            return false;
        } else {
            ds.removeFromParent();
            // delete ds
            delete dsLookUpTable[ds.id];
            delete ds;

            return true;
        }
    }

    /**
     * Focus on the first dataset in the folder
     */
    function focusOnFirstDS () {
        var $curFolder = DS.getGrid(curDirId);
        var $datasets = $curFolder.find("> grid-unit.ds");

        if ($datasets.length > 0) {
            $datasets.eq(0).click();
        } else {
            $("#importDataButton").click();
        }
    }

    /**
     * Helper function for DS.restore()
     * @param {Object} oldHomFolder The folder to be restored
     * @param {Object[]} datasets The dataset arrays
     * @return {boolean} true/fase Whether restore succeed
     */
    function restoreDSObjHelper (oldHomeFolder, datasets) {
        // no oldHomeFolder from backend
        if (jQuery.isEmptyObject(oldHomeFolder)) {
            return false;
        }

        var numDatasets = datasets.numDatasets;
        var searchHash = {};
        // store all data set name to searchHash for lookup
        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;
            searchHash[dsName] = true;
        }

        var dsCount = 0;
        var cache = oldHomeFolder.eles;
        // restore
        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.isFolder) {
                DS.create(obj);
            } else {
                if (obj.name in searchHash) {
                    DS.create(obj);
                    dsCount++;
                } else {
                    // stored data not fit backend data, abort restore
                    DS.clear();
                    return false;
                }
            }
            if (obj.eles != null) {
                jQuery.merge(cache, obj.eles);
            }
            // update id count
            dsObjId = Math.max(dsObjId, obj.id + 1);
        }

        // stored data not fit backend data, abort restore
        if (dsCount !== numDatasets) {
            DS.clear();
            return false;
        }

        return true;
    }

    /**
     * Helper function to update totalChildren of all ancestors
     * @param {DSObj} dsObj The dsObj to start update
     * @param {boolean} isMinus Whether to decrease or increase child count
     */
    function updateDSCount (dsObj, isMinus) {
        var parentObj = DS.getDSObj(dsObj.parentId);

        while (parentObj != null) {
            if (isMinus) {
                parentObj.totalChildren -= dsObj.totalChildren;
            } else {
                parentObj.totalChildren += dsObj.totalChildren;
            }
            DS.getGrid(parentObj.id).find("> div.dsCount")
                                    .text(parentObj.totalChildren);
            parentObj = DS.getDSObj(parentObj.parentId);
        }
    }

    /**
     * Helper function for DS.create()
     * @param {DSObj} dsObj The dsObj to create
     */
    function getDSHTML (dsObj) {
        var id = dsObj.id;
        var parentId = dsObj.parentId;
        var name = dsObj.name;
        var isFolder = dsObj.isFolder;
        var html;

        if (isFolder) {
            html =
            '<grid-unit class="folder display collapse" draggable="true"' +
                ' ondragstart="dsDragStart(event)"' +
                ' ondragend="dsDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "midWarp") +
                    ' class="dragWrap midDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="dsCount">0</div>' +
                '<div title="Click to rename"' +
                    ' class="label" contentEditable="true">' +
                    name +
                '</div>' +
            '</grid-unit>';
        } else {
            html =
            '<grid-unit id="dataset-' + name + '" class="ds" draggable="true"' +
                ' ondragstart="dsDragStart(event)"' +
                ' ondragend="dsDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div  id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' +
                    ' ondrop="dsDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="label" data-dsname=' + name + '>' +
                    name +
                '</div>' +
            '</grid-unit>';
        }

        return (html);
    }

    /**
     * Helper function for DS.load()
     * @param {string} dsName The loading dataset's name
     */
    function getTempDSHTML(dsName) {
        var html =
            '<grid-unit id="tempDSIcon" class="ds display inactive">' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div id="waitingIcon" class="waitingIcon"></div>' +
                '<div class="label">' + dsName + '</div>' +
            '</grid-unit>';

        return (html);
    }

    /*** Start of DSObj ***/

    /**
     * DSObj is a structure for our datasets and folders
     *
     * @class: DSObj
     * @constructor
     * @property {number} id A unique dsObj id, for reference use
     * @property {string} name The dataset/folder's name
     * @property {number} parentId The parent folder's id
     * @property {boolean} isFolder Whether it's folder or dataset
     * @property {DSObj[]} [eles], An Array of child DSObjs
     * @property {number} [totalChildren] The total nummber of child
     * @property {Object} [attrs] extra attribute to be stored
     */
    function DSObj (id, name, parentId, isFolder, attrs) {
        this.id = id;
        this.name = name;
        this.parentId = parentId;     // parent directory
        this.isFolder = isFolder;
        this.attrs = attrs || {};

        /* initially, dataset count itself as one child,
           folder has no child;
         */
        if (isFolder) {
            this.eles = [];
            this.totalChildren = 0;
        } else {
            this.totalChildren = 1;
        }

        if (parentId >= 0) {
            var parent = DS.getDSObj(parentId);
            parent.eles.push(this);
            // update totalChildren of all ancestors
            updateDSCount(this);
        }

        return (this);
    }

    /**
     * Change name of the dsObj
     * @param {string} newName The new name
     * @return {DSObj} this
     */
    DSObj.prototype.rename = function (newName) {
        var self   = this;
        var parent = DS.getDSObj(self.parentId);
        //check name confliction
        var isValid = xcHelper.validate({
            "$selector": DS.getGrid(self.id),
            "text"     : 'Folder "' + newName +
                         '" already exists, please use another name!',
            "check": function() {
                return (parent.checkNameConflict(self.id, newName,
                                                 self.isFolder));
            }
        });

        if (isValid) {
            this.name = newName;
        }

        return (this);
    };

    /**
     * Remove dsObj from parent
     * @return {DSObj} this
     */
    DSObj.prototype.removeFromParent = function () {
        var parent = DS.getDSObj(this.parentId);
        var index  = parent.eles.indexOf(this);

        parent.eles.splice(index, 1);    // remove from parent
        // update totalChildren count of all ancestors
        updateDSCount(this, true);
        this.parentId = -1;

        return (this);
    };

    /**
     * Move dsObj to new parent (insert or append)
     * @param {DSObj} newParent The new parent
     * @param {number} index The index where to insert or append when index < 0
     * @return {boolean} true/false Whether move succeed
     */
    DSObj.prototype.moveTo = function (newParent, index) {
        // not append to itself
        if (this.id === newParent.id) {
            return false;
        }

        // not append to same parent again, but can insert
        if (index < 0 && this.parentId === newParent.id) {
            return false;
        }

        // not append or insert to its own child
        var ele = newParent;
        while (ele != null && ele !== this) {
            ele = DS.getDSObj(ele.parentId);
        }
        if (ele === this) {
            return false;
        }

        var $grid = DS.getGrid(this.id);
        // check name conflict
        if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
            var msg;
            if (this.isFolder) {
                msg = 'Folder "' + this.name +
                      '" already exists, cannot move!';
            } else {
                msg = 'Data Set "' + this.name +
                      '" already exists, cannot move!';
            }
            StatusBox.show(msg, $grid);
            return false;
        }

        this.removeFromParent();
        this.parentId = newParent.id;

        if ((index != null) && (index >= 0)) {
            newParent.eles.splice(index, 0, this);  // insert to parent
        } else {
            newParent.eles.push(this);  // append to parent
        }

        $grid.attr('data-dsParentId', newParent.id);

        // update totalChildren of all ancestors
        updateDSCount(this);
        return true;
    };

    /**
     * Check if a dsObj's name has conflict in current folder
     * @param {number} id The dsObj's id
     * @param {string} name The dsObj's name
     * @param (boolean) isFolder Whether the dsObj is a folder
     * @return {boolean} true/false Whether move succeed
     */
    DSObj.prototype.checkNameConflict = function(id, name, isFolder) {
        // now only support check of folder

        // when this is not a folder
        if (!this.isFolder) {
            console.error("Error call", "only folder can call this function");
            return false;
        }

        var eles = this.eles;

        for (var i = 0; i < eles.length; i++) {
            var dsObj = eles[i];

            if (dsObj.isFolder &&
                dsObj.name === name &&
                dsObj.id !== id &&
                dsObj.isFolder === isFolder) {
                return true;
            }
        }

        return false;
    };
    /*** End of DSObj ***/

    return (DS);
}(jQuery, {}));

/*** Start of Drag and Drop Function for DSCart ***/

/**
 * Helper function for drag start event
 * @param {Object} event The event object
 */
function dsDragStart(event) {
    var $grid = $(event.target).closest("grid-unit");
    var $gridView = $("#gridView");

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.dropEffect = "copy";
    // must add datatransfer to support firefox drag drop
    event.dataTransfer.setData("text", "");

    $("#deleteFolderBtn").addClass("disabled");

    DS.setDragDS($grid);
    DS.resetDropTarget();

    $grid.find("> .dragWrap").hide();
    $gridView.find(".active").removeClass("active");
    $gridView.addClass("drag");
    //when anter extra space in grid view
    $gridView.on("dragenter", function(){
        DS.resetDropTarget();
        $gridView.find(".active").removeClass("active");
        $("#backFolderBtn").removeClass("active");
    });

}

/**
 * Helper function for drag end event
 * @param {Object} event The event object
 */
function dsDragEnd(event) {
    var $gridView = $("#gridView");
    var $grid = $(event.target).closest("grid-unit");

    event.stopPropagation();

    // clearence
    $grid.find("> .dragWrap").show();
    DS.resetDropTarget();
    DS.resetDragDS();

    $gridView.removeClass("drag");
    $gridView.off("dragenter");
    $gridView.find(".active").removeClass("active");
    $("#backFolderBtn").removeClass("active");
}

/**
 * Helper function for drag enter event
 * @param {Object} event The event object
 */
function dsDragEnter(event) {
    var $dragWrap = $(event.target);
    var targetId = $dragWrap.attr("id");
    var $dropTarget = DS.getDropTarget();

    event.preventDefault();
    event.stopPropagation();

    // back up button
    if (targetId === "backFolderBtn") {
        var $bacnFolderBtn = $("#backFolderBtn");

        if ($("#gridView").hasClass('listView') ||
            $bacnFolderBtn.hasClass("disabled")) {
            return;
        }
        $bacnFolderBtn.addClass("active");

    } else if (!$dropTarget || targetId !== $dropTarget.attr("id")) {
        // change drop target
        $("grid-unit").removeClass("active");
        $(".dragWrap").removeClass("active");

        if ($dragWrap.hasClass("midDragWrap")) {
            // drop in folder case
            $dragWrap.closest("grid-unit").addClass("active");
        } else {
            // insert case
            $dragWrap.addClass("active");
        }

        DS.setDropTraget($dragWrap);
    }
}

/**
 * Helper function for drop event
 * @param {Object} event The event object
 */
function dsDrop(event) {
    var $div = DS.getDropTarget();
    var $target = $div.closest('grid-unit');
    var $grid = DS.getDragDS();

    event.stopPropagation();

    if ($div != null) {
        if ($div.hasClass('midDragWrap')) {
            dsDropIn($grid, $target);
        } else if ($div.hasClass('leftTopDragWrap')) {
            dsInsert($grid, $target, true);
        } else {
            dsInsert($grid, $target, false);
        }
    }
}

/**
 * Helper function for drag over event
 * @param {Object} event The event object
 */
function allowDSDrop(event) {
    // call the event.preventDefault() method for the ondragover allows a drop
    event.preventDefault();
}

/**
 * Helper function to drop ds into a folder
 * @param {JQuery} $grid The ds to be dropped
 * @param {JQuery} $target The target folder to drop in
 */
function dsDropIn($grid, $target) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var targetId = $target.data("dsid");
    if (dragDsId === targetId) {
        return;
    }
    var targetDS = DS.getDSObj(targetId);

    if (ds.moveTo(targetDS, -1)) {
        $grid.attr("data-dsParentId", targetId);
        $target.append($grid);
        DS.refresh();
        commitToStorage();
    }
}

/**
 * Helper function to insert ds before or after another ds
 * @param {JQuery} $grid The ds to be inserted
 * @param {JQuery} $sibling The target ds
 * @param {boolean} isBefore Before or after $sibling
 */
function dsInsert($grid, $sibling, isBefore) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var siblingId = $sibling.attr("data-dsId");
    if (dragDsId === siblingId) {
        return;
    }
    var siblingDs = DS.getDSObj(siblingId);

    // parent
    var parentId = siblingDs.parentId;
    var parentDs = DS.getDSObj(parentId);

    var insertIndex = parentDs.eles.indexOf(siblingDs);
    var isMoveTo;

    if (isBefore) {
        isMoveTo = ds.moveTo(parentDs, insertIndex);
    } else {
        isMoveTo = ds.moveTo(parentDs, insertIndex + 1);
    }

    if (isMoveTo) {
        $grid.attr("data-dsParentId", parentId);
        if (isBefore) {
            $sibling.before($grid);
        } else {
            $sibling.after($grid);
        }
        DS.refresh();
        commitToStorage();
    }
}

/**
 * Helper function to drop ds back to parent folder
 * @param {Object} event The drop event
 */
function dsDropBack(event) {
    event.preventDefault(); // default is open as link on drop
    event.stopPropagation();

    if ($('#gridView').hasClass('listView') || 
        $('#backFolderBtn').hasClass('disabled')) {
        return;
    }

    var $grid = DS.getDragDS();
    var ds = DS.getDSObj($grid.data("dsid"));
    // target
    var grandPaId = DS.getDSObj(ds.parentId).parentId;
    var grandPaDs = DS.getDSObj(grandPaId);
    var $grandPa = DS.getGrid(grandPaId);

    if (ds.moveTo(grandPaDs, -1)) {
        $grid.attr("data-dsParentId", grandPaId);
        $grandPa.append($grid);
        DS.refresh();
        commitToStorage();
    }
}
/*** End of Drag and Drop Function for DSCart ***/
