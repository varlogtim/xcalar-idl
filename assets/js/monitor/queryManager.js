window.QueryManager = (function(QueryManager, $) {
    var $queryList;   // $("#monitor-queryList")
    var $queryDetail; // $("#monitor-queryDetail")
    var queryLists = {}; // will be populated by xcQuery objs with transaction id as key
    var queryCheckLists = {}; // setInterval timers
    var canceledQueries = {}; // for canceled queries that have been deleted
                              // but the operation has not returned yet

    // constant
    var checkInterval = 2000; // check query every 2s

    QueryManager.setup = function() {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");

        addEventHandlers();
    };

    // if numSteps is unknown, should take in -1
    // query is only passed in if this is an actual xcalarQuery (not xcFunction)
    QueryManager.addQuery = function(id, name, options) {
        options = options || {};
        var time = new Date().getTime();
        var fullName = name + "-" + time;
        var type;
        var subQueries;
        var numSteps = options.numSteps || -1;

        if (options.query) {
            type = "xcQuery";
            subQueries = xcHelper.parseQuery(options.query);
            numSteps = subQueries.length;
        } else {
            type = "xcFunction";
        }

        var mainQuery = new XcQuery({
            "name": name,
            "fullName": fullName,
            "time": time,
            "type": type,
            "id": id,
            "numSteps": numSteps,
            "cancelable": options.cancelable
        });

        queryLists[id] = mainQuery;
        var $query = $(getQueryHTML(mainQuery));
        $queryList.find(".hint").addClass("xc-hidden");
        $queryList.append($query);

        focusOnQuery($query);

        updateStatusDetail({
            "start": getQueryTime(time),
            "op": name,
            "startTime": CommonTxtTstr.NA,
            "elapsed": CommonTxtTstr.NA,
        }, id, QueryStatus.Run, true);
    
        if (type === "xcQuery") {
            runXcQuery(id, mainQuery, subQueries);
        } else {
            updateQueryTextDisplay("");
        }
    };

    // queryName will be empty if subquery doesn't belong to a xcalarQuery
    // options = {exportFileName: string}
    QueryManager.addSubQuery = function(id, name, dstTable, query, queryName,
                                       options) {
        if (!queryLists[id] || Transaction.checkCanceled(id)) {
            // console.log("QueryHasBeenCancelled");
            return;
        }
        var mainQuery = queryLists[id];
        var time = new Date().getTime();
        options = options || {};
        var subQuery = new XcSubQuery({
            "name": name,
            "time": time,
            "query": query,
            "dstTable": dstTable,
            "id": id,
            "index": mainQuery.subQueries.length,
            "queryName": queryName,
            "exportFileName": options.exportFileName
        });
        mainQuery.addSubQuery(subQuery);
        if (mainQuery.currStep === mainQuery.subQueries.length - 1) {
            if (queryName) {
                outerQueryCheck(id);
            } else {
                subQueryCheck(subQuery);
            }
        }
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if ($query.hasClass('active')) {
            updateQueryTextDisplay(mainQuery.getQuery());
        }
    };

    QueryManager.scrollToFocused = function() {
        var $activeLi = $queryList.find('.active');
        if ($activeLi.length && $('#monitorMenu').hasClass('active') &&
            !$('#monitorMenu').find('.menuSection.query')
            .hasClass('xc-hidden')) {
            var listHeight = $queryList.height();
            var liHeight = $activeLi.height();
            var position = $activeLi.position();
            if (position.top < 0 || position.top + liHeight > listHeight) {
                var scrollTop = $queryList.scrollTop();
                $queryList.scrollTop(scrollTop + position.top);
            }
        }
    };

    QueryManager.queryDone = function(id, sqlNum) {
        if (!queryLists[id]) {
            return;
        }

        var mainQuery = queryLists[id];
        mainQuery.state = QueryStatus.Done;
        if (mainQuery.name === SQLOps.ExportTable) {
            mainQuery.outputTableState = "exported";
        } else if (mainQuery.name === SQLOps.Aggr) {
            mainQuery.outputTableState = "unavailable";
        } else {
            mainQuery.outputTableState = "active";
        }

        if (sqlNum != null) {
            mainQuery.sqlNum = sqlNum;
        }

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateQueryBar(id, 100);
        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": getElapsedTimeStr(mainQuery.getElapsedTime()),
            "remaining": CommonTxtTstr.NA,
            "total": getElapsedTimeStr(mainQuery.getElapsedTime())
        }, id);
        updateOutputSection(id);
    };

    QueryManager.subQueryDone = function(id, dstTable) {
        if (!queryLists[id]) {
            return;
        }
        var mainQuery = queryLists[id];
        if (mainQuery.subQueries[0].getName() === "index from DS") {
            DSCart.queryDone(mainQuery.getId());
            return;
        }

        if (mainQuery.type === "xcFunction") {
            for (var i = 0; i < mainQuery.subQueries.length; i++) {
                var subQuery = mainQuery.subQueries[i];
                if (subQuery.dstTable === dstTable) {
                    subQuery.state = QueryStatus.Done;
                    if (mainQuery.currStep === i) {
                        incrementStep(mainQuery);
                        subQuery = mainQuery.subQueries[mainQuery.currStep];
                        clearIntervalHelper(id);
                        if (mainQuery.currStep === mainQuery.numSteps) {
                            // query is done
                        } else {
                            while (subQuery && subQuery.state === QueryStatus.Done) {
                                incrementStep(mainQuery);
                                subQuery = mainQuery.subQueries[mainQuery.currStep];
                            }
                            if (mainQuery.currStep === mainQuery.numSteps) {
                                // query is done
                            } else if (subQuery) {
                                if (subQuery.queryName) {
                                    outerQueryCheck(id);
                                } else {
                                    subQueryCheck(subQuery);
                                }
                            }
                        }
                    }
                    break;
                }
            }
        } else {
            // subQueryDone isn't called when an actual query part is finished
        }
    };

    QueryManager.removeQuery = function(id, userTriggered) {
        if (!queryLists[id]) {
            return;
        }
        if (userTriggered) {
            // do not allow user to click on trash if not started or processing
            var state = queryLists[id].state;
            if (state === QueryStateT.qrNotStarted ||
                state === QueryStateT.qrProcessing) {
                return;
            }
        }
        clearIntervalHelper(id);
        // we may not want to immediately delete canceled queries because
        // we may be waiting for the operation to return and clean up some
        // intermediate tables
        if (queryLists[id].state === QueryStatus.Cancel) {
            canceledQueries[id] = queryLists[id];
        }
        delete queryLists[id];
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if ($query.hasClass('active')) {
            updateQueryTextDisplay("", true);
            updateStatusDetail({
                "start": CommonTxtTstr.NA,
                "elapsed": CommonTxtTstr.NA,
                "remaining": CommonTxtTstr.NA,
                "total": CommonTxtTstr.NA,
            }, id, QueryStatus.RM);
            updateOutputSection(id, true);
        }
        $query.remove();
        $('.tooltip').hide();
    };

    QueryManager.cancelQuery = function(id) {
        var deferred = jQuery.Deferred();
        var mainQuery = queryLists[id];
        if (mainQuery == null) {
            // error case
            console.warn('invalid query');
            deferred.reject('invalid query');
            return deferred.promise();
        } else if (mainQuery.state === QueryStatus.Done) {
            console.warn('operation is done, cannot cancel');
            deferred.reject('operation is done, cannot cancel');
            return deferred.promise();
        }

        var $query = $queryList.find('.query[data-id="' + id + '"]');
        $query.find('.cancelIcon').addClass('disabled');

        if (!Transaction.isCancelable(id)) {
            deferred.reject('building new table, cannot cancel');
            return deferred.promise();
        }

        Transaction.cancel(id);
        unlockSrcTables(mainQuery);

        // unfinished tables will be dropped when Transaction.fail is reached
        var onlyFinishedTables = true;
        dropCanceledTables(mainQuery, onlyFinishedTables);
        tableListCanceled(mainQuery);

        var currStep = mainQuery.currStep;

        if (!mainQuery.subQueries[currStep]) {
            console.warn('step vs query mismatch');
            deferred.reject('step vs query mismatch');
            return deferred.promise();
        }

        var statusesToIgnore = [StatusT.StatusOperationHasFinished];

        // this is a xcalar query
        if (mainQuery.subQueries[currStep].queryName) {
            // Query Cancel returns success even if the operation is
            // complete, unlike cancelOp. Xc4921
            XcalarQueryCancel(mainQuery.subQueries[currStep].queryName, [])
            .then(function(ret) {
                console.info('query cancel submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp

        } else { // xcFunction
            XcalarCancelOp(mainQuery.subQueries[currStep].dstTable,
                           statusesToIgnore)
            .then(function(ret) {
                console.info('cancel submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp
        }
        return deferred.promise();
    };

    QueryManager.cancelDS = function(id) {
        var mainQuery = queryLists[id];
        var subQuery = mainQuery.subQueries[0];
        if (!subQuery) {
            // Load hasn't been triggered yet so no DS to cancel (rare)
            return;
        }
        var dstTable = subQuery.dstTable.split(".").pop();
        var $grid = DS.getGridByName(dstTable);
        DS.cancel($grid);
        // DS.cancel preps the DsObj and icon and
        // eventually calls QueryManager.cancelQuery
    };

    // this gets called after cancel is successful. It cleans up and updates
    // the query state and views
    QueryManager.confirmCanceledQuery = function(id) {
        if (!queryLists[id]) {
            return;
        }
        clearIntervalHelper(id);

        var mainQuery = queryLists[id];
        mainQuery.state = QueryStatus.Cancel;
        mainQuery.outputTableState = "deleted";
        mainQuery.setElapsedTime();
        updateQueryBar(id, null, false, true, true);
        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": getElapsedTimeStr(mainQuery.getElapsedTime(), true),
            "remaining": CommonTxtTstr.NA,
            "total": getElapsedTimeStr(mainQuery.getElapsedTime())
        }, id);
        updateOutputSection(id, true);
        var $query = $('.query[data-id="' + id + '"]');
        $query.addClass('canceled').find('.querySteps')
                                   .text(QueryStatus.Cancel);
        if ($query.hasClass('active')) {
            updateHeadingSection(mainQuery);
        }
        if (mainQuery.subQueries[0] &&
            mainQuery.subQueries[0].getName() === "index from DS")
        {
            var isCanceled = true;
            DSCart.queryDone(mainQuery.getId(), isCanceled);
            return;
        }
    };

    QueryManager.cleanUpCanceledTables = function(id) {
        if (!queryLists[id] && !canceledQueries[id]) {
            return;
        }
        var mainQuery;
        if (queryLists[id]) {
            mainQuery = queryLists[id];
        } else {
            mainQuery = canceledQueries[id];
        }
        var onlyFinishedTables = false;
        dropCanceledTables(mainQuery, onlyFinishedTables);
        clearTableListCanceled(mainQuery);
        delete canceledQueries[id];
    };

    QueryManager.fail = function(id) {
        QueryManager.removeQuery(id);
    };

    QueryManager.check = function(forceStop, doNotAnimate) {
        if (forceStop || !$("#monitor-queries").hasClass("active") ||
            !$('#monitorTab').hasClass('active')) {
            for (var id in queryCheckLists) {
                clearIntervalHelper(id);
            }
        } else {
            // check queries
            for (var xcQuery in queryLists) {
                var query = queryLists[xcQuery];
                if (query.type === "restored") {
                    continue;
                }
                if (query.state !== QueryStatus.Done &&
                    query.state !== QueryStatus.Cancel) {
                    if (query.type === "xcFunction") {
                        for (var i = 0; i < query.subQueries.length; i++) {
                            if (query.subQueries[i].state !== QueryStatus.Done) {
                                if (query.subQueries[i].queryName) {
                                    outerQueryCheck(query.getId(), doNotAnimate);
                                } else {
                                    subQueryCheck(query.subQueries[i],
                                                  doNotAnimate);
                                }
                                break;
                            }
                        }
                    } else {
                        mainQueryCheck(query.getId(), doNotAnimate);
                    }
                }
            }
        }
    };

    // XX used for testing;
    QueryManager.getAll = function() {
        return ({
            "queryLists": queryLists,
            "queryCheckLists": queryCheckLists
        });
    };

    QueryManager.getCache = function() {
        return getAbbrQueries();
    };

    QueryManager.restore = function(queries) {
        if (!queries) {
            return;
        }

        var logs = SQL.getLogs();
        var sqlLog;
        var query;
        var numQueries = queries.length;
        var html = "";
        var name;
        var fullName;
        var cli;
        for (var i = 0; i < numQueries; i++) {
            sqlLog = logs[queries[i].sqlNum];
            if (sqlLog) {
                name = sqlLog.options.operation;
                cli = sqlLog.cli;
            } else {
                name = queries[i].name;
                cli = queries[i].queryStr;
            }
            fullName = name;
            query = new XcQuery({
                "name": name,
                "fullName": fullName,
                "time": queries[i].time,
                "id": i - numQueries,
                "numSteps": 1,
                "queryStr": cli,
                "sqlNum": queries[i].sqlNum,
                "elapsedTime": queries[i].elapsedTime,
                "outputTableName": queries[i].outputTableName,
                "outputTableState": queries[i].outputTableState,
                "state": queries[i].state,
                "type": "restored"
            });
            queryLists[i - numQueries] = query;
            html += getQueryHTML(query, true);
        }

        if (html) {
            $queryList.find('.hint').addClass('xc-hidden')
                       .end().append(html);
        }
    };

    function runXcQuery(id, mainQuery, subQueries) {
        for (var i = 0; i < subQueries.length; i++) {
            var time = new Date().getTime();
            var subQuery = new XcSubQuery({
                "name": subQueries[i].name,
                "time": time,
                "query": subQueries[i].query,
                "dstTable": subQueries[i].dstTable,
                "id": id,
                "index": mainQuery.subQueries.length
            });
            mainQuery.addSubQuery(subQuery);
            updateQueryTextDisplay(mainQuery.getQuery());
        }
        mainQuery.run()
        .then(function() {
            mainQueryCheck(id);
        })
        .fail(function(error) {
            Alert.error(ErrTStr.InvalidQuery, error);
            QueryManager.fail(id);
        });
    }

    // used for xcalarQuery
    function mainQueryCheck(id, doNotAnimate) {
        var mainQuery = queryLists[id];
        clearIntervalHelper(id);
        queryCheckLists[id] = setInterval(check, checkInterval);
        check();
        
        function check() {
            mainQuery.check()
            .then(function(res) {
                if (!queryLists[id]) {
                    return;
                }
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    clearIntervalHelper(id);
                    //xx unable to match up with sql id number
                    QueryManager.queryDone(id);
                    return;
                }

                var step = res.numCompletedWorkItem;
                mainQuery.currStep = step;
                if (state === QueryStateT.qrError) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, true, false, doNotAnimate);
                } if (state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, false, true, doNotAnimate);
                } else {
                    subQueryCheckHelper(mainQuery.subQueries[step], id, step);
                }
            })
            .fail(function(error) {
                console.error("Check failed", error);
                updateQueryBar(id, null, error, false, doNotAnimate);
                clearIntervalHelper(id);
            });
        }
    }

    // get the first subquery index of a group of subqueries inside of a mainquery
    function getFirstQueryPos(mainQuery) {
        var currStep = mainQuery.currStep;
        var subQueries = mainQuery.subQueries;
        var queryName = subQueries[currStep].queryName;
        var firstQueryPos = currStep;
        for (var i = mainQuery.currStep; i >= 0; i--) {
            if (subQueries[i].queryName !== queryName) {
                firstQueryPos = i + 1;
                break;
            }
        }
        return (firstQueryPos);
    }

    // used for xcalarQuery subqueries since QueryManager.subQueryDone does not
    // get called
    function setQueriesDone(mainQuery, start, end) {
        var subQueries = mainQuery.subQueries;
        for (var i = start; i < end; i++) {
            subQueries[i].state = QueryStatus.Done;
        }
    }

    // checks a group of subqueries by checking the single query name they're
    // associated with
    function outerQueryCheck(id, doNotAnimate) {
        if (!queryLists[id]) {
            console.error("error case");
            return;
        } else if (!$("#monitor-queries").hasClass("active") ||
                    !$('#monitorTab').hasClass('active')) {
            return;
        }

        var mainQuery = queryLists[id];
        var firstQueryPos = getFirstQueryPos(mainQuery);
        clearIntervalHelper(id);
        queryCheckLists[id] = setInterval(check, checkInterval);
        check();

        function check() {
            var queryName = mainQuery.subQueries[mainQuery.currStep].queryName;
            XcalarQueryState(queryName)
            .then(function(res) {
                var numCompleted = res.numCompletedWorkItem;
                var currStep = numCompleted + firstQueryPos;
                mainQuery.currStep = currStep;
                setQueriesDone(mainQuery, firstQueryPos, currStep);
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    mainQuery.currStep++;
                    clearIntervalHelper(id);
                    if (mainQuery.subQueries[mainQuery.currStep]) {
                        if (mainQuery.subQueries[mainQuery.currStep].queryName) {
                            outerQueryCheck(id, doNotAnimate);
                        } else {
                            subQueryCheck(mainQuery.subQueries[mainQuery.currStep],
                                          doNotAnimate);
                        }
                    }
                    return;
                } else if (state === QueryStateT.qrError ||
                           state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, true, false, doNotAnimate);
                } else {
                    subQueryCheckHelper(mainQuery.subQueries[currStep], id,
                                        currStep, doNotAnimate);
                    // only stop animation the first time, do not persist it
                    doNotAnimate = false;
                }
            })
            .fail(function(error) {
                console.error("Check failed", error, queryName);
                updateQueryBar(id, null, error, false, doNotAnimate);
                clearIntervalHelper(id);
            });
        }
    }

    function incrementStep(mainQuery) {
        mainQuery.currStep++;

        var queryText = mainQuery.getQuery();
        var id = mainQuery.getId();
        updateQueryTextDisplay(queryText);

        if (mainQuery.numSteps !== -1 &&
            mainQuery.currStep >= mainQuery.numSteps) {
            // show finished state for the entire query
            updateQueryBar(id, 100);
        }
    }

    function focusOnQuery($target) {
        if ($target.hasClass("active")) {
            return;
        }

        var queryId = parseInt($target.data("id"));
        $target.siblings(".active").removeClass("active");
        $target.addClass("active");

        // update right section
        var mainQuery = queryLists[queryId];
        var query = (mainQuery == null) ? "" : mainQuery.getQuery();
        var startTime;

        if (mainQuery == null) {
            console.error("cannot find query", queryId);
            query = "";
            startTime = CommonTxtTstr.NA;
        } else {
            query = mainQuery.getQuery();
            startTime = getQueryTime(mainQuery.getTime());
        }

        var totalTime = CommonTxtTstr.NA;
        var elapsedTime;
        if (mainQuery.getState() === QueryStatus.Done) {
            totalTime = getElapsedTimeStr(mainQuery.getElapsedTime());
            elapsedTime = totalTime;
        } else {
            if (mainQuery !== null) {
                mainQuery.setElapsedTime();
            }
            elapsedTime = getElapsedTimeStr(mainQuery.getElapsedTime(), true);
        }
        updateHeadingSection(mainQuery);
        updateStatusDetail({
            "start": startTime,
            "elapsed": elapsedTime,
            "remaining": CommonTxtTstr.NA,
            "total": totalTime
        }, queryId);
        updateQueryTextDisplay(query);
        updateOutputSection(queryId);
    }

    function updateHeadingSection(mainQuery) {
        var state = mainQuery.getState();
        var id = mainQuery.id;
        var $text = $queryDetail.find(".op .text");
        $text.text(mainQuery.name);

        if (state === QueryStateT.qrNotStarted ||
            state === QueryStateT.qrProcessing) {
            state = QueryStatus.Run;
        } else if (state === QueryStateT.qrFinished ||
                   state === QueryStatus.Done) {
            state = QueryStatus.Done;
        } else if (state === QueryStateT.qrCancelled ||
                   state === QueryStatus.Cancel) {
            state = QueryStatus.Cancel;
        } else if (state === QueryStateT.qrError) {
            state = QueryStatus.Error;
        }

        $queryDetail.find(".querySection")
                    .removeClass(QueryStatus.Run)
                    .removeClass(QueryStatus.Done)
                    .removeClass(QueryStatus.Error)
                    .removeClass(QueryStatus.Cancel)
                    .removeClass(QueryStatus.RM)
                    .addClass(state);
        if (state === QueryStatus.Run) {
            QueryManager.check(false, true);
            // we need to update the extraProgressBar even if we don't
            // have status data otherwise we'll have the progressBar of the
            // previous query
            var $progressBar = $queryList.find('.query[data-id="' + id + '"]')
                                         .find(".progressBar");
            var prevProgress = 100 * $progressBar.width() /
                                             $progressBar.parent().width();
            prevProgress = prevProgress || 0; // in case of 0/0 NaN;
            updateQueryBar(id, prevProgress, false, false, true);
        } else if (state === QueryStatus.Done) {
            updateQueryBar(id, 100, false, false, true);
        } else if (state === QueryStatus.Cancel) {
            updateQueryBar(id, null, false, true, true);
        }
    }

    function updateQueryTextDisplay(query, blank) {
        var queryString = "";
        if (query && query.trim().indexOf('export') !== 0) {
            // export has semicolons between colnames and breaks most rules
            // xx if semi-colon is in quotes split won't work properly
            var querySplit = query.split(";");
            for (var i = 0; i < querySplit.length; i++) {
                var subQuery = querySplit[i];
                if (subQuery.trim() !== "") {
                    queryString += '<div class="queryRow">' + subQuery +
                                   ';</div>';
                }
            }
        } else {
            queryString = '<div class="queryRow">' + query + '</div>';
        }
        if (query || blank) {
            $queryDetail.find(".operationSection .content").html(queryString);
        }
    }

    // updates the status text in the main card
    function updateStatusDetail(info, id, status, reset) {
        if (id != null) {
            // do not update detail if not focused on this query bar
            if (!$queryList.find('.query[data-id="' + id + '"]').hasClass('active')) {
                return;
            }
        }

        var $statusDetail = $queryDetail.find(".statusSection");
        var $query = $queryDetail.find(".querySection");
        for (var i in info) {
            if (i === "op") {
                $query.find(".op .text").text(info[i]);
            } else {
                $statusDetail.find("." + i).find(".text").text(info[i]);
            }
        }

        $query.removeClass("xc-hidden");
        if (status != null) {
            if (status === QueryStatus.RM) {
                $query.addClass("xc-hidden");
            } else {
                $query.removeClass(QueryStatus.Run)
                        .removeClass(QueryStatus.Done)
                        .removeClass(QueryStatus.Error)
                        .removeClass(QueryStatus.Cancel)
                        .addClass(status);
            }
        }

        if (reset) {
            $query.find(".progressBar").width(0);
        }
    }

    // enables or disbles the view output button
    function updateOutputSection(id, forceInactive) {
        if (forceInactive) {
            $("#monitor-inspect").addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                         .text(CommonTxtTstr.NA);
            return;
        }
        // do not update detail if not focused on this query bar
        if (!$queryList.find('.query[data-id="' + id + '"]').hasClass('active')) {
            return;
        }
        var mainQuery = queryLists[id];
        var queryState = mainQuery.getState();
        var dstTableState = mainQuery.getOutputTableState();
        if (queryState === QueryStatus.Done && mainQuery.getOutputTableName()) {
            var dstTableName = mainQuery.getOutputTableName();

            if (dstTableState === "active" || dstTableState === "exported" ||
             dstTableState === TableType.Undone) {
                if (dstTableState === "exported") {
                    $("#monitor-inspect").addClass('btn-disabled');
                } else { // either active or undone
                    if (checkIfTableIsUndone(dstTableName)) {
                        mainQuery.outputTableState = TableType.Undone;
                        $("#monitor-inspect").addClass('btn-disabled');
                    } else {
                        mainQuery.outputTableState = "active";
                        $("#monitor-inspect").removeClass('btn-disabled');
                    }
                }
            } else {
                $("#monitor-inspect").addClass('btn-disabled');
            }

            if (dstTableName.indexOf(gDSPrefix) < 0) {
                $queryDetail.find('.outputSection').find('.text')
                                               .text(dstTableName);
            } else {
                $queryDetail.find('.outputSection').find('.text')
                            .text(dstTableName.slice(gDSPrefix.length));
            }

        } else {
            $("#monitor-inspect").addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                         .text(CommonTxtTstr.NA);
        }
    }

    function checkIfTableIsUndone(tableName) {
        if (tableName.startsWith(gDSPrefix)) {
            return false;
        }

        var tableId = xcHelper.getTableId(tableName);
        if (gTables[tableId]) {
            return gTables[tableId].getType() === TableType.Undone;
        } else {
            return false;
        }
    }

    function subQueryCheck(subQuery, doNotAnimate) {
        var id = subQuery.getId();
        if (!queryLists[id]) {
            console.error("error case");
            return;
        } else if (!$("#monitor-queries").hasClass("active") ||
                    !$('#monitorTab').hasClass('active')) {
            // don't show if not on panel
            if (subQuery.getName() === "index from DS") {
                DSCart.addQuery(queryLists[id]);
            }
            return;
        }
        // only stop animation the first time, do not persist it
        doNotAnimate = false;
        clearIntervalHelper(id);
        queryCheckLists[id] = setInterval(checkFunc, checkInterval);
        checkFunc();

        function checkFunc() {
            subQueryCheckHelper(subQuery, id, subQuery.index, doNotAnimate);
        }
    }

    function subQueryCheckHelper(subQuery, id, step, doNotAnimate) {
        if (subQuery.state === QueryStatus.Done) {
            return;
        }
        subQuery.check()
        .then(function(res) {
            if (!queryLists[id]) {
                return;
            }
            var mainQuery = queryLists[id];
            var currStep = mainQuery.currStep;
            // check for edge case where percentage is old
            // and mainQuery already incremented to the next step
            if (currStep !== step) {
                var numSteps = mainQuery.numSteps;
                var $query = $queryList.find('.query[data-id="' + id + '"]');
                if (numSteps === -1) {
                    $query.find('.querySteps').text('step ' + (currStep + 1));
                } else if (currStep < numSteps) {
                    $query.find('.querySteps').text('step ' + (currStep + 1) +
                                                    ' of ' + numSteps);
                }
                return;
            } else {
                updateQueryBar(id, res, false, false, doNotAnimate);
                mainQuery.setElapsedTime();
                updateStatusDetail({
                    "start": getQueryTime(mainQuery.getTime()),
                    "elapsed": getElapsedTimeStr(mainQuery.getElapsedTime(), true),
                    "remaining": CommonTxtTstr.NA,
                    "total": CommonTxtTstr.NA
                }, id);
            }
        })
        .fail(function(error) {
            console.error("Check failed", error);
            updateQueryBar(id, null, error);
            clearIntervalHelper(id);
        });
    }

    function updateQueryBar(id, progress, isError, isCanceled, doNotAnimate) {
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if (progress == null && !isCanceled) {
            if (isError) {
                $query.removeClass("processing").addClass("error");
            }
            return;
        }
        var mainQuery = queryLists[id];
        var currStep = mainQuery.currStep;
        var numSteps = mainQuery.numSteps;

        var $progressBar = $query.find(".progressBar");
        var $extraProgressBar = null;
        var $extraStepText = null;
        if ($query.hasClass("active")) {
            $extraProgressBar = $queryDetail.find(".progressBar");
            $extraStepText = $queryDetail.find(".querySteps");
            if (mainQuery.cancelable) {
                $queryDetail.find('.cancelIcon').removeClass('xc-disabled');
            } else {
                $queryDetail.find('.cancelIcon').addClass('xc-disabled');
            }
        }

        var newClass = null;
        progress = Math.max(progress, 0);
        progress = Math.min(progress, 100);
        if (progress >= 100 && ((numSteps > 0 && currStep >= numSteps) ||
            (mainQuery.state === QueryStatus.Done))) {
            progress = "100%";
            newClass = "done";
            $query.find('.cancelIcon').addClass('disabled');

        } else if (isError) {
            progress = progress + "%";
            newClass = QueryStatus.Error;
        } else if (isCanceled) {
            progress = "0%";
            newClass = QueryStatus.Cancel;
        } else {
            progress = progress + "%";
        }

        // set width to 0 if new step is started unless it's past the last step
        if (parseInt($progressBar.data('step')) !== currStep &&
            currStep !== numSteps) {
            $progressBar.stop().width(0).data('step', currStep);
            if ($extraProgressBar != null) {
                $extraProgressBar.stop().width(0);
            }
        }

        function progressBarContinuation() {
            if (newClass != null) {
                $query.removeClass("processing").addClass(newClass);
                if (newClass === "done") {
                    $query.find('.querySteps').text('completed');
                    clearIntervalHelper(id);
                }
            }
        }

        function extraProgressBarContinuation() {
            if (newClass != null && $query.hasClass("active")) {
                $queryDetail.find(".query").removeClass("processing")
                            .addClass(newClass);
            }
        }

        // .stop() stops any previous animation;
        if (isCanceled) {
            $progressBar.stop().width(progress);
        } else {
            $progressBar.stop().animate({"width": progress}, checkInterval,
                                        "linear", progressBarContinuation);
        }
        if (doNotAnimate) {
            progressBarContinuation();
        }

        if ($extraProgressBar != null) {
            if (doNotAnimate) {
                if (isCanceled) {
                    $extraProgressBar.stop().width(progress);
                } else {
                    var prevProgress = 100 * $progressBar.width() /
                                             $progressBar.parent().width();
                    prevProgress = prevProgress || 0; // in case of NaN 0/0
                    // set extraProgressBar's to match progressBar's width
                    // and then animate extraProgressBar to it's actual pct
                    $extraProgressBar.stop().width(prevProgress + '%')
                                      .animate({"width": progress},
                                            checkInterval, "linear",
                                            progressBarContinuation);
                }
            } else {
                $extraProgressBar.stop().animate({"width": progress},
                                                 checkInterval,
                                                 "linear",
                                                 extraProgressBarContinuation);
            }
            extraProgressBarContinuation();
        }

        updateQueryStepsDisplay(mainQuery, $query, newClass, $extraStepText);
    }

    function updateQueryStepsDisplay(mainQuery, $query, newClass,
                                    $extraStepText) {
        var displayedStep;
        var stepText;
        // if query stopped in some way or another
        if (newClass !== null) {
            if (newClass === "done") {
                $query.find('.querySteps').text('completed');
            }
        } else if (mainQuery.currStep <= mainQuery.numSteps) {
            // in progress and if total number of steps IS known
            displayedStep = Math.min(mainQuery.currStep + 1,
                                     mainQuery.numSteps);
            stepText = 'step ' + displayedStep + ' of ' +
                                            mainQuery.numSteps;
        } else if (mainQuery.numSteps === -1) {
            // in progress and if total number of steps is NOT known
            displayedStep = Math.min(mainQuery.currStep + 1,
                                     mainQuery.subQueries.length);
            if (displayedStep > 0) {
                stepText = 'step ' + displayedStep;
            }
        }
        if (stepText) {
            $query.find('.querySteps').text(stepText);
            if ($extraStepText) {
                $extraStepText.text(stepText);
            }
        } else if ($extraStepText) {
            $extraStepText.text("");
        }
    }

    function getQueryTime(time) {
        return xcHelper.getTime(null, time) + " " +
               xcHelper.getDate(null, null, time);
    }

    // milliSeconds - integer
    // round - boolean, if true will round to nearest second
    function getElapsedTimeStr(milliSeconds, round) {
        var s = Math.floor(milliSeconds / 1000);
        var seconds = Math.floor(s) % 60;
        var minutes = Math.floor((s % 3600) / 60);
        var hours = Math.floor(s / 3600);
        var timeString = '';
        if (hours > 0) {
            timeString += hours + "h ";
        }
        if (minutes > 0) {
            timeString += minutes + "m ";
        }

        if (milliSeconds < 1000) {
            timeString += milliSeconds + "ms";
        } else {
            timeString += seconds;
            if (milliSeconds < 60000 && !round) {// between 1 and 60 seconds
                var mills = milliSeconds % (seconds * 1000);

                if (milliSeconds < 10000) {
                    timeString += "." + Math.floor(mills / 10);
                    // timeString += "." + (milliSeconds % 100);
                } else {
                    timeString += "." + Math.floor(mills / 100);
                }
            }
            timeString += "s";
        }


        return (timeString);
    }

    function addEventHandlers() {
        $("#monitorMenu-query").on("click", ".filterSection .xc-action", function() {
            filterQuery($(this));
        });

        $queryList.on("click", ".query", function(event) {
            var $clickTarget = $(event.target);
            var id = $clickTarget.closest('.query').data('id');

            if ($clickTarget.hasClass('deleteIcon')) {
                QueryManager.removeQuery(id, true);
            } else if ($clickTarget.hasClass('cancelIcon')) {
                var mainQuery = queryLists[id];
                // special handling for canceling pointToDS
                if (mainQuery && mainQuery.name === SQLOps.DSPoint) {
                    QueryManager.cancelDS(id);
                } else {
                    QueryManager.cancelQuery(id);
                }
            } else {
                focusOnQuery($(this));
            }
        });

        $queryDetail.on("click", ".cancelIcon", function() {
            $queryList.find(".query.active .cancelIcon").click();
        });

        $queryDetail.on("click", ".deleteIcon", function() {
            $queryList.find(".query.active .deleteIcon").click();
        });

        $("#monitor-inspect").on('click', function() {
            focusOnOutput();
        });

        function focusOnOutput() {
            var queryId = parseInt($queryList.find('.query.active').data('id'));
            var mainQuery = queryLists[queryId];
            var tableName = mainQuery.getOutputTableName();

            if (!tableName) {
                var type;
                if (mainQuery.getName() === SQLOps.DSPoint) {
                    type = "dataset";
                } else {
                    type = "table";
                }
                focusOutputErrorHandler(type, mainQuery);
                return;
            }

            if (tableName.indexOf(gDSPrefix) > -1) {
                var dsId = tableName.slice(gDSPrefix.length);
                var $grid = DS.getGrid(dsId);
                if ($grid.length) {
                    focusOnDSGrid($grid, dsId);
                } else {
                    DS.restore(DS.getHomeDir())
                    .then(function() {
                        $grid = DS.getGrid(dsId);
                        if ($grid.length) {
                            focusOnDSGrid($grid, dsId);
                        } else {
                            focusOutputErrorHandler('dataset', mainQuery);
                        }
                    })
                    .fail(function() {
                        focusOutputErrorHandler('dataset', mainQuery);
                    });
                }
                return;
            }

            var tableId = xcHelper.getTableId(tableName);
            var wsId;
            var tableType;

            if (!tableId) {
                focusOutputErrorHandler('output', mainQuery);
                return;
            }

            if (gTables[tableId]) {
               
                if (gTables[tableId].status === TableType.Active) {
                    $('#workspaceTab').click();
                    wsId = WSManager.getWSFromTable(tableId);
                    $('#worksheetTab-' + wsId).trigger(fakeEvent.mousedown);

                    if ($("#dagPanel").hasClass('full')) {
                        $('#dagPulloutTab').click();
                    }
                    var $tableWrap = $('#xcTableWrap-' + tableId);
                    xcHelper.centerFocusedTable($tableWrap, false);
                    $tableWrap.mousedown();
                    return;
                } else if (WSManager.getWSFromTable(tableId) == null) {
                    tableType = TableType.Orphan;
                } else if (gTables[tableId].status === TableType.Orphan) {
                    tableType = TableType.Orphan;
                } else if (gTables[tableId].status === TableType.Undone) {
                    tableType = TableType.Undone;
                } else {
                    tableType = TableType.Archived;
                }

                //xx currently we won't allow focusing on undone tables
                if (tableType === TableType.Undone) {
                    focusOutputErrorHandler('table', mainQuery, tableType);
                } else {
                    $('#workspaceTab').click();
                    wsId = WSManager.getActiveWS();
                    WSManager.moveInactiveTable(tableId, wsId, tableType);
                }
                
            } else {
                XcalarGetTables(tableName)
                .then(function(ret) {
                    if (ret.numNodes > 0) {
                        $('#workspaceTab').click();
                        wsId = WSManager.getActiveWS();
                        WSManager.moveInactiveTable(tableId, wsId, TableType.Orphan);
                    } else {
                        focusOutputErrorHandler('table', mainQuery);
                    }
                });
            }
        }

        function focusOnDSGrid($grid, dsId) {
            // switch to correct panels
            $('#dataStoresTab').click();
            if (!$('#inButton').hasClass('active')) {
                $('#inButton').click();
            }

            var folderId = DS.getDSObj(dsId).parentId;
            DS.goToDir(folderId);
            DS.focusOn($grid);
        }

        function focusOutputErrorHandler(type, mainQuery, status) {
            var typeUpper = type[0].toUpperCase() + type.slice(1);
            var title = xcHelper.replaceMsg(ErrWRepTStr.OutputNotFound, {
                "name": typeUpper
            });
            var desc;
            if (type === "output") {
                desc =ErrTStr.OutputNotFoundMsg;
            } else {
                desc = xcHelper.replaceMsg(ErrWRepTStr.OutputNotExists, {
                    "name": typeUpper
                });
            }

            Alert.error(title, desc);
            if (status) {
                mainQuery.outputTableState = status;
            } else {
                mainQuery.outputTableState = 'deleted';
            }
            
            $('#monitor-inspect').addClass('btn-disabled');
            $queryDetail.find('.outputSection').find('.text')
                                               .text(CommonTxtTstr.NA);
        }
    }

    // put minimal query properties into an array and order by query start time
    function getAbbrQueries() {
        var queryObjs = [];
        var abbrQueryObj;
        var queryObj;
        for (var id in queryLists) {
            queryObj = queryLists[id];
            if (queryObj.state === QueryStatus.Done ||
                queryObj.state === QueryStatus.Cancel) {
                abbrQueryObj = {
                    "sqlNum": queryObj.sqlNum,
                    "time": queryObj.time,
                    "elapsedTime": queryObj.elapsedTime,
                    "outputTableName": queryObj.getOutputTableName(),
                    "outputTableState": queryObj.getOutputTableState(),
                    "state": queryObj.state
                };
                if (queryObj.state === QueryStatus.Cancel) {
                    abbrQueryObj.name = queryObj.name;
                    abbrQueryObj.queryStr = queryObj.getQuery();
                }
                queryObjs.push(abbrQueryObj);
            }
        }
        queryObjs.sort(querySqlSorter);
        return queryObjs;
    }

    function querySqlSorter(a, b) {
        if (a.time > b.time) {
            return 1;
        } else if (a.time < b.time) {
            return -1;
        } else {
            return a.id > b.id;
        }
    }

    function filterQuery($el) {
        if ($el.hasClass("active")) {
            return;
        }

        $el.addClass("active").siblings().removeClass("active");
        var $queries = $queryList.find(".query").addClass("xc-hidden");
        if ($el.hasClass("error")) {
            $queryList.find(".query.error").removeClass("xc-hidden");
        } else if ($el.hasClass("processing")) {
            $queryList.find(".query.processing").removeClass("xc-hidden");
        } else if ($el.hasClass("done")) {
            $queryList.find(".query.done").removeClass("xc-hidden");
        } else {
            $queries.removeClass("xc-hidden");
        }
    }

    function getQueryHTML(xcQuery, restored) {
        var id = xcQuery.getId();
        var time = xcQuery.getTime();
        var date = getQueryTime(time);
        var cancelClass = xcQuery.cancelable ? "" : " disabled";
        var statusClass;
        var pct;
        var step = "";
        if (restored) {
            statusClass = xcQuery.state;
            if (xcQuery.state === QueryStatus.Done) {
                step = "completed";
                pct = 100;
            } else if (xcQuery.state === QueryStatus.Cancel) {
                step = QueryStatus.Cancel;
                pct = 0;
            }
        } else {
            statusClass = "processing";
            pct = 0;
            step = "";
        }
        var html =
            '<div class="xc-query query no-selection ' + statusClass +
            '" data-id="' + id + '">' +
                '<div class="queryInfo">' +
                    '<div class="leftPart">' +
                        '<i class="icon queryIcon processing xi-progress"></i>' +
                        '<i class="icon queryIcon error xi-error"></i>' +
                        '<i class="icon queryIcon done xi-success"></i>' +
                    '</div>' +
                    '<div class="middlePart name">' +
                        xcQuery.getName() +
                    '</div>' +
                    '<div class="rightPart">' +
                        '<i class="icon xi-trash xc-action deleteIcon" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.RemoveQuery + '"></i>' +
                        '<i class="icon xi-cancel xc-action cancelIcon ' +
                        cancelClass + '" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.CancelQuery + '"></i>' +
                    '</div>' +
                '</div>' +
                '<div class="queryInfo">' +
                    '<div class="middlePart date">' +
                        CommonTxtTstr.StartTime + ": " + date +
                    '</div>' +
                    '<div class="rightPart querySteps">' + step + '</div>' +
                '</div>' +
                '<div class="queryProgress">' +
                    '<div class="progressBar" style="width:' + pct +
                        '%" data-step="0"></div>' +
                '</div>' +
            '</div>';
        return html;
    }

    // xx can some of the src tables be simultaneously used by another operation
    // and need to remain locked?
    function unlockSrcTables(mainQuery) {
        var queryStr = mainQuery.getQuery();
        var queries = xcHelper.parseQuery(queryStr);
        var srcTables = [];
        for (var i = 0; i < queries.length; i++) {
            if (queries[i].srcTables) {
                for (var j = 0; j < queries[i].srcTables.length; j++) {
                    srcTables.push(queries[i].srcTables[j]);
                }
            }
        }
        var tableId;
        for (var i = 0; i < srcTables.length; i++) {
            tableId = xcHelper.getTableId(srcTables[i]);
            if (gTables[tableId]) {
                xcHelper.unlockTable(tableId);
            }
        }
    }

    function tableListCanceled(mainQuery) {
        var queryStr = mainQuery.getQuery();
        var queries = xcHelper.parseQuery(queryStr);
        var numQueries = queries.length;
        for (var i = 0; i < numQueries; i++) {
            if (queries[i].dstTable) {
                if (queries[i].dstTable.indexOf(gDSPrefix) === -1) {
                    TableList.addToCanceledList(queries[i].dstTable);
                }
            }
        }
    }

    function clearTableListCanceled(mainQuery) {
        var queryStr = mainQuery.getQuery();
        var queries = xcHelper.parseQuery(queryStr);
        var numQueries = queries.length;
        for (var i = 0; i < numQueries; i++) {
            if (queries[i].dstTable) {
                if (queries[i].dstTable.indexOf(gDSPrefix) === -1) {
                    TableList.removeFromCanceledList(queries[i].dstTable);
                }
            }
        }
    }

    // drops all the tables generated, even the intermediate tables
    // or drops dataset if pointToDS operation
    function dropCanceledTables(mainQuery, onlyFinishedTables) {
        var queryStr = mainQuery.getQuery();
        var queries = xcHelper.parseQuery(queryStr);
        var dstTables = [];
        var dstDatasets = [];
        var numQueries;
        if (onlyFinishedTables) {
            numQueries = mainQuery.currStep;
        } else {
            numQueries = queries.length;
        }

        for (var i = 0; i < numQueries; i++) {
            if (queries[i].dstTable) {
                if (queries[i].dstTable.indexOf(gDSPrefix) > -1) {
                    dstDatasets.push(queries[i].dstTable);
                } else {
                    dstTables.push(queries[i].dstTable);
                }
            }
        }
        var tableId;
        var orphanListTables = [];
        var backendTables = [];
        for (var i = 0; i < dstTables.length; i++) {
            tableId = xcHelper.getTableId(dstTables[i]);
            if (gTables[tableId]) {
                if (gTables[tableId].getType() === TableType.Orphan) {
                    orphanListTables.push(dstTables[i]);
                }
            } else {
                backendTables.push(dstTables[i]);
            }
        }
        // delete tables that are in the orphaned list
        if (orphanListTables.length) {
            var noAlertOrLog = true;
            TblManager.deleteTables(orphanListTables, TableType.Orphan,
                                    noAlertOrLog, noAlertOrLog);
        }

        // delete tables not found in gTables
        for (var i = 0; i < backendTables.length; i++) {
            var tableName = backendTables[i];
            deleteTableHelper(tableName);
        }

        for (var i = 0; i < dstDatasets.length; i++) {
            deleteDatasetHelper(dstDatasets[i]);
        }
    }

    function deleteTableHelper(tableName) {
        XcalarDeleteTable(tableName)
        .then(function() {
            // in case any tables are in the orphaned list
            TableList.removeTable(tableName, TableType.Orphan);
        });
    }

    function deleteDatasetHelper(dsName) {
        dsName = dsName.slice(gDSPrefix.length);
        XcalarDestroyDataset(dsName, null);
    }

    function clearIntervalHelper(id) {
        clearInterval(queryCheckLists[id]);
        delete queryCheckLists[id];
    }

     /* Unit Test Only */
    if (window.unitTestMode) {
        QueryManager.__testOnly__ = {};
        QueryManager.__testOnly__.getElapsedTimeStr = getElapsedTimeStr;
        QueryManager.__testOnly__.queryLists = queryLists;
        QueryManager.__testOnly__.queryCheckLists = queryCheckLists;
    }
    /* End Of Unit Test Only */

    return (QueryManager);
}({}, jQuery));
