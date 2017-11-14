window.SqlTestSuite = (function($, SqlTestSuite) {
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
        "gbWithoutGroup": "select avg(l_tax) from lineitem3", // We are producing the WRONG answer. this should be an integer average
        "gbTrivial": "select l_returnflag from lineitem3 group by l_returnflag",
        "gbCount": "select count(*) from lineitem3 group by l_returnflag",
        "gbTrivialAlias": "select l_returnflag as A, l_returnflag from lineitem3 group by l_returnflag",
        "gbFG": "select avg(l_tax) * avg(l_extendedprice) from lineitem3 group by l_returnflag",
        "gbGF": "select avg(l_tax * l_extendedprice) from lineitem3 group by l_returnflag",
        "gbFGF": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) from lineitem3 group by l_returnflag",
        "gbAllNoGBClause": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) as A, avg(l_tax * l_extendedprice) from lineitem3",
        "gbAll": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) as A, l_returnflag as B, avg(l_tax * l_extendedprice) from lineitem3 group by l_returnflag",

    };

    SqlTestSuite.runSqlTests = function() {
        for (var test in sqlTestCases) {
            var testName = test;
            var sqlString = sqlTestCases[test];
            console.log("Test name: " + testName);
            console.log(sqlString);
            // TODO: Actually pass these into the panel and trigger the tests
        }
    };
}(jQuery, {}));