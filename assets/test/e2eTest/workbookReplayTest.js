module.exports = {
    tags: ['Workbook Replay'],
    'open browser': function(browser) {
        // let user = "dftest" + Math.floor(Math.random() * 1000 + 1);
        let user = "dftest";
        let url = "http://localhost:8080/testSuite.html" +
        "?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=" + user + "&id=0"
        // open browser
        browser
            .url(url)
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    'upload workbook': function(browser) {
        browser.uploadWorkbook("example");
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
            .waitForElementVisible('.dataflowArea.active g.operator.dataset', 2000)
            .moveToElement(".dataflowArea.active g.operator.dataset", 20, 20)
            .mouseButtonClick('left')
            .waitForElementVisible('.dataflowArea.active g.operator.dataset.selected', 2000)
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
            .executeAll();
    },

    'delete workbook': function(browser) {
        browser
        .deleteWorkbook("example");
    }
}