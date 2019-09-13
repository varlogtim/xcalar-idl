const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

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
            let datasetId = "";
            if (needRestore) {
                console.log("restoring dataset");
                this.api.execute(execFunctions.scrollIntoView, ["#dagNodeMenu li.restoreDataset"], () => {})
                this.api.moveToElement("#dagNodeMenu li.restoreDataset", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible("#dsListSection")
                    .pause(1000)
                    .execute(execFunctions.getRestoredDatasetId, [], (result) => {
                        datasetId = result.value;
                        this.api.moveToElement(`#dsListSection .grid-unit[data-dsid="${datasetId}"]`, 10, 10)
                        .mouseButtonClick('left')
                        // .saveScreenshot("nw1.png")
                        .waitForElementVisible('#dsTableContainer .datasetTable', 100000)
                        .moveToElement('#modelingDataflowTab', 1, 1)
                        .mouseButtonClick('left');

                        this.emit('complete');
                    });
            } else {
                this.emit('complete');
            }
        });


        return this;
    }
}

module.exports = RestoreDataset;