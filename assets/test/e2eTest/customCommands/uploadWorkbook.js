const EventEmitter = require('events');

class UploadWorkbook extends EventEmitter {
    command(fileName, cb) {
        let path = require('path').resolve(__dirname + '/../../../dev/e2eTest/workbooks/'
        + fileName + '.xlrwb.tar.gz');
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