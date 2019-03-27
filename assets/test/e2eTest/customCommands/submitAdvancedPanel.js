const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class SubmitAdvancedPanel extends EventEmitter {
    command(panelSelector, config, wait, cb) {
        this.api.isVisible(panelSelector + " .advancedEditor", results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.waitForElementNotPresent("#formWaitingBG", 3000)
                .click(panelSelector + " .bottomSection .switch");
            }

            let self = this;
            this.api.waitForElementVisible(panelSelector + " .advancedEditor", 1000)
            .execute(execFunctions.setAdvancedConfig, [panelSelector, config],
                function(result) {
                    let panelId = result.value;

                    self.api
                    .click(panelId + ' .submit')
                    .waitForElementNotVisible(panelId, wait || 2000);

                    self.emit('complete');
                }
            );

        });

        return this;
    }
}

module.exports = SubmitAdvancedPanel;