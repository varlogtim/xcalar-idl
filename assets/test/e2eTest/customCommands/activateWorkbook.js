const EventEmitter = require('events');

class ActivateWorkbook extends EventEmitter {
    command(isUpgrade, _cb) {
        this.api
        .pause(2000)
        .click(".workbookBox .content.activate")
        .pause(10000)
        .waitForElementNotVisible("#initialLoadScreen", 100000);
        this.api.isPresent("#intro-popover", (isPresent) => {
            if (isPresent) {
                this.api.click("#intro-popover .cancel");
                this.api.pause(1000);
            }

            if (isUpgrade) {
                this.api.waitForElementVisible("#dagListSection .fileName .name", 10000)
                .click("#dagListSection .fileName .name");
            }

            this.api.waitForElementVisible('.dataflowArea.active.rendered', 100000);

            this.emit('complete');
        });

        return this;
    }
}

module.exports = ActivateWorkbook;