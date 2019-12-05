module.exports = {
    '@tags': ["tooltip walkthrough test", "allTests"],

    before: function(browser) {
        // to auto start first-time user tooltip walkthrougs
        randomUsername = 'tooltiptest' + Math.random().toString(36).substring(2, 15);
        browser.globals.currentUsername = randomUsername;

        browser
            .url(browser.globals.buildTestUrl(browser, randomUsername))
            .waitForElementVisible('#container', 10 * 1000)
            .waitForElementVisible('#container.noWorkbook', 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 2 * 60 * 1000);
    },

    after: function(browser) {
        browser.deleteFirstWorkbook();
    },

    'should auto start and do project walkthrough ': function(browser) {
        browser
            .waitForElementVisible("#intro-popover")
            .pause(1000)

            //learning Xcalar tip
            .expect.element('#intro-popover .title').text.to.equal('Welcome to Xcalar Design!')
        browser
            .tooltipTest(".tutBox")
            .tooltipTest("#createWKBKbtn", "#createWKBKbtn")
            .pause(5000)

            //newly created project tip
            .waitForElementVisible(".lastCreate")
            .click("#intro-popover .close")
            .waitForElementNotVisible("#modalBackground")
            .waitForElementNotPresent("#intro-visibleOverlay")
            .deleteFirstWorkbook();
    },

    'tooltip modal can be opened from learning Xcalar in Project Browser': function(browser) {
        browser
            .waitForElementVisible(".tutBox .tooltipBtn")
            .click(".tutBox .tooltipBtn")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'tooltip modal can be opened from help panel': function(browser) {
        browser
            .waitForElementVisible("#helpMenuTab")
            .click("#helpMenuTab")
            .waitForElementVisible("#tooltipResource")
            .click("#tooltipResource")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
            .click("#helpMenuTab")
    },

    'tooltip modal can be opened from top right user menu': function(browser) {
        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'only project tooltip walkthrough is enabled if no active Projects': function(browser) {
        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser.assert.cssClassPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'upload and enter a new project': function(browser) {
        browser.createAndEnterWorkbook();
    },

    "should auto start and do the entire Sql mode walkthrough for on prem successfully": function(browser) {
        browser
            .waitForElementVisible("#intro-popover")

            .tooltipTest("#modeArea")
            .tooltipTest("#userNameArea")
            .tooltipTest("#menuBar")
            .tooltipTest("#dataStoresTab")
            .tooltipTest("#sqlTab")
            .tooltipTest("#monitorTab")
            .tooltipTest("#dataStoresTab", "#dataStoresTab .mainTab")
            .tooltipTest("#sourceTblButton", "#sourceTblButton")
            .tooltipTest("#dsForm-target")
            .tooltipTest("#filePath")
            .tooltipTest("#dsForm-path .cardMain .browse")
            .tooltipTest("#dsForm-path .btn-submit")
            .tooltipTest("#dsForm-path")
            .tooltipTest("#sqlWorkSpace", "#sqlWorkSpace")
            .tooltipTest("#sqlEditorSpace")
            .tooltipTest("#sqlTableListerArea")
            .tooltipTest("#sqlWorkSpacePanel .historySection")
            .tooltipTest("#helpMenuTab", "#helpMenuTab")
            .tooltipTest("#tutorialResource")

            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'all tooltip walkthroughs are enabled if there is an active project': function(browser) {
        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'should start project walkthrough successfully': function(browser) {
        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser
            .assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(1) button')
            .waitForElementVisible("#intro-popover")
            .expect.element('#intro-popover .title').text.to.equal('Welcome to Xcalar Design!')
        browser
            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'should do the entire developer mode walkthrough successfully': function(browser) {
        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser
            .assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(3) button')
            .waitForElementVisible("#intro-popover")

            .tooltipTest("#modeArea")
            .tooltipTest("#userNameArea")
            .tooltipTest("#tabButton", "#tabButton")
            .tooltipTest(".dataflowMainArea")
            .tooltipTest("#dagView .categoryBar")
            .tooltipTest("#dagView .operatorBar")
            .tooltipTest("#dagView .operatorBar")
            .tooltipTest(
                "#dagView .operatorWrap .active .operator:first-of-type",
                "#dagView .operatorWrap .active .operator:first-of-type rect.main",
                true
            )
            .tooltipTest(".dataflowArea.active rect.main")
            .tooltipTest(
                "#dagView .operatorWrap .active .operator:first-of-type",
                "#dagView .operatorWrap .active .operator:first-of-type rect.main",
                true
            )
            .tooltipTest("#dagView", "#intro-popover .next")
            .tooltipTest("#helpMenuTab", "#helpMenuTab")
            .tooltipTest("#tutorialResource")

            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'should do the entire Sql mode walkthrough for cloud successfully': function(browser) {
        let oldIsCloud
        browser.execute(function() {
            oldIsCloud = XVM.isCloud;
            XVM.isCloud = () => true;
        }, [], null);

        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(2) button')
            .waitForElementVisible("#intro-popover")
            .tooltipTest("#modeArea")
            .tooltipTest("#userNameArea")
            .tooltipTest("#menuBar")
            .tooltipTest("#dataStoresTab")
            .tooltipTest("#sqlTab")
            .tooltipTest("#monitorTab")
            .tooltipTest("#dataStoresTab", "#dataStoresTab .mainTab")
            .tooltipTest("#sourceTblButton", "#sourceTblButton")

            .assert.cssClassNotPresent("#bottomMenu", "open")
            .assert.cssClassNotPresent("#dsFormView", "xc-hidden")
            .tooltipTest("#dsForm-source .location.file")
            .tooltipTest("#dsForm-source .location.s3")
            .tooltipTest("#dsForm-source .location.database")
            .tooltipTest("#dsForm-source .more")
            .tooltipTest("#sqlWorkSpace", "#sqlWorkSpace")
            .tooltipTest("#sqlEditorSpace")
            .tooltipTest("#sqlTableListerArea")
            .tooltipTest("#sqlWorkSpacePanel .historySection")
            .tooltipTest("#helpMenuTab", "#helpMenuTab")
            .tooltipTest("#tutorialResource")

            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")

        browser.execute(function() {
            XVM.isCloud = oldIsCloud;
        }, [], null);
    },

    "should start Sql mode walkthrough for on prem successfully": function(browser) {
        let oldIsCloud
        browser.execute(function() {
            oldIsCloud = XVM.isCloud;
            XVM.isCloud = () => false;
        }, [], null);

        browser
            .waitForElementVisible("#userNameArea")
            .click("#userNameArea")
            .waitForElementVisible("#userMenu .walkthroughs")
            .click("#userMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(2) button')
            .waitForElementVisible("#intro-popover")

            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")

        browser.execute(function() {
            XVM.isCloud = oldIsCloud;
        }, [], null);
    },

    'switching to developer mode shows messageModal': function(browser) {
        browser
            .waitForElementVisible("#modeArea")
            .click("#modeArea")
            .waitForElementVisible("#messageModal")
            .expect.element('#messageModal .modalHeader .text').text.to.equal('You are switching to the Developer Mode workspace')
    },

    'clicking take tour starts developer walkthrough': function(browser) {
        browser.expect.element('#messageModal .modalBottom .confirm').text.to.equal('Take a tour')
        browser
            .click("#messageModal .modalBottom .confirm")
            .waitForElementVisible("#intro-popover")
            .assert.cssClassPresent("#modeArea", "intro-highlightedElement")
            .expect.element('#intro-popover .title').text.to.equal('Developer Mode')
        browser
            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'switching back to SQL Mode shows messageModal': function(browser) {
        browser
            .waitForElementVisible("#modeArea")
            .click("#modeArea")
            .waitForElementVisible("#messageModal")
            .expect.element('#messageModal .modalHeader .text').text.to.equal('You are switching to the SQL Mode workspace')
    },

    'clicking take tour starts sql walkthrough': function(browser) {
        browser.expect.element('#messageModal .modalBottom .confirm').text.to.equal('Take a tour')
        browser
            .click("#messageModal .modalBottom .confirm")
            .waitForElementVisible("#intro-popover")
            .assert.cssClassPresent("#modeArea", "intro-highlightedElement")
            .expect.element('#intro-popover .title').text.to.equal('SQL Mode')
        browser
            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'switching to developer mode second time shows messageModal': function(browser) {
        browser
            .waitForElementVisible("#modeArea")
            .click("#modeArea")
            .waitForElementVisible("#messageModal")
            .expect.element('#messageModal .modalHeader .text').text.to.equal('You are switching to the Developer Mode workspace')
        browser
            .assert.cssClassNotPresent("#messageModal .modalMain .checkbox", "checked")
            .click("#messageModal .modalMain .checkbox")
            .assert.cssClassPresent("#messageModal .modalMain .checkbox", "checked")
            .click("#messageModal .modalBottom .cancel")
            .waitForElementVisible("#modalBackground")
    },

    'switching to sql mode automatically shows no messageModal after clicking dont show in developer mode': function(browser) {
        browser
            .pause(2000)
            .waitForElementNotVisible("#messageModal")
    },

    'switching to developer mode after clicking dont show again shows no messageModal': function(browser) {
        browser
            .pause(2000)
            .waitForElementNotVisible("#messageModal")
    },
}