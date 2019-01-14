const EventEmitter = require('events');

class ExecuteAll extends EventEmitter {
    command(cb) {
        // execute all nodes
        this.api
        .moveToElement("#dagViewBar .topButton.run .icon", 1, 1)
        .mouseButtonClick('left')
        .waitForElementNotPresent(".dataflowArea.active .state-Configured")
        .waitForElementNotPresent(".dataflowArea.active .state-Running");

        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteAll;