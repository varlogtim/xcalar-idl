const EventEmitter = require('events');

class RestoreDataset extends EventEmitter {
    command(selector, cb) {
        // execute all nodes
        this.api
            .moveToElement(selector, 0, 10)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.restoreDataset", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#dsTable', 100000)
            .moveToElement('#modelingDataflowTab', 1, 1)
            .mouseButtonClick('left');

        this.emit('complete');
        return this;
    }
}

module.exports = RestoreDataset;