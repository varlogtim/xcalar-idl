module.exports = {
    '@tags': ['dataflowCreation'],
    'open browser': function(browser) {
        let user = "dftest";
        browser.globals['gTestUserName'] = user;
        browser.globals['gTestExportDirectory'] = "/home/jenkins/export_test/";
        let url = "http://localhost:8888/testSuite.html" +
        "?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=" + user + "&id=0"
        // open browser
        browser
            .url(url)
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    'new workbook': function(browser) {
        browser
            .click("#createWKBKbtn")
            .waitForElementVisible('.workbookBox.noResource .subHeading input', 10000)

    },

    'activate workbook': function(browser) {
        browser.getValue('.workbookBox.noResource .subHeading input', function(result) {
            browser.globals['gTestWorkbookName'] = result.value;
            browser
                .click(".workbookBox.noResource .content.activate")
                .pause(1000)
                .waitForElementNotVisible("#initialLoadScreen", 100000)
         });
    },

    'new tab': function(browser) {
        // restore dataset
        browser
            .click("#dagView .newTab")
            .pause(100)
    },

    'add 1st dataset node': function(browser) {
        browser
            .moveToElement(".category.category-in", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .dataset .main", 100, 100);
    },

    'config 1st dataset node to airports': function(browser) {
        browser
            .openOpPanel(".dataset:nth-child(1)")
            .submitAdvancedPanel("#datasetOpPanel", "{\"prefix\":\"airports\",\"source\":\"rudy.34847.airports\",\"schema\":[{\"name\":\"iata\",\"type\":\"string\"},{\"name\":\"airport\",\"type\":\"string\"},{\"name\":\"city\",\"type\":\"string\"},{\"name\":\"state\",\"type\":\"string\"},{\"name\":\"country\",\"type\":\"string\"},{\"name\":\"lat\",\"type\":\"float\"},{\"name\":\"long\",\"type\":\"float\"},{\"name\":\"column7\",\"type\":\"string\"}],\"synthesize\":false,\"loadArgs\":\"{\\n    \\\"operation\\\": \\\"XcalarApiBulkLoad\\\",\\n    \\\"comment\\\": \\\"\\\",\\n    \\\"tag\\\": \\\"\\\",\\n    \\\"state\\\": \\\"Unknown state\\\",\\n    \\\"args\\\": {\\n        \\\"dest\\\": \\\"rudy.34847.airports\\\",\\n        \\\"loadArgs\\\": {\\n            \\\"sourceArgsList\\\": [\\n                {\\n                    \\\"targetName\\\": \\\"Default Shared Root\\\",\\n                    \\\"path\\\": \\\"/netstore/datasets/flight/airports.csv\\\",\\n                    \\\"fileNamePattern\\\": \\\"\\\",\\n                    \\\"recursive\\\": false\\n                }\\n            ],\\n            \\\"parseArgs\\\": {\\n                \\\"parserFnName\\\": \\\"default:parseCsv\\\",\\n                \\\"parserArgJson\\\": \\\"{\\\\\\\"recordDelim\\\\\\\":\\\\\\\"\\\\\\\\n\\\\\\\",\\\\\\\"fieldDelim\\\\\\\":\\\\\\\",\\\\\\\",\\\\\\\"isCRLF\\\\\\\":false,\\\\\\\"linesToSkip\\\\\\\":1,\\\\\\\"quoteDelim\\\\\\\":\\\\\\\"\\\\\\\\\\\\\\\"\\\\\\\",\\\\\\\"hasHeader\\\\\\\":true,\\\\\\\"schemaFile\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"schemaMode\\\\\\\":\\\\\\\"loadInput\\\\\\\"}\\\",\\n                \\\"fileNameFieldName\\\": \\\"\\\",\\n                \\\"recordNumFieldName\\\": \\\"\\\",\\n                \\\"allowFileErrors\\\": false,\\n                \\\"allowRecordErrors\\\": false,\\n                \\\"schema\\\": [\\n                    {\\n                        \\\"sourceColumn\\\": \\\"iata\\\",\\n                        \\\"destColumn\\\": \\\"iata\\\",\\n                        \\\"columnType\\\": \\\"DfString\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"airport\\\",\\n                        \\\"destColumn\\\": \\\"airport\\\",\\n                        \\\"columnType\\\": \\\"DfString\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"city\\\",\\n                        \\\"destColumn\\\": \\\"city\\\",\\n                        \\\"columnType\\\": \\\"DfString\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"state\\\",\\n                        \\\"destColumn\\\": \\\"state\\\",\\n                        \\\"columnType\\\": \\\"DfString\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"country\\\",\\n                        \\\"destColumn\\\": \\\"country\\\",\\n                        \\\"columnType\\\": \\\"DfString\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"lat\\\",\\n                        \\\"destColumn\\\": \\\"lat\\\",\\n                        \\\"columnType\\\": \\\"DfFloat64\\\"\\n                    },\\n                    {\\n                        \\\"sourceColumn\\\": \\\"long\\\",\\n                        \\\"destColumn\\\": \\\"long\\\",\\n                        \\\"columnType\\\": \\\"DfFloat64\\\"\\n                    }\\n                ]\\n            },\\n            \\\"size\\\": 10737418240\\n        }\\n    },\\n    \\\"annotations\\\": {}\\n}\"}");
    },

    'add 2nd dataset node': function(browser) {
        browser
            .moveToElement(".category.category-in", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .dataset .main", 100, 200);
    },

    'config 2nd dataset node to carriers': function(browser) {
        browser
            .openOpPanel(".dataset:nth-child(2)")
            .submitAdvancedPanel("#datasetOpPanel", "{\"prefix\":\"carriers\",\"source\":\"rudy.94850.carriers\",\"schema\":[{\"name\":\"Code\",\"type\":\"string\"},{\"name\":\"Description\",\"type\":\"string\"}],\"synthesize\":false,\"loadArgs\":\"{\\n    \\\"operation\\\": \\\"XcalarApiBulkLoad\\\",\\n    \\\"comment\\\": \\\"\\\",\\n    \\\"tag\\\": \\\"\\\",\\n    \\\"state\\\": \\\"Unknown state\\\",\\n    \\\"args\\\": {\\n        \\\"dest\\\": \\\"rudy.94850.carriers\\\",\\n        \\\"loadArgs\\\": {\\n            \\\"sourceArgsList\\\": [\\n                {\\n                    \\\"targetName\\\": \\\"Default Shared Root\\\",\\n                    \\\"path\\\": \\\"/netstore/datasets/flight/carriers.json\\\",\\n                    \\\"fileNamePattern\\\": \\\"\\\",\\n                    \\\"recursive\\\": false\\n                }\\n            ],\\n            \\\"parseArgs\\\": {\\n                \\\"parserFnName\\\": \\\"default:parseJson\\\",\\n                \\\"parserArgJson\\\": \\\"{}\\\",\\n                \\\"fileNameFieldName\\\": \\\"\\\",\\n                \\\"recordNumFieldName\\\": \\\"\\\",\\n                \\\"allowFileErrors\\\": false,\\n                \\\"allowRecordErrors\\\": false,\\n                \\\"schema\\\": []\\n            },\\n            \\\"size\\\": 10737418240\\n        }\\n    },\\n    \\\"annotations\\\": {}\\n}\"}");
    },

    'add join node': function(browser) {
        browser
            .moveToElement(".category.category-join", 1, 1)
            .mouseButtonDown("left")
            .newNode('#dagView .operatorBar .join[data-subtype=""] .main', 300, 100);
    },

    "connect join node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .join .connector.in:nth-child(1)", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left")
            .moveToElement(".dataflowArea.active .join .connector.in:nth-child(2)", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 100)
            .mouseButtonUp("left");
    },

    'config join node': function(browser) {
        let config = {
            "joinType": "innerJoin",
            "left": {
                "columns": [
                    "airports::iata"
                ],
                "keepColumns": [],
                "rename": []
            },
            "right": {
                "columns": [
                    "carriers::Code"
                ],
                "keepColumns": [],
                "rename": []
            },
            "evalString": "",
            "keepAllColumns": true
        };

        browser
            .openOpPanel(".join")
            .submitAdvancedPanel("#joinOpPanel", JSON.stringify(config));
    },

    'restore datasets': function(browser) {
        browser
            .restoreDataset(".dataflowArea.active .dataset:nth-child(1) .main")
            .restoreDataset(".dataflowArea.active .dataset:nth-child(2) .main");
    },

    'add map node': function(browser) {
        browser
            .moveToElement(".category.category-column", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .map .main", 500, 100);
    },

    "connect map node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .map .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

    'config map node': function(browser) {
        let config = {
            "eval": [
                {
                    "evalString": "add(1, 0)",
                    "newField": "one"
                }
            ],
            "icv": false
        };

        browser
            .openOpPanel(".map")
            .submitAdvancedPanel("#mapOpPanel", JSON.stringify(config));
    },

    'add publishIMD node': function(browser) {
        browser
            .moveToElement(".category.category-out", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .publishIMD .main", 700, 100);
    },

    "connect publishIMD node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .publishIMD .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

    'config publishIMD node': function(browser) {
        let time = Math.round(Date.now() / 1000);
        let imdName = "test" + time;
        browser.globals['gTestIMDName'] = imdName;
        let config = {
            "pubTableName": imdName,
            "primaryKeys": [
                "$one"
            ],
            "operator": "$one"
        };

        browser
            .openOpPanel(".publishIMD")
            .setValue("#publishIMDOpPanel .IMDNameInput", imdName)
            .submitAdvancedPanel("#publishIMDOpPanel", JSON.stringify(config));
    },

    'execute': function(browser) {
        browser
            .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                browser.assert.equal(result.value.length, 5);
            })
            .executeAll()
            .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                browser.assert.equal(result.value.length, 5);
            });
    },

    'add IMDTable node': function(browser) {
        browser
            .moveToElement(".category.category-in", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .IMDTable .main", 100, 300);
    },

    'config IMDTable node': function(browser) {
        let config = {
            "source": browser.globals['gTestIMDName'],
            "version": -1,
            "schema": [
                {
                    "name": "iata",
                    "type": "string"
                },
                {
                    "name": "airport",
                    "type": "string"
                },
                {
                    "name": "city",
                    "type": "string"
                },
                {
                    "name": "state",
                    "type": "string"
                },
                {
                    "name": "country",
                    "type": "string"
                },
                {
                    "name": "lat",
                    "type": "float"
                },
                {
                    "name": "long",
                    "type": "float"
                },
                {
                    "name": "column7",
                    "type": "string"
                },
                {
                    "name": "Code",
                    "type": "string"
                },
                {
                    "name": "Description",
                    "type": "string"
                },
                {
                    "name": "one",
                    "type": "float"
                },
                {
                    "name": "XcalarRankOver",
                    "type": "integer"
                },
                {
                    "name": "XcalarOpCode",
                    "type": "integer"
                },
                {
                    "name": "XcalarBatchId",
                    "type": "integer"
                }
            ],
            "filterString": ""
        };

        browser
            .openOpPanel(".IMDTable")
            .pause(8000) // need to check for listTables call to resolve
            .setValue("#IMDTableOpPanel .pubTableInput", browser.globals['gTestIMDName'])
            .pause(1000)
            .moveToElement("#pubTableList li:not(.xc-hidden)", 2, 2)
            .mouseButtonUp("left")
            .click("#IMDTableOpPanel .next")
            .submitAdvancedPanel("#IMDTableOpPanel", JSON.stringify(config));
    },

    'add project node': function(browser) {
        browser
            .moveToElement(".category.category-operations", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .project .main", 300, 300);
    },

    "connect project node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .project .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

    'config project node': function(browser) {
        let config = {
            "columns": [
                "iata",
                "lat",
                "Code",
                "one"
            ]
        };

        browser
            .openOpPanel(".project")
            .submitAdvancedPanel("#projectOpPanel", JSON.stringify(config));
    },

    'add aggregate node': function(browser) {
        browser
            .moveToElement(".category.category-value", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .aggregate .main", 500, 300);
    },

    "connect aggregate node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .aggregate .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

    'config aggregate node': function(browser) {
        let time = Math.round(Date.now() / 1000);
        let aggName = "^agg" + time;
        browser.globals['gAggTestName'] = aggName;

        let config = {
            "evalString": "count(lat)",
            "dest": aggName
        };

        browser
            .openOpPanel(".aggregate")
            .submitAdvancedPanel("#aggOpPanel", JSON.stringify(config));
    },

    'add 2nd map node': function(browser) {
        browser
            .moveToElement(".category.category-column", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .map .main", 500, 400);
    },

    "connect 2nd map node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .map:nth-child(9) .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, -100)
            .mouseButtonUp("left");
    },

    'config 2nd map node': function(browser) {
        let config = {
            "eval": [
                {
                    "evalString": "add(lat, " + browser.globals['gAggTestName'] + ")",
                    "newField": "two"
                }
            ],
            "icv": false
        };

        browser
            .openOpPanel(".map:nth-child(9)")
            .submitAdvancedPanel("#mapOpPanel", JSON.stringify(config));
    },

    'add export node': function(browser) {
        browser
            .moveToElement(".category.category-out", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .export .main", 700, 400);
    },

    "connect export node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .export .connector.in", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

    'config export node': function(browser) {
        let time = Date.now();
        time = Math.round(Date.now() / 1000) + "";
        time = time.slice(0, 5) + "-" + time.slice(5);
        let config = {
            "columns": [
                "iata",
                "lat",
                "Code",
                "one",
                "two"
            ],
            "driver": "single_csv",
            "driverArgs": {
                "target": "Default Shared Root",
                "file_path": browser.globals["gTestExportDirectory"] + "test" + time + ".csv",
                "header": "false"
            }
        };

        browser
            .openOpPanel(".export")
            .pause(6000) // XXX wait for driver options to load
            .submitAdvancedPanel("#exportOpPanel", JSON.stringify(config));
    },


    'final execute': function(browser) {
        browser
            .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                browser.assert.equal(result.value.length, 5);
            })
            .executeAll(200000)
            .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                browser.assert.equal(result.value.length, 10);
            });
    },

    'check last table': function(browser) {
        browser
            .moveToElement(".dataflowArea.active .map:nth-child(9) .main", 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#dagViewTableArea .totalRows', 10000)
            .getText('#dagViewTableArea .totalRows', (result) => {
                browser.assert.equal(result.value, "1")
            })
            .elements('css selector', '.xcTable .th', (result) => {
                browser.assert.equal(result.value.length, 7);
            })
            .getValue('.xcTable .th:nth-child(2) input', (result) => {
                browser.assert.equal(result.value, "iata")
            })
            .getText('.xcTable td:nth-child(2) .displayedData', (result) => {
                browser.assert.equal(result.value, "SNA")
            })
            .getValue('.xcTable .th:nth-child(3) input', (result) => {
                browser.assert.equal(result.value, "lat")
            })
            .getText('.xcTable td:nth-child(3) .displayedData', (result) => {
                browser.assert.equal(result.value, "33.67565861")
            })
            .getValue('.xcTable .th:nth-child(4) input', (result) => {
                browser.assert.equal(result.value, "Code")
            })
            .getText('.xcTable td:nth-child(4) .displayedData', (result) => {
                browser.assert.equal(result.value, "SNA")
            })
            .getValue('.xcTable .th:nth-child(5) input', (result) => {
                browser.assert.equal(result.value, "one")
            })
            .getText('.xcTable td:nth-child(5) .displayedData', (result) => {
                browser.assert.equal(result.value, "1")
            })
            .getValue('.xcTable .th:nth-child(6) input', (result) => {
                browser.assert.equal(result.value, "two")
            })
            .getText('.xcTable td:nth-child(6) .displayedData', (result) => {
                browser.assert.equal(result.value, "34.67565861")
            });
    },

    'clean up': function(browser) {
        browser
            .click("#dataStoresTab")
            .click("#sourceTblButton")
            .click("#datastoreMenu .table .iconSection .refresh")
            .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
            .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + browser.globals['gTestIMDName'] + '"]')
            .moveToElement('#datastoreMenu .grid-unit[data-id="' + browser.globals['gTestIMDName'] + '"]', 20, 20)
            .mouseButtonClick("right")
            .moveToElement("#tableGridViewMenu li.delete", 10, 10)
            .mouseButtonClick("left")
            .click("#alertModal .confirm")
            .waitForElementNotPresent('#datastoreMenu .grid-unit[data-id="' + browser.globals['gTestIMDName'] + '"]');
    },

    'delete workbook': function(browser) {
        browser
            .deleteWorkbook(browser.globals['gTestWorkbookName'], browser.globals['gTestUserName']);
    }
}