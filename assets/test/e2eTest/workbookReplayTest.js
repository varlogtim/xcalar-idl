module.exports = {
    tags: ['Workbook Replay'],
    'open browser': function(browser) {
        // let user = "dftest" + Math.floor(Math.random() * 1000 + 1);
        let user = "dftest";
        let url = "http://localhost:8888/testSuite.html" +
        "?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=" + user + "&id=0"
        // open browser
        browser
            .url(url)
            .waitForElementVisible('#container.noWorkbook', 10000);

        // used to freeze the test
        // browser
        //     .waitForElementVisible('abc', 100000)
    },

    'upload workbook': function(browser) {
        let fileName = 'example';
        let path = require('path').resolve(__dirname + '/../../dev/e2eTest/workbooks/'
        + fileName + '.xlrwb.tar.gz')
        // upload workbook
        browser
            .setValue('input#WKBK_uploads', path)
            .waitForElementVisible('.workbookBox.noResource .subHeading input', 10000)
            .assert.value(".workbookBox.noResource .subHeading input", fileName)
            .pause(1000)
    },

    'activate workbook': function(browser) {
        // activate workbook
        browser
            .click(".workbookBox .content.activate")
            .waitForElementVisible('.dataflowArea.active.rendered', 100000)
    },

    'restore dataset': function(browser) {
        // restore dataset
        browser
            .waitForElementVisible('.dataflowArea.active g.operator.dataset', 1000)
            .moveToElement(".dataflowArea.active g.operator.dataset", 20, 20)
            .mouseButtonClick('left')
            .waitForElementVisible('.dataflowArea.active g.operator.dataset.selected', 1000)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.restoreDataset", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#dsTable', 100000)
    },

    'execute': function(browser) {
        // execute
        browser
            .moveToElement('#modelingDataflowTab', 1, 1)
            .mouseButtonClick('left')
            .pause(1000)
            .moveToElement("#dagViewBar .topButton.run .icon", 1, 1)
            .mouseButtonClick('left')
            .pause(1000)
            .waitForElementNotPresent(".dataflowArea.active .state-Configured")
            .waitForElementNotPresent(".dataflowArea.active .state-Running");
    }
}