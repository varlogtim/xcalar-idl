const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class ExecuteAll extends EventEmitter {
    command(time, cb) {
        // execute all nodes
        this.api
        .moveToElement("#dagViewBar .topButton.run .icon", 1, 1)
        .mouseButtonClick('left')
        .waitForElementPresent(".dataflowArea.active.locked")
        .execute(execFunctions.clearConsole, [], () => {})
        .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000)
        // .getLog("browser", function(result){console.log(result)})
        .elements('css selector','.dataflowArea.active .operator.state-Running', function (result) {
            console.log("after unlock, should not have running nodes", result.value);
        })
        .waitForElementNotPresent(".dataflowArea.active .operator.state-Running", 100000);
        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteAll;