window.QueryManager = (function(QueryManager, $) {
    var $queryList;   // $("#monitor-queryList")
    var $queryDetail; // $("#monitor-queryDetail")
    var $statusDetail; // $queryDetail.find('.statusSection')
    var queryLists = {}; // will be populated by xcQuery objs with transaction id as key
    var queryCheckLists = {}; // setInterval timers

    // constant
    var checkInterval = 2000; // check query every 2s

    QueryManager.setup = function() {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");
        $statusDetail = $queryDetail.find('.statusSection');

        addEventHandlers();
    };

    // XX don't use this, we don't handle queries that don't output tables
    QueryManager.test = function() {
        var ds1 = "cheng." + xcHelper.randName("yelpUser");
        var ds2 = "cheng." + xcHelper.randName("yelpReviews");
        var query = 'load --url "file:///var/tmp/yelp/user" ' +
                    '--format json --size 0B --name "' + ds1 + '";' +
                    'load --url "file:///var/tmp/yelp/reviews" ' +
                    '--format json --size 0B --name "' + ds2 + '";';
        QueryManager.addQuery(0, "test", -1, query);
    };

    // if numSteps is unknown, should take in -1
    // query is only passed in if this is an actual xcalarQuery (not xcFunction)
    QueryManager.addQuery = function(id, name, numSteps, query) {
        var time = new Date().getTime();
        var fullName = name + "-" + time;
        var type;
        var subQueries;
        if (query) {
            type = "xcQuery";
            subQueries = parseQuery(query);
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
            "numSteps": numSteps
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

    QueryManager.addSubQuery = function(id, name, dstTable, query) {
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
            "index"   : mainQuery.subQueries.length
        });
        mainQuery.addSubQuery(subQuery);
        if (mainQuery.currStep === mainQuery.subQueries.length - 1) {
            subQueryCheck(subQuery);
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
        if (mainQuery.type === "xcFunction") {
            for (var i = 0; i < mainQuery.subQueries.length; i++) {
                var subQuery = mainQuery.subQueries[i];
                if (subQuery.dstTable === dstTable) {
                    subQuery.state = "done";
                    if (mainQuery.currStep === i) {
                        incrementStep(mainQuery);
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
                                subQueryCheck(subQuery);
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
                                subQueryCheck(query.subQueries[i]);
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

    function mainQueryCheck(id) {
        var mainQuery = queryLists[id];
        var lastStep = mainQuery.currStep;
        clearInterval(queryCheckLists[id]);
        check();
        queryCheckLists[id] = setInterval(check, 500);

        function check() {
            mainQuery.check()
            .then(function(res) {
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

    // used to split query into array of subqueries by semicolons
    function parseQuery(query) {
        var tempString = "";
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        var queries = [];
        var subQuery;
        var operationName;

        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                tempString += query[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === "\"" && !singleQuote) ||
                    (query[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === "\\") {
                isEscaped = true;
                tempString += query[i];
            } else if (inQuotes) {
                tempString += query[i];
            } else {
                if (query[i] === ";") {
                    tempString = tempString.trim();
                    operationName = tempString.split(" ")[0];
                    subQuery = {
                        query: tempString,
                        name: operationName,
                        dstTable: getDstTableFromQuery(tempString, operationName)
                    };
                    queries.push(subQuery);
                    tempString = "";
                } else if (tempString === "" && query[i] === " ") {
                    // a way of trimming the front of the string
                    continue;
                } else {
                    tempString += query[i];
                }
            }
        }
        if (tempString.trim().length) {
            tempString = tempString.trim();
            operationName = tempString.split(" ")[0];
            subQuery = {
                query: tempString,
                name: operationName,
                dstTable: getDstTableFromQuery(tempString, operationName)
            };
            queries.push(subQuery);
        }

        return (queries);
    }

    function getDstTableFromQuery(query, type) {
        var keyWord = "--dsttable";
        if (type) {
            if (type === "join") {
                keyWord = "--joinTable";
            }
        }
        var index = getKeyWordIndexFromQuery(query, keyWord);
        var singleQuote;

        index += keyWord.length;
        query = query.slice(index).trim();
        var quote = query[0];
        if (quote !== "'" && quote !== '"') {
            console.error('table name is not wrapped in quotes');
            return null;
        }
        query = query.slice(1);

        var isEscaped = false;
        var tableName = "";
        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                tableName += query[i];
                continue;
            }
            if (query[i] === "\\") {
                isEscaped = true;
                tableName += query[i];
            } else if (query[i] === quote) {
                break;
            } else {
                tableName += query[i];
            }
        }
        return (tableName);
    }

    function getKeyWordIndexFromQuery(query, keyWord) {
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        var keyLen = ("" + keyWord).length;
        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === "\"" && !singleQuote) ||
                    (query[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === "\\") {
                isEscaped = true;
            } else if (!inQuotes) {
                if (i >= keyLen && query.slice(i - keyLen, i) === keyWord) {
                    return (i - keyLen);
                }
            }
        }
        return -1;
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
        $queryDetail.find(".operationSection .content").text(query);
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
        var mainQuery = queryLists[id]
        var queryState = mainQuery.getState();
        var dstTableState = mainQuery.getOutputTableState();
        if (queryState === "done" && dstTableState === "active") {
            $("#monitor-inspect").removeClass('btnInactive');
            $("#monitor-export").removeClass('btnInactive');
            $queryDetail.find('.outputSection').find('.text')
                         .text(mainQuery.getOutputTableName());
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

        if (currStep < numSteps) {
            $query.find('.querySteps').text('step ' + (currStep + 1) + ' of ' + numSteps);
        } else if (numSteps === -1) {
            $query.find('.querySteps').text('step ' + (currStep + 1));
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
            } else {
                focusOnQuery($(this));
            }
        });

        $("#monitor-inspect").on('click', function() {
            focusOnTable();
        });

        $("#monitor-export").on('click', function() {
            focusOnTable();
        });

        function focusOnTable() {
            var queryId = parseInt($queryList.find('.query.active').data('id'));
            var mainQuery = queryLists[queryId];
            var tableName = mainQuery.getOutputTableName();
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
                        Alert.error("Table Not Found", "Table no longer exists.");
                        mainQuery.outputTableState = 'deleted';
                        $('#monitor-inspect').addClass('btnInactive');
                        $("#monitor-export").addClass('btnInactive');
                        $queryDetail.find('.outputSection').find('.text')
                                     .text(CommonTxtTstr.NA);
                    }
                });
            }
        }
    }

    function getQueryHTML(xcQuery) {
        var id = xcQuery.getId();
        var time = xcQuery.getTime();
        var date = getQueryTime(time);
        var queryName = xcQuery.getFullName();
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
                    '<div class="deleteIcon icon"></div>' +
                    '<div class="divider"></div>' +
                    '<div class="inspectIcon icon"></div>' +
                '</div>' +
                '<div class="querySteps">' +
                '</div>' +
            '</div>';
        return html;
    }

    return (QueryManager);
}({}, jQuery));
