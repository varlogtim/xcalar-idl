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
        "distinct": "select distinct(l_returnflag) from lineitem3",
        "gbCount": "select count(*) from lineitem3 group by l_returnflag",
        "gbTrivialAlias": "select l_returnflag as A, l_returnflag from lineitem3 group by l_returnflag",
        "gbFG": "select avg(l_tax) * avg(l_extendedprice) from lineitem3 group by l_returnflag",
        "gbGF": "select avg(l_tax * l_extendedprice) from lineitem3 group by l_returnflag",
        "gbFGF": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) from lineitem3 group by l_returnflag",
        "gbAllNoGBClause": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) as A, avg(l_tax * l_extendedprice) from lineitem3",
        "gbAll": "select avg(l_tax + l_extendedprice) * avg(l_extendedprice) as A, l_returnflag as B, avg(l_tax * l_extendedprice) from lineitem3 group by l_returnflag",
        "gbDistinct": "select sum(distinct l_quantity) as a, max(distinct l_quantity), avg(distinct l_quantity) as b from lineitem3 group by l_shipmode",
        "gtJoin": "select * from customer4, nation4 where c_nationkey > n_nationkey",
        // Doesn't work yet
        "gtJoinWithSubQuery": "select * from nation4, customer4 where c_nationkey - (select avg(c_nationkey) from customer4) > n_nationkey - (select avg(n_nationkey) from nation4)",
        "gbWithMapStr": "select avg(l_tax), l_tax/2 from lineitem3 group by l_tax/2",
        "joinWithCollision": "select * from region r1, region r2 where r1.r_regionkey = r2.r_regionkey",
        "aliasCollision": "select * from (select r_regionkey as key from region) as t1, (select r_regionkey as key from region) as t2 where t1.key = t2.key",
        // Doesn't work yet. Returns empty result
        "crossJoin": "select * from nation n1, nation n2 where (n1.n_name = \"FRANCE\" and n2.n_name = \"GERMANY\") or (n1.n_name = \"GERMANY\" and n2.n_name = \"FRANCE\")",
        "dateExpr": "select year(o_orderdate) from orders",
        // "dateExpWithTS": "select year(timestamp(someTimestampCol)) from table",
    };
    var tpchCases = {
        "q1": "select l_returnflag, l_linestatus, sum(l_quantity) as sum_qty," +
              " sum(l_extendedprice) as sum_base_price, sum(l_extendedprice *" +
              " (1 - l_discount)) as sum_disc_price, sum(l_extendedprice * (1" +
              " - l_discount) * (1 + l_tax)) as sum_charge, avg(l_quantity)" +
              " as avg_qty, avg(l_extendedprice) as avg_price, avg(l_discount)" +
              " as avg_disc, count(*) as count_order from lineitem where " +
              "l_shipdate <= date \"1998-12-01\" - interval \"90\" day group by" +
              " l_returnflag, l_linestatus order by l_returnflag, l_linestatus",
        "q2": "select s_acctbal, s_name, n_name, p_partkey, p_mfgr, s_address," +
              " s_phone, s_comment from part, supplier, partsupp, nation, " +
              "region where p_partkey = ps_partkey and s_suppkey = ps_suppkey" +
              " and p_size = 15 and p_type like \"%BRASS\" and s_nationkey = " +
              "n_nationkey and n_regionkey = r_regionkey and r_name = \"EUROPE\"" +
              " and ps_supplycost = (select min(ps_supplycost) from partsupp," +
              " supplier, nation, region where p_partkey = ps_partkey and " +
              "s_suppkey = ps_suppkey and s_nationkey = n_nationkey and " +
              "n_regionkey = r_regionkey and r_name = \"EUROPE\" )order by " +
              "s_acctbal desc, n_name, s_name, p_partkey",
    }
    var test;
    SqlTestSuite.runSqlTests = function() {
        var tableNames = {};
        test = TestSuite.createTest();
        setUpTpchDatasets(tableNames, test)
        .then(function() {
            for (var testCase in sqlTestCases) {
                var testName = testCase;
                var sqlString = sqlTestCases[testCase];
                console.log("Test name: " + testName);
                console.log(sqlString);
                // TODO: Actually pass these into the panel and trigger the tests
            }
            for (var testCase in tpchCases) {
                var testName = testCase;
                var sqlString = tpchCases[testCase];
                console.log("TPCH Test name: " + testName);
                console.log(sqlString);
                // TODO: Actually pass these into the panel and trigger the tests
            }
        });
    };
    function doAll(test, tableName, randId, dataPath, check) {
        var deferred = jQuery.Deferred();
        // Load datasets
        loadDatasets(test, tableName, randId, dataPath, check)
        .then(function() {
            // Create tables
            $("#dataStoresTab").click();
            return createTables(test, tableName, randId);
        })
        .then(function() {
            // Remove extra columns
            var tableId = gActiveTableId;
            return removeColumns(tableId);
        })
        .then(function() {
            // Cast data types
        })
        .then(function() {
            // Finalize table
        })
        .then(function() {
            // Send schema
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }
    function loadDatasets(test, tableName, randId, dataPath, check) {
        return test.loadDS(tableName + "_" + randId, dataPath, check);
    }
    function createTables(test, tableName, randId) {
        return test.createTable(tableName + "_" + randId);
    }
    function removeColumns(tableId) {
        return ColManager.hideCol([gTables[tableId].getNumCols() - 1], tableId, {noAnimate:true});
    }
    function castColumns(tableId) {
        // XXX TO-DO
    }
    function finalizeTables(tableId) {
        // XXX TO-DO
    }
    function sendSchema(tableId) {
        // XXX TO-DO
    }
    function setUpTpchDatasets(tableStruct, test) {
        var deferred = jQuery.Deferred();
        var dataSource = testDataLoc + "/tpch_sf1/";
        // var tableNames = ["customer", "lineitem", "nation", "orders", "part",
        //                   "partsupp", "region", "supplier"];
        // var check = ["#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')",
        //              "#previewTable td:eq(1):contains('')"];
        var tableNames = ["region", "nation"];
        var checkList = ["#previewTable td:eq(1):contains('')",
                     "#previewTable td:eq(1):contains('')"];
        var randId = Math.floor(Math.random() * 1000);
        var promiseArray = [];
        for (var i = 0; i < tableNames.length; i++) {
            var dataPath = dataSource + tableNames[i] + ".tbl";
            tableStruct[tableNames[i]] = randId;
            var tableName = tableNames[i];
            var check = checkList[i];
            promiseArray.push(doAll.bind(window, test, tableName, randId,
                                         dataPath, check));
        }
        PromiseHelper.chain(promiseArray)
        .then(function() {
            deferred.resolve(tableStruct);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }
    return (SqlTestSuite);
}(jQuery, {}));













