const EventEmitter = require('events');

class ActivateWorkbook extends EventEmitter {
    command(_cb) {
        this.api
        .saveScreenshot("nwscreenshot1.png")
        .pause(2000)
        .click(".workbookBox .content.activate")
        .pause(10000)
        // .getLog('browser', function(result) {
        //     console.log(result);
        // })
        .saveScreenshot("nwscreenshot2.png")
        .waitForElementNotVisible("#initialLoadScreen", 100000)
        .waitForElementVisible('.dataflowArea.active.rendered', 100000);

        this.emit('complete');

        return this;
    }
}

module.exports = ActivateWorkbook;