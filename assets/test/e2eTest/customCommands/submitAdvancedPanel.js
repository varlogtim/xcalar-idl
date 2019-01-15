const EventEmitter = require('events');

class SubmitAdvancedPanel extends EventEmitter {
    command(selector, config) {
        this.api.isVisible(selector + " .advancedEditor", results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.click(selector + " .bottomSection .switch");
            }

            this.api.waitForElementVisible(selector + " .advancedEditor", 1000)


            this.emit('complete');
        });
        this.emit('complete');

        return this;
    }
}

module.exports = SubmitAdvancedPanel;