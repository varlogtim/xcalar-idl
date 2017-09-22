window.QueryManager = (function(QueryManager, $) {
    var $queryList;   // $("#monitor-queryList")
    var $queryDetail; // $("#monitor-queryDetail")
    var queryLists = {}; // will be populated by xcQuery objs with transaction id as key
    var queryCheckList = {}; // setTimeout timers
    var canceledQueries = {}; // for canceled queries that have been deleted
                              // but the operation has not returned yet
    // XXX store this as a query property
    var sysQueryTypes = [SQLOps.ProfileSort, SQLOps.ProfileBucketing,
                           SQLOps.ProfileAgg, SQLOps.ProfileStats,
                           SQLOps.RenameOrphanTable,
                           SQLOps.QuickAgg, SQLOps.Corr, SQLOps.PreviewDS,
                           SQLOps.DestroyPreviewDS];
    var nonCancelableTypes = [SQLOps.RenameTable, SQLOps.RenameOrphanTable,
                            SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];
    var noOutputs = [SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];

    // constant
    var checkInterval = 2000; // check query every 2s
    var infList;

    QueryManager.setup = function() {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");
        infList = new InfList($queryList, {numInitial: 30});
        addEventHandlers();
    };

    // if numSteps is unknown, should take in -1
    // query is only passed in if this is an actual xcalarQuery (not xcFunction)
    QueryManager.addQuery = function(id, name, options) {
        if (Transaction.isSimulate(id)) {
            return;
        }

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
        if (nonCancelableTypes.indexOf(name) > -1) {
            options.cancelable = false;
        }

        var mainQuery = new XcQuery({
            "name": name,
            "fullName": fullName,
            "time": time,
            "type": type,
            "id": id,
            "numSteps": numSteps,
            "cancelable": options.cancelable,
            "srcTables": options.srcTables
        });

        queryLists[id] = mainQuery;
        var $query = $(getQueryHTML(mainQuery));
        $queryList.find(".hint").remove();
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
            if (UserSettings.getPref("hideSysOps") &&
                sysQueryTypes.indexOf(name) > -1) {
                updateQueryTextDisplay("");
            }
        }
    };

    // queryName will be empty if subquery doesn't belong to a xcalarQuery
    // options = {exportFileName: string, queryName: string, retName; string}
    QueryManager.addSubQuery = function(id, name, dstTable, query, options) {
        if (Transaction.isSimulate(id) ||
            !queryLists[id] ||
            Transaction.checkCanceled(id)) {
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
            "queryName": options.queryName,
            "exportFileName": options.exportFileName,
            "retName": options.retName
        });
        mainQuery.addSubQuery(subQuery);
        if (mainQuery.currStep === mainQuery.subQueries.length - 1) {
            if (options.queryName) {
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
        if (Transaction.isSimulate(id) || !queryLists[id]) {
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
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                null, true)
        }, id);
        updateOutputSection(id);
    };

    QueryManager.subQueryDone = function(id, dstTable, time, options) {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }

        options = options || {};
        var mainQuery = queryLists[id];
        if (time != null) {
            if (mainQuery.name === SQLOps.Retina && options.retName) {
                mainQuery.setOpTime(time);
            } else {
                mainQuery.addOpTime(time);
            }
        }

        // execute retina returned, should be on last step of the group of
        // queries
        if (options.retName) {
            var lastQueryPos = getLastQueryPos(mainQuery, mainQuery.currStep);
            setQueriesDone(mainQuery, mainQuery.currStep, lastQueryPos);
            mainQuery.currStep = lastQueryPos;
        }

        if (mainQuery.subQueries.length &&
            mainQuery.subQueries[0].getName() === "index from DS") {
            DSCart.queryDone(mainQuery.getId());
            return;
        }

        if (mainQuery.type === "xcFunction") {
            for (var i = 0; i < mainQuery.subQueries.length; i++) {
                var subQuery = mainQuery.subQueries[i];
                if (subQuery.dstTable === dstTable || (options.retName &&
                    mainQuery.currStep === i)) {
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

    QueryManager.removeQuery = function(ids, userTriggered) {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }

        ids.forEach(function(id) {
            if (Transaction.isSimulate(id) || !queryLists[id]) {
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
                setDisplayToDefault();
            }
            $query.remove();
        });

        xcTooltip.hideAll();
    };

    QueryManager.cancelQuery = function(id) {
        if (Transaction.isSimulate(id)) {
            return;
        }
        var deferred = jQuery.Deferred();
        var mainQuery = queryLists[id];
        if (mainQuery == null) {
            // error case
            console.warn('invalid operation', 'transaction id: ' + id);
            deferred.reject('invalid operation');
            return deferred.promise();
        } else if (mainQuery.state === QueryStatus.Done) {
            console.warn('operation is done, cannot cancel');
            deferred.reject('operation is done, cannot cancel');
            return deferred.promise();
        } else if (mainQuery.state === QueryStatus.Cancel ||
                   mainQuery.state === QueryStatus.Error) {
            deferred.reject("already canceled");
            return deferred.promise();
        }

        var prevState = mainQuery.getState();

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
            if (currStep === 0 && prevState === QueryStateT.qrNotStarted) {
                deferred.resolve();
            } else if (mainQuery.subQueries[currStep - 1]) {
                // previous subquery finished but currStep hasn't started
                deferred.resolve();
            } else {
                deferred.reject('step vs operation mismatch');
            }
            return deferred.promise();
        }

        var statusesToIgnore = [StatusT.StatusOperationHasFinished];

        // this is a xcalar query
        if (mainQuery.subQueries[currStep].queryName) {
            // Query Cancel returns success even if the operation is
            // complete, unlike cancelOp. Xc4921
            XcalarQueryCancel(mainQuery.subQueries[currStep].queryName, [])
            .then(function(ret) {
                console.info('operation cancel submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp

        } else { // xcFunction
            XcalarCancelOp(mainQuery.subQueries[currStep].dstTable,
                           statusesToIgnore)
            .then(function(ret) {
                console.info('operation submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp
        }
        return deferred.promise();
    };

    QueryManager.cancelDS = function(id) {
        if (Transaction.isSimulate(id)) {
            return;
        }
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

    QueryManager.cancelDF = function(id) {
        if (Transaction.isSimulate(id)) {
            return;
        }
        var mainQuery = queryLists[id];
        if (!mainQuery) {
            return;
        }
        if (mainQuery.subQueries[0]) {
            var retName = mainQuery.subQueries[0].retName;
            DFCard.cancelDF(retName, id);
        }
    };

    // this gets called after cancel is successful. It cleans up and updates
    // the query state and views
    QueryManager.confirmCanceledQuery = function(id) {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
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
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                  true, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": CommonTxtTstr.NA
        }, id);
        updateOutputSection(id, true);
        var $query = $('.query[data-id="' + id + '"]');
        $query.addClass(QueryStatus.Cancel).find('.querySteps')
              .text(xcHelper.capitalize(QueryStatus.Cancel));
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
        if (Transaction.isSimulate(id)) {
            return;
        }
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

    QueryManager.fail = function(id, error) {
        if (Transaction.isSimulate(id) || !queryLists[id]) {
            return;
        }

        var mainQuery = queryLists[id];
        mainQuery.state = QueryStatus.Error;
        mainQuery.outputTableState = "unavailable";
        mainQuery.sqlNum = Log.getErrorLogs().length - 1;
        if (error) {
            if (typeof error === "object" && error.error) {
                error = error.error;
            }
            if (typeof error === "string") {
                mainQuery.error = error;
            }
        }
        updateQueryTextDisplay(mainQuery.getQuery(), false, mainQuery.error);

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateQueryBar(id, null, true, false, true);

        elapsedTime = xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true);
        opTime = xcHelper.getElapsedTimeStr(mainQuery.getOpTime());

        updateStatusDetail({
            "start": getQueryTime(mainQuery.getTime()),
            "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime()),
            "total": CommonTxtTstr.NA
        }, id, QueryStatus.Error);
        updateOutputSection(id);
        var $query = $('.query[data-id="' + id + '"]');
        $query.addClass(QueryStatus.Error).find('.querySteps')
              .text(xcHelper.capitalize(QueryStatus.Error));
        if ($query.hasClass('active')) {
            updateHeadingSection(mainQuery);
        }
    };

    QueryManager.check = function(doNotAnimate) {
        // check queries
        for (var xcQuery in queryLists) {
            var query = queryLists[xcQuery];
            if (query.type === "restored") {
                continue;
            }
            if (query.state !== QueryStatus.Done &&
                query.state !== QueryStatus.Cancel &&
                query.state !== QueryStatus.Error) {
                if (query.type === "xcFunction") {
                    for (var i = 0; i < query.subQueries.length; i++) {
                        var subQuery = query.subQueries[i];
                        if (subQuery.state !== QueryStatus.Done) {
                            if (subQuery.queryName) {
                                outerQueryCheck(query.getId(), doNotAnimate);
                            } else {
                                subQueryCheck(subQuery);
                            }
                            break;
                        }
                    }
                } else {
                    mainQueryCheck(query.getId(), doNotAnimate);
                }
            }
        }
    };

    // XX used for testing;
    QueryManager.getAll = function() {
        return ({
            "queryLists": queryLists,
            "queryCheckLists": queryCheckList
        });
    };

    QueryManager.getQuery = function(id) {
        return queryLists[id];
    };

    QueryManager.getCache = function() {
        // used for saving query info for browser refresh
        // put minimal query properties into an array and order by start time
        var queryObjs = [];
        var abbrQueryObj;
        var queryObj;
        var queryMap = {}; // we store queries into a map first to overwrite any
        // queries with duplicate sqlNums due to Log.undo/redo operations
        // then sort in an array
        for (var id in queryLists) {
            queryObj = queryLists[id];
            if (queryObj.state === QueryStatus.Done ||
                queryObj.state === QueryStatus.Cancel ||
                queryObj.state === QueryStatus.Error) {
                abbrQueryObj = {
                    "sqlNum": queryObj.sqlNum,
                    "time": queryObj.time,
                    "elapsedTime": queryObj.elapsedTime,
                    "opTime": queryObj.opTime,
                    "opTimeAdded": queryObj.opTimeAdded,
                    "outputTableName": queryObj.getOutputTableName(),
                    "outputTableState": queryObj.getOutputTableState(),
                    "state": queryObj.state
                };
                if (queryObj.sqlNum === null ||
                    queryObj.state === QueryStatus.Cancel) {
                    abbrQueryObj.name = queryObj.name;
                    abbrQueryObj.queryStr = queryObj.getQuery();
                    queryMap[queryObj.fullName] = abbrQueryObj;
                } else if (queryObj.state === QueryStatus.Error) {
                    abbrQueryObj.queryStr = queryObj.getQuery();
                    abbrQueryObj.error = queryObj.error;
                    queryMap[queryObj.fullName] = abbrQueryObj;
                } else {
                    queryMap[queryObj.sqlNum] = abbrQueryObj;
                }
            }
        }
        for (var i in queryMap) {
            queryObjs.push(queryMap[i]);
        }
        queryObjs.sort(querySqlSorter);
        return queryObjs;
    };

    QueryManager.restore = function(queries) {
        QueryManager.toggleSysOps(UserSettings.getPref("hideSysOps"));
        if (!queries) {
            return;
        }

        var logs = Log.getLogs();
        var errorLogs = Log.getErrorLogs();
        var xcLog;
        var query;
        var numQueries = queries.length;
        var html = "";
        var name;
        var fullName;
        var cli;
        for (var i = 0; i < numQueries; i++) {
            if (queries[i].state === QueryStatus.Error) {
                xcLog = errorLogs[queries[i].sqlNum];
            } else {
                xcLog = logs[queries[i].sqlNum];
            }

            if (xcLog) {
                name = xcLog.options.operation;
                if (name === SQLOps.Ext && xcLog.options.func) {
                    name += " " + xcLog.options.func;
                }
                if (queries[i].state === QueryStatus.Error) {
                    cli = queries[i].queryStr;
                } else {
                    cli = xcLog.cli;
                }
            } else {
                name = queries[i].name;
                cli = queries[i].queryStr;
            }
            if (!name) {
                continue; // info is not stored in log due to an overwritten
                          // undo so we skip
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
                "opTime": queries[i].opTime,
                "opTimeAdded": queries[i].opTimeAdded,
                "outputTableName": queries[i].outputTableName,
                "outputTableState": queries[i].outputTableState,
                "state": queries[i].state,
                "type": "restored",
                "error": queries[i].error
            });
            queryLists[i - numQueries] = query; // using negative keys for
            // restored queries
            html += getQueryHTML(query, true);
        }

        if (html) {
            $queryList.find('.hint').remove();
            $queryList.append(html);
            infList.restore(".query");

            focusOnQuery($queryList.find(".query").last());
        }
    };

    QueryManager.toggleSysOps = function(hide) {
        if (hide) {
            $queryList.addClass("hideSysOps");
            if ($queryList.find(".sysType.active").length) {
                setDisplayToDefault();
                $queryList.find(".active").removeClass(".active");
            }
        } else {
            $queryList.removeClass("hideSysOps");
        }
    };

    QueryManager.getAllDstTables = function(id, force) {
        var tables = [];
        var query = queryLists[id];
        if (!query) {
            return tables;
        }
        return query.getAllTableNames(force);
    };

    // stores reused indexed table names
    QueryManager.addIndexTable = function(id, tableName) {
        var query = queryLists[id];
        if (query) {
            query.addIndexTable(tableName);
        }
    };

    QueryManager.getIndexTables = function(id) {
        var tables = [];
        var query = queryLists[id];
        if (!query) {
            return tables;
        }
        return query.getIndexTables();
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

    function checkCycle(callback, id, adjustTime) {
        clearIntervalHelper(id);

        var intTime = checkInterval;
        if (adjustTime) {
            intTime = Math.max(200, checkInterval - adjustTime);
        }

        queryCheckList[id] = setTimeout(function() {
            var startTime = Date.now();
            callback()
            .then(function() {
                if (queryCheckList[id] != null) {
                    var elapsedTime = Date.now() - startTime;
                    checkCycle(callback, id, elapsedTime);
                }
            });
        }, intTime);

        return queryCheckList[id];
    }

    // used for xcalarQuery
    function mainQueryCheck(id, doNotAnimate) {
        var mainQuery = queryLists[id];
        var startTime = Date.now();
        check()
        .then(function() {
            var elapsedTime = Date.now() - startTime;
            checkCycle(check, id, elapsedTime);
        });

        function check() {
            var deferred = jQuery.Deferred();

            mainQuery.check()
            .then(function(res) {

                if (!queryLists[id]) {
                    clearIntervalHelper(id);
                    deferred.reject();
                    return;
                }
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    clearIntervalHelper(id);
                    //xx unable to match up with sql id number
                    QueryManager.queryDone(id);
                    deferred.reject();
                    return;
                }

                var step = res.numCompletedWorkItem;
                mainQuery.currStep = step;
                if (state === QueryStateT.qrError) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, true, false, doNotAnimate);
                    deferred.reject();
                } else if (state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, false, true, doNotAnimate);
                    deferred.reject();
                } else {
                    subQueryCheckHelper(mainQuery.subQueries[step], id, step);
                    deferred.resolve();
                }
            })
            .fail(function(error) {
                if (!error || error.status !== StatusT.StatusQrQueryNotExist) {
                    console.error("Check failed", error);
                    updateQueryBar(id, null, error, false, doNotAnimate);
                }
                clearIntervalHelper(id);
                deferred.reject();
            });

            return deferred.promise();
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

    function getLastQueryPos(mainQuery, start) {
        var currStep = mainQuery.currStep;
        var subQueries = mainQuery.subQueries;
        var queryName = subQueries[currStep].queryName;
        var lastQueryPos = start;
        for (var i = subQueries.length - 1; i >= 0; i--) {
            if (subQueries[i].queryName === queryName) {
                lastQueryPos = i;
                break;
            }
        }
        return (lastQueryPos);
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
        }

        var mainQuery = queryLists[id];
        var firstQueryPos = getFirstQueryPos(mainQuery);

        var startTime = Date.now();
        check()
        .then(function() {
            var elapsedTime = Date.now() - startTime;
            checkCycle(check, id, elapsedTime);
        });

        function check() {
            var deferred = jQuery.Deferred();

            var queryName = mainQuery.subQueries[mainQuery.currStep].queryName;
            outerQueryCheckHelper(id, queryName)
            .then(function(res) {
                if (mainQuery.state === QueryStatus.Error ||
                    mainQuery.state === QueryStatus.Cancel ||
                    mainQuery.state === QueryStatus.Done) {
                    deferred.reject();
                    return;
                }

                var numCompleted = res.numCompletedWorkItem;
                // XXX need to accurately determine currStep based on
                // numCompleted
                var lastQueryPos = getLastQueryPos(mainQuery, firstQueryPos);
                var currStep = Math.min(numCompleted + firstQueryPos,
                                        lastQueryPos);
                mainQuery.currStep = Math.max(mainQuery.currStep, currStep);
                setQueriesDone(mainQuery, firstQueryPos, currStep);
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    mainQuery.currStep++;
                    clearIntervalHelper(id);
                    var subQuery = mainQuery.subQueries[mainQuery.currStep];
                    if (subQuery) {
                        if (subQuery.queryName) {
                            outerQueryCheck(id, doNotAnimate);
                        } else {
                            subQueryCheck(subQuery);
                        }
                    }
                    deferred.reject(); // ends cycle
                } else if (state === QueryStateT.qrError ||
                           state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateQueryBar(id, res, true, false, doNotAnimate);
                    deferred.reject(); // ends cycle
                } else {
                    if (mainQuery.subQueries[currStep].retName) {
                        var pct = parseFloat((100 * DFCard.getProgress(queryName).curOpPct)
                                    .toFixed(2));
                        updateQueryBar(id, pct, false, false, doNotAnimate);
                        mainQuery.setElapsedTime();
                        updateStatusDetail({
                            "start": getQueryTime(mainQuery.getTime()),
                            "elapsed": xcHelper.getElapsedTimeStr(
                                        mainQuery.getElapsedTime(), true, true),
                            "opTime": xcHelper.getElapsedTimeStr(
                                        mainQuery.getOpTime(), true),
                            "total": xcHelper.getElapsedTimeStr(
                                        mainQuery.getElapsedTime(), null, true),
                        }, id);
                    } else {
                        subQueryCheckHelper(mainQuery.subQueries[currStep], id,
                                        currStep, doNotAnimate);
                        // only stop animation the first time, do not persist it
                    }

                    doNotAnimate = false;

                    deferred.resolve();
                }
            })
            .fail(function(error) {
                if (!error || error.status !== StatusT.StatusQrQueryNotExist) {
                    console.error("Check failed", error, queryName);
                    updateQueryBar(id, null, error, false, doNotAnimate);
                }
                clearIntervalHelper(id);
                deferred.reject();
            });

            return deferred.promise();
        }
    }

    function outerQueryCheckHelper(id, queryName) {
        var mainQuery = queryLists[id];
        var curSubQuery = mainQuery.subQueries[mainQuery.currStep];
        if (curSubQuery.retName) {
            // if retina doesn't exist in dfcard, we stil update the elapsed
            // time, but the steps and % will be at 0
            var progress = DFCard.getProgress(curSubQuery.retName);
            var status;
            if (progress.pct === 1) {
                status = QueryStateT.qrFinished;
            } else {
                status = QueryStateT.qrProcessing;
            }
            var ret = {
                numCompletedWorkItem: progress.numCompleted,
                queryState: status
            };
            if (mainQuery.name === SQLOps.Retina && progress.opTime) {
                mainQuery.setOpTime(progress.opTime);
            }
            return PromiseHelper.resolve(ret);
        } else {
            return XcalarQueryState(queryName);
        }
    }

    function incrementStep(mainQuery) {
        mainQuery.currStep++;

        var id = mainQuery.getId();
        var $query = $queryList.find('.query[data-id="' + id + '"]');

        if ($query.hasClass('active')) {
            updateQueryTextDisplay(mainQuery.getQuery());
        }

        if (mainQuery.numSteps !== -1 &&
            mainQuery.currStep >= mainQuery.numSteps) {
            // show finished state for the entire query
            updateQueryBar(id, 100);
        }
    }

    function focusOnQuery($target) {
        if ($target.hasClass("active") || ($target.hasClass("sysType") &&
            UserSettings.getPref("hideSysOps"))) {
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
        var opTime;
        if (mainQuery.getState() === QueryStatus.Done ||
            mainQuery.getState() === QueryStatus.Cancel ||
            mainQuery.getState() === QueryStatus.Error) {
            elapsedTime = xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true);
            opTime = xcHelper.getElapsedTimeStr(mainQuery.getOpTime());
            if (mainQuery.getState() === QueryStatus.Done) {
                totalTime = elapsedTime;
            }
        } else {
            if (mainQuery !== null) {
                mainQuery.setElapsedTime();
            }
            elapsedTime = xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                     true, true);
            opTime = xcHelper.getElapsedTimeStr(mainQuery.getOpTime(), true);
        }
        updateHeadingSection(mainQuery);
        updateStatusDetail({
            "start": startTime,
            "elapsed": elapsedTime,
            "opTime": opTime,
            "total": totalTime
        }, queryId);
        updateQueryTextDisplay(query, false, mainQuery.error);
        updateOutputSection(queryId);
    }

    function updateHeadingSection(mainQuery) {
        var state = mainQuery.getState();
        var id = mainQuery.id;
        var $text = $queryDetail.find(".op .text");
        var name = mainQuery.name;
        if (sysQueryTypes.indexOf(name) > -1) {
            name = "Sys-" + name;
        }
        $text.text(name);

        if (state === QueryStateT.qrNotStarted ||
            state === QueryStateT.qrProcessing) {
            state = QueryStatus.Run;
        } else if (state === QueryStateT.qrFinished ||
                   state === QueryStatus.Done) {
            state = QueryStatus.Done;
        } else if (state === QueryStateT.qrCancelled ||
                   state === QueryStatus.Cancel) {
            state = QueryStatus.Cancel;
        } else if (state === QueryStateT.qrError ||
                    state === QueryStatus.Error) {
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
            QueryManager.check(true);
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
        } else if (state === QueryStatus.Error) {
            updateQueryBar(id, null, true, false, true);
        }
    }

    function updateQueryTextDisplay(query, blank, errorText) {
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
        } else if (!query && !blank) {
            queryString = '<div class="queryRow"></div>';
        } else {
            queryString = '<div class="queryRow">' + query + '</div>';
        }
        if (errorText) {
            queryString += '<div class="queryRow errorRow">' + errorText + '</div>';
        }

        $queryDetail.find(".operationSection .content").html(queryString);
    }

    // updates the status text in the main card
    function updateStatusDetail(info, id, status, reset) {
        if (id != null) {
            // do not update detail if not focused on this query bar
            if (!$queryList.find('.query[data-id="' + id + '"]')
                           .hasClass('active')) {
                return;
            }
        }

        var $statusDetail = $queryDetail.find(".statusSection");
        var $query = $queryDetail.find(".querySection");
        for (var i in info) {
            if (i === "op") {
                var name = info[i];
                if (sysQueryTypes.indexOf(name) > -1) {
                    name = "Sys-" + name;
                }

                $query.find(".op .text").text(name);
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

        if (queryState === QueryStatus.Done && mainQuery.getOutputTableName() &&
            sysQueryTypes.indexOf(mainQuery.getName()) === -1 &&
            noOutputs.indexOf(mainQuery.getName()) === -1) {
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

    function subQueryCheck(subQuery) {
        var id = subQuery.getId();
        if (!queryLists[id]) {
            console.error("error case");
            return;
        } else if (!$("#monitor-queries").hasClass("active") ||
                    !$('#monitorTab').hasClass('active')) {
            if (subQuery.getName() === "index from DS") {
                DSCart.addQuery(queryLists[id]);
            }
        }
        // only stop animation the first time, do not persist it
        var doNotAnimate = false;

        var startTime = Date.now();
        subQueryCheckHelper(subQuery, id, subQuery.index, doNotAnimate)
        .then(function() {
            var elapsedTime = Date.now() - startTime;
            checkCycle(function() {
                return subQueryCheckHelper(subQuery, id, subQuery.index,
                                           doNotAnimate);
            }, id, elapsedTime);
        });
    }

    function subQueryCheckHelper(subQuery, id, step, doNotAnimate) {
        var deferred = jQuery.Deferred();
        if (subQuery.state === QueryStatus.Done) {
            clearIntervalHelper(id);
            return PromiseHelper.reject();
        }

        subQuery.check()
        .then(function(res) {
            if (!queryLists[id]) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }
            var mainQuery = queryLists[id];
            if (mainQuery.state === QueryStatus.Cancel ||
                mainQuery.state === QueryStatus.Done ||
                mainQuery.state === QueryStatus.Error) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }

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
            } else {
                updateQueryBar(id, res, false, false, doNotAnimate);
            }

            mainQuery.setElapsedTime();
            updateStatusDetail({
                "start": getQueryTime(mainQuery.getTime()),
                "elapsed": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                      true, true),
                "opTime": xcHelper.getElapsedTimeStr(mainQuery.getOpTime(),
                                                      true),
                "total": xcHelper.getElapsedTimeStr(mainQuery.getElapsedTime(),
                                                    null, true),
            }, id);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Check failed", error);
            clearIntervalHelper(id);
            deferred.reject();
        });

        return deferred.promise();
    }

    function updateQueryBar(id, progress, isError, isCanceled, doNotAnimate) {
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if (progress == null && !isCanceled) {
            $query.removeClass("processing");
        }
        if ($query.hasClass("done") && !doNotAnimate) {
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
        progress = Math.min(Math.max(progress, 0), 100);
        if (progress >= 100 && ((numSteps > 0 && currStep >= numSteps) ||
            (mainQuery.state === QueryStatus.Done))) {
            progress = "100%";
            newClass = "done";
            $query.find('.cancelIcon').addClass('disabled');
        } else if (isError) {
            progress = "0%";
            newClass = QueryStatus.Error;
        } else if (isCanceled) {
            progress = "0%";
            newClass = QueryStatus.Cancel;
        } else {
            progress = progress + "%";
        }

        var $lockIcon = $('.lockedTableIcon[data-txid="' + id + '"]');
        var progressCircles = [];
        if ($lockIcon.length) {
            $lockIcon.each(function() {
                progressCircles.push($(this).data("progresscircle"));
            });
        }

        // set width to 0 if new step is started unless it's past the last step
        if (parseInt($progressBar.data('step')) !== currStep &&
            currStep !== numSteps) {
            $progressBar.data('step', currStep);
            if (!$query.hasClass("done")) {
                $progressBar.stop().width(0).data('step', currStep);

                for (var i = 0; i < progressCircles.length; i++) {
                    progressCircles[i].update(0, 0);
                }
                if ($extraProgressBar != null) {
                    $extraProgressBar.stop().width(0);
                }
            }
        }

        // .stop() stops any previous animation;
        if (isCanceled || isError) {
            $progressBar.stop().width(progress);
            for (var i = 0; i < progressCircles.length; i++) {
                progressCircles[i].update(parseInt(progress), 0);
            }
        } else {
            $progressBar.stop().animate({"width": progress}, checkInterval,
                                        "linear", progressBarContinuation);
            for (var i = 0; i < progressCircles.length; i++) {
                progressCircles[i].update(parseInt(progress), checkInterval);
            }
        }

        progressBarContinuation();

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

        function progressBarContinuation() {
            if (newClass != null) {
                $query.removeClass("processing").addClass(newClass);
                if (newClass === "done") {
                    $query.find('.querySteps').text(StatusMessageTStr.Completed);
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
    }

    // $extraStepText -> the main panel $queryDetail.find(".querySteps");
    function updateQueryStepsDisplay(mainQuery, $query, newClass,
                                    $extraStepText) {
        var displayedStep;
        var stepText;
        // if query stopped in some way or another
        if (newClass !== null) {
            if (newClass === QueryStatus.Done ||
                newClass === QueryStatus.Cancel ||
                newClass === QueryStatus.Error) {
                if (newClass === QueryStatus.Done) {
                    $query.find('.querySteps').text(StatusMessageTStr.Completed);
                } else {
                    newClass = xcHelper.capitalize(newClass);
                    $query.find('.querySteps').text(newClass);
                }
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

    function addEventHandlers() {
        var $querySideBar = $("#monitorMenu-query");

        $querySideBar.on("click", ".filterSection .xc-action", function() {
            filterQuery($(this));
        });

        $querySideBar.find(".bulkOptionsSection").click(function(event) {
            if (!$(event.target).closest('.bulkOptions').length) {
                if ($querySideBar.hasClass("bulkOptionsOpen")) {
                    $querySideBar.removeClass("bulkOptionsOpen");
                    $queryList.find(".checkbox").removeClass("checked");
                } else {
                    $querySideBar.addClass("bulkOptionsOpen");
                    $queryList.find(".checkbox").filter(function() {
                        return !$(this).closest(".processing").length &&
                            $(this).is(":visible");
                    }).addClass("checked");
                    xcTooltip.hideAll();
                }
            }
        });

        $queryList.on("click", ".checkbox", function() {
            var $checkbox = $(this);
            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
            } else {
                $checkbox.addClass("checked");
            }
        });

        $queryList.on("click", ".query", function(event) {
            var $clickTarget = $(event.target);
            var id = $clickTarget.closest('.query').data('id');

            if ($clickTarget.hasClass('deleteIcon')) {
                QueryManager.removeQuery(id, true);
            } else if ($clickTarget.hasClass('cancelIcon')) {
                var mainQuery = queryLists[id];
                var qName;
                if (mainQuery) {
                    qName = mainQuery.name;
                }
                // special handling for canceling importDataSource
                if (qName === SQLOps.DSPoint) {
                    QueryManager.cancelDS(id);
                } else if (qName === SQLOps.Retina) {
                    QueryManager.cancelDF(id);
                } else {
                    QueryManager.cancelQuery(id);
                }
            } else if (!$clickTarget.closest(".checkbox").length) {
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

        bulkOptions();

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
            var $datastoreTab = $("#dataStoresTab");
            if (!$datastoreTab.hasClass("active")) {
                $datastoreTab.click();
            }

            if (!$datastoreTab.hasClass("mainMenuOpen")) {
                $datastoreTab.find(".mainTab").click();
            }

            var $inButton = $("#inButton");
            if (!$inButton.hasClass("active")) {
                $inButton.click();
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

        function bulkOptions() {
            $querySideBar.find(".bulkOptions").on("click", "li", function() {
                var action = $(this).data('action');

                switch (action) {
                    case ("deleteAll"):
                        var ids = [];
                        $queryList.find(".checkbox.checked").each(function() {
                            var id = $(this).closest(".query").data("id");
                            ids.push(id);
                        });
                        QueryManager.removeQuery(ids, true);
                        $querySideBar.removeClass("bulkOptionsOpen");
                        break;
                    case ("clearAll"):
                        $queryList.find(".checkbox.checked")
                                  .removeClass("checked");
                        break;
                    case ("selectAll"):
                        $queryList.find(".checkbox").filter(function() {
                            return !$(this).closest(".processing").length &&
                                $(this).is(":visible");
                        }).addClass("checked");
                        break;
                    default:
                        break;
                }
            });
        }
    }

    function querySqlSorter(a, b) {
        if (a.time > b.time) {
            return 1;
        } else if (a.time < b.time) {
            return -1;
        } else {
            return a.sqlNum > b.sqlNum;
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
        QueryManager.scrollToFocused();
    }

    function getQueryHTML(xcQuery, restored) {
        var id = xcQuery.getId();
        var time = xcQuery.getTime();
        var date = getQueryTime(time);
        var cancelClass = xcQuery.cancelable ? "" : " disabled";
        var statusClass = "";
        var pct;
        var step = "";
        var originalName = xcQuery.getName();
        var name = originalName;
        var tooltip = "";
        if (sysQueryTypes.indexOf(name) > -1) {
            name = "Sys-" + name;
            tooltip = TooltipTStr.SysOperation;
        }
        if (restored) {
            statusClass = xcQuery.state;
            if (xcQuery.state === QueryStatus.Done) {
                step = "completed";
                pct = 100;
            } else if (xcQuery.state === QueryStatus.Cancel) {
                step = QueryStatus.Cancel;
                pct = 0;
            } else if (xcQuery.state === QueryStatus.Error) {
                step = QueryStatus.Error;
                pct = 0;
            }
        } else {
            statusClass = "processing";
            pct = 0;
            step = "";
        }
        if (sysQueryTypes.indexOf(originalName) > -1) {
            statusClass += " sysType";
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
                    '<div class="middlePart name" data-original-title="' +
                        tooltip + '" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body">' +
                        name +
                    '</div>' +
                    '<div class="rightPart">' +
                        '<i class="icon xi-trash xc-action deleteIcon" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.RemoveQuery + '"></i>' +
                        '<i class="icon xi-cancel xc-action cancelIcon ' +
                        cancelClass + '" ' +
                        'data-container="body" data-toggle="tooltip" ' +
                        'title="' + TooltipTStr.CancelQuery + '"></i>' +
                        '<div class="checkbox">' +
                          '<i class="icon xi-ckbox-empty fa-13"></i>' +
                          '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
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

    // XXX can some of the src tables be simultaneously used by another operation
    // and need to remain locked?
    function unlockSrcTables(mainQuery) {
        var srcTables = {};

        // check original source tables
        if (mainQuery.srcTables) {
            for (var i = 0; i < mainQuery.srcTables.length; i++) {
                srcTables[mainQuery.srcTables[i]] = true;
            }
        }

        // scan query strings for other source tables in case they were missed
        var queryStr = mainQuery.getQuery();
        if (queryStr) {
            var queries = xcHelper.parseQuery(queryStr);
            for (var i = 0; i < queries.length; i++) {
                if (queries[i].srcTables) {
                    for (var j = 0; j < queries[i].srcTables.length; j++) {
                        srcTables[queries[i].srcTables[j]] = true;
                    }
                }
            }
        }

        var tableId;
        for (var table in srcTables) {
            tableId = xcHelper.getTableId(table);
            if (tableId) {
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
    // or drops dataset if importDataSource operation
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

        var dstTable;
        for (var i = 0; i < numQueries; i++) {
            dstTable = queries[i].dstTable;
            if (dstTable) {
                if (dstTable.indexOf(gRetSign) > -1) {
                    continue;// ignore ret:tableName tables
                }
                if (dstTable.indexOf(gDSPrefix) > -1) {
                    dstDatasets.push(dstTable);
                } else {
                    dstTables.push(dstTable);
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
        clearTimeout(queryCheckList[id]);
        delete queryCheckList[id];
    }

    function setDisplayToDefault() {
        updateQueryTextDisplay("", true);
        updateStatusDetail({
            "start": CommonTxtTstr.NA,
            "elapsed": CommonTxtTstr.NA,
            "opTime": CommonTxtTstr.NA,
            "total": CommonTxtTstr.NA,
        }, null, QueryStatus.RM);
        updateOutputSection(null, true);
    }

     /* Unit Test Only */
    if (window.unitTestMode) {
        QueryManager.__testOnly__ = {};
        QueryManager.__testOnly__.queryLists = queryLists;
        QueryManager.__testOnly__.queryCheckLists = queryCheckList;
        QueryManager.__testOnly__.canceledQueries = canceledQueries;
        QueryManager.__testOnly__.unlockSrcTables = unlockSrcTables;
    }
    /* End Of Unit Test Only */

    return (QueryManager);
}({}, jQuery));
