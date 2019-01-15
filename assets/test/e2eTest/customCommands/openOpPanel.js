const EventEmitter = require('events');

class OpenOpPanel extends EventEmitter {
    command(selector) {
        this.api
        .moveToElement(".dataflowArea.active " + selector, 0, 10)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.configureNode", 10, 1)
            .mouseButtonClick('left')
        this.emit('complete');

        return this;
    }
}

module.exports = OpenOpPanel;