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
                console.log("restoring dataset");
                this.api.moveToElement("#dagNodeMenu li.restoreDataset", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible("#dsListSection")
                    .pause(1000)
                    .moveToElement("#dsListSection .grid-unit:last-child", 10, 10)
                    .mouseButtonClick('left')
                    .waitForElementVisible('#dsTableContainer .datasetTable', 100000)
                    .moveToElement('#modelingDataflowTab', 1, 1)
                    .mouseButtonClick('left');
            }
        });

        this.emit('complete');
        return this;
    }
}

module.exports = RestoreDataset;