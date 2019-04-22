const EventEmitter = require('events');

class UploadAndEnterWorkbook extends EventEmitter {
    command(workbookName, isUpgrade, _cb) {
        this.api
            .uploadWorkbook(workbookName, isUpgrade)
            .waitForWorkbookReady()
            .activateWorkbook();
        this.emit('complete');
        return this;
    }
}

module.exports = UploadAndEnterWorkbook;