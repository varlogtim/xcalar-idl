window.SqlTestSuite = (function($, SqlTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 7200000; // 120min
    var sqlTestCases;
    var sqlTestAnswers;
    var tpchCases;
    var tpchAnswers;
    var customTables;
    var tpchTables;
    var tpcdsTables;
    $.getJSON("assets/test/json/SQLTest.json", undefined, function(data) {
        sqlTestCases = data.xcTest.testCases;
        sqlTestAnswers = data.xcTest.answers;
        tpchCases = data.tpchTest.testCases;
        tpchAnswers = data.tpchTest.answers;
        customTables = data.xcTest.tables;
        tpchTables = data.tpchTest.tables;
        tpcdsTables = data.tpcdsTest.tables;
    });

    SqlTestSuite.runSqlTests = function(testName, hasAnimation, toClean,
                                        noPopup, mode, withUndo, timeDilation) {
        console.log("runSqlTest: " + userIdName + "::" + sessionName);
        console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests(testName)
        return test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);
    };
    function initializeTests(testName) {
        // Add all test cases here
        if (!testName) {
            console.log("Running default test cases");
        }
        return sqlTest(testName);
    }
    function sqlTest(testType) {
        var dataSource;
        var tableNames;
        var queries;
        var isTPCH = false;
        if (!testType) {
            dataSource = customTables.dataSource;
            tableNames = customTables.tableNames;
            queries = sqlTestCases;
            isTPCH = true;
        } else if (testType.toLowerCase() === "tpch") {
            dataSource = tpchTables.dataSource;
            tableNames = tpchTables.tableNames;
            queries = tpchCases;
            isTPCH = true;
        } else if (testType.toLowerCase() === "tpcds") {
            dataSource = tpcdsTables.dataSource;
            tableNames = tpcdsTables.tableNames;
            // XXX TO-DO create TPC-DS test cases
            // queries = tpcdsCases;
        } else {
            var error = "Test case doesn't exist";
            console.error(error);
        }
        test.add(setUpTpchDatasets, "loading data", defaultTimeout, TestCaseEnabled);
        if (isTPCH) {
            runAllQueries(queries, testType);
        } else {
            // XXX TO-DO run TPC-DS queries here
        }
        function setUpTpchDatasets(deferred, testName, currentTestNumber) {
            if (!dataSource) {
                var error = "Test case doesn't exist";
                test.fail(deferred, testName, currentTestNumber, error);
            }
            var checkList = [];
            for (var i = 0; i < tableNames.length; i++) {
                checkList.push("#previewTable td:eq(1):contains('')");
            }
            var randId = Math.floor(Math.random() * 1000);
            var promiseArray = [];
            for (var i = 0; i < tableNames.length; i++) {
                var dataPath = dataSource + tableNames[i];
                var tableName = tableNames[i].substring(0, tableNames[i].indexOf("."));
                var check = checkList[i];
                promiseArray.push(prepareData.bind(window, test, tableName,
                                                   randId, dataPath, check, i));
                promiseArray.push(dropTempTables.bind(window));
            }
            // Remove all immediates
            PromiseHelper.chain(promiseArray)
            .then(function() {
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, " failed");
                test.fail(deferred, testName, currentTestNumber, error);
            });
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
            if (testName === "cancelQuery") {
                var queryName = xcHelper.randName("sql");
                var sqlCom = new SQLCompiler();
                sqlCom.compile(queryName, sqlString)
                .then(function(queryString, newTableName, cols, cacheStruct) {
                    // XXX FIXME please if you can find a better way other than setTimeout
                    setTimeout(function() {
                        $("#monitor-queryList .query .cancelIcon").last().click();
                    }, 2000);
                    return sqlCom.execute(queryString, newTableName, cols,
                                                    sqlString, cacheStruct);
                })
                .then(function() {
                    test.fail(deferred, testName, currentTestNumber, "Unable to cancel query, query resolved");
                })
                .fail(function() {
                    if (sqlCom.getStatus() === SQLStatus.Cancelled) {
                        test.pass(deferred, testName, currentTestNumber);
                    } else {
                        test.fail(deferred, testName, currentTestNumber, "Unable to cancel query, status is: " + sqlCom.getStatus());
                    }
                });
            } else {
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
                    } else if (answers[i] === null) {
                        if (res !== "FNF") {
                            console.log(row + ": expect FNF, get " + res);
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