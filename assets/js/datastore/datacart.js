/*
 * Module for data cart part on the right of datastore panel
 */
window.DataCart = (function($, DataCart) {
    var innerCarts = [];
    var $cartArea  = $("#dataCart");
    var $explorePanel = $('#exploreView');

    DataCart.setup = function() {
        // send to worksheet button
        $("#submitDSTablesBtn").click(function() {
            var $submitBtn = $(this);
            $submitBtn.blur();

            if ($cartArea.find(".selectedTable").length === 0) {
                return false;
            }

            var nameIsValid = true;

            var tableNames = {};
            for (var tbl in gTables) {
                var name = xcHelper.getTableName(gTables[tbl].tableName);
                tableNames[name] = true;
            }

            // check table name conflict in gTables
            innerCarts.forEach(function(cart) {
                nameIsValid = isCartNameValid(cart, tableNames, true);

                if (!nameIsValid) {
                    // stop the loop
                    return false;
                }
            });

            if (!nameIsValid) {
                return false;
            }

            tableNames = {};
            xcHelper.disableSubmit($submitBtn);

            // check backend table name to see if has conflict
            XcalarGetTables()
            .then(function(results) {
                // var tables = results.tables;
                var tables = results.nodeInfo;
                for (var i = 0, len = results.numNodes; i < len; i++) {
                    var name = xcHelper.getTableName(tables[i].name);
                    tableNames[name] = true;
                }

                innerCarts.forEach(function(cart) {
                    nameIsValid = isCartNameValid(cart, tableNames);

                    if (!nameIsValid) {
                        // stop the loop
                        return false;
                    }
                });

                if (nameIsValid) {
                    return createWorksheet();
                } else {
                    return promiseWrapper(null);
                }
            })
            .then(function() {
                commitToStorage();
            })
            .fail(function(error) {
                Alert.error("Create Worksheet Failed", error);
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });

        // clear cart
        $("#clearDataCart").click(function() {
            $(this).blur();
            emptyAllCarts();
        });

        // click on data cart item to focus on the related column
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

        // edit table name event
        $cartArea.on({
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    $(this).blur();
                }
            },
            "change": function() {
                var $input = $(this);
                var dsName = $input.closest(".selectedTable").attr("id")
                                .split("selectedTable-")[1];
                var tableName = $input.val().trim();
                // update
                var cart = filterCarts(dsName);
                cart.updateTableName(tableName);
            },
            "focus": function() {
                $(this).closest(".cartTitleArea").addClass("focus");
            },
            "blur": function() {
                $(this).closest(".cartTitleArea").removeClass("focus");
            }
        }, ".tableNameEdit");

        // click edit icon to edit table
        $cartArea.on("click", ".cartTitleArea .iconWrapper", function() {
            $(this).siblings(".tableNameEdit").focus();
        });
    };

    // get information about carts
    DataCart.getCarts = function() {
        return (innerCarts);
    };

    // add column to cart
    DataCart.addItem = function(dsName, items) {
        var cart = filterCarts(dsName);

        if (cart == null) {
            cart = addCart(dsName);
        }

        if (items == null) {
            emptyCart(cart);
        } else {
            if (!(items instanceof Array)) {
                items = [items];
            }

            appendCartItem(cart, items);
            var delay = true;
            refreshCart(delay);
        }
    };

    // remove one column from cart
    DataCart.removeItem = function(dsName, colNum) {
        var $li = $("#selectedTable-" + dsName)
                    .find("li[data-colnum=" + colNum + "]");
        removeCartItem(dsName, $li);
    };

    // remove one cart
    DataCart.removeCart = function(dsName) {
        var $cart = $("#selectedTable-" + dsName);

        if (gMinModeOn) {
            $cart.remove();
            refreshCart();
        } else {
            $cart.find("ul").slideUp(80, function() {
                $cart.remove();
                refreshCart();
            });
        }

        removeCart(dsName);    // remove the cart
    };

    // restore the cart
    DataCart.restore = function(carts) {
        var noNameCheck = true;
        for (var i = carts.length - 1; i >= 0; i--) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[i];
            var resotredCart = addCart(cart.dsName, cart.tableName, noNameCheck);
            appendCartItem(resotredCart, cart.items);
        }

        refreshCart();
    };

    DataCart.clear = function() {
        emptyAllCarts();
    };

    DataCart.scrollToDatasetColumn = function(showToolTip) {
        var $table = $("#worksheetTable");
        var $datasetWrap = $('#datasetWrap');
        var colNum = $cartArea.find(".colSelected").data("colnum");
        var $column = $table.find("th.col" + colNum);
        var position = $column.position().left;
        var columnWidth = $column.width();
        var dataWrapWidth = $datasetWrap.width();

        $datasetWrap.scrollLeft(position - (dataWrapWidth / 2) +
                                (columnWidth / 2));

        if (showToolTip) {
            $column.parent().find(".header").tooltip("destroy");
            var $header = $column.children(".header");
            $header.tooltip({
                "title"    : "Focused Column",
                "placement": "top",
                "trigger"  : "manual",
                "container": "#exploreView"
            });
            $header.tooltip("show");

            setTimeout(function() {
                $header.tooltip("destroy");
            }, 1000);
        }
    };

    DataCart.overflowShadow = function() {
        if ($cartArea.height() > $('#dataCartWrap').height()) {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .addClass('cartOverflow');
        } else {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .removeClass('cartOverflow');
        }
    };

    function filterCarts(dsName) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsName === dsName) {
                return (innerCarts[i]);
            }
        }

        return (null);
    }

    function addCart(dsName, tableName, noNameCheck) {
        tableName = tableName || dsName;
        var cart = new Cart({
            "dsName"   : dsName,
            "tableName": tableName
        });

        // new cart should be prepended, sync with UI
        innerCarts.unshift(cart);

        var cartHtml =
            '<div id="selectedTable-' + dsName + '"' +
                'class="selectedTable">' +
                '<div class="cartTitleArea">' +
                    '<input class="tableNameEdit textOverflow" type="text" ' +
                        'spellcheck="false" value="' + tableName + '">' +
                    '<div class="iconWrapper">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="cartEmptyHint">' +
                    DataCartStr.NoColumns +
                '</div>' +
                '<ul></ul>' +
            '</div>';

        var $cart = $(cartHtml);
        $cartArea.prepend($cart);

        if (!noNameCheck) {
            getUnusedTableName(tableName)
            .then(function(newTableName) {
                $cart.find('.tableNameEdit').val(newTableName);
                cart.tableName = newTableName;
            })
            .fail(function() {
                // keep the current name
            });

            var $tableNameEdit = $cart.find('.tableNameEdit').focus();
            xcHelper.createSelection($tableNameEdit[0], true);
        }

        return (cart);
    }

    function appendCartItem(cart, items) {
        var $cart = $("#selectedTable-" + cart.dsName);
        var li = "";

        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var colNum = item.colNum;
            var value = item.value;

            if (colNum == null || value == null) {
                throw "Invalid Case!";
            }

            var escapedVal = value.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
            li += '<li class="colWrap" data-colnum="' + colNum + '">' +
                        '<span class="colName textOverflow">' +
                            escapedVal +
                        '</span>' +
                        '<div class="removeCol">' +
                        '<span class="closeIcon"></span>' +
                        '</div>' +
                    '</li>';
            cart.addItem(item);
        }

        var $lis = $(li);

        // remove "No Column Selected" hint
        $cart .find(".cartEmptyHint").hide();
        $cart.find("ul").append($lis);

        if (!gMinModeOn) {
            $lis.hide().slideDown(100);
        }
    }

    function getUnusedTableName(datasetName) {
        // checks dataset names and tablenames and tries to create a table
        // called dataset1 if it doesnt already exist or dataset2 etc...
        var deferred = jQuery.Deferred();
        var tableNames = {};

        // datasets has it's unique format, no need to check
        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                tableNames[name] = 1;
            }

            var validNameFound = false;
            var limit = 20; // we won't try more than 20 times
            var newName = datasetName;
            if (tableNames.hasOwnProperty(newName)) {
                for (var i = 1; i <= limit; i++) {
                    newName = datasetName + i;
                    if (!tableNames.hasOwnProperty(newName)) {
                        validNameFound = true;
                        break;
                    }
                }
                if (!validNameFound) {
                    var tries = 0;
                    while (tableNames.hasOwnProperty(newName) && tries < 100) {
                        newName = xcHelper.randName(datasetName, 4);
                        tries++;
                    }
                }
            }
            
            deferred.resolve(newName);
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function emptyCart(cart) {
        var $cart = $("#selectedTable-" + cart.dsName);
        $cart.find("ul").empty();
        $cart.find(".cartEmptyHint").show();
        cart.emptyItem();
        refreshCart();
    }


    function removeCart(dsName) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsName === dsName) {
                innerCarts.splice(i, 1);
                break;
            }
        }
    }

    function removeCartItem(dsName, $li) {
        var colNum = $li.data("colnum");
        var $table = $("#worksheetTable");
        // if the table is displayed
        if ($table.data("dsname") === dsName) {
            $table.find("th.col" + colNum + " .header")
                        .removeClass('colAdded');
            $table.find(".col" + colNum).removeClass('selectedCol');
        }

        if ($li.siblings().length === 0) {
            // empty this cart
            $li.closest(".selectedTable").remove();
            removeCart(dsName);
        } else {
            if (gMinModeOn) {
                $li.remove();
            } else {
                $li.slideUp(100, function() {
                    $li.remove();
                });
            }
            var cart = filterCarts(dsName);
            cart.removeItem(colNum);
        }

        refreshCart();
    }

    function emptyAllCarts() {
        var $table = $("#worksheetTable");

        $table.find('.colAdded').removeClass("colAdded");
        $table.find('.selectedCol').removeClass("selectedCol");

        innerCarts = [];

        if (gMinModeOn) {
            $cartArea.empty();
            refreshCart();
        } else {
            $cartArea.slideUp(100, function() {
                $cartArea.empty().show();
                refreshCart();
            });
        }
    }

    function refreshCart(delay) {
        DataCart.overflowShadow();
        var $submitBtn = $("#submitDSTablesBtn");
        var $clearBtn  = $("#clearDataCart");
        var $cartTitle = $("#dataCartTitle");
        var $dataCart  = $('#dataCart');
        var cartNum = innerCarts.length;

        if (cartNum === 0) {
            $submitBtn.addClass("btnInactive");
            $clearBtn.addClass("btnInactive");
            $cartTitle.html("<b>" + DataCartStr.NoCartTitle + "</b>");
            $dataCart.html('<span class="helpText">' +
                            DataCartStr.HelpText + '</span>');
        } else {
            $submitBtn.removeClass("btnInactive");
            $clearBtn.removeClass("btnInactive");
            $cartTitle.html('<b>' + DataCartStr.HaveCartTitle +
                            ' <span title="Number of tables to create" ' +
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="top">' +
                            '(' + cartNum + ')' +
                            '</span></b>');
            $dataCart.find('.helpText').remove();
        }

        if (delay) {
            setTimeout(DataCart.overflowShadow, 10);
        } else {
            DataCart.overflowShadow();
        }
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
        var $ds = $('#dataset-' + tableName);

        if ($ds.hasClass("active")) {
            DataCart.scrollToDatasetColumn(true);
        } else {
            DS.focusOn($ds)
            .then(function() {
                DataCart.scrollToDatasetColumn(true);
            });
        }
    }

    function isCartNameValid(cart, nameMap, checkEmpty) {
        var tableName = cart.tableName;
        var error = null;

        if (checkEmpty && tableName === "") {
            error = ErrorTextTStr.NoEmpty;
        } else if (nameMap.hasOwnProperty(tableName)) {
            error = ErrorTextTStr.TableConflict;
        } else {
            return true;
        }

        var $input = $('#selectedTable-' + cart.dsName + ' .tableNameEdit');
        scrollToTableName($input);
        StatusBox.show(error, $input, true, 0, {'side': 'left'});

        return false;
    }

    function createWorksheet() {
        var deferred = jQuery.Deferred();
        var promises = [];
        var worksheet = WSManager.getActiveWS();
        // reference innerCarts here since innerCarts needs
        // to be clear at end
        var carts = innerCarts;
        carts.forEach(function(cart) {
            promises.push(createWorksheetHelper.bind(this, cart, worksheet));
        });

        showWaitCursor();
        emptyAllCarts();

        chain(promises)
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    function createWorksheetHelper(cart, worksheet) {
        var deferred = jQuery.Deferred();
        // store columns in localstorage using setgTable()
        var newTableCols = [];
        var dsName = cart.dsName;
        var tableName = cart.tableName + Authentication.getHashId();

        // add sql
        var sqlOptions = {
            "operation": SQLOps.IndexDS,
            "dsName"   : dsName,
            "tableName": tableName,
            "columns"  : []
        };

        // add status message
        var msg = StatusMessageTStr.CreatingTable + ': ' + tableName;
        var msgId = StatusMessage.addMsg({
            "msg"      : msg,
            "operation": 'table creation'
        });

        var items = cart.items;
        var itemLen = items.length;
        var width;
        var widthOptions = {
            defaultHeaderStyle: true
        };

        for (var i = 0; i < itemLen; i++) {
            var colname = items[i].value;
            var escapedName = colname;

            if (colname.indexOf('.') > -1) {
                escapedName = colname.replace(/\./g, "\\\.");
            }

            width = getTextWidth($(), colname, widthOptions);

            var progCol = ColManager.newCol({
                "name"    : colname,
                "width"   : width,
                "isNewCol": false,
                "userStr" : '"' + colname + '" = pull(' + escapedName + ')',
                "func"    : {
                    "func": "pull",
                    "args": [escapedName]
                }
            });

            newTableCols[i] = progCol;
            sqlOptions.columns.push(colname);
        }

        // new "DATA" column
        newTableCols[itemLen] = ColManager.newDATACol();
        sqlOptions.columns.push("DATA");

        XcalarIndexFromDataset(dsName, "recordNum", tableName, sqlOptions)
        .then(function() {
            var options = {"focusWorkspace": true};
            return TblManager.refreshTable([tableName], newTableCols,
                                            [], worksheet, options);
        })
        .then(function() {
            StatusMessage.success(msgId, false, xcHelper.getTableId(tableName));
            deferred.resolve();
        })
        .fail(function(error) {
            StatusMessage.fail(StatusMessageTStr.TableCreationFailed, msgId);
            deferred.reject(error);
        });
        return (deferred.promise());
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DataCart.__testOnly__ = {};
        DataCart.__testOnly__.filterCarts = filterCarts;
    }
    /* End Of Unit Test Only */

    return (DataCart);
}(jQuery, {}));
