const execFunctions = require('./lib/execFunctions');

function replay(testConfig, tags) {
    let testTabs = {}; // { id: string, nodes: [] }
    const testTabMapping = new Map(); // WB tabName => newTabName
    const testDfIdMapping = new Map(); // WB df_id => new df_id
    const testTabDfMapping = new Map(); // tabName => dfId

    function buildTestUrl(browser, testConfig) {
        return `${browser.globals.launchUrl}testSuite.html?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${browser.globals.user}&id=0`
    }

    function findValidateNodeIndex(linkOutName, nodeInfos) {
        for (let i = 0; i < nodeInfos.length; i ++) {
            const nodeInfo = nodeInfos[i];
            if (nodeInfo.type === 'link out' && nodeInfo.input.name === linkOutName) {
                return i;
            }
        }
        return -1;
    }

    return {
        '@tags': tags,

        before: function(browser) {
            browser
                .url(buildTestUrl(browser, testConfig))
                .waitForElementVisible('#container', 1000 * 60 * 30)
                .waitForElementVisible('#container.noWorkbook', 10000);
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
                    console.log(result);
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

        'execute': function(browser) {
            for (const tabName of Object.keys(testTabs)) {
                const newTabName = testTabMapping.get(tabName);
                const numOfNodes = testTabs[tabName].nodes.length;
                // used for checking completed nodes
                const numOfCustomNodes = testTabs[tabName].nodes.filter((node) => {
                    return node.type === "custom";
                }).length;



                const linkOutNode = testTabs[tabName].nodes.find((node) => {
                    return node.subType === "link out Optimized";
                });

                browser
                    .switchTab(newTabName)
                    .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                        browser.assert.ok(result.value.length > 0);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                        browser.assert.ok(result.value.length < numOfNodes);
                    });
                    if (linkOutNode) {
                        // if there's an optimized node present, get all the nodeIds
                        // of the other nodes and execute those, leaving the optimized
                        // node out
                        browser.executeAllNonOptimized(numOfNodes * 20000);
                    } else {
                        browser.executeAll(numOfNodes * 20000);
                    }

                    if (linkOutNode) {
                        browser.elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                            browser.assert.equal(result.value.length, 1); // link out optimized not executed
                        })
                        .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                            browser.assert.equal(result.value.length - numOfCustomNodes, numOfNodes - 1);
                        });
                    } else {
                        browser.elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                            browser.assert.equal(result.value.length, 0); // link out optimized not executed
                        })
                        .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                            browser.assert.equal(result.value.length - numOfCustomNodes, numOfNodes);
                        });
                    }

                    browser.waitForElementNotPresent(".dataflowArea.active.locked");

                    if (linkOutNode) {
                        // let linkOutNodeId = linkOutNode.nodeId;
                        let selector = '.operator[data-subtype="link out Optimized"]';
                        browser
                            .moveToElement(".dataflowArea.active " + selector, 30, 15)
                            .mouseButtonClick('right')
                            .waitForElementVisible("#dagNodeMenu", 1000)
                            .moveToElement("#dagNodeMenu li.executeNodeOptimized", 10, 1)
                            .waitForElementNotPresent(".dataflowArea.active.locked")
                            .mouseButtonClick('left')
                            .waitForElementPresent('.dataflowArea ' + selector + '.state-Complete', numOfNodes * 20000);
                    }
            }
        },

        'validate': function(browser) {
            // The validation nodes must be DFLinkOut
            for (const {dfName, nodeName} of testConfig.validation) {
                const newTabName = testTabMapping.get(dfName);
                const nodeIndex = findValidateNodeIndex(nodeName, testTabs[dfName].nodes);
                browser
                    .switchTab(newTabName)
                    .moveToElement(`.dataflowArea.active .operator:nth-child(${nodeIndex + 1}) .main`, 10, 20)
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
