const testConfig = {
    workbook: 'Tutorial1-Parsers',
    baseUrl: 'http://localhost:8888/testSuite.html',
    finalNodeName: 'Node 1', // output node we want to test the result of
    resultDatasetPath: "/home/jenkins/export_test/upgradeTest.csv" // change this to the location of the exported result
};

const execFunctions = require('./lib/execFunctions');
let nodes = []; // NodeInfo[] - fetch and store the nodes from the graph
let testDatasetId; // id of the result dataset that contains the correct exported results
let sqlNodeId;

module.exports = {
    '@tags': ["workbook tutorial",  "allTests"],

    before: function(browser) {
        browser
            .url(browser.globals.buildTestUrl(browser.globals.user))
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    after: function(browser) {
        browser.deleteWorkbook(browser.globals.finalWorkbookName, testConfig.user);
    },

    'upload and enter workbook': function(browser) {
        browser.uploadAndEnterWorkbook(testConfig.workbook);
    },

    'get nodes': function(browser) {
        browser.execute(execFunctions.getNodes, [], function(result) {
            nodes = result.value;
        });
    },

    'restore datasets': function(browser) {
        const datasetNodes = nodes.filter((node) => {
            return node.type === "dataset";
        });

        datasetNodes.forEach((nodeInfo) => {
            browser
                .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + nodeInfo.nodeId + '"] .main');
        });
    },

    'loadTestDataset': function(browser) {
        browser.createResultDataset(testConfig.resultDatasetPath, function(resultNodeId) {
            testDatasetId = resultNodeId;
        });
    },

    'addSQLNode': function(browser) {
        browser.addSQLNode(testConfig, nodes, testDatasetId, (value) => {
            sqlNodeId = value;
        });
    },

    'execute': function(browser) {
        browser
            .validatePreExecuteAll(nodes)
            .executeAll(nodes.length * 10000)
            .validatePostExecuteAll(nodes);
    },

    'validate': function(browser) {
        // can take in an optional sqlNodeId if multiple sql nodes exist
        browser.validateSQLNode();
    },
};