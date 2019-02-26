const EventEmitter = require('events');

class UploadWorkbook extends EventEmitter {
    command(fileName, isUpgrade,  cb) {
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
            .setValue('input#WKBK_uploads', path)
            .waitForElementVisible('.workbookBox.noResource .subHeading input', 10000)
            .assert.value(".workbookBox.noResource .subHeading input", fileName)
        this.emit('complete');

        return this;
    }
}

module.exports = UploadWorkbook;