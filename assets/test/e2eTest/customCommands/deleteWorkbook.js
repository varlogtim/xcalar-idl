const EventEmitter = require('events');

class DeleteWorkbook extends EventEmitter {
    command(workbookName, userName, cb) {
        const self = this;
        userName = userName || this.api.globals.user;

        this.api.ensureHomeScreenOpen()
        this.api.isPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"]', isPresent => {
            if (isPresent) {
                self.api
                    .waitForElementVisible('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                    .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                    .pause(10000)

                self.api.isPresent('.workbookBox.active input[value="' + workbookName + '"]', isPresent => {
                    if (isPresent) {
                        self.api
                            .waitForElementVisible("#wkbkMenu .deactivate")
                            .click("#wkbkMenu .deactivate")
                            .pause(5000)
                            .click("#alertModal .confirm")
                            .waitForElementNotVisible("#modalBackground", 30000);
                    }
                    self.api
                        .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"].active', 50000)
                        .click('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"] .dropDown')
                        .click("#wkbkMenu .delete")
                        .click("#alertModal .confirm")
                        .waitForElementNotPresent('.workbookBox[data-workbook-id="' + userName + '-wkbk-' + workbookName + '"]', 20000)
                    self.emit('complete');
                })
            } else {
                self.emit('complete');
            }
        });

        return this;
    }
}

module.exports = DeleteWorkbook;