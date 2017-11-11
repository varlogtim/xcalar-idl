window.TestSuite = (function($, TestSuite) {
    var sqlTestCases = {
        "filterWithAggregates": "select p_name, p_partkey from part1 where  " +
            "p_partkey > avg(p_partkey) - avg(p_partkey) / 10",
        "complexGroupBy": "select avg(p_partkey * 3 + p_size * 1000000) from PART" +
            "group by p_mfgr",
        "groupByAlias": "select avg(p_partkey) as p from PART group by p_mfgr",
        "in": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\", \"24\")",
        "inSingle": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\")",
        "in3": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\", \"24\", \"25\")",
        "inNested": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\") or substr(P_brand, 7, 2) = \"25\"",
        "inNested2": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\", \"24\") or substr(P_brand, 7, 2) = \"25\"",
        "inNestedNested": "select P_BRAND from PART1 where substr(P_brand, 7, 2) in " +
            "(\"23\", \"24\") or substr(P_brand, 7, 2) in (\"25\", \"26\")",
        "mapAlias": "select l_commitdate, l_tax as tax, l_extendedprice * " +
                    "(1 - l_discount) as amount from lineitem3",
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