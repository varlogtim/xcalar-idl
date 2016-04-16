window.QueryManager = (function(QueryManager, $) {
    var $queryList;   // $("#monitor-queryList")
    var $queryDetail; // $("#monitor-queryDetail")

    var queryLists = [];
    var queryCheckLists = [];

    // constant
    var checkInterval = 2000; // check query every 2s

    QueryManager.setup = function() {
        initialize();

        $queryList.on("click", ".query", function() {
            focuOnQuery($(this));
        });
    };

    QueryManager.test = function() {
        var ds1 = "cheng." + xcHelper.randName("yelpUser");
        var ds2 = "cheng." + xcHelper.randName("yelpReviews");
        var query = 'load --url "file:///var/tmp/yelp/user" ' +
                    '--format json --size 0B --name "' + ds1 + '";' +
                    'load --url "file:///var/tmp/yelp/reviews" ' +
                    '--format json --size 0B --name "' + ds2 + '";';
        QueryManager.addQuery("test", query);
    };

    QueryManager.addQuery = function(name, query) {
        var time = new Date().getTime();
        var fullName = name + "-" + time;
        var xcQuery = new XcQuery({
            "name"    : name,
            "fullName": fullName,
            "time"    : time,
            "query"   : query
        });

        queryLists.push(xcQuery);
        var $query = $(getQueryHTML(xcQuery));
        $queryList.find(".hint").hide()
                  .end()
                  .append($query);
        focuOnQuery($query);

        xcQuery.run()
        .then(function() {
            queryCheck(xcQuery);
        })
        .fail(function(error) {
            Alert.error(ErrTStr.InvalidQuery, error);
        });
    };

    QueryManager.check = function(forceStop) {
        if (forceStop || !$("#monitor-queries").hasClass("active")) {
            queryCheckLists.forEach(function(timer) {
                if (timer != null) {
                    clearTimeout(timer);
                }
            });
        } else {
            // check queries
            queryLists.forEach(function(xcQuery) {
                queryCheck(xcQuery);
            });
        }
    };

    function initialize() {
        $queryList = $("#monitor-queryList");
        $queryDetail = $("#monitor-queryDetail");
    }

    function focuOnQuery($target) {
        if ($target.hasClass("active")) {
            return;
        }

        var queryName = $target.data("query");
        $target.siblings(".active").removeClass("active");
        $target.addClass("active");

        // update right section
        var xcQuery = getQueryByName(queryName);
        var query = (xcQuery == null) ? "" : xcQuery.getQuery();
        var startTime;

        if (xcQuery == null) {
            console.error("cannot find query", queryName);
            query = "";
            startTime = "N/A";
        } else {
            query = xcQuery.getQuery();
            startTime = getQueryTime(xcQuery.getTime());
        }

        $queryDetail.find(".statusSection .start .text").text(startTime);
        $queryDetail.find(".operationSection .content").text(query);
    }

    function queryCheck(xcQuery) {
        var index = queryLists.indexOf(xcQuery);
        if (index < 0) {
            console.error("error case");
            return;
        }

        var queryName = xcQuery.getFullName();
        checkFuc();

        function checkTimer() {
            var timer = setTimeout(checkFuc, checkInterval);
            if (queryCheckLists[index] != null) {
                console.warn("Query check timer is not cleand!");
                clearTimeout(queryCheckLists[index]);
            }
            queryCheckLists[index] = timer;
        }

        function checkFuc() {
            queryCheckLists[index] = null;

            xcQuery.check()
            .then(function(res) {
                var state = res.queryState;
                if (state === QueryStateT.qrFinished) {
                    updateQuery(queryName, 1);
                    return;
                }

                var total = res.numCompletedWorkItem +
                            res.numFailedWorkItem +
                            res.numQueuedWorkItem +
                            res.numRunningWorkItem;
                var progress = res.numCompletedWorkItem / total;

                if (state === QueryStateT.qrError) {
                    updateQuery(queryName, progress, true);
                } else {
                    updateQuery(queryName, progress);
                    // ready for another check
                    checkTimer();
                }
            })
            .fail(function(error) {
                console.error("Check failed", error);
                updateQuery(queryName, null, error);
            });
        }
    }

    function updateQuery(queryName, progress, isError) {
        var $query = getQueryList(queryName);
        if (progress == null) {
            if (isError) {
                $query.removeClass("processing").addClass("error");
            }
            return;
        }

        var $progressBar = $query.find(".progressBar");
        var newClass = null;

        if (progress >= 1) {
            progress = "100%";
            newClass = "done";
        } else if (isError) {
            progress = progress * 100 + "%";
            newClass = "error";
        } else {
            progress = progress * 100 + "%";
        }

        $progressBar.animate({"width": progress}, checkInterval, "linear", function() {
            if (newClass != null) {
                $query.removeClass("processing").addClass(newClass);
            }
        });
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

    function getQueryHTML(xcQuery) {
        var time = xcQuery.getTime();
        var date = getQueryTime(time);
        var queryName = xcQuery.getFullName();
        var html =
            '<div class="query processing" data-query="' + queryName + '">' +
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
                        '<div class="progressBar" style="width:0%"></div>' +
                    '</div>' +
                    '<div class="refreshIcon icon"></div>' +
                    '<div class="deleteIcon icon"></div>' +
                    '<div class="divider"></div>' +
                    '<div class="inspectIcon icon"></div>' +
                '</div>' +
            '</div>';
        return html;
    }

    return (QueryManager);
}({}, jQuery));
