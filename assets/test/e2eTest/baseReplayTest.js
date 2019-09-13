const execFunctions = require('./lib/execFunctions');

function replay(testConfig, tags) {
    let testTabs = {}; // { id: string, nodes: [] }
    const testTabMapping = new Map(); // WB tabName => newTabName
    const testDfIdMapping = new Map(); // WB df_id => new df_id
    const testTabDfMapping = new Map(); // tabName => dfId
    const testNodeIdMapping = new Map(); // tabName => nodeMap
    let linkOutOptimizedTable;

    function buildTestUrl(browser, testConfig) {
        return `${browser.globals.launchUrl}testSuite.html?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${browser.globals.user}&id=0`
    }

    return {
        '@tags': tags,

        before: function(browser) {
            browser
                .url(buildTestUrl(browser, testConfig))
                .waitForElementVisible('#container', 1000 * 60 * 20)
                .waitForElementVisible('#container.noWorkbook', 1000 * 60 * 2);
        },

        after: function(browser) {
            browser.deleteWorkbook(browser.globals.finalWorkbookName, browser.globals.user);
        },

        'upload and enter workbook': function(browser) {
            browser.uploadAndEnterWorkbook(testConfig.workbook);
        },

        'disable auto exec': function(browser) {
            browser.execute(execFunctions.disableAutoExec, []);
        },

        'get tabs and nodes': function(browser) {
            browser.execute(execFunctions.getDataflowInfo, [], function(result) {
                testTabs = result.value;
            });
        },

        'new tabs': function(browser) {
            browser.waitForElementNotVisible("#initialLoadScreen", 100000);
            // close intro popup if visible

            browser.isPresent("#intro-popover", (isPresent) => {
                if (isPresent) {
                    browser.click("#intro-popover .cancel");
                    browser.pause(1000);
                }
                const tabNames = Object.keys(testTabs);
                let newTabIndex = tabNames.length + 1;
                for (const tabName of tabNames) {
                    const selector = `#dagTabSectionTabs .dagTab:nth-child(${newTabIndex}).active`;
                    browser
                        .click('#tabButton')
                        .waitForElementPresent(selector, 2000)
                        .getText(`${selector} div.name`, function(result) {
                            testTabMapping.set(tabName, result.value);
                        })
                        .execute(function(tabIndex) {
                            const tab = DagTabManager.Instance.getTabByIndex(tabIndex);
                            return tab.getId();
                        }, [newTabIndex - 1], function(result) {
                            testDfIdMapping.set(testTabs[tabName].id, result.value);
                            testTabDfMapping.set(tabName, testTabs[tabName].id); // uploaded df
                            testTabDfMapping.set(testTabMapping.get(tabName), result.value); // replayed df
                        });

                    newTabIndex ++;
                }
            });

        },

        'clearAggs': function(browser) {
            browser.execute(function() {
                let aggs = DagAggManager.Instance.getAggMap();
                for (agg in aggs) {
                    DagAggManager.Instance.removeAgg(agg);
                }
                setInterval(function() {

                })
                return true;
            }, [], null);
        },

        'recreate nodes': function(browser) {
            for (const tabName of Object.keys(testTabs)) {
                const newTabName = testTabMapping.get(tabName);
                browser.switchTab(newTabName)
                .recreateNodes(testTabs[tabName].nodes, testTabDfMapping.get(tabName), testDfIdMapping, function(result) {
                    testConfig.IMDNames = result.IMDNames;

                    testNodeIdMapping.set(newTabName, result.nodeIdMap);
                    console.log(result);
                });
                browser
                .elements('css selector','.dataflowArea.active .operator', function (result) {
                    console.log("first--result: " + result.value.length);
                });
            }
        },

          // imdTable nodes depend on publishedIMD node to be executed first
        'config imdTable nodes': function(browser) {
            for (const tabName of Object.keys(testTabs)) {
                const newTabName = testTabMapping.get(tabName);
                browser.switchTab(newTabName);
                let modifier = 1;

                testTabs[tabName].nodes.forEach((node, i) => {
                    let input = JSON.parse(JSON.stringify(node.input));
                    if (node.type === "IMDTable") {
                        browser
                            .openOpPanel(".operator:nth-child(" + (i + modifier) + ")")
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
                            .openOpPanel(".operator:nth-child(" + (i + modifier) + ")")
                            .pause(pause)
                            .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
                    } else if (node.type === "custom") {
                        // we have to change the modifier to represent that the custom nodes are created last during the recreate nodes step.
                        modifier--;
                    }
                });
            }
        },

        'execute optimized nodes first': function(browser) {
            for (const tabName of Object.keys(testTabs)) {
                const newTabName = testTabMapping.get(tabName);
                const numOfNodes = testTabs[tabName].nodes.length;

                const linkOutOptimizedNode = testTabs[tabName].nodes.find((node) => {
                    return node.type === "link out" &&
                        node.title === "optimized";
                });
                if (linkOutOptimizedNode) {
                    browser.switchTab(newTabName);
                    browser.waitForElementNotPresent(".dataflowArea.active.locked");
                    let linkOutNodeId = testNodeIdMapping.get(newTabName)[linkOutOptimizedNode.nodeId];

                    let selector = '.operator[data-nodeid="' + linkOutNodeId + '"]';
                    browser
                        .moveToElement(".dataflowArea.active " + selector, 30, 15)
                        .mouseButtonClick('right')
                        .waitForElementVisible("#dagNodeMenu", 1000)
                        .moveToElement("#dagNodeMenu li.createNodeOptimized", 10, 1)
                        .waitForElementNotPresent(".dataflowArea.active.locked")
                        .mouseButtonClick('left')
                        .waitForElementNotPresent('.dataflowArea ' + selector + '.locked', numOfNodes * 20000);

                    browser.execute(execFunctions.getTableNameFromOptimizedGraph, [], ({value}) => {
                        linkOutOptimizedTable = value;
                    });
                }
            }
        },

        'execute': function(browser) {
            // let linkOutOptimizedTable;
            for (const tabName of Object.keys(testTabs)) {
                browser.perform(() => {
                    const newTabName = testTabMapping.get(tabName);
                    const numOfNodes = testTabs[tabName].nodes.length;
                    // used for checking completed nodes
                    const numOfCustomNodes = testTabs[tabName].nodes.filter((node) => {
                        return node.type === "custom";
                    }).length;
                    console.log("numOfCustomNodes: " + numOfCustomNodes);
                    browser
                    .switchTab(newTabName);

                    const linkInOptimizedNode = testTabs[tabName].nodes.find((node) => {
                        return node.type === "link in" &&
                            node.title === "optimized";
                    });

                    if (linkInOptimizedNode && linkOutOptimizedTable) {
                        let linkInNodeId = testNodeIdMapping.get(newTabName)[linkInOptimizedNode.nodeId];
                        const input = JSON.parse(JSON.stringify(linkInOptimizedNode.input));
                        const schema = linkInOptimizedNode.schema;
                        input.source = linkOutOptimizedTable;
                        input.schema = schema;
                        browser
                        .openOpPanel('.operator[data-nodeid="' + linkInNodeId + '"]')
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 100000);
                    }

                    browser
                    .elements('css selector','.dataflowArea.active .operator', function (result) {
                        console.log("second--result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                        browser.assert.ok(result.value.length > 0);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                        browser.assert.ok(result.value.length < numOfNodes);
                    })
                    .executeAll(numOfNodes * 20000)
                    .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                        browser.assert.equal(result.value.length, 0); // link out optimized not executed
                    })
                    .saveScreenshot("nwscreenshot1.png")
                    .elements('css selector','.dataflowArea.active .operator', function (result) {
                        console.log("third--result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                        console.log("nodes", result.value);
                        console.log("result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                        browser.assert.equal(result.value.length - numOfCustomNodes, numOfNodes);
                    });

                    browser.waitForElementNotPresent(".dataflowArea.active.locked");
                });
            }
        },

        'validate': function(browser) {
            // The validation nodes must be DFLinkOut
            for (const {dfName, nodeName} of testConfig.validation) {
                const newTabName = testTabMapping.get(dfName);

                const linkOutNode = testTabs[dfName].nodes.find((node) => {
                    return node.type === "link out" &&
                           node.input.name === nodeName;
                });

                let linkOutNodeId = testNodeIdMapping.get(newTabName)[linkOutNode.nodeId];

                browser
                    .switchTab(newTabName)
                    .moveToElement(`.dataflowArea.active .operator[data-nodeid="${linkOutNodeId}"] .main`, 10, 20)
                    .mouseButtonClick('right')
                    .waitForElementVisible("#dagNodeMenu", 1000)
                    .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible('#dagViewTableArea .totalRows', 20000)
                    .getText('#dagViewTableArea .totalRows', ({value}) => {
                        browser.assert.equal(value, "0");
                    });
            }
        },

        // remove imd table
        'clean up': function(browser) {
            if (testConfig.IMDNames && testConfig.IMDNames.length) {
                browser
                .click("#dataStoresTab")
                .click("#sourceTblButton")
                .click("#datastoreMenu .table .iconSection .refresh")
                .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
                .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + testConfig.IMDNames[0] + '"]')

                testConfig.IMDNames.forEach((IMDName) => {
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

    };
}

module.exports = {
    replay: replay
};
