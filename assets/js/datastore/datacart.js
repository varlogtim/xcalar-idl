/*
 * Module for data cart part on the right of datastore panel
 */
window.DataCart = (function($, DataCart) {
    var $cartArea; // $("#dataCart")
    var $loadingBar; // $('#sendToWorksheetLoadBar .innerBar')
    var innerCarts = [];
    var queryQueue = [];
    var resetTimer;
    var fadeOutTimer;
    var queryInterval;
    // constant
    var animationLimit = 20;
    var intervalTime = 2000;


    DataCart.setup = function() {
        $cartArea = $("#dataCart");
        $loadingBar = $('#sendToWorksheetLoadBar .innerBar');

        // send to worksheet button
        $("#submitDSTablesBtn").click(function() {
            $(this).blur();
            if ($cartArea.find(".selectedTable").length === 0) {
                return false;
            }

            // check valid characters & backend table name to see if has conflict
            if (checkCartNames()) {
                sendToWorksheet();
            }
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

    // restore the cart
    DataCart.restore = function(carts) {
        carts = carts || [];
        var noNameCheck = true;
        var len = carts.length;
        for (var i = len - 1; i >= 0; i--) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[i];
            var resotredCart = addCart(cart.dsId, cart.tableName, noNameCheck);
            appendCartItem(resotredCart, cart.items);
        }

        if (len > 0) {
            refreshCart();
        }
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
        var $explorePanel = $("#exploreView");
        if ($cartArea.height() > $('#dataCartWrap').height()) {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .addClass('cartOverflow');
        } else {
            $explorePanel.find('.contentViewRight').find('.buttonArea')
                                .removeClass('cartOverflow');
        }
    };

    DataCart.addQuery = function(mainQuery) {
        // var id = mainQuery.getId();
        queryQueue.push(mainQuery);
        if (queryQueue.length === 1 && !$loadingBar.hasClass('inProgress') &&
            $('#dataStoresTab').hasClass('active')) {
            endBarAnimation(0);
            trackQueries();
        }
    };

    // used for turning on/off checking when switching tabs
    DataCart.checkQueries = function() {
        if (!$('#dataStoresTab').hasClass('active')) {
            clearInterval(queryInterval);
        } else {
            if (queryQueue.length) {
                clearTimeout(resetTimer);
                clearTimeout(fadeOutTimer);
                interval();
                queryInterval = setInterval(interval, intervalTime);
            } else {
                endBarAnimation(0, true);
            }
        }
    };

    DataCart.queryDone = function(id) {
        for (var i = 0; i < queryQueue.length; i++) {
            if (queryQueue[i].getId() === id) {
                queryQueue[i].subQueries[0].state = "done";
                queryQueue.splice(i, 1);
                break;
            }
        }
        if (queryQueue.length === 0) {
            finishQueryBar();
        }
    };

    function trackQueries() {
        interval();
        queryInterval = setInterval(interval, intervalTime);
    }

    function interval() {
        if (!queryQueue.length) {
            finishQueryBar();
            return;
        }
        var mainQuery = queryQueue[0];
        var subQuery = mainQuery.subQueries[0];
        // if query is done, "pop" off from the beginning of the queue
        while (queryQueue.length && subQuery.state === "done") {
            queryQueue.shift();
            if (queryQueue.length) {
                mainQuery = queryQueue[0];
                subQuery = mainQuery.subQueries[0];
            } else {
                finishQueryBar();
                return;
            }
        }

        subQuery.check()
        .then(function(res) {
            if (res === 100) {
                mainQuery.subQueries[0].state = "done";
                queryQueue.shift();
            }
            updateQueryBar(res);
            mainQuery.setElapsedTime();
        })
        .fail(function(error) {
            console.error("Check failed", error);
            endBarAnimation(0, true);
        });
    }

    function endBarAnimation(time, force) {
        if (time == null) {
            time = 3000;
        }

        clearInterval(queryInterval);
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        if (time) {
            if (time === 3000) {
                fadeOutTimer = setTimeout(function() {
                    $loadingBar.parent().fadeOut(1000);
                }, intervalTime);
            }
            resetTimer = setTimeout(function() {
                $loadingBar.stop().removeClass('full goingToFull inProgress')
                                  .width(0);
            }, time);
        } else {
            $loadingBar.stop().removeClass('full goingToFull inProgress')
                              .width(0);
        }
        if (force) {
            $loadingBar.parent().hide();
        }
    }

    // sets progress bar to 100%
    function finishQueryBar() {
        clearInterval(queryInterval);
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        if ($loadingBar.hasClass('full')) {
            return;
        }
        $loadingBar.addClass('inProgress goingToFull');
        $loadingBar.stop().animate({"width": '100%'}, intervalTime, "linear", function() {
            $loadingBar.removeClass('inProgress goingToFull');
            $loadingBar.addClass('full');
            endBarAnimation();
        });
    }

    // will not update if progress bar is already going to 100% (goingToFull)
    function updateQueryBar(pct) {
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        $loadingBar.parent().stop().fadeIn(500);
        if ($loadingBar.hasClass('goingToFull')) {
            return;
        }
        if (pct < 100 && $loadingBar.hasClass('full')) {
            endBarAnimation(0);
        } else if (pct === 100) {
            $loadingBar.addClass('goingToFull');
        }
        $loadingBar.addClass('inProgress');

        $loadingBar.stop().animate({"width": pct + '%'}, intervalTime, "linear", function() {
            $loadingBar.removeClass('inProgress');
            if (pct === 100) {
                $loadingBar.addClass('full');
                $loadingBar.removeClass('goingToFull');

                if (queryQueue.length) {
                    endBarAnimation(0);
                    trackQueries();
                } else {
                    endBarAnimation();
                }
            }
        });
    }

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
        var len = items.length;

        for (var i = 0; i < len; i++) {
            var item = items[i];
            var colNum = item.colNum;
            var value = item.value;

            if (colNum == null || value == null) {
                throw "Invalid Case!";
            }

            var escapedVal = xcHelper.escapeHTMlSepcialChar(value);
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

        if (!gMinModeOn && len < animationLimit) {
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
        // var deferred = jQuery.Deferred();
        var tableNames = {};
        var nameIsValid;
        var cart;


        for (var i = 0; i < innerCarts.length; i++) {
            cart = innerCarts[i];
            nameIsValid = doesCartNameHaveValidChars(cart);
            if (!nameIsValid) {
                return false;
            }
        }

        // we will only check against active and archived list
        var name;
        for (var tableId in gTables) {
            if (gTables[tableId].status === TableType.Active ||
                gTables[tableId].status === TableType.Archived) {
                name = xcHelper.getTableName(gTables[tableId].tableName);
                tableNames[name] = true;
            }
        }

        for (var i = 0, len = innerCarts.length; i < len; i++) {
            cart = innerCarts[i];
            nameIsValid = isCartNameValid(cart, tableNames);
            if (!nameIsValid) {
                return (false);
            }
        }

        return (true);
    }

    function isCartNameValid(cart, nameMap) {
        var tableName = cart.tableName;
        var error = null;

        if (tableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (nameMap.hasOwnProperty(tableName)) {
            error = ErrTStr.TableConflict;
        } else if (tableName.length >=
                    XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            error = ErrTStr.TooLong;
        } else {
            return true;
        }

        var $cart = DataCart.getCartById(cart.getId());
        var $input = $cart.find(' .tableNameEdit');
        scrollToTableName($input);
        StatusBox.show(error, $input, true, {'side': 'left'});

        return false;
    }

    function doesCartNameHaveValidChars(cart) {
        var tableName = cart.tableName;
        if (tableName && /^ | $|[*#'"]/.test(tableName) === true) {
            var $cart = DataCart.getCartById(cart.getId());
            var $input = $cart.find(' .tableNameEdit');
            scrollToTableName($input);
            StatusBox.show(ErrTStr.InvalidTableName, $input, true,
                            {'side': 'left'});
            return false;
        } else {
            return true;
        }
    }

    function sendToWorksheet() {
        var deferred = jQuery.Deferred();
        var promises = [];
        var worksheet = WSManager.getActiveWS();
        // reference innerCarts here since innerCarts needs
        // to be clear at end
        var carts = innerCarts;
        carts.forEach(function(cart) {
            promises.push(sendToWorksheetHelper.bind(this, cart, worksheet));
        });

        emptyAllCarts();

        PromiseHelper.chain(promises)
        .then(function(lastTableName) {
            KVStore.commit();

            // resolve lastTableName for unit test
            deferred.resolve(lastTableName);
        })
        .fail(function(error) {
            Alert.error(StatusMessageTStr.TableCreationFailed, error);
            deferred.reject(error);
        })
        .always(removeWaitCursor);

        return (deferred.promise());
    }

    function sendToWorksheetHelper(cart, worksheet) {
        var deferred = jQuery.Deferred();
        // store columns in localstorage using setgTable()
        var newTableCols = [];
        var dsName = cart.getDSName();
        var tableName = cart.getTableName() + Authentication.getHashId();

        // add sql
        var sql = {
            "operation"  : SQLOps.IndexDS,
            "dsName"     : dsName,
            "dsId"       : cart.getId(),
            "tableName"  : tableName,
            "columns"    : [],
            "worksheet"  : WSManager.getActiveWS(),
            "htmlExclude": ["worksheet"]
        };

        var items = cart.items;
        var itemLen = items.length;
        var width;
        var widthOptions = {
            defaultHeaderStyle: true
        };

        for (var i = 0; i < itemLen; i++) {
            var colname = items[i].value;
            // var escapedName = xcHelper.escapeColName(colname);
            var escapedName = colname;

            width = getTextWidth($(), colname, widthOptions);

            var progCol = ColManager.newCol({
                "backName": escapedName,
                "name"    : colname,
                "width"   : width,
                "isNewCol": false,
                "userStr" : '"' + colname + '" = pull(' + escapedName + ')',
                "func"    : {
                    "name": "pull",
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
            "sql"      : sql,
            "steps"    : 1
        });

        XcalarIndexFromDataset(dsName, "recordNum", tableName, txId)
        .then(function() {
            var options = {"focusWorkspace": true};
            // var options = {};
            return TblManager.refreshTable([tableName], newTableCols,
                                            [], worksheet, options);
        })
        .then(function() {
            // this will be saved later
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableName),
                "title"   : TblTStr.Create,
                "noCommit": true
            });
            deferred.resolve(tableName);
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
        DataCart.__testOnly__.createWorksheet = sendToWorksheet;
    }
    /* End Of Unit Test Only */

    return (DataCart);
}(jQuery, {}));
