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
                 .waitForElementVisible("#dagView .newTab", 100000)
                 .waitForElementNotVisible("#initialLoadScreen", 100000)

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
            .moveToElement(".category-out", 1, 1)
            .mouseButtonDown("left")
            .pause(2000)
            .moveToElement(".category-in", 1, 1)
            .mouseButtonDown("left")
            .pause(2000)
            .moveToElement("#dagView .operatorBar .dataset .main", 1, 1)
            .mouseButtonDown("left")
            .pause(5000)
            .waitForElementVisible('#dagView .operatorBar .dataset .main', 1000)
            .moveToElement("#dagView .operatorBar .dataset .main", 1, 1)
            .mouseButtonDown("left", function() {
                browser.moveTo(null, 200, 200)
                .pause(2000)
                .moveTo("#dagView .operatorBar .dataset .main", 200, 200)
            })
            .pause(1000)
            // .moveTo("#dagView .operatorBar .dataset .main", 200, 200)
            .moveTo(null, 200, 200)
            .pause(5000)
            .mouseButtonUp("left")
            .pause(5000)
    },

    'delete workbook': function(browser) {
        browser
        .deleteWorkbook(browser.globals['gTestWorkbookName']);
    }
}