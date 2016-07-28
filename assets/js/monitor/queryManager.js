window.QueryManager = (function(QueryManager, $) {
    var $queryList;   // $("#monitor-queryList")
    var $queryDetail; // $("#monitor-queryDetail")
    var $statusDetail; // $queryDetail.find('.statusSection')
    var queryLists = {}; // will be populated by xcQuery objs with transaction id as key
    var queryCheckLists = {}; // setInterval timers
    var notCancelableList = ['load']; // list of nonCancelable operations

    // constant
    var checkInterval = 2000; // check query every 2s

    QueryManager.setup = function() {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");
        $statusDetail = $queryDetail.find('.statusSection');

        addEventHandlers();
    };


    QueryManager.test = function() {
        var ds1 = "cheng." + xcHelper.randName("yelpUser");
        var ds2 = "cheng." + xcHelper.randName("yelpReviews");
        var query = 'load --url "nfs:///var/tmp/yelp/user" ' +
                    '--format json --size 0B --name "' + ds1 + '";' +
                    'load --url "nfs:///var/tmp/yelp/reviews" ' +
                    '--format json --size 0B --name "' + ds2 + '";';
        QueryManager.addQuery(0, "test", {query: query});
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
            "name"    : name,
            "fullName": fullName,
            "time"    : time,
            "type"    : type,
            "id"      : id,
            "numSteps": numSteps,
            "cancelable": options.cancelable
        });

        queryLists[id] = mainQuery;
        var $query = $(getQueryHTML(mainQuery));
        $queryList.find(".hint").hide()
                  .end()
                  .append($query);
        focusOnQuery($query);
        updateStatusDetail({start: time}, id);

        if (type === "xcQuery") {
            runXcQuery(id, mainQuery, subQueries);
        }
    };

    // queryName will be empty if subquery doesn't belong to a xcalarQuery
    QueryManager.addSubQuery = function(id, name, dstTable, query, queryName) {
        if (!queryLists[id]) {
            return;
        }
        var mainQuery = queryLists[id];
        var time = new Date().getTime();

        var subQuery = new XcSubQuery({
            "name"    : name,
            "time"    : time,
            "query"   : query,
            "dstTable": dstTable,
            "id"      : id,
            "index"   : mainQuery.subQueries.length,
            "queryName": queryName
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

    QueryManager.queryDone = function(id) {
        if (!queryLists[id]) {
            return;
        }
        var mainQuery = queryLists[id];
        mainQuery.state = "done";
        mainQuery.outputTableState = "active";
        mainQuery.setElapsedTime();
        clearInterval(queryCheckLists[id]);
        updateQueryBar(id, 100);
        updateStatusDetail({
            start: getQueryTime(mainQuery.getTime()),
            elapsed: getElapsedTimeStr(mainQuery.getElapsedTime()),
            remaining: CommonTxtTstr.NA,
            total: getElapsedTimeStr(mainQuery.getElapsedTime())
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
                    subQuery.state = "done";
                    if (mainQuery.currStep === i) {
                        incrementStep(mainQuery);
                        subQuery = mainQuery.subQueries[mainQuery.currStep];
                        clearInterval(queryCheckLists[id]);
                        // queryCheckLists[id]
                        if (mainQuery.currStep === mainQuery.numSteps) {
                            // query is done
                        } else {

                            while (subQuery && subQuery.state === "done") {
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

    QueryManager.removeQuery = function(id) {
        if (!queryLists[id]) {
            return;
        }
        clearInterval(queryCheckLists[id]);
        delete queryCheckLists[id];
        delete queryLists[id];
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if ($query.hasClass('active')) {
            updateQueryTextDisplay("");
            updateStatusDetail({
                start: CommonTxtTstr.NA,
                elapsed: CommonTxtTstr.NA,
                remaining: CommonTxtTstr.NA,
                total: CommonTxtTstr.NA,
            });
            updateOutputSection(id, true);
        }
        $query.remove();
        $('.tooltip').hide();
    };

    QueryManager.fail = function(id) {
        QueryManager.removeQuery(id);
    };

    QueryManager.check = function(forceStop) {
        if (forceStop || !$("#monitor-queries").hasClass("active") ||
            !$('#monitorTab').hasClass('active')) {
            for (var timer in queryCheckLists) {
                clearInterval(queryCheckLists[timer]);
            }
        } else {
            // check queries
            for (var xcQuery in queryLists) {
                var query = queryLists[xcQuery];
                if (query.state !== "done") {
                    if (query.type === "xcFunction") {
                        for (var i = 0; i < query.subQueries.length; i++) {
                            if (query.subQueries[i].state !== "done") {
                                if (query.subQueries[i].queryName) {
                                    outerQueryCheck(query.getId());
                                } else {
                                    subQueryCheck(query.subQueries[i]);
                                }
                                break;
                            }
                        }
                    } else {
                        mainQueryCheck(query.getId());
                    }
                }
            }
        }
    };

    // XX used for testing;
    QueryManager.getAll = function() {
        return ({
            queryLists: queryLists,
            queryCheckLists: queryCheckLists
        });
    };

    function runXcQuery(id, mainQuery, subQueries) {
        for (var i = 0; i < subQueries.length; i++) {
            var time = new Date().getTime();
            var subQuery = new XcSubQuery({
                "name"    : subQueries[i].name,
                "time"    : time,
                "query"   : subQueries[i].query,
                "dstTable": subQueries[i].dstTable,
                "id"      : id,
                "index"   : mainQuery.subQueries.length
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
    function mainQueryCheck(id) {
        var mainQuery = queryLists[id];
        clearInterval(queryCheckLists[id]);
        check();
        queryCheckLists[id] = setInterval(check, checkInterval);

        function check() {
            mainQuery.check()
            .then(function(res) {
                if (!queryLists[id]) {
                    return;
                }
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    clearInterval(queryCheckLists[id]);
                    QueryManager.queryDone(id);
                    return;
                }

                var step = res.numCompletedWorkItem;
                mainQuery.currStep = step;
                if (state === QueryStateT.qrError) {
                    clearInterval(queryCheckLists[id]);
                    updateQueryBar(id, res, true);
                } else {
                    subQueryCheckHelper(mainQuery.subQueries[step], id, step);
                }
            })
            .fail(function(error) {
                console.error("Check failed", error);
                updateQueryBar(id, null, error);
                clearInterval(queryCheckLists[id]);
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
            subQueries[i].state = "done";
        }
    }

    // checks a group of subqueries by checking the single query name they're
    // associated with
    function outerQueryCheck(id) {
        if (!queryLists[id]) {
            console.error("error case");
            return;
        } else if (!$("#monitor-queries").hasClass("active") ||
                    !$('#monitorTab').hasClass('active')) {
            return;
        }

        var mainQuery = queryLists[id];
        var firstQueryPos = getFirstQueryPos(mainQuery);
        clearInterval(queryCheckLists[id]);
        check();
        queryCheckLists[id] = setInterval(check, checkInterval);

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
                    clearInterval(queryCheckLists[id]);
                    if (mainQuery.subQueries[mainQuery.currStep]) {
                        if (mainQuery.subQueries[mainQuery.currStep].queryName) {
                            outerQueryCheck(id);
                        } else {
                            subQueryCheck(mainQuery.subQueries[mainQuery.currStep]);
                        }
                    }
                    return;
                } else if (state === QueryStateT.qrError) {
                    clearInterval(queryCheckLists[id]);
                    updateQueryBar(id, res, true);
                } else {
                    subQueryCheckHelper(mainQuery.subQueries[currStep], id, currStep);
                }
            })
            .fail(function(error) {
                console.error("Check failed", error, queryName);
                updateQueryBar(id, null, error);
                clearInterval(queryCheckLists[id]);
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

        var queryName = $target.data("query");
        var queryId = parseInt($target.data("id"));
        $target.siblings(".active").removeClass("active");
        $target.addClass("active");

        // update right section
        var mainQuery = queryLists[queryId];
        var query = (mainQuery == null) ? "" : mainQuery.getQuery();
        var startTime;

        if (mainQuery == null) {
            console.error("cannot find query", queryName);
            query = "";
            startTime = CommonTxtTstr.NA;
        } else {
            query = mainQuery.getQuery();
            startTime = getQueryTime(mainQuery.getTime());
        }

        var totalTime = CommonTxtTstr.NA;
        if (mainQuery.getState() === "done") {
            totalTime = getElapsedTimeStr(mainQuery.getElapsedTime());
        } else if (mainQuery !== null) {
            mainQuery.setElapsedTime();
        }
        updateStatusDetail({
            start: startTime,
            elapsed: getElapsedTimeStr(mainQuery.getElapsedTime()),
            remaining: CommonTxtTstr.NA,
            total: totalTime
        });
        updateQueryTextDisplay(query);
        updateOutputSection(queryId);
    }

    function updateQueryTextDisplay(query) {
        if (query) {
            query = query.replace(/;/g, ";<br>");
        }
        $queryDetail.find(".operationSection .content").html(query);
    }

    function updateStatusDetail(info, id) {
        if (id != null) {
            // do not update detail if not focused on this query bar
            if (!$queryList.find('.query[data-id="' + id + '"]').hasClass('active')) {
                return;
            }
        }
        for (var i in info) {
            $statusDetail.find('.' + i).find('.text').text(info[i]);
        }
    }

    function updateOutputSection(id, forceInactive) {
        if (forceInactive) {
            $("#monitor-inspect").addClass('btnInactive');
            $("#monitor-export").addClass('btnInactive');
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
        if (queryState === "done" && dstTableState === "active" &&
            mainQuery.getOutputTableName()) {
            var dstTableName = mainQuery.getOutputTableName();
            $("#monitor-inspect").removeClass('btnInactive');
            
            if (dstTableName.indexOf(gDSPrefix) < 0) {
                $("#monitor-export").removeClass('btnInactive');
                $queryDetail.find('.outputSection').find('.text')
                                               .text(dstTableName);
            } else {
                $queryDetail.find('.outputSection').find('.text')
                            .text(dstTableName.slice(gDSPrefix.length));
                $("#monitor-export").addClass('btnInactive');
            }
        } else {
            $("#monitor-inspect").addClass('btnInactive');
            $("#monitor-export").addClass('btnInactive');
            $queryDetail.find('.outputSection').find('.text')
                         .text(CommonTxtTstr.NA);
        }
    }

    function subQueryCheck(subQuery) {
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
        clearInterval(queryCheckLists[id]);
        checkFuc();
        queryCheckLists[id] = setInterval(checkFuc, checkInterval);

        function checkFuc() {
            subQueryCheckHelper(subQuery, id, subQuery.index);
        }
    }

    function subQueryCheckHelper(subQuery, id, step) {
        if (subQuery.state === "done") {
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
                    $query.find('.querySteps').text('step ' + (currStep + 1) + ' of ' + numSteps);
                }
                return;
            } else {
                updateQueryBar(id, res);
                mainQuery.setElapsedTime();
                updateStatusDetail({
                    start: getQueryTime(mainQuery.getTime()),
                    elapsed: getElapsedTimeStr(mainQuery.getElapsedTime()),
                    remaining: CommonTxtTstr.NA,
                    total: CommonTxtTstr.NA
                }, id);
            }
        })
        .fail(function(error) {
            console.error("Check failed", error);
            updateQueryBar(id, null, error);
            clearInterval(queryCheckLists[id]);
        });
    }

    function updateQueryBar(id, progress, isError) {
        var $query = $queryList.find('.query[data-id="' + id + '"]');
        if (progress == null) {
            if (isError) {
                $query.removeClass("processing").addClass("error");
            }
            return;
        }
        var mainQuery = queryLists[id];
        var currStep = mainQuery.currStep;
        var numSteps = mainQuery.numSteps;

        var $progressBar = $query.find(".progressBar");
        var newClass = null;

        if (progress >= 100 && ((numSteps > 0 && currStep >= numSteps) ||
            (mainQuery.state === "done"))) {
            progress = "100%";
            newClass = "done";
            $query.find('.cancelIcon').addClass('disabled');
        } else if (isError) {
            progress = progress + "%";
            newClass = "error";
        } else {
            progress = progress + "%";
        }

        // set width to 0 if new step is started unless it's past the last step
        if (parseInt($progressBar.data('step')) !== currStep &&
            currStep !== numSteps) {
            $progressBar.stop().width(0).data('step', currStep);
        }

        // .stop() stops any previous animation;
        $progressBar.stop().animate({"width": progress}, checkInterval, "linear", function() {
            if (newClass != null) {
                $query.removeClass("processing").addClass(newClass);
                if (newClass === "done") {
                    $query.find('.querySteps').text('completed');
                    clearInterval(queryCheckLists[id]);
                    delete queryCheckLists[id];
                }
            }
        });
        
        var displayedStep;
        if (currStep <= numSteps) {  
            displayedStep = Math.min(currStep + 1, numSteps);
            $query.find('.querySteps').text('step ' + displayedStep + ' of ' + numSteps);
        } else if (numSteps === -1) {
            displayedStep = Math.min(currStep + 1, mainQuery.subQueries.length);
            $query.find('.querySteps').text('step ' + displayedStep);
        }
    }

    function getQueryByName(queryName) {
        for (var i = 0, len = queryLists.length; i < len; i++) {
            var xcQuery = queryLists[i];
            if (xcQuery != null && xcQuery.getFullName() === queryName) {
                return xcQuery;
            }
        }

        return null;
    }

    function getQueryList(queryName) {
        var $query = $queryList.find(".query").filter(function() {
            return $(this).data("query") === queryName;
        });
        return $query;
    }

    function getQueryTime(time) {
        return xcHelper.getTime(null, time) + " " +
               xcHelper.getDate(null, null, time);
    }

    function getElapsedTimeStr(millseconds) {
        var s = Math.floor(millseconds / 1000);
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

        if (millseconds < 1000) {
            timeString += millseconds + "ms";
        } else {
            timeString += seconds + "s";
        }

        return (timeString);
    }

    function addEventHandlers() {
        $queryList.on("click", ".query", function(event) {
            var $clickTarget = $(event.target);
            var id = $clickTarget.closest('.query').data('id');

            if ($clickTarget.hasClass('deleteIcon')) {
                QueryManager.removeQuery(id);
            } else if ($clickTarget.hasClass('cancelIcon')) {
                cancelAttempt(id);
            } else {
                focusOnQuery($(this));
            }
        });

        $("#monitor-inspect").on('click', function() {
            focusOnOutput();
        });

        $("#monitor-export").on('click', function() {
            focusOnOutput();
        });

        function focusOnOutput() {
            var queryId = parseInt($queryList.find('.query.active').data('id'));
            var mainQuery = queryLists[queryId];
            var tableName = mainQuery.getOutputTableName();

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
                return;
            }

            if (gTables[tableId]) {
                $('#workspaceTab').click();
                if (gTables[tableId].status === TableType.Active) {
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
                } else {
                    tableType = TableType.Archived;
                }
                wsId = WSManager.getActiveWS();
                WSManager.moveInactiveTable(tableId, wsId, tableType);
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
            $('#inButton').click();

            var folderId = DS.getDSObj(dsId).parentId;
            DS.goToDir(folderId);
            DS.focusOn($grid);
        }

        function focusOutputErrorHandler(type, mainQuery) {
            var typeUpper = type[0].toUpperCase() + type.slice(1);
            var title = xcHelper.replaceMsg(ErrWRepTStr.OutputNotFound, {
               "name": typeUpper 
            });
            var desc = xcHelper.replaceMsg(ErrWRepTStr.OutputNotExists, {
               "name": typeUpper 
            });

            Alert.error(title, desc);
            mainQuery.outputTableState = 'deleted';
            $('#monitor-inspect').addClass('btnInactive');
            $("#monitor-export").addClass('btnInactive');
            $queryDetail.find('.outputSection').find('.text')
                                               .text(CommonTxtTstr.NA);
        }

        function cancelAttempt(id) {
            var mainQuery = queryLists[id];
            if (mainQuery.state === "done") {
                console.warn('operation is done, cannot cancel');
                return;
            }
            var $query = $queryList.find('.query[data-id="' + id + '"]');
            var currStep = mainQuery.currStep;
            var canceled = false;

            // this is a xcalar query so we must cancel all future subqueries
            if (!mainQuery.subQueries[currStep]) {
                Transaction.cancel(id);
                console.warn('step vs query mismatch');
                return;
            }
            
            if (mainQuery.subQueries[currStep].queryName) {
                var subQuery;
                var subQueryName;
                var statusesToIgnore;
                var cancelSent = false;
                for (var i = currStep; i < mainQuery.subQueries.length; i++) {
                    subQuery = mainQuery.subQueries[i];
                    if (notCancelableList.indexOf(subQuery.name) !== -1) {
                        continue;
                    }
                    // only set pending cancel once
                 
                    if (!cancelSent) {
                        Transaction.pendingCancel(id);
                        $query.find('.cancelIcon').addClass('disabled');
                        cancelSent = true;
                    }
                    
                    statusesToIgnore = [StatusT.StatusDagNodeNotFound,
                                            StatusT.StatusOperationHasFinished];
                    XcalarCancelOp(subQuery.dstTable, statusesToIgnore)
                    .then(function(ret) {
                        // only cancel once
                        if (!canceled) {
                            Transaction.isCanceled(id);
                            canceled = true;
                            console.info('cancel submitted', ret);
                        }
                    })
                    .fail(function(error) {
                        // errors being handled inside XcalarCancelOp
                    });
                }
            } else {
            // canceling a regular operation
                Transaction.pendingCancel(id);
                $query.find('.cancelIcon').addClass('disabled');
                // start cancel before xcalarcancelop returns
                // so that if we miss the table, xcfunctions will stop further
                // actions
                var statusesToIgnore = [StatusT.StatusOperationHasFinished];
                XcalarCancelOp(mainQuery.subQueries[currStep].dstTable, 
                               statusesToIgnore)
                .then(function(ret) {
                    Transaction.isCanceled(id);
                    console.info('cancel submitted', ret);
                })
                .fail(function(error) {
                    // errors being handled inside XcalarCancelOp
                });
            }
        }
    }

    function getQueryHTML(xcQuery) {
        var id = xcQuery.getId();
        var time = xcQuery.getTime();
        var date = getQueryTime(time);
        var queryName = xcQuery.getFullName();
        var cancelClass = xcQuery.cancelable ? "" : " disabled";
        var html =
            '<div class="query processing" data-id="' + id +
                '" data-query="' + queryName + '">' +
                '<div class="headBar"></div>' +
                '<div class="queryInfo">' +
                    '<div class="name">' +
                        xcQuery.getName() +
                    '</div>' +
                    '<div class="date">' +
                        CommonTxtTstr.StartTime + ": " + date +
                    '</div>' +
                '</div>' +
                '<div class="queryProgress">' +
                    '<div class="barIcon icon"></div>' +
                    '<div class="barContainer">' +
                        '<div class="progressBar" style="width:0%" data-step="0"></div>' +
                    '</div>' +
                    '<div class="refreshIcon icon"></div>' +
                    '<div class="deleteIcon icon" data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        TooltipTStr.RemoveQuery + '"></div>' +
                    '<div class="divider"></div>' +
                    // '<div class="inspectIcon icon"></div>' +
                    '<div class="cancelIcon icon ' + cancelClass +
                        '" data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        TooltipTStr.CancelQuery + '"></div>' +
                '</div>' +
                '<div class="querySteps">' +
                '</div>' +
            '</div>';
        return html;
    }

    return (QueryManager);
}({}, jQuery));
