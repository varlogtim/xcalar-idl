module.exports = {
    '@tags': ["workbook replay", "yy"],

    'open browser': function(browser) {
        // let user = "dftest" + Math.floor(Math.random() * 1000 + 1);
        let user = "dftest";
        browser.globals['gTestUserName'] = user;
        let url = "http://localhost:8888/testSuite.html" +
        "?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=" + user + "&id=0"
        // open browser
        browser
            .url(url)
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    'upload workbook': function(browser) {
        browser.globals['gTestWorkbookName'] = "Test-Dataflow-Dataset";
        browser.uploadWorkbook(browser.globals['gTestWorkbookName']);
    },

    'activate workbook': function(browser) {
        // activate workbook
        browser
            .click(".workbookBox .content.activate")
            .pause(1000)
            .waitForElementNotVisible("#initialLoadScreen", 100000)
            .waitForElementVisible('.dataflowArea.active.rendered', 100000);
    },

    'getNodes': function(browser) {
        browser
            .execute(function() {
                let sortedNodes = DagView.getActiveDag().getSortedNodes();
                sortedNodes = sortedNodes.map((node) => {
                    return node.getNodeCopyInfo(true);
                });

                return sortedNodes;
            }, [], function(result) {
                browser.globals["gTestNodes"] = result.value;
            });
    },

    'newTab': function(browser) {
        browser
            .waitForElementNotVisible("#initialLoadScreen", 100000)
            .click("#tabButton")
            .waitForElementPresent("#dagTabSectionTabs .dagTab:nth-child(2).active", 2000)
    },

    // adds all the nodes, connects them, and configures them
    'recreateNodes': function(browser) {
        browser.execute(function() {
            let aggs = DagAggManager.Instance.getAggMap();
            for (agg in aggs) {
                DagAggManager.Instance.removeAgg(agg);
            }
            return true;
        }, [], null);

        browser.globals["gTestNodes"].forEach((node, i) => {
            browser
                .execute(function(node) {
                    let type = node.type.split(" ").join(".");
                    let selector = "#dagView .operatorBar ." + type;
                    if (node.subType) {
                        selector += '[data-subtype="' + node.subType + '"]';
                    }
                    let el = document.querySelector(selector);
                    let categoryClassName;
                    el.classList.forEach(function(className) {
                        if (className.startsWith("category-")) {
                            categoryClassName = className;
                            return false;
                        }
                    });
                    return {categoryClass: categoryClassName, nodeSelector: selector};
                }, [node], (result) => {
                    browser
                    .moveToElement(".category." + result.value.categoryClass, 1, 1)
                    .mouseButtonDown("left")
                    .newNode(result.value.nodeSelector + ' .main', node.display.x, node.display.y);

                    node.parents.forEach((parentId, j) => {
                        if (parentId) {
                            const parentNode = browser.globals["gTestNodes"].find((nodes) => {
                                return nodes.nodeId === parentId;
                            });
                            let coorDelta = {
                                x: parentNode.display.x - node.display.x + 20,
                                y: parentNode.display.y - node.display.y
                            };
                            let connectorIndex = j + 1;
                            if (node.type === "sql" || node.type === "set") {
                                connectorIndex = 1;
                            }
                            if (node.type !== "dataset")
                            browser
                            .moveToElement(".dataflowArea.active .operator:nth-child(" + (i + 1) + ") .connector.in:nth-child(" + connectorIndex + ")", 2, 2)
                            .mouseButtonDown("left")
                            .moveTo(null, coorDelta.x, coorDelta.y)
                            .mouseButtonUp("left");
                        }
                    });

                    let input = JSON.parse(JSON.stringify(node.input));
                    let pause = 1;
                    if (node.type === "dataset") {
                        input.schema = node.schema;
                    }

                    if (node.type === "publishIMD") {
                        if (!browser.globals["gTestIMDNames"]) {
                            browser.globals["gTestIMDNames"] = [];
                        }
                        browser.globals["gTestIMDNames"].push(input.pubTableName);
                        browser
                            .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                            .pause(pause)
                            .setValue("#publishIMDOpPanel .IMDNameInput", input.pubTableName)
                            .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                            .executeNode(".operator:nth-child(" + (i + 1) + ")")
                    } else if (node.type !== "IMDTable" && node.type !== "export") {
                        browser
                            .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                            .pause(pause)
                            .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
                    }

                    if (node.type === "dataset") {
                        browser
                            .restoreDataset(".dataflowArea.active .dataset:nth-child(" + (i + 1) + ") .main");
                    }
                });
        });
    },

    'config imdTable nodes': function(browser) {
        browser.globals["gTestNodes"].forEach((node, i) => {
            let input = JSON.parse(JSON.stringify(node.input));
            if (node.type === "IMDTable") {
                browser
                    .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                    .pause(8000) // need to check for listTables call to resolve
                    .setValue("#IMDTableOpPanel .pubTableInput", input.source)
                    .pause(1000)
                    .moveToElement("#pubTableList li:not(.xc-hidden)", 2, 2)
                    .mouseButtonUp("left")
                    .click("#IMDTableOpPanel .next")
                    .submitAdvancedPanel("#IMDTableOpPanel", JSON.stringify(input, null, 4));
            } else if (node.type === "export") {
                pause = 6000;
                input.driverArgs.file_path = "/home/jenkins/export_test/datasetTest.csv";
                browser
                    .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                    .pause(pause)
                    .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
            }

        });
    },

    'execute': function(browser) {
        browser
            .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                browser.assert.ok(result.value.length > 0);
            })
            .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                browser.assert.ok(result.value.length < browser.globals["gTestNodes"].length);
            })
            .executeAll(browser.globals["gTestNodes"].length * 10000)
            .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                browser.assert.equal(result.value.length, 0);
            })
            .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                browser.assert.equal(result.value.length, browser.globals["gTestNodes"].length);
            });
    },

    // remove imd table
    'clean up': function(browser) {
        if (browser.globals["gTestIMDNames"]) {
            browser
            .click("#dataStoresTab")
            .click("#sourceTblButton")
            .click("#datastoreMenu .table .iconSection .refresh")
            .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
            .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + browser.globals['gTestIMDNames'][0] + '"]')

            browser.globals["gTestIMDNames"].forEach((IMDName) => {
                browser
                    .moveToElement('#datastoreMenu .grid-unit[data-id="' + IMDName + '"]', 20, 20)
                    .mouseButtonClick("right")
                    .moveToElement("#tableGridViewMenu li.delete", 10, 10)
                    .mouseButtonClick("left")
                    .click("#alertModal .confirm")
                    .waitForElementNotPresent('#datastoreMenu .grid-unit[data-id="' + IMDName + '"]');
            });
        }
    },

    // load the csv that contains the correct result
    'loadDataset': function(browser) {
        let datasetName = "datasetTest" + Math.round(Date.now() / 1000);
        browser.globals["gTestDataset"] = datasetName;
        browser
            .waitForElementNotVisible("#initialLoadScreen", 100000)
            .click("#dataStoresTab")
            .click("#importDataButton")
            // .setValue("#dsForm-target input", "Default Shared Root")
            .setValue("#filePath", "/netstore/datasets/export_test/datasetTest.csv")
            .click("#dsForm-path .confirm")
            .waitForText("#previewTable td:nth-child(2)", "SNA", 20)
            .clearValue("#importDataForm .dsName")
            .setValue("#importDataForm .dsName", datasetName)
            .click("#importDataForm .buttonSection .confirm:not(.createTable)")
            .waitForElementPresent('.grid-unit[data-dsname="' + datasetName + '"]:not(.loading)', 20000)
            .click("#dagButton");
    },

    'add final dataset node': function(browser) {
        browser
            .moveToElement(".category.category-in", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .dataset .main", 500, 500);
    },

    'config final dataset node': function(browser) {
        browser
            .openOpPanel(".operator:nth-child(" + (browser.globals["gTestNodes"].length + 1) + ")")
            .click('#datasetOpPanel .fileName[data-id$="' + browser.globals["gTestDataset"] + '"]')
            .click("#datasetOpPanel .next")
            .waitForElementVisible("#datasetOpPanel .submit", 10000)
            .click("#datasetOpPanel .submit");
    },

    'add sql node': function(browser) {
        browser
            .moveToElement(".category.category-SQL", 1, 1)
            .mouseButtonDown("left")
            .newNode('#dagView .operatorBar .sql[data-subtype=""] .main', 700, 500);
    },

    "connect sql node": function(browser) {
        browser
            .moveToElement(".dataflowArea.active .sql .connector.in:nth-child(1)", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, -100)
            .mouseButtonUp("left")
            .moveToElement(".dataflowArea.active .sql .connector.in:nth-child(1)", 2, 2)
            .mouseButtonDown("left")
            .moveTo(null, -180, 0)
            .mouseButtonUp("left");
    },

     // checking sql result is disabled as config isn't currently working due
    // to CORS

    // 'config sql node': function(browser) {
    //     let config = {
    //         "sqlQueryString": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
    //         "identifiers": {
    //             "1": "a",
    //             "2": "b"
    //         },
    //         "identifiersOrder": [
    //             1,
    //             2
    //         ]
    //     };

    //     browser
    //         .openOpPanel(".sql")
    //         .submitAdvancedPanel("#sqlOpPanel", JSON.stringify(config, null, 4));
    // },


    // 'sql execute': function(browser) {
    //     browser
    //         .executeAll(200000)
    //         .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
    //             browser.assert.equal(result.value.length, 0);
    //         });
    // },


    // 'check last table': function(browser) {
    //     browser
    //         .moveToElement(".dataflowArea.active .sql .main", 10, 20)
    //         .mouseButtonClick('right')
    //         .waitForElementVisible("#dagNodeMenu", 1000)
    //         .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
    //         .mouseButtonClick('left')
    //         .waitForElementVisible('#dagViewTableArea .totalRows', 10000)
    //         .getText('#dagViewTableArea .totalRows', (result) => {
    //             browser.assert.equal(result.value, "0")
    //         })
    //         .elements('css selector', '.xcTable .th', (result) => {
    //             browser.assert.equal(result.value.length, 7);
    //         })
    //         .getValue('.xcTable .th:nth-child(2) input', (result) => {
    //             browser.assert.equal(result.value, "iata")
    //         })
    //         .getValue('.xcTable .th:nth-child(3) input', (result) => {
    //             browser.assert.equal(result.value, "lat")
    //         })
    //         .getValue('.xcTable .th:nth-child(4) input', (result) => {
    //             browser.assert.equal(result.value, "Code")
    //         })
    //         .getValue('.xcTable .th:nth-child(5) input', (result) => {
    //             browser.assert.equal(result.value, "one")
    //         })
    //         .getValue('.xcTable .th:nth-child(6) input', (result) => {
    //             browser.assert.equal(result.value, "two")
    //         });
    // },

    // XXX the following check is specific to the "Test-Dataflow-Dataset" workbook
    'check last table': function(browser) {
        browser
            .moveToElement(".dataflowArea.active .operator:nth-child(8) .main", 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#dagViewTableArea .totalRows', 20000)
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

    'delete workbook': function(browser) {
        browser
        .deleteWorkbook(browser.globals['gTestWorkbookName'], browser.globals['gTestUserName']);
    }
}