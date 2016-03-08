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
            var $submitBtn = $(this).blur();

            if ($cartArea.find(".selectedTable").length === 0) {
                return false;
            }

            xcHelper.disableSubmit($submitBtn);

            // check backend table name to see if has conflict
            checkCartNames()
            .then(function() {
                return createWorksheet();
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
            var dsId = $li.closest(".selectedTable").data("dsid");
            removeCartItem(dsId, $li);
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
                var dsId = $input.closest(".selectedTable").data("dsid");
                var tableName = $input.val().trim();
                // update
                var cart = filterCarts(dsId);
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

    DataCart.getCartById = function(dsId) {
        return $cartArea.find('.selectedTable[data-dsid="' + dsId + '"]');
    };

    // add column to cart
    DataCart.addItem = function(dsId, items) {
        var cart = filterCarts(dsId);
        if (cart == null) {
            cart = addCart(dsId);
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
    DataCart.removeItem = function(dsId, colNum) {
        var $cart = DataCart.getCartById(dsId);
        var $li = $cart.find("li[data-colnum=" + colNum + "]");
        removeCartItem(dsId, $li);
    };

    // remove one cart
    DataCart.removeCart = function(dsId) {
        var $cart = DataCart.getCartById(dsId);

        if (gMinModeOn) {
            $cart.remove();
            refreshCart();
        } else {
            $cart.find("ul").slideUp(80, function() {
                $cart.remove();
                refreshCart();
            });
        }

        removeCart(dsId);    // remove the cart
    };

    // restore the cart
    DataCart.restore = function(carts) {
        var noNameCheck = true;
        for (var i = carts.length - 1; i >= 0; i--) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[i];
            var resotredCart = addCart(cart.dsId, cart.tableName, noNameCheck);
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
                "title"    : TooltipTStr.FocusColumn,
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

    function filterCarts(dsId) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsId === dsId) {
                return (innerCarts[i]);
            }
        }

        return (null);
    }

    function addCart(dsId, tableName, noNameCheck) {
        tableName = tableName || DS.getDSObj(dsId).getName();
        var cart = new Cart({
            "dsId"     : dsId,
            "tableName": tableName
        });

        // new cart should be prepended, sync with UI
        innerCarts.unshift(cart);

        var cartHtml =
            '<div class="selectedTable" data-dsid="' + dsId + '">' +
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
        var $cart = DataCart.getCartById(cart.dsId);
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
        var $cart = DataCart.getCartById(cart.dsId);
        $cart.find("ul").empty();
        $cart.find(".cartEmptyHint").show();
        cart.emptyItem();
        refreshCart();
    }

    function removeCart(dsId) {
        for (var i = 0, len = innerCarts.length; i < len; i++) {
            if (innerCarts[i].dsId === dsId) {
                innerCarts.splice(i, 1);
                break;
            }
        }
    }

    function removeCartItem(dsId, $li) {
        var colNum = $li.data("colnum");
        var $table = $("#worksheetTable");
        // if the table is displayed
        if ($table.data("dsid") === dsId) {
            $table.find("th.col" + colNum + " .header")
                        .removeClass('colAdded');
            $table.find(".col" + colNum).removeClass('selectedCol');
        }

        if ($li.siblings().length === 0) {
            // empty this cart
            $li.closest(".selectedTable").remove();
            removeCart(dsId);
        } else {
            if (gMinModeOn) {
                $li.remove();
            } else {
                $li.slideUp(100, function() {
                    $li.remove();
                });
            }
            var cart = filterCarts(dsId);
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
        var dsId = $li.closest('.selectedTable').data('dsid');
        var $ds = DS.getGrid(dsId);

        if ($ds.hasClass("active")) {
            DataCart.scrollToDatasetColumn(true);
        } else {
            DS.focusOn($ds)
            .then(function() {
                DataCart.scrollToDatasetColumn(true);
            });
        }
    }

    function checkCartNames() {
        var deferred = jQuery.Deferred();
        var tableNames = {};
        var nameIsValid;
        var cart;

        // check backend table name to see if has conflict
        xcHelper.getBackTableSet()
        .then(function(backTableSet) {
            for (var tableName in backTableSet) {
                var name = xcHelper.getTableName(tableName);
                tableNames[name] = true;
            }

            for (var i = 0, len = innerCarts.length; i < len; i++) {
                cart = innerCarts[i];
                nameIsValid = isCartNameValid(cart, tableNames);
                if (!nameIsValid) {
                    deferred.reject();
                    return;
                }
            }

            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Get Backend table failed!", error);
            // when get backend table fail, we try our best,
            // aka, we use front meta for checking
            for (var tableId in gTables) {
                var name = xcHelper.getTableName(gTables[tableId].tableName);
                tableNames[name] = true;
            }

            for (var i = 0, len = innerCarts.length; i < len; i++) {
                cart = innerCarts[i];
                nameIsValid = isCartNameValid(cart, tableNames);
                if (!nameIsValid) {
                    deferred.reject();
                    return;
                }
            }

            deferred.resolve();
        });

        return deferred.promise();
    }

    function isCartNameValid(cart, nameMap) {
        var tableName = cart.tableName;
        var error = null;

        if (tableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (nameMap.hasOwnProperty(tableName)) {
            error = ErrTStr.TableConflict;
        } else {
            return true;
        }

        var $cart = DataCart.getCartById(cart.getId());
        var $input = $cart.find(' .tableNameEdit');
        scrollToTableName($input);
        StatusBox.show(error, $input, true, {'side': 'left'});

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
        .then(function() {
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(StatusMessageTStr.TableCreationFailed, error);
            deferred.reject(error);
        })
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    function createWorksheetHelper(cart, worksheet) {
        var deferred = jQuery.Deferred();
        // store columns in localstorage using setgTable()
        var newTableCols = [];
        var dsName = cart.getDSName();
        var tableName = cart.getTableName() + Authentication.getHashId();

        // add sql
        var sql = {
            "operation" : SQLOps.IndexDS,
            "dsName"    : dsName,
            "dsId"      : cart.getId(),
            "tableName" : tableName,
            "columns"   : [],
            "revertable": false
        };

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
            sql.columns.push(colname);
        }

        // new "DATA" column
        newTableCols[itemLen] = ColManager.newDATACol();
        sql.columns.push("DATA");


        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.CreatingTable + ': ' + tableName,
            "operation": SQLOps.IndexDS,
            "sql"      : sql
        });

        XcalarIndexFromDataset(dsName, "recordNum", tableName, txId)
        .then(function() {
            var options = {"focusWorkspace": true};
            return TblManager.refreshTable([tableName], newTableCols,
                                            [], worksheet, options);
        })
        .then(function() {
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableName),
                "title"   : TblTStr.Create,
                "noCommit": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.TableCreationFailed,
                "error"  : error,
                "noAlert": true,
                "title"  : TblTStr.Create
            });
            deferred.reject(error);
        });
        return (deferred.promise());
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DataCart.__testOnly__ = {};
        DataCart.__testOnly__.filterCarts = filterCarts;
        DataCart.__testOnly__.getUnusedTableName = getUnusedTableName;
        DataCart.__testOnly__.isCartNameValid = isCartNameValid;
    }
    /* End Of Unit Test Only */

    return (DataCart);
}(jQuery, {}));
