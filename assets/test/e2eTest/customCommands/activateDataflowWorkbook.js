const EventEmitter = require('events');

class ActivateDataflowWorkbook extends EventEmitter {
    command(isUpgrade, workbookSelector) {
        this.api
            .activateWorkbook(workbookSelector)
            .cancelTooltipWalkthrough()
            .cancelAlert()

        if (isUpgrade) {
            this.api.waitForElementVisible("#dagListSection .fileName .name", 2 * 60 * 1000)
            .click("#dagListSection .fileName .name");
        }

        this.api
            .waitForElementVisible('.dataflowArea.active.rendered', 100000);

        this.emit('complete');
        return this;
    }
}

module.exports = ActivateDataflowWorkbook;