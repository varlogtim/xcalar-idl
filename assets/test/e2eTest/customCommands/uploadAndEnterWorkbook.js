const EventEmitter = require('events');

class UploadAndEnterWorkbook extends EventEmitter {
    command(workbookName, isUpgrade, _cb) {
        this.api.isPresent("#intro-popover", (isPresent) => {
            if (isPresent) {
                this.api.click("#intro-popover .cancel");
                this.api.pause(1000);
            }
            this.api
                .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
                .waitForElementNotVisible("#modalBackground", 10 * 1000)
                .uploadWorkbook(workbookName, isUpgrade)
                .waitForWorkbookReady()
                .activateWorkbook(isUpgrade);
            this.emit('complete');
        });
        return this;
    }
}

module.exports = UploadAndEnterWorkbook;