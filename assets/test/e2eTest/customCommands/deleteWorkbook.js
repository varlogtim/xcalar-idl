const EventEmitter = require('events');

class DeleteWorkbook extends EventEmitter {
    command(workbookName, userName, cb) {
        const self = this;
        userName = userName || this.api.globals.user;
        this.api
            .ensureHomeScreenOpen()
            .waitForElementVisible('.workbookBox input[value="' + workbookName + '"]', 10000)
            .waitForElementVisible('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
            .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')

        this.api.isPresent('.workbookBox.active input[value="' + workbookName + '"]', isPresent => {
            if (isPresent) {
                self.api
                    .waitForElementVisible("#wkbkMenu .deactivate")
                    .click("#wkbkMenu .deactivate")
                    .click("#alertModal .confirm")
            }
            self.api
                .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"].active', 50000)
                .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                .click("#wkbkMenu .delete")
                .click("#alertModal .confirm")
                .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"]', 20000)
            self.emit('complete');
        })

        return this;
    }
}

module.exports = DeleteWorkbook;