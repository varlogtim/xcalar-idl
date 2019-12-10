const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class UploadWorkbook extends EventEmitter {
    command(fileName, isUpgrade,  cb) {
        const self = this;
        let extension;
        if (isUpgrade) {
            extension = ".tar.gz";
        } else {
            extension = '.xlrwb.tar.gz';
        }
        let path = require('path').resolve(__dirname + '/../../../dev/e2eTest/workbooks/'
        + fileName + extension);
        // upload workbook
        this.api
            .ensureHomeScreenOpen()
            .setValue('input#WKBK_uploads', path)
            .waitForElementVisible('.workbookBox.noResource .subHeading input', 2 * 60 * 1000);
        this.api.execute(execFunctions.getFinalWorkbookName, [], (result) => {
            self.api.globals.finalWorkbookName = result.value;
        });
        this.emit('complete');

        return this;
    }
}

module.exports = UploadWorkbook;