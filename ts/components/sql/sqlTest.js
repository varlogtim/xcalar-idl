window.SqlTestSuite = (function($, SqlTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 1800000; // 30min
    var sqlTestCases = {
        "filterWithAggregates": "select n_nationkey, n_name from nation where  " +
            "n_nationkey > avg(n_nationkey) - avg(n_regionkey) /10 order by n_nationkey",
        "complexGroupBy": "select avg(n_regionkey * 3 + n_nationkey * 1000000) a from " +
            "nation group by n_regionkey order by a",
        "groupByAlias": "select n_regionkey r, avg(n_nationkey) as p from nation group by r order by r",
        "in": "select n_name from nation where substr(n_name, 3, 2) in (\'IT\', \'GE\') order by n_name",
        "inSingle": "select n_name from nation where substr(n_name, 3, 2) in (\'IT\') order by n_name",
        "in3": "select n_name from nation where substr(n_name, 3, 2) in " +
            "(\'IT\', \'GE\', \'HI\') order by n_name",
        "inNested": "select n_name from nation where substr(n_name, 3, 2) in " +
            "(\'IT\') or substr(n_name, 3, 2) = \'YP\' order by n_name",
        "inNested2": "select r_regionkey from region where substr(r_name,1,1) " +
            "in (\'1\', \'A\') or substr(r_name,1,2) = \'EU\' order by r_regionkey",
        "inNestedNested": "select n_name from nation where substr(n_name, 3, 2) in " +
            "(\'IT\', \'RM\') or substr(n_name, 3, 2) in (\'YP\', \'RO\') order by n_name",
        "mapAlias": "select n_name, n_regionkey comment, n_nationkey * " +
                    "(1 - n_regionkey) as nonsense from nation order by n_name",
        "gbWithoutGroup": "select avg(n_nationkey) from nation",
        "gbTrivial": "select 1 from nation group by n_regionkey",
        "distinct": "select distinct(n_regionkey) from nation order by n_regionkey",
        "gbCount": "select count(*) from nation group by n_regionkey",
        "gbTrivialAlias": "select n_regionkey as a, n_regionkey from nation group by n_regionkey order by a",
        "gbFG": "select avg(n_nationkey) * avg(n_regionkey) a from nation group by n_regionkey order by a",
        "gbGF": "select avg(n_nationkey * n_nationkey) a from nation group by n_regionkey order by a",
        "gbFGF": "select avg(n_nationkey + n_regionkey) * avg(n_nationkey) a from nation group by n_regionkey order by a",
        "gbAllNoGBClause": "select avg(n_nationkey + n_regionkey) * avg(n_nationkey) a, avg(n_nationkey * n_regionkey) from nation",
        "gbAll": "select avg(n_nationkey + n_regionkey) * avg(n_nationkey) a, n_regionkey b, avg(n_nationkey * n_regionkey) from nation group by n_regionkey order by n_regionkey",
        "gbDistinct": "select sum(distinct n_regionkey) as a, avg(distinct n_regionkey) as b, max(distinct n_regionkey) from nation",
        "gtJoin": "select n_nationkey, n_name, n_regionkey from nation where n_nationkey > n_regionkey order by n_nationkey",
        // Doesn't work yet
        // "gtJoinWithSubQuery": "select n_nationkey, r_regionkey from nation, region where n_regionkey - (select avg(n_regionkey) from nation) > r_regionkey - (select avg(r_regionkey) from region)",
        "gbWithMapStr": "select avg(n_nationkey), n_regionkey/2 from nation group by n_regionkey/2 order by n_regionkey/2",
        "joinWithCollision": "select * from region r1, region r2 where r1.r_regionkey = r2.r_regionkey order by r1.r_regionkey",
        "aliasCollision": "select * from (select r_regionkey as key from region) as t1, (select r_regionkey as key from region) as t2 where t1.key = t2.key order by t1.key",
        "crossJoin": "select n1.* from nation n1, nation n2 where (n1.n_name = \"FRANCE\" and n2.n_name = \"GERMANY\") or (n1.n_name = \"GERMANY\" and n2.n_name = \"FRANCE\") order by n1.n_name",
        "dateExpr": "select year(o_orderdate) year from (select * from orders order by o_orderkey limit 20) order by year",
        "joinSemiCatchall": "select * from region r1 where exists(   select *   from region r2   where r2.r_regionkey > r1.r_regionkey) order by r_regionkey",
        "joinAntiCatchall": "select * from region r1 where not exists(   select *   from region r2   where r2.r_regionkey > r1.r_regionkey)",
        "joinSemiOptimize": "select * from nation n1 where exists(   select *   from nation n2   where n2.n_regionkey = n1.n_regionkey and n2.n_nationkey >= n1.n_nationkey) order by n_nationkey",
        "joinAntiOptimize": "select * from nation n1 where not exists(   select *   from nation n2   where n2.n_regionkey = n1.n_regionkey and n2.n_nationkey > n1.n_nationkey) order by n_nationkey",
        "joinCatchall": "select * from region, nation where r_regionkey > n_regionkey order by n_nationkey, r_regionkey",
        "joinOptimizeFilter": "select * from region, nation where r_regionkey*2 = n_regionkey and r_regionkey <> n_nationkey order by n_nationkey, r_regionkey",
        "crossJoinNoFilter": "select * from nation cross join region order by n_nationkey, r_regionkey",
        // "dateExpWithTS": "select year(timestamp(someTimestampCol)) from table",
        "existenceJoin": "select * from region r1 where exists(select * from region r2 where r2.r_regionkey >= r1.r_regionkey) or exists(select * from region r3 where r3.r_regionkey < r1.r_regionkey) order by r_regionkey",
        "existenceJoinCatchAll": "select * from nation n1 where exists(select * from nation n2 where n2.n_regionkey = n1.n_nationkey) or exists(select * from nation n3 where n3.n_nationkey = n1.n_regionkey) order by n_nationkey",
        "orderByExp": "select * from nation order by n_nationkey * n_regionkey, n_nationkey",
        "round": "select round(n_nationkey / n_regionkey) a, round(n_regionkey / n_nationkey, 2) b, round(n_nationkey, -1) c from nation order by n_nationkey",
        "dateAdd": "select date_add(cast(o_orderdate as date), 10) from (select * from orders order by o_orderkey limit 10) order by o_orderkey",
        "subquery": "select * from region where r_regionkey > (select avg(r_regionkey) from region) order by r_regionkey",
        "union": "select * from nation where n_regionkey = 0 union select * from nation where n_regionkey = 4 order by n_nationkey",
        "coalesce": "select coalesce(n_nationkey/n_regionkey, -1) from nation order by n_nationkey",
        "caseWhenIsNull": "select case when n_nationkey/n_regionkey is null then 'NULL' else n_name end from nation order by n_nationkey",
        "windowRank": "select rank() over(partition by n_regionkey order by n_nationkey) a from nation order by n_nationkey",
        "windowEmptyOver": "select sum(n_regionkey) over() a from nation order by n_nationkey",
        "windowEmptyOrder": "select sum(n_nationkey) over(partition by n_regionkey) a from nation order by n_nationkey",
        "windowEmptyPartition": "select lead(n_nationkey, 2, 999) over(order by n_nationkey) a from nation order by n_nationkey",
        "windowAllInOne": "select n_nationkey, n_regionkey, n_name, sum(n_nationkey) over(partition by n_regionkey order by n_nationkey) b, first_value(n_nationkey) over(partition by n_regionkey order by n_nationkey) g, lead(n_name, 2, 999) over(partition by n_regionkey order by n_nationkey) i,  percent_rank() over(partition by n_regionkey order by n_nationkey desc) l, ntile(4) over(partition by n_regionkey order by n_nationkey, n_name asc, n_comment desc) m, row_number() over(partition by n_regionkey, n_comment order by n_nationkey) n, cume_dist() over(partition by n_regionkey order by n_name) o, dense_rank() over(order by n_regionkey, n_comment desc) p from nation order by n_nationkey",
        "rollUp": "select n_regionkey, avg(n_nationkey) from nation group by rollup(n_regionkey) order by n_regionkey",
        "crossJoinEmptyProject": "select r1.* from region r1, region r2 order by r1.r_regionkey",
        "localRelation": "with temp as (select r_regionkey, \'left\' type from region where r_regionkey < 2 union select r_regionkey, \'right\' type from region where r_regionkey > 2) select * from temp where type = \'left\' union select * from temp where type = \'right\' order by r_regionkey",
        "subStringWithLike": "select substr(n_name, n_regionkey+1, 2) from nation where substr(n_name, 1, n_nationkey-n_regionkey) like \'M\%A\%\'",
        "timestamp": "select year(cast(cast(cast(n_nationkey as int) as timestamp) as date)) a, cast(n_regionkey as timestamp) b from nation order by n_nationkey",
        "timestampFromStr": "select cast(cast(n_regionkey as string) as timestamp) from nation order by n_nationkey",
        "caseWhenNoElse": "select case when n_regionkey = 0 then n_nationkey end from nation order by n_nationkey",
        "decimal": "select cast(n_nationkey as decimal(10, 2)) * 10 / 2 from nation order by n_nationkey",
        "intersect": "select * from (select r_regionkey, r_name from region intersect select r_regionkey, r_name from region) order by r_regionkey",
        "except": "select * from region except select * from region",
        "remainder": "select n_nationkey%3 from nation order by n_nationkey",
        "rand": "with temp as (select cast(rand() as int) a from region order by r_regionkey) select * from temp where a != 0",
        "findInSet": "select find_in_set(' ironi', n_comment) from nation order by n_nationkey",
        "expressionsNum1": "select abs(n_nationkey-n_regionkey)/(n_regionkey+1) + n_nationkey*N_regionkey a, cast(n_nationkey as int)&cast(n_regionkey as int) c, cast(n_nationkey as int)|cast(n_regionkey as int) d, cast(n_nationkey as int)^cast(n_regionkey as int) e, ceil(n_nationkey/n_regionkey) f, floor(n_nationkey/n_regionkey) g, sqrt(n_nationkey) b from nation order by n_nationkey",
        "expressionsTrig1": "select pi(), sin(r_regionkey) a, cos(r_regionkey) b, tan(r_regionkey) c, sinh(r_regionkey) d, cosh(r_regionkey) e, tanh(r_regionkey) f, exp(r_regionkey) g from region order by r_regionkey",
        "expressionsTrig2": "select asin(n_regionkey/4) a, acos(n_regionkey/4) b, atan(n_regionkey/4) c, atan2(n_regionkey, n_nationkey) d, degrees(n_nationkey) e, radians(n_nationkey*10) f from nation order by n_nationkey",
        "expressionsNum2": "select ln(n_regionkey) a, log2(n_regionkey) b, log10(n_regionkey) c, pow(n_nationkey, n_regionkey) d, shiftleft(n_nationkey,n_regionkey) e, shiftright(n_nationkey,1) f from nation order by n_nationkey",
        "expressionsLogical": "select n_nationkey>10 a, n_nationkey/n_regionkey>=2 b, n_nationkey != n_regionkey c, n_nationkey=n_regionkey or n_regionkey<3 and n_nationkey <=20 d from nation order by n_nationkey",
        "rlike": "select rlike(n_comment, '+*ly .*') from nation order by n_nationkey",
        "expressionsString1": "select concat(substr(upper(trim(n_comment)),1,2), substr(ltrim(n_comment),1,1),n_name,lower(n_name)) a, substr(rtrim(n_comment),-1,1) b, substring_index(n_name, 'A', 2) c, repeat(replace(n_name, 'A', ' '),2) d from nation order by n_nationkey",
        "expressionsString2": "select n_name like '%RA%' a, n_name like 'E%' b, n_name like'%O' c, length(n_comment) d, left(n_name,3) e, right(n_comment, 2) f from nation order by n_nationkey",
        "expressionsAgg": "select sum(distinct n_regionkey), count(n_comment), max(n_name), min(n_nationkey), avg(n_nationkey) from nation group by n_regionkey order by n_regionkey",
        // XXX have to separately write tests due to backend issue
        "stdSamp": "select std(n_nationkey) from nation group by n_regionkey order by n_regionkey",
        "stdPop": "select stddev_pop(n_nationkey) from nation group by n_regionkey order by n_regionkey",
        "varSamp": "select variance(n_nationkey) from nation group by n_regionkey order by n_regionkey",
        "varPop": "select var_pop(n_nationkey) from nation group by n_regionkey order by n_regionkey",
        "newExps1": "select lpad(n_name, 7, 'a') a, rpad(n_name, 1, 'b') b,/* initcap(n_name) c,*/ reverse(n_name) d, bit_length(n_name) e, octet_length(n_name) f, levenshtein(n_name, n_comment) g, soundex(n_comment) h, ascii(n_name) i, chr(n_nationkey+100) j, format_number(n_nationkey+n_regionkey*1000.1,1) k, format_number(n_nationkey+n_regionkey*1000.1,0) l from nation order by n_nationkey",
        "find": "SELECT instr(N_NAME, 'AN') a, locate('ol', N_COMMENT) b FROM NATION WHERE N_REGIONKEY > (SELECT min(N_REGIONKEY) from NATION) OR N_REGIONKEY < (SELECT N_REGIONKEY FROM NATION ORDER BY N_NATIONKEY limit 1) ORDER BY N_NATIONKEY limit 15",
        "projectRename": "SELECT N_NATIONKEY N_NAME, N_REGIONKEY N_NAME, N_NAME from NATION order BY N_NATIONKEY",
        "dateUDFs1": "SELECT dayofweek(O_ORDERDATE) a, dayofyear(O_ORDERDATE) b, weekofyear(O_ORDERDATE) c from (select O_ORDERKEY, O_ORDERDATE from ORDERS order by O_ORDERKEY limit 30) order by O_ORDERKEY"
    };
    var sqlTestAnswers = {
        "filterWithAggregates": {"row0": ["12", "JAPAN"],
                                 "row3": ["15", "MOROCCO"],
                                 "numOfRows": "13"},
        "complexGroupBy": {"row0": [9400003],
                           "row3": [13600006],
                           "numOfRows": "5"},
        "groupByAlias": {"row4": [4, 11.6],
                         "row3": [3, 15.4],
                         "numOfRows": "5"},
        "in": {"row0": ["ALGERIA"],
               "row3": ["UNITED STATES"],
               "numOfRows": "4"},
        "inSingle": {"row0": ["UNITED KINGDOM"],
                     "numOfRows": "2"},
        "in3": {"row0": ["ALGERIA"],
                "row2": ["ETHIOPIA"],
                "numOfRows": "5"},
        "inNested": {"row0": ["EGYPT"],
                     "numOfRows": "3"},
        "inNested2": {"row1": [1],
                      "numOfRows": "4"},
        "inNestedNested": {"row2": ["MOROCCO"],
                           "numOfRows": "5"},
        "mapAlias": {"row0": ["ALGERIA", "0", "0"],
                     "row11": ["IRAN", "4", "-30"],
                     "numOfRows": "25",
                     "columns": ["N_NAME", "COMMENT", "NONSENSE"]},
        "gbWithoutGroup": {"row0": ["12"],
                           "numOfRows": "1"},
        "gbTrivial": {"row4": ["1"],
                      "numOfRows": "5"},
        "distinct": {"row0": ["0"],
                     "row2": ["2"],
                     "numOfRows": "5"},
        "gbCount": {"row1": ["5"],
                    "numOfRows": "5"},
        "gbTrivialAlias": {"columns": ["A", "N_REGIONKEY"],
                           "row4": ["4", "4"],
                           "numOfRows": "5"},
        "gbFG": {"row4": ["46.4"],
                 "row0": ["0"],
                 "numOfRows": "5"},
        "gbGF": {"row1": ["161.2"],
                 "row4": ["291.8"],
                 "numOfRows": "5"},
        "gbFGF": {"row1": ["100"],
                  "row3": ["212.16"],
                  "numOfRows": "5"},
        "gbAllNoGBClause": {"row0": ["168", "25.84"],
                            "numOfRows": "1",
                            "columns": ["A", "AVG_N_NATIONKEY_*_N_REGIONKEY"]},
        "gbAll": {"row0": ["100", "0", "0"],
                  "row2": ["212.16", "2", "27.2"],
                  "numOfRows": "5"},
        "gbDistinct": {"row0": ["10", "2", "4"],
                       "numOfRows": "1",
                       "columns": ["A", "B", "MAX_DISTINCT_N_REGIONKEY"]},
        "gtJoin": {"row0": ["2", "BRAZIL", "1"],
                   "row2": ["5", "ETHIOPIA", "0"],
                   "numOfRows": "22"},
        "gtJoinWithSubQuery": {"row0": "not supported yet"},
        "gbWithMapStr": {"row0": ["10", "0"],
                         "row1": ["9.4", "0.5"],
                         "numOfRows": "5"},
        "joinWithCollision": {"row2": ["2", "ASIA"],
                              "numOfRows": "5",
                              "columns": ["R_REGIONKEY", "R_NAME", "R_COMMENT", "R_REGIONKEY_1", "R_NAME_1", "R_COMMENT_1"]},
        "aliasCollision": {"row4": ["4", "4"],
                           "numOfRows": "5",
                           "columns": ["KEY", "KEY_1"]},
        "crossJoin": {"row0": ["6", "FRANCE", "3"],
                      "row1": ["7", "GERMANY", "3"],
                      "numOfRows": "2"},
        "dateExpr": {"row0": ["1992"],
                     "row17": ["1996"],
                     "numOfRows": "20"},
        "joinSemiCatchall": {"row3": ["3", "EUROPE"],
                             "numOfRows": "4"},
        "joinAntiCatchall": {"row0": ["4", "MIDDLE EAST"],
                             "numOfRows": "1"},
        "joinSemiOptimize": {"row15": ["15", "MOROCCO", "0"],
                             "row23": ["23", "UNITED KINGDOM", "3"],
                             "numOfRows": "25"},
        "joinAntiOptimize": {"row0": ["16", "MOZAMBIQUE", "0"],
                             "row1": ["20", "SAUDI ARABIA", "4"],
                             "numOfRows": "5"},
        "joinCatchall": {"row1": ["2", "ASIA"],
                         "row5": ["3", "EUROPE"],
                         "numOfRows": "50"},
        "joinOptimizeFilter": {"row7": ["2", "ASIA"],
                               "row10": ["0", "AFRICA"],
                               "numOfRows": "14"},
        "crossJoinNoFilter": {"row0": ["0", "ALGERIA", "0"],
                              "numOfRows": "125"},
        "existenceJoin": {"row2": ["2", "ASIA"],
                          "numOfRows": "5"},
        "existenceJoinCatchAll": {"row4": ["4", "EGYPT", "4"],
                                  "row5": ["5", "ETHIOPIA", "0"],
                                  "numOfRows": "25"},
        "orderByExp": {"row10": ["17", "PERU", "1"],
                       "row17": ["10", "IRAN", "4"],
                       "numOfRows": "25"},
        "round": {"row7": [2, 0.43, 10],
                  "row23": [8, 0.13, 20]},
        "dateAdd": {"row0": ["1996-01-12"],
                    "row5": ["1992-03-02"]},
        "subquery": {"row0": ["3", "EUROPE"],
                     "numOfRows": "2"},
        "union": {"row2": ["5", "ETHIOPIA", "0"],
                  "numOfRows": "10"},
        "coalesce": {"row0": ["-1"],
                     "row4": ["1"]},
        "caseWhenIsNull": {"row0": ["NULL"],
                           "row8": ["INDIA"]},
        "windowRank": {"row2": ["2"],
                       "row14": ["3"],
                       "numOfRows": "25"},
        "windowEmptyOver": {"row0": ["50"],
                            "numOfRows": "25"},
        "windowEmptyOrder": {"row1": ["47"],
                             "row19": ["77"]},
        "windowEmptyPartition": {"row0": ["2"],
                                 "row23": ["999"]},
        "windowAllInOne": {"row3": ["3", "1", "CANADA", "47", "1",
                                "UNITED STATES", "0.5", "2", "1", "0.6", "9"],
                           "row10": ["10", "4", "IRAN", "58", "4", "JORDAN",
                                "0.75", "1", "1", "0.4", "25"]},
        "rollUp": {"row0": ["FNF", "12"],
                   "row2": ["1", "9.4"],
                   "numOfRows": "6"},
        "crossJoinEmptyProject": {"row0": ["0", "AFRICA"],
                                  "row10": ["2", "ASIA"],
                                  "numOfRows": "25"},
        "localRelation": {"row1": ["1", "left"],
                          "row2": ["3", "right"],
                          "numOfRows": "4"},
        "subStringWithLike": {"row0": ["MO"],
                              "numOfRows": "1"},
        "timestamp": {"row0": ["1969", "0"],
                      "row10": ["1969", "4"]},
        // "timestampFromStr": {"row1": ["1525158000.0"]},
        "caseWhenNoElse": {"row5": ["5"],
                           "row13": ["FNF"]},
        "decimal": {"row0": ["0"],
                    "row19": ["95"]},
        "intersect": {"row0": ["0", "AFRICA"]},
        "except": {"row0": ["FNF", "FNF", "FNF"]},
        "remainder": {"row0": ["0"],
                      "row2": ["2"]},
        "rand": {"numOfRows": "0"},
        "findInSet": {"row0": ["0"],
                      "row6": ["2"]},
        "expressionsNum1": {"row2" : [2.5, 0, 3, 3, 2, 2, 1.41421],
                            "row10": [41.2, 0, 14, 14, 3, 2, 3.16228],
                            "row19": [61, 3, 19, 16, 7, 6, 4.35890]},
        "expressionsTrig1": {"row0": [3.1415927, 0, 1, 0, 0, 1, 0, 1],
                            "row3": [3.1415927, 0.14112, -0.98999, -0.14255, 10.0179, 10.0677, 0.99505, 20.0855]},
        "expressionsTrig2": {"row1": [0.25268, 1.31812, 0.24498, 0.78540, 57.2958, 0.17453],
                             "row11": [1.57080, 0, 0.78540, 0.34877, 630.254, 1.91986]},
        "expressionsNum2": {"row4": [1.38629, 2, 0.60206, 256, 64, 2],
                            "row22": [1.09861, 1.58496, 0.47712, 10648, 176, 11]},
        "expressionsLogical": {"row1": ["false", "false", "false", "true"],
                               "row10": ["false", "true", "true", "false"],
                               "row13": ["true", "true", "true", "false"]},
        "rlike": {"row5": ["false"],
                  "row10": ["true"]},
        "expressionsString1": {"row0": ["HAhALGERIAalgeria", "i", "ALGERI", " LGERI  LGERI "],
                               "row11": ["NInIRAQiraq", "a", "IRAQ", "IR QIR Q"]},
        "expressionsString2": {"row5": ["false", "true", "false", 31, "ETH", "gu"],
                               "row10": ["true", "false", "false", 50, "IRA", ". "],
                               "row15": ["false", "false", "true", 90, "MOR", "s?"]},
        "expressionsAgg": {"row0": [0, 5, "MOZAMBIQUE", 0, 10],
                           "row3": [3, 5, "UNITED KINGDOM", 6, 15.4],
                           "numOfRows": "5"},
        "stdSamp": {"row1": [10.45466],
                    "row2": [5.68331]},
        "stdPop": {"row0": [6.35610],
                   "row4": [5.16140]},
        "varSamp": {"row2": [32.3],
                    "row4": [33.3]},
        "varPop": {"row0": [40.4],
                   "row2": [25.84]},
        "newExps1": {"row6": ["aFRANCE", "F", /*"France", */"ECNARF", 120, 15, 38, "R141", 70, "j", "3,006.3", "3,006"],
                     "row15": ["MOROCCO", "M", "OCCOROM", /*"Morocco", */128, 16, 90, "R521", 77, "s", "15.0", "15"],
                     "row22": ["aRUSSIA", "R", "AISSUR", /*"Russia", */120, 15, 79, "FNF", 82, "z", "3,022.3", "3,022"]},
        "find": {"row3": [0, 36],
                 "row10": [4, 32]},
        "projectRename": {"columns": ["N_NAME", "N_NAME_1", "N_NAME_2"],
                          "row3": [3, 1, "CANADA"]},
        "dateUDFs1": {"row1": [7, 336, 48],
                      "row17": [4, 20, 3],
                      "numOfRows": "30"}
    };
    var tpchCases = {
        "q1": "select l_returnflag, l_linestatus, sum(l_quantity) as sum_qty," +
              " sum(l_extendedprice) as sum_base_price, sum(l_extendedprice *" +
              " (1 - l_discount)) as sum_disc_price, sum(l_extendedprice * (1" +
              " - l_discount) * (1 + l_tax)) as sum_charge, avg(l_quantity) a" +
              "s avg_qty, avg(l_extendedprice) as avg_price, avg(l_discount) " +
              "as avg_disc, count(*) as count_order from lineitem where l_shi" +
              "pdate <= date \"1998-12-01\" - interval \"90\" day group by l_" +
              "returnflag, l_linestatus order by l_returnflag, l_linestatus",
        "q2": "select s_acctbal, s_name, n_name, p_partkey, p_mfgr, s_address" +
              ", s_phone, s_comment from part, supplier, partsupp, nation, re" +
              "gion where p_partkey = ps_partkey and s_suppkey = ps_suppkey a" +
              "nd p_size = 15 and p_type like \"%BRASS\" and s_nationkey = n_" +
              "nationkey and n_regionkey = r_regionkey and r_name = \"EUROPE\""+
              " and ps_supplycost = (select min(ps_supplycost) from partsupp," +
              " supplier, nation, region where p_partkey = ps_partkey and s_s" +
              "uppkey = ps_suppkey and s_nationkey = n_nationkey and n_region" +
              "key = r_regionkey and r_name = \"EUROPE\" )order by s_acctbal " +
              "desc, n_name, s_name, p_partkey",
        "q3": "select l_orderkey, sum(l_extendedprice * (1 - l_discount)) as " +
              "revenue, o_orderdate, o_shippriority from customer, orders, li" +
              "neitem where c_mktsegment = \"BUILDING\" and c_custkey = o_cus" +
              "tkey and l_orderkey = o_orderkey and o_orderdate < date \"1995" +
              "-03-15\" and l_shipdate > date \"1995-03-15\" group by l_order" +
              "key, o_orderdate, o_shippriority order by revenue desc, o_orde" +
              "rdate",
        "q4": "select o_orderpriority, count(*) as order_count from orders wh" +
              "ere o_orderdate >= date \"1993-07-01\" and o_orderdate < date " +
              "\"1993-07-01\" + interval \"3\" month and exists ( select * fr" +
              "om lineitem where l_orderkey = o_orderkey and l_commitdate < l" +
              "_receiptdate ) group by o_orderpriority order by o_orderpriority",
        "q5": "select n_name, sum(l_extendedprice * (1 - l_discount)) as reve" +
              "nue from customer, orders, lineitem, supplier, nation, region " +
              "where c_custkey = o_custkey and l_orderkey = o_orderkey and l_" +
              "suppkey = s_suppkey and c_nationkey = s_nationkey and s_nation" +
              "key = n_nationkey and n_regionkey = r_regionkey and r_name = \""+
              "ASIA\" and o_orderdate >= date \"1994-01-01\" and o_orderdate " +
              "< date \"1994-01-01\" + interval \"1\" year group by n_name or" +
              "der by revenue desc",
        "q6": "select sum(l_extendedprice * l_discount) as revenue from linei" +
              "tem where l_shipdate >= date \"1994-01-01\" and l_shipdate < d" +
              "ate \"1994-01-01\" + interval \"1\" year and l_discount betwee" +
              "n .06 - 0.01 and .06 + 0.01 and l_quantity < 24",
        "q7": "select supp_nation, cust_nation, l_year, sum(volume) as revenu" +
              "e from ( select n1.n_name as supp_nation, n2.n_name as cust_na" +
              "tion, year(l_shipdate) as l_year, l_extendedprice * (1 - l_dis" +
              "count) as volume from supplier, lineitem, orders, customer, na" +
              "tion n1, nation n2 where s_suppkey = l_suppkey and o_orderkey " +
              "= l_orderkey and c_custkey = o_custkey and s_nationkey = n1.n_" +
              "nationkey and c_nationkey = n2.n_nationkey and ( (n1.n_name = " +
              "\"FRANCE\" and n2.n_name = \"GERMANY\") or (n1.n_name = \"GERM" +
              "ANY\" and n2.n_name = \"FRANCE\") ) and l_shipdate between dat" +
              "e \"1995-01-01\" and date \"1996-12-31\" ) as shipping group b" +
              "y supp_nation, cust_nation, l_year order by supp_nation, cust_" +
              "nation, l_year",
        "q8": "select o_year, sum(case when nation = \"BRAZIL\" then volume e" +
              "lse 0 end) / sum(volume) as mkt_share from ( select year(o_ord" +
              "erdate) as o_year, l_extendedprice * (1 - l_discount) as volum" +
              "e, n2.n_name as nation from part, supplier, lineitem, orders, " +
              "customer, nation n1, nation n2, region where p_partkey = l_par" +
              "tkey and s_suppkey = l_suppkey and l_orderkey = o_orderkey and" +
              " o_custkey = c_custkey and c_nationkey = n1.n_nationkey and n1" +
              ".n_regionkey = r_regionkey and r_name = \"AMERICA\" and s_nati" +
              "onkey = n2.n_nationkey and o_orderdate between date \"1995-01-" +
              "01\" and date \"1996-12-31\" and p_type = \"ECONOMY ANODIZED S" +
              "TEEL\" ) as all_nations group by o_year order by o_year",
        "q9": "select nation, o_year, sum(amount) as sum_profit from (select " +
              "n_name as nation, year(o_orderdate) as o_year, l_extendedprice" +
              " * (1 - l_discount) - ps_supplycost * l_quantity as amount fro" +
              "m part, supplier, lineitem, partsupp, orders, nation where s_s" +
              "uppkey = l_suppkey and ps_suppkey = l_suppkey and ps_partkey =" +
              " l_partkey and p_partkey = l_partkey and o_orderkey = l_orderk" +
              "ey and s_nationkey = n_nationkey and p_name like \"%green%\" )" +
              " as profit group by nation, o_year order by nation, o_year desc",
        "q10": "select c_custkey, c_name, sum(l_extendedprice * (1 - l_discou" +
               "nt)) as revenue, c_acctbal, n_name, c_address, c_phone, c_com" +
               "ment from customer, orders, lineitem, nation where c_custkey " +
               "= o_custkey and l_orderkey = o_orderkey and o_orderdate >= da" +
               "te \"1993-10-01\" and o_orderdate < date \"1993-10-01\" + int" +
               "erval \"3\" month and l_returnflag = \"R\" and c_nationkey = " +
               "n_nationkey group by c_custkey, c_name, c_acctbal, c_phone, n" +
               "_name, c_address, c_comment order by revenue desc",
        "q11": "select ps_partkey, sum(ps_supplycost * ps_availqty) as value " +
               "from partsupp, supplier, nation where ps_suppkey = s_suppkey " +
               "and s_nationkey = n_nationkey and n_name = \"GERMANY\" group " +
               "by ps_partkey having sum(ps_supplycost * ps_availqty) > ( sel" +
               "ect sum(ps_supplycost * ps_availqty) * 0.0001000000 from part" +
               "supp, supplier, nation where ps_suppkey = s_suppkey and s_nat" +
               "ionkey = n_nationkey and n_name = \"GERMANY\" ) order by valu" +
               "e desc",
        "q12": "select l_shipmode, sum(case when o_orderpriority = \"1-URGENT" +
               "\" or o_orderpriority = \"2-HIGH\" then 1 else 0 end) as high" +
               "_line_count, sum(case when o_orderpriority <> \"1-URGENT\" an" +
               "d o_orderpriority <> \"2-HIGH\" then 1 else 0 end) as low_lin" +
               "e_count from orders, lineitem where o_orderkey = l_orderkey a" +
               "nd l_shipmode in (\"MAIL\", \"SHIP\") and l_commitdate < l_re" +
               "ceiptdate and l_shipdate < l_commitdate and l_receiptdate >= " +
               "date \"1994-01-01\" and l_receiptdate < date \"1994-01-01\" +" +
               " interval \"1\" year group by l_shipmode order by l_shipmode",
        "q13": "select c_count, count(*) as custdist from ( select c_custkey," +
               " count(o_orderkey) as c_count from customer left outer join o" +
               "rders on c_custkey = o_custkey and o_comment not like \"%spec" +
               "ial%requests%\" group by c_custkey ) as c_orders group by c_c" +
               "ount order by custdist desc, c_count desc",
        "q14": "select 100.00 * sum(case when p_type like \"PROMO%\" then l_e" +
               "xtendedprice * (1 - l_discount) else 0 end) / sum(l_extendedp" +
               "rice * (1 - l_discount)) as promo_revenue from lineitem, part" +
               " where l_partkey = p_partkey and l_shipdate >= date \"1995-09" +
               "-01\" and l_shipdate < date \"1995-09-01\" + interval \"1\" m" +
               "onth",
        // "q15": "with revenue0 as (select l_suppkey as supplier_no, sum(l_exte" +
        //        "ndedprice * (1 - l_discount)) as total_revenue from lineitem " +
        //        "where l_shipdate >= date \"1996-01-01\" and l_shipdate < date" +
        //        " \"1996-01-01\" + interval \"3\" month group by l_suppkey) se" +
        //        "lect s_suppkey, s_name, s_address, s_phone, total_revenue fro" +
        //        "m supplier, revenue0 where s_suppkey = supplier_no and total_" +
        //        "revenue = ( select max(total_revenue) from revenue0 ) order b" +
        //        "y s_suppkey",
        "q16": "select p_brand, p_type, p_size, count(distinct ps_suppkey) as" +
               " supplier_cnt from partsupp, part where p_partkey = ps_partke" +
               "y and p_brand <> \"Brand#45\" and p_type not like \"MEDIUM PO" +
               "LISHED%\" and p_size in (49, 14, 23, 45, 19, 3, 36, 9) and ps" +
               "_suppkey not in ( select s_suppkey from supplier where s_comm" +
               "ent like \"%Customer%Complaints%\" ) group by p_brand, p_type" +
               ", p_size order by supplier_cnt desc, p_brand, p_type, p_size",
        "q17": "select sum(l_extendedprice) / 7.0 as avg_yearly from lineitem" +
               ", part where p_partkey = l_partkey and p_brand = \"Brand#23\"" +
               " and p_container = \"MED BOX\" and l_quantity < ( select 0.2 " +
               "* avg(l_quantity) from lineitem where l_partkey = p_partkey)",
        "q18": "select c_name, c_custkey, o_orderkey, o_orderdate, o_totalpri" +
               "ce, sum(l_quantity) from customer, orders, lineitem where o_o" +
               "rderkey in ( select l_orderkey from lineitem group by l_order" +
               "key having sum(l_quantity) > 300 ) and c_custkey = o_custkey " +
               "and o_orderkey = l_orderkey group by c_name, c_custkey, o_ord" +
               "erkey, o_orderdate, o_totalprice order by o_totalprice desc, " +
               "o_orderdate",
        "q19": "select sum(l_extendedprice* (1 - l_discount)) as revenue from" +
               " lineitem, part where ( p_partkey = l_partkey and p_brand = \""+
               "Brand#12\" and p_container in (\"SM CASE\", \"SM BOX\", \"SM " +
               "PACK\", \"SM PKG\") and l_quantity >= 1 and l_quantity <= 1 +" +
               " 10 and p_size between 1 and 5 and l_shipmode in (\"AIR\", \"" +
               "AIR REG\") and l_shipinstruct = \"DELIVER IN PERSON\" ) or ( " +
               "p_partkey = l_partkey and p_brand = \"Brand#23\" and p_contai" +
               "ner in (\"MED BAG\", \"MED BOX\", \"MED PKG\", \"MED PACK\") " +
               "and l_quantity >= 10 and l_quantity <= 10 + 10 and p_size bet" +
               "ween 1 and 10 and l_shipmode in (\"AIR\", \"AIR REG\") and l_" +
               "shipinstruct = \"DELIVER IN PERSON\" ) or ( p_partkey = l_par" +
               "tkey and p_brand = \"Brand#34\" and p_container in (\"LG CASE" +
               "\", \"LG BOX\", \"LG PACK\", \"LG PKG\") and l_quantity >= 20" +
               " and l_quantity <= 20 + 10 and p_size between 1 and 15 and l_" +
               "shipmode in (\"AIR\", \"AIR REG\") and l_shipinstruct = \"DEL" +
               "IVER IN PERSON\")",
        "q20": "select s_name, s_address from supplier, nation where s_suppke" +
               "y in ( select ps_suppkey from partsupp where ps_partkey in ( " +
               "select p_partkey from part where p_name like \"forest%\" ) an" +
               "d ps_availqty > ( select 0.5 * sum(l_quantity) from lineitem " +
               "where l_partkey = ps_partkey and l_suppkey = ps_suppkey and l" +
               "_shipdate >= date \"1994-01-01\" and l_shipdate < date \"1994" +
               "-01-01\" + interval \"1\" year ) ) and s_nationkey = n_nation" +
               "key and n_name = \"CANADA\" order by s_name",
        // "q21": "select s_name, count(*) as numwait from supplier, lineitem l1" +
        //        ", orders, nation where s_suppkey = l1.l_suppkey and o_orderke" +
        //        "y = l1.l_orderkey and o_orderstatus = \"F\" and l1.l_receiptd" +
        //        "ate > l1.l_commitdate and exists ( select * from lineitem l2 " +
        //        "where l2.l_orderkey = l1.l_orderkey and l2.l_suppkey <> l1.l_" +
        //        "suppkey ) and not exists ( select * from lineitem l3 where l3" +
        //        ".l_orderkey = l1.l_orderkey and l3.l_suppkey <> l1.l_suppkey " +
        //        "and l3.l_receiptdate > l3.l_commitdate ) and s_nationkey = n_" +
        //        "nationkey and n_name = \"SAUDI ARABIA\" group by s_name order" +
        //        " by numwait desc, s_name",
        "q22": "select cntrycode, count(*) as numcust, sum(c_acctbal) as tota" +
               "cctbal from ( select substring(c_phone, 1, 2) as cntrycode, c" +
               "_acctbal from customer where substring(c_phone, 1, 2) in (\"1" +
               "3\", \"31\", \"23\", \"29\", \"30\", \"18\", \"17\") and c_ac" +
               "ctbal > ( select avg(c_acctbal) from customer where c_acctbal" +
               " > 0.00 and substring(c_phone, 1, 2) in (\"13\", \"31\", \"23" +
               "\", \"29\", \"30\", \"18\", \"17\") ) and not exists ( select" +
               " * from orders where o_custkey = c_custkey ) ) as custsale gr" +
               "oup by cntrycode order by cntrycode"
    };
    var tpchAnswers = {
        "q1": {"row0": ["A", "F", 37734107.00, 56586554400.73, 53758257134.87,
                        55909065222.83, 25.52, 38273.13, 0.05, 1478493],
               "row3": ["R", "F", 37719753.00, 56568041380.90, 53741292684.60,
                        55889619119.83, 25.51, 38250.85, 0.05, 1478870],
               "numOfRows": "4"},
        "q2": {"row0": [9938.53, "Supplier#000005359", "UNITED KINGDOM", 185358,
                        "Manufacturer#4", "QKuHYh,vZGiwu2FWEJoLDx04",
                        "33-429-790-6131", "uriously regular requests hag"],
               "row4": [9871.22, "Supplier#000006373", "GERMANY", 43868,
                        "Manufacturer#5", "J8fcXWsTqM", "17-813-485-8637",
                        "etect blithely bold asymptotes. fluffily ironic " +
                        "platelets wake furiously; blit"],
               "numOfRows": "460"},
        "q3": {"row0": [2456423, 406181.01, "1995-03-05", 0],
               "row4": [2435712, 378673.06, "1995-02-26", 0],
               "numOfRows": "11,620"},
        "q4": {"row0": ["1-URGENT", 10594],
               "row4": ["5-LOW", 10487],
               "numOfRows": "5"},
        "q5": {"row0": ["INDONESIA", 55502041.17],
               "row4": ["JAPAN", 45410175.70],
               "numOfRows": "5"},
        "q6": {"row0": [123141078.23],
               "numOfRows": "1"},
        "q7": {"row0": ["FRANCE", "GERMANY", 1995, 54639732.73],
               "row3": ["GERMANY", "FRANCE", 1996, 52520549.02],
               "numOfRows": "4"},
        "q8": {"row0": [1995, 0.03],
               "row1": [1996, 0.04],
               "numOfRows": "2"},
        "q9": {"row0": ["ALGERIA", 1998, 27136900.18],
               "row4": ["ALGERIA", 1994, 48694008.07],
               "numOfRows": "175"},
        "q10": {"row0": [57040, "Customer#000057040", 734235.25, 632.87, "JAPAN",
                         "Eioyzjf4pp", "22-895-641-3466", "sits. slyly regular" +
                         " requests sleep alongside of the regular inst"],
                "row4": [125341, "Customer#000125341", 633508.09, 4983.51,
                        "GERMANY", "S29ODD6bceU8QSuuEJznkNaK", "17-582-695-5962",
                        "arefully even depths. blithely even excuses sleep " +
                        "furiously. foxes use except the dependencies. ca"],
                "numOfRows": "37,967"},
        "q11": {"row0": [ 129760, 17538456.86],
                "row4": [34452, 15983844.72],
                "numOfRows": "1,048"},
        "q12": {"row0": ["MAIL", 6202, 9324],
                "row1": ["SHIP", 6200, 9262],
                "numOfRows": "2"},
        "q13": {"row0": [0, 50005],
                "row4": [8, 5937],
                "numOfRows": "42"},
        "q14": {"row0": [16.38],
                "numOfRows": "1"},
        "q15": {"row0": [8449, "Supplier#000008449", "Wp34zim9qYFbVctdW",
                          "20-469-856-8873", 1772627.21],
                 "numOfRows": "1"},
        "q16": {"row0": ["Brand#41", "MEDIUM BRUSHED TIN", 3, 28],
                "row4": ["Brand#15", "MEDIUM ANODIZED NICKEL", 3, 24],
                "numOfRows": "18,314"},
        "q17": {"row0": [348406.05],
                "numOfRows": "1"},
        "q18": {"row0": ["Customer#000128120", 128120, 4722021, "1994-04-07",
                         544089.09, 323.00],
                "row4": ["Customer#000046435", 46435, 4745607, "1997-07-03",
                         508047.99, 309.00],
                "numOfRows": "57"},
        "q19": {"row0": [3083843.06],
                "numOfRows": "1"},
        "q20": {"row0": ["Supplier#000000020", "iybAE,RmTymrZVYaFZva2SH,j"],
                "row4": ["Supplier#000000287", "7a9SP7qW5Yku5PvSg"],
                "numOfRows": "186"},
        "q21": {"row0": ["Supplier#000002829", 20],
                "row4": ["Supplier#000002160", 17],
                "numOfRows": "100"},
        "q22": {"row0": [13, 888, 6737713.99],
                "row4": [29, 948, 7158866.63],
                "numOfRows": "7"}
    };
    var customTables = {
        dataSource: "tpch_sf1/",
        tableNames: ["nation", "region", "orders"]
    };
    var tpchTables = {
        dataSource: "tpch_sf1/",
        tableNames: ["customer", "lineitem", "nation", "orders", "part",
                   "partsupp", "region", "supplier"]
    };
    var tpcdsTables = {
        dataSource: "tpcds_sf1/",
        tableNames: ["call_center", "catalog_page", "catalog_returns",
                   "catalog_sales", "customer", "customer_address",
                   "customer_demographics", "date_dim", "dbgen_version",
                   "household_demographics", "income_band", "inventory", "item",
                   "promotion", "reason", "ship_mode", "store", "store_returns",
                   "store_sales", "time_dim", "warehouse", "web_page",
                   "web_returns", "web_sales", "web_site"]
    };

    SqlTestSuite.runSqlTests = function(testName, hasAnimation, toClean,
                                        noPopup, mode, withUndo, timeDilation) {
        console.log("runSqlTest: " + userIdName + "::" + sessionName);
        console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests(testName)
        .then(function() {
            return test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);
        })
    };
    function initializeTests(testName) {
        // Add all test cases here
        if (!testName) {
            console.log("Running default test cases");
        }
        return sqlTest(testName);
    }
    function sqlTest(testName) {
        var deferred = PromiseHelper.deferred();
        var dataSource;
        var tableNames;
        var queries;
        var isTPCH = false;
        setUpTpchDatasets({})
        .then(function() {
            if (isTPCH) {
                runAllQueries(queries, testName);
                deferred.resolve();
            } else {
                // XXX TO-DO run TPC-DS queries here
                deferred.resolve();
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
        function setUpTpchDatasets(tableStruct) {
            var deferred = PromiseHelper.deferred();
            if (!testName) {
                dataSource = testDataLoc + customTables.dataSource;
                tableNames = customTables.tableNames;
                queries = sqlTestCases;
                isTPCH = true;
            } else if (testName.toLowerCase() === "tpch") {
                dataSource = testDataLoc + tpchTables.dataSource;
                tableNames = tpchTables.tableNames;
                queries = tpchCases;
                isTPCH = true;
            } else if (testName.toLowerCase() === "tpcds") {
                dataSource = testDataLoc + tpcdsTables.dataSource;
                tableNames = tpcdsTables.tableNames;
                // XXX TO-DO create TPC-DS test cases
                // queries = tpcdsCases;
            } else {
                var error = "Test case doesn't exist";
                console.error(error);
                test.fail(deferred, testName, currentTestNumber, error);
            }
            var checkList = [];
            for (var i = 0; i < tableNames.length; i++) {
                checkList.push("#previewTable td:eq(1):contains('')");
            }
            var randId = Math.floor(Math.random() * 1000);
            var promiseArray = [];
            for (var i = 0; i < tableNames.length; i++) {
                var extension = isTPCH ? ".tbl" : ".dat";
                var dataPath = dataSource + tableNames[i] + extension;
                tableStruct[tableNames[i]] = randId;
                var tableName = tableNames[i];
                var check = checkList[i];
                promiseArray.push(prepareData.bind(window, test, tableName,
                                                   randId, dataPath, check, i));
                promiseArray.push(dropTempTables.bind(window));
            }
            // Remove all immediates
            PromiseHelper.chain(promiseArray)
            .then(function() {
                deferred.resolve();
            })
            .fail(function(error) {
                console.error(error, " failed");
                deferred.reject(error);
            });
            return deferred.promise();
        }
    }
    // All helper functions
    function runAllQueries(queries, testName) {
        var answerSet;
        if (!testName) {
            answerSet = sqlTestAnswers;
        } else if (testName === "tpch") {
            answerSet = tpchAnswers;
        }

        function runQuery(deferred, testName, currentTestNumber) {
            console.log("Query name: " + testName);
            var sqlString = queries[testName];
            console.log(sqlString);
            // Create a new worksheet after each 5 tables have been loaded
            if (currentTestNumber % 5 === 1) {
                WSManager.addWS();
            }
            SQLEditor.getEditor().setValue(sqlString);
            SQLEditor.executeSQL()
            .then(function() {
                return dropTempTables();
            })
            .then(function() {
                if (checkResult(answerSet, testName)) {
                    test.pass(deferred, testName, currentTestNumber);
                } else {
                    test.fail(deferred, testName, currentTestNumber, "WrongAnswer");
                }
            })
            .fail(function(error) {
                console.error(error, "runQuery");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        $("#sqlTab").click();
        for (var queryName in queries) {
            var sqlString = queries[queryName];
            test.add(runQuery, queryName, defaultTimeout, TestCaseEnabled);
        }
    }
    function checkResult(answerSet, queryName) {
        var table = "#xcTable-" + gActiveTableId;
        for (var row in answerSet[queryName]) {
            if (row === "numOfRows") {
                if (answerSet[queryName][row] !==
                    $("#numPages").text().split(" ")[1]) {
                    console.log(row + ": expect " + answerSet[queryName][row]
                        + ", get " + $("#numPages").text().split(" ")[1]);
                    test.assert(0);
                    return false;
                }
            } else if (row === "columns") {
                var answers = answerSet[queryName][row];
                for (var i = 0; i < answers.length; i++) {
                    var col = "col" + (i + 1);
                    var res = $(table + " thead" + " ." + col
                                + " .flex-mid input").attr('value');
                    if (answers[i] !== res) {
                        console.log(row + ": expect " + answers[i]
                                    + ", get " + res);
                        test.assert(0);
                        return false;
                    }
                }
            } else {
                var answers = answerSet[queryName][row];
                for (var i = 0; i < answers.length; i++) {
                    var col = "col" + (i + 1);
                    var res = $(table + " ." + row + " ." + col)
                                .find(".originalData").text();
                    if (typeof answers[i] === "number") {
                        // TPCH takes two decimal places in all float
                        // number cases. Xcalar does not gurantee this.
                        // So we allow a minor difference.
                        if (Math .abs(answers[i].toFixed(2) -
                                      parseFloat(res).toFixed(2))
                                 .toFixed(2) > 0.01) {
                            console.log(row + ": expect " + answers[i]
                                        + ", get " + res);
                            test.assert(0);
                            return false;
                        }
                    } else {
                        if (answers[i] !== res) {
                            console.log(row + ": expect " + answers[i]
                                        + ", get " + res);
                            test.assert(0);
                            return false;
                        }
                    }
                }
            }
        }
        console.log("Case " + queryName + "  pass!");
        return true;
    }
    function dropTempTables() {
        function deleteTables() {
            return TblManager.deleteTables(gOrphanTables, "orphaned", true);
        }
        var deferred = PromiseHelper.deferred();
        TableList.refreshOrphanList(false)
                 .then(deleteTables, deleteTables)
                 .always(deferred.resolve);

        return deferred.promise();
    }
    function prepareData(test, tableName, randId, dataPath, check, index) {
        var deferred = PromiseHelper.deferred();
        // Create a new worksheet after each 5 tables have been loaded
        if (index > 0 && index % 5 === 0) {
            WSManager.addWS();
        }
        // Load datasets
        loadDatasets(test, tableName, randId, dataPath, check)
        .then(function() {
            // Create tables
            $("#dataStoresTab").click();
            return createTables(test, tableName, randId);
        })
        .then(function() {
            // Remove extra columns
            return removeColumns(gActiveTableId);
        })
        .then(function() {
            // Cast data types
            return castColumns(gActiveTableId);
        })
        .then(function() {
            // Send schema
            return sendSchema(gActiveTableId, tableName);
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
        return ColManager.hideCol([gTables[tableId].getNumCols() - 1], tableId, {noAnimate: true});
    }
    function castColumns(tableId) {
        SmartCastView.show(tableId);
        var colTypeInfos = [];
        $("#smartCast-table .tableContent").find(".row").each(function() {
            var colNum = parseInt($(this).attr("data-col"));
            var colType = $(this).find(".colType").text();
            colTypeInfos.push({
                "colNum": colNum,
                "type": colType
            });
        });
        SmartCastView.close();
        if (colTypeInfos.length > 0) {
            return ColManager.changeType(colTypeInfos, tableId);
        } else {
            return PromiseHelper.deferred().resolve().promise();
        }
    }
    function sendSchema(tableId, tableName) {
        return ExtensionManager.trigger(tableId, "UExtSQL", "sendSchema", {sqlTableName: tableName});
    }

    return (SqlTestSuite);
}(jQuery, {}));