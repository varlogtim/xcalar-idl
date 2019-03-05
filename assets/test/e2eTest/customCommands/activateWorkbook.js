const EventEmitter = require('events');

class ActivateWorkbook extends EventEmitter {
    command(_cb) {
        this.api
            .click(".workbookBox .content.activate")
            .pause(1000)
            .waitForElementNotVisible("#initialLoadScreen", 100000)
            .waitForElementVisible('.dataflowArea.active.rendered', 100000);
        this.emit('complete');
        return this;
    }
}

module.exports = ActivateWorkbook;