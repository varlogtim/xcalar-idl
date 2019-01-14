const EventEmitter = require('events');

class DeleteWorkbook extends EventEmitter {
    command(workbookName, cb) {

        this.api.isVisible('#workbookPanel', results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.moveToElement("#homeBtn", 0, 0)
                    .mouseButtonClick("left");
            }

            this.api.waitForElementVisible('.workbookBox input[value="' + workbookName + '"]', 10000)
                    .waitForElementVisible('.workbookBox[data-workbook-id="dftest-wkbk-' + workbookName + '"] .dropDown')
                    .click('.workbookBox[data-workbook-id="dftest-wkbk-' + workbookName + '"] .dropDown')
                    .waitForElementVisible("#wkbkMenu .deactivate")
                    .click("#wkbkMenu .deactivate")
                    .click("#alertModal .confirm")
                    .waitForElementNotPresent('.workbookBox[data-workbook-id="dftest-wkbk-' + workbookName + '"].active')
                    .click('.workbookBox[data-workbook-id="dftest-wkbk-' + workbookName + '"] .dropDown')
                    .click("#wkbkMenu .delete")
                    .click("#alertModal .confirm")
                    .waitForElementNotPresent('.workbookBox[data-workbook-id="dftest-wkbk-' + workbookName + '"]')

            this.emit('complete');
        });

        return this;
    }
}

module.exports = DeleteWorkbook;