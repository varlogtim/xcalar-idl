const EventEmitter = require('events');

class DeleteWorkbook extends EventEmitter {
    command(workbookName, userName, cb) {
        userName = userName || this.api.globals.user;
        this.api.isVisible('#workbookPanel', results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.moveToElement("#homeBtn", 0, 0)
                    .mouseButtonClick("left");
            }

            this.api
                .waitForElementVisible('.workbookBox input[value="' + workbookName + '"]', 10000)
                .waitForElementVisible('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                .waitForElementVisible("#wkbkMenu .deactivate")
                .click("#wkbkMenu .deactivate")
                .click("#alertModal .confirm")
                .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"].active', 50000)
                .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                .click("#wkbkMenu .delete")
                .click("#alertModal .confirm")
                .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"]', 20000)

            this.emit('complete');
        });

        return this;
    }
}

module.exports = DeleteWorkbook;