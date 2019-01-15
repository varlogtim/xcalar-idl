module.exports = {
    tags: ['Workbook Replay'],
    'open browser': function(browser) {
        let user = "dftest";
        let url = "http://localhost:8080/testSuite.html" +
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
                .waitForElementVisible("#modeArea", 100000)
                .waitForElementNotVisible("#initialLoadScreen", 100000)
                .click("#modeArea")
                .moveToElement("#modeAreaMenu .advanced", 25, 5)
                .mouseButtonUp("left")
                .waitForElementNotVisible("#initialLoadScreen", 100000)
                .click("#dagButton");
         });
    },

    'new tab': function(browser) {
        // restore dataset
        browser
            .click("#dagView .newTab")
            .pause(1000)
    },

    'add dataset node': function(browser) {
        browser
            .moveToElement(".category.category-in", 1, 1)
            .mouseButtonDown("left")
            .newNode("#dagView .operatorBar .dataset .main", 100, 100)
    },

    'config dataset node': function(browser) {
        browser
            .openOpPanel(".dataset")
            .submitAdvancedPanel("#datasetOpPanel", "testConfig");
    },

    'delete workbook': function(browser) {
        browser
        .deleteWorkbook(browser.globals['gTestWorkbookName']);
    }
}