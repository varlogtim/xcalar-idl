module.exports = {
    '@tags': ["xdNavigation"],
    'XD Navigation Testing': function (browser) {
        browser
            .url(buildTestUrl(browser))
            .waitForElementVisible('#container', 1000 * 60 * 20)
            .waitForElementVisible('#container.noWorkbook', 1000 * 60 * 2)
            .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 10 * 1000)
            .pause(100)
            .isPresent("#intro-popover", (isPresent) => {
                if (isPresent) {
                    browser.click("#intro-popover .cancel")
                    browser.pause(1000)
                }
                browser.click("#monitorTab")
                browser.pause(10000)
                browser.waitForElementVisible("#monitorPanel", 10)
                browser.assert.ok(1 == 1)                
                browser.waitForElementVisible("#queriesButton", 10)
                browser.assert.ok(1 == 1)
                browser.waitForElementVisible("#systemButton", 10)
                browser.assert.ok(1 == 1)
                browser.waitForElementVisible("#fileManagerButton", 10)
                browser.assert.ok(1 == 1)                
                browser.waitForElementVisible("#settingsButton", 10)
                browser.assert.ok(1 == 1)                
                browser.end();
            });
    }
};
function buildTestUrl(browser) {
    return `${browser.globals.launchUrl}testSuite.html?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${browser.globals.user}&id=0`
}