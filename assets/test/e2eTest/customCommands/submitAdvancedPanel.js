const EventEmitter = require('events');

class SubmitAdvancedPanel extends EventEmitter {
    command(panelSelector, config, cb) {
        this.api.isVisible(panelSelector + " .advancedEditor", results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.click(panelSelector + " .bottomSection .switch");
            }

            this.api.waitForElementVisible(panelSelector + " .advancedEditor", 1000)
            .execute(function(panelSelector, config) {
                let codeMirror = document.querySelectorAll(panelSelector + ' .CodeMirror')[0].CodeMirror;
                codeMirror.setValue(config);
                return true;
            }, [panelSelector, config], null)
            .click(panelSelector + ' .submit')
            .waitForElementNotVisible(panelSelector, 1000)

            this.emit('complete');
        });

        return this;
    }
}

module.exports = SubmitAdvancedPanel;