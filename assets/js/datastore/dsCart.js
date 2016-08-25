/*
 * Module for dataset cart part on the right of datastore panel
 */
window.DSCart = (function($, DSCart) {
    var $cartArea; // $("#dataCart")
    var $loadingBar; // $('#sendToWorksheetLoadBar .innerBar')
    var $cartList; // $("#dataCartWSList");

    var innerCarts = {};
    var queryQueue = [];
    var resetTimer;
    var fadeOutTimer;
    var queryInterval;
    // constant
    var animationLimit = 20;
    var intervalTime = 2000;


    DSCart.setup = function() {
        $cartArea = $("#dataCart");
        $cartList = $("#dataCartWSList");
        $loadingBar = $('#sendToWorksheetLoadBar .innerBar');

        $("#dataCartBtn").click(function() {
            $(this).toggleClass("active");
            $("#dsTableView").toggleClass("fullSize");
        });

        // send to worksheet button
        $("#dataCart-submit").click(function() {
            $(this).blur();
            var dsId = DSTable.getId();
            if (dsId == null || filterCarts(dsId) == null) {
                return false;
            }

            var cart = filterCarts(dsId);
            sendToWorksheet(cart);
        });

        // clear cart
        $("#dataCart-clear").click(function() {
            $(this).blur();
            var dsId = DSTable.getId();
            DSCart.removeCart(dsId);
        });

        // click on data cart item to focus on the related column
        $cartArea.on("click", ".colName", function() {
            var $li = $(this).closest("li");
            $cartArea.find(".colSelected").removeClass("colSelected");
            $li.addClass("colSelected");
            scrollToDatasetColumn($li);
        });

        // remove selected key
        $cartArea.on("click", ".removeCol", function() {
            var $li = $(this).closest("li");
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
                $(this).select();
            }
        }, ".tableNameEdit");

        // click edit icon to edit table
        $cartArea.on("click", ".cartTitleArea .icon", function() {
            $(this).siblings(".tableNameEdit").focus();
        });

        //set up dropdown for worksheet list
        new MenuHelper($cartList, {
            "onSelect": function($li) {
                var ws = $li.data("ws");
                $cartList.data("ws", ws)
                    .find(".text").val($li.text());
            },
            "container": "#dataCartContainer",
            "bounds"   : "#dataCartContainer"
        }).setupListeners();
    };

    DSCart.switchToCart = function(dsId) {
        if (dsId == null) {
            // error case
            return;
        }

        $cartArea.find(".selectedTable").addClass("xc-hidden");
        DSCart.getCartById(dsId).removeClass("xc-hidden");
        refreshCart(dsId);
    };

    DSCart.refresh = function() {
        var li = '<li class="new" data-ws="xc-new">' + WSTStr.NewWS + '</li>' +
                WSManager.getWSLists(true);
        // auto select active worksheet
        $("#dataCartWSMenu").html(li)
                            .find("li.activeWS").click();
    };

    // restore the cart
    DSCart.restore = function(carts) {
        carts = carts || {};
        var isRestore = true;
        for (var dsId in carts) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[dsId];
            var resotredCart = addCart(cart.dsId, cart.tableName, isRestore);
            appendCartItem(resotredCart, cart.items);
        }
    };

    // get information about carts
    DSCart.getCarts = function() {
        return innerCarts;
    };

    DSCart.getCartById = function(dsId) {
        if (dsId == null) {
            return null;
        }
        return $cartArea.find('.selectedTable[data-dsid="' + dsId + '"]');
    };

    // add column to cart
    DSCart.addItem = function(dsId, items) {
        if (dsId == null) {
            return null;
        }
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
            refreshCart(dsId);
        }
    };

    // remove one column from cart
    DSCart.removeItem = function(dsId, colNum) {
        if (dsId == null) {
            return;
        }

        var $cart = DSCart.getCartById(dsId);
        var $li = $cart.find("li[data-colnum=" + colNum + "]");
        removeCartItem(dsId, $li);
    };

    // remove one cart
    DSCart.removeCart = function(dsId) {
        if (dsId == null) {
            return;
        }

        var $cart = DSCart.getCartById(dsId);
        // remove cart
        delete innerCarts[dsId];

        $cart.remove();
        refreshCart(dsId);
        clearHighlightCol();
        // $cartList.removeData("ws")
        //         .find(".text").val("");
    };

    DSCart.clear = function() {
        clearHighlightCol();
        innerCarts = {};

        $cartArea.empty();
        $("#dataCartContainer").addClass("noCart");
    };

    DSCart.addQuery = function(mainQuery) {
        // var id = mainQuery.getId();
        queryQueue.push(mainQuery);
        if (queryQueue.length === 1 && !$loadingBar.hasClass('inProgress') &&
            $('#dataStoresTab').hasClass('active')) {
            endBarAnimation(0);
            trackQueries();
        }
    };

    // used for turning on/off checking when switching tabs
    DSCart.checkQueries = function() {
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

    DSCart.queryDone = function(id) {
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
        if (dsId == null) {
            return null;
        }
        return innerCarts[dsId];
    }

    function addCart(dsId, tableName, isRestore) {
        tableName = tableName || DS.getDSObj(dsId).getName();
        var cart = new Cart({
            "dsId"     : dsId,
            "tableName": tableName
        });

        // new cart should be prepended, sync with UI
        innerCarts[dsId] = cart;
        var cartClasss = isRestore ? "selectedTable xc-hidden" : "selectedTable";
        var cartHtml =
            '<div class="' + cartClasss + '" data-dsid="' + dsId + '">' +
                '<div class="cartTitleArea">' +
                    '<input class="tableNameEdit textOverflow" type="text" ' +
                        'spellcheck="false" value="' + tableName + '">' +
                    '<i class="icon xi-edit fa-15 xc-action"></i>' +
                '</div>' +
                '<div class="cartEmptyHint xc-hidden">' +
                    DSTStr.NoColumns +
                '</div>' +
                '<ul></ul>' +
            '</div>';

        var $cart = $(cartHtml);
        $cartArea.prepend($cart);

        if (!isRestore) {
            var $tableNameEdit = $cart.find('.tableNameEdit').focus();
            xcHelper.createSelection($tableNameEdit[0], true);

            getUnusedTableName(tableName)
            .then(function(newTableName) {
                $tableNameEdit.val(newTableName);
                cart.tableName = newTableName;
            })
            .fail(function() {
                // keep the current name
            });
        }

        return cart;
    }

    function appendCartItem(cart, items) {
        var $cart = DSCart.getCartById(cart.dsId);
        var html = "";
        var len = items.length;

        for (var i = 0; i < len; i++) {
            var item = items[i];
            var colNum = item.colNum;
            var value = item.value;
            var type = item.type;

            if (colNum == null || value == null) {
                throw "Invalid Case!";
            }

            if (type == null) {
                type = "unknown";
            }

            var escapedVal = xcHelper.escapeHTMlSepcialChar(value);
            html +=
                '<li data-colnum="' + colNum + '">' +
                    '<div class="itemWrap type-' + type + '">' +
                        '<span class="iconWrap">' +
                            '<i class="center icon fa-16 xi-' + type + '"></i>' +
                        '</span>' +
                        '<span class="colName textOverflow">' +
                            escapedVal +
                        '</span>' +
                    '</div>' +
                    '<i class="removeCol icon xi-trash xc-action fa-15"></i>' +
                '</li>';
            cart.addItem(item);
        }

        var $lis = $(html);

        // remove "No Column Selected" hint
        $cart.find(".cartEmptyHint").addClass("xc-hidden");
        $cart.find("ul").append($lis);

        if (!gMinModeOn && len < animationLimit) {
            $lis.hide().slideDown(100);
        }
    }

    function clearHighlightCol() {
        var $table = $("#dsTable");
        $table.find(".colAdded").removeClass("colAdded");
        $table.find(".selectedCol").removeClass("selectedCol");
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
        var $cart = DSCart.getCartById(cart.dsId);
        $cart.find("ul").empty()
            .end()
            .find(".cartEmptyHint").removeClass("xc-hidden");
        cart.emptyItem();
        refreshCart(cart.dsId);
    }

    function removeCartItem(dsId, $li) {
        var colNum = $li.data("colnum");
        var $table = $("#dsTable");
        // if the table is displayed
        if ($table.data("dsid") === dsId) {
            $table.find("th.col" + colNum + " .header")
                        .removeClass('colAdded');
            $table.find(".col" + colNum).removeClass("selectedCol");
        }

        if ($li.siblings().length === 0) {
            // empty this cart
            DSCart.removeCart(dsId);
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
            refreshCart(dsId);
        }
    }

    function refreshCart(dsId) {
        var cart = filterCarts(dsId);
        var $container = $("#dataCartContainer");
        var $cartBtn = $("#dataCartBtn");

        if (cart == null) {
            $container.addClass("noCart");
            $cartBtn.addClass("noCart");
        } else {
            var numCol = cart.items.length;
            $container.removeClass("noCart");
            $cartBtn.removeClass("noCart");
            $(".dataCartNum").text(numCol);
            DSCart.getCartById(dsId).removeClass("xc-hidden");
        }

        overflowShadow();
    }

    function overflowShadow() {
        if ($cartArea.height() > $("#dataCartWrap").height()) {
            $("#dataCartContainer").addClass("cartOverflow");
        } else {
            $("#dataCartContainer").removeClass("cartOverflow");
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

    function scrollToDatasetColumn($li) {
        var dsId = $li.closest('.selectedTable').data('dsid');
        var $ds = DS.getGrid(dsId);

        if ($ds.hasClass("active")) {
            scrollHelper(true);
        } else {
            // for current behavior, it's an error case
            console.error("Error Case!");
            // DS.focusOn($ds)
            // .then(function() {
            //     scrollHelper(true);
            // });
        }

        function scrollHelper(showToolTip) {
            var $table = $("#dsTable");
            var $dsTableContainer = $('#dsTableContainer');
            var colNum = $cartArea.find(".colSelected").data("colnum");
            var $column = $table.find("th.col" + colNum);
            var position = $column.position().left;
            var columnWidth = $column.width();
            var dataWrapWidth = $dsTableContainer.width();

            $dsTableContainer.scrollLeft(position - (dataWrapWidth / 2) +
                                        (columnWidth / 2));

            if (showToolTip) {
                $column.parent().find(".header").tooltip("destroy");
                var $header = $column.children(".header");
                $header.tooltip({
                    "title"    : TooltipTStr.FocusColumn,
                    "placement": "top",
                    "trigger"  : "manual",
                    "container": "#datastore-in-view"
                });
                $header.tooltip("show");

                setTimeout(function() {
                    $header.tooltip("destroy");
                }, 1000);
            }
        }
    }

    function checkCartArgs(cart) {
        var tableName = cart.getTableName();
        var error = null;
        var $listInput = $cartList.find(".text");
        var wsId = $cartList.data("ws");
        if (!$listInput.val().trim()) {
            error = ErrTStr.NoSelect;
            StatusBox.show(error, $listInput, false, {"side": 'left'});
            return false;
        } else if (wsId !== "xc-new" && WSManager.getWSById(wsId) == null) {
            error = ErrTStr.NoWS;
            StatusBox.show(error, $listInput, false, {"side": 'left'});
            return false;
        } else if (tableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (tableName.length >=
                    XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            error = ErrTStr.TooLong;
        } else if (/^ | $|[*#'"]/.test(tableName) === true) {
            error = ErrTStr.InvalidTableName;
        } else {
            // we will only check name conflict against active and archived list
            for (var tableId in gTables) {
                var table = gTables[tableId];
                var tableType = table.getType();
                if (tableType === TableType.Active ||
                    tableType === TableType.Archived) {
                    var name = xcHelper.getTableName(table.getName());
                    if (tableName === name) {
                        error = ErrTStr.TableConflict;
                    }
                    break;
                }
            }
        }

        if (error == null) {
            return true;
        }

        var $cart = DSCart.getCartById(cart.getId());
        var $input = $cart.find(".tableNameEdit");
        scrollToTableName($input);
        StatusBox.show(error, $input, true, {"side": 'left'});

        return false;
    }

    function sendToWorksheet(cart) {
        if (cart == null || !checkCartArgs(cart)) {
            console.error("Wrong args");
            return PromiseHelper.reject("Wrong args");
        }

        var deferred = jQuery.Deferred();

        var newTableCols = [];
        var dsName = cart.getDSName();
        var srcName = cart.getTableName();
        var tableName = srcName + Authentication.getHashId();

        var worksheet = $cartList.data("ws");
        // add sql
        var sql = {
            "operation"  : SQLOps.IndexDS,
            "dsName"     : dsName,
            "dsId"       : cart.getId(),
            "tableName"  : tableName,
            "columns"    : [],
            "worksheet"  : worksheet,
            "htmlExclude": ["worksheet"]
        };

        // this should happen after sql(or the worksheet attr is wrong)
        if (worksheet === "xc-new") {
            worksheet = WSManager.addWS(null, srcName);
        }

        var items = cart.items;
        var widthOptions = {"defaultHeaderStyle": true};

        for (var i = 0, len = items.length; i < len; i++) {
            var colName = items[i].value;
            // var escapedName = xcHelper.escapeColName(colName);
            var escapedName = colName;
            var width = getTextWidth($(), colName, widthOptions);

            var progCol = ColManager.newCol({
                "backName": escapedName,
                "name"    : colName,
                "width"   : width,
                "isNewCol": false,
                "userStr" : '"' + colName + '" = pull(' + escapedName + ')',
                "func"    : {
                    "name": "pull",
                    "args": [escapedName]
                }
            });

            newTableCols.push(progCol);
            sql.columns.push(colName);
        }

        // new "DATA" column
        newTableCols.push(ColManager.newDATACol());
        sql.columns.push("DATA");

        DSCart.removeCart(cart.getId());
        DSCart.refresh();
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.CreatingTable + ': ' + tableName,
            "operation": SQLOps.IndexDS,
            "sql"      : sql,
            "steps"    : 1
        });

        XcalarIndexFromDataset(dsName, "recordNum", tableName, txId)
        .then(function() {
            var options = {"focusWorkspace": true};
            return TblManager.refreshTable([tableName], newTableCols,
                                            [], worksheet, options);
        })
        .then(function() {
            // this will be saved later
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableName),
                "title"   : TblTStr.Create
            });
            // resolve tableName for unit test
            deferred.resolve(tableName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.TableCreationFailed,
                "error"  : error,
                "noAlert": true,
                "title"  : TblTStr.Create
            });

            if (typeof error !== "object" ||
                error.status !== StatusT.StatusCanceled) {
                Alert.error(StatusMessageTStr.TableCreationFailed, error);
            }

            deferred.reject(error);
        })
        .always(removeWaitCursor);

        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSCart.__testOnly__ = {};
        DSCart.__testOnly__.filterCarts = filterCarts;
        DSCart.__testOnly__.getUnusedTableName = getUnusedTableName;
        DSCart.__testOnly__.createWorksheet = sendToWorksheet;
    }
    /* End Of Unit Test Only */

    return (DSCart);
}(jQuery, {}));
