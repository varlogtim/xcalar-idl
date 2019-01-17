const EventEmitter = require('events');

class ExecuteNode extends EventEmitter {
    command(selector, time, cb) {
        // execute all nodes
        this.api
            .moveToElement(".dataflowArea.active " + selector, 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.executeNode", 10, 1)
            .mouseButtonClick('left')
            .waitForElementPresent(".dataflowArea.active.locked")
            .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000);

        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteNode;