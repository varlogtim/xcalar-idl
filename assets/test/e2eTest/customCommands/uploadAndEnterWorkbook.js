const EventEmitter = require('events');

class UploadAndEnterWorkbook extends EventEmitter {
    command(workbookName, isUpgrade, _cb) {
        this.api.isVisible("#intro-popover", results => {
            if (results.value) {
                this.api.click("#intro-popover .cancel");
                this.api.pause(1000);
            }

            this.api
                .uploadWorkbook(workbookName, isUpgrade)
                .waitForWorkbookReady()
                .activateWorkbook(isUpgrade);
            this.emit('complete');
        });
        return this;
    }
}

module.exports = UploadAndEnterWorkbook;