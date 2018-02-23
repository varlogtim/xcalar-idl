window.SqlTestSuite = (function($, SqlTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 1800000; // 30min
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
        // Doesn't work yet. Returns empty result. Backend bug. Code review in progress
        "crossJoin": "select * from nation n1, nation n2 where (n1.n_name = \"FRANCE\" and n2.n_name = \"GERMANY\") or (n1.n_name = \"GERMANY\" and n2.n_name = \"FRANCE\")",
        "dateExpr": "select year(o_orderdate) from orders",
        "joinSemiCatchall": "select * from region r1 where exists(   select *   from region r2   where r2.r_regionkey > r1.r_regionkey)",
        "joinAntiCatchall": "select * from region r1 where not exists(   select *   from region r2   where r2.r_regionkey > r1.r_regionkey)",
        "joinSemiOptimize": "select * from supplier r1 where exists(   select *   from supplier r2   where r2.s_nationkey >= r1.s_nationkey and r2.s_name = r1.s_name)",
        "joinAntiOptimize": "select * from supplier r1 where not exists(   select *   from supplier r2   where r2.s_nationkey >= r1.s_nationkey and r2.s_name = r1.s_name)", // empty table as result
        "joinCatchall": "select * from supplier, nation where s_nationkey > n_nationkey",
        "joinOptimizeFilter": "select * from supplier, nation where s_nationkey = n_nationkey and s_suppkey > n_nationkey",
        "crossJoinNoFilter": "select * from nation cross join region",
        // "dateExpWithTS": "select year(timestamp(someTimestampCol)) from table",
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
        "q15": "with revenue0 as (select l_suppkey as supplier_no, sum(l_exte" +
               "ndedprice * (1 - l_discount)) as total_revenue from lineitem " +
               "where l_shipdate >= date \"1996-01-01\" and l_shipdate < date" +
               " \"1996-01-01\" + interval \"3\" month group by l_suppkey) se" +
               "lect s_suppkey, s_name, s_address, s_phone, total_revenue fro" +
               "m supplier, revenue0 where s_suppkey = supplier_no and total_" +
               "revenue = ( select max(total_revenue) from revenue0 ) order b" +
               "y s_suppkey",
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
        "q21": "select s_name, count(*) as numwait from supplier, lineitem l1" +
               ", orders, nation where s_suppkey = l1.l_suppkey and o_orderke" +
               "y = l1.l_orderkey and o_orderstatus = \"F\" and l1.l_receiptd" +
               "ate > l1.l_commitdate and exists ( select * from lineitem l2 " +
               "where l2.l_orderkey = l1.l_orderkey and l2.l_suppkey <> l1.l_" +
               "suppkey ) and not exists ( select * from lineitem l3 where l3" +
               ".l_orderkey = l1.l_orderkey and l3.l_suppkey <> l1.l_suppkey " +
               "and l3.l_receiptdate > l3.l_commitdate ) and s_nationkey = n_" +
               "nationkey and n_name = \"SAUDI ARABIA\" group by s_name order" +
               " by numwait desc, s_name",
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
        "q115": {"row0": [8449, "Supplier#000008449", "Wp34zim9qYFbVctdW",
                          "20-469-856-8873", 1772627.21],
                 "numOfRows": "1"},
        "q16": {"row0": ["Brand#41", "MEDIUM BRUSHED TIN", 3, 28],
                "row4": ["Brand#15 ", "MEDIUM ANODIZED NICKEL", 3, 24],
                "numOfRows": "18,134"},
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

    SqlTestSuite.runSqlTests = function(hasAnimation, toClean, noPopup, mode, withUndo,
                                timeDilation) {
        // var tableNames = {};
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        return test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);
    };
    function initializeTests() {
        // Add all test cases here
        test.add(tpchTest, "TpchTest", defaultTimeout, TestCaseEnabled);
    }
    function tpchTest(deferred, testName, currentTestNumber) {
        setUpTpchDatasets({});
        function setUpTpchDatasets(tableStruct) {
            var dataSource = testDataLoc + "/tpch_sf1/";
            var tableNames = ["customer", "lineitem", "nation", "orders", "part",
                              "partsupp", "region", "supplier"];
            var checkList = ["#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')",
                             "#previewTable td:eq(1):contains('')"];
            var randId = Math.floor(Math.random() * 1000);
            var promiseArray = [];
            for (var i = 0; i < tableNames.length; i++) {
                var dataPath = dataSource + tableNames[i] + ".tbl";
                tableStruct[tableNames[i]] = randId;
                var tableName = tableNames[i];
                var check = checkList[i];
                promiseArray.push(prepareData.bind(window, test, tableName,
                                                   randId, dataPath, check));
            }
            PromiseHelper.chain(promiseArray)
            .then(function() {
                return runAllQueries(tpchCases);
            })
            .then(function() {
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, " tpchTest failed");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }
    }
    // All helper functions
    function runAllQueries(queries) {
        var deferred = jQuery.Deferred();
        var promiseArray = [];
        var failedQueries = "";

        function runQuery(queryName, sqlString) {
            console.log("Query name: " + queryName);
            console.log(sqlString);
            var innerDeferred = jQuery.Deferred();
            SQLEditor.getEditor().setValue(sqlString);
            SQLEditor.executeSQL()
            .then(function() {
                var table = "#xcTable-" + gActiveTableId;
                for (var row in tpchAnswers[queryName]) {
                    if (row === "numOfRows") {
                        if (tpchAnswers[queryName][row] !==
                            $("#numPages").text().split(" ")[1]) {
                            test.assert(0);
                            return;
                        }
                    } else {
                        var answers = tpchAnswers[queryName][row];
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
                                    test.assert(0);
                                    return;
                                }
                            } else {
                                if (answers[i] !== res) {
                                    test.assert(0);
                                    return;
                                }
                            }
                        }
                    }
                }
                innerDeferred.resolve();
            })
            .fail(function(error) {
                console.error(error, "runQuery");
                failedQueries += queryName + ",";
                innerDeferred.reject(error);
            });
            return innerDeferred.promise();
        }

        $("#sqlTab").click();
        for (var queryName in queries) {
            var sqlString = queries[queryName];
            promiseArray.push(runQuery.bind(window, queryName, sqlString));
            promiseArray.push(dropTempTables);
        }
        PromiseHelper.chain(promiseArray)
        .then(deferred.resolve)
        .fail(function() {
            deferred.reject("Failed Queries: " + failedQueries.slice(0, -1));
        });
    }
    function dropTempTables() {
        function deleteTables() {
            return TblManager.deleteTables(gOrphanTables, "orphaned", true);
        }
        return TableList.refreshOrphanList(false)
                .then(deleteTables, deleteTables);
    }
    function prepareData(test, tableName, randId, dataPath, check) {
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
            return removeColumns(gActiveTableId);
        })
        .then(function() {
            // Cast data types
            return castColumns(gActiveTableId);
        })
        .then(function() {
            // Finalize table
            return finalizeTables(gActiveTableId);
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
            return jQuery.Deferred().resolve().promise();
        }
    }
    function finalizeTables(tableId) {
        return ExtensionManager.trigger(tableId, "UExtSendSchema", "finalizeTable", {});
    }
    function sendSchema(tableId, tableName) {
        return ExtensionManager.trigger(tableId, "UExtSendSchema", "sendSchema", {sqlTableName: tableName});
    }

    return (SqlTestSuite);
}(jQuery, {}));