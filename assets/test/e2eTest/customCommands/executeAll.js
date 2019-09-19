const EventEmitter = require('events');

class ExecuteAll extends EventEmitter {
    command(time, cb) {
        // execute all nodes
        this.api
        .moveToElement("#dagViewBar .topButton.run .icon", 1, 1)
        .mouseButtonClick('left')
        .waitForElementPresent(".dataflowArea.active.locked")
        .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000)
        .waitForElementNotPresent(".dataflowArea.active .operator.state-Running", 100000);
        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteAll;