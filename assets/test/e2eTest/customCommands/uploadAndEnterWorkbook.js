const EventEmitter = require('events');

class UploadAndEnterWorkbook extends EventEmitter {
    command(workbookName, isUpgrade, _cb) {
        this.api
            .uploadWorkbook(workbookName, isUpgrade)
            .activateWorkbook();
        this.emit('complete');
        return this;
    }
}

module.exports = UploadAndEnterWorkbook;