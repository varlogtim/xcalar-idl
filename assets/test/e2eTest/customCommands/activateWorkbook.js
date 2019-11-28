const EventEmitter = require('events');

class ActivateWorkbook extends EventEmitter {
    command(workbookSelector) {
        this.api
            .pause(2000)
            .click(workbookSelector || ".workbookBox .content.activate")
            .pause(1000)
            .confirmAlert()
            .pause(10000)
            .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
            .pause(3000);

        this.emit('complete');
        return this;
    }
}

module.exports = ActivateWorkbook;