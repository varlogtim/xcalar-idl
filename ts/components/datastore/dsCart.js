/*
 * Module for dataset cart part on the right of datastore panel
 */
window.DSCart = (function($, DSCart) {
    var $cartArea; // $("#dataCart")
    var $loadingBar; // $("#sendToWorksheetLoadBar .innerBar")
    var $cartList; // $("#dataCartWSList");

    var innerCarts = {};
    var queryQueue = [];
    var resetTimer;
    var fadeOutTimer;
    // constant
    var animationLimit = 20;
    var intervalTime = 2000;
    var checkTimeout = null;

    DSCart.setup = function() {
        $cartArea = $("#dataCart");
        $cartList = $("#dataCartWSList");
        $loadingBar = $("#sendToWorksheetLoadBar .innerBar");

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
            var worksheet = $cartList.data("ws");
            tooManyColAlertHelper(cart, worksheet)
            .then(function(ws) {
                if (ws) {
                    worksheet = ws;
                }
                DSCart.createTable(cart, worksheet);
            })
            .fail(function() {
                // do nothing
            });
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
                cart.setTableName(tableName);
                cart.setPrefix(tableName);
            },
            "focus": function() {
                $(this).select();
            },
            "input": function() {
                var $input = $(this);
                var $prefix = $input.closest(".selectedTable")
                                    .find(".prefixName");
                if ($prefix.hasClass("clean")) {
                    $prefix.val($input.val());
                }
            }
        }, ".tableNameEdit");

        $cartArea.on({
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    $(this).blur();
                }
            },
            "change": function() {
                var $input = $(this);
                var dsId = $input.closest(".selectedTable").data("dsid");
                var prefixName = $input.val().trim();
                $input.removeClass("clean");
                // update
                var cart = filterCarts(dsId);
                cart.setPrefix(prefixName);
            },
            "focus": function() {
                $(this).select();
            }
        }, ".prefixName");

        // click edit icon to edit table
        $cartArea.on("click", ".cartTitleArea .edit", function() {
            $(this).siblings("input").focus();
        });

        $cartArea.on("click", ".cartTitleArea .action .icon", function() {
            var $wrap = $(this).closest(".action");
            var $prefix = $cartArea.find(".cartTitleArea.prefix");
            if ($wrap.hasClass("active")) {
                $wrap.removeClass("active");
                $prefix.addClass("xc-hidden");
            } else {
                $wrap.addClass("active");
                $prefix.removeClass("xc-hidden");
            }
        });

        $cartArea.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        //set up dropdown for worksheet list
        new MenuHelper($cartList, {
            "onSelect": function($li) {
                var ws = $li.data("ws");
                $cartList.data("ws", ws)
                    .find(".text").val($li.text());
            },
            "container": "#dataCartContainer",
            "bounds": "#dataCartContainer"
        }).setupListeners();

        setupResizable();
    };

    DSCart.switchToCart = function(dsId) {
        $cartArea.find(".selectedTable").addClass("xc-hidden");

        if (dsId == null) {
            refreshCart();
            return;
        }

        DSCart.getCartElement(dsId).removeClass("xc-hidden");
        refreshCart(dsId);
    };

    DSCart.refresh = function() {
        var li =
                '<li class="new" data-ws="xc-new">' +
                    WSTStr.NewWS +
                '</li>' +
                WSManager.getWSLists(true);
        // auto select active worksheet
        $("#dataCartWSMenu").html(li)
                            .find("li.activeWS").trigger(fakeEvent.mouseup);
    };

    // restore the cart
    DSCart.restore = function(carts) {
        carts = carts || {};
        var isInBg = true;
        for (var dsId in carts) {
            // add cart use Array.unshift, so here should restore from end to 0
            var cart = carts[dsId];
            var resotredCart = DSCart.addCart(cart.dsId, cart.tableName, isInBg);
            appendCartItem(resotredCart, cart.items);
        }
    };

    // get information about carts
    DSCart.getCarts = function() {
        return innerCarts;
    };

    DSCart.getCartElement = function(dsId) {
        if (dsId == null) {
            return null;
        }
        return $cartArea.find('.selectedTable[data-dsid="' + dsId + '"]');
    };

    DSCart.createTable = function(cart, worksheet, noFocus) {
        if (cart == null || !checkCartArgs(cart)) {
            return PromiseHelper.reject("Wrong args");
        }

        var deferred = PromiseHelper.deferred();

        var newTableCols = [];
        var dsName = cart.getDSName();
        var srcName = cart.getTableName();
        var startTableName = srcName + Authentication.getHashId();
        var endTableName = startTableName;
        var cartId = cart.getId();
        var dsObj = DS.getDSObj(cartId);
        var numSteps = 1;

        if (worksheet === "xc-new") {
            worksheet = WSManager.addWS(null, srcName);
        }

        // add sql
        var sql = {
            "operation": SQLOps.IndexDS,
            "dsName": dsName,
            "dsId": cartId,
            "tableName": endTableName,
            "columns": [],
            "worksheet": worksheet,
            "htmlExclude": ["worksheet"]
        };

        var items = cart.items;
        var prefix = cart.getPrefix();
        if (!prefix) {
            prefix = xcHelper.normalizePrefix(srcName);
        }

        for (var i = 0, len = items.length; i < len; i++) {
            var colName = items[i].value;
            var type = items[i].type;
            var escapedName = xcHelper.escapeColName(colName);
            escapedName = xcHelper.getPrefixColName(prefix, escapedName);
            var progCol = ColManager.newPullCol(colName, escapedName, type);

            newTableCols.push(progCol);
            sql.columns.push(colName);
        }

        // new "DATA" column
        newTableCols.push(ColManager.newDATACol());
        sql.columns.push("DATA");

        DSCart.removeCart(cartId);
        DSCart.refresh();
        var txId = Transaction.start({
            "msg": StatusMessageTStr.CreatingTable + ": " + endTableName,
            "operation": SQLOps.IndexDS,
            "sql": sql,
            "steps": numSteps,
            "track": true
        });

        XcalarIndexFromDataset(dsName, gXcalarRecordNum, startTableName, prefix, txId)
        .then(function() {
            var options = {"focusWorkspace": !noFocus};
            return TblManager.refreshTable([endTableName], newTableCols,
                                            [], worksheet, txId, options);
        })
        .then(function() {
            // lock dataset
            if (!dsObj.isLocked()) {
                DS.getGrid(cartId).addClass("locked");
                dsObj.lock();
                UserSettings.logChange();
            }
            // this will be saved later
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(endTableName),
                "title": TblTStr.Create,
                "msgOptions": {
                    "indexNotification": noFocus
                }
            });
            // resolve tableName for unit test
            deferred.resolve(endTableName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.TableCreationFailed,
                "error": error,
                "noAlert": true,
                "title": TblTStr.Create
            });

            if (typeof error !== "object" ||
                error.status !== StatusT.StatusCanceled) {
                Alert.error(StatusMessageTStr.TableCreationFailed, error);
            }

            deferred.reject(error);
        });

        return deferred.promise();
    };

    DSCart.addCart = function(dsId, tableName, isInBg) {
        var cart = new Cart({
            "dsId": dsId,
            "tableName": tableName
        });
        var prefix = xcHelper.normalizePrefix(tableName);
        cart.setPrefix(prefix);

        // new cart should be prepended, sync with UI
        innerCarts[dsId] = cart;
        var cartClasss = isInBg ? "selectedTable xc-hidden" : "selectedTable";
        var cartHtml =
            '<div class="' + cartClasss + '" data-dsid="' + dsId + '">' +
                '<div class="cartTitleArea tableTitle">' +
                    '<div class="subTitle">' +
                        DSTStr.TableName +
                    '</div>' +
                    '<div class="input">' +
                        '<input class="tableNameEdit textOverflow"' +
                        ' type="text" value="' + tableName + '"' +
                        ' spellcheck="false" >' +
                        '<i class="icon edit xi-edit fa-15 xc-action"></i>' +
                        '<div class="action">' +
                            '<i class="expand icon xi-down fa-15 xc-action"' +
                            ' data-container="body" data-toggle="tooltip"' +
                            ' title="' + DSTStr.ShowAdvOpt + '"></i>' +
                            '<i class="collapse icon xi-up fa-15 xc-action"' +
                            ' data-container="body" data-toggle="tooltip"' +
                            ' title="' + DSTStr.HideAdvOpt + '"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="cartTitleArea prefix xc-hidden">' +
                    '<div class="subTitle">' +
                        DSTStr.ColPrefix +
                        '<i class="qMark icon xi-unknown"' +
                        ' data-container="body" data-toggle="tooltip"' +
                        ' title="' + TooltipTStr.ColPrefix + '"></i>' +
                    '</div>' +
                    '<div class="input">' +
                        '<input class="prefixName textOverflow clean"' +
                        ' type="text"' +
                        ' value="' + prefix + '"' +
                        ' placeholder="' + CommonTxtTstr.Optional + '"' +
                        ' spellcheck="false" >' +
                        '<i class="icon edit xi-edit fa-15 xc-action"></i>' +
                    '</div>' +
                '</div>' +
                '<div class="cartEmptyHint xc-hidden">' +
                    DSTStr.NoColumns +
                '</div>' +
                '<ul></ul>' +
            '</div>';

        var $cart = $(cartHtml);
        $cartArea.prepend($cart);

        if (!isInBg) {
            var $tableNameEdit = $cart.find(".tableNameEdit").focus();
            // this flag is used to mark if the name is update or not
            $cart.addClass("updateName");

            xcHelper.getUnusedTableName(tableName)
            .then(function(newTableName) {
                $tableNameEdit.val(newTableName);
                cart.setTableName(newTableName);
                var newPrefix = xcHelper.normalizePrefix(newTableName);
                cart.setPrefix(newPrefix);
                $cart.find(".prefixName").val(newPrefix);
            })
            .fail(function() {
                // keep the current name
            })
            .always(function() {
                $cart.removeClass("updateName");
            });
        }

        return cart;
    };

    // add column to cart
    DSCart.addItem = function(dsId, items) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return;
        }
        var cart = filterCarts(dsId);
        if (cart == null) {
            cart = DSCart.addCart(dsId, dsObj.getName());
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

        var $cart = DSCart.getCartElement(dsId);
        var $li = $cart.find("li[data-colnum=" + colNum + "]");
        removeCartItem(dsId, $li);
    };

    // remove one cart
    DSCart.removeCart = function(dsId) {
        if (dsId == null) {
            return;
        }

        var $cart = DSCart.getCartElement(dsId);
        // remove cart
        delete innerCarts[dsId];
        $cart.remove();

        if (DSTable.getId() === dsId) {
            refreshCart(dsId);
            clearHighlightCol();
        }
    };

    DSCart.clear = function() {
        clearHighlightCol();
        innerCarts = {};

        $cartArea.empty();
        $("#dataCartContainer").addClass("noCart");
    };

    DSCart.addQuery = function(mainQuery) {
        queryQueue.push(mainQuery);
        if (queryQueue.length === 1 && !$loadingBar.hasClass("inProgress") &&
            $("#dataStoresTab").hasClass("active")) {
            endBarAnimation(0);
            trackQueries();
        }
    };

    // used for turning on/off checking when switching tabs
    DSCart.checkQueries = function() {
        if (!$("#dataStoresTab").hasClass("active")) {
            clearCycle();
        } else {
            if (queryQueue.length) {
                clearTimeout(resetTimer);
                clearTimeout(fadeOutTimer);
                trackQueries();
            } else {
                endBarAnimation(0, true);
            }
        }
    };

    // handles finished and canceled queries
    DSCart.queryDone = function(id, isCancel) {
        for (var i = 0; i < queryQueue.length; i++) {
            if (queryQueue[i].getId() === id) {
                queryQueue.splice(i, 1);
                break;
            }
        }
        if (queryQueue.length === 0) {
            if (isCancel) {
                endBarAnimation(0, true);
            } else {
                finishQueryBar();
            }
        }
    };

    DSCart.resize = function() {
        var $dsTableView = $("#dsTableView");
        if ($dsTableView.is(":visible")) {
            var $leftSection = $dsTableView.find(".leftSection");
            var $rightSection = $dsTableView.find(".rightSection");
            if ($rightSection.hasClass("resizing")) {
                // resizable will trigger window resize
                return false;
            }
            // reset position
            $leftSection.css("width", "");
            $rightSection.css("left", "");
            $rightSection.css("width", "");
            return true;
        }
        return false;
    };

    function setupResizable() {
        if (window.isBrowserSafari) {
            // safari has cannot resize issue, don't know why
            return;
        }

        var $dsTableView = $("#dsTableView");
        var $leftSection = $dsTableView.find(".leftSection");
        var $rightSection = $dsTableView.find(".rightSection");
        var minWidth = $rightSection.outerWidth();
        var viewWidth;

        $rightSection.resizable({
            "handles": "w",
            "containment": "#dsTableView",
            "minWidth": minWidth,
            "start": function() {
                // viewWidth can only be measured when is visible
                // so measure it here
                viewWidth = $dsTableView.outerWidth();
                var maxWidth = viewWidth * 0.8;
                $rightSection.resizable( "option", "maxWidth", maxWidth);
                $leftSection.addClass("noAnim");
                $rightSection.addClass("noAnim resizing");
            },
            "resize": function() {
                var margin = $leftSection.outerWidth(true) -
                             $leftSection.outerWidth();
                var width = viewWidth - $rightSection.outerWidth() - margin;
                $leftSection.outerWidth(width);
            },
            "stop": function() {
                $leftSection.removeClass("noAnim");
                $rightSection.removeClass("noAnim resizing");
            }
        });
    }

    function trackQueries() {
        var startTime = Date.now();
        check()
        .then(function() {
            var elapsedTime = Date.now() - startTime;
            checkCycle(check, elapsedTime);
        });
    }

    function check() {
        if (!queryQueue.length) {
            finishQueryBar();
            return PromiseHelper.reject();
        }
        var mainQuery = queryQueue[0];
        var subQuery = mainQuery.subQueries[0];
        // if query is done, "pop" off from the beginning of the queue
        while (queryQueue.length && subQuery.state === QueryStatus.Done) {
            queryQueue.shift();
            if (queryQueue.length) {
                mainQuery = queryQueue[0];
                subQuery = mainQuery.subQueries[0];
            } else {
                finishQueryBar();
                return PromiseHelper.reject();
            }
        }

        var deferred = PromiseHelper.deferred();

        subQuery.getProgress()
        .then(function(res) {
            if (res === 100) {
                mainQuery.subQueries[0].state = QueryStatus.Done;
                queryQueue.shift();
            }
            updateQueryBar(res);
            mainQuery.setElapsedTime();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Check failed", error);
            endBarAnimation(0, true);
            deferred.reject();
        });

        return deferred.promise();
    }

    function checkCycle(fn, adjustTime) {
        clearCycle();

        var intTime = intervalTime;
        if (adjustTime) {
            intTime = Math.max(200, intervalTime - adjustTime);
        }

        checkTimeout = setTimeout(function() {
            var cachedTimeout = checkTimeout;
            var startTime = Date.now();
            fn()
            .then(function() {
                if (checkTimeout != null && checkTimeout === cachedTimeout) {
                    var elapsedTime = Date.now() - startTime;
                    checkCycle(fn, elapsedTime);
                }
            });
        }, intTime);
    }

    function clearCycle() {
        clearTimeout(checkTimeout);
        checkTimeout = null;
    }

    function endBarAnimation(time, force) {
        if (time == null) {
            time = 3000;
        }

        clearCycle();
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        if (time) {
            if (time === 3000) {
                fadeOutTimer = setTimeout(function() {
                    $loadingBar.parent().fadeOut(1000);
                }, intervalTime);
            }
            resetTimer = setTimeout(function() {
                $loadingBar.stop().removeClass("full goingToFull inProgress")
                                  .width(0);
            }, time);
        } else {
            $loadingBar.stop().removeClass("full goingToFull inProgress")
                              .width(0);
        }
        if (force) {
            $loadingBar.parent().hide();
        }
    }

    // sets progress bar to 100%
    function finishQueryBar() {
        clearCycle();
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        if ($loadingBar.hasClass("full")) {
            return;
        }
        $loadingBar.addClass("inProgress goingToFull");
        $loadingBar
        .stop()
        .animate({"width": "100%"}, intervalTime, "linear", function() {
            $loadingBar.removeClass("inProgress goingToFull");
            $loadingBar.addClass("full");
            endBarAnimation();
        });
    }

    // will not update if progress bar is already going to 100% (goingToFull)
    function updateQueryBar(pct) {
        clearTimeout(resetTimer);
        clearTimeout(fadeOutTimer);
        $loadingBar.parent().stop().fadeIn(500);
        if ($loadingBar.hasClass("goingToFull")) {
            return;
        }
        if (pct < 100 && $loadingBar.hasClass("full")) {
            endBarAnimation(0);
        } else if (pct === 100) {
            $loadingBar.addClass("goingToFull");
        }
        $loadingBar.addClass("inProgress");

        $loadingBar
        .stop()
        .animate({"width": pct + "%"}, intervalTime, "linear", function() {
            $loadingBar.removeClass("inProgress");
            if (pct === 100) {
                $loadingBar.addClass("full");
                $loadingBar.removeClass("goingToFull");

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

    function appendCartItem(cart, items) {
        var $cart = DSCart.getCartElement(cart.dsId);
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

            var escapedVal = xcHelper.escapeHTMLSpecialChar(value);
            html +=
            '<li data-colnum="' + colNum + '">' +
                '<div class="itemWrap type-' + type + '">' +
                    '<span class="iconWrap">' +
                        '<i class="center icon fa-16 xi-' + type + '"></i>' +
                    '</span>' +
                    '<span class="colName textOverflow tooltipOverflow"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-title=" ' + xcHelper.escapeDblQuoteForHTML(
                            xcHelper.escapeHTMLSpecialChar(escapedVal)) + '">' +
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

    function emptyCart(cart) {
        var $cart = DSCart.getCartElement(cart.dsId);
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
                        .removeClass("colAdded");
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
            $(".dataCartNum:not(.tutor)").text(numCol);
            DSCart.getCartElement(dsId).removeClass("xc-hidden");
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

    function scrollToInput($input) {
        var cartRect = $("#dataCartWrap")[0].getBoundingClientRect();
        var cartBottom = cartRect.bottom;
        var cartTop = cartRect.top;
        var inputTop = $input.offset().top;
        var inputHeight = $input.height();
        var hiddenDistance = (inputTop + inputHeight) - cartBottom;
        var distFromTop = inputTop - cartTop;
        var scrollTop;

        if (hiddenDistance > -10) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $("#dataCartWrap").scrollTop(scrollTop +
                                         hiddenDistance + 10);
        } else if (distFromTop < 0) {
            scrollTop = $("#dataCartWrap").scrollTop();
            $("#dataCartWrap").scrollTop(scrollTop + distFromTop - 10);
        }
    }

    function scrollToDatasetColumn($li) {
        var dsId = $li.closest(".selectedTable").data("dsid");
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

        function scrollHelper(showTooltip) {
            var $table = $("#dsTable");
            var $dsTableContainer = $("#dsTableContainer");
            var colNum = $cartArea.find(".colSelected").data("colnum");
            var $column = $table.find("th.col" + colNum);
            var position = $column.position().left;
            var columnWidth = $column.width();
            var dataWrapWidth = $dsTableContainer.width();

            $dsTableContainer.scrollLeft(position - (dataWrapWidth / 2) +
                                        (columnWidth / 2));

            if (showTooltip) {
                $column.parent().find(".header").tooltip("destroy");
                var $header = $column.children(".header");
                xcTooltip.transient($header, {
                    "title": TooltipTStr.FocusColumn,
                    "container": "#datastore-in-view"
                }, 1000);
            }
        }
    }

    function checkCartArgs(cart) {
        var $listInput = $cartList.find(".text");
        var wsId = $cartList.data("ws");

        // check specify worksheet part
        var isValid = xcHelper.validate([
            {
                "$ele": $listInput,
                "error": ErrTStr.NoSelect,
                "side": "left"
            },
            {
                "$ele": $listInput,
                "error": ErrTStr.NoWS,
                "side": "left",
                "check": function() {
                    return (wsId !== "xc-new" &&
                           WSManager.getWSById(wsId) == null);
                }
            }
        ]);

        if (!isValid) {
            return false;
        }

        // check table name
        var $cart = DSCart.getCartElement(cart.getId());
        var $tableName = $cart.find(".tableNameEdit");

        isValid = xcHelper.tableNameInputChecker($tableName, {
            "side": "left"
        });

        if (!isValid) {
            scrollToInput($tableName);
            return false;
        }

        // check prefix
        // need to show the field first then show status,
        // so xcHelper.validate not working
        var $prefix = $cart.find(".prefixName");
        var prefix = cart.getPrefix();
        var error = xcHelper.validatePrefixName(prefix);
        if (error != null) {
            // open prefix field if not show
            var $action = $tableName.siblings(".action");
            if (!$action.hasClass("active")) {
                $action.find(".expand").click();
            }

            scrollToInput($prefix);
            StatusBox.show(error, $prefix, false, {"side": "left"});
            return false;
        }

        return true;
    }

    function tooManyColAlertHelper(cart, worksheet) {
        if (cart == null || !checkCartArgs(cart)) {
            return PromiseHelper.reject("Wrong args");
        }
        var tooManyWSCols = false;
        if (cart.items.length < gMaxColToPull) {
            if (worksheet === "xc-new") {
                return PromiseHelper.resolve();
            }
            // checks if current ws will have too many columns
            var wsCols = WSManager.getNumCols(worksheet);
            if (cart.items.length + wsCols > gMaxColToPull) {
                tooManyWSCols = true;
            } else {
                return PromiseHelper.resolve();
            }
        }

        var deferred = PromiseHelper.deferred();
        var $btn = $("#dataCart-submit");
        xcHelper.disableSubmit($btn);

        if (tooManyWSCols) {
            Alert.show({
                "title": DSFormTStr.CreateWarn,
                "msg": DSFormTStr.WSColsMsg,
                "onCancel": function() {
                    xcHelper.enableSubmit($btn);
                    deferred.reject();
                },
                "buttons": [
                    {
                        "name": CommonTxtTstr.Ignore.toUpperCase(),
                        "func": function() {
                            xcHelper.enableSubmit($btn);
                            deferred.resolve();
                        }
                    },
                    {
                        "name": WSTStr.NewWS.toUpperCase(),
                        "func": function() {
                            xcHelper.enableSubmit($btn);
                            deferred.resolve("xc-new");
                        },
                        "className": "larger"
                    }
                ]
            });
        } else {
            Alert.show({
                "title": DSFormTStr.CreateWarn,
                "msg": DSFormTStr.CreateWarnMsg,
                "onConfirm": function() {
                    xcHelper.enableSubmit($btn);
                    deferred.resolve();
                },
                "onCancel": function() {
                    xcHelper.enableSubmit($btn);
                    deferred.reject();
                }
            });
        }

        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSCart.__testOnly__ = {};
        DSCart.__testOnly__.filterCarts = filterCarts;
        DSCart.__testOnly__.checkCartArgs = checkCartArgs;
        DSCart.__testOnly__.tooManyColAlertHelper = tooManyColAlertHelper;
    }
    /* End Of Unit Test Only */

    return (DSCart);
}(jQuery, {}));
