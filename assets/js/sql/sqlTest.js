window.TestSuite = (function($, TestSuite) {
    var sqlTestCases = {
        "filterWithAggregates": "select p_name, p_partkey from part1 where  " +
            "p_partkey > avg(p_partkey) - avg(p_partkey) / 10",
        "complexGroupBy": "select avg(p_partkey * 3 + p_size * 1000000) from PART" +
            "group by p_mfgr",
        "groupByAlias": "select avg(p_partkey) as p from PART group by p_mfgr",
    };

    TestSuite.runSqlTests = function() {
        for (var test in sqlTestCases) {
            var testName = test;
            var sqlString = sqlTestCases[test];
            console.log("Test name: " + testName);
            console.log(sqlString);
            // TODO: Actually pass these into the panel and trigger the tests
        }
    };
}(jQuery, {}));