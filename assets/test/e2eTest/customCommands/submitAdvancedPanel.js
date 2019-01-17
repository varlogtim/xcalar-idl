const EventEmitter = require('events');

class SubmitAdvancedPanel extends EventEmitter {
    command(panelSelector, config, cb) {
        this.api.isVisible(panelSelector + " .advancedEditor", results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.click(panelSelector + " .bottomSection .switch");
            }

            let self = this;
            this.api.waitForElementVisible(panelSelector + " .advancedEditor", 1000)
            .execute(function(panelSelector, config) {
                let codeMirror = document.querySelectorAll(panelSelector + ' .CodeMirror')[0].CodeMirror;
                codeMirror.setValue(config);
                let id = "#" + document.querySelector(panelSelector).id;
                return id;
            }, [panelSelector, config], function(result) {
                let panelId = result.value;

                self.api
                .click(panelId + ' .submit')
                .waitForElementNotVisible(panelId, 1000);

                self.emit('complete');
            });

        });

        return this;
    }
}

module.exports = SubmitAdvancedPanel;