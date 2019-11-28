const EventEmitter = require('events');

class EnsureHomeScreenOpen extends EventEmitter {
    command() {
        this.api.isVisible('#workbookPanel', results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.moveToElement("#homeBtn", 0, 0)
                    .mouseButtonClick("left");
            }
        });
        this.api
            .waitForElementNotVisible("#modalBackground", 10000)
            .waitForElementVisible("#workbookPanel")
        this.emit('complete');
        return this;
    }
}

module.exports = EnsureHomeScreenOpen;