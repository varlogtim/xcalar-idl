const EventEmitter = require('events');

EventEmitter.defaultMaxListeners = 100;

class OpenOpPanel extends EventEmitter {
    command(selector) {
        this.api
            .moveToElement(".dataflowArea.active " + selector, 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.configureNode", 10, 1)
            .mouseButtonClick('left')
        this.emit('complete');

        return this;
    }
}

module.exports = OpenOpPanel;