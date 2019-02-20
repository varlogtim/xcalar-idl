const EventEmitter = require('events');

class RestoreDataset extends EventEmitter {
    command(selector, cb) {
        this.api
            .moveToElement(selector, 0, 10)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000);
        let needRestore = false;
        this.api.isVisible("#dagNodeMenu li.restoreDataset", (result) => {
            needRestore = result.value;
        });
        this.api.perform(() => {
            if (needRestore) {
                this.api.moveToElement("#dagNodeMenu li.restoreDataset", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible('#dsTable', 100000)
                    .moveToElement('#modelingDataflowTab', 1, 1)
                    .mouseButtonClick('left');
            }
        });

        this.emit('complete');
        return this;
    }
}

module.exports = RestoreDataset;